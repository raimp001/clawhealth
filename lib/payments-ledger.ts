import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const DEFAULT_TREASURY_WALLET = "0x09aeac8822F72AD49676c4DfA38519C98484730c"
const DEFAULT_CURRENCY = "USDC" as const

export type PaymentCategory =
  | "copay"
  | "prescription"
  | "lab"
  | "subscription"
  | "other"

export type PaymentStatus =
  | "initiated"
  | "pending_verification"
  | "verified"
  | "failed"
  | "refunded"

export type RefundStatus = "requested" | "approved" | "sent" | "failed"

export type LedgerDirection = "debit" | "credit" | "memo"

export type LedgerEventType =
  | "payment_intent_created"
  | "payment_verified"
  | "receipt_issued"
  | "attestation_recorded"
  | "refund_requested"
  | "refund_sent"
  | "refund_failed"

export interface PaymentRecord {
  id: string
  intentId: string
  walletAddress: string
  senderAddress?: string
  recipientAddress: string
  category: PaymentCategory
  description: string
  expectedAmount: string
  settledAmount?: string
  currency: typeof DEFAULT_CURRENCY
  txHash?: string
  status: PaymentStatus
  verificationMessage?: string
  metadata?: Record<string, unknown>
  createdAt: string
  verifiedAt?: string
  refundedAmount: string
}

export interface ReceiptLineItem {
  label: string
  amount: string
}

export interface ReceiptRecord {
  id: string
  receiptNumber: string
  paymentId?: string
  refundId?: string
  walletAddress: string
  kind: "payment" | "refund"
  amount: string
  currency: typeof DEFAULT_CURRENCY
  txHash?: string
  issuedAt: string
  lineItems: ReceiptLineItem[]
  complianceHash: string
  attestationId?: string
}

export interface AttestationRecord {
  id: string
  schema: string
  subjectType: "payment" | "receipt" | "refund" | "ledger"
  subjectId: string
  attestor: string
  payloadHash: string
  payload: Record<string, unknown>
  chainTxHash?: string
  createdAt: string
}

export interface RefundRecord {
  id: string
  paymentId: string
  walletAddress: string
  amount: string
  currency: typeof DEFAULT_CURRENCY
  reason: string
  status: RefundStatus
  requestedBy: string
  approvedBy?: string
  txHash?: string
  requestedAt: string
  processedAt?: string
  receiptId?: string
  attestationId?: string
}

export interface LedgerEntry {
  id: string
  eventType: LedgerEventType
  direction: LedgerDirection
  accountCode: string
  amount: string
  currency: typeof DEFAULT_CURRENCY
  description: string
  paymentId?: string
  refundId?: string
  receiptId?: string
  reference?: string
  metadata?: Record<string, unknown>
  createdAt: string
}

interface BasePayStatus {
  status: "completed" | "pending" | "failed" | "not_found"
  id: string
  message?: string
  sender?: string
  amount?: string
  recipient?: string
  error?: unknown
}

interface LedgerStore {
  payments: PaymentRecord[]
  receipts: ReceiptRecord[]
  attestations: AttestationRecord[]
  refunds: RefundRecord[]
  entries: LedgerEntry[]
  serial: number
}

const LEDGER_FILE = process.env.OPENRX_LEDGER_PATH || path.join(process.cwd(), ".openrx-ledger.json")

export interface PaymentIntentInput {
  walletAddress: string
  amount: string
  category?: PaymentCategory
  description?: string
  recipientAddress?: string
  metadata?: Record<string, unknown>
}

export interface VerifyPaymentInput {
  paymentId?: string
  intentId?: string
  txHash: string
  walletAddress: string
  expectedAmount?: string
  expectedRecipient?: string
  testnet?: boolean
}

export interface RequestRefundInput {
  paymentId: string
  amount: string
  reason: string
  requestedBy: string
}

export interface FinalizeRefundInput {
  refundId: string
  status: "sent" | "failed"
  txHash?: string
  approvedBy: string
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizeAddress(address?: string): string {
  return (address || "").toLowerCase()
}

function toAmount(amount: string): string {
  const numeric = Number.parseFloat(amount)
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error("Amount must be a positive decimal number.")
  }
  return numeric.toFixed(2)
}

