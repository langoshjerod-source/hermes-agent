import type { RoleTemplate } from '../domain/role'
import type { ScenePackage } from '../domain/scene'
import type { EducationTask } from '../domain/task'

export const EDUCATION_REPOSITORY_SCHEMA_VERSION = 1

export interface EducationRepositorySnapshot {
  schemaVersion: typeof EDUCATION_REPOSITORY_SCHEMA_VERSION
  roles: RoleTemplate[]
  scenes: ScenePackage[]
  tasks: EducationTask[]
  updatedAt: string
}

interface LegacySnapshotV0 {
  schemaVersion?: 0
  roles?: unknown
  scenes?: unknown
  tasks?: unknown
  updatedAt?: unknown
}

export class EducationRepositoryCompatibilityError extends Error {}

export class EducationRepositoryCorruptError extends Error {}

function requireArray(value: unknown, field: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new EducationRepositoryCorruptError(`Education repository field ${field} must be an array`)
  }

  return value
}

function requireUpdatedAt(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback
}

export function emptyEducationRepositorySnapshot(now: string): EducationRepositorySnapshot {
  return {
    schemaVersion: EDUCATION_REPOSITORY_SCHEMA_VERSION,
    roles: [],
    scenes: [],
    tasks: [],
    updatedAt: now
  }
}

export function migrateEducationRepository(value: unknown, now: string): EducationRepositorySnapshot {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new EducationRepositoryCorruptError('Education repository must be a JSON object')
  }

  const candidate = value as LegacySnapshotV0 & { schemaVersion?: unknown }
  const version = candidate.schemaVersion ?? 0

  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    throw new EducationRepositoryCorruptError('Education repository schemaVersion must be a non-negative integer')
  }

  if (version > EDUCATION_REPOSITORY_SCHEMA_VERSION) {
    throw new EducationRepositoryCompatibilityError(
      `Education repository schema ${version} is newer than supported schema ${EDUCATION_REPOSITORY_SCHEMA_VERSION}`
    )
  }

  if (version === 0) {
    return {
      schemaVersion: EDUCATION_REPOSITORY_SCHEMA_VERSION,
      roles: requireArray(candidate.roles ?? [], 'roles') as RoleTemplate[],
      scenes: requireArray(candidate.scenes ?? [], 'scenes') as ScenePackage[],
      tasks: requireArray(candidate.tasks ?? [], 'tasks') as EducationTask[],
      updatedAt: requireUpdatedAt(candidate.updatedAt, now)
    }
  }

  return {
    schemaVersion: EDUCATION_REPOSITORY_SCHEMA_VERSION,
    roles: requireArray(candidate.roles, 'roles') as RoleTemplate[],
    scenes: requireArray(candidate.scenes, 'scenes') as ScenePackage[],
    tasks: requireArray(candidate.tasks, 'tasks') as EducationTask[],
    updatedAt: requireUpdatedAt(candidate.updatedAt, now)
  }
}
