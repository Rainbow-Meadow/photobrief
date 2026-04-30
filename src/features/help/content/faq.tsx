export type FaqItem = { id: string; q: string; a: React.ReactNode; audience: "business" | "recipient" };

export const faqItems: FaqItem[] = [
  {
    id: "switch-plans",
    audience: "business",
    q: "Can I switch plans later?",
    a: <>Yes. Upgrade or downgrade any time — we prorate the difference automatically.</>,
  },
  {
    id: "monthly-limit",
    audience: "business",
    q: "What happens if I hit my monthly request limit?",
    a: (
      <>
        We’ll let you know before you hit it. You can upgrade in one click or buy a one-off
        top-up pack on the same Billing page.
      </>
    ),
  },
  {
    id: "recipient-account",
    audience: "business",
    q: "Do recipients need an account?",
    a: <>Never. They open a link, follow the chat, and submit. PhotoBrief handles the rest.</>,
  },
  {
    id: "annual-discount",
    audience: "business",
    q: "Is annual really 20% off?",
    a: <>Yes — pay yearly and the effective monthly price drops by 20%, on every paid plan.</>,
  },
  {
    id: "what-photo",
    audience: "recipient",
    q: "I don’t know what photo to take",
    a: (
      <>
        Re-read the prompt at the top of the chat — it tells you exactly what to capture. If
        there’s an example image, tap it to enlarge. Still unsure? Take your best guess; the AI
        will tell you if something’s off and let you retake.
      </>
    ),
  },
  {
    id: "rejected",
    audience: "recipient",
    q: "My photo was rejected or flagged",
    a: (
      <>
        The AI looks for things like blurriness, low light, the subject being too far away, or the
        wrong angle. The feedback message tells you what to fix. Move closer, hold the phone
        steady, and turn on the flash if it’s dark.
      </>
    ),
  },
  {
    id: "already-submitted",
    audience: "recipient",
    q: "I already submitted — can I add more?",
    a: (
      <>
        Yes, but only if the business asks for more. They’ll send you a new link that opens
        straight to the items they need re-done.
      </>
    ),
  },
  {
    id: "more-photos",
    audience: "business",
    q: "How do I ask for more photos?",
    a: (
      <>
        Open the submission, click <strong>Ask for more</strong>, tick the shots that need
        retaking, add a one-line note for each, and send. Your customer gets a fresh link that
        only shows the flagged items.
      </>
    ),
  },
  {
    id: "find-request",
    audience: "recipient",
    q: "I can’t find my request",
    a: (
      <>
        Search your email or texts for the message from the business. The link works on any
        device — just tap it again to pick up where you left off.
      </>
    ),
  },
  {
    id: "mobile",
    audience: "recipient",
    q: "I’m on mobile — does this work?",
    a: (
      <>
        Yes, the recipient experience is built for phones. The camera button opens your phone’s
        camera directly so you can shoot photos right in the chat.
      </>
    ),
  },
  {
    id: "limit-reached",
    audience: "business",
    q: "I hit my monthly request limit",
    a: (
      <>
        Either upgrade your plan from <strong>Settings → Billing</strong> or buy a one-off{" "}
        <strong>top-up pack</strong> (25, 100, or 500 extra requests) on the same page. Top-ups
        last until the end of your current billing period.
      </>
    ),
  },
  {
    id: "branding",
    audience: "business",
    q: "Can I show my own logo to customers?",
    a: (
      <>
        Yes — head to <strong>Settings → Brand</strong> to upload your logo and pick your brand
        colour. Both show up on the chat page your customer sees.
      </>
    ),
  },
  {
    id: "confusing",
    audience: "recipient",
    q: "Something looks confusing",
    a: (
      <>
        Reach out to the business that sent you the request — they can guide you through it or
        send a fresh link if anything has gone wrong.
      </>
    ),
  },
];
