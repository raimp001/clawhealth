import crypto from "node:crypto"

export type AdminReviewDecision = "approved" | "rejected"

interface TokenPayload {
  applicationId: string
  decision: AdminReviewDecision
  exp: number
}

function getSecret(): string {
  const secret = process.env.OPENRX_ADMIN_REVIEW_SECRET
  if (secret) return secret
  if (process.env.NODE_ENV === "production") {
    throw new Error("OPENRX_ADMIN_REVIEW_SECRET is required in production.")
  }
  return "openrx-dev-review-secret"
}

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url")
}

function decodeBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8")
}

function signValue(value: string): string {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url")
}

export function createAdminReviewToken(input: {
  applicationId: string
  decision: AdminReviewDecision
  expiresMinutes?: number
}): string {
  const expiresMinutes = input.expiresMinutes ?? 60 * 72
  const payload: TokenPayload = {
    applicationId: input.applicationId,
    decision: input.decision,
    exp: Date.now() + expiresMinutes * 60 * 1000,
  }
  const payloadEncoded = encodeBase64Url(JSON.stringify(payload))
  const signature = signValue(payloadEncoded)
  return `${payloadEncoded}.${signature}`
}

export function verifyAdminReviewToken(token: string): TokenPayload {
  const [payloadEncoded, signature] = token.split(".")
  if (!payloadEncoded || !signature) {
    throw new Error("Invalid token format.")
  }

  const expected = signValue(payloadEncoded)
  const providedBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid token signature.")
  }

  const payload = JSON.parse(decodeBase64Url(payloadEncoded)) as Partial<TokenPayload>
  if (!payload.applicationId || !payload.decision || !payload.exp) {
    throw new Error("Invalid token payload.")
  }
  if (payload.decision !== "approved" && payload.decision !== "rejected") {
    throw new Error("Invalid token decision.")
  }
  if (Date.now() > payload.exp) {
    throw new Error("Token expired.")
  }

  return payload as TokenPayload
}
