import api from './axios'
import type { ProgramProps, ProgramResponse } from '@/types/program'

export const programService = {
  createProgram: (payload: ProgramProps) =>
    api.post<ProgramResponse>('admin/program/create', payload),
}
