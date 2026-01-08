import { getCurrentUser } from '@/lib/auth-helpers'
import { redirect } from 'next/navigation'
import { canAccess } from '@/lib/permissions'

export default async function EquipmentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // Check if user has permission to access equipment
  // This uses the canAccess function which checks SUPERINTENDENT+ OR MECHANIC
  if (!canAccess(user.role, 'equipment')) {
    redirect('/dashboard?error=insufficient_permissions')
  }

  return <>{children}</>
}
