import AdminExercises from '@/pages/admin/exercises'

/**
 * Coach Exercise Library: same UI as admin but coach-added exercises need admin approval.
 * Coach can create/edit/delete their own; only approved exercises show in program builder dropdown.
 */
export default function CoachExercises() {
  return <AdminExercises role="coach" />
}
