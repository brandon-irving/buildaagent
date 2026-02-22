/**
 * OpenClaw Gateway - VPS-Ready Agent Communication
 *
 * Connects BuildAAgent to OpenClaw agents via OpenAI-compatible HTTP endpoint.
 * Designed for reliable VPS deployment with retry logic, exponential backoff,
 * and proper error categorization for network vs agent issues.
 */

import { AgentGateway, HealthCheckResult } from './agent-gateway'
import { Logger } from '../core/logger'

export type TaskType = 'main' | 'coder' | 'marketing'

export interface DelegationResult {
  taskType: TaskType
  agentId: string
  response: string
}

export interface RetryConfig {
  maxRetries: number
  baseDelayMs: number
  maxDelayMs: number
}

export interface OpenClawConfig {
  gatewayUrl?: string
  agentId?: string
  model?: string
  sessionPrefix?: string
  authToken?: string
  timeout?: number
  retry?: Partial<RetryConfig>
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

const DEFAULT_TIMEOUT = 120_000 // 120s — VPS agents can take time
const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
}

/**
 * Categorize an error to distinguish network/timeout issues from agent-level failures.
 */
function categorizeError(error: any): 'timeout' | 'network' | 'http' | 'agent' {
  if (error.name === 'AbortError') return 'timeout'
  if (error.cause?.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNRESET' ||
      error.cause?.code === 'ENOTFOUND' || error.cause?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
      error.message?.includes('fetch failed')) return 'network'
  if (error.message?.startsWith('HTTP ')) return 'http'
  return 'agent'
}

/**
 * Returns true if the error is transient and worth retrying.
 */
function isRetryable(error: any): boolean {
  const category = categorizeError(error)
  if (category === 'timeout' || category === 'network') return true
  // Retry server errors (5xx) but not client errors (4xx)
  if (category === 'http' && error.message?.match(/^HTTP 5\d\d/)) return true
  return false
}

function buildErrorMessage(error: any, context: string): string {
  const category = categorizeError(error)
  switch (category) {
    case 'timeout':
      return `${context}: Request timed out — the VPS agent may be under heavy load or unreachable. Consider increasing the timeout.`
    case 'network':
      return `${context}: Network error — could not reach the VPS. Check that the gateway URL is correct and the server is running. (${error.message})`
    case 'http': {
      const status = error.message?.match(/^HTTP (\d+)/)?.[1] || 'unknown'
      if (status.startsWith('5')) {
        return `${context}: VPS server error (HTTP ${status}) — the agent gateway encountered an internal error.`
      }
      return `${context}: HTTP ${status} — ${error.message}`
    }
    default:
      return `${context}: ${error.message}`
  }
}

export class OpenClawGateway implements AgentGateway {
  private gatewayUrl: string
  private agentId: string
  private authToken?: string
  private timeout: number
  private retry: RetryConfig

  constructor(
    private config: OpenClawConfig,
    private logger: Logger
  ) {
    this.gatewayUrl = config.gatewayUrl || 'http://localhost:18789'
    this.agentId = config.agentId || 'main'
    this.authToken = config.authToken
    this.timeout = config.timeout || DEFAULT_TIMEOUT
    this.retry = { ...DEFAULT_RETRY, ...config.retry }
  }

  /**
   * Lightweight connectivity check — verifies the VPS is reachable
   * without invoking a full agent response. Uses a short timeout.
   */
  async checkConnection(): Promise<{ reachable: boolean; latencyMs: number; error?: string }> {
    const start = Date.now()
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000)

