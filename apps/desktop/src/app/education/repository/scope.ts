import type { HermesConnection } from '@/global'
import { normalizeProfileKey } from '@/store/profile'

import type { EducationRepositoryScope } from './education-repository'

export function educationRepositoryScope(
  connection: Pick<HermesConnection, 'baseUrl' | 'mode'> | null,
  profile: string | null | undefined
): EducationRepositoryScope {
  const connectionKey = connection?.mode === 'remote' ? `remote:${connection.baseUrl}` : 'local'

  return {
    connectionKey,
    profile: normalizeProfileKey(profile)
  }
}
