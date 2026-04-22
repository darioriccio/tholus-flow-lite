import { startTransition, useMemo, useState } from 'react'
import { ArrowRight, CheckCircle2, Cpu, Sparkles, Wifi } from 'lucide-react'
import { getDemoSensor } from '../lib/demo-stream'
import { fetchSensorStatus, normalizeHost, pairSensor } from '../lib/sensor-api'
import { useAppStore } from '../store/app-store'
import type { ConnectionState, SavedSensorConnection, SensorStatusResponse } from '../lib/types'
import { Chip, Panel, PrimaryButton, SecondaryButton, SectionHeader } from '../components/ui'

function buildSavedSensor(
  host: string,
  status: SensorStatusResponse,
  label: string,
  token?: string,
): SavedSensorConnection {
  const normalizedHost = normalizeHost(host)
  return {
    id: status.mac || normalizedHost,
    label: label.trim() || status.mdns_name || normalizedHost,
    host: normalizedHost,
    token,
    mac: status.mac,
    deviceId: status.device_id,
    fwVersion: status.fw_version,
    protocolVersion: status.protocol_version,
    wsPort: status.ws_port,
    mdnsName: status.mdns_name,
    paired: status.paired,
    lastConnectedAt: new Date().toISOString(),
  }
}

export function ConnectScreen({
  activeSensor,
  connection,
  recentSensors,
  status,
}: {
  activeSensor: SavedSensorConnection | null
  connection: ConnectionState
  recentSensors: SavedSensorConnection[]
  status: SensorStatusResponse | null
}) {
  const rememberSensor = useAppStore((state) => state.rememberSensor)
  const setMode = useAppStore((state) => state.setMode)
  const setView = useAppStore((state) => state.setView)
  const setConnection = useAppStore((state) => state.setConnection)
  const setStatus = useAppStore((state) => state.setStatus)

  const [host, setHost] = useState(activeSensor?.host ?? '')
  const [label, setLabel] = useState(activeSensor?.label ?? 'Front Door')
  const [setupCode, setSetupCode] = useState('')
  const [pairing, setPairing] = useState(false)
  const [checking, setChecking] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const canPair = Boolean(activeSensor?.host)
  const statusFacts = useMemo(
    () =>
      status
        ? [
            ['protocol', String(status.protocol_version ?? '—')],
            ['firmware', status.fw_version ?? '—'],
            ['paired', status.paired ? 'yes' : 'no'],
            ['json_v2', status.ws?.json_v2 ? 'supported' : 'no'],
          ]
        : [],
    [status],
  )

  const handleInspect = async (sensorHost: string, preferredLabel = label) => {
    setChecking(true)
    setFeedback(null)

    try {
      const response = await fetchSensorStatus(sensorHost)
      const savedSensor = buildSavedSensor(sensorHost, response, preferredLabel)

      startTransition(() => {
        rememberSensor(savedSensor)
        setMode('hardware')
        setStatus(response)
        setConnection({
          phase: 'checking',
          label: 'Sensor discovered',
          detail: response.paired
            ? 'Live stream and status should connect in a moment.'
            : 'Pair this sensor if you want to write configuration changes.',
        })
      })
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not inspect the sensor')
      setConnection({
        phase: 'error',
        label: 'Connection check failed',
        detail: error instanceof Error ? error.message : 'Could not inspect the sensor',
      })
    } finally {
      setChecking(false)
    }
  }

  const handlePair = async () => {
    if (!activeSensor) return

    setPairing(true)
    setFeedback(null)

    try {
      const pairResponse = await pairSensor(activeSensor.host, setupCode, label)
      const refreshedStatus = await fetchSensorStatus(activeSensor.host)
      const pairedSensor = buildSavedSensor(
        activeSensor.host,
        refreshedStatus,
        label,
        pairResponse.token,
      )

      startTransition(() => {
        rememberSensor(pairedSensor)
        setStatus(refreshedStatus)
        setConnection({
          phase: 'connected',
          label: 'Sensor paired',
          detail: 'Protected configuration endpoints are now unlocked on this browser.',
          lastSeenAt: new Date().toISOString(),
        })
      })
      setSetupCode('')
      setView('live')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Pairing failed')
    } finally {
      setPairing(false)
    }
  }

  const startDemo = () => {
    rememberSensor(getDemoSensor())
    setMode('demo')
    setView('live')
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Onboarding"
        title="A calm doorway dashboard for one sensor."
        description="Type an ESP32 hostname or IP, read the sensor status, pair if needed, and keep every count event local to this browser."
        action={
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={startDemo}>
              <Sparkles className="mr-2 size-4" />
              Start demo mode
            </SecondaryButton>
            {activeSensor ? (
              <PrimaryButton onClick={() => setView('live')}>
                Open live dashboard
                <ArrowRight className="ml-2 size-4" />
              </PrimaryButton>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.3fr_0.9fr]">
        <Panel className="overflow-hidden p-0">
          <div className="grid gap-0 md:grid-cols-[1.2fr_0.8fr]">
            <div className="p-6 md:p-8">
              <p className="eyebrow">Connect to hardware</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.05em] md:text-3xl">
                Local-first setup, no cloud handshake.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[color:var(--ink-soft)]">
                The sensor is the source of truth. This app only reads the firmware endpoints, opens
                the live WebSocket stream, and stores history inside IndexedDB on this device.
              </p>

              <div className="mt-6 grid gap-3">
                <label className="text-sm font-medium text-[color:var(--ink-soft)]">
                  Sensor host or IP
                  <input
                    value={host}
                    onChange={(event) => setHost(event.target.value)}
                    placeholder="tholus-sensor-AB12CD.local or 192.168.1.42"
                    className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-[15px] text-[color:var(--ink)] outline-none transition focus:border-emerald-300"
                  />
                </label>
                <label className="text-sm font-medium text-[color:var(--ink-soft)]">
                  Friendly label
                  <input
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder="Front Door"
                    className="mt-2 w-full rounded-2xl border border-[color:var(--line)] bg-white px-4 py-3 text-[15px] text-[color:var(--ink)] outline-none transition focus:border-emerald-300"
                  />
                </label>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <PrimaryButton disabled={!host || checking} onClick={() => void handleInspect(host)}>
                  <Wifi className="mr-2 size-4" />
                  {checking ? 'Checking sensor…' : 'Check sensor'}
                </PrimaryButton>
                <SecondaryButton disabled={!canPair} onClick={() => setView('calibration')}>
                  Open calibration
                </SecondaryButton>
              </div>

              {feedback ? (
                <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
                  {feedback}
                </div>
              ) : null}
            </div>

            <div className="border-t border-[color:var(--line)] bg-white/55 p-6 md:border-l md:border-t-0 md:p-8">
              <p className="eyebrow">What you get in v1</p>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[color:var(--ink-soft)]">
                <div className="rounded-2xl border border-[color:var(--line)] bg-white/80 p-4">
                  <p className="font-semibold text-[color:var(--ink)]">Live entrance activity</p>
                  <p className="mt-1">A responsive 8×8 doorway radar, track overlay, and current count flow.</p>
                </div>
                <div className="rounded-2xl border border-[color:var(--line)] bg-white/80 p-4">
                  <p className="font-semibold text-[color:var(--ink)]">Today analytics</p>
                  <p className="mt-1">Hourly traffic, occupancy estimate, peak hour, and a practical event timeline.</p>
                </div>
                <div className="rounded-2xl border border-[color:var(--line)] bg-white/80 p-4">
                  <p className="font-semibold text-[color:var(--ink)]">Simple maker calibration</p>
                  <p className="mt-1">Line direction, ROI columns, thresholds and quick reset to safe defaults.</p>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Current target</p>
                <h3 className="mt-3 text-xl font-semibold tracking-[-0.04em]">
                  {activeSensor?.label ?? 'No sensor selected'}
                </h3>
              </div>
              {connection.phase === 'connected' || connection.phase === 'demo' ? (
                <Chip tone="signal">ready</Chip>
              ) : null}
            </div>
            <p className="mono mt-3 text-xs text-[color:var(--ink-faint)]">
              {activeSensor?.host ?? 'Use a hostname or local IP'}
            </p>
            <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">{connection.detail}</p>

            {statusFacts.length > 0 ? (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {statusFacts.map(([key, value]) => (
                  <div key={key} className="rounded-2xl border border-[color:var(--line)] bg-white/80 p-3">
                    <p className="mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">{key}</p>
                    <p className="mt-2 text-base font-semibold">{value}</p>
                  </div>
                ))}
              </div>
            ) : null}

            {activeSensor && status?.paired === false ? (
              <div className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-500/10 p-4">
                <p className="text-sm font-semibold text-emerald-950">Pair to unlock config writes</p>
                <p className="mt-1 text-sm leading-6 text-emerald-900/80">
                  Live reading works already, but saving calibration values needs the setup code once.
                </p>
                <label className="mt-4 block text-sm font-medium text-emerald-950">
                  Setup code
                  <input
                    value={setupCode}
                    onChange={(event) => setSetupCode(event.target.value)}
                    placeholder="Usually the last MAC digits"
                    className="mt-2 w-full rounded-2xl border border-emerald-200 bg-white px-4 py-3 text-[15px] outline-none"
                  />
                </label>
                <PrimaryButton className="mt-4 w-full" disabled={!setupCode || pairing} onClick={() => void handlePair()}>
                  <CheckCircle2 className="mr-2 size-4" />
                  {pairing ? 'Pairing…' : 'Pair this browser'}
                </PrimaryButton>
              </div>
            ) : null}
          </Panel>

          <Panel>
            <div className="flex items-center justify-between">
              <p className="eyebrow">Recent sensors</p>
              <Chip>{recentSensors.length}</Chip>
            </div>
            <div className="mt-4 space-y-3">
              {recentSensors.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[color:var(--line-strong)] px-4 py-5 text-sm text-[color:var(--ink-soft)]">
                  Your recent sensors will appear here after the first successful check.
                </div>
              ) : (
                recentSensors.map((sensor) => (
                  <button
                    key={sensor.id}
                    type="button"
                    onClick={() => void handleInspect(sensor.host, sensor.label)}
                    className="flex w-full items-start justify-between rounded-2xl border border-[color:var(--line)] bg-white/80 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-emerald-200"
                  >
                    <div>
                      <p className="font-semibold">{sensor.label}</p>
                      <p className="mono mt-1 text-xs text-[color:var(--ink-faint)]">{sensor.host}</p>
                    </div>
                    <Cpu className="mt-1 size-4 text-[color:var(--ink-faint)]" />
                  </button>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
