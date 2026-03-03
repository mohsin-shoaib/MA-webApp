import { useState, useEffect, useCallback, useRef } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
import { Icon } from '@/components/Icon'
import { Modal } from '@/components/Modal'
import { adminService } from '@/api/admin.service'
import { goalTypeService } from '@/api/goal-type.service'
import { programService } from '@/api/program.service'
import { exerciseService } from '@/api/exercise.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type {
  ProgramStructure,
  ProgramStructureSection,
  ProgramStructureSectionExercise,
} from '@/types/program'
import type { Cycle } from '@/types/cycle'
import type { GoalType, Category } from '@/types/goal-type'
import type { ExerciseListForBuilderItem } from '@/types/exercise'
import {
  DEFAULT_PARAMETER_OPTIONS,
  PARAMETER_2_OPTIONS,
} from '@/types/exercise'
import { AxiosError } from 'axios'

const SECTION_TYPES = [
  { value: 'normal', label: 'Normal' },
  { value: 'superset', label: 'Superset' },
  { value: 'circuit', label: 'Circuit' },
  { value: 'AMRAP', label: 'AMRAP' },
  { value: 'EMOM', label: 'EMOM' },
]

const BLOCK_TYPES = [
  { value: 'EXERCISE', label: 'Exercise' },
  { value: 'CIRCUIT', label: 'Circuit' },
  { value: 'SUPERSET', label: 'Superset' },
]

export interface ProgramBuilderFormProps {
  initialCycleId?: number
  program?: {
    id: number
    name: string
    description: string
    category: string | null
    subCategory: string | null
    cycleId: number
    isActive: boolean
    isPublished?: boolean
    programStructure?: ProgramStructure | null
  }
  onSuccess?: () => void
  onCancel?: () => void
}

