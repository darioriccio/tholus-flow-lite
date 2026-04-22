import { Activity, BarChart3, Clock3, TrendingUp } from 'lucide-react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatTime } from '../lib/date'
import { buildTrendPoints } from '../lib/metrics'
import { MetricCard, Panel, SectionHeader } from '../components/ui'
import type { CountEventRecord, DailySummary, HourlyBucket, SavedSensorConnection, SensorInsight } from '../lib/types'

export function TodayScreen({
  activeSensor,
  todaySummary,
  hourlyBuckets,
  lastSevenDays,
  timeline,
  insights,
  historyLoading,
}: {
  activeSensor: SavedSensorConnection | null
  todaySummary: DailySummary
  hourlyBuckets: HourlyBucket[]
  lastSevenDays: DailySummary[]
  timeline: CountEventRecord[]
  insights: SensorInsight[]
  historyLoading: boolean
}) {
  const trendPoints = buildTrendPoints(lastSevenDays)

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Today dashboard"
        title={activeSensor ? `${activeSensor.label}, translated into useful numbers.` : 'Today, once a sensor is connected.'}
        description="Small-venue analytics should stay honest: how many people crossed, when the rush happened, and what the current net occupancy estimate looks like."
      />

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="People in"
          value={todaySummary.inCount}
          detail={todaySummary.firstEventAt ? `First activity at ${formatTime(todaySummary.firstEventAt)}` : 'No activity yet today'}
          accent="signal"
        />
        <MetricCard
          label="People out"
          value={todaySummary.outCount}
          detail={todaySummary.lastEventAt ? `Last event at ${formatTime(todaySummary.lastEventAt)}` : 'No departures yet today'}
          accent="danger"
        />
        <MetricCard
          label="Net occupancy"
          value={todaySummary.occupancyEstimate}
          detail="Clamped at zero to avoid fake negative precision"
        />
        <MetricCard
          label="Peak hour"
          value={`${String(todaySummary.peakHour).padStart(2, '0')}:00`}
          detail={
            todaySummary.peakTraffic > 0
              ? `${todaySummary.peakTraffic} movements during the busiest hour`
              : 'No significant doorway rush yet'
          }
        />
      </div>

      <div className="grid gap-5 2xl:grid-cols-[1.18fr_0.82fr]">
        <Panel className="h-[420px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Hourly traffic</p>
              <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
                Entrance and exit counts by local hour. The occupancy line follows the net estimate.
              </p>
            </div>
            <BarChart3 className="size-5 text-[color:var(--ink-faint)]" />
          </div>
          <div className="mt-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,32,24,0.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#7f9187', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#7f9187', fontSize: 12 }} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 20,
                    border: '1px solid rgba(20,32,24,0.1)',
                    background: 'rgba(255,252,245,0.98)',
                  }}
                />
                <Bar dataKey="inCount" fill="#39d887" radius={[9, 9, 0, 0]} />
                <Bar dataKey="outCount" fill="#d48b71" radius={[9, 9, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel className="h-[420px]">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Last 7 days</p>
              <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
                A compact trend to keep the venue rhythm obvious at a glance.
              </p>
            </div>
            <TrendingUp className="size-5 text-[color:var(--ink-faint)]" />
          </div>
          <div className="mt-6 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendPoints}>
                <defs>
                  <linearGradient id="entriesGradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#39d887" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#39d887" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(20,32,24,0.08)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: '#7f9187', fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#7f9187', fontSize: 12 }} tickLine={false} axisLine={false} width={30} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 20,
                    border: '1px solid rgba(20,32,24,0.1)',
                    background: 'rgba(255,252,245,0.98)',
                  }}
                />
                <Area type="monotone" dataKey="entries" stroke="#1c7a54" strokeWidth={2} fill="url(#entriesGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <Panel>
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Practical insights</p>
              <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
                Small signals, not fake executive AI prose.
              </p>
            </div>
            <Activity className="size-5 text-[color:var(--ink-faint)]" />
          </div>
          <div className="mt-5 space-y-3">
            {insights.map((insight) => (
              <div key={insight.title} className="rounded-2xl border border-[color:var(--line)] bg-white/75 p-4">
                <p className="mono text-[11px] uppercase tracking-[0.2em] text-[color:var(--ink-faint)]">{insight.title}</p>
                <p className={`mt-2 text-xl font-semibold tracking-[-0.04em] ${insight.tone === 'signal' ? 'text-emerald-900' : ''}`}>
                  {insight.value}
                </p>
                <p className="mt-1 text-sm text-[color:var(--ink-soft)]">{insight.detail}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Timeline</p>
              <p className="mt-2 text-sm text-[color:var(--ink-soft)]">
                The raw count events still matter. Keep them visible.
              </p>
            </div>
            <Clock3 className="size-5 text-[color:var(--ink-faint)]" />
          </div>
          <div className="mt-5 space-y-3">
            {historyLoading ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--line-strong)] px-4 py-8 text-sm text-[color:var(--ink-soft)]">
                Loading local history…
              </div>
            ) : timeline.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[color:var(--line-strong)] px-4 py-8 text-sm text-[color:var(--ink-soft)]">
                No events yet for the active sensor.
              </div>
            ) : (
              timeline.slice(0, 12).map((event) => (
                <div
                  key={event.id}
                  className="flex items-center justify-between rounded-2xl border border-[color:var(--line)] bg-white/75 px-4 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {event.direction === 'in' ? 'Entrance' : 'Exit'} at {formatTime(event.timestamp)}
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
    </div>
  )
}
