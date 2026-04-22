export type AppView = 'connect' | 'live' | 'today' | 'calibration' | 'export'
export type ConnectionMode = 'hardware' | 'demo'
export type ConnectionPhase =
  | 'idle'
  | 'checking'
  | 'connecting'
  | 'connected'
  | 'degraded'
  | 'error'
  | 'demo'

export type CountDirection = 'in' | 'out'

export interface SavedSensorConnection {
  id: string
  label: string
  host: string
  token?: string
  mac?: string
  deviceId?: string
  fwVersion?: string
  protocolVersion?: number
  wsPort?: number
  mdnsName?: string
  paired?: boolean
  lastConnectedAt: string
  notes?: string
}

export interface ConnectionState {
  phase: ConnectionPhase
  label: string
  detail?: string
  lastSeenAt?: string
}

export interface SensorStatusResponse {
  mac: string
  status?: string
  protocol_version?: number
  device_id?: string
  fw_version?: string
  paired?: boolean
  auth_required?: boolean
  mode?: string
  ip?: string
  ws_port?: number
  ap_name?: string
  mdns_name?: string
  wifi_connected?: boolean
  sensor?: {
    model?: string
    ready?: boolean
    resolution?: string
    frequency_hz?: number
    last_error?: number
  }
  cloud?: {
    enabled?: boolean
    configured?: boolean
    queue_depth?: number
    last_upload_ok?: boolean
  }
  ws?: {
    legacy_csv?: boolean
    json_v2?: boolean
  }
  tracking?: SensorRemoteConfig & {
    algorithm?: string
  }
}

export interface SensorPairResponse {
  status?: string
  token: string
  device_id?: string
  protocol_version?: number
}

export interface SensorRemoteConfig {
  heightThreshold?: number
  roiMask?: number[]
  countingLineRow?: number
  topToBottomIsIn?: boolean
  maxTracks?: number
  eventConfidenceMin?: number
  streamModeDefault?: string
}

export interface SensorFrame {
  kind: 'frame'
  seq?: number
  matrix: number[]
  occupancyEstimate?: number
  sensorReady?: boolean
  timestamp: string
}

export interface SensorTrack {
  id: number
  row: number
  col: number
  distanceMm: number
  confidence: number
  state: string
}

export interface SensorDiagnostic {
  kind: 'diag'
  timestamp: string
  wifiConnected?: boolean
  cloudQueueDepth?: number
  lastError?: string | null
}

export interface CountEventRecord {
  id: string
  sensorId: string
  sensorLabel: string
  host: string
  source: ConnectionMode
  direction: CountDirection
  distanceMm: number
  confidence: number
  timestamp: string
}

export interface StatusSnapshotRecord {
  id: string
  sensorId: string
  host: string
  source: ConnectionMode
  timestamp: string
  paired?: boolean
  wifiConnected?: boolean
  sensorReady?: boolean
  queueDepth?: number
  lastError?: string | null
  fwVersion?: string
  protocolVersion?: number
}

export interface HourlyBucket {
  hour: number
  label: string
  inCount: number
  outCount: number
  netChange: number
  occupancyEstimate: number
  traffic: number
}

export interface DailySummary {
  dateKey: string
  label: string
  inCount: number
  outCount: number
  occupancyEstimate: number
  peakHour: number
  peakTraffic: number
  peakOccupancyEstimate: number
  firstEventAt?: string
  lastEventAt?: string
}

export interface SensorInsight {
  title: string
  value: string
  detail: string
  tone?: 'signal' | 'neutral'
}

export interface HistoryBundle {
  version: 1
  exportedAt: string
  app: string
  events: CountEventRecord[]
  snapshots: StatusSnapshotRecord[]
}

export interface ParsedFrameMessage {
  type: 'frame'
  frame: SensorFrame
}

export interface ParsedTracksMessage {
  type: 'tracks'
  tracks: SensorTrack[]
}

export interface ParsedCountMessage {
  type: 'count'
  event: Omit<CountEventRecord, 'sensorId' | 'sensorLabel' | 'host' | 'source'>
}

export interface ParsedDiagnosticMessage {
  type: 'diag'
  diagnostic: SensorDiagnostic
}

export interface ParsedSubscribedMessage {
  type: 'subscribed'
  mode?: string
  protocolVersion?: number
}

export type ParsedStreamMessage =
  | ParsedFrameMessage
  | ParsedTracksMessage
  | ParsedCountMessage
  | ParsedDiagnosticMessage
  | ParsedSubscribedMessage

export const SAFE_REMOTE_CONFIG: Required<SensorRemoteConfig> = {
  heightThreshold: 1700,
  roiMask: [1, 1, 1, 1, 1, 1, 1, 1],
  countingLineRow: 3,
  topToBottomIsIn: true,
  maxTracks: 4,
  eventConfidenceMin: 0.6,
  streamModeDefault: 'json_v2',
}

export const DEMO_SENSOR_ID = 'demo-tholus-flow-lite'
