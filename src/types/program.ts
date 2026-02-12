export interface DailyExercise {
  day: number
  exercises: string[]
}

export interface AlternateExercise {
  main: string
  alternate: string
}

export interface ProgramProps {
  name: string
  description: string
  isActive: boolean
  category: string
  subCategory?: string // optional if sometimes not present
  cycleId: number
  dailyExercise: DailyExercise[]
  alternateExercise?: AlternateExercise[] // optional if sometimes empty
}

export interface ProgramResponse {
  data: {
    id: number
    name: string
    description: string
    isActive: boolean
    category: string
    subCategory?: string
    cycleId: number
    dailyExercise: DailyExercise[]
    alternateExercise?: AlternateExercise[]
    createdAt: string
    updatedAt: string
  }
}
