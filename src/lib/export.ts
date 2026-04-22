import { exportHistoryBundle } from './history-db'
import type { CountEventRecord, HistoryBundle } from './types'

function downloadText(filename: string, text: string, mimeType: string) {
  const blob = new Blob([text], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function exportEventsAsCsv(events: CountEventRecord[], filename = 'tholus-flow-lite-events.csv') {
  const header = [
    'event_id',
    'sensor_id',
    'sensor_label',
    'host',
    'source',
    'direction',
    'distance_mm',
    'confidence',
    'timestamp',
  ]
  const rows = events.map((event) =>
    [
      event.id,
      event.sensorId,
      event.sensorLabel,
      event.host,
      event.source,
      event.direction,
      event.distanceMm,
      event.confidence.toFixed(2),
      event.timestamp,
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(','),
  )

  downloadText(filename, [header.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8')
}

export async function exportLocalHistory(filename = 'tholus-flow-lite-history.json') {
  const bundle = await exportHistoryBundle()
  downloadText(filename, JSON.stringify(bundle, null, 2), 'application/json;charset=utf-8')
  return bundle
}

export async function parseHistoryFile(file: File): Promise<HistoryBundle> {
  const text = await file.text()
  return JSON.parse(text) as HistoryBundle
}
