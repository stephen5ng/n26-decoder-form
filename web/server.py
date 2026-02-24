#!/usr/bin/env python3
"""HTTP server that serves static files, proxies Google Sheets data and Drive images via service account."""

import http.server
import io
import os
import re

from PIL import Image
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload

PORT = 8000
SHEET_ID = '1MRDIEWWvGdmcUsqj7w4OimqAN2s0e2zk2Eb7R24hV58'
SERVICE_ACCOUNT_FILE = os.path.expanduser('~/.mcp-credentials/service-account.json')
SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
]
RANGES = {'tapes': 'Data Tapes!A:D', 'decoders': 'Decoders!A:D'}

creds = service_account.Credentials.from_service_account_file(SERVICE_ACCOUNT_FILE, scopes=SCOPES)
sheets_service = build('sheets', 'v4', credentials=creds)
drive_service = build('drive', 'v3', credentials=creds)

# Simple in-memory cache for images
image_cache = {}


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.startswith('/api/sheet/'):
            self.handle_sheet()
        elif self.path.startswith('/api/image/'):
            self.handle_image()
        else:
            super().do_GET()

    def handle_sheet(self):
        sheet_name = self.path.split('/api/sheet/')[1].split('?')[0]
        range_str = RANGES.get(sheet_name)
        if not range_str:
            self.send_error(404, 'Unknown sheet')
            return
        try:
            result = sheets_service.spreadsheets().values().get(
                spreadsheetId=SHEET_ID, range=range_str
            ).execute()
            rows = result.get('values', [])
            csv_lines = []
            for row in rows:
                while len(row) < 4:
                    row.append('')
                csv_lines.append(','.join(f'"{c}"' for c in row[:4]))
            csv_text = '\n'.join(csv_lines)
            self.send_response(200)
            self.send_header('Content-Type', 'text/csv')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(csv_text.encode())
        except Exception as e:
            self.send_error(502, str(e))

    def handle_image(self):
        file_id = self.path.split('/api/image/')[1].split('?')[0]
        # Validate file ID format
        if not re.match(r'^[a-zA-Z0-9_-]+$', file_id):
            self.send_error(400, 'Invalid file ID')
            return
        try:
            # Check cache
            if file_id in image_cache:
                data, mime = image_cache[file_id]
            else:
                # Get file metadata for mime type
                meta = drive_service.files().get(
                    fileId=file_id, fields='mimeType',
                    supportsAllDrives=True
                ).execute()
                mime = meta.get('mimeType', 'image/png')
                # Download file content
                request = drive_service.files().get_media(
                    fileId=file_id, supportsAllDrives=True
                )
                buf = io.BytesIO()
                downloader = MediaIoBaseDownload(buf, request)
                done = False
                while not done:
                    _, done = downloader.next_chunk()
                # Resize to 1/4 (half width, half height)
                img = Image.open(buf)
                new_size = (img.width // 2, img.height // 2)
                img = img.resize(new_size, Image.LANCZOS)
                out = io.BytesIO()
                img.save(out, format=img.format or 'PNG', optimize=True)
                data = out.getvalue()
                mime = 'image/png'
                image_cache[file_id] = (data, mime)

            self.send_response(200)
            self.send_header('Content-Type', mime)
            self.send_header('Cache-Control', 'public, max-age=86400')
            self.end_headers()
            self.wfile.write(data)
        except Exception as e:
            self.send_error(502, str(e))

    def log_message(self, format, *args):
        # Quieter logging — skip image cache hits
        msg = format % args
        if '/api/image/' in msg and '200' in msg:
            return
        super().log_message(format, *args)


if __name__ == '__main__':
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print(f'Serving on http://localhost:{PORT}')
    print(f'  Static files: ./')
    print(f'  Sheet API:    /api/sheet/tapes, /api/sheet/decoders')
    print(f'  Image proxy:  /api/image/<file_id>')
    http.server.HTTPServer(('', PORT), Handler).serve_forever()
