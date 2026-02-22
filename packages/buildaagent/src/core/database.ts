/**
 * Database - Simple SQLite database for conversation storage and tenant data
 * 
 * Stores conversation history, user preferences, and runtime state
 * Each tenant can have isolated database or shared with proper isolation
 */

import Database from 'better-sqlite3'
import { Logger } from './logger'
import { OAuthTokenEntry } from '../services/gmail/types'

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

export class Database {
  private db: any | null = null
  private logger: Logger

  constructor(
    private tenantId: string,
    private workspacePath: string
  ) {
    this.logger = new Logger('info')
  }

  async init(): Promise<void> {
    try {
      const path = await import('path')
      const fs = await import('fs/promises')
      
      // Ensure workspace directory exists
      const dbDir = path.join(this.workspacePath, 'database')
      await fs.mkdir(dbDir, { recursive: true })
      
      const dbPath = path.join(dbDir, `${this.tenantId}.db`)
      
      this.db = new Database(dbPath)
      
      // Enable WAL mode for better concurrent access (skip for now)
      // this.db.pragma('journal_mode = WAL')
      
      // Create tables
      this.createTables()
      
      this.logger.info(`✅ Database initialized: ${dbPath}`)
    } catch (error) {
      this.logger.error('Failed to initialize database:', error)
      throw error
    }
  }

