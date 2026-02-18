import { useState, useEffect, useCallback } from 'react'
import {
  useForm,
  useFieldArray,
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormWatch,
  type FieldErrors,
  type Resolver,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Text } from '@/components/Text'
import { Input } from '@/components/Input'
import { TextArea } from '@/components/Textarea'
import { Button } from '@/components/Button'
import { Dropdown } from '@/components/Dropdown'
import { Switch } from '@/components/Switch'
import { DatePicker } from '@/components/DatePicker'
import { Stack } from '@/components/Stack'
import { Icon } from '@/components/Icon'
import { adminService } from '@/api/admin.service'
import { goalTypeService } from '@/api/goal-type.service'
import { programService } from '@/api/program.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { generateExerciseId } from '@/utils/programHelpers'
import { useFileUpload } from '@/hooks/useFileUpload'
import { FileType } from '@/constants/fileTypes'
import type {
  CreateProgramDTO,
  UpdateProgramDTO,
  DailyExerciseDTO,
  ExerciseDTO,
} from '@/types/program'
import type { Cycle } from '@/types/cycle'
import type { GoalType } from '@/types/goal-type'
import { AxiosError } from 'axios'

// Validation schema matching the guide
const programSchema = z.object({
  program_name: z.string().min(1, 'Program name is required'),
  program_description: z.string().min(1, 'Program description is required'),
  category: z.string().nullable().optional(),
  subCategory: z.string().nullable().optional(),
  cycleId: z.number().min(1, 'Cycle is required'),
  isActive: z.boolean().default(true),
  dailyExercises: z
    .array(
      z.object({
        day: z.string().min(1, 'Day is required'),
        isRestDay: z.boolean().optional().default(false),
        exercise_name: z.string().optional(),
        exercise_description: z.string().optional(),
        exercise_time: z.string().optional(),
        workout_timer: z.string().optional(),
        rest_timer: z.string().optional(),
        exercises: z
          .array(
            z.object({
              exercise_id: z.string(),
              video: z.string().nullable().optional(),
              name: z.string().min(1, 'Exercise name is required'),
              description: z.string().optional(),
              total_reps: z.number().nullable().optional(),
              sets: z.number().nullable().optional(),
              lb: z.number().nullable().optional(),
              alternate_exercise: z
                .object({
                  video: z.string().nullable().optional(),
                  name: z.string().min(1),
                  description: z.string().optional(),
                  total_reps: z.number().nullable().optional(),
                  sets: z.number().nullable().optional(),
                  lb: z.number().nullable().optional(),
                })
                .nullable(),
            })
          )
          .optional(),
      })
    )
    .min(1, 'Add at least one daily exercise to save.')
    .superRefine((arr, ctx) => {
      arr.forEach((item, i) => {
        if (item.isRestDay) return
        if (!item.exercise_name?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Exercise name is required',
            path: [i, 'exercise_name'],
          })
        }
        if (!item.exercises?.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'At least one exercise is required',
            path: [i, 'exercises'],
          })
        }
      })
    }),
})

export interface ProgramFormProps {
  /**
   * Initial cycle ID (pre-filled, can be changed)
   */
  initialCycleId?: number
  /**
   * Program data for editing (if provided, form is in edit mode)
   */
  program?: {
    id: number
    name: string
    description: string
    category: string | null
    subCategory: string | null
    cycleId: number
    isActive: boolean
    dailyExercise: DailyExerciseDTO[]
  }
  /**
   * Callback when form is submitted successfully
   */
  onSuccess?: () => void
  /**
   * Callback when form is cancelled
   */
  onCancel?: () => void
  /**
   * Whether form is in loading state
   */
  loading?: boolean
}

/**
 * Program Form Component
 *
 * Creates a new program with cycle-based validation and dynamic exercise management.
 * Supports Red/Green cycles (sequential days, category required) and Amber cycle (date picker, category optional).
 */
