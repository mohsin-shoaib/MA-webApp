import { useState, useEffect, useCallback, useRef } from 'react'
import type { MouseEvent, DragEvent } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { libraryService } from '@/api/library.service'
import { LibraryDrawer } from '@/components/Program/LibraryDrawer'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type {
  Program,
  ProgramStructure,
  ProgramStructureDay,
  ProgramStructureSection,
} from '@/types/program'
import type { Cycle } from '@/types/cycle'
import type { GoalType, Category } from '@/types/goal-type'
import { CATEGORY_LABELS } from '@/types/goal-type'
import type { ExerciseListForBuilderItem } from '@/types/exercise'
import {
  DEFAULT_PARAMETER_OPTIONS,
  PARAMETER_2_OPTIONS,
} from '@/types/exercise'
import { AxiosError } from 'axios'

/** MASS 2.6: Block category options (organizational label) */
const BLOCK_CATEGORY_OPTIONS = [
  { value: '', label: 'Uncategorized' },
  { value: 'Prep', label: 'Prep' },
  { value: 'Speed/Agility', label: 'Speed/Agility' },
  { value: 'Skill/Tech', label: 'Skill/Tech' },
  { value: 'Strength/Power', label: 'Strength/Power' },
  { value: 'Conditioning', label: 'Conditioning' },
  { value: 'Recovery', label: 'Recovery' },
]

/** MASS 2.7: Conditioning format options for circuit blocks */
const CONDITIONING_FORMAT_OPTIONS = [
  { value: '', label: 'For Completion (no timer)' },
  { value: 'AMRAP', label: 'AMRAP' },
  { value: 'EMOM', label: 'EMOM' },
  { value: 'For Time', label: 'For Time' },
  { value: 'Tabata', label: 'Tabata' },
  { value: 'Custom Interval', label: 'Custom Interval' },
]

/** Map cycle name to API cycle type (reduces nested ternary). */
function getCycleTypeFromName(
  cycleName: string | undefined
): 'RED' | 'AMBER' | 'GREEN' | 'SUSTAINMENT' | 'CUSTOM' {
  switch (cycleName) {
    case 'Red':
      return 'RED'
    case 'Amber':
      return 'AMBER'
    case 'Green':
      return 'GREEN'
    case 'Sustainment':
      return 'SUSTAINMENT'
    case 'Custom':
      return 'CUSTOM'
    default:
      return 'RED'
  }
}

/** Format set×reps for display (reduces nested ternary). */
function formatSetReps(ex: { sets?: number; reps?: number }): string | null {
  if (ex.sets != null && ex.reps != null) return `${ex.sets}×${ex.reps}`
  if (ex.sets != null) return `${ex.sets} sets`
  return null
}

/** Block display name for session summary (reduces nested ternary). */
function getBlockDisplayName(
  section: ProgramStructureSection,
  getExerciseName: (id: number) => string
): string {
  if (section.blockType === 'CIRCUIT') return section.name || 'Circuit'
  const first = section.exercises?.[0]
  return first ? getExerciseName(first.exerciseId) : section.name || 'Block'
}

/** Returns true if structure has at least one non-rest day with a block that has exercises (for submit validation). */
function structureHasContent(structure: ProgramStructure): boolean {
  for (const w of structure.weeks) {
    for (const d of w.days ?? []) {
      if (d.isRestDay === true) continue
      const sections = d.sections ?? []
      if (sections.length === 0) continue
      const hasExercises = sections.some(s => (s.exercises?.length ?? 0) > 0)
      if (hasExercises) return true
    }
  }
  return false
}

/** Returns true if any non-rest day has a block with empty name (for submit validation). */
function structureHasBlockMissingName(structure: ProgramStructure): boolean {
  for (const w of structure.weeks) {
    for (const d of w.days ?? []) {
      if (d.isRestDay === true) continue
      const sections = d.sections ?? []
      for (const s of sections) {
        if ((s.name?.trim()?.length ?? 0) === 0) return true
      }
    }
  }
  return false
}

/** Compute calendar cell summary (exercise names, set counts, block categories) to reduce complexity in map. */
function getCellSummary(
  sections: ProgramStructureSection[],
  getExerciseName: (id: number) => string
): { exerciseNames: string[]; setCounts: string[]; blockCategories: string[] } {
  const exerciseNames = sections
    .flatMap(sec =>
      (sec.exercises ?? []).map(ex => getExerciseName(ex.exerciseId))
    )
    .slice(0, 3)
  const setCounts = sections
    .flatMap(sec =>
      (sec.exercises ?? [])
        .map(ex => formatSetReps({ sets: ex.sets, reps: ex.reps }))
        .filter((x): x is string => x != null)
    )
    .slice(0, 3)
  const blockCategories = [
    ...new Set(sections.map(s => s.blockCategory).filter(Boolean)),
  ] as string[]
  return { exerciseNames, setCounts, blockCategories }
}

