import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { recoveryService } from '@/api/recovery.service'
import type { RecoveryProtocol, RecoverySession } from '@/types/recovery'

const TYPE_LABELS: Record<string, string> = {
  MOBILITY: 'Mobility',
  STRETCHING: 'Stretching',
  SOFT_TISSUE: 'Soft tissue',
  ROUTINE: 'Routine',
}

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export default function RecoveryHub() {
  const [protocols, setProtocols] = useState<RecoveryProtocol[]>([])
  const [sessions, setSessions] = useState<RecoverySession[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 7)
    return toDateStr(d)
  })
  const [to, setTo] = useState(toDateStr(new Date()))
  const [addDate, setAddDate] = useState(toDateStr(new Date()))
  const [addProtocolId, setAddProtocolId] = useState<number | ''>('')
  const [submitting, setSubmitting] = useState(false)

  const loadProtocols = useCallback(() => {
    return recoveryService.listProtocols().then(res => {
      if (res.data.statusCode === 200 && res.data.data) {
        setProtocols(res.data.data)
      }
    })
  }, [])

  const loadSessions = useCallback(() => {
    return recoveryService.getSessions({ from, to }).then(res => {
      if (res.data.statusCode === 200 && Array.isArray(res.data.data)) {
        setSessions(res.data.data)
      }
    })
  }, [from, to])

  useEffect(() => {
    Promise.all([loadProtocols(), loadSessions()]).finally(() =>
      setLoading(false)
    )
  }, [loadProtocols, loadSessions])

  const handleAdd = () => {
    if (addProtocolId === '' || !addDate) return
    setSubmitting(true)
    recoveryService
      .createSession({
        recoveryProtocolId: Number(addProtocolId),
        scheduledDate: addDate,
      })
      .then(() => {
        setAddProtocolId('')
        setAddDate(toDateStr(new Date()))
        loadSessions()
      })
      .finally(() => setSubmitting(false))
  }

  const handleUpdateStatus = (id: number, status: string) => {
    recoveryService.updateSession(id, { status }).then(() => loadSessions())
  }

  const handleRemove = (id: number) => {
    if (globalThis.confirm('Remove from calendar?')) {
      recoveryService.deleteSession(id).then(() => loadSessions())
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Text variant="primary" className="text-2xl font-semibold">
        Recovery Hub
      </Text>

      <Card className="p-4">
        <Text variant="default" className="font-medium mb-3 block">
          Add recovery to calendar
        </Text>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label
              htmlFor="rh-protocol"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Protocol
            </label>
            <select
              id="rh-protocol"
              value={addProtocolId}
              onChange={e =>
                setAddProtocolId(
                  e.target.value === '' ? '' : Number(e.target.value)
                )
              }
              className="border border-gray-300 rounded px-3 py-2 text-sm min-w-[180px]"
            >
              <option value="">Select...</option>
              {protocols.map(p => (
                <option key={p.id} value={p.id}>
                  {TYPE_LABELS[p.type] ?? p.type}: {p.name}
                </option>
              ))}
              {protocols.length === 0 && !loading && (
                <option value="" disabled>
                  No published protocols yet
                </option>
              )}
            </select>
          </div>
          <div>
            <label
              htmlFor="rh-date"
              className="block text-xs font-medium text-gray-600 mb-1"
            >
              Date
            </label>
            <input
              id="rh-date"
              type="date"
              value={addDate}
              onChange={e => setAddDate(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <Button
            type="button"
            size="small"
            onClick={handleAdd}
            disabled={submitting || addProtocolId === ''}
          >
            {submitting ? 'Adding...' : 'Add'}
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <Text variant="default" className="font-medium mb-3 block">
          My recovery sessions
        </Text>
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <span className="self-center text-gray-500">to</span>
          <input
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm"
          />
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={loadSessions}
          >
            Apply
          </Button>
        </div>
        {loading && (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        )}
        {!loading && sessions.length === 0 && (
          <Text variant="secondary" className="text-sm">
            No recovery sessions in this range.
          </Text>
        )}
        {!loading && sessions.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {sessions.map(s => {
              const dateStr =
                typeof s.scheduledDate === 'string'
                  ? s.scheduledDate.slice(0, 10)
                  : ''
              const typeKey = s.recoveryProtocol?.type ?? ''
              const typeLabel = TYPE_LABELS[typeKey] ?? typeKey
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <Text variant="default" className="font-medium text-sm">
                      {s.recoveryProtocol?.name ?? 'Recovery'}
                    </Text>
                    <Text variant="secondary" className="text-xs">
                      {dateStr} · {typeLabel} · {s.status}
                    </Text>
                  </div>
                  <div className="flex gap-2">
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
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
