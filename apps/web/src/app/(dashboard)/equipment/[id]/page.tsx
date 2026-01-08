import { EquipmentDetailClient } from './equipment-detail-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EquipmentDetailPage({ params }: PageProps) {
  const { id } = await params
  return <EquipmentDetailClient equipmentId={id} />
}
