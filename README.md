# Flatpack

A local-first preprocessing tool that transforms messy folder structures and ZIP archives into NotebookLM-optimized flat file sets.

## What it does

Flatpack takes your documents, code, and files and prepares them for optimal use with [NotebookLM](https://notebooklm.google.com/). It:

- **Flattens folder hierarchies** - Burns directory structure into filenames (`folder/sub/file.txt` → `folder_sub_file.txt`)
- **Converts documents** - Transforms PDF, DOCX, XLSX, PPTX, HTML, EPUB, and more into Markdown
- **Respects NotebookLM limits** - Manages 300 sources (Pro) / 50 sources (Free) and 500K words per source
- **Smart bundling** - Automatically merges small files when you exceed source limits
- **Injects context** - Adds metadata headers so NotebookLM understands file relationships

## Platforms

| Platform | Features | Status |
|----------|----------|--------|
| **Desktop** (Tauri) | Full features including OCR | Ready |
| **Web** | Core features, no OCR | Ready |

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 9+
- Rust (for desktop app)

### Installation

```bash
# Clone the repository
git clone https://github.com/rickoslyder/flatpack.git
cd flatpack

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

### Development

```bash
# Run all packages in dev mode
pnpm dev

# Run web app only
pnpm --filter @flatpack/web dev

# Run desktop app only
pnpm --filter @flatpack/desktop tauri dev
```

## Project Structure

```
flatpack/
├── packages/
│   ├── core/           # Platform-agnostic processing logic
│   │   ├── analyzer/   # File scanning and classification
│   │   ├── converters/ # Format converters (PDF, DOCX, etc.)
│   │   ├── planner/    # Bundling and optimization strategies
│   │   ├── processors/ # Chunking, flattening, metadata
│   │   └── output/     # Manifest and structure generation
│   │
│   ├── ui/             # Shared React components
│   │   ├── components/ # Reusable UI components
│   │   └── stores/     # Zustand state management
│   │
│   ├── web/            # Web application
│   │   └── src/        # React app with File System Access API
│   │
│   └── desktop/        # Tauri desktop application
│       ├── src/        # React frontend
│       └── src-tauri/  # Rust backend
│           └── src/
│               ├── commands/   # Tauri commands
│               ├── converters/ # Native converters
│               └── utils/      # Rust utilities
```

## Format Support

### Tier 1: Passthrough
Text-based formats wrapped in Markdown code blocks:
- Plain text: `.txt`, `.md`, `.json`, `.yaml`, `.csv`, `.xml`
- Code: `.js`, `.ts`, `.py`, `.rs`, `.go`, `.java`, `.c`, `.cpp`, and more

### Tier 2: Conversion
Documents converted to Markdown:
- Office: `.pdf`, `.docx`, `.xlsx`, `.pptx`
- Web: `.html`, `.htm`
- Ebooks: `.epub`, `.rtf`

### Tier 3: OCR (Desktop only)
Image-based content processed with Tesseract:
- Images: `.png`, `.jpg`, `.gif`, `.bmp`, `.tiff`
- Scanned PDFs

## NotebookLM Constraints

Flatpack is designed around NotebookLM's limits:

| Constraint | Pro | Free |
|------------|-----|------|
| Max sources | 300 | 50 |
| Words per source | 500,000 | 500,000 |
| File size | 200MB | 200MB |

When your content exceeds source limits, Flatpack automatically bundles files by:
1. Merging deepest folders first
2. Combining smallest folders within the same depth
3. Respecting word count limits per bundle

## Output

Flatpack generates:

```
output/
├── folder_sub_document.md      # Flattened files
├── folder_sub_spreadsheet.md
├── 00_MASTER_STRUCTURE.md      # Directory tree overview
├── FLATPACK_MANIFEST.json      # Processing metadata
└── _failures/                  # Unprocessable files
    ├── image.png
    └── FAILURES.md
```

## Commands

```bash
# Development
pnpm dev              # Run all in dev mode
pnpm build            # Build all packages
pnpm typecheck        # Type check all packages
pnpm lint             # Lint all packages
pnpm test             # Run tests

# Package-specific
pnpm --filter @flatpack/core test
pnpm --filter @flatpack/web dev
pnpm --filter @flatpack/desktop tauri dev
pnpm --filter @flatpack/desktop tauri build
```

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **State**: Zustand
- **Desktop**: Tauri (Rust)
- **Build**: pnpm workspaces, Turborepo, Vite
- **Testing**: Vitest, Playwright

## License

MIT
