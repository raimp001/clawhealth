/**
 * FHIR R4 Resource Builders — OpenRx
 * Converts internal OpenRx data types to FHIR R4 resources.
 * All builders are pure functions — no side effects.
 */

import type {
  Patient, Practitioner, Coverage, MedicationRequest,
  ServiceRequest, Condition, Bundle, BundleEntry,
  Organization, CodeableConcept, Reference, Identifier,
  HumanName, ContactPoint, Address,
} from "./types"
import type { LivePatient, LivePhysician, LivePrescription, LivePriorAuth } from "../live-data-types"

const OPENRX_SYSTEM = "https://openrx.health/fhir"
const NPI_SYSTEM = "http://hl7.org/fhir/sid/us-npi"
const MEMBER_ID_SYSTEM = "http://terminology.hl7.org/CodeSystem/v2-0203"
const ICD10_SYSTEM = "http://hl7.org/fhir/sid/icd-10-cm"
const CPT_SYSTEM = "http://www.ama-assn.org/go/cpt"
const HCPCS_SYSTEM = "https://www.cms.gov/Medicare/Coding/HCPCSReleaseCodeSets"
const LOINC_SYSTEM = "http://loinc.org"
const SNOMED_SYSTEM = "http://snomed.info/sct"
const RXNORM_SYSTEM = "http://www.nlm.nih.gov/research/umls/rxnorm"

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

function resourceRef(type: string, id: string): Reference {
  return { reference: `${type}/${id}`, type }
}

function cptOrHcpcs(code: string): CodeableConcept {
  const isHcpcs = /^[A-Z]\d{4}$/.test(code)
  return {
    coding: [{
      system: isHcpcs ? HCPCS_SYSTEM : CPT_SYSTEM,
      code,
      display: code,
    }],
    text: code,
  }
}

function icd10Concept(code: string, display?: string): CodeableConcept {
  return {
    coding: [{ system: ICD10_SYSTEM, code, display: display ?? code }],
    text: display ?? code,
  }
}

// ── Patient builder ──────────────────────────────────────────────────

export function buildPatientResource(p: LivePatient): Patient {
  const names: HumanName[] = []
  const parts = p.full_name.trim().split(/\s+/)
  if (parts.length >= 2) {
    names.push({
      use: "official",
      family: parts[parts.length - 1],
      given: parts.slice(0, -1),
      text: p.full_name,
    })
  } else {
    names.push({ use: "official", text: p.full_name })
  }

  const telecom: ContactPoint[] = []
  if (p.phone) telecom.push({ system: "phone", value: p.phone, use: "mobile" })
  if (p.email) telecom.push({ system: "email", value: p.email, use: "home" })

  const address: Address[] = []
  if (p.address) {
    address.push({ use: "home", text: p.address })
  }

  const identifiers: Identifier[] = [
    { system: `${OPENRX_SYSTEM}/patient`, value: p.id },
  ]
  if (p.insurance_id) {
    identifiers.push({
      type: {
        coding: [{ system: MEMBER_ID_SYSTEM, code: "MB", display: "Member Number" }],
        text: "Insurance Member ID",
      },
      system: `${OPENRX_SYSTEM}/insurance`,
      value: p.insurance_id,
    })
  }

  const genderMap: Record<string, Patient["gender"]> = {
    male: "male", female: "female", m: "male", f: "female",
    other: "other", unknown: "unknown",
  }

  return {
    resourceType: "Patient",
    id: p.id,
    meta: {
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient"],
      lastUpdated: new Date().toISOString(),
    },
    identifier: identifiers,
    active: true,
    name: names,
    telecom: telecom.length > 0 ? telecom : undefined,
    gender: genderMap[p.gender?.toLowerCase() ?? ""] ?? "unknown",
    birthDate: p.date_of_birth ? p.date_of_birth.slice(0, 10) : undefined,
    address: address.length > 0 ? address : undefined,
    generalPractitioner: p.primary_physician_id
      ? [resourceRef("Practitioner", p.primary_physician_id)]
      : undefined,
  }
}

// ── Practitioner builder ─────────────────────────────────────────────

