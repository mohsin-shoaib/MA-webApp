import { useState } from 'react'
import { Stepper, type StepperStep } from '@/components/Stepper/index'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import { onboardingService } from '@/api/onboarding.service'
import { readinessService } from '@/api/readiness.service'
import { useForm } from 'react-hook-form'
import type { OnboardingProps } from '@/types/onboarding'
import type { AxiosError } from 'axios'

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

const Onboarding = () => {
  const [activeStep, setActiveStep] = useState(0)
  const [gender, setGender] = useState('')
  const [trainingExp, setTrainingExp] = useState('')
  const [equipment, setEquipment] = useState<string[]>([])

  const {
    register,
    formState: { errors },
    getValues,
  } = useForm<OnboardingProps>()
  const [onboardData, setOnboardData] = useState<OnboardingProps>()
  const [recommendation, setRecommendation] = useState<string>()

  console.log('active step before::::::::', activeStep)

  // Stepper "Next" button handler
  // const handleNext = async () => {
  //   if (activeStep === 0) {
  //     console.log("active step 0", activeStep);

  //     // Get form values
  //     const formData = getValues();
  //     try {
  //       const payload = {
  //         ...formData,
  //         gender,
  //         trainingExperience: trainingExp,
  //         equipment,
  //       };

  //       const response = await onboardingService.createOnboarding(payload);
  //       const onboard = response.data.data.onboarding;
  //       setOnboardData(onboard);

  //       alert("Onboarding successful");
  //       setActiveStep((prevActiveStep) => prevActiveStep + 1); // go to recommendation step
  //       console.log("active step after 0", activeStep);

  //     } catch (error: any) {
  //       if (error.response?.data?.data?.name === "AlreadyOnboarded") {
  //         console.warn("User already onboarded, moving to next step");
  //         // Optionally, you can set onboardData from error or fetch from API
  //         // For now, we'll just continue to step 1
  //         // console.log("active step", activeStep + 1);

  //         setActiveStep((prevActiveStep) => {
  //           console.log("prevActiveStep", prevActiveStep);
  //           console.log("prevActiveStep change", prevActiveStep + 1);

  //           return prevActiveStep + 1;   // ✅ return is required
  //         });
  //         // go to recommendation step
  //         console.log("active step in error 0", activeStep);

  //       } else {
  //         console.error("Onboarding failed", error);
  //         alert("Onboarding failed");
  //         return; // stop execution for other errors
  //       }
  //     }
  //     setActiveStep(activeStep + 1);
  //     return;
  //   }

  //   console.log("active step", activeStep + 1);
  //   setActiveStep((prevActiveStep) => prevActiveStep + 1); // go to recommendation step

  //   if (activeStep === 1) {
  //     if (!onboardData) return;

  //     try {
  //       const readinessResponse = await readinessService.readinessRecommendation({
  //         trainingExperience: onboardData.trainingExperience,
  //         primaryGoal: onboardData.primaryGoal,
  //         testDate: onboardData.testDate,
  //       });
  //       setRecommendation(readinessResponse.data);

  //       setActiveStep(s => s + 1); // move to payment
  //     } catch (error) {
  //       console.error("Readiness API error", error);
  //     }
  //     return;
  //   }

  //   // Step 2 → just move to next if any
  //   setActiveStep(s => s + 1);
  // };

  const handleNext = async () => {
    // STEP 0 → Onboarding
    if (activeStep === 0) {
      const formData = getValues()

      try {
        const payload = {
          ...formData,
          gender,
          trainingExperience: trainingExp,
          equipment,
        }

        const response = await onboardingService.createOnboarding(payload)
        setOnboardData(response.data.data.onboarding)

        alert('Onboarding successful')

        setActiveStep(activeStep + 1) // ✅ increment ONCE
        //  console.log("within onboarding", step);
      } catch (error) {
        const axiosError = error as AxiosError<{ data: { name: string } }>
        if (axiosError.response?.data?.data?.name === 'AlreadyOnboarded') {
          setActiveStep(prev => prev + 1)
        } else {
          alert('Onboarding failed')
          console.error(error)
        }
      }
    }

    console.log('before recommendation', activeStep)

    // STEP 1 → Recommendation
    if (activeStep === 1) {
      if (!onboardData) return

      try {
        const readinessResponse =
          await readinessService.readinessRecommendation({
            trainingExperience: onboardData.trainingExperience,
            primaryGoal: onboardData.primaryGoal,
            testDate: onboardData.testDate,
          })

        setRecommendation(readinessResponse?.data.data.cycle.recommendedCycle)
        setActiveStep(prev => prev + 1)
      } catch (error) {
        console.error('Readiness API error', error)
      }

      return
    }

    // STEP 2+
    setActiveStep(prev => prev + 1)
  }

  const steps: StepperStep[] = [
    {
      id: '0',
      label: 'Basic Info',
      description: 'Personal & training details',
      icon: 'user',
      content: (
        <form className="space-y-3 mt-4">
          <Input
            label="Height"
            required
            placeholder="In inches"
            error={errors.height?.message}
            {...register('height', { required: 'Height is required' })}
          />
          <Input
            label="Weight"
            required
            placeholder="In kg"
            error={errors.weight?.message}
            {...register('weight', { required: 'Weight is required' })}
          />
          <Input
            label="Age"
            type="number"
            required
            error={errors.age?.message}
            {...register('age', { required: 'Age is required' })}
          />
          <Dropdown
            label="Gender"
            placeholder="Select gender"
            value={gender}
            onValueChange={v => setGender(v as string)}
            options={genderOptions}
            required
            fullWidth
          />
          <Dropdown
            label="Training Experience"
            placeholder="Select experience"
            value={trainingExp}
            onValueChange={v => setTrainingExp(v as string)}
            options={trainingExpOptions}
            required
            fullWidth
          />
          <Input
            label="Primary Goal"
            required
            placeholder="Enter your Primary Goal"
            error={errors.primaryGoal?.message}
            {...register('primaryGoal', {
              required: 'Primary Goal is required',
            })}
          />
          <Input
            label="Secondary Goal"
            required
            placeholder="Enter your Secondary Goal"
            error={errors.secondaryGoal?.message}
            {...register('secondaryGoal', {
              required: 'Secondary Goal is required',
            })}
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
            onValueChange={v => setEquipment(v as string[])}
            options={equipmentOptions}
            fullWidth
          />
        </form>
      ),
    },
    {
      id: '1',
      label: 'Readiness Recommendation',
      description: 'Recommended cycle based on your data',
      icon: 'briefcase',
      content: recommendation ? (
        <div className="space-y-3 mt-4">
          <Text className="font-bold">Recommended Cycle:</Text>
          <pre>{JSON.stringify(recommendation, null, 2)}</pre>
        </div>
      ) : (
        <div>Please complete onboarding to see recommendation</div>
      ),
    },
    {
      id: '2',
      label: 'Payment',
      description: 'Billing details',
      icon: 'credit-card',
      content: (
        <div className="space-y-3 mt-4">
          <Input label="Card Number" />
          <Input label="Expiration Date" />
        </div>
      ),
    },
  ]

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <Stepper
        steps={steps}
        activeStep={activeStep}
        clickable
        onStepClick={index => setActiveStep(index)}
        showNumbers={true}
      />

      <div>{steps[activeStep].content}</div>

      <div className="flex justify-between pt-4">
        <Button
          disabled={activeStep === 0}
          onClick={() => setActiveStep(s => s - 1)}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Previous
        </Button>

        <Button
          disabled={activeStep === steps.length - 1}
          onClick={handleNext}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Next
        </Button>
      </div>
    </div>
  )
}
export default Onboarding
