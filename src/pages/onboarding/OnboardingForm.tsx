// OnboardingForm.tsx
import { useState, useEffect } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
import { Button } from '@/components/Button'
import { DatePicker } from '@/components/DatePicker'
import type { OnboardingProps, CreateOnboardingDTO } from '@/types/onboarding'
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
  const [equipment, setEquipment] = useState<string[]>(
    initialValues?.equipment || []
  )
  const [eventDate, setEventDate] = useState<string>(
    (initialValues as Partial<OnboardingProps & { eventDate?: string }>)
      ?.eventDate || ''
  )
  const [primaryGoal, setPrimaryGoal] = useState<string>(
    initialValues?.primaryGoal || ''
  )
  const [secondaryGoal, setSecondaryGoal] = useState<string>(
    initialValues?.secondaryGoal || ''
  )
  const [goalTypes, setGoalTypes] = useState<GoalType[]>([])
  const [loadingGoals, setLoadingGoals] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CreateOnboardingDTO>({
    defaultValues: {
      ...(initialValues as Partial<CreateOnboardingDTO>),
      primaryGoal: initialValues?.primaryGoal || '',
      secondaryGoal: initialValues?.secondaryGoal || '',
    },
  })

  // Register primary and secondary goals for validation
  useEffect(() => {
    register('primaryGoal', { required: 'Primary goal is required' })
    register('secondaryGoal', { required: 'Secondary goal is required' })
  }, [register])

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

    // Validate goals are selected
    if (!primaryGoal) {
      setError('Please select a primary goal')
      setLoading(false)
      setValue('primaryGoal', '', { shouldValidate: true })
      return
    }

    if (!secondaryGoal) {
      setError('Please select a secondary goal')
      setLoading(false)
      setValue('secondaryGoal', '', { shouldValidate: true })
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
        primaryGoal: primaryGoal,
        secondaryGoal: secondaryGoal,
        equipment: equipment.length > 0 ? equipment : undefined,
        eventDate: eventDate || undefined,
      }

      // Defer-save: evaluate only (no create). Store recommendation + form data for Step 3 confirm.
      const axiosResponse = await readinessService.evaluateReadiness({
        trainingExperience: payload.trainingExperience,
        primaryGoal: payload.primaryGoal,
        eventDate: payload.eventDate,
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

  const equipmentOptions = [
    { label: 'Dumbbells', value: 'dumbbells' },
    { label: 'Barbell', value: 'barbell' },
    { label: 'Kettlebell', value: 'kettlebell' },
    { label: 'Resistance Bands', value: 'resistance_bands' },
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
        label="Weight (in kg)"
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
        label="Secondary Goal"
        value={secondaryGoal}
        onValueChange={v => {
          const value = v as string
          setSecondaryGoal(value)
          setValue('secondaryGoal', value, { shouldValidate: true })
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
        placeholder={
          loadingGoals ? 'Loading goals...' : 'Select secondary goal'
        }
        error={errors.secondaryGoal?.message}
      />

      <DatePicker
        label="Event Date"
        value={eventDate}
        onChange={date => setEventDate(date || '')}
        helperText="Primary event date for training timeline and roadmap generation"
        error={errors.eventDate?.message}
      />

      <Input
        label="Job/Role"
        {...register('job')}
        placeholder="e.g., Soldier"
        error={errors.job?.message}
      />

      <Dropdown
        label="Equipments"
        multiple
        value={equipment}
        onValueChange={v => setEquipment(v as string[])}
        options={equipmentOptions}
        fullWidth
      />

      <Button type="submit" loading={loading}>
        {loading ? 'Submitting...' : 'Next'}
      </Button>
    </form>
  )
}