function hashPayload(payload: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex")
}

function toReceiptNumber(serial: number): string {
  const day = new Date().toISOString().slice(0, 10).replaceAll("-", "")
  return `ORX-${day}-${String(serial).padStart(6, "0")}`
}

function getStore(): LedgerStore {
  const globalStore = globalThis as typeof globalThis & { __openrxLedgerStore?: LedgerStore }
  if (!globalStore.__openrxLedgerStore) {
    globalStore.__openrxLedgerStore = loadPersistedStore() || {
      payments: [],
      receipts: [],
      attestations: [],
      refunds: [],
      entries: [],
      serial: 1,
    }
  }
  return globalStore.__openrxLedgerStore
}

function loadPersistedStore(): LedgerStore | null {
  try {
    if (!fs.existsSync(LEDGER_FILE)) return null
    const raw = fs.readFileSync(LEDGER_FILE, "utf8")
    const parsed = JSON.parse(raw) as LedgerStore
    if (!parsed || typeof parsed !== "object") return null
    return {
      payments: parsed.payments || [],
      receipts: parsed.receipts || [],
      attestations: parsed.attestations || [],
      refunds: parsed.refunds || [],
      entries: parsed.entries || [],
      serial: parsed.serial || 1,
    }
  } catch {
    return null
  }
}

function persistStore(store: LedgerStore): void {
  try {
    fs.writeFileSync(LEDGER_FILE, JSON.stringify(store, null, 2), "utf8")
  } catch {
    // Ignore persistence failures so UI actions still complete.
  }
}

function appendLedgerEntry(
  store: LedgerStore,
  entry: Omit<LedgerEntry, "id" | "createdAt">
): LedgerEntry {
  const next: LedgerEntry = {
    id: createId("led"),
    createdAt: new Date().toISOString(),
    ...entry,
  }
  store.entries.unshift(next)
  return next
}

export function createAttestation(params: {
  schema: string
  subjectType: AttestationRecord["subjectType"]
  subjectId: string
  attestor: string
  payload: Record<string, unknown>
  chainTxHash?: string
}): AttestationRecord {
  const store = getStore()
  const payloadHash = hashPayload(params.payload)
  const attestation: AttestationRecord = {
    id: createId("att"),
    schema: params.schema,
    subjectType: params.subjectType,
    subjectId: params.subjectId,
    attestor: params.attestor,
    payloadHash,
    payload: params.payload,
    chainTxHash: params.chainTxHash,
    createdAt: new Date().toISOString(),
  }
  store.attestations.unshift(attestation)

  appendLedgerEntry(store, {
    eventType: "attestation_recorded",
    direction: "memo",
    accountCode: "9990-COMPLIANCE",
    amount: "0.00",
    currency: DEFAULT_CURRENCY,
    description: `Attestation ${params.schema} created`,
    reference: attestation.id,
    metadata: {
      subjectType: attestation.subjectType,
      subjectId: attestation.subjectId,
      payloadHash: attestation.payloadHash,
    },
  })

  persistStore(store)
  return attestation
}

export function createPaymentIntent(input: PaymentIntentInput): PaymentRecord {
  const store = getStore()
  const expectedAmount = toAmount(input.amount)
  const walletAddress = input.walletAddress.toLowerCase()
  const payment: PaymentRecord = {
    id: createId("pay"),
    intentId: createId("intent"),
    walletAddress,
    recipientAddress: input.recipientAddress || process.env.OPENRX_TREASURY_WALLET || DEFAULT_TREASURY_WALLET,
    category: input.category || "other",
    description: input.description || "OpenRx healthcare charge",
    expectedAmount,
    currency: DEFAULT_CURRENCY,
    status: "initiated",
    metadata: input.metadata,
    createdAt: new Date().toISOString(),
    refundedAmount: "0.00",
  }
  store.payments.unshift(payment)

  appendLedgerEntry(store, {
    eventType: "payment_intent_created",
    direction: "memo",
    accountCode: "1200-PATIENT-AR",
    amount: payment.expectedAmount,
    currency: payment.currency,
    description: `Payment intent created for ${payment.category}`,
    paymentId: payment.id,
    reference: payment.intentId,
    metadata: {
      recipientAddress: payment.recipientAddress,
      walletAddress: payment.walletAddress,
    },
  })

  persistStore(store)
  return payment
}

