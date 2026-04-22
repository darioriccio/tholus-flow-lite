import { Suspense, lazy, useMemo } from 'react'
import { AppShell } from './components/app-shell'
import { Panel } from './components/ui'
import { buildDailySummary, buildHourlyBuckets, buildRecentActivitySeries, buildRecentDailySummaries, buildSensorInsights, buildTodayTimeline, computeConfidencePulse } from './lib/metrics'
import { toLocalDateKey } from './lib/date'
import { useHistoryData } from './hooks/use-history'
import { useConnectionController } from './hooks/use-connection-controller'
import { useAppStore } from './store/app-store'
import { ConnectScreen } from './screens/connect-screen'
import { LiveScreen } from './screens/live-screen'

const TodayScreen = lazy(() =>
  import('./screens/today-screen').then((module) => ({ default: module.TodayScreen })),
)
const CalibrationScreen = lazy(() =>
  import('./screens/calibration-screen').then((module) => ({
    default: module.CalibrationScreen,
  })),
)
const ExportScreen = lazy(() =>
  import('./screens/export-screen').then((module) => ({ default: module.ExportScreen })),
)

function App() {
  const currentView = useAppStore((state) => state.currentView)
  const recentSensors = useAppStore((state) => state.recentSensors)
  const activeSensorId = useAppStore((state) => state.activeSensorId)
  const mode = useAppStore((state) => state.mode)
  const connection = useAppStore((state) => state.connection)
  const status = useAppStore((state) => state.status)
  const remoteConfig = useAppStore((state) => state.remoteConfig)
  const liveFrame = useAppStore((state) => state.liveFrame)
  const liveTracks = useAppStore((state) => state.liveTracks)
  const diagnostics = useAppStore((state) => state.diagnostics)
  const lastCountEvent = useAppStore((state) => state.lastCountEvent)
  const historyRevision = useAppStore((state) => state.historyRevision)
  const setView = useAppStore((state) => state.setView)

  const activeSensor = useMemo(
    () => recentSensors.find((sensor) => sensor.id === activeSensorId) ?? null,
    [activeSensorId, recentSensors],
  )

  useConnectionController(activeSensor, mode)

  const history = useHistoryData(historyRevision)
  const activeSensorEvents = useMemo(() => {
    if (!activeSensor) return []
    return history.events.filter((event) => event.sensorId === activeSensor.id)
  }, [activeSensor, history.events])
  const activeSensorSnapshots = useMemo(() => {
    if (!activeSensor) return []
    return history.snapshots.filter((snapshot) => snapshot.sensorId === activeSensor.id)
  }, [activeSensor, history.snapshots])

  const todayKey = toLocalDateKey(new Date())
  const todaySummary = useMemo(
    () => buildDailySummary(activeSensorEvents, todayKey),
    [activeSensorEvents, todayKey],
  )
  const todayBuckets = useMemo(
    () => buildHourlyBuckets(activeSensorEvents, todayKey),
    [activeSensorEvents, todayKey],
  )
  const lastSevenDays = useMemo(
    () => buildRecentDailySummaries(activeSensorEvents, 7),
    [activeSensorEvents],
  )
  const insights = useMemo(
    () => buildSensorInsights(todaySummary, todayBuckets, lastSevenDays, status),
    [lastSevenDays, status, todayBuckets, todaySummary],
  )
  const timeline = useMemo(
    () => buildTodayTimeline(activeSensorEvents, todayKey),
    [activeSensorEvents, todayKey],
  )
  const activitySeries = useMemo(
    () => buildRecentActivitySeries(activeSensorEvents, 45),
    [activeSensorEvents],
  )
  const confidencePulse = useMemo(
    () => computeConfidencePulse(activeSensorEvents),
    [activeSensorEvents],
  )

  const content = (() => {
    switch (currentView) {
      case 'live':
        return (
          <LiveScreen
            activeSensor={activeSensor}
            connection={connection}
            diagnostics={diagnostics}
            frame={liveFrame}
            tracks={liveTracks}
            lastCountEvent={lastCountEvent}
            todaySummary={todaySummary}
            timeline={timeline}
            activitySeries={activitySeries}
            confidencePulse={confidencePulse}
          />
        )
      case 'today':
        return (
          <TodayScreen
            activeSensor={activeSensor}
            todaySummary={todaySummary}
            hourlyBuckets={todayBuckets}
            lastSevenDays={lastSevenDays}
            timeline={timeline}
            insights={insights}
            historyLoading={history.loading}
          />
        )
      case 'calibration':
        return (
          <CalibrationScreen
            activeSensor={activeSensor}
            connection={connection}
            frame={liveFrame}
            tracks={liveTracks}
            lastCountEvent={lastCountEvent}
            remoteConfig={remoteConfig}
            status={status}
          />
        )
      case 'export':
        return (
          <ExportScreen
            activeSensor={activeSensor}
            allEvents={history.events}
            allSnapshots={history.snapshots}
            sensorEvents={activeSensorEvents}
            todaySummary={todaySummary}
            lastSevenDays={lastSevenDays}
            historyLoading={history.loading}
          />
        )
      case 'connect':
      default:
        return (
          <ConnectScreen
            activeSensor={activeSensor}
            connection={connection}
            recentSensors={recentSensors}
            status={status}
          />
        )
    }
  })()

  return (
    <div className="min-h-screen bg-[var(--paper)] text-[var(--ink)]">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(56,216,135,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(31,74,56,0.12),transparent_30%),linear-gradient(180deg,#fbf7ee_0%,#f7f1e4_100%)]" />
        <div className="app-grid absolute inset-0 opacity-70" />
      </div>

      <AppShell
        activeSensor={activeSensor}
        canNavigate={Boolean(activeSensor)}
        connection={connection}
        currentView={currentView}
        onNavigate={setView}
        status={status}
        mode={mode}
        todaySummary={todaySummary}
        children={
          <Suspense
            fallback={
              <Panel className="grid min-h-[260px] place-items-center text-sm text-[color:var(--ink-soft)]">
                Loading view…
              </Panel>
            }
          >
            {content}
          </Suspense>
        }
      />

      {activeSensorSnapshots.length > 0 ? (
        <div className="sr-only">{activeSensorSnapshots.length} status snapshots stored locally.</div>
      ) : null}
    </div>
  )
}

export default App