export function buildPractitionerResource(doc: LivePhysician): Practitioner {
  const names: HumanName[] = []
  const parts = doc.full_name.trim().split(/\s+/)
  if (parts.length >= 2) {
    names.push({
      use: "official",
      family: parts[parts.length - 1],
      given: parts.slice(0, -1),
      prefix: ["Dr."],
      text: `Dr. ${doc.full_name}`,
    })
  } else {
    names.push({ use: "official", text: doc.full_name, prefix: ["Dr."] })
  }

  return {
    resourceType: "Practitioner",
    id: doc.id,
    meta: {
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-practitioner"],
      lastUpdated: new Date().toISOString(),
    },
    identifier: [
      { system: `${OPENRX_SYSTEM}/practitioner`, value: doc.id },
      ...(doc.credentials ? [{ system: NPI_SYSTEM, value: doc.credentials, use: "official" as const }] : []),
    ],
    active: true,
    name: names,
    telecom: [
      { system: "email", value: doc.email, use: "work" },
    ],
    qualification: [{
      code: {
        coding: [{
          system: "http://terminology.hl7.org/CodeSystem/v2-0360",
          code: "MD",
          display: "Doctor of Medicine",
        }],
        text: doc.specialty,
      },
    }],
  }
}

// ── Coverage (insurance) builder ─────────────────────────────────────

export function buildCoverageResource(params: {
  id: string
  patientId: string
  memberId: string
  insuranceProvider: string
  insurancePlan: string
}): Coverage {
  return {
    resourceType: "Coverage",
    id: params.id,
    meta: {
      profile: ["http://hl7.org/fhir/us/davinci-hrex/StructureDefinition/hrex-coverage"],
      lastUpdated: new Date().toISOString(),
    },
    status: "active",
    type: {
      coding: [{
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        code: "HIP",
        display: "health insurance plan policy",
      }],
    },
    subscriber: resourceRef("Patient", params.patientId),
    subscriberId: params.memberId,
    beneficiary: resourceRef("Patient", params.patientId),
    relationship: {
      coding: [{ system: "http://terminology.hl7.org/CodeSystem/subscriber-relationship", code: "self" }],
    },
    payor: [{
      display: params.insuranceProvider,
    }],
    class: [
      {
        type: {
          coding: [{ system: "http://terminology.hl7.org/CodeSystem/coverage-class", code: "plan" }],
          text: "Plan",
        },
        value: params.insurancePlan,
        name: params.insurancePlan,
      },
    ],
  }
}

// ── MedicationRequest builder ────────────────────────────────────────

export function buildMedicationRequestResource(rx: LivePrescription): MedicationRequest {
  return {
    resourceType: "MedicationRequest",
    id: rx.id,
    meta: {
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest"],
      lastUpdated: new Date().toISOString(),
    },
    status: rx.status === "active" ? "active" : rx.status === "filled" ? "completed" : "cancelled",
    intent: "order",
    priority: "routine",
    medicationCodeableConcept: {
      coding: [{ system: RXNORM_SYSTEM, display: rx.medication_name }],
      text: `${rx.medication_name} ${rx.dosage}`,
    },
    subject: resourceRef("Patient", rx.patient_id),
    requester: resourceRef("Practitioner", rx.physician_id),
    note: rx.notes ? [{ text: rx.notes }] : undefined,
    dosageInstruction: [{
      text: `${rx.dosage} — ${rx.frequency}`,
      patientInstruction: rx.notes || undefined,
    }],
    dispenseRequest: {
      numberOfRepeatsAllowed: rx.refills_remaining,
      expectedSupplyDuration: { value: 30, unit: "d", system: "http://unitsofmeasure.org", code: "d" },
    },
  }
}

// ── Condition builder ────────────────────────────────────────────────

export function buildConditionResource(params: {
  id: string
  patientId: string
  icdCode: string
  display?: string
  onset?: string
}): Condition {
  return {
    resourceType: "Condition",
    id: params.id,
    meta: {
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition"],
      lastUpdated: new Date().toISOString(),
    },
    clinicalStatus: {
      coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: "active", display: "Active" }],
    },
    verificationStatus: {
      coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-ver-status", code: "confirmed" }],
    },
    category: [{
      coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-category", code: "problem-list-item", display: "Problem List Item" }],
    }],
    code: icd10Concept(params.icdCode, params.display),
    subject: resourceRef("Patient", params.patientId),
    onsetDateTime: params.onset,
    recordedDate: new Date().toISOString(),
  }
}

