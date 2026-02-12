import { onboardingService } from '@/api/onboarding.service'
import { Button } from '@/components/Button'
import { Dropdown } from '@/components/Dropdown'
import { Input } from '@/components/Input'
import type { OnboardingProps } from '@/types/onboarding'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
const genderOptions = [
  { label: 'FEMALE', value: 'FEMALE' },
  { label: 'MALE', value: 'MALE' },
]

const trainingExpOptions = [
  { label: 'BEGINNER', value: 'BEGINNER' },
  { label: 'INTERMEDIATE', value: 'INTERMEDIATE' },
  { label: 'ADVANCE', value: 'ADVANCE' },
]

const equipmentOptions = [
  { label: 'No Equipment (Bodyweight)', value: 'BODYWEIGHT' },
  { label: 'Dumbbells', value: 'DUMBBELLS' },
  { label: 'Barbell', value: 'BARBELL' },
  { label: 'Kettle Bells', value: 'KETTLEBELLS' },
  { label: 'Resistance Bands', value: 'RESISTANCE_BANDS' },
  { label: 'Pull-up Bar', value: 'PULL_UP_BAR' },
  { label: 'Bench', value: 'BENCH' },
  { label: 'Squat Rack', value: 'SQUAT_RACK' },
  { label: 'Cardio Machine', value: 'CARDIO_MACHINE' },
]
interface OnboardingFormProps {
  onChange: (data: {
    trainingExperience: string
    primaryGoal: string
    testDate: string
  }) => void
}

const OnboardingForm = ({ onChange }: OnboardingFormProps) => {
  const [gender, setGender] = useState('')
  const [trainingExp, setTrainingExp] = useState('')
  const [equipment, setEquipment] = useState<string[]>([])
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<OnboardingProps>()

  const handleOnboarding = async (onboardData: OnboardingProps) => {
    try {
      const payload = {
        ...onboardData,
        gender,
        trainingExperience: trainingExp,
        equipment,
      }
      const response = await onboardingService.createOnboarding(payload)
      console.log('login response::', response.data.data)

      const { onboarding } = response.data.data

      const data = {
        trainingExperience: onboarding.trainingExperience,
        primaryGoal: onboarding.primaryGoal,
        testDate: onboarding.testDate,
      }

      onChange(data)

      console.log('successfully onboarded', onboarding)
      alert('you are onboarded')
      // navigate("/dashboard")
    } catch (error) {
      console.error(error)
      // show error message / toast
      console.log('Api error::', error)
      alert('you are not onboarded')
    }
  }

  return (
    <div className="space-y-3 mt-4">
      <form onSubmit={handleSubmit(handleOnboarding)}>
        <Input
          label="Height"
          required
          placeholder="In inches"
          error={errors.height?.message}
          {...register('height', { required: 'This field is required' })}
        />
        <Input
          label="Weight"
          required
          placeholder="In kg"
          error={errors.weight?.message}
          {...register('weight', { required: 'This field is required' })}
        />
        <Input
          label="Age"
          type="number"
          required
          error={errors.age?.message}
          {...register('age', { required: 'This field is required' })}
        />

        <Dropdown
          label="Gender"
          placeholder="Select gender"
          value={gender}
          error={errors.gender?.message}
          onValueChange={v => setGender(v as string)}
          options={genderOptions}
          required
          fullWidth
        />

        <Dropdown
          label="Training Experience"
          placeholder="Select experience"
          value={trainingExp}
          error={errors.trainingExperience?.message}
          onValueChange={v => setTrainingExp(v as string)}
          options={trainingExpOptions}
          required
          fullWidth
        />
        <Input
          label="Primary Goal"
          required
          placeholder="Enter you Primary Goal"
          error={errors.primaryGoal?.message}
          {...register('primaryGoal', { required: 'This field is required' })}
        />
        <Input
          label="Secondary Goal"
          required
          placeholder="Enter you Secondary Goal"
          error={errors.secondaryGoal?.message}
          {...register('secondaryGoal', { required: 'This field is required' })}
        />
        <Input
          label="Test Date"
          type="date"
          error={errors.testDate?.message}
          {...register('testDate', { required: 'Test date is required' })}
        />
        <Dropdown
          label="Equipments"
          placeholder="Select available equipments"
          multiple
          value={equipment}
          error={errors.equipment?.message}
          onValueChange={v => setEquipment(v as string[])}
          options={equipmentOptions}
          fullWidth
        />
        <Button variant="primary" type="submit" className="w-full mt-4">
          On board
        </Button>
      </form>
    </div>
  )
}

export default OnboardingForm
