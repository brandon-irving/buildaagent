/**
 * MockDatabase - In-memory database for Phase 1 testing
 *
 * Simulates database functionality without SQLite dependency
 * Good enough for initial testing and mobile app integration
 *
 * Supports optional disk persistence for OAuth tokens via PERSIST_OAUTH_TOKENS=true
 */

import { Logger } from './logger'
import { OAuthTokenEntry } from '../services/gmail/types'
import fs from 'fs'
import path from 'path'

export interface ConversationEntry {
  userId: string
  userMessage: string
  agentResponse: string
  persona: string
  skillUsed?: string
  timestamp: string
}

export interface UserPreference {
  userId: string
  key: string
  value: string
}

export class MockDatabase {
  private conversations: ConversationEntry[] = []
  private userPreferences = new Map<string, Map<string, string>>()
  private runtimeState = new Map<string, string>()
  private oauthTokens = new Map<string, OAuthTokenEntry>()
  private logger: Logger
  private firstRun = true
  private tokenPersistPath: string | null = null

  constructor(
    private tenantId: string,
    private workspacePath: string
  ) {
    this.logger = new Logger('info')

    // Optional disk persistence for OAuth tokens (debugging / Phase 1 durability)
    if (process.env.PERSIST_OAUTH_TOKENS === 'true') {
      this.tokenPersistPath = path.join(workspacePath, '.oauth-tokens.json')
      this.logger.info(`[MockDB] Token disk persistence enabled → ${this.tokenPersistPath}`)
    }
  }

  async init(): Promise<void> {
    // Restore persisted tokens from disk if available
    if (this.tokenPersistPath) {
      await this.loadPersistedTokens()
    }
    this.logger.info(`✅ Mock database initialized for tenant: ${this.tenantId}`)
    this.logger.info(`[MockDB] OAuth token count after init: ${this.oauthTokens.size}`)
    if (this.oauthTokens.size > 0) {
      for (const [key, entry] of this.oauthTokens) {
        this.logger.info(`[MockDB]   token key="${key}" provider=${entry.provider} email=${entry.email} expiresAt=${new Date(entry.expiresAt).toISOString()}`)
      }
    }
  }

  async storeConversation(entry: ConversationEntry): Promise<void> {
    this.conversations.push(entry)
    this.logger.debug('Stored conversation', {
      userId: entry.userId,
      persona: entry.persona,
      skillUsed: entry.skillUsed
    })
  }

  async getConversationHistory(userId: string, limit: number = 50): Promise<ConversationEntry[]> {
    return this.conversations
      .filter(entry => entry.userId === userId)
      .slice(-limit)
      .reverse()
  }

  async setUserPreference(userId: string, key: string, value: string): Promise<void> {
    if (!this.userPreferences.has(userId)) {
      this.userPreferences.set(userId, new Map())
    }
    this.userPreferences.get(userId)!.set(key, value)
    this.logger.debug('Set user preference', { userId, key })
  }

  async getUserPreference(userId: string, key: string): Promise<string | null> {
    const userPrefs = this.userPreferences.get(userId)
    return userPrefs ? userPrefs.get(key) || null : null
  }

  async setState(key: string, value: string): Promise<void> {
    this.runtimeState.set(key, value)
  }

  async getState(key: string): Promise<string | null> {
    return this.runtimeState.get(key) || null
  }

  async isFirstRun(): Promise<boolean> {
    if (this.firstRun) {
      this.firstRun = false
      return true
    }
    return false
  }

  async ping(): Promise<boolean> {
    return true
  }

  async getStats(): Promise<{ conversations: number, users: number }> {
    const uniqueUsers = new Set(this.conversations.map(c => c.userId))
    return {
      conversations: this.conversations.length,
      users: uniqueUsers.size
    }
  }

  // --- OAuth Token Methods ---

  private oauthKey(userId: string, provider: string): string {
    return `${userId}:${provider}`
  }

