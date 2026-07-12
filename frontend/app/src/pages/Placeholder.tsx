/**
 * Placeholder page used for every route until its approved Stitch prototype is
 * migrated (STEP 9 — one page at a time). Renders inside the active layout so
 * routing, navigation, and chrome can be verified before page migration.
 *
 * To migrate a page: create the real page component from its `stitchSource`
 * prototype and swap it into AppRouter — nothing else changes.
 */
import { PageHeader } from '@/components/common/PageHeader'

interface PlaceholderProps {
  title: string
  /** Folder name of the approved Stitch prototype this page migrates from. */
  stitchSource?: string
}

export function Placeholder({ title, stitchSource }: PlaceholderProps) {
  return (
    <div className="mx-auto flex max-w-container-max flex-col gap-lg">
      <PageHeader title={title} subtitle="Page scaffolded — migration pending." />
      <div className="flex flex-col items-center gap-sm rounded-xl border border-dashed border-outline-variant bg-surface-container-lowest p-xl text-center">
        <span className="material-symbols-outlined text-[40px] text-on-surface-variant" aria-hidden="true">
          construction
        </span>
        <p className="text-sm text-on-surface-variant">
          This screen will be migrated from the approved Stitch prototype without
          visual changes.
        </p>
        {stitchSource && (
          <code className="rounded bg-surface-container-high px-xs py-base font-mono text-xs text-on-surface-variant">
            {stitchSource}
          </code>
        )}
      </div>
    </div>
  )
}
