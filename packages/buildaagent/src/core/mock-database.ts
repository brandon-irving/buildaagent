/**
 * MockDatabase - In-memory database for Phase 1 testing
 * 
 * Simulates database functionality without SQLite dependency
 * Good enough for initial testing and mobile app integration
 */

import { Logger } from './logger'

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
  private logger: Logger
  private firstRun = true

  constructor(
    private tenantId: string,
    private workspacePath: string
  ) {
    this.logger = new Logger('info')
  }

  async init(): Promise<void> {
    this.logger.info(`✅ Mock database initialized for tenant: ${this.tenantId}`)
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

  async close(): Promise<void> {
    this.logger.info('Mock database connection closed')
  }
}