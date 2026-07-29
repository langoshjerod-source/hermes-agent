import { useQuery } from '@tanstack/react-query'
import { type FormEvent, type ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { getSkills } from '@/hermes'
import { useI18n } from '@/i18n'
import { Brain, FileText, Globe, NotebookTabs } from '@/lib/icons'

import { navigateToWorkspacePage } from '../../routes'
import { EducationPageFrame } from '../page-frame'
import { useEducationSnapshot } from '../repository/use-education-snapshot'
import { EDUCATION_SOURCE_CATALOG, resolveEducationSourceAvailability } from '../sources/catalog'

interface HomeScenario {
  description: string
  icon: ReactNode
  id: string
  name: string
}

function ScenarioLaunchRow({ scenario, action }: { scenario: HomeScenario; action: string }) {
  const navigate = useNavigate()

  return (
    <article className="flex min-h-48 flex-col p-5 sm:p-6">
      <div className="flex size-10 items-center justify-center rounded-md bg-(--ui-bg-quaternary) text-(--theme-primary)">
        {scenario.icon}
      </div>
      <h3 className="mt-5 text-base font-semibold text-(--ui-text-primary)">{scenario.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-6 text-(--ui-text-secondary)">{scenario.description}</p>
      <div className="mt-5">
        <Button
          onClick={() => navigateToWorkspacePage(navigate, `/tasks?create=${encodeURIComponent(scenario.id)}`)}
          size="sm"
          type="button"
          variant="textStrong"
        >
          {action}
        </Button>
      </div>
    </article>
  )
}

export function EducationHome() {
  const { t } = useI18n()
  const copy = t.education
  const navigate = useNavigate()
  const { snapshot } = useEducationSnapshot()
  const [intent, setIntent] = useState('')

  const scenarios: HomeScenario[] = [
    {
      id: 'scene:textbook-course-tree',
      name: copy.scenario.courseTreeName,
      description: copy.scenario.courseTreeDescription,
      icon: <NotebookTabs aria-hidden className="size-5" />
    },
    {
      id: 'scene:subject-knowledge-tree',
      name: copy.scenario.knowledgeTreeName,
      description: copy.scenario.knowledgeTreeDescription,
      icon: <Brain aria-hidden className="size-5" />
    },
    {
      id: 'scene:national-smartedu-resource-discovery',
      name: copy.scenario.nationalResourceName,
      description: copy.scenario.nationalResourceDescription,
      icon: <Globe aria-hidden className="size-5" />
    },
    {
      id: 'scene:document-organization',
      name: copy.scenario.documentName,
      description: copy.scenario.documentDescription,
      icon: <FileText aria-hidden className="size-5" />
    }
  ]

  const activeTasks = snapshot?.tasks.filter(task => ['queued', 'running', 'waiting_input'].includes(task.state)) ?? []
  const { data: installedSkills = [] } = useQuery({ queryKey: ['skills-list'], queryFn: getSkills })

  const availableSources = EDUCATION_SOURCE_CATALOG.filter(
    source => resolveEducationSourceAvailability(source, installedSkills).state === 'available'
  ).length

  const submitIntent = (event: FormEvent) => {
    event.preventDefault()

    const value = intent.trim()

    if (!value) {
      return
    }

    navigateToWorkspacePage(navigate, `/tasks?intent=${encodeURIComponent(value)}`)
  }

  return (
    <EducationPageFrame description={copy.home.description} eyebrow={copy.home.eyebrow} title={copy.home.title}>
      <form className="mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row" onSubmit={submitIntent}>
        <Input
          aria-label={copy.home.intentPlaceholder}
          className="flex-1"
          onChange={event => setIntent(event.target.value)}
          placeholder={copy.home.intentPlaceholder}
          value={intent}
        />
        <Button disabled={!intent.trim()} size="lg" type="submit">
          {copy.home.intentAction}
        </Button>
      </form>

      <div className="mt-10 grid grid-cols-1 gap-10 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <main className="min-w-0">
          <div>
            <h2 className="text-sm font-semibold text-(--ui-text-primary)">{copy.home.scenariosTitle}</h2>
            <p className="mt-1 text-sm leading-6 text-(--ui-text-tertiary)">{copy.home.scenariosDescription}</p>
          </div>
          <div className="mt-4 grid grid-cols-1 divide-y divide-(--ui-stroke-tertiary) overflow-hidden rounded-lg border border-(--ui-stroke-tertiary) md:grid-cols-3 md:divide-x md:divide-y-0">
            {scenarios.map(scenario => (
              <ScenarioLaunchRow action={copy.scenario.start} key={scenario.id} scenario={scenario} />
            ))}
          </div>
        </main>

        <aside className="min-w-0 space-y-8 xl:border-l xl:border-(--ui-stroke-tertiary) xl:pl-6">
          <section>
            <h2 className="text-sm font-semibold text-(--ui-text-primary)">{copy.home.continueTitle}</h2>
            {activeTasks.length ? (
              <div className="mt-3 space-y-2">
                {activeTasks.slice(0, 4).map(task => (
                  <button
                    className="block min-h-11 w-full rounded-sm px-2 py-2 text-left text-sm text-(--ui-text-secondary) hover:bg-(--chrome-action-hover)"
                    key={task.id}
                    onClick={() => navigateToWorkspacePage(navigate, `/tasks?task=${encodeURIComponent(task.id)}`)}
                    type="button"
                  >
                    {task.title}
                  </button>
                ))}
              </div>
            ) : (
              <EmptyState
                className="min-h-32 place-items-start text-left"
                description={copy.home.continueEmptyDescription}
                title={copy.home.continueEmpty}
              />
            )}
          </section>
          <section className="border-t border-(--ui-stroke-tertiary) pt-6">
            <h2 className="text-sm font-semibold text-(--ui-text-primary)">{copy.home.sourceTitle}</h2>
            <p className="mt-2 text-sm text-(--ui-text-secondary)">
              {copy.home.sourceSummary(availableSources, EDUCATION_SOURCE_CATALOG.length)}
            </p>
            <Button
              className="mt-3"
              onClick={() => navigateToWorkspacePage(navigate, '/sources')}
              size="sm"
              type="button"
              variant="textStrong"
            >
              {copy.nav.sources}
            </Button>
          </section>
        </aside>
      </div>
    </EducationPageFrame>
  )
}
