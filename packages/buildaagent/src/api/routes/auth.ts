/**
 * OAuth Authentication Routes
 *
 * Handles Gmail OAuth flow: code exchange, connection status, and disconnect.
 * The mobile app initiates the OAuth flow and sends the auth code here.
 */

import { Router, Request, Response } from 'express'
import { TokenStore } from '../../services/token-store'
import { OAuthTokens } from '../../services/gmail/types'
import { Logger } from '../../core/logger'

export function createAuthRouter(tokenStore: TokenStore, logger: Logger): Router {
  const router = Router()

  /**
   * POST /api/auth/gmail/callback
   * Exchange authorization code for tokens (with PKCE)
   */
  router.post('/gmail/callback', async (req: Request, res: Response) => {
    try {
      const { code, code_verifier, redirect_uri, user_id } = req.body

      if (!code || !user_id) {
        return res.status(400).json({ error: 'Missing required fields: code, user_id' })
      }

      const clientId = process.env.GOOGLE_CLIENT_ID
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET

      if (!clientId || !clientSecret) {
        logger.error('Missing Google OAuth credentials in environment')
        return res.status(500).json({ error: 'OAuth not configured on server' })
      }

      // Exchange authorization code for tokens
      const tokenParams: Record<string, string> = {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code'
      }

      if (redirect_uri) tokenParams.redirect_uri = redirect_uri
      if (code_verifier) tokenParams.code_verifier = code_verifier

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(tokenParams)
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        logger.error(`Google token exchange failed: ${tokenResponse.status} ${errorText}`)
        return res.status(400).json({ error: 'Failed to exchange authorization code' })
      }

      const tokenData = await tokenResponse.json() as {
        access_token: string
        refresh_token: string
        expires_in: number
        scope: string
      }

      if (!tokenData.refresh_token) {
        logger.warn('No refresh token returned — user may need to re-authorize with access_type=offline')
      }

      // Fetch the user's email address from Google
      const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      })

      let email = 'unknown'
      if (userinfoResponse.ok) {
        const userinfo = await userinfoResponse.json() as { email?: string }
        email = userinfo.email || 'unknown'
      }

      // Store encrypted tokens
      const tokens: OAuthTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || '',
        expiresAt: Date.now() + tokenData.expires_in * 1000,
        scope: tokenData.scope,
        email
      }

      await tokenStore.storeTokens(user_id, 'gmail', tokens)

      logger.info(`Gmail connected for user ${user_id} (${email})`)

      res.json({ connected: true, email })
    } catch (error: any) {
      logger.error('Gmail callback error:', error)
      res.status(500).json({ error: 'Failed to complete Gmail authentication' })
    }
  })

  /**
   * GET /api/auth/gmail/status?user_id=<id>
   * Check if Gmail is connected for a user
   */
  router.get('/gmail/status', async (req: Request, res: Response) => {
    try {
      const userId = req.query.user_id as string

      if (!userId) {
        return res.status(400).json({ error: 'Missing required query parameter: user_id' })
      }

      const connected = await tokenStore.hasValidConnection(userId, 'gmail')
      const email = connected ? await tokenStore.getConnectionEmail(userId, 'gmail') : null

      res.json({ connected, email })
    } catch (error: any) {
      logger.error('Gmail status check error:', error)
      res.status(500).json({ error: 'Failed to check Gmail status' })
    }
  })

  /**
   * POST /api/auth/gmail/disconnect
   * Revoke tokens and remove connection
   */
  router.post('/gmail/disconnect', async (req: Request, res: Response) => {
    try {
      const { user_id } = req.body

      if (!user_id) {
        return res.status(400).json({ error: 'Missing required field: user_id' })
      }

      await tokenStore.deleteTokens(user_id, 'gmail')

      logger.info(`Gmail disconnected for user ${user_id}`)

      res.json({ disconnected: true })
    } catch (error: any) {
      logger.error('Gmail disconnect error:', error)
      res.status(500).json({ error: 'Failed to disconnect Gmail' })
    }
  })

  return router
}
