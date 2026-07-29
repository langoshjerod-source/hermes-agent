import { afterEach, describe, expect, it } from 'vitest'

import { registry } from '@/contrib/registry'

import {
  appViewForPath,
  contributedRoutes,
  ROUTES_AREA,
  routeSessionId,
  SIDEBAR_NAV_AREA,
  type SidebarNavContribution
} from '../routes'

const EDUCATION_HOME_ROUTE = '/home'
const EDUCATION_SOURCE = 'product:mengxueban-education'

let disposeContribution: (() => void) | null = null

afterEach(() => {
  disposeContribution?.()
  disposeContribution = null
})

describe('MengXueBan education contribution contract', () => {
  it('registers Home as a workspace page without adding an education route to Hermes core', () => {
    disposeContribution = registry.registerMany([
      {
        area: ROUTES_AREA,
        data: { path: EDUCATION_HOME_ROUTE },
        id: 'education:home-page',
        render: () => null,
        source: EDUCATION_SOURCE,
        title: '首页'
      },
      {
        area: SIDEBAR_NAV_AREA,
        data: {
          codicon: 'home',
          label: '首页',
          path: EDUCATION_HOME_ROUTE
        } satisfies SidebarNavContribution,
        id: 'education:home-nav',
        source: EDUCATION_SOURCE
      }
    ])

    expect(appViewForPath(EDUCATION_HOME_ROUTE)).toBe('extension')
    expect(routeSessionId(EDUCATION_HOME_ROUTE)).toBeNull()

    expect(contributedRoutes()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: `${EDUCATION_SOURCE}:education:home-page`,
          path: EDUCATION_HOME_ROUTE,
          title: '首页'
        })
      ])
    )

    expect(registry.getArea(SIDEBAR_NAV_AREA)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          data: {
            codicon: 'home',
            label: '首页',
            path: EDUCATION_HOME_ROUTE
          },
          id: 'education:home-nav',
          source: EDUCATION_SOURCE
        })
      ])
    )
  })

  it('disposes the education page and navigation together', () => {
    disposeContribution = registry.registerMany([
      {
        area: ROUTES_AREA,
        data: { path: EDUCATION_HOME_ROUTE },
        id: 'education:home-page',
        render: () => null,
        source: EDUCATION_SOURCE
      },
      {
        area: SIDEBAR_NAV_AREA,
        data: { codicon: 'home', label: '首页', path: EDUCATION_HOME_ROUTE },
        id: 'education:home-nav',
        source: EDUCATION_SOURCE
      }
    ])

    disposeContribution()
    disposeContribution = null

    expect(contributedRoutes().some(route => route.path === EDUCATION_HOME_ROUTE)).toBe(false)
    expect(registry.getArea(SIDEBAR_NAV_AREA).some(item => item.id === 'education:home-nav')).toBe(false)
  })
})
