import { useState, useEffect, useCallback, useRef } from 'react'
import type { MouseEvent, DragEvent, Dispatch, SetStateAction } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
import { Icon } from '@/components/Icon'
import { Modal } from '@/components/Modal'
import { Drawer } from '@/components/Drawer'
import { adminService } from '@/api/admin.service'
import { goalTypeService } from '@/api/goal-type.service'
import { programService } from '@/api/program.service'
import { exerciseService } from '@/api/exercise.service'
import { libraryService } from '@/api/library.service'
import { LibraryDrawer } from '@/components/Program/LibraryDrawer'
import { RichTextEditor } from '@/components/RichTextEditor'
import { SanitizedHtml } from '@/components/SanitizedHtml'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type {
  Program,
  ProgramStructure,
  ProgramStructureDay,
  ProgramStructureSection,
  ProgramStructureSetRow,
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

/** MASS 2.5.1 / 2.6: Block category options (organizational label); custom text allowed via Other */
const BLOCK_CATEGORY_OPTIONS = [
  { value: '', label: 'Uncategorized' },
  { value: 'Prep', label: 'Prep' },
  { value: 'Speed/Agility', label: 'Speed/Agility' },
  { value: 'Skill/Tech', label: 'Skill/Tech' },
  { value: 'Strength/Power', label: 'Strength/Power' },
  { value: 'Conditioning', label: 'Conditioning' },
  { value: 'Cooldown', label: 'Cooldown' },
  { value: 'Recovery', label: 'Recovery' },
  { value: '__custom__', label: 'Other (custom)' },
]

/** Weight mode options for prescription table (2.5.1) */
const WEIGHT_MODE_OPTIONS = [
  { value: 'absolute_lb', label: 'lb' },
  { value: 'percent', label: '%' },
  { value: 'lwp', label: 'LWP+' },
  { value: 'rpe_only', label: 'RPE Only' },
  { value: 'build_to_heavy', label: 'Build to Heavy' },
]

/** MASS 2.5.2: Circuit result tracking — what the athlete can log after completing the circuit */
const RESULT_TRACKING_OPTIONS = [
  { value: 'None', label: 'None (completion only)' },
  { value: 'Time', label: 'Time' },
  { value: 'Rounds+Reps', label: 'Rounds + Reps' },
  { value: 'Calories', label: 'Calories' },
  { value: 'Distance', label: 'Distance' },
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

/** 3.4 Sustainment: Constraint category options for Sustainment Library */
const SUSTAINMENT_CONSTRAINTS = [
  'Travel',
  'Limited Equipment',
  'Rehab',
  'Time',
  'Deployed',
] as const

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

/** Return a copy of an array with one element patched at index (avoids deep nesting in JSX). */
function patchRowAt<T>(rows: T[], index: number, patch: Partial<T>): T[] {
  return rows.map((r, i) => (i === index ? { ...r, ...patch } : r))
}

/** Block type label for tooltip/aria (Circuit, Superset, Exercise). */
function getBlockTypeTitle(section: ProgramStructureSection): string {
  if (section.blockType === 'CIRCUIT') return 'Circuit'
  if (section.blockType === 'SUPERSET' || section.sectionType === 'superset')
    return 'Superset'
  return 'Exercise'
}

/** Block type icon name for session row (list, link, dumbbell). */
function getBlockTypeIconName(
  section: ProgramStructureSection
): 'list' | 'link' | 'dumbbell' {
  if (section.blockType === 'CIRCUIT') return 'list'
  if (section.blockType === 'SUPERSET' || section.sectionType === 'superset')
    return 'link'
  return 'dumbbell'
}

/** Resolve block category dropdown value (option value or __custom__). */
function getBlockCategoryValue(
  section: ProgramStructureSection | undefined
): string {
  if (!section?.blockCategory) return ''
  const isKnownOption = BLOCK_CATEGORY_OPTIONS.some(
    o => o.value && o.value === section.blockCategory
  )
  return isKnownOption ? section.blockCategory : '__custom__'
}

/** Custom block category text when value is __custom__. */
function getBlockCategoryCustom(
  section: ProgramStructureSection | undefined,
  blockCategoryValue: string
): string {
  return section?.blockCategory && blockCategoryValue === '__custom__'
    ? section.blockCategory
    : ''
}

/** MASS 2.6: Top-level block ranges (each logical block = parent or parent+children for superset). */
function getTopLevelBlockRanges(
  sections: ProgramStructureSection[]
): Array<{ startIdx: number; endIdx: number }> {
  const ranges: Array<{ startIdx: number; endIdx: number }> = []
  let i = 0
  while (i < sections.length) {
    const start = i
    const sec = sections[i]
    const isParent =
      sec.parentSectionIndex == null && sec.parentSectionId == null
    if (!isParent) {
      i++
      continue
    }
    const isSuperset =
      sec.blockType === 'SUPERSET' || sec.sectionType === 'superset'
    if (isSuperset) {
      while (i + 1 < sections.length) {
        const next = sections[i + 1]
        if (
          next.parentSectionIndex === start ||
          next.parentSectionId === (sec as { id?: number }).id
        ) {
          i++
        } else break
      }
    }
    ranges.push({ startIdx: start, endIdx: i })
    i++
  }
  return ranges
}

/** Exercise block prescription row (text reps, weight, RPE, tempo, rest, remove) — reduces nesting in Edit Exercise drawer. */
function ExerciseBlockPrescriptionRow(
  props: Readonly<{
    row: ProgramStructureSetRow
    rowIndex: number
    updateRowAt: (ri: number, patch: Partial<ProgramStructureSetRow>) => void
    onRemoveSet: (ri: number) => void
    canRemoveSet: boolean
  }>
) {
  const { row, rowIndex: ri, updateRowAt, onRemoveSet, canRemoveSet } = props
  return (
    <tr className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50/70">
      <td className="py-2 px-2 text-gray-600 font-medium align-middle">
        {ri + 1}
      </td>
      <td className="py-1.5 px-2 align-middle">
        <Input
          type="text"
          placeholder="5, 8-10, or Max"
          value={row.reps == null ? (row.repsDisplay ?? '') : String(row.reps)}
          onChange={e => {
            const raw = e.target.value.trim()
            const n = Number.parseInt(raw, 10)
            const isNumber = raw !== '' && !Number.isNaN(n) && String(n) === raw
            updateRowAt(
              ri,
              isNumber
                ? { reps: n, repsDisplay: undefined }
                : { reps: undefined, repsDisplay: raw || undefined }
            )
          }}
          size="small"
          className="w-full max-w-28"
        />
      </td>
      <td className="py-1.5 px-2 align-middle">
        <div className="flex items-center gap-1.5 flex-nowrap">
          <select
            className="rounded-md border border-gray-300 px-2 py-1.5 text-sm bg-white min-w-0 w-20"
            value={row.weightMode ?? ''}
            onChange={e =>
              updateRowAt(ri, { weightMode: e.target.value || undefined })
            }
            aria-label="Weight mode"
          >
            <option value="">—</option>
            {WEIGHT_MODE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          {(row.weightMode === 'absolute_lb' ||
            row.weightMode === 'percent' ||
            row.weightMode === 'lwp') && (
            <Input
              type="number"
              min={0}
              step={row.weightMode === 'percent' ? 1 : 0.5}
              placeholder={row.weightMode === 'percent' ? '%' : '#'}
              value={row.weightValue ?? ''}
              onChange={e => {
                const n = Number.parseFloat(e.target.value)
                updateRowAt(ri, {
                  weightValue: Number.isNaN(n) ? undefined : n,
                })
              }}
              size="small"
              className="w-14 shrink-0"
            />
          )}
          {row.weightMode === 'build_to_heavy' && (
            <Input
              placeholder="e.g. Build to Heavy"
              value={row.weightDisplay ?? ''}
              onChange={e =>
                updateRowAt(ri, {
                  weightDisplay: e.target.value || undefined,
                })
              }
              size="small"
              className="w-24 shrink-0"
            />
          )}
        </div>
      </td>
      <td className="py-1.5 px-2 align-middle">
        <Input
          type="number"
          min={1}
          max={10}
          placeholder="—"
          value={row.rpe ?? ''}
          onChange={e => {
            const n = Number.parseFloat(e.target.value)
            updateRowAt(ri, { rpe: Number.isNaN(n) ? undefined : n })
          }}
          size="small"
          className="w-12"
        />
      </td>
      <td className="py-1.5 px-2 align-middle">
        <Input
          placeholder="3-1-2-0"
          value={row.tempo ?? ''}
          onChange={e =>
            updateRowAt(ri, { tempo: e.target.value || undefined })
          }
          size="small"
          className="w-full max-w-22"
        />
      </td>
      <td className="py-1.5 px-2 align-middle">
        <Input
          type="number"
          min={0}
          placeholder="—"
          value={row.restSeconds ?? ''}
          onChange={e => {
            const n = Number.parseInt(e.target.value, 10)
            updateRowAt(ri, {
              restSeconds: Number.isNaN(n) ? undefined : n,
            })
          }}
          size="small"
          className="w-12"
          aria-label="Rest seconds"
        />
      </td>
      <td className="py-1.5 px-2 align-middle text-center">
        {canRemoveSet ? (
          <button
            type="button"
            className="inline-flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            onClick={() => onRemoveSet(ri)}
            aria-label="Remove set"
          >
            ×
          </button>
        ) : null}
      </td>
    </tr>
  )
}

/** Single prescription table row (set, reps, weight, RPE, tempo, rest) — reduces nesting in Edit Superset/Exercise modals. */
function PrescriptionTableRow(
  props: Readonly<{
    row: ProgramStructureSetRow
    rowIndex: number
    updateRowAt: (ri: number, patch: Partial<ProgramStructureSetRow>) => void
  }>
) {
  const { row, rowIndex: ri, updateRowAt } = props
  return (
    <tr className="border-t border-gray-100">
      <td className="py-1 px-2">{ri + 1}</td>
      <td className="py-1 px-2">
        <Input
          type="number"
          min={0}
          value={row.reps ?? ''}
          onChange={e =>
            updateRowAt(ri, {
              reps: Number.parseInt(e.target.value, 10) || undefined,
            })
          }
          size="small"
          className="w-14"
        />
      </td>
      <td className="py-1 px-2">
        <select
          value={row.weightMode ?? ''}
          onChange={e =>
            updateRowAt(ri, {
              weightMode: e.target.value || undefined,
            })
          }
          className="border rounded px-1 py-0.5 text-xs w-24"
        >
          <option value="">—</option>
          {WEIGHT_MODE_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {(row.weightMode === 'absolute_lb' ||
          row.weightMode === 'percent' ||
          row.weightMode === 'lwp') && (
          <Input
            type="number"
            min={0}
            step={row.weightMode === 'percent' ? 1 : 0.5}
            value={row.weightValue ?? ''}
            onChange={e => {
              const n = Number.parseFloat(e.target.value)
              updateRowAt(ri, {
                weightValue: Number.isNaN(n) ? undefined : n,
              })
            }}
            size="small"
            className="w-14 inline-block ml-1"
          />
        )}
        {row.weightMode === 'build_to_heavy' && (
          <Input
            placeholder="Build to Heavy"
            value={row.weightDisplay ?? ''}
            onChange={e =>
              updateRowAt(ri, {
                weightDisplay: e.target.value || undefined,
              })
            }
            size="small"
            className="w-24 inline-block ml-1"
          />
        )}
      </td>
      <td className="py-1 px-2">
        <Input
          type="number"
          min={1}
          max={10}
          value={row.rpe ?? ''}
          onChange={e => {
            const n = Number.parseFloat(e.target.value)
            updateRowAt(ri, {
              rpe: Number.isNaN(n) ? undefined : n,
            })
          }}
          size="small"
          className="w-12"
        />
      </td>
      <td className="py-1 px-2">
        <Input
          value={row.tempo ?? ''}
          onChange={e =>
            updateRowAt(ri, {
              tempo: e.target.value || undefined,
            })
          }
          size="small"
          className="w-20"
        />
      </td>
      <td className="py-1 px-2">
        <Input
          type="number"
          min={0}
          value={row.restSeconds ?? ''}
          onChange={e => {
            const n = Number.parseInt(e.target.value, 10)
            updateRowAt(ri, {
              restSeconds: Number.isNaN(n) ? undefined : n,
            })
          }}
          size="small"
          className="w-14"
        />
      </td>
    </tr>
  )
}

/** Superset block display text (name, rounds, rest) — avoids nested IIFE in JSX. */
function getSupersetBlockDisplayText(section: ProgramStructureSection): string {
  const namePart = section.name ? ': ' + section.name : ''
  const roundsPart =
    section.supersetRounds == null ? '' : ` — ${section.supersetRounds} Rounds`
  const restPart = section.restBetweenRounds
    ? ` | Rest ${section.restBetweenRounds}s`
    : ''
  return 'Superset' + namePart + roundsPart + restPart
}

/** YouTube thumbnail URL from video URL (for exercise picker). Returns null for non-YouTube or invalid. */
function getExerciseThumbnailUrl(
  videoUrl: string | null | undefined
): string | null {
  if (!videoUrl?.trim()) return null
  const u = videoUrl.trim()
  const ytMatch =
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/.exec(u)
  if (ytMatch) return `https://img.youtube.com/vi/${ytMatch[1]}/mqdefault.jpg`
  return null
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
/** Strip heavy embedded exercise details from ProgramStructure before saving.
 * We keep exerciseId and prescription fields, but drop the nested `exercise`
 * object so the payload stays small; exercise details are fetched separately.
 */
function getStructureForSave(structure: ProgramStructure): ProgramStructure {
  return {
    weeks: (structure.weeks ?? []).map(week => ({
      ...week,
      days: (week.days ?? []).map(day => ({
        ...day,
        sections: (day.sections ?? []).map(section => ({
          ...section,
          exercises: (section.exercises ?? []).map(ex => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { exercise, ...rest } = ex
            return rest
          }),
        })),
      })),
    })),
  }
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

/** Session card CSS class for calendar day cell (2.8 Level 1). */
function getCalendarDaySessionCardClass(
  program: ProgramBuilderFormProps['program'],
  isSelected: boolean,
  isDragging: boolean,
  hasDay: boolean
): string {
  const borderStyle =
    program && !program.isPublished
      ? 'border-dashed border-gray-300 bg-gray-50/30'
      : 'border-solid border-gray-300'
  const selectedStyle = isSelected
    ? 'border-[#3AB8ED] bg-blue-100 ring-2 ring-[#3AB8ED] ring-offset-1'
    : 'hover:border-[#3AB8ED] hover:bg-blue-50/50'
  const dragStyle = isDragging ? 'opacity-50 ring-2 ring-primary-400' : ''
  const emptyCellSelectedStyle = isSelected
    ? 'border-[#3AB8ED] bg-blue-100 ring-2 ring-[#3AB8ED] ring-offset-1 text-[#3AB8ED]'
    : 'border-dashed border-gray-300 text-gray-500 hover:border-[#3AB8ED] hover:text-[#3AB8ED]'
  if (hasDay) {
    return `w-full min-h-[88px] rounded-lg border-2 p-2.5 text-left transition-colors shadow-sm bg-white ${dragStyle} ${borderStyle} ${selectedStyle}`
  }
  return `relative w-full min-h-[88px] rounded-lg border-2 flex items-center justify-center text-sm transition-colors group ${emptyCellSelectedStyle}`
}

/** Session card body: name, badge, exercise list, set counts (reduces CalendarDayCell complexity). */
function CalendarDayCellContentBody(
  props: Readonly<{
    dayIdx: number
    day: ProgramStructureDay | undefined
    program: ProgramBuilderFormProps['program']
    exerciseNames: string[]
    setCounts: string[]
    blockCategories: string[]
    blockCount: number
  }>
) {
  const {
    dayIdx,
    day,
    program,
    exerciseNames,
    setCounts,
    blockCategories,
    blockCount,
  } = props
  const dayName = day?.dayName || `Day ${dayIdx + 1}`
  const hasProgramBadge = Boolean(program)
  const publishedClass =
    'text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 shrink-0'
  const draftClass =
    'text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0'
  const badgeClass = program?.isPublished ? publishedClass : draftClass
  const hasExerciseInfo =
    exerciseNames.length > 0 ||
    setCounts.length > 0 ||
    blockCategories.length > 0
  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs font-semibold text-gray-900 truncate">
          {dayName}
        </span>
        {hasProgramBadge && (
          <span
            className={badgeClass}
            aria-label={program?.isPublished ? 'Published' : 'Draft'}
          >
            {program?.isPublished ? 'Published' : 'Draft'}
          </span>
        )}
      </div>
      {exerciseNames.length > 0 && (
        <div
          className="text-[11px] text-gray-600 mt-1 truncate"
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
      {!hasExerciseInfo && (
        <div className="text-xs text-gray-500 mt-1">{blockCount} block(s)</div>
      )}
    </>
  )
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
    onDoubleClick: () => void
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
    onDoubleClick,
    onContextMenu,
    onAddDay,
  } = props
  const isRest = day?.isRestDay ?? false
  const canMoveSession = day?.id != null && week.id != null
  const sessionCardClass = getCalendarDaySessionCardClass(
    program,
    isSelected,
    isDragging,
    Boolean(day)
  )
  const dayCellContent = isRest ? (
    <span className="text-sm text-gray-400 font-medium" aria-label="Rest day">
      Rest
    </span>
  ) : (
    <CalendarDayCellContentBody
      dayIdx={dayIdx}
      day={day}
      program={program}
      exerciseNames={exerciseNames}
      setCounts={setCounts}
      blockCategories={blockCategories}
      blockCount={blockCount}
    />
  )
  const dayNameForAria = day?.dayName || `Day ${dayIdx + 1}`
  const sessionAriaLabel = `Session: ${dayNameForAria}${isRest ? ', Rest day' : ''}`

  return (
    <td
      className="border border-gray-200 p-1.5 align-top"
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
          onDoubleClick={onDoubleClick}
          onContextMenu={onContextMenu}
          className={sessionCardClass}
          aria-label={sessionAriaLabel}
          title="Single-click to select. Double-click to open session."
        >
          {dayCellContent}
        </button>
      ) : (
        <button
          type="button"
          onMouseDown={onMouseDown}
          onClick={onAddDay}
          onContextMenu={onContextMenu}
          className={sessionCardClass}
          aria-label="Add session"
          title="Single-click to select. Double-click to add session."
        >
          <span className="opacity-40 group-hover:opacity-0 transition-opacity">
            +
          </span>
          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            + Add Session
          </span>
        </button>
      )}
    </td>
  )
}

/** Amber calendar month grid (extracted to avoid nesting functions >4 levels). */
function AmberCalendarMonthGrid(
  props: Readonly<{
    year: number
    month: number
    weeks: (number | null)[][]
    sessionDatesSet: Set<string>
    amberAssignDate: string
    onDateClick: (
      dateStr: string,
      year: number,
      month: number
    ) => void | Promise<void>
  }>
) {
  const { year, month, weeks, sessionDatesSet, amberAssignDate, onDateClick } =
    props
  return (
    <>
      {weeks.map((row, ri) =>
        row.map((d, di) => {
          if (d === null) return <div key={`${ri}-${di}`} className="p-0.5" />
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
                onClick={() => onDateClick(dateStr, year, month)}
              >
                {d}
              </button>
            </div>
          )
        })
      )}
    </>
  )
}

/** Props for the session blocks list (one day). */
interface SessionBlocksProps {
  day: ProgramStructureDay
  weekIdx: number
  dayIdx: number
  structure: ProgramStructure
  setStructure: (s: ProgramStructure) => void
  draggedBlock: {
    weekIdx: number
    dayIdx: number
    logicalIdx: number
  } | null
  setDraggedBlock: (b: SessionBlocksProps['draggedBlock']) => void
  getExerciseName: (id: number) => string
  blockMenuOpen: string | null
  setBlockMenuOpen: (s: string | null) => void
  disabled?: boolean
  setEditingExerciseBlock: (
    x: {
      weekIdx: number
      dayIdx: number
      sectionIdx: number
    } | null
  ) => void
  setEditingCircuitBlock: (
    x: {
      weekIdx: number
      dayIdx: number
      sectionIdx: number
    } | null
  ) => void
  setEditingSupersetBlock: (
    x: {
      weekIdx: number
      dayIdx: number
      sectionIdx: number
    } | null
  ) => void
  moveBlockToIndex: (
    w: number,
    d: number,
    from: number,
    to: number
  ) => Promise<void>
  removeSection: (w: number, d: number, idx: number) => void
  onSaveCircuitToLibrary: (section: ProgramStructureSection) => Promise<void>
}

/** Single session block row (extracted to reduce nesting and cognitive complexity). */
function SessionBlockRow(
  props: Readonly<
    SessionBlocksProps & {
      section: ProgramStructureSection
      sectionIdx: number
      blockRanges: Array<{ startIdx: number; endIdx: number }>
      logicalIdx: number
      isGroupedSuperset: boolean
      childSections: ProgramStructureSection[]
    }
  >
) {
  const {
    day,
    weekIdx: w,
    dayIdx: d,
    section,
    sectionIdx,
    blockRanges,
    logicalIdx,
    isGroupedSuperset,
    childSections,
    structure,
    setStructure,
    draggedBlock,
    setDraggedBlock,
    getExerciseName,
    blockMenuOpen,
    setBlockMenuOpen,
    setEditingExerciseBlock,
    setEditingCircuitBlock,
    setEditingSupersetBlock,
    moveBlockToIndex,
    removeSection,
    onSaveCircuitToLibrary,
  } = props
  const isSuperset =
    section.blockType === 'SUPERSET' || section.sectionType === 'superset'
  const isDraggingThis =
    draggedBlock?.weekIdx === w &&
    draggedBlock?.dayIdx === d &&
    draggedBlock?.logicalIdx === logicalIdx
  const dragClass =
    blockRanges.length > 1 ? ' cursor-grab active:cursor-grabbing' : ''
  const opacityClass = isDraggingThis ? ' opacity-50' : ''
  const baseRow = 'flex items-center justify-between gap-2 p-3'
  const rowClassName = isGroupedSuperset
    ? `${baseRow} rounded-t-xl border-2 border-sky-200 border-b border-sky-200/70 bg-sky-50/50${dragClass}${opacityClass}`
    : `${baseRow} rounded-lg border border-gray-200 bg-gray-50/50${dragClass}${opacityClass}`

  const canLinkWithNext =
    sectionIdx < (day.sections ?? []).length - 1 &&
    section.parentSectionIndex == null
  const nextSec = canLinkWithNext
    ? ((day.sections ?? [])[sectionIdx + 1] as
        | ProgramStructureSection
        | undefined)
    : undefined
  const isExerciseBlock = (s: ProgramStructureSection) =>
    s.blockType === 'EXERCISE' ||
    (s.sectionType === 'normal' && (s.exercises?.length ?? 0) > 0)
  const showLinkButton =
    canLinkWithNext &&
    nextSec &&
    nextSec.parentSectionIndex == null &&
    isExerciseBlock(section) &&
    isExerciseBlock(nextSec)

  const menuKey = `${w}-${d}-${sectionIdx}`
  const isMenuOpen = blockMenuOpen === menuKey

  return (
    <div
      key={sectionIdx}
      className={
        isGroupedSuperset
          ? 'rounded-xl border-2 border-sky-200 bg-sky-50/50 overflow-hidden'
          : ''
      }
    >
      <section
        id={`session-block-${w}-${d}-${sectionIdx}`}
        className={rowClassName}
        aria-label="Block row"
        onDragOver={e => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
        }}
        onDrop={e => {
          e.preventDefault()
          if (
            draggedBlock?.weekIdx === w &&
            draggedBlock?.dayIdx === d &&
            draggedBlock?.logicalIdx !== logicalIdx
          ) {
            moveBlockToIndex(w, d, draggedBlock.logicalIdx, logicalIdx)
            setBlockMenuOpen(null)
          }
          setDraggedBlock(null)
        }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {blockRanges.length > 1 && (
            <button
              type="button"
              draggable
              className="shrink-0 text-gray-400 cursor-grab active:cursor-grabbing p-0 border-0 bg-transparent"
              title="Drag to reorder"
              aria-label="Drag to reorder blocks"
              onDragStart={e => {
                e.dataTransfer.setData(
                  'application/json',
                  JSON.stringify({ weekIdx: w, dayIdx: d, logicalIdx })
                )
                setDraggedBlock({ weekIdx: w, dayIdx: d, logicalIdx })
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragEnd={() => setDraggedBlock(null)}
            >
              <Icon name="grip-vertical" family="solid" size={14} />
            </button>
          )}
          <span
            className="shrink-0 text-gray-500"
            title={getBlockTypeTitle(section)}
          >
            <Icon
              name={getBlockTypeIconName(section)}
              family="solid"
              size={16}
            />
          </span>
          {section.blockCategory && (
            <span className="text-xs font-medium text-gray-500 uppercase shrink-0">
              {section.blockCategory}
            </span>
          )}
          <div className="min-w-0">
            <span className="text-sm font-medium truncate block">
              {isSuperset
                ? getSupersetBlockDisplayText(section)
                : section.name || getBlockDisplayName(section, getExerciseName)}
            </span>
            {isSuperset && childSections.length > 0 && (
              <span className="text-xs text-gray-500 block truncate">
                {childSections
                  .map((ch, i) => {
                    const ex0 = ch.exercises?.[0]
                    return `A${i + 1}: ${ex0 ? getExerciseName(ex0.exerciseId) : '—'}`
                  })
                  .join(' · ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 relative">
          {showLinkButton && (
            <button
              type="button"
              className="p-1.5 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-700"
              title="Link with next block as superset"
              aria-label="Link with next block as superset"
              onClick={() => {
                const weeks = [...structure.weeks]
                const secs = [...(weeks[w].days[d].sections ?? [])]
                const a = structuredClone(secs[sectionIdx])
                const b = structuredClone(secs[sectionIdx + 1])
                const parent: ProgramStructureSection = {
                  blockType: 'SUPERSET',
                  sectionType: 'superset',
                  name: 'Superset',
                  exercises: [],
                }
                a.parentSectionIndex = sectionIdx
                b.parentSectionIndex = sectionIdx
                secs.splice(sectionIdx, 2, parent, a, b)
                weeks[w].days[d] = { ...day, sections: secs }
                setStructure({ weeks })
              }}
            >
              <Icon name="link" family="solid" size={16} />
            </button>
          )}
          <button
            type="button"
            className="p-1 rounded hover:bg-gray-200 text-gray-600"
            title="Block actions"
            onClick={e => {
              e.stopPropagation()
              setBlockMenuOpen(isMenuOpen ? null : menuKey)
            }}
          >
            <Icon name="ellipsis-vertical" family="solid" size={14} />
          </button>
          {isMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden
                onClick={() => setBlockMenuOpen(null)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 min-w-[180px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                  onClick={() => {
                    setBlockMenuOpen(null)
                    if (section.blockType === 'EXERCISE') {
                      setEditingExerciseBlock({
                        weekIdx: w,
                        dayIdx: d,
                        sectionIdx,
                      })
                    } else if (section.blockType === 'CIRCUIT') {
                      setEditingCircuitBlock({
                        weekIdx: w,
                        dayIdx: d,
                        sectionIdx,
                      })
                    } else if (
                      section.blockType === 'SUPERSET' ||
                      section.sectionType === 'superset'
                    ) {
                      setEditingSupersetBlock({
                        weekIdx: w,
                        dayIdx: d,
                        sectionIdx,
                      })
                    } else {
                      document
                        .getElementById(`session-block-${w}-${d}-${sectionIdx}`)
                        ?.scrollIntoView({
                          behavior: 'smooth',
                          block: 'center',
                        })
                    }
                  }}
                >
                  {section.blockType === 'SUPERSET' ||
                  section.sectionType === 'superset'
                    ? 'Edit (rounds, rest, notes)'
                    : 'Edit'}
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
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                  onClick={() => {
                    const weeks = [...structure.weeks]
                    const secs = [...(weeks[w].days[d].sections ?? [])]
                    const copy = structuredClone(
                      secs[sectionIdx]
                    ) as ProgramStructureSection & {
                      id?: number
                      parentSectionId?: number
                    }
                    delete copy.id
                    delete copy.parentSectionId
                    if (copy.exercises) {
                      copy.exercises = copy.exercises.map(ex => {
                        const e = { ...ex }
                        delete (e as { sectionExerciseId?: number })
                          .sectionExerciseId
                        return e
                      })
                    }
                    secs.splice(sectionIdx + 1, 0, copy)
                    weeks[w].days[d] = { ...day, sections: secs }
                    setStructure({ weeks })
                    setBlockMenuOpen(null)
                  }}
                >
                  Duplicate
                </button>
                {section.blockType === 'CIRCUIT' ? (
                  <button
                    type="button"
                    className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                    onClick={() => onSaveCircuitToLibrary(section)}
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
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={logicalIdx === 0}
                  title="Move block up"
                  onClick={() => {
                    moveBlockToIndex(w, d, logicalIdx, logicalIdx - 1)
                    setBlockMenuOpen(null)
                  }}
                >
                  Move up
                </button>
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={logicalIdx === blockRanges.length - 1}
                  title="Move block down"
                  onClick={() => {
                    moveBlockToIndex(w, d, logicalIdx, logicalIdx + 1)
                    setBlockMenuOpen(null)
                  }}
                >
                  Move down
                </button>
              </div>
            </>
          )}
        </div>
      </section>
      {isGroupedSuperset &&
        childSections.map((childSec, ci) => (
          <div
            key={ci}
            className="flex items-center gap-2 border-t border-sky-200/70 bg-white/60 pl-4 pr-3 py-2.5"
          >
            <span className="text-xs font-semibold text-sky-600 w-6">
              A{ci + 1}
            </span>
            <span className="text-sm text-gray-800 truncate">
              {getBlockDisplayName(childSec, getExerciseName)}
            </span>
          </div>
        ))}
    </div>
  )
}

/** Session blocks list for one day (extracted to reduce nesting and cognitive complexity). */
function SessionBlocks(props: Readonly<SessionBlocksProps>) {
  const { day } = props
  const secs = day.sections ?? []
  const blockRanges = getTopLevelBlockRanges(secs)
  return (
    <>
      {secs.map((section, sectionIdx) => {
        if (section.parentSectionIndex != null) return null
        const logicalIdx = blockRanges.findIndex(r => r.startIdx === sectionIdx)
        const isSuperset =
          section.blockType === 'SUPERSET' || section.sectionType === 'superset'
        const childSections = isSuperset
          ? secs.filter(
              (s: ProgramStructureSection) =>
                s.parentSectionIndex === sectionIdx ||
                s.parentSectionId === section.id
            )
          : []
        const isGroupedSuperset = isSuperset && childSections.length > 0
        return (
          <SessionBlockRow
            key={sectionIdx}
            {...props}
            section={section}
            sectionIdx={sectionIdx}
            blockRanges={blockRanges}
            logicalIdx={logicalIdx}
            isGroupedSuperset={isGroupedSuperset}
            childSections={childSections}
          />
        )
      })}
    </>
  )
}

/** Add Block superset form state (shared by panel and exercise row). */
type AddBlockSupersetFormState = {
  supersetRounds: number
  restBetweenExercises: string
  restBetweenRounds: string
  supersetNotes: string
  blockCategory: string
  exercises: Array<{
    exerciseId: number
    sets?: number
    reps?: number
    coachingNotes?: string
    setsRows: ProgramStructureSetRow[]
  }>
}

/** One exercise row in Add Block superset form — reduces nesting. */
function AddBlockSupersetExerciseRow(
  props: Readonly<{
    exIdx: number
    exercise: AddBlockSupersetFormState['exercises'][number]
    setForm: Dispatch<SetStateAction<AddBlockSupersetFormState>>
    exerciseList: ExerciseListForBuilderItem[]
    canRemove: boolean
  }>
) {
  const { exIdx, exercise: ex, setForm, exerciseList, canRemove } = props
  const handleExerciseId = (id: number) => {
    setForm(f => ({
      ...f,
      exercises: f.exercises.map((e, i) =>
        i === exIdx ? { ...e, exerciseId: id } : e
      ),
    }))
  }
  const handleRemove = () => {
    setForm(f => ({
      ...f,
      exercises: f.exercises.filter((_, i) => i !== exIdx),
    }))
  }
  return (
    <div className="flex items-center gap-2 rounded border border-gray-200 p-2 bg-gray-50/50">
      <span className="text-xs font-medium text-gray-500 w-8">
        A{exIdx + 1}
      </span>
      <Dropdown
        placeholder="Select exercise..."
        searchable
        searchPlaceholder="Search exercises..."
        options={exerciseList.map(e => ({
          value: String(e.id),
          label: e.name,
        }))}
        value={ex.exerciseId ? String(ex.exerciseId) : ''}
        onValueChange={v => {
          const id = Number.parseInt((Array.isArray(v) ? v[0] : v) ?? '0', 10)
          handleExerciseId(id)
        }}
        fullWidth={false}
        className="flex-1 min-w-0"
      />
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="small"
          className="shrink-0"
          onClick={handleRemove}
          aria-label="Remove exercise"
        >
          Remove
        </Button>
      )}
    </div>
  )
}

/** Add Block modal: superset block form panel — reduces nesting and cognitive complexity. */
function AddBlockSupersetPanel(
  props: Readonly<{
    form: AddBlockSupersetFormState
    setForm: Dispatch<SetStateAction<AddBlockSupersetFormState>>
    exerciseList: ExerciseListForBuilderItem[]
    onSubmit: () => void
  }>
) {
  const { form, setForm, exerciseList, onSubmit } = props
  return (
    <div className="pt-1 border-t border-gray-200">
      <Text variant="default" className="text-sm font-medium mb-2 block">
        Superset block
      </Text>
      <p className="text-xs text-gray-500 mb-3">
        Group 2+ exercises performed back-to-back with rest between rounds. Each
        exercise has its own prescription.
      </p>
      <div className="space-y-3 mb-3">
        <div>
          <label
            htmlFor="add-superset-category"
            className="block text-xs font-medium text-gray-600 mb-1"
          >
            Block category
          </label>
          <Dropdown
            placeholder="Uncategorized"
            value={form.blockCategory || ''}
            onValueChange={v =>
              setForm(f => ({
                ...f,
                blockCategory: (Array.isArray(v) ? v[0] : v) ?? '',
              }))
            }
            options={BLOCK_CATEGORY_OPTIONS}
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label
              htmlFor="add-superset-rounds"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Rounds
            </label>
            <Input
              id="add-superset-rounds"
              type="number"
              min={1}
              value={form.supersetRounds}
              onChange={e =>
                setForm(f => ({
                  ...f,
                  supersetRounds:
                    Number.parseInt(e.target.value || '1', 10) || 1,
                }))
              }
              size="small"
            />
          </div>
          <div>
            <label
              htmlFor="add-superset-rest-exercises"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Rest between exercises (s)
            </label>
            <Input
              id="add-superset-rest-exercises"
              value={form.restBetweenExercises}
              onChange={e =>
                setForm(f => ({ ...f, restBetweenExercises: e.target.value }))
              }
              placeholder="0"
              size="small"
            />
          </div>
          <div>
            <label
              htmlFor="add-superset-rest-rounds"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Rest between rounds (s)
            </label>
            <Input
              id="add-superset-rest-rounds"
              value={form.restBetweenRounds}
              onChange={e =>
                setForm(f => ({ ...f, restBetweenRounds: e.target.value }))
              }
              placeholder="90"
              size="small"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="add-superset-notes"
            className="block text-xs font-medium text-gray-600 mb-1"
          >
            Superset notes
          </label>
          <Input
            id="add-superset-notes"
            value={form.supersetNotes}
            onChange={e =>
              setForm(f => ({ ...f, supersetNotes: e.target.value }))
            }
            placeholder="e.g. Perform back-to-back, rest after each round"
            size="small"
          />
        </div>
      </div>
      <div className="space-y-2 mb-2">
        {form.exercises.map((ex, exIdx) => (
          <AddBlockSupersetExerciseRow
            key={exIdx}
            exIdx={exIdx}
            exercise={ex}
            setForm={setForm}
            exerciseList={exerciseList}
            canRemove={form.exercises.length > 2}
          />
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="small"
        className="mb-3"
        onClick={() =>
          setForm(f => ({
            ...f,
            exercises: [
              ...f.exercises,
              {
                exerciseId: 0,
                sets: 4,
                reps: 8,
                coachingNotes: '',
                setsRows: [{ setIndex: f.exercises.length }],
              },
            ],
          }))
        }
      >
        Add exercise to superset
      </Button>
      <Button type="button" variant="secondary" size="small" onClick={onSubmit}>
        Add superset block
      </Button>
    </div>
  )
}

/** Program metadata (name, cycle, description, category, options) — reduces cognitive complexity of ProgramBuilderForm. */
function ProgramMetadataSection(
  props: Readonly<{
    program: ProgramBuilderFormProps['program']
    isRedCycle: boolean
    isAmberCycle: boolean
    isGreenCycle: boolean
    isSustainmentCycle: boolean
    isCustomCycle: boolean
    numberOfWeeks: number
    setNumberOfWeeks: (n: number | ((prev: number) => number)) => void
    name: string
    setName: (s: string) => void
    cycleId: number
    setCycleId: (id: number) => void
    cycles: Cycle[]
    description: string
    setDescription: (s: string) => void
    showCategory: boolean
    category: string
    setCategory: (s: string) => void
    subCategory: string
    setSubCategory: (s: string) => void
    categoryLabels: Array<{ value: string; label: string }>
    categoryOptions: Array<{ value: string; label: string }>
    durationWeeks: number
    setDurationWeeks: (n: number) => void
    constraintCategory: string
    setConstraintCategory: (s: string) => void
    isActive: boolean
    setIsActive: (b: boolean) => void
    isPublished: boolean
    setIsPublished: (b: boolean) => void
  }>
) {
  const {
    program,
    isRedCycle,
    isAmberCycle,
    isGreenCycle,
    isSustainmentCycle,
    isCustomCycle,
    numberOfWeeks,
    setNumberOfWeeks,
    name,
    setName,
    cycleId,
    setCycleId,
    cycles,
    description,
    setDescription,
    showCategory,
    category,
    setCategory,
    subCategory,
    setSubCategory,
    categoryLabels,
    categoryOptions,
    durationWeeks,
    setDurationWeeks,
    constraintCategory,
    setConstraintCategory,
    isActive,
    setIsActive,
    isPublished,
    setIsPublished,
  } = props

  function getProgramDurationDescription(): string {
    if (isRedCycle)
      return 'Red (Foundations): Fixed-length, sequential. Set number of weeks below; athlete starts Week 1 Day 1 and progresses linearly. End date = start date + number of weeks.'
    if (isAmberCycle)
      return 'Amber (Operational Readiness): Calendar-synced; no fixed end date. Assign sessions to calendar dates below; all athletes on this program see the same workout on the same date. New athletes start on the current date.'
    if (isGreenCycle)
      return 'Green (Mission-Specific Readiness): Event-aligned. Set number of weeks and Green duration below. Green start = event date − duration; if athlete has less time to event, they start at the appropriate week so the program ends on event day. Completion recommends transition to Red.'
    if (isSustainmentCycle)
      return 'Sustainment (Constraint-Based Override): Fixed-length, sequential (same as Red). Week → Day → Block → Exercise. Does not change athlete roadmap or event date; when active it pauses the current cycle program. When sustainment ends, athlete returns to prior program. Tag with constraint category below for Sustainment Library.'
    if (isCustomCycle)
      return 'Custom / 1:1 (Coach-Assigned): Individualized program for one athlete (90 Unchained or 1:1 S&C). Structure is flexible: build Week → Day → Block → Exercise (like Red) or assign sessions per date (like Amber). Assign to exactly one athlete; overrides current cycle; roadmap and event date unchanged. When engagement ends, athlete returns to roadmap-driven cycle. Changes propagate immediately.'
    return 'Auto-calculated from the number of weeks in the calendar below.'
  }
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            Amber: No Week→Day hierarchy. After saving, use the Amber Calendar
            to assign sessions to calendar dates (or from library). One session
            per date; all athletes see the same workout on the same date; edits
            propagate immediately.
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
          {getProgramDurationDescription()}
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
      {isGreenCycle && (
        <div className="rounded border border-emerald-200 bg-emerald-50/30 p-4">
          <Text
            variant="default"
            className="text-sm font-medium text-emerald-900 mb-1 block"
          >
            Green duration (weeks) — Mission-Specific Readiness
          </Text>
          <p className="text-xs text-emerald-800 mb-2">
            Configurable per program. Green start date = event date − this many
            weeks. Used for onboarding and Amber→Green transition. If athlete
            has less time to event than full duration, they start at the
            appropriate week so the program end aligns with event day.
            Completion recommends transition to Red.
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
      {isSustainmentCycle && (
        <div className="rounded border border-slate-200 bg-slate-50/30 p-4">
          <Text
            variant="default"
            className="text-sm font-medium text-slate-900 mb-1 block"
          >
            Constraint category — Sustainment Library
          </Text>
          <p className="text-xs text-slate-700 mb-2">
            Tag for Sustainment Library: Travel, Limited Equipment, Rehab, Time,
            Deployed. Athletes browse by constraint; coach can recommend;
            athlete must confirm to start.
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
      {isCustomCycle && (
        <div className="rounded-xl border border-violet-200 bg-violet-50/30 p-4">
          <Text variant="default" className="font-medium text-violet-900">
            Custom / 1:1 (Coach-Assigned)
          </Text>
          <p className="text-sm text-violet-800 mt-1">
            For 90 Unchained (premier 1:1) or 1:1 S&C. Assigned to exactly one
            athlete. Build as Week → Day → Block → Exercise or assign sessions
            to specific dates (like Amber). Coach:{' '}
            <strong>My Athletes → Assign 1:1 program</strong> and{' '}
            <strong>Assign session to date</strong>. Admin:{' '}
            <strong>Program Management → Custom → Assign</strong> (visibility,
            reassign if coach leaves). 1:1 Nutrition does not use a custom
            training program. Changes propagate immediately.
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
    </>
  )
}

/** Session Designer (Level 2) panel — one day's blocks, name, notes, rest day. Reduces nesting in ProgramBuilderForm. */
function SessionDesignerPanel(
  props: Readonly<
    SessionBlocksProps & {
      setSessionDesignerCell: (
        c: {
          weekIdx: number
          dayIdx: number
        } | null
      ) => void
      setPreviewSessionOpen: (b: boolean) => void
      setLibraryDrawerOpen: (b: boolean) => void
      setSaveSessionToLibraryName: (s: string) => void
      setSaveSessionToLibraryOpen: (b: boolean) => void
      setAddBlockModalOpen: (b: boolean) => void
    }
  >
) {
  const {
    day,
    weekIdx: w,
    dayIdx: d,
    structure,
    setStructure,
    setSessionDesignerCell,
    setPreviewSessionOpen,
    setLibraryDrawerOpen,
    setSaveSessionToLibraryName,
    setSaveSessionToLibraryOpen,
    setAddBlockModalOpen,
    draggedBlock,
    setDraggedBlock,
    getExerciseName,
    blockMenuOpen,
    setBlockMenuOpen,
    setEditingExerciseBlock,
    setEditingCircuitBlock,
    setEditingSupersetBlock,
    moveBlockToIndex,
    removeSection,
    onSaveCircuitToLibrary,
  } = props
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Button
          type="button"
          variant="ghost"
          size="small"
          leftIcon={<Icon name="arrow-left" family="solid" size={14} />}
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
          Session notes
        </label>
        <RichTextEditor
          key={`session-notes-w${w}-d${d}`}
          id="session-notes-input"
          value={day.sessionNotes ?? ''}
          onChange={html => {
            const weeks = [...structure.weeks]
            weeks[w].days[d] = { ...day, sessionNotes: html }
            setStructure({ weeks })
          }}
          placeholder="Shown to the athlete before they start. Intent, goals, mindset (e.g. Today is a heavy day. Goal is to hit a new 3RM on the squat.)"
          minHeight="100px"
          className="mt-1"
        />
      </div>
      <div className="flex flex-wrap items-center gap-6">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={day.isRestDay ?? false}
            onChange={e => {
              const weeks = [...structure.weeks]
              const isRest = e.target.checked
              const defaultSections: ProgramStructureSection[] =
                (day.sections?.length ?? 0) > 0 ? (day.sections ?? []) : []
              weeks[w].days[d] = {
                ...day,
                isRestDay: isRest,
                sections: isRest ? [] : defaultSections,
              }
              setStructure({ weeks })
            }}
            className="rounded border-gray-300"
          />
          <span className="text-sm font-medium text-gray-700">Rest day</span>
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
          <span className="text-sm font-medium text-gray-700">Blocks</span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => setLibraryDrawerOpen(true)}
              disabled={day.isRestDay}
            >
              Add from Library
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => {
                setSaveSessionToLibraryName(day.dayName || 'Session')
                setSaveSessionToLibraryOpen(true)
              }}
              disabled={day.isRestDay}
            >
              Save session to library
            </Button>
          </div>
        </div>
        <div className="space-y-3">
          <SessionBlocks
            day={day}
            weekIdx={w}
            dayIdx={d}
            structure={structure}
            setStructure={setStructure}
            draggedBlock={draggedBlock}
            setDraggedBlock={setDraggedBlock}
            getExerciseName={getExerciseName}
            blockMenuOpen={blockMenuOpen}
            setBlockMenuOpen={setBlockMenuOpen}
            setEditingExerciseBlock={setEditingExerciseBlock}
            setEditingCircuitBlock={setEditingCircuitBlock}
            setEditingSupersetBlock={setEditingSupersetBlock}
            moveBlockToIndex={moveBlockToIndex}
            removeSection={removeSection}
            onSaveCircuitToLibrary={onSaveCircuitToLibrary}
          />
          {(day.sections ?? []).length === 0 && (
            <p className="text-sm text-gray-500 py-2">
              No blocks. Click &quot;+ Add Block&quot; below to add an exercise,
              circuit, or superset block.
            </p>
          )}
          <Button
            type="button"
            variant="secondary"
            size="small"
            leftIcon={<Icon name="plus" family="solid" size={12} />}
            onClick={() => setAddBlockModalOpen(true)}
            disabled={day.isRestDay}
            className="mt-2"
          >
            + Add Block
          </Button>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Changes auto-save as you work. No manual save needed.
      </p>
    </div>
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
  /** MASS 2.5.1: Edit exercise block (prescription table, notes). { weekIdx, dayIdx, sectionIdx } */
  const [editingExerciseBlock, setEditingExerciseBlock] = useState<{
    weekIdx: number
    dayIdx: number
    sectionIdx: number
  } | null>(null)
  const [addBlockCircuitForm, setAddBlockCircuitForm] = useState({
    name: '',
    instructions: '',
    resultTrackingType: 'None',
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
  const [addBlockCircuitCategoryCustom, setAddBlockCircuitCategoryCustom] =
    useState('')
  /** Add Block: search query for "Select Exercise or Circuit" (debounced fetch) */
  const [addBlockSearchQuery, setAddBlockSearchQuery] = useState('')
  /** Add Block modal: selected type so we show only the relevant form */
  const [addBlockType, setAddBlockType] = useState<
    '' | 'EXERCISE' | 'CIRCUIT' | 'SUPERSET'
  >('')
  /** Add Block drawer: show New Exercise form inside drawer instead of modal */
  const [addBlockStep, setAddBlockStep] = useState<'search' | 'newExercise'>(
    'search'
  )
  /** MASS 2.5.3: Add superset form (rounds, rest, notes, 2+ exercises with prescription) */
  const [addBlockSupersetForm, setAddBlockSupersetForm] =
    useState<AddBlockSupersetFormState>({
      supersetRounds: 4,
      restBetweenExercises: '0',
      restBetweenRounds: '90',
      supersetNotes: '',
      blockCategory: '',
      exercises: [
        {
          exerciseId: 0,
          sets: 4,
          reps: 8,
          coachingNotes: '',
          setsRows: [{ setIndex: 0 }],
        },
        {
          exerciseId: 0,
          sets: 4,
          reps: 8,
          coachingNotes: '',
          setsRows: [{ setIndex: 0 }],
        },
      ],
    })
  /** MASS 2.5.3: Edit superset block (rounds, rest, notes, child exercises) */
  const [editingSupersetBlock, setEditingSupersetBlock] = useState<{
    weekIdx: number
    dayIdx: number
    sectionIdx: number
  } | null>(null)
  /** MASS 2.5.2: Edit circuit block (name, instructions, result tracking, videos) */
  const [editingCircuitBlock, setEditingCircuitBlock] = useState<{
    weekIdx: number
    dayIdx: number
    sectionIdx: number
  } | null>(null)
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
  const [repeatConfirmLoading, setRepeatConfirmLoading] = useState(false)
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
  /** Custom confirm modal for "Delete selected sessions" (replaces native confirm) */
  const [deleteSelectedConfirmOpen, setDeleteSelectedConfirmOpen] =
    useState(false)
  const [deleteSelectedLoading, setDeleteSelectedLoading] = useState(false)
  const selectionAnchorRef = useRef<{ weekIdx: number; dayIdx: number } | null>(
    null
  )
  const isSelectingRef = useRef(false)
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
  /** MASS 2.3: Drag week row to reorder (week index). */
  const [draggedWeekIdx, setDraggedWeekIdx] = useState<number | null>(null)
  /** MASS 2.6: Drag block within a day for reordering */
  const [draggedBlock, setDraggedBlock] = useState<{
    weekIdx: number
    dayIdx: number
    logicalIdx: number
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

  /** Add Block: debounced search — when drawer is open, fetch exercises by query */
  useEffect(() => {
    if (!addBlockModalOpen || !sessionDesignerCell) return
    const t = setTimeout(() => {
      fetchExercises(addBlockSearchQuery.trim() || undefined)
    }, 300)
    return () => clearTimeout(t)
  }, [
    addBlockModalOpen,
    addBlockSearchQuery,
    fetchExercises,
    sessionDesignerCell,
  ])

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
      const target = e.target as HTMLElement
      const inInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      if (inInput) return
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
  /** MASS 2.10: Debounced auto-save when editing an existing program.
   * Uses the same payload as manual Update and strips embedded exercise
   * details via getStructureForSave. Skips the first run on modal open.
   */
  const autoSaveInitializedRef = useRef(false)
  useEffect(() => {
    if (!program?.id) return
    if (!autoSaveInitializedRef.current) {
      autoSaveInitializedRef.current = true
      return
    }
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => {
      saveTimeoutRef.current = null
      void (async () => {
        try {
          await programService.update(program.id, buildUpdatePayload())
        } catch {
          // silent; user can still click Update explicitly
        }
      })()
    }, 1500)
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
    // buildUpdatePayload already captures these values; we intentionally keep the
    // dependency list explicit instead of including the function reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    program?.id,
    structure,
    name,
    description,
    cycleId,
    category,
    subCategory,
    isActive,
    durationWeeks,
    constraintCategory,
  ])

  const showCategory =
    cycle?.name === 'Red' || cycle?.name === 'Green' || cycle?.name === 'Amber'
  /** 3.1 Red Cycle (Foundations): Fixed-length sequential; athlete starts Week 1 Day 1, progresses linearly. */
  const isRedCycle = cycle?.name === 'Red'
  const isAmberCycle = cycle?.name === 'Amber'
  /** 3.3 Green: Show Green duration (event-aligned scheduling). */
  const isGreenCycle = cycle?.name === 'Green'
  /** 3.5 Custom / 1:1: Coach-assigned program for one athlete; overrides roadmap until end date. */
  const isCustomCycle = cycle?.name === 'Custom'
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
              sections: [],
            },
          ],
        },
      ],
    })
    if (!program?.id) setNumberOfWeeks(prev => prev + 1)
  }

  const addDay = useCallback(
    async (weekIdx: number) => {
      const week = structure.weeks[weekIdx]
      if ((week?.days?.length ?? 0) >= 7) return
      if (program?.id) {
        let weekId = week?.id
        if (!weekId) {
          try {
            for (let i = 0; i <= weekIdx; i++) {
              const w = structure.weeks[i]
              if (!w?.id) {
                await programService.addWeek(program.id, {
                  weekName: w?.weekName ?? `Week ${i + 1}`,
                })
              }
            }
            const next = await refetchProgram()
            weekId = next?.weeks?.[weekIdx]?.id
          } catch (e) {
            const err = e as AxiosError<{ message?: string }>
            showError(err.response?.data?.message ?? 'Failed to add week')
            return
          }
        }
        if (weekId) {
          const tryAddDay = async (id: number) => {
            const dayCount = structure.weeks[weekIdx]?.days?.length ?? 0
            await programService.addDay(id, {
              dayName:
                cycle?.name === 'Amber' ? undefined : `Day ${dayCount + 1}`,
            })
          }
          try {
            await tryAddDay(weekId)
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
            if (err.response?.status === 404) {
              try {
                const fresh = await refetchProgram()
                const freshWeekId = fresh?.weeks?.[weekIdx]?.id
                if (freshWeekId) {
                  await tryAddDay(freshWeekId)
                  const next = await refetchProgram()
                  const updatedWeek = next?.weeks?.[weekIdx]
                  if (updatedWeek?.days?.length) {
                    setSessionDesignerCell({
                      weekIdx,
                      dayIdx: updatedWeek.days.length - 1,
                    })
                  }
                  return
                }
              } catch {
                // fall through to showError below
              }
            }
            showError(err.response?.data?.message ?? 'Failed to add session')
          }
          return
        }
      }
      const weeks = [...structure.weeks]
      const w = { ...weeks[weekIdx], days: [...(weeks[weekIdx].days ?? [])] }
      const nextDayIdx = w.days.length
      const defaultDayName =
        cycle?.name === 'Amber' ? '' : `Day ${nextDayIdx + 1}`
      w.days.push({
        dayIndex: nextDayIdx,
        dayName: defaultDayName,
        sections: [],
      })
      weeks[weekIdx] = w
      setStructure({ weeks })
    },
    [structure.weeks, program?.id, cycle?.name, refetchProgram, showError]
  )

  /** MASS 2.5.1: Update one exercise block section (category, exercise, setsRows, coachingNotes). */
  const updateExerciseBlockSection = (
    weekIdx: number,
    dayIdx: number,
    sectionIdx: number,
    updates: Partial<ProgramStructureSection>
  ) => {
    const weeks = [...structure.weeks]
    const week = { ...weeks[weekIdx], days: [...weeks[weekIdx].days] }
    const day = {
      ...week.days[dayIdx],
      sections: [...(week.days[dayIdx].sections ?? [])],
    }
    const section = day.sections[sectionIdx]
    if (!section) return
    day.sections[sectionIdx] = { ...section, ...updates }
    week.days[dayIdx] = day
    weeks[weekIdx] = week
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
    const resolvedCategory =
      blockCategory === '__custom__'
        ? undefined
        : blockCategory?.trim() || undefined
    day.sections.push({
      sectionType: 'normal',
      blockType: 'EXERCISE',
      blockCategory: resolvedCategory || undefined,
      exercises: [
        {
          exerciseId: exercise.id,
          sets: 1,
          coachingNotes: '',
          setsRows: [{ setIndex: 0 }],
        },
      ],
    })
    week.days[dayIdx] = day
    weeks[weekIdx] = week
    setStructure({ weeks })
  }

  /** MASS 2.5.2: Update one circuit block section (name, instructions, resultTrackingType, etc.). */
  const updateCircuitBlockSection = (
    weekIdx: number,
    dayIdx: number,
    sectionIdx: number,
    updates: Partial<ProgramStructureSection>
  ) => {
    updateExerciseBlockSection(weekIdx, dayIdx, sectionIdx, updates)
  }

  /** MASS 2.5.3: Update superset parent section (rounds, rest, notes). */
  const updateSupersetBlockSection = (
    weekIdx: number,
    dayIdx: number,
    sectionIdx: number,
    updates: Partial<ProgramStructureSection>
  ) => {
    updateCircuitBlockSection(weekIdx, dayIdx, sectionIdx, updates)
  }

  const addBlockAsCircuit = (
    weekIdx: number,
    dayIdx: number,
    form: {
      name?: string
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
      name: form.name?.trim() || undefined,
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

  /** MASS 2.5.3: Add superset block (parent + 2+ child EXERCISE sections). */
  const addBlockAsSuperset = (
    weekIdx: number,
    dayIdx: number,
    form: {
      supersetRounds: number
      restBetweenExercises: string
      restBetweenRounds: string
      supersetNotes: string
      blockCategory?: string
      exercises: Array<{
        exerciseId: number
        sets?: number
        reps?: number
        coachingNotes?: string
        setsRows: ProgramStructureSetRow[]
      }>
    }
  ) => {
    const weeks = [...structure.weeks]
    const week = { ...weeks[weekIdx], days: [...weeks[weekIdx].days] }
    const day = {
      ...week.days[dayIdx],
      sections: [...(week.days[dayIdx].sections ?? [])],
    }
    const parentIdx = day.sections.length
    day.sections.push({
      sectionType: 'superset',
      blockType: 'SUPERSET',
      name: 'Superset',
      blockCategory: form.blockCategory || undefined,
      supersetRounds: form.supersetRounds,
      restBetweenExercises: form.restBetweenExercises || undefined,
      restBetweenRounds: form.restBetweenRounds || undefined,
      instructions: form.supersetNotes?.trim() || undefined,
      exercises: [],
    })
    form.exercises.forEach(ex => {
      day.sections.push({
        sectionType: 'normal',
        blockType: 'EXERCISE',
        parentSectionIndex: parentIdx,
        exercises: [
          {
            exerciseId: ex.exerciseId,
            sets: ex.sets,
            reps: ex.reps,
            coachingNotes: ex.coachingNotes ?? undefined,
            setsRows: (ex.setsRows?.length
              ? ex.setsRows
              : [{ setIndex: 0 }]
            ).map((r, ri) => ({ ...r, setIndex: r.setIndex ?? ri })),
          },
        ],
      })
    })
    week.days[dayIdx] = day
    weeks[weekIdx] = week
    setStructure({ weeks })
  }

  /** Add Block modal: submit superset block (validates, adds, closes, resets). */
  const handleAddSupersetBlock = () => {
    if (sessionDesignerCell == null) return
    const validExercises = addBlockSupersetForm.exercises.filter(
      e => e.exerciseId > 0
    )
    if (validExercises.length < 2) {
      showError('Select at least 2 exercises for the superset.')
      return
    }
    addBlockAsSuperset(
      sessionDesignerCell.weekIdx,
      sessionDesignerCell.dayIdx,
      {
        ...addBlockSupersetForm,
        exercises: validExercises.map(ex => ({
          ...ex,
          setsRows:
            ex.setsRows?.length > 0
              ? ex.setsRows.map((r, ri) => ({
                  ...r,
                  setIndex: r.setIndex ?? ri,
                }))
              : [{ setIndex: 0 }],
        })),
      }
    )
    setAddBlockModalOpen(false)
    setAddBlockSupersetForm({
      supersetRounds: 4,
      restBetweenExercises: '0',
      restBetweenRounds: '90',
      supersetNotes: '',
      blockCategory: '',
      exercises: [
        {
          exerciseId: 0,
          sets: 4,
          reps: 8,
          coachingNotes: '',
          setsRows: [{ setIndex: 0 }],
        },
        {
          exerciseId: 0,
          sets: 4,
          reps: 8,
          coachingNotes: '',
          setsRows: [{ setIndex: 0 }],
        },
      ],
    })
  }

  /** Add Block modal: submit circuit block (validates, adds, closes, resets). */
  const handleAddCircuitBlock = () => {
    if (!addBlockCircuitForm.instructions?.trim()) {
      showError('Instructions are required for circuit blocks.')
      return
    }
    if (sessionDesignerCell == null) return
    const resolvedCircuitCategory =
      addBlockCircuitForm.blockCategory === '__custom__'
        ? addBlockCircuitCategoryCustom?.trim()
        : addBlockCircuitForm.blockCategory || undefined
    addBlockAsCircuit(sessionDesignerCell.weekIdx, sessionDesignerCell.dayIdx, {
      ...addBlockCircuitForm,
      blockCategory: resolvedCircuitCategory ?? '',
    })
    setAddBlockModalOpen(false)
    setAddBlockCircuitCategoryCustom('')
    setAddBlockCircuitForm({
      name: '',
      instructions: '',
      resultTrackingType: 'None',
      blockCategory: '',
      conditioningFormat: '',
      videoUrlsStr: '',
      conditioningConfig: {},
    })
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
    const isSupersetParent =
      section?.blockType === 'SUPERSET' || section?.sectionType === 'superset'
    const daySections = structure.weeks[weekIdx]?.days?.[dayIdx]?.sections ?? []
    const childIds = isSupersetParent
      ? daySections
          .filter(
            (s: ProgramStructureSection) =>
              s.parentSectionId === section?.id ||
              s.parentSectionIndex === sectionIdx
          )
          .map((s: ProgramStructureSection) => (s as { id?: number }).id)
          .filter((id: number | undefined): id is number => id != null)
      : []
    if (program?.id && sectionId != null) {
      try {
        for (const childId of childIds) {
          await programService.deleteBlock(childId)
        }
        await programService.deleteBlock(sectionId)
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
    const sections = week.days[dayIdx].sections ?? []
    const indicesToRemove = new Set<number>([sectionIdx])
    if (isSupersetParent) {
      sections.forEach((s, i) => {
        if (
          s.parentSectionIndex === sectionIdx ||
          s.parentSectionId === section?.id
        )
          indicesToRemove.add(i)
      })
    }
    const day = {
      ...week.days[dayIdx],
      sections: sections.filter((_, i) => !indicesToRemove.has(i)),
    }
    week.days[dayIdx] = day
    weeks[weekIdx] = week
    setStructure({ weeks })
  }

  const handleSaveCircuitToLibrary = async (
    section: ProgramStructureSection
  ) => {
    setBlockMenuOpen(null)
    try {
      await libraryService.createCircuit({
        name: section.name || 'Circuit',
        instructions: section.instructions ?? undefined,
        resultTrackingType: section.resultTrackingType ?? undefined,
        blockCategory: section.blockCategory ?? undefined,
        conditioningFormat: section.conditioningFormat ?? undefined,
        conditioningConfig: section.conditioningConfig as
          | Record<string, number>
          | undefined,
        videoUrls: section.videoUrls,
      })
      showSuccess('Circuit saved to library')
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(
        err.response?.data?.message ?? 'Failed to save circuit to library'
      )
    }
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

  /** MASS 2.3: Duplicate week (API when program exists, else local) — reserved for future UI */
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

  /** MASS 2.3: Reorder weeks (API when program exists, else local). direction: up/down for buttons. */
  const reorderWeeks = async (fromIdx: number, direction: 'up' | 'down') => {
    const toIdx = direction === 'up' ? fromIdx - 1 : fromIdx + 1
    if (toIdx < 0 || toIdx >= structure.weeks.length) return
    await moveWeekToIndex(fromIdx, toIdx)
  }

  /** MASS 2.3: Move week from fromIdx to toIdx (used by reorder buttons and drag-and-drop). */
  const moveWeekToIndex = async (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx) return
    if (toIdx < 0 || toIdx >= structure.weeks.length) return
    if (program?.id && structure.weeks.every(w => w.id != null)) {
      const weekIds = structure.weeks.map(w => w.id!)
      const [removed] = weekIds.splice(fromIdx, 1)
      weekIds.splice(toIdx, 0, removed)
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
    const [removed] = weeks.splice(fromIdx, 1)
    weeks.splice(toIdx, 0, removed)
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

  /** MASS 2.6: Move one logical block within a day (preserves superset parent+children). Optionally calls reorderBlocks API when program/day/sections have ids. */
  const moveBlockToIndex = async (
    weekIdx: number,
    dayIdx: number,
    fromLogicalIdx: number,
    toLogicalIdx: number
  ) => {
    if (fromLogicalIdx === toLogicalIdx) return
    const week = structure.weeks[weekIdx]
    const day = week?.days?.[dayIdx]
    const sections = day?.sections ?? []
    const ranges = getTopLevelBlockRanges(sections)
    if (
      fromLogicalIdx < 0 ||
      fromLogicalIdx >= ranges.length ||
      toLogicalIdx < 0 ||
      toLogicalIdx >= ranges.length
    )
      return
    const blocks = ranges.map(r => sections.slice(r.startIdx, r.endIdx + 1))
    const [moved] = blocks.splice(fromLogicalIdx, 1)
    blocks.splice(toLogicalIdx, 0, moved)
    const newSections = blocks.flat()
    const weeks = [...structure.weeks]
    weeks[weekIdx] = {
      ...week,
      days: [...(week?.days ?? [])],
    }
    weeks[weekIdx].days[dayIdx] = {
      ...day,
      sections: newSections,
    }
    setStructure({ weeks })
    if (
      program?.id &&
      day?.id != null &&
      newSections.every(s => s.id != null)
    ) {
      const topLevelIds = blocks
        .map(b => b[0].id)
        .filter((id): id is number => id != null)
      try {
        await programService.reorderBlocks(day.id, { blockIds: topLevelIds })
        await refetchProgram()
        showSuccess('Blocks reordered')
      } catch (e) {
        const err = e as AxiosError<{ message?: string }>
        showError(err.response?.data?.message ?? 'Failed to reorder blocks')
      }
    }
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

  /** MASS 2.8: Ctrl+C copy when calendar has selection (not when typing in input/textarea) */
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const inInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      if (inInput) return
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === 'c' &&
        selectedCells.size > 0 &&
        sessionDesignerCell == null
      ) {
        e.preventDefault()
        handleCopy()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [selectedCells.size, sessionDesignerCell, handleCopy])

  /** Delete selected sessions: API delete for saved days (with id), local remove for unsaved days. */
  const handleDeleteSelected = useCallback(async () => {
    if (selectedCells.size === 0) {
      showError('No sessions selected')
      return
    }
    const toDeleteIds: number[] = []
    const toRemoveLocal: Array<{ weekIdx: number; dayIdx: number }> = []
    selectedCells.forEach(k => {
      const [w, d] = k.split('-').map(Number)
      const day = structure.weeks[w]?.days?.[d]
      if (!day) return
      if (day.id != null && program?.id) {
        toDeleteIds.push(day.id)
      } else {
        toRemoveLocal.push({ weekIdx: w, dayIdx: d })
      }
    })
    if (toDeleteIds.length === 0 && toRemoveLocal.length === 0) {
      showError('No sessions selected')
      return
    }
    try {
      if (toDeleteIds.length > 0 && program?.id) {
        for (const dayId of toDeleteIds) {
          await programService.deleteDay(dayId)
        }
        await refetchProgram()
      }
      if (toRemoveLocal.length > 0) {
        const sortedRemovals = [...toRemoveLocal].sort(
          (a, b) => b.weekIdx - a.weekIdx || b.dayIdx - a.dayIdx
        )
        setStructure(prev => {
          const weeks = [...(prev.weeks ?? [])]
          sortedRemovals.forEach(({ weekIdx, dayIdx }) => {
            const week = weeks[weekIdx]
            if (!week?.days) return
            const newDays = week.days.filter((_, i) => i !== dayIdx)
            weeks[weekIdx] = { ...week, days: newDays }
          })
          return { weeks }
        })
      }
      setSelectedCells(new Set())
      const total = toDeleteIds.length + toRemoveLocal.length
      showSuccess(`Deleted ${total} session(s)`)
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

  /** Amber: open session designer for session by programDayId (extracted to reduce nesting). */
  const handleAmberSessionEdit = useCallback(
    (row: { programDayId?: number; weekIndex?: number; dayIndex?: number }) => {
      let weekIdx = (row.weekIndex ?? 1) - 1
      let dayIdx = row.dayIndex ?? 0
      for (let w = 0; w < structure.weeks.length; w++) {
        const week = structure.weeks[w] as {
          days?: Array<{ id?: number }>
        }
        const days = week.days ?? []
        const dIdx = days.findIndex(d => d.id === row.programDayId)
        if (dIdx >= 0) {
          weekIdx = w
          dayIdx = dIdx
          break
        }
      }
      setSessionDesignerCell({ weekIdx, dayIdx })
    },
    [structure.weeks]
  )

  /** Amber calendar: previous month (extracted to reduce nesting). */
  const handleAmberCalendarMonthPrev = useCallback(() => {
    setAmberCalendarMonth(s =>
      s.month === 0
        ? { year: s.year - 1, month: 11 }
        : { ...s, month: s.month - 1 }
    )
  }, [])

  /** Amber calendar: next month (extracted to reduce nesting). */
  const handleAmberCalendarMonthNext = useCallback(() => {
    setAmberCalendarMonth(s =>
      s.month === 11
        ? { year: s.year + 1, month: 0 }
        : { ...s, month: s.month + 1 }
    )
  }, [])

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
        .catch(err => {
          const e = err as AxiosError<{ message?: string }>
          showError(e.response?.data?.message ?? 'Failed to move session')
        })
    },
    [structure.weeks, refetchProgram, showSuccess, showError]
  )

  /** Calendar day cell event handlers (extracted to satisfy Sonar nest-functions rule). */
  const getCalendarDayCellHandlers = useCallback(
    (p: {
      weekIdx: number
      dayIdx: number
      week: { id?: number; days?: Array<{ id?: number }> }
      day: { id?: number } | undefined
      key: string
    }) => ({
      onMouseEnter: (e: React.MouseEvent) => {
        if (isSelectingRef.current) extendSelection(p.weekIdx, p.dayIdx)
        else if (p.day)
          setHoveredCell({
            weekIdx: p.weekIdx,
            dayIdx: p.dayIdx,
            x: e.clientX,
            y: e.clientY + 12,
          })
      },
      onMouseLeave: () => setHoveredCell(null),
      onDragOver: (e: React.DragEvent) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      },
      onDragStart: (e: React.DragEvent<HTMLButtonElement>) => {
        if (p.day?.id == null || p.week.id == null) return
        handleCellDragStart(e, {
          dayId: p.day.id,
          sourceWeekId: p.week.id,
          weekIdx: p.weekIdx,
          dayIdx: p.dayIdx,
        })
      },
      onDragEnd: () => setDraggedSession(null),
      onMouseDown: () => {
        const isAlreadySingleSelected =
          selectedCells.size === 1 && selectedCells.has(p.key)
        if (isAlreadySingleSelected) {
          selectionAnchorRef.current = null
          isSelectingRef.current = false
          setSelectedCells(new Set())
          setSessionDesignerCell(null)
          return
        }
        selectionAnchorRef.current = { weekIdx: p.weekIdx, dayIdx: p.dayIdx }
        isSelectingRef.current = true
        setSelectedCells(new Set([p.key]))
      },
      onClick: () => {
        // Single-click: select cell (handled in onMouseDown). No-op here to avoid
        // accidentally opening the session on single click.
      },
      onDoubleClick: () => {
        setSessionDesignerCell({ weekIdx: p.weekIdx, dayIdx: p.dayIdx })
      },
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          weekIdx: p.weekIdx,
          dayIdx: p.dayIdx,
        })
      },
      onAddDay: () => {
        if (selectedCells.size === 1 && selectedCells.has(p.key)) {
          addDay(p.weekIdx)
          setSessionDesignerCell({
            weekIdx: p.weekIdx,
            dayIdx: p.week.days?.length ?? 0,
          })
        }
      },
    }),
    [
      extendSelection,
      handleCellDragStart,
      addDay,
      selectedCells,
      setSessionDesignerCell,
    ]
  )

  /** Repeat: duplicate selected days into the next N weeks (weeks after selection) */
  const handleRepeatConfirm = useCallback(async () => {
    if (!program?.id) {
      showError('Save the program first to repeat sessions')
      return
    }
    if (selectedCells.size === 0) {
      showError('Select at least one session to repeat')
      return
    }
    const daysToRepeat = Array.from(selectedCells)
      .map(k => {
        const [w, d] = k.split('-').map(Number)
        const day = structure.weeks[w]?.days?.[d]
        return day?.id ? { dayId: day.id } : null
      })
      .filter((x): x is { dayId: number } => x != null)
    if (daysToRepeat.length === 0) {
      showError('No sessions with ID to repeat — save the program first')
      return
    }
    const maxSelectedWeekIdx = Math.max(
      ...Array.from(selectedCells).map(k => Number(k.split('-')[0]))
    )
    const N = Math.max(1, repeatWeeksCount)
    setRepeatConfirmLoading(true)
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
    } finally {
      setRepeatConfirmLoading(false)
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
    if (isRedCycle && (numberOfWeeks < 1 || !Number.isInteger(numberOfWeeks)))
      return 'Red cycle programs require at least 1 week (set number of weeks or add weeks in the calendar)'
    if (isGreenCycle && (durationWeeks < 1 || !Number.isInteger(durationWeeks)))
      return 'Green duration (weeks) must be at least 1'
    if (isSustainmentCycle && !constraintCategory.trim())
      return 'Constraint category is required for Sustainment (Travel, Limited Equipment, Rehab, Time, Deployed)'
    if (!program) return null
    if (!structureHasContent(structure))
      return 'Add at least one block with content to the program'
    return null
  }

  const getResolvedGoalType = (): GoalType | undefined => {
    const cycleType = getCycleTypeFromName(cycle?.name)
    if (cycleType !== 'GREEN' || !category || !subCategory) return undefined
    return goalTypes.find(
      g => g.category === category && g.subCategory === subCategory
    )
  }

  const buildUpdatePayload = () => {
    const cycleType = getCycleTypeFromName(cycle?.name)
    const goalType = getResolvedGoalType()
    const programWeeks = (program as { numberOfWeeks?: number })?.numberOfWeeks
    const greenDuration =
      durationWeeks >= 1 ? durationWeeks : (programWeeks ?? null)
    return {
      program_name: name.trim(),
      program_description: description.trim(),
      cycleId,
      category: category || null,
      subCategory: subCategory || null,
      isActive,
      programStructure: getStructureForSave(structure),
      ...(goalType && { goalTypeId: goalType.id }),
      ...(cycleType === 'GREEN' && { durationWeeks: greenDuration }),
      ...(cycleType === 'SUSTAINMENT' && {
        constraintCategory: constraintCategory.trim() || null,
      }),
    }
  }

  const getResolvedWeeksForCreate = (): number => {
    const cycleType = getCycleTypeFromName(cycle?.name)
    if (cycleType === 'AMBER') return 0
    if (cycleType === 'RED')
      return Math.max(1, numberOfWeeks, structure.weeks?.length ?? 0)
    if (numberOfWeeks >= 1) return numberOfWeeks
    return structure.weeks?.length ?? 1
  }

  const buildCreatePayload = (): Parameters<
    typeof programService.create
  >[0] => {
    const cycleType = getCycleTypeFromName(cycle?.name)
    const goalType = getResolvedGoalType()
    const resolvedWeeks = getResolvedWeeksForCreate()
    const greenDuration = durationWeeks >= 1 ? durationWeeks : resolvedWeeks
    const sustainmentCategory = constraintCategory.trim() || undefined
    return {
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
      ...(cycleType === 'GREEN' && { durationWeeks: greenDuration }),
      ...(cycleType === 'SUSTAINMENT' &&
        sustainmentCategory && {
          constraintCategory: sustainmentCategory,
        }),
      programStructure: getStructureForSave(structure),
    }
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
        await programService.update(program.id, buildUpdatePayload())
        showSuccess('Program updated')
      } else {
        const res = await programService.create(buildCreatePayload())
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

  /** Calendar vs session designer (nested to reduce ProgramBuilderForm cognitive complexity). */
  function renderCalendarOrDesigner() {
    if (sessionDesignerCell == null) return renderCalendarView()
    const w = sessionDesignerCell.weekIdx
    const d = sessionDesignerCell.dayIdx
    const week = structure.weeks[w]
    const day = week?.days?.[d]
    if (!week || !day) return null
    return (
      <SessionDesignerPanel
        day={day}
        weekIdx={w}
        dayIdx={d}
        structure={structure}
        setStructure={setStructure}
        setSessionDesignerCell={setSessionDesignerCell}
        setPreviewSessionOpen={setPreviewSessionOpen}
        setLibraryDrawerOpen={setLibraryDrawerOpen}
        setSaveSessionToLibraryName={setSaveSessionToLibraryName}
        setSaveSessionToLibraryOpen={setSaveSessionToLibraryOpen}
        setAddBlockModalOpen={setAddBlockModalOpen}
        draggedBlock={draggedBlock}
        setDraggedBlock={setDraggedBlock}
        getExerciseName={getExerciseName}
        blockMenuOpen={blockMenuOpen}
        setBlockMenuOpen={setBlockMenuOpen}
        setEditingExerciseBlock={setEditingExerciseBlock}
        setEditingCircuitBlock={setEditingCircuitBlock}
        setEditingSupersetBlock={setEditingSupersetBlock}
        moveBlockToIndex={moveBlockToIndex}
        removeSection={removeSection}
        onSaveCircuitToLibrary={handleSaveCircuitToLibrary}
      />
    )
  }

  /** Calendar grid UI (nested function so Sonar excludes its complexity from ProgramBuilderForm). */
  function renderCalendarView() {
    return (
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
              {(program as { durationWeeks?: number | null }).durationWeeks !=
                null && (
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
                  {(program as { sessionsPerWeek?: number }).sessionsPerWeek}
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
                title="Publish program (makes all sessions visible to athletes)"
              >
                {publishingToggle ? 'Publishing...' : 'Publish program'}
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
        {/* Selection toolbar: always visible; actions enabled when there is a selection */}
        <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-gray-100 border border-gray-200 mt-2">
          <span className="text-sm text-gray-600 mr-2">
            {selectedCells.size > 0
              ? `${selectedCells.size} session(s) selected`
              : 'No sessions selected'}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => handleCopy()}
            disabled={selectedCells.size === 0}
          >
            Copy
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => setDeleteSelectedConfirmOpen(true)}
            disabled={selectedCells.size === 0}
          >
            Delete
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => setRepeatWeeksModalOpen(true)}
            disabled={selectedCells.size === 0}
          >
            Repeat…
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => {
              setSaveAsProgramName(`Copy of ${program?.name ?? 'Program'}`)
              setSaveAsProgramModalOpen(true)
            }}
            disabled={selectedCells.size === 0 || !program}
          >
            Save as Program
          </Button>
          {program && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="small"
                disabled={
                  publishingToggle ||
                  program.isPublished ||
                  selectedCells.size === 0
                }
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
                disabled={
                  publishingToggle ||
                  !program.isPublished ||
                  selectedCells.size === 0
                }
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
                {publishingToggle ? 'Unpublishing...' : 'Unpublish program'}
              </Button>
            </>
          )}
          <Button
            type="button"
            variant="ghost"
            size="small"
            onClick={() => setSelectedCells(new Set())}
            disabled={selectedCells.size === 0}
          >
            Clear selection
          </Button>
        </div>
        {/* MASS 2.8 Level 1: Program Calendar View (Overview) — rows = weeks, columns = days */}
        <h2 className="text-lg font-semibold text-gray-900 mb-2 mt-4">
          Program Calendar
        </h2>
        <p className="text-sm text-gray-600 mb-3">
          <span className="font-medium text-gray-700">Tips:</span> Single-click
          a session to select or unselect it (for Copy, Delete, Repeat, Save as
          Program). Double-click to open or create a session. Hover to preview.
          Drag to multi-select. Right-click for Copy / Paste / Open. Shortcuts:
          Ctrl+C to copy, Ctrl+V to paste (with a cell selected).
        </p>
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
                <tr
                  key={week.id ?? weekIdx}
                  className={
                    draggedWeekIdx === weekIdx
                      ? 'opacity-60 bg-gray-100'
                      : undefined
                  }
                >
                  <td
                    className="border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 align-top"
                    title={
                      structure.weeks.length > 1 &&
                      editingWeekNameIdx !== weekIdx
                        ? 'Drag to reorder weeks'
                        : undefined
                    }
                    draggable={
                      structure.weeks.length > 1 &&
                      editingWeekNameIdx !== weekIdx
                    }
                    onDragStart={e => {
                      if (editingWeekNameIdx === weekIdx) return
                      setDraggedWeekIdx(weekIdx)
                      e.dataTransfer.setData('text/plain', String(weekIdx))
                      e.dataTransfer.effectAllowed = 'move'
                    }}
                    onDragEnd={() => setDraggedWeekIdx(null)}
                    onDragOver={e => {
                      e.preventDefault()
                      e.dataTransfer.dropEffect = 'move'
                    }}
                    onDrop={e => {
                      e.preventDefault()
                      if (draggedWeekIdx == null) return
                      moveWeekToIndex(draggedWeekIdx, weekIdx)
                      setDraggedWeekIdx(null)
                    }}
                  >
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
                                if (e.key === 'Enter') saveWeekName(weekIdx)
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
                              className="cursor-pointer hover:underline bg-transparent border-0 p-0 text-left font-inherit min-w-18"
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
                            {!isAmberCycle && (
                              <>
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
                                  onClick={() => reorderWeeks(weekIdx, 'down')}
                                >
                                  ↓
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="small"
                                  className="text-xs"
                                  title="Copy week"
                                  onClick={() => void duplicateWeek(weekIdx)}
                                >
                                  Copy
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
                        {...getCalendarDayCellHandlers({
                          weekIdx,
                          dayIdx,
                          week,
                          day,
                          key,
                        })}
                        onDrop={handleCalendarCellDrop}
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
        {contextMenu && (
          <div
            className="fixed z-50 rounded-md border border-gray-200 bg-white shadow-lg text-sm"
            style={{ top: contextMenu.y, left: contextMenu.x }}
            onClick={e => e.stopPropagation()}
            onContextMenu={e => {
              e.preventDefault()
              e.stopPropagation()
            }}
          >
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left hover:bg-gray-100"
              onClick={() => {
                handleCopy()
                setContextMenu(null)
              }}
            >
              Copy session
            </button>
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left hover:bg-gray-100 disabled:text-gray-400"
              disabled={copiedDays.length === 0 || !program?.id}
              onClick={() => {
                if (copiedDays.length === 0 || !program?.id) return
                void handlePasteAt(contextMenu.weekIdx)
                setContextMenu(null)
              }}
            >
              Paste into week
            </button>
            <button
              type="button"
              className="block w-full px-3 py-1.5 text-left hover:bg-gray-100"
              onClick={() => {
                setSessionDesignerCell({
                  weekIdx: contextMenu.weekIdx,
                  dayIdx: contextMenu.dayIdx,
                })
                setContextMenu(null)
              }}
            >
              Open session
            </button>
          </div>
        )}
        {/* MASS 2.8: Hover preview — session contents without opening */}
        {hoveredCell != null &&
          (() => {
            const week = structure.weeks[hoveredCell.weekIdx]
            const day = week?.days?.[hoveredCell.dayIdx]
            if (!day) return null
            const sections = day.sections ?? []
            const { exerciseNames, setCounts } = getCellSummary(
              sections,
              getExerciseName
            )
            const blockNames = sections
              .map(s => getBlockDisplayName(s, getExerciseName))
              .slice(0, 6)
            return (
              <div
                className="fixed z-40 max-w-sm rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-lg text-left pointer-events-none"
                style={{ left: hoveredCell.x, top: hoveredCell.y }}
              >
                <div className="text-xs font-semibold text-gray-900">
                  {day.dayName || `Day ${hoveredCell.dayIdx + 1}`}
                </div>
                {day.isRestDay ? (
                  <div className="text-[11px] text-gray-500 mt-1">Rest day</div>
                ) : (
                  <div className="text-[11px] text-gray-600 mt-1 space-y-0.5">
                    {exerciseNames.length > 0 && (
                      <div title={exerciseNames.join(', ')}>
                        {exerciseNames.join(', ')}
                      </div>
                    )}
                    {setCounts.length > 0 && (
                      <div className="text-gray-500">
                        {setCounts.join(', ')}
                      </div>
                    )}
                    {blockNames.length > 0 && (
                      <ul className="list-disc pl-3 mt-0.5 text-gray-500">
                        {blockNames.map((b, j) => (
                          <li key={j}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )
          })()}
      </>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <ProgramMetadataSection
        program={program}
        isRedCycle={isRedCycle}
        isAmberCycle={isAmberCycle}
        isGreenCycle={isGreenCycle}
        isSustainmentCycle={isSustainmentCycle}
        isCustomCycle={isCustomCycle}
        numberOfWeeks={numberOfWeeks}
        setNumberOfWeeks={setNumberOfWeeks}
        name={name}
        setName={setName}
        cycleId={cycleId}
        setCycleId={setCycleId}
        cycles={cycles}
        description={description}
        setDescription={setDescription}
        showCategory={showCategory}
        category={category}
        setCategory={setCategory}
        subCategory={subCategory}
        setSubCategory={setSubCategory}
        categoryLabels={categoryLabels}
        categoryOptions={categoryOptions}
        durationWeeks={durationWeeks}
        setDurationWeeks={setDurationWeeks}
        constraintCategory={constraintCategory}
        setConstraintCategory={setConstraintCategory}
        isActive={isActive}
        setIsActive={setIsActive}
        isPublished={isPublished}
        setIsPublished={setIsPublished}
      />

      {/* 3.2 Amber: Calendar view — assign sessions to dates. One session per date; all athletes see same workout on same date. (IIFE reduces ProgramBuilderForm cognitive complexity.) */}
      {(() => {
        return (
          <>
            {isAmberCycle && !program?.id && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4">
                <Text variant="default" className="font-medium text-amber-900">
                  Amber Calendar (Operational Readiness)
                </Text>
                <p className="text-sm text-amber-800 mt-1">
                  Save the program to unlock the Amber Calendar. Then assign
                  sessions to calendar dates (or from library). One session per
                  date; all athletes see the same workout on the same date;
                  typically publish 1–2 weeks in advance.
                </p>
              </div>
            )}
            {Boolean(program?.id && isAmberCycle) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50/30 p-4 space-y-3">
                <Text variant="default" className="font-medium text-amber-900">
                  Amber Calendar (calendar-based; no Week→Day grid)
                </Text>
                <p className="text-sm text-amber-800">
                  Click a date to assign or create a session. One live session
                  per date per program; all athletes see the same workout on the
                  same date; coach/admin edits propagate immediately to all
                  athletes.
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
                  const handleAmberDateClick = async (
                    dateStr: string,
                    y: number,
                    m: number
                  ) => {
                    setAmberAssignDate(dateStr)
                    if (
                      !amberFrom ||
                      !amberTo ||
                      amberSessionsList.length === 0
                    ) {
                      setAmberFrom(dateStr)
                      const end = new Date(y, m + 1, 0)
                      const toStr = end.toISOString().slice(0, 10)
                      setAmberTo(toStr)
                      if (program?.id) {
                        setAmberLoading(true)
                        try {
                          const res = await programService.getAmberSessions(
                            program.id,
                            {
                              from: dateStr,
                              to: toStr,
                            }
                          )
                          setAmberSessionsList(res.data?.data?.rows ?? [])
                        } catch {
                          setAmberSessionsList([])
                        } finally {
                          setAmberLoading(false)
                        }
                      }
                    }
                  }
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
                            onClick={handleAmberCalendarMonthPrev}
                          >
                            ‹
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="small"
                            className="h-7 w-7 p-0 text-amber-800"
                            onClick={handleAmberCalendarMonthNext}
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
                        <AmberCalendarMonthGrid
                          year={year}
                          month={month}
                          weeks={weeks}
                          sessionDatesSet={sessionDatesSet}
                          amberAssignDate={amberAssignDate}
                          onDateClick={handleAmberDateClick}
                        />
                      </div>
                      <p className="text-xs text-amber-800 mt-2">
                        Click a date to select it, then use &quot;Create new
                        session&quot; or &quot;Assign to date&quot; below.
                      </p>
                    </div>
                  )
                })()}
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    htmlFor="program-builder-amber-from"
                    className="sr-only"
                  >
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
                                onClick={() => handleAmberSessionEdit(row)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="small"
                                className="text-red-600 text-xs"
                                onClick={() =>
                                  void handleRemoveAmberSession(row)
                                }
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
                        const res =
                          await programService.createEmptyAmberSession(
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
                                const dayOrSessionName =
                                  d.dayName ??
                                  (d.isRestDay
                                    ? `Day ${d.dayIndex + 1}`
                                    : `Session ${d.dayIndex + 1}`)
                                const label = d.isRestDay
                                  ? `Rest - ${dayOrSessionName}`
                                  : dayOrSessionName
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
                      onChange={e =>
                        setAmberAssignFromLibraryDate(e.target.value)
                      }
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
                      {amberLibrarySessionsLoading
                        ? 'Loading…'
                        : 'Load sessions'}
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
          </>
        )
      })()}

      {/* MASS 2.8: Calendar grid view (Level 1) — Red/Green only. 3.2 Amber: do NOT show Week→Day grid; Amber uses calendar-date view only (see Amber Calendar above). */}
      {structure.weeks.length > 0 && !isAmberCycle && (
        <div className="space-y-4">
          {renderCalendarOrDesigner()}
          {previewSessionOpen &&
            sessionDesignerCell &&
            (() => {
              const day =
                structure.weeks[sessionDesignerCell.weekIdx]?.days?.[
                  sessionDesignerCell.dayIdx
                ]
              const topLevelSections = (day?.sections ?? []).filter(
                (s: ProgramStructureSection) =>
                  s.parentSectionIndex == null && s.parentSectionId == null
              )
              return (
                <Drawer
                  visible={true}
                  title="Preview Session"
                  onClose={() => setPreviewSessionOpen(false)}
                  width="md"
                  showCloseButton
                >
                  <p className="text-sm text-gray-500 px-4 pt-1 pb-2">
                    This is what the athlete will see. Check formatting and
                    clarity before publishing.
                  </p>
                  <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                      <p className="font-medium text-gray-900">
                        {day?.dayName || 'Session'}
                      </p>
                      {day?.sessionNotes && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <SanitizedHtml
                            html={day.sessionNotes}
                            className="text-sm text-gray-600 [&_p]:mb-1 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-4 [&_ol]:pl-4"
                          />
                        </div>
                      )}
                    </div>
                    {(day?.sections ?? []).map(
                      (
                        section: ProgramStructureSection,
                        sectionIdx: number
                      ) => {
                        if (
                          section.parentSectionIndex != null ||
                          section.parentSectionId != null
                        )
                          return null
                        const isCircuit =
                          section.blockType === 'CIRCUIT' ||
                          (section as { blockType?: string }).blockType ===
                            'circuit'
                        const isSuperset =
                          section.blockType === 'SUPERSET' ||
                          section.sectionType === 'superset'
                        const childSections = isSuperset
                          ? (day?.sections ?? []).filter(
                              (s: ProgramStructureSection) =>
                                s.parentSectionIndex === sectionIdx ||
                                s.parentSectionId ===
                                  (section as { id?: number }).id
                            )
                          : []
                        if (isCircuit) {
                          return (
                            <div
                              key={sectionIdx}
                              className="rounded-lg border border-gray-200 bg-white p-4 space-y-2"
                            >
                              {section.name && (
                                <p className="font-semibold text-gray-900">
                                  {section.name}
                                </p>
                              )}
                              {section.instructions && (
                                <SanitizedHtml
                                  html={section.instructions}
                                  className="text-sm text-gray-700 [&_p]:mb-1 [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-4 [&_ol]:pl-4"
                                />
                              )}
                              {Array.isArray(section.videoUrls) &&
                                section.videoUrls.length > 0 && (
                                  <div className="flex flex-wrap gap-2 text-sm">
                                    {(section.videoUrls as string[])
                                      .filter(Boolean)
                                      .map((url, j) => (
                                        <a
                                          key={j}
                                          href={url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-[#3AB8ED] hover:underline"
                                        >
                                          Video {j + 1}
                                        </a>
                                      ))}
                                  </div>
                                )}
                              {section.resultTrackingType &&
                                section.resultTrackingType !== 'None' && (
                                  <p className="text-xs text-gray-500 pt-1 border-t border-gray-100">
                                    Athlete logs: {section.resultTrackingType}
                                  </p>
                                )}
                              {section.blockCategory && (
                                <p className="text-xs text-gray-500">
                                  {section.blockCategory}
                                </p>
                              )}
                            </div>
                          )
                        }
                        if (isSuperset) {
                          return (
                            <div
                              key={sectionIdx}
                              className="rounded-lg border border-gray-200 bg-gray-50/50 p-4"
                            >
                              <p className="font-semibold text-gray-900">
                                Superset
                                {section.name ? `: ${section.name}` : ''}
                                {section.supersetRounds == null
                                  ? ''
                                  : ` — ${section.supersetRounds} Rounds`}
                              </p>
                              {childSections.length > 0 && (
                                <ul className="text-sm text-gray-700 mt-2 list-disc pl-4 space-y-0.5">
                                  {childSections.map(
                                    (
                                      ch: ProgramStructureSection,
                                      j: number
                                    ) => {
                                      const ex0 = ch.exercises?.[0]
                                      return (
                                        <li key={j}>
                                          A{j + 1}:{' '}
                                          {ex0
                                            ? getExerciseName(ex0.exerciseId)
                                            : '—'}
                                        </li>
                                      )
                                    }
                                  )}
                                </ul>
                              )}
                            </div>
                          )
                        }
                        return (
                          <div
                            key={sectionIdx}
                            className="rounded-lg border border-gray-200 bg-white p-3"
                          >
                            <p className="text-sm font-medium text-gray-900">
                              {section.exercises
                                ?.map(e => getExerciseName(e.exerciseId))
                                .join(', ') || 'Exercise block'}
                            </p>
                            {section.blockCategory && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {section.blockCategory}
                              </p>
                            )}
                          </div>
                        )
                      }
                    )}
                    {topLevelSections.length === 0 && (
                      <p className="text-sm text-gray-500">
                        No blocks in this session.
                      </p>
                    )}
                  </div>
                </Drawer>
              )
            })()}

          {addBlockModalOpen && sessionDesignerCell && (
            <Drawer
              visible={true}
              title="Add Block"
              width="lg"
              onClose={() => {
                setAddBlockModalOpen(false)
                setAddBlockType('')
                setAddBlockStep('search')
                setAddBlockSearchQuery('')
                setNewExerciseForm({
                  name: '',
                  videoUrl: '',
                  defaultParameter1: 'Reps',
                  defaultParameter2: '-',
                  pointsOfPerformance: '',
                  tagsStr: '',
                })
                setAddBlockCircuitForm({
                  name: '',
                  instructions: '',
                  resultTrackingType: 'None',
                  blockCategory: '',
                  conditioningFormat: '',
                  videoUrlsStr: '',
                  conditioningConfig: {},
                })
                setAddBlockCircuitCategoryCustom('')
                setAddBlockSupersetForm({
                  supersetRounds: 4,
                  restBetweenExercises: '0',
                  restBetweenRounds: '90',
                  supersetNotes: '',
                  blockCategory: '',
                  exercises: [
                    {
                      exerciseId: 0,
                      sets: 4,
                      reps: 8,
                      coachingNotes: '',
                      setsRows: [{ setIndex: 0 }],
                    },
                    {
                      exerciseId: 0,
                      sets: 4,
                      reps: 8,
                      coachingNotes: '',
                      setsRows: [{ setIndex: 0 }],
                    },
                  ],
                })
              }}
            >
              <div className="space-y-5">
                {(() => {
                  const isNewExerciseStep = addBlockStep === 'newExercise'
                  const isSearchStep = addBlockType === ''
                  if (isNewExerciseStep) {
                    return (
                      <>
                        <div className="flex justify-start">
                          <Button
                            type="button"
                            variant="ghost"
                            size="small"
                            leftIcon={
                              <Icon
                                name="arrow-left"
                                family="solid"
                                size={12}
                              />
                            }
                            onClick={() => setAddBlockStep('search')}
                          >
                            Back
                          </Button>
                        </div>
                        <div className="border-t border-gray-200 pt-4 space-y-4">
                          <p className="text-sm font-medium text-gray-700">
                            New Exercise
                          </p>
                          <div>
                            <label
                              htmlFor="new-exercise-title-drawer"
                              className="block text-xs font-medium text-gray-600 mb-1"
                            >
                              Title (required)
                            </label>
                            <Input
                              id="new-exercise-title-drawer"
                              value={newExerciseForm.name}
                              onChange={e =>
                                setNewExerciseForm(f => ({
                                  ...f,
                                  name: e.target.value,
                                }))
                              }
                              placeholder="e.g. Barbell Back Squat"
                              size="small"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Dropdown
                                label="Default Parameter 1"
                                placeholder="Select"
                                value={
                                  newExerciseForm.defaultParameter1 || undefined
                                }
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
                              <Dropdown
                                label="Default Parameter 2"
                                placeholder="— or —"
                                value={
                                  newExerciseForm.defaultParameter2 || undefined
                                }
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
                            <label
                              htmlFor="add-block-new-exercise-video-url"
                              className="block text-xs font-medium text-gray-600 mb-1"
                            >
                              Video URL (optional)
                            </label>
                            <Input
                              id="add-block-new-exercise-video-url"
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
                              htmlFor="add-block-new-exercise-pop"
                              className="block text-xs font-medium text-gray-600 mb-1"
                            >
                              Points of Performance (optional)
                            </label>
                            <textarea
                              id="add-block-new-exercise-pop"
                              className="w-full min-h-[60px] rounded border border-gray-300 px-3 py-2 text-sm"
                              value={newExerciseForm.pointsOfPerformance}
                              onChange={e =>
                                setNewExerciseForm(f => ({
                                  ...f,
                                  pointsOfPerformance: e.target.value.slice(
                                    0,
                                    10000
                                  ),
                                }))
                              }
                              placeholder="Coaching cues..."
                              maxLength={10000}
                            />
                          </div>
                          <div>
                            <label
                              htmlFor="add-block-new-exercise-tags"
                              className="block text-xs font-medium text-gray-600 mb-1"
                            >
                              Tags (comma-separated)
                            </label>
                            <Input
                              id="add-block-new-exercise-tags"
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
                            disabled={
                              newExerciseSaving || !newExerciseForm.name.trim()
                            }
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
                                  videoUrl:
                                    newExerciseForm.videoUrl.trim() ||
                                    undefined,
                                  defaultParameter1:
                                    newExerciseForm.defaultParameter1 ||
                                    undefined,
                                  defaultParameter2:
                                    newExerciseForm.defaultParameter2 === '-'
                                      ? undefined
                                      : newExerciseForm.defaultParameter2 ||
                                        undefined,
                                  pointsOfPerformance:
                                    newExerciseForm.pointsOfPerformance.trim() ||
                                    undefined,
                                  tags: tags.length ? tags : undefined,
                                  isActive: true,
                                })
                                const data = res.data?.data
                                if (data?.id != null && sessionDesignerCell) {
                                  await fetchExercises()
                                  const newEx: ExerciseListForBuilderItem = {
                                    id: data.id,
                                    name:
                                      data.name ?? newExerciseForm.name.trim(),
                                  }
                                  const w = sessionDesignerCell.weekIdx
                                  const d = sessionDesignerCell.dayIdx
                                  const sectionIdx =
                                    structure.weeks[w]?.days?.[d]?.sections
                                      ?.length ?? 0
                                  addBlockAsExercise(w, d, newEx)
                                  showSuccess(
                                    'Exercise created and added to session'
                                  )
                                  setAddBlockStep('search')
                                  setAddBlockModalOpen(false)
                                  setNewExerciseForm({
                                    name: '',
                                    videoUrl: '',
                                    defaultParameter1: 'Reps',
                                    defaultParameter2: '-',
                                    pointsOfPerformance: '',
                                    tagsStr: '',
                                  })
                                  setEditingExerciseBlock({
                                    weekIdx: w,
                                    dayIdx: d,
                                    sectionIdx,
                                  })
                                }
                              } catch (err) {
                                const e = err as AxiosError<{
                                  message?: string
                                }>
                                showError(
                                  e.response?.data?.message ??
                                    'Failed to create exercise'
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
                      </>
                    )
                  }
                  if (isSearchStep) {
                    return (
                      <>
                        <div>
                          <label
                            htmlFor="add-block-search"
                            className="block text-sm font-medium text-gray-700 mb-1"
                          >
                            Select Exercise or Circuit
                          </label>
                          <Input
                            id="add-block-search"
                            placeholder="Search by name..."
                            value={addBlockSearchQuery}
                            onChange={e =>
                              setAddBlockSearchQuery(e.target.value)
                            }
                            size="medium"
                            className="w-full"
                          />
                        </div>
                        <div className="max-h-[280px] overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                          {exerciseList.length === 0 ? (
                            <p className="text-sm text-gray-500 py-4 px-3 text-center">
                              {addBlockSearchQuery.trim()
                                ? 'No exercises match your search.'
                                : 'Type to search the exercise library.'}
                            </p>
                          ) : (
                            exerciseList.map(ex => {
                              const thumb = getExerciseThumbnailUrl(ex.videoUrl)
                              return (
                                <button
                                  key={ex.id}
                                  type="button"
                                  className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                                  onClick={() => {
                                    const w = sessionDesignerCell.weekIdx
                                    const d = sessionDesignerCell.dayIdx
                                    const sectionIdx =
                                      structure.weeks[w]?.days?.[d]?.sections
                                        ?.length ?? 0
                                    addBlockAsExercise(w, d, ex)
                                    setAddBlockModalOpen(false)
                                    setAddBlockSearchQuery('')
                                    setEditingExerciseBlock({
                                      weekIdx: w,
                                      dayIdx: d,
                                      sectionIdx,
                                    })
                                  }}
                                >
                                  <span className="shrink-0 w-14 h-14 rounded bg-gray-100 overflow-hidden flex items-center justify-center">
                                    {thumb ? (
                                      <img
                                        src={thumb}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <Icon
                                        name="dumbbell"
                                        family="solid"
                                        size={20}
                                        className="text-gray-400"
                                      />
                                    )}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <span className="text-sm font-medium text-gray-900 block truncate">
                                      {ex.name}
                                    </span>
                                    {ex.tags && ex.tags.length > 0 && (
                                      <span className="text-xs text-gray-500 block truncate">
                                        {ex.tags.join(', ')}
                                      </span>
                                    )}
                                  </div>
                                </button>
                              )
                            })
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            type="button"
                            variant="secondary"
                            size="small"
                            leftIcon={
                              <Icon name="plus" family="solid" size={12} />
                            }
                            onClick={() => setAddBlockStep('newExercise')}
                          >
                            New Exercise
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="small"
                            leftIcon={
                              <Icon name="list" family="solid" size={12} />
                            }
                            onClick={() => setAddBlockType('CIRCUIT')}
                          >
                            New Circuit
                          </Button>
                          <button
                            type="button"
                            className="text-xs text-gray-500 hover:text-gray-700 underline"
                            onClick={() => setAddBlockType('SUPERSET')}
                          >
                            Add superset block
                          </button>
                        </div>
                      </>
                    )
                  }
                  return (
                    <div className="flex justify-start">
                      <Button
                        type="button"
                        variant="ghost"
                        size="small"
                        leftIcon={
                          <Icon name="arrow-left" family="solid" size={12} />
                        }
                        onClick={() => setAddBlockType('')}
                      >
                        Back
                      </Button>
                    </div>
                  )
                })()}
                {addBlockType === 'CIRCUIT' && (
                  <div className="pt-1 border-t border-gray-200">
                    <Text
                      variant="default"
                      className="text-sm font-medium mb-2 block"
                    >
                      Circuit block
                    </Text>
                    <div className="space-y-3">
                      <div>
                        <label
                          htmlFor="add-block-circuit-name"
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Circuit name
                        </label>
                        <Input
                          id="add-block-circuit-name"
                          value={addBlockCircuitForm.name}
                          onChange={e =>
                            setAddBlockCircuitForm(f => ({
                              ...f,
                              name: e.target.value,
                            }))
                          }
                          placeholder="e.g. Warmup, Cooldown, Mobility Flow"
                          size="small"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="add-block-circuit-category"
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Block category
                        </label>
                        <Dropdown
                          placeholder="Uncategorized"
                          value={addBlockCircuitForm.blockCategory || ''}
                          onValueChange={v =>
                            setAddBlockCircuitForm(f => ({
                              ...f,
                              blockCategory:
                                (Array.isArray(v) ? v[0] : v) ?? '',
                            }))
                          }
                          options={BLOCK_CATEGORY_OPTIONS}
                        />
                        {addBlockCircuitForm.blockCategory === '__custom__' && (
                          <Input
                            placeholder="Custom category name"
                            value={addBlockCircuitCategoryCustom}
                            onChange={e =>
                              setAddBlockCircuitCategoryCustom(e.target.value)
                            }
                            className="mt-2"
                            size="small"
                          />
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="add-block-instructions"
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Instructions (free-form){' '}
                          <span className="text-red-500" aria-hidden="true">
                            *
                          </span>
                        </label>
                        <RichTextEditor
                          key="add-circuit-instructions"
                          id="add-block-instructions"
                          value={addBlockCircuitForm.instructions}
                          onChange={html =>
                            setAddBlockCircuitForm(f => ({
                              ...f,
                              instructions: html,
                            }))
                          }
                          placeholder="e.g. 3 Rounds: 10 Banded Good Mornings, 10 Leg Swings (each leg)..."
                          minHeight="120px"
                          className="mt-1"
                        />
                        <p className="text-xs text-gray-500 mt-0.5">
                          Free-form text for the athlete. Use lists and
                          formatting as needed.
                        </p>
                      </div>
                      <div>
                        <label
                          htmlFor="add-block-result-tracking"
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Result tracking
                        </label>
                        <Dropdown
                          placeholder="None"
                          value={
                            addBlockCircuitForm.resultTrackingType || 'None'
                          }
                          onValueChange={v =>
                            setAddBlockCircuitForm(f => ({
                              ...f,
                              resultTrackingType:
                                (Array.isArray(v) ? v[0] : v) ?? 'None',
                            }))
                          }
                          options={RESULT_TRACKING_OPTIONS}
                        />
                        <p className="text-xs text-gray-500 mt-0.5">
                          If set, athlete can log this after completing the
                          circuit.
                        </p>
                      </div>
                      <div>
                        <label
                          htmlFor="add-block-conditioning-format"
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
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
                                  timeCapSeconds: Number.isNaN(n)
                                    ? undefined
                                    : n,
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
                              addBlockCircuitForm.conditioningConfig?.rounds ??
                              ''
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
                                    workSeconds: Number.isNaN(n)
                                      ? undefined
                                      : n,
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
                                    restSeconds: Number.isNaN(n)
                                      ? undefined
                                      : n,
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
                          Videos
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
                          placeholder="One or more video links, comma-separated"
                          size="small"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="small"
                        onClick={handleAddCircuitBlock}
                      >
                        Add circuit block
                      </Button>
                    </div>
                  </div>
                )}
                {addBlockType === 'SUPERSET' && (
                  <AddBlockSupersetPanel
                    form={addBlockSupersetForm}
                    setForm={setAddBlockSupersetForm}
                    exerciseList={exerciseList}
                    onSubmit={handleAddSupersetBlock}
                  />
                )}
              </div>
            </Drawer>
          )}

          {editingExerciseBlock != null &&
            (() => {
              const w = editingExerciseBlock.weekIdx
              const d = editingExerciseBlock.dayIdx
              const sectionIdx = editingExerciseBlock.sectionIdx
              const day = structure.weeks[w]?.days?.[d]
              const section = day?.sections?.[sectionIdx]
              const ex0 = section?.exercises?.[0]
              const rows =
                (ex0?.setsRows?.length ?? 0) > 0
                  ? [...(ex0?.setsRows ?? [])]
                  : [{ setIndex: 0 }]
              const updateRowAt = (
                ri: number,
                patch: Partial<ProgramStructureSetRow>
              ) => {
                const next = patchRowAt(rows, ri, patch)
                if (ex0 == null) return
                updateExerciseBlockSection(w, d, sectionIdx, {
                  exercises: [{ ...ex0, setsRows: next, sets: next.length }],
                })
              }
              const handleRemoveSet = (ri: number) => {
                const next = rows
                  .filter((_, i) => i !== ri)
                  .map((r, i) => ({ ...r, setIndex: i }))
                if (ex0 == null) return
                updateExerciseBlockSection(w, d, sectionIdx, {
                  exercises: [{ ...ex0, setsRows: next, sets: next.length }],
                })
              }
              const blockCategoryValue = getBlockCategoryValue(section)
              const blockCategoryCustom = getBlockCategoryCustom(
                section,
                blockCategoryValue
              )
              return (
                <Drawer
                  visible={true}
                  title="Exercise Block — Prescription Table"
                  onClose={() => setEditingExerciseBlock(null)}
                  width="lg"
                  className="max-w-3xl"
                >
                  <p className="text-sm text-gray-500 pb-2">
                    Set, Reps, Weight, RPE, Tempo, Rest per set. Exercise notes
                    below.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <Dropdown
                        label="Block category"
                        placeholder="Uncategorized"
                        value={blockCategoryValue}
                        onValueChange={v => {
                          const val = (Array.isArray(v) ? v[0] : v) ?? ''
                          if (!val) {
                            updateExerciseBlockSection(w, d, sectionIdx, {
                              blockCategory: undefined,
                            })
                            return
                          }
                          if (val === '__custom__') {
                            // When switching to custom, preserve any existing custom text or
                            // seed with a generic placeholder so the input shows immediately.
                            const nextCustom =
                              blockCategoryCustom || 'Custom block'
                            updateExerciseBlockSection(w, d, sectionIdx, {
                              blockCategory: nextCustom,
                            })
                            return
                          }
                          updateExerciseBlockSection(w, d, sectionIdx, {
                            blockCategory: val,
                          })
                        }}
                        options={BLOCK_CATEGORY_OPTIONS}
                      />
                      {blockCategoryValue === '__custom__' && (
                        <Input
                          placeholder="Custom category name"
                          value={blockCategoryCustom}
                          onChange={e => {
                            updateExerciseBlockSection(w, d, sectionIdx, {
                              blockCategory: e.target.value.trim() || undefined,
                            })
                          }}
                          className="mt-2"
                          size="small"
                        />
                      )}
                    </div>
                    <div>
                      <Dropdown
                        label="Exercise"
                        placeholder="Search and select exercise..."
                        searchable
                        searchPlaceholder="Search exercises..."
                        options={exerciseList.map(ex => ({
                          value: String(ex.id),
                          label: ex.name,
                        }))}
                        value={ex0 ? String(ex0.exerciseId) : ''}
                        onValueChange={v => {
                          const id = Array.isArray(v) ? v[0] : v
                          if (!id || !ex0) return
                          const numId = Number(id)
                          updateExerciseBlockSection(w, d, sectionIdx, {
                            exercises: [{ ...ex0, exerciseId: numId }],
                          })
                        }}
                        fullWidth={false}
                        className="max-w-full"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div>
                          <span className="block text-sm font-medium text-gray-700">
                            Prescription table
                          </span>
                          <p className="text-xs text-gray-500 mt-0.5">
                            One row per set. Reps: number (5), range (8-10), or
                            Max.
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          onClick={() => {
                            if (ex0 == null) return
                            const newRows = [...rows, { setIndex: rows.length }]
                            updateExerciseBlockSection(w, d, sectionIdx, {
                              exercises: [
                                {
                                  ...ex0,
                                  sets: newRows.length,
                                  setsRows: newRows,
                                },
                              ],
                            })
                          }}
                          className="shrink-0"
                        >
                          + Add set
                        </Button>
                      </div>
                      <div className="border border-gray-200 rounded-lg overflow-hidden mt-2">
                        <div className="overflow-x-auto min-w-0">
                          <table className="w-full min-w-lg text-sm">
                            <thead>
                              <tr className="bg-gray-100 border-b border-gray-200">
                                <th className="text-left py-2 px-2 font-medium text-gray-700 w-10 shrink-0">
                                  Set
                                </th>
                                <th className="text-left py-2 px-2 font-medium text-gray-700 min-w-24">
                                  Reps
                                </th>
                                <th className="text-left py-2 px-2 font-medium text-gray-700 min-w-28">
                                  Weight
                                </th>
                                <th className="text-left py-2 px-2 font-medium text-gray-700 w-14 shrink-0">
                                  RPE
                                </th>
                                <th className="text-left py-2 px-2 font-medium text-gray-700 min-w-24">
                                  Tempo
                                </th>
                                <th className="text-left py-2 px-2 font-medium text-gray-700 w-16 shrink-0">
                                  Rest (s)
                                </th>
                                <th
                                  className="w-9 shrink-0"
                                  aria-label="Remove set"
                                />
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map((row, ri) => (
                                <ExerciseBlockPrescriptionRow
                                  key={ri}
                                  row={row}
                                  rowIndex={ri}
                                  updateRowAt={updateRowAt}
                                  onRemoveSet={handleRemoveSet}
                                  canRemoveSet={rows.length > 1}
                                />
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="edit-exercise-block-notes"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Exercise notes
                      </label>
                      <textarea
                        id="edit-exercise-block-notes"
                        className="w-full min-h-[60px] rounded border border-gray-300 px-3 py-2 text-sm"
                        value={ex0?.coachingNotes ?? ''}
                        onChange={e => {
                          if (ex0 == null) return
                          updateExerciseBlockSection(w, d, sectionIdx, {
                            exercises: [
                              {
                                ...ex0,
                                coachingNotes: e.target.value || undefined,
                              },
                            ],
                          })
                        }}
                        placeholder="Cues, modifications, or intent for this session"
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => setEditingExerciseBlock(null)}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </Drawer>
              )
            })()}

          {editingCircuitBlock != null &&
            (() => {
              const w = editingCircuitBlock.weekIdx
              const d = editingCircuitBlock.dayIdx
              const sectionIdx = editingCircuitBlock.sectionIdx
              const day = structure.weeks[w]?.days?.[d]
              const section = day?.sections?.[sectionIdx]
              const blockCategoryValue = getBlockCategoryValue(section)
              const blockCategoryCustom = getBlockCategoryCustom(
                section,
                blockCategoryValue
              )
              const videoUrlsStr = Array.isArray(section?.videoUrls)
                ? (section.videoUrls as string[]).join(', ')
                : ''
              return (
                <Modal
                  visible={true}
                  title="Edit Circuit Block"
                  onClose={() => setEditingCircuitBlock(null)}
                  size="large"
                  showCloseButton
                >
                  <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div>
                      <label
                        htmlFor="edit-circuit-block-name"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Circuit name
                      </label>
                      <Input
                        id="edit-circuit-block-name"
                        value={section?.name ?? ''}
                        onChange={e =>
                          updateCircuitBlockSection(w, d, sectionIdx, {
                            name: e.target.value.trim() || undefined,
                          })
                        }
                        placeholder="e.g. Warmup, Cooldown, Mobility Flow"
                        size="small"
                      />
                    </div>
                    <div>
                      <Dropdown
                        label="Block category"
                        placeholder="Uncategorized"
                        value={blockCategoryValue}
                        onValueChange={v => {
                          const val = (Array.isArray(v) ? v[0] : v) ?? ''
                          if (!val) {
                            updateCircuitBlockSection(w, d, sectionIdx, {
                              blockCategory: undefined,
                            })
                            return
                          }
                          if (val === '__custom__') {
                            const nextCustom =
                              blockCategoryCustom || 'Custom block'
                            updateCircuitBlockSection(w, d, sectionIdx, {
                              blockCategory: nextCustom,
                            })
                            return
                          }
                          updateCircuitBlockSection(w, d, sectionIdx, {
                            blockCategory: val,
                          })
                        }}
                        options={BLOCK_CATEGORY_OPTIONS}
                      />
                      {blockCategoryValue === '__custom__' && (
                        <Input
                          placeholder="Custom category"
                          value={blockCategoryCustom}
                          onChange={e =>
                            updateCircuitBlockSection(w, d, sectionIdx, {
                              blockCategory: e.target.value.trim() || undefined,
                            })
                          }
                          className="mt-2"
                          size="small"
                        />
                      )}
                    </div>
                    <div>
                      <Dropdown
                        label="Conditioning format (optional)"
                        placeholder="For Completion (no timer)"
                        value={section?.conditioningFormat ?? ''}
                        onValueChange={v => {
                          const val = (Array.isArray(v) ? v[0] : v) ?? ''
                          const baseConfig = section?.conditioningConfig as
                            | object
                            | undefined
                          let conditioningConfig: object | undefined
                          if (val === 'AMRAP' || val === 'For Time') {
                            const c = section?.conditioningConfig as {
                              timeCapSeconds?: number
                            }
                            conditioningConfig = baseConfig
                              ? {
                                  ...baseConfig,
                                  timeCapSeconds: c?.timeCapSeconds,
                                }
                              : { timeCapSeconds: c?.timeCapSeconds }
                          } else if (val === 'EMOM') {
                            const c = section?.conditioningConfig as {
                              durationSeconds?: number
                              intervalLengthSeconds?: number
                            }
                            conditioningConfig = baseConfig
                              ? {
                                  ...baseConfig,
                                  durationSeconds: c?.durationSeconds,
                                  intervalLengthSeconds:
                                    c?.intervalLengthSeconds,
                                }
                              : {
                                  durationSeconds: c?.durationSeconds,
                                  intervalLengthSeconds:
                                    c?.intervalLengthSeconds,
                                }
                          } else if (
                            val === 'Tabata' ||
                            val === 'Custom Interval'
                          ) {
                            const c = section?.conditioningConfig as {
                              rounds?: number
                            }
                            conditioningConfig = baseConfig
                              ? { ...baseConfig, rounds: c?.rounds }
                              : { rounds: c?.rounds }
                          } else {
                            conditioningConfig = undefined
                          }
                          updateCircuitBlockSection(w, d, sectionIdx, {
                            conditioningFormat: val || undefined,
                            conditioningConfig,
                          })
                        }}
                        options={CONDITIONING_FORMAT_OPTIONS}
                      />
                    </div>
                    {(section?.conditioningFormat === 'AMRAP' ||
                      section?.conditioningFormat === 'For Time') && (
                      <div>
                        <label
                          htmlFor="edit-circuit-time-cap"
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Time cap (seconds)
                        </label>
                        <Input
                          id="edit-circuit-time-cap"
                          type="number"
                          min={0}
                          value={
                            (
                              section?.conditioningConfig as {
                                timeCapSeconds?: number
                              }
                            )?.timeCapSeconds ?? ''
                          }
                          onChange={e => {
                            const n = Number.parseInt(e.target.value, 10)
                            updateCircuitBlockSection(w, d, sectionIdx, {
                              conditioningConfig: {
                                ...(section?.conditioningConfig as object),
                                timeCapSeconds: Number.isNaN(n) ? undefined : n,
                              },
                            })
                          }}
                          placeholder="e.g. 600"
                          size="small"
                        />
                      </div>
                    )}
                    {section?.conditioningFormat === 'EMOM' && (
                      <>
                        <div>
                          <label
                            htmlFor="edit-circuit-duration"
                            className="block text-xs font-medium text-gray-600 mb-1"
                          >
                            Total duration (seconds)
                          </label>
                          <Input
                            id="edit-circuit-duration"
                            type="number"
                            min={0}
                            value={
                              (
                                section?.conditioningConfig as {
                                  durationSeconds?: number
                                }
                              )?.durationSeconds ?? ''
                            }
                            onChange={e => {
                              const n = Number.parseInt(e.target.value, 10)
                              updateCircuitBlockSection(w, d, sectionIdx, {
                                conditioningConfig: {
                                  ...(section?.conditioningConfig as object),
                                  durationSeconds: Number.isNaN(n)
                                    ? undefined
                                    : n,
                                },
                              })
                            }}
                            placeholder="e.g. 1200"
                            size="small"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="edit-circuit-interval-length"
                            className="block text-xs font-medium text-gray-600 mb-1"
                          >
                            Interval length (seconds)
                          </label>
                          <Input
                            id="edit-circuit-interval-length"
                            type="number"
                            min={0}
                            value={
                              (
                                section?.conditioningConfig as {
                                  intervalLengthSeconds?: number
                                }
                              )?.intervalLengthSeconds ?? ''
                            }
                            onChange={e => {
                              const n = Number.parseInt(e.target.value, 10)
                              updateCircuitBlockSection(w, d, sectionIdx, {
                                conditioningConfig: {
                                  ...(section?.conditioningConfig as object),
                                  intervalLengthSeconds: Number.isNaN(n)
                                    ? undefined
                                    : n,
                                },
                              })
                            }}
                            placeholder="e.g. 60"
                            size="small"
                          />
                        </div>
                      </>
                    )}
                    {(section?.conditioningFormat === 'Tabata' ||
                      section?.conditioningFormat === 'Custom Interval') && (
                      <div>
                        <label
                          htmlFor="edit-circuit-rounds"
                          className="block text-xs font-medium text-gray-600 mb-1"
                        >
                          Rounds
                        </label>
                        <Input
                          id="edit-circuit-rounds"
                          type="number"
                          min={1}
                          value={
                            (section?.conditioningConfig as { rounds?: number })
                              ?.rounds ?? ''
                          }
                          onChange={e => {
                            const n = Number.parseInt(e.target.value, 10)
                            updateCircuitBlockSection(w, d, sectionIdx, {
                              conditioningConfig: {
                                ...(section?.conditioningConfig as object),
                                rounds: Number.isNaN(n) ? undefined : n,
                              },
                            })
                          }}
                          placeholder="e.g. 8"
                          size="small"
                        />
                      </div>
                    )}
                    {section?.conditioningFormat === 'Custom Interval' && (
                      <>
                        <div>
                          <label
                            htmlFor="edit-circuit-work-seconds"
                            className="block text-xs font-medium text-gray-600 mb-1"
                          >
                            Work (seconds)
                          </label>
                          <Input
                            id="edit-circuit-work-seconds"
                            type="number"
                            min={0}
                            value={
                              (
                                section?.conditioningConfig as {
                                  workSeconds?: number
                                }
                              )?.workSeconds ?? ''
                            }
                            onChange={e => {
                              const n = Number.parseInt(e.target.value, 10)
                              updateCircuitBlockSection(w, d, sectionIdx, {
                                conditioningConfig: {
                                  ...(section?.conditioningConfig as object),
                                  workSeconds: Number.isNaN(n) ? undefined : n,
                                },
                              })
                            }}
                            placeholder="e.g. 30"
                            size="small"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="edit-circuit-rest-seconds"
                            className="block text-xs font-medium text-gray-600 mb-1"
                          >
                            Rest (seconds)
                          </label>
                          <Input
                            id="edit-circuit-rest-seconds"
                            type="number"
                            min={0}
                            value={
                              (
                                section?.conditioningConfig as {
                                  restSeconds?: number
                                }
                              )?.restSeconds ?? ''
                            }
                            onChange={e => {
                              const n = Number.parseInt(e.target.value, 10)
                              updateCircuitBlockSection(w, d, sectionIdx, {
                                conditioningConfig: {
                                  ...(section?.conditioningConfig as object),
                                  restSeconds: Number.isNaN(n) ? undefined : n,
                                },
                              })
                            }}
                            placeholder="e.g. 15"
                            size="small"
                          />
                        </div>
                      </>
                    )}
                    <div>
                      <span className="block text-sm font-medium text-gray-700 mb-1">
                        Instructions{' '}
                        <span className="text-red-500" aria-hidden="true">
                          *
                        </span>
                        <span className="text-gray-500 font-normal ml-1">
                          (rich text)
                        </span>
                      </span>
                      <RichTextEditor
                        key={`edit-circuit-instructions-${w}-${d}-${sectionIdx}`}
                        aria-label="Circuit instructions (rich text)"
                        value={section?.instructions ?? ''}
                        onChange={html =>
                          updateCircuitBlockSection(w, d, sectionIdx, {
                            instructions: html || undefined,
                          })
                        }
                        placeholder="e.g. 3 Rounds: 10 Banded Good Mornings..."
                        minHeight="120px"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Dropdown
                        label="Result tracking"
                        placeholder="None"
                        value={section?.resultTrackingType ?? 'None'}
                        onValueChange={v => {
                          const val = (Array.isArray(v) ? v[0] : v) ?? 'None'
                          updateCircuitBlockSection(w, d, sectionIdx, {
                            resultTrackingType:
                              val === 'None' ? undefined : val,
                          })
                        }}
                        options={RESULT_TRACKING_OPTIONS}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="edit-circuit-videos"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Videos (optional, comma-separated links)
                      </label>
                      <Input
                        id="edit-circuit-videos"
                        value={videoUrlsStr}
                        onChange={e => {
                          const urls = e.target.value
                            .split(',')
                            .map(u => u.trim())
                            .filter(Boolean)
                          updateCircuitBlockSection(w, d, sectionIdx, {
                            videoUrls: urls.length ? urls : undefined,
                          })
                        }}
                        placeholder="https://..."
                        size="small"
                      />
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => setEditingCircuitBlock(null)}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </Modal>
              )
            })()}

          {editingSupersetBlock != null &&
            (() => {
              const w = editingSupersetBlock.weekIdx
              const d = editingSupersetBlock.dayIdx
              const parentIdx = editingSupersetBlock.sectionIdx
              const day = structure.weeks[w]?.days?.[d]
              const parentSection = day?.sections?.[parentIdx]
              const sections = day?.sections ?? []
              const childEntries = sections
                .map((sec, idx) => ({ section: sec, index: idx }))
                .filter(
                  ({ section: s }) =>
                    s.parentSectionIndex === parentIdx ||
                    s.parentSectionId === parentSection?.id
                )
              return (
                <Drawer
                  visible={true}
                  title="Edit Superset Block"
                  onClose={() => setEditingSupersetBlock(null)}
                  width="lg"
                  showCloseButton
                >
                  <p className="text-sm text-gray-500 px-4 pt-1 pb-0">
                    Rounds, rest between exercises/rounds, and superset notes.
                    Each exercise has its own prescription (same as Exercise
                    block).
                  </p>
                  <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
                    <div>
                      {(() => {
                        const cat = parentSection?.blockCategory
                        const isInOptions =
                          cat != null &&
                          BLOCK_CATEGORY_OPTIONS.some(o => o.value === cat)
                        let blockCategoryValue: string
                        if (isInOptions) {
                          blockCategoryValue = cat ?? ''
                        } else if (cat) {
                          blockCategoryValue = '__custom__'
                        } else {
                          blockCategoryValue = ''
                        }
                        return (
                          <Dropdown
                            label="Block category"
                            placeholder="Uncategorized"
                            value={blockCategoryValue}
                            onValueChange={v => {
                              const val = (Array.isArray(v) ? v[0] : v) ?? ''
                              updateSupersetBlockSection(w, d, parentIdx, {
                                blockCategory:
                                  val === '__custom__'
                                    ? (parentSection?.blockCategory ?? '')
                                    : val || undefined,
                              })
                            }}
                            options={BLOCK_CATEGORY_OPTIONS}
                          />
                        )
                      })()}
                      {(parentSection?.blockCategory === '' ||
                        (parentSection?.blockCategory != null &&
                          !BLOCK_CATEGORY_OPTIONS.some(
                            o => o.value === parentSection?.blockCategory
                          ))) && (
                        <Input
                          placeholder="Custom category name"
                          value={parentSection?.blockCategory ?? ''}
                          onChange={e =>
                            updateSupersetBlockSection(w, d, parentIdx, {
                              blockCategory: e.target.value.trim() || undefined,
                            })
                          }
                          className="mt-2"
                          size="small"
                        />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="edit-superset-rounds"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Rounds
                        </label>
                        <Input
                          id="edit-superset-rounds"
                          type="number"
                          min={1}
                          value={parentSection?.supersetRounds ?? ''}
                          onChange={e =>
                            updateSupersetBlockSection(w, d, parentIdx, {
                              supersetRounds:
                                Number.parseInt(e.target.value, 10) || 1,
                            })
                          }
                          size="small"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="edit-superset-rest-exercises"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Rest between exercises (seconds)
                        </label>
                        <Input
                          id="edit-superset-rest-exercises"
                          value={parentSection?.restBetweenExercises ?? ''}
                          onChange={e =>
                            updateSupersetBlockSection(w, d, parentIdx, {
                              restBetweenExercises: e.target.value || undefined,
                            })
                          }
                          placeholder="0"
                          size="small"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="edit-superset-rest-rounds"
                          className="block text-sm font-medium text-gray-700 mb-1"
                        >
                          Rest between rounds (seconds)
                        </label>
                        <Input
                          id="edit-superset-rest-rounds"
                          value={parentSection?.restBetweenRounds ?? ''}
                          onChange={e =>
                            updateSupersetBlockSection(w, d, parentIdx, {
                              restBetweenRounds: e.target.value || undefined,
                            })
                          }
                          placeholder="90"
                          size="small"
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        htmlFor="edit-superset-notes"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Superset notes
                      </label>
                      <Input
                        id="edit-superset-notes"
                        value={parentSection?.instructions ?? ''}
                        onChange={e =>
                          updateSupersetBlockSection(w, d, parentIdx, {
                            instructions: e.target.value || undefined,
                          })
                        }
                        placeholder="e.g. Perform back-to-back, rest after each round"
                        size="small"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          Exercises (A1, A2, …)
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="small"
                          onClick={() => {
                            const weeks = [...structure.weeks]
                            const week = {
                              ...weeks[w],
                              days: [...weeks[w].days],
                            }
                            const dayCopy = {
                              ...week.days[d],
                              sections: [...(week.days[d].sections ?? [])],
                            }
                            const insertAt =
                              childEntries.length > 0
                                ? (childEntries.at(-1)?.index ?? 0) + 1
                                : parentIdx + 1
                            dayCopy.sections.splice(insertAt, 0, {
                              sectionType: 'normal',
                              blockType: 'EXERCISE',
                              parentSectionIndex: parentIdx,
                              exercises: [
                                {
                                  exerciseId: exerciseList[0]?.id ?? 0,
                                  sets: 4,
                                  reps: 8,
                                  coachingNotes: '',
                                  setsRows: [{ setIndex: 0 }],
                                },
                              ],
                            })
                            week.days[d] = dayCopy
                            weeks[w] = week
                            setStructure({ weeks })
                          }}
                        >
                          Add exercise
                        </Button>
                      </div>
                      {childEntries.map(
                        (
                          { section: childSection, index: childIdx },
                          listIdx
                        ) => {
                          const ex0 = childSection.exercises?.[0]
                          const rows =
                            (ex0?.setsRows?.length ?? 0) > 0
                              ? [...(ex0.setsRows ?? [])]
                              : [{ setIndex: 0 }]
                          const applySetsRowsUpdate = (
                            nextRows: typeof rows
                          ) => {
                            if (ex0 == null) return
                            updateExerciseBlockSection(w, d, childIdx, {
                              exercises: [{ ...ex0, setsRows: nextRows }],
                            })
                          }
                          const updateRowAt = (
                            ri: number,
                            patch: Partial<(typeof rows)[0]>
                          ) => {
                            applySetsRowsUpdate(patchRowAt(rows, ri, patch))
                          }
                          return (
                            <div
                              key={childIdx}
                              className="border border-gray-200 rounded-lg p-3 mb-3 bg-gray-50/30"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-semibold text-gray-600">
                                  A{listIdx + 1}
                                </span>
                                {childEntries.length > 2 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="small"
                                    className="text-red-600"
                                    onClick={() => {
                                      const weeks = [...structure.weeks]
                                      const week = {
                                        ...weeks[w],
                                        days: [...weeks[w].days],
                                      }
                                      const dayCopy = {
                                        ...week.days[d],
                                        sections: [
                                          ...(week.days[d].sections ?? []),
                                        ],
                                      }
                                      dayCopy.sections.splice(childIdx, 1)
                                      week.days[d] = dayCopy
                                      weeks[w] = week
                                      setStructure({ weeks })
                                    }}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </div>
                              <div className="mb-2">
                                <Dropdown
                                  placeholder="Select exercise..."
                                  searchable
                                  searchPlaceholder="Search exercises..."
                                  options={exerciseList.map(ex => ({
                                    value: String(ex.id),
                                    label: ex.name,
                                  }))}
                                  value={ex0 ? String(ex0.exerciseId) : ''}
                                  onValueChange={v => {
                                    const id = Number.parseInt(
                                      (Array.isArray(v) ? v[0] : v) ?? '0',
                                      10
                                    )
                                    if (ex0 == null) return
                                    updateExerciseBlockSection(w, d, childIdx, {
                                      exercises: [
                                        {
                                          ...ex0,
                                          exerciseId: id,
                                          sets: ex0.sets ?? 4,
                                          reps: ex0.reps ?? 8,
                                          coachingNotes: ex0.coachingNotes,
                                          setsRows: ex0.setsRows ?? [
                                            { setIndex: 0 },
                                          ],
                                        },
                                      ],
                                    })
                                  }}
                                  fullWidth={false}
                                  className="max-w-full"
                                />
                              </div>
                              <div className="mb-2">
                                <label
                                  htmlFor={`edit-superset-exercise-notes-${w}-${d}-${childIdx}`}
                                  className="block text-xs text-gray-600 mb-1"
                                >
                                  Exercise notes
                                </label>
                                <Input
                                  id={`edit-superset-exercise-notes-${w}-${d}-${childIdx}`}
                                  value={ex0?.coachingNotes ?? ''}
                                  onChange={e => {
                                    if (ex0 == null) return
                                    updateExerciseBlockSection(w, d, childIdx, {
                                      exercises: [
                                        {
                                          ...ex0,
                                          coachingNotes:
                                            e.target.value || undefined,
                                        },
                                      ],
                                    })
                                  }}
                                  placeholder="Coaching notes for this exercise"
                                  size="small"
                                />
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs border border-gray-200 rounded">
                                  <thead>
                                    <tr className="bg-gray-50 text-gray-600">
                                      <th className="text-left py-1 px-2">
                                        Set
                                      </th>
                                      <th className="text-left py-1 px-2">
                                        Reps
                                      </th>
                                      <th className="text-left py-1 px-2">
                                        Weight
                                      </th>
                                      <th className="text-left py-1 px-2">
                                        RPE
                                      </th>
                                      <th className="text-left py-1 px-2">
                                        Tempo
                                      </th>
                                      <th className="text-left py-1 px-2">
                                        Rest
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rows.map((row, ri) => (
                                      <PrescriptionTableRow
                                        key={ri}
                                        row={row}
                                        rowIndex={ri}
                                        updateRowAt={updateRowAt}
                                      />
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="small"
                                className="mt-2"
                                onClick={() => {
                                  const next = [
                                    ...rows,
                                    {
                                      setIndex: rows.length,
                                      reps: undefined as number | undefined,
                                      weightMode: undefined as
                                        | string
                                        | undefined,
                                      weightValue: undefined as
                                        | number
                                        | undefined,
                                      weightDisplay: undefined as
                                        | string
                                        | undefined,
                                      rpe: undefined as number | undefined,
                                      tempo: undefined as string | undefined,
                                      restSeconds: undefined as
                                        | number
                                        | undefined,
                                    },
                                  ]
                                  if (ex0 == null) return
                                  updateExerciseBlockSection(w, d, childIdx, {
                                    exercises: [{ ...ex0, setsRows: next }],
                                  })
                                }}
                              >
                                + Add set
                              </Button>
                            </div>
                          )
                        }
                      )}
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => setEditingSupersetBlock(null)}
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                </Drawer>
              )
            })()}

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
              if (structure.weeks.length === 0) {
                showError(
                  'Add a week to the program first, then add a session from the library.'
                )
                return
              }
              const weekIdx =
                sessionDesignerCell?.weekIdx ??
                structure.weeks.findIndex(w => (w.days?.length ?? 0) < 7)
              const targetWeek =
                weekIdx >= 0 ? weekIdx : structure.weeks.length - 1
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

          {/* Delete selected sessions — custom modal instead of native confirm */}
          <Modal
            visible={deleteSelectedConfirmOpen}
            title="Delete selected sessions"
            onClose={() => {
              if (!deleteSelectedLoading) setDeleteSelectedConfirmOpen(false)
            }}
            size="small"
            showCloseButton
            primaryAction={{
              label: deleteSelectedLoading ? 'Deleting…' : 'Delete',
              onPress: () => {
                setDeleteSelectedLoading(true)
                void (async () => {
                  try {
                    await handleDeleteSelected()
                    setDeleteSelectedConfirmOpen(false)
                  } finally {
                    setDeleteSelectedLoading(false)
                  }
                })()
              },
              loading: deleteSelectedLoading,
              disabled: deleteSelectedLoading,
            }}
            secondaryAction={{
              label: 'Cancel',
              onPress: () => setDeleteSelectedConfirmOpen(false),
              disabled: deleteSelectedLoading,
            }}
          >
            <div className="p-4">
              <p className="text-sm text-gray-600">
                Delete the selected sessions? This cannot be undone.
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
                    disabled={repeatConfirmLoading}
                    onClick={() => void handleRepeatConfirm()}
                  >
                    {repeatConfirmLoading ? 'Repeating…' : 'Repeat'}
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
                      if (data?.id != null && sessionDesignerCell) {
                        await fetchExercises()
                        const newEx: ExerciseListForBuilderItem = {
                          id: data.id,
                          name: data.name ?? newExerciseForm.name.trim(),
                        }
                        const w = sessionDesignerCell.weekIdx
                        const d = sessionDesignerCell.dayIdx
                        const sectionIdx =
                          structure.weeks[w]?.days?.[d]?.sections?.length ?? 0
                        addBlockAsExercise(w, d, newEx)
                        showSuccess('Exercise created and added to session')
                        setNewExerciseModalOpen(false)
                        setAddBlockModalOpen(false)
                        setEditingExerciseBlock({
                          weekIdx: w,
                          dayIdx: d,
                          sectionIdx,
                        })
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
