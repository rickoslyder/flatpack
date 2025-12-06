# Flatpack

## Project Description
A local-first preprocessing tool that transforms messy folder structures and ZIP archives into NotebookLM-optimized flat file sets. Preserves citation granularity by burning folder hierarchy into filenames and injecting context metadata, while respecting NotebookLM's 300-source and 500K-word limits through intelligent bundling.

Desktop app (Tauri + React) as primary target with full feature set; web app as secondary with viable feature subset. All processing local by default; cloud-assisted processing as optional Phase 2.

## Target Audience
- Primary: NotebookLM Pro users ingesting complex project folders
- Secondary: Researchers, analysts, and knowledge workers with large document collections
- Tertiary: NotebookLM free tier users needing to optimize for 50-source limit

## Desired Features

### Core Ingestion
- [ ] Accept folder drag-and-drop
- [ ] Accept ZIP file upload
- [ ] Recursive directory scanning
- [ ] File/token counting and analysis
- [ ] Support for nested folder structures of arbitrary depth
- [ ] Ignore patterns:
    - [ ] Default ignore list: `node_modules`, `.git`, `__pycache__`, `.DS_Store`, `.Spotlight-V100`, `.Trashes`, `Thumbs.db`, `*.log`, `.env.local`
    - [ ] User-configurable custom glob patterns
    - [ ] Per-session override option

### Tier Selection & Optimization
- [ ] User selects tier upfront (Free: 50 sources / Pro: 300 sources)
- [ ] Tool optimizes output to respect selected tier's limits
- [ ] Display warnings when input significantly exceeds tier capacity

### Preview Before Processing
- [ ] Show processing plan before execution
- [ ] File count breakdown:
    - [ ] Files to keep as individual sources
    - [ ] Files to be merged (grouped by target bundle)
    - [ ] Files to be chunked (with part count)
- [ ] Warnings displayed:
    - [ ] Files that will fail (unsupported, copy-protected)
    - [ ] Files requiring OCR (slow processing warning)
    - [ ] Large files approaching limits (soft warning at 200K words)
    - [ ] Naming collisions and resolution
- [ ] Estimated output size and source count
- [ ] User confirms or adjusts before processing begins

### Smart Flattening (Under Limit)
- [ ] Path-to-filename conversion (e.g., `folder/sub/file.txt` → `folder_sub_file.txt`)
- [ ] Configurable path separator (underscore default, hyphen option)
- [ ] Preserve original file extensions (but content is Markdown)
- [ ] Handle naming collisions with numeric suffix (`_1`, `_2`)

### Semantic Bundling (Over Limit)
- [ ] Concatenate files by folder when source count exceeds limit
- [ ] Generate merged files with clear section headers per original file
- [ ] Prioritization strategy:
    - [ ] Merge deepest folders first (most nested = supporting material)
    - [ ] Within same depth, merge smallest folders first
    - [ ] Group by content type when merging (code with code, docs with docs)

### Context Preservation
- [ ] Inject YAML metadata header into processed files
    - [ ] Original path
    - [ ] Original filename
    - [ ] Related files
    - [ ] Processing notes (if chunked, merged, converted)
- [ ] Related files detection (local, deterministic):
    - [ ] Same directory siblings
    - [ ] Filename pattern matching (shared prefix/suffix)
    - [ ] Reference parsing (imports in code, links in Markdown)
- [ ] Generate `00_MASTER_STRUCTURE.md` tree map file
    - [ ] Text-based directory tree (similar to `tree` command output)
    - [ ] File descriptions where available
    - [ ] Processing summary and statistics

### Format Handling

#### Output Format
- [ ] All text-based formats convert to Markdown
- [ ] PDFs: User choice per-session
    - [ ] Convert to Markdown (recommended, default)
    - [ ] Preserve as PDF (for users who prefer native handling)

