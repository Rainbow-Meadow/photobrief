/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface SubmissionReceivedProps {
  ownerName?: string
  recipientName?: string
  guideName?: string
  reviewUrl?: string
  photoCount?: number
}

const SubmissionReceivedEmail = ({
  ownerName, recipientName, guideName, reviewUrl, photoCount,
}: SubmissionReceivedProps) => {
  const greeting = ownerName ? `Hi ${ownerName},` : 'Hi there,'
  const who = recipientName || 'A recipient'
  const guide = guideName ? ` for "${guideName}"` : ''
  const cta = reviewUrl || 'https://photobrief.ai/dashboard'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`${who} just submitted photos`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>NEW SUBMISSION</Text>
          <Heading style={h1}>{greeting}</Heading>
          <Text style={text}>
            {who} just submitted photos{guide}
            {typeof photoCount === 'number' ? ` — ${photoCount} photo${photoCount === 1 ? '' : 's'} attached` : ''}.
          </Text>
          <Text style={text}>
            Review the submission, check completeness, and download or forward
            the photos from your inbox.
          </Text>
          <Section style={ctaWrap}>
            <Button href={cta} style={button}>Review submission</Button>
          </Section>
          <Text style={footer}>You're receiving this because you're a member of this PhotoBrief workspace.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: SubmissionReceivedEmail,
  subject: (data: Record<string, any>) => {
    const who = data?.recipientName || 'A recipient'
    return `${who} submitted photos`
  },
  displayName: 'Submission received',
  previewData: {
    ownerName: 'Alex',
    recipientName: 'Maria',
    guideName: 'Leak inspection',
    reviewUrl: 'https://photobrief.ai/submissions/preview',
    photoCount: 5,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 28px' }
const eyebrow = { fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', color: '#0A6BFF', textTransform: 'uppercase' as const, margin: '0 0 16px' }
const h1 = { fontSize: '24px', fontWeight: 600, color: '#101828', margin: '0 0 16px', lineHeight: '1.25' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.55', margin: '0 0 16px' }
const ctaWrap = { margin: '28px 0 24px' }
const button = { backgroundColor: '#0A6BFF', color: '#ffffff', borderRadius: '12px', padding: '14px 24px', fontSize: '15px', fontWeight: 600, textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#94A3B8', margin: '24px 0 0', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }
