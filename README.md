# N26 Decoder Form - Web Display

Public web page for the CRuX Industries N26 Decoder Form. Shows available data tapes and decoder keys that players can claim.

**Live Site:** https://stephen5ng.github.io/n26-decoder-form/

## How It Works

1. **Players claim items** via Google Form with dropdown selections
2. **Form backend** (Apps Script) marks items as claimed in Sheets
3. **Web page** fetches live data and displays available items in a grid
4. **Images** are loaded from Google Drive with names visible on hover

## Current Implementation

- ✅ Form dropdowns auto-populated from Sheets (available items only)
- ✅ Form submissions automatically mark items claimed
- ✅ GitHub Pages deployment at `docs/index.html`
- ✅ Live data fetched from Apps Script web app endpoint
- ✅ Cyberpunk UI with hover tooltips showing item names
- ✅ Fallback text displays when images are missing/broken

## Development

### Edit the web page

```bash
# Edit files in docs/
nano docs/index.html

# Test locally
python3 -m http.server 8000 -d docs/

# Deploy (push to main)
git add docs/
git commit -m "Description of changes"
git push origin main
```

GitHub Pages automatically updates from the `docs/` folder.

### Update Apps Script backend

Edit `Code.js` and deploy via clasp:
```bash
clasp push
```

## Files

- **`docs/index.html`** - Web page (frontend)
- **`Code.js`** - Apps Script backend
- **`docs/favicon.ico`** - Logo
