import type { Problem } from '@/types/domain'

export const MOCK_PROBLEMS: Problem[] = [
  {
    id: 'p-01',
    title: 'Smart Attendance via Face Recognition',
    summary:
      'Automate lecture attendance using on-device face recognition to eliminate manual roll calls.',
    department: 'Computer Engineering',
    difficulty: 'Advanced',
    skills: ['Python', 'Computer Vision', 'Edge AI'],
    facultyName: 'Dr. Neha Kulkarni',
    teamSize: 4,
    timelineWeeks: 12,
    status: 'open',
    bookmarked: true,
  },
  {
    id: 'p-02',
    title: 'Campus Energy Usage Dashboard',
    summary:
      'Visualise real-time electricity consumption across campus blocks to drive conservation.',
    department: 'Electronics Engineering',
    difficulty: 'Intermediate',
    skills: ['IoT', 'React', 'Time-series'],
    facultyName: 'Dr. Priya Nair',
    teamSize: 3,
    timelineWeeks: 8,
    status: 'open',
    bookmarked: false,
  },
  {
    id: 'p-03',
    title: 'Peer Mentorship Matching Engine',
    summary:
      'Match junior students with senior mentors based on skills, interests and availability.',
    department: 'Information Technology',
    difficulty: 'Intermediate',
    skills: ['Algorithms', 'Node.js', 'PostgreSQL'],
    facultyName: 'Dr. Sameer Deshpande',
    teamSize: 3,
    timelineWeeks: 10,
    status: 'in_progress',
    bookmarked: false,
  },
  {
    id: 'p-04',
    title: 'Low-Cost Water Quality Sensor',
    summary:
      'Design an affordable sensor array to monitor drinking-water quality in nearby communities.',
    department: 'Mechanical Engineering',
    difficulty: 'Advanced',
    skills: ['Embedded C', 'Sensors', 'PCB Design'],
    facultyName: 'Dr. Anil Rao',
    teamSize: 4,
    timelineWeeks: 14,
    status: 'open',
    bookmarked: true,
  },
  {
    id: 'p-05',
    title: 'Accessible Campus Navigation App',
    summary:
      'A wayfinding app with routes optimised for students with mobility needs.',
    department: 'Computer Engineering',
    difficulty: 'Beginner',
    skills: ['React Native', 'Maps', 'Accessibility'],
    facultyName: 'Dr. Neha Kulkarni',
    teamSize: 3,
    timelineWeeks: 6,
    status: 'open',
    bookmarked: false,
  },
  {
    id: 'p-06',
    title: 'Automated Lab Equipment Booking',
    summary:
      'Replace paper registers with a conflict-free booking system for shared lab equipment.',
    department: 'Electronics Engineering',
    difficulty: 'Beginner',
    skills: ['React', 'REST', 'UX'],
    facultyName: 'Dr. Priya Nair',
    teamSize: 2,
    timelineWeeks: 5,
    status: 'closed',
    bookmarked: false,
  },
]

export const PROBLEM_DEPARTMENTS = [
  'Computer Engineering',
  'Electronics Engineering',
  'Information Technology',
  'Mechanical Engineering',
]

export const PROBLEM_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const
