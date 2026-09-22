# WhatsApp Business Auto-Reply Bot (Vercel + Airtable version)

## What this is
A small server that:
1. Receives WhatsApp messages sent to your business number
2. Automatically replies based on simple keyword rules (edit these inside `api/webhook.js`)
3. Saves every customer's name, phone number, and message as a row in your Airtable base — that's your CRM, viewable as a normal spreadsheet

## Files in this project
- `api/webhook.js` — the actual program that talks to WhatsApp and Airtable
- `api/index.js` — a simple homepage so you can confirm the server is alive
- `vercel.json` — tells Vercel how to route the homepage
- `package.json` — a list of tools the program needs to run
- `.env.example` — a template showing which secret values you'll need to add later (into Vercel's dashboard, never uploaded as a real file)

## You do not need to run anything on your own computer.
Claude will guide you step by step to put this online for free using GitHub + Vercel + Airtable — no credit card required anywhere in this setup.
