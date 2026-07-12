import type { DashboardStats } from '@/types/domain'
import type { Role } from '@/types'

/** Headline stat tiles per role dashboard. */
export const DASHBOARD_STATS: Record<Role, DashboardStats[]> = {
  student: [
    { label: 'Active Projects', value: '2', delta: '+1 this month', icon: 'folder' },
    { label: 'Total Credits', value: '4,560', delta: '+320', icon: 'stars' },
    { label: 'Leaderboard Rank', value: '#2', delta: '↑1', icon: 'leaderboard' },
    { label: 'Portfolio', value: '82%', delta: 'complete', icon: 'badge' },
  ],
  faculty: [
    { label: 'Active Problems', value: '5', delta: '2 open', icon: 'lightbulb' },
    { label: 'Teams Mentored', value: '8', delta: '+2', icon: 'groups' },
    { label: 'Pending Reviews', value: '3', delta: 'due this week', icon: 'rate_review' },
    { label: 'Faculty Credits', value: '6,120', delta: '#1 dept', icon: 'stars' },
  ],
  admin: [
    { label: 'Active Users', value: '1,284', delta: '+46', icon: 'group' },
    { label: 'Live Projects', value: '213', delta: '+12', icon: 'folder' },
    { label: 'Open Problems', value: '57', delta: '9 new', icon: 'lightbulb' },
    { label: 'Reviews / week', value: '96', delta: '+8%', icon: 'rate_review' },
  ],
  principal: [
    { label: 'Innovation Index', value: '78', delta: '+6 YoY', icon: 'trending_up' },
    { label: 'Departments', value: '4', delta: 'all active', icon: 'apartment' },
    { label: 'Research Output', value: '34', delta: '+11', icon: 'science' },
    { label: 'Placement Ready', value: '71%', delta: '+9%', icon: 'work' },
  ],
}

/** Credit trend (last 6 months) — for a simple bar/line visual. */
export const CREDIT_TREND = [
  { month: 'Feb', value: 2900 },
  { month: 'Mar', value: 3200 },
  { month: 'Apr', value: 3600 },
  { month: 'May', value: 3950 },
  { month: 'Jun', value: 4240 },
  { month: 'Jul', value: 4560 },
]

/** Department distribution — for admin/principal charts. */
export const DEPARTMENT_DISTRIBUTION = [
  { label: 'Computer', value: 92 },
  { label: 'Electronics', value: 61 },
  { label: 'IT', value: 74 },
  { label: 'Mechanical', value: 43 },
]
