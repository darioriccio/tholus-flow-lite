import { startTransition, useDeferredValue, useRef, useState } from 'react'
import { ArchiveRestore, Download, FileJson2, FileSpreadsheet, Share2 } from 'lucide-react'
import { formatTime } from '../lib/date'
import { exportEventsAsCsv, exportLocalHistory, parseHistoryFile } from '../lib/export'
import { importHistoryBundle } from '../lib/history-db'
import { useAppStore } from '../store/app-store'
import { Panel, PrimaryButton, SecondaryButton, SectionHeader } from '../components/ui'
import type { CountEventRecord, DailySummary, SavedSensorConnection, StatusSnapshotRecord } from '../lib/types'

export function ExportScreen({
  activeSensor,
  allEvents,
  allSnapshots,
  sensorEvents,
  todaySummary,
  lastSevenDays,
  historyLoading,
}: {
  activeSensor: SavedSensorConnection | null
  allEvents: CountEventRecord[]
  allSnapshots: StatusSnapshotRecord[]
  sensorEvents: CountEventRecord[]
  todaySummary: DailySummary
  lastSevenDays: DailySummary[]
  historyLoading: boolean
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const markHistoryDirty = useAppStore((state) => state.markHistoryDirty)
  const deferredEvents = useDeferredValue(sensorEvents)
  const [feedback, setFeedback] = useState<string | null>(null)

  const importFile = async (file: File) => {
    try {
      const bundle = await parseHistoryFile(file)
      await importHistoryBundle(bundle)
      markHistoryDirty()
      startTransition(() => {
        setFeedback(`Imported ${bundle.events.length} events and ${bundle.snapshots.length} snapshots.`)
      })
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Could not import history file.')
    }
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Export and share"
        title="Keep the data easy to leave with."
        description="CSV for spreadsheets, JSON for portable local backups, and a simple daily summary card that already looks presentable."
        action={
          <div className="flex flex-wrap gap-2">
            <PrimaryButton disabled={sensorEvents.length === 0} onClick={() => exportEventsAsCsv(sensorEvents)}>
              <FileSpreadsheet className="mr-2 size-4" />
              Export CSV
            </PrimaryButton>
            <SecondaryButton onClick={() => void exportLocalHistory()}>
              <FileJson2 className="mr-2 size-4" />
              Export JSON
            </SecondaryButton>
            <SecondaryButton onClick={() => fileInputRef.current?.click()}>
              <ArchiveRestore className="mr-2 size-4" />
              Import JSON
            </SecondaryButton>
            <input
              ref={fileInputRef}
              hidden
              type="file"
              accept="application/json"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) {
                  void importFile(file)
                }
                event.target.value = ''
              }}
            />
          </div>
        }
      />

      {feedback ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-950">
          {feedback}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.02fr_0.98fr]">
        <Panel className="overflow-hidden p-0">
          <div className="panel-dark p-8">
            <p className="eyebrow text-emerald-100/60">Daily summary card</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.06em] text-white">
              {activeSensor?.label ?? 'Active doorway'}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/75">
              One clean card you can screenshot, share internally, or drop into a lightweight operations report.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                ['people in', String(todaySummary.inCount)],
                ['people out', String(todaySummary.outCount)],
                ['occupancy est.', String(todaySummary.occupancyEstimate)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                  <p className="mono text-[11px] uppercase tracking-[0.18em] text-emerald-100/55">{label}</p>
                  <p className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[26px] border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mono text-[11px] uppercase tracking-[0.18em] text-emerald-100/55">peak hour</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">
                    {String(todaySummary.peakHour).padStart(2, '0')}:00
                  </p>
                </div>
                <Share2 className="size-5 text-emerald-100/60" />
              </div>
              <p className="mt-3 text-sm text-emerald-50/75">
                {todaySummary.peakTraffic > 0
                  ? `${todaySummary.peakTraffic} movements during the busiest window today.`
                  : 'No major rush captured yet today.'}
              </p>
            </div>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Portable local history</p>
                <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
                  Events live in IndexedDB. JSON export captures the whole local archive.
                </p>
              </div>
              <Download className="size-5 text-[color:var(--ink-faint)]" />
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-[color:var(--line)] bg-white/75 p-4">
                <p className="mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">active sensor events</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em]">{sensorEvents.length}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--line)] bg-white/75 p-4">
                <p className="mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">all local events</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em]">{allEvents.length}</p>
              </div>
              <div className="rounded-2xl border border-[color:var(--line)] bg-white/75 p-4">
                <p className="mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--ink-faint)]">status snapshots</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em]">{allSnapshots.length}</p>
              </div>
            </div>
          </Panel>

          <Panel>
            <p className="eyebrow">Last 7 days summary</p>
            <div className="mt-4 space-y-3">
              {lastSevenDays.map((day) => (
                <div key={day.dateKey} className="flex items-center justify-between rounded-2xl border border-[color:var(--line)] bg-white/75 px-4 py-3">
                  <div>
                    <p className="font-medium">{day.label}</p>
                    <p className="mono mt-1 text-xs text-[color:var(--ink-faint)]">
                      {day.inCount} in · {day.outCount} out
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold tracking-[-0.05em]">{day.occupancyEstimate}</p>
                    <p className="mono text-xs text-[color:var(--ink-faint)]">net est.</p>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel>
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow">Recent events for export QA</p>
            <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
              Quick sanity check before you hand off the CSV.
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {historyLoading ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--line-strong)] px-4 py-8 text-sm text-[color:var(--ink-soft)]">
              Loading local history…
            </div>
          ) : deferredEvents.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[color:var(--line-strong)] px-4 py-8 text-sm text-[color:var(--ink-soft)]">
              No events available for export yet.
            </div>
          ) : (
            deferredEvents.slice(-12).reverse().map((event) => (
              <div key={event.id} className="flex items-center justify-between rounded-2xl border border-[color:var(--line)] bg-white/75 px-4 py-3">
                <div>
                  <p className="font-medium">
                    {event.direction.toUpperCase()} · {formatTime(event.timestamp)}
                  </p>
                  <p className="mono mt-1 text-xs text-[color:var(--ink-faint)]">
                    {event.distanceMm} mm · {event.source}
                  </p>
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
  )
}
