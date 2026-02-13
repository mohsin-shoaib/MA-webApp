/**
 * Program Service
 *
 * API service for program management operations using fetch API.
 * Matches the implementation guide structure.
 */

import { getToken } from '../utils/programHelpers'
import type { CreateProgramDTO } from '../types/program'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export const programService = {
  /**
   * Create a new program
   * POST /api/v1/admin/program/create
   */
  create: async (programData: CreateProgramDTO) => {
    const response = await fetch(`${API_BASE_URL}/admin/program/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify(programData),
    })
    return response.json()
  },

  /**
   * Get all cycles
   * GET /api/v1/cycle/admin/list
   */
  getCycles: async () => {
    const response = await fetch(`${API_BASE_URL}/cycle/admin/list`, {
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    })
    return response.json()
  },

  /**
   * Get all goal types
   * POST /api/v1/goal-type/get-all
   */
  getGoalTypes: async () => {
    const response = await fetch(`${API_BASE_URL}/goal-type/get-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({}),
    })
    return response.json()
  },

  /**
   * Upload video to S3
   * POST /api/v1/s3/upload
   */
  uploadVideo: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch(`${API_BASE_URL}/s3/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    })
    return response.json()
  },
}
