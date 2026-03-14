/**
 * FHIR R4 Core Types — OpenRx
 * Subset of FHIR R4 resources used by Da Vinci PAS and EHR integration.
 * https://hl7.org/fhir/R4/
 */

// ── Primitives ───────────────────────────────────────────────────────

export type FhirDate = string        // YYYY-MM-DD
export type FhirDateTime = string    // ISO 8601
export type FhirCode = string
export type FhirUri = string
export type FhirUrl = string
export type FhirId = string
export type FhirDecimal = number
export type FhirPositiveInt = number
export type FhirUnsignedInt = number

// ── Common types ─────────────────────────────────────────────────────

export interface Coding {
  system?: FhirUri
  version?: string
  code?: FhirCode
  display?: string
  userSelected?: boolean
}

export interface CodeableConcept {
  coding?: Coding[]
  text?: string
}

export interface Identifier {
  use?: "usual" | "official" | "temp" | "secondary" | "old"
  type?: CodeableConcept
  system?: FhirUri
  value?: string
  period?: Period
}

export interface HumanName {
  use?: "usual" | "official" | "temp" | "nickname" | "anonymous" | "old" | "maiden"
  text?: string
  family?: string
  given?: string[]
  prefix?: string[]
  suffix?: string[]
}

export interface Address {
  use?: "home" | "work" | "temp" | "old" | "billing"
  type?: "postal" | "physical" | "both"
  text?: string
  line?: string[]
  city?: string
  district?: string
  state?: string
  postalCode?: string
  country?: string
  period?: Period
}

export interface ContactPoint {
  system?: "phone" | "fax" | "email" | "pager" | "url" | "sms" | "other"
  value?: string
  use?: "home" | "work" | "temp" | "old" | "mobile"
  rank?: FhirPositiveInt
}

export interface Period {
  start?: FhirDateTime
  end?: FhirDateTime
}

export interface Quantity {
  value?: FhirDecimal
  comparator?: "<" | "<=" | ">=" | ">"
  unit?: string
  system?: FhirUri
  code?: FhirCode
}

export interface Reference {
  reference?: string
  type?: FhirUri
  identifier?: Identifier
  display?: string
}

export interface Attachment {
  contentType?: FhirCode
  language?: FhirCode
  data?: string  // base64
  url?: FhirUrl
  size?: FhirUnsignedInt
  hash?: string
  title?: string
  creation?: FhirDateTime
}

export interface Annotation {
  authorReference?: Reference
  authorString?: string
  time?: FhirDateTime
  text: string
}

export interface Meta {
  versionId?: FhirId
  lastUpdated?: FhirDateTime
  source?: FhirUri
  profile?: FhirUri[]
  security?: Coding[]
  tag?: Coding[]
}

export interface Narrative {
  status: "generated" | "extensions" | "additional" | "empty"
  div: string
}

// ── Base resource ────────────────────────────────────────────────────

export interface Resource {
  resourceType: string
  id?: FhirId
  meta?: Meta
  implicitRules?: FhirUri
  language?: FhirCode
}

export interface DomainResource extends Resource {
  text?: Narrative
  contained?: Resource[]
  extension?: Extension[]
  modifierExtension?: Extension[]
}

export interface Extension {
  url: FhirUri
  valueString?: string
  valueCode?: FhirCode
  valueBoolean?: boolean
  valueInteger?: number
  valueDecimal?: FhirDecimal
  valueDateTime?: FhirDateTime
  valueDate?: FhirDate
  valueCoding?: Coding
  valueCodeableConcept?: CodeableConcept
  valueReference?: Reference
  valueIdentifier?: Identifier
  valuePeriod?: Period
  extension?: Extension[]
}

// ── Patient ──────────────────────────────────────────────────────────

export interface Patient extends DomainResource {
  resourceType: "Patient"
  identifier?: Identifier[]
  active?: boolean
  name?: HumanName[]
  telecom?: ContactPoint[]
  gender?: "male" | "female" | "other" | "unknown"
  birthDate?: FhirDate
  deceasedBoolean?: boolean
  deceasedDateTime?: FhirDateTime
  address?: Address[]
  maritalStatus?: CodeableConcept
  multipleBirthBoolean?: boolean
  multipleBirthInteger?: number
  contact?: Array<{
    relationship?: CodeableConcept[]
    name?: HumanName
    telecom?: ContactPoint[]
    address?: Address
    gender?: string
    organization?: Reference
  }>
  communication?: Array<{
    language: CodeableConcept
    preferred?: boolean
  }>
  generalPractitioner?: Reference[]
  managingOrganization?: Reference
  link?: Array<{
    other: Reference
    type: "replaced-by" | "replaces" | "refer" | "seealso"
  }>
}

// ── Practitioner ─────────────────────────────────────────────────────

