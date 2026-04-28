/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface WorkspaceWelcomeProps {
  name?: string
  dashboardUrl?: string
}

const WorkspaceWelcomeEmail = ({ name, dashboardUrl }: WorkspaceWelcomeProps) => {
  const greeting = name ? `Welcome, ${name}!` : 'Welcome to PhotoBrief!'
  const cta = dashboardUrl || 'https://photobrief.ai/dashboard'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your PhotoBrief workspace is ready.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={eyebrow}>PHOTOBRIEF</Text>
          <Heading style={h1}>{greeting}</Heading>
          <Text style={text}>
            Your workspace is ready. PhotoBrief helps you collect customer photos
            without the back-and-forth — send a guided link, recipients capture
            the right shots, and you get organized submissions in your inbox.
          </Text>
          <Text style={text}>
            Start by creating your first photo request or browsing the guide
            library to find a template that fits your workflow.
          </Text>
          <Section style={ctaWrap}>
            <Button href={cta} style={button}>Open your dashboard</Button>
          </Section>
          <Text style={footer}>
            Questions? Just reply to this email — we read every message.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WorkspaceWelcomeEmail,
  subject: 'Welcome to PhotoBrief',
  displayName: 'Workspace welcome',
  previewData: {
    name: 'Alex',
    dashboardUrl: 'https://photobrief.ai/dashboard',
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
