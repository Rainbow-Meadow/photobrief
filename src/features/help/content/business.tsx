import type { GuideStepProps } from "../components/GuideStep";

export const businessSteps: GuideStepProps[] = [
  {
    number: 1,
    title: "What PhotoBrief does",
    body: (
      <>
        PhotoBrief turns your photo requests into a guided chat for your customer. They follow the
        prompts, our AI checks each photo, and you get a clean, reviewable submission — no more
        chasing blurry pictures over text.
      </>
    ),
  },
  {
    number: 2,
    title: "Tour your Dashboard",
    body: (
      <>
        Your Dashboard surfaces the four numbers that matter:{" "}
        <strong>Ready to review</strong> (action needed from you),{" "}
        <strong>Needs customer action</strong> (waiting on the recipient),{" "}
        <strong>In progress</strong> (recipient has started), and{" "}
        <strong>Refunded this period</strong> (requests we credited back under the first-pass
        guarantee).
      </>
    ),
    screenshot: {
      src: "/help/dashboard-overview.png",
      alt: "Dashboard with four metric cards and a recent requests list",
      pins: [
        { x: 12, y: 22, label: 1, note: "Click any metric to filter the inbox" },
        { x: 50, y: 60, label: 2, note: "Recent requests with status and readiness" },
        { x: 92, y: 12, label: 3, note: "Open the AI assistant from the corner button" },
      ],
    },
  },
  {
    number: 3,
    title: "Create a request",
    body: (
      <>
        Two ways: pick a <strong>Template</strong> from the library, or use the{" "}
        <strong>AI builder</strong> (Pro+) to describe the job and get a draft. Edit any step,
        question, or message before sending.
      </>
    ),
    tip: <>Save a customised draft as your own guide so you can reuse it next time.</>,
  },
  {
    number: 4,
    title: "Customise a guide",
    body: (
      <>
        Head to <strong>Guides → New</strong> to build a reusable photo guide from scratch. Add
        steps, written prompts, optional example images, and short context questions. Your saved
        guides appear in the template picker.
      </>
    ),
  },
  {
    number: 5,
    title: "Send the link",
    body: (
      <>
        If you entered an email, we send it for you the moment you create the request. Either way,
        the request detail page has a <strong>Copy link</strong> button you can paste into SMS,
        WhatsApp, or anywhere else.
      </>
    ),
    whatYouSee: (
      <>
        A toast saying “Email sent to {`{customer}`}” — or a “Request created” toast with a copy
        button when no email was provided.
      </>
    ),
  },
  {
    number: 6,
    title: "What your customer sees",
    body: (
      <>
        They open a chat-style page with your branding (set under{" "}
        <strong>Settings → Brand</strong>), follow numbered photo prompts, get instant AI
        feedback, answer a few short questions, and submit. See the{" "}
        <a className="text-primary underline-offset-4 hover:underline" href="#recipient">
          For Customers
        </a>{" "}
        section for the full walkthrough you can forward to them.
      </>
    ),
  },
  {
    number: 7,
    title: "Track request status",
    body: (
      <>
        In the Inbox, every request carries one of these statuses:{" "}
        <strong>Sent</strong> (link delivered), <strong>Needs customer action</strong> (we’re
        nudging them), <strong>In progress</strong> (started capturing),{" "}
        <strong>Submitted</strong> (ready for you), <strong>Reviewed</strong> (you accepted it),
        and <strong>Archived</strong>. Filter by status from the top of the inbox.
      </>
    ),
    screenshot: {
      src: "/help/inbox-statuses.png",
      alt: "Requests inbox with status filter and rows showing badges",
      pins: [
        { x: 14, y: 16, label: 1, note: "Status filter" },
        { x: 60, y: 50, label: 2, note: "Status badges per request" },
        { x: 92, y: 50, label: 3, note: "Row actions: copy link, remind, archive" },
      ],
    },
  },
  {
    number: 8,
    title: "Review a submission",
    body: (
      <>
        Open any submitted request to see all photos as <strong>shot cards</strong>, the AI
        verdict per shot, and an overall <strong>readiness score</strong> from 0–100. A higher
        score means everything looks good on first pass.
      </>
    ),
    screenshot: {
      src: "/help/submission-review.png",
      alt: "Submission review page with shot cards and readiness score",
      pins: [
        { x: 18, y: 18, label: 1, note: "Overall readiness score" },
        { x: 50, y: 55, label: 2, note: "Per-photo AI verdict and notes" },
        { x: 88, y: 18, label: 3, note: "Ask for more / Accept actions" },
      ],
    },
    tip: (
      <>
        Rule of thumb: <strong>0–60</strong> needs work, <strong>60–85</strong> is acceptable,{" "}
        <strong>85+</strong> is great.
      </>
    ),
  },
  {
    number: 9,
    title: "Ask for more photos",
    body: (
      <>
        If a shot is missing or unclear, click <strong>Ask for more</strong>, tick the shots that
        need redoing, add a short comment per shot, and send. Your customer gets a fresh link that
        opens straight to the items you flagged — no need to redo everything.
      </>
    ),
    warn: (
      <>
        Asking for more counts as a rework on that request — but if the original was rejected on
        first pass, the credit goes back to your monthly allowance automatically.
      </>
    ),
  },
  {
    number: 10,
    title: "Branding, settings, and billing",
    body: (
      <>
        Under <strong>Settings</strong> you can set your <strong>Brand</strong> (logo + colour
        used on the recipient page), edit <strong>Templates</strong> for emails and SMS, hook up{" "}
        <strong>SMS</strong> with Twilio, invite your <strong>Team</strong>, and manage{" "}
        <strong>Billing</strong> — including buying <strong>top-up packs</strong> if you run out
        of monthly requests before your renewal date.
      </>
    ),
    screenshot: {
      src: "/help/billing-topups.png",
      alt: "Billing page showing the active plan and the top-up pack cards",
      ratio: "16/9",
      pins: [
        { x: 25, y: 28, label: 1, note: "Your current plan and usage" },
        { x: 70, y: 70, label: 2, note: "Top-up packs: 25, 100, or 500 extra requests" },
      ],
    },
  },
];

export const businessChecklist = [
  { id: "biz-brand", label: "Set my logo and brand colour in Settings → Brand" },
  { id: "biz-template", label: "Send a test request to myself using a template" },
  { id: "biz-customise", label: "Save a customised guide for my most common job" },
  { id: "biz-review", label: "Walk through reviewing a submission end-to-end" },
  { id: "biz-team", label: "Invite a teammate (if applicable)" },
];
