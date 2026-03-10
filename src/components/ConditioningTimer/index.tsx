/**
 * MASS 2.7: Conditioning timers — AMRAP, EMOM, For Time, Tabata, Custom Interval, For Completion.
 * Uses conditioningConfig from program (timeCapSeconds, durationSeconds, intervalLengthSeconds, rounds, workSeconds, restSeconds).
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'

export type ConditioningFormat =
  | 'AMRAP'
  | 'EMOM'
  | 'For Time'
  | 'Tabata'
  | 'Custom Interval'
  | 'For Completion'
  | ''

export interface ConditioningConfig {
  timeCapSeconds?: number
  durationSeconds?: number
  intervalLengthSeconds?: number
  rounds?: number
  workSeconds?: number
  restSeconds?: number
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface ConditioningTimerProps {
  format: ConditioningFormat
  /** MASS 2.7: full config from block (timeCapSeconds, durationSeconds, intervalLengthSeconds, rounds, workSeconds, restSeconds) */
  config?: ConditioningConfig | null
  /** Legacy: countdown/interval duration when config not provided */
  durationSeconds?: number
  onComplete?: () => void
}

export function ConditioningTimer({
  format,
  config,
  durationSeconds,
  onComplete,
}: ConditioningTimerProps) {
  const [phase, setPhase] = useState<'idle' | 'running'>('idle')
  const [seconds, setSeconds] = useState(0)
  const [emomRound, setEmomRound] = useState(0)
  const [intervalPhase, setIntervalPhase] = useState<'work' | 'rest'>('work')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const customStateRef = useRef({ round: 0, isWork: true })
  const totalElapsedRef = useRef(0)

  const upper = (format as string).toUpperCase()

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    setPhase('idle')
    setSeconds(0)
    setEmomRound(0)
    setIntervalPhase('work')
    customStateRef.current = { round: 0, isWork: true }
    totalElapsedRef.current = 0
  }, [])

  const start = useCallback(() => {
    if (upper === 'FOR COMPLETION' || upper === '') return
    if (upper === 'AMRAP') {
      const cap = config?.timeCapSeconds ?? durationSeconds ?? 600
      setSeconds(cap)
    } else if (upper === 'FOR TIME') {
      setSeconds(0)
    } else if (upper === 'EMOM') {
      const intervalLen = config?.intervalLengthSeconds ?? 60
      setSeconds(intervalLen)
      setEmomRound(1)
      totalElapsedRef.current = 0
    } else if (upper === 'TABATA') {
      const rounds = config?.rounds ?? 8
      customStateRef.current = { round: 1, isWork: true }
      setSeconds(20)
      setIntervalPhase('work')
      setEmomRound(1)
      ;(
        customStateRef as React.MutableRefObject<{
          round: number
          isWork: boolean
          totalRounds?: number
        }>
      ).current.totalRounds = rounds
    } else if (upper === 'CUSTOM INTERVAL') {
      const work = config?.workSeconds ?? 30
      const rounds = config?.rounds ?? 5
      customStateRef.current = { round: 1, isWork: true }
      setSeconds(work)
      setIntervalPhase('work')
      setEmomRound(1)
      ;(
        customStateRef as React.MutableRefObject<{
          round: number
          isWork: boolean
          totalRounds?: number
          workSeconds?: number
          restSeconds?: number
        }>
      ).current.totalRounds = rounds
      ;(
        customStateRef as React.MutableRefObject<{
          round: number
          isWork: boolean
          totalRounds?: number
          workSeconds?: number
          restSeconds?: number
        }>
      ).current.workSeconds = work
      ;(
        customStateRef as React.MutableRefObject<{
          round: number
          isWork: boolean
          totalRounds?: number
          workSeconds?: number
          restSeconds?: number
        }>
      ).current.restSeconds = config?.restSeconds ?? 15
    } else {
      setSeconds(config?.timeCapSeconds ?? durationSeconds ?? 60)
    }
    setPhase('running')
  }, [config, durationSeconds, upper])

  useEffect(() => {
    if (phase !== 'running') return
    const c = config
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
        totalElapsedRef.current += 1
        setSeconds(prev => prev + 1)
      } else if (upper === 'EMOM') {
        const intervalLen = c?.intervalLengthSeconds ?? 60
        const totalDuration = c?.durationSeconds
        totalElapsedRef.current += 1
        if (totalDuration != null && totalElapsedRef.current >= totalDuration) {
          onComplete?.()
          return
        }
        setSeconds(prev => {
          if (prev <= 1) {
            setEmomRound(r => r + 1)
            return intervalLen
          }
          return prev - 1
        })
      } else if (upper === 'TABATA') {
        const totalRounds =
          (customStateRef as React.MutableRefObject<{ totalRounds?: number }>)
            .current.totalRounds ?? 8
        setSeconds(prev => {
          if (prev <= 1) {
            const { round, isWork } = customStateRef.current
            if (isWork) {
              customStateRef.current = {
                ...customStateRef.current,
                isWork: false,
              }
              setIntervalPhase('rest')
              return 10
            }
            if (round >= totalRounds) {
              onComplete?.()
              return 0
            }
            customStateRef.current = { round: round + 1, isWork: true }
            setEmomRound(round + 1)
            setIntervalPhase('work')
            return 20
          }
          return prev - 1
        })
      } else if (upper === 'CUSTOM INTERVAL') {
        const state = customStateRef as React.MutableRefObject<{
          round: number
          isWork: boolean
          totalRounds?: number
          workSeconds?: number
          restSeconds?: number
        }>
        const totalRounds = state.current.totalRounds ?? 5
        const workSec = state.current.workSeconds ?? 30
        const restSec = state.current.restSeconds ?? 15
        setSeconds(prev => {
          if (prev <= 1) {
            const { round, isWork } = state.current
            if (isWork) {
              state.current = { ...state.current, isWork: false }
              setIntervalPhase('rest')
              return restSec
            }
            if (round >= totalRounds) {
              onComplete?.()
              return 0
            }
            state.current = { round: round + 1, isWork: true }
            setEmomRound(round + 1)
            setIntervalPhase('work')
            return workSec
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
  }, [phase, format, config, upper, onComplete])

  if (upper === 'FOR COMPLETION' || upper === '') return null

  const timeCap =
    upper === 'FOR TIME' ? (config?.timeCapSeconds ?? undefined) : undefined
  const totalRounds =
    upper === 'TABATA'
      ? (config?.rounds ?? 8)
      : upper === 'CUSTOM INTERVAL'
        ? (config?.rounds ?? 5)
        : undefined

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <Text
        variant="default"
        className="font-semibold text-gray-800 mb-2 block"
      >
        {upper} Timer
      </Text>
      {phase === 'idle' ? (
        <div className="flex flex-wrap gap-2 items-center">
          <Button type="button" variant="primary" size="small" onClick={start}>
            Start {upper}
          </Button>
          {upper === 'AMRAP' && (
            <span className="text-sm text-gray-500">
              {config?.timeCapSeconds != null
                ? `Cap: ${formatTime(config.timeCapSeconds)}`
                : 'Cap: 10:00 (default)'}
            </span>
          )}
          {upper === 'FOR TIME' && timeCap != null && (
            <span className="text-sm text-gray-500">
              Cap: {formatTime(timeCap)}
            </span>
          )}
          {upper === 'TABATA' && totalRounds != null && (
            <span className="text-sm text-gray-500">
              {totalRounds} rounds (20s work / 10s rest)
            </span>
          )}
          {upper === 'CUSTOM INTERVAL' && (
            <span className="text-sm text-gray-500">
              {config?.rounds ?? 5} rounds · {config?.workSeconds ?? 30}s work /{' '}
              {config?.restSeconds ?? 15}s rest
            </span>
          )}
          {upper === 'EMOM' && (
            <span className="text-sm text-gray-500">
              Every {config?.intervalLengthSeconds ?? 60}s
              {config?.durationSeconds != null &&
                ` · Total ${formatTime(config.durationSeconds)}`}
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
          {(upper === 'TABATA' || upper === 'CUSTOM INTERVAL') &&
            totalRounds != null && (
              <span className="text-sm text-gray-600">
                Round {emomRound}/{totalRounds} · {intervalPhase}
              </span>
            )}
          {upper === 'FOR TIME' && timeCap != null && (
            <span className="text-sm text-gray-500">
              Cap: {formatTime(timeCap)}
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
