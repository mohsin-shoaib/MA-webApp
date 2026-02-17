import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { Modal } from '@/components/Modal'
import { Accordion } from '@/components/Accordion'
import { programService } from '@/api/program.service'
import { roadmapService } from '@/api/roadmap.service'
import type { ProgramWithCycle } from '@/types/program'
import type { Roadmap, RoadmapCycle, RoadmapDayExercise } from '@/types/roadmap'
import { isRealTimelineWeek } from '@/types/roadmap'
import type { AxiosError } from 'axios'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'

function renderDaySummary(day: RoadmapDayExercise) {
  const exercises = day.exercises ?? []
  const names = exercises
    .slice(0, 3)
    .map(ex => ex.name)
    .filter(Boolean)
  const more = exercises.length > 3 ? ` +${exercises.length - 3} more` : ''
  return (
    <div className="text-sm py-1">
      <span className="font-medium">{day.exercise_name || day.day}</span>
      {names.length > 0 && (
        <span className="text-gray-600 ml-1">
          – {names.join(', ')}
          {more}
        </span>
      )}
    </div>
  )
}

export function ProgramDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showSuccess, showError } = useSnackbar()
  const [program, setProgram] = useState<ProgramWithCycle | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrollLoading, setEnrollLoading] = useState(false)
  const [enrollWarning, setEnrollWarning] = useState<string | null>(null)
  const [showReviewStep, setShowReviewStep] = useState(false)
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [roadmapLoading, setRoadmapLoading] = useState(false)

  useEffect(() => {
    const programId = id ? Number.parseInt(id, 10) : Number.NaN
    if (Number.isNaN(programId)) {
      queueMicrotask(() => setLoading(false))
      return
    }
    const cancelled = { current: false }
    queueMicrotask(() => {
      if (cancelled.current) return
      setLoading(true)
      Promise.all([
        programService.getByIdForAthlete(programId),
        programService.getCurrentProgram(),
      ])
        .then(([detailRes, currentRes]) => {
          if (cancelled.current) return
          if (detailRes.data.statusCode === 200 && detailRes.data.data) {
            const programData = detailRes.data.data
            const current =
              currentRes.data.statusCode === 200 ? currentRes.data.data : null
            if (current?.programId === programData.id) {
              navigate('/train/programs', { replace: true })
              return
            }
            setProgram(programData)
          } else {
            setProgram(null)
          }
        })
        .catch(() => {
          if (!cancelled.current) {
            setProgram(null)
            showError('Failed to load program.')
          }
        })
        .finally(() => {
          if (!cancelled.current) setLoading(false)
        })
    })
    return () => {
      cancelled.current = true
    }
  }, [id, showError, navigate])

  useEffect(() => {
    if (!showReviewStep) return
    const cancelled = { current: false }
    queueMicrotask(() => {
      if (cancelled.current) return
      setRoadmapLoading(true)
      setRoadmap(null)
      roadmapService
        .getRoadmap()
        .then(res => {
          if (cancelled.current) return
          if (res.data.statusCode === 200 && res.data.data) {
            setRoadmap(res.data.data)
          } else {
            setRoadmap(null)
          }
        })
        .catch(() => {
          if (!cancelled.current) setRoadmap(null)
        })
        .finally(() => {
          if (!cancelled.current) setRoadmapLoading(false)
        })
    })
    return () => {
      cancelled.current = true
    }
  }, [showReviewStep])

  const handleEnrollClick = () => {
    setShowReviewStep(true)
  }

  const handleConfirmEnroll = () => {
    if (!program) return
    setEnrollLoading(true)
    setEnrollWarning(null)
    programService
      .enroll(program.id)
      .then(res => {
        const apiRes = res.data
        if (apiRes.statusCode === 200 && apiRes.data) {
          const warning =
            apiRes.data.warning != null &&
            typeof apiRes.data.warning === 'string'
              ? apiRes.data.warning.trim()
              : ''
          if (warning.length > 0) {
            setEnrollWarning(warning)
            setShowReviewStep(false)
          } else {
            showSuccess('You are now enrolled in this program.')
            navigate('/train/programs')
          }
        } else {
          showError(apiRes.message || 'Enrollment failed.')
        }
      })
      .catch((err: AxiosError<{ message?: string }>) => {
        showError(
          err.response?.data?.message || err.message || 'Enrollment failed.'
        )
      })
      .finally(() => setEnrollLoading(false))
  }

  const closeWarning = () => {
    setEnrollWarning(null)
    showSuccess('You are now enrolled in this program.')
    navigate('/train/programs')
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8">
        <Spinner size="small" variant="primary" />
        <Text variant="secondary">Loading program...</Text>
      </div>
    )
  }

  if (!program) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/train/programs')}
        >
          ← Back to programs
        </Button>
        <Card className="p-6">
          <Text variant="default" className="font-medium">
            Program not found or no longer available.
          </Text>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            onClick={() => navigate('/train/programs')}
          >
            Back to list
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/train/programs')}
        >
          ← Back to programs
        </Button>
        <Text variant="primary" className="text-2xl font-semibold">
          {program.name}
        </Text>
      </div>

      <Card className="p-6">
        <div className="space-y-3">
          {program.cycle && (
            <p className="text-sm text-gray-600">
              Cycle: {program.cycle.name}
              {program.cycle.duration != null &&
                ` • ${program.cycle.duration} weeks`}
            </p>
          )}
          {program.description && (
            <p className="text-sm">{program.description}</p>
          )}
          {program.subCategory && (
            <p className="text-sm text-gray-600">
              Focus: {program.subCategory}
            </p>
          )}
          {Array.isArray(program.dailyExercise) &&
            program.dailyExercise.length > 0 && (
              <p className="text-sm text-gray-600">
                {program.dailyExercise.length} day(s) in program
              </p>
            )}
        </div>
        <div className="mt-6">
          <Button
            type="button"
            onClick={handleEnrollClick}
            disabled={enrollLoading}
          >
            Enroll in this program
          </Button>
        </div>
      </Card>

      {/* Review step: show roadmap and timeline, then confirm to enroll */}
      {showReviewStep && (
        <Card className="p-6">
          <Text variant="default" className="font-semibold mb-2">
            Review roadmap & timeline
          </Text>
          <Text variant="secondary" className="mb-4">
            You are about to enroll in <strong>{program.name}</strong>. This
            will set it as your active program. Review your roadmap and timeline
            below, then confirm to proceed.
          </Text>
          {roadmapLoading && (
            <div className="flex items-center gap-2 py-6">
              <Spinner size="small" variant="primary" />
              <Text variant="secondary">Loading roadmap...</Text>
            </div>
          )}
          {!roadmapLoading && roadmap && (
            <div className="space-y-4">
              {roadmap.primaryGoal && (
                <p className="text-sm">
                  <span className="font-medium">Primary goal:</span>{' '}
                  {roadmap.primaryGoal}
                </p>
              )}
              {roadmap.eventDate && (
                <p className="text-sm">
                  <span className="font-medium">Event date:</span>{' '}
                  {new Date(roadmap.eventDate).toLocaleDateString()}
                </p>
              )}
              {roadmap.currentCycle && (
                <p className="text-sm">
                  <span className="font-medium">Current cycle:</span>{' '}
                  {roadmap.currentCycle}
                </p>
              )}
              {roadmap.cycles && roadmap.cycles.length > 0 && (
                <div className="space-y-3">
                  <Text variant="default" className="font-medium">
                    Timeline
                  </Text>
                  {roadmap.cycles.map((cycle: RoadmapCycle, index: number) => (
                    <div
                      key={cycle.cycleType + index}
                      className="border rounded p-3 text-sm"
                    >
                      <div className="font-medium">{cycle.cycleName}</div>
                      <div className="text-gray-600">
                        {cycle.startDate} – {cycle.endDate} ·{' '}
                        {cycle.durationWeeks} weeks
                        {cycle.programName && ` · ${cycle.programName}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {roadmap.timeline &&
                typeof roadmap.timeline === 'object' &&
                Object.keys(roadmap.timeline).length > 0 && (
                  <div className="space-y-2">
                    <Text variant="default" className="font-medium">
                      Weekly schedule
                    </Text>
                    <Accordion
                      items={Object.entries(
                        roadmap.timeline as Record<
                          string,
                          Record<string, string[] | RoadmapDayExercise[]>
                        >
                      ).flatMap(([phase, weeks]) =>
                        Object.entries(weeks).map(([week, exercises]) => ({
                          id: `${phase}-${week}`,
                          title: `${phase} – ${week}`,
                          content: (
                            <div className="space-y-1">
                              {isRealTimelineWeek(exercises)
                                ? exercises.map((day, dayIdx) => (
                                    <div key={dayIdx}>
                                      {renderDaySummary(day)}
                                    </div>
                                  ))
                                : Array.isArray(exercises) && (
                                    <ul className="list-disc ml-4">
                                      {exercises.map(
                                        (ex: string, idx: number) => (
                                          <li key={idx}>{ex}</li>
                                        )
                                      )}
                                    </ul>
                                  )}
                            </div>
                          ),
                        }))
                      )}
                      allowMultiple
                    />
                  </div>
                )}
            </div>
          )}
          {!roadmapLoading && !roadmap && (
            <Text variant="secondary" className="py-4">
              No roadmap found. You can still confirm to enroll in this program.
            </Text>
          )}
          <div className="flex gap-3 mt-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowReviewStep(false)}
              disabled={enrollLoading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmEnroll}
              disabled={enrollLoading}
              loading={enrollLoading}
            >
              {enrollLoading ? 'Enrolling...' : 'Confirm enrollment'}
            </Button>
          </div>
        </Card>
      )}

      {/* Only show after user clicked Confirm and backend returned a non-empty warning string */}
      <Modal
        visible={enrollWarning != null && enrollWarning.length > 0}
        onClose={closeWarning}
        title="Enrollment note"
        showCloseButton={true}
        closeOnBackdropPress={true}
        closeOnEscape={true}
        primaryAction={{
          label: 'I understand',
          onPress: closeWarning,
        }}
        secondaryAction={{
          label: 'Close',
          onPress: closeWarning,
        }}
      >
        <Text variant="default">{enrollWarning}</Text>
        <Text variant="secondary" className="text-sm mt-2">
          You have been enrolled in this program.
        </Text>
      </Modal>
    </div>
  )
}
