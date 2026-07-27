/**
 * Faculty profile state — loads the editable identity and persists edits through
 * facultyProfileService, tracking saving/success/error so the page never touches
 * the service directly (Component → Hook → Service → Repository → API). Verified
 * reputation/contribution data is loaded separately (read-only) by the page.
 */
import { useState } from 'react'
import { useAsync } from '@/hooks/useAsync'
import { facultyProfileService } from '@/services/catalog.service'
import type { FacultyProfile } from '@/types/domain'

export function useFacultyProfile() {
  const { data, loading, error, reload } = useAsync<FacultyProfile>(() => facultyProfileService.get())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function save(patch: Partial<FacultyProfile>): Promise<boolean> {
    setSaving(true)
    setSaveError(null)
    try {
      await facultyProfileService.update(patch)
      setSaved(true)
      reload()
      return true
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Could not save your profile. Please try again.')
      return false
    } finally {
      setSaving(false)
    }
  }

  return { profile: data, loading, error, saving, saveError, saved, save, dismissSaved: () => setSaved(false) }
}
