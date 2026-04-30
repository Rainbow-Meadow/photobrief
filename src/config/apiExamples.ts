/**
 * Single source of truth for the API code samples shown on /for-ai-agents
 * and (eventually) inside the in-app docs. Keep these in sync with the
 * OpenAPI spec at /public/openapi.json.
 */
export const API_BASE_URL = "https://app.photobrief.ai/functions/v1";

export const API_EXAMPLES = {
  curl: `curl -X POST ${API_BASE_URL}/api-create-request \\
  -H "Authorization: Bearer pb_live_xxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "recipient_name": "Jane Smith",
    "recipient_email": "jane@example.com",
    "custom_message": "Hi Jane — please grab a few photos so we can quote your roof repair."
  }'`,
  javascript: `const res = await fetch("${API_BASE_URL}/api-create-request", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.PHOTOBRIEF_API_KEY}\`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    recipient_name: "Jane Smith",
    recipient_email: "jane@example.com",
    custom_message: "Hi Jane — please grab a few photos so we can quote your roof repair.",
  }),
});

const { recipient_url } = await res.json();
// → forward recipient_url to your customer via SMS or email`,
  python: `import os, requests

res = requests.post(
    "${API_BASE_URL}/api-create-request",
    headers={
        "Authorization": f"Bearer {os.environ['PHOTOBRIEF_API_KEY']}",
        "Content-Type": "application/json",
    },
    json={
        "recipient_name": "Jane Smith",
        "recipient_email": "jane@example.com",
        "custom_message": "Hi Jane — please grab a few photos so we can quote your roof repair.",
    },
    timeout=30,
)
res.raise_for_status()
print(res.json()["recipient_url"])`,
} as const;

export type ApiExampleLang = keyof typeof API_EXAMPLES;
