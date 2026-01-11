import { Resend } from 'resend'

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY)

const EMAIL_FROM = process.env.EMAIL_FROM || 'Duggin Construction Co <noreply@example.com>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export interface SendInvitationEmailOptions {
  to: string
  inviterName: string
  role: string
  token: string
  message?: string | null
  expiresAt: Date
}

/**
 * Send a generic email
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email send')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    if (error) {
      console.error('[Email] Failed to send:', error)
      return { success: false, error: error.message }
    }

    console.log('[Email] Sent successfully:', data?.id)
    return { success: true }
  } catch (err) {
    console.error('[Email] Error:', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Send an invitation email to a new user
 */
export async function sendInvitationEmail(options: SendInvitationEmailOptions): Promise<{ success: boolean; error?: string }> {
  const inviteUrl = `${APP_URL}/auth/accept-invitation?token=${options.token}`
  const expiresFormatted = options.expiresAt.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const roleDisplay = formatRole(options.role)

  const html = generateInvitationEmailHtml({
    inviterName: options.inviterName,
    role: roleDisplay,
    inviteUrl,
    message: options.message,
    expiresFormatted,
  })

  const text = generateInvitationEmailText({
    inviterName: options.inviterName,
    role: roleDisplay,
    inviteUrl,
    message: options.message,
    expiresFormatted,
  })

  return sendEmail({
    to: options.to,
    subject: `You're invited to join Duggin Construction Co`,
    html,
    text,
  })
}

function formatRole(role: string): string {
  const roleMap: Record<string, string> = {
    ADMIN: 'Administrator',
    PROJECT_MANAGER: 'Project Manager',
    SUPERINTENDENT: 'Superintendent',
    FOREMAN: 'Foreman',
    FIELD_WORKER: 'Field Worker',
    VIEWER: 'Viewer',
  }
  return roleMap[role] || role
}

interface InvitationEmailData {
  inviterName: string
  role: string
  inviteUrl: string
  message?: string | null
  expiresFormatted: string
}

function generateInvitationEmailHtml(data: InvitationEmailData): string {
  const messageSection = data.message
    ? `
      <div style="background-color: #f8fafc; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 4px;">
        <p style="margin: 0; color: #475569; font-style: italic;">"${escapeHtml(data.message)}"</p>
        <p style="margin: 8px 0 0 0; color: #64748b; font-size: 14px;">- ${escapeHtml(data.inviterName)}</p>
      </div>
    `
    : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700;">
                Duggin Construction Co
              </h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
              <h2 style="margin: 0 0 16px 0; color: #1e293b; font-size: 20px; font-weight: 600;">
                You've been invited!
              </h2>

              <p style="margin: 0 0 16px 0; color: #475569; font-size: 16px; line-height: 1.6;">
                <strong>${escapeHtml(data.inviterName)}</strong> has invited you to join the team as a <strong>${escapeHtml(data.role)}</strong>.
              </p>

              ${messageSection}

              <div style="text-align: center; margin: 32px 0;">
                <a href="${data.inviteUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Accept Invitation
                </a>
              </div>

              <p style="margin: 24px 0 0 0; color: #64748b; font-size: 14px; line-height: 1.5;">
                This invitation expires on <strong>${data.expiresFormatted}</strong>.
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

              <p style="margin: 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                If you didn't expect this invitation, you can safely ignore this email.
              </p>

              <p style="margin: 16px 0 0 0; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                Button not working? Copy and paste this link into your browser:<br>
                <a href="${data.inviteUrl}" style="color: #3b82f6; word-break: break-all;">${data.inviteUrl}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

function generateInvitationEmailText(data: InvitationEmailData): string {
  let text = `You've been invited to join Duggin Construction Co!

${data.inviterName} has invited you to join the team as a ${data.role}.
`

  if (data.message) {
    text += `
Message from ${data.inviterName}:
"${data.message}"
`
  }

  text += `
To accept this invitation, visit:
${data.inviteUrl}

This invitation expires on ${data.expiresFormatted}.

If you didn't expect this invitation, you can safely ignore this email.
`

  return text
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}
