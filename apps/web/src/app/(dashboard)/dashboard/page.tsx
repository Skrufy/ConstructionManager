import { getCurrentUser } from '@/lib/auth-helpers'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import {
  Clock,
  FileText,
  Image,
  FolderKanban,
  Layers,
  CheckCircle,
  Play,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  MapPin,
  AlertTriangle,
  Activity,
  Briefcase,
} from 'lucide-react'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  const userRole = user?.role || 'VIEWER'
  const isManager = ['ADMIN', 'PROJECT_MANAGER', 'SUPERINTENDENT'].includes(userRole)
  const isAdmin = ['ADMIN', 'PROJECT_MANAGER'].includes(userRole)

  // Fetch company settings to check module status
  const companySettings = await prisma.companySettings.findFirst()

  // Helper to check if module is visible for this user's role
  const isModuleVisibleForRole = (moduleKey: string): boolean => {
    const moduleValue = (companySettings as Record<string, unknown>)?.[moduleKey]
    const globalEnabled = typeof moduleValue === 'boolean' ? moduleValue : true
    if (!globalEnabled) return false

    const roleOverrides = (companySettings?.roleModuleOverrides as Record<string, Record<string, boolean>> | null) ?? {}
    const userOverrides = roleOverrides[userRole]
    if (userOverrides && moduleKey in userOverrides) {
      return userOverrides[moduleKey]
    }

    return globalEnabled
  }

  const isTimeTrackingEnabled = isModuleVisibleForRole('moduleTimeTracking')
  const isDailyLogsEnabled = isModuleVisibleForRole('moduleDailyLogs')
  const isDocumentsEnabled = isModuleVisibleForRole('moduleDocuments')

  // Build project visibility filter
  const projectWhere: Record<string, unknown> = { status: 'ACTIVE' }
  if (!isAdmin) {
    projectWhere.OR = [
      { visibilityMode: 'ALL' },
      {
        assignments: {
          some: {
            userId: user?.id,
          },
        },
      },
    ]
  }

  const now = new Date()
  const todayStart = new Date(now.setHours(0, 0, 0, 0))
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  const lastWeekStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)

  // Fetch comprehensive dashboard data
  const [
    projects,
    weekLogs,
    lastWeekLogs,
    activeTimeEntries,
    weeklyHours,
    lastWeekHours,
    recentActivity,
    activeEntry,
    pendingDrafts,
    teamMembers,
    weekFiles,
  ] = await Promise.all([
    // Projects with assignment counts
    prisma.project.findMany({
      where: projectWhere,
      include: {
        _count: {
          select: {
            assignments: true,
            dailyLogs: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
    }),
    // This week's logs
    prisma.dailyLog.count({
      where: {
        date: { gte: weekStart },
      },
    }),
    // Last week's logs (for comparison)
    prisma.dailyLog.count({
      where: {
        date: { gte: lastWeekStart, lt: weekStart },
      },
    }),
    // Active time entries (clocked in)
    isTimeTrackingEnabled
      ? prisma.timeEntry.count({
          where: { clockOut: null },
        })
      : Promise.resolve(0),
    // This week's hours for current user
    isTimeTrackingEnabled
      ? prisma.timeEntry.findMany({
          where: {
            userId: user?.id,
            clockIn: { gte: weekStart },
            clockOut: { not: null },
          },
          select: { clockIn: true, clockOut: true },
        })
      : Promise.resolve([]),
    // Last week's hours for comparison
    isTimeTrackingEnabled
      ? prisma.timeEntry.findMany({
          where: {
            userId: user?.id,
            clockIn: { gte: lastWeekStart, lt: weekStart },
            clockOut: { not: null },
          },
          select: { clockIn: true, clockOut: true },
        })
      : Promise.resolve([]),
    // Recent activity (last 5 logs)
    isDailyLogsEnabled
      ? prisma.dailyLog.findMany({
          where: isAdmin
            ? {}
            : {
                OR: [
                  { submittedBy: user?.id },
                  {
                    project: {
                      assignments: {
                        some: { userId: user?.id },
                      },
                    },
                  },
                ],
              },
          select: {
            id: true,
            date: true,
            notes: true,
            createdAt: true,
            project: { select: { name: true } },
            submitter: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        })
      : Promise.resolve([]),
    // Current clock in status
    isTimeTrackingEnabled
      ? prisma.timeEntry.findFirst({
          where: {
            userId: user?.id,
            clockOut: null,
          },
          include: { project: { select: { name: true } } },
        })
      : null,
    // Pending document drafts
    isAdmin && user?.id
      ? prisma.documentSplitDraft.count({
          where: {
            uploaderId: user.id,
            status: 'DRAFT',
          },
        })
      : Promise.resolve(0),
    // Team members count (for managers)
    isManager
      ? prisma.user.count({
          where: { status: 'ACTIVE' },
        })
      : Promise.resolve(0),
    // Files uploaded this week
    isDocumentsEnabled
      ? prisma.file.count({
          where: {
            createdAt: { gte: weekStart },
            ...(isAdmin
              ? {}
              : {
                  project: {
                    OR: [
                      { visibilityMode: 'ALL' },
                      {
                        assignments: {
                          some: { userId: user?.id },
                        },
                      },
                    ],
                  },
                }),
          },
        })
      : Promise.resolve(0),
  ])

  // Calculate stats
  const totalWeeklyHours = weeklyHours.reduce((acc, entry) => {
    if (entry.clockOut) {
      const hours =
        (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)
      return acc + hours
    }
    return acc
  }, 0)

  const totalLastWeekHours = lastWeekHours.reduce((acc, entry) => {
    if (entry.clockOut) {
      const hours =
        (new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / (1000 * 60 * 60)
      return acc + hours
    }
    return acc
  }, 0)

  // Calculate trends
  const logsChange = lastWeekLogs > 0 ? ((weekLogs - lastWeekLogs) / lastWeekLogs) * 100 : 0
  const hoursChange =
    totalLastWeekHours > 0 ? ((totalWeeklyHours - totalLastWeekHours) / totalLastWeekHours) * 100 : 0

  const totalProjects = await prisma.project.count({ where: projectWhere })

  const isWeatherConfigured = !!process.env.OPENWEATHER_API_KEY

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-primary-100 text-lg">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
          {activeEntry && (
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <div>
                <p className="text-sm font-medium">Clocked In</p>
                <p className="text-xs text-primary-100">{activeEntry.project.name}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Pending Drafts Alert */}
      {isAdmin && pendingDrafts > 0 && (
        <Link
          href="/documents"
          className="block bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-xl p-4 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                {pendingDrafts === 1
                  ? '1 document set pending review'
                  : `${pendingDrafts} document sets pending review`}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Click to continue reviewing and splitting your uploaded documents
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
        </Link>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Projects */}
        <Link
          href="/projects"
          className="card p-5 hover:shadow-lg transition-all border-2 border-transparent hover:border-purple-200 dark:hover:border-purple-800"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
              <FolderKanban className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{totalProjects}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Active Projects</p>
        </Link>

        {/* Daily Logs */}
        {isDailyLogsEnabled && (
          <Link
            href="/daily-logs"
            className="card p-5 hover:shadow-lg transition-all border-2 border-transparent hover:border-green-200 dark:hover:border-green-800"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              {logsChange !== 0 && (
                <div
                  className={`flex items-center gap-1 ${
                    logsChange > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {logsChange > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="text-xs font-semibold">{Math.abs(logsChange).toFixed(0)}%</span>
                </div>
              )}
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{weekLogs}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Logs This Week</p>
          </Link>
        )}

        {/* Hours Worked */}
        {isTimeTrackingEnabled && (
          <Link
            href="/time-tracking"
            className="card p-5 hover:shadow-lg transition-all border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              {hoursChange !== 0 && (
                <div
                  className={`flex items-center gap-1 ${
                    hoursChange > 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {hoursChange > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  <span className="text-xs font-semibold">{Math.abs(hoursChange).toFixed(0)}%</span>
                </div>
              )}
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {totalWeeklyHours.toFixed(1)}
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Hours This Week</p>
          </Link>
        )}

        {/* Team Members */}
        {isManager && (
          <Link
            href="/admin/users"
            className="card p-5 hover:shadow-lg transition-all border-2 border-transparent hover:border-orange-200 dark:hover:border-orange-800"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              {activeTimeEntries > 0 && (
                <div className="flex items-center gap-1 text-green-600">
                  <Activity className="h-4 w-4" />
                  <span className="text-xs font-semibold">{activeTimeEntries} active</span>
                </div>
              )}
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{teamMembers}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Team Members</p>
          </Link>
        )}

        {/* Files This Week */}
        {isDocumentsEnabled && (
          <Link
            href="/documents"
            className="card p-5 hover:shadow-lg transition-all border-2 border-transparent hover:border-cyan-200 dark:hover:border-cyan-800"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center">
                <Image className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
              </div>
              <ChevronRight className="h-5 w-5 text-gray-400" />
            </div>
            <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">{weekFiles}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Files This Week</p>
          </Link>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Quick Actions & Projects */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Actions */}
          <div className="card p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary-600" />
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {isDailyLogsEnabled && (
                <Link
                  href="/daily-logs/new"
                  className="group p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border-2 border-green-100 dark:border-green-900/30 hover:border-green-300 dark:hover:border-green-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">New Daily Log</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Record today's work</p>
                    </div>
                  </div>
                </Link>
              )}

              {isTimeTrackingEnabled && (
                <Link
                  href="/time-tracking"
                  className={`group p-4 rounded-xl border-2 transition-all ${
                    activeEntry
                      ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-100 dark:border-green-900/30 hover:border-green-300 dark:hover:border-green-700'
                      : 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${
                        activeEntry ? 'bg-green-600' : 'bg-blue-600'
                      }`}
                    >
                      {activeEntry ? (
                        <Clock className="h-5 w-5 text-white" />
                      ) : (
                        <Play className="h-5 w-5 text-white" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {activeEntry ? 'Clock Out' : 'Clock In'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {activeEntry ? 'End work session' : 'Start tracking time'}
                      </p>
                    </div>
                  </div>
                </Link>
              )}

              {isDocumentsEnabled && (
                <Link
                  href="/documents"
                  className="group p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border-2 border-purple-100 dark:border-purple-900/30 hover:border-purple-300 dark:hover:border-purple-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Image className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">Upload Photos</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Document progress</p>
                    </div>
                  </div>
                </Link>
              )}

              {isDocumentsEnabled && (
                <Link
                  href="/drawings"
                  className="group p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border-2 border-orange-100 dark:border-orange-900/30 hover:border-orange-300 dark:hover:border-orange-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Layers className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">View Drawings</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Browse plan sets</p>
                    </div>
                  </div>
                </Link>
              )}

              {isDocumentsEnabled && (
                <Link
                  href="/documents"
                  className="group p-4 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 rounded-xl border-2 border-cyan-100 dark:border-cyan-900/30 hover:border-cyan-300 dark:hover:border-cyan-700 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <FolderKanban className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">View Documents</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Browse all files</p>
                    </div>
                  </div>
                </Link>
              )}
            </div>
          </div>

          {/* Active Projects */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary-600" />
                Recent Projects
              </h2>
              <Link
                href="/projects"
                className="text-sm font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1"
              >
                View All
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {projects.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No projects yet</p>
                </div>
              ) : (
                projects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block p-4 bg-gray-50 dark:bg-gray-800 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                          {project.name}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                          {project.address && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {project.address}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {project._count.assignments} members
                          </span>
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {project._count.dailyLogs} logs
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

        </div>

        {/* Right Column - Activity & Info */}
        <div className="space-y-6">
          {/* Recent Activity */}
          {isDailyLogsEnabled && recentActivity.length > 0 && (
            <div className="card p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary-600" />
                Recent Activity
              </h2>
              <div className="space-y-3">
                {recentActivity.map((log) => (
                  <Link
                    key={log.id}
                    href={`/daily-logs/${log.id}`}
                    className="block p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {log.project.name}
                        </p>
                        {log.notes ? (
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mt-1">
                            {log.notes}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-500 italic mt-1">
                            No notes added
                          </p>
                        )}
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                          {log.submitter.name} · {new Date(log.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* System Status - For Admins */}
          {isAdmin && (
            <div className="card p-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary-600" />
                System Status
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Database
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-green-600">Online</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Authentication
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-green-600">Active</span>
                </div>
                <div
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    isWeatherConfigured
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-yellow-50 dark:bg-yellow-900/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isWeatherConfigured ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      Weather API
                    </span>
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isWeatherConfigured ? 'text-green-600' : 'text-yellow-600'
                    }`}
                  >
                    {isWeatherConfigured ? 'Connected' : 'Not Setup'}
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
