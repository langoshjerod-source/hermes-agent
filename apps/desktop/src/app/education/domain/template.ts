export type TemplateOwnership = 'builtin' | 'personal'

export interface TemplateOrigin {
  id: string
  version: number
}

export interface VersionedTemplate {
  id: string
  name: string
  ownership: TemplateOwnership
  version: number
  clonedFrom?: TemplateOrigin
  createdAt: string
  updatedAt: string
}

export function assertPersonalTemplate(template: VersionedTemplate): void {
  if (template.ownership !== 'personal') {
    throw new Error(`Built-in template ${template.id} is immutable; copy it before editing`)
  }
}

export function nextTemplateVersion(template: VersionedTemplate): number {
  assertPersonalTemplate(template)

  return template.version + 1
}

export function hasOriginUpdate(template: VersionedTemplate, currentOriginVersion: number | null): boolean {
  return Boolean(template.clonedFrom && currentOriginVersion && currentOriginVersion > template.clonedFrom.version)
}
