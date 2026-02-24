import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
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
import type { GoalType } from '@/types/goal-type'
import type { Category } from '@/types/goal-type'
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
  const [searchExercise, setSearchExercise] = useState('')
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

  useEffect(() => {
    const t = setTimeout(() => fetchExercises(searchExercise || undefined), 200)
    return () => clearTimeout(t)
  }, [searchExercise, fetchExercises])

  const cycle = cycles.find(c => c.id === cycleId)
  const showCategory = cycle?.name === 'Red' || cycle?.name === 'Green'
  const categoryOptions = goalTypes
    .filter(g => g.category === category)
    .map(g => ({ value: g.subCategory, label: g.subCategory }))
  const categoryLabels = [...new Set(goalTypes.map(g => g.category))]
    .filter((c): c is Category => Boolean(c))
    .map(c => ({ value: c, label: c }))

  const addWeek = () => {
    const nextWeek = structure.weeks.length + 1
    setStructure({
      weeks: [
        ...structure.weeks,
        {
          weekIndex: nextWeek,
          weekName: `Week ${nextWeek}`,
          days: [
            {
              dayIndex: 0,
              dayName: 'Day 1',
              sections: [{ sectionType: 'normal', exercises: [] }],
            },
          ],
        },
      ],
    })
  }

  const addDay = (weekIdx: number) => {
    const weeks = [...structure.weeks]
    const week = { ...weeks[weekIdx], days: [...weeks[weekIdx].days] }
    const nextDayIdx = week.days.length
    week.days.push({
      dayIndex: nextDayIdx,
      dayName: `Day ${nextDayIdx + 1}`,
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
      showError('Category and goal are required for this cycle')
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
              Category
            </Text>
            <Dropdown
              value={category}
              onValueChange={v => {
                const s = Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
                setCategory(s)
                setSubCategory('')
              }}
              options={categoryLabels}
              placeholder="Category"
            />
          </div>
          <div>
            <Text variant="default" className="text-sm font-medium mb-1 block">
              Goal
            </Text>
            <Dropdown
              value={subCategory}
              onValueChange={v => {
                const s = Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
                setSubCategory(s)
              }}
              options={categoryOptions}
              placeholder="Goal"
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

      <hr />

      <div className="flex items-center justify-between">
        <Text as="h2" variant="primary" className="text-lg font-semibold">
          Program structure: Weeks → Days → Sections → Exercises
        </Text>
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={addWeek}
        >
          + Add week
        </Button>
      </div>

      {structure.weeks.map((week, weekIdx) => (
        <div
          key={weekIdx}
          className="border border-gray-200 rounded-lg p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <Text variant="default" className="font-medium">
              Week {week.weekIndex}
            </Text>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="small"
                onClick={() => addDay(weekIdx)}
              >
                + Day
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="small"
                onClick={() => removeWeek(weekIdx)}
              >
                Remove week
              </Button>
            </div>
          </div>
          {week.days.map((day, dayIdx) => (
            <div
              key={dayIdx}
              className="pl-4 border-l-2 border-gray-100 space-y-2"
            >
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="checkbox"
                  id={`rest-${weekIdx}-${dayIdx}`}
                  checked={day.isRestDay ?? false}
                  onChange={e => setRestDay(weekIdx, dayIdx, e.target.checked)}
                />
                <label
                  htmlFor={`rest-${weekIdx}-${dayIdx}`}
                  className="text-sm"
                >
                  Rest day
                </label>
                {!(day.isRestDay ?? false) && (
                  <>
                    <Input
                      className="max-w-[140px]"
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
                      placeholder="Day name"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      onClick={() => addSection(weekIdx, dayIdx)}
                    >
                      + Section
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      onClick={() => removeDay(weekIdx, dayIdx)}
                    >
                      Remove day
                    </Button>
                  </>
                )}
              </div>
              {!(day.isRestDay ?? false) &&
                (day.sections ?? []).map((section, sectionIdx) => (
                  <div
                    key={sectionIdx}
                    className="pl-4 space-y-2 bg-gray-50 rounded p-2"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <select
                        className="rounded border border-gray-300 px-2 py-1 text-sm"
                        value={section.sectionType ?? 'normal'}
                        onChange={e => {
                          const weeks = [...structure.weeks]
                          const sectionType = e.target
                            .value as ProgramStructureSection['sectionType']
                          const s: ProgramStructureSection = {
                            ...weeks[weekIdx].days[dayIdx].sections![
                              sectionIdx
                            ],
                            sectionType,
                          }
                          weeks[weekIdx].days[dayIdx].sections![sectionIdx] = s
                          setStructure({ weeks })
                        }}
                      >
                        {SECTION_TYPES.map(st => (
                          <option key={st.value} value={st.value}>
                            {st.label}
                          </option>
                        ))}
                      </select>
                      <Input
                        className="max-w-[160px]"
                        value={section.name ?? ''}
                        onChange={e => {
                          const weeks = [...structure.weeks]
                          const s = {
                            ...weeks[weekIdx].days[dayIdx].sections![
                              sectionIdx
                            ],
                            name: e.target.value,
                          }
                          weeks[weekIdx].days[dayIdx].sections![sectionIdx] = s
                          setStructure({ weeks })
                        }}
                        placeholder="Section name"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="small"
                        onClick={() =>
                          removeSection(weekIdx, dayIdx, sectionIdx)
                        }
                      >
                        Remove section
                      </Button>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                      <Text variant="secondary" className="text-xs">
                        Add exercise:
                      </Text>
                      <Input
                        className="max-w-[180px]"
                        placeholder="Search exercises..."
                        value={searchExercise}
                        onChange={e => setSearchExercise(e.target.value)}
                      />
                      <div className="flex flex-wrap gap-1">
                        {exerciseList.slice(0, 8).map(ex => (
                          <Button
                            key={ex.id}
                            type="button"
                            variant="secondary"
                            size="small"
                            onClick={() =>
                              addExerciseToSection(
                                weekIdx,
                                dayIdx,
                                sectionIdx,
                                ex
                              )
                            }
                          >
                            {ex.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                    {(section.exercises ?? []).map((ex, exIdx) => (
                      <div
                        key={exIdx}
                        className="flex flex-wrap items-center gap-2 text-sm"
                      >
                        <span className="font-medium">
                          {getExerciseName(ex.exerciseId)}
                        </span>
                        <Input
                          type="number"
                          className="w-16"
                          placeholder="Sets"
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
                        <Input
                          type="number"
                          className="w-16"
                          placeholder="Reps"
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
                        <Input
                          className="w-20"
                          placeholder="RPE"
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
                        <Input
                          className="w-20"
                          placeholder="Rest"
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
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                ))}
            </div>
          ))}
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
