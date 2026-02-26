// OnboardingForm.tsx
import { useState, useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
import { Button } from '@/components/Button'
import { DatePicker } from '@/components/DatePicker'
import { Checkbox } from '@/components/Checkbox'
import type { OnboardingProps, CreateOnboardingDTO } from '@/types/onboarding'
import { JOB_ROLE_OPTIONS, EQUIPMENT_ACCESS_OPTIONS } from '@/types/onboarding'
import type { ReadinessRecommendation } from '@/types/readiness'
import { readinessService } from '@/api/readiness.service'
import { goalTypeService } from '@/api/goal-type.service'
import type { GoalType } from '@/types/goal-type'
import type { AxiosError } from 'axios'

interface OnboardingFormProps {
  /** Defer-save: pass form data + recommendation from evaluate (no DB save on Step 1) */
  readonly onNext: (
    formData: CreateOnboardingDTO,
    recommendation: ReadinessRecommendation
  ) => void
  readonly loading: boolean
  readonly setLoading: (value: boolean) => void
  readonly setError: (value: string | null) => void
  readonly initialValues?: Partial<OnboardingProps>
}

export default function OnboardingForm({
  onNext,
  loading,
  setLoading,
  setError,
  initialValues,
}: OnboardingFormProps) {
  const [gender, setGender] = useState<string>(initialValues?.gender || '')
  const [trainingExp, setTrainingExp] = useState<string>(
    initialValues?.trainingExperience || ''
  )
  const [trainingBreak120, setTrainingBreak120] = useState<boolean>(
    (initialValues as Partial<CreateOnboardingDTO>)?.trainingBreak120Days ??
      false
  )
  const [equipment] = useState<string[]>(initialValues?.equipment || [])
  const [equipmentAccess, setEquipmentAccess] = useState<string>(
    (initialValues as Partial<CreateOnboardingDTO>)?.equipmentAccess || ''
  )
  const [eventDate, setEventDate] = useState<string>(
    (initialValues as Partial<OnboardingProps & { eventDate?: string }>)
      ?.eventDate || ''
  )
  const [primaryGoal, setPrimaryGoal] = useState<string>(
    initialValues?.primaryGoal || ''
  )
  const [primaryGoalCategory, setPrimaryGoalCategory] = useState<string>(
    (initialValues as Partial<CreateOnboardingDTO>)?.primaryGoalCategory || ''
  )
  const [job, setJob] = useState<string>(
    (initialValues as Partial<CreateOnboardingDTO>)?.job || ''
  )
  const [returningFromEvent, setReturningFromEvent] = useState(false)
  const [severeConstraints, setSevereConstraints] = useState(false)
  const [goalTypes, setGoalTypes] = useState<GoalType[]>([])
  const [loadingGoals, setLoadingGoals] = useState(false)

  // Event date only for Tactical Selection/School and Competition/Performance (doc §2.4, §2.5)
  const eventDateRequired =
    primaryGoal !== 'Improve Operational Readiness' &&
    (primaryGoalCategory === 'Selection' ||
      primaryGoalCategory === 'School' ||
      primaryGoalCategory === 'Competition' ||
      /tactical|competition|performance/i.test(primaryGoalCategory))

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CreateOnboardingDTO>({
    defaultValues: {
      ...(initialValues as Partial<CreateOnboardingDTO>),
      primaryGoal: initialValues?.primaryGoal || '',
      eventDate:
        (initialValues as Partial<CreateOnboardingDTO>)?.eventDate || '',
    },
  })

  // Register primary goal, event date (required only when eventDateRequired)
  useEffect(() => {
    register('primaryGoal', { required: 'Primary goal is required' })
    register('eventDate', {
      required: eventDateRequired
        ? 'Event date is required for your goal'
        : false,
    })
  }, [register, eventDateRequired])

  // Sync primaryGoalCategory from selected goal (for event date visibility)
  useEffect(() => {
    if (!primaryGoal || goalTypes.length === 0) return
    const gt = goalTypes.find(g => g.subCategory === primaryGoal)
    if (gt?.category) setPrimaryGoalCategory(gt.category)
  }, [primaryGoal, goalTypes])

  // Fetch goal types on mount
  useEffect(() => {
    const fetchGoalTypes = async () => {
      try {
        setLoadingGoals(true)
        const response = await goalTypeService.getAll({ limit: 100 })
        setGoalTypes(response.data.data.rows || [])
      } catch (error) {
        const axiosError = error as AxiosError<{ message: string }>
        console.error(
          'Failed to fetch goal types:',
          axiosError.response?.data?.message || 'Unknown error'
        )
        // Continue with empty list - user can still type if needed
        setGoalTypes([])
      } finally {
        setLoadingGoals(false)
      }
    }

    fetchGoalTypes()
  }, [])

  const submitHandler: SubmitHandler<CreateOnboardingDTO> = async data => {
    setError(null)
    setLoading(true)

    // Validate goals and event date
    if (!primaryGoal) {
      setError('Please select a primary goal')
      setLoading(false)
      setValue('primaryGoal', '', { shouldValidate: true })
      return
    }

    if (eventDateRequired && !eventDate) {
      setError('Please select an event date (required for your goal)')
      setLoading(false)
      setValue('eventDate', '', { shouldValidate: true })
      return
    }

    try {
      const payload: CreateOnboardingDTO = {
        ...data,
        gender,
        trainingExperience: trainingExp as
          | 'BEGINNER'
          | 'INTERMEDIATE'
          | 'ADVANCED',
        trainingBreak120Days: trainingBreak120,
        primaryGoal: primaryGoal,
        primaryGoalCategory: primaryGoalCategory || undefined,
        job: job || undefined,
        equipmentAccess: equipmentAccess
          ? (equipmentAccess as CreateOnboardingDTO['equipmentAccess'])
          : undefined,
        equipment: equipment.length > 0 ? equipment : undefined,
        eventDate: eventDate || undefined,
        returningFromEvent: returningFromEvent || undefined,
        severeConstraints: severeConstraints || undefined,
      }

      // Defer-save: evaluate only (no create). Store recommendation + form data for Step 3 confirm.
      const axiosResponse = await readinessService.evaluateReadiness({
        trainingExperience: payload.trainingExperience,
        primaryGoal: payload.primaryGoal,
        primaryGoalCategory: payload.primaryGoalCategory,
        eventDate: payload.eventDate,
        trainingBreak120Days: payload.trainingBreak120Days,
        returningFromEvent: payload.returningFromEvent,
        severeConstraints: payload.severeConstraints,
      })
      const apiResponse = axiosResponse.data
      if (apiResponse.statusCode !== 200 || !apiResponse.data) {
        throw new Error(apiResponse.message || 'Invalid response format')
      }

      onNext(payload, apiResponse.data)
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message || 'Failed to get recommendation.'
      setError(errorMessage)
      console.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
  ]

  const trainingExpOptions = [
    { label: 'BEGINNER', value: 'BEGINNER' },
    { label: 'INTERMEDIATE', value: 'INTERMEDIATE' },
    { label: 'ADVANCED', value: 'ADVANCED' },
  ]

  return (
    <form onSubmit={handleSubmit(submitHandler)} className="space-y-4">
      <Input
        label="Height (in inches)"
        type="number"
        {...register('height', {
          required: 'Height is required',
          valueAsNumber: true,
        })}
        error={errors.height?.message}
      />

      <Input
        label="Weight (in pounds)"
        type="number"
        {...register('weight', {
          required: 'Weight is required',
          valueAsNumber: true,
        })}
        error={errors.weight?.message}
      />

      <Input
        label="Age"
        type="number"
        {...register('age', {
          required: 'Age is required',
          valueAsNumber: true,
        })}
        error={errors.age?.message}
      />

      <Dropdown
        label="Gender"
        value={gender}
        onValueChange={v => setGender(v as string)}
        options={genderOptions}
        required
        fullWidth
      />

      <Dropdown
        label="Training Experience"
        value={trainingExp}
        onValueChange={v => setTrainingExp(v as string)}
        options={trainingExpOptions}
        required
        fullWidth
      />

      <Dropdown
        label="Primary Goal"
        value={primaryGoal}
        onValueChange={v => {
          const value = v as string
          setPrimaryGoal(value)
          setValue('primaryGoal', value, { shouldValidate: true })
        }}
        options={goalTypes.map(gt => {
          const categoryLabel = gt.category ? ` (${gt.category})` : ''
          return {
            label: `${gt.subCategory}${categoryLabel}`,
            value: gt.subCategory,
          }
        })}
        required
        fullWidth
        disabled={loadingGoals}
        placeholder={loadingGoals ? 'Loading goals...' : 'Select primary goal'}
        error={errors.primaryGoal?.message}
      />

      <Dropdown
        label="Training break 120+ days"
        value={trainingBreak120 ? 'yes' : 'no'}
        onValueChange={v => setTrainingBreak120(v === 'yes')}
        options={[
          { label: 'No', value: 'no' },
          { label: 'Yes', value: 'yes' },
        ]}
        required
        fullWidth
      />

      {eventDateRequired && (
        <DatePicker
          label="Event Date"
          value={eventDate}
          onChange={date => {
            setEventDate(date ?? '')
            setValue('eventDate', date ?? '', { shouldValidate: true })
          }}
          helperText="Primary event date for training timeline and roadmap generation"
          error={errors.eventDate?.message}
          required
        />
      )}

      <Dropdown
        label="Job / Role"
        value={job}
        onValueChange={v => setJob(v as string)}
        options={[...JOB_ROLE_OPTIONS]}
        required
        fullWidth
        placeholder="Select your job or role"
        error={errors.job?.message}
      />

      <div className="space-y-3 hidden">
        <Checkbox
          label="Returning from selection/deployment (recommend Red Cycle)"
          checked={returningFromEvent}
          onValueChange={v => setReturningFromEvent(v)}
        />
        <Checkbox
          label="Limited time or equipment — recommend Sustainment programs"
          checked={severeConstraints}
          onValueChange={v => setSevereConstraints(v)}
        />
      </div>

      <Dropdown
        label="Equipment access"
        value={equipmentAccess}
        onValueChange={v => setEquipmentAccess(v as string)}
        options={[...EQUIPMENT_ACCESS_OPTIONS]}
        required
        fullWidth
        placeholder="Select equipment access"
        error={errors.equipmentAccess?.message}
      />

      <Button type="submit" loading={loading}>
        {loading ? 'Submitting...' : 'Next'}
      </Button>
    </form>
  )
}
