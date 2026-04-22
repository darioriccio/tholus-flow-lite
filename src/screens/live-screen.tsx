import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, RadioTower, ShieldCheck, Signal, Users } from 'lucide-react'
import { formatRelativeTime, formatTime } from '../lib/date'
import { Panel, MetricCard, SectionHeader } from '../components/ui'
import { SensorGrid } from '../components/sensor-grid'
import type { ConnectionState, CountEventRecord, DailySummary, SavedSensorConnection, SensorDiagnostic, SensorFrame, SensorTrack } from '../lib/types'

function ConfidenceMeter({ value }: { value: number }) {
  const percentage = Math.round(value * 100)

  return (
    <div className="rounded-[24px] border border-[color:var(--line)] bg-white/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="eyebrow">Confidence pulse</p>
          <p className="mt-2 text-2xl font-semibold tracking-[-0.05em]">{percentage}%</p>
        </div>
        <ShieldCheck className="size-6 text-emerald-700" />
      </div>
      <div className="mt-4 h-2 rounded-full bg-[color:var(--paper-muted)]">
        <div
          className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-700"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

function ActivityStrip({ data }: { data: number[] }) {
  const maxValue = Math.max(...data, 1)

  return (
    <div className="flex h-28 items-end gap-1.5">
      {data.map((value, index) => (
        <div
          key={`${index}-${value}`}
          className="flex-1 rounded-full bg-[color:var(--paper-muted)] transition"
          style={{
            height: `${Math.max(8, (value / maxValue) * 100)}%`,
            background:
              index > data.length - 6
                ? 'linear-gradient(180deg, rgba(57,216,135,0.38), rgba(28,122,84,0.92))'
                : 'linear-gradient(180deg, rgba(24,32,24,0.12), rgba(24,32,24,0.28))',
          }}
        />
      ))}
    </div>
  )
}

export function LiveScreen({
  activeSensor,
  connection,
  diagnostics,
  frame,
  tracks,
  lastCountEvent,
  todaySummary,
  timeline,
  activitySeries,
  confidencePulse,
}: {
  activeSensor: SavedSensorConnection | null
  connection: ConnectionState
  diagnostics: SensorDiagnostic | null
  frame: SensorFrame | null
  tracks: SensorTrack[]
  lastCountEvent: CountEventRecord | null
  todaySummary: DailySummary
  timeline: CountEventRecord[]
  activitySeries: number[]
  confidencePulse: number
}) {
  const rushScore = Math.min(
    100,
    activitySeries.slice(-6).reduce((sum, value) => sum + value, 0) * 6 + tracks.length * 18,
  )

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Live entrance view"
        title={activeSensor ? `${activeSensor.label} is alive.` : 'Start a sensor stream.'}
        description="Watch threshold crossings happen in real time, track the 8×8 doorway radar, and keep a grounded occupancy estimate based on the local event history."
        action={
          <div className="flex flex-wrap gap-2">
            <div className="rounded-full border border-[color:var(--line)] bg-white/75 px-4 py-2 text-sm text-[color:var(--ink-soft)]">
              {connection.label}
            </div>
            <div className="rounded-full border border-emerald-200 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-900">
              {lastCountEvent ? `last event ${formatRelativeTime(lastCountEvent.timestamp)}` : 'waiting for a crossing'}
            </div>
          </div>
        }
      />

      <div className="grid gap-5 2xl:grid-cols-[1.1fr_0.9fr]">
        <SensorGrid
          className="min-h-[480px]"
          countingLineRow={3}
          frame={frame}
          lastEvent={lastCountEvent}
          tracks={tracks}
        />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-2">
            <MetricCard
              label="People in today"
              value={
                <motion.span key={`in-${todaySummary.inCount}`} className="metric-reactive inline-block">
                  {todaySummary.inCount}
                </motion.span>
              }
              detail="Threshold crossings classified as entrances"
              accent="signal"
            />
            <MetricCard
              label="People out today"
              value={
                <motion.span key={`out-${todaySummary.outCount}`} className="metric-reactive inline-block">
                  {todaySummary.outCount}
                </motion.span>
              }
              detail="Outbound crossings detected so far"
              accent="danger"
            />
            <MetricCard
              label="Occupancy estimate"
              value={
                <motion.span key={`occ-${todaySummary.occupancyEstimate}`} className="metric-reactive inline-block">
                  {todaySummary.occupancyEstimate}
                </motion.span>
              }
              detail="Net estimate from local count history"
            />
            <MetricCard
              label="Doorway activity now"
              value={
                <span className="inline-flex items-end gap-2">
                  {frame?.occupancyEstimate ?? tracks.length}
                  <span className="mono text-base text-[color:var(--ink-faint)]">active blobs</span>
                </span>
              }
              detail="A live movement indicator, not the venue occupancy"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Panel>
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow">Rush meter</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.05em]">{rushScore}/100</p>
                </div>
                <Users className="size-5 text-emerald-700" />
              </div>
              <div className="mt-5 h-3 rounded-full bg-[color:var(--paper-muted)]">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-800"
                  style={{ width: `${rushScore}%` }}
                />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-[color:var(--ink-faint)]">
                <span>quiet</span>
                <span>steady</span>
                <span>busy</span>
                <span>packed</span>
              </div>
            </Panel>

            <ConfidenceMeter value={confidencePulse} />
          </div>

          <Panel>
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Activity in the last 45 minutes</p>
                <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
                  Each column is one minute of threshold crossings.
                </p>
              </div>
              <Signal className="size-5 text-[color:var(--ink-faint)]" />
            </div>
            <div className="mt-6">
              <ActivityStrip data={activitySeries} />
            </div>
          </Panel>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <Panel>
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Sensor health</p>
              <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
                Useful for spotting silent drops or upload backlogs.
              </p>
            </div>
            <RadioTower className="size-5 text-[color:var(--ink-faint)]" />
          </div>

          <div className="mt-5 grid gap-3">
            <div className="rounded-2xl border border-[color:var(--line)] bg-white/75 p-4">
              <p className="mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">connection</p>
              <p className="mt-2 text-lg font-semibold">{connection.phase}</p>
              <p className="mt-1 text-sm text-[color:var(--ink-soft)]">{connection.detail}</p>
            </div>
            <div className="rounded-2xl border border-[color:var(--line)] bg-white/75 p-4">
              <p className="mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">cloud queue</p>
              <p className="mt-2 text-lg font-semibold">{diagnostics?.cloudQueueDepth ?? 0}</p>
              <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                {diagnostics?.wifiConnected ? 'Wi-Fi connected' : 'No recent diagnostic frame'}
              </p>
            </div>
            <div className="rounded-2xl border border-[color:var(--line)] bg-white/75 p-4">
              <p className="mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">last event</p>
              <p className="mt-2 text-lg font-semibold">
                {lastCountEvent ? formatTime(lastCountEvent.timestamp) : 'No event yet'}
              </p>
              <p className="mt-1 text-sm text-[color:var(--ink-soft)]">
                {lastCountEvent
                  ? `${lastCountEvent.direction.toUpperCase()} · ${lastCountEvent.distanceMm} mm · conf ${lastCountEvent.confidence.toFixed(2)}`
                  : 'The doorway is currently quiet.'}
              </p>
            </div>
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Event stream</p>
              <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
                Latest threshold crossings, newest first.
              </p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {timeline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--line-strong)] px-4 py-8 text-sm text-[color:var(--ink-soft)]">
                No doorway events yet for today.
              </div>
            ) : (
              timeline.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-2xl border border-[color:var(--line)] bg-white/75 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid size-10 place-items-center rounded-full ${
                        event.direction === 'in'
                          ? 'bg-emerald-500/10 text-emerald-900'
                          : 'bg-orange-500/10 text-orange-900'
                      }`}
                    >
                      {event.direction === 'in' ? (
                        <ArrowDownRight className="size-4" />
                      ) : (
                        <ArrowUpRight className="size-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {event.direction === 'in' ? 'Entrance detected' : 'Exit detected'}
                      </p>
                      <p className="mono mt-1 text-xs text-[color:var(--ink-faint)]">
                        {formatTime(event.timestamp)} · {event.distanceMm} mm
                      </p>
                    </div>
                  </div>
                  <div className="mono text-xs text-[color:var(--ink-faint)]">
                    conf {event.confidence.toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  )
}
