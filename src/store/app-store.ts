import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppView, ConnectionMode, ConnectionState, CountEventRecord, SavedSensorConnection, SensorDiagnostic, SensorFrame, SensorRemoteConfig, SensorStatusResponse, SensorTrack } from '../lib/types'

interface AppStore {
  currentView: AppView
  activeSensorId: string | null
  recentSensors: SavedSensorConnection[]
  mode: ConnectionMode
  connection: ConnectionState
  status: SensorStatusResponse | null
  remoteConfig: SensorRemoteConfig | null
  liveFrame: SensorFrame | null
  liveTracks: SensorTrack[]
  diagnostics: SensorDiagnostic | null
  lastCountEvent: CountEventRecord | null
  historyRevision: number
  setView: (view: AppView) => void
  setMode: (mode: ConnectionMode) => void
  setConnection: (state: ConnectionState) => void
  rememberSensor: (sensor: SavedSensorConnection, makeActive?: boolean) => void
  setActiveSensor: (sensorId: string | null) => void
  setStatus: (status: SensorStatusResponse | null) => void
  setRemoteConfig: (config: SensorRemoteConfig | null) => void
  setLiveFrame: (frame: SensorFrame | null) => void
  setLiveTracks: (tracks: SensorTrack[]) => void
  setDiagnostics: (diagnostic: SensorDiagnostic | null) => void
  setLastCountEvent: (event: CountEventRecord | null) => void
  markHistoryDirty: () => void
  resetLiveState: () => void
}

const initialConnection: ConnectionState = {
  phase: 'idle',
  label: 'No sensor selected',
  detail: 'Enter a sensor hostname or IP to begin.',
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      currentView: 'connect',
      activeSensorId: null,
      recentSensors: [],
      mode: 'hardware',
      connection: initialConnection,
      status: null,
      remoteConfig: null,
      liveFrame: null,
      liveTracks: [],
      diagnostics: null,
      lastCountEvent: null,
      historyRevision: 0,
      setView: (view) => set({ currentView: view }),
      setMode: (mode) => set({ mode }),
      setConnection: (connection) => set({ connection }),
      rememberSensor: (sensor, makeActive = true) =>
        set((state) => {
          const withoutCurrent = state.recentSensors.filter(
            (existing) => existing.id !== sensor.id,
          )
          const nextRecentSensors = [
            {
              ...sensor,
              lastConnectedAt: new Date().toISOString(),
            },
            ...withoutCurrent,
          ].slice(0, 6)

          return {
            recentSensors: nextRecentSensors,
            activeSensorId: makeActive ? sensor.id : state.activeSensorId,
          }
        }),
      setActiveSensor: (sensorId) => set({ activeSensorId: sensorId }),
      setStatus: (status) => set({ status }),
      setRemoteConfig: (remoteConfig) => set({ remoteConfig }),
      setLiveFrame: (liveFrame) => set({ liveFrame }),
      setLiveTracks: (liveTracks) => set({ liveTracks }),
      setDiagnostics: (diagnostics) => set({ diagnostics }),
      setLastCountEvent: (lastCountEvent) => set({ lastCountEvent }),
      markHistoryDirty: () =>
        set((state) => ({ historyRevision: state.historyRevision + 1 })),
      resetLiveState: () =>
        set({
          liveFrame: null,
          liveTracks: [],
          diagnostics: null,
          lastCountEvent: null,
        }),
    }),
    {
      name: 'tholus-flow-lite-ui',
      partialize: (state) => ({
        currentView: state.currentView,
        activeSensorId: state.activeSensorId,
        recentSensors: state.recentSensors,
        mode: state.mode,
      }),
    },
  ),
)
