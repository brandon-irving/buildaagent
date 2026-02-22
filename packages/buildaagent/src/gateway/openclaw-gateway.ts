/**
 * OpenClawGateway - Integration with OpenClaw agents
 * 
 * Communicates with OpenClaw agents using the CLI instead of managing sessions directly.
 * Uses the `openclaw agent` command for simple message/response patterns.
 */

import { AgentGateway, HealthCheckResult } from './agent-gateway'
import { Logger } from '../core/logger'

export interface OpenClawConfig {
  gatewayUrl?: string // Not needed for CLI, but kept for config compatibility  
  agentId?: string
  model?: string
  sessionPrefix?: string
}

export class OpenClawGateway implements AgentGateway {
  constructor(
    private config: OpenClawConfig,
    private logger: Logger
  ) {}

  async generateResponse(context: string, userId: string): Promise<string> {
    const agentId = this.config.agentId || 'main'
    
    this.logger.debug(`Sending message to OpenClaw agent: ${agentId} for user: ${userId}`)

    try {
      // Use OpenClaw CLI to send message to agent
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)

      // Create a consistent session identifier for each user
      const sessionId = `buildaagent-${userId}`
      
      const command = `openclaw agent --agent "${agentId}" --session-id "${sessionId}" --message "${context.replace(/"/g, '\\"')}" --json --timeout 30`
      
      this.logger.debug(`OpenClaw command: ${command}`)
      
      const { stdout, stderr } = await execAsync(command)
      
      if (stderr) {
        this.logger.warn(`OpenClaw CLI stderr: ${stderr}`)
      }

      if (stdout.trim()) {
        // Parse the JSON response
        try {
          const data = JSON.parse(stdout)
          
          // Extract the response from OpenClaw's JSON output
          if (data.response) {
            return data.response
          } else if (data.message) {
            return data.message
          } else if (data.content) {
            return data.content
          } else {
            // Fallback to raw output
            return stdout.trim()
          }
        } catch (parseError) {
          this.logger.warn('Failed to parse OpenClaw response as JSON, using raw output')
          return stdout.trim()
        }
      } else {
        throw new Error('No response from OpenClaw agent')
      }
    } catch (error: any) {
      this.logger.error(`OpenClaw CLI error for user ${userId}:`, error)
      throw new Error(`OpenClaw communication failed: ${error.message}`)
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    try {
      // Test if OpenClaw CLI is available and gateway is running
      const { exec } = await import('child_process')
      const { promisify } = await import('util')
      const execAsync = promisify(exec)

      const { stdout } = await execAsync('openclaw status')
      
      // If we can run openclaw status without error, it's healthy
      const isHealthy = stdout.includes('Gateway') && !stdout.includes('unreachable')
      
      return {
        healthy: isHealthy,
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
}