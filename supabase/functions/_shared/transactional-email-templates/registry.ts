/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as recipientRequestLink } from './recipient-request-link.tsx'
import { template as recipientReminder } from './recipient-reminder.tsx'
import { template as submissionReceived } from './submission-received.tsx'
import { template as workspaceWelcome } from './workspace-welcome.tsx'
import { template as waitlistConfirmation } from './waitlist-confirmation.tsx'
import { template as waitlistAdminNotification } from './waitlist-admin-notification.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'recipient-request-link': recipientRequestLink,
  'recipient-reminder': recipientReminder,
  'submission-received': submissionReceived,
  'workspace-welcome': workspaceWelcome,
  'waitlist-confirmation': waitlistConfirmation,
  'waitlist-admin-notification': waitlistAdminNotification,
}
