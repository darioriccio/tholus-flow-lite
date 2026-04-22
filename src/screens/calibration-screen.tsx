import { useMemo, useState } from 'react'
import { RefreshCw, Save, SlidersHorizontal } from 'lucide-react'
import { Panel, PrimaryButton, SecondaryButton, SectionHeader } from '../components/ui'
import { SensorGrid } from '../components/sensor-grid'
import { SAFE_REMOTE_CONFIG } from '../lib/types'
import { pushSensorConfig, restartSensor } from '../lib/sensor-api'
import { useAppStore } from '../store/app-store'
import type { ConnectionState, CountEventRecord, SavedSensorConnection, SensorFrame, SensorRemoteConfig, SensorStatusResponse, SensorTrack } from '../lib/types'

function SliderField({
  label,
  help,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string
  help: string
  min: number
  max: number
  step: number
  value: number
  onChange: (value: number) => void
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--line)] bg-white/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{label}</p>
          <p className="mt-1 text-sm text-[color:var(--ink-soft)]">{help}</p>
        </div>
        <span className="mono text-xs text-[color:var(--ink-faint)]">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-4 w-full accent-emerald-700"
      />
    </div>
  )
}

export function CalibrationScreen({
  activeSensor,
  connection,
  frame,
  tracks,
  lastCountEvent,
  remoteConfig,
  status,
}: {
  activeSensor: SavedSensorConnection | null
  connection: ConnectionState
  frame: SensorFrame | null
  tracks: SensorTrack[]
  lastCountEvent: CountEventRecord | null
  remoteConfig: SensorRemoteConfig | null
  status: SensorStatusResponse | null
}) {
  const initialDraft = useMemo(
    () => ({
      ...SAFE_REMOTE_CONFIG,
      ...remoteConfig,
    }),
    [remoteConfig],
  )
  const resetKey = activeSensor?.id ?? 'none'

  return (
    <CalibrationScreenBody
      key={resetKey}
      activeSensor={activeSensor}
      connection={connection}
      frame={frame}
      tracks={tracks}
      lastCountEvent={lastCountEvent}
      initialDraft={initialDraft}
      status={status}
    />
  )
}

