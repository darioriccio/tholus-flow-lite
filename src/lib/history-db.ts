import { openDB } from 'idb'
import type { DBSchema, IDBPDatabase } from 'idb'
import type { CountEventRecord, HistoryBundle, StatusSnapshotRecord } from './types'

interface FlowLiteDB extends DBSchema {
  'count-events': {
    key: string
    value: CountEventRecord
    indexes: {
      'by-sensor': string
      'by-timestamp': string
    }
  }
  'status-snapshots': {
    key: string
    value: StatusSnapshotRecord
    indexes: {
      'by-sensor': string
      'by-timestamp': string
    }
  }
}

let dbPromise: Promise<IDBPDatabase<FlowLiteDB>> | null = null

function getDatabase() {
  if (!dbPromise) {
    dbPromise = openDB<FlowLiteDB>('tholus-flow-lite', 1, {
      upgrade(database) {
        const eventStore = database.createObjectStore('count-events', {
          keyPath: 'id',
        })
        eventStore.createIndex('by-sensor', 'sensorId')
        eventStore.createIndex('by-timestamp', 'timestamp')

        const snapshotStore = database.createObjectStore('status-snapshots', {
          keyPath: 'id',
        })
        snapshotStore.createIndex('by-sensor', 'sensorId')
        snapshotStore.createIndex('by-timestamp', 'timestamp')
      },
    })
  }

  return dbPromise
}

export async function saveCountEvent(event: CountEventRecord) {
  const database = await getDatabase()
  await database.put('count-events', event)
}

export async function saveStatusSnapshot(snapshot: StatusSnapshotRecord) {
  const database = await getDatabase()
  await database.put('status-snapshots', snapshot)
}

export async function listAllEvents(): Promise<CountEventRecord[]> {
  const database = await getDatabase()
  return database.getAll('count-events')
}

export async function listAllSnapshots(): Promise<StatusSnapshotRecord[]> {
  const database = await getDatabase()
  return database.getAll('status-snapshots')
}

export async function exportHistoryBundle(): Promise<HistoryBundle> {
  const [events, snapshots] = await Promise.all([listAllEvents(), listAllSnapshots()])
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    app: 'Tholus Flow Lite',
    events,
    snapshots,
  }
}

export async function importHistoryBundle(bundle: HistoryBundle) {
  const database = await getDatabase()
  const transaction = database.transaction(['count-events', 'status-snapshots'], 'readwrite')

  for (const event of bundle.events) {
    await transaction.objectStore('count-events').put(event)
  }

  for (const snapshot of bundle.snapshots) {
    await transaction.objectStore('status-snapshots').put(snapshot)
  }

  await transaction.done
}
