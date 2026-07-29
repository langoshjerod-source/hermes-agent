import type { TaskInputAttachment } from '../domain/task'

export interface EducationTaskLaunchDraft {
  inputAttachments: TaskInputAttachment[]
  purpose: string
}

const STORAGE_PREFIX = 'mengxueban.education.task-launch.'
const memoryDrafts = new Map<string, EducationTaskLaunchDraft>()

function cloneDraft(draft: EducationTaskLaunchDraft): EducationTaskLaunchDraft {
  return {
    purpose: draft.purpose,
    inputAttachments: draft.inputAttachments.map(attachment => ({ ...attachment }))
  }
}

export function saveEducationTaskLaunchDraft(draft: EducationTaskLaunchDraft): string {
  const id = crypto.randomUUID()
  const copy = cloneDraft(draft)

  memoryDrafts.set(id, copy)

  try {
    window.sessionStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(copy))
  } catch {
    // The in-memory copy still covers navigation in privacy-restricted shells.
  }

  return id
}

export function readEducationTaskLaunchDraft(id: null | string): EducationTaskLaunchDraft | null {
  if (!id) {
    return null
  }

  const memory = memoryDrafts.get(id)

  if (memory) {
    return cloneDraft(memory)
  }

  try {
    const raw = window.sessionStorage.getItem(`${STORAGE_PREFIX}${id}`)

    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as EducationTaskLaunchDraft

    if (typeof parsed.purpose !== 'string' || !Array.isArray(parsed.inputAttachments)) {
      return null
    }

    return cloneDraft(parsed)
  } catch {
    return null
  }
}

export function removeEducationTaskLaunchDraft(id: null | string): void {
  if (!id) {
    return
  }

  memoryDrafts.delete(id)

  try {
    window.sessionStorage.removeItem(`${STORAGE_PREFIX}${id}`)
  } catch {
    // Nothing else to clean up.
  }
}
