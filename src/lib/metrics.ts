import { buildHourLabel, formatDateLabel, formatShortDay, toLocalDateKey } from './date'
import type { CountEventRecord, DailySummary, HourlyBucket, SensorInsight, SensorStatusResponse } from './types'

function sortEvents(events: CountEventRecord[]): CountEventRecord[] {
  return [...events].sort(
    (left, right) =>
      new Date(left.timestamp).getTime() - new Date(right.timestamp).getTime(),
  )
}

function calculateOccupancySeries(events: CountEventRecord[]): { occupancy: number; peak: number } {
  let occupancy = 0
  let peak = 0

  for (const event of sortEvents(events)) {
    occupancy += event.direction === 'in' ? 1 : -1
    occupancy = Math.max(0, occupancy)
    peak = Math.max(peak, occupancy)
  }

  return { occupancy, peak }
}

export function buildHourlyBuckets(events: CountEventRecord[], dayKey: string): HourlyBucket[] {
  const dayEvents = sortEvents(events.filter((event) => toLocalDateKey(event.timestamp) === dayKey))
  const buckets = Array.from({ length: 24 }, (_, hour): HourlyBucket => ({
    hour,
    label: buildHourLabel(hour),
    inCount: 0,
    outCount: 0,
    netChange: 0,
    occupancyEstimate: 0,
    traffic: 0,
  }))

  let occupancy = 0
  for (const event of dayEvents) {
    const hour = new Date(event.timestamp).getHours()
    const bucket = buckets[hour]
    if (event.direction === 'in') bucket.inCount += 1
    if (event.direction === 'out') bucket.outCount += 1
    bucket.netChange = bucket.inCount - bucket.outCount
    bucket.traffic = bucket.inCount + bucket.outCount

    occupancy += event.direction === 'in' ? 1 : -1
    occupancy = Math.max(0, occupancy)
    bucket.occupancyEstimate = occupancy
  }

  let rollingOccupancy = 0
  return buckets.map((bucket) => {
    if (bucket.traffic > 0) rollingOccupancy = bucket.occupancyEstimate
    return {
      ...bucket,
      occupancyEstimate: rollingOccupancy,
    }
  })
}

export function buildDailySummary(events: CountEventRecord[], dayKey: string): DailySummary {
  const dayEvents = sortEvents(events.filter((event) => toLocalDateKey(event.timestamp) === dayKey))
  const inCount = dayEvents.filter((event) => event.direction === 'in').length
  const outCount = dayEvents.filter((event) => event.direction === 'out').length
  const buckets = buildHourlyBuckets(dayEvents, dayKey)
  const peakBucket = buckets.reduce((best, bucket) => {
    if (bucket.traffic > best.traffic) return bucket
    return best
  }, buckets[0])
  const occupancy = calculateOccupancySeries(dayEvents)

  return {
    dateKey: dayKey,
    label: formatDateLabel(dayKey),
    inCount,
    outCount,
    occupancyEstimate: occupancy.occupancy,
    peakHour: peakBucket.hour,
    peakTraffic: peakBucket.traffic,
    peakOccupancyEstimate: occupancy.peak,
    firstEventAt: dayEvents[0]?.timestamp,
    lastEventAt: dayEvents[dayEvents.length - 1]?.timestamp,
  }
}

export function buildRecentDailySummaries(events: CountEventRecord[], days: number): DailySummary[] {
  const keys = Array.from({ length: days }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (days - index - 1))
    return toLocalDateKey(date)
  })

  return keys.map((key) => buildDailySummary(events, key))
}

export function buildTodayTimeline(events: CountEventRecord[], dayKey: string): CountEventRecord[] {
  return sortEvents(events.filter((event) => toLocalDateKey(event.timestamp) === dayKey)).reverse()
}

export function buildRecentActivitySeries(events: CountEventRecord[], segments: number): number[] {
  const now = Date.now()
  const sliceMs = 60000

  return Array.from({ length: segments }, (_, index) => {
    const start = now - sliceMs * (segments - index)
    const end = start + sliceMs
    return events.filter((event) => {
      const eventTime = new Date(event.timestamp).getTime()
      return eventTime >= start && eventTime < end
    }).length
  })
}

export function computeConfidencePulse(events: CountEventRecord[]): number {
  const latest = sortEvents(events).slice(-12)
  if (latest.length === 0) return 0.76
  const average =
    latest.reduce((sum, event) => sum + event.confidence, 0) / latest.length
  return Number(average.toFixed(2))
}

export function buildSensorInsights(
  todaySummary: DailySummary,
  hourlyBuckets: HourlyBucket[],
  lastSevenDays: DailySummary[],
  status?: SensorStatusResponse | null,
): SensorInsight[] {
  const todayTraffic = todaySummary.inCount + todaySummary.outCount
  const sevenDayAverage =
    lastSevenDays.reduce((sum, day) => sum + day.inCount, 0) /
      Math.max(lastSevenDays.length, 1) || 0
  const busiestHour = hourlyBuckets.reduce((best, bucket) => {
    if (bucket.traffic > best.traffic) return bucket
    return best
  }, hourlyBuckets[0])
  const difference = Math.round(todaySummary.inCount - sevenDayAverage)

  return [
    {
      title: 'Peak window',
      value: busiestHour.traffic > 0 ? busiestHour.label : 'Quiet day',
      detail:
        busiestHour.traffic > 0
          ? `${busiestHour.traffic} movements around the doorway`
          : 'No threshold crossings recorded today',
      tone: 'signal',
    },
    {
      title: 'Against the weekly baseline',
      value: `${difference >= 0 ? '+' : ''}${difference}`,
      detail: `${Math.round(sevenDayAverage)} average entries across the last 7 days`,
    },
    {
      title: 'Sensor health',
      value: status?.sensor?.ready ? 'Ready' : 'Check sensor',
      detail:
        status?.sensor?.ready && status?.wifi_connected
          ? `Wi-Fi connected · firmware ${status.fw_version ?? 'unknown'}`
          : 'Review wiring, Wi-Fi or pairing before relying on counts',
      tone: status?.sensor?.ready ? 'signal' : 'neutral',
    },
    {
      title: 'Doorway balance',
      value: `${todayTraffic}`,
      detail: `${todaySummary.inCount} in · ${todaySummary.outCount} out · occupancy est. ${todaySummary.occupancyEstimate}`,
    },
  ]
}

export function buildTrendPoints(summaries: DailySummary[]) {
  return summaries.map((summary) => ({
    label: formatShortDay(summary.dateKey),
    entries: summary.inCount,
    exits: summary.outCount,
    occupancy: summary.occupancyEstimate,
    dateKey: summary.dateKey,
  }))
}
