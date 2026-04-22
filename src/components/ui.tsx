import clsx from 'clsx'
import type { ReactNode } from 'react'
import type { ConnectionState } from '../lib/types'

export function Panel({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return <section className={clsx('panel p-5 md:p-6', className)}>{children}</section>
}

export function Chip({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: 'neutral' | 'signal' | 'danger'
  className?: string
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em]',
        'mono',
        tone === 'neutral' &&
          'border-[color:var(--line)] bg-white/65 text-[color:var(--ink-soft)]',
        tone === 'signal' &&
          'border-emerald-200 bg-emerald-500/10 text-emerald-900',
        tone === 'danger' &&
          'border-orange-200 bg-orange-500/10 text-orange-900',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function ConnectionBadge({ connection }: { connection: ConnectionState }) {
  const tone =
    connection.phase === 'connected' || connection.phase === 'demo'
      ? 'signal'
      : connection.phase === 'error'
        ? 'danger'
        : 'neutral'

  return (
    <Chip tone={tone}>
      <span
        className={clsx(
          'size-2 rounded-full',
          tone === 'signal' && 'bg-emerald-500 shadow-[0_0_0_6px_rgba(57,216,135,0.18)]',
          tone === 'danger' && 'bg-orange-500 shadow-[0_0_0_6px_rgba(204,107,79,0.16)]',
          tone === 'neutral' && 'bg-[color:var(--ink-faint)] shadow-[0_0_0_6px_rgba(127,145,135,0.12)]',
        )}
      />
      {connection.phase}
    </Chip>
  )
}

export function MetricCard({
  label,
  value,
  detail,
  accent,
  children,
}: {
  label: string
  value: ReactNode
  detail: string
  accent?: 'signal' | 'danger' | 'neutral'
  children?: ReactNode
}) {
  return (
    <Panel className="min-h-[156px]">
      <p className="eyebrow">{label}</p>
      <div
        className={clsx(
          'mt-4 text-[2.3rem] font-semibold leading-none tracking-[-0.06em] md:text-[3rem]',
          accent === 'signal' && 'text-emerald-900',
          accent === 'danger' && 'text-orange-900',
        )}
      >
        {value}
      </div>
      <p className="mt-3 text-sm text-[color:var(--ink-soft)]">{detail}</p>
      {children}
    </Panel>
  )
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.06em] md:text-[3.4rem]">
          {title}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-[color:var(--ink-soft)] md:text-base">
          {description}
        </p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

export function PrimaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-full border border-emerald-700 bg-emerald-700 px-4 py-2.5 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center rounded-full border border-[color:var(--line-strong)] bg-white/80 px-4 py-2.5 text-sm font-medium text-[color:var(--ink)] transition hover:-translate-y-0.5 hover:border-emerald-200 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