async function resolveBasePaymentStatus(params: {
  txHash: string
  testnet?: boolean
}): Promise<BasePayStatus> {
  const txHash = params.txHash.trim()
  if (txHash.startsWith("demo-")) {
    return {
      status: "completed",
      id: txHash,
      amount: "10.00",
      recipient: process.env.OPENRX_TREASURY_WALLET || DEFAULT_TREASURY_WALLET,
      sender: "0x000000000000000000000000000000000000dEaD",
      message: "Demo verification completed",
    }
  }

  const { getPaymentStatus } = await import("@base-org/account")
  const response = (await getPaymentStatus({
    id: txHash,
    testnet: params.testnet ?? false,
  })) as BasePayStatus
  return response
}

function createReceiptForPayment(store: LedgerStore, payment: PaymentRecord): ReceiptRecord {
  const existing = store.receipts.find((receipt) => receipt.paymentId === payment.id && receipt.kind === "payment")
  if (existing) return existing

  const receiptPayload = {
    paymentId: payment.id,
    txHash: payment.txHash,
    amount: payment.settledAmount || payment.expectedAmount,
    walletAddress: payment.walletAddress,
    recipientAddress: payment.recipientAddress,
    verifiedAt: payment.verifiedAt,
  }

  const receipt: ReceiptRecord = {
    id: createId("rct"),
    receiptNumber: toReceiptNumber(store.serial++),
    paymentId: payment.id,
    walletAddress: payment.walletAddress,
    kind: "payment",
    amount: payment.settledAmount || payment.expectedAmount,
    currency: payment.currency,
    txHash: payment.txHash,
    issuedAt: new Date().toISOString(),
    lineItems: [
      {
        label: payment.description,
        amount: payment.settledAmount || payment.expectedAmount,
      },
    ],
    complianceHash: hashPayload(receiptPayload),
  }
  store.receipts.unshift(receipt)

  appendLedgerEntry(store, {
    eventType: "receipt_issued",
    direction: "memo",
    accountCode: "9990-COMPLIANCE",
    amount: "0.00",
    currency: DEFAULT_CURRENCY,
    description: "Payment receipt issued",
    paymentId: payment.id,
    receiptId: receipt.id,
    reference: receipt.receiptNumber,
  })

  return receipt
}

function createReceiptForRefund(store: LedgerStore, refund: RefundRecord): ReceiptRecord {
  const existing = store.receipts.find((receipt) => receipt.refundId === refund.id && receipt.kind === "refund")
  if (existing) return existing

  const receiptPayload = {
    refundId: refund.id,
    paymentId: refund.paymentId,
    txHash: refund.txHash,
    amount: refund.amount,
    walletAddress: refund.walletAddress,
    reason: refund.reason,
    processedAt: refund.processedAt,
  }

  const receipt: ReceiptRecord = {
    id: createId("rct"),
    receiptNumber: toReceiptNumber(store.serial++),
    paymentId: refund.paymentId,
    refundId: refund.id,
    walletAddress: refund.walletAddress,
    kind: "refund",
    amount: refund.amount,
    currency: refund.currency,
    txHash: refund.txHash,
    issuedAt: new Date().toISOString(),
    lineItems: [
      {
        label: `Refund: ${refund.reason}`,
        amount: refund.amount,
      },
    ],
    complianceHash: hashPayload(receiptPayload),
  }
  store.receipts.unshift(receipt)

  appendLedgerEntry(store, {
    eventType: "receipt_issued",
    direction: "memo",
    accountCode: "9990-COMPLIANCE",
    amount: "0.00",
    currency: DEFAULT_CURRENCY,
    description: "Refund receipt issued",
    paymentId: refund.paymentId,
    refundId: refund.id,
    receiptId: receipt.id,
    reference: receipt.receiptNumber,
  })

  return receipt
}

