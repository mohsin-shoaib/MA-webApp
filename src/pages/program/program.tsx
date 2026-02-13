import { programService } from '@/api/program.service'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Text } from '@/components/Text'
import type {
  CreateProgramDTO,
  DailyExerciseDTO,
  ExerciseDTO,
} from '@/types/program'
import { useFieldArray, useForm } from 'react-hook-form'

const Program = () => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CreateProgramDTO>()

  const handleProgram = async (payload: CreateProgramDTO) => {
    try {
      const response = await programService.createProgram(payload)
      console.log('login response::', response.data)

      const { data } = response.data

      console.log('Logged in user:', data)
    } catch (error) {
      console.error(error)
      // show error message / toast
      console.log('Api error::', error)
    }
  }

  const {
    fields: exerciseFields,
    append: appendExercise,
    remove: removeExercise,
  } = useFieldArray({
    control,
    name: 'dailyExercises',
  })

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div>
        <Text as="h1">Program Creation</Text>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit(handleProgram)}>
        <Input
          label="Program Name"
          placeholder="Enter program name"
          className="text-black"
          error={errors.program_name?.message}
          {...register('program_name', {
            required: 'Program name is required',
          })}
        />

        <Input
          label="Description"
          placeholder="Enter program description"
          className="text-black"
          error={errors.program_description?.message}
          {...register('program_description', {
            required: 'Description is required',
          })}
        />

        <Input
          label="Category"
          placeholder="Enter category"
          className="text-black"
          error={errors.category?.message}
          {...register('category', { required: 'Category is required' })}
        />

        <Input
          label="Sub Category"
          placeholder="Enter sub category"
          className="text-black"
          error={errors.subCategory?.message}
          {...register('subCategory')}
        />

        <Input
          label="Cycle ID"
          placeholder="Enter cycle ID"
          type="number"
          className="text-black"
          error={errors.cycleId?.message}
          {...register('cycleId', {
            required: 'Cycle ID is required',
            valueAsNumber: true,
          })}
        />

        <Text as="p" variant="primary" className="font-bold">
          Daily Exercises
        </Text>

        {exerciseFields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-end">
            <Input
              label="Day"
              placeholder="e.g., day1, day2, or date"
              className="text-black"
              error={errors.dailyExercises?.[index]?.day?.message}
              {...register(`dailyExercises.${index}.day` as const, {
                required: 'Day is required',
              })}
            />
            <Input
              label="Exercises (comma separated)"
              placeholder="e.g., Squat, Bench Press"
              className="text-black"
              error={errors.dailyExercises?.[index]?.exercises?.message}
              {...register(`dailyExercises.${index}.exercises` as const, {
                required: 'Exercises are required',
                setValueAs: (value: string) =>
                  value.split(',').map(
                    (e, idx) =>
                      ({
                        exercise_id: `exercise-${index}-${idx}`,
                        name: e.trim(),
                      }) as ExerciseDTO
                  ),
              })}
            />

            {exerciseFields.length > 1 && (
              <Button
                type="button"
                variant="primary"
                onClick={() => removeExercise(index)}
              >
                Remove
              </Button>
            )}
          </div>
        ))}

        <Button
          type="button"
          variant="primary"
          onClick={() =>
            appendExercise({
              day: `day${exerciseFields.length + 1}`,
              exercise_name: '',
              exercises: [],
            } as DailyExerciseDTO)
          }
        >
          Add Exercise
        </Button>
        <div>
          <Button type="submit" variant="primary">
            Create Program
          </Button>
        </div>
      </form>
    </div>
  )
}

export default Program
