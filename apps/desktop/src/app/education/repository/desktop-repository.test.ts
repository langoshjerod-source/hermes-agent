import { describe, expect, it } from 'vitest'

import repositoryV0 from '../__fixtures__/repository-v0.json'
import type { RoleTemplate } from '../domain/role'
import { createDraftTask } from '../domain/task'

import { DesktopEducationRepository, educationRepositoryStorageKey } from './desktop-repository'
import { type EducationRepositoryScope, upsertRole, upsertTask } from './education-repository'
import {
  EducationRepositoryCompatibilityError,
  EducationRepositoryCorruptError,
  migrateEducationRepository
} from './migrations'

const NOW = '2026-07-29T00:00:00Z'
const LATER = '2026-07-29T01:00:00Z'
const SCOPE_A: EducationRepositoryScope = { connectionKey: 'remote:https://gateway-a.example', profile: 'default' }
const SCOPE_B: EducationRepositoryScope = { connectionKey: 'remote:https://gateway-b.example', profile: 'default' }

const SCOPE_PROFILE_B: EducationRepositoryScope = {
  connectionKey: 'remote:https://gateway-a.example',
  profile: 'teacher-b'
}

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

const personalRole: RoleTemplate = {
  id: 'role:mine',
  name: '我的教材助手',
  description: '个人角色',
  ownership: 'personal',
  version: 1,
  profileSeed: 'default',
  soul: '先确认教材范围。',
  modelPolicy: { kind: 'profile-default' },
  capabilityIds: ['source.catalogue'],
  createdAt: NOW,
  updatedAt: NOW
}

describe('desktop education repository', () => {
  it('scopes records by connection and profile', () => {
    const storage = new MemoryStorage()
    const repository = new DesktopEducationRepository(storage)
    const snapshot = upsertRole(repository.load(SCOPE_A, NOW), personalRole)

    repository.save(SCOPE_A, snapshot, LATER)

    expect(repository.load(SCOPE_A, LATER).roles).toEqual([personalRole])
    expect(repository.load(SCOPE_B, LATER).roles).toEqual([])
    expect(repository.load(SCOPE_PROFILE_B, LATER).roles).toEqual([])
    expect(educationRepositoryStorageKey(SCOPE_A)).not.toBe(educationRepositoryStorageKey(SCOPE_PROFILE_B))
  })

  it('upserts business metadata without duplicating ids', () => {
    const storage = new MemoryStorage()
    const repository = new DesktopEducationRepository(storage)
    const task = createDraftTask({ id: 'task:1', title: '教材课程树', createdAt: NOW })
    const first = upsertTask(upsertRole(repository.load(SCOPE_A, NOW), personalRole), task)
    const renamed = { ...personalRole, name: '重命名助手', version: 2 }
    const second = upsertRole(first, renamed)

    repository.save(SCOPE_A, second, LATER)

    expect(repository.load(SCOPE_A, LATER).roles).toEqual([renamed])
    expect(repository.load(SCOPE_A, LATER).tasks).toEqual([task])
  })

  it('keeps the previous value when a save fails', () => {
    const storage = new MemoryStorage()
    const repository = new DesktopEducationRepository(storage)
    const initial = upsertRole(repository.load(SCOPE_A, NOW), personalRole)

    repository.save(SCOPE_A, initial, NOW)
    const previous = storage.getItem(educationRepositoryStorageKey(SCOPE_A))
    const originalSetItem = storage.setItem.bind(storage)

    storage.setItem = () => {
      throw new Error('quota exceeded')
    }

    expect(() =>
      repository.save(
        SCOPE_A,
        upsertTask(initial, createDraftTask({ id: 'task:1', title: '任务', createdAt: NOW })),
        LATER
      )
    ).toThrow(/quota exceeded/)
    expect(storage.getItem(educationRepositoryStorageKey(SCOPE_A))).toBe(previous)

    storage.setItem = originalSetItem
  })

  it('surfaces corrupt JSON instead of silently erasing it', () => {
    const storage = new MemoryStorage()
    const repository = new DesktopEducationRepository(storage)

    storage.setItem(educationRepositoryStorageKey(SCOPE_A), '{not-json')

    expect(() => repository.load(SCOPE_A, NOW)).toThrow(/invalid JSON/)
    expect(storage.getItem(educationRepositoryStorageKey(SCOPE_A))).toBe('{not-json')
  })
})

describe('education repository migrations', () => {
  it('migrates the version-zero fixture without changing its timestamp', () => {
    expect(migrateEducationRepository(repositoryV0, NOW)).toEqual({
      ...repositoryV0,
      schemaVersion: 1
    })
  })

  it('rejects malformed arrays and unknown newer schemas', () => {
    expect(() => migrateEducationRepository({ schemaVersion: 1, roles: {}, scenes: [], tasks: [] }, NOW)).toThrow(
      EducationRepositoryCorruptError
    )
    expect(() =>
      migrateEducationRepository({ schemaVersion: 99, roles: [], scenes: [], tasks: [], updatedAt: NOW }, NOW)
    ).toThrow(EducationRepositoryCompatibilityError)
  })
})