export interface Practitioner extends DomainResource {
  resourceType: "Practitioner"
  identifier?: Identifier[]
  active?: boolean
  name?: HumanName[]
  telecom?: ContactPoint[]
  address?: Address[]
  gender?: "male" | "female" | "other" | "unknown"
  birthDate?: FhirDate
  qualification?: Array<{
    identifier?: Identifier[]
    code: CodeableConcept
    period?: Period
    issuer?: Reference
  }>
  communication?: CodeableConcept[]
}

export interface PractitionerRole extends DomainResource {
  resourceType: "PractitionerRole"
  identifier?: Identifier[]
  active?: boolean
  period?: Period
  practitioner?: Reference
  organization?: Reference
  code?: CodeableConcept[]
  specialty?: CodeableConcept[]
  location?: Reference[]
  telecom?: ContactPoint[]
}

// ── Organization ─────────────────────────────────────────────────────

export interface Organization extends DomainResource {
  resourceType: "Organization"
  identifier?: Identifier[]
  active?: boolean
  type?: CodeableConcept[]
  name?: string
  alias?: string[]
  telecom?: ContactPoint[]
  address?: Address[]
  partOf?: Reference
  contact?: Array<{
    purpose?: CodeableConcept
    name?: HumanName
    telecom?: ContactPoint[]
    address?: Address
  }>
}

// ── Coverage (Insurance) ─────────────────────────────────────────────

export interface Coverage extends DomainResource {
  resourceType: "Coverage"
  identifier?: Identifier[]
  status: "active" | "cancelled" | "draft" | "entered-in-error"
  type?: CodeableConcept
  policyHolder?: Reference
  subscriber?: Reference
  subscriberId?: string
  beneficiary: Reference
  dependent?: string
  relationship?: CodeableConcept
  period?: Period
  payor: Reference[]
  class?: Array<{
    type: CodeableConcept
    value: string
    name?: string
  }>
  order?: FhirPositiveInt
  network?: string
  costToBeneficiary?: Array<{
    type?: CodeableConcept
    valueQuantity?: Quantity
    valueMoney?: { value?: number; currency?: string }
    exception?: Array<{
      type: CodeableConcept
      period?: Period
    }>
  }>
}

// ── MedicationRequest ────────────────────────────────────────────────

export interface MedicationRequest extends DomainResource {
  resourceType: "MedicationRequest"
  identifier?: Identifier[]
  status: "active" | "on-hold" | "cancelled" | "completed" | "entered-in-error" | "stopped" | "draft" | "unknown"
  statusReason?: CodeableConcept
  intent: "proposal" | "plan" | "order" | "original-order" | "reflex-order" | "filler-order" | "instance-order" | "option"
  category?: CodeableConcept[]
  priority?: "routine" | "urgent" | "asap" | "stat"
  doNotPerform?: boolean
  medicationCodeableConcept?: CodeableConcept
  medicationReference?: Reference
  subject: Reference
  encounter?: Reference
  requester?: Reference
  performer?: Reference
  reasonCode?: CodeableConcept[]
  reasonReference?: Reference[]
  insurance?: Reference[]
  note?: Annotation[]
  dosageInstruction?: Array<{
    text?: string
    patientInstruction?: string
    timing?: {
      repeat?: {
        frequency?: number
        period?: number
        periodUnit?: "s" | "min" | "h" | "d" | "wk" | "mo" | "a"
        when?: string[]
      }
    }
    route?: CodeableConcept
    doseAndRate?: Array<{
      type?: CodeableConcept
      doseQuantity?: Quantity
      rateQuantity?: Quantity
    }>
  }>
  dispenseRequest?: {
    numberOfRepeatsAllowed?: FhirUnsignedInt
    quantity?: Quantity
    expectedSupplyDuration?: Quantity
  }
  substitution?: {
    allowedBoolean?: boolean
    allowedCodeableConcept?: CodeableConcept
    reason?: CodeableConcept
  }
  priorPrescription?: Reference
}

// ── ServiceRequest ───────────────────────────────────────────────────

export interface ServiceRequest extends DomainResource {
  resourceType: "ServiceRequest"
  identifier?: Identifier[]
  instantiatesCanonical?: string[]
  basedOn?: Reference[]
  replaces?: Reference[]
  requisition?: Identifier
  status: "draft" | "active" | "on-hold" | "revoked" | "completed" | "entered-in-error" | "unknown"
  intent: "proposal" | "plan" | "directive" | "order" | "original-order" | "reflex-order" | "filler-order" | "instance-order" | "option"
  category?: CodeableConcept[]
  priority?: "routine" | "urgent" | "asap" | "stat"
  doNotPerform?: boolean
  code?: CodeableConcept
  orderDetail?: CodeableConcept[]
  subject: Reference
  encounter?: Reference
  occurrenceDateTime?: FhirDateTime
  occurrencePeriod?: Period
  requester?: Reference
  performerType?: CodeableConcept
  performer?: Reference[]
  locationCode?: CodeableConcept[]
  reasonCode?: CodeableConcept[]
  reasonReference?: Reference[]
  insurance?: Reference[]
  supportingInfo?: Reference[]
  specimen?: Reference[]
  bodySite?: CodeableConcept[]
  note?: Annotation[]
  patientInstruction?: string
}