/** Calendar day cell (extracted to reduce cognitive complexity of parent map). */
function CalendarDayCell(
  props: Readonly<{
    weekIdx: number
    dayIdx: number
    day: ProgramStructureDay | undefined
    week: ProgramStructure['weeks'][number]
    isSelected: boolean
    isDragging: boolean
    program: ProgramBuilderFormProps['program']
    exerciseNames: string[]
    setCounts: string[]
    blockCategories: string[]
    blockCount: number
    onMouseEnter: (e: MouseEvent<HTMLTableCellElement>) => void
    onMouseLeave: () => void
    onDragOver: (e: DragEvent<HTMLTableCellElement>) => void
    onDrop: (e: DragEvent<HTMLTableCellElement>) => void
    onDragStart: (e: DragEvent<HTMLButtonElement>) => void
    onDragEnd: () => void
    onMouseDown: () => void
    onClick: () => void
    onContextMenu: (e: MouseEvent<HTMLElement>) => void
    onAddDay: () => void
  }>
) {
  const {
    weekIdx,
    dayIdx,
    day,
    week,
    isSelected,
    isDragging,
    program,
    exerciseNames,
    setCounts,
    blockCategories,
    blockCount,
    onMouseEnter,
    onMouseLeave,
    onDragOver,
    onDrop,
    onDragStart,
    onDragEnd,
    onMouseDown,
    onClick,
    onContextMenu,
    onAddDay,
  } = props
  const isRest = day?.isRestDay ?? false
  const canMoveSession = day?.id != null && week.id != null

  const borderStyle =
    program && !program.isPublished
      ? 'border-dashed border-gray-300'
      : 'border-transparent'
  const selectedStyle = isSelected
    ? 'border-[#3AB8ED] bg-blue-100 ring-2 ring-[#3AB8ED] ring-offset-1'
    : 'hover:border-[#3AB8ED] hover:bg-blue-50/50'
  const dragStyle = isDragging ? 'opacity-50 ring-2 ring-primary-400' : ''
  const emptyCellSelectedStyle = isSelected
    ? 'border-[#3AB8ED] bg-blue-100 ring-2 ring-[#3AB8ED] ring-offset-1 text-[#3AB8ED]'
    : 'border-dashed border-gray-300 text-gray-500 hover:border-[#3AB8ED] hover:text-[#3AB8ED]'

  const buttonClass = day
    ? `w-full min-h-[80px] rounded-lg border-2 p-2 text-left transition-colors ${dragStyle} ${borderStyle} ${selectedStyle}`
    : `w-full min-h-[80px] rounded-lg border flex items-center justify-center text-sm ${emptyCellSelectedStyle}`

  const dayCellContent = isRest ? (
    <span className="text-xs text-gray-500 font-medium">Rest</span>
  ) : (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-medium text-gray-900 truncate">
          {day?.dayName || `Day ${dayIdx + 1}`}
        </span>
        {program && (
          <span
            className={
              program.isPublished
                ? 'text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700'
                : 'text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700'
            }
          >
            {program.isPublished ? 'Published' : 'Draft'}
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
      {(setCounts.length > 0 || blockCategories.length > 0) && (
        <div className="text-[11px] text-gray-500 mt-0.5">
          {setCounts.length > 0 && setCounts.join(', ')}
          {setCounts.length > 0 && blockCategories.length > 0 && ' · '}
          {blockCategories.length > 0 && blockCategories.join(', ')}
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
  )

  return (
    <td
      className="border border-gray-200 p-1 align-top"
      data-week-idx={weekIdx}
      data-day-idx={dayIdx}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      {day ? (
        <button
          type="button"
          draggable={canMoveSession}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onMouseDown={onMouseDown}
          onClick={onClick}
          onContextMenu={onContextMenu}
          className={buttonClass}
        >
          {dayCellContent}
        </button>
      ) : (
        <button
          type="button"
          onMouseDown={onMouseDown}
          onClick={onAddDay}
          onContextMenu={onContextMenu}
          className={buttonClass}
        >
          + Add Session
        </button>
      )}
    </td>
  )
}

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
    /** MASS 2.1: from getProgramById */
    durationWeeks?: number | null
    sessionsPerWeek?: number | null
    programStructure?: ProgramStructure | null
  }
  /** Called after save. When creating, receives the created program so parent can open edit (Calendar). */
  onSuccess?: (createdProgram?: Program | null) => void
  onCancel?: () => void
}

/** Main program builder: metadata, calendar grid, session designer, modals. Complexity is inherent to the single-form UX; sub-views are extracted where possible (e.g. CalendarDayCell). */
export function ProgramBuilderForm({
  initialCycleId,
  program,
  onSuccess,
  onCancel,
}: Readonly<ProgramBuilderFormProps>) {
  const navigate = useNavigate()
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [goalTypes, setGoalTypes] = useState<GoalType[]>([])
  const [exerciseList, setExerciseList] = useState<
    ExerciseListForBuilderItem[]
  >([])
  const [saving, setSaving] = useState(false)
  const { showError, showSuccess } = useSnackbar()

  const [name, setName] = useState(program?.name ?? '')
  const [description, setDescription] = useState(program?.description ?? '')
  const [cycleId, setCycleId] = useState(
    program?.cycleId ?? initialCycleId ?? 0
  )
  const [category, setCategory] = useState(program?.category ?? '')
  const [subCategory, setSubCategory] = useState(program?.subCategory ?? '')
  /** 3.4 Sustainment: Constraint category for Sustainment Library (Travel, Limited Equipment, Rehab, Time, Deployed). */
  const [constraintCategory, setConstraintCategory] = useState(
    (program as { constraintCategory?: string | null })?.constraintCategory ??
      ''
  )
  const [isActive, setIsActive] = useState(program?.isActive ?? true)
  /** MASS 2.1: Published on create (optional; admin can publish later) */
  const [isPublished, setIsPublished] = useState(program?.isPublished ?? false)
  /** MASS 2.1: Number of weeks (required at creation); pre-generates that many empty week rows */
  const [numberOfWeeks, setNumberOfWeeks] = useState(
    program?.programStructure?.weeks?.length ?? 4
  )
  /** 3.3 Green: Duration in weeks for event-aligned scheduling. Green start = event date − durationWeeks. */
  const [durationWeeks, setDurationWeeks] = useState<number>(() => {
    const p = program as { durationWeeks?: number | null } | undefined
    if (p?.durationWeeks != null) return p.durationWeeks
    return program?.programStructure?.weeks?.length ?? 12
  })
  /** MASS 2.8: Selected cell for Session Designer (Level 2) { weekIdx, dayIdx } */
  const [sessionDesignerCell, setSessionDesignerCell] = useState<{
    weekIdx: number
    dayIdx: number
  } | null>(null)
  const [previewSessionOpen, setPreviewSessionOpen] = useState(false)
  const [addBlockModalOpen, setAddBlockModalOpen] = useState(false)
  const [addBlockExerciseCategory, setAddBlockExerciseCategory] = useState('')
  const [addBlockCircuitForm, setAddBlockCircuitForm] = useState({
    instructions: '',
    resultTrackingType: '',
    blockCategory: '',
    conditioningFormat: '',
    videoUrlsStr: '',
    /** MASS 2.7: Format-specific params */
    conditioningConfig: {} as {
      timeCapSeconds?: number
      durationSeconds?: number
      intervalLengthSeconds?: number
      rounds?: number
      workSeconds?: number
      restSeconds?: number
    },
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
      weekIndex: number
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
  /** 3.2 Amber: Assign from library — date + library session */
  const [amberAssignFromLibraryDate, setAmberAssignFromLibraryDate] =
    useState('')
  const [amberAssignLibrarySessionId, setAmberAssignLibrarySessionId] =
    useState('')
  const [amberLibrarySessions, setAmberLibrarySessions] = useState<
    Array<{ id: number; name: string }>
  >([])
  const [amberLibrarySessionsLoading, setAmberLibrarySessionsLoading] =
    useState(false)
  /** 3.2 Amber: Calendar view — month grid for assigning sessions to dates */
  const [amberCalendarMonth, setAmberCalendarMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** MASS 2.8: Multi-select cells "weekIdx-dayIdx" for Copy/Delete/Repeat */
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  /** MASS 2.8: Copied days for Paste (dayId + weekId for source) */
  const [copiedDays, setCopiedDays] = useState<
    Array<{ dayId: number; weekId: number }>
  >([])
  /** Repeat modal: how many weeks to repeat into */
  const [repeatWeeksModalOpen, setRepeatWeeksModalOpen] = useState(false)
  const [repeatWeeksCount, setRepeatWeeksCount] = useState(1)
  const [publishingToggle, setPublishingToggle] = useState(false)
  /** MASS 2.8: Save as Program — create new program from selected sessions */
  const [saveAsProgramModalOpen, setSaveAsProgramModalOpen] = useState(false)
  const [saveAsProgramName, setSaveAsProgramName] = useState('')
  const [saveAsProgramSaving, setSaveAsProgramSaving] = useState(false)
  /** Confirm remove week: weekIdx to remove, or null when modal closed */
  const [removeWeekConfirmIdx, setRemoveWeekConfirmIdx] = useState<
    number | null
  >(null)
  const [removeWeekLoading, setRemoveWeekLoading] = useState(false)
  const selectionAnchorRef = useRef<{ weekIdx: number; dayIdx: number } | null>(
    null
  )
  const isSelectingRef = useRef(false)
  /** MASS 2.8: Right-click context menu (Paste, Copy, Open) */
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    weekIdx: number
    dayIdx: number
  } | null>(null)
  /** MASS 2.3: Inline edit week name (weekIdx when editing, null otherwise) */
  const [editingWeekNameIdx, setEditingWeekNameIdx] = useState<number | null>(
    null
  )
  const [editingWeekNameValue, setEditingWeekNameValue] = useState('')
  /** MASS 2.8: Hover preview — show session summary in tooltip */
  const [hoveredCell, setHoveredCell] = useState<{
    weekIdx: number
    dayIdx: number
    x: number
    y: number
  } | null>(null)
  /** MASS 2.8: Drag session to move (dayId, weekId for API). Used for drag-state styling. */
  const [draggedSession, setDraggedSession] = useState<{
    weekIdx: number
    dayIdx: number
    dayId?: number
    sourceWeekId?: number
  } | null>(null)
  /** MASS 2.8: Block row 3-dot menu open (section key "w-d-s") */
  const [blockMenuOpen, setBlockMenuOpen] = useState<string | null>(null)
  /** MASS 2.9: Library drawer (Add from Library) */
  const [libraryDrawerOpen, setLibraryDrawerOpen] = useState(false)
  /** MASS 2.9: Save session to library modal */
  const [saveSessionToLibraryOpen, setSaveSessionToLibraryOpen] =
    useState(false)
  const [saveSessionToLibraryName, setSaveSessionToLibraryName] = useState('')
  const [saveSessionToLibrarySaving, setSaveSessionToLibrarySaving] =
    useState(false)
  /** MASS 2.9: Save program to library modal */
  const [saveProgramToLibraryOpen, setSaveProgramToLibraryOpen] =
    useState(false)
  const [saveProgramToLibraryName, setSaveProgramToLibraryName] = useState('')
  const [saveProgramToLibrarySaving, setSaveProgramToLibrarySaving] =
    useState(false)
  /** MASS 2.1/2.8: When editing, use program structure; when creating, start with empty weeks (synced from numberOfWeeks). */
  const [structure, setStructure] = useState<ProgramStructure>(() =>
    program?.id
      ? { weeks: program?.programStructure?.weeks ?? [] }
      : { weeks: [] }
  )

  const programStructure = program?.programStructure
  const programDurationWeeks = (
    program as { durationWeeks?: number | null } | undefined
  )?.durationWeeks
  const programConstraintCategory = (
    program as { constraintCategory?: string | null } | undefined
  )?.constraintCategory

  /** Sync structure from program when program prop loads/updates (preserve week names, days, blocks from API). MASS 2.8: support empty weeks. */
  useEffect(() => {
    if (program?.id != null && programStructure) {
      setStructure({ weeks: programStructure.weeks ?? [] })
    }
  }, [program, program?.id, programStructure])

  /** When opening for edit, if program was passed without programStructure (e.g. from list), refetch once to populate calendar and all fields. */
  const hasRefetchedForEdit = useRef(false)
  useEffect(() => {
    if (!program?.id || hasRefetchedForEdit.current) return
    if (programStructure?.weeks === undefined) {
      hasRefetchedForEdit.current = true
      programService
        .getById(program.id)
        .then(res => {
          const data = (
            res.data as {
              data?: Program & { programStructure?: ProgramStructure }
            }
          )?.data
          const weeks = data?.programStructure?.weeks ?? []
          setStructure({ weeks })
        })
        .catch(() => {})
    }
  }, [program?.id, programStructure?.weeks])

  /** 3.3 Green: Sync durationWeeks from program when editing a Green program; when creating Green, default to numberOfWeeks. */
  useEffect(() => {
    if (program?.id && programDurationWeeks != null) {
      setDurationWeeks(programDurationWeeks)
    } else if (
      !program &&
      cycleId &&
      cycles.some(c => c.id === cycleId && c.name === 'Green')
    ) {
      setDurationWeeks(prev => (numberOfWeeks >= 1 ? numberOfWeeks : prev))
    }
  }, [
    program,
    program?.id,
    programDurationWeeks,
    cycleId,
    cycles,
    numberOfWeeks,
  ])

  /** 3.4 Sustainment: Sync constraint category from program when editing. */
  useEffect(() => {
    if (program?.id && programConstraintCategory != null) {
      setConstraintCategory(programConstraintCategory)
    } else if (
      !program &&
      cycleId &&
      cycles.some(c => c.id === cycleId && c.name === 'Sustainment')
    ) {
      setConstraintCategory(prev => prev || '')
    }
  }, [program, program?.id, programConstraintCategory, cycleId, cycles])

  /** Goal Type (Green): When editing, sync category/subCategory from program.goalType if API returned goalType and category/subCategory are missing. */
  useEffect(() => {
    const p = program as
      | (Program & { goalType?: { category: string; subCategory: string } })
      | null
    if (!p?.id || !p?.goalType) return
    if (!p.category && p.goalType.category) setCategory(p.goalType.category)
    if (!p.subCategory && p.goalType.subCategory)
      setSubCategory(p.goalType.subCategory)
  }, [program])

  /** MASS 2.1: When creating, pre-generate that many empty week rows on the calendar. Coach enters "12" → calendar immediately shows Week 1–12. */
  useEffect(() => {
    if (program?.id) return
    const N = Math.max(1, numberOfWeeks)
    setStructure(prev => {
      const W = prev.weeks ?? []
      if (W.length === N) return prev
      if (N > W.length) {
        const next = [
          ...W,
          ...Array.from({ length: N - W.length }, (_, i) => ({
            weekIndex: W.length + i + 1,
            weekName: `Week ${W.length + i + 1}`,
            days: [] as ProgramStructureDay[],
          })),
        ]
        return { weeks: next }
      }
      return { weeks: W.slice(0, N) }
    })
  }, [program?.id, numberOfWeeks])

  /** MASS 2.8: Refetch program and sync structure. Returns new structure when successful. Populates all fields (weeks, week names, days, blocks). */
  const refetchProgram =
    useCallback(async (): Promise<ProgramStructure | null> => {
      if (!program?.id) return null
      try {
        const res = await programService.getById(program.id)
        const data = (
          res.data as { data?: { programStructure?: ProgramStructure } }
        )?.data
        const weeks = data?.programStructure?.weeks ?? []
        setStructure({ weeks })
        return { weeks }
      } catch {
        showError('Failed to refresh program')
      }
      return null
    }, [program?.id, showError])

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

  /** MASS 2.8: Global mouseup to end click-drag selection */
  useEffect(() => {
    const onMouseUp = () => {
      isSelectingRef.current = false
    }
    document.addEventListener('mouseup', onMouseUp)
    return () => document.removeEventListener('mouseup', onMouseUp)
  }, [])

  /** Close context menu on click/scroll */
  useEffect(() => {
    const close = () => setContextMenu(null)
    document.addEventListener('click', close)
    document.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('click', close)
      document.removeEventListener('scroll', close, true)
    }
  }, [])

  /** Paste at target week (duplicate copied days into that week) — defined before Ctrl+V effect */
  const handlePasteAt = useCallback(
    async (targetWeekIdx: number) => {
      if (copiedDays.length === 0 || !program?.id) return
      const week = structure.weeks[targetWeekIdx]
      if (!week?.id) return
      try {
        for (const { dayId } of copiedDays) {
          await programService.duplicateDay(week.id, { sourceDayId: dayId })
        }
        await refetchProgram()
        showSuccess(`Pasted ${copiedDays.length} session(s)`)
      } catch (e) {
        const err = e as AxiosError<{ message?: string }>
        showError(err.response?.data?.message ?? 'Failed to paste')
      }
    },
    [
      copiedDays,
      program?.id,
      structure.weeks,
      refetchProgram,
      showSuccess,
      showError,
    ]
  )

  /** MASS 2.8: Ctrl+V paste when calendar has selection and copied days */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === 'v' &&
        copiedDays.length > 0 &&
        selectedCells.size > 0
      ) {
        const first = Array.from(selectedCells).sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true })
        )[0]
        if (first) {
          const [w] = first.split('-').map(Number)
          e.preventDefault()
          handlePasteAt(w)
        }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [copiedDays.length, selectedCells, handlePasteAt])

  const cycle = cycles.find(c => c.id === cycleId)
  const isSustainmentCycle = cycle?.name === 'Sustainment'

  /** MASS 2.10: Debounced auto-save when program exists — any change (calendar or session designer) saves automatically */
  useEffect(() => {
    if (!program?.id) return
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
            ...(isSustainmentCycle && {
              constraintCategory: constraintCategory.trim() || null,
            }),
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
    program?.id,
    structure,
    name,
    description,
    cycleId,
    category,
    subCategory,
    isActive,
    isSustainmentCycle,
    constraintCategory,
  ])

  const showCategory =
    cycle?.name === 'Red' || cycle?.name === 'Green' || cycle?.name === 'Amber'
  const isAmberCycle = cycle?.name === 'Amber'
  /** 3.3 Green: Show Green duration (event-aligned scheduling). */
  const isGreenCycle = cycle?.name === 'Green'
  /** 3.5 Custom / 1:1: Coach-assigned program for one athlete; overrides roadmap until end date. */
  const isCustomCycle = cycle?.name === 'Custom'
  const SUSTAINMENT_CONSTRAINTS = [
    'Travel',
    'Limited Equipment',
    'Rehab',
    'Time',
    'Deployed',
  ] as const
  const categoryOptions = goalTypes
    .filter(g => g.category === category)
    .map(g => ({ value: g.subCategory, label: g.subCategory }))
  const categoryLabels = [...new Set(goalTypes.map(g => g.category))]
    .filter((c): c is Category => Boolean(c))
    .map(c => ({ value: c, label: CATEGORY_LABELS[c] ?? c }))

  const addWeek = async () => {
    if (program?.id) {
      try {
        await programService.addWeek(program.id, {
          weekName: `Week ${structure.weeks.length + 1}`,
        })
        await refetchProgram()
      } catch (e) {
        const err = e as AxiosError<{ message?: string }>
        showError(err.response?.data?.message ?? 'Failed to add week')
      }
      return
    }
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
    if (!program?.id) setNumberOfWeeks(prev => prev + 1)
  }

  const addDay = async (weekIdx: number) => {
    const week = structure.weeks[weekIdx]
    if ((week?.days?.length ?? 0) >= 7) return
    if (program?.id && week?.id) {
      try {
        await programService.addDay(week.id, {
          dayName:
            cycle?.name === 'Amber'
              ? undefined
              : `Day ${(week.days?.length ?? 0) + 1}`,
        })
        const next = await refetchProgram()
        const updatedWeek = next?.weeks?.[weekIdx]
        if (updatedWeek?.days?.length) {
          setSessionDesignerCell({
            weekIdx,
            dayIdx: updatedWeek.days.length - 1,
          })
        }
      } catch (e) {
        const err = e as AxiosError<{ message?: string }>
        showError(err.response?.data?.message ?? 'Failed to add session')
      }
      return
    }
    const weeks = [...structure.weeks]
    const w = { ...weeks[weekIdx], days: [...(weeks[weekIdx].days ?? [])] }
    const nextDayIdx = w.days.length
    const defaultDayName =
      cycle?.name === 'Amber' ? '' : `Day ${nextDayIdx + 1}`
    w.days.push({
      dayIndex: nextDayIdx,
      dayName: defaultDayName,
      sections: [{ sectionType: 'normal', exercises: [] }],
    })
    weeks[weekIdx] = w
    setStructure({ weeks })
  }

  const addBlockAsExercise = (
    weekIdx: number,
    dayIdx: number,
    exercise: ExerciseListForBuilderItem,
    blockCategory?: string
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
      blockCategory: blockCategory || undefined,
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
      conditioningConfig?: {
        timeCapSeconds?: number
        durationSeconds?: number
        intervalLengthSeconds?: number
        rounds?: number
        workSeconds?: number
        restSeconds?: number
      }
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
    const config = form.conditioningConfig
    const conditioningConfig =
      config &&
      (config.timeCapSeconds != null ||
        config.durationSeconds != null ||
        config.intervalLengthSeconds != null ||
        config.rounds != null ||
        config.workSeconds != null ||
        config.restSeconds != null)
        ? config
        : undefined
    day.sections.push({
      sectionType: 'circuit',
      blockType: 'CIRCUIT',
      instructions: form.instructions || undefined,
      resultTrackingType: form.resultTrackingType || undefined,
      blockCategory: form.blockCategory || undefined,
      conditioningFormat: form.conditioningFormat || undefined,
      conditioningConfig,
      videoUrls: videoUrls?.length ? videoUrls : undefined,
      exercises: [],
    })
    week.days[dayIdx] = day
    weeks[weekIdx] = week
    setStructure({ weeks })
  }

  /** MASS 2.9: Add circuit from library as a block (no exercises in payload). */
  const addBlockFromLibraryCircuit = (
    weekIdx: number,
    dayIdx: number,
    circuit: {
      id: number
      name: string
      instructions?: string | null
      resultTrackingType?: string | null
      blockCategory?: string | null
      conditioningFormat?: string | null
      conditioningConfig?: unknown
      videoUrls?: unknown
    }
  ) => {
    const weeks = [...structure.weeks]
    const week = { ...weeks[weekIdx], days: [...weeks[weekIdx].days] }
    const day = {
      ...week.days[dayIdx],
      sections: [...(week.days[dayIdx].sections ?? [])],
    }
    const config = circuit.conditioningConfig as
      | ProgramStructureSection['conditioningConfig']
      | undefined
    day.sections.push({
      sectionType: 'circuit',
      blockType: 'CIRCUIT',
      name: circuit.name,
      instructions: circuit.instructions ?? undefined,
      resultTrackingType: circuit.resultTrackingType ?? undefined,
      blockCategory: circuit.blockCategory ?? undefined,
      conditioningFormat: circuit.conditioningFormat ?? undefined,
      conditioningConfig: config,
      videoUrls: circuit.videoUrls,
      exercises: [],
    })
    week.days[dayIdx] = day
    weeks[weekIdx] = week
    setStructure({ weeks })
  }

  /** MASS 2.9: Add session from library as a new day in the current week. */
  const addDayFromLibrarySession = (
    weekIdx: number,
    content: Record<string, unknown>
  ) => {
    const weeks = [...structure.weeks]
    const week = { ...weeks[weekIdx], days: [...(weeks[weekIdx].days ?? [])] }
    const dayIndex = week.days.length
    const dayContent = content as Partial<ProgramStructureDay>
    week.days.push({
      dayIndex,
      dayName: dayContent.dayName ?? `Day ${dayIndex + 1}`,
      sessionNotes: dayContent.sessionNotes,
      isRestDay: dayContent.isRestDay,
      estimatedDurationMinutes: dayContent.estimatedDurationMinutes,
      sections: dayContent.sections ?? [
        { sectionType: 'normal', exercises: [] },
      ],
    })
    weeks[weekIdx] = week
    setStructure({ weeks })
  }

  const removeSection = async (
    weekIdx: number,
    dayIdx: number,
    sectionIdx: number
  ) => {
    const section =
      structure.weeks[weekIdx]?.days?.[dayIdx]?.sections?.[sectionIdx]
    const sectionId = section && (section as { id?: number }).id
    if (program?.id && sectionId != null) {
      try {
        await programService.deleteSection(sectionId)
        await refetchProgram()
        setBlockMenuOpen(null)
      } catch (e) {
        const err = e as AxiosError<{ message?: string }>
        showError(err.response?.data?.message ?? 'Failed to delete block')
      }
      return
    }
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

  const removeWeek = (weekIdx: number) => {
    setRemoveWeekConfirmIdx(weekIdx)
  }

  const confirmRemoveWeek = async () => {
    const weekIdx = removeWeekConfirmIdx
    if (weekIdx == null) return
    const week = structure.weeks[weekIdx]
    if (!week) return
    setRemoveWeekLoading(true)
    try {
      if (program?.id && week?.id) {
        await programService.deleteWeek(week.id)
        await refetchProgram()
        setSelectedCells(prev => {
          const next = new Set(prev)
          next.forEach(k => {
            if (k.startsWith(`${weekIdx}-`)) next.delete(k)
          })
          return next
        })
      } else {
        const nextWeeks = structure.weeks.filter((_, i) => i !== weekIdx)
        setStructure({ weeks: nextWeeks })
        if (!program?.id) setNumberOfWeeks(nextWeeks.length)
      }
      setRemoveWeekConfirmIdx(null)
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message ?? 'Failed to remove week')
    } finally {
      setRemoveWeekLoading(false)
    }
  }

  /** MASS 2.3: Duplicate week (API when program exists, else local) */
  const duplicateWeek = async (weekIdx: number) => {
    const week = structure.weeks[weekIdx]
    if (program?.id && week?.id) {
      try {
        await programService.duplicateWeek(program.id, {
          sourceWeekId: week.id,
        })
        await refetchProgram()
        showSuccess('Week duplicated')
      } catch (e) {
        const err = e as AxiosError<{ message?: string }>
        showError(err.response?.data?.message ?? 'Failed to duplicate week')
      }
      return
    }
    const copy = structuredClone(week)
    copy.id = undefined
    copy.weekIndex = structure.weeks.length + 1
    copy.weekName = copy.weekName
      ? `${copy.weekName} (copy)`
      : `Week ${copy.weekIndex}`
    copy.days = (copy.days ?? []).map((d: ProgramStructureDay, i: number) => ({
      ...d,
      id: undefined,
      dayIndex: i,
    }))
    setStructure({ weeks: [...structure.weeks, copy] })
  }

  /** MASS 2.3: Reorder weeks (API when program exists, else local) */
  const reorderWeeks = async (fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1
    if (toIdx < 0 || toIdx >= structure.weeks.length) return
    if (program?.id && structure.weeks.every(w => w.id != null)) {
      const weekIds = structure.weeks.map(w => w.id!)
      const a = weekIds[fromIdx]
      const b = weekIds[toIdx]
      weekIds[fromIdx] = b
      weekIds[toIdx] = a
      try {
        await programService.reorderWeeks(program.id, { weekIds })
        await refetchProgram()
        showSuccess('Weeks reordered')
      } catch (e) {
        const err = e as AxiosError<{ message?: string }>
        showError(err.response?.data?.message ?? 'Failed to reorder weeks')
      }
      return
    }
    const weeks = [...structure.weeks]
    ;[weeks[fromIdx], weeks[toIdx]] = [weeks[toIdx], weeks[fromIdx]]
    setStructure({ weeks })
  }

  /** MASS 2.3: Save week name (inline edit) */
  const saveWeekName = (weekIdx: number) => {
    const week = structure.weeks[weekIdx]
    const name = editingWeekNameValue.trim() || `Week ${weekIdx + 1}`
    if (program?.id && week?.id) {
      programService
        .updateWeek(week.id, { weekName: name })
        .then(() => refetchProgram())
        .then(() => {
          setEditingWeekNameIdx(null)
          setEditingWeekNameValue('')
          showSuccess('Week name updated')
        })
        .catch((e: AxiosError<{ message?: string }>) => {
          showError(e.response?.data?.message ?? 'Failed to update week name')
        })
      return
    }
    const weeks = [...structure.weeks]
    weeks[weekIdx] = { ...week, weekName: name }
    setStructure({ weeks })
    setEditingWeekNameIdx(null)
    setEditingWeekNameValue('')
  }

  const getExerciseName = (exerciseId: number) =>
    exerciseList.find(e => e.id === exerciseId)?.name ??
    `Exercise #${exerciseId}`

  /** Display label for a week: auto-renumber "Week N" by position; keep user-renamed names (e.g. "Ws") as-is. */
  const getDisplayWeekName = (
    week: { weekName?: string | null },
    weekIdx: number
  ): string => {
    const name = week.weekName?.trim()
    if (!name) return `Week ${weekIdx + 1}`
    if (/^Week \d+$/.test(name)) return `Week ${weekIdx + 1}` // renumber after add/delete
    return name // custom name, keep as-is
  }

  /** MASS 2.8: Cell key for selection */
  const cellKey = (weekIdx: number, dayIdx: number) => `${weekIdx}-${dayIdx}`

  /** Extend selection to rectangle from anchor to (weekIdx, dayIdx) */
  const extendSelection = useCallback(
    (weekIdx: number, dayIdx: number) => {
      const anchor = selectionAnchorRef.current
      if (!anchor) return
      const minW = Math.min(anchor.weekIdx, weekIdx)
      const maxW = Math.max(anchor.weekIdx, weekIdx)
      const minD = Math.min(anchor.dayIdx, dayIdx)
      const maxD = Math.max(anchor.dayIdx, dayIdx)
      const next = new Set<string>()
      for (let w = minW; w <= maxW; w++) {
        for (let d = minD; d <= maxD; d++) {
          if (structure.weeks[w]?.days?.[d]) next.add(`${w}-${d}`)
        }
      }
      setSelectedCells(next)
    },
    [structure.weeks]
  )

  /** Copy: store selected days (with id) for paste */
  const handleCopy = useCallback(() => {
    const days: Array<{ dayId: number; weekId: number }> = []
    selectedCells.forEach(k => {
      const [w, d] = k.split('-').map(Number)
      const day = structure.weeks[w]?.days?.[d]
      const week = structure.weeks[w]
      if (day?.id && week?.id) days.push({ dayId: day.id, weekId: week.id })
    })
    setCopiedDays(days)
    showSuccess(
      days.length
        ? `Copied ${days.length} session(s)`
        : 'No sessions with ID to copy'
    )
  }, [selectedCells, structure.weeks, showSuccess])

  /** Delete selected sessions (only those with day id when program exists) */
  const handleDeleteSelected = useCallback(async () => {
    if (!program?.id) {
      showError('Save the program first to use delete')
      return
    }
    const toDelete: number[] = []
    selectedCells.forEach(k => {
      const [w, d] = k.split('-').map(Number)
      const day = structure.weeks[w]?.days?.[d]
      if (day?.id) toDelete.push(day.id)
    })
    if (toDelete.length === 0) {
      showError('No sessions selected or sessions not yet saved')
      return
    }
    try {
      for (const dayId of toDelete) {
        await programService.deleteDay(dayId)
      }
      await refetchProgram()
      setSelectedCells(new Set())
      showSuccess(`Deleted ${toDelete.length} session(s)`)
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message ?? 'Failed to delete')
    }
  }, [
    program?.id,
    selectedCells,
    structure.weeks,
    refetchProgram,
    showError,
    showSuccess,
  ])

  /** Amber: remove session from date (extracted to reduce nesting). */
  const handleRemoveAmberSession = useCallback(
    async (row: { id: number; sessionDate: string }) => {
      if (!program?.id) return
      try {
        await programService.deleteAmberSession(program.id, row.sessionDate)
        setAmberSessionsList(prev => prev.filter(s => s.id !== row.id))
      } catch {
        showError('Failed to remove')
      }
    },
    [program?.id, showError]
  )

  /** Calendar cell drag start: set drag data and dragged state (extracted to reduce nesting). */
  const handleCellDragStart = useCallback(
    (
      e: React.DragEvent<HTMLButtonElement>,
      payload: {
        dayId: number
        sourceWeekId: number
        weekIdx: number
        dayIdx: number
      }
    ) => {
      e.dataTransfer.setData('application/json', JSON.stringify(payload))
      e.dataTransfer.effectAllowed = 'move'
      setDraggedSession({
        weekIdx: payload.weekIdx,
        dayIdx: payload.dayIdx,
        dayId: payload.dayId,
        sourceWeekId: payload.sourceWeekId,
      })
    },
    []
  )

  /** Calendar cell drop: move session to target cell (extracted to reduce nesting). */
  const handleCalendarCellDrop = useCallback(
    (e: React.DragEvent<HTMLTableCellElement>) => {
      e.preventDefault()
      const raw = e.dataTransfer.getData('application/json')
      if (!raw) return
      const tw = Number((e.currentTarget as HTMLElement).dataset.weekIdx)
      const tdi = Number((e.currentTarget as HTMLElement).dataset.dayIdx)
      const {
        dayId,
        weekIdx: sw,
        dayIdx: sd,
      } = JSON.parse(raw) as {
        dayId?: number
        weekIdx: number
        dayIdx: number
      }
      if (sw === tw && sd === tdi) return
      const targetWeekId = structure.weeks[tw]?.id
      if (!dayId || !targetWeekId) return
      programService
        .moveDay(dayId, { targetWeekId, targetDayIndex: tdi + 1 })
        .then(() => {
          refetchProgram()
          setDraggedSession(null)
          showSuccess('Session moved')
        })
        .catch(() => showError('Failed to move session'))
    },
    [structure.weeks, refetchProgram, showSuccess, showError]
  )

  /** Repeat: duplicate selected days into the next N weeks (weeks after selection) */
  const handleRepeatConfirm = useCallback(async () => {
    if (!program?.id || selectedCells.size === 0) return
    const daysToRepeat = Array.from(selectedCells)
      .map(k => {
        const [w, d] = k.split('-').map(Number)
        const day = structure.weeks[w]?.days?.[d]
        return day?.id ? { dayId: day.id } : null
      })
      .filter((x): x is { dayId: number } => x != null)
    if (daysToRepeat.length === 0) {
      showError('No sessions with ID to repeat')
      return
    }
    const maxSelectedWeekIdx = Math.max(
      ...Array.from(selectedCells).map(k => Number(k.split('-')[0]))
    )
    const N = Math.max(1, repeatWeeksCount)
    try {
      let currentStructure = structure
      for (let n = 1; n <= N; n++) {
        const targetWeekIdx = maxSelectedWeekIdx + n
        let targetWeek = currentStructure.weeks[targetWeekIdx]
        if (!targetWeek) {
          await programService.addWeek(program.id, {
            weekName: `Week ${currentStructure.weeks.length + 1}`,
          })
          const next = await refetchProgram()
          currentStructure = next ?? currentStructure
          targetWeek = currentStructure.weeks[targetWeekIdx]
        }
        if (!targetWeek?.id) continue
        for (const { dayId } of daysToRepeat) {
          await programService.duplicateDay(targetWeek.id, {
            sourceDayId: dayId,
          })
        }
      }
      await refetchProgram()
      setRepeatWeeksModalOpen(false)
      setRepeatWeeksCount(1)
      setSelectedCells(new Set())
      showSuccess(`Repeated into ${N} week(s)`)
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message ?? 'Failed to repeat')
    }
  }, [
    program?.id,
    selectedCells,
    structure,
    repeatWeeksCount,
    refetchProgram,
    showError,
    showSuccess,
  ])

  /** MASS 2.8: Save as Program — create new program from selected sessions (one week, ordered by grid) */
  const handleSaveAsProgram = useCallback(async () => {
    const nameTrim = saveAsProgramName.trim()
    const canProceed = Boolean(nameTrim && program)
    if (!canProceed) return
    const ordered = Array.from(selectedCells)
      .map(k => {
        const [w, d] = k.split('-').map(Number)
        return { weekIdx: w, dayIdx: d }
      })
      .sort((a, b) =>
        a.weekIdx === b.weekIdx ? a.dayIdx - b.dayIdx : a.weekIdx - b.weekIdx
      )
    const daysForNewProgram: ProgramStructureDay[] = ordered
      .map(({ weekIdx, dayIdx }) => {
        const day = structure.weeks[weekIdx]?.days?.[dayIdx]
        if (day != null) {
          const clone = structuredClone(day) as ProgramStructureDay & {
            id?: number
          }
          delete clone.id
          if (clone.sections) {
            clone.sections = clone.sections.map(
              (sec: ProgramStructureSection & { id?: number }) => {
                const s = { ...sec }
                delete s.id
                return s
              }
            )
          }
          return clone
        }
        return null
      })
      .filter((d): d is ProgramStructureDay => d !== null && d !== undefined)
    if (daysForNewProgram.length === 0) {
      showError('No sessions to copy')
      return
    }
    const cycle = cycles.find(c => c.id === cycleId)
    const cycleType = getCycleTypeFromName(cycle?.name)
    const goalType =
      cycleType === 'GREEN' && category && subCategory
        ? goalTypes.find(
            g => g.category === category && g.subCategory === subCategory
          )
        : undefined
    const payload: Parameters<typeof programService.create>[0] = {
      program_name: nameTrim,
      program_description: description.trim(),
      cycleType,
      cycleId,
      numberOfWeeks: 1,
      category: category || null,
      subCategory: subCategory || null,
      isActive,
      isPublished: false,
      ...(goalType && { goalTypeId: goalType.id }),
      programStructure: {
        weeks: [{ weekIndex: 1, weekName: 'Week 1', days: daysForNewProgram }],
      },
    }
    setSaveAsProgramSaving(true)
    try {
      const res = await programService.create(payload)
      const created = res.data?.data ?? null
      setSaveAsProgramModalOpen(false)
      setSaveAsProgramName('')
      setSelectedCells(new Set())
      showSuccess('Program created')
      if (created) onSuccess?.(created)
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message ?? 'Failed to create program')
    } finally {
      setSaveAsProgramSaving(false)
    }
  }, [
    program,
    saveAsProgramName,
    selectedCells,
    structure.weeks,
    cycles,
    cycleId,
    category,
    subCategory,
    goalTypes,
    isActive,
    description,
    showError,
    showSuccess,
    onSuccess,
  ])

  const getSubmitValidationError = (): string | null => {
    if (!name.trim()) return 'Program name is required'
    if (!cycleId) return 'Cycle is required'
    if (showCategory && (!category || !subCategory))
      return 'Category and Goal Type are required for this cycle'
    if (isGreenCycle && (durationWeeks < 1 || !Number.isInteger(durationWeeks)))
      return 'Green duration (weeks) must be at least 1'
    if (isSustainmentCycle && !constraintCategory.trim())
      return 'Constraint category is required for Sustainment (Travel, Limited Equipment, Rehab, Time, Deployed)'
    if (!program) return null
    if (!structureHasContent(structure))
      return 'Add at least one block with content to the program'
    if (structureHasBlockMissingName(structure))
      return 'Every block must have a name'
    return null
  }

  const handleSubmit = async () => {
    const validationError = getSubmitValidationError()
    if (validationError) {
      showError(validationError)
      return
    }
    setSaving(true)
    try {
      if (program) {
        const cycleType = getCycleTypeFromName(cycle?.name)
        const goalType =
          cycleType === 'GREEN' && category && subCategory
            ? goalTypes.find(
                g => g.category === category && g.subCategory === subCategory
              )
            : undefined
        await programService.update(program.id, {
          program_name: name.trim(),
          program_description: description.trim(),
          cycleId,
          category: category || null,
          subCategory: subCategory || null,
          isActive,
          programStructure: structure,
          ...(goalType && { goalTypeId: goalType.id }),
          ...(cycleType === 'GREEN' && {
            durationWeeks:
              durationWeeks >= 1
                ? durationWeeks
                : ((program as { numberOfWeeks?: number }).numberOfWeeks ??
                  null),
          }),
          ...(cycleType === 'SUSTAINMENT' && {
            constraintCategory: constraintCategory.trim() || null,
          }),
        })
        showSuccess('Program updated')
      } else {
        const cycleType = getCycleTypeFromName(cycle?.name)
        let resolvedWeeks: number
        if (cycleType === 'AMBER') resolvedWeeks = 0
        else if (numberOfWeeks >= 1) resolvedWeeks = numberOfWeeks
        else resolvedWeeks = structure.weeks?.length ?? 1
        const goalType =
          cycleType === 'GREEN' && category && subCategory
            ? goalTypes.find(
                g => g.category === category && g.subCategory === subCategory
              )
            : undefined
        const payload: Parameters<typeof programService.create>[0] = {
          program_name: name.trim(),
          program_description: description.trim(),
          cycleType,
          cycleId,
          numberOfWeeks: resolvedWeeks,
          category: category || null,
          subCategory: subCategory || null,
          isActive,
          isPublished: isPublished ?? false,
          ...(goalType && { goalTypeId: goalType.id }),
          ...(cycleType === 'GREEN' && {
            durationWeeks: durationWeeks >= 1 ? durationWeeks : resolvedWeeks,
          }),
          ...(cycleType === 'SUSTAINMENT' &&
            constraintCategory.trim() && {
              constraintCategory: constraintCategory.trim(),
            }),
        }
        payload.programStructure = undefined
        const res = await programService.create(payload)
        showSuccess('Program created')
        const created = res.data?.data ?? null
        onSuccess?.(created)
        return
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
        {/* 3.2 Amber: No week count; assign sessions to calendar dates only. Red/Green use fixed weeks. */}
        {!program && !isAmberCycle && (
          <div className="md:col-span-2">
            <Text variant="default" className="text-sm font-medium mb-1 block">
              Number of weeks <span className="text-red-500">*</span>
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
              className="w-24 rounded border border-gray-300 px-3 py-2 text-sm"
              placeholder="e.g. 12"
            />
            <p className="text-xs text-gray-500 mt-1">
              The calendar will show this many empty week rows. Weeks can be
              added or removed later.
            </p>
          </div>
        )}
        {!program && isAmberCycle && (
          <p className="md:col-span-2 text-sm text-amber-800">
            Amber programs use calendar dates only. After saving, use the Amber
            Calendar below to assign sessions to dates (or from library).
          </p>
        )}
        <div>
          <Text variant="default" className="text-sm font-medium mb-1 block">
            Program name <span className="text-red-500">*</span>
          </Text>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Strength Block"
          />
        </div>
        <div>
          <Text variant="default" className="text-sm font-medium mb-1 block">
            Cycle type <span className="text-red-500">*</span>
          </Text>
          <Dropdown
            value={cycleId ? String(cycleId) : ''}
            onValueChange={v => setCycleId(Number(v ?? 0))}
            options={cycles.map(c => ({ value: String(c.id), label: c.name }))}
            placeholder="Select cycle"
          />
        </div>
      </div>
      <div className="rounded-md border border-blue-200 bg-blue-50/80 px-3 py-2">
        <p className="text-sm text-gray-700">
          <span className="font-medium text-gray-800">Program duration:</span>{' '}
          Auto-calculated from the number of weeks in the calendar below. For
          Amber, duration is ongoing (no fixed duration).
        </p>
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Description
        </Text>
        <textarea
          className="w-full min-h-[80px] rounded border border-gray-300 px-3 py-2 text-sm"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Displayed to athletes when browsing programs"
        />
      </div>
      {/* MASS 2.1: Category + Goal Type (required for Green). Goal Type links to Goal Type table; connects program to onboarding — e.g. Green program with Goal Type "SWAT Selection" is assigned to athletes whose primary goal is SWAT Selection. */}
      {showCategory && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Text variant="default" className="text-sm font-medium mb-1 block">
              Category <span className="text-red-500">*</span>
            </Text>
            <Dropdown
              value={category}
              onValueChange={v => {
                const s = Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
                setCategory(s)
                setSubCategory('')
              }}
              options={categoryLabels}
              placeholder="Tactical Selection / School, Competition / Performance, Improve Operational Readiness"
              emptyMessage="please add goals first"
            />
          </div>
          <div>
            <Text variant="default" className="text-sm font-medium mb-1 block">
              Goal Type <span className="text-red-500">*</span>
            </Text>
            <Dropdown
              value={subCategory}
              onValueChange={v => {
                const s = Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
                setSubCategory(s)
              }}
              options={categoryOptions}
              placeholder="e.g. SWAT Selection (matches athlete primary goal)"
              emptyMessage="please add goals first"
              disabled={!category}
            />
          </div>
        </div>
      )}
      {/* 3.3 Green: Configurable duration (weeks) for event-aligned scheduling. Green start = event date − durationWeeks. */}
      {isGreenCycle && (
        <div className="rounded border border-emerald-200 bg-emerald-50/30 p-4">
          <Text
            variant="default"
            className="text-sm font-medium text-emerald-900 mb-1 block"
          >
            Green duration (weeks) *
          </Text>
          <p className="text-xs text-emerald-800 mb-2">
            Used for onboarding and Amber→Green transition. Green start date =
            event date − this many weeks. If athlete has less time to event,
            they start at the appropriate week so the program ends on event day.
          </p>
          <input
            type="number"
            min={1}
            max={52}
            value={durationWeeks}
            onChange={e =>
              setDurationWeeks(
                Math.max(1, Number.parseInt(e.target.value, 10) || 1)
              )
            }
            className="w-24 rounded border border-emerald-300 px-3 py-2 text-sm"
            placeholder="e.g. 12"
          />
        </div>
      )}
      {/* 3.4 Sustainment: Constraint category for Sustainment Library (Travel, Limited Equipment, Rehab, Time, Deployed). */}
      {isSustainmentCycle && (
        <div className="rounded border border-slate-200 bg-slate-50/30 p-4">
          <Text
            variant="default"
            className="text-sm font-medium text-slate-900 mb-1 block"
          >
            Constraint category *
          </Text>
          <p className="text-xs text-slate-700 mb-2">
            Tag for Sustainment Library so athletes can filter by constraint
            type.
          </p>
          <select
            value={constraintCategory}
            onChange={e => setConstraintCategory(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2 text-sm min-w-[200px]"
          >
            <option value="">Select constraint type</option>
            {SUSTAINMENT_CONSTRAINTS.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      )}
      {/* 3.5 Custom / 1:1: Assign to athlete after save. Coach: My Athletes → Assign 1:1 program. Admin: Program Management → Custom → Assign. */}
      {isCustomCycle && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/30 p-4">
          <Text variant="default" className="font-medium text-violet-900">
            Custom 1:1 program
          </Text>
          <p className="text-sm text-violet-800 mt-1">
            Assign to one athlete from{' '}
            <strong>My Athletes → Assign 1:1 program</strong> (coach) or{' '}
            <strong>Program Management → Custom → Assign</strong> (admin). You
            can build week-by-week or assign sessions to specific dates from My
            Athletes → Assign session to date. Changes propagate immediately.
          </p>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            id="pb-active"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="rounded border-gray-300"
          />
          <span className="text-sm">Active</span>
        </label>
        {!program && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              id="pb-published"
              checked={isPublished}
              onChange={e => setIsPublished(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Published (admin only)</span>
          </label>
        )}
      </div>

      <hr className="border-gray-200" />

      {/* 3.2 Amber: Calendar view — assign sessions to dates. One session per date; all athletes see same workout on same date. */}
      {isAmberCycle && !program?.id && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
          <Text variant="default" className="font-medium text-amber-900">
            Amber Calendar
          </Text>
          <p className="text-sm text-amber-800 mt-1">
            Save the program to unlock the Amber Calendar. Then assign sessions
            to calendar dates (or from library); all athletes on this program
            see the same workout on the same date.
          </p>
        </div>
      )}
      {Boolean(program?.id && isAmberCycle) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 space-y-3">
          <Text variant="default" className="font-medium text-amber-900">
            Amber Calendar
          </Text>
          <p className="text-sm text-amber-800">
            Assign a session to a calendar date. All athletes on this program
            see that session on that date. One session per date; edits propagate
            immediately.
          </p>
          {/* 3.2 Amber: Calendar view — click a date to assign or create a session for that date */}
          {(() => {
            const { year, month } = amberCalendarMonth
            const first = new Date(year, month, 1)
            const last = new Date(year, month + 1, 0)
            const startPad = first.getDay()
            const daysInMonth = last.getDate()
            const sessionDatesSet = new Set(
              amberSessionsList.map(r => r.sessionDate)
            )
            const weeks: (number | null)[][] = []
            let week: (number | null)[] = []
            for (let i = 0; i < startPad; i++) week.push(null)
            for (let d = 1; d <= daysInMonth; d++) {
              week.push(d)
              if (week.length === 7) {
                weeks.push(week)
                week = []
              }
            }
            if (week.length) {
              while (week.length < 7) week.push(null)
              weeks.push(week)
            }
            const monthLabel = first.toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            })
            return (
              <div className="rounded border border-amber-200 bg-white p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-amber-900">
                    {monthLabel}
                  </span>
                  <span className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      className="h-7 w-7 p-0 text-amber-800"
                      onClick={() =>
                        setAmberCalendarMonth(s =>
                          s.month === 0
                            ? { year: s.year - 1, month: 11 }
                            : { ...s, month: s.month - 1 }
                        )
                      }
                    >
                      ‹
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      className="h-7 w-7 p-0 text-amber-800"
                      onClick={() =>
                        setAmberCalendarMonth(s =>
                          s.month === 11
                            ? { year: s.year + 1, month: 0 }
                            : { ...s, month: s.month + 1 }
                        )
                      }
                    >
                      ›
                    </Button>
                  </span>
                </div>
                <div className="grid grid-cols-7 text-center text-xs">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                    day => (
                      <div
                        key={day}
                        className="font-medium text-amber-800 py-0.5"
                      >
                        {day}
                      </div>
                    )
                  )}
                  {weeks.map((row, ri) =>
                    row.map((d, di) => {
                      if (d === null)
                        return <div key={`${ri}-${di}`} className="p-0.5" />
                      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
                      const hasSession = sessionDatesSet.has(dateStr)
                      const isSelected = amberAssignDate === dateStr
                      return (
                        <div key={`${ri}-${di}`} className="p-0.5">
                          <button
                            type="button"
                            className={`
                              w-8 h-8 rounded text-sm border
                              ${hasSession ? 'bg-amber-100 border-amber-300 text-amber-900' : 'border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50'}
                              ${isSelected ? 'ring-2 ring-amber-500 ring-offset-1' : ''}
                            `}
                            onClick={async () => {
                              setAmberAssignDate(dateStr)
                              if (
                                !amberFrom ||
                                !amberTo ||
                                amberSessionsList.length === 0
                              ) {
                                setAmberFrom(dateStr)
                                const end = new Date(year, month + 1, 0)
                                setAmberTo(end.toISOString().slice(0, 10))
                                if (program?.id) {
                                  setAmberLoading(true)
                                  try {
                                    const res =
                                      await programService.getAmberSessions(
                                        program.id,
                                        {
                                          from: dateStr,
                                          to: end.toISOString().slice(0, 10),
                                        }
                                      )
                                    setAmberSessionsList(
                                      res.data?.data?.rows ?? []
                                    )
                                  } catch {
                                    setAmberSessionsList([])
                                  } finally {
                                    setAmberLoading(false)
                                  }
                                }
                              }
                            }}
                          >
                            {d}
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
                <p className="text-xs text-amber-800 mt-2">
                  Click a date to select it, then use &quot;Create new
                  session&quot; or &quot;Assign to date&quot; below.
                </p>
              </div>
            )
          })()}
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="program-builder-amber-from" className="sr-only">
              From date
            </label>
            <Input
              id="program-builder-amber-from"
              type="date"
              value={amberFrom}
              onChange={e => setAmberFrom(e.target.value)}
              size="small"
              className="w-40"
            />
            <span className="text-sm text-gray-600">to</span>
            <label htmlFor="program-builder-amber-to" className="sr-only">
              To date
            </label>
            <Input
              id="program-builder-amber-to"
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
                if (!program?.id) return
                setAmberLoading(true)
                try {
                  const res = await programService.getAmberSessions(
                    program.id,
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
                    <th className="border border-gray-200 px-2 py-1 text-right">
                      Actions
                    </th>
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
                      <td className="border border-gray-200 px-2 py-1 text-right space-x-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="small"
                          className="text-gray-700 text-xs"
                          onClick={() => {
                            // 3.2 Amber: Open session designer for this date's session (find day by programDayId)
                            let weekIdx = (row.weekIndex ?? 1) - 1
                            let dayIdx = row.dayIndex ?? 0
                            for (let w = 0; w < structure.weeks.length; w++) {
                              const week = structure.weeks[w] as {
                                days?: Array<{ id?: number }>
                              }
                              const days = week.days ?? []
                              const dIdx = days.findIndex(
                                d => d.id === row.programDayId
                              )
                              if (dIdx >= 0) {
                                weekIdx = w
                                dayIdx = dIdx
                                break
                              }
                            }
                            setSessionDesignerCell({ weekIdx, dayIdx })
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="small"
                          className="text-red-600 text-xs"
                          onClick={() => void handleRemoveAmberSession(row)}
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
              <label
                htmlFor="program-builder-amber-assign-date"
                className="block text-xs font-medium text-gray-600 mb-1"
              >
                Date
              </label>
              <Input
                id="program-builder-amber-assign-date"
                type="date"
                value={amberAssignDate}
                onChange={e => setAmberAssignDate(e.target.value)}
                size="small"
                className="w-40"
              />
            </div>
            <Button
              type="button"
              variant="primary"
              size="small"
              disabled={!amberAssignDate || amberLoading}
              onClick={async () => {
                if (!program?.id || !amberAssignDate) return
                setAmberLoading(true)
                try {
                  const res = await programService.createEmptyAmberSession(
                    program.id,
                    { date: amberAssignDate }
                  )
                  const data = res.data?.data as
                    | {
                        programDayId: number
                        weekIndex: number
                        dayIndex: number
                      }
                    | undefined
                  if (data) {
                    await refetchProgram()
                    const listRes = await programService.getAmberSessions(
                      program.id,
                      { from: amberFrom, to: amberTo }
                    )
                    setAmberSessionsList(listRes.data?.data?.rows ?? [])
                    setAmberAssignDate('')
                    setSessionDesignerCell({
                      weekIdx: data.weekIndex - 1,
                      dayIdx: data.dayIndex,
                    })
                    showSuccess(
                      'Session created — add blocks and exercises below'
                    )
                  }
                } catch {
                  showError('Failed to create session')
                } finally {
                  setAmberLoading(false)
                }
              }}
            >
              Create new session
            </Button>
            {structure.weeks.length > 0 && (
              <>
                <div>
                  <label
                    htmlFor="program-builder-amber-assign-day"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Or assign existing template
                  </label>
                  <Dropdown
                    placeholder="Select template"
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
                            ? `Rest - ${d.dayName ?? `Day ${d.dayIndex + 1}`}`
                            : (d.dayName ?? `Session ${d.dayIndex + 1}`)
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
                    if (!dayId || !program?.id) return
                    try {
                      await programService.setAmberSession(program.id, {
                        date: amberAssignDate,
                        programDayId: dayId,
                      })
                      const res = await programService.getAmberSessions(
                        program.id,
                        { from: amberFrom, to: amberTo }
                      )
                      setAmberSessionsList(res.data?.data?.rows ?? [])
                      setAmberAssignDate('')
                      setAmberAssignDayId('')
                      showSuccess('Session assigned')
                    } catch {
                      showError('Failed to assign')
                    }
                  }}
                >
                  Assign to date
                </Button>
              </>
            )}
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
                  if (!program?.id) return
                  try {
                    await programService.copyAmberSession(program.id, {
                      fromDate: amberCopyFrom,
                      toDate: amberCopyTo,
                    })
                    const res = await programService.getAmberSessions(
                      program.id,
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
            {/* 3.2 Amber: Assign from library — one session per date; visible to all athletes on this program */}
            <div className="flex flex-wrap items-end gap-2 pt-2 border-t border-amber-200 mt-2">
              <span className="text-xs font-medium text-amber-900 w-full">
                Assign from library
              </span>
              <Input
                id="program-builder-amber-library-date"
                type="date"
                value={amberAssignFromLibraryDate}
                onChange={e => setAmberAssignFromLibraryDate(e.target.value)}
                size="small"
                className="w-40"
                placeholder="Date"
              />
              <Dropdown
                placeholder={
                  amberLibrarySessions.length === 0 &&
                  !amberLibrarySessionsLoading
                    ? 'Load sessions first'
                    : 'Select session'
                }
                value={amberAssignLibrarySessionId}
                onValueChange={v =>
                  setAmberAssignLibrarySessionId(
                    Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
                  )
                }
                options={amberLibrarySessions.map(s => ({
                  value: String(s.id),
                  label: s.name,
                }))}
                size="small"
                className="min-w-[180px]"
              />
              <Button
                type="button"
                variant="secondary"
                size="small"
                disabled={amberLibrarySessionsLoading}
                onClick={async () => {
                  setAmberLibrarySessionsLoading(true)
                  try {
                    const res = await libraryService.search({
                      type: 'sessions',
                      limit: 100,
                    })
                    const rows = res.data?.data?.sessions?.rows ?? []
                    setAmberLibrarySessions(
                      rows.map(s => ({ id: s.id, name: s.name }))
                    )
                  } catch {
                    setAmberLibrarySessions([])
                  } finally {
                    setAmberLibrarySessionsLoading(false)
                  }
                }}
              >
                {amberLibrarySessionsLoading ? 'Loading…' : 'Load sessions'}
              </Button>
              <Button
                type="button"
                variant="primary"
                size="small"
                disabled={
                  !amberAssignFromLibraryDate ||
                  !amberAssignLibrarySessionId ||
                  amberLoading
                }
                onClick={async () => {
                  const date = amberAssignFromLibraryDate
                  const libId = Number(amberAssignLibrarySessionId)
                  if (!program?.id || !date || !libId) return
                  setAmberLoading(true)
                  try {
                    await programService.setAmberSessionFromLibrary(
                      program.id,
                      { date, librarySessionId: libId }
                    )
                    const res = await programService.getAmberSessions(
                      program.id,
                      { from: amberFrom, to: amberTo }
                    )
                    setAmberSessionsList(res.data?.data?.rows ?? [])
                    setAmberAssignFromLibraryDate('')
                    setAmberAssignLibrarySessionId('')
                    showSuccess('Session assigned to date')
                  } catch (e) {
                    const err = e as AxiosError<{ message?: string }>
                    showError(
                      err.response?.data?.message ??
                        'Failed to assign from library'
                    )
                  } finally {
                    setAmberLoading(false)
                  }
                }}
              >
                Assign to date
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MASS 2.8: Calendar grid view (Level 1) — show when we have weeks (create or edit). Pre-generated empty weeks in create mode (2.1). */}
      {structure.weeks.length > 0 && (
        <div className="space-y-4">
          {sessionDesignerCell == null ? (
            <>
              {/* Calendar toolbar: program name, status, duration (when saved), Publish/Unpublish (when saved), Add from Library */}
              <div className="flex flex-wrap items-center gap-3 p-2 rounded-lg bg-gray-50 border border-gray-200">
                <span className="text-sm font-medium text-gray-700">
                  {program?.name ?? (name || 'New Program')}
                </span>
                {program && (
                  <>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${program.isPublished ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
                    >
                      {program.isPublished ? 'Published' : 'Draft'}
                    </span>
                    {(program as { durationWeeks?: number | null })
                      .durationWeeks != null && (
                      <span className="text-xs text-gray-600">
                        Duration:{' '}
                        {(program as { durationWeeks?: number }).durationWeeks}{' '}
                        week(s)
                      </span>
                    )}
                    {(program as { sessionsPerWeek?: number | null })
                      .sessionsPerWeek != null && (
                      <span className="text-xs text-gray-600">
                        Sessions/week:{' '}
                        {
                          (program as { sessionsPerWeek?: number })
                            .sessionsPerWeek
                        }
                      </span>
                    )}
                  </>
                )}
                {program?.isPublished ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    disabled={publishingToggle}
                    onClick={async () => {
                      setPublishingToggle(true)
                      try {
                        await programService.update(program.id, {
                          isPublished: false,
                        })
                        showSuccess('Program unpublished')
                        onSuccess?.()
                      } catch (e) {
                        const err = e as AxiosError<{ message?: string }>
                        showError(
                          err.response?.data?.message ?? 'Failed to unpublish'
                        )
                      } finally {
                        setPublishingToggle(false)
                      }
                    }}
                  >
                    {publishingToggle ? 'Updating...' : 'Unpublish'}
                  </Button>
                ) : (
                  program != null && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      disabled={publishingToggle}
                      onClick={async () => {
                        setPublishingToggle(true)
                        try {
                          await programService.publish(program.id)
                          showSuccess('Program published')
                          onSuccess?.()
                        } catch (e) {
                          const err = e as AxiosError<{ message?: string }>
                          showError(
                            err.response?.data?.message ??
                              'Failed to publish (admin only)'
                          )
                        } finally {
                          setPublishingToggle(false)
                        }
                      }}
                    >
                      {publishingToggle ? 'Publishing...' : 'Publish'}
                    </Button>
                  )
                )}
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => setLibraryDrawerOpen(true)}
                >
                  Add from Library
                </Button>
              </div>
              {/* Toolbar when cells selected: Copy, Delete, Repeat */}
              {selectedCells.size > 0 && (
                <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-gray-100 border border-gray-200">
                  <span className="text-sm text-gray-600 mr-2">
                    {selectedCells.size} session(s) selected
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => handleCopy()}
                  >
                    Copy
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      if (globalThis.confirm('Delete selected sessions?')) {
                        void handleDeleteSelected()
                      }
                    }}
                  >
                    Delete
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => setRepeatWeeksModalOpen(true)}
                  >
                    Repeat…
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      setSaveAsProgramName(
                        `Copy of ${program?.name ?? 'Program'}`
                      )
                      setSaveAsProgramModalOpen(true)
                    }}
                  >
                    Save as Program
                  </Button>
                  {program && (
                    <>
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        disabled={publishingToggle || program.isPublished}
                        onClick={async () => {
                          setPublishingToggle(true)
                          try {
                            await programService.publish(program.id)
                            showSuccess('Program published')
                            onSuccess?.()
                          } catch (e) {
                            const err = e as AxiosError<{ message?: string }>
                            showError(
                              err.response?.data?.message ?? 'Failed to publish'
                            )
                          } finally {
                            setPublishingToggle(false)
                          }
                        }}
                      >
                        {publishingToggle ? 'Publishing...' : 'Publish program'}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        disabled={publishingToggle || !program.isPublished}
                        onClick={async () => {
                          setPublishingToggle(true)
                          try {
                            await programService.update(program.id, {
                              isPublished: false,
                            })
                            showSuccess('Program unpublished')
                            onSuccess?.()
                          } catch (e) {
                            const err = e as AxiosError<{ message?: string }>
                            showError(
                              err.response?.data?.message ??
                                'Failed to unpublish'
                            )
                          } finally {
                            setPublishingToggle(false)
                          }
                        }}
                      >
                        {publishingToggle
                          ? 'Unpublishing...'
                          : 'Unpublish program'}
                      </Button>
                    </>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    onClick={() => setSelectedCells(new Set())}
                  >
                    Clear selection
                  </Button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden bg-white">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2 text-left text-sm font-medium text-gray-700 w-24">
                        {isAmberCycle ? 'Session templates' : 'Week'}
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
                      <tr key={week.id ?? weekIdx}>
                        <td className="border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 align-top">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1 flex-wrap">
                              {editingWeekNameIdx === weekIdx ? (
                                <>
                                  <input
                                    type="text"
                                    value={editingWeekNameValue}
                                    onChange={e =>
                                      setEditingWeekNameValue(e.target.value)
                                    }
                                    onKeyDown={e => {
                                      if (e.key === 'Enter')
                                        saveWeekName(weekIdx)
                                      if (e.key === 'Escape') {
                                        setEditingWeekNameIdx(null)
                                        setEditingWeekNameValue('')
                                      }
                                    }}
                                    className="w-24 rounded border border-gray-300 px-2 py-0.5 text-xs"
                                    autoFocus
                                  />
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="small"
                                    className="text-xs"
                                    onClick={() => saveWeekName(weekIdx)}
                                  >
                                    Save
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="small"
                                    className="text-xs"
                                    onClick={() => {
                                      setEditingWeekNameIdx(null)
                                      setEditingWeekNameValue('')
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    className="cursor-pointer hover:underline bg-transparent border-0 p-0 text-left font-inherit"
                                    onClick={() => {
                                      setEditingWeekNameIdx(weekIdx)
                                      setEditingWeekNameValue(
                                        getDisplayWeekName(week, weekIdx)
                                      )
                                    }}
                                    title="Click to edit name"
                                  >
                                    {getDisplayWeekName(week, weekIdx)}
                                  </button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="small"
                                    className="text-xs"
                                    title="Duplicate week"
                                    onClick={() => duplicateWeek(weekIdx)}
                                  >
                                    Copy
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="small"
                                    className="text-xs"
                                    title="Move up"
                                    disabled={weekIdx === 0}
                                    onClick={() => reorderWeeks(weekIdx, 'up')}
                                  >
                                    ↑
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="small"
                                    className="text-xs"
                                    title="Move down"
                                    disabled={
                                      weekIdx === structure.weeks.length - 1
                                    }
                                    onClick={() =>
                                      reorderWeeks(weekIdx, 'down')
                                    }
                                  >
                                    ↓
                                  </Button>
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
                                </>
                              )}
                            </div>
                          </div>
                        </td>
                        {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
                          const day = week.days?.[dayIdx]
                          const sections = day?.sections ?? []
                          const blockCount = sections.length
                          const { exerciseNames, setCounts, blockCategories } =
                            getCellSummary(sections, getExerciseName)
                          const key = cellKey(weekIdx, dayIdx)
                          const isSelected = selectedCells.has(key)
                          const isDragging =
                            draggedSession?.weekIdx === weekIdx &&
                            draggedSession?.dayIdx === dayIdx
                          return (
                            <CalendarDayCell
                              key={dayIdx}
                              weekIdx={weekIdx}
                              dayIdx={dayIdx}
                              day={day}
                              week={week}
                              isSelected={isSelected}
                              isDragging={isDragging}
                              program={program}
                              exerciseNames={exerciseNames}
                              setCounts={setCounts}
                              blockCategories={blockCategories}
                              blockCount={blockCount}
                              onMouseEnter={e => {
                                if (isSelectingRef.current)
                                  extendSelection(weekIdx, dayIdx)
                                else if (day)
                                  setHoveredCell({
                                    weekIdx,
                                    dayIdx,
                                    x: e.clientX,
                                    y: e.clientY + 12,
                                  })
                              }}
                              onMouseLeave={() => setHoveredCell(null)}
                              onDragOver={e => {
                                e.preventDefault()
                                e.dataTransfer.dropEffect = 'move'
                              }}
                              onDrop={handleCalendarCellDrop}
                              onDragStart={e => {
                                if (day?.id == null || week.id == null) return
                                handleCellDragStart(e, {
                                  dayId: day.id,
                                  sourceWeekId: week.id,
                                  weekIdx,
                                  dayIdx,
                                })
                              }}
                              onDragEnd={() => setDraggedSession(null)}
                              onMouseDown={() => {
                                selectionAnchorRef.current = { weekIdx, dayIdx }
                                isSelectingRef.current = true
                                setSelectedCells(new Set([key]))
                              }}
                              onClick={() => {
                                if (
                                  selectedCells.size === 1 &&
                                  selectedCells.has(key)
                                ) {
                                  setSessionDesignerCell({ weekIdx, dayIdx })
                                }
                              }}
                              onContextMenu={e => {
                                e.preventDefault()
                                e.stopPropagation()
                                setContextMenu({
                                  x: e.clientX,
                                  y: e.clientY,
                                  weekIdx,
                                  dayIdx,
                                })
                              }}
                              onAddDay={() => {
                                if (
                                  selectedCells.size === 1 &&
                                  selectedCells.has(key)
                                ) {
                                  addDay(weekIdx)
                                  setSessionDesignerCell({
                                    weekIdx,
                                    dayIdx: week.days?.length ?? 0,
                                  })
                                }
                              }}
                            />
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {/* 3.2 Amber: No multi-week; only session templates. Red/Green: Add Week. */}
                {!isAmberCycle && (
                  <div className="mt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={() => addWeek()}
                    >
                      + Add Week
                    </Button>
                  </div>
                )}
              </div>
              {/* MASS 2.8: Hover preview tooltip */}
              {hoveredCell != null &&
                (() => {
                  const week = structure.weeks[hoveredCell.weekIdx]
                  const day = week?.days?.[hoveredCell.dayIdx]
                  if (!day) return null
                  const sections = day.sections ?? []
                  const summary = day.isRestDay
                    ? 'Rest'
                    : sections
                        .map(s => getBlockDisplayName(s, getExerciseName))
                        .slice(0, 6)
                        .join(' · ')
                  return (
                    <div
                      className="fixed z-40 max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg text-left pointer-events-none"
                      style={{ left: hoveredCell.x, top: hoveredCell.y }}
                    >
                      <div className="text-xs font-medium text-gray-900">
                        {day.dayName || `Day ${hoveredCell.dayIdx + 1}`}
                      </div>
                      <div className="text-[11px] text-gray-600 mt-0.5">
                        {summary}
                      </div>
                    </div>
                  )
                })()}
              {/* Right-click context menu */}
              {contextMenu && (
                <div
                  className="fixed z-50 min-w-[140px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
                  style={{
                    left: contextMenu.x,
                    top: contextMenu.y,
                  }}
                >
                  {copiedDays.length > 0 && (
                    <button
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                      onClick={() => {
                        handlePasteAt(contextMenu.weekIdx)
                        setContextMenu(null)
                      }}
                    >
                      Paste
                    </button>
                  )}
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                    onClick={() => {
                      setSelectedCells(
                        new Set([
                          cellKey(contextMenu.weekIdx, contextMenu.dayIdx),
                        ])
                      )
                      handleCopy()
                      setContextMenu(null)
                    }}
                  >
                    Copy
                  </button>
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                    onClick={() => {
                      const week = structure.weeks[contextMenu.weekIdx]
                      const day = week?.days?.[contextMenu.dayIdx]
                      if (day) {
                        setSessionDesignerCell({
                          weekIdx: contextMenu.weekIdx,
                          dayIdx: contextMenu.dayIdx,
                        })
                      } else {
                        addDay(contextMenu.weekIdx)
                        setSessionDesignerCell({
                          weekIdx: contextMenu.weekIdx,
                          dayIdx: week?.days?.length ?? 0,
                        })
                      }
                      setContextMenu(null)
                    }}
                  >
                    Open
                  </button>
                  {(() => {
                    const week = structure.weeks[contextMenu.weekIdx]
                    const day = week?.days?.[contextMenu.dayIdx]
                    if (!program?.id || !week?.id || !day?.id) return null
                    const weekId = week.id
                    const dayId = day.id
                    return (
                      <>
                        <button
                          type="button"
                          className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                          onClick={async () => {
                            setContextMenu(null)
                            try {
                              await programService.duplicateDay(weekId, {
                                sourceDayId: dayId,
                              })
                              await refetchProgram()
                              showSuccess('Day duplicated')
                            } catch (e) {
                              const err = e as AxiosError<{ message?: string }>
                              showError(
                                err.response?.data?.message ??
                                  'Failed to duplicate day'
                              )
                            }
                          }}
                        >
                          Copy day
                        </button>
                        {week.days &&
                          week.days.length > 1 &&
                          week.days.every(d => d?.id) && (
                            <>
                              <button
                                type="button"
                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 disabled:opacity-50"
                                disabled={contextMenu.dayIdx <= 0}
                                onClick={async () => {
                                  setContextMenu(null)
                                  const dayIds = (week.days ?? [])
                                    .map(d => d.id)
                                    .filter((id): id is number => id != null)
                                  if (contextMenu.dayIdx <= 0) return
                                  const [a, b] = [
                                    contextMenu.dayIdx - 1,
                                    contextMenu.dayIdx,
                                  ]
                                  ;[dayIds[a], dayIds[b]] = [
                                    dayIds[b],
                                    dayIds[a],
                                  ]
                                  try {
                                    await programService.reorderDays(weekId, {
                                      dayIds,
                                    })
                                    await refetchProgram()
                                    showSuccess('Day moved left')
                                  } catch (e) {
                                    const err = e as AxiosError<{
                                      message?: string
                                    }>
                                    showError(
                                      err.response?.data?.message ??
                                        'Failed to reorder'
                                    )
                                  }
                                }}
                              >
                                Move day left
                              </button>
                              <button
                                type="button"
                                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 disabled:opacity-50"
                                disabled={
                                  contextMenu.dayIdx >=
                                  (week.days?.length ?? 0) - 1
                                }
                                onClick={async () => {
                                  setContextMenu(null)
                                  const dayIds = (week.days ?? [])
                                    .map(d => d.id)
                                    .filter((id): id is number => id != null)
                                  if (contextMenu.dayIdx >= dayIds.length - 1)
                                    return
                                  const [a, b] = [
                                    contextMenu.dayIdx,
                                    contextMenu.dayIdx + 1,
                                  ]
                                  ;[dayIds[a], dayIds[b]] = [
                                    dayIds[b],
                                    dayIds[a],
                                  ]
                                  try {
                                    await programService.reorderDays(weekId, {
                                      dayIds,
                                    })
                                    await refetchProgram()
                                    showSuccess('Day moved right')
                                  } catch (e) {
                                    const err = e as AxiosError<{
                                      message?: string
                                    }>
                                    showError(
                                      err.response?.data?.message ??
                                        'Failed to reorder'
                                    )
                                  }
                                }}
                              >
                                Move day right
                              </button>
                            </>
                          )}
                      </>
                    )
                  })()}
                </div>
              )}
            </>
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
                      <label
                        htmlFor="session-name-input"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Session name
                      </label>
                      <Input
                        id="session-name-input"
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
                      <label
                        htmlFor="session-notes-input"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Session notes (optional)
                      </label>
                      <textarea
                        id="session-notes-input"
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
                        placeholder="Shown to the athlete before they start. Intent, goals, mindset (e.g. Today is a heavy day. Goal is to hit a new 3RM on the squat.)"
                      />
                    </div>
                  </div>
                  {/* MASS 2.4: Rest day and Estimated duration */}
                  <div className="flex flex-wrap items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={day.isRestDay ?? false}
                        onChange={e => {
                          const weeks = [...structure.weeks]
                          const isRest = e.target.checked
                          const defaultSections: ProgramStructureSection[] =
                            (day.sections?.length ?? 0) > 0
                              ? (day.sections ?? [])
                              : [{ sectionType: 'normal', exercises: [] }]
                          weeks[w].days[d] = {
                            ...day,
                            isRestDay: isRest,
                            sections: isRest ? [] : defaultSections,
                          }
                          setStructure({ weeks })
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Rest day
                      </span>
                    </label>
                    {!day.isRestDay && (
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="estimated-duration-input"
                          className="text-sm font-medium text-gray-700"
                        >
                          Estimated duration (min)
                        </label>
                        <input
                          id="estimated-duration-input"
                          type="number"
                          min={0}
                          max={480}
                          value={day.estimatedDurationMinutes ?? ''}
                          onChange={e => {
                            const v = e.target.value
                            const num =
                              v === ''
                                ? undefined
                                : Math.max(0, Number.parseInt(v, 10) || 0)
                            const weeks = [...structure.weeks]
                            weeks[w].days[d] = {
                              ...day,
                              estimatedDurationMinutes: num,
                            }
                            setStructure({ weeks })
                          }}
                          className="w-20 rounded border border-gray-300 px-2 py-1 text-sm"
                          placeholder="—"
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">
                        Blocks
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          leftIcon={
                            <Icon name="plus" family="solid" size={12} />
                          }
                          onClick={() => setAddBlockModalOpen(true)}
                        >
                          Add Block
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          onClick={() => setLibraryDrawerOpen(true)}
                        >
                          Add from Library
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          onClick={() => {
                            setSaveSessionToLibraryName(
                              day.dayName || 'Session'
                            )
                            setSaveSessionToLibraryOpen(true)
                          }}
                        >
                          Save session to library
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {(day.sections ?? []).map((section, sectionIdx) => (
                        <div
                          key={sectionIdx}
                          id={`session-block-${w}-${d}-${sectionIdx}`}
                          className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/50 p-3"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            {section.parentSectionIndex != null && (
                              <span className="text-xs text-blue-600">
                                Superset
                              </span>
                            )}
                            <span className="text-xs font-medium text-gray-500 uppercase">
                              {(section.blockType ?? 'EXERCISE').slice(0, 1)}
                            </span>
                            <span className="text-sm font-medium truncate">
                              {section.name ||
                                getBlockDisplayName(section, getExerciseName)}
                            </span>
                            {section.blockCategory && (
                              <span className="text-xs text-gray-500">
                                · {section.blockCategory}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 relative">
                            {sectionIdx < (day.sections ?? []).length - 1 &&
                              section.parentSectionIndex == null &&
                              (day.sections ?? [])[sectionIdx + 1] &&
                              (day.sections ?? [])[sectionIdx + 1]
                                .parentSectionIndex == null && (
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
                                    const a = structuredClone(secs[sectionIdx])
                                    const b = structuredClone(
                                      secs[sectionIdx + 1]
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
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-gray-200 text-gray-600"
                              title="Block actions"
                              onClick={e => {
                                e.stopPropagation()
                                setBlockMenuOpen(
                                  blockMenuOpen === `${w}-${d}-${sectionIdx}`
                                    ? null
                                    : `${w}-${d}-${sectionIdx}`
                                )
                              }}
                            >
                              <Icon
                                name="ellipsis-vertical"
                                family="solid"
                                size={14}
                              />
                            </button>
                            {blockMenuOpen === `${w}-${d}-${sectionIdx}` && (
                              <>
                                <div
                                  className="fixed inset-0 z-10"
                                  aria-hidden
                                  onClick={() => setBlockMenuOpen(null)}
                                />
                                <div className="absolute right-0 top-full mt-1 z-20 min-w-[160px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                                  <button
                                    type="button"
                                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                                    onClick={() => {
                                      setBlockMenuOpen(null)
                                      document
                                        .getElementById(
                                          `session-block-${w}-${d}-${sectionIdx}`
                                        )
                                        ?.scrollIntoView({
                                          behavior: 'smooth',
                                          block: 'center',
                                        })
                                    }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                                    onClick={() => {
                                      const weeks = [...structure.weeks]
                                      const secs = [
                                        ...(weeks[w].days[d].sections ?? []),
                                      ]
                                      if (sectionIdx > 0) {
                                        ;[
                                          secs[sectionIdx - 1],
                                          secs[sectionIdx],
                                        ] = [
                                          secs[sectionIdx],
                                          secs[sectionIdx - 1],
                                        ]
                                        weeks[w].days[d] = {
                                          ...day,
                                          sections: secs,
                                        }
                                        setStructure({ weeks })
                                      }
                                      setBlockMenuOpen(null)
                                    }}
                                  >
                                    Move up
                                  </button>
                                  <button
                                    type="button"
                                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                                    onClick={() => {
                                      const weeks = [...structure.weeks]
                                      const secs = [
                                        ...(weeks[w].days[d].sections ?? []),
                                      ]
                                      if (sectionIdx < secs.length - 1) {
                                        ;[
                                          secs[sectionIdx],
                                          secs[sectionIdx + 1],
                                        ] = [
                                          secs[sectionIdx + 1],
                                          secs[sectionIdx],
                                        ]
                                        weeks[w].days[d] = {
                                          ...day,
                                          sections: secs,
                                        }
                                        setStructure({ weeks })
                                      }
                                      setBlockMenuOpen(null)
                                    }}
                                  >
                                    Move down
                                  </button>
                                  <button
                                    type="button"
                                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                                    onClick={() => {
                                      const weeks = [...structure.weeks]
                                      const secs = [
                                        ...(weeks[w].days[d].sections ?? []),
                                      ]
                                      const copy = structuredClone(
                                        secs[sectionIdx]
                                      )
                                      secs.splice(sectionIdx + 1, 0, copy)
                                      weeks[w].days[d] = {
                                        ...day,
                                        sections: secs,
                                      }
                                      setStructure({ weeks })
                                      setBlockMenuOpen(null)
                                    }}
                                  >
                                    Copy block
                                  </button>
                                  <button
                                    type="button"
                                    className="w-full px-3 py-1.5 text-left text-sm text-red-600 hover:bg-red-50"
                                    onClick={() => {
                                      removeSection(w, d, sectionIdx)
                                      setBlockMenuOpen(null)
                                    }}
                                  >
                                    Delete
                                  </button>
                                  {section.blockType === 'CIRCUIT' ? (
                                    <button
                                      type="button"
                                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                                      onClick={async () => {
                                        setBlockMenuOpen(null)
                                        try {
                                          await libraryService.createCircuit({
                                            name: section.name || 'Circuit',
                                            instructions:
                                              section.instructions ?? undefined,
                                            resultTrackingType:
                                              section.resultTrackingType ??
                                              undefined,
                                            blockCategory:
                                              section.blockCategory ??
                                              undefined,
                                            conditioningFormat:
                                              section.conditioningFormat ??
                                              undefined,
                                            conditioningConfig:
                                              section.conditioningConfig as
                                                | Record<string, number>
                                                | undefined,
                                            videoUrls: section.videoUrls,
                                          })
                                          showSuccess(
                                            'Circuit saved to library'
                                          )
                                        } catch (e) {
                                          const err = e as AxiosError<{
                                            message?: string
                                          }>
                                          showError(
                                            err.response?.data?.message ??
                                              'Failed to save circuit to library'
                                          )
                                        }
                                      }}
                                    >
                                      Save to library
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="w-full px-3 py-1.5 text-left text-sm text-gray-400 cursor-not-allowed"
                                      title="Only circuit blocks can be saved to library"
                                      disabled
                                    >
                                      Save to library
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
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
                    Changes auto-save as you work (2.10). No manual save needed.
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
                setAddBlockExerciseCategory('')
                setAddBlockCircuitForm({
                  instructions: '',
                  resultTrackingType: '',
                  blockCategory: '',
                  conditioningFormat: '',
                  videoUrlsStr: '',
                  conditioningConfig: {},
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
                  <div className="mb-2">
                    <label
                      htmlFor="add-block-category"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Block category (optional)
                    </label>
                    <Dropdown
                      placeholder="Uncategorized"
                      value={addBlockExerciseCategory || ''}
                      onValueChange={v =>
                        setAddBlockExerciseCategory(
                          (Array.isArray(v) ? v[0] : v) ?? ''
                        )
                      }
                      options={BLOCK_CATEGORY_OPTIONS}
                    />
                  </div>
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
                          ex,
                          addBlockExerciseCategory || undefined
                        )
                        setAddBlockModalOpen(false)
                        setAddBlockExerciseCategory('')
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
                      <label
                        htmlFor="add-block-instructions"
                        className="block text-xs font-medium text-gray-600 mb-1"
                      >
                        Instructions
                      </label>
                      <textarea
                        id="add-block-instructions"
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
                      <label
                        htmlFor="add-block-result-tracking"
                        className="block text-xs font-medium text-gray-600 mb-1"
                      >
                        Result tracking
                      </label>
                      <Input
                        id="add-block-result-tracking"
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
                      <label
                        htmlFor="add-block-circuit-category"
                        className="block text-xs font-medium text-gray-600 mb-1"
                      >
                        Block category (MASS 2.6)
                      </label>
                      <Dropdown
                        placeholder="Uncategorized"
                        value={addBlockCircuitForm.blockCategory || ''}
                        onValueChange={v =>
                          setAddBlockCircuitForm(f => ({
                            ...f,
                            blockCategory: (Array.isArray(v) ? v[0] : v) ?? '',
                          }))
                        }
                        options={BLOCK_CATEGORY_OPTIONS}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="add-block-conditioning-format"
                        className="block text-xs font-medium text-gray-600 mb-1"
                      >
                        Conditioning format (MASS 2.7)
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
                        options={CONDITIONING_FORMAT_OPTIONS}
                      />
                    </div>
                    {(addBlockCircuitForm.conditioningFormat === 'AMRAP' ||
                      addBlockCircuitForm.conditioningFormat ===
                        'For Time') && (
                      <div>
                        <label
                          htmlFor="conditioning-time-cap"
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Time cap (seconds)
                        </label>
                        <Input
                          id="conditioning-time-cap"
                          type="number"
                          min={0}
                          value={
                            addBlockCircuitForm.conditioningConfig
                              ?.timeCapSeconds ?? ''
                          }
                          onChange={e => {
                            const n = Number.parseInt(e.target.value, 10)
                            setAddBlockCircuitForm(f => ({
                              ...f,
                              conditioningConfig: {
                                ...f.conditioningConfig,
                                timeCapSeconds: Number.isNaN(n) ? undefined : n,
                              },
                            }))
                          }}
                          placeholder="e.g. 600"
                          size="small"
                        />
                      </div>
                    )}
                    {addBlockCircuitForm.conditioningFormat === 'EMOM' && (
                      <>
                        <div>
                          <label
                            htmlFor="conditioning-duration"
                            className="block text-xs font-medium text-gray-600 mb-1"
                          >
                            Total duration (seconds)
                          </label>
                          <Input
                            id="conditioning-duration"
                            type="number"
                            min={0}
                            value={
                              addBlockCircuitForm.conditioningConfig
                                ?.durationSeconds ?? ''
                            }
                            onChange={e => {
                              const n = Number.parseInt(e.target.value, 10)
                              setAddBlockCircuitForm(f => ({
                                ...f,
                                conditioningConfig: {
                                  ...f.conditioningConfig,
                                  durationSeconds: Number.isNaN(n)
                                    ? undefined
                                    : n,
                                },
                              }))
                            }}
                            placeholder="e.g. 1200"
                            size="small"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="conditioning-interval-length"
                            className="block text-xs font-medium text-gray-600 mb-1"
                          >
                            Interval length (seconds)
                          </label>
                          <Input
                            id="conditioning-interval-length"
                            type="number"
                            min={0}
                            value={
                              addBlockCircuitForm.conditioningConfig
                                ?.intervalLengthSeconds ?? ''
                            }
                            onChange={e => {
                              const n = Number.parseInt(e.target.value, 10)
                              setAddBlockCircuitForm(f => ({
                                ...f,
                                conditioningConfig: {
                                  ...f.conditioningConfig,
                                  intervalLengthSeconds: Number.isNaN(n)
                                    ? undefined
                                    : n,
                                },
                              }))
                            }}
                            placeholder="e.g. 60"
                            size="small"
                          />
                        </div>
                      </>
                    )}
                    {(addBlockCircuitForm.conditioningFormat === 'Tabata' ||
                      addBlockCircuitForm.conditioningFormat ===
                        'Custom Interval') && (
                      <div>
                        <label
                          htmlFor="conditioning-rounds"
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Rounds
                        </label>
                        <Input
                          id="conditioning-rounds"
                          type="number"
                          min={1}
                          value={
                            addBlockCircuitForm.conditioningConfig?.rounds ?? ''
                          }
                          onChange={e => {
                            const n = Number.parseInt(e.target.value, 10)
                            setAddBlockCircuitForm(f => ({
                              ...f,
                              conditioningConfig: {
                                ...f.conditioningConfig,
                                rounds: Number.isNaN(n) ? undefined : n,
                              },
                            }))
                          }}
                          placeholder="e.g. 8"
                          size="small"
                        />
                      </div>
                    )}
                    {addBlockCircuitForm.conditioningFormat ===
                      'Custom Interval' && (
                      <>
                        <div>
                          <label
                            htmlFor="conditioning-work"
                            className="block text-xs font-medium text-gray-600 mb-1"
                          >
                            Work (seconds)
                          </label>
                          <Input
                            id="conditioning-work"
                            type="number"
                            min={0}
                            value={
                              addBlockCircuitForm.conditioningConfig
                                ?.workSeconds ?? ''
                            }
                            onChange={e => {
                              const n = Number.parseInt(e.target.value, 10)
                              setAddBlockCircuitForm(f => ({
                                ...f,
                                conditioningConfig: {
                                  ...f.conditioningConfig,
                                  workSeconds: Number.isNaN(n) ? undefined : n,
                                },
                              }))
                            }}
                            placeholder="e.g. 30"
                            size="small"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="conditioning-rest"
                            className="block text-xs font-medium text-gray-600 mb-1"
                          >
                            Rest (seconds)
                          </label>
                          <Input
                            id="conditioning-rest"
                            type="number"
                            min={0}
                            value={
                              addBlockCircuitForm.conditioningConfig
                                ?.restSeconds ?? ''
                            }
                            onChange={e => {
                              const n = Number.parseInt(e.target.value, 10)
                              setAddBlockCircuitForm(f => ({
                                ...f,
                                conditioningConfig: {
                                  ...f.conditioningConfig,
                                  restSeconds: Number.isNaN(n) ? undefined : n,
                                },
                              }))
                            }}
                            placeholder="e.g. 15"
                            size="small"
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <label
                        htmlFor="add-block-video-urls"
                        className="block text-xs font-medium text-gray-600 mb-1"
                      >
                        Video URLs (optional, comma-separated)
                      </label>
                      <Input
                        id="add-block-video-urls"
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
                          conditioningConfig: {},
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

          <LibraryDrawer
            visible={libraryDrawerOpen}
            onClose={() => setLibraryDrawerOpen(false)}
            onAddExercise={exercise => {
              const weekIdx =
                sessionDesignerCell?.weekIdx ??
                structure.weeks.findIndex(w => (w.days?.length ?? 0) > 0) ??
                0
              const dayIdx = sessionDesignerCell?.dayIdx ?? 0
              if (weekIdx < 0 || !structure.weeks[weekIdx]?.days?.[dayIdx]) {
                showError('Open a session or add a day first to add exercises.')
                return
              }
              addBlockAsExercise(weekIdx, dayIdx, {
                id: exercise.id,
                name: exercise.name,
              })
            }}
            onAddCircuit={circuit => {
              const weekIdx =
                sessionDesignerCell?.weekIdx ??
                structure.weeks.findIndex(w => (w.days?.length ?? 0) > 0) ??
                0
              const dayIdx = sessionDesignerCell?.dayIdx ?? 0
              if (weekIdx < 0 || !structure.weeks[weekIdx]?.days?.[dayIdx]) {
                showError('Open a session or add a day first to add circuits.')
                return
              }
              addBlockFromLibraryCircuit(weekIdx, dayIdx, circuit)
            }}
            onAddSession={content => {
              const weekIdx =
                sessionDesignerCell?.weekIdx ??
                structure.weeks.findIndex(w => (w.days?.length ?? 0) < 7)
              const targetWeek = Math.max(0, weekIdx ?? 0)
              addDayFromLibrarySession(targetWeek, content)
            }}
            onCreateExercise={() => {
              setLibraryDrawerOpen(false)
              navigate('/admin/exercises')
            }}
            onAddProgram={async programId => {
              try {
                const res = await programService.getById(programId)
                const prog = (
                  res.data as { data?: { programStructure?: ProgramStructure } }
                )?.data
                const libWeeks = prog?.programStructure?.weeks ?? []
                if (libWeeks.length) {
                  setStructure(prev => ({
                    weeks: [...prev.weeks, ...libWeeks],
                  }))
                  showSuccess('Program weeks added from library')
                } else {
                  showError('Library program has no weeks')
                }
              } catch (e) {
                const err = e as AxiosError<{ message?: string }>
                showError(
                  err.response?.data?.message ??
                    'Failed to load library program'
                )
              }
            }}
          />

          {saveSessionToLibraryOpen &&
            sessionDesignerCell &&
            (() => {
              const day =
                structure.weeks[sessionDesignerCell.weekIdx]?.days?.[
                  sessionDesignerCell.dayIdx
                ]
              return (
                <Modal
                  visible={true}
                  title="Save session to library"
                  onClose={() => {
                    setSaveSessionToLibraryOpen(false)
                    setSaveSessionToLibraryName('')
                  }}
                  size="medium"
                  showCloseButton
                >
                  <div className="p-4 space-y-4">
                    <div>
                      <label
                        htmlFor="new-exercise-name"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Name
                      </label>
                      <Input
                        id="new-exercise-name"
                        value={saveSessionToLibraryName}
                        onChange={e =>
                          setSaveSessionToLibraryName(e.target.value)
                        }
                        placeholder="e.g. Heavy Lower Body"
                        size="small"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => {
                          setSaveSessionToLibraryOpen(false)
                          setSaveSessionToLibraryName('')
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        disabled={
                          saveSessionToLibrarySaving ||
                          !saveSessionToLibraryName.trim()
                        }
                        onClick={async () => {
                          if (!day) return
                          setSaveSessionToLibrarySaving(true)
                          try {
                            const content = {
                              dayName: day.dayName,
                              sessionNotes: day.sessionNotes,
                              isRestDay: day.isRestDay,
                              estimatedDurationMinutes:
                                day.estimatedDurationMinutes,
                              sections: structuredClone(day.sections ?? []),
                            }
                            await libraryService.createSession({
                              name: saveSessionToLibraryName.trim(),
                              content,
                            })
                            showSuccess('Session saved to library')
                            setSaveSessionToLibraryOpen(false)
                            setSaveSessionToLibraryName('')
                          } catch (e) {
                            const err = e as AxiosError<{ message?: string }>
                            showError(
                              err.response?.data?.message ??
                                'Failed to save session to library'
                            )
                          } finally {
                            setSaveSessionToLibrarySaving(false)
                          }
                        }}
                      >
                        {saveSessionToLibrarySaving ? 'Saving...' : 'Save'}
                      </Button>
                    </div>
                  </div>
                </Modal>
              )
            })()}

          {saveProgramToLibraryOpen && program?.id && (
            <Modal
              visible={true}
              title="Save program to library"
              onClose={() => {
                setSaveProgramToLibraryOpen(false)
                setSaveProgramToLibraryName('')
              }}
              size="medium"
              showCloseButton
            >
              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-600">
                  Create a copy of this program as a library template. You can
                  reuse it when building other programs.
                </p>
                <div>
                  <label
                    htmlFor="save-program-to-library-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Name (optional)
                  </label>
                  <Input
                    id="save-program-to-library-name"
                    value={saveProgramToLibraryName}
                    onChange={e => setSaveProgramToLibraryName(e.target.value)}
                    placeholder="e.g. 12-Week Strength (Library copy)"
                    size="small"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setSaveProgramToLibraryOpen(false)
                      setSaveProgramToLibraryName('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={saveProgramToLibrarySaving}
                    onClick={async () => {
                      setSaveProgramToLibrarySaving(true)
                      try {
                        const nameOpt = saveProgramToLibraryName.trim()
                        await (nameOpt
                          ? libraryService.saveProgramToLibrary(
                              program.id,
                              nameOpt
                            )
                          : libraryService.saveProgramToLibrary(program.id))
                        showSuccess('Program saved to library')
                        setSaveProgramToLibraryOpen(false)
                        setSaveProgramToLibraryName('')
                        onSuccess?.()
                      } catch (e) {
                        const err = e as AxiosError<{ message?: string }>
                        showError(
                          err.response?.data?.message ??
                            'Failed to save program to library'
                        )
                      } finally {
                        setSaveProgramToLibrarySaving(false)
                      }
                    }}
                  >
                    {saveProgramToLibrarySaving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              </div>
            </Modal>
          )}

          {/* Remove week confirmation — custom modal instead of native confirm */}
          <Modal
            visible={removeWeekConfirmIdx !== null}
            title="Remove week"
            onClose={() => {
              if (!removeWeekLoading) setRemoveWeekConfirmIdx(null)
            }}
            size="small"
            showCloseButton
            primaryAction={{
              label: removeWeekLoading ? 'Removing…' : 'Remove',
              onPress: () => void confirmRemoveWeek(),
              loading: removeWeekLoading,
              disabled: removeWeekLoading,
            }}
            secondaryAction={{
              label: 'Cancel',
              onPress: () => setRemoveWeekConfirmIdx(null),
              disabled: removeWeekLoading,
            }}
          >
            <div className="p-4">
              <p className="text-sm text-gray-600">
                Remove this week and all its sessions? This cannot be undone.
              </p>
            </div>
          </Modal>

          {/* MASS 2.10: Repeat sessions — modal to choose how many weeks to repeat into */}
          {repeatWeeksModalOpen && (
            <Modal
              visible={true}
              title="Repeat Sessions"
              onClose={() => {
                setRepeatWeeksModalOpen(false)
                setRepeatWeeksCount(1)
              }}
              size="small"
              showCloseButton
            >
              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-600">
                  Duplicate selected sessions into the next N weeks. Each
                  selected session will be copied into each of the following
                  weeks.
                </p>
                <div>
                  <label
                    htmlFor="repeat-weeks-count"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Number of weeks
                  </label>
                  <input
                    id="repeat-weeks-count"
                    type="number"
                    min={1}
                    max={52}
                    value={repeatWeeksCount}
                    onChange={e =>
                      setRepeatWeeksCount(
                        Math.max(
                          1,
                          Number.parseInt(String(e.target.value), 10) || 1
                        )
                      )
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      setRepeatWeeksModalOpen(false)
                      setRepeatWeeksCount(1)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="small"
                    onClick={() => void handleRepeatConfirm()}
                  >
                    Repeat
                  </Button>
                </div>
              </div>
            </Modal>
          )}

          {/* MASS 2.10: Save as Program — create new program from selected sessions */}
          {saveAsProgramModalOpen && (
            <Modal
              visible={true}
              title="Save as Program"
              onClose={() => {
                setSaveAsProgramModalOpen(false)
                setSaveAsProgramName('')
              }}
              size="medium"
              showCloseButton
            >
              <div className="p-4 space-y-4">
                <p className="text-sm text-gray-600">
                  Create a new program containing the {selectedCells.size}{' '}
                  selected session(s) in one week.
                </p>
                <div>
                  <label
                    htmlFor="save-as-program-name"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Program name
                  </label>
                  <Input
                    id="save-as-program-name"
                    value={saveAsProgramName}
                    onChange={e => setSaveAsProgramName(e.target.value)}
                    placeholder="e.g. Copy of My Program"
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => {
                      setSaveAsProgramModalOpen(false)
                      setSaveAsProgramName('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="small"
                    disabled={saveAsProgramSaving || !saveAsProgramName.trim()}
                    onClick={() => void handleSaveAsProgram()}
                  >
                    {saveAsProgramSaving ? 'Creating...' : 'Create program'}
                  </Button>
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
                  <label
                    htmlFor="new-exercise-title"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Title (required)
                  </label>
                  <Input
                    id="new-exercise-title"
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
                    <label
                      htmlFor="new-exercise-param1"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Default Parameter 1
                    </label>
                    <div id="new-exercise-param1">
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
                  </div>
                  <div>
                    <label
                      htmlFor="new-exercise-param2"
                      className="block text-xs font-medium text-gray-600 mb-1"
                    >
                      Default Parameter 2
                    </label>
                    <div id="new-exercise-param2">
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
                </div>
                <div>
                  <label
                    htmlFor="new-exercise-video-url"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Video URL (optional)
                  </label>
                  <Input
                    id="new-exercise-video-url"
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
                  <label
                    htmlFor="new-exercise-pop"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Points of Performance (optional)
                  </label>
                  <textarea
                    id="new-exercise-pop"
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
                  <label
                    htmlFor="new-exercise-tags"
                    className="block text-xs font-medium text-gray-600 mb-1"
                  >
                    Tags (comma-separated)
                  </label>
                  <Input
                    id="new-exercise-tags"
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

      <div className="flex flex-wrap items-center gap-2 pt-4">
        {(() => {
          let submitButtonLabel: string
          if (saving) submitButtonLabel = 'Saving...'
          else if (program) submitButtonLabel = 'Update program'
          else submitButtonLabel = 'Create program'
          return (
            <Button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving}
            >
              {submitButtonLabel}
            </Button>
          )
        })()}
        {program?.id && (
          <>
            <Button
              type="button"
              variant="secondary"
              disabled={saveProgramToLibrarySaving}
              onClick={() => {
                setSaveProgramToLibraryName(
                  program.name ? `${program.name} (Library copy)` : ''
                )
                setSaveProgramToLibraryOpen(true)
              }}
            >
              {saveProgramToLibrarySaving
                ? 'Saving...'
                : 'Save program to library'}
            </Button>
            {program.isPublished ? (
              <Button
                type="button"
                variant="secondary"
                disabled={publishingToggle}
                onClick={async () => {
                  setPublishingToggle(true)
                  try {
                    await programService.update(program.id, {
                      isPublished: false,
                    })
                    showSuccess('Program unpublished')
                    onSuccess?.()
                  } catch (e) {
                    const err = e as AxiosError<{ message?: string }>
                    showError(
                      err.response?.data?.message ?? 'Failed to unpublish'
                    )
                  } finally {
                    setPublishingToggle(false)
                  }
                }}
              >
                {publishingToggle ? 'Updating...' : 'Unpublish'}
              </Button>
            ) : (
              <Button
                type="button"
                variant="secondary"
                disabled={publishingToggle}
                onClick={async () => {
                  setPublishingToggle(true)
                  try {
                    await programService.publish(program.id)
                    showSuccess('Program published')
                    onSuccess?.()
                  } catch (e) {
                    const err = e as AxiosError<{ message?: string }>
                    showError(
                      err.response?.data?.message ??
                        'Failed to publish (admin only)'
                    )
                  } finally {
                    setPublishingToggle(false)
                  }
                }}
              >
                {publishingToggle ? 'Publishing...' : 'Publish'}
              </Button>
            )}
          </>
        )}
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
