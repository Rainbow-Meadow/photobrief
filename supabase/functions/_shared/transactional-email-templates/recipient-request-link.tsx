/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface RecipientRequestLinkProps {
  recipientName?: string
  businessName?: string
  introMessage?: string
  link?: string
  estimatedMinutes?: number
}

const RecipientRequestLinkEmail = ({
  recipientName,
  businessName,
  introMessage,
  link,
  estimatedMinutes,
}: RecipientRequestLinkProps) => {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi there,'
  const sender = businessName || 'A PhotoBrief business'
  const message =
    introMessage?.trim() ||
    `${sender} needs a few quick photos to help them help you.`
  const cta = link || '#'
  const eta = estimatedMinutes ?? 2

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`${sender} needs a few quick photos`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>PHOTO REQUEST</Text>
          <Heading style={h1}>{greeting}</Heading>
          <Text style={text}>{message}</Text>
          <Text style={text}>
            Tap the button below — it walks you through the shots one at a time
            and only takes about {eta} minute{eta === 1 ? '' : 's'}. No app or
            account needed.
          </Text>

          <Section style={ctaWrap}>
            <Button href={cta} style={button}>
              Start photo request
            </Button>
          </Section>

          <Text style={fineprint}>
            Or open this link directly:{' '}
            <Link href={cta} style={linkStyle}>
              {cta}
            </Link>
          </Text>

          <Text style={footer}>
            Sent on behalf of {sender} via PhotoBrief.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RecipientRequestLinkEmail,
  subject: (data: Record<string, any>) => {
    const sender = data?.businessName || 'PhotoBrief'
    return `${sender}: a quick photo request`
  },
  displayName: 'Recipient request link',
  previewData: {
    recipientName: 'Maria',
    businessName: 'Bright Spark Plumbing',
    introMessage: 'Hi! Help us help you — a few quick photos.',
    link: 'https://photobrief.ai/r/preview-token',
    estimatedMinutes: 2,
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
}

const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 28px',
}

const eyebrow = {
  fontSize: '11px',
  fontWeight: 600,
  letterSpacing: '0.08em',
  color: '#0A6BFF',
  textTransform: 'uppercase' as const,
  margin: '0 0 16px',
}

const h1 = {
  fontSize: '24px',
  fontWeight: 600,
  color: '#0F172A',
  margin: '0 0 16px',
  lineHeight: '1.25',
}

const text = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.55',
  margin: '0 0 16px',
}

const ctaWrap = {
  margin: '28px 0 24px',
}

const button = {
  backgroundColor: '#0A6BFF',
  color: '#ffffff',
  borderRadius: '8px',
  padding: '14px 24px',
  fontSize: '15px',
  fontWeight: 600,
  textDecoration: 'none',
  display: 'inline-block',
}

const linkStyle = {
  color: '#0A6BFF',
  textDecoration: 'underline',
  wordBreak: 'break-all' as const,
}

const fineprint = {
  fontSize: '13px',
  color: '#64748B',
  lineHeight: '1.5',
  margin: '0 0 32px',
}

const footer = {
  fontSize: '12px',
  color: '#94A3B8',
  margin: '24px 0 0',
  borderTop: '1px solid #E2E8F0',
  paddingTop: '16px',
}
