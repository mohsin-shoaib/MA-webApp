'use client'

import { useEffect } from 'react'
import { useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { CreateAnnouncementPayload } from '@/api/announcement.service'

const announcementSchema = z
  .object({
    title: z.string().min(3, 'Title is required'),
    message: z.string().min(10, 'Message must be at least 10 characters'),
    targetType: z.enum(['GLOBAL', 'PROGRAM', 'CYCLE', 'COACH_GROUP']),
    programId: z.number().nullable().optional(),
    cycleId: z.number().nullable().optional(),
    coachId: z.number().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.targetType === 'PROGRAM' && !data.programId) {
      ctx.addIssue({
        path: ['programId'],
        code: 'custom',
        message: 'Program is required',
      })
    }

    if (data.targetType === 'CYCLE' && !data.cycleId) {
      ctx.addIssue({
        path: ['cycleId'],
        code: 'custom',
        message: 'Cycle is required',
      })
    }
  })

type AnnouncementFormValues = z.infer<typeof announcementSchema>

interface AnnouncementFormProps {
  initialData?: AnnouncementFormValues
  programs?: { id: number; name: string }[]
  cycles?: { id: number; name: string }[]
  isLoading?: boolean
  onSubmit: (data: AnnouncementFormValues) => void
}

export default function AnnouncementForm({
  initialData,
  programs = [],
  cycles = [],
  isLoading,
  onSubmit,
}: Readonly<AnnouncementFormProps>) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateAnnouncementPayload>({
    resolver: zodResolver(
      announcementSchema
    ) as Resolver<CreateAnnouncementPayload>,
    defaultValues: initialData || {
      title: '',
      message: '',
      targetType: 'GLOBAL',
      programId: undefined,
      cycleId: undefined,
    },
  })

  const targetType = useWatch({
    control,
    name: 'targetType',
  })

  /**
   * Reset conditional fields when targetType changes
   */
  useEffect(() => {
    if (targetType !== 'PROGRAM') {
      setValue('programId', null)
    }
    if (targetType !== 'CYCLE') {
      setValue('cycleId', null)
    }
  }, [targetType, setValue])

  /**
   * Normalize before submit (like your Program form)
   */
  const submitHandler = (data: AnnouncementFormValues) => {
    const normalizedData: AnnouncementFormValues = {
      ...data,
      programId: data.targetType === 'PROGRAM' ? data.programId : null,
      cycleId: data.targetType === 'CYCLE' ? data.cycleId : null,
    }

    onSubmit(normalizedData)
  }

  return (
    <form
      onSubmit={handleSubmit(submitHandler)}
      className="space-y-6 bg-white p-6 rounded-2xl shadow"
    >
      {/* Title */}
      <div className="space-y-2">
        <label className="font-medium">Title</label>
        <input
          {...register('title')}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Enter announcement title"
        />
        {errors.title && (
          <p className="text-red-500 text-sm">{errors.title.message}</p>
        )}
      </div>

      {/* Message */}
      <div className="space-y-2">
        <label className="font-medium">Message</label>
        <textarea
          {...register('message')}
          rows={5}
          className="w-full border rounded-lg px-3 py-2"
          placeholder="Write announcement message"
        />
        {errors.message && (
          <p className="text-red-500 text-sm">{errors.message.message}</p>
        )}
      </div>

      {/* Target Type */}
      <div className="space-y-2">
        <label className="font-medium">Target Type</label>
        <select
          {...register('targetType')}
          className="w-full border rounded-lg px-3 py-2"
        >
          <option value="ALL">All Users</option>
          <option value="PROGRAM">Program</option>
          <option value="CYCLE">Cycle</option>
          <option value="COACH">Coach</option>
          <option value="ATHLETE">Athlete</option>
        </select>
      </div>

      {/* Conditional Program */}
      {targetType === 'PROGRAM' && (
        <div className="space-y-2">
          <label className="font-medium">Select Program</label>
          <select
            {...register('programId', { valueAsNumber: true })}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">Select program</option>
            {programs.map(program => (
              <option key={program.id} value={program.id}>
                {program.name}
              </option>
            ))}
          </select>
          {errors.programId && (
            <p className="text-red-500 text-sm">{errors.programId.message}</p>
          )}
        </div>
      )}

      {/* Conditional Cycle */}
      {targetType === 'CYCLE' && (
        <div className="space-y-2">
          <label className="font-medium">Select Cycle</label>
          <select
            {...register('cycleId', { valueAsNumber: true })}
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="">Select cycle</option>
            {cycles.map(cycle => (
              <option key={cycle.id} value={cycle.id}>
                {cycle.name}
              </option>
            ))}
          </select>
          {errors.cycleId && (
            <p className="text-red-500 text-sm">{errors.cycleId.message}</p>
          )}
        </div>
      )}

      {/* Submit */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={isSubmitting || isLoading}
          className="w-full bg-black text-white py-2 rounded-lg hover:opacity-90 transition"
        >
          {initialData ? 'Update Announcement' : 'Create Announcement'}
        </button>
      </div>
    </form>
  )
}
