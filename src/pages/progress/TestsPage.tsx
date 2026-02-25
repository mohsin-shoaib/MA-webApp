/** PRD 15: Tests — list tests, log scores, history (table view) */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { testsService } from '@/api/tests.service'
import type { Test, TestLog } from '@/types/tests'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { AxiosError } from 'axios'

const SCORING_LABELS: Record<string, string> = {
  POINTS: 'Points',
  PASS_FAIL: 'Pass/Fail',
  TIME_BASED: 'Time-based',
}

export default function TestsPage() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useSnackbar()
  const [tests, setTests] = useState<Test[]>([])
  const [history, setHistory] = useState<TestLog[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTest, setSelectedTest] = useState<Test | null>(null)
  const [eventScores, setEventScores] = useState<Record<string, string>>({})
  const [totalScore, setTotalScore] = useState('')
  const [passed, setPassed] = useState<boolean | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([testsService.listTests(), testsService.getMyHistory()])
      .then(([tRes, hRes]) => {
        if (tRes.data.statusCode === 200 && tRes.data.data) {
          setTests(tRes.data.data)
        }
        if (hRes.data.statusCode === 200 && Array.isArray(hRes.data.data)) {
          setHistory(hRes.data.data)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openLog = (test: Test) => {
    setSelectedTest(test)
    const initial: Record<string, string> = {}
    test.events.forEach(e => {
      initial[String(e.id)] = ''
    })
    setEventScores(initial)
    setTotalScore('')
    setPassed(null)
  }

  const handleSubmitLog = async () => {
    if (!selectedTest) return
    const scores: Record<string, number | string> = {}
    for (const [eid, v] of Object.entries(eventScores)) {
      if (v === '') continue
      const num = Number(v)
      scores[eid] = Number.isNaN(num) ? v : num
    }
    if (Object.keys(scores).length === 0) {
      showError('Enter at least one event score')
      return
    }
    setSubmitting(true)
    try {
      await testsService.logScore({
        testId: selectedTest.id,
        eventScores: scores,
        totalScore: totalScore ? Number(totalScore) : undefined,
        passed: passed ?? undefined,
      })
      showSuccess('Score logged')
      setSelectedTest(null)
      load()
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || 'Failed to log score')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="ghost"
          size="small"
          onClick={() => navigate('/progress')}
        >
          ← Progress
        </Button>
        <Text variant="primary" className="text-2xl font-semibold">
          Tests
        </Text>
      </div>

      <Card className="p-4">
        <Text variant="default" className="font-medium mb-3 block">
          Available tests
        </Text>
        {tests.length === 0 ? (
          <Text variant="secondary" className="text-sm">
            No tests available yet. Admin can add tests in Admin → Tests.
          </Text>
        ) : (
          <ul className="space-y-2">
            {tests.map(t => (
              <li
                key={t.id}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <Text variant="default" className="font-medium">
                    {t.name}
                  </Text>
                  <Text variant="secondary" className="text-xs">
                    {SCORING_LABELS[t.scoringMethod] ?? t.scoringMethod} ·{' '}
                    {t.events?.length ?? 0} events
                  </Text>
                </div>
                <Button type="button" size="small" onClick={() => openLog(t)}>
                  Log score
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {selectedTest && (
        <Card className="p-4 border-2 border-primary-200">
          <Text variant="default" className="font-semibold mb-2 block">
            Log score: {selectedTest.name}
          </Text>
          {selectedTest.rules && (
            <Text variant="secondary" className="text-sm mb-3 block">
              Rules (reference): {selectedTest.rules}
            </Text>
          )}
          <div className="space-y-3 mb-4">
            {selectedTest.events?.map(e => (
              <div key={e.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {e.name} ({e.unit})
                </label>
                <input
                  type="text"
                  value={eventScores[String(e.id)] ?? ''}
                  onChange={ev =>
                    setEventScores(s => ({
                      ...s,
                      [String(e.id)]: ev.target.value,
                    }))
                  }
                  className="border border-gray-300 rounded px-3 py-2 w-full max-w-xs"
                  placeholder={
                    e.scoreType === 'PASS_FAIL' ? 'pass/fail' : 'Value'
                  }
                />
              </div>
            ))}
            {selectedTest.scoringMethod === 'POINTS' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total score
                </label>
                <input
                  type="number"
                  value={totalScore}
                  onChange={e => setTotalScore(e.target.value)}
                  className="border border-gray-300 rounded px-3 py-2 w-full max-w-xs"
                />
              </div>
            )}
            {selectedTest.scoringMethod === 'PASS_FAIL' && (
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={passed === true}
                    onChange={() => setPassed(true)}
                  />
                  <span className="text-sm">Pass</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={passed === false}
                    onChange={() => setPassed(false)}
                  />
                  <span className="text-sm">Fail</span>
                </label>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSubmitLog} disabled={submitting}>
              {submitting ? 'Saving...' : 'Save score'}
            </Button>
            <Button variant="secondary" onClick={() => setSelectedTest(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <Text variant="default" className="font-medium mb-3 block">
          My test history
        </Text>
        {history.length === 0 ? (
          <Text variant="secondary" className="text-sm">
            No scores logged yet.
          </Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">
                    Date
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">
                    Test
                  </th>
                  <th className="text-left py-2 px-3 font-medium text-gray-700">
                    Scores
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">
                    Total / Pass
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map(log => {
                  const dateStr =
                    typeof log.loggedAt === 'string'
                      ? log.loggedAt.slice(0, 10)
                      : ''
                  const scoresStr =
                    typeof log.eventScores === 'object' &&
                    log.eventScores !== null
                      ? Object.entries(log.eventScores)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join(', ')
                      : ''
                  return (
                    <tr key={log.id} className="border-b border-gray-100">
                      <td className="py-2 px-3 text-gray-900">{dateStr}</td>
                      <td className="py-2 px-3 text-gray-900">
                        {log.test?.name ?? log.testId}
                      </td>
                      <td className="py-2 px-3 text-gray-700 max-w-xs truncate">
                        {scoresStr}
                      </td>
                      <td className="py-2 px-3 text-right text-gray-700">
                        {log.totalScore != null
                          ? log.totalScore
                          : log.passed != null
                            ? log.passed
                              ? 'Pass'
                              : 'Fail'
                            : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
