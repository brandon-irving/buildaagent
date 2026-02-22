/**
 * TokenStore - Secure encrypted storage for OAuth tokens
 *
 * Uses AES-256-GCM encryption for tokens at rest.
 * Handles automatic token refresh before expiry.
 */

import crypto from 'crypto'
import { Logger } from '../core/logger'
import { OAuthTokens, OAuthTokenEntry } from './gmail/types'

const ALGORITHM = 'aes-256-gcm'
const REFRESH_BUFFER_MS = 5 * 60 * 1000 // 5 minutes before expiry

interface TokenDatabase {
  storeOAuthToken(entry: OAuthTokenEntry): Promise<void>
  getOAuthToken(userId: string, provider: string): Promise<OAuthTokenEntry | null>
  deleteOAuthToken(userId: string, provider: string): Promise<void>
}

export class TokenStore {
  private encryptionKey: Buffer

  constructor(
    private db: TokenDatabase,
    private logger: Logger,
    encryptionKeyHex: string
  ) {
    if (!encryptionKeyHex || encryptionKeyHex.length !== 64) {
      throw new Error('TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)')
    }
    this.encryptionKey = Buffer.from(encryptionKeyHex, 'hex')
  }

  private encrypt(plaintext: string): { ciphertext: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(12)
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv)
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    const authTag = cipher.getAuthTag().toString('hex')
    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      authTag
    }
  }

  private decrypt(ciphertext: string, ivHex: string, authTagHex: string): string {
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, this.encryptionKey, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  }

  async storeTokens(userId: string, provider: string, tokens: OAuthTokens): Promise<void> {
    this.logger.info(`[TokenStore] storeTokens called: userId="${userId}" provider="${provider}" email=${tokens.email}`)
    this.logger.info(`[TokenStore]   accessToken length=${tokens.accessToken.length} refreshToken length=${tokens.refreshToken.length}`)
    this.logger.info(`[TokenStore]   expiresAt=${new Date(tokens.expiresAt).toISOString()} (in ${Math.round((tokens.expiresAt - Date.now()) / 1000)}s)`)

    const accessEncrypted = this.encrypt(tokens.accessToken)
    const refreshEncrypted = this.encrypt(tokens.refreshToken)

    this.logger.info(`[TokenStore]   encrypted accessToken ciphertext length=${accessEncrypted.ciphertext.length}`)
    this.logger.info(`[TokenStore]   encrypted refreshToken ciphertext length=${refreshEncrypted.ciphertext.length}`)

    const entry: OAuthTokenEntry = {
      userId,
      provider,
      accessTokenEncrypted: accessEncrypted.ciphertext,
      iv: accessEncrypted.iv,
      authTag: accessEncrypted.authTag,
      refreshTokenEncrypted: refreshEncrypted.ciphertext,
      refreshIv: refreshEncrypted.iv,
      refreshAuthTag: refreshEncrypted.authTag,
      expiresAt: tokens.expiresAt,
      scope: tokens.scope,
      email: tokens.email
    }

    await this.db.storeOAuthToken(entry)
    this.logger.info(`[TokenStore] storeTokens completed successfully for userId="${userId}" provider="${provider}"`)
  }

  async getValidAccessToken(userId: string, provider: string): Promise<string | null> {
    this.logger.info(`[TokenStore] getValidAccessToken called: userId="${userId}" provider="${provider}"`)

    const entry = await this.db.getOAuthToken(userId, provider)
    if (!entry) {
      this.logger.info(`[TokenStore] getValidAccessToken: NO TOKEN FOUND for userId="${userId}" provider="${provider}"`)
      return null
    }

    const now = Date.now()
    const expiresIn = entry.expiresAt - now
    const needsRefresh = expiresIn < REFRESH_BUFFER_MS

    this.logger.info(`[TokenStore] getValidAccessToken: found token email=${entry.email} expiresIn=${Math.round(expiresIn / 1000)}s needsRefresh=${needsRefresh}`)

    if (needsRefresh) {
      this.logger.info(`[TokenStore] Token near expiry for user ${userId}, refreshing...`)
      try {
        const refreshToken = this.decrypt(
          entry.refreshTokenEncrypted,
          entry.refreshIv,
          entry.refreshAuthTag
        )
        this.logger.info(`[TokenStore] Refresh token decrypted successfully (length=${refreshToken.length})`)

        const newTokens = await this.refreshAccessToken(refreshToken, entry.email, entry.scope)
        if (!newTokens) {
          this.logger.error(`[TokenStore] Token refresh FAILED for userId="${userId}" — returning null`)
          return null
        }

        this.logger.info(`[TokenStore] Token refresh succeeded, storing new tokens`)
        await this.storeTokens(userId, provider, newTokens)
        return newTokens.accessToken
      } catch (error: any) {
        this.logger.error(`[TokenStore] Decrypt/refresh error for userId="${userId}": ${error.message}`)
        return null
      }
    }

    try {
      const accessToken = this.decrypt(entry.accessTokenEncrypted, entry.iv, entry.authTag)
      this.logger.info(`[TokenStore] Access token decrypted successfully (length=${accessToken.length})`)
      return accessToken
    } catch (error: any) {
      this.logger.error(`[TokenStore] Access token decrypt FAILED for userId="${userId}": ${error.message}`)
      return null
    }
  }

  async hasValidConnection(userId: string, provider: string): Promise<boolean> {
    this.logger.info(`[TokenStore] hasValidConnection called: userId="${userId}" provider="${provider}"`)
    const entry = await this.db.getOAuthToken(userId, provider)
    const connected = entry !== null
    this.logger.info(`[TokenStore] hasValidConnection: ${connected}`)
    return connected
  }

  async getConnectionEmail(userId: string, provider: string): Promise<string | null> {
    const entry = await this.db.getOAuthToken(userId, provider)
    const email = entry?.email ?? null
    this.logger.info(`[TokenStore] getConnectionEmail: userId="${userId}" provider="${provider}" → ${email}`)
    return email
  }

  async deleteTokens(userId: string, provider: string): Promise<void> {
    this.logger.info(`[TokenStore] deleteTokens called: userId="${userId}" provider="${provider}"`)
    const entry = await this.db.getOAuthToken(userId, provider)
    if (entry) {
      // Try to revoke the token at Google
      try {
        const accessToken = this.decrypt(entry.accessTokenEncrypted, entry.iv, entry.authTag)
        await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        })
        this.logger.info(`[TokenStore] Revoked OAuth token at Google for user ${userId}`)
      } catch (error) {
        this.logger.warn(`[TokenStore] Failed to revoke token at Google (continuing with local delete):`, error)
      }
    } else {
      this.logger.warn(`[TokenStore] deleteTokens: no token found to delete for userId="${userId}" provider="${provider}"`)
    }

    await this.db.deleteOAuthToken(userId, provider)
    this.logger.info(`[TokenStore] deleteTokens completed for userId="${userId}" provider="${provider}"`)
  }

  private async refreshAccessToken(
    refreshToken: string,
    email: string,
    scope: string
  ): Promise<OAuthTokens | null> {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET

      if (!clientId || !clientSecret) {
        this.logger.error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET for token refresh')
        return null
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token'
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        this.logger.error(`Token refresh failed: ${response.status} ${errorText}`)
        return null
      }

      const data = await response.json() as {
        access_token: string
        expires_in: number
        scope?: string
      }

      return {
        accessToken: data.access_token,
        refreshToken, // Google doesn't always return a new refresh token
        expiresAt: Date.now() + data.expires_in * 1000,
        scope: data.scope || scope,
        email
      }
    } catch (error) {
      this.logger.error('Token refresh error:', error)
      return null
    }
  }
}
