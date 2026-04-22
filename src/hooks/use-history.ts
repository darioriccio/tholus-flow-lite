import { startTransition, useEffect, useState } from 'react'
import { listAllEvents, listAllSnapshots } from '../lib/history-db'
import type { CountEventRecord, StatusSnapshotRecord } from '../lib/types'

interface HistoryState {
  loading: boolean
  events: CountEventRecord[]
  snapshots: StatusSnapshotRecord[]
}

export function useHistoryData(revision: number): HistoryState {
  const [state, setState] = useState<HistoryState>({
    loading: true,
    events: [],
    snapshots: [],
  })

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [events, snapshots] = await Promise.all([
        listAllEvents(),
        listAllSnapshots(),
      ])

      if (cancelled) return

      startTransition(() => {
        setState({
          loading: false,
          events,
          snapshots,
        })
      })
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [revision])

  return state
}