// ── ServiceRequest builder ───────────────────────────────────────────

export function buildServiceRequestResource(params: {
  id: string
  patientId: string
  practitionerId: string
  cptCode: string
  procedureName: string
  icdCodes: string[]
  urgency?: "routine" | "urgent" | "asap" | "stat"
  coverageId?: string
}): ServiceRequest {
  return {
    resourceType: "ServiceRequest",
    id: params.id,
    meta: {
      profile: ["http://hl7.org/fhir/us/core/StructureDefinition/us-core-servicerequest"],
      lastUpdated: new Date().toISOString(),
    },
    status: "active",
    intent: "order",
    priority: params.urgency ?? "routine",
    code: cptOrHcpcs(params.cptCode),
    subject: resourceRef("Patient", params.patientId),
    requester: resourceRef("Practitioner", params.practitionerId),
    reasonCode: params.icdCodes.map((code) => icd10Concept(code)),
    insurance: params.coverageId ? [resourceRef("Coverage", params.coverageId)] : undefined,
    note: [{ text: `Authorization requested for: ${params.procedureName}` }],
    occurrenceDateTime: new Date().toISOString(),
  }
}

// ── Da Vinci PAS Claim builder ───────────────────────────────────────
// https://hl7.org/fhir/us/davinci-pas/StructureDefinition-profile-claim.html

