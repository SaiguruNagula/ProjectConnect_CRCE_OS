import type { AdminDashboardData } from '@/types/domain'

/**
 * Admin Dashboard ("Platform Snapshot") mock aggregate.
 *
 * Values are ported verbatim from the approved Stitch prototype
 * (frontend/projectconnect_admin_operational_master_control_refined). Served
 * through AdminRepository.dashboard() so the swap to the future
 * GET /api/v1/admin/dashboard endpoint changes nothing above the repository.
 */
export const ADMIN_DASHBOARD: AdminDashboardData = {
  kpis: [
    { label: 'Total Institutions', value: '42', note: '+2 this month', tone: 'positive' },
    { label: 'Total Users', value: '14,320', note: '+12% growth', tone: 'positive' },
    { label: 'Active Projects', value: '840', note: 'Live environments', tone: 'neutral' },
    { label: 'Total Solutions', value: '2,104', note: 'Vetted modules', tone: 'neutral' },
    { label: 'Credits Issued', value: '125k', note: 'Institutional credit', tone: 'brand' },
    { label: 'Pending Approvals', value: '65', note: 'Action required', tone: 'critical' },
  ],
  // Monthly adoption growth (Jan–Jun 2023); values are relative bar heights.
  adoption: [
    { month: 'JAN', value: 30 },
    { month: 'FEB', value: 45 },
    { month: 'MAR', value: 60 },
    { month: 'APR', value: 75 },
    { month: 'MAY', value: 90 },
    { month: 'JUN', value: 100 },
  ],
  operationalQueue: [
    { id: 'q1', label: 'Inst. Requests', count: 3, unit: 'new', icon: 'domain_add', priority: 'High', tone: 'error' },
    { id: 'q2', label: 'Principal Verif.', count: 12, unit: 'pending', icon: 'how_to_reg', priority: 'Med', tone: 'warning' },
    { id: 'q3', label: 'Faculty Verif.', count: 45, unit: 'waiting', icon: 'badge', priority: 'Urgent', tone: 'secondary' },
    { id: 'q4', label: 'Reported Acc.', count: 5, unit: 'flagged', icon: 'report', priority: 'High', tone: 'error' },
  ],
  moderation: [
    { label: 'Reported Users', value: 12, tone: 'error' },
    { label: 'Reported Projects', value: 8, tone: 'error' },
    { label: 'Reported Solutions', value: 4, tone: 'warning' },
    { label: 'Policy Violations', value: 2, tone: 'error' },
    { label: 'Blocked Inst.', value: 1, tone: 'neutral' },
  ],
  institutions: [
    { id: 'crce', name: 'CRCE', location: 'Bandra, Mumbai', principal: 'Dr. Srija Unnikrishnan', students: 1240, faculty: 85, projects: 42, status: 'Active', participation: 'Active', participationActive: true },
    { id: 'vesit', name: 'VESIT', location: 'Chembur, Mumbai', principal: 'Dr. J. M. Nair', students: 2100, faculty: 120, projects: 56, status: 'Active', participation: 'Active', participationActive: false },
    { id: 'spit', name: 'SPIT', location: 'Andheri, Mumbai', principal: 'Dr. B. N. Chaudhari', students: 1850, faculty: 98, projects: 38, status: 'Inactive', participation: 'Pilot', participationActive: false },
    { id: 'djs', name: 'DJ Sanghvi', location: 'Vile Parle, Mumbai', principal: 'Dr. Hari Vasudevan', students: 2400, faculty: 145, projects: 64, status: 'Active', participation: 'Active', participationActive: false },
  ],
  recentInstitutionActivity: [
    { id: 'a1', institution: 'CRCE', detail: '+5 Projects added' },
    { id: 'a2', institution: 'VESIT', detail: '+3 Teams verified' },
    { id: 'a3', institution: 'SPIT', detail: 'Updated Principal profile' },
  ],
  platformHealth: [
    { label: 'API Gateway', value: '99.9%', tone: 'good', fill: 99 },
    { label: 'Database Cluster', value: 'Healthy', tone: 'good', fill: 100 },
    { label: 'S3 Storage', value: '4.2 TB', tone: 'neutral', fill: 45 },
    { label: 'Active Sessions', value: '1,429', tone: 'neutral' },
  ],
  systemLogs: [
    { id: 'l1', time: '14:02:12', actor: 'SuperAdmin', message: 'updated CRCE configuration', result: 'SUCCESS' },
    { id: 'l2', time: '13:58:44', actor: 'System', message: 'auto-approved User_9921 verification', result: 'SUCCESS' },
    { id: 'l3', time: '13:45:01', actor: 'SecurityAudit', message: 'suspended account ID_10292 (Anomalous traffic)', result: 'FLAGGED' },
    { id: 'l4', time: '13:12:30', actor: 'Admin_Rahul', message: 'invited Principal to VESIT', result: 'SUCCESS' },
  ],
  auditLog: [
    { id: 't1', timestamp: '2023-11-24 14:02:12', action: 'INSTITUTION_UPDATE', actor: 'SuperAdmin (ID:002)', target: 'Institution: CRCE', result: 'SUCCESS', ok: true },
    { id: 't2', timestamp: '2023-11-24 13:58:44', action: 'USER_VERIFIED', actor: 'System-Auto', target: 'User_9921', result: 'SUCCESS', ok: true },
    { id: 't3', timestamp: '2023-11-24 13:45:01', action: 'ACCOUNT_SUSPENSION', actor: 'SecurityAudit', target: 'User: ID_10292', result: 'FAILURE_BLOCK', ok: false },
  ],
}
