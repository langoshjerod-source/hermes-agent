import { lazy } from 'react'

import { registry } from '@/contrib/registry'

import { ROUTES_AREA, SIDEBAR_NAV_AREA, type SidebarNavContribution } from '../routes'

const EducationHome = lazy(async () => ({ default: (await import('./home')).EducationHome }))
const EducationSources = lazy(async () => ({ default: (await import('./sources')).EducationSources }))
const EducationTasks = lazy(async () => ({ default: (await import('./tasks')).EducationTasks }))
const EducationTemplates = lazy(async () => ({ default: (await import('./templates')).EducationTemplates }))

const SOURCE = 'product:mengxueban-education'

registry.registerMany([
  {
    area: ROUTES_AREA,
    data: { defaultLanding: true, path: '/home' },
    id: 'education:home-page',
    render: () => <EducationHome />,
    source: SOURCE,
    title: '首页'
  },
  {
    area: ROUTES_AREA,
    data: { path: '/tasks' },
    id: 'education:tasks-page',
    render: () => <EducationTasks />,
    source: SOURCE,
    title: '任务'
  },
  {
    area: ROUTES_AREA,
    data: { path: '/sources' },
    id: 'education:sources-page',
    render: () => <EducationSources />,
    source: SOURCE,
    title: '数据来源'
  },
  {
    area: ROUTES_AREA,
    data: { path: '/templates' },
    id: 'education:templates-page',
    render: () => <EducationTemplates />,
    source: SOURCE,
    title: '角色与场景'
  },
  {
    area: SIDEBAR_NAV_AREA,
    data: { codicon: 'home', label: '首页', path: '/home' } satisfies SidebarNavContribution,
    id: 'education:home-nav',
    order: 10,
    source: SOURCE
  },
  {
    area: SIDEBAR_NAV_AREA,
    data: { codicon: 'checklist', label: '任务', path: '/tasks' } satisfies SidebarNavContribution,
    id: 'education:tasks-nav',
    order: 20,
    source: SOURCE
  },
  {
    area: SIDEBAR_NAV_AREA,
    data: { codicon: 'database', label: '数据来源', path: '/sources' } satisfies SidebarNavContribution,
    id: 'education:sources-nav',
    order: 30,
    source: SOURCE
  },
  {
    area: SIDEBAR_NAV_AREA,
    data: { codicon: 'person', label: '角色与场景', path: '/templates' } satisfies SidebarNavContribution,
    id: 'education:templates-nav',
    order: 40,
    source: SOURCE
  }
])
