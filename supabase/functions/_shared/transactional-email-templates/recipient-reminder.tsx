/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface RecipientReminderProps {
  recipientName?: string
  businessName?: string
  link?: string
  estimatedMinutes?: number
}

const RecipientReminderEmail = ({
  recipientName, businessName, link, estimatedMinutes,
}: RecipientReminderProps) => {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,'
  const sender = businessName || 'A PhotoBrief business'
  const cta = link || '#'
  const eta = estimatedMinutes ?? 2
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`Reminder: ${sender} is still waiting on a few photos`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>QUICK REMINDER</Text>
          <Heading style={h1}>{greeting}</Heading>
          <Text style={text}>
            Just a quick nudge — {sender} is still waiting on a few photos from
            you. It only takes about {eta} minute{eta === 1 ? '' : 's'} and there's
            no app or login required.
          </Text>
          <Section style={ctaWrap}>
            <Button href={cta} style={button}>Send your photos</Button>
          </Section>
          <Text style={fineprint}>
            Or open this link directly:{' '}
            <Link href={cta} style={linkStyle}>{cta}</Link>
          </Text>
          <Text style={footer}>Sent on behalf of {sender} via PhotoBrief.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RecipientReminderEmail,
  subject: (data: Record<string, any>) => {
    const sender = data?.businessName || 'PhotoBrief'
    return `Reminder: ${sender} needs your photos`
  },
  displayName: 'Recipient reminder',
  previewData: {
    recipientName: 'Maria',
    businessName: 'Bright Spark Plumbing',
    link: 'https://photobrief.ai/r/preview-token',
    estimatedMinutes: 2,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px' }
const eyebrow = { fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: '#0A6BFF', textTransform: 'uppercase' as const, margin: '0 0 16px' }
const h1 = { fontSize: '24px', fontWeight: 600, color: '#101828', margin: '0 0 16px', lineHeight: '1.25' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.55', margin: '0 0 16px' }
const ctaWrap = { margin: '28px 0 24px' }
const button = { backgroundColor: '#0A6BFF', color: '#ffffff', borderRadius: '12px', padding: '14px 24px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const linkStyle = { color: '#0A6BFF', textDecoration: 'underline', wordBreak: 'break-all' as const }
const fineprint = { fontSize: '13px', color: '#64748B', lineHeight: '1.5', margin: '0 0 32px' }
const footer = { fontSize: '12px', color: '#94A3B8', margin: '24px 0 0', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }
