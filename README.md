# Job Radar
Daily auto-updated job tracker (Govt/Bank/PSU, remote, MNC news) on free GitHub Pages.

## Deploy (5 min)
1. Create a public GitHub repo, upload all files (keep `.github/` folder).
2. Settings → Pages → Source: `main` branch, `/root` → Save.
3. Actions tab → enable workflows → "Daily job fetch" → Run workflow.
4. Open `https://<username>.github.io/<repo>/` — refreshes daily at 7 AM IST.

## Customise
- Search keywords / skills: `scripts/fetch.js` (GOVT, MNC, SKILLS arrays)
- Eligibility table & prep list: `index.html`
