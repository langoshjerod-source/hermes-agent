import { useStore } from '@nanostores/react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { collectArtifactCandidates } from '@/app/artifacts/artifact-utils'
import { useGatewayRequest } from '@/app/gateway/hooks/use-gateway-request'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { getSessionMessages, getSkills } from '@/hermes'
import { useI18n } from '@/i18n'
import { $clarifyRequests, clearClarifyRequest } from '@/store/clarify'
import { ensureGatewayProfile } from '@/store/profile'
import { $sessionStates } from '@/store/session-states'

import { navigateToWorkspacePage, sessionRoute } from '../../routes'
import { type EducationTask, transitionTask } from '../domain/task'
import { EducationPageFrame } from '../page-frame'
import { upsertTask } from '../repository/education-repository'
import { useEducationSnapshot } from '../repository/use-education-snapshot'
import { finishEducationTask } from '../runtime/artifact-reconciler'
import { inspectEducationGoalStatus, startEducationTask } from '../runtime/gateway-executor'
import { reconcileEducationTasks } from '../runtime/task-state-reconciler'
import { builtinEducationScene } from '../scenarios/builtin-scenes'
import { missingEducationSourceSkills } from '../sources/catalog'
import { builtinEducationRole } from '../templates/builtin-roles'

import { TaskComposer } from './task-composer'
import { readEducationTaskLaunchDraft, removeEducationTaskLaunchDraft } from './task-launch-draft'

