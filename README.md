# N26 Decoder Form & Web Display

## Overview
Google Form + Apps Script system for collecting CRuX Decoder submissions, with a public web page showing available tapes and decoders.

## Current Status

### Working
- ✅ Google Form with dropdowns populated from Sheets
- ✅ Form submissions mark items as claimed (FACTION column)
- ✅ Dropdowns refresh after each submission (prevents duplicates)
- ✅ Static web page at `web/index.html` displays available items
- ✅ Python server: `python3 -m http.server 8000` in `web/` directory
- ✅ CORS proxy working via `allorigins.win`

### In Progress
- 🔄 Displaying thumbnail images from Google Drive on the web page

## Files

### `Code.js` (Apps Script)
- `setup()` - Run once to initialize form dropdowns and triggers
- `populateDropdowns()` - Updates form choices from Sheets (available items only)
- `onFormSubmit(e)` - Triggered on form submit, marks items claimed, refreshes dropdowns
- `markAsClaimed(sheetName, itemName, faction)` - Updates FACTION column in sheets
- `updateClaimedTab(tape, decoder, faction)` - Logs claims to "Claimed" sheet

### `web/index.html`
- Cyberpunk-styled display page
- Fetches CSV data via CORS proxy: `https://api.allorigins.win/raw?url=...`
- Grid layout of tapes and decoders with availability status

## Configuration

- **Sheet ID**: `1MRDIEWWvGdmcUsqj7w4OimqAN2s0e2zk2Eb7R24hV58`
- **Form ID**: `1RhrIR0lhoG4BGFXkLVVGFgZC8L8Bmu8-TE1iOkP2r_Q`
- **Data Tapes GID**: `728525452`
- **Decoders GID**: `86947292`
- **Drive Folder**: `https://drive.google.com/drive/folders/1LxW8JGES8nj95FSL4QIvVRWG455xBjg7`

## Image Integration Challenge

### Problem
Need to display tape/decoder thumbnail images from Google Drive on the static web page.

### Approaches Tried

1. **webReader MCP** - Cannot authenticate to Google Drive
2. **google-docs skill** - Ruby dependencies not installed
3. **Scraping Drive folder page** - Page is JavaScript-rendered, file IDs found but they appear to be subfolders not images
4. **Direct image URL format** - `https://drive.google.com/uc?export=view&id=FILE_ID` redirects to HTML, not images

### Working Solution (Recommended)

**Add "Image URL" column to sheets**, populated via Apps Script using DriveApp API:

```javascript
function populateImageUrls() {
  const DRIVE_FOLDER_ID = '1LxW8JGES8nj95FSL4QIvVRWG455xBjg7';
  const ss = SpreadsheetApp.openById(SHEET_ID);

  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const files = folder.getFiles();
  const fileMap = {};

  // Build filename -> URL map
  while (files.hasNext()) {
    const file = files.next();
    const baseName = file.getName().replace(/\.(jpg|jpeg|png|gif)$/i, '').toLowerCase();
    const url = 'https://lh3.googleusercontent.com/d/' + file.getId() + '=w400';
    fileMap[baseName] = url;
  }

  // Update sheets with image URLs
  // ... (match by name and write to IMAGE URL column)
}
```

### DriveApp Image URL Format
```
https://lh3.googleusercontent.com/d/[FILE_ID]=w400
```
- `=w400` sets width to 400px
- Also supports: `=w400-h300`, `=s400` (square crop)

## Deployment

### Update Apps Script
```bash
cd /Users/stephenng/Documents/Neotropolis/n26-decoder-form
clasp push
```

### Run Setup
1. Open Apps Script editor in browser
2. Run `setup()` function once
3. Form dropdowns will be populated
4. Trigger will be created

### Run Web Server
```bash
cd /Users/stephenng/Documents/Neotropolis/n26-decoder-form/web
python3 -m http.server 8000
```
Visit: `http://localhost:8000`

## Next Steps

1. **Add `populateImageUrls()` function to Code.js**
2. **Add IMAGE URL column to Data Tapes and Decoders sheets**
3. **Run `populateImageUrls()` to populate URLs**
4. **Update web/index.html to display images from CSV**
5. **Deploy web page to ghpages.io or similar for public access**

## Notes

- Drive folder appears to contain subfolders (e.g., "Claimed")
- File IDs extracted from folder page (may be subfolders, not images):
  - 1H3X6IP_duQFYQ65BiwV6RM_OJ2r5Hcad
  - 1JyRgrvXvTs1zpU0w7NN9b-RC04lUOawu
  - 1sWJAeKJQpZXSHxV5EDAERgwWm4oX-LBV
  - (and ~35 more)
- Need to confirm actual structure: are images directly in folder, or in subfolders?
