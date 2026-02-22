/**
 * Gmail Integration Types
 *
 * Type definitions for OAuth tokens, email data, and Gmail API interactions
 */

export interface OAuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number // Unix timestamp in ms
  scope: string
  email: string
}

export interface EmailSummary {
  id: string
  threadId: string
  from: string
  to: string
  subject: string
  snippet: string
  date: string
  isUnread: boolean
  labels: string[]
}

export interface EmailDetail extends EmailSummary {
  body: string
  attachments: Array<{
    filename: string
    mimeType: string
    size: number
  }>
}

export interface SendEmailParams {
  to: string
  subject: string
  body: string
  cc?: string
  replyToThreadId?: string
}

export interface GmailLabel {
  id: string
  name: string
  type: 'system' | 'user'
}

export interface OAuthTokenEntry {
  userId: string
  provider: string
  accessTokenEncrypted: string
  refreshTokenEncrypted: string
  expiresAt: number
  scope: string
  email: string
  iv: string // initialization vector for AES-GCM
  authTag: string // authentication tag for AES-GCM
  refreshIv: string
  refreshAuthTag: string
}
