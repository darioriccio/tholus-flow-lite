import { useEffect } from 'react'
import { getDemoSensor, startDemoStream } from '../lib/demo-stream'
import { saveCountEvent, saveStatusSnapshot } from '../lib/history-db'
import { buildWebSocketUrl, fetchSensorConfig, fetchSensorStatus } from '../lib/sensor-api'
import { parseStreamMessage } from '../lib/ws-parser'
import { useAppStore } from '../store/app-store'
import type { ConnectionMode, CountEventRecord, SavedSensorConnection, SensorStatusResponse } from '../lib/types'

function buildSnapshot(
  sensor: SavedSensorConnection,
  source: ConnectionMode,
  status?: SensorStatusResponse | null,
) {
  return {
    id: `${sensor.id}-${Date.now()}`,
    sensorId: sensor.id,
    host: sensor.host,
    source,
    timestamp: new Date().toISOString(),
    paired: status?.paired,
    wifiConnected: status?.wifi_connected,
    sensorReady: status?.sensor?.ready,
    queueDepth: status?.cloud?.queue_depth,
    lastError:
      status?.sensor?.last_error !== undefined ? String(status.sensor.last_error) : null,
    fwVersion: status?.fw_version,
    protocolVersion: status?.protocol_version,
  }
}

export function useConnectionController(
  activeSensor: SavedSensorConnection | null,
  mode: ConnectionMode,
) {
  const setConnection = useAppStore((state) => state.setConnection)
  const rememberSensor = useAppStore((state) => state.rememberSensor)
  const setStatus = useAppStore((state) => state.setStatus)
  const setRemoteConfig = useAppStore((state) => state.setRemoteConfig)
  const setLiveFrame = useAppStore((state) => state.setLiveFrame)
  const setLiveTracks = useAppStore((state) => state.setLiveTracks)
  const setDiagnostics = useAppStore((state) => state.setDiagnostics)
  const setLastCountEvent = useAppStore((state) => state.setLastCountEvent)
  const markHistoryDirty = useAppStore((state) => state.markHistoryDirty)
  const resetLiveState = useAppStore((state) => state.resetLiveState)
  const activeSensorId = activeSensor?.id ?? null
  const activeHost = activeSensor?.host ?? null
  const activeLabel = activeSensor?.label ?? null
  const activeToken = activeSensor?.token
  const activeWsPort = activeSensor?.wsPort
  const activeMac = activeSensor?.mac
  const activeDeviceId = activeSensor?.deviceId
  const activeFirmware = activeSensor?.fwVersion
  const activeProtocolVersion = activeSensor?.protocolVersion
  const activeMdnsName = activeSensor?.mdnsName
  const activePaired = activeSensor?.paired
  const activeNotes = activeSensor?.notes
  const activeLastConnectedAt = activeSensor?.lastConnectedAt
  const sensorKey = activeSensor
    ? [
        activeSensorId,
        activeHost,
        activeLabel,
        activeToken ?? '',
        activeWsPort ?? 81,
      ].join('|')
    : 'none'

  useEffect(() => {
    if (!activeSensorId || !activeHost || !activeLabel) {
      resetLiveState()
      setStatus(null)
      setRemoteConfig(null)
      setConnection({
        phase: 'idle',
        label: 'No sensor selected',
        detail: 'Enter a sensor hostname or start demo mode.',
      })
      return
    }

    const sensor: SavedSensorConnection = {
      id: activeSensorId,
      host: activeHost,
      label: activeLabel,
      token: activeToken,
      wsPort: activeWsPort,
      mac: activeMac,
      deviceId: activeDeviceId,
      fwVersion: activeFirmware,
      protocolVersion: activeProtocolVersion,
      mdnsName: activeMdnsName,
      paired: activePaired,
      notes: activeNotes,
      lastConnectedAt: activeLastConnectedAt ?? new Date().toISOString(),
    }

    let cancelled = false
    let socket: WebSocket | null = null
    let reconnectTimer: number | null = null
    let statusTimer: number | null = null
    let demoCleanup: (() => void) | null = null

    const handleCountEvent = async (event: CountEventRecord) => {
      setLastCountEvent(event)
      await saveCountEvent(event)
      markHistoryDirty()
    }

    const connectDemo = async () => {
      const demoSensor = getDemoSensor()
      rememberSensor(demoSensor)
      setConnection({
        phase: 'demo',
        label: 'Demo mode is running',
        detail: 'Synthetic doorway activity for previews, screenshots and testing.',
        lastSeenAt: new Date().toISOString(),
      })
      setRemoteConfig({
        heightThreshold: 1700,
        roiMask: [1, 1, 1, 1, 1, 1, 1, 1],
        countingLineRow: 3,
        topToBottomIsIn: true,
        maxTracks: 4,
        eventConfidenceMin: 0.6,
      })
      setStatus({
        mac: demoSensor.id,
        paired: true,
        fw_version: 'demo',
        protocol_version: 2,
        sensor: {
          model: 'VL53L8CH',
          ready: true,
          resolution: '8x8',
          frequency_hz: 15,
          last_error: 0,
        },
        cloud: {
          enabled: false,
          configured: false,
          queue_depth: 0,
          last_upload_ok: true,
        },
        ws: {
          legacy_csv: true,
          json_v2: true,
        },
        tracking: {
          algorithm: 'demo',
          heightThreshold: 1700,
          roiMask: [1, 1, 1, 1, 1, 1, 1, 1],
          countingLineRow: 3,
          topToBottomIsIn: true,
          maxTracks: 4,
          eventConfidenceMin: 0.6,
        },
      })

      await saveStatusSnapshot(buildSnapshot(demoSensor, 'demo'))
      markHistoryDirty()

      demoCleanup = startDemoStream(demoSensor, {
        onFrame: (frame) => {
          if (cancelled) return
          setLiveFrame(frame)
        },
        onTracks: (tracks) => {
          if (cancelled) return
          setLiveTracks(tracks)
        },
        onCount: (event) => {
          if (cancelled) return
          void handleCountEvent(event)
        },
        onDiagnostic: (diagnostic) => {
          if (cancelled) return
          setDiagnostics(diagnostic)
        },
      })
    }

    const pollStatus = async () => {
      if (cancelled) return

      try {
        const status = await fetchSensorStatus(sensor.host)
        if (cancelled) return

        setStatus(status)
        rememberSensor(
          {
            ...sensor,
            mac: status.mac,
            fwVersion: status.fw_version,
            protocolVersion: status.protocol_version,
            wsPort: status.ws_port,
            paired: status.paired,
            deviceId: status.device_id,
            label: sensor.label || status.mdns_name || sensor.host,
          },
          true,
        )
        setConnection({
          phase: socket?.readyState === WebSocket.OPEN ? 'connected' : 'connecting',
          label: status.sensor?.ready ? 'Sensor reachable' : 'Sensor responded',
          detail: status.paired
            ? 'Live stream available'
            : 'Unpaired sensor: pair to unlock protected endpoints',
          lastSeenAt: new Date().toISOString(),
        })

        await saveStatusSnapshot(buildSnapshot(sensor, 'hardware', status))
        markHistoryDirty()

        if (sensor.token) {
          try {
            const config = await fetchSensorConfig(sensor)
            if (!cancelled) setRemoteConfig(config.config)
          } catch {
            if (!cancelled) {
              setRemoteConfig(null)
            }
          }
        }
      } catch (error) {
        if (cancelled) return
        setConnection({
          phase: 'error',
          label: 'Could not reach the sensor',
          detail: error instanceof Error ? error.message : 'Network error',
        })
      }
    }

    const openSocket = async () => {
      await pollStatus()
      if (cancelled) return

      const url = buildWebSocketUrl(sensor, useAppStore.getState().status)
      setConnection({
        phase: 'connecting',
        label: 'Opening live stream',
        detail: `Connecting to ${url}`,
      })

      socket = new WebSocket(url)

      socket.addEventListener('open', () => {
        socket?.send(JSON.stringify({ type: 'subscribe', mode: 'json_v2' }))
        setConnection({
          phase: 'connected',
          label: 'Live stream connected',
          detail: 'Receiving frames, track updates and count events.',
          lastSeenAt: new Date().toISOString(),
        })
      })

      socket.addEventListener('message', (message) => {
        const parsed = parseStreamMessage(String(message.data))
        if (!parsed || cancelled) return

        const nowIso = new Date().toISOString()
        useAppStore.setState((state) => ({
          connection: {
            ...state.connection,
            phase:
              state.connection.phase === 'error' ? 'connected' : state.connection.phase,
            lastSeenAt: nowIso,
          },
        }))

        if (parsed.type === 'frame') setLiveFrame(parsed.frame)
        if (parsed.type === 'tracks') setLiveTracks(parsed.tracks)
        if (parsed.type === 'diag') setDiagnostics(parsed.diagnostic)
        if (parsed.type === 'count') {
          const event: CountEventRecord = {
            ...parsed.event,
            sensorId: sensor.id,
            sensorLabel: sensor.label,
            host: sensor.host,
            source: 'hardware',
          }
          void handleCountEvent(event)
        }
      })

      socket.addEventListener('close', () => {
        if (cancelled) return
        setConnection({
          phase: 'degraded',
          label: 'Live stream paused',
          detail: 'Trying to reconnect to the sensor…',
          lastSeenAt: new Date().toISOString(),
        })
        reconnectTimer = window.setTimeout(() => {
          void openSocket()
        }, 2200)
      })

      socket.addEventListener('error', () => {
        setConnection({
          phase: 'degraded',
          label: 'Live stream had an error',
          detail: 'Status polling continues while the socket reconnects.',
          lastSeenAt: new Date().toISOString(),
        })
      })
    }

    resetLiveState()
    setRemoteConfig(null)

    if (mode === 'demo') {
      void connectDemo()
    } else {
      void openSocket()
      statusTimer = window.setInterval(() => {
        void pollStatus()
      }, 15000)
    }

    return () => {
      cancelled = true
      if (reconnectTimer) window.clearTimeout(reconnectTimer)
      if (statusTimer) window.clearInterval(statusTimer)
      if (socket) socket.close()
      if (demoCleanup) demoCleanup()
    }
  }, [
    activeDeviceId,
    activeFirmware,
    activeHost,
    activeLabel,
    activeLastConnectedAt,
    activeMac,
    activeMdnsName,
    activeNotes,
    activePaired,
    activeProtocolVersion,
    activeSensorId,
    activeToken,
    activeWsPort,
    markHistoryDirty,
    mode,
    rememberSensor,
    resetLiveState,
    sensorKey,
    setConnection,
    setDiagnostics,
    setLastCountEvent,
    setLiveFrame,
    setLiveTracks,
    setRemoteConfig,
    setStatus,
  ])
}