  private createTables(): void {
    if (!this.db) return

    // Conversations table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        user_message TEXT NOT NULL,
        agent_response TEXT NOT NULL,
        persona TEXT NOT NULL,
        skill_used TEXT,
        timestamp TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // User preferences table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, key)
      )
    `)

    // Runtime state table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS runtime_state (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // OAuth tokens table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_tokens (
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        access_token_encrypted TEXT NOT NULL,
        iv TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        refresh_token_encrypted TEXT NOT NULL,
        refresh_iv TEXT NOT NULL,
        refresh_auth_tag TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        scope TEXT NOT NULL,
        email TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, provider)
      )
    `)

    // Create indexes
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)`)
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp)`)
    this.db.exec(`CREATE INDEX IF NOT EXISTS idx_conversations_persona ON conversations(persona)`)
  }

  async storeConversation(entry: ConversationEntry): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const stmt = this.db.prepare(`
        INSERT INTO conversations (user_id, user_message, agent_response, persona, skill_used, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        entry.userId,
        entry.userMessage,
        entry.agentResponse,
        entry.persona,
        entry.skillUsed || null,
        entry.timestamp
      )

      this.logger.debug('Stored conversation', {
        userId: entry.userId,
        persona: entry.persona,
        skillUsed: entry.skillUsed
      })
    } catch (error) {
      this.logger.error('Failed to store conversation:', error)
      throw error
    }
  }

  async getConversationHistory(userId: string, limit: number = 50): Promise<ConversationEntry[]> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const stmt = this.db.prepare(`
        SELECT user_id, user_message, agent_response, persona, skill_used, timestamp
        FROM conversations
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT ?
      `)

      const rows = stmt.all(userId, limit) as any[]
      
      return rows.map(row => ({
        userId: row.user_id,
        userMessage: row.user_message,
        agentResponse: row.agent_response,
        persona: row.persona,
        skillUsed: row.skill_used,
        timestamp: row.timestamp
      }))
    } catch (error) {
      this.logger.error('Failed to get conversation history:', error)
      throw error
    }
  }

  async setUserPreference(userId: string, key: string, value: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO user_preferences (user_id, key, value)
        VALUES (?, ?, ?)
      `)

      stmt.run(userId, key, value)
      
      this.logger.debug('Set user preference', { userId, key })
    } catch (error) {
      this.logger.error('Failed to set user preference:', error)
      throw error
    }
  }

  async getUserPreference(userId: string, key: string): Promise<string | null> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const stmt = this.db.prepare(`
        SELECT value FROM user_preferences
        WHERE user_id = ? AND key = ?
      `)

      const row = stmt.get(userId, key) as any
      return row ? row.value : null
    } catch (error) {
      this.logger.error('Failed to get user preference:', error)
      throw error
    }
  }

  async setState(key: string, value: string): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO runtime_state (key, value)
        VALUES (?, ?)
      `)

      stmt.run(key, value)
    } catch (error) {
      this.logger.error('Failed to set state:', error)
      throw error
    }
  }

  async getState(key: string): Promise<string | null> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const stmt = this.db.prepare(`
        SELECT value FROM runtime_state WHERE key = ?
      `)

      const row = stmt.get(key) as any
      return row ? row.value : null
    } catch (error) {
      this.logger.error('Failed to get state:', error)
      throw error
    }
  }

  async isFirstRun(): Promise<boolean> {
    const firstRunFlag = await this.getState('first_run_completed')
    
    if (!firstRunFlag) {
      await this.setState('first_run_completed', 'true')
      return true
    }
    
    return false
  }

  async ping(): Promise<boolean> {
    if (!this.db) {
      return false
    }

    try {
      const stmt = this.db.prepare('SELECT 1')
      stmt.get()
      return true
    } catch (error) {
      this.logger.error('Database ping failed:', error)
      return false
    }
  }

  async getStats(): Promise<{ conversations: number, users: number }> {
    if (!this.db) {
      throw new Error('Database not initialized')
    }

    try {
      const conversationCount = this.db.prepare('SELECT COUNT(*) as count FROM conversations').get() as any
      const userCount = this.db.prepare('SELECT COUNT(DISTINCT user_id) as count FROM conversations').get() as any
      
      return {
        conversations: conversationCount.count,
        users: userCount.count
      }
    } catch (error) {
      this.logger.error('Failed to get database stats:', error)
      return { conversations: 0, users: 0 }
    }
  }

  // --- OAuth Token Methods ---

  async storeOAuthToken(entry: OAuthTokenEntry): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    try {
      const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO oauth_tokens
          (user_id, provider, access_token_encrypted, iv, auth_tag,
           refresh_token_encrypted, refresh_iv, refresh_auth_tag,
           expires_at, scope, email)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      stmt.run(
        entry.userId,
        entry.provider,
        entry.accessTokenEncrypted,
        entry.iv,
        entry.authTag,
        entry.refreshTokenEncrypted,
        entry.refreshIv,
        entry.refreshAuthTag,
        entry.expiresAt,
        entry.scope,
        entry.email
      )

      this.logger.debug('Stored OAuth token', { userId: entry.userId, provider: entry.provider })
    } catch (error) {
      this.logger.error('Failed to store OAuth token:', error)
      throw error
    }
  }

  async getOAuthToken(userId: string, provider: string): Promise<OAuthTokenEntry | null> {
    if (!this.db) throw new Error('Database not initialized')

    try {
      const stmt = this.db.prepare(`
        SELECT user_id, provider, access_token_encrypted, iv, auth_tag,
               refresh_token_encrypted, refresh_iv, refresh_auth_tag,
               expires_at, scope, email
        FROM oauth_tokens
        WHERE user_id = ? AND provider = ?
      `)

      const row = stmt.get(userId, provider) as any
      if (!row) return null

      return {
        userId: row.user_id,
        provider: row.provider,
        accessTokenEncrypted: row.access_token_encrypted,
        iv: row.iv,
        authTag: row.auth_tag,
        refreshTokenEncrypted: row.refresh_token_encrypted,
        refreshIv: row.refresh_iv,
        refreshAuthTag: row.refresh_auth_tag,
        expiresAt: row.expires_at,
        scope: row.scope,
        email: row.email
      }
    } catch (error) {
      this.logger.error('Failed to get OAuth token:', error)
      throw error
    }
  }

  async deleteOAuthToken(userId: string, provider: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized')

    try {
      const stmt = this.db.prepare(`DELETE FROM oauth_tokens WHERE user_id = ? AND provider = ?`)
      stmt.run(userId, provider)
      this.logger.debug('Deleted OAuth token', { userId, provider })
    } catch (error) {
      this.logger.error('Failed to delete OAuth token:', error)
      throw error
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close()
      this.db = null
      this.logger.info('Database connection closed')
    }
  }
}