// ── Condition ────────────────────────────────────────────────────────

export interface Condition extends DomainResource {
  resourceType: "Condition"
  identifier?: Identifier[]
  clinicalStatus?: CodeableConcept
  verificationStatus?: CodeableConcept
  category?: CodeableConcept[]
  severity?: CodeableConcept
  code?: CodeableConcept
  bodySite?: CodeableConcept[]
  subject: Reference
  encounter?: Reference
  onsetDateTime?: FhirDateTime
  onsetAge?: Quantity
  onsetPeriod?: Period
  onsetRange?: { low?: Quantity; high?: Quantity }
  onsetString?: string
  abatementDateTime?: FhirDateTime
  recordedDate?: FhirDateTime
  recorder?: Reference
  asserter?: Reference
  note?: Annotation[]
}

// ── Observation ──────────────────────────────────────────────────────

export interface Observation extends DomainResource {
  resourceType: "Observation"
  identifier?: Identifier[]
  status: "registered" | "preliminary" | "final" | "amended" | "corrected" | "cancelled" | "entered-in-error" | "unknown"
  category?: CodeableConcept[]
  code: CodeableConcept
  subject?: Reference
  effectiveDateTime?: FhirDateTime
  effectivePeriod?: Period
  issued?: FhirDateTime
  performer?: Reference[]
  valueQuantity?: Quantity
  valueCodeableConcept?: CodeableConcept
  valueString?: string
  valueBoolean?: boolean
  valueInteger?: number
  dataAbsentReason?: CodeableConcept
  interpretation?: CodeableConcept[]
  note?: Annotation[]
  bodySite?: CodeableConcept
  referenceRange?: Array<{
    low?: Quantity
    high?: Quantity
    type?: CodeableConcept
    text?: string
  }>
  component?: Array<{
    code: CodeableConcept
    valueQuantity?: Quantity
    valueCodeableConcept?: CodeableConcept
    valueString?: string
    dataAbsentReason?: CodeableConcept
    interpretation?: CodeableConcept[]
    referenceRange?: Array<{
      low?: Quantity
      high?: Quantity
      text?: string
    }>
  }>
}

// ── ClaimResponse (for PA decisions) ─────────────────────────────────

export interface ClaimResponse extends DomainResource {
  resourceType: "ClaimResponse"
  identifier?: Identifier[]
  status: "active" | "cancelled" | "draft" | "entered-in-error"
  type: CodeableConcept
  subType?: CodeableConcept
  use: "claim" | "preauthorization" | "predetermination"
  patient: Reference
  created: FhirDateTime
  insurer: Reference
  requestor?: Reference
  request?: Reference
  outcome: "queued" | "complete" | "error" | "partial"
  disposition?: string
  preAuthRef?: string
  preAuthPeriod?: Period
  payeeType?: CodeableConcept
  item?: Array<{
    itemSequence: FhirPositiveInt
    noteNumber?: FhirPositiveInt[]
    adjudication: Array<{
      category: CodeableConcept
      reason?: CodeableConcept
      amount?: { value?: number; currency?: string }
      value?: FhirDecimal
    }>
  }>
  total?: Array<{
    category: CodeableConcept
    amount: { value?: number; currency?: string }
  }>
  error?: Array<{
    itemSequence?: FhirPositiveInt
    detailSequence?: FhirPositiveInt
    subDetailSequence?: FhirPositiveInt
    code: CodeableConcept
  }>
}

// ── Da Vinci PAS — Claim (PA request) ────────────────────────────────
// https://hl7.org/fhir/us/davinci-pas/