export function ProgramForm({
  initialCycleId,
  program,
  onSuccess,
  onCancel,
  loading = false,
}: Readonly<ProgramFormProps>) {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [goalTypes, setGoalTypes] = useState<GoalType[]>([])
  const [showCategoryFields, setShowCategoryFields] = useState(false)
  const [dayInputType, setDayInputType] = useState<'sequential' | 'date'>(
    'sequential'
  )
  const [uploadingVideo, setUploadingVideo] = useState<string | null>(null)
  const [dailyExerciseCountError, setDailyExerciseCountError] = useState<
    string | null
  >(null)
  const { showError, showSuccess } = useSnackbar()

  // Video upload hook with presigned URL flow (same as profile picture)
  const { upload: uploadVideo, uploading: isUploadingVideo } = useFileUpload({
    fileType: FileType.PROGRAM_VIDEO,
    onError: error => {
      console.error('Video upload error:', error)
      showError(`Failed to upload video: ${error.message}`)
    },
  })

  const isEditMode = !!program

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitted },
    reset,
  } = useForm<CreateProgramDTO>({
    resolver: zodResolver(programSchema) as Resolver<CreateProgramDTO>,
    defaultValues: {
      program_name: program?.name || '',
      program_description: program?.description || '',
      category: program?.category || null,
      subCategory: program?.subCategory || null,
      cycleId: program?.cycleId || initialCycleId || 0,
      isActive: program?.isActive ?? true,
      dailyExercises: (() => {
        const raw = program?.dailyExercise
        if (!raw) return []
        if (Array.isArray(raw)) {
          return raw.map((d: DailyExerciseDTO & { isRestDay?: boolean }) => ({
            ...d,
            isRestDay: d.isRestDay ?? d.exercises?.length === 0,
            exercises: d.exercises ?? [],
          }))
        }
        const obj = raw as Record<
          string,
          DailyExerciseDTO & { isRestDay?: boolean }
        >
        return Object.entries(obj)
          .map(([day, d]) => ({
            ...d,
            day,
            isRestDay: d.isRestDay ?? d.exercises?.length === 0,
            exercises: d.exercises ?? [],
          }))
          .sort((a, b) => String(a.day).localeCompare(String(b.day)))
      })(),
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'dailyExercises',
  })

  const cycleId = watch('cycleId')
  const category = watch('category')
  const dailyExercises = watch('dailyExercises')

  // Clear 12-week error when user adds enough daily exercises (Red/Green)
  useEffect(() => {
    if (
      dailyExerciseCountError &&
      (cycleId === 1 || cycleId === 3) &&
      fields.length >= 12
    ) {
      setDailyExerciseCountError(null)
    }
  }, [cycleId, fields.length, dailyExerciseCountError])

  const fetchCycles = useCallback(async () => {
    try {
      const response = await adminService.getCycles()
      setCycles(response.data.data || [])
    } catch (error) {
      console.error('Error fetching cycles:', error)
      showError('Failed to load cycles')
    }
  }, [showError])

  const fetchGoalTypes = useCallback(async () => {
    try {
      const response = await goalTypeService.getAll({ limit: 100 })
      setGoalTypes(response.data.data.rows || [])
    } catch (error) {
      console.error('Error fetching goal types:', error)
      showError('Failed to load goal types')
    }
  }, [showError])

  // Fetch cycles and goal types
  useEffect(() => {
    fetchCycles()
    fetchGoalTypes()
  }, [fetchCycles, fetchGoalTypes])

  // Handle cycle change
  useEffect(() => {
    if (cycleId && cycles.length > 0) {
      const cycle = cycles.find(c => c.id === cycleId)

      if (cycle?.name === 'Amber') {
        setShowCategoryFields(false)
        setDayInputType('date')
      } else if (cycle?.name === 'Red' || cycle?.name === 'Green') {
        setShowCategoryFields(true)
        setDayInputType('sequential')
      }
    }
  }, [cycleId, cycles])

  // Generate unique exercise ID (using helper function)

  // Get unique categories from goal types
  const getCategories = useCallback(() => {
    const categories = goalTypes.map(gt => gt.category)
    return Array.from(new Set(categories))
  }, [goalTypes])

  // Get subcategories for selected category
  const getSubCategories = useCallback(
    (selectedCategory: string) => {
      return goalTypes
        .filter(gt => gt.category === selectedCategory)
        .map(gt => gt.subCategory)
        .filter((value, index, self) => self.indexOf(value) === index)
    },
    [goalTypes]
  )

  // Add daily exercise
  const addDailyExercise = useCallback(() => {
    if (dayInputType === 'sequential') {
      const dayNumber = fields.length + 1
      append({
        day: `day${dayNumber}`,
        isRestDay: false,
        exercise_name: '',
        exercise_description: '',
        exercise_time: '',
        workout_timer: '',
        rest_timer: '',
        exercises: [],
      })
    } else {
      // For Amber, use today's date as default
      const today = new Date().toISOString().split('T')[0]
      append({
        day: today,
        isRestDay: false,
        exercise_name: '',
        exercise_description: '',
        exercise_time: '',
        workout_timer: '',
        rest_timer: '',
        exercises: [],
      })
    }
  }, [dayInputType, fields.length, append])

  // Add exercise to a daily exercise
  const addExercise = useCallback(
    (dailyExerciseIndex: number) => {
      const current = watch('dailyExercises')
      const updated = [...current]
      updated[dailyExerciseIndex].exercises.push({
        exercise_id: generateExerciseId(),
        video: undefined,
        name: '',
        description: undefined,
        total_reps: undefined,
        sets: undefined,
        lb: undefined,
        alternate_exercise: null,
      })
      setValue('dailyExercises', updated)
    },
    [watch, setValue]
  )

  // Remove exercise from daily exercise
  const removeExercise = useCallback(
    (dailyExerciseIndex: number, exerciseIndex: number) => {
      const current = watch('dailyExercises')
      const updated = [...current]
      updated[dailyExerciseIndex].exercises.splice(exerciseIndex, 1)
      setValue('dailyExercises', updated)
    },
    [watch, setValue]
  )

  // Add alternate exercise
  const addAlternateExercise = useCallback(
    (dailyExerciseIndex: number, exerciseIndex: number) => {
      const current = watch('dailyExercises')
      const updated = [...current]
      if (
        !updated[dailyExerciseIndex].exercises[exerciseIndex].alternate_exercise
      ) {
        updated[dailyExerciseIndex].exercises[
          exerciseIndex
        ].alternate_exercise = {
          video: undefined,
          name: '',
          description: undefined,
          total_reps: undefined,
          sets: undefined,
          lb: undefined,
        }
        setValue('dailyExercises', updated)
      }
    },
    [watch, setValue]
  )

  // Remove alternate exercise
  const removeAlternateExercise = useCallback(
    (dailyExerciseIndex: number, exerciseIndex: number) => {
      const current = watch('dailyExercises')
      const updated = [...current]
      updated[dailyExerciseIndex].exercises[exerciseIndex].alternate_exercise =
        null
      setValue('dailyExercises', updated)
    },
    [watch, setValue]
  )

  // Handle video upload using presigned URL flow (same as profile picture)
  const handleVideoUpload = useCallback(
    async (
      file: File,
      dailyExerciseIndex: number,
      exerciseIndex: number,
      isAlternate: boolean = false
    ) => {
      // Prevent multiple simultaneous uploads
      if (isUploadingVideo) {
        showError('Please wait for the current upload to complete')
        return
      }

      const uploadKey = `${dailyExerciseIndex}-${exerciseIndex}-${isAlternate}`
      setUploadingVideo(uploadKey)

      try {
        // Upload video using presigned URL (same flow as profile picture)
        const videoUrl = await uploadVideo(file)

        if (!videoUrl) {
          throw new Error('No video URL returned from upload')
        }

        const current = watch('dailyExercises')
        const updated = [...current]

        if (isAlternate) {
          const alternateExercise =
            updated[dailyExerciseIndex].exercises[exerciseIndex]
              .alternate_exercise
          if (alternateExercise) {
            alternateExercise.video = videoUrl
          } else {
            updated[dailyExerciseIndex].exercises[
              exerciseIndex
            ].alternate_exercise = {
              video: videoUrl,
              name: '',
              description: undefined,
              total_reps: undefined,
              sets: undefined,
              lb: undefined,
            }
          }
        } else {
          updated[dailyExerciseIndex].exercises[exerciseIndex].video = videoUrl
        }

        setValue('dailyExercises', updated)
        showSuccess('Video uploaded successfully')
      } catch (error) {
        // Error is already handled by useFileUpload hook's onError callback
        console.error('Error uploading video:', error)
      } finally {
        setUploadingVideo(null)
      }
    },
    [uploadVideo, isUploadingVideo, watch, setValue, showSuccess, showError]
  )

  // Form submission
  const onSubmit = async (data: CreateProgramDTO) => {
    setDailyExerciseCountError(null)
    try {
      // Validate category/subCategory for Red/Green
      if (showCategoryFields && (!data.category || !data.subCategory)) {
        showError('Goal Type and Goal are required for Red and Green cycles')
        return
      }

      // Validate at least one daily exercise
      if (!data.dailyExercises || data.dailyExercises.length === 0) {
        const msg =
          data.cycleId === 1 || data.cycleId === 3
            ? 'Add all 12 daily exercises to proceed.'
            : 'Add at least one daily exercise to save.'
        showError(msg)
        return
      }

      // Red (1) and Green (3) cycles require 12 weeks (12 daily exercises)
      const RED_CYCLE_ID = 1
      const GREEN_CYCLE_ID = 3
      const RED_GREEN_MIN_DAILY_EXERCISES = 12
      const minDailyError = 'Add all 12 daily exercises to proceed.'
      if (
        (data.cycleId === RED_CYCLE_ID || data.cycleId === GREEN_CYCLE_ID) &&
        data.dailyExercises.length < RED_GREEN_MIN_DAILY_EXERCISES
      ) {
        setDailyExerciseCountError(minDailyError)
        showError(minDailyError)
        return
      }

      // Validate each non–rest-day daily exercise has at least one exercise
      for (const dailyExercise of data.dailyExercises) {
        if (dailyExercise.isRestDay) continue
        if (!dailyExercise.exercises || dailyExercise.exercises.length === 0) {
          showError('Each daily exercise must have at least one exercise')
          return
        }
      }

      // Normalize payload: rest days get exercises: [] and optional label
      const normalizedDailyExercises = data.dailyExercises.map(d =>
        d.isRestDay
          ? {
              day: d.day,
              isRestDay: true as const,
              exercise_name: 'Rest Day',
              exercises: [] as ExerciseDTO[],
            }
          : {
              ...d,
              isRestDay: false as const,
              exercises: d.exercises ?? [],
            }
      )

      if (isEditMode && program) {
        // Update existing program
        const updateData: UpdateProgramDTO = {
          program_name: data.program_name,
          program_description: data.program_description,
          category: data.category,
          subCategory: data.subCategory,
          cycleId: data.cycleId,
          isActive: data.isActive,
          dailyExercises: normalizedDailyExercises,
        }
        await programService.update(program.id, updateData)
        showSuccess('Program updated successfully!')
      } else {
        // Create new program
        await programService.create({
          ...data,
          dailyExercises: normalizedDailyExercises,
        })
        showSuccess('Program created successfully!')
        reset()
      }
      onSuccess?.()
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message ||
        'Failed to create program. Please try again.'
      showError(errorMessage)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Stack direction="vertical" spacing={6}>
        {/* Basic Information */}
        <div className="space-y-4">
          <Text as="h2" variant="primary" className="text-xl font-bold">
            Program Information
          </Text>

          <Input
            label="Program Name"
            placeholder="Enter program name"
            required
            error={errors.program_name?.message}
            {...register('program_name', {
              required: 'Program name is required',
            })}
          />

          <TextArea
            label="Program Description"
            placeholder="Enter program description"
            required
            minLines={3}
            error={errors.program_description?.message}
            {...register('program_description', {
              required: 'Program description is required',
            })}
          />

          <Dropdown
            label="Cycle"
            placeholder="Select cycle"
            required
            disabled={true}
            value={cycleId ? String(cycleId) : undefined}
            onValueChange={value =>
              setValue('cycleId', Number(value), { shouldValidate: true })
            }
            options={cycles.map(cycle => ({
              value: String(cycle.id),
              label: cycle.name,
            }))}
            error={errors.cycleId?.message}
            helperText="Cycle cannot be changed"
          />

          {/* Category and SubCategory (conditional) */}
          {showCategoryFields && (
            <>
              <Dropdown
                label="Goal Type"
                placeholder="Select goal type"
                required
                value={category || undefined}
                onValueChange={value => {
                  const stringValue = Array.isArray(value) ? value[0] : value
                  setValue('category', stringValue || null, {
                    shouldValidate: true,
                  })
                  setValue('subCategory', null) // Reset subcategory when category changes
                }}
                options={getCategories().map(cat => ({
                  value: cat,
                  label: cat,
                }))}
                error={errors.category?.message}
              />

              {category && (
                <Dropdown
                  label="Goal"
                  placeholder="Select goal"
                  required
                  value={watch('subCategory') || undefined}
                  onValueChange={value => {
                    const stringValue = Array.isArray(value) ? value[0] : value
                    setValue('subCategory', stringValue || null, {
                      shouldValidate: true,
                    })
                  }}
                  options={getSubCategories(category).map(subCat => ({
                    value: subCat,
                    label: subCat,
                  }))}
                  error={errors.subCategory?.message}
                />
              )}
            </>
          )}

          <div className="flex items-center gap-2 hidden">
            <Switch
              value={watch('isActive') ?? true}
              onValueChange={value => setValue('isActive', value)}
              label="Active"
            />
          </div>
        </div>

        {/* Daily Exercises */}
        <div className="space-y-4">
          <div>
            <Text as="h3" variant="primary" className="text-lg font-bold">
              Daily Exercises
            </Text>
            {(watch('cycleId') === 1 || watch('cycleId') === 3) && (
              <Text variant="secondary" className="text-sm mt-0.5">
                Add all 12 daily exercises to proceed. Current: {fields.length}{' '}
                / 12
              </Text>
            )}
          </div>

          {(watch('cycleId') === 1 || watch('cycleId') === 3) &&
          fields.length < 12 ? (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm"
              role="alert"
            >
              Add all 12 daily exercises to proceed. Current: {fields.length} /
              12
            </div>
          ) : (
            (dailyExerciseCountError ||
              (
                errors.dailyExercises as
                  | { message?: string; root?: { message?: string } }
                  | undefined
              )?.message ||
              (errors.dailyExercises as { root?: { message?: string } })?.root
                ?.message ||
              (isSubmitted && fields.length === 0
                ? watch('cycleId') === 1 || watch('cycleId') === 3
                  ? 'Add all 12 daily exercises to proceed.'
                  : 'Add at least one daily exercise to save.'
                : null)) && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm"
                role="alert"
              >
                {dailyExerciseCountError ??
                  (errors.dailyExercises as { message?: string })?.message ??
                  (errors.dailyExercises as { root?: { message?: string } })
                    ?.root?.message ??
                  (isSubmitted && fields.length === 0
                    ? watch('cycleId') === 1 || watch('cycleId') === 3
                      ? 'Add all 12 daily exercises to proceed.'
                      : 'Add at least one daily exercise to save.'
                    : '')}
              </div>
            )
          )}

          {fields.map((field, dailyExerciseIndex) => (
            <DailyExerciseCard
              key={field.id}
              dailyExercise={dailyExercises[dailyExerciseIndex]}
              dailyExerciseIndex={dailyExerciseIndex}
              dayInputType={dayInputType}
              register={register}
              errors={errors}
              watch={watch}
              setValue={setValue}
              onAddExercise={() => addExercise(dailyExerciseIndex)}
              onRemoveExercise={(exerciseIndex: number) =>
                removeExercise(dailyExerciseIndex, exerciseIndex)
              }
              onAddAlternate={(exerciseIndex: number) =>
                addAlternateExercise(dailyExerciseIndex, exerciseIndex)
              }
              onRemoveAlternate={(exerciseIndex: number) =>
                removeAlternateExercise(dailyExerciseIndex, exerciseIndex)
              }
              onVideoUpload={(
                file: File,
                exerciseIndex: number,
                isAlternate: boolean
              ) =>
                handleVideoUpload(
                  file,
                  dailyExerciseIndex,
                  exerciseIndex,
                  isAlternate
                )
              }
              onRemove={() => remove(dailyExerciseIndex)}
              uploadingVideo={uploadingVideo}
            />
          ))}

          {fields.length === 0 && (
            <div className="border-2 border-dashed border-mid-gray rounded-lg p-8 flex flex-col items-center justify-center gap-4 text-center">
              <Text variant="muted" className="text-sm">
                No daily exercises added yet. Click "Add Daily Exercise" to get
                started.
              </Text>
            </div>
          )}
        </div>
        <div className="mt-4 w-full">
          <Button
            type="button"
            variant="outline"
            size="small"
            className="w-full"
            leftIcon={<Icon name="plus" family="solid" size={16} />}
            onClick={addDailyExercise}
          >
            Add Daily Exercise
          </Button>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-mid-gray">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" variant="primary" loading={loading}>
            {isEditMode ? 'Update Program' : 'Create Program'}
          </Button>
        </div>
      </Stack>
    </form>
  )
}

