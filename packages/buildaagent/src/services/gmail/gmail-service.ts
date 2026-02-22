/**
 * GmailService - Gmail REST API operations
 *
 * Uses raw fetch to Gmail REST API (no googleapis dependency).
 * Matches the lightweight approach used in agent-gateway.ts.
 */

import { Logger } from '../../core/logger'
import { EmailSummary, EmailDetail, SendEmailParams, GmailLabel } from './types'

const GMAIL_API_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'

export class GmailService {
  constructor(private logger: Logger) {}

  async getRecentEmails(
    accessToken: string,
    options: { query?: string; maxResults?: number } = {}
  ): Promise<EmailSummary[]> {
    const { query, maxResults = 10 } = options

    const params = new URLSearchParams({ maxResults: String(maxResults) })
    if (query) params.set('q', query)

    const listResponse = await this.gmailFetch(
      accessToken,
      `/messages?${params}`
    )

    if (!listResponse.messages || listResponse.messages.length === 0) {
      return []
    }

    // Fetch metadata for each message
    const emails: EmailSummary[] = await Promise.all(
      listResponse.messages.map((msg: { id: string }) =>
        this.getEmailSummary(accessToken, msg.id)
      )
    )

    return emails
  }

  async getEmailById(accessToken: string, emailId: string): Promise<EmailDetail> {
    const data = await this.gmailFetch(
      accessToken,
      `/messages/${emailId}?format=full`
    )

    return this.parseFullMessage(data)
  }

  async getUnreadCount(accessToken: string): Promise<number> {
    const data = await this.gmailFetch(
      accessToken,
      '/labels/UNREAD'
    )

    return data.messagesUnread || 0
  }

  async sendEmail(accessToken: string, params: SendEmailParams): Promise<{ id: string; threadId: string }> {
    const rawMessage = this.buildRawMimeMessage(params)
    const encoded = Buffer.from(rawMessage)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    const body: Record<string, string> = { raw: encoded }
    if (params.replyToThreadId) {
      body.threadId = params.replyToThreadId
    }

    const data = await this.gmailFetch(accessToken, '/messages/send', {
      method: 'POST',
      body: JSON.stringify(body)
    })

    return { id: data.id, threadId: data.threadId }
  }

  async markAsRead(accessToken: string, messageIds: string[]): Promise<void> {
    await this.gmailFetch(accessToken, '/messages/batchModify', {
      method: 'POST',
      body: JSON.stringify({
        ids: messageIds,
        removeLabelIds: ['UNREAD']
      })
    })
  }

  async addLabels(accessToken: string, messageIds: string[], labelIds: string[]): Promise<void> {
    await this.gmailFetch(accessToken, '/messages/batchModify', {
      method: 'POST',
      body: JSON.stringify({
        ids: messageIds,
        addLabelIds: labelIds
      })
    })
  }

  async getLabels(accessToken: string): Promise<GmailLabel[]> {
    const data = await this.gmailFetch(accessToken, '/labels')

    return (data.labels || []).map((label: any) => ({
      id: label.id,
      name: label.name,
      type: label.type === 'system' ? 'system' : 'user'
    }))
  }

  // --- Private helpers ---

  private async getEmailSummary(accessToken: string, messageId: string): Promise<EmailSummary> {
    const data = await this.gmailFetch(
      accessToken,
      `/messages/${messageId}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject&metadataHeaders=Date`
    )

    const headers = data.payload?.headers || []
    const getHeader = (name: string): string =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

    return {
      id: data.id,
      threadId: data.threadId,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      snippet: data.snippet || '',
      date: getHeader('Date'),
      isUnread: (data.labelIds || []).includes('UNREAD'),
      labels: data.labelIds || []
    }
  }

  private parseFullMessage(data: any): EmailDetail {
    const headers = data.payload?.headers || []
    const getHeader = (name: string): string =>
      headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || ''

    const body = this.extractBody(data.payload)
    const attachments = this.extractAttachments(data.payload)

    return {
      id: data.id,
      threadId: data.threadId,
      from: getHeader('From'),
      to: getHeader('To'),
      subject: getHeader('Subject'),
      snippet: data.snippet || '',
      date: getHeader('Date'),
      isUnread: (data.labelIds || []).includes('UNREAD'),
      labels: data.labelIds || [],
      body,
      attachments
    }
  }

  private extractBody(payload: any): string {
    if (!payload) return ''

    // Direct body data
    if (payload.body?.data) {
      return Buffer.from(payload.body.data, 'base64').toString('utf8')
    }

    // Multipart — prefer text/plain, fall back to text/html
    if (payload.parts) {
      const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain')
      if (textPart?.body?.data) {
        return Buffer.from(textPart.body.data, 'base64').toString('utf8')
      }

      const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html')
      if (htmlPart?.body?.data) {
        const html = Buffer.from(htmlPart.body.data, 'base64').toString('utf8')
        // Strip HTML tags for plain text representation
        return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      }

      // Nested multipart
      for (const part of payload.parts) {
        if (part.parts) {
          const nested = this.extractBody(part)
          if (nested) return nested
        }
      }
    }

    return ''
  }

  private extractAttachments(payload: any): Array<{ filename: string; mimeType: string; size: number }> {
    const attachments: Array<{ filename: string; mimeType: string; size: number }> = []

    if (!payload?.parts) return attachments

    for (const part of payload.parts) {
      if (part.filename && part.body?.attachmentId) {
        attachments.push({
          filename: part.filename,
          mimeType: part.mimeType || 'application/octet-stream',
          size: part.body.size || 0
        })
      }
    }

    return attachments
  }

  private buildRawMimeMessage(params: SendEmailParams): string {
    const lines = [
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      'Content-Type: text/plain; charset=utf-8',
      'MIME-Version: 1.0'
    ]

    if (params.cc) {
      lines.splice(1, 0, `Cc: ${params.cc}`)
    }

    lines.push('', params.body)
    return lines.join('\r\n')
  }

  private async gmailFetch(
    accessToken: string,
    path: string,
    options: { method?: string; body?: string } = {}
  ): Promise<any> {
    const url = `${GMAIL_API_BASE}${path}`
    const { method = 'GET', body } = options

    this.logger.debug(`Gmail API: ${method} ${path}`)

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gmail API error: ${response.status} ${errorText}`)
    }

    return response.json()
  }
}