export async function verifyAndRecordPayment(input: VerifyPaymentInput): Promise<{
  payment: PaymentRecord
  receipt?: ReceiptRecord
  attestation?: AttestationRecord
  status: BasePayStatus["status"]
}> {
  const store = getStore()
  const walletAddress = input.walletAddress.toLowerCase()

  let payment =
    (input.paymentId ? store.payments.find((candidate) => candidate.id === input.paymentId) : undefined) ||
    (input.intentId ? store.payments.find((candidate) => candidate.intentId === input.intentId) : undefined)

  if (!payment) {
    payment = createPaymentIntent({
      walletAddress,
      amount: input.expectedAmount || "0.01",
      description: "Ad-hoc verification",
      category: "other",
      recipientAddress: input.expectedRecipient,
    })
  }

  if (payment.status === "verified" && payment.txHash === input.txHash) {
    const existingReceipt = store.receipts.find((receipt) => receipt.paymentId === payment!.id)
    const existingAttestation = store.attestations.find(
      (attestation) => attestation.subjectType === "payment" && attestation.subjectId === payment!.id
    )
    return {
      payment,
      receipt: existingReceipt,
      attestation: existingAttestation,
      status: "completed",
    }
  }

  const status = await resolveBasePaymentStatus({
    txHash: input.txHash,
    testnet: input.testnet,
  })

  payment.txHash = input.txHash
  payment.status = status.status === "completed" ? "verified" : status.status === "failed" ? "failed" : "pending_verification"
  payment.verificationMessage = status.message
  payment.senderAddress = status.sender

  if (status.status !== "completed") {
    persistStore(store)
    return {
      payment,
      status: status.status,
    }
  }

  const settledAmount = toAmount(status.amount || payment.expectedAmount)
  const expectedAmount = toAmount(input.expectedAmount || payment.expectedAmount)
  const expectedRecipient = normalizeAddress(input.expectedRecipient || payment.recipientAddress)
  const actualRecipient = normalizeAddress(status.recipient)
  const senderAddress = normalizeAddress(status.sender)

  if (settledAmount !== expectedAmount) {
    payment.status = "failed"
    payment.verificationMessage = "Amount mismatch detected during verification."
    return {
      payment,
      status: "failed",
    }
  }
  if (actualRecipient !== expectedRecipient) {
    payment.status = "failed"
    payment.verificationMessage = "Recipient mismatch detected during verification."
    return {
      payment,
      status: "failed",
    }
  }
  if (senderAddress && senderAddress !== normalizeAddress(walletAddress)) {
    payment.status = "failed"
    payment.verificationMessage = "Sender mismatch detected during verification."
    return {
      payment,
      status: "failed",
    }
  }

  payment.status = "verified"
  payment.settledAmount = settledAmount
  payment.verifiedAt = new Date().toISOString()
  payment.walletAddress = walletAddress

  const alreadyBooked = store.entries.some(
    (entry) =>
      entry.eventType === "payment_verified" &&
      entry.reference === payment!.txHash &&
      entry.paymentId === payment!.id
  )

  if (!alreadyBooked) {
    appendLedgerEntry(store, {
      eventType: "payment_verified",
      direction: "debit",
      accountCode: "1010-CASH-USDC",
      amount: settledAmount,
      currency: DEFAULT_CURRENCY,
      description: `USDC settled for ${payment.category}`,
      paymentId: payment.id,
      reference: payment.txHash,
    })
    appendLedgerEntry(store, {
      eventType: "payment_verified",
      direction: "credit",
      accountCode: "1200-PATIENT-AR",
      amount: settledAmount,
      currency: DEFAULT_CURRENCY,
      description: `Receivable cleared for ${payment.category}`,
      paymentId: payment.id,
      reference: payment.txHash,
    })
  }

  const receipt = createReceiptForPayment(store, payment)
  const attestation = createAttestation({
    schema: "openrx.payment.verification.v1",
    subjectType: "payment",
    subjectId: payment.id,
    attestor: "openrx-verifier",
    payload: {
      paymentId: payment.id,
      txHash: payment.txHash,
      senderAddress: payment.senderAddress,
      recipientAddress: payment.recipientAddress,
      amount: payment.settledAmount,
      walletAddress: payment.walletAddress,
      verifiedAt: payment.verifiedAt,
    },
  })
  receipt.attestationId = attestation.id
  persistStore(store)

  return {
    payment,
    receipt,
    attestation,
    status: "completed",
  }
}

