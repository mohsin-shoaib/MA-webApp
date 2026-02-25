import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
import { Icon } from '@/components/Icon'
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
import { AxiosError } from 'axios'

const SECTION_TYPES = [
  { value: 'normal', label: 'Normal' },
  { value: 'superset', label: 'Superset' },
  { value: 'circuit', label: 'Circuit' },
  { value: 'AMRAP', label: 'AMRAP' },
  { value: 'EMOM', label: 'EMOM' },
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
    day.sections.push({ sectionType: 'normal', exercises: [] })
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
    if (!hasContent) {
      showError('Add at least one exercise to the program')
      return
    }
    const sectionMissingName = structure.weeks.some(w =>
      w.days.some(
        d =>
          !d.isRestDay &&
          (d.sections ?? []).some(s => !s.name || !String(s.name).trim())
      )
    )
    if (sectionMissingName) {
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
        await programService.create({
          program_name: name.trim(),
          program_description: description.trim(),
          cycleId,
          category: category || null,
          subCategory: subCategory || null,
          isActive,
          programStructure: structure,
        })
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

      <div className="flex items-center justify-between gap-4">
        <div>
          <Text as="h2" variant="primary" className="text-lg font-semibold">
            Program structure
          </Text>
          <Text variant="secondary" className="text-sm mt-0.5">
            Build your program: add weeks → days → sections → then add exercises
            to each section
          </Text>
        </div>
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

      {structure.weeks.map((week, weekIdx) => (
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
                        leftIcon={<Icon name="plus" family="solid" size={12} />}
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
                            </div>
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
                                    [`${weekIdx}-${dayIdx}-${sectionIdx}`]: '',
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
