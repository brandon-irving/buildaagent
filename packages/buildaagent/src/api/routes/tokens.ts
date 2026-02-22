/**
 * Token Bridge API - OAuth Token Access for OpenClaw Agents
 * 
 * Provides secure access to OAuth tokens for OpenClaw agents to use
 * integrated services like Gmail. Only accessible from the configured
 * OpenClaw gateway (not public API).
 */

import { Router, Request, Response } from 'express'
import { TokenStore } from '../../services/token-store'
import { Logger } from '../../core/logger'

export function createTokenBridgeRouter(tokenStore: TokenStore, logger: Logger): Router {
  const router = Router()

  /**
   * GET /api/tokens/:service/access-token?user_id=<id>
   * Get a valid access token for a service (auto-refreshes if needed)
   * This is called by OpenClaw agents to access user's connected services
   */
  router.get('/:service/access-token', async (req: Request, res: Response) => {
    try {
      const service = req.params.service as string
      const userId = req.query.user_id as string

      logger.info(`[TokenBridge] access-token request: service="${service}" user_id="${userId}"`)

      if (!userId) {
        logger.warn(`[TokenBridge] Missing user_id in access-token request`)
        return res.status(400).json({ error: 'Missing required query parameter: user_id' })
      }

      if (!service || !['gmail'].includes(service.toLowerCase())) {
        logger.warn(`[TokenBridge] Unsupported service: "${service}"`)
        return res.status(400).json({ error: `Unsupported service: ${service}` })
      }

      // Check if user has connected this service
      const connected = await tokenStore.hasValidConnection(userId, service)
      logger.info(`[TokenBridge] hasValidConnection(${userId}, ${service}) = ${connected}`)
      if (!connected) {
        logger.warn(`[TokenBridge] Service ${service} NOT connected for user ${userId} — returning 404`)
        return res.status(404).json({ error: `Service ${service} not connected for user ${userId}` })
      }

      // Get a valid access token (auto-refreshes if needed)
      const accessToken = await tokenStore.getValidAccessToken(userId, service)
      if (!accessToken) {
        logger.error(`[TokenBridge] getValidAccessToken returned null for user ${userId} service ${service} — returning 401`)
        return res.status(401).json({ error: `Failed to get valid token for ${service}` })
      }

      const email = await tokenStore.getConnectionEmail(userId, service)

      logger.info(`[TokenBridge] SUCCESS: Provided ${service} access token for user ${userId} (${email}), token length=${accessToken.length}`)

      res.json({
        access_token: accessToken,
        service,
        user_id: userId,
        email,
        expires_at: Date.now() + 3600000 // 1 hour from now (conservative)
      })

    } catch (error: any) {
      logger.error(`[TokenBridge] Error for ${req.params.service}:`, error)
      res.status(500).json({ error: 'Failed to get access token' })
    }
  })

  /**
   * GET /api/tokens/status?user_id=<id>  
   * Check connection status for all services for a user
   * Used by OpenClaw agents to know which tools are available
   */
  router.get('/status', async (req: Request, res: Response) => {
    try {
      const userId = req.query.user_id as string

      logger.info(`[TokenBridge] status request: user_id="${userId}"`)

      if (!userId) {
        return res.status(400).json({ error: 'Missing required query parameter: user_id' })
      }

      const services = ['gmail'] // Add more services as they're implemented
      const status: Record<string, any> = {}

      for (const service of services) {
        const connected = await tokenStore.hasValidConnection(userId, service)
        const email = connected ? await tokenStore.getConnectionEmail(userId, service) : null

        status[service] = {
          connected,
          email
        }
        logger.info(`[TokenBridge] status: ${service} connected=${connected} email=${email}`)
      }

      res.json({
        user_id: userId,
        services: status
      })

    } catch (error: any) {
      logger.error('[TokenBridge] Status error:', error)
      res.status(500).json({ error: 'Failed to get token status' })
    }
  })

  return router
}