import { Activity, Compass, Download, Radar, SlidersHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatRelativeTime } from '../lib/date'
import type { AppView, ConnectionMode, ConnectionState, DailySummary, SavedSensorConnection, SensorStatusResponse } from '../lib/types'
import { BrandMark } from './brand-mark'
import { ConnectionBadge } from './ui'

const NAV_ITEMS: Array<{ id: AppView; label: string; icon: typeof Compass }> = [
  { id: 'connect', label: 'Connect', icon: Compass },
  { id: 'live', label: 'Live', icon: Radar },
  { id: 'today', label: 'Today', icon: Activity },
  { id: 'calibration', label: 'Calibration', icon: SlidersHorizontal },
  { id: 'export', label: 'Export', icon: Download },
]

export function AppShell({
  activeSensor,
  canNavigate,
  connection,
  currentView,
  onNavigate,
  status,
  mode,
  todaySummary,
  children,
}: {
  activeSensor: SavedSensorConnection | null
  canNavigate: boolean
  connection: ConnectionState
  currentView: AppView
  onNavigate: (view: AppView) => void
  status: SensorStatusResponse | null
  mode: ConnectionMode
  todaySummary: DailySummary
  children: ReactNode
}) {
  return (
    <div className="relative z-10 min-h-screen px-4 py-4 md:px-6 md:py-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-[1520px] gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="panel flex flex-col gap-5 p-4 md:p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Tholus Flow</p>
              <div className="mt-2 flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-2xl border border-emerald-200 bg-emerald-500/10 text-[color:var(--ink)]">
                  <BrandMark className="size-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold tracking-[-0.04em]">Tholus Flow Lite</p>
                  <p className="mono text-xs text-[color:var(--ink-faint)]">one doorway, local-first</p>
                </div>
              </div>
            </div>
            {mode === 'demo' ? (
              <span className="rounded-full border border-white/70 bg-white/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-emerald-800">
                demo
              </span>
            ) : null}
          </div>

          <div className="rounded-[26px] border border-[color:var(--line)] bg-white/70 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="eyebrow">Connection</p>
                <p className="mt-2 text-base font-semibold tracking-[-0.03em]">
                  {activeSensor?.label ?? 'Pick a sensor'}
                </p>
                <p className="mono mt-1 text-xs text-[color:var(--ink-faint)]">
                  {activeSensor?.host ?? 'Enter IP or .local hostname'}
                </p>
              </div>
              <ConnectionBadge connection={connection} />
            </div>
            <p className="mt-3 text-sm leading-6 text-[color:var(--ink-soft)]">
              {connection.detail ?? connection.label}
            </p>
            {connection.lastSeenAt ? (
              <p className="mono mt-2 text-xs text-[color:var(--ink-faint)]">
                last packet {formatRelativeTime(connection.lastSeenAt)}
              </p>
            ) : null}
          </div>

          <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const disabled = !canNavigate && item.id !== 'connect'
              const active = currentView === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => onNavigate(item.id)}
                  className={`group inline-flex min-w-fit items-center gap-3 rounded-full px-4 py-3 text-left text-sm transition lg:rounded-2xl ${
                    active
                      ? 'bg-[color:var(--ink)] text-white'
                      : 'bg-white/70 text-[color:var(--ink-soft)] hover:bg-white'
                  } ${disabled ? 'cursor-not-allowed opacity-45' : ''}`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="mt-auto space-y-4">
            <div className="panel-dark rounded-[30px] p-5">
              <p className="eyebrow text-emerald-100/60">Today at a glance</p>
              <div className="mt-4 grid gap-3">
                <div>
                  <p className="mono text-xs uppercase tracking-[0.18em] text-emerald-100/50">People in</p>
                  <p className="mt-2 text-4xl font-semibold tracking-[-0.06em]">{todaySummary.inCount}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="mono text-[11px] uppercase tracking-[0.18em] text-emerald-100/55">Out</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.05em]">{todaySummary.outCount}</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="mono text-[11px] uppercase tracking-[0.18em] text-emerald-100/55">Occ.</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.05em]">{todaySummary.occupancyEstimate}</p>
                  </div>
                </div>
                <p className="text-sm text-emerald-50/75">
                  {status?.sensor?.ready
                    ? `Firmware ${status.fw_version ?? 'unknown'} · queue ${status.cloud?.queue_depth ?? 0}`
                    : 'Sensor not ready yet. Check wiring or power before trusting live counts.'}
                </p>
              </div>
            </div>

            <div className="rounded-[26px] border border-[color:var(--line)] bg-white/55 px-4 py-3">
              <p className="mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">
                beta 0.1
              </p>
              <p className="mt-2 text-sm text-[color:var(--ink-soft)]">esp32 · vl53l8ch · local history</p>
              <p className="mt-1 text-xs text-[color:var(--ink-faint)]">
                designed from the Tholus Flow visual system
              </p>
            </div>
          </div>
        </aside>

        <main className="panel flex min-h-[calc(100vh-2rem)] flex-col overflow-hidden">
          <header className="border-b border-[color:var(--line)] px-5 py-4 md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="eyebrow">
                  {activeSensor ? 'Single-sensor analytics' : 'Open-source entrance analytics'}
                </p>
                <p className="mt-2 text-lg font-semibold tracking-[-0.04em] md:text-xl">
                  {activeSensor
                    ? `${activeSensor.label} · ${activeSensor.host}`
                    : 'Connect once, keep history locally, export when you need it.'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {status?.sensor?.resolution ? (
                  <span className="rounded-full border border-[color:var(--line)] px-3 py-1 text-xs text-[color:var(--ink-soft)]">
                    {status.sensor.model} · {status.sensor.resolution}
                  </span>
                ) : null}
                {status?.ws?.json_v2 ? (
                  <span className="rounded-full border border-emerald-200 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-900">
                    json_v2 live stream
                  </span>
                ) : null}
                <ConnectionBadge connection={connection} />
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto px-5 py-6 md:px-8 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