    try {
      // Try the models endpoint first (lightweight), fall back to a minimal chat request
      const response = await fetch(`${this.gatewayUrl}/v1/models`, {
        method: 'GET',
        headers: this.authToken ? { 'Authorization': `Bearer ${this.authToken}` } : {},
        signal: controller.signal
      })

      const latencyMs = Date.now() - start
      return { reachable: response.ok, latencyMs }
    } catch (error: any) {
      const latencyMs = Date.now() - start
      const category = categorizeError(error)
      const message = category === 'timeout'
        ? `Connection timed out after 10s`
        : `Connection failed: ${error.message}`
      return { reachable: false, latencyMs, error: message }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  async generateResponse(message: string, userId: string): Promise<string> {
    this.logger.info(`Sending message to OpenClaw agent: ${this.agentId} for user: ${userId}`)

    if (!this.authToken) {
      throw new Error('Auth token required for OpenClaw OpenAI API')
    }

    return this.withRetry('generateResponse', async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      try {
        const response = await fetch(`${this.gatewayUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: `openclaw:${this.agentId}`,
            messages: [{ role: 'user', content: message }],
            user: userId
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
      } finally {
        clearTimeout(timeoutId)
      }
    })
  }

  /**
   * Delegate a task to a specialized OpenClaw agent.
   * Includes a pre-flight connection check and retry logic for transient failures.
   */
  async delegateToAgent(taskType: TaskType, message: string): Promise<DelegationResult> {
    const agentMap: Record<TaskType, string> = {
      main: this.agentId,
      coder: 'coder',
      marketing: 'marketing'
    }

    const targetAgent = agentMap[taskType]
    this.logger.info(`Delegating "${taskType}" task to agent: ${targetAgent}`)

    if (!this.authToken) {
      throw new Error('Auth token required for agent delegation')
    }

    // Pre-flight connection check
    const conn = await this.checkConnection()
    if (!conn.reachable) {
      throw new Error(
        `Cannot delegate to "${targetAgent}": VPS is unreachable. ${conn.error || 'Check gateway URL and server status.'}`
      )
    }
    this.logger.info(`VPS connection OK (${conn.latencyMs}ms latency), proceeding with delegation`)

    return this.withRetry(`delegateToAgent(${targetAgent})`, async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.timeout)

      try {
        const response = await fetch(`${this.gatewayUrl}/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: `openclaw:${targetAgent}`,
            messages: [{ role: 'user', content: message }],
            user: `delegation-${taskType}-${Date.now()}`
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
          this.logger.info(`Agent "${targetAgent}" responded (${result.length} chars)`)
          return { taskType, agentId: targetAgent, response: result }
        } else {
          throw new Error('Unexpected response format from delegated agent')
        }
      } finally {
        clearTimeout(timeoutId)
      }
    })
  }

  async healthCheck(): Promise<HealthCheckResult> {
    if (!this.authToken) {
      return {
        healthy: false,
        provider: 'openclaw',
        error: 'No auth token configured'
      }
    }

    // First check basic connectivity
    const conn = await this.checkConnection()
    if (!conn.reachable) {
      return {
        healthy: false,
        provider: 'openclaw',
        error: `VPS unreachable: ${conn.error || 'connection failed'}`
      }
    }

    // Then verify agent responds
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15_000)

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
        provider: 'openclaw',
        ...(response.ok ? {} : { error: `HTTP ${response.status}` })
      }
    } catch (error: any) {
      return {
        healthy: false,
        provider: 'openclaw',
        error: buildErrorMessage(error, 'Health check')
      }
    }
  }

  /**
   * Execute an async operation with retry + exponential backoff.
   * Only retries on transient errors (timeouts, network failures, 5xx).
   */
  private async withRetry<T>(operationName: string, fn: () => Promise<T>): Promise<T> {
    let lastError: any

    for (let attempt = 0; attempt <= this.retry.maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error: any) {
        lastError = error

        if (attempt === this.retry.maxRetries || !isRetryable(error)) {
          break
        }

        const delay = Math.min(
          this.retry.baseDelayMs * Math.pow(2, attempt),
          this.retry.maxDelayMs
        )
        const category = categorizeError(error)
        this.logger.warn(
          `${operationName} failed (${category}, attempt ${attempt + 1}/${this.retry.maxRetries + 1}), retrying in ${delay}ms...`
        )
        await this.sleep(delay)
      }
    }

    throw new Error(buildErrorMessage(lastError, `OpenClaw ${operationName}`))
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
