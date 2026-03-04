/**
 * MASS Phase 7: Conditioning timers — AMRAP (countdown), EMOM (repeating), For Time (stopwatch), Tabata.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'

export type ConditioningFormat =
  | 'AMRAP'
  | 'EMOM'
  | 'For Time'
  | 'Tabata'
  | string

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface ConditioningTimerProps {
  format: ConditioningFormat
  /** Countdown duration in seconds (AMRAP default 600, Tabata work 20) */
  durationSeconds?: number
  onComplete?: () => void
}

export function ConditioningTimer({
  format,
  durationSeconds,
  onComplete,
}: ConditioningTimerProps) {
  const [phase, setPhase] = useState<'idle' | 'running'>('idle')
  const [seconds, setSeconds] = useState(0)
  const [emomRound, setEmomRound] = useState(0)
  const [tabataRound, setTabataRound] = useState(0)
  const [tabataPhase, setTabataPhase] = useState<'work' | 'rest'>('work')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tabataStateRef = useRef({ round: 0, isWork: true })

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setPhase('idle')
    setSeconds(0)
    setEmomRound(0)
    setTabataRound(0)
    setTabataPhase('work')
  }, [])

  const start = useCallback(() => {
    const upper = (format as string).toUpperCase()
    if (upper === 'AMRAP') {
      setSeconds(durationSeconds ?? 600)
    } else if (upper === 'FOR TIME') {
      setSeconds(0)
    } else if (upper === 'EMOM') {
      setSeconds(60)
      setEmomRound(1)
    } else if (upper === 'TABATA') {
      setSeconds(20)
      setTabataRound(1)
      setTabataPhase('work')
      tabataStateRef.current = { round: 1, isWork: true }
    } else {
      setSeconds(durationSeconds ?? 60)
    }
    setPhase('running')
  }, [format, durationSeconds])

  useEffect(() => {
    if (phase !== 'running') return
    const upper = (format as string).toUpperCase()
    intervalRef.current = setInterval(() => {
      if (upper === 'AMRAP') {
        setSeconds(prev => {
          if (prev <= 1) {
            onComplete?.()
            return 0
          }
          return prev - 1
        })
      } else if (upper === 'FOR TIME') {
        setSeconds(prev => prev + 1)
      } else if (upper === 'EMOM') {
        setSeconds(prev => {
          if (prev <= 1) {
            setEmomRound(r => r + 1)
            return 60
          }
          return prev - 1
        })
      } else if (upper === 'TABATA') {
        setSeconds(prev => {
          if (prev <= 1) {
            const { round, isWork } = tabataStateRef.current
            if (isWork) {
              tabataStateRef.current = { round, isWork: false }
              setTabataPhase('rest')
              return 10
            }
            if (round >= 8) {
              onComplete?.()
              return 0
            }
            tabataStateRef.current = { round: round + 1, isWork: true }
            setTabataRound(round + 1)
            setTabataPhase('work')
            return 20
          }
          return prev - 1
        })
      } else {
        setSeconds(prev => (prev <= 1 ? 0 : prev - 1))
      }
    }, 1000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [phase, format, onComplete])

  const upper = (format as string).toUpperCase()

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <Text
        variant="default"
        className="font-semibold text-gray-800 mb-2 block"
      >
        {upper} Timer
      </Text>
      {phase === 'idle' ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="primary" size="small" onClick={start}>
            Start {upper}
          </Button>
          {upper === 'AMRAP' && (
            <span className="text-sm text-gray-500 self-center">
              Default 10 min
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-2xl font-mono font-semibold text-[#3AB8ED] tabular-nums">
            {formatTime(seconds)}
          </span>
          {upper === 'EMOM' && (
            <span className="text-sm text-gray-600">Round {emomRound}</span>
          )}
          {upper === 'TABATA' && (
            <span className="text-sm text-gray-600">
              Round {tabataRound}/8 · {tabataPhase}
            </span>
          )}
          <Button type="button" variant="secondary" size="small" onClick={stop}>
            Stop
          </Button>
        </div>
      )}
    </div>
  )
}
