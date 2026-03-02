// OnboardingForm.tsx
import { useState, useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
import { Button } from '@/components/Button'
import { DatePicker } from '@/components/DatePicker'
import type { OnboardingProps, CreateOnboardingDTO } from '@/types/onboarding'
import { JOB_ROLE_OPTIONS, EQUIPMENT_ACCESS_OPTIONS } from '@/types/onboarding'
import type { ReadinessRecommendation } from '@/types/readiness'
import { readinessService } from '@/api/readiness.service'
import type { AxiosError } from 'axios'

/** Goal Category (first dropdown). Improve Operational Readiness = no second dropdown, no event date. */
const GOAL_CATEGORIES = [
  {
    label: 'Tactical Selection / School',
    value: 'Tactical Selection / School',
  },
  { label: 'Competition / Performance', value: 'Competition / Performance' },
  {
    label: 'Improve Operational Readiness',
    value: 'Improve Operational Readiness',
  },
] as const

/** Goals per category (second dropdown). Empty = no second dropdown. */
const GOALS_BY_CATEGORY: Record<string, { label: string; value: string }[]> = {
  'Tactical Selection / School': [
    { label: 'Special Forces Selection', value: 'Special Forces Selection' },
    { label: 'SWAT Selection', value: 'SWAT Selection' },
    { label: 'Ranger Assessment', value: 'Ranger Assessment' },
    { label: 'Ranger School', value: 'Ranger School' },
    { label: 'AFSOC Selection Prep', value: 'AFSOC Selection Prep' },
    { label: 'NSW Prep', value: 'NSW Prep' },
    { label: 'OCS / OTS Prep', value: 'OCS / OTS Prep' },
    { label: 'Law Enforcement Academy', value: 'Law Enforcement Academy' },
    { label: 'Fire Academy', value: 'Fire Academy' },
    { label: 'Other', value: 'Other' },
  ],
  'Competition / Performance': [
    { label: 'Half Marathon', value: 'Half Marathon' },
    { label: 'Marathon', value: 'Marathon' },
    { label: 'Tactical Games', value: 'Tactical Games' },
    { label: 'Powerlifting Meet', value: 'Powerlifting Meet' },
  ],
  'Improve Operational Readiness': [],
}

/** Closest-option list when user selects "Other" under Tactical Selection / School (no "Other" option). */
const TACTICAL_CLOSEST_OPTIONS = GOALS_BY_CATEGORY[
  'Tactical Selection / School'
].filter(o => o.value !== 'Other')

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
  const [primaryGoalIsOther, setPrimaryGoalIsOther] = useState(
    !!(
      initialValues as Partial<CreateOnboardingDTO> & {
        goalFlaggedForReview?: boolean
      }
    )?.goalFlaggedForReview
  )
  const [primaryGoalClosestOption, setPrimaryGoalClosestOption] =
    useState<string>(
      (
        initialValues as Partial<CreateOnboardingDTO> & {
          goalFlaggedForReview?: boolean
        }
      )?.goalFlaggedForReview
        ? initialValues?.primaryGoal || ''
        : ''
    )
  const [primaryGoalCategory, setPrimaryGoalCategory] = useState<string>(
    (initialValues as Partial<CreateOnboardingDTO>)?.primaryGoalCategory || ''
  )
  const [job, setJob] = useState<string>(
    (initialValues as Partial<CreateOnboardingDTO>)?.job || ''
  )

  // Event date only when category is Tactical Selection/School or Competition/Performance
  const eventDateRequired =
    primaryGoalCategory === 'Tactical Selection / School' ||
    primaryGoalCategory === 'Competition / Performance'

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

  const submitHandler: SubmitHandler<CreateOnboardingDTO> = async data => {
    setError(null)
    setLoading(true)

    // Resolve effective primary goal (Improve Operational Readiness = category; else when "Other", use closest option)
    let effectivePrimaryGoal: string
    if (primaryGoalCategory === 'Improve Operational Readiness') {
      effectivePrimaryGoal = 'Improve Operational Readiness'
    } else if (primaryGoalIsOther) {
      effectivePrimaryGoal = primaryGoalClosestOption
    } else {
      effectivePrimaryGoal = primaryGoal
    }

    if (!effectivePrimaryGoal) {
      let message: string
      if (primaryGoalCategory === 'Improve Operational Readiness') {
        message = 'Please select a goal category'
      } else if (primaryGoalIsOther) {
        message = 'Please select the closest option for your goal'
      } else {
        message = 'Please select a primary goal'
      }
      setError(message)
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
        primaryGoal: effectivePrimaryGoal,
        primaryGoalCategory: primaryGoalCategory || undefined,
        job: job || undefined,
        equipmentAccess: equipmentAccess
          ? (equipmentAccess as CreateOnboardingDTO['equipmentAccess'])
          : undefined,
        equipment: equipment.length > 0 ? equipment : undefined,
        eventDate: eventDate || undefined,
        goalFlaggedForReview: primaryGoalIsOther || undefined,
      }

      // Defer-save: evaluate only (no create). Store recommendation + form data for Step 3 confirm.
      const axiosResponse = await readinessService.evaluateReadiness({
        trainingExperience: payload.trainingExperience,
        primaryGoal: payload.primaryGoal,
        primaryGoalCategory: payload.primaryGoalCategory,
        eventDate: payload.eventDate,
        trainingBreak120Days: payload.trainingBreak120Days,
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
    {
      label: 'Beginner (less than 1 year structured barbell training)',
      value: 'BEGINNER',
    },
    {
      label: 'Intermediate (1–3 years structured barbell training)',
      value: 'INTERMEDIATE',
    },
    {
      label: 'Advanced (3+ years structured barbell training)',
      value: 'ADVANCED',
    },
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
        label="Goal Category"
        value={primaryGoalCategory}
        onValueChange={v => {
          const value = v as string
          setPrimaryGoalCategory(value)
          if (value === 'Improve Operational Readiness') {
            setPrimaryGoal('Improve Operational Readiness')
            setPrimaryGoalIsOther(false)
            setPrimaryGoalClosestOption('')
            setValue('primaryGoal', 'Improve Operational Readiness', {
              shouldValidate: true,
            })
          } else {
            setPrimaryGoal('')
            setPrimaryGoalIsOther(false)
            setPrimaryGoalClosestOption('')
            setValue('primaryGoal', '', { shouldValidate: true })
          }
        }}
        options={[...GOAL_CATEGORIES]}
        required
        fullWidth
        placeholder="Select goal category"
      />

      {primaryGoalCategory &&
        primaryGoalCategory !== 'Improve Operational Readiness' && (
          <Dropdown
            label="Goal"
            value={primaryGoalIsOther ? 'Other' : primaryGoal}
            onValueChange={v => {
              const value = v as string
              if (value === 'Other') {
                setPrimaryGoalIsOther(true)
                setPrimaryGoal('')
                setPrimaryGoalClosestOption('')
                setValue('primaryGoal', '', { shouldValidate: true })
              } else {
                setPrimaryGoalIsOther(false)
                setPrimaryGoal(value)
                setPrimaryGoalClosestOption('')
                setValue('primaryGoal', value, { shouldValidate: true })
              }
            }}
            options={GOALS_BY_CATEGORY[primaryGoalCategory] ?? []}
            required
            fullWidth
            placeholder={`Select goal`}
            error={errors.primaryGoal?.message}
          />
        )}

      {primaryGoalCategory === 'Tactical Selection / School' &&
        primaryGoalIsOther && (
          <Dropdown
            label="Choose the closest option (for admin review)"
            value={primaryGoalClosestOption}
            onValueChange={v => {
              const value = v as string
              setPrimaryGoalClosestOption(value)
              setValue('primaryGoal', value, { shouldValidate: true })
            }}
            options={TACTICAL_CLOSEST_OPTIONS}
            required
            fullWidth
            placeholder="Select closest option"
          />
        )}

      <Dropdown
        label="Have you had a break in training lasting 120+ days in the past year?"
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
