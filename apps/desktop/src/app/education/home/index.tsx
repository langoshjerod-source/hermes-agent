import { useQuery } from '@tanstack/react-query'
import { type FormEvent, type ReactNode, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Textarea } from '@/components/ui/textarea'
import { getSkills } from '@/hermes'
import { useI18n } from '@/i18n'
import { ArrowUp, Brain, FileText, Globe, NotebookTabs, Sparkles } from '@/lib/icons'

import { navigateToWorkspacePage } from '../../routes'
import type { TaskInputAttachment } from '../domain/task'
import { EducationPageFrame } from '../page-frame'
import { useEducationSnapshot } from '../repository/use-education-snapshot'
import { EDUCATION_SOURCE_CATALOG, resolveEducationSourceAvailability } from '../sources/catalog'
import { TaskAttachmentPicker } from '../tasks/task-attachment-picker'
import { saveEducationTaskLaunchDraft } from '../tasks/task-launch-draft'

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
  const [inputAttachments, setInputAttachments] = useState<TaskInputAttachment[]>([])

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

    const draftId = saveEducationTaskLaunchDraft({ purpose: value, inputAttachments })

    navigateToWorkspacePage(
      navigate,
      `/tasks?create=${encodeURIComponent('scene:general-research-task')}&draft=${encodeURIComponent(draftId)}`
    )
  }

  return (
    <EducationPageFrame description={copy.home.description} eyebrow={copy.home.eyebrow} title={copy.home.title}>
      <form className="mt-8 max-w-3xl" onSubmit={submitIntent}>
        <div className="group overflow-hidden rounded-2xl border border-(--ui-stroke-secondary) bg-(--ui-chat-bubble-background) shadow-[0_18px_50px_-32px_color-mix(in_srgb,var(--theme-primary)_45%,transparent),0_2px_12px_-8px_rgba(16,44,35,0.22)] transition-[border-color,box-shadow] duration-200 focus-within:border-(--theme-primary)/55 focus-within:shadow-[0_22px_60px_-30px_color-mix(in_srgb,var(--theme-primary)_55%,transparent),0_0_0_3px_color-mix(in_srgb,var(--theme-primary)_10%,transparent)]">
          <div className="flex items-center gap-2 px-5 pt-4 text-xs font-medium text-(--theme-primary)">
            <span className="grid size-6 place-items-center rounded-full bg-(--theme-primary)/10">
              <Sparkles aria-hidden className="size-3.5" />
            </span>
            描述你想完成的教研任务
          </div>
          <Textarea
            aria-label={copy.home.intentPlaceholder}
            className="min-h-32 resize-none !border-transparent !bg-transparent px-5 py-4 text-[17px] leading-7 !shadow-none placeholder:text-(--ui-text-tertiary)/75 focus-visible:ring-0"
            onChange={event => setIntent(event.target.value)}
            placeholder={copy.home.intentPlaceholder}
            value={intent}
          />
          <div className="mx-3 mb-3 flex flex-col gap-2 rounded-xl bg-[color-mix(in_srgb,var(--ui-chat-surface-background)_65%,var(--ui-chat-bubble-background))] p-2 sm:flex-row sm:items-end sm:justify-between">
            <TaskAttachmentPicker appearance="compact" attachments={inputAttachments} onChange={setInputAttachments} />
            <Button
              className="h-10 shrink-0 gap-2 rounded-xl px-4 shadow-[0_8px_20px_-12px_var(--theme-primary)]"
              disabled={!intent.trim()}
              size="lg"
              type="submit"
            >
              {copy.home.intentAction}
              <ArrowUp aria-hidden className="size-4" />
            </Button>
          </div>
        </div>
        <p className="mt-2.5 px-1 text-xs leading-5 text-(--ui-text-tertiary)">
          先说清想要的结果，资料、格式和筛选条件可以稍后补充。
        </p>
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