export interface PASClaim extends DomainResource {
  resourceType: "Claim"
  identifier?: Identifier[]
  status: "active" | "cancelled" | "draft" | "entered-in-error"
  type: CodeableConcept
  subType?: CodeableConcept
  use: "preauthorization"
  patient: Reference
  created: FhirDateTime
  insurer: Reference
  provider: Reference
  priority: CodeableConcept
  related?: Array<{
    claim?: Reference
    relationship?: CodeableConcept
    reference?: Identifier
  }>
  prescription?: Reference
  originalPrescription?: Reference
  payee?: {
    type: CodeableConcept
    party?: Reference
  }
  referral?: Reference
  facility?: Reference
  careTeam?: Array<{
    sequence: FhirPositiveInt
    provider: Reference
    responsible?: boolean
    role?: CodeableConcept
    qualification?: CodeableConcept
  }>
  diagnosis?: Array<{
    sequence: FhirPositiveInt
    diagnosisCodeableConcept?: CodeableConcept
    diagnosisReference?: Reference
    type?: CodeableConcept[]
    onAdmission?: CodeableConcept
    packageCode?: CodeableConcept
  }>
  procedure?: Array<{
    sequence: FhirPositiveInt
    type?: CodeableConcept[]
    date?: FhirDateTime
    procedureCodeableConcept?: CodeableConcept
    procedureReference?: Reference
    udi?: Reference[]
  }>
  insurance: Array<{
    sequence: FhirPositiveInt
    focal: boolean
    identifier?: Identifier
    coverage: Reference
    businessArrangement?: string
    preAuthRef?: string[]
    claimResponse?: Reference
  }>
  accident?: {
    date: FhirDate
    type?: CodeableConcept
    locationAddress?: Address
    locationReference?: Reference
  }
  item: Array<{
    sequence: FhirPositiveInt
    careTeamSequence?: FhirPositiveInt[]
    diagnosisSequence?: FhirPositiveInt[]
    procedureSequence?: FhirPositiveInt[]
    informationSequence?: FhirPositiveInt[]
    revenue?: CodeableConcept
    category?: CodeableConcept
    productOrService: CodeableConcept
    modifier?: CodeableConcept[]
    programCode?: CodeableConcept[]
    servicedDate?: FhirDate
    servicedPeriod?: Period
    locationCodeableConcept?: CodeableConcept
    quantity?: Quantity
    unitPrice?: { value?: number; currency?: string }
    factor?: FhirDecimal
    net?: { value?: number; currency?: string }
    udi?: Reference[]
    bodySite?: CodeableConcept
    subSite?: CodeableConcept[]
    encounter?: Reference[]
    detail?: Array<{
      sequence: FhirPositiveInt
      productOrService: CodeableConcept
      quantity?: Quantity
      unitPrice?: { value?: number; currency?: string }
    }>
  }>
  total?: { value?: number; currency?: string }
}

// ── Bundle ───────────────────────────────────────────────────────────

export interface BundleEntry {
  fullUrl?: FhirUri
  resource?: Resource
  request?: {
    method: "GET" | "HEAD" | "POST" | "PUT" | "DELETE" | "PATCH"
    url: FhirUri
    ifNoneMatch?: string
    ifModifiedSince?: FhirDateTime
    ifMatch?: string
    ifNoneExist?: string
  }
  response?: {
    status: string
    location?: FhirUri
    etag?: string
    lastModified?: FhirDateTime
    outcome?: Resource
  }
}

export interface Bundle extends Resource {
  resourceType: "Bundle"
  identifier?: Identifier
  type: "document" | "message" | "transaction" | "transaction-response" | "batch" | "batch-response" | "history" | "searchset" | "collection"
  timestamp?: FhirDateTime
  total?: FhirUnsignedInt
  link?: Array<{
    relation: string
    url: FhirUri
  }>
  entry?: BundleEntry[]
  signature?: {
    type: Coding[]
    when: FhirDateTime
    who: Reference
    onBehalfOf?: Reference
    targetFormat?: FhirCode
    sigFormat?: FhirCode
    data?: string
  }
}

// ── Capability Statement (FHIR server metadata) ───────────────────────

export interface CapabilityStatement extends DomainResource {
  resourceType: "CapabilityStatement"
  url?: FhirUri
  version?: string
  name?: string
  title?: string
  status: "draft" | "active" | "retired" | "unknown"
  experimental?: boolean
  date: FhirDateTime
  publisher?: string
  description?: string
  purpose?: string
  copyright?: string
  kind: "instance" | "capability" | "requirements"
  fhirVersion: string
  format: FhirCode[]
  rest?: Array<{
    mode: "client" | "server"
    documentation?: string
    security?: {
      cors?: boolean
      service?: CodeableConcept[]
      description?: string
    }
    resource?: Array<{
      type: FhirCode
      profile?: FhirUri
      supportedProfile?: FhirUri[]
      documentation?: string
      interaction?: Array<{
        code: "read" | "vread" | "update" | "patch" | "delete" | "history-instance" | "history-type" | "create" | "search-type"
        documentation?: string
      }>
      versioning?: "no-version" | "versioned" | "versioned-update"
      searchParam?: Array<{
        name: string
        definition?: FhirUri
        type: "number" | "date" | "string" | "token" | "reference" | "composite" | "quantity" | "uri" | "special"
        documentation?: string
      }>
    }>
    operation?: Array<{
      name: string
      definition: FhirUri
      documentation?: string
    }>
  }>
}
