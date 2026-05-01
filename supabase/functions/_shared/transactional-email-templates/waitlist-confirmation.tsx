/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface WaitlistConfirmationProps {
  name?: string
}

const WaitlistConfirmationEmail = ({ name }: WaitlistConfirmationProps) => {
  const firstName = name ? name.trim().split(/\s+/)[0] : ''
  const greeting = firstName ? `You're on the list, ${firstName}.` : `You're on the list.`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Thanks for joining PhotoBrief — here's what happens next.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>PHOTOBRIEF · WAITLIST</Text>
          <Heading style={h1}>{greeting}</Heading>
          <Text style={text}>
            Thanks for requesting beta access. PhotoBrief is invite-only right
            now so we can give every new business hands-on onboarding — no
            spam, no auto-drip, just a personal note when your seat is ready.
          </Text>

          <Section style={card}>
            <Text style={cardTitle}>What happens next</Text>
            <Text style={step}><span style={stepNum}>1.</span> We review your signup (usually within a couple of business days).</Text>
            <Text style={step}><span style={stepNum}>2.</span> You'll get a personal invite email with a one-click access link.</Text>
            <Text style={step}><span style={stepNum}>3.</span> We'll walk you through setting up your first photo request.</Text>
          </Section>

          <Section style={ctaWrap}>
            <Button href="https://photobrief.ai" style={button}>Visit photobrief.ai</Button>
          </Section>

          <Hr style={hr} />
          <Text style={footer}>
            Questions or want to jump the line? Just reply to this email — it
            goes straight to the team.
          </Text>
          <Text style={signoff}>— The PhotoBrief team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WaitlistConfirmationEmail,
  subject: "You're on the PhotoBrief waitlist",
  displayName: 'Waitlist confirmation',
  previewData: { name: 'Alex Morgan' },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}
const container = { maxWidth: '560px', margin: '0 auto', padding: '40px 28px 32px' }
const eyebrow = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em',
  color: '#0A6BFF', textTransform: 'uppercase' as const, margin: '0 0 18px',
}
const h1 = { fontSize: '26px', fontWeight: 600, color: '#101828', margin: '0 0 18px', lineHeight: '1.2' }
const text = { fontSize: '15px', color: '#334155', lineHeight: '1.6', margin: '0 0 18px' }
const card = {
  backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
  borderRadius: '14px', padding: '20px 22px', margin: '8px 0 24px',
}
const cardTitle = { fontSize: '13px', fontWeight: 700, color: '#0F172A', margin: '0 0 10px', letterSpacing: '0.02em' }
const step = { fontSize: '14px', color: '#334155', lineHeight: '1.55', margin: '0 0 8px' }
const stepNum = { color: '#0A6BFF', fontWeight: 700, marginRight: '6px' }
const ctaWrap = { margin: '8px 0 28px' }
const button = {
  backgroundColor: '#0A6BFF', color: '#ffffff', borderRadius: '12px',
  padding: '14px 24px', fontSize: '15px', fontWeight: 600,
  textDecoration: 'none', display: 'inline-block',
}
const hr = { borderColor: '#E2E8F0', margin: '8px 0 20px' }
const footer = { fontSize: '13px', color: '#64748B', lineHeight: '1.55', margin: '0 0 8px' }
const signoff = { fontSize: '13px', color: '#94A3B8', margin: '0' }
