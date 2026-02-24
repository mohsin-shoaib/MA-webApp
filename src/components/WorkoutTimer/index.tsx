/**
 * PRD 9.1.5: Timer (workout + rest).
 * Simple countdown timer with presets for workout and rest intervals.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'

const PRESETS = [
  { label: '1 min', seconds: 60 },
  { label: '2 min', seconds: 120 },
  { label: '3 min', seconds: 180 },
  { label: '5 min', seconds: 300 },
  { label: 'Rest 30s', seconds: 30 },
  { label: 'Rest 1 min', seconds: 60 },
]

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function WorkoutTimer() {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [running, setRunning] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setRunning(false)
    setSecondsLeft(null)
  }, [])

  useEffect(() => {
    if (!running) return
    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev == null || prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          intervalRef.current = null
          setRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  const start = (totalSeconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setSecondsLeft(totalSeconds)
    setRunning(true)
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <Text
        variant="default"
        className="font-semibold text-gray-800 mb-2 block"
      >
        Timer
      </Text>
      {secondsLeft != null && running ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl font-mono font-semibold text-[#3AB8ED] tabular-nums">
            {formatTime(secondsLeft)}
          </span>
          <Button type="button" variant="secondary" size="small" onClick={stop}>
            Stop
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(({ label, seconds }) => (
            <Button
              key={label}
              type="button"
              variant="outline"
              size="small"
              onClick={() => start(seconds)}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
