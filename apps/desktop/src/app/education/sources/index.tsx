import { useI18n } from '@/i18n'

import type { EducationSource, EducationSourceCapability } from '../domain/source'
import { toTeacherSourceView } from '../domain/source'
import { EducationPageFrame } from '../page-frame'

const INITIAL_SOURCES: EducationSource[] = [
  {
    id: 'source:xueke',
    kind: 'xueke',
    capabilities: ['catalogue', 'read'],
    state: 'available',
    supportedScope: '教材课程树、学科知识点树、专项突破'
  },
  {
    id: 'source:knowledge-base',
    kind: 'knowledge_base',
    capabilities: ['search', 'read'],
    state: 'available',
    supportedScope: '已收录教材与教研资料',
    technicalProvider: 'RAGFlow'
  },
  {
    id: 'source:web-search',
    kind: 'web_search',
    capabilities: ['search', 'read'],
    state: 'available',
    supportedScope: '公开互联网资料'
  },
  {
    id: 'source:user-files',
    kind: 'user_file',
    capabilities: ['read'],
    state: 'available',
    supportedScope: 'PDF、Word、图片等用户文件'
  }
]

export function EducationSources() {
  const { t } = useI18n()
  const copy = t.education
  const sources = INITIAL_SOURCES.map(toTeacherSourceView)

  const capabilityLabel: Record<EducationSourceCapability, string> = {
    catalogue: copy.sources.capabilityCatalogue,
    read: copy.sources.capabilityRead,
    refresh: copy.sources.capabilityRefresh,
    search: copy.sources.capabilitySearch
  }

  return (
    <EducationPageFrame description={copy.sources.description} eyebrow={copy.home.eyebrow} title={copy.sources.title}>
      <div className="mt-8 divide-y divide-(--ui-stroke-tertiary) border-y border-(--ui-stroke-tertiary)">
        {sources.map(source => (
          <article className="grid grid-cols-1 gap-3 py-5 md:grid-cols-[12rem_minmax(0,1fr)_10rem]" key={source.id}>
            <div>
              <div className="text-sm font-semibold text-(--ui-text-primary)">{source.label}</div>
              <div className="mt-1 text-sm text-(--ui-text-tertiary)">
                {source.state === 'available' ? copy.sources.available : copy.sources.notConfigured}
              </div>
            </div>
            <div>
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-(--ui-text-tertiary)">
                {copy.sources.scope}
              </div>
              <div className="mt-1 text-sm leading-6 text-(--ui-text-secondary)">{source.supportedScope}</div>
            </div>
            <div>
              <div className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-(--ui-text-tertiary)">
                {copy.sources.capability}
              </div>
              <div className="mt-1 text-sm leading-6 text-(--ui-text-secondary)">
                {source.capabilities.map(capability => capabilityLabel[capability]).join(' · ')}
              </div>
            </div>
          </article>
        ))}
      </div>
    </EducationPageFrame>
  )
}
