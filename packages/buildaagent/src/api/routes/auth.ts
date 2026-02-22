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

      logger.info(`[Auth] Gmail callback received: user_id="${user_id}" code_length=${code?.length || 0} has_code_verifier=${!!code_verifier} redirect_uri="${redirect_uri || 'none'}"`)

      if (!code || !user_id) {
        logger.error(`[Auth] Missing required fields: code=${!!code} user_id=${!!user_id}`)
        return res.status(400).json({ error: 'Missing required fields: code, user_id' })
      }

      const clientId = process.env.GOOGLE_CLIENT_ID
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET

      if (!clientId || !clientSecret) {
        logger.error('[Auth] Missing Google OAuth credentials: GOOGLE_CLIENT_ID=' + (clientId ? 'SET' : 'MISSING') + ' GOOGLE_CLIENT_SECRET=' + (clientSecret ? 'SET' : 'MISSING'))
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

      logger.info(`[Auth] Exchanging code with Google (grant_type=authorization_code)`)

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(tokenParams)
      })

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text()
        logger.error(`[Auth] Google token exchange FAILED: ${tokenResponse.status} ${errorText}`)
        return res.status(400).json({ error: 'Failed to exchange authorization code' })
      }

      const tokenData = await tokenResponse.json() as {
        access_token: string
        refresh_token: string
        expires_in: number
        scope: string
      }

      logger.info(`[Auth] Google token exchange SUCCESS: access_token length=${tokenData.access_token?.length || 0} refresh_token length=${tokenData.refresh_token?.length || 0} expires_in=${tokenData.expires_in}s scope="${tokenData.scope}"`)

      if (!tokenData.refresh_token) {
        logger.warn('[Auth] NO REFRESH TOKEN returned — user may need to re-authorize with access_type=offline&prompt=consent')
      }

      // Fetch the user's email address from Google
      logger.info(`[Auth] Fetching user email from Google userinfo API`)
      const userinfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      })

      let email = 'unknown'
      if (userinfoResponse.ok) {
        const userinfo = await userinfoResponse.json() as { email?: string }
        email = userinfo.email || 'unknown'
        logger.info(`[Auth] User email resolved: ${email}`)
      } else {
        logger.warn(`[Auth] Userinfo fetch failed: ${userinfoResponse.status}`)
      }

      // Store encrypted tokens
      const tokens: OAuthTokens = {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || '',
        expiresAt: Date.now() + tokenData.expires_in * 1000,
        scope: tokenData.scope,
        email
      }

      logger.info(`[Auth] Storing tokens for user_id="${user_id}" provider="gmail" email="${email}" expiresAt=${new Date(tokens.expiresAt).toISOString()}`)

      await tokenStore.storeTokens(user_id, 'gmail', tokens)

      // Verify the store worked by reading back
      const verified = await tokenStore.hasValidConnection(user_id, 'gmail')
      logger.info(`[Auth] Token store verification: hasValidConnection=${verified}`)

      if (!verified) {
        logger.error(`[Auth] TOKEN STORE VERIFICATION FAILED — tokens were stored but cannot be read back!`)
      }

      logger.info(`[Auth] Gmail connected successfully for user ${user_id} (${email})`)

      res.json({ connected: true, email })
    } catch (error: any) {
      logger.error('[Auth] Gmail callback error:', error)
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

      logger.info(`[Auth] Gmail status check: user_id="${userId}"`)

      if (!userId) {
        return res.status(400).json({ error: 'Missing required query parameter: user_id' })
      }

      const connected = await tokenStore.hasValidConnection(userId, 'gmail')
      const email = connected ? await tokenStore.getConnectionEmail(userId, 'gmail') : null

      logger.info(`[Auth] Gmail status result: user_id="${userId}" connected=${connected} email=${email}`)

      res.json({ connected, email })
    } catch (error: any) {
      logger.error('[Auth] Gmail status check error:', error)
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

      logger.info(`[Auth] Gmail disconnect request: user_id="${user_id}"`)

      if (!user_id) {
        return res.status(400).json({ error: 'Missing required field: user_id' })
      }

      await tokenStore.deleteTokens(user_id, 'gmail')

      logger.info(`[Auth] Gmail disconnected for user ${user_id}`)

      res.json({ disconnected: true })
    } catch (error: any) {
      logger.error('[Auth] Gmail disconnect error:', error)
      res.status(500).json({ error: 'Failed to disconnect Gmail' })
    }
  })

  return router
}
