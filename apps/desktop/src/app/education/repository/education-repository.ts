import type { RoleTemplate } from '../domain/role'
import type { ScenePackage } from '../domain/scene'
import type { EducationTask } from '../domain/task'

import type { EducationRepositorySnapshot } from './migrations'

export interface EducationRepositoryScope {
  connectionKey: string
  profile: string
}

export interface EducationRepository {
  load(scope: EducationRepositoryScope, now: string): EducationRepositorySnapshot
  save(scope: EducationRepositoryScope, snapshot: EducationRepositorySnapshot, now: string): void
}

export function upsertRole(snapshot: EducationRepositorySnapshot, role: RoleTemplate): EducationRepositorySnapshot {
  return {
    ...snapshot,
    roles: [...snapshot.roles.filter(item => item.id !== role.id), role]
  }
}

export function upsertScene(snapshot: EducationRepositorySnapshot, scene: ScenePackage): EducationRepositorySnapshot {
  return {
    ...snapshot,
    scenes: [...snapshot.scenes.filter(item => item.id !== scene.id), scene]
  }
}

export function upsertTask(snapshot: EducationRepositorySnapshot, task: EducationTask): EducationRepositorySnapshot {
  return {
    ...snapshot,
    tasks: [...snapshot.tasks.filter(item => item.id !== task.id), task]
  }
}
