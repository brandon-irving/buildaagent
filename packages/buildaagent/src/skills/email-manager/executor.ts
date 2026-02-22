/**
 * Email Manager Skill Executor
 *
 * Replaces the placeholder email-manager skill with real Gmail integration.
 * Detects user intent (read, send, count, search) and calls GmailService.
 */

import { TokenStore } from '../../services/token-store'
import { GmailService } from '../../services/gmail/gmail-service'
import { EmailSummary } from '../../services/gmail/types'
import { Logger } from '../../core/logger'
import { SkillExecutionParams } from '../../core/skill-registry'

type EmailIntent = 'read' | 'send' | 'unread_count' | 'search'

interface ParsedSendIntent {
  to: string
  subject: string
  body: string
}

export function createEmailManagerExecutor(
  tokenStore: TokenStore,
  gmailService: GmailService,
  logger: Logger
) {
  return async function executeEmailManager(params: SkillExecutionParams): Promise<string> {
    const { query, userId } = params

    // Check if Gmail is connected
    const connected = await tokenStore.hasValidConnection(userId, 'gmail')
    if (!connected) {
      return 'Gmail is not connected yet. Please open Settings in the app and tap "Connect Gmail" to link your account.'
    }

    // Get a valid access token (auto-refreshes if needed)
    const accessToken = await tokenStore.getValidAccessToken(userId, 'gmail')
    if (!accessToken) {
      return 'Your Gmail connection has expired. Please reconnect in Settings.'
    }

    const intent = detectEmailIntent(query)
    logger.info(`Email intent detected: ${intent}`, { query })

    try {
      switch (intent) {
        case 'unread_count': {
          const count = await gmailService.getUnreadCount(accessToken)
          return `You have ${count} unread email${count === 1 ? '' : 's'}.`
        }

        case 'send': {
          const parsed = parseSendIntent(query)
          if (!parsed) {
            return 'I can help you send an email! Please tell me who to send it to, the subject, and what you want to say. For example: "Send an email to alice@example.com about Meeting Tomorrow saying Let\'s meet at 3pm."'
          }
          const result = await gmailService.sendEmail(accessToken, parsed)
          return `Email sent to ${parsed.to} with subject "${parsed.subject}" (Message ID: ${result.id}).`
        }

        case 'search': {
          const searchQuery = extractSearchQuery(query)
          const emails = await gmailService.getRecentEmails(accessToken, {
            query: searchQuery,
            maxResults: 5
          })
          if (emails.length === 0) {
            return `No emails found matching "${searchQuery}".`
          }
          return `Found ${emails.length} email${emails.length === 1 ? '' : 's'} matching "${searchQuery}":\n\n${formatEmailSummaries(emails)}`
        }

        case 'read':
        default: {
          const emails = await gmailService.getRecentEmails(accessToken, {
            maxResults: 5
          })
          if (emails.length === 0) {
            return 'Your inbox is empty!'
          }
          return `Here are your ${emails.length} most recent emails:\n\n${formatEmailSummaries(emails)}`
        }
      }
    } catch (error: any) {
      logger.error('Email skill execution error:', error)
      return `I had trouble accessing Gmail: ${error.message}. You might need to reconnect in Settings.`
    }
  }
}

export function detectEmailIntent(query: string): EmailIntent {
  const q = query.toLowerCase()

  // Unread count
  if (/how many\s+(unread|new)|unread\s+(count|number|emails)|count.*unread/.test(q)) {
    return 'unread_count'
  }

  // Send
  if (/\b(send|compose|write|draft|reply)\b.*\b(email|mail|message)\b/.test(q) ||
      /\bemail\b.*\b(to|send)\b/.test(q)) {
    return 'send'
  }

  // Search
  if (/\b(search|find|look for|from|about)\b.*\b(email|mail|inbox)\b/.test(q) ||
      /\b(email|mail)\b.*\b(from|about|regarding|search)\b/.test(q)) {
    return 'search'
  }

  // Default: read recent emails
  return 'read'
}

function parseSendIntent(query: string): ParsedSendIntent | null {
  // Try: "send email to <addr> about <subject> saying <body>"
  const match = query.match(
    /(?:send|compose|write).*?(?:email|mail|message)?\s*(?:to)\s+([\w.+-]+@[\w.-]+)\s+(?:about|subject[:\s])\s*(.+?)\s+(?:saying|body[:\s]|message[:\s]|with(?:\s+message)?[:\s])\s*(.+)/i
  )

  if (match) {
    return {
      to: match[1],
      subject: match[2].trim(),
      body: match[3].trim()
    }
  }

  return null
}

function extractSearchQuery(query: string): string {
  // Remove common email-related filler words to get the search query
  return query
    .replace(/\b(search|find|look for|check|show|get)\b/gi, '')
    .replace(/\b(my|the|in|from|any|all)?\s*(emails?|mail|inbox|messages?)\b/gi, '')
    .replace(/\b(about|regarding|from|for)\b/gi, '')
    .trim() || 'is:inbox'
}

function formatEmailSummaries(emails: EmailSummary[]): string {
  return emails
    .map((email, i) => {
      const unread = email.isUnread ? ' [UNREAD]' : ''
      return `${i + 1}. ${email.subject}${unread}\n   From: ${email.from}\n   ${email.snippet}`
    })
    .join('\n\n')
}
