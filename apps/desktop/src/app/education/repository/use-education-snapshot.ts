import { useStore } from '@nanostores/react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { $activeGatewayProfile } from '@/store/profile'
import { $connection } from '@/store/session'

import { DesktopEducationRepository } from './desktop-repository'
import type { EducationRepositorySnapshot } from './migrations'
import { educationRepositoryScope } from './scope'

const repository = new DesktopEducationRepository()

interface EducationSnapshotState {
  error: Error | null
  scope: ReturnType<typeof educationRepositoryScope>
  snapshot: EducationRepositorySnapshot | null
}

export function useEducationSnapshot() {
  const connection = useStore($connection)
  const profile = useStore($activeGatewayProfile)
  const scope = useMemo(() => educationRepositoryScope(connection, profile), [connection, profile])

  const load = useCallback(() => {
    try {
      return { error: null, scope, snapshot: repository.load(scope, new Date().toISOString()) }
    } catch (error) {
      return { error: error instanceof Error ? error : new Error(String(error)), scope, snapshot: null }
    }
  }, [scope])

  const [state, setState] = useState<EducationSnapshotState>(load)

  useEffect(() => setState(load()), [load])

  const saveSnapshot = useCallback(
    (snapshot: EducationRepositorySnapshot) => {
      const now = new Date().toISOString()

      try {
        repository.save(scope, snapshot, now)
        setState({ error: null, scope, snapshot: { ...snapshot, updatedAt: now } })
      } catch (error) {
        setState(previous => ({
          ...previous,
          error: error instanceof Error ? error : new Error(String(error))
        }))
        throw error
      }
    },
    [scope]
  )

  return { ...state, saveSnapshot }
}
