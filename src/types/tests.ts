export type TestScoringMethod = 'POINTS' | 'PASS_FAIL' | 'TIME_BASED'
export type TestEventScoreType =
  | 'TIME'
  | 'REPS'
  | 'WEIGHT'
  | 'DISTANCE'
  | 'PASS_FAIL'
export type TestEventUnit =
  | 'MIN_SEC'
  | 'COUNT'
  | 'LBS'
  | 'KG'
  | 'MILES'
  | 'METERS'

export interface TestEvent {
  id: number
  testId: number
  name: string
  scoreType: TestEventScoreType
  unit: TestEventUnit
  orderIndex: number
  minValue?: number | null
  maxValue?: number | null
  pointScale?: unknown
}

export interface TestStandard {
  id: number
  testId: number
  name?: string | null
  minAge?: number | null
  maxAge?: number | null
  gender?: string | null
  criteria?: unknown
}

export interface Test {
  id: number
  name: string
  description?: string | null
  audienceTag?: string | null
  scoringMethod: TestScoringMethod
  ageGenderAdjusted: boolean
  rules?: string | null
  isActive?: boolean
  events: TestEvent[]
  standards?: TestStandard[]
}

export interface TestLog {
  id: number
  userId: number
  testId: number
  loggedAt: string
  eventScores: Record<string, number | string>
  totalScore?: number | null
  passed?: boolean | null
  test?: Test
}