export function ProgramBuilderForm({
  initialCycleId,
  program,
  onSuccess,
  onCancel,
}: Readonly<ProgramBuilderFormProps>) {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [goalTypes, setGoalTypes] = useState<GoalType[]>([])
  const [exerciseList, setExerciseList] = useState<
    ExerciseListForBuilderItem[]
  >([])
  const [addExerciseValue, setAddExerciseValue] = useState<
    Record<string, string>
  >({})
  const [saving, setSaving] = useState(false)
  const { showError, showSuccess } = useSnackbar()

  const [name, setName] = useState(program?.name ?? '')
  const [description, setDescription] = useState(program?.description ?? '')
  const [cycleId, setCycleId] = useState(
    program?.cycleId ?? initialCycleId ?? 0
  )
  const [category, setCategory] = useState(program?.category ?? '')
  const [subCategory, setSubCategory] = useState(program?.subCategory ?? '')
  const [isActive, setIsActive] = useState(program?.isActive ?? true)
  /** MASS Phase 4: create with empty weeks (no blocks yet) */
  const [createEmptyWeeks, setCreateEmptyWeeks] = useState(false)
  const [numberOfWeeks, setNumberOfWeeks] = useState(4)
  /** Phase 5: builder view — structure (list) or calendar grid */
  const [builderView, setBuilderView] = useState<'structure' | 'calendar'>(
    'structure'
  )
  /** Phase 5: selected cell for session designer { weekIdx, dayIdx } */
  const [sessionDesignerCell, setSessionDesignerCell] = useState<{
    weekIdx: number
    dayIdx: number
  } | null>(null)
  const [previewSessionOpen, setPreviewSessionOpen] = useState(false)
  const [addBlockModalOpen, setAddBlockModalOpen] = useState(false)
  const [addBlockCircuitForm, setAddBlockCircuitForm] = useState({
    instructions: '',
    resultTrackingType: '',
    blockCategory: '',
    conditioningFormat: '',
    videoUrlsStr: '',
  })
  const [newExerciseModalOpen, setNewExerciseModalOpen] = useState(false)
  const [newExerciseForm, setNewExerciseForm] = useState({
    name: '',
    videoUrl: '',
    defaultParameter1: 'Reps',
    defaultParameter2: '-',
    pointsOfPerformance: '',
    tagsStr: '',
  })
  const [newExerciseSaving, setNewExerciseSaving] = useState(false)
  const [amberSessionsList, setAmberSessionsList] = useState<
    Array<{
      id: number
      sessionDate: string
      programDayId: number
      dayName?: string
      dayIndex: number
      isRestDay: boolean
    }>
  >([])
  const [amberFrom, setAmberFrom] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [amberTo, setAmberTo] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 60)
    return d.toISOString().slice(0, 10)
  })
  const [amberAssignDate, setAmberAssignDate] = useState('')
  const [amberAssignDayId, setAmberAssignDayId] = useState('')
  const [amberCopyFrom, setAmberCopyFrom] = useState('')
  const [amberCopyTo, setAmberCopyTo] = useState('')
  const [amberLoading, setAmberLoading] = useState(false)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [structure, setStructure] = useState<ProgramStructure>(
    program?.programStructure?.weeks?.length
      ? { weeks: program.programStructure.weeks }
      : {
          weeks: [
            {
              weekIndex: 1,
              weekName: 'Week 1',
              days: [
                {
                  dayIndex: 0,
                  dayName: 'Day 1',
                  sections: [{ sectionType: 'normal', exercises: [] }],
                },
              ],
            },
          ],
        }
  )

  const fetchCycles = useCallback(async () => {
    try {
      const res = await adminService.getCycles()
      setCycles(res.data.data || [])
    } catch {
      showError('Failed to load cycles')
    }
  }, [showError])

  const fetchGoalTypes = useCallback(async () => {
    try {
      const res = await goalTypeService.getAll({ limit: 100 })
      setGoalTypes(res.data.data?.rows || [])
    } catch {
      showError('Failed to load goal types')
    }
  }, [showError])

  const fetchExercises = useCallback(async (q?: string) => {
    try {
      const res = await exerciseService.listForProgramBuilder(q)
      if (res.data?.statusCode === 200 && res.data.data?.rows) {
        setExerciseList(res.data.data.rows)
      }
    } catch {
      setExerciseList([])
    }
  }, [])

  useEffect(() => {
    fetchCycles()
    fetchGoalTypes()
    fetchExercises()
  }, [fetchCycles, fetchGoalTypes, fetchExercises])

  /** Phase 5: debounced auto-save when editing in session designer (program exists) */
  useEffect(() => {
    if (!program || !sessionDesignerCell) return
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null
      void (async () => {
        try {
          await programService.update(program.id, {
            program_name: name.trim(),
            program_description: description.trim(),
            cycleId,
            category: category || null,
            subCategory: subCategory || null,
            isActive,
            programStructure: structure,
          })
        } catch {
          // silent; user can save explicitly
        }
      })()
    }, 1500)
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [
    program,
    sessionDesignerCell,
    structure,
    name,
    description,
    cycleId,
    category,
    subCategory,
    isActive,
  ])

  const cycle = cycles.find(c => c.id === cycleId)
  const showCategory = cycle?.name === 'Red' || cycle?.name === 'Green'
  const isAmberCycle = cycle?.name === 'Amber'
  const categoryOptions = goalTypes
    .filter(g => g.category === category)
    .map(g => ({ value: g.subCategory, label: g.subCategory }))
  const categoryLabels = [...new Set(goalTypes.map(g => g.category))]
    .filter((c): c is Category => Boolean(c))
    .map(c => ({ value: c, label: c }))

  const addWeek = () => {
    const nextWeek = structure.weeks.length + 1
    const defaultFirstDayName = cycle?.name === 'Amber' ? '' : 'Day 1'
    setStructure({
      weeks: [
        ...structure.weeks,
        {
          weekIndex: nextWeek,
          weekName: `Week ${nextWeek}`,
          days: [
            {
              dayIndex: 0,
              dayName: defaultFirstDayName,
              sections: [{ sectionType: 'normal', exercises: [] }],
            },
          ],
        },
      ],
    })
  }

  const addDay = (weekIdx: number) => {
    const weeks = [...structure.weeks]
    const week = { ...weeks[weekIdx], days: [...(weeks[weekIdx].days ?? [])] }
    if (week.days.length >= 7) return // max 7 days per week; button is disabled
    const nextDayIdx = week.days.length
    const defaultDayName =
      cycle?.name === 'Amber' ? '' : `Day ${nextDayIdx + 1}`
    week.days.push({
      dayIndex: nextDayIdx,
      dayName: defaultDayName,
      sections: [{ sectionType: 'normal', exercises: [] }],
    })
    weeks[weekIdx] = week
    setStructure({ weeks })
  }

  const setRestDay = (weekIdx: number, dayIdx: number, isRestDay: boolean) => {
    const weeks = [...structure.weeks]
    const week = { ...weeks[weekIdx], days: [...weeks[weekIdx].days] }
    week.days[dayIdx] = {
      ...week.days[dayIdx],
      isRestDay,
      sections: isRestDay ? [] : [{ sectionType: 'normal', exercises: [] }],
    }
    weeks[weekIdx] = week
    setStructure({ weeks })
  }

  const addSection = (weekIdx: number, dayIdx: number) => {
    const weeks = [...structure.weeks]
    const week = { ...weeks[weekIdx], days: [...weeks[weekIdx].days] }
    const day = {
      ...week.days[dayIdx],
      sections: [...(week.days[dayIdx].sections ?? [])],
    }
    day.sections.push({
      sectionType: 'normal',
      blockType: 'EXERCISE',
      exercises: [],
    })
    week.days[dayIdx] = day
    weeks[weekIdx] = week
    setStructure({ weeks })
  }

  const addBlockAsExercise = (
    weekIdx: number,
    dayIdx: number,
    exercise: ExerciseListForBuilderItem
  ) => {
    const weeks = [...structure.weeks]
    const week = { ...weeks[weekIdx], days: [...weeks[weekIdx].days] }
    const day = {
      ...week.days[dayIdx],
      sections: [...(week.days[dayIdx].sections ?? [])],
    }
    day.sections.push({
      sectionType: 'normal',
      blockType: 'EXERCISE',
      exercises: [{ exerciseId: exercise.id, sets: 3, reps: 10 }],
    })
    week.days[dayIdx] = day
    weeks[weekIdx] = week
    setStructure({ weeks })
  }

  const addBlockAsCircuit = (
    weekIdx: number,
    dayIdx: number,
    form: {
      instructions: string
      resultTrackingType: string
      blockCategory: string
      conditioningFormat: string
      videoUrlsStr?: string
    }
  ) => {
    const weeks = [...structure.weeks]
    const week = { ...weeks[weekIdx], days: [...weeks[weekIdx].days] }
    const day = {
      ...week.days[dayIdx],
      sections: [...(week.days[dayIdx].sections ?? [])],
    }
    const videoUrls = form.videoUrlsStr
      ?.split(',')
      .map(u => u.trim())
      .filter(Boolean)
    day.sections.push({
      sectionType: 'circuit',
      blockType: 'CIRCUIT',
      instructions: form.instructions || undefined,
      resultTrackingType: form.resultTrackingType || undefined,
      blockCategory: form.blockCategory || undefined,
      conditioningFormat: form.conditioningFormat || undefined,
      videoUrls: videoUrls?.length ? videoUrls : undefined,
      exercises: [],
    })
    week.days[dayIdx] = day
    weeks[weekIdx] = week
    setStructure({ weeks })
  }

  const addExerciseToSection = (
    weekIdx: number,
    dayIdx: number,
    sectionIdx: number,
    exercise: ExerciseListForBuilderItem
  ) => {
    const weeks = [...structure.weeks]
    const week = { ...weeks[weekIdx], days: [...weeks[weekIdx].days] }
    const day = {
      ...week.days[dayIdx],
      sections: [...(week.days[dayIdx].sections ?? [])],
    }
    const section = {
      ...day.sections[sectionIdx],
      exercises: [...(day.sections[sectionIdx].exercises ?? [])],
    }
    section.exercises.push({ exerciseId: exercise.id, sets: 3, reps: 10 })
    day.sections[sectionIdx] = section
    week.days[dayIdx] = day
    weeks[weekIdx] = week
    setStructure({ weeks })
  }

  const updateSectionExercise = (
    weekIdx: number,
    dayIdx: number,
    sectionIdx: number,
    exIdx: number,
    patch: Partial<ProgramStructureSectionExercise>
  ) => {
    const weeks = [...structure.weeks]
    const week = { ...weeks[weekIdx], days: [...weeks[weekIdx].days] }
    const day = {
      ...week.days[dayIdx],
      sections: [...(week.days[dayIdx].sections ?? [])],
    }
    const section = {
      ...day.sections[sectionIdx],
      exercises: [...(day.sections[sectionIdx].exercises ?? [])],
    }
    section.exercises[exIdx] = { ...section.exercises[exIdx], ...patch }
    day.sections[sectionIdx] = section
    week.days[dayIdx] = day
    weeks[weekIdx] = week
    setStructure({ weeks })
  }

  const removeSectionExercise = (
    weekIdx: number,
    dayIdx: number,
    sectionIdx: number,
    exIdx: number
  ) => {
    const weeks = [...structure.weeks]
    const week = { ...weeks[weekIdx], days: [...weeks[weekIdx].days] }
    const day = {
      ...week.days[dayIdx],
      sections: [...(week.days[dayIdx].sections ?? [])],
    }
    const section = {
      ...day.sections[sectionIdx],
      exercises: day.sections[sectionIdx].exercises.filter(
        (_, i) => i !== exIdx
      ),
    }
    day.sections[sectionIdx] = section
    week.days[dayIdx] = day
    weeks[weekIdx] = week
    setStructure({ weeks })
  }

  const removeSection = (
    weekIdx: number,
    dayIdx: number,
    sectionIdx: number
  ) => {
    const weeks = [...structure.weeks]
    const week = { ...weeks[weekIdx], days: [...weeks[weekIdx].days] }
    const day = {
      ...week.days[dayIdx],
      sections:
        week.days[dayIdx].sections?.filter((_, i) => i !== sectionIdx) ?? [],
    }
    week.days[dayIdx] = day
    weeks[weekIdx] = week
    setStructure({ weeks })
  }

  const removeDay = (weekIdx: number, dayIdx: number) => {
    const weeks = [...structure.weeks]
    const week = {
      ...weeks[weekIdx],
      days: weeks[weekIdx].days.filter((_, i) => i !== dayIdx),
    }
    weeks[weekIdx] = week
    if (week.days.length === 0) {
      weeks.splice(weekIdx, 1)
    }
    setStructure({ weeks })
  }

  const removeWeek = (weekIdx: number) => {
    if (
      !window.confirm(
        'Remove this week and all its sessions? This cannot be undone.'
      )
    )
      return
    setStructure({ weeks: structure.weeks.filter((_, i) => i !== weekIdx) })
  }

  const getExerciseName = (exerciseId: number) =>
    exerciseList.find(e => e.id === exerciseId)?.name ??
    `Exercise #${exerciseId}`

  const handleSubmit = async () => {
    if (!name.trim()) {
      showError('Program name is required')
      return
    }
    if (!description.trim()) {
      showError('Program description is required')
      return
    }
    if (!cycleId) {
      showError('Select a cycle')
      return
    }
    if (showCategory && (!category || !subCategory)) {
      showError('Goal and Goal Type are required for this cycle')
      return
    }
    const hasContent = structure.weeks.some(w =>
      w.days.some(
        d =>
          !d.isRestDay &&
          (d.sections?.length ?? 0) > 0 &&
          d.sections?.some(s => (s.exercises?.length ?? 0) > 0)
      )
    )
    if (!createEmptyWeeks && !hasContent) {
      showError(
        'Add at least one exercise to the program, or check "Create with empty weeks"'
      )
      return
    }
    const sectionMissingName = structure.weeks.some(w =>
      w.days.some(
        d =>
          !d.isRestDay &&
          (d.sections ?? []).some(s => !s.name || !String(s.name).trim())
      )
    )
    if (!createEmptyWeeks && sectionMissingName) {
      showError('Every section must have a name')
      return
    }
    setSaving(true)
    try {
      if (program) {
        await programService.update(program.id, {
          program_name: name.trim(),
          program_description: description.trim(),
          cycleId,
          category: category || null,
          subCategory: subCategory || null,
          isActive,
          programStructure: structure,
        })
        showSuccess('Program updated')
      } else {
        const payload: Parameters<typeof programService.create>[0] = {
          program_name: name.trim(),
          program_description: description.trim(),
          cycleId,
          category: category || null,
          subCategory: subCategory || null,
          isActive,
        }
        if (createEmptyWeeks && numberOfWeeks >= 1) {
          payload.numberOfWeeks = numberOfWeeks
        } else {
          payload.programStructure = structure
        }
        await programService.create(payload)
        showSuccess('Program created')
      }
      onSuccess?.()
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to save program')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {!program && (
          <div className="md:col-span-2 flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createEmptyWeeks}
                onChange={e => setCreateEmptyWeeks(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Text variant="default" className="text-sm">
                Create with empty weeks (add blocks later)
              </Text>
            </label>
            {createEmptyWeeks && (
              <div className="flex items-center gap-2">
                <Text variant="secondary" className="text-sm">
                  Weeks:
                </Text>
                <input
                  type="number"
                  min={1}
                  max={52}
                  value={numberOfWeeks}
                  onChange={e =>
                    setNumberOfWeeks(
                      Math.max(1, Number.parseInt(e.target.value, 10) || 1)
                    )
                  }
                  className="w-16 rounded border border-gray-200 px-2 py-1 text-sm"
                />
              </div>
            )}
          </div>
        )}
        <div>
          <Text variant="default" className="text-sm font-medium mb-1 block">
            Program name *
          </Text>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Strength Block"
          />
        </div>
        <div>
          <Text variant="default" className="text-sm font-medium mb-1 block">
            Cycle *
          </Text>
          <Dropdown
            value={cycleId ? String(cycleId) : ''}
            onValueChange={v => setCycleId(Number(v ?? 0))}
            options={cycles.map(c => ({ value: String(c.id), label: c.name }))}
            placeholder="Select cycle"
            disabled={!program}
          />
        </div>
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Description *
        </Text>
        <textarea
          className="w-full min-h-[80px] rounded border border-gray-300 px-3 py-2 text-sm"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Program overview"
        />
      </div>
      {showCategory && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Text variant="default" className="text-sm font-medium mb-1 block">
              Goal
            </Text>
            <Dropdown
              value={category}
              onValueChange={v => {
                const s = Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
                setCategory(s)
                setSubCategory('')
              }}
              options={categoryLabels}
              placeholder="Goal"
              emptyMessage="please add goals first"
            />
          </div>
          <div>
            <Text variant="default" className="text-sm font-medium mb-1 block">
              Goal Type
            </Text>
            <Dropdown
              value={subCategory}
              onValueChange={v => {
                const s = Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
                setSubCategory(s)
              }}
              options={categoryOptions}
              placeholder="Goal Type"
              emptyMessage="please add goals first"
              disabled={!category}
            />
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="pb-active"
          checked={isActive}
          onChange={e => setIsActive(e.target.checked)}
        />
        <label htmlFor="pb-active" className="text-sm">
          Active
        </label>
      </div>

      <hr className="border-gray-200" />

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <Text as="h2" variant="primary" className="text-lg font-semibold">
            Program structure
          </Text>
          <Text variant="secondary" className="text-sm mt-0.5">
            Build your program: add weeks → days → sections → then add exercises
            to each section
          </Text>
        </div>
        <div className="flex items-center gap-2">
          {program && (
            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50">
              <button
                type="button"
                onClick={() => {
                  setBuilderView('structure')
                  setSessionDesignerCell(null)
                }}
                className={`px-3 py-1.5 text-sm rounded-md ${builderView === 'structure' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Structure
              </button>
              <button
                type="button"
                onClick={() => setBuilderView('calendar')}
                className={`px-3 py-1.5 text-sm rounded-md ${builderView === 'calendar' ? 'bg-white shadow text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Calendar
              </button>
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={addWeek}
            leftIcon={<Icon name="plus" family="solid" size={14} />}
          >
            Add week
          </Button>
        </div>
      </div>

      {/* MASS Phase 6: Amber Calendar — assign session to date */}
      {program && program.id && isAmberCycle && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 space-y-3">
          <Text variant="default" className="font-medium text-amber-900">
            Amber Calendar
          </Text>
          <p className="text-sm text-amber-800">
            Assign a session (day) to a calendar date. Athletes see that session
            on that date.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={amberFrom}
              onChange={e => setAmberFrom(e.target.value)}
              size="small"
              className="w-40"
            />
            <span className="text-sm text-gray-600">to</span>
            <Input
              type="date"
              value={amberTo}
              onChange={e => setAmberTo(e.target.value)}
              size="small"
              className="w-40"
            />
            <Button
              type="button"
              variant="secondary"
              size="small"
              disabled={amberLoading}
              onClick={async () => {
                setAmberLoading(true)
                try {
                  const res = await programService.getAmberSessions(
                    program.id!,
                    { from: amberFrom, to: amberTo }
                  )
                  setAmberSessionsList(res.data?.data?.rows ?? [])
                } catch {
                  setAmberSessionsList([])
                } finally {
                  setAmberLoading(false)
                }
              }}
            >
              Load dates
            </Button>
          </div>
          {amberSessionsList.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border border-gray-200 rounded text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-200 px-2 py-1 text-left">
                      Date
                    </th>
                    <th className="border border-gray-200 px-2 py-1 text-left">
                      Session
                    </th>
                    <th className="border border-gray-200 px-2 py-1 w-16" />
                  </tr>
                </thead>
                <tbody>
                  {amberSessionsList.map(row => (
                    <tr key={row.id}>
                      <td className="border border-gray-200 px-2 py-1">
                        {row.sessionDate}
                      </td>
                      <td className="border border-gray-200 px-2 py-1">
                        {row.isRestDay
                          ? 'Rest'
                          : row.dayName || `Day ${row.dayIndex + 1}`}
                      </td>
                      <td className="border border-gray-200 px-2 py-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="small"
                          className="text-red-600 text-xs"
                          onClick={async () => {
                            try {
                              await programService.deleteAmberSession(
                                program.id!,
                                row.sessionDate
                              )
                              setAmberSessionsList(prev =>
                                prev.filter(s => s.id !== row.id)
                              )
                            } catch {
                              showError('Failed to remove')
                            }
                          }}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-amber-200">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Date
              </label>
              <Input
                type="date"
                value={amberAssignDate}
                onChange={e => setAmberAssignDate(e.target.value)}
                size="small"
                className="w-40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Session (day)
              </label>
              <Dropdown
                placeholder="Select day"
                value={amberAssignDayId}
                onValueChange={v =>
                  setAmberAssignDayId(
                    Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
                  )
                }
                options={structure.weeks.flatMap(w =>
                  (w.days ?? [])
                    .map(d => ({
                      id: (d as { id?: number }).id,
                      dayName: d.dayName,
                      weekIndex: w.weekIndex,
                      dayIndex: d.dayIndex,
                      isRestDay: d.isRestDay,
                    }))
                    .filter(d => d.id != null)
                    .map(d => {
                      const label = d.isRestDay
                        ? `Rest - Week ${d.weekIndex} Day ${d.dayIndex + 1}`
                        : d.dayName ||
                          `Week ${d.weekIndex} Day ${d.dayIndex + 1}`
                      return { value: String(d.id!), label }
                    })
                )}
                size="small"
                className="min-w-[180px]"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="small"
              disabled={!amberAssignDate || !amberAssignDayId}
              onClick={async () => {
                const dayId = Number(amberAssignDayId)
                if (!dayId) return
                try {
                  await programService.setAmberSession(program.id!, {
                    date: amberAssignDate,
                    programDayId: dayId,
                  })
                  setAmberSessionsList(prev => [
                    ...prev,
                    {
                      id: 0,
                      sessionDate: amberAssignDate,
                      programDayId: dayId,
                      dayName: structure.weeks
                        .flatMap(w => w.days ?? [])
                        .find(d => (d as { id?: number }).id === dayId)
                        ?.dayName,
                      dayIndex: 0,
                      isRestDay: false,
                    },
                  ])
                  setAmberAssignDate('')
                  setAmberAssignDayId('')
                  showSuccess('Session assigned')
                } catch {
                  showError('Failed to assign')
                }
              }}
            >
              Assign
            </Button>
            <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-amber-200 mt-2">
              <span className="text-xs font-medium text-amber-900">
                Copy from date to date:
              </span>
              <Input
                type="date"
                value={amberCopyFrom}
                onChange={e => setAmberCopyFrom(e.target.value)}
                size="small"
                className="w-36"
                placeholder="From"
              />
              <Input
                type="date"
                value={amberCopyTo}
                onChange={e => setAmberCopyTo(e.target.value)}
                size="small"
                className="w-36"
                placeholder="To"
              />
              <Button
                type="button"
                variant="ghost"
                size="small"
                disabled={!amberCopyFrom || !amberCopyTo || amberLoading}
                onClick={async () => {
                  try {
                    await programService.copyAmberSession(program.id!, {
                      fromDate: amberCopyFrom,
                      toDate: amberCopyTo,
                    })
                    const res = await programService.getAmberSessions(
                      program.id!,
                      { from: amberFrom, to: amberTo }
                    )
                    setAmberSessionsList(res.data?.data?.rows ?? [])
                    setAmberCopyFrom('')
                    setAmberCopyTo('')
                    showSuccess('Session copied')
                  } catch {
                    showError('Failed to copy session')
                  }
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Phase 5: Calendar grid view */}
      {program && builderView === 'calendar' && (
        <div className="space-y-4">
          {sessionDesignerCell == null ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden bg-white">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 w-24">
                      Week
                    </th>
                    {[1, 2, 3, 4, 5, 6, 7].map(d => (
                      <th
                        key={d}
                        className="border border-gray-200 px-2 py-2 text-center text-xs font-medium text-gray-600 min-w-[100px]"
                      >
                        Day {d}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {structure.weeks.map((week, weekIdx) => (
                    <tr key={weekIdx}>
                      <td className="border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 align-top">
                        <div className="flex items-center gap-2">
                          <span>Week {week.weekIndex}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="small"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                            onClick={() => removeWeek(weekIdx)}
                            title="Remove week"
                          >
                            ×
                          </Button>
                        </div>
                      </td>
                      {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
                        const day = week.days?.[dayIdx]
                        const isRest = day?.isRestDay ?? false
                        const sections = day?.sections ?? []
                        const blockCount = sections.length
                        const exerciseNames = sections
                          .flatMap(sec =>
                            (sec.exercises ?? []).map(ex =>
                              getExerciseName(ex.exerciseId)
                            )
                          )
                          .slice(0, 3)
                        const setCounts = sections
                          .flatMap(sec =>
                            (sec.exercises ?? [])
                              .map(ex =>
                                ex.sets != null && ex.reps != null
                                  ? `${ex.sets}×${ex.reps}`
                                  : ex.sets != null
                                    ? `${ex.sets} sets`
                                    : null
                              )
                              .filter(Boolean)
                          )
                          .slice(0, 3)
                        const blockCategories = [
                          ...new Set(
                            sections.map(s => s.blockCategory).filter(Boolean)
                          ),
                        ] as string[]
                        return (
                          <td
                            key={dayIdx}
                            className="border border-gray-200 p-1 align-top"
                          >
                            {day ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSessionDesignerCell({ weekIdx, dayIdx })
                                }
                                className="w-full min-h-[80px] rounded-lg border-2 border-transparent hover:border-[#3AB8ED] hover:bg-blue-50/50 p-2 text-left transition-colors"
                              >
                                {isRest ? (
                                  <span className="text-xs text-gray-500 font-medium">
                                    Rest
                                  </span>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-medium text-gray-900 truncate">
                                        {day.dayName || `Day ${dayIdx + 1}`}
                                      </span>
                                      {program && (
                                        <span
                                          className={`text-[10px] px-1.5 py-0.5 rounded ${program.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                                        >
                                          {program.isPublished
                                            ? 'Published'
                                            : 'Draft'}
                                        </span>
                                      )}
                                    </div>
                                    {exerciseNames.length > 0 && (
                                      <div
                                        className="text-[11px] text-gray-600 mt-0.5 truncate"
                                        title={exerciseNames.join(', ')}
                                      >
                                        {exerciseNames.join(', ')}
                                      </div>
                                    )}
                                    {(setCounts.length > 0 ||
                                      blockCategories.length > 0) && (
                                      <div className="text-[11px] text-gray-500 mt-0.5">
                                        {setCounts.length > 0 &&
                                          setCounts.join(', ')}
                                        {setCounts.length > 0 &&
                                          blockCategories.length > 0 &&
                                          ' · '}
                                        {blockCategories.length > 0 &&
                                          blockCategories.join(', ')}
                                      </div>
                                    )}
                                    {exerciseNames.length === 0 &&
                                      setCounts.length === 0 &&
                                      blockCategories.length === 0 && (
                                        <div className="text-xs text-gray-500 mt-0.5">
                                          {blockCount} block(s)
                                        </div>
                                      )}
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  addDay(weekIdx)
                                  setSessionDesignerCell({
                                    weekIdx,
                                    dayIdx: week.days?.length ?? 0,
                                  })
                                }}
                                className="w-full min-h-[80px] rounded-lg border border-dashed border-gray-300 text-gray-500 hover:border-[#3AB8ED] hover:text-[#3AB8ED] flex items-center justify-center text-sm"
                              >
                                + Add Session
                              </button>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Session Designer (Level 2) */
            (() => {
              const w = sessionDesignerCell.weekIdx
              const d = sessionDesignerCell.dayIdx
              const week = structure.weeks[w]
              const day = week?.days?.[d]
              if (!week || !day) return null
              return (
                <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      leftIcon={
                        <Icon name="arrow-left" family="solid" size={14} />
                      }
                      onClick={() => setSessionDesignerCell(null)}
                    >
                      Back to calendar
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={() => setPreviewSessionOpen(true)}
                    >
                      Preview Session
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Session name
                      </label>
                      <Input
                        value={day.dayName ?? ''}
                        onChange={e => {
                          const weeks = [...structure.weeks]
                          weeks[w].days[d] = { ...day, dayName: e.target.value }
                          setStructure({ weeks })
                        }}
                        placeholder="e.g. Day 1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Session notes
                      </label>
                      <textarea
                        className="w-full min-h-[80px] rounded border border-gray-300 px-3 py-2 text-sm"
                        value={day.sessionNotes ?? ''}
                        onChange={e => {
                          const weeks = [...structure.weeks]
                          weeks[w].days[d] = {
                            ...day,
                            sessionNotes: e.target.value,
                          }
                          setStructure({ weeks })
                        }}
                        placeholder="Optional notes for this session"
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-gray-700">
                        Blocks
                      </label>
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        leftIcon={<Icon name="plus" family="solid" size={12} />}
                        onClick={() => setAddBlockModalOpen(true)}
                      >
                        Add Block
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {(day.sections ?? []).map((section, sectionIdx) => (
                        <div
                          key={sectionIdx}
                          className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/50 p-3"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {(section as { parentSectionIndex?: number })
                              .parentSectionIndex != null && (
                              <span className="text-xs text-blue-600">
                                Superset
                              </span>
                            )}
                            <span className="text-xs font-medium text-gray-500 uppercase">
                              {(section.blockType ?? 'EXERCISE').slice(0, 1)}
                            </span>
                            <span className="text-sm font-medium truncate">
                              {section.name ||
                                (section.blockType === 'CIRCUIT'
                                  ? 'Circuit'
                                  : section.exercises?.[0]
                                    ? getExerciseName(
                                        section.exercises[0].exerciseId
                                      )
                                    : 'Block')}
                            </span>
                            {section.blockCategory && (
                              <span className="text-xs text-gray-500">
                                · {section.blockCategory}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {sectionIdx < (day.sections ?? []).length - 1 &&
                              (section as { parentSectionIndex?: number })
                                .parentSectionIndex == null &&
                              (day.sections ?? [])[sectionIdx + 1] &&
                              (
                                (day.sections ?? [])[sectionIdx + 1] as {
                                  parentSectionIndex?: number
                                }
                              ).parentSectionIndex == null && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="small"
                                  title="Link with next block as superset"
                                  onClick={() => {
                                    const weeks = [...structure.weeks]
                                    const secs = [
                                      ...(weeks[w].days[d].sections ?? []),
                                    ]
                                    const a = JSON.parse(
                                      JSON.stringify(secs[sectionIdx])
                                    )
                                    const b = JSON.parse(
                                      JSON.stringify(secs[sectionIdx + 1])
                                    )
                                    const parent: ProgramStructureSection = {
                                      blockType: 'SUPERSET',
                                      sectionType: 'superset',
                                      name: 'Superset',
                                      exercises: [],
                                    }
                                    a.parentSectionIndex = sectionIdx
                                    b.parentSectionIndex = sectionIdx
                                    secs.splice(sectionIdx, 2, parent, a, b)
                                    weeks[w].days[d] = {
                                      ...day,
                                      sections: secs,
                                    }
                                    setStructure({ weeks })
                                  }}
                                >
                                  Link as superset
                                </Button>
                              )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="small"
                              onClick={() => {
                                const weeks = [...structure.weeks]
                                const secs = [
                                  ...(weeks[w].days[d].sections ?? []),
                                ]
                                if (sectionIdx > 0) {
                                  ;[secs[sectionIdx - 1], secs[sectionIdx]] = [
                                    secs[sectionIdx],
                                    secs[sectionIdx - 1],
                                  ]
                                  weeks[w].days[d] = { ...day, sections: secs }
                                  setStructure({ weeks })
                                }
                              }}
                            >
                              ↑
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="small"
                              onClick={() => {
                                const weeks = [...structure.weeks]
                                const secs = [
                                  ...(weeks[w].days[d].sections ?? []),
                                ]
                                if (sectionIdx < secs.length - 1) {
                                  ;[secs[sectionIdx], secs[sectionIdx + 1]] = [
                                    secs[sectionIdx + 1],
                                    secs[sectionIdx],
                                  ]
                                  weeks[w].days[d] = { ...day, sections: secs }
                                  setStructure({ weeks })
                                }
                              }}
                            >
                              ↓
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="small"
                              title="Duplicate block"
                              onClick={() => {
                                const weeks = [...structure.weeks]
                                const secs = [
                                  ...(weeks[w].days[d].sections ?? []),
                                ]
                                const copy = JSON.parse(
                                  JSON.stringify(secs[sectionIdx])
                                )
                                secs.splice(sectionIdx + 1, 0, copy)
                                weeks[w].days[d] = { ...day, sections: secs }
                                setStructure({ weeks })
                              }}
                            >
                              Duplicate
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="small"
                              className="text-red-600"
                              onClick={() => removeSection(w, d, sectionIdx)}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                      {(day.sections ?? []).length === 0 && (
                        <p className="text-sm text-gray-500 py-2">
                          No blocks. Click &quot;Add Block&quot; to add an
                          exercise or circuit block.
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    Changes auto-save. Use Update program to confirm.
                  </p>
                </div>
              )
            })()
          )}
          {previewSessionOpen &&
            sessionDesignerCell &&
            (() => {
              const day =
                structure.weeks[sessionDesignerCell.weekIdx]?.days?.[
                  sessionDesignerCell.dayIdx
                ]
              return (
                <Modal
                  visible={true}
                  title="Preview Session"
                  onClose={() => setPreviewSessionOpen(false)}
                  size="medium"
                  showCloseButton
                >
                  <div className="p-4 space-y-2">
                    <p className="font-medium">{day?.dayName || 'Session'}</p>
                    {day?.sessionNotes && (
                      <p className="text-sm text-gray-600">
                        {day.sessionNotes}
                      </p>
                    )}
                    {(day?.sections ?? []).map((s, i) => (
                      <div
                        key={i}
                        className="text-sm border-l-2 border-gray-200 pl-2"
                      >
                        {s.blockType === 'CIRCUIT'
                          ? 'Circuit'
                          : s.exercises
                              ?.map(e => getExerciseName(e.exerciseId))
                              .join(', ')}{' '}
                        {s.blockCategory && `· ${s.blockCategory}`}
                      </div>
                    ))}
                  </div>
                </Modal>
              )
            })()}

          {addBlockModalOpen && sessionDesignerCell && (
            <Modal
              visible={true}
              title="Add Block"
              onClose={() => {
                setAddBlockModalOpen(false)
                setAddBlockCircuitForm({
                  instructions: '',
                  resultTrackingType: '',
                  blockCategory: '',
                  conditioningFormat: '',
                  videoUrlsStr: '',
                })
              }}
              size="medium"
              showCloseButton
            >
              <div className="p-4 space-y-6">
                <div>
                  <Text
                    variant="default"
                    className="text-sm font-medium mb-2 block"
                  >
                    Exercise block
                  </Text>
                  <Dropdown
                    placeholder="Search and select exercise..."
                    searchable
                    searchPlaceholder="Search exercises..."
                    options={exerciseList.map(ex => ({
                      value: String(ex.id),
                      label: ex.name,
                    }))}
                    onValueChange={v => {
                      const id = Array.isArray(v) ? v[0] : v
                      if (!id) return
                      const ex = exerciseList.find(e => String(e.id) === id)
                      if (ex) {
                        addBlockAsExercise(
                          sessionDesignerCell.weekIdx,
                          sessionDesignerCell.dayIdx,
                          ex
                        )
                        setAddBlockModalOpen(false)
                      }
                    }}
                    fullWidth={false}
                    className="max-w-full"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    className="mt-2"
                    onClick={() => {
                      setNewExerciseModalOpen(true)
                    }}
                  >
                    New Exercise
                  </Button>
                </div>
                <hr className="border-gray-200" />
                <div>
                  <Text
                    variant="default"
                    className="text-sm font-medium mb-2 block"
                  >
                    Circuit block
                  </Text>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Instructions
                      </label>
                      <textarea
                        className="w-full min-h-[60px] rounded border border-gray-300 px-3 py-2 text-sm"
                        value={addBlockCircuitForm.instructions}
                        onChange={e =>
                          setAddBlockCircuitForm(f => ({
                            ...f,
                            instructions: e.target.value,
                          }))
                        }
                        placeholder="Free-form instructions"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Result tracking
                      </label>
                      <Input
                        value={addBlockCircuitForm.resultTrackingType}
                        onChange={e =>
                          setAddBlockCircuitForm(f => ({
                            ...f,
                            resultTrackingType: e.target.value,
                          }))
                        }
                        placeholder="e.g. Time, Rounds+Reps"
                        size="small"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Block category
                      </label>
                      <Input
                        value={addBlockCircuitForm.blockCategory}
                        onChange={e =>
                          setAddBlockCircuitForm(f => ({
                            ...f,
                            blockCategory: e.target.value,
                          }))
                        }
                        placeholder="e.g. Conditioning"
                        size="small"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Conditioning format
                      </label>
                      <Dropdown
                        placeholder="Select format"
                        value={addBlockCircuitForm.conditioningFormat}
                        onValueChange={v =>
                          setAddBlockCircuitForm(f => ({
                            ...f,
                            conditioningFormat:
                              (Array.isArray(v) ? v[0] : v) ?? '',
                          }))
                        }
                        options={[
                          { value: 'AMRAP', label: 'AMRAP' },
                          { value: 'EMOM', label: 'EMOM' },
                          { value: 'For Time', label: 'For Time' },
                          { value: 'Tabata', label: 'Tabata' },
                          {
                            value: 'Custom Interval',
                            label: 'Custom Interval',
                          },
                          { value: 'For Completion', label: 'For Completion' },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Video URLs (optional, comma-separated)
                      </label>
                      <Input
                        value={addBlockCircuitForm.videoUrlsStr}
                        onChange={e =>
                          setAddBlockCircuitForm(f => ({
                            ...f,
                            videoUrlsStr: e.target.value,
                          }))
                        }
                        placeholder="https://..."
                        size="small"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={() => {
                        addBlockAsCircuit(
                          sessionDesignerCell.weekIdx,
                          sessionDesignerCell.dayIdx,
                          addBlockCircuitForm
                        )
                        setAddBlockModalOpen(false)
                        setAddBlockCircuitForm({
                          instructions: '',
                          resultTrackingType: '',
                          blockCategory: '',
                          conditioningFormat: '',
                          videoUrlsStr: '',
                        })
                      }}
                    >
                      Add circuit block
                    </Button>
                  </div>
                </div>
              </div>
            </Modal>
          )}

          {newExerciseModalOpen && sessionDesignerCell && (
            <Modal
              visible={true}
              title="New Exercise"
              onClose={() => {
                setNewExerciseModalOpen(false)
                setNewExerciseForm({
                  name: '',
                  videoUrl: '',
                  defaultParameter1: 'Reps',
                  defaultParameter2: '-',
                  pointsOfPerformance: '',
                  tagsStr: '',
                })
              }}
              size="medium"
              showCloseButton
            >
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Title (required)
                  </label>
                  <Input
                    value={newExerciseForm.name}
                    onChange={e =>
                      setNewExerciseForm(f => ({ ...f, name: e.target.value }))
                    }
                    placeholder="e.g. Barbell Back Squat"
                    size="small"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Default Parameter 1
                    </label>
                    <Dropdown
                      placeholder="Select"
                      value={newExerciseForm.defaultParameter1 || undefined}
                      onValueChange={v =>
                        setNewExerciseForm(f => ({
                          ...f,
                          defaultParameter1:
                            (Array.isArray(v) ? v[0] : v) ?? '',
                        }))
                      }
                      options={DEFAULT_PARAMETER_OPTIONS.map(o => ({
                        value: o.value,
                        label: o.label,
                      }))}
                      size="small"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Default Parameter 2
                    </label>
                    <Dropdown
                      placeholder="— or —"
                      value={newExerciseForm.defaultParameter2 || undefined}
                      onValueChange={v =>
                        setNewExerciseForm(f => ({
                          ...f,
                          defaultParameter2:
                            (Array.isArray(v) ? v[0] : v) ?? '',
                        }))
                      }
                      options={PARAMETER_2_OPTIONS.map(o => ({
                        value: o.value,
                        label: o.label,
                      }))}
                      size="small"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Video URL (optional)
                  </label>
                  <Input
                    value={newExerciseForm.videoUrl}
                    onChange={e =>
                      setNewExerciseForm(f => ({
                        ...f,
                        videoUrl: e.target.value,
                      }))
                    }
                    placeholder="https://..."
                    size="small"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Points of Performance (optional)
                  </label>
                  <textarea
                    className="w-full min-h-[60px] rounded border border-gray-300 px-3 py-2 text-sm"
                    value={newExerciseForm.pointsOfPerformance}
                    onChange={e =>
                      setNewExerciseForm(f => ({
                        ...f,
                        pointsOfPerformance: e.target.value.slice(0, 10000),
                      }))
                    }
                    placeholder="Coaching cues..."
                    maxLength={10000}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Tags (comma-separated)
                  </label>
                  <Input
                    value={newExerciseForm.tagsStr}
                    onChange={e =>
                      setNewExerciseForm(f => ({
                        ...f,
                        tagsStr: e.target.value,
                      }))
                    }
                    placeholder="e.g. lower, compound"
                    size="small"
                  />
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="small"
                  disabled={newExerciseSaving || !newExerciseForm.name.trim()}
                  onClick={async () => {
                    if (!newExerciseForm.name.trim()) return
                    setNewExerciseSaving(true)
                    try {
                      const tags = newExerciseForm.tagsStr
                        .split(',')
                        .map(t => t.trim())
                        .filter(Boolean)
                      const res = await exerciseService.create({
                        name: newExerciseForm.name.trim(),
                        videoUrl: newExerciseForm.videoUrl.trim() || undefined,
                        defaultParameter1:
                          newExerciseForm.defaultParameter1 || undefined,
                        defaultParameter2:
                          newExerciseForm.defaultParameter2 === '-'
                            ? undefined
                            : newExerciseForm.defaultParameter2 || undefined,
                        pointsOfPerformance:
                          newExerciseForm.pointsOfPerformance.trim() ||
                          undefined,
                        tags: tags.length ? tags : undefined,
                        isActive: true,
                      })
                      const data = res.data?.data
                      if (data?.id != null) {
                        await fetchExercises()
                        const newEx: ExerciseListForBuilderItem = {
                          id: data.id,
                          name: data.name ?? newExerciseForm.name.trim(),
                        }
                        addBlockAsExercise(
                          sessionDesignerCell.weekIdx,
                          sessionDesignerCell.dayIdx,
                          newEx
                        )
                        showSuccess('Exercise created and added to session')
                        setNewExerciseModalOpen(false)
                        setAddBlockModalOpen(false)
                        setNewExerciseForm({
                          name: '',
                          videoUrl: '',
                          defaultParameter1: 'Reps',
                          defaultParameter2: '-',
                          pointsOfPerformance: '',
                          tagsStr: '',
                        })
                      }
                    } catch (err) {
                      const e = err as AxiosError<{ message?: string }>
                      showError(
                        e.response?.data?.message ?? 'Failed to create exercise'
                      )
                    } finally {
                      setNewExerciseSaving(false)
                    }
                  }}
                >
                  {newExerciseSaving
                    ? 'Creating...'
                    : 'Create and add to session'}
                </Button>
              </div>
            </Modal>
          )}
        </div>
      )}

      {(!program || builderView === 'structure') &&
        structure.weeks.map((week, weekIdx) => (
          <div
            key={weekIdx}
            className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm"
          >
            {/* Week header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
              <Text variant="default" className="font-semibold text-base">
                Week {week.weekIndex}
              </Text>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => addDay(weekIdx)}
                  leftIcon={<Icon name="plus" family="solid" size={12} />}
                  disabled={(week.days?.length ?? 0) >= 7}
                  title={
                    (week.days?.length ?? 0) >= 7
                      ? 'Week is full (7 days). Add a new week to add more days.'
                      : undefined
                  }
                >
                  Add day
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  onClick={() => removeWeek(weekIdx)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Remove week
                </Button>
              </div>
            </div>

            <div className="p-4 space-y-4">
              {week.days.map((day, dayIdx) => (
                <div
                  key={dayIdx}
                  className="rounded-lg border border-gray-200 bg-gray-50/50 overflow-hidden"
                >
                  {/* Day header */}
                  <div className="flex items-center gap-3 flex-wrap px-4 py-3 bg-white border-b border-gray-100">
                    <input
                      type="checkbox"
                      id={`rest-${weekIdx}-${dayIdx}`}
                      checked={day.isRestDay ?? false}
                      onChange={e =>
                        setRestDay(weekIdx, dayIdx, e.target.checked)
                      }
                      className="rounded border-gray-300"
                    />
                    <label
                      htmlFor={`rest-${weekIdx}-${dayIdx}`}
                      className="text-sm font-medium text-gray-700"
                    >
                      Rest day
                    </label>
                    {!(day.isRestDay ?? false) && (
                      <>
                        {isAmberCycle ? (
                          <div className="flex flex-col gap-1">
                            <label
                              htmlFor={`amber-date-${weekIdx}-${dayIdx}`}
                              className="text-xs font-medium text-gray-600"
                            >
                              Date
                            </label>
                            <input
                              id={`amber-date-${weekIdx}-${dayIdx}`}
                              type="date"
                              className="max-w-[180px] rounded border border-gray-300 px-3 py-2 text-sm"
                              value={
                                /^\d{4}-\d{2}-\d{2}$/.test(
                                  String(day.dayName ?? '').trim()
                                )
                                  ? (day.dayName as string)
                                  : ''
                              }
                              onChange={e => {
                                const weeks = [...structure.weeks]
                                const d = {
                                  ...weeks[weekIdx].days[dayIdx],
                                  dayName: e.target.value || '',
                                }
                                weeks[weekIdx].days[dayIdx] = d
                                setStructure({ weeks })
                              }}
                            />
                          </div>
                        ) : (
                          <Input
                            className="max-w-[160px]"
                            value={day.dayName ?? ''}
                            onChange={e => {
                              const weeks = [...structure.weeks]
                              const d = {
                                ...weeks[weekIdx].days[dayIdx],
                                dayName: e.target.value,
                              }
                              weeks[weekIdx].days[dayIdx] = d
                              setStructure({ weeks })
                            }}
                            placeholder="Day name (e.g. Day 1)"
                          />
                        )}
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          onClick={() => addSection(weekIdx, dayIdx)}
                          leftIcon={
                            <Icon name="plus" family="solid" size={12} />
                          }
                        >
                          Add section
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="small"
                          onClick={() => removeDay(weekIdx, dayIdx)}
                          className="ml-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          Remove day
                        </Button>
                      </>
                    )}
                  </div>

                  {/* Day content: sections */}
                  {!(day.isRestDay ?? false) && (
                    <div className="p-4 space-y-4">
                      {(day.sections ?? []).length === 0 ? (
                        <div className="text-center py-6 rounded-lg border border-dashed border-gray-200 bg-white">
                          <Text variant="secondary" className="text-sm">
                            No sections yet. Click &quot;Add section&quot; above
                            to add a workout section.
                          </Text>
                        </div>
                      ) : (
                        (day.sections ?? []).map((section, sectionIdx) => (
                          <div
                            key={sectionIdx}
                            className="rounded-lg border border-gray-200 bg-white p-4 space-y-4"
                          >
                            <div className="flex items-start justify-between gap-3 flex-wrap">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Text
                                  variant="secondary"
                                  className="text-xs font-medium uppercase tracking-wide"
                                >
                                  Section {sectionIdx + 1}
                                </Text>
                                <Dropdown
                                  value={section.sectionType ?? 'normal'}
                                  onValueChange={v => {
                                    const val = Array.isArray(v)
                                      ? (v[0] ?? '')
                                      : (v ?? '')
                                    const sectionType =
                                      val as ProgramStructureSection['sectionType']
                                    const weeks = [...structure.weeks]
                                    const s: ProgramStructureSection = {
                                      ...weeks[weekIdx].days[dayIdx].sections![
                                        sectionIdx
                                      ],
                                      sectionType,
                                    }
                                    weeks[weekIdx].days[dayIdx].sections![
                                      sectionIdx
                                    ] = s
                                    setStructure({ weeks })
                                  }}
                                  options={SECTION_TYPES}
                                  fullWidth={false}
                                  className="max-w-[140px]"
                                />
                                <Input
                                  className="max-w-[180px]"
                                  value={section.name ?? ''}
                                  onChange={e => {
                                    const weeks = [...structure.weeks]
                                    const s = {
                                      ...weeks[weekIdx].days[dayIdx].sections![
                                        sectionIdx
                                      ],
                                      name: e.target.value,
                                    }
                                    weeks[weekIdx].days[dayIdx].sections![
                                      sectionIdx
                                    ] = s
                                    setStructure({ weeks })
                                  }}
                                  placeholder="Section name *"
                                />
                                <Dropdown
                                  value={
                                    (section as { blockType?: string })
                                      .blockType ?? 'EXERCISE'
                                  }
                                  onValueChange={v => {
                                    const val = ((Array.isArray(v)
                                      ? v[0]
                                      : v) ??
                                      'EXERCISE') as ProgramStructureSection['blockType']
                                    const weeks = [...structure.weeks]
                                    const s: ProgramStructureSection = {
                                      ...weeks[weekIdx].days[dayIdx].sections![
                                        sectionIdx
                                      ],
                                      blockType: val,
                                    }
                                    weeks[weekIdx].days[dayIdx].sections![
                                      sectionIdx
                                    ] = s
                                    setStructure({ weeks })
                                  }}
                                  options={BLOCK_TYPES}
                                  className="max-w-[120px]"
                                />
                                <Input
                                  className="max-w-[140px]"
                                  value={
                                    (section as { blockCategory?: string })
                                      .blockCategory ?? ''
                                  }
                                  onChange={e => {
                                    const weeks = [...structure.weeks]
                                    const s = {
                                      ...weeks[weekIdx].days[dayIdx].sections![
                                        sectionIdx
                                      ],
                                      blockCategory:
                                        e.target.value || undefined,
                                    }
                                    weeks[weekIdx].days[dayIdx].sections![
                                      sectionIdx
                                    ] = s
                                    setStructure({ weeks })
                                  }}
                                  placeholder="Block category"
                                />
                              </div>
                              {(section as { blockType?: string }).blockType ===
                                'CIRCUIT' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 pl-2 border-l-2 border-gray-100">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Instructions
                                    </label>
                                    <textarea
                                      className="w-full min-h-[60px] rounded border border-gray-300 px-3 py-2 text-sm"
                                      value={
                                        (section as { instructions?: string })
                                          .instructions ?? ''
                                      }
                                      onChange={e => {
                                        const weeks = [...structure.weeks]
                                        const s = {
                                          ...weeks[weekIdx].days[dayIdx]
                                            .sections![sectionIdx],
                                          instructions:
                                            e.target.value || undefined,
                                        }
                                        weeks[weekIdx].days[dayIdx].sections![
                                          sectionIdx
                                        ] = s
                                        setStructure({ weeks })
                                      }}
                                      placeholder="Free-form instructions"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Result tracking
                                    </label>
                                    <Input
                                      size="small"
                                      value={
                                        (
                                          section as {
                                            resultTrackingType?: string
                                          }
                                        ).resultTrackingType ?? ''
                                      }
                                      onChange={e => {
                                        const weeks = [...structure.weeks]
                                        const s = {
                                          ...weeks[weekIdx].days[dayIdx]
                                            .sections![sectionIdx],
                                          resultTrackingType:
                                            e.target.value || undefined,
                                        }
                                        weeks[weekIdx].days[dayIdx].sections![
                                          sectionIdx
                                        ] = s
                                        setStructure({ weeks })
                                      }}
                                      placeholder="e.g. Time, Rounds+Reps"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Conditioning format
                                    </label>
                                    <Dropdown
                                      placeholder="Format"
                                      value={
                                        (
                                          section as {
                                            conditioningFormat?: string
                                          }
                                        ).conditioningFormat ?? ''
                                      }
                                      onValueChange={v => {
                                        const weeks = [...structure.weeks]
                                        const s = {
                                          ...weeks[weekIdx].days[dayIdx]
                                            .sections![sectionIdx],
                                          conditioningFormat:
                                            (Array.isArray(v) ? v[0] : v) ??
                                            undefined,
                                        }
                                        weeks[weekIdx].days[dayIdx].sections![
                                          sectionIdx
                                        ] = s
                                        setStructure({ weeks })
                                      }}
                                      options={[
                                        { value: 'AMRAP', label: 'AMRAP' },
                                        { value: 'EMOM', label: 'EMOM' },
                                        {
                                          value: 'For Time',
                                          label: 'For Time',
                                        },
                                        { value: 'Tabata', label: 'Tabata' },
                                        {
                                          value: 'Custom Interval',
                                          label: 'Custom Interval',
                                        },
                                        {
                                          value: 'For Completion',
                                          label: 'For Completion',
                                        },
                                      ]}
                                    />
                                  </div>
                                </div>
                              )}
                              <Button
                                type="button"
                                variant="ghost"
                                size="small"
                                onClick={() =>
                                  removeSection(weekIdx, dayIdx, sectionIdx)
                                }
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                Remove section
                              </Button>
                            </div>

                            {/* Exercises in this section */}
                            <div className="space-y-3">
                              <Text
                                variant="default"
                                className="text-sm font-medium block"
                              >
                                Exercises in this section
                                {(section.exercises?.length ?? 0) > 0 &&
                                  ` (${section.exercises?.length})`}
                              </Text>

                              {/* Add exercise - searchable Dropdown */}
                              <Dropdown
                                placeholder="Search and select exercise..."
                                emptyMessage="please add exercises first"
                                searchable
                                searchPlaceholder="Search exercises..."
                                value={
                                  addExerciseValue[
                                    `${weekIdx}-${dayIdx}-${sectionIdx}`
                                  ] ?? ''
                                }
                                onValueChange={v => {
                                  const val = Array.isArray(v)
                                    ? (v[0] ?? '')
                                    : (v ?? '')
                                  if (!val) return
                                  const ex = exerciseList.find(
                                    e => String(e.id) === val
                                  )
                                  if (ex) {
                                    addExerciseToSection(
                                      weekIdx,
                                      dayIdx,
                                      sectionIdx,
                                      ex
                                    )
                                    setAddExerciseValue(prev => ({
                                      ...prev,
                                      [`${weekIdx}-${dayIdx}-${sectionIdx}`]:
                                        '',
                                    }))
                                  }
                                }}
                                options={exerciseList.map(ex => ({
                                  value: String(ex.id),
                                  label: ex.name,
                                }))}
                                fullWidth={false}
                                className="max-w-[280px]"
                              />

                              {/* Listed exercises */}
                              <div className="flex flex-col gap-4">
                                {(section.exercises ?? []).map((ex, exIdx) => (
                                  <div
                                    key={exIdx}
                                    className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-2"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <Text
                                        variant="default"
                                        className="font-medium text-sm"
                                      >
                                        {getExerciseName(ex.exerciseId)}
                                      </Text>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="small"
                                        onClick={() =>
                                          removeSectionExercise(
                                            weekIdx,
                                            dayIdx,
                                            sectionIdx,
                                            exIdx
                                          )
                                        }
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 shrink-0"
                                        aria-label="Remove exercise"
                                      >
                                        ×
                                      </Button>
                                    </div>
                                    <div className="flex flex-wrap items-end gap-4">
                                      <div className="flex flex-col gap-1">
                                        <label
                                          htmlFor={`sets-${weekIdx}-${dayIdx}-${sectionIdx}-${exIdx}`}
                                          className="text-xs font-medium text-gray-600"
                                        >
                                          Sets
                                        </label>
                                        <Input
                                          id={`sets-${weekIdx}-${dayIdx}-${sectionIdx}-${exIdx}`}
                                          type="number"
                                          className="w-16 text-sm"
                                          placeholder="—"
                                          value={ex.sets ?? ''}
                                          onChange={e =>
                                            updateSectionExercise(
                                              weekIdx,
                                              dayIdx,
                                              sectionIdx,
                                              exIdx,
                                              {
                                                sets: e.target.value
                                                  ? Number(e.target.value)
                                                  : undefined,
                                              }
                                            )
                                          }
                                        />
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <label
                                          htmlFor={`reps-${weekIdx}-${dayIdx}-${sectionIdx}-${exIdx}`}
                                          className="text-xs font-medium text-gray-600"
                                        >
                                          Reps
                                        </label>
                                        <Input
                                          id={`reps-${weekIdx}-${dayIdx}-${sectionIdx}-${exIdx}`}
                                          type="number"
                                          className="w-16 text-sm"
                                          placeholder="—"
                                          value={ex.reps ?? ''}
                                          onChange={e =>
                                            updateSectionExercise(
                                              weekIdx,
                                              dayIdx,
                                              sectionIdx,
                                              exIdx,
                                              {
                                                reps: e.target.value
                                                  ? Number(e.target.value)
                                                  : undefined,
                                              }
                                            )
                                          }
                                        />
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <label
                                          htmlFor={`rpe-${weekIdx}-${dayIdx}-${sectionIdx}-${exIdx}`}
                                          className="text-xs font-medium text-gray-600"
                                        >
                                          RPE
                                        </label>
                                        <Input
                                          id={`rpe-${weekIdx}-${dayIdx}-${sectionIdx}-${exIdx}`}
                                          type="number"
                                          className="w-16 text-sm"
                                          placeholder="—"
                                          value={ex.rpe ?? ''}
                                          onChange={e =>
                                            updateSectionExercise(
                                              weekIdx,
                                              dayIdx,
                                              sectionIdx,
                                              exIdx,
                                              {
                                                rpe: e.target.value
                                                  ? Number(e.target.value)
                                                  : undefined,
                                              }
                                            )
                                          }
                                        />
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <label
                                          htmlFor={`rest-${weekIdx}-${dayIdx}-${sectionIdx}-${exIdx}`}
                                          className="text-xs font-medium text-gray-600"
                                        >
                                          Rest
                                        </label>
                                        <Input
                                          id={`rest-${weekIdx}-${dayIdx}-${sectionIdx}-${exIdx}`}
                                          className="w-20 text-sm"
                                          placeholder="e.g. 60s"
                                          value={ex.rest ?? ''}
                                          onChange={e =>
                                            updateSectionExercise(
                                              weekIdx,
                                              dayIdx,
                                              sectionIdx,
                                              exIdx,
                                              { rest: e.target.value }
                                            )
                                          }
                                        />
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={saving}
        >
          {saving ? 'Saving...' : program ? 'Update program' : 'Create program'}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
