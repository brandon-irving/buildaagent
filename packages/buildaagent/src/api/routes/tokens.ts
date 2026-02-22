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
      const { service } = req.params
      const userId = req.query.user_id as string

      if (!userId) {
        return res.status(400).json({ error: 'Missing required query parameter: user_id' })
      }

      if (!['gmail'].includes(service.toLowerCase())) {
        return res.status(400).json({ error: `Unsupported service: ${service}` })
      }

      // Check if user has connected this service
      const connected = await tokenStore.hasValidConnection(userId, service)
      if (!connected) {
        return res.status(404).json({ error: `Service ${service} not connected for user ${userId}` })
      }

      // Get a valid access token (auto-refreshes if needed)
      const accessToken = await tokenStore.getValidAccessToken(userId, service)
      if (!accessToken) {
        return res.status(401).json({ error: `Failed to get valid token for ${service}` })
      }

      const email = await tokenStore.getConnectionEmail(userId, service)

      logger.debug(`Token bridge: Provided ${service} access token for user ${userId}`)

      res.json({
        access_token: accessToken,
        service,
        user_id: userId,
        email,
        expires_at: Date.now() + 3600000 // 1 hour from now (conservative)
      })

    } catch (error: any) {
      logger.error(`Token bridge error for ${req.params.service}:`, error)
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
      }

      res.json({
        user_id: userId,
        services: status
      })

    } catch (error: any) {
      logger.error('Token bridge status error:', error)
      res.status(500).json({ error: 'Failed to get token status' })
    }
  })

  return router
}