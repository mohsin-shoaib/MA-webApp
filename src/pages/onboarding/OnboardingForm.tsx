// OnboardingForm.tsx
import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
import { Button } from '@/components/Button'
import type { OnboardingProps, OnboardingResponse } from '@/types/onboarding'
import { onboardingService } from '@/api/onboarding.service'
import type { AxiosError } from 'axios'

interface OnboardingFormProps {
  onNext: (formData: OnboardingProps, response: OnboardingResponse) => void
  loading: boolean
  setLoading: (value: boolean) => void
  setError: (value: string | null) => void
  initialValues?: Partial<OnboardingProps>
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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingProps>({
    defaultValues: initialValues,
  })

  const submitHandler: SubmitHandler<OnboardingProps> = async data => {
    setError(null)
    setLoading(true)

    try {
      const payload: OnboardingProps = {
        ...data,
        gender,
        trainingExperience: trainingExp,
        equipment,
      }

      const axiosResponse = await onboardingService.createOnboarding(payload)
      const response: OnboardingResponse = axiosResponse.data // now TS is happy

      // Same pattern as Step1
      onNext(payload, response)
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message || 'Onboarding failed.'
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

      <Input
        label="Primary Goal"
        {...register('primaryGoal', {
          required: 'Primary goal is required',
        })}
        error={errors.primaryGoal?.message}
      />

      <Input
        label="Secondary Goal"
        {...register('secondaryGoal')}
        error={errors.secondaryGoal?.message}
      />

      <Input
        label="Test Date"
        type="date"
        {...register('testDate', {
          required: 'Test date is required',
        })}
        error={errors.testDate?.message}
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
