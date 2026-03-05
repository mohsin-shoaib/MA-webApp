import { useState, useEffect, useCallback } from 'react'
import { Drawer } from '@/components/Drawer'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Text } from '@/components/Text'
import {
  libraryService,
  type LibraryItemType,
  type LibrarySearchResult,
} from '@/api/library.service'

const TABS: { value: LibraryItemType; label: string }[] = [
  { value: 'exercises', label: 'Exercises' },
  { value: 'circuits', label: 'Circuits' },
  { value: 'sessions', label: 'Sessions' },
  { value: 'programs', label: 'Programs' },
]

export interface LibraryDrawerProps {
  visible: boolean
  onClose: () => void
  /** Add exercise as block (exercise: { id: number; name: string }) */
  onAddExercise?: (exercise: { id: number; name: string }) => void
  /** Add circuit as block (payload from library circuit) */
  onAddCircuit?: (circuit: {
    id: number
    name: string
    instructions?: string | null
    resultTrackingType?: string | null
    blockCategory?: string | null
    conditioningFormat?: string | null
    conditioningConfig?: unknown
    videoUrls?: unknown
  }) => void
  /** Add session as day (content = day structure) */
  onAddSession?: (content: Record<string, unknown>) => void
  /** Use library program (open/copy – programId) */
  onAddProgram?: (programId: number) => void
  /** Create new exercise (e.g. navigate to exercises page or open create modal). MASS 2.9 */
  onCreateExercise?: () => void
}

export function LibraryDrawer({
  visible,
  onClose,
  onAddExercise,
  onAddCircuit,
  onAddSession,
  onAddProgram,
  onCreateExercise,
}: LibraryDrawerProps) {
  const [activeTab, setActiveTab] = useState<LibraryItemType>('exercises')
  const [q, setQ] = useState('')
  const [searchQ, setSearchQ] = useState('')
  const [tagsStr, setTagsStr] = useState('')
  const [tagsApplied, setTagsApplied] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LibrarySearchResult | null>(null)
  const [addingId, setAddingId] = useState<number | null>(null)

  const runSearch = useCallback(() => {
    if (!visible) return
    setLoading(true)
    setResult(null)
    const tags = tagsApplied.length ? tagsApplied : undefined
    libraryService
      .search({
        type: activeTab,
        q: searchQ || undefined,
        tags,
        page: 1,
        limit: 30,
      })
      .then(res => {
        if (res.data?.statusCode === 200 && res.data?.data) {
          setResult(res.data.data)
        }
      })
      .catch(() => setResult(null))
      .finally(() => setLoading(false))
  }, [visible, activeTab, searchQ, tagsApplied])

  useEffect(() => {
    runSearch()
  }, [runSearch])

  const handleAddExercise = (item: { id: number; name: string }) => {
    if (!onAddExercise) return
    onAddExercise(item)
    onClose()
  }

  const handleAddCircuit = (item: {
    id: number
    name: string
    instructions?: string | null
    resultTrackingType?: string | null
    blockCategory?: string | null
    conditioningFormat?: string | null
    conditioningConfig?: unknown
    videoUrls?: unknown
  }) => {
    if (!onAddCircuit) return
    onAddCircuit(item)
    onClose()
  }

  const handleAddSession = async (id: number) => {
    if (!onAddSession) return
    setAddingId(id)
    try {
      const res = await libraryService.getSession(id)
      if (res.data?.statusCode === 200 && res.data?.data?.content) {
        onAddSession(res.data.data.content)
        onClose()
      }
    } finally {
      setAddingId(null)
    }
  }

  const handleAddProgram = (programId: number) => {
    if (!onAddProgram) return
    onAddProgram(programId)
    onClose()
  }

  if (!visible) return null

  return (
    <Drawer
      visible={visible}
      onClose={onClose}
      title="Add from Library"
      width="lg"
      showCloseButton
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {TABS.map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                activeTab === tab.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Search..."
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setSearchQ(q.trim())}
          />
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => setSearchQ(q.trim())}
          >
            Search
          </Button>
          {activeTab === 'exercises' && (
            <>
              <Input
                placeholder="Filter by tags (comma-separated)"
                value={tagsStr}
                onChange={e => setTagsStr(e.target.value)}
                onKeyDown={e =>
                  e.key === 'Enter' &&
                  setTagsApplied(
                    tagsStr
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean)
                  )
                }
                className="max-w-[200px]"
              />
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() =>
                  setTagsApplied(
                    tagsStr
                      .split(',')
                      .map(s => s.trim())
                      .filter(Boolean)
                  )
                }
              >
                Apply tags
              </Button>
            </>
          )}
        </div>

        {loading && (
          <div className="py-8 text-center text-sm text-gray-500">
            Loading...
          </div>
        )}

        {!loading && result && (
          <div className="min-h-[200px] space-y-2">
            {activeTab === 'exercises' && (
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-sm text-gray-600">Exercises</span>
                {onCreateExercise && (
                  <Button
                    type="button"
                    variant="primary"
                    size="small"
                    onClick={onCreateExercise}
                  >
                    Create new exercise
                  </Button>
                )}
              </div>
            )}
            {activeTab === 'exercises' &&
              result.exercises?.rows?.length === 0 && (
                <Text variant="default" className="text-gray-500">
                  No exercises found.
                </Text>
              )}
            {activeTab === 'exercises' &&
              result.exercises?.rows?.map(row => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                >
                  <span className="text-sm font-medium">{row.name}</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() =>
                      handleAddExercise({ id: row.id, name: row.name })
                    }
                  >
                    Add
                  </Button>
                </div>
              ))}

            {activeTab === 'circuits' &&
              result.circuits?.rows?.length === 0 && (
                <Text variant="default" className="text-gray-500">
                  No circuits found.
                </Text>
              )}
            {activeTab === 'circuits' &&
              result.circuits?.rows?.map(row => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                >
                  <span className="text-sm font-medium">{row.name}</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => handleAddCircuit(row)}
                  >
                    Add
                  </Button>
                </div>
              ))}

            {activeTab === 'sessions' &&
              result.sessions?.rows?.length === 0 && (
                <Text variant="default" className="text-gray-500">
                  No sessions found.
                </Text>
              )}
            {activeTab === 'sessions' &&
              result.sessions?.rows?.map(row => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                >
                  <span className="text-sm font-medium">{row.name}</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    disabled={addingId === row.id}
                    onClick={() => handleAddSession(row.id)}
                  >
                    {addingId === row.id ? 'Adding...' : 'Add'}
                  </Button>
                </div>
              ))}

            {activeTab === 'programs' &&
              result.programs?.rows?.length === 0 && (
                <Text variant="default" className="text-gray-500">
                  No programs found.
                </Text>
              )}
            {activeTab === 'programs' &&
              result.programs?.rows?.map(row => (
                <div
                  key={row.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                >
                  <div>
                    <span className="text-sm font-medium">{row.name}</span>
                    {row.numberOfWeeks != null && (
                      <span className="ml-2 text-xs text-gray-500">
                        {row.numberOfWeeks} weeks
                      </span>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => handleAddProgram(row.id)}
                  >
                    Use
                  </Button>
                </div>
              ))}
          </div>
        )}
      </div>
    </Drawer>
  )
}
