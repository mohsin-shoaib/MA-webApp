import AdminExercises from '@/pages/admin/exercises'

/**
 * Coach Exercise Library: same UI and access as admin (MASS Phase 2).
 * Coach can create/edit/delete any exercise; no approval workflow; all active exercises in program builder.
 */
export default function CoachExercises() {
  return <AdminExercises role="coach" />
}
