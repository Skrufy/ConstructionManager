import { MaterialDetailClient } from './material-detail-client'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function MaterialDetailPage({ params }: PageProps) {
  const { id } = await params
  return <MaterialDetailClient materialId={id} />
}
