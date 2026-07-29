import { type FormEvent, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldHint } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/i18n'

import type { RoleTemplate } from '../domain/role'
import type { IntakeField, ScenePackage } from '../domain/scene'
import type { EducationTask } from '../domain/task'
import { missingRequiredIntake, prepareEducationTask } from '../domain/task-preparation'
import type { EducationRepositoryScope } from '../repository/education-repository'

export function TaskComposer({
  onCreated,
  role,
  scene,
  scope
}: {
  onCreated: (task: EducationTask) => void
  role: RoleTemplate
  scene: ScenePackage
  scope: EducationRepositoryScope
}) {
  const { t } = useI18n()
  const copy = t.education.tasks
  const [purpose, setPurpose] = useState('')
  const [values, setValues] = useState<Record<string, unknown>>({})
  const [reviewing, setReviewing] = useState(false)
  const usesStructuredPurpose = scene.purposeMode === 'structured'

  const missing = useMemo(() => missingRequiredIntake(scene, values), [scene, values])
  const complete = (usesStructuredPurpose || Boolean(purpose.trim())) && missing.length === 0

  const setValue = (fieldId: string, value: unknown) => {
    setValues(current => ({ ...current, [fieldId]: value }))
  }

  const submitDetails = (event: FormEvent) => {
    event.preventDefault()

    if (complete) {
      setReviewing(true)
    }
  }

  const createTask = () => {
    const now = new Date().toISOString()
    onCreated(
      prepareEducationTask({
        id: `task:${crypto.randomUUID()}`,
        purpose,
        role,
        scene,
        values,
        createdAt: now,
        hermes: { connectionScope: scope.connectionKey, profile: scope.profile }
      })
    )
  }

  if (reviewing) {
    return (
      <section className="mt-8 rounded-lg border border-(--ui-stroke-tertiary) p-5 sm:p-6">
        <h2 className="text-base font-semibold text-(--ui-text-primary)">{copy.confirmTitle}</h2>
        <p className="mt-2 max-w-[65ch] text-sm leading-6 text-(--ui-text-secondary)">{copy.confirmDescription}</p>
        <dl className="mt-6 divide-y divide-(--ui-stroke-tertiary) border-y border-(--ui-stroke-tertiary)">
          <ReviewRow
            label={copy.purpose}
            value={
              usesStructuredPurpose
                ? `按下列已确认范围完成“${scene.name}”并交付约定产物`
                : purpose
            }
          />
          {scene.intake.map(field => (
            <ReviewRow key={field.id} label={field.label} value={displayValue(field, values[field.id])} />
          ))}
          <ReviewRow
            label={t.education.templates.outputs(scene.outputContracts.length)}
            value={scene.outputContracts.map(item => item.label).join('、')}
          />
        </dl>
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button onClick={() => setReviewing(false)} type="button" variant="outline">
            {copy.editInformation}
          </Button>
          <Button onClick={createTask} type="button">
            {copy.confirmCreate}
          </Button>
        </div>
      </section>
    )
  }

  return (
    <form
      className="mt-8 max-w-3xl rounded-lg border border-(--ui-stroke-tertiary) p-5 sm:p-6"
      onSubmit={submitDetails}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        {!usesStructuredPurpose ? (
          <div className="sm:col-span-2">
            <Field htmlFor="task-purpose" label={copy.purpose}>
              <Textarea
                className="min-h-24"
                id="task-purpose"
                onChange={event => setPurpose(event.target.value)}
                placeholder={copy.purposePlaceholder}
                required
                value={purpose}
              />
              <FieldHint>{copy.requiredHint}</FieldHint>
            </Field>
          </div>
        ) : null}
        {scene.intake.map(field => (
          <IntakeControl
            field={field}
            key={field.id}
            onChange={value => setValue(field.id, value)}
            value={values[field.id]}
          />
        ))}
      </div>
      <div className="mt-6 flex justify-end">
        <Button disabled={!complete} type="submit">
          {copy.continueToConfirm}
        </Button>
      </div>
    </form>
  )
}

function IntakeControl({
  field,
  onChange,
  value
}: {
  field: IntakeField
  onChange: (value: unknown) => void
  value: unknown
}) {
  const { t } = useI18n()
  const placeholder = t.education.tasks.fieldPlaceholder(field.label)

  if (field.kind === 'multi-select') {
    const selected = Array.isArray(value) ? value.filter(item => typeof item === 'string') : []

    return (
      <Field label={field.label}>
        <div className="flex min-h-11 flex-wrap items-center gap-x-5 gap-y-3 rounded-md border border-input px-3 py-2">
          {field.options?.map(option => (
            <label className="flex min-h-7 cursor-pointer items-center gap-2 text-sm" key={option.value}>
              <Checkbox
                checked={selected.includes(option.value)}
                onCheckedChange={checked =>
                  onChange(
                    checked
                      ? [...selected, option.value]
                      : selected.filter(selectedValue => selectedValue !== option.value)
                  )
                }
              />
              {option.label}
            </label>
          ))}
        </div>
        {field.description ? <FieldHint>{field.description}</FieldHint> : null}
      </Field>
    )
  }

  if ((field.kind === 'select' || field.kind === 'source-select') && field.options?.length) {
    return (
      <Field label={field.label}>
        <Select onValueChange={onChange} value={typeof value === 'string' ? value : ''}>
          <SelectTrigger className="min-h-11">
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {field.options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {field.description ? <FieldHint>{field.description}</FieldHint> : null}
      </Field>
    )
  }

  if (field.kind === 'file-list') {
    return (
      <div className="sm:col-span-2">
        <Field htmlFor={`task-${field.id}`} label={field.label}>
          <Textarea
            id={`task-${field.id}`}
            onChange={event => onChange(event.target.value)}
            placeholder={placeholder}
            required={field.required}
            value={typeof value === 'string' ? value : ''}
          />
          {field.description ? <FieldHint>{field.description}</FieldHint> : null}
        </Field>
      </div>
    )
  }

  return (
    <Field htmlFor={`task-${field.id}`} label={field.label}>
      <Input
        id={`task-${field.id}`}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        required={field.required}
        value={typeof value === 'string' ? value : ''}
      />
      {field.description ? <FieldHint>{field.description}</FieldHint> : null}
    </Field>
  )
}

function displayValue(field: IntakeField, value: unknown): string {
  const values = Array.isArray(value) ? value : [value]

  return values
    .filter(item => typeof item === 'string')
    .map(item => field.options?.find(option => option.value === item)?.label ?? item)
    .join('、')
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-sm text-(--ui-text-tertiary)">{label}</dt>
      <dd className="whitespace-pre-wrap text-sm leading-6 text-(--ui-text-primary)">{value}</dd>
    </div>
  )
}
