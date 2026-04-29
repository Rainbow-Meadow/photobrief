import type { GuideStepProps } from "../components/GuideStep";

export const quickStartSteps: GuideStepProps[] = [
  {
    number: 1,
    title: "Open New request",
    body: (
      <>
        From the sidebar (or the bottom tab bar on mobile), tap{" "}
        <strong>Requests → New request</strong>. You can also use the{" "}
        <strong>+ New request</strong> button in the top header.
      </>
    ),
    screenshot: {
      src: "/help/requests-new-template.png",
      alt: "The New request page with the Template tab selected",
      pins: [
        { x: 18, y: 14, label: 1, note: "Switch between Template and AI builder (AI is on Pro+)" },
        { x: 24, y: 50, label: 2, note: "Pick a starter template" },
        { x: 78, y: 50, label: 3, note: "Edit the draft on the right" },
      ],
    },
    whatYouSee: <>A two-column layout: templates on the left, an editable draft on the right.</>,
  },
  {
    number: 2,
    title: "Pick a template (or describe what you need)",
    body: (
      <>
        Tap any template card — it loads a ready-made photo guide into the draft. Prefer to type
        what you need? Switch to the <strong>AI builder</strong> tab and describe the job in plain
        English.
      </>
    ),
    tip: <>The AI builder is available on Pro and above. Templates work on every plan.</>,
  },
  {
    number: 3,
    title: "Add the customer’s name and contact",
    body: (
      <>
        On the right-hand draft, fill in the recipient’s <strong>name</strong> and either an{" "}
        <strong>email</strong> or <strong>phone number</strong>. We’ll email the link automatically
        if you give us an email.
      </>
    ),
  },
  {
    number: 4,
    title: "Click Create request",
    body: (
      <>
        We create the request, generate a unique link for your customer, and email it for you when
        possible. You’ll land on the request detail page where you can copy the link or send a
        reminder later.
      </>
    ),
    whatYouSee: <>A toast confirming the request was created and the email was sent.</>,
  },
  {
    number: 5,
    title: "Review the submission",
    body: (
      <>
        When the customer finishes, the request shows up under{" "}
        <strong>Dashboard → Ready to review</strong>. Open it, scan the AI feedback and readiness
        score, then either accept it or use <strong>Ask for more photos</strong> to request
        retakes.
      </>
    ),
    tip: (
      <>
        First-pass acceptance counts toward your guarantee — if you have to ask for more, that
        request is automatically refunded back into your monthly allowance.
      </>
    ),
  },
];

export const quickStartChecklist = [
  { id: "qs-1", label: "Open Requests → New request" },
  { id: "qs-2", label: "Pick a template that fits the job" },
  { id: "qs-3", label: "Add the customer’s name + email/phone" },
  { id: "qs-4", label: "Create the request and copy/send the link" },
  { id: "qs-5", label: "Review the submission and accept or ask for more" },
];
