import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create demo users
  const adminPassword = await hash('password123', 12)
  const managerPassword = await hash('password123', 12)
  const workerPassword = await hash('password123', 12)

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: {
      email: 'admin@demo.com',
      name: 'Admin User',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  })

  const manager = await prisma.user.upsert({
    where: { email: 'manager@demo.com' },
    update: {},
    create: {
      email: 'manager@demo.com',
      name: 'Project Manager',
      password: managerPassword,
      role: 'PROJECT_MANAGER',
      status: 'ACTIVE',
    },
  })

  const worker = await prisma.user.upsert({
    where: { email: 'worker@demo.com' },
    update: {},
    create: {
      email: 'worker@demo.com',
      name: 'Field Worker',
      password: workerPassword,
      role: 'FIELD_WORKER',
      status: 'ACTIVE',
    },
  })

  console.log('Created users:', { admin: admin.email, manager: manager.email, worker: worker.email })

  // Create default labels
  const labelCategories = {
    ACTIVITY: [
      'Framing', 'Electrical Rough-In', 'Drywall Hang', 'Concrete Pour',
      'Plumbing', 'HVAC', 'Painting', 'Flooring', 'Cleanup', 'Punch List',
    ],
    LOCATION_BUILDING: [
      'Building A', 'Building B', 'Main Building', 'Garage', 'Outbuilding',
    ],
    LOCATION_FLOOR: [
      'Basement', 'Ground/Slab', 'Floor 1', 'Floor 2', 'Floor 3', 'Roof',
    ],
    LOCATION_ZONE: [
      'North Wing', 'South Wing', 'East Side', 'West Side', 'Interior', 'Exterior',
    ],
    LOCATION_ROOM: [
      'Kitchen', 'Bathroom', 'Bedroom', 'Mechanical Room', 'Hallway', 'Common Area',
    ],
    STATUS: [
      'Started', 'In Progress', 'Continued', 'Completed', 'On Hold', 'Rework',
    ],
    MATERIAL: [
      'Concrete', 'Rebar', 'Lumber', 'Drywall', 'Pipe/Fittings', 'Wire/Cable',
      'Paint', 'Flooring', 'Fixtures',
    ],
    ISSUE: [
      'Weather', 'Waiting on Trade', 'Material Delay', 'Equipment Down',
      'Short Crew', 'Failed Inspection', 'Design Conflict',
    ],
    VISITOR: [
      'Owner', 'Architect', 'Inspector - Building', 'Inspector - Electrical',
      'Inspector - Plumbing', 'Inspector - Fire', 'OSHA', 'Engineer',
    ],
  }

  for (const [category, labels] of Object.entries(labelCategories)) {
    for (let i = 0; i < labels.length; i++) {
      await prisma.label.upsert({
        where: {
          id: `${category}-${labels[i].toLowerCase().replace(/\s+/g, '-')}`,
        },
        update: {},
        create: {
          id: `${category}-${labels[i].toLowerCase().replace(/\s+/g, '-')}`,
          category,
          name: labels[i],
          sortOrder: i,
          isActive: true,
        },
      })
    }
  }

  console.log('Created default labels')

  // Create default safety topics - comprehensive list inspired by Safety Meeting Portal
  const safetyTopics = [
    // GENERAL
    { name: 'Toolbox Talk', category: 'GENERAL', description: 'General safety discussion and awareness' },
    { name: 'New Employee Orientation', category: 'GENERAL', description: 'Site-specific safety orientation for new workers' },
    { name: 'Housekeeping & Cleanup', category: 'GENERAL', description: 'Site cleanliness and organization' },
    { name: 'Situational Awareness', category: 'GENERAL', description: 'Being aware of your surroundings and potential hazards' },
    { name: 'Stop Work Authority', category: 'GENERAL', description: 'Understanding when and how to stop unsafe work' },
    { name: 'Reporting Near Misses', category: 'GENERAL', description: 'Importance of reporting near-miss incidents' },
    { name: 'Safety Culture', category: 'GENERAL', description: 'Building a positive safety culture on the jobsite' },
    { name: 'Communication on the Jobsite', category: 'GENERAL', description: 'Effective communication for safety' },
    { name: 'Pre-Task Planning', category: 'GENERAL', description: 'Planning work before starting tasks' },

    // HAZARDS
    { name: 'Job Hazard Analysis (JHA)', category: 'HAZARDS', description: 'Review of specific job hazards and mitigation strategies' },
    { name: 'Fall Protection', category: 'HAZARDS', description: 'Working at heights, fall arrest systems, and guardrails' },
    { name: 'Excavation & Trenching Safety', category: 'HAZARDS', description: 'Safe practices for excavation and trenching operations' },
    { name: 'Electrical Safety', category: 'HAZARDS', description: 'Electrical hazards and safe work practices' },
    { name: 'Heat Illness Prevention', category: 'HAZARDS', description: 'Recognizing and preventing heat-related illnesses' },
    { name: 'Cold Stress Prevention', category: 'HAZARDS', description: 'Preventing frostbite, hypothermia, and cold injuries' },
    { name: 'Struck-By Hazards', category: 'HAZARDS', description: 'Preventing injuries from falling or flying objects' },
    { name: 'Caught-In/Between Hazards', category: 'HAZARDS', description: 'Avoiding caught-in and crushing injuries' },
    { name: 'Slip, Trip & Fall Prevention', category: 'HAZARDS', description: 'Preventing same-level falls' },
    { name: 'Underground Utilities', category: 'HAZARDS', description: 'Safe digging and utility identification' },
    { name: 'Overhead Power Lines', category: 'HAZARDS', description: 'Safe work practices near power lines' },
    { name: 'Arc Flash Safety', category: 'HAZARDS', description: 'Protecting against electrical arc flash hazards' },
    { name: 'Noise Exposure & Hearing Protection', category: 'HAZARDS', description: 'Preventing hearing loss on the jobsite' },
    { name: 'Lead Safety', category: 'HAZARDS', description: 'Working safely with lead-based materials' },
    { name: 'Asbestos Awareness', category: 'HAZARDS', description: 'Identifying and avoiding asbestos hazards' },
    { name: 'Mold Awareness', category: 'HAZARDS', description: 'Recognizing and dealing with mold hazards' },
    { name: 'Carbon Monoxide Safety', category: 'HAZARDS', description: 'Preventing CO poisoning from equipment' },
    { name: 'Working Over/Near Water', category: 'HAZARDS', description: 'Safety when working near bodies of water' },
    { name: 'Working in Inclement Weather', category: 'HAZARDS', description: 'Safety during storms, wind, and lightning' },

    // PPE
    { name: 'Personal Protective Equipment (PPE)', category: 'PPE', description: 'Proper use and care of personal protective equipment' },
    { name: 'Hard Hat Safety', category: 'PPE', description: 'Proper use and inspection of hard hats' },
    { name: 'Safety Glasses & Eye Protection', category: 'PPE', description: 'Protecting your eyes on the jobsite' },
    { name: 'Glove Selection & Use', category: 'PPE', description: 'Choosing the right gloves for the task' },
    { name: 'Respiratory Protection', category: 'PPE', description: 'Using respirators and masks correctly' },
    { name: 'Silica Dust Exposure', category: 'PPE', description: 'Crystalline silica hazards and respiratory protection' },
    { name: 'High-Visibility Clothing', category: 'PPE', description: 'When and how to wear hi-vis vests' },
    { name: 'Fall Protection Equipment', category: 'PPE', description: 'Harnesses, lanyards, and anchor points' },
    { name: 'Hearing Protection', category: 'PPE', description: 'Using earplugs and earmuffs' },
    { name: 'Foot Protection', category: 'PPE', description: 'Safety boots and proper footwear' },
    { name: 'Face Shields & Face Protection', category: 'PPE', description: 'When to use face shields' },
    { name: 'Welding PPE', category: 'PPE', description: 'Protective equipment for welding operations' },

    // EQUIPMENT
    { name: 'Equipment & Tool Safety', category: 'EQUIPMENT', description: 'Safe operation of tools and equipment' },
    { name: 'Scaffolding Safety', category: 'EQUIPMENT', description: 'Scaffold erection, inspection, and use' },
    { name: 'Crane & Rigging Safety', category: 'EQUIPMENT', description: 'Safe crane operations and rigging practices' },
    { name: 'Ladder Safety', category: 'EQUIPMENT', description: 'Proper ladder selection, setup, and use' },
    { name: 'Aerial Lift Safety', category: 'EQUIPMENT', description: 'Safe operation of boom lifts and scissor lifts' },
    { name: 'Forklift Safety', category: 'EQUIPMENT', description: 'Safe forklift operation and pedestrian awareness' },
    { name: 'Skid Steer & Compact Equipment', category: 'EQUIPMENT', description: 'Safe operation of compact equipment' },
    { name: 'Excavator Safety', category: 'EQUIPMENT', description: 'Safe excavator operation and swing radius' },
    { name: 'Concrete Pump Safety', category: 'EQUIPMENT', description: 'Safe operation of concrete pumping equipment' },
    { name: 'Power Tool Safety', category: 'EQUIPMENT', description: 'Safe use of power tools and guards' },
    { name: 'Hand Tool Safety', category: 'EQUIPMENT', description: 'Proper use and care of hand tools' },
    { name: 'Grinding & Cutting Safety', category: 'EQUIPMENT', description: 'Safe use of grinders and cutting tools' },
    { name: 'Nail Gun Safety', category: 'EQUIPMENT', description: 'Safe operation of pneumatic nailers' },
    { name: 'Powder-Actuated Tool Safety', category: 'EQUIPMENT', description: 'Safe use of powder-actuated fasteners' },
    { name: 'Chainsaw Safety', category: 'EQUIPMENT', description: 'Safe chainsaw operation and maintenance' },
    { name: 'Generator Safety', category: 'EQUIPMENT', description: 'Safe use of portable generators' },
    { name: 'Compressor Safety', category: 'EQUIPMENT', description: 'Safe operation of air compressors' },
    { name: 'Equipment Inspection', category: 'EQUIPMENT', description: 'Pre-use inspection of equipment' },
    { name: 'Heavy Equipment Blind Spots', category: 'EQUIPMENT', description: 'Awareness of equipment blind spots' },

    // PROCEDURES
    { name: 'Hazard Communication (HazCom)', category: 'PROCEDURES', description: 'Chemical safety, SDS sheets, and labeling' },
    { name: 'Confined Space Entry', category: 'PROCEDURES', description: 'Permit-required confined space procedures' },
    { name: 'Lockout/Tagout (LOTO)', category: 'PROCEDURES', description: 'Energy control procedures for servicing equipment' },
    { name: 'Traffic Control & Work Zones', category: 'PROCEDURES', description: 'Safe work zone setup and traffic management' },
    { name: 'Hot Work Permit Procedures', category: 'PROCEDURES', description: 'Safe welding, cutting, and hot work' },
    { name: 'Concrete Safety', category: 'PROCEDURES', description: 'Safe concrete placement and finishing' },
    { name: 'Steel Erection Safety', category: 'PROCEDURES', description: 'Safe practices for structural steel' },
    { name: 'Roofing Safety', category: 'PROCEDURES', description: 'Safe work practices on roofs' },
    { name: 'Demolition Safety', category: 'PROCEDURES', description: 'Safe demolition procedures' },
    { name: 'Material Handling', category: 'PROCEDURES', description: 'Safe lifting and carrying materials' },
    { name: 'Manual Lifting Techniques', category: 'PROCEDURES', description: 'Proper lifting to prevent back injuries' },
    { name: 'Rigging & Load Handling', category: 'PROCEDURES', description: 'Safe rigging and load control' },
    { name: 'Floor & Wall Openings', category: 'PROCEDURES', description: 'Guarding holes and openings' },
    { name: 'Barricade & Signage Use', category: 'PROCEDURES', description: 'Proper use of warning signs and barricades' },
    { name: 'Torch Cutting Safety', category: 'PROCEDURES', description: 'Safe oxy-fuel cutting procedures' },
    { name: 'Compressed Gas Cylinder Safety', category: 'PROCEDURES', description: 'Safe handling and storage of gas cylinders' },
    { name: 'Flammable Liquid Handling', category: 'PROCEDURES', description: 'Safe storage and use of flammables' },
    { name: 'Masonry Safety', category: 'PROCEDURES', description: 'Safe masonry and block work practices' },
    { name: 'Drywall & Finishing Safety', category: 'PROCEDURES', description: 'Safety during drywall installation' },
    { name: 'Painting Safety', category: 'PROCEDURES', description: 'Safe painting practices and ventilation' },
    { name: 'Insulation Installation Safety', category: 'PROCEDURES', description: 'Safe handling of insulation materials' },

    // EMERGENCY
    { name: 'Fire Prevention & Protection', category: 'EMERGENCY', description: 'Fire hazards, extinguisher use, and evacuation procedures' },
    { name: 'First Aid & Emergency Response', category: 'EMERGENCY', description: 'Emergency procedures and first aid basics' },
    { name: 'Emergency Action Plan', category: 'EMERGENCY', description: 'Site-specific emergency procedures' },
    { name: 'Fire Extinguisher Use', category: 'EMERGENCY', description: 'How to properly use a fire extinguisher' },
    { name: 'CPR & AED Awareness', category: 'EMERGENCY', description: 'Basic CPR and AED location awareness' },
    { name: 'Evacuation Procedures', category: 'EMERGENCY', description: 'Emergency evacuation routes and assembly' },
    { name: 'Severe Weather Procedures', category: 'EMERGENCY', description: 'What to do during severe weather events' },
    { name: 'Bloodborne Pathogens', category: 'EMERGENCY', description: 'Protecting against bloodborne diseases' },
    { name: 'Incident Investigation', category: 'EMERGENCY', description: 'How incidents are investigated' },
    { name: 'Spill Response', category: 'EMERGENCY', description: 'How to respond to chemical spills' },

    // HEALTH & WELLNESS
    { name: 'Ergonomics & Body Mechanics', category: 'GENERAL', description: 'Preventing musculoskeletal injuries' },
    { name: 'Fatigue Management', category: 'GENERAL', description: 'Preventing fatigue-related incidents' },
    { name: 'Drug & Alcohol Policy', category: 'GENERAL', description: 'Substance abuse policy awareness' },
    { name: 'Mental Health Awareness', category: 'GENERAL', description: 'Recognizing signs of stress and seeking help' },
    { name: 'Sun Exposure Protection', category: 'GENERAL', description: 'Protecting against sunburn and skin cancer' },
    { name: 'Hydration on the Jobsite', category: 'GENERAL', description: 'Staying hydrated during work' },
    { name: 'Insect & Spider Bites', category: 'GENERAL', description: 'Preventing and treating bites and stings' },
    { name: 'Poisonous Plants', category: 'GENERAL', description: 'Identifying and avoiding poisonous plants' },
  ]

  for (let i = 0; i < safetyTopics.length; i++) {
    const topic = safetyTopics[i]
    await prisma.safetyTopic.upsert({
      where: { name: topic.name },
      update: {},
      create: {
        name: topic.name,
        description: topic.description,
        category: topic.category,
        isDefault: true,
        isActive: true,
        sortOrder: i,
      },
    })
  }

  console.log('Created default safety topics')

  // Create demo project
  const project = await prisma.project.upsert({
    where: { id: 'demo-project-1' },
    update: {},
    create: {
      id: 'demo-project-1',
      name: 'Downtown Office Complex',
      address: '123 Main Street, Cityville, ST 12345',
      gpsLatitude: 40.7128,
      gpsLongitude: -74.006,
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-12-31'),
      status: 'ACTIVE',
      description: 'A 10-story office building with underground parking and retail space on the ground floor.',
    },
  })

  // Assign users to project
  await prisma.projectAssignment.upsert({
    where: {
      userId_projectId: { userId: admin.id, projectId: project.id },
    },
    update: {},
    create: {
      userId: admin.id,
      projectId: project.id,
    },
  })

  await prisma.projectAssignment.upsert({
    where: {
      userId_projectId: { userId: manager.id, projectId: project.id },
    },
    update: {},
    create: {
      userId: manager.id,
      projectId: project.id,
    },
  })

  await prisma.projectAssignment.upsert({
    where: {
      userId_projectId: { userId: worker.id, projectId: project.id },
    },
    update: {},
    create: {
      userId: worker.id,
      projectId: project.id,
    },
  })

  console.log('Created demo project with assignments')

  // Create demo equipment
  const equipmentList = [
    { name: 'CAT 320 Excavator', type: 'Excavator', status: 'AVAILABLE' },
    { name: 'Komatsu D61PX Bulldozer', type: 'Bulldozer', status: 'IN_USE' },
    { name: 'Liebherr LTM 1100', type: 'Crane', status: 'AVAILABLE' },
    { name: 'CAT 950M Loader', type: 'Loader', status: 'MAINTENANCE' },
  ]

  for (const eq of equipmentList) {
    await prisma.equipment.upsert({
      where: { id: `demo-eq-${eq.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `demo-eq-${eq.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: eq.name,
        type: eq.type,
        status: eq.status,
      },
    })
  }

  console.log('Created demo equipment')

  // Create default inspection templates
  const inspectionTemplates = [
    {
      name: 'Daily Site Safety Inspection',
      description: 'Standard daily safety walkthrough checklist',
      category: 'SAFETY',
      items: [
        { id: '1', question: 'Are all workers wearing required PPE?', type: 'yes_no' },
        { id: '2', question: 'Are walkways and access routes clear?', type: 'yes_no' },
        { id: '3', question: 'Is fall protection in place where required?', type: 'yes_no' },
        { id: '4', question: 'Are excavations properly shored/sloped?', type: 'yes_no' },
        { id: '5', question: 'Are electrical cords and equipment in good condition?', type: 'yes_no' },
        { id: '6', question: 'Is the site clean and organized?', type: 'yes_no' },
        { id: '7', question: 'Are fire extinguishers accessible and charged?', type: 'yes_no' },
        { id: '8', question: 'Is first aid kit stocked and accessible?', type: 'yes_no' },
        { id: '9', question: 'Additional observations', type: 'text' },
      ],
    },
    {
      name: 'Scaffold Inspection',
      description: 'Pre-use scaffold safety inspection',
      category: 'SAFETY',
      items: [
        { id: '1', question: 'Is scaffold on stable, level base?', type: 'yes_no' },
        { id: '2', question: 'Are all connections secure?', type: 'yes_no' },
        { id: '3', question: 'Are guardrails installed on all open sides?', type: 'yes_no' },
        { id: '4', question: 'Are planks in good condition and secured?', type: 'yes_no' },
        { id: '5', question: 'Is there safe access (ladder/stair)?', type: 'yes_no' },
        { id: '6', question: 'Are braces properly installed?', type: 'yes_no' },
        { id: '7', question: 'Is the scaffold tagged and inspected?', type: 'yes_no' },
        { id: '8', question: 'Inspector signature required', type: 'signature' },
      ],
    },
    {
      name: 'Ladder Inspection',
      description: 'Ladder safety inspection checklist',
      category: 'SAFETY',
      items: [
        { id: '1', question: 'Are rungs clean and in good condition?', type: 'yes_no' },
        { id: '2', question: 'Are feet/pads in good condition?', type: 'yes_no' },
        { id: '3', question: 'Is the ladder rated for intended use?', type: 'yes_no' },
        { id: '4', question: 'No visible cracks or damage?', type: 'yes_no' },
        { id: '5', question: 'Locks and hinges working properly?', type: 'yes_no' },
        { id: '6', question: 'Labels legible and intact?', type: 'yes_no' },
      ],
    },
    {
      name: 'Excavation Inspection',
      description: 'Daily excavation and trenching safety inspection',
      category: 'SAFETY',
      items: [
        { id: '1', question: 'Has a competent person inspected the excavation?', type: 'yes_no' },
        { id: '2', question: 'Is protective system in place (shoring/sloping)?', type: 'yes_no' },
        { id: '3', question: 'Is spoil pile at least 2 feet from edge?', type: 'yes_no' },
        { id: '4', question: 'Is there safe access/egress within 25 feet?', type: 'yes_no' },
        { id: '5', question: 'Has atmosphere been tested if required?', type: 'yes_no' },
        { id: '6', question: 'Are utilities located and marked?', type: 'yes_no' },
        { id: '7', question: 'Is traffic control in place?', type: 'yes_no' },
        { id: '8', question: 'Notes on soil conditions', type: 'text' },
      ],
    },
    {
      name: 'Pre-Pour Concrete Inspection',
      description: 'Quality inspection before concrete pour',
      category: 'QUALITY',
      items: [
        { id: '1', question: 'Forms properly aligned and secured?', type: 'yes_no' },
        { id: '2', question: 'Rebar placement per drawings?', type: 'yes_no' },
        { id: '3', question: 'Proper cover on reinforcement?', type: 'yes_no' },
        { id: '4', question: 'Embedments and sleeves in place?', type: 'yes_no' },
        { id: '5', question: 'Forms cleaned and oiled?', type: 'yes_no' },
        { id: '6', question: 'Anchor bolts properly located?', type: 'yes_no' },
        { id: '7', question: 'Mix design approved?', type: 'yes_no' },
        { id: '8', question: 'Weather conditions acceptable?', type: 'yes_no' },
      ],
    },
    {
      name: 'Fire Watch Inspection',
      description: 'Hot work fire watch checklist',
      category: 'SAFETY',
      items: [
        { id: '1', question: 'Hot work permit obtained?', type: 'yes_no' },
        { id: '2', question: 'Combustibles removed or covered within 35 ft?', type: 'yes_no' },
        { id: '3', question: 'Fire extinguisher available and charged?', type: 'yes_no' },
        { id: '4', question: 'Floor openings and cracks covered?', type: 'yes_no' },
        { id: '5', question: 'Fire watch assigned for duration + 30 min?', type: 'yes_no' },
        { id: '6', question: 'Sprinklers operational (if present)?', type: 'yes_no' },
        { id: '7', question: 'Start time', type: 'text' },
        { id: '8', question: 'End time', type: 'text' },
      ],
    },
    {
      name: 'Equipment Pre-Use Inspection',
      description: 'Daily equipment inspection before operation',
      category: 'EQUIPMENT',
      items: [
        { id: '1', question: 'Fluid levels checked (oil, hydraulic, coolant)?', type: 'yes_no' },
        { id: '2', question: 'No visible leaks?', type: 'yes_no' },
        { id: '3', question: 'Tires/tracks in good condition?', type: 'yes_no' },
        { id: '4', question: 'Lights and signals working?', type: 'yes_no' },
        { id: '5', question: 'Backup alarm functioning?', type: 'yes_no' },
        { id: '6', question: 'Seatbelt in good condition?', type: 'yes_no' },
        { id: '7', question: 'ROPS/FOPS intact?', type: 'yes_no' },
        { id: '8', question: 'Controls operating properly?', type: 'yes_no' },
        { id: '9', question: 'Fire extinguisher present and charged?', type: 'yes_no' },
        { id: '10', question: 'Hour meter reading', type: 'text' },
      ],
    },
    {
      name: 'Aerial Lift Pre-Use Inspection',
      description: 'Daily aerial lift (boom/scissor) inspection',
      category: 'EQUIPMENT',
      items: [
        { id: '1', question: 'Ground controls functioning?', type: 'yes_no' },
        { id: '2', question: 'Platform controls functioning?', type: 'yes_no' },
        { id: '3', question: 'Emergency stop working?', type: 'yes_no' },
        { id: '4', question: 'Guardrails secure and in place?', type: 'yes_no' },
        { id: '5', question: 'Harness attachment point secure?', type: 'yes_no' },
        { id: '6', question: 'Tires adequate (no flat spots)?', type: 'yes_no' },
        { id: '7', question: 'No hydraulic leaks?', type: 'yes_no' },
        { id: '8', question: 'Horn/alarm working?', type: 'yes_no' },
        { id: '9', question: 'Rated capacity placard visible?', type: 'yes_no' },
      ],
    },
    {
      name: 'Environmental Compliance',
      description: 'Environmental protection inspection',
      category: 'ENVIRONMENTAL',
      items: [
        { id: '1', question: 'Erosion controls in place and maintained?', type: 'yes_no' },
        { id: '2', question: 'Silt fence intact?', type: 'yes_no' },
        { id: '3', question: 'Storm drains protected?', type: 'yes_no' },
        { id: '4', question: 'No evidence of sediment discharge?', type: 'yes_no' },
        { id: '5', question: 'Waste properly stored and contained?', type: 'yes_no' },
        { id: '6', question: 'Spill kits available?', type: 'yes_no' },
        { id: '7', question: 'Dust control measures in place?', type: 'yes_no' },
        { id: '8', question: 'SWPPP available on site?', type: 'yes_no' },
      ],
    },
    {
      name: 'Pre-Work Safety Checklist',
      description: 'General pre-work inspection before starting tasks',
      category: 'PRE_WORK',
      items: [
        { id: '1', question: 'JHA/JSA reviewed with crew?', type: 'yes_no' },
        { id: '2', question: 'All required permits obtained?', type: 'yes_no' },
        { id: '3', question: 'Tools and equipment inspected?', type: 'yes_no' },
        { id: '4', question: 'PPE requirements identified and in use?', type: 'yes_no' },
        { id: '5', question: 'Work area inspected for hazards?', type: 'yes_no' },
        { id: '6', question: 'Emergency procedures reviewed?', type: 'yes_no' },
        { id: '7', question: 'Communication plan established?', type: 'yes_no' },
        { id: '8', question: 'Weather conditions acceptable?', type: 'yes_no' },
      ],
    },
  ]

  for (const template of inspectionTemplates) {
    await prisma.inspectionTemplate.upsert({
      where: { id: `template-${template.name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `template-${template.name.toLowerCase().replace(/\s+/g, '-')}`,
        name: template.name,
        description: template.description,
        category: template.category,
        items: template.items,
        createdBy: admin.id,
        isActive: true,
      },
    })
  }

  console.log('Created default inspection templates')

  console.log('Database seeding completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
