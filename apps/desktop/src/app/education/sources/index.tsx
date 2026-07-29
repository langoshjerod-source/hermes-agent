import { useQuery } from '@tanstack/react-query'

import { getSkills } from '@/hermes'
import { useI18n } from '@/i18n'

import type { EducationSourceCapability } from '../domain/source'
import { toTeacherSourceView } from '../domain/source'
import { EducationPageFrame } from '../page-frame'

import { EDUCATION_SOURCE_CATALOG, resolveEducationSourceAvailability } from './catalog'

export function EducationSources() {
  const { t } = useI18n()
  const copy = t.education
  const { data: installedSkills = [] } = useQuery({ queryKey: ['skills-list'], queryFn: getSkills })

  const sources = EDUCATION_SOURCE_CATALOG.map(source =>
    toTeacherSourceView(resolveEducationSourceAvailability(source, installedSkills))
  )

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
