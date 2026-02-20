import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { DataTable, type Column } from '@/components/DataTable'
import { Input } from '@/components/Input'
import { Spinner } from '@/components/Spinner'
import { exerciseService } from '@/api/exercise.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { Exercise } from '@/types/exercise'
import { AxiosError } from 'axios'

const LIMIT = 10

export default function AdminExerciseLibraryPage() {
  const navigate = useNavigate()
  const { showError, showSuccess } = useSnackbar()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: LIMIT,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [muscleGroup, setMuscleGroup] = useState('')
  const [equipment, setEquipment] = useState('')
  const [movementPattern, setMovementPattern] = useState('')
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchExercises = useCallback(
    async (pageOverride?: number) => {
      const p = pageOverride ?? page
      try {
        setLoading(true)
        const res = await exerciseService.getAll({
          page: p,
          limit: LIMIT,
          q: q.trim() || undefined,
          muscleGroup: muscleGroup.trim() || undefined,
          equipment: equipment.trim() || undefined,
          movementPattern: movementPattern.trim() || undefined,
          isActive: true,
        })
        if (res.data.statusCode === 200 && res.data.data) {
          const apiData = res.data.data as {
            data?: Exercise[]
            meta?: {
              total: number
              page: number
              limit: number
              totalPages: number
            }
          }
          setExercises(apiData.data ?? [])
          setMeta(
            apiData.meta ?? {
              total: 0,
              page: 1,
              limit: LIMIT,
              totalPages: 1,
            }
          )
        }
      } catch (err) {
        const ax = err as AxiosError<{ message?: string }>
        showError(
          ax.response?.data?.message ??
            ax.message ??
            'Failed to load exercises.'
        )
        setExercises([])
      } finally {
        setLoading(false)
      }
    },
    [page, q, muscleGroup, equipment, movementPattern, showError]
  )

  useEffect(() => {
    fetchExercises()
  }, [fetchExercises])

  const handleSearch = () => {
    setPage(1)
    fetchExercises(1)
  }

  const handleDelete = async (id: number) => {
    if (!globalThis.confirm('Are you sure you want to delete this exercise?'))
      return
    try {
      setDeletingId(id)
      await exerciseService.delete(id)
      showSuccess('Exercise deleted.')
      fetchExercises()
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message ?? ax.message ?? 'Failed to delete.')
    } finally {
      setDeletingId(null)
    }
  }

  const tagsDisplay = (ex: Exercise) => {
    const tags = ex.tags
    if (!tags) return '—'
    const parts: string[] = []
    if (tags.muscleGroup?.length) parts.push(...tags.muscleGroup)
    if (tags.equipment?.length) parts.push(...tags.equipment)
    if (tags.movementPattern?.length) parts.push(...tags.movementPattern)
    if (parts.length === 0) return '—'
    return parts.slice(0, 5).join(', ') + (parts.length > 5 ? '…' : '')
  }

  const columns: Column<Exercise>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: false,
      render: (value, row) => (
        <Text variant="default" className="font-medium text-gray-900">
          {(value as string) || row.name}
        </Text>
      ),
    },
    {
      key: 'tags',
      label: 'Tags',
      sortable: false,
      render: (_, row) => (
        <Text variant="secondary" className="text-sm max-w-[200px] truncate">
          {tagsDisplay(row)}
        </Text>
      ),
    },
    {
      key: 'videoUrl',
      label: 'Video',
      sortable: false,
      width: '100px',
      render: (_value, row) =>
        row.videoUrl ? (
          <a
            href={row.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#3AB8ED] hover:underline text-sm"
          >
            View
          </a>
        ) : (
          <Text variant="secondary" className="text-sm">
            —
          </Text>
        ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      width: '180px',
      align: 'center',
      render: (_, row) => (
        <div className="flex items-center gap-2 justify-center">
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => navigate(`/admin/exercises/${row.id}/edit`)}
          >
            Edit
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => handleDelete(row.id)}
            disabled={deletingId === row.id}
          >
            {deletingId === row.id ? '…' : 'Delete'}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Text variant="primary" className="text-2xl font-semibold">
            Exercise Library
          </Text>
          <Text variant="secondary" className="text-sm mt-0.5">
            Create and manage exercises for programs
          </Text>
        </div>
        <Button type="button" onClick={() => navigate('/admin/exercises/new')}>
          Create Exercise
        </Button>
      </div>

      <Card className="p-0">
        <div className="p-5 border-b border-gray-200 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <Input
                label="Search"
                placeholder="Search by name…"
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="w-40">
              <Input
                label="Muscle group"
                placeholder="Filter"
                value={muscleGroup}
                onChange={e => setMuscleGroup(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Input
                label="Equipment"
                placeholder="Filter"
                value={equipment}
                onChange={e => setEquipment(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Input
                label="Movement pattern"
                placeholder="Filter"
                value={movementPattern}
                onChange={e => setMovementPattern(e.target.value)}
              />
            </div>
            <Button type="button" variant="secondary" onClick={handleSearch}>
              Apply
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center gap-2 p-8 justify-center">
              <Spinner size="small" variant="primary" />
              <Text variant="secondary">Loading…</Text>
            </div>
          ) : (
            <DataTable<Exercise & Record<string, unknown>>
              data={exercises as (Exercise & Record<string, unknown>)[]}
              columns={columns}
              loading={false}
            />
          )}
        </div>
        {meta.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200">
            <Text variant="secondary" className="text-sm">
              {meta.total} total
            </Text>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="small"
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="flex items-center px-2 text-sm text-gray-600">
                Page {meta.page} of {meta.totalPages}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="small"
                disabled={page >= meta.totalPages}
                onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
