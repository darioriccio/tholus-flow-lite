import { DEMO_SENSOR_ID } from './types'
import type { ConnectionMode, CountEventRecord, SavedSensorConnection, SensorDiagnostic, SensorFrame, SensorTrack } from './types'

interface DemoHandlers {
  onFrame: (frame: SensorFrame) => void
  onTracks: (tracks: SensorTrack[]) => void
  onCount: (event: CountEventRecord) => void
  onDiagnostic: (diagnostic: SensorDiagnostic) => void
}

interface DemoActor {
  id: number
  row: number
  col: number
  speed: number
  direction: 'in' | 'out'
  crossed: boolean
  confidence: number
  distanceMm: number
}

const BASE_SENSOR: SavedSensorConnection = {
  id: DEMO_SENSOR_ID,
  label: 'Demo Doorway',
  host: 'demo.local',
  paired: true,
  fwVersion: 'demo',
  protocolVersion: 2,
  wsPort: 81,
  lastConnectedAt: new Date().toISOString(),
  notes: 'Simulated doorway stream for screenshots and README previews.',
}

export function getDemoSensor(): SavedSensorConnection {
  return BASE_SENSOR
}

function createMatrix(actors: DemoActor[]): number[] {
  const matrix = Array.from({ length: 64 }, () => 0)

  actors.forEach((actor) => {
    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const index = row * 8 + col
        const distance = Math.hypot(actor.row - row, actor.col - col)
        const falloff = Math.max(0, 1 - distance / 3)
        const value = Math.round(actor.distanceMm + (1 - falloff) * 260)
        if (falloff > 0.08) {
          matrix[index] = matrix[index] === 0 ? value : Math.min(matrix[index], value)
        }
      }
    }
  })

  return matrix
}

export function startDemoStream(sensor: SavedSensorConnection, handlers: DemoHandlers) {
  let seq = 0
  let actorId = 1
  let cloudQueueDepth = 0
  let actors: DemoActor[] = []

  const spawnActor = () => {
    if (actors.length >= 2) return

    const direction: DemoActor['direction'] = Math.random() > 0.38 ? 'in' : 'out'
    const startRow = direction === 'in' ? -0.9 : 7.9
    const speed = 0.18 + Math.random() * 0.08
    const actor: DemoActor = {
      id: actorId,
      row: startRow,
      col: 2 + Math.random() * 4,
      speed,
      direction,
      crossed: false,
      confidence: 0.72 + Math.random() * 0.25,
      distanceMm: 690 + Math.round(Math.random() * 280),
    }

    actorId += 1
    actors.push(actor)
  }

  spawnActor()

  const frameInterval = window.setInterval(() => {
    if (Math.random() > 0.94) {
      spawnActor()
    }

    actors = actors
      .map((actor) => {
        const delta = actor.direction === 'in' ? actor.speed : -actor.speed
        const row = actor.row + delta
        const crossed =
          actor.crossed ||
          (actor.direction === 'in' ? row > 3.15 : row < 2.85)

        if (!actor.crossed && crossed) {
          const event: CountEventRecord = {
            id: `${sensor.id}-${Date.now()}-${actor.id}`,
            sensorId: sensor.id,
            sensorLabel: sensor.label,
            host: sensor.host,
            source: 'demo' satisfies ConnectionMode,
            direction: actor.direction,
            distanceMm: actor.distanceMm,
            confidence: Number(actor.confidence.toFixed(2)),
            timestamp: new Date().toISOString(),
          }

          handlers.onCount(event)
          cloudQueueDepth = Math.max(0, cloudQueueDepth + (actor.direction === 'in' ? 1 : -1))
        }

        return {
          ...actor,
          row,
          crossed,
        }
      })
      .filter((actor) => actor.row > -1.6 && actor.row < 8.6)

    seq += 1
    const frame: SensorFrame = {
      kind: 'frame',
      seq,
      matrix: createMatrix(actors),
      occupancyEstimate: actors.length,
      sensorReady: true,
      timestamp: new Date().toISOString(),
    }

    const tracks: SensorTrack[] = actors.map((actor) => ({
      id: actor.id,
      row: actor.row,
      col: actor.col,
      distanceMm: actor.distanceMm,
      confidence: Number(actor.confidence.toFixed(2)),
      state: actor.direction === 'in' ? 'moving_down' : 'moving_up',
    }))

    handlers.onFrame(frame)
    handlers.onTracks(tracks)
  }, 120)

  const diagnosticInterval = window.setInterval(() => {
    handlers.onDiagnostic({
      kind: 'diag',
      timestamp: new Date().toISOString(),
      wifiConnected: true,
      cloudQueueDepth,
      lastError: null,
    })
  }, 3000)

  return () => {
    window.clearInterval(frameInterval)
    window.clearInterval(diagnosticInterval)
  }
}