export function requestRefund(input: RequestRefundInput): RefundRecord {
  const store = getStore()
  const payment = store.payments.find((candidate) => candidate.id === input.paymentId)
  if (!payment) throw new Error("Payment not found.")
  if (payment.status !== "verified" && payment.status !== "refunded") {
    throw new Error("Only verified payments can be refunded.")
  }

  const amount = toAmount(input.amount)
  const settled = Number.parseFloat(payment.settledAmount || payment.expectedAmount)
  const refunded = Number.parseFloat(payment.refundedAmount)
  const requested = Number.parseFloat(amount)

  if (requested + refunded > settled) {
    throw new Error("Refund exceeds remaining settled amount.")
  }

  const refund: RefundRecord = {
    id: createId("ref"),
    paymentId: payment.id,
    walletAddress: payment.walletAddress,
    amount,
    currency: DEFAULT_CURRENCY,
    reason: input.reason,
    status: "requested",
    requestedBy: input.requestedBy,
    requestedAt: new Date().toISOString(),
  }
  store.refunds.unshift(refund)

  appendLedgerEntry(store, {
    eventType: "refund_requested",
    direction: "memo",
    accountCode: "2410-REFUND-LIABILITY",
    amount,
    currency: DEFAULT_CURRENCY,
    description: "Refund requested by user or agent",
    paymentId: payment.id,
    refundId: refund.id,
    reference: refund.id,
  })

  persistStore(store)
  return refund
}

export function finalizeRefund(input: FinalizeRefundInput): {
  refund: RefundRecord
  payment: PaymentRecord
  receipt?: ReceiptRecord
  attestation?: AttestationRecord
} {
  const store = getStore()
  const refund = store.refunds.find((candidate) => candidate.id === input.refundId)
  if (!refund) throw new Error("Refund not found.")

  const payment = store.payments.find((candidate) => candidate.id === refund.paymentId)
  if (!payment) throw new Error("Original payment not found.")

  refund.approvedBy = input.approvedBy
  refund.txHash = input.txHash
  refund.status = input.status
  refund.processedAt = new Date().toISOString()

  if (refund.status === "failed") {
    appendLedgerEntry(store, {
      eventType: "refund_failed",
      direction: "memo",
      accountCode: "2410-REFUND-LIABILITY",
      amount: refund.amount,
      currency: DEFAULT_CURRENCY,
      description: "Refund failed",
      paymentId: payment.id,
      refundId: refund.id,
      reference: refund.txHash || refund.id,
    })
    persistStore(store)
    return { refund, payment }
  }

  appendLedgerEntry(store, {
    eventType: "refund_sent",
    direction: "debit",
    accountCode: "5100-REFUNDS",
    amount: refund.amount,
    currency: DEFAULT_CURRENCY,
    description: "Refund issued to patient wallet",
    paymentId: payment.id,
    refundId: refund.id,
    reference: refund.txHash || refund.id,
  })
  appendLedgerEntry(store, {
    eventType: "refund_sent",
    direction: "credit",
    accountCode: "1010-CASH-USDC",
    amount: refund.amount,
    currency: DEFAULT_CURRENCY,
    description: "USDC outflow for refund",
    paymentId: payment.id,
    refundId: refund.id,
    reference: refund.txHash || refund.id,
  })

  const refundedTotal = (Number.parseFloat(payment.refundedAmount) + Number.parseFloat(refund.amount)).toFixed(2)
  payment.refundedAmount = refundedTotal
  if (Number.parseFloat(refundedTotal) >= Number.parseFloat(payment.settledAmount || payment.expectedAmount)) {
    payment.status = "refunded"
  }

  const receipt = createReceiptForRefund(store, refund)
  const attestation = createAttestation({
    schema: "openrx.refund.settlement.v1",
    subjectType: "refund",
    subjectId: refund.id,
    attestor: "openrx-refund-engine",
    payload: {
      refundId: refund.id,
      paymentId: payment.id,
      amount: refund.amount,
      walletAddress: refund.walletAddress,
      txHash: refund.txHash,
      processedAt: refund.processedAt,
      approvedBy: refund.approvedBy,
    },
    chainTxHash: refund.txHash,
  })
  receipt.attestationId = attestation.id
  refund.receiptId = receipt.id
  refund.attestationId = attestation.id
  persistStore(store)

  return { refund, payment, receipt, attestation }
}

