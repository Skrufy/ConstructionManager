import Link from 'next/link'
import { Building2, Clock, FileText, Truck, Camera, Users } from 'lucide-react'

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">ConstructionPro</span>
            </div>
            <div className="flex gap-4">
              <Link
                href="/login"
                className="btn btn-ghost px-4 py-2"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="btn btn-primary px-4 py-2"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
            Construction Management
            <span className="block text-primary-600">Made Simple</span>
          </h1>
          <p className="mt-6 text-xl text-gray-600 max-w-3xl mx-auto">
            Streamline project execution, reduce administrative overhead, and get real-time
            visibility into your construction projects with our tap-based daily logging system.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              href="/register"
              className="btn btn-primary px-8 py-3 text-lg"
            >
              Start Free Trial
            </Link>
            <Link
              href="/login"
              className="btn btn-outline px-8 py-3 text-lg"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Everything You Need to Manage Your Projects
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<FileText className="h-8 w-8" />}
            title="Tap-Based Daily Logs"
            description="Complete daily logs in under 5 minutes with pre-defined labels and auto-populated fields."
          />
          <FeatureCard
            icon={<Clock className="h-8 w-8" />}
            title="Time Tracking"
            description="GPS-enabled clock in/out with automatic timesheet generation and approval workflows."
          />
          <FeatureCard
            icon={<Building2 className="h-8 w-8" />}
            title="Project Dashboard"
            description="Real-time project health overview with schedule, budget, and safety indicators."
          />
          <FeatureCard
            icon={<Truck className="h-8 w-8" />}
            title="Equipment Management"
            description="Track equipment location, usage hours, and maintenance schedules in real-time."
          />
          <FeatureCard
            icon={<Camera className="h-8 w-8" />}
            title="Photo Documentation"
            description="GPS-tagged photos with timestamps, organized by project and daily log entries."
          />
          <FeatureCard
            icon={<Users className="h-8 w-8" />}
            title="Role-Based Access"
            description="Secure access control for admins, project managers, superintendents, and field workers."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Building2 className="h-6 w-6 text-gray-400" />
              <span className="text-lg font-semibold text-white">ConstructionPro</span>
            </div>
            <p className="text-sm">
              &copy; 2024 ConstructionPro. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}

function FeatureCard({
  icon,
  title,
  description
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="card p-6 hover:shadow-lg transition-shadow">
      <div className="text-primary-600 mb-4">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  )
}
