import type { PortfolioCustomization, PortfolioVerified } from '@/types/domain'
import { MOCK_PROJECTS } from '@/mocks/projects'

/**
 * The student's own portfolio curation — independently editable from the
 * Profile. Empty headline/introduction and featuredSkills mean "fall back to
 * the composed profile/verified data"; the student overrides them at will.
 */
export const MOCK_PORTFOLIO_CUSTOMIZATION: PortfolioCustomization = {
  published: true,
  headline: '',
  introduction: '',
  featuredSkills: [],
  sections: { solutions: true, research: true, hackathons: true, timeline: true },
}

/**
 * Verified/generated portfolio data only — everything sourced from trusted
 * modules (Credit Engine, Leaderboard, Project Workspace, Review Engine,
 * Research). Editable identity (name, bio, skills, socials, …) lives in
 * MOCK_STUDENT_PROFILE and is merged in by the portfolio repository, so no
 * personal field is duplicated here.
 */
export const PORTFOLIO_VERIFIED: PortfolioVerified = {
  userId: 'u-stu-01',
  facultyValidationCount: 6,
  rankPercentile: 'Top 1%',
  verifiedAchievements: [
    {
      icon: 'military_tech',
      title: "Dean's List — 2025",
      description: 'Maintained a 9.4 CGPA across advanced core computer engineering subjects.',
      tag: 'Verified by Registry',
    },
    {
      icon: 'rocket_launch',
      title: 'Winner, Smart India Hackathon 2024',
      description: 'Built a disaster-management protocol using mesh networking at the national finals.',
      tag: 'Project Excellence',
    },
    {
      icon: 'groups',
      title: 'Student Mentor Program',
      description: 'Mentored 4 junior students in Data Structures & Algorithms over 12 weeks.',
      tag: 'Community Service',
    },
  ],
  hallOfFame: ['Innovation Champion', 'Top Researcher', 'Hackathon Hero'],
  totalCredits: 2450,
  globalRank: 1,
  verifiedSolutionsCount: 12,
  projectsBuilt: 8,
  skills: ['React', 'Node.js', 'System Architecture', 'UI Design', 'IoT'],
  projects: MOCK_PROJECTS,
  solutions: [
    {
      id: 'sol-1',
      name: 'Smart Canteen Payment',
      description: 'Automated NFC-based wallet system for campus dining.',
      appUrl: '#',
      githubUrl: '#',
    },
    {
      id: 'sol-2',
      name: 'CRCE Library Bot',
      description: 'AI-driven search assistant for library resources.',
      appUrl: '#',
      githubUrl: '#',
    },
  ],
  research: [
    {
      id: 'r1',
      title: 'AI-powered Traffic Management',
      venue: 'IEEE Explorer',
      year: 2024,
      description: 'Published in IEEE Explorer 2024. Focused on dynamic lane switching algorithms.',
      url: '#',
    },
  ],
  hackathons: [
    {
      id: 'hk1',
      title: 'Winner, SIH 2024',
      description: 'National Smart India Hackathon. Developed a disaster management protocol using mesh networking.',
      badge: '1st Place | National',
    },
  ],
  certificates: [
    { id: 'ct1', title: 'Deep Learning Specialization', issuer: 'Coursera', date: '2025-11' },
    { id: 'ct2', title: 'AWS Cloud Practitioner', issuer: 'Amazon', date: '2025-08' },
  ],
  achievements: [
    'Runner-up, CRCE Innovate 2026',
    'Top 2% on the student leaderboard',
    'Mentored 4 junior students',
  ],
  timeline: [
    { id: 't1', date: '2024-08', title: 'Team Captain, Smart Attendance', description: 'Leading a team of 4 engineers for campus-wide deployment.' },
    { id: 't2', date: '2024-06', title: 'Milestone: Alpha Release', description: 'Successfully tested Smart Canteen Payment with 500+ users.' },
    { id: 't3', date: '2024-03', title: 'Credits Awarded: 500', description: 'Achievement unlock for Open Source Contributions to CRCE core.' },
  ],
}