export function buildPASClaimBundle(params: {
  pa: LivePriorAuth
  patient: LivePatient
  physician: LivePhysician
}): Bundle {
  const { pa, patient, physician } = params
  const claimId = `claim-${pa.id}`
  const patientResourceId = patient.id
  const practitionerId = physician.id
  const coverageId = `coverage-${patient.id}`
  const now = new Date().toISOString()

  const patientResource = buildPatientResource(patient)
  const practitionerResource = buildPractitionerResource(physician)
  const coverageResource = buildCoverageResource({
    id: coverageId,
    patientId: patient.id,
    memberId: patient.insurance_id || "UNKNOWN",
    insuranceProvider: patient.insurance_provider,
    insurancePlan: patient.insurance_plan,
  })

  const serviceRequestId = `sr-${pa.id}`
  const serviceRequest = buildServiceRequestResource({
    id: serviceRequestId,
    patientId: patient.id,
    practitionerId: physician.id,
    cptCode: pa.procedure_code,
    procedureName: pa.procedure_name,
    icdCodes: pa.icd_codes,
    urgency: (pa.urgency as "routine" | "urgent") ?? "routine",
    coverageId,
  })

  // Build conditions from ICD codes
  const conditions = pa.icd_codes.map((code, i) => buildConditionResource({
    id: `condition-${pa.id}-${i}`,
    patientId: patient.id,
    icdCode: code,
  }))

  // Build the PAS Claim resource
  const claim = {
    resourceType: "Claim",
    id: claimId,
    meta: {
      profile: ["http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-claim"],
      lastUpdated: now,
    },
    extension: [
      {
        url: "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-levelOfServiceOrTypeOfCare",
        valueCodeableConcept: {
          coding: [{
            system: "https://valueset.x12.org/x217/005010X217/request/2000E/UM/1/02/00/1338",
            code: pa.urgency === "urgent" ? "U" : "AR",
            display: pa.urgency === "urgent" ? "Urgent" : "Admission Review",
          }],
        },
      },
    ],
    identifier: [{
      system: `${OPENRX_SYSTEM}/prior-auth`,
      value: pa.reference_number ?? `PA-${pa.id.slice(-8)}`,
    }],
    status: "active",
    type: {
      coding: [{
        system: "http://terminology.hl7.org/CodeSystem/claim-type",
        code: "professional",
        display: "Professional",
      }],
    },
    use: "preauthorization",
    patient: resourceRef("Patient", patientResourceId),
    created: now,
    insurer: { display: patient.insurance_provider || "Insurance Plan" },
    provider: resourceRef("Practitioner", practitionerId),
    priority: {
      coding: [{
        system: "http://terminology.hl7.org/CodeSystem/processpriority",
        code: pa.urgency === "urgent" ? "stat" : "normal",
      }],
    },
    insurance: [{
      sequence: 1,
      focal: true,
      coverage: resourceRef("Coverage", coverageId),
    }],
    diagnosis: pa.icd_codes.map((code, i) => ({
      sequence: i + 1,
      diagnosisCodeableConcept: icd10Concept(code),
      type: [{
        coding: [{
          system: "http://terminology.hl7.org/CodeSystem/ex-diagnosistype",
          code: i === 0 ? "principal" : "admitting",
        }],
      }],
    })),
    item: [{
      sequence: 1,
      diagnosisSequence: pa.icd_codes.map((_, i) => i + 1),
      productOrService: cptOrHcpcs(pa.procedure_code),
      servicedDate: new Date().toISOString().slice(0, 10),
      quantity: { value: 1, unit: "each" },
      extension: [
        {
          url: "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-itemTraceNumber",
          valueIdentifier: {
            system: `${OPENRX_SYSTEM}/item-trace`,
            value: `ITN-${pa.id.slice(-8)}`,
          },
        },
        {
          url: "http://hl7.org/fhir/us/davinci-pas/StructureDefinition/extension-requestedService",
          valueReference: resourceRef("ServiceRequest", serviceRequestId),
        },
      ],
    }],
    supportingInfo: pa.clinical_notes ? [{
      sequence: 1,
      category: {
        coding: [{
          system: "http://terminology.hl7.org/CodeSystem/claiminformationcategory",
          code: "info",
          display: "Information",
        }],
      },
      valueString: pa.clinical_notes,
    }] : undefined,
  }

  // Assemble the Da Vinci PAS Bundle
  const entries: BundleEntry[] = [
    {
      fullUrl: `urn:uuid:${patientResourceId}`,
      resource: patientResource,
      request: { method: "POST", url: "Patient" },
    },
    {
      fullUrl: `urn:uuid:${practitionerId}`,
      resource: practitionerResource,
      request: { method: "POST", url: "Practitioner" },
    },
    {
      fullUrl: `urn:uuid:${coverageId}`,
      resource: coverageResource,
      request: { method: "POST", url: "Coverage" },
    },
    {
      fullUrl: `urn:uuid:${serviceRequestId}`,
      resource: serviceRequest,
      request: { method: "POST", url: "ServiceRequest" },
    },
    ...conditions.map((cond) => ({
      fullUrl: `urn:uuid:${cond.id}`,
      resource: cond,
      request: { method: "POST" as const, url: "Condition" },
    })),
    {
      fullUrl: `urn:uuid:${claimId}`,
      resource: claim,
      request: { method: "POST", url: "Claim/$submit" },
    },
  ]

  return {
    resourceType: "Bundle",
    id: uuid(),
    meta: {
      profile: ["http://hl7.org/fhir/us/davinci-pas/StructureDefinition/profile-pas-request-bundle"],
      lastUpdated: now,
    },
    type: "collection",
    timestamp: now,
    entry: entries,
  }
}

// ── Build a FHIR Patient Bundle (complete record) ────────────────────

export function buildPatientBundle(params: {
  patient: LivePatient
  physician?: LivePhysician
}): Bundle {
  const now = new Date().toISOString()
  const entries: BundleEntry[] = [
    {
      fullUrl: `urn:uuid:${params.patient.id}`,
      resource: buildPatientResource(params.patient),
      request: { method: "GET", url: `Patient/${params.patient.id}` },
    },
  ]

  if (params.physician) {
    entries.push({
      fullUrl: `urn:uuid:${params.physician.id}`,
      resource: buildPractitionerResource(params.physician),
      request: { method: "GET", url: `Practitioner/${params.physician.id}` },
    })
  }

  return {
    resourceType: "Bundle",
    id: uuid(),
    meta: { lastUpdated: now },
    type: "searchset",
    timestamp: now,
    total: entries.length,
    entry: entries,
  }
}
