// OnboardingForm.tsx
import { useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
import { Button } from '@/components/Button'
import type { OnboardingProps } from '@/types/onboarding'

interface OnboardingFormProps {
  initialValues?: Partial<OnboardingProps>
  onSubmit: (data: OnboardingProps) => void
  loading?: boolean
}

export default function OnboardingForm({
  initialValues,
  onSubmit,
  loading = false,
}: OnboardingFormProps) {
  const [gender, setGender] = useState(initialValues?.gender || '')
  const [trainingExp, setTrainingExp] = useState(
    initialValues?.trainingExperience || ''
  )
  const [equipment, setEquipment] = useState<string[]>(
    initialValues?.equipment || []
  )

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

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingProps>({
    defaultValues: initialValues,
  })

  const submitHandler: SubmitHandler<OnboardingProps> = data => {
    onSubmit({
      ...data,
      gender,
      trainingExperience: trainingExp,
      equipment,
    })
  }

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
        placeholder="Select gender"
        value={gender}
        onValueChange={v => setGender(v as string)}
        options={genderOptions}
        required
        fullWidth
        error={errors.gender?.message}
      />

      <Dropdown
        label="Training Experience"
        placeholder="Select experience"
        value={trainingExp}
        onValueChange={v => setTrainingExp(v as string)}
        options={trainingExpOptions}
        required
        fullWidth
        error={errors.trainingExperience?.message}
      />

      <Input
        label="Primary Goal"
        {...register('primaryGoal', { required: 'Primary goal is required' })}
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
        {...register('testDate', { required: 'Test date is required' })}
        error={errors.testDate?.message}
      />

      <Dropdown
        label="Equipments"
        placeholder="Select available equipments"
        multiple
        value={equipment}
        onValueChange={v => setEquipment(v as string[])}
        options={equipmentOptions}
        fullWidth
        error={errors.equipment?.message}
      />

      <Button type="submit" loading={loading}>
        Submit
      </Button>
    </form>
  )
}
