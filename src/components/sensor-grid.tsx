import clsx from 'clsx'
import { motion } from 'framer-motion'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useMemo } from 'react'
import type { CountEventRecord, SensorFrame, SensorTrack } from '../lib/types'

function cellIntensity(distance: number) {
  if (!distance) return 0.04
  const normalized = 1 - Math.min(distance, 1900) / 1900
  return Math.max(0.15, normalized)
}

export function SensorGrid({
  frame,
  tracks,
  countingLineRow,
  roiMask,
  lastEvent,
  className,
}: {
  frame: SensorFrame | null
  tracks: SensorTrack[]
  countingLineRow: number
  roiMask?: number[]
  lastEvent?: CountEventRecord | null
  className?: string
}) {
  const matrix = useMemo(() => frame?.matrix ?? Array.from({ length: 64 }, () => 0), [frame])

  return (
    <div
      className={clsx(
        'panel-dark relative aspect-square overflow-hidden rounded-[32px] border border-white/10 p-6',
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(57,216,135,0.16),transparent_56%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />

      <div className="absolute left-6 right-6 top-6 flex items-center justify-between">
        <span className="eyebrow text-emerald-100/60">doorway radar</span>
        <span className="mono text-[11px] text-emerald-100/55">
          {frame?.sensorReady ? 'sensor ready' : 'awaiting first frame'}
        </span>
      </div>

      <div className="absolute inset-6 top-16">
        <div className="absolute inset-0 grid grid-cols-8 gap-2">
          {matrix.map((distance, index) => {
            const column = index % 8
            const enabled = roiMask?.[column] !== 0
            const intensity = enabled ? cellIntensity(distance) : 0.03
            return (
              <div
                key={`${index}-${distance}`}
                className="relative rounded-[12px] border border-white/5 transition duration-200"
                style={{
                  background: enabled
                    ? `linear-gradient(180deg, rgba(255,255,255,${0.06 + intensity * 0.12}), rgba(57,216,135,${intensity}))`
                    : 'rgba(255,255,255,0.03)',
                  boxShadow: enabled && distance
                    ? `0 0 ${14 + intensity * 18}px rgba(57,216,135,${intensity * 0.42})`
                    : 'none',
                  opacity: enabled ? 1 : 0.45,
                }}
              >
                {distance ? (
                  <span className="mono absolute bottom-2 left-2 text-[9px] text-emerald-50/80">
                    {distance}
                  </span>
                ) : null}
              </div>
            )
          })}
        </div>

        <div
          className="pointer-events-none absolute left-0 right-0 border-t border-dashed border-emerald-200/70"
          style={{
            top: `${((countingLineRow + 0.5) / 8) * 100}%`,
          }}
        />

        {tracks.map((track) => (
          <motion.div
            key={track.id}
            layout
            className="absolute grid size-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-emerald-100/70 bg-emerald-400/25 text-[10px] font-semibold text-emerald-50 shadow-[0_0_24px_rgba(57,216,135,0.25)]"
            style={{
              left: `${((track.col + 0.5) / 8) * 100}%`,
              top: `${((track.row + 0.5) / 8) * 100}%`,
            }}
          >
            {track.id}
          </motion.div>
        ))}

        {lastEvent ? (
          <motion.div
            key={lastEvent.id}
            initial={{ opacity: 0.95, scale: 0.88 }}
            animate={{ opacity: 0, scale: 1.22 }}
            transition={{ duration: 0.9, ease: 'easeOut' }}
            className="grid-pulse absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-200/40"
          />
        ) : null}
      </div>

      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
        <div className="flex items-center gap-3 text-sm text-emerald-50/82">
          {lastEvent ? (
            lastEvent.direction === 'in' ? (
              <ArrowDown className="size-4" />
            ) : (
              <ArrowUp className="size-4" />
            )
          ) : null}
          <span className="mono text-[11px] uppercase tracking-[0.2em]">
            {lastEvent ? `${lastEvent.direction} · conf ${lastEvent.confidence.toFixed(2)}` : 'waiting for crossings'}
          </span>
        </div>
        <div className="mono text-[11px] text-emerald-100/50">{tracks.length} live tracks</div>
      </div>
    </div>
  )
}