#### Tier 1 — Pass-through (text-based, converted to .md)
- [ ] Plain text: `.txt`
- [ ] Markdown: `.md`, `.mdx`
- [ ] Data: `.json`, `.yaml`, `.yml`, `.xml`, `.csv`, `.tsv`
- [ ] Code files: `.py`, `.js`, `.ts`, `.jsx`, `.tsx`, `.go`, `.rs`, `.java`, `.c`, `.cpp`, `.h`, `.hpp`, `.rb`, `.php`, `.swift`, `.kt`, `.sql`, `.sh`, `.bash`, `.zsh`, `.ps1`, `.r`, `.scala`, `.lua`, `.pl`, `.m`, `.css`, `.scss`, `.sass`, `.less`
- [ ] Config: `.ini`, `.toml`, `.env`, `.conf`, `.cfg`
- [ ] Wrap content in Markdown code blocks with language hint where appropriate

#### Tier 2 — Conversion to Markdown
- [ ] PDF: text extraction via pdf.js
    - [ ] Detect scanned/image-based PDFs, route to OCR
    - [ ] Handle copy-protected (flag as failed)
    - [ ] Optional: strip images for size optimization
- [ ] Word: `.docx`, `.doc` via mammoth.js
- [ ] Excel: `.xlsx`, `.xls` → Markdown tables via SheetJS
    - [ ] Each sheet as separate section within file
    - [ ] Large tables: truncate with note if exceeding reasonable display size
- [ ] PowerPoint: `.pptx`, `.ppt` → text + slide structure
    - [ ] Slide number headers, speaker notes included
- [ ] HTML: `.html`, `.htm` → Markdown via turndown
- [ ] Rich Text: `.rtf` → plain text
- [ ] eBooks: `.epub` → Markdown via epub.js
    - [ ] Preserve chapter structure