  async storeOAuthToken(entry: OAuthTokenEntry): Promise<void> {
    const key = this.oauthKey(entry.userId, entry.provider)
    const existed = this.oauthTokens.has(key)

    this.logger.info(`[MockDB] storeOAuthToken: key="${key}" email=${entry.email} expiresAt=${new Date(entry.expiresAt).toISOString()} (${existed ? 'UPDATE' : 'NEW'})`)
    this.logger.info(`[MockDB]   accessTokenEncrypted length=${entry.accessTokenEncrypted.length} iv=${entry.iv.substring(0, 8)}... authTag=${entry.authTag.substring(0, 8)}...`)
    this.logger.info(`[MockDB]   refreshTokenEncrypted length=${entry.refreshTokenEncrypted.length} refreshIv=${entry.refreshIv.substring(0, 8)}...`)

    this.oauthTokens.set(key, entry)

    this.logger.info(`[MockDB]   token map size after store: ${this.oauthTokens.size}`)
    this.logger.info(`[MockDB]   keys in map: [${Array.from(this.oauthTokens.keys()).join(', ')}]`)

    // Persist to disk if enabled
    if (this.tokenPersistPath) {
      await this.persistTokensToDisk()
    }
  }

  async getOAuthToken(userId: string, provider: string): Promise<OAuthTokenEntry | null> {
    const key = this.oauthKey(userId, provider)
    const entry = this.oauthTokens.get(key) || null

    this.logger.info(`[MockDB] getOAuthToken: key="${key}" → ${entry ? 'FOUND' : 'NOT FOUND'}`)
    this.logger.info(`[MockDB]   token map size: ${this.oauthTokens.size}, keys: [${Array.from(this.oauthTokens.keys()).join(', ')}]`)

    if (entry) {
      const expiresIn = entry.expiresAt - Date.now()
      this.logger.info(`[MockDB]   email=${entry.email} expiresIn=${Math.round(expiresIn / 1000)}s (${expiresIn > 0 ? 'VALID' : 'EXPIRED'})`)
    }

    return entry
  }

  async deleteOAuthToken(userId: string, provider: string): Promise<void> {
    const key = this.oauthKey(userId, provider)
    const existed = this.oauthTokens.has(key)

    this.logger.info(`[MockDB] deleteOAuthToken: key="${key}" existed=${existed}`)

    this.oauthTokens.delete(key)

    this.logger.info(`[MockDB]   token map size after delete: ${this.oauthTokens.size}`)

    // Persist to disk if enabled
    if (this.tokenPersistPath) {
      await this.persistTokensToDisk()
    }
  }

  // --- Disk Persistence (optional) ---

  private async persistTokensToDisk(): Promise<void> {
    if (!this.tokenPersistPath) return

    try {
      const data: Record<string, OAuthTokenEntry> = {}
      for (const [key, entry] of this.oauthTokens) {
        data[key] = entry
      }
      fs.writeFileSync(this.tokenPersistPath, JSON.stringify(data, null, 2), 'utf8')
      this.logger.info(`[MockDB] Persisted ${this.oauthTokens.size} token(s) to disk → ${this.tokenPersistPath}`)
    } catch (error: any) {
      this.logger.error(`[MockDB] Failed to persist tokens to disk: ${error.message}`)
    }
  }

  private async loadPersistedTokens(): Promise<void> {
    if (!this.tokenPersistPath) return

    try {
      if (!fs.existsSync(this.tokenPersistPath)) {
        this.logger.info(`[MockDB] No persisted token file found at ${this.tokenPersistPath}`)
        return
      }

      const raw = fs.readFileSync(this.tokenPersistPath, 'utf8')
      const data = JSON.parse(raw) as Record<string, OAuthTokenEntry>
      const keys = Object.keys(data)

      this.logger.info(`[MockDB] Loading ${keys.length} persisted token(s) from disk`)
      for (const [key, entry] of Object.entries(data)) {
        this.oauthTokens.set(key, entry)
        const expiresIn = entry.expiresAt - Date.now()
        this.logger.info(`[MockDB]   restored key="${key}" email=${entry.email} expiresIn=${Math.round(expiresIn / 1000)}s`)
      }
    } catch (error: any) {
      this.logger.error(`[MockDB] Failed to load persisted tokens: ${error.message}`)
    }
  }

  async close(): Promise<void> {
    this.logger.info(`[MockDB] Closing. Token map size: ${this.oauthTokens.size}`)
    // Final persist on close
    if (this.tokenPersistPath) {
      await this.persistTokensToDisk()
    }
    this.logger.info('Mock database connection closed')
  }
}