import type { StatusResponse } from '@/types/hermes'

type SystemGatewayState = 'not-configured' | 'running' | 'stopped'

type SystemStatusInput = Pick<StatusResponse, 'gateway_platforms' | 'gateway_running'> &
  Partial<Pick<StatusResponse, 'can_update_hermes' | 'components'>>

interface SystemControls {
  canRestartGateway: boolean
  canUpdateHermes: boolean
  gatewayState: SystemGatewayState
}

export function getSystemControls(status: SystemStatusInput): SystemControls {
  const configured = status.components?.platforms?.configured
  const messagingConfigured = configured === undefined ? null : configured > 0

  return {
    // Older gateways did not advertise component counts or update capability.
    // Preserve their previous controls until the backend can state otherwise.
    canRestartGateway: messagingConfigured !== false,
    canUpdateHermes: status.can_update_hermes !== false,
    gatewayState: messagingConfigured === false ? 'not-configured' : status.gateway_running ? 'running' : 'stopped'
  }
}
