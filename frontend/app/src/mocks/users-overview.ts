import type { UsersOverview } from '@/types/domain'

/**
 * Admin Users ("Access & Identity") panel aggregate.
 *
 * Values ported verbatim from the approved Stitch prototype
 * (frontend/projectconnect_admin_refined_user_management_console). Served through
 * AdminRepository.usersOverview() so the swap to a future
 * GET /api/v1/admin/users/overview endpoint changes nothing above the repository.
 * The directory rows themselves come from AdminRepository.users().
 */
export const USERS_OVERVIEW: UsersOverview = {
  kpis: [
    { label: 'Total Users', value: '14,320', note: '+2.4% vs LY', tone: 'positive' },
    { label: 'Students', value: '12,840', tone: 'neutral', progress: 89 },
    { label: 'Faculty', value: '1,124', tone: 'neutral', progress: 8 },
    { label: 'Principals', value: '356', tone: 'neutral', progress: 3 },
    { label: 'Pending Verif.', value: '45', note: 'Action required', tone: 'critical', ring: true },
    { label: 'Suspended', value: '12', note: 'High Risk', tone: 'critical' },
  ],
  verificationQueue: [
    { id: 'v1', label: 'Faculty Verif.', count: 45, unit: 'waiting', icon: 'school', priority: 'Urgent', tone: 'secondary' },
    { id: 'v2', label: 'Principal Verif.', count: 12, unit: 'pending', icon: 'account_balance', priority: 'Med', tone: 'warning' },
    { id: 'v3', label: 'Reported Acc.', count: 5, unit: 'flagged', icon: 'report', priority: 'High', tone: 'error' },
    { id: 'v4', label: 'Role Changes', count: 8, unit: 'pending', icon: 'manage_accounts', priority: 'Low', tone: 'neutral' },
  ],
  identityHealth: [
    { label: 'Auth Gateway', value: '99.99%', tone: 'good', fill: 99 },
    { label: 'Directory Sync', value: 'Optimal', tone: 'good', fill: 100 },
    { label: 'Active Sessions', value: '1,429', tone: 'neutral' },
  ],
  auditLog: [
    { id: 'a1', time: '14:02:12', actor: 'Admin_Rahul', message: 'verified', target: 'Prof. Patil', result: 'VERIFIED', ok: true },
    { id: 'a2', time: '13:45:01', actor: 'System', message: 'auto-flagged', target: 'User_8829', result: 'SUSPENDED', ok: false },
  ],
}
