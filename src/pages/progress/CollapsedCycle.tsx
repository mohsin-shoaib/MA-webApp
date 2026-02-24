import { roadmapService } from '@/api/roadmap.service'
import { Accordion } from '@/components/Accordion'
import { Card } from '@/components/Card'
import { Text } from '@/components/Text'
import type {
  Roadmap,
  RoadmapDayExercise,
  RoadmapExerciseItem,
} from '@/types/roadmap'
import { useEffect, useState } from 'react'

const CYCLE_COLORS: Record<string, string> = {
  Red: 'bg-red-100 text-red-800 border-red-200',
  Amber: 'bg-amber-100 text-amber-800 border-amber-200',
  Green: 'bg-green-100 text-green-800 border-green-200',
  Sustainment: 'bg-slate-100 text-slate-800 border-slate-200',
  C1: 'bg-red-100 text-red-800 border-red-200',
  C2: 'bg-amber-100 text-amber-800 border-amber-200',
  C3: 'bg-green-100 text-green-800 border-green-200',
  C4: 'bg-slate-100 text-slate-800 border-slate-200',
}

function cycleBadgeClass(name: string): string {
  return CYCLE_COLORS[name] ?? 'bg-gray-100 text-gray-800 border-gray-200'
}

export default function CollapsedRoadmap() {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  // const [fetched, setFetched] = useState(false)

  function safeStr(value: unknown): string {
    if (value == null) return ''
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
    return String(value)
  }
  function renderDayContent(day: RoadmapDayExercise) {
    const exercises = Array.isArray(day.exercises) ? day.exercises : []
    const dayLabel = safeStr(
      (day as { exercise_name?: unknown; day?: unknown }).exercise_name ||
        (day as { day?: unknown }).day
    )
    const duration = [
      (day as { workout_timer?: unknown }).workout_timer,
      (day as { exercise_time?: unknown }).exercise_time,
      (day as { rest_timer?: unknown }).rest_timer,
    ]
      .filter(Boolean)
      .map(v => safeStr(v))
      .join(' • ')

    return (
      <div className="rounded-lg bg-white border border-gray-100 p-3 shadow-sm">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0 mb-2">
          <p className="text-sm font-semibold text-gray-800">{dayLabel}</p>
          {duration && (
            <span className="text-xs text-gray-500">{duration}</span>
          )}
        </div>
        <ul className="list-none ml-0 space-y-0">
          {exercises.map((ex, idx) => renderExerciseItem(ex, idx))}
        </ul>
      </div>
    )
  }

  function renderExerciseItem(exercise: RoadmapExerciseItem, idx: number) {
    const rawDesc = (exercise as { description?: unknown }).description
    const desc = typeof rawDesc === 'string' ? rawDesc.trim() : ''
    const descShort = desc && desc.length > 80 ? `${desc.slice(0, 80)}…` : desc
    const name = safeStr((exercise as { name?: unknown }).name)

    const keyVal = (exercise as { exercise_id?: unknown }).exercise_id
    return (
      <li
        key={
          keyVal != null && typeof keyVal === 'string'
            ? keyVal
            : typeof keyVal === 'number'
              ? keyVal
              : idx
        }
        className="py-2 border-b border-gray-100 last:border-0 text-sm"
      >
        <span className="font-medium text-gray-900 block">{name}</span>
        {descShort && (
          <span className="text-gray-600 text-xs block mt-0.5">
            {descShort}
          </span>
        )}
      </li>
    )
  }

  useEffect(() => {
    const fetchRoadmap = async () => {
      const response = await roadmapService.getRoadmap()
      // Axios wraps the response, so data is in response.data
      const apiResponse = response.data
      if (apiResponse.statusCode === 200 && apiResponse.data) {
        setRoadmap(apiResponse.data)
        // setFetched(true)
        //   setLoading(false)

        return
      } else {
        throw new Error(apiResponse.message || 'Invalid response format')
      }
    }

    fetchRoadmap()
  }, [])

  if (!roadmap) {
    return (
      <Card className="p-6">
        <Text variant="secondary">
          No roadmap found. Please complete confirmation step.
        </Text>
      </Card>
    )
  }

  console.log('inside progress::', roadmap?.currentCycle)

  if (roadmap) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Text variant="primary" className="text-2xl font-semibold">
            Progress
          </Text>
          {roadmap.currentCycle && (
            <span
              className={[
                'px-3 py-1.5 rounded-lg border text-sm font-medium',
                cycleBadgeClass(roadmap.currentCycle),
              ].join(' ')}
            >
              {roadmap.currentCycle}
            </span>
          )}
        </div>

        <Accordion
          items={Object.entries(roadmap.timeline ?? {}).map(
            ([cycleName, weeks]) => {
              const weekAccordionItems = Object.entries(
                weeks as Record<string, RoadmapDayExercise[]>
              ).map(([weekName, days]) => ({
                id: weekName,
                title: weekName,
                content: (
                  <div className="rounded-lg bg-white border border-gray-100 p-4 space-y-4">
                    {days.map((day, idx) => (
                      <div key={idx}>{renderDayContent(day)}</div>
                    ))}
                  </div>
                ),
              }))

              return {
                id: cycleName,
                title: cycleName,
                content: (
                  <Accordion
                    items={weekAccordionItems}
                    allowMultiple
                    variant="outlined"
                    contentClassName="bg-gray-50 p-3 rounded"
                  />
                ),
              }
            }
          )}
          allowMultiple
          variant="outlined"
        />
      </div>
    )
  }
}
