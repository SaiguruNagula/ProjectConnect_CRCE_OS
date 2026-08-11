/**
 * The field list for each stage, in the order it is read. Shared by the student
 * workspace (its read-only record) and the faculty Review Engine (the submitted
 * content under review) so both surfaces show the same fields under the same
 * labels, from the same submission — never a second copy of it.
 */
import type { FinalSubmission, IdeaSubmission, PocSubmission } from '@/types/domain'
import type { SummaryRow } from './StageSummary'

export function ideaRows(data: IdeaSubmission | null | undefined): SummaryRow[] {
  return [
    { label: 'Project Title', value: data?.title },
    { label: 'Problem Statement', value: data?.problemStatement },
    { label: 'Proposed Solution', value: data?.proposedSolution },
    { label: 'Approach', value: data?.approach },
    { label: 'Technology Stack', value: data?.techStack.join(', ') },
    { label: 'Expected Outcome', value: data?.expectedOutcome },
    { label: 'Presentation', value: data?.presentationUrl, link: true },
    { label: 'Supporting Documents', value: data?.supportingLinks, link: true },
  ]
}

export function pocRows(data: PocSubmission | null | undefined): SummaryRow[] {
  return [
    { label: 'Description', value: data?.description },
    { label: 'GitHub Repository', value: data?.githubUrl, link: true },
    { label: 'Prototype Images', value: data?.prototypeImages, link: true },
    { label: 'Demo Link', value: data?.demoUrl, link: true },
    { label: 'Presentation', value: data?.presentationUrl, link: true },
    { label: 'Video', value: data?.videoUrl, link: true },
    { label: 'Documents', value: data?.documents, link: true },
  ]
}

export function finalRows(data: FinalSubmission | null | undefined): SummaryRow[] {
  return [
    { label: 'Final Project Description', value: data?.description },
    { label: 'GitHub Repository', value: data?.githubUrl, link: true },
    { label: 'Live Project', value: data?.liveUrl, link: true },
    { label: 'Working Demo', value: data?.demoUrl, link: true },
    { label: 'Final Presentation', value: data?.presentationUrl, link: true },
    { label: 'Final Report', value: data?.reportUrl, link: true },
    { label: 'Demo Video', value: data?.videoUrl, link: true },
    { label: 'Technology Stack', value: data?.techStack.join(', ') },
    { label: 'Screenshots', value: data?.screenshots, link: true },
    { label: 'Supporting Documents', value: data?.documents, link: true },
  ]
}
