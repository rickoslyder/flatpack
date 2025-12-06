# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flatpack is a local-first preprocessing tool that transforms messy folder structures and ZIP archives into NotebookLM-optimized flat file sets. It burns folder hierarchy into filenames, injects context metadata, and respects NotebookLM's constraints (300 sources for Pro, 50 for Free, 500K words per source).

**Primary target**: Desktop app (Tauri + React) with full feature set including OCR
**Secondary target**: Web app with viable feature subset (no OCR, browser-compatible conversions only)

## Architecture

This is a **monorepo** with four packages:
- `packages/core` - Platform-agnostic processing logic (TypeScript)
- `packages/ui` - Shared React components, Zustand stores, and platform adapter interface
- `packages/desktop` - Tauri application (React frontend + Rust backend)
- `packages/web` - Web application (React + Web Workers)

**Key architectural patterns**:
- **PlatformAdapter**: Abstract interface that both TauriAdapter and WebAdapter implement for cross-platform compatibility
- **State management**: Zustand stores (configStore, sessionStore, processingStore)
- **Processing pipeline**: Scan → Analyze → Plan → Convert → Chunk → Bundle → Output

## Tech Stack

- Frontend: React + TypeScript
- Styling: Tailwind CSS + shadcn/ui
- State: Zustand
- Desktop backend: Rust (Tauri)
- Build: pnpm workspaces + Turborepo + Vite
- Testing: Vitest (unit/integration), Playwright (E2E)

## Build Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev              # Run all packages in dev mode
pnpm --filter @flatpack/web dev    # Web only
pnpm --filter @flatpack/desktop tauri dev  # Desktop only

# Build
pnpm build            # Build all packages
pnpm --filter @flatpack/core build

# Test
pnpm test             # Run all tests
pnpm --filter @flatpack/core test  # Core tests only
pnpm test:e2e         # E2E tests

# Lint and typecheck
pnpm lint
pnpm typecheck
```

## NotebookLM Constraints (Important for Implementation)

- **Source limits**: 300 sources (Pro), 50 sources (Free)
- **Per-source limits**: 500,000 words, 200MB file size
- **Optimal output format**: Markdown (outperforms PDF for NotebookLM comprehension)
- **Chunking threshold**: Split files exceeding 450K words at semantic boundaries
- **Soft warning**: Flag files exceeding 200K words

## Key Implementation Details

**Format tiers**:
- Tier 1 (Passthrough): txt, md, json, yaml, csv, code files → wrap in Markdown code blocks
- Tier 2 (Conversion): PDF, DOCX, XLSX, PPTX, HTML, EPUB, RTF → convert to Markdown
- Tier 3 (OCR): Images, scanned PDFs → Tesseract (desktop only)

**Processing strategy**:
- When under source limit: Flatten paths to filenames (folder/sub/file.txt → folder_sub_file.txt)
- When over source limit: Bundle files by merging deepest folders first, smallest folders first within same depth

**Output structure**:
- Flat folder of processed .md files
- `FLATPACK_MANIFEST.json` - mapping and statistics
- `00_MASTER_STRUCTURE.md` - directory tree and summary
- `_failures/` folder with unprocessed files and `FAILURES.md`

## Platform-Specific Considerations

**Desktop (Tauri)**:
- Full OCR via Tesseract
- Native file system access
- Rust commands in `packages/desktop/src-tauri/src/commands/`

**Web**:
- No OCR capability
- File System Access API with ZIP fallback
- Web Workers for heavy processing in `packages/web/src/workers/`
