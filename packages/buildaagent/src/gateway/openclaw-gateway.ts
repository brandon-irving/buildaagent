/**
 * OpenClawGateway - Integration with OpenClaw agents
 * 
 * Replaces DirectGateway to communicate with OpenClaw sessions instead of 
 * calling LLM APIs directly. Maps mobile users to OpenClaw agent sessions.
 */

import { AgentGateway, HealthCheckResult } from './agent-gateway'
import { Logger } from '../core/logger'

export interface OpenClawConfig {
  gatewayUrl: string
  agentId?: string
  model?: string
  sessionPrefix?: string
}

export class OpenClawGateway implements AgentGateway {
  private sessions = new Map<string, string>() // userId -> sessionKey

  constructor(
    private config: OpenClawConfig,
    private logger: Logger
  ) {}

  async generateResponse(context: string, userId: string): Promise<string> {
    const sessionKey = await this.getOrCreateSession(userId)
    
    this.logger.debug(`Sending message to OpenClaw session: ${sessionKey}`)

    try {
      const response = await fetch(`${this.config.gatewayUrl}/api/sessions/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionKey,
          message: context,
          timeoutSeconds: 30
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`OpenClaw session error: ${response.status} ${error}`)
      }

      const data = await response.json()
      
      if (data.response) {
        return data.response
      } else {
        throw new Error('No response from OpenClaw agent')
      }
    } catch (error: any) {
      this.logger.error(`OpenClaw gateway error for user ${userId}:`, error)
      throw new Error(`OpenClaw communication failed: ${error.message}`)
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      // Create a controller for timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const response = await fetch(`${this.config.gatewayUrl}/api/health`, {
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        return {
          healthy: false,
          provider: 'openclaw',
          error: `Gateway returned ${response.status}`
        }
      }

      return {
        healthy: true,
        provider: 'openclaw'
      }
    } catch (error: any) {
      return {
        healthy: false,
        provider: 'openclaw',
        error: error.message
      }
    }
  }

  private async getOrCreateSession(userId: string): Promise<string> {
    // Check if we already have a session for this user
    if (this.sessions.has(userId)) {
      const sessionKey = this.sessions.get(userId)!
      
      // Verify session is still active
      if (await this.isSessionActive(sessionKey)) {
        return sessionKey
      } else {
        this.sessions.delete(userId)
      }
    }

    // Create new session
    const sessionKey = await this.createSession(userId)
    this.sessions.set(userId, sessionKey)
    return sessionKey
  }

  private async createSession(userId: string): Promise<string> {
    const sessionLabel = `${this.config.sessionPrefix || 'buildaagent'}-${userId}`
    
    try {
      const response = await fetch(`${this.config.gatewayUrl}/api/sessions/spawn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          task: `You are a helpful assistant for mobile user ${userId}. You have access to Gmail and other integrated services.`,
          label: sessionLabel,
          agentId: this.config.agentId,
          model: this.config.model,
          cleanup: 'keep' // Keep sessions for continuity
        })
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(`Session spawn error: ${response.status} ${error}`)
      }

      const data = await response.json()
      const sessionKey = data.sessionKey

      if (!sessionKey) {
        throw new Error('No session key returned from spawn')
      }

      this.logger.info(`Created OpenClaw session for user ${userId}: ${sessionKey}`)
      return sessionKey

    } catch (error: any) {
      this.logger.error(`Failed to create OpenClaw session for user ${userId}:`, error)
      throw error
    }
  }

  private async isSessionActive(sessionKey: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.gatewayUrl}/api/sessions/list`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'  
        },
        body: JSON.stringify({
          limit: 100
        })
      })

      if (!response.ok) {
        return false
      }

      const data = await response.json()
      const sessions = data.sessions || []
      
      return sessions.some((session: any) => session.sessionKey === sessionKey)
    } catch (error) {
      this.logger.warn(`Failed to check session status for ${sessionKey}:`, error)
      return false
    }
  }

  /**
   * Clean up inactive sessions periodically
   */
  async cleanupSessions(): Promise<void> {
    const activeSessionKeys = []
    
    for (const [userId, sessionKey] of this.sessions.entries()) {
      if (await this.isSessionActive(sessionKey)) {
        activeSessionKeys.push(sessionKey)
      } else {
        this.sessions.delete(userId)
        this.logger.info(`Cleaned up inactive session for user ${userId}`)
      }
    }

    this.logger.debug(`Active sessions: ${activeSessionKeys.length}`)
  }
}