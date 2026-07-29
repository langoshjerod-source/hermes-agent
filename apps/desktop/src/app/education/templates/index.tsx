import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Field, FieldHint } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/i18n'
import { Copy, Info, Pencil } from '@/lib/icons'

import { cloneRoleTemplate, type RoleTemplate, updatePersonalRole } from '../domain/role'
import { cloneScenePackage, type ScenePackage, updatePersonalScene } from '../domain/scene'
import { EducationPageFrame } from '../page-frame'
import { upsertRole, upsertScene } from '../repository/education-repository'
import { useEducationSnapshot } from '../repository/use-education-snapshot'
import { BUILTIN_EDUCATION_SCENES } from '../scenarios/builtin-scenes'

import { BUILTIN_EDUCATION_ROLES } from './builtin-roles'

type EditTarget = { kind: 'role'; value: RoleTemplate } | { kind: 'scene'; value: ScenePackage }

function personalId(kind: 'role' | 'scene'): string {
  return `${kind}:personal:${crypto.randomUUID()}`
}

export function EducationTemplates() {
  const { t } = useI18n()
  const copy = t.education.templates
  const { error, saveSnapshot, snapshot } = useEducationSnapshot()
  const [editing, setEditing] = useState<EditTarget | null>(null)

  const roles = useMemo(
    () => [...BUILTIN_EDUCATION_ROLES, ...(snapshot?.roles ?? [])] as RoleTemplate[],
    [snapshot?.roles]
  )

  const scenes = useMemo(
    () => [...BUILTIN_EDUCATION_SCENES, ...(snapshot?.scenes ?? [])] as ScenePackage[],
    [snapshot?.scenes]
  )

  const copyRole = (role: RoleTemplate) => {
    if (!snapshot) {
      return
    }

    const cloned = cloneRoleTemplate(role, {
      id: personalId('role'),
      now: new Date().toISOString()
    })

    saveSnapshot(upsertRole(snapshot, cloned))
    setEditing({ kind: 'role', value: cloned })
  }

  const copyScene = (scene: ScenePackage) => {
    if (!snapshot) {
      return
    }

    const cloned = cloneScenePackage(scene, {
      id: personalId('scene'),
      now: new Date().toISOString()
    })

    saveSnapshot(upsertScene(snapshot, cloned))
    setEditing({ kind: 'scene', value: cloned })
  }

  return (
    <EducationPageFrame description={copy.description} eyebrow={t.education.home.eyebrow} title={copy.title}>
      <Alert className="mt-8" variant="success">
        <Info aria-hidden />
        <AlertTitle>{copy.safetyTitle}</AlertTitle>
        <AlertDescription>{copy.safetyDescription}</AlertDescription>
      </Alert>

      {error ? <p className="mt-4 text-sm text-destructive">{copy.saveFailed}</p> : null}

      <div className="mt-10 grid grid-cols-1 gap-10 xl:grid-cols-2">
        <TemplateSection description={copy.rolesDescription} title={copy.rolesTitle}>
          {roles.map(role => (
            <article className="p-4 sm:p-5" key={role.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-(--ui-text-primary)">{role.name}</h3>
                    <Badge variant={role.ownership === 'builtin' ? 'muted' : 'default'}>
                      {role.ownership === 'builtin' ? copy.builtin : copy.personal}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-(--ui-text-secondary)">{role.description}</p>
                  <p className="mt-3 text-xs leading-5 text-(--ui-text-tertiary)">{role.capabilityIds.join(' · ')}</p>
                </div>
                <Button
                  disabled={!snapshot}
                  onClick={() =>
                    role.ownership === 'builtin' ? copyRole(role) : setEditing({ kind: 'role', value: role })
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {role.ownership === 'builtin' ? <Copy aria-hidden /> : <Pencil aria-hidden />}
                  {role.ownership === 'builtin' ? copy.createCopy : copy.edit}
                </Button>
              </div>
            </article>
          ))}
        </TemplateSection>

        <TemplateSection description={copy.scenesDescription} title={copy.scenesTitle}>
          {scenes.map(scene => (
            <article className="p-4 sm:p-5" key={scene.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-(--ui-text-primary)">{scene.name}</h3>
                    <Badge variant={scene.ownership === 'builtin' ? 'muted' : 'default'}>
                      {scene.ownership === 'builtin' ? copy.builtin : copy.personal}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-(--ui-text-secondary)">{scene.description}</p>
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-(--ui-text-tertiary)">
                    <span>{copy.inputs(scene.intake.filter(field => field.required).length)}</span>
                    <span>{copy.outputs(scene.outputContracts.length)}</span>
                  </div>
                </div>
                <Button
                  disabled={!snapshot}
                  onClick={() =>
                    scene.ownership === 'builtin' ? copyScene(scene) : setEditing({ kind: 'scene', value: scene })
                  }
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  {scene.ownership === 'builtin' ? <Copy aria-hidden /> : <Pencil aria-hidden />}
                  {scene.ownership === 'builtin' ? copy.createCopy : copy.edit}
                </Button>
              </div>
            </article>
          ))}
        </TemplateSection>
      </div>

      <TemplateEditor
        copy={copy}
        onClose={() => setEditing(null)}
        onSave={updated => {
          if (!snapshot) {
            return
          }

          saveSnapshot(
            updated.kind === 'role' ? upsertRole(snapshot, updated.value) : upsertScene(snapshot, updated.value)
          )
          setEditing(null)
        }}
        roles={roles}
        target={editing}
      />
    </EducationPageFrame>
  )
}

function TemplateSection({
  children,
  description,
  title
}: {
  children: ReactNode
  description: string
  title: string
}) {
  return (
    <section className="min-w-0">
      <h2 className="text-base font-semibold text-(--ui-text-primary)">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-(--ui-text-tertiary)">{description}</p>
      <div className="mt-4 divide-y divide-(--ui-stroke-tertiary) overflow-hidden rounded-lg border border-(--ui-stroke-tertiary)">
        {children}
      </div>
    </section>
  )
}

function TemplateEditor({
  copy,
  onClose,
  onSave,
  roles,
  target
}: {
  copy: ReturnType<typeof useI18n>['t']['education']['templates']
  onClose: () => void
  onSave: (target: EditTarget) => void
  roles: RoleTemplate[]
  target: EditTarget | null
}) {
  const { t } = useI18n()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [instruction, setInstruction] = useState('')
  const [roleId, setRoleId] = useState('')

  useEffect(() => {
    if (!target) {
      return
    }

    setName(target.value.name)
    setDescription(target.value.description)
    setInstruction(target.kind === 'role' ? target.value.soul : '')
    setRoleId(target.kind === 'scene' ? target.value.roleTemplateId : '')
  }, [target])

  const submit = (event: FormEvent) => {
    event.preventDefault()

    if (!target || !name.trim() || !description.trim()) {
      return
    }

    const now = new Date().toISOString()
    onSave(
      target.kind === 'role'
        ? {
            kind: 'role',
            value: updatePersonalRole(target.value, { name, description, soul: instruction }, now)
          }
        : {
            kind: 'scene',
            value: updatePersonalScene(target.value, { name, description, roleTemplateId: roleId }, now)
          }
    )
  }

  return (
    <Dialog
      onOpenChange={open => {
        if (!open) {
          onClose()
        }
      }}
      open={Boolean(target)}
    >
      <DialogContent>
        <form className="grid gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{target?.kind === 'role' ? copy.editRoleTitle : copy.editSceneTitle}</DialogTitle>
            <DialogDescription>{copy.safetyDescription}</DialogDescription>
          </DialogHeader>
          <Field htmlFor="template-name" label={copy.name}>
            <Input id="template-name" onChange={event => setName(event.target.value)} required value={name} />
          </Field>
          <Field htmlFor="template-description" label={copy.descriptionLabel}>
            <Textarea
              id="template-description"
              onChange={event => setDescription(event.target.value)}
              required
              value={description}
            />
          </Field>
          {target?.kind === 'role' ? (
            <Field htmlFor="template-instruction" label={copy.instruction}>
              <Textarea
                className="min-h-28"
                id="template-instruction"
                onChange={event => setInstruction(event.target.value)}
                required
                value={instruction}
              />
              <FieldHint>{copy.instructionHint}</FieldHint>
            </Field>
          ) : (
            <Field label={copy.assignedRole}>
              <Select onValueChange={setRoleId} value={roleId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <DialogFooter>
            <Button onClick={onClose} type="button" variant="outline">
              {t.common.cancel}
            </Button>
            <Button disabled={!name.trim() || !description.trim()} type="submit">
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
