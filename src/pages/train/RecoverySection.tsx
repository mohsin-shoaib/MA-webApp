import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { recoveryService } from '@/api/recovery.service'
import type { RecoveryProtocol, RecoverySession } from '@/types/recovery'
import { RECOVERY_PROTOCOL_TYPES } from '@/types/recovery'

const TYPE_LABELS: Record<string, string> = {
  MOBILITY: 'Mobility',
  STRETCHING: 'Stretching',
  SOFT_TISSUE: 'Soft tissue',
  ROUTINE: 'Routine',
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function RecoverySection() {
  const navigate = useNavigate()
  const [protocols, setProtocols] = useState<RecoveryProtocol[]>([])
  const [sessions, setSessions] = useState<RecoverySession[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addProtocolId, setAddProtocolId] = useState<number | ''>('')
  const [addDate, setAddDate] = useState(todayStr())
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const date = todayStr()
    Promise.all([
      recoveryService.listProtocols(),
      recoveryService.getSessions({ date }),
    ])
      .then(([pRes, sRes]) => {
        if (pRes.data.statusCode === 200 && pRes.data.data) {
          setProtocols(pRes.data.data)
        }
        if (sRes.data.statusCode === 200 && Array.isArray(sRes.data.data)) {
          setSessions(sRes.data.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    queueMicrotask(() => load())
  }, [load])

  const handleAdd = () => {
    if (addProtocolId === '' || !addDate) return
    setSubmitting(true)
    recoveryService
      .createSession({
        recoveryProtocolId: Number(addProtocolId),
        scheduledDate: addDate,
      })
      .then(() => {
        setShowAdd(false)
        setAddProtocolId('')
        setAddDate(todayStr())
        load()
      })
      .finally(() => setSubmitting(false))
  }

  const handleUpdateStatus = (id: number, status: string) => {
    recoveryService.updateSession(id, { status }).then(() => load())
  }

  const handleRemove = (id: number) => {
    if (globalThis.confirm('Remove this recovery from your calendar?')) {
      recoveryService.deleteSession(id).then(() => load())
    }
  }

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between gap-3 p-4 pb-2">
        <div className="flex items-center gap-2">
          <Text variant="default" className="font-semibold">
            Recovery protocols
          </Text>
          <span className="text-xs text-gray-500">
            Mobility, stretching, soft tissue — do not affect compliance
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={() => setShowAdd(true)}
        >
          Add recovery
        </Button>
      </div>

      {loading ? (
        <div className="p-4 flex justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="px-4 pb-4">
          {sessions.length === 0 ? (
            <Text variant="secondary" className="text-sm block py-2">
              No recovery scheduled for today. Add one above or open Recovery
              Hub for more.
            </Text>
          ) : (
            <ul className="divide-y divide-gray-100">
              {sessions.map(s => (
                <li
                  key={s.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <Text variant="default" className="font-medium text-sm">
                      {s.recoveryProtocol?.name ?? 'Recovery'}
                    </Text>
                    <Text variant="secondary" className="text-xs">
                      {TYPE_LABELS[s.recoveryProtocol?.type ?? ''] ??
                        s.recoveryProtocol?.type}
                    </Text>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.status !== 'COMPLETED' && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="small"
                        onClick={() => handleUpdateStatus(s.id, 'COMPLETED')}
                      >
                        Done
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="small"
                      onClick={() => handleRemove(s.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <Button
            type="button"
            variant="ghost"
            size="small"
            className="mt-2"
            onClick={() => navigate('/train/recovery')}
          >
            Open Recovery Hub →
          </Button>
        </div>
      )}

      {showAdd && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-3">
          <Text variant="default" className="font-medium text-sm block">
            Add to calendar
          </Text>
          <div>
            <label
              htmlFor="recovery-protocol"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Protocol
            </label>
            <select
              id="recovery-protocol"
              value={addProtocolId}
              onChange={e =>
                setAddProtocolId(
                  e.target.value === '' ? '' : Number(e.target.value)
                )
              }
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
            >
              <option value="">Select...</option>
              {RECOVERY_PROTOCOL_TYPES.map(type => (
                <optgroup key={type} label={TYPE_LABELS[type] ?? type}>
                  {protocols
                    .filter(p => p.type === type)
                    .map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              ))}
              {protocols.length === 0 && (
                <option value="" disabled>
                  No published protocols yet
                </option>
              )}
            </select>
          </div>
          <div>
            <label
              htmlFor="recovery-date"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Date
            </label>
            <input
              id="recovery-date"
              type="date"
              value={addDate}
              onChange={e => setAddDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm w-full"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="small"
              onClick={handleAdd}
              disabled={submitting || addProtocolId === ''}
            >
              {submitting ? 'Adding...' : 'Add'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => setShowAdd(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  )
}