export function EducationTasks() {
  const { t } = useI18n()
  const copy = t.education
  const navigate = useNavigate()
  const { requestGateway } = useGatewayRequest()
  const sessionStates = useStore($sessionStates)
  const clarifyRequests = useStore($clarifyRequests)
  const [params] = useSearchParams()
  const { error, saveSnapshot, scope, snapshot } = useEducationSnapshot()
  const [startingTaskId, setStartingTaskId] = useState<string | null>(null)
  const [answeringRequestId, setAnsweringRequestId] = useState<string | null>(null)
  const [answerErrorTaskId, setAnswerErrorTaskId] = useState<string | null>(null)
  const completionChecksRef = useRef(new Set<string>())
  const legacyIntent = params.get('intent')?.trim() ?? ''
  const requestedSceneId = params.get('create') ?? (legacyIntent ? 'scene:general-research-task' : '')
  const launchDraftId = params.get('draft')
  const launchDraft = readEducationTaskLaunchDraft(launchDraftId)

  const requestedScene =
    snapshot?.scenes.find(scene => scene.id === requestedSceneId) ?? builtinEducationScene(requestedSceneId)

  const requestedRole = requestedScene
    ? (snapshot?.roles.find(role => role.id === requestedScene.roleTemplateId) ??
      builtinEducationRole(requestedScene.roleTemplateId))
    : null

  const initialPurpose = launchDraft?.purpose ?? legacyIntent
  const initialInputAttachments = launchDraft?.inputAttachments ?? []

  useEffect(() => {
    if (!snapshot) {
      return
    }

    const tasks = reconcileEducationTasks(snapshot.tasks, sessionStates, new Date().toISOString(), clarifyRequests)

    if (tasks !== snapshot.tasks) {
      saveSnapshot({ ...snapshot, tasks })
    }
  }, [clarifyRequests, saveSnapshot, sessionStates, snapshot])

  useEffect(() => {
    if (!snapshot) {
      return
    }

    for (const task of snapshot.tasks) {
      const runtimeId = task.hermes?.runtimeSessionId
      const storedId = task.hermes?.storedSessionId
      const session = runtimeId ? sessionStates[runtimeId] : null

      if (task.state !== 'running' || !runtimeId || !storedId || !session || session.busy || session.needsInput) {
        continue
      }

      const checkKey = `${task.id}:${task.updatedAt}`

      if (completionChecksRef.current.has(checkKey)) {
        continue
      }

      completionChecksRef.current.add(checkKey)

      void (async () => {
        try {
          const goalStatus = await inspectEducationGoalStatus(requestGateway, task)

          if (goalStatus !== 'done') {
            return
          }

          const response = await getSessionMessages(storedId, task.hermes?.profile)
          const candidates = collectArtifactCandidates(response.messages)
          const finished = finishEducationTask(task, candidates, new Date().toISOString())
          saveSnapshot(upsertTask(snapshot, finished))
        } catch {
          completionChecksRef.current.delete(checkKey)
        }
      })()
    }
  }, [requestGateway, saveSnapshot, sessionStates, snapshot])

  const answerTaskQuestion = async (task: EducationTask, answer: string, requestId: string) => {
    const runtimeSessionId = task.hermes?.runtimeSessionId

    if (!runtimeSessionId || !requestId) {
      return
    }

    setAnsweringRequestId(requestId)
    setAnswerErrorTaskId(null)

    try {
      await requestGateway('clarify.respond', { request_id: requestId, answer })
      clearClarifyRequest(requestId, runtimeSessionId)
    } catch {
      setAnswerErrorTaskId(task.id)
    } finally {
      setAnsweringRequestId(null)
    }
  }

  const startTask = async (task: EducationTask) => {
    if (!snapshot || (task.state !== 'ready' && task.state !== 'failed')) {
      return
    }

    const queued = transitionTask(task, 'queued', new Date().toISOString(), { failureCode: null })
    let executingTask = queued
    saveSnapshot(upsertTask(snapshot, queued))
    setStartingTaskId(task.id)

    try {
      await ensureGatewayProfile(task.hermes?.profile ?? scope.profile)

      const installedSkills = await getSkills()
      const missingSkills = missingEducationSourceSkills(task.sourceBindings, installedSkills)

      if (missingSkills.length) {
        throw new Error(`当前 Hermes 实例尚未配置所需 Skill：${missingSkills.join('、')}`)
      }

      const running = await startEducationTask(requestGateway, queued, new Date().toISOString(), boundTask => {
        executingTask = boundTask
        saveSnapshot(upsertTask(snapshot, boundTask))
      })

      saveSnapshot(upsertTask(snapshot, running))

      if (running.hermes?.storedSessionId) {
        navigateToWorkspacePage(navigate, sessionRoute(running.hermes.storedSessionId))
      }
    } catch (executionError) {
      const failed = transitionTask(executingTask, 'failed', new Date().toISOString(), {
        failureCode: executionError instanceof Error ? executionError.message : String(executionError)
      })

      saveSnapshot(upsertTask(snapshot, failed))
    } finally {
      setStartingTaskId(null)
    }
  }

  const taskStateLabel = (state: string) => {
    if (state === 'waiting_input') {
      return copy.tasks.needsAttention
    }

    if (state === 'queued' || state === 'running') {
      return copy.tasks.running
    }

    if (state === 'completed') {
      return copy.tasks.completed
    }

    if (state === 'partial') {
      return copy.tasks.partial
    }

    if (state === 'failed') {
      return t.common.failed
    }

    return copy.tasks.createTitle
  }

  return (
    <EducationPageFrame description={copy.tasks.description} eyebrow={copy.home.eyebrow} title={copy.tasks.title}>
      {requestedScene && (
        <section className="mt-8 border-y border-(--ui-stroke-tertiary) py-6">
          <div className="text-sm font-semibold text-(--ui-text-primary)">{copy.tasks.createTitle}</div>
          <div className="mt-2 text-lg font-medium text-(--theme-primary)">
            {initialPurpose || requestedScene.name}
          </div>
          <p className="mt-2 max-w-[65ch] text-sm leading-6 text-(--ui-text-secondary)">
            {copy.tasks.createDescription}
          </p>
        </section>
      )}

      {requestedScene && requestedRole && snapshot ? (
        <TaskComposer
          initialInputAttachments={initialInputAttachments}
          initialPurpose={initialPurpose}
          onCreated={task => {
            saveSnapshot(upsertTask(snapshot, task))
            removeEducationTaskLaunchDraft(launchDraftId)
            navigateToWorkspacePage(navigate, `/tasks?task=${encodeURIComponent(task.id)}`)
          }}
          role={requestedRole}
          scene={requestedScene}
          scope={scope}
        />
      ) : null}

      {requestedScene ? null : error ? (
        <EmptyState className="mt-12" description={error.message} title={copy.tasks.empty} />
      ) : snapshot?.tasks.length ? (
        <div className="mt-8 divide-y divide-(--ui-stroke-tertiary)">
          {snapshot.tasks.toReversed().map(task => (
            <article
              className="flex min-h-16 flex-col justify-between gap-4 py-4 sm:flex-row sm:items-center"
              key={task.id}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-(--ui-text-primary)">{task.title}</div>
                <div className="mt-1 text-sm text-(--ui-text-tertiary)">{taskStateLabel(task.state)}</div>
                {task.state === 'failed' ? (
                  <div className="mt-1 text-xs text-destructive">{copy.tasks.executionFailed}</div>
                ) : null}
                {answerErrorTaskId === task.id ? (
                  <div className="mt-1 text-xs text-destructive">{copy.tasks.answerFailed}</div>
                ) : null}
                {task.state === 'waiting_input' && task.waitingQuestion ? (
                  <div className="mt-3">
                    <p className="text-sm leading-6 text-(--ui-text-primary)">{task.waitingQuestion.prompt}</p>
                    {task.waitingQuestion.candidates.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {task.waitingQuestion.candidates.map(candidate => {
                          const requestId = candidate.details.request_id

                          return (
                            <Button
                              disabled={answeringRequestId === requestId}
                              key={`${requestId}:${candidate.value}`}
                              onClick={() => void answerTaskQuestion(task, candidate.value, requestId)}
                              size="sm"
                              type="button"
                              variant="outline"
                            >
                              {candidate.label}
                            </Button>
                          )
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
              {task.state === 'ready' || task.state === 'failed' ? (
                <Button disabled={Boolean(startingTaskId)} onClick={() => void startTask(task)} size="sm" type="button">
                  {startingTaskId === task.id ? copy.tasks.startingExecution : copy.tasks.startExecution}
                </Button>
              ) : task.artifacts.length || task.hermes?.storedSessionId ? (
                <div className="flex flex-wrap gap-2">
                  {task.artifacts.length ? (
                    <Button onClick={() => navigateToWorkspacePage(navigate, '/artifacts')} size="sm" type="button">
                      {copy.tasks.openArtifacts}
                    </Button>
                  ) : null}
                  {task.hermes?.storedSessionId ? (
                    <Button
                      onClick={() => {
                        const storedSessionId = task.hermes?.storedSessionId

                        if (storedSessionId) {
                          navigateToWorkspacePage(navigate, sessionRoute(storedSessionId))
                        }
                      }}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      {copy.tasks.openConversation}
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState className="mt-12" description={copy.tasks.emptyDescription} title={copy.tasks.empty} />
      )}
    </EducationPageFrame>
  )
}
