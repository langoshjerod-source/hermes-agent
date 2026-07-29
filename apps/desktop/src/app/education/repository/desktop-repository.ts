import type { EducationRepository, EducationRepositoryScope } from './education-repository'
import {
  EDUCATION_REPOSITORY_SCHEMA_VERSION,
  type EducationRepositorySnapshot,
  emptyEducationRepositorySnapshot,
  migrateEducationRepository
} from './migrations'

interface EducationStorage {
  getItem(key: string): null | string
  setItem(key: string, value: string): void
}

const STORAGE_KEY_PREFIX = 'mengxueban.education.repository'

function requireScopePart(value: string, field: keyof EducationRepositoryScope): string {
  const normalized = value.trim()

  if (!normalized) {
    throw new Error(`Education repository scope ${field} must not be empty`)
  }

  return encodeURIComponent(normalized)
}

export function educationRepositoryStorageKey(scope: EducationRepositoryScope): string {
  const connection = requireScopePart(scope.connectionKey, 'connectionKey')
  const profile = requireScopePart(scope.profile, 'profile')

  return `${STORAGE_KEY_PREFIX}.v${EDUCATION_REPOSITORY_SCHEMA_VERSION}.${connection}.${profile}`
}

function snapshotForSave(snapshot: EducationRepositorySnapshot, now: string): EducationRepositorySnapshot {
  return {
    ...snapshot,
    schemaVersion: EDUCATION_REPOSITORY_SCHEMA_VERSION,
    roles: [...snapshot.roles],
    scenes: [...snapshot.scenes],
    tasks: [...snapshot.tasks],
    updatedAt: now
  }
}

export class DesktopEducationRepository implements EducationRepository {
  constructor(private readonly storage: EducationStorage = window.localStorage) {}

  load(scope: EducationRepositoryScope, now: string): EducationRepositorySnapshot {
    const raw = this.storage.getItem(educationRepositoryStorageKey(scope))

    if (raw === null) {
      return emptyEducationRepositorySnapshot(now)
    }

    let parsed: unknown

    try {
      parsed = JSON.parse(raw)
    } catch (error) {
      throw new Error(
        `Education repository contains invalid JSON: ${error instanceof Error ? error.message : String(error)}`
      )
    }

    return migrateEducationRepository(parsed, now)
  }

  save(scope: EducationRepositoryScope, snapshot: EducationRepositorySnapshot, now: string): void {
    const key = educationRepositoryStorageKey(scope)
    const serialized = JSON.stringify(snapshotForSave(snapshot, now))

    // Storage.setItem replaces one complete string value. If it throws (quota,
    // disabled storage), the previous value remains and the caller receives the
    // error instead of displaying a false save success.
    this.storage.setItem(key, serialized)
  }
}
