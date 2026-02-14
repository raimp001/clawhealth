// ── Current User Context ──────────────────────────────────
// In production this would come from auth. For demo, we simulate
// being logged in as the first patient (James Thompson).

import { patients, getPatientAppointments, getPatientClaims, getPatientPrescriptions, getPatientMessages } from "./seed-data"

export const currentUser = patients[0] // James Thompson

export function getMyAppointments() {
  return getPatientAppointments(currentUser.id)
}

export function getMyClaims() {
  return getPatientClaims(currentUser.id)
}

export function getMyPrescriptions() {
  return getPatientPrescriptions(currentUser.id)
}

export function getMyMessages() {
  return getPatientMessages(currentUser.id)
}
