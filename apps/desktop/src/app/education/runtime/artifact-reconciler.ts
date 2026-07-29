import type { ArtifactCandidate } from '@/app/artifacts/artifact-utils'

import { type EducationTask, type TaskArtifactReference, transitionTask } from '../domain/task'

function candidateMatchesMediaType(candidate: ArtifactCandidate, mediaType: string): boolean {
  const value = candidate.value.toLowerCase().split('?')[0]

  if (mediaType.includes('spreadsheet')) {
    return /\.(?:xlsx?|xlsm|ods)$/.test(value)
  }

  if (mediaType.includes('wordprocessing')) {
    return /\.(?:docx?|odt)$/.test(value)
  }

  if (mediaType === 'application/pdf') {
    return value.endsWith('.pdf')
  }

  return candidate.kind === 'file' || /\.[a-z0-9]{2,8}$/.test(value)
}

export function educationTaskArtifacts(task: EducationTask, candidates: ArtifactCandidate[]): TaskArtifactReference[] {
  const contracts = task.sceneSnapshot?.scene.outputContracts ?? []
  const used = new Set<string>()

  return contracts.flatMap(contract => {
    const candidate = candidates.find(
      item => !used.has(item.value) && candidateMatchesMediaType(item, contract.mediaType)
    )

    if (!candidate) {
      return []
    }

    used.add(candidate.value)

    return [
      {
        id: contract.id,
        label: candidate.label || contract.label,
        mediaType: contract.mediaType,
        required: contract.required,
        value: candidate.value
      }
    ]
  })
}

export function finishEducationTask(task: EducationTask, candidates: ArtifactCandidate[], now: string): EducationTask {
  if (task.state !== 'running') {
    throw new Error(`Only a running education task can finish, received ${task.state}`)
  }

  const artifacts = educationTaskArtifacts(task, candidates)
  const required = task.sceneSnapshot?.scene.outputContracts.filter(contract => contract.required) ?? []
  const complete = required.every(contract => artifacts.some(artifact => artifact.id === contract.id))

  return transitionTask(task, complete ? 'completed' : 'partial', now, { artifacts })
}
