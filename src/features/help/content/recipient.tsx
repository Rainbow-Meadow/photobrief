import type { GuideStepProps } from "../components/GuideStep";

export const recipientSteps: GuideStepProps[] = [
  {
    number: 1,
    title: "Open the link your contractor sent",
    body: (
      <>
        You’ll get a link by email or text from the business you’re working with. Tap it on your
        phone — no app or sign-in needed.
      </>
    ),
    whatYouSee: <>A friendly chat-style page with the business’s logo at the top.</>,
  },
  {
    number: 2,
    title: "Follow the chat",
    body: (
      <>
        The chat tells you exactly what photo to take next, one at a time. A progress bar at the
        top shows how close you are to finishing.
      </>
    ),
    screenshot: {
      src: "/help/recipient-chat.png",
      alt: "Recipient chat page showing a photo prompt and a capture tile",
      ratio: "9/16",
      pins: [
        { x: 50, y: 8, label: 1, note: "Progress bar — how many photos left" },
        { x: 50, y: 40, label: 2, note: "What to photograph next" },
        { x: 50, y: 75, label: 3, note: "Tap to take or upload a photo" },
      ],
    },
  },
  {
    number: 3,
    title: "Take or upload a photo",
    body: (
      <>
        Tap the camera tile. Your phone opens its camera so you can shoot the photo right then —
        or pick one from your gallery if you already have it.
      </>
    ),
  },
  {
    number: 4,
    title: "Read the AI feedback",
    body: (
      <>
        After each photo, you’ll get a quick check from our AI:{" "}
        <strong className="text-emerald-600 dark:text-emerald-400">green</strong> means it looks
        good, <strong className="text-amber-600 dark:text-amber-400">yellow</strong> means it
        could be better (e.g. blurry, too far away, wrong angle).
      </>
    ),
    screenshot: {
      src: "/help/recipient-feedback.png",
      alt: "AI feedback bubble with Retake and Use anyway buttons",
      ratio: "9/16",
      pins: [
        { x: 50, y: 35, label: 1, note: "AI feedback message" },
        { x: 30, y: 75, label: 2, note: "Retake — recommended if it’s yellow" },
        { x: 70, y: 75, label: 3, note: "Use anyway — keeps this photo" },
      ],
    },
  },
  {
    number: 5,
    title: "Retake or use anyway",
    body: (
      <>
        If the feedback is yellow, <strong>Retake</strong> usually saves you time later — your
        contractor may otherwise ask you to do it again. Tap <strong>Use anyway</strong> only if
        you’re sure.
      </>
    ),
    warn: (
      <>
        Using a flagged photo can delay your job if the business needs to send the request back.
      </>
    ),
  },
  {
    number: 6,
    title: "Answer any short questions",
    body: (
      <>
        Some requests include a quick question or two (for example: “How old is the unit?”). Tap
        an answer or type a short reply.
      </>
    ),
  },
  {
    number: 7,
    title: "Review and submit",
    body: (
      <>
        At the end you’ll see a summary of every photo and answer. Scroll through it once, then
        tap <strong>Submit</strong>. You’ll get a confirmation screen — that’s it, you’re done.
      </>
    ),
    screenshot: {
      src: "/help/recipient-review.png",
      alt: "Review summary with all photos thumbnailed and a Submit button",
      ratio: "9/16",
    },
    whatYouSee: <>A confirmation page that thanks you and tells you what happens next.</>,
  },
];
