# Gartic Highlights Gallery

A simple test website using Cloudflare Pages and Workers.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Login to Cloudflare (if not already):
   ```bash
   npx wrangler auth login
   ```

3. Deploy the worker:
   ```bash
   npx wrangler deploy
   ```

4. Deploy the Pages site:
   - If using git integration, push to the connected branch.
   - Or use: `npx wrangler pages deploy .`

## URLs

- Pages: https://gartic-highlights-gallery.pages.dev
- Worker: https://gartic-highlights-gallery.angrylizard.workers.dev

## Description

- Frontend: Basic HTML/JS that displays a random number from the worker.
- Backend: TypeScript Cloudflare Worker returning a random integer (1-100) as JSON.