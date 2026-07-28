/**
 * Seed data for the four-stage submission lifecycle and the student problem
 * suggestion queue. Stage states are stored per project id; the repository joins
 * them with the project, team and problem to compose a {@link ProjectJourney},
 * so nothing here duplicates a title, roster or mentor.
 */
import type {
  FinalSubmission,
  IdeaSubmission,
  JoinRequest,
  PocSubmission,
  ProblemSuggestion,
  SelectionState,
  StageState,
} from '@/types/domain'

/** The stage states the backend stores against one project. */
export interface JourneyRecord {
  idea: StageState<IdeaSubmission>
  poc: StageState<PocSubmission>
  selection: SelectionState
  final: StageState<FinalSubmission>
}

/** A journey that has not started — every new project begins here. */
export const EMPTY_JOURNEY: JourneyRecord = {
  idea: { status: 'draft', data: null },
  poc: { status: 'draft', data: null },
  selection: { status: 'not_reviewed' },
  final: { status: 'draft', data: null },
}

export const MOCK_JOURNEYS: Record<string, JourneyRecord> = {
  // Idea approved, proof of concept returned with changes requested.
  'pr-01': {
    idea: {
      status: 'approved',
      submittedAt: '2026-05-14T10:00:00Z',
      reviewedAt: '2026-05-18T09:00:00Z',
      facultyFeedback: 'Strong framing. Keep the on-device constraint explicit in the PoC.',
      data: {
        title: 'Smart Attendance System',
        problemStatement:
          'Roll-call consumes 6-8 minutes of every lecture and proxy attendance is common in large halls.',
        proposedSolution:
          'An on-device face recognition kiosk that marks attendance as students enter, with no images leaving the device.',
        approach:
          'Benchmark lightweight embedding models, quantise the best one for the Jetson Nano, then pair it with an offline-first attendance ledger that syncs when the network returns.',
        techStack: ['Python', 'PyTorch', 'ONNX Runtime', 'React', 'FastAPI'],
        expectedOutcome:
          'Lecture attendance recorded in under 30 seconds for a 90-student hall, with an auditable per-session log.',
        presentationUrl: 'https://drive.crce.edu.in/decks/smart-attendance-idea.pdf',
        supportingLinks: ['https://arxiv.org/abs/1804.07573'],
      },
    },
    poc: {
      status: 'changes_requested',
      submittedAt: '2026-07-08T11:30:00Z',
      reviewedAt: '2026-07-12T09:30:00Z',
      facultyFeedback:
        'The demo covers the happy path only. Add the offline sync recording and show the false-match rate on the held-out set before resubmitting.',
      data: {
        description:
          'Working kiosk prototype running quantised inference on a Jetson Nano, with a React dashboard reading the local ledger.',
        githubUrl: 'https://github.com/crce-innovation/smart-attendance',
        demoUrl: 'https://smart-attendance-demo.crce.edu.in',
        prototypeImages: ['https://cdn.crce.edu.in/poc/attendance-kiosk.png'],
        presentationUrl: 'https://drive.crce.edu.in/decks/smart-attendance-poc.pdf',
        videoUrl: 'https://youtu.be/crce-attendance-poc',
        documents: [],
      },
    },
    selection: { status: 'not_reviewed' },
    final: { status: 'draft', data: null },
  },

  // Selected for final development — Stage 4 is unlocked and in draft.
  'pr-02': {
    idea: {
      status: 'approved',
      submittedAt: '2026-03-02T10:00:00Z',
      reviewedAt: '2026-03-06T10:00:00Z',
      data: {
        title: 'Campus Energy Dashboard',
        problemStatement:
          'Block-level electricity use is only visible on the monthly bill, so waste is found weeks after it happens.',
        proposedSolution:
          'Clamp meters on each block feeding a live dashboard with per-block baselines and anomaly alerts.',
        approach:
          'Install non-invasive current sensors, stream readings over MQTT into a time-series store, and surface a live dashboard with weekly baselines.',
        techStack: ['ESP32', 'MQTT', 'TimescaleDB', 'React'],
        expectedOutcome: 'Per-block consumption visible within a minute, with alerts on 20% deviations.',
        supportingLinks: [],
      },
    },
    poc: {
      status: 'approved',
      submittedAt: '2026-05-28T10:00:00Z',
      reviewedAt: '2026-06-02T10:00:00Z',
      facultyFeedback: 'Calibration data is convincing. Proceed to the full build.',
      data: {
        description: 'Two blocks instrumented end to end with a live dashboard and alerting.',
        githubUrl: 'https://github.com/crce-innovation/campus-energy',
        demoUrl: 'https://energy.crce.edu.in/demo',
        prototypeImages: ['https://cdn.crce.edu.in/poc/energy-dashboard.png'],
        presentationUrl: 'https://drive.crce.edu.in/decks/campus-energy-poc.pdf',
        documents: ['https://drive.crce.edu.in/docs/energy-calibration.pdf'],
      },
    },
    selection: {
      status: 'selected',
      feedback:
        'Selected for final development. Extend the instrumentation to all six blocks and add an export for the estate team.',
      decidedBy: 'Dr. Priya Nair',
      decidedAt: '2026-07-15T09:00:00Z',
    },
    final: {
      status: 'draft',
      savedAt: '2026-07-22T18:20:00Z',
      data: {
        description: 'Campus-wide rollout in progress — four of six blocks instrumented.',
        githubUrl: 'https://github.com/crce-innovation/campus-energy',
        liveUrl: '',
        techStack: ['ESP32', 'MQTT', 'TimescaleDB', 'React'],
        screenshots: [],
        documents: [],
      },
    },
  },

  // Nothing submitted yet — the workspace opens on an empty Stage 1 form.
  'pr-04': EMPTY_JOURNEY,

  // Finished: selected, built and approved.
  'pr-03': {
    idea: {
      status: 'approved',
      submittedAt: '2026-01-10T10:00:00Z',
      reviewedAt: '2026-01-14T10:00:00Z',
      data: {
        title: 'Accessible Navigation App',
        problemStatement:
          'Campus wayfinding assumes stairs and kerbs, which leaves students with mobility needs without a usable route.',
        proposedSolution:
          'A routing app that only returns step-free paths, built on a surveyed accessibility graph of the campus.',
        approach:
          'Survey every path segment for gradient and surface, encode it as a weighted graph, and route over it with a screen-reader-first interface.',
        techStack: ['React Native', 'GraphHopper', 'PostGIS'],
        expectedOutcome: 'Step-free routing between any two campus buildings, verified with student testers.',
        supportingLinks: [],
      },
    },
    poc: {
      status: 'approved',
      submittedAt: '2026-03-01T10:00:00Z',
      reviewedAt: '2026-03-08T10:00:00Z',
      data: {
        description: 'Routing prototype covering the north campus with an audited accessibility graph.',
        githubUrl: 'https://github.com/crce-innovation/accessible-nav',
        prototypeImages: [],
        documents: [],
      },
    },
    selection: {
      status: 'selected',
      feedback: 'Selected — the accessibility audit is the strongest submission in this cohort.',
      decidedBy: 'Dr. Neha Kulkarni',
      decidedAt: '2026-03-12T10:00:00Z',
    },
    final: {
      status: 'approved',
      submittedAt: '2026-03-28T10:00:00Z',
      reviewedAt: '2026-04-01T10:00:00Z',
      facultyFeedback: 'Approved. Shipped to the campus app and handed to the estates team.',
      data: {
        description:
          'Step-free routing across the whole campus, tested with eight students and adopted by the estates team.',
        githubUrl: 'https://github.com/crce-innovation/accessible-nav',
        liveUrl: 'https://nav.crce.edu.in',
        demoUrl: 'https://youtu.be/crce-accessible-nav',
        presentationUrl: 'https://drive.crce.edu.in/decks/accessible-nav-final.pdf',
        reportUrl: 'https://drive.crce.edu.in/docs/accessible-nav-report.pdf',
        techStack: ['React Native', 'GraphHopper', 'PostGIS'],
        screenshots: ['https://cdn.crce.edu.in/final/accessible-nav-routes.png'],
        documents: [],
      },
    },
  },
}

/**
 * Suggestions the signed-in student has raised, plus one waiting on the mentor
 * so both sides of the workflow are exercisable in the demo.
 */
export const MOCK_SUGGESTIONS: ProblemSuggestion[] = [
  {
    id: 'ps-01',
    status: 'pending_mentor_review',
    submittedBy: 'Aarav Sharma',
    submittedAt: '2026-07-20T09:15:00Z',
    mentorName: 'Dr. Neha Kulkarni',
    input: {
      title: 'Lab Equipment Booking Conflicts',
      description:
        'Shared lab equipment is booked on a paper register, so two teams regularly turn up for the same oscilloscope slot and one loses an afternoon.',
      category: 'Computer Engineering',
      importance:
        'Final-year project work is time-boxed; a lost lab afternoon costs a team roughly a week of iteration.',
      expectedImpact:
        'A single booking source of truth would remove double-bookings and show which equipment is genuinely over-subscribed.',
      mentorId: 'u4',
      referenceLinks: [],
    },
  },
  {
    id: 'ps-02',
    status: 'changes_requested',
    submittedBy: 'Aarav Sharma',
    submittedAt: '2026-07-02T14:40:00Z',
    reviewedAt: '2026-07-05T11:00:00Z',
    mentorFeedback:
      'The problem is real but the scope is a product, not a student project. Narrow it to the hostel mess and quantify the waste you have measured.',
    mentorName: 'Dr. Priya Nair',
    input: {
      title: 'Campus Food Waste Tracking',
      description: 'No one measures how much prepared food is discarded across campus kitchens each day.',
      category: 'Electronics Engineering',
      importance: 'Waste is paid for twice — once to buy it and once to dispose of it.',
      expectedImpact: 'Measured waste per kitchen would let catering adjust portions against real demand.',
      mentorId: 'u5',
      referenceLinks: ['https://www.fao.org/food-loss-and-food-waste'],
    },
  },
]

/** Join requests waiting on the signed-in student's own team lead. */
export const MOCK_JOIN_REQUESTS: JoinRequest[] = [
  {
    id: 'jr-01',
    teamId: 't-alpha',
    teamName: 'Team Alpha',
    studentId: 'u7',
    studentName: 'Meera Joshi',
    avatarInitials: 'MJ',
    message: 'I have built two React dashboards and can take the attendance log view.',
    requestedAt: '2026-07-24T10:05:00Z',
  },
  {
    id: 'jr-02',
    teamId: 't-alpha',
    teamName: 'Team Alpha',
    studentId: 'u3',
    studentName: 'Kabir Singh',
    avatarInitials: 'KS',
    message: 'Happy to own the Jetson deployment and the offline sync testing.',
    requestedAt: '2026-07-25T16:40:00Z',
  },
]