function toAmountNumber(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function getLedgerSnapshot(params?: {
  walletAddress?: string
}): {
  payments: PaymentRecord[]
  receipts: ReceiptRecord[]
  refunds: RefundRecord[]
  attestations: AttestationRecord[]
  entries: LedgerEntry[]
  summary: {
    verifiedVolume: string
    refundedVolume: string
    netSettledVolume: string
    pendingVerificationCount: number
    openRefundCount: number
    receiptCount: number
    attestationCount: number
  }
} {
  const store = getStore()
  const walletAddress = params?.walletAddress ? normalizeAddress(params.walletAddress) : undefined

  const payments = walletAddress
    ? store.payments.filter((payment) => normalizeAddress(payment.walletAddress) === walletAddress)
    : [...store.payments]

  const paymentIds = new Set(payments.map((payment) => payment.id))
  const refunds = walletAddress
    ? store.refunds.filter((refund) => normalizeAddress(refund.walletAddress) === walletAddress)
    : [...store.refunds]
  const refundIds = new Set(refunds.map((refund) => refund.id))
  const receipts = walletAddress
    ? store.receipts.filter(
        (receipt) =>
          normalizeAddress(receipt.walletAddress) === walletAddress ||
          (!!receipt.paymentId && paymentIds.has(receipt.paymentId)) ||
          (!!receipt.refundId && refundIds.has(receipt.refundId))
      )
    : [...store.receipts]

  const receiptIds = new Set(receipts.map((receipt) => receipt.id))
  const attestations = walletAddress
    ? store.attestations.filter((attestation) => {
        if (attestation.subjectType === "payment") return paymentIds.has(attestation.subjectId)
        if (attestation.subjectType === "refund") return refundIds.has(attestation.subjectId)
        if (attestation.subjectType === "receipt") return receiptIds.has(attestation.subjectId)
        return false
      })
    : [...store.attestations]

  const entries = walletAddress
    ? store.entries.filter(
        (entry) =>
          (!!entry.paymentId && paymentIds.has(entry.paymentId)) ||
          (!!entry.refundId && refundIds.has(entry.refundId)) ||
          (!!entry.receiptId && receiptIds.has(entry.receiptId))
      )
    : [...store.entries]

  const verifiedVolume = payments
    .filter((payment) => payment.status === "verified" || payment.status === "refunded")
    .reduce((sum, payment) => sum + toAmountNumber(payment.settledAmount || payment.expectedAmount), 0)
  const refundedVolume = refunds
    .filter((refund) => refund.status === "sent")
    .reduce((sum, refund) => sum + toAmountNumber(refund.amount), 0)

  return {
    payments,
    receipts,
    refunds,
    attestations,
    entries,
    summary: {
      verifiedVolume: verifiedVolume.toFixed(2),
      refundedVolume: refundedVolume.toFixed(2),
      netSettledVolume: (verifiedVolume - refundedVolume).toFixed(2),
      pendingVerificationCount: payments.filter((payment) => payment.status === "pending_verification").length,
      openRefundCount: refunds.filter((refund) => refund.status === "requested" || refund.status === "approved").length,
      receiptCount: receipts.length,
      attestationCount: attestations.length,
    },
  }
}

export function updateRefundApproval(refundId: string, approvedBy: string): RefundRecord {
  const store = getStore()
  const refund = store.refunds.find((candidate) => candidate.id === refundId)
  if (!refund) throw new Error("Refund not found.")
  if (refund.status !== "requested") throw new Error("Refund is not in requested state.")
  refund.status = "approved"
  refund.approvedBy = approvedBy
  persistStore(store)
  return refund
}
