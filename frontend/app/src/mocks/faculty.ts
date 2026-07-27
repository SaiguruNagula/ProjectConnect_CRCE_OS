import type { FacultyProfile, FacultyReputation } from '@/types/domain'

/**
 * Editable institutional identity for the demo faculty (Dr. Neha Kulkarni,
 * u-fac-01). The verified contribution metrics live in MOCK_FACULTY_REPUTATION
 * and in the contribution services — never here — so this object is the single
 * place the faculty's own personal data is entered.
 */
export const MOCK_FACULTY_PROFILE: FacultyProfile = {
  userId: 'u-fac-01',
  name: 'Dr. Neha Kulkarni',
  avatarInitials: 'NK',
  facultyId: 'FAC-9920-X82',
  designation: 'Senior Reviewer & Research Lead',
  department: 'Computer Engineering',
  email: 'neha.kulkarni@crce.edu.in',
  phone: '+91 98200 44120',
  bio: 'A dedicated researcher with over 12 years of experience in distributed systems. Dr. Kulkarni spearheads the AI-Governance initiatives at the Innovations Hub, focusing on transparent review protocols for decentralized academic networks.',
  teachingFocus: 'System Architecture, Web3 Ethics',
  innovationFocus: 'Auto-Review Engines',
  experienceYears: 12,
  researchDomains: ['AI Systems', 'Web3', 'Federated ML', 'Distributed Systems'],
  skills: ['Rust', 'Protocols', 'Edge AI', 'System Design'],
  officeLocation: 'Block C-402',
  maxTeams: 15,
  openForMentorship: true,
  visibility: 'institutional',
  github: 'neha-kulkarni',
  linkedin: 'neha-kulkarni',
}

/** Verified faculty standing — system-generated, read-only on the profile. */
export const MOCK_FACULTY_REPUTATION: FacultyReputation = {
  rank: 1,
  percentileLabel: 'Top 5% Faculty',
  scores: [
    { label: 'Review Quality', value: 98 },
    { label: 'Mentorship Score', value: 92 },
    { label: 'Innovation Contribution', value: 85 },
  ],
  badges: [
    { icon: 'architecture', label: 'Master Architect' },
    { icon: 'workspace_premium', label: 'Elite Reviewer' },
  ],
  nextBadge: { label: 'Master Reviewer', progress: 78 },
  engineMetrics: [
    { label: 'Approval Rate', value: 82, caption: 'Approved vs. reviewed' },
    { label: 'On-time Reviews', value: 94, caption: 'Within SLA window' },
    { label: 'Feedback Depth', value: 88, caption: 'Rubric coverage' },
  ],
  portfolio: [
    { label: 'Publications', icon: 'menu_book', count: 12 },
    { label: 'Case Studies', icon: 'science', count: 5 },
  ],
}
