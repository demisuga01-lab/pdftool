Create a professional README.md file for the root of the PDFTools by WellFriend repository.
GitHub URL: https://github.com/demisuga01-lab/pdftool
Live site: https://tools.wellfriend.online
Contact: contact@wellfriend.online

The README must include:

1. Header section:
   - Project name: PDFTools by WellFriend
   - One line description: Free, open-source PDF and image processing toolkit
   - Badges (use shields.io markdown badges):
     - License: MIT
     - Next.js version: 16
     - FastAPI version
     - Open Source: Yes
     - Live: tools.wellfriend.online
   - Screenshot placeholder: "![PDFTools Screenshot](docs/screenshot.png)"

2. About section:
   PDFTools by WellFriend is a free, open-source web application for 
   processing PDF and image files. No signup required, no file size 
   restrictions on the web interface, and all uploaded files are 
   automatically deleted within 24 hours.
   
   Built for developers, designers, and anyone who works with documents daily.

3. Features section:
   PDF Tools (14 tools):
   - Compress PDF (Ghostscript)
   - Merge PDFs (QPDF)
   - Split PDF (QPDF)
   - Rotate PDF (QPDF)
   - Extract Text (Poppler)
   - PDF to Images (MuPDF)
   - Images to PDF (img2pdf)
   - Office to PDF (LibreOffice)
   - Protect PDF (QPDF)
   - Decrypt PDF (QPDF)
   - PDF to Word (pdf2docx)
   - PDF to Excel (camelot)
   - PDF to HTML (pdftohtml)
   - PDF Page Thumbnails with drag-to-reorder workspace

   Image Tools (11 tools):
   - Convert Image (libvips)
   - Resize Image (libvips)
   - Compress Image (libvips)
   - Crop Image (libvips)
   - Rotate Image (libvips)
   - Watermark Image (ImageMagick)
   - Remove Background (OpenCV)
   - OCR Image (Tesseract)
   - Batch Resize (libvips)
   - Image Info (libvips)
   - SVG to Image (Inkscape)

4. Tech Stack section:
   Frontend:
   - Next.js 16 (App Router)
   - TypeScript
   - Tailwind CSS
   - pdfjs-dist (PDF preview)
   - dnd-kit (drag and drop)

   Backend:
   - FastAPI (Python 3.12)
   - Celery + Redis (job queue)
   - Uvicorn

   Processing Libraries:
   - Ghostscript 10.02 (PDF compression)
   - MuPDF 1.23 (PDF rendering)
   - QPDF 11.9 (PDF manipulation)
   - Poppler 24.02 (text extraction)
   - LibreOffice 24.2 headless (office conversion)
   - ImageMagick 6.9 (image processing)
   - libvips 8.15 (fast image operations)
   - Tesseract 5.3 (OCR)
   - OpenCV (background removal)
   - pdf2docx (PDF to Word)
   - camelot-py (PDF to Excel)
   - Inkscape (SVG conversion)

   Infrastructure:
   - Ubuntu 24.04 (AWS ap-south-1)
   - Nginx (reverse proxy)
   - PM2 (process management)
   - Let's Encrypt SSL

5. Architecture section:
   Simple text diagram showing:
   
   User uploads file
        |
   Next.js frontend (port 3000)
        |
   Nginx reverse proxy
        |
   FastAPI backend (port 8000)
        |
   Celery worker (fast queue / heavy queue)
        |
   Redis (job queue + results)
        |
   Processing tools (Ghostscript, MuPDF, etc)
        |
   Output file → User downloads

6. Self-hosting section:
   Requirements:
   - Ubuntu 22.04 or 24.04
   - 4GB RAM minimum (8GB recommended)
   - 20GB disk space
   - Node.js 22+
   - Python 3.12+
   - Docker (for Redis)

   Step by step:
   
   Step 1: Clone the repository
   git clone https://github.com/demisuga01-lab/pdftool.git
   cd pdftool

   Step 2: Install system dependencies
   (link to docs/INSTALL.md — create this file too)
   
   Step 3: Set up backend
   cd backend
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   cp .env.example .env
   (edit .env with your settings)

   Step 4: Set up frontend
   cd frontend
   pnpm install
   pnpm build

   Step 5: Start Redis
   docker run -d -p 6379:6379 redis:7-alpine

   Step 6: Start services
   pm2 start "uvicorn app.main:app --host 0.0.0.0 --port 8000" --name pdftool-api --cwd backend
   pm2 start "pnpm start" --name pdftool-frontend --cwd frontend
   pm2 start "celery -A app.workers.celery_app worker -Q fast -n fast@%h --concurrency=4 --loglevel=info" --name pdftool-worker-fast --cwd backend
   pm2 start "celery -A app.workers.celery_app worker -Q heavy -n heavy@%h --concurrency=2 --loglevel=info" --name pdftool-worker-heavy --cwd backend

   Step 7: Configure Nginx
   (link to docs/NGINX.md)

7. Environment variables section:
   Table showing all .env variables:
   REDIS_URL, DATA_DIR, UPLOAD_DIR, OUTPUT_DIR, TEMP_DIR, 
   MAX_FILE_SIZE_MB, ALLOWED_ORIGINS
   With description and example value for each

8. API section (brief, Coming Soon):
   PDFTools API is currently in development.
   Developers will be able to integrate all 25 tools via REST API.
   
   Planned endpoint format:
   POST https://tools.wellfriend.online/api/v1/pdf/compress
   Header: X-API-Key: your_api_key
   
   For early access: contact@wellfriend.online
   Pricing: https://tools.wellfriend.online/pricing

9. Contributing section:
   Contributions are welcome.
   
   Steps:
   1. Fork the repository
   2. Create a feature branch: git checkout -b feature/your-feature
   3. Commit changes: git commit -m "add your feature"
   4. Push: git push origin feature/your-feature
   5. Open a Pull Request
   
   Please open an issue before working on large changes.

10. License section:
    This project is open source.
    
    Note on dependencies:
    This project uses Ghostscript (AGPL v3) and MuPDF (AGPL v3) as 
    system-level tools. These are not bundled with this repository.
    You must install them separately and comply with their respective licenses.
    See the full dependency list in docs/LICENSES.md

11. Contact section:
    - Website: https://tools.wellfriend.online
    - Email: contact@wellfriend.online
    - GitHub Issues: https://github.com/demisuga01-lab/pdftool/issues
    - API inquiries: contact@wellfriend.online

Also create docs/INSTALL.md with full system dependency installation 
commands for Ubuntu 24.04 covering all tools listed in the tech stack.

Also create backend/.env.example with all environment variables 
and placeholder values.

Format the README with clean markdown, proper heading hierarchy,
code blocks for all commands, and a table of contents at the top
linking to each section.
