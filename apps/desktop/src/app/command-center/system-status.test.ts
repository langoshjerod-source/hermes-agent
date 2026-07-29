import { describe, expect, it } from 'vitest'

import { getSystemControls } from './system-status'

describe('getSystemControls', () => {
  it('presents an unconfigured messaging gateway without a misleading restart action', () => {
    expect(
      getSystemControls({
        can_update_hermes: false,
        components: { platforms: { configured: 0 } },
        gateway_platforms: {},
        gateway_running: false
      })
    ).toEqual({
      canRestartGateway: false,
      canUpdateHermes: false,
      gatewayState: 'not-configured'
    })
  })

  it('allows restart for a configured but stopped messaging gateway', () => {
    expect(
      getSystemControls({
        can_update_hermes: true,
        components: { platforms: { configured: 1 } },
        gateway_platforms: {},
        gateway_running: false
      })
    ).toEqual({
      canRestartGateway: true,
      canUpdateHermes: true,
      gatewayState: 'stopped'
    })
  })

  it('keeps backward compatibility with gateways that predate capability fields', () => {
    expect(
      getSystemControls({
        gateway_platforms: {},
        gateway_running: false
      })
    ).toEqual({
      canRestartGateway: true,
      canUpdateHermes: true,
      gatewayState: 'stopped'
    })
  })
})
