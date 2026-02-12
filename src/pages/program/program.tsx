import { programService } from '@/api/program.service'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Text } from '@/components/Text'
import type { ProgramProps } from '@/types/program'
import { useFieldArray, useForm } from 'react-hook-form'

const Program = () => {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ProgramProps>()

  const handleProgram = async (payload: ProgramProps) => {
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

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'alternateExercise',
  })

  const {
    fields: exerciseFields,
    append: appendExercise,
    remove: removeExercise,
  } = useFieldArray({
    control,
    name: 'dailyExercise',
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
          error={errors.name?.message}
          {...register('name', { required: 'Program name is required' })}
        />

        <Input
          label="Description"
          placeholder="Enter program description"
          className="text-black"
          error={errors.description?.message}
          {...register('description', { required: 'Description is required' })}
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
              label="Exercises (comma separated)"
              placeholder="e.g., Squat, Bench Press"
              className="text-black"
              error={errors.dailyExercise?.[index]?.exercises?.message}
              {...register(`dailyExercise.${index}.exercises` as const, {
                required: 'Exercises are required',
                setValueAs: (value: string) =>
                  value.split(',').map(e => e.trim()),
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
              day: exerciseFields.length + 1,
              exercises: [],
            })
          }
        >
          Add Exercise
        </Button>

        {fields.map((field, index) => (
          <div key={field.id} className="flex gap-2 items-end">
            <Input
              label={`Main Exercise`}
              placeholder="e.g., Bench Press"
              className="text-black"
              {...register(`alternateExercise.${index}.main` as const, {
                required: 'Main exercise is required',
              })}
            />
            <Input
              label={`Alternate Exercise`}
              placeholder="e.g., Push-ups"
              className="text-black"
              {...register(`alternateExercise.${index}.alternate` as const, {
                required: 'Alternate exercise is required',
              })}
            />
            {fields.length > 1 && (
              <Button
                type="button"
                variant="primary"
                onClick={() => remove(index)}
              >
                Remove
              </Button>
            )}
          </div>
        ))}

        <Button
          type="button"
          variant="secondary"
          onClick={() => append({ main: '', alternate: '' })}
        >
          Add Alternate Exercise
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
