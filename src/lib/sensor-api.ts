import { SAFE_REMOTE_CONFIG } from './types'
import type { SavedSensorConnection, SensorPairResponse, SensorRemoteConfig, SensorStatusResponse } from './types'

export class SensorApiError extends Error {
  code: 'network' | 'http' | 'parse'
  status?: number

  constructor(code: 'network' | 'http' | 'parse', message: string, status?: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

export function normalizeHost(input: string): string {
  return input
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^ws:\/\//i, '')
    .replace(/\/+$/, '')
    .replace(/\/api\/.*$/i, '')
}

function buildHttpBase(host: string) {
  return `http://${normalizeHost(host)}`
}

function createHeaders(token?: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(url, init)
  } catch (error) {
    throw new SensorApiError(
      'network',
      error instanceof Error
        ? error.message
        : 'Network error while contacting sensor',
    )
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new SensorApiError(
      'http',
      detail || `Sensor replied with HTTP ${response.status}`,
      response.status,
    )
  }

  try {
    return (await response.json()) as T
  } catch {
    throw new SensorApiError('parse', 'Could not parse sensor response as JSON')
  }
}

export async function fetchSensorStatus(host: string) {
  return requestJson<SensorStatusResponse>(`${buildHttpBase(host)}/api/status`)
}

export async function pairSensor(host: string, setupCode: string, clientName: string) {
  return requestJson<SensorPairResponse>(`${buildHttpBase(host)}/api/pair`, {
    method: 'POST',
    headers: createHeaders(),
    body: JSON.stringify({
      setup_code: setupCode.trim(),
      client_name: clientName.trim(),
    }),
  })
}

export async function fetchSensorConfig(sensor: SavedSensorConnection) {
  return requestJson<{ status?: string; config: SensorRemoteConfig }>(
    `${buildHttpBase(sensor.host)}/api/config`,
    {
      headers: createHeaders(sensor.token),
    },
  )
}

export async function pushSensorConfig(
  sensor: SavedSensorConnection,
  config: SensorRemoteConfig,
) {
  return requestJson<{ status?: string; restart_required?: boolean; applied?: SensorRemoteConfig }>(
    `${buildHttpBase(sensor.host)}/api/config`,
    {
      method: 'POST',
      headers: createHeaders(sensor.token),
      body: JSON.stringify({
        ...SAFE_REMOTE_CONFIG,
        ...config,
      }),
    },
  )
}

export async function restartSensor(sensor: SavedSensorConnection) {
  return requestJson<{ status?: string; restarting?: boolean }>(
    `${buildHttpBase(sensor.host)}/api/restart`,
    {
      method: 'POST',
      headers: createHeaders(sensor.token),
    },
  )
}

export function buildWebSocketUrl(sensor: SavedSensorConnection, status?: SensorStatusResponse | null) {
  const port = status?.ws_port ?? sensor.wsPort ?? 81
  return `ws://${normalizeHost(sensor.host)}:${port}`
}
