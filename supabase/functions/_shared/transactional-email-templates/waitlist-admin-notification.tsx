/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface WaitlistAdminProps {
  name?: string
  email?: string
  business_name?: string | null
  business_type?: string | null
  website?: string | null
  use_case?: string | null
  estimated_monthly_requests?: string | null
  notes?: string | null
  source?: string | null
  created_at?: string
}

const Row = ({ label, value }: { label: string; value?: string | null }) => {
  if (!value) return null
  return (
    <Text style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value}</span>
    </Text>
  )
}

const WaitlistAdminEmail = (props: WaitlistAdminProps) => {
  const {
    name, email, business_name, business_type, website,
    use_case, estimated_monthly_requests, notes, source, created_at,
  } = props
  const headline = business_name || name || email || 'New signup'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>New PhotoBrief waitlist signup: {headline}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>WAITLIST · NEW SIGNUP</Text>
          <Heading style={h1}>{headline}</Heading>

          <Row label="Name" value={name} />
          <Row label="Email" value={email} />
          <Row label="Business" value={business_name} />
          <Row label="Business type" value={business_type} />
          <Row label="Website" value={website} />
          <Row label="Est. monthly requests" value={estimated_monthly_requests} />
          <Row label="Source" value={source} />
          <Row label="Signed up" value={created_at} />

          {use_case ? (
            <>
              <Hr style={hr} />
              <Text style={blockLabel}>Use case</Text>
              <Text style={blockText}>{use_case}</Text>
            </>
          ) : null}

          {notes ? (
            <>
              <Hr style={hr} />
              <Text style={blockLabel}>Notes</Text>
              <Text style={blockText}>{notes}</Text>
            </>
          ) : null}
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WaitlistAdminEmail,
  subject: (data: Record<string, any>) => {
    const who = data?.business_name || data?.name || data?.email || 'unknown'
    return `New waitlist signup: ${who}`
  },
  displayName: 'Waitlist admin notification',
  previewData: {
    name: 'Alex Morgan',
    email: 'alex@acme.com',
    business_name: 'Acme Roofing',
    business_type: 'Roofing',
    website: 'https://acme.com',
    use_case: 'Collect post-install photos from crews on the road.',
    estimated_monthly_requests: '50-100',
    notes: 'Heard about us via Twitter.',
    source: 'web',
    created_at: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
}
const container = { maxWidth: '600px', margin: '0 auto', padding: '32px 28px' }
const eyebrow = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
  color: '#0A6BFF', textTransform: 'uppercase' as const, margin: '0 0 12px',
}
const h1 = { fontSize: '20px', fontWeight: 600, color: '#101828', margin: '0 0 20px', lineHeight: '1.3' }
const rowStyle = {
  fontSize: '14px', color: '#0F172A', margin: '0 0 8px',
  display: 'block' as const,
}
const labelStyle = {
  display: 'inline-block', minWidth: '170px',
  color: '#64748B', fontWeight: 600, fontSize: '12px',
  textTransform: 'uppercase' as const, letterSpacing: '0.05em',
}
const valueStyle = { color: '#0F172A', fontSize: '14px' }
const hr = { borderColor: '#E2E8F0', margin: '20px 0 12px' }
const blockLabel = {
  fontSize: '12px', color: '#64748B', fontWeight: 700,
  textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 6px',
}
const blockText = {
  fontSize: '14px', color: '#0F172A', lineHeight: '1.55',
  whiteSpace: 'pre-wrap' as const, margin: '0 0 8px',
}
