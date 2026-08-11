/**
 * Seed data for the four-stage submission lifecycle and the student problem
 * suggestion queue. Stage states are stored per project id; the repository joins
 * them with the project, team and problem to compose a {@link ProjectJourney},
 * so nothing here duplicates a title, roster or mentor.
 */
import type {
  CreditAward,
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
  /** Awarded by faculty once the final project is approved. */
  credits?: CreditAward
  /** Whether the approved project was published to the Solutions Hub. */
  published?: boolean
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
      review: {
        strengths: 'The problem is well quantified and the on-device privacy constraint is a real differentiator.',
        suggestions: 'Keep the on-device constraint explicit in the proof of concept.',
        reviewedBy: 'Dr. Neha Kulkarni',
      },
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
      review: {
        strengths: 'Quantised inference runs on the target hardware — the hardest part is already working.',
        weaknesses: 'The demo covers the happy path only, and no accuracy evidence is attached.',
        suggestions:
          'Add the offline sync recording and show the false-match rate on the held-out set before resubmitting.',
        reviewedBy: 'Dr. Neha Kulkarni',
      },
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
      review: {
        strengths: 'Calibration data is convincing and the alerting threshold is justified.',
        suggestions: 'Proceed to the full build.',
        reviewedBy: 'Dr. Priya Nair',
      },
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

  // Waiting on an Idea review.
  'pr-05': {
    idea: {
      status: 'submitted',
      submittedAt: '2026-07-26T09:10:00Z',
      data: {
        title: 'NFC Attendance Terminal',
        problemStatement:
          'Face recognition struggles in the back rows of a 300-seat hall, where the camera cannot resolve a face.',
        proposedSolution:
          'A tap-in NFC terminal at every entrance, tied to the existing student ID card.',
        approach:
          'Read the existing MIFARE card ID, debounce duplicate taps locally, and post batched check-ins to the attendance service.',
        techStack: ['ESP32', 'MFRC522', 'FastAPI', 'React'],
        expectedOutcome:
          'A full hall checked in within 90 seconds with no per-student hardware cost.',
        presentationUrl: 'https://drive.crce.edu.in/decks/nfc-terminal-idea.pdf',
        supportingLinks: [],
      },
    },
    poc: { status: 'draft', data: null },
    selection: { status: 'not_reviewed' },
    final: { status: 'draft', data: null },
  },

  // Waiting on a Proof of Concept review — the selection decision happens here.
  'pr-06': {
    idea: {
      status: 'approved',
      submittedAt: '2026-05-02T09:00:00Z',
      reviewedAt: '2026-05-07T09:00:00Z',
      review: {
        strengths: 'Correctly identifies the network as the real failure mode in older blocks.',
        reviewedBy: 'Dr. Neha Kulkarni',
      },
      data: {
        title: 'Offline-First Attendance Ledger',
        problemStatement:
          'Attendance terminals in the older blocks lose the campus network several times a week, and every lost session is re-entered by hand.',
        proposedSolution:
          'A conflict-free local ledger on each terminal that reconciles with the server whenever the link returns.',
        approach:
          'Model each check-in as an append-only CRDT entry, persist it locally, and reconcile on reconnect with a deterministic merge.',
        techStack: ['Rust', 'SQLite', 'CRDT', 'FastAPI'],
        expectedOutcome: 'Zero lost sessions across a two-week outage simulation.',
        supportingLinks: [],
      },
    },
    poc: {
      status: 'submitted',
      submittedAt: '2026-07-27T14:20:00Z',
      data: {
        description:
          'Two terminals running the local ledger, reconciling correctly after a simulated 36-hour outage.',
        githubUrl: 'https://github.com/crce-innovation/attendance-ledger',
        demoUrl: 'https://ledger-demo.crce.edu.in',
        prototypeImages: ['https://cdn.crce.edu.in/poc/ledger-reconcile.png'],
        presentationUrl: 'https://drive.crce.edu.in/decks/attendance-ledger-poc.pdf',
        videoUrl: 'https://youtu.be/crce-ledger-poc',
        documents: ['https://drive.crce.edu.in/docs/ledger-merge-proof.pdf'],
      },
    },
    selection: { status: 'not_reviewed' },
    final: { status: 'draft', data: null },
  },

  // Selected, built and now waiting on the Final Project review.
  'pr-07': {
    idea: {
      status: 'approved',
      submittedAt: '2026-02-18T09:00:00Z',
      reviewedAt: '2026-02-22T09:00:00Z',
      data: {
        title: 'Privacy-Preserving Vision Pipeline',
        problemStatement:
          'Camera-based attendance is resisted because students assume their faces are stored somewhere.',
        proposedSolution:
          'A pipeline that derives an irreversible embedding at the sensor and discards the frame immediately.',
        approach:
          'Run the embedding model in the camera module, hash the embedding against the enrolled set, and never write a frame to disk.',
        techStack: ['C++', 'TensorRT', 'FastAPI', 'React'],
        expectedOutcome: 'Attendance accuracy above 97% with no recoverable image data at rest.',
        supportingLinks: [],
      },
    },
    poc: {
      status: 'approved',
      submittedAt: '2026-04-10T09:00:00Z',
      reviewedAt: '2026-04-16T09:00:00Z',
      review: {
        strengths: 'The no-frame-at-rest guarantee is demonstrated, not just claimed.',
        reviewedBy: 'Dr. Neha Kulkarni',
      },
      data: {
        description: 'Single-camera prototype hitting 96% accuracy with frames discarded in-memory.',
        githubUrl: 'https://github.com/crce-innovation/vision-privacy',
        prototypeImages: ['https://cdn.crce.edu.in/poc/vision-pipeline.png'],
        presentationUrl: 'https://drive.crce.edu.in/decks/vision-privacy-poc.pdf',
        documents: [],
      },
    },
    selection: {
      status: 'selected',
      feedback: 'Selected — take the privacy guarantee through to a full hall deployment.',
      decidedBy: 'Dr. Neha Kulkarni',
      decidedAt: '2026-04-20T09:00:00Z',
    },
    final: {
      status: 'submitted',
      submittedAt: '2026-07-28T08:45:00Z',
      data: {
        description:
          'Deployed across four lecture halls for a full term, with an independent audit of the no-frame-at-rest claim.',
        githubUrl: 'https://github.com/crce-innovation/vision-privacy',
        liveUrl: 'https://attendance.crce.edu.in',
        demoUrl: 'https://youtu.be/crce-vision-privacy',
        presentationUrl: 'https://drive.crce.edu.in/decks/vision-privacy-final.pdf',
        reportUrl: 'https://drive.crce.edu.in/docs/vision-privacy-report.pdf',
        videoUrl: 'https://youtu.be/crce-vision-privacy-demo',
        techStack: ['C++', 'TensorRT', 'FastAPI', 'React'],
        screenshots: ['https://cdn.crce.edu.in/final/vision-privacy-hall.png'],
        documents: ['https://drive.crce.edu.in/docs/vision-privacy-audit.pdf'],
      },
    },
  },

  // A solo application waiting on its Idea review.
  'pr-08': {
    idea: {
      status: 'submitted',
      submittedAt: '2026-07-28T16:05:00Z',
      data: {
        title: 'Hostel Water Usage Monitor',
        problemStatement:
          'A burst line in a hostel wing runs for days before anyone notices, because usage is only read at the mains.',
        proposedSolution: 'Per-wing flow meters with a nightly baseline and a leak alert.',
        approach:
          'Fit pulse-output flow meters per wing, stream readings hourly, and alert when overnight flow never drops to zero.',
        techStack: ['ESP32', 'MQTT', 'TimescaleDB'],
        expectedOutcome: 'Leaks flagged within one night instead of one billing cycle.',
        supportingLinks: [],
      },
    },
    poc: { status: 'draft', data: null },
    selection: { status: 'not_reviewed' },
    final: { status: 'draft', data: null },
  },

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
      review: {
        strengths: 'Genuine accessibility audit behind the routing graph, and eight real testers.',
        comments: 'Approved. Shipped to the campus app and handed to the estates team.',
        reviewedBy: 'Dr. Neha Kulkarni',
        evaluation: {
          innovation: 8,
          technicalQuality: 9,
          implementation: 9,
          documentation: 8,
          presentation: 8,
          overallRemarks:
            'A finished, adopted product with the survey work to back it up. The strongest submission of the cohort.',
        },
      },
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
    credits: {
      innovation: 40,
      implementation: 45,
      documentation: 25,
      presentation: 20,
      bonus: 10,
      total: 140,
      awardedBy: 'Dr. Neha Kulkarni',
      awardedAt: '2026-04-01T10:30:00Z',
    },
    published: true,
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
