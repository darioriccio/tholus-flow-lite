import type { ParsedStreamMessage, SensorDiagnostic, SensorFrame, SensorTrack } from './types'

function parseStructuredFrame(text: string): SensorFrame | null {
  try {
    const raw = JSON.parse(text) as {
      type?: string
      seq?: number
      matrix?: number[]
      occupancy_estimate?: number
      sensor_ready?: boolean
      ts_ms?: number
    }

    if (raw.type === 'frame' && Array.isArray(raw.matrix) && raw.matrix.length === 64) {
      return {
        kind: 'frame',
        seq: raw.seq,
        matrix: raw.matrix.map((value) => (Number.isFinite(value) ? value : 0)),
        occupancyEstimate: raw.occupancy_estimate,
        sensorReady: raw.sensor_ready,
        timestamp: new Date().toISOString(),
      }
    }
  } catch {
    return null
  }

  return null
}

function parseCsvFrame(text: string): SensorFrame | null {
  const cells = text.split(',').map((value) => Number.parseInt(value.trim(), 10))
  if (cells.length !== 64 || cells.some((value) => Number.isNaN(value))) {
    return null
  }

  return {
    kind: 'frame',
    matrix: cells,
    timestamp: new Date().toISOString(),
  }
}

export function parseStreamMessage(text: string): ParsedStreamMessage | null {
  const structuredFrame = parseStructuredFrame(text)
  if (structuredFrame) return { type: 'frame', frame: structuredFrame }

  const csvFrame = parseCsvFrame(text)
  if (csvFrame) return { type: 'frame', frame: csvFrame }

  let raw: Record<string, unknown>
  try {
    raw = JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }

  if (raw.type === 'subscribed') {
    return {
      type: 'subscribed',
      mode: typeof raw.mode === 'string' ? raw.mode : undefined,
      protocolVersion:
        typeof raw.protocol_version === 'number' ? raw.protocol_version : undefined,
    }
  }

  if (raw.type === 'count' && typeof raw.direction === 'string') {
    return {
      type: 'count',
      event: {
        id:
          typeof raw.event_id === 'string'
            ? raw.event_id
            : crypto.randomUUID(),
        direction: raw.direction.toLowerCase() === 'out' ? 'out' : 'in',
        distanceMm:
          typeof raw.distance_mm === 'number' ? raw.distance_mm : 0,
        confidence:
          typeof raw.confidence === 'number' ? raw.confidence : 0,
        timestamp: new Date().toISOString(),
      },
    }
  }

  if (raw.type === 'tracks' && Array.isArray(raw.tracks)) {
    const tracks: SensorTrack[] = raw.tracks
      .map((track) => track as Record<string, unknown>)
      .filter(
        (track) =>
          typeof track.id === 'number' &&
          typeof track.row === 'number' &&
          typeof track.col === 'number',
      )
      .map((track) => ({
        id: track.id as number,
        row: track.row as number,
        col: track.col as number,
        distanceMm:
          typeof track.distance_mm === 'number' ? (track.distance_mm as number) : 0,
        confidence:
          typeof track.confidence === 'number' ? (track.confidence as number) : 0,
        state: typeof track.state === 'string' ? (track.state as string) : 'tracking',
      }))

    return { type: 'tracks', tracks }
  }

  if (raw.type === 'diag') {
    const diagnostic: SensorDiagnostic = {
      kind: 'diag',
      timestamp: new Date().toISOString(),
      wifiConnected:
        typeof raw.wifi_connected === 'boolean' ? raw.wifi_connected : undefined,
      cloudQueueDepth:
        typeof raw.cloud_queue_depth === 'number'
          ? raw.cloud_queue_depth
          : undefined,
      lastError:
        typeof raw.last_error === 'string' || raw.last_error === null
          ? (raw.last_error as string | null)
          : undefined,
    }

    return { type: 'diag', diagnostic }
  }

  return null
}
