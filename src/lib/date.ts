export function toLocalDateKey(input: Date | string): string {
  const date = typeof input === 'string' ? new Date(input) : input
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function startOfDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
}

export function formatTime(input?: string): string {
  if (!input) return 'No events yet'
  return new Intl.DateTimeFormat([], {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(input))
}

export function formatDateLabel(input: string): string {
  return new Intl.DateTimeFormat([], {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${input}T12:00:00`))
}

export function formatShortDay(input: string): string {
  return new Intl.DateTimeFormat([], {
    weekday: 'short',
  }).format(new Date(`${input}T12:00:00`))
}

export function formatRelativeTime(input?: string): string {
  if (!input) return 'Awaiting sensor traffic'

  const deltaMs = Date.now() - new Date(input).getTime()
  const deltaMinutes = Math.floor(deltaMs / 60000)
  if (deltaMinutes <= 0) return 'just now'
  if (deltaMinutes === 1) return '1 min ago'
  if (deltaMinutes < 60) return `${deltaMinutes} min ago`

  const deltaHours = Math.floor(deltaMinutes / 60)
  if (deltaHours === 1) return '1 hour ago'
  if (deltaHours < 24) return `${deltaHours} hours ago`

  return formatDateLabel(toLocalDateKey(input))
}

export function buildHourLabel(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

export function isToday(dateKey: string): boolean {
  return dateKey === toLocalDateKey(new Date())
}