#### Tier 3 — OCR Processing (local, slower)
- [ ] Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.tiff`, `.bmp`
    - [ ] OCR via Tesseract
    - [ ] Output as Markdown with image source noted in header
- [ ] Scanned PDFs: detect low text-to-page ratio, route to OCR pipeline
- [ ] User warning about processing time for OCR files in preview
- [ ] Configurable OCR language (default: English, user can add language packs)

#### Unsupported (flagged in preview, moved to failures)
- [ ] Copy-protected/DRM PDFs
- [ ] Password-protected files
- [ ] Corrupted files
- [ ] Binary files without text content (executables, compiled code, etc.)

#### Phase 2 — Deferred
- [ ] Audio: `.mp3`, `.wav`, `.m4a`, `.ogg`, `.flac` → transcription (Whisper)
- [ ] Video: `.mp4`, `.mov`, `.webm`, `.avi` → audio extraction → transcription
- [ ] Cloud-assisted OCR option for higher accuracy/speed

### Chunking (Oversized Files)
- [ ] Hard limit: Split files exceeding 450K words
- [ ] Soft warning: Flag files exceeding 200K words in preview (configurable threshold)
- [ ] Split at semantic boundaries:
    - [ ] Markdown/HTML: headers (H1 > H2 > H3 priority)
    - [ ] Code: function/class boundaries where detectable
    - [ ] Plain text: paragraph breaks, blank lines
    - [ ] Fallback: split at word count boundary with overlap for context
- [ ] Link split parts via context headers:
    - [ ] Reference to total parts: "Part 2 of 4"
    - [ ] Link to adjacent parts
- [ ] Sequential naming: `SourceName_Part01.md`, `SourceName_Part02.md`

### Output
- [ ] Flat folder of processed files (Markdown unless PDF preservation selected)
- [ ] Manifest file (`FLATPACK_MANIFEST.json`):
    - [ ] Original → processed filename mapping
    - [ ] Word/token counts per file
    - [ ] Processing actions taken (passed, converted, merged, chunked)
    - [ ] Warnings and errors per file
    - [ ] Timestamp, settings used, tier selected
    - [ ] Summary statistics
- [ ] Failed files folder with:
    - [ ] Original files copied (preserves user data)
    - [ ] `FAILURES.md` explaining each failure with reason
- [ ] Desktop: "Open in Finder/Explorer" button
- [ ] Web: ZIP download + File System Access API where supported

### Error Handling
- [ ] Default behavior: Pause on error, prompt user
    - [ ] Options: Skip this file, Retry, Abort processing
- [ ] Toggle: "Continue on errors" mode
    - [ ] Process all files, collect failures at end
    - [ ] Display failure reasons clearly per file
    - [ ] "Retry All Failed" one-click button
- [ ] Non-blocking warnings (large files, slow OCR) don't pause processing
- [ ] Critical errors (disk full, permissions) halt immediately with clear message

### Configuration & Persistence
- [ ] Persist settings between sessions:
    - [ ] Desktop: Local config file (JSON in app data directory)
    - [ ] Web: localStorage
- [ ] Configurable options:
    - [ ] Default tier (Free/Pro)
    - [ ] Path separator preference (underscore/hyphen)
    - [ ] Ignore patterns (default list + custom globs)
    - [ ] PDF handling preference (convert/preserve)
    - [ ] Soft warning threshold for large files
    - [ ] OCR language selection
    - [ ] Error handling mode (pause/continue)
    - [ ] Default output location (desktop only)

## Design Requests

### Platform
- [ ] Desktop app: Tauri (Rust backend + React frontend)
    - [ ] macOS, Windows, Linux support
    - [ ] Native file system access
    - [ ] Full feature set including OCR
- [ ] Web app: React with feature subset
    - [ ] No local OCR (Tesseract too heavy for browser)
    - [ ] File System Access API where supported, ZIP fallback elsewhere
    - [ ] Consider WASM for PDF parsing

### Tech Stack
- [ ] Frontend: React + TypeScript
- [ ] Styling: Tailwind CSS + shadcn/ui components
- [ ] State management: Zustand or Jotai (lightweight)
- [ ] Desktop backend: Rust (Tauri)

### UI/UX Flow
- [ ] Three-phase interface:
    1. **Input Phase**: Large drag-and-drop zone, settings sidebar
        - [ ] Tier selector prominent
        - [ ] Quick access to ignore patterns
        - [ ] PDF handling toggle
    2. **Preview Phase**: Tree view of planned actions
        - [ ] Expandable/collapsible folder structure
        - [ ] Color-coded status: keep (green), merge (yellow), chunk (blue), fail (red), OCR (orange)
        - [ ] Edit actions inline where possible (exclude file, force merge, etc.)
        - [ ] "Process" and "Cancel" buttons
    3. **Processing Phase**: Progress view
        - [ ] Overall progress bar
        - [ ] Current file being processed
        - [ ] Running log of completed files
        - [ ] Error prompts (if not in continue mode)
    4. **Results Phase**: Summary view
        - [ ] Success/warning/failure counts with breakdown
        - [ ] Quick actions: Open folder, Download ZIP, Copy manifest path
        - [ ] "Retry Failed" button if failures exist
        - [ ] "Start Over" button

### Visual Design
- [ ] Clean, minimal interface
- [ ] Dark mode support (respect system preference, allow override)
- [ ] Clear visual hierarchy for warnings and errors
- [ ] Responsive layout (desktop app can be resized)

## Other Notes
- NotebookLM constraints: 300 sources (Pro), 50 sources (Free), 500K words/source, 200MB/source
- Markdown consistently outperforms PDF for NotebookLM comprehension—conversion to Markdown is the default recommendation
- No public NotebookLM API—manual drag-and-drop to NotebookLM remains required after Flatpack processing
- Privacy-first: All processing local by default; no data leaves the user's machine
- Tesseract OCR language packs can be bundled (English) or downloaded on-demand
- Phase 2 scope: Cloud-assisted processing, audio/video transcription, NotebookLM browser automation

## Open Questions (Decide Later)
- [ ] Accessibility: Full keyboard navigation, ARIA labels, screen reader support?
- [ ] Auto-updates: Tauri's built-in updater for desktop app?
- [ ] Telemetry: Anonymous usage analytics or strictly no telemetry?
- [ ] Licensing: Open source (MIT/Apache) or proprietary?