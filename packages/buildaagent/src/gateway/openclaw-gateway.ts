/**
 * OpenClaw Gateway - VPS-Ready Agent Communication
 * 
 * Connects BuildAAgent to OpenClaw agents via OpenAI-compatible HTTP endpoint.
 * Designed for reliable VPS deployment with proper authentication and session management.
 */

import { AgentGateway, HealthCheckResult } from './agent-gateway'
import { Logger } from '../core/logger'

export type TaskType = 'main' | 'coder' | 'marketing'

export interface DelegationResult {
  taskType: TaskType
  agentId: string
  response: string
}

export interface OpenClawConfig {
  gatewayUrl?: string
  agentId?: string
  model?: string
  sessionPrefix?: string
  authToken?: string
  timeout?: number
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export class OpenClawGateway implements AgentGateway {
  private gatewayUrl: string
  private agentId: string
  private authToken?: string
  private timeout: number

  constructor(
    private config: OpenClawConfig,
    private logger: Logger
  ) {
    this.gatewayUrl = config.gatewayUrl || 'http://localhost:18789'
    this.agentId = config.agentId || 'main'
    this.authToken = config.authToken
    this.timeout = config.timeout || 45000
  }

  async generateResponse(message: string, userId: string): Promise<string> {
    this.logger.info(`Sending message to OpenClaw agent: ${this.agentId} for user: ${userId}`)

    if (!this.authToken) {
      throw new Error('Auth token required for OpenClaw OpenAI API')
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    try {
      this.logger.info('Using OpenClaw OpenAI API endpoint')
      
      const response = await fetch(`${this.gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: `openclaw:${this.agentId}`,
          messages: [{ role: 'user', content: message }],
          user: userId // For session persistence
        }),
        signal: controller.signal
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json() as OpenAIResponse
      
      if (data.choices && data.choices.length > 0) {
        const result = data.choices[0].message.content
        this.logger.info(`OpenClaw response received (${result.length} chars)`)
        return result
      } else {
        throw new Error('Unexpected OpenAI response format')
      }
    } catch (error: any) {
      this.logger.error(`OpenClaw OpenAI API error: ${error.message}`)
      throw new Error(`OpenClaw communication failed: ${error.message}`)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  /**
   * Delegate a task to a specialized OpenClaw agent via sessions_spawn.
   * Routes to the appropriate agent based on taskType.
   */
  async delegateToAgent(taskType: TaskType, message: string): Promise<DelegationResult> {
    const agentMap: Record<TaskType, string> = {
      main: this.agentId,
      coder: 'coder',
      marketing: 'marketing'
    }

    const targetAgent = agentMap[taskType]
    console.log(`🔍 DEBUG [delegateToAgent] Entry — taskType: "${taskType}", targetAgent: "${targetAgent}"`)
    console.log(`🔍 DEBUG [delegateToAgent] gatewayUrl: ${this.gatewayUrl}`)
    console.log(`🔍 DEBUG [delegateToAgent] authToken present: ${!!this.authToken}`)
    console.log(`🔍 DEBUG [delegateToAgent] timeout: ${this.timeout}ms`)
    console.log(`🔍 DEBUG [delegateToAgent] message (first 120 chars): "${message.substring(0, 120)}"`)
    this.logger.info(`Delegating "${taskType}" task to agent: ${targetAgent}`)

    if (!this.authToken) {
      console.log(`🔍 DEBUG [delegateToAgent] ABORTING — no auth token!`)
      throw new Error('Auth token required for agent delegation')
    }

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.timeout)

    const requestUrl = `${this.gatewayUrl}/v1/chat/completions`
    const requestBody = {
      model: `openclaw:${targetAgent}`,
      messages: [{ role: 'user', content: message }],
      user: `delegation-${taskType}-${Date.now()}`
    }
    console.log(`🔍 DEBUG [delegateToAgent] Sending POST to: ${requestUrl}`)
    console.log(`🔍 DEBUG [delegateToAgent] Request body model: ${requestBody.model}, user: ${requestBody.user}`)

    try {
      const response = await fetch(requestUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      })

      console.log(`🔍 DEBUG [delegateToAgent] Response status: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        const errorText = await response.text()
        console.log(`🔍 DEBUG [delegateToAgent] HTTP ERROR — ${response.status}: ${errorText}`)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const data = await response.json() as OpenAIResponse
      console.log(`🔍 DEBUG [delegateToAgent] Response parsed — choices count: ${data.choices?.length ?? 0}`)

      if (data.choices && data.choices.length > 0) {
        const result = data.choices[0].message.content
        console.log(`🔍 DEBUG [delegateToAgent] SUCCESS — agent "${targetAgent}" responded (${result.length} chars)`)
        console.log(`🔍 DEBUG [delegateToAgent] Response preview: "${result.substring(0, 150)}"`)
        this.logger.info(`Agent "${targetAgent}" responded (${result.length} chars)`)
        return { taskType, agentId: targetAgent, response: result }
      } else {
        console.log(`🔍 DEBUG [delegateToAgent] UNEXPECTED FORMAT — no choices in response:`, JSON.stringify(data).substring(0, 300))
        throw new Error('Unexpected response format from delegated agent')
      }
    } catch (error: any) {
      console.log(`🔍 DEBUG [delegateToAgent] CATCH — error: ${error.message}`)
      console.log(`🔍 DEBUG [delegateToAgent] Error name: ${error.name}, is AbortError: ${error.name === 'AbortError'}`)
      if (error.name === 'AbortError') {
        console.log(`🔍 DEBUG [delegateToAgent] Request TIMED OUT after ${this.timeout}ms`)
      }
      this.logger.error(`Agent delegation failed (${targetAgent}): ${error.message}`)
      throw new Error(`Delegation to "${targetAgent}" failed: ${error.message}`)
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.authToken) {
      return {
        healthy: false,
        provider: 'openclaw-simple',
        error: 'No auth token'
      }
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)
      
      const response = await fetch(`${this.gatewayUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: `openclaw:${this.agentId}`,
          messages: [{ role: 'user', content: 'health check' }],
          user: 'health-check'
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      return {
        healthy: response.ok,
        provider: 'openclaw-openai-api'
      }
      
    } catch (error: any) {
      return {
        healthy: false,
        provider: 'openclaw-openai-api',
        error: error.message
      }
    }
  }
}