function CalibrationScreenBody({
  activeSensor,
  connection,
  frame,
  tracks,
  lastCountEvent,
  initialDraft,
  status,
}: {
  activeSensor: SavedSensorConnection | null
  connection: ConnectionState
  frame: SensorFrame | null
  tracks: SensorTrack[]
  lastCountEvent: CountEventRecord | null
  initialDraft: typeof SAFE_REMOTE_CONFIG
  status: SensorStatusResponse | null
}) {
  const setRemoteConfig = useAppStore((state) => state.setRemoteConfig)
  const [draft, setDraft] = useState(initialDraft)
  const [saving, setSaving] = useState(false)
  const [restarting, setRestarting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  const hasWriteAccess = Boolean(activeSensor?.token)
  const roiMask = draft.roiMask ?? SAFE_REMOTE_CONFIG.roiMask

  const previewConfig = useMemo(
    () => ({
      countingLineRow: draft.countingLineRow ?? SAFE_REMOTE_CONFIG.countingLineRow,
      roiMask,
    }),
    [draft.countingLineRow, roiMask],
  )

  const saveDraft = async () => {
    if (!activeSensor || !hasWriteAccess) return

    setSaving(true)
    setFeedback(null)

    try {
      const response = await pushSensorConfig(activeSensor, draft)
      setRemoteConfig(response.applied ?? draft)
      setFeedback('Configuration saved to the sensor.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not save configuration.')
    } finally {
      setSaving(false)
    }
  }

  const rebootSensor = async () => {
    if (!activeSensor || !hasWriteAccess) return

    setRestarting(true)
    setFeedback(null)

    try {
      await restartSensor(activeSensor)
      setFeedback('Restart command sent. The sensor should reconnect in a few seconds.')
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not restart the sensor.')
    } finally {
      setRestarting(false)
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Calibration"
        title="Tweak only the controls that matter."
        description="The firmware already owns the tracking algorithm. This screen keeps the UI narrow: row, direction, ROI columns, thresholds and track limits."
        action={
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={() => setDraft(SAFE_REMOTE_CONFIG)}>Reset safe defaults</SecondaryButton>
            <PrimaryButton disabled={!hasWriteAccess || saving} onClick={() => void saveDraft()}>
              <Save className="mr-2 size-4" />
              {saving ? 'Saving…' : 'Save to sensor'}
            </PrimaryButton>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5">
          <SensorGrid
            className="min-h-[470px]"
            countingLineRow={previewConfig.countingLineRow}
            frame={frame}
            lastEvent={lastCountEvent}
            roiMask={previewConfig.roiMask}
            tracks={tracks}
          />
          <Panel>
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Write access</p>
                <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
                  {hasWriteAccess
                    ? 'This browser holds a pairing token, so calibration changes can be written back.'
                    : 'The sensor is readable, but protected writes need pairing from the Connect tab.'}
                </p>
              </div>
              <SlidersHorizontal className="size-5 text-[color:var(--ink-faint)]" />
            </div>
            {feedback ? (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950">
                {feedback}
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <SecondaryButton disabled={!hasWriteAccess || restarting} onClick={() => void rebootSensor()}>
                <RefreshCw className="mr-2 size-4" />
                {restarting ? 'Restarting…' : 'Restart sensor'}
              </SecondaryButton>
              <div className="rounded-full border border-[color:var(--line)] bg-white px-4 py-2 text-sm text-[color:var(--ink-soft)]">
                {connection.phase}
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <SliderField
              label="countingLineRow"
              help="Which row should count a crossing. Firmware supports 0 through 6."
              min={0}
              max={6}
              step={1}
              value={draft.countingLineRow ?? SAFE_REMOTE_CONFIG.countingLineRow}
              onChange={(value) => setDraft((current) => ({ ...current, countingLineRow: value }))}
            />
            <div className="rounded-2xl border border-[color:var(--line)] bg-white/70 p-4">
              <p className="font-medium">topToBottomIsIn</p>
              <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                Decide which movement direction should count as an entry.
              </p>
              <div className="mt-4 flex gap-2">
                {[
                  { value: true, label: 'top → bottom' },
                  { value: false, label: 'bottom → top' },
                ].map((option) => (
                  <button
                    key={String(option.value)}
                    type="button"
                    onClick={() => setDraft((current) => ({ ...current, topToBottomIsIn: option.value }))}
                    className={`rounded-full px-4 py-2 text-sm ${
                      (draft.topToBottomIsIn ?? SAFE_REMOTE_CONFIG.topToBottomIsIn) === option.value
                        ? 'bg-[color:var(--ink)] text-white'
                        : 'border border-[color:var(--line)] bg-white text-[color:var(--ink-soft)]'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <SliderField
            label="heightThreshold"
            help="Ignore returns farther than this many millimetres from the sensor. This is the firmware distance cutoff."
            min={500}
            max={2200}
            step={50}
            value={draft.heightThreshold ?? SAFE_REMOTE_CONFIG.heightThreshold}
            onChange={(value) => setDraft((current) => ({ ...current, heightThreshold: value }))}
          />

          <SliderField
            label="maxTracks"
            help="Maximum simultaneous tracks before the firmware starts dropping extras."
            min={1}
            max={4}
            step={1}
            value={draft.maxTracks ?? SAFE_REMOTE_CONFIG.maxTracks}
            onChange={(value) => setDraft((current) => ({ ...current, maxTracks: value }))}
          />

          <SliderField
            label="eventConfidenceMin"
            help="Reject count events whose confidence score sits below this threshold."
            min={0.4}
            max={0.99}
            step={0.01}
            value={Number((draft.eventConfidenceMin ?? SAFE_REMOTE_CONFIG.eventConfidenceMin).toFixed(2))}
            onChange={(value) => setDraft((current) => ({ ...current, eventConfidenceMin: value }))}
          />

          <Panel>
            <p className="eyebrow">roiMask columns</p>
            <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
              Disable columns blocked by walls, door frames, shelving or glass reflections.
            </p>
            <div className="mt-4 grid grid-cols-4 gap-3 md:grid-cols-8">
              {roiMask.map((enabled, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() =>
                    setDraft((current) => ({
                      ...current,
                      roiMask: roiMask.map((column, columnIndex) =>
                        columnIndex === index ? (column === 1 ? 0 : 1) : column,
                      ),
                    }))
                  }
                  className={`rounded-2xl px-3 py-4 text-sm font-medium ${
                    enabled === 1
                      ? 'border border-emerald-200 bg-emerald-500/10 text-emerald-950'
                      : 'border border-[color:var(--line)] bg-white text-[color:var(--ink-faint)]'
                  }`}
                >
                  C{index + 1}
                </button>
              ))}
            </div>
          </Panel>

          <Panel>
            <p className="eyebrow">Device note</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--ink-soft)]">
              Current firmware: {status?.fw_version ?? 'unknown'} · sensor model {status?.sensor?.model ?? 'VL53L8CH'} · default stream mode {draft.streamModeDefault ?? SAFE_REMOTE_CONFIG.streamModeDefault}
            </p>
          </Panel>
        </div>
      </div>
    </div>
  )
}
