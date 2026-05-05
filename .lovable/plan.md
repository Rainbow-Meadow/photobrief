## Plan: "Current setup" overview for beta companies

This is a one-off data task — no app code changes. I'll run a script that uses Firecrawl + Lovable AI to scrape each company's site and produce a CSV.

### Inputs
- You upload the beta company list (CSV/XLSX) in your next message. I'll auto-detect columns for company name and website (and use email/notes if present).

### Steps
1. Read the uploaded file (`code--copy` from `user-uploads://`, then parse with pandas).
2. For each company:
   a. Firecrawl `map` the site to find a `/contact`, `/get-quote`, `/estimate`, `/book`, etc. page.
   b. Firecrawl `scrape` the homepage + best contact page (markdown + html + links).
   c. Pass the scraped content to Lovable AI (`google/gemini-3-flash-preview`) with a structured-output schema to extract:
      - Contact form URL + form fields (labels, types, required, file upload?)
      - Contact pathways (emails, phone numbers, SMS/WhatsApp, chat widget, scheduling links like Calendly/HCP/Jobber portals)
      - Existing photo intake (file upload widgets, "send us a photo" copy, customer portals)
      - Plain-English 1–2 sentence "current setup" summary
3. Write results to `/mnt/documents/beta-current-setup.csv` with columns:
   `company, website, contact_page_url, form_fields, contact_emails, phone_numbers, other_channels, photo_intake, current_setup_summary, scrape_notes`
4. Also write a companion `/mnt/documents/beta-current-setup.md` with one readable section per company (easier to skim than CSV cells).
5. Surface both as `<lov-artifact>` so you can download.

### Guardrails
- Throttle: 1 req/sec to Firecrawl, retry once on 5xx, mark `scrape_notes=error` on failure rather than aborting the whole batch.
- Skip rows with no website. Normalize URLs (add `https://` if missing).
- Cap to ~25 companies per run to stay inside Firecrawl credits; if the list is larger I'll confirm before continuing.
- All work in `/tmp/` for scripts, outputs in `/mnt/documents/`.

### What I need from you next
Approve this plan, then upload the beta list file in your next message.