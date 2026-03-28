import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface TimerState {
  isRunning: boolean
  startTime: number | null
  accumulatedSeconds: number
  description: string
  projectId: string | null
  
  start: () => void
  pause: () => void
  reset: () => void
  setDescription: (desc: string) => void
  setProject: (id: string | null) => void
  
  getComputedSeconds: () => number
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      isRunning: false,
      startTime: null,
      accumulatedSeconds: 0,
      description: '',
      projectId: null,

      start: () => {
        if (!get().isRunning) {
          set({ isRunning: true, startTime: Date.now() })
        }
      },

      pause: () => {
        if (get().isRunning) {
          const now = Date.now()
          const start = get().startTime || now
          const diffSeconds = Math.floor((now - start) / 1000)
          
          set({
            isRunning: false,
            startTime: null,
            accumulatedSeconds: get().accumulatedSeconds + diffSeconds,
          })
        }
      },

      reset: () => {
        set({
          isRunning: false,
          startTime: null,
          accumulatedSeconds: 0,
          description: '',
          projectId: null,
        })
      },

      setDescription: (desc) => set({ description: desc }),
      setProject: (id) => set({ projectId: id }),

      getComputedSeconds: () => {
        const { isRunning, startTime, accumulatedSeconds } = get()
        if (!isRunning || !startTime) return accumulatedSeconds
        
        const diffSeconds = Math.floor((Date.now() - startTime) / 1000)
        return accumulatedSeconds + diffSeconds
      }
    }),
    {
      name: 'xenon-team-timer',
    }
  )
)
