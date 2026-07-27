import type { InstitutionAnalytics } from '@/types/domain'

/**
 * Institution analytics mock aggregate — the single source behind BOTH
 * principal views: the Executive Command Center (Principal Dashboard) and the
 * Institution Analytics workspace.
 *
 * Values are ported verbatim from the approved Stitch prototypes
 * (frontend/crce_os_principal_executive_command_center_production_refined and
 * frontend/crce_os_institution_analytics_production_master_console). Served
 * through AnalyticsRepository.institution() so the swap to the future
 * GET /api/v1/analytics/institution endpoint changes nothing above the
 * repository. Rankings are NOT modelled here — the Top Students / Top Faculty
 * panels read the Leaderboard, which stays the single source of truth.
 */
export const INSTITUTION_ANALYTICS: InstitutionAnalytics = {
  institutionName: 'Fr. Conceicao Rodrigues College of Engineering',
  period: 'Executive Overview • Academic Year 2024-25',
  // Stitch ships {{institutionStatus}}/{{statusChange}} placeholders; the values
  // below stand in until the analytics endpoint computes them.
  health: { status: 'Excellent', change: '+12.4%', caption: 'vs last quarter' },
  summary: [
    { id: 'summary-students', label: 'Total Students', value: '4,284', icon: 'groups' },
    { id: 'summary-faculty', label: 'Faculty', value: '86', icon: 'badge' },
    { id: 'summary-projects-solved', label: 'Projects Solved', value: '42', icon: 'task_alt' },
    { id: 'summary-patents', label: 'Patents Filed', value: '3', icon: 'military_tech' },
  ],
  newApprovalsCount: 2,
  approvals: [
    { id: 'ap1', title: 'Faculty Verification', icon: 'how_to_reg', priority: 'Urgent', submittedBy: 'Prof. Mehta', date: '24 Oct, 2024' },
    { id: 'ap2', title: 'Research Grants', icon: 'account_balance_wallet', priority: 'Medium', submittedBy: 'R&D Cell', date: '22 Oct, 2024' },
  ],
  reportCategories: [
    { id: 'academic', label: 'Academic Performance', icon: 'school' },
    { id: 'innovation', label: 'Innovation & Research', icon: 'rocket_launch' },
    { id: 'grants', label: 'Financial Grants', icon: 'payments' },
  ],
  reportFormats: [
    { id: 'pdf', label: 'PDF' },
    { id: 'excel', label: 'Excel' },
  ],
  snapshot: [
    { id: 'students', label: 'Total Students', value: '4,284', badge: '+2.4%', badgeTone: 'positive', fill: 85, fillTone: 'brand' },
    { id: 'faculty', label: 'Total Faculty', value: '86', note: 'PhD Ratio: 64%', noteTone: 'muted' },
    { id: 'projects', label: 'Live Projects', value: '124', badge: 'LIVE', badgeTone: 'brand', participants: 3 },
    { id: 'problems', label: 'Open Problems', value: '52', note: '12 Critical', noteTone: 'critical' },
    { id: 'credits', label: 'Credits Earned', value: '1.2M', note: 'Avg: 280/Std', noteTone: 'muted', monoNote: true },
    { id: 'rank', label: 'Inst. Rank', value: '#4', note: 'Region: West', noteTone: 'brand' },
  ],
  innovation: [
    { id: 'new-projects', label: 'New Projects', value: '18', badge: 'MO', badgeTone: 'positive' },
    { id: 'problems-solved', label: 'Problems Solved', value: '42', fill: 70, fillTone: 'positive' },
    { id: 'active-teams', label: 'Active Teams', value: '312' },
    { id: 'publications', label: 'Publications', value: '24', note: 'FY 24-25', noteTone: 'muted' },
    { id: 'collaborations', label: 'Collaborations', value: '12', note: 'Industry', noteTone: 'brand' },
    { id: 'patents', label: 'Patents', value: '3', badge: '1 GRANTED', badgeTone: 'brand' },
  ],
  // Completion rates and health flags come from the Institution Analytics
  // prototype (Computer 82% / IT 74%); the remaining departments follow the
  // same ordering as their success rates.
  departments: [
    { id: 'comps', name: 'Computer Engineering', activeProjects: 48, credits: '420k', successRate: 92, completionRate: 82, healthy: true, pendingReviews: 4, pendingReviewsCritical: true },
    { id: 'it', name: 'IT Engineering', activeProjects: 32, credits: '310k', successRate: 85, completionRate: 74, healthy: true, pendingReviews: 2, pendingReviewsCritical: false },
    { id: 'mech', name: 'Mechanical Engineering', activeProjects: 28, credits: '285k', successRate: 78, completionRate: 68, healthy: true, pendingReviews: 6, pendingReviewsCritical: true },
    { id: 'extc', name: 'Electronics Engineering', activeProjects: 12, credits: '142k', successRate: 64, completionRate: 55, healthy: false, pendingReviews: 0, pendingReviewsCritical: false },
    { id: 'prod', name: 'Production Engineering', activeProjects: 6, credits: '42k', successRate: 45, completionRate: 38, healthy: false, pendingReviews: 0, pendingReviewsCritical: false },
  ],
  decisionCount: 18,
  decisions: [
    { id: 'faculty-verifications', title: 'Faculty Verifications', detail: '4 requests from Computer Engg.', icon: 'verified', cta: 'Action Required', tone: 'brand' },
    { id: 'pending-reviews', title: 'Pending Reviews', detail: '12 High-impact project milestones', icon: 'rate_review', cta: 'Go to Queue', tone: 'brand' },
    { id: 'research-approvals', title: 'Research Approvals', detail: '2 new research grant proposals', icon: 'science', cta: 'Review Proposals', tone: 'brand' },
    { id: 'reported-issues', title: 'Reported Issues', detail: '2 Urgent moderation flags', icon: 'warning', cta: 'Investigate', tone: 'critical' },
    { id: 'policy-requests', title: 'Policy Requests', detail: 'Internal amendment for Q4 ethics', icon: 'policy', cta: 'Review Policy', tone: 'brand' },
  ],
  growth: [
    { month: 'JUL', credits: 120000, projects: 40 },
    { month: 'AUG', credits: 150000, projects: 60 },
    { month: 'SEP', credits: 240000, projects: 110 },
    { month: 'OCT', credits: 190000, projects: 95 },
  ],
  highlights: [
    { label: 'Research Growth', value: '+14.2%', note: 'YoY Increase', noteTone: 'positive' },
    { label: 'Industry Link', value: '32 Partners', note: '8 Pending MOU', noteTone: 'brand' },
    { label: 'Avg Review Time', value: '4.8 Days', note: '-12% vs LY', noteTone: 'positive' },
    { label: 'Patent Velocity', value: '0.4/Mo', note: 'Rising Trend', noteTone: 'muted' },
  ],
  departmentRadar: [
    { label: 'Research', value: 90 },
    { label: 'Placement', value: 85 },
    { label: 'Credits', value: 95 },
    { label: 'Industry', value: 80 },
    { label: 'Ethics', value: 92 },
  ],
  departmentPerformance: [
    { label: 'COMPS Performance', value: 92 },
    { label: 'MECH Performance', value: 78 },
  ],
}