// Daily Exercise Card Component
interface DailyExerciseCardProps {
  dailyExercise: DailyExerciseDTO
  dailyExerciseIndex: number
  dayInputType: 'sequential' | 'date'
  register: UseFormRegister<CreateProgramDTO>
  errors: FieldErrors<CreateProgramDTO>
  watch: UseFormWatch<CreateProgramDTO>
  setValue: UseFormSetValue<CreateProgramDTO>
  onAddExercise: () => void
  onRemoveExercise: (exerciseIndex: number) => void
  onAddAlternate: (exerciseIndex: number) => void
  onRemoveAlternate: (exerciseIndex: number) => void
  onVideoUpload: (
    file: File,
    exerciseIndex: number,
    isAlternate: boolean
  ) => void
  onRemove: () => void
  uploadingVideo: string | null
}

function DailyExerciseCard({
  dailyExercise,
  dailyExerciseIndex,
  dayInputType,
  register,
  errors,
  watch,
  setValue,
  onAddExercise,
  onRemoveExercise,
  onAddAlternate,
  onRemoveAlternate,
  onVideoUpload,
  onRemove,
  uploadingVideo,
}: Readonly<DailyExerciseCardProps>) {
  const exercises =
    watch(`dailyExercises.${dailyExerciseIndex}.exercises`) || []
  const isRestDay =
    watch(`dailyExercises.${dailyExerciseIndex}.isRestDay`) ?? false

  const handleRestDayChange = (value: boolean) => {
    setValue(`dailyExercises.${dailyExerciseIndex}.isRestDay`, value)
    if (value) {
      setValue(`dailyExercises.${dailyExerciseIndex}.exercises`, [])
    }
  }

  return (
    <div className="border border-mid-gray rounded-lg p-4 space-y-4 bg-light-gray">
      <div className="flex justify-between items-start">
        <Text variant="default" className="font-semibold">
          Daily Exercise {dailyExerciseIndex + 1}
        </Text>
        <Button
          type="button"
          variant="ghost"
          size="small"
          onClick={onRemove}
          leftIcon={<Icon name="trash" family="solid" size={14} />}
        >
          Remove
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          value={isRestDay}
          onValueChange={handleRestDayChange}
          label="Rest day"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          {dayInputType === 'sequential' ? (
            <Input
              label="Day"
              value={dailyExercise.day}
              readOnly
              helperText="Auto-generated sequential day"
            />
          ) : (
            <DatePicker
              label="Day"
              value={dailyExercise.day}
              onChange={date =>
                setValue(`dailyExercises.${dailyExerciseIndex}.day`, date || '')
              }
              required
              error={
                errors.dailyExercises?.[dailyExerciseIndex]?.day?.message as
                  | string
                  | undefined
              }
            />
          )}
        </div>

        {!isRestDay && (
          <Input
            label="Exercise Name"
            placeholder="e.g., Upper Body Strength"
            required
            {...register(`dailyExercises.${dailyExerciseIndex}.exercise_name`, {
              required: 'Exercise name is required',
            })}
            error={
              errors.dailyExercises?.[dailyExerciseIndex]?.exercise_name
                ?.message as string | undefined
            }
          />
        )}
      </div>

      {!isRestDay && (
        <>
          <div className="grid grid-cols-3 gap-4">
            <TextArea
              label="Exercise Description"
              placeholder="Description of the exercise day"
              minLines={2}
              {...register(
                `dailyExercises.${dailyExerciseIndex}.exercise_description`
              )}
            />
            <Input
              label="Exercise Time"
              placeholder="e.g., 60 minutes"
              {...register(
                `dailyExercises.${dailyExerciseIndex}.exercise_time`
              )}
            />
            <Input
              label="Workout Timer"
              placeholder="e.g., 45 seconds"
              {...register(
                `dailyExercises.${dailyExerciseIndex}.workout_timer`
              )}
            />
          </div>

          <Input
            label="Rest Timer"
            placeholder="e.g., 90 seconds"
            {...register(`dailyExercises.${dailyExerciseIndex}.rest_timer`)}
          />

          {/* Exercises List */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Text variant="default" className="font-medium">
                Exercises
              </Text>
              <Button
                type="button"
                variant="outline"
                size="small"
                leftIcon={<Icon name="plus" family="solid" size={14} />}
                onClick={onAddExercise}
              >
                Add Exercise
              </Button>
            </div>

            {exercises.map((exercise: ExerciseDTO, exerciseIndex: number) => (
              <ExerciseCard
                key={exercise.exercise_id}
                exercise={exercise}
                dailyExerciseIndex={dailyExerciseIndex}
                exerciseIndex={exerciseIndex}
                register={register}
                errors={errors}
                onRemove={() => onRemoveExercise(exerciseIndex)}
                onAddAlternate={() => onAddAlternate(exerciseIndex)}
                onRemoveAlternate={() => onRemoveAlternate(exerciseIndex)}
                onVideoUpload={(file: File, isAlternate: boolean) =>
                  onVideoUpload(file, exerciseIndex, isAlternate)
                }
                uploadingVideo={uploadingVideo}
              />
            ))}

            {exercises.length === 0 && (
              <div className="border border-dashed border-mid-gray rounded p-4 text-center">
                <Text variant="muted" className="text-sm">
                  No exercises added. Click "Add Exercise" to add one.
                </Text>
              </div>
            )}
          </div>
        </>
      )}

      {isRestDay && (
        <Text variant="secondary" className="text-sm">
          No exercises needed for this rest day.
        </Text>
      )}
    </div>
  )
}

// Exercise Card Component
interface ExerciseCardProps {
  exercise: ExerciseDTO
  dailyExerciseIndex: number
  exerciseIndex: number
  register: UseFormRegister<CreateProgramDTO>
  errors: FieldErrors<CreateProgramDTO>
  onRemove: () => void
  onAddAlternate: () => void
  onRemoveAlternate: () => void
  onVideoUpload: (file: File, isAlternate: boolean) => void
  uploadingVideo: string | null
}

function ExerciseCard({
  exercise,
  dailyExerciseIndex,
  exerciseIndex,
  register,
  errors,
  onRemove,
  onAddAlternate,
  onRemoveAlternate,
  onVideoUpload,
  uploadingVideo,
}: Readonly<ExerciseCardProps>) {
  const hasAlternate = !!exercise.alternate_exercise
  const uploadKey = `${dailyExerciseIndex}-${exerciseIndex}`
  const isUploading = uploadingVideo?.startsWith(uploadKey)

  return (
    <div className="border-l-4 border-primary pl-4 space-y-3 bg-white rounded p-3">
      <div className="flex justify-between items-start">
        <Text variant="default" className="font-medium text-sm">
          Exercise {exerciseIndex + 1}
        </Text>
        <Button
          type="button"
          variant="ghost"
          size="small"
          onClick={onRemove}
          leftIcon={<Icon name="trash" family="solid" size={12} />}
        >
          Remove
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Exercise Name"
          placeholder="e.g., Barbell Squat"
          required
          {...register(
            `dailyExercises.${dailyExerciseIndex}.exercises.${exerciseIndex}.name`,
            {
              required: 'Exercise name is required',
            }
          )}
          error={
            errors.dailyExercises?.[dailyExerciseIndex]?.exercises?.[
              exerciseIndex
            ]?.name?.message as string | undefined
          }
        />

        <div>
          <Text variant="secondary" className="text-sm font-medium mb-1">
            Video Upload
          </Text>
          <input
            type="file"
            accept="video/*"
            onChange={e => {
              const file = e.target.files?.[0]
              if (file) {
                onVideoUpload(file, false)
              }
            }}
            className="w-full p-2 border border-mid-gray rounded-lg text-sm"
            disabled={isUploading}
          />
          {exercise.video && (
            <a
              href={exercise.video}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-xs mt-1 block"
            >
              View Video
            </a>
          )}
          {isUploading && (
            <Text variant="muted" className="text-xs mt-1">
              Uploading...
            </Text>
          )}
        </div>
      </div>

      <TextArea
        label="Description"
        placeholder="Exercise description"
        minLines={2}
        {...register(
          `dailyExercises.${dailyExerciseIndex}.exercises.${exerciseIndex}.description`
        )}
      />

      <div className="grid grid-cols-3 gap-4">
        <Input
          label="Total Reps"
          type="number"
          placeholder="e.g., 10"
          {...register(
            `dailyExercises.${dailyExerciseIndex}.exercises.${exerciseIndex}.total_reps`,
            {
              valueAsNumber: true,
            }
          )}
        />
        <Input
          label="Sets"
          type="number"
          placeholder="e.g., 3"
          {...register(
            `dailyExercises.${dailyExerciseIndex}.exercises.${exerciseIndex}.sets`,
            {
              valueAsNumber: true,
            }
          )}
        />
        <Input
          label="Weight (lb)"
          type="number"
          placeholder="e.g., 135"
          {...register(
            `dailyExercises.${dailyExerciseIndex}.exercises.${exerciseIndex}.lb`,
            {
              valueAsNumber: true,
            }
          )}
        />
      </div>

      {/* Alternate Exercise */}
      {hasAlternate ? (
        <div className="ml-4 border-l-4 border-warning pl-4 space-y-3 bg-light-gray rounded p-3">
          <div className="flex justify-between items-start">
            <Text variant="default" className="font-medium text-sm">
              Alternate Exercise
            </Text>
            <Button
              type="button"
              variant="ghost"
              size="small"
              onClick={onRemoveAlternate}
              leftIcon={<Icon name="trash" family="solid" size={12} />}
            >
              Remove
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Alternate Exercise Name"
              placeholder="e.g., Push-ups"
              required
              {...register(
                `dailyExercises.${dailyExerciseIndex}.exercises.${exerciseIndex}.alternate_exercise.name`,
                {
                  required: 'Alternate exercise name is required',
                }
              )}
              error={
                errors.dailyExercises?.[dailyExerciseIndex]?.exercises?.[
                  exerciseIndex
                ]?.alternate_exercise?.name?.message as string | undefined
              }
            />

            <div>
              <Text variant="secondary" className="text-sm font-medium mb-1">
                Video Upload
              </Text>
              <input
                type="file"
                accept="video/*"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) {
                    onVideoUpload(file, true)
                  }
                }}
                className="w-full p-2 border border-mid-gray rounded-lg text-sm"
                disabled={isUploading}
              />
              {exercise.alternate_exercise?.video && (
                <a
                  href={exercise.alternate_exercise.video}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary text-xs mt-1 block"
                >
                  View Video
                </a>
              )}
            </div>
          </div>

          <TextArea
            label="Description"
            placeholder="Alternate exercise description"
            minLines={2}
            {...register(
              `dailyExercises.${dailyExerciseIndex}.exercises.${exerciseIndex}.alternate_exercise.description`
            )}
          />

          <div className="grid grid-cols-3 gap-4">
            <Input
              label="Total Reps"
              type="number"
              placeholder="e.g., 15"
              {...register(
                `dailyExercises.${dailyExerciseIndex}.exercises.${exerciseIndex}.alternate_exercise.total_reps`,
                {
                  valueAsNumber: true,
                }
              )}
            />
            <Input
              label="Sets"
              type="number"
              placeholder="e.g., 3"
              {...register(
                `dailyExercises.${dailyExerciseIndex}.exercises.${exerciseIndex}.alternate_exercise.sets`,
                {
                  valueAsNumber: true,
                }
              )}
            />
            <Input
              label="Weight (lb)"
              type="number"
              placeholder="e.g., 0"
              {...register(
                `dailyExercises.${dailyExerciseIndex}.exercises.${exerciseIndex}.alternate_exercise.lb`,
                {
                  valueAsNumber: true,
                }
              )}
            />
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="small"
          onClick={onAddAlternate}
          leftIcon={<Icon name="plus" family="solid" size={14} />}
        >
          Add Alternate Exercise
        </Button>
      )}
    </div>
  )
}
