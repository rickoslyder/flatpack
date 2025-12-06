<specification_planning>

## Analysis of Flatpack Project Requirements

### 1. Core System Architecture and Key Workflows

**Architecture Pattern**: Local-first desktop application with web fallback
- **Desktop**: Tauri (Rust backend) + React (TypeScript frontend)
- **Web**: React SPA with limited feature set (no OCR, browser-compatible conversions only)
- **No remote backend**: All processing occurs on user's machine

**Key Workflows**:
1. **Ingestion Flow**: Drag-drop/file select → Recursive scan → Ignore pattern filtering → File analysis
2. **Planning Flow**: Count files/words → Determine bundling strategy → Generate preview plan → User confirmation
3. **Processing Flow**: Format conversion → Chunking → Bundling → Metadata injection → Output generation
4. **Output Flow**: Flat file structure + Manifest + Master structure file + Failed files folder

**Challenges**:
- Cross-platform file system access (Tauri handles this well)
- Large file processing without blocking UI (need worker threads/async processing)
- Accurate word counting across formats before conversion
- Web platform limitations (no native file system, no heavy OCR)

### 2. Project Structure and Organization

**Monorepo Structure** (recommended):
- `packages/core` - Shared processing logic (TypeScript, platform-agnostic)
- `packages/ui` - React components and UI logic
- `packages/desktop` - Tauri application wrapper
- `packages/web` - Web application wrapper

**Key Decisions**:
- Use pnpm workspaces or Turborepo for monorepo management
- Shared processing logic must be platform-agnostic where possible
- Desktop-specific processing (Rust) for OCR and heavy lifting
- Web-specific adapters for browser APIs

### 3. Detailed Feature Specifications

**Core Ingestion**:
- File system access via Tauri's fs module (desktop) or File System Access API (web)
- Recursive directory walker with configurable depth
- Glob pattern matching for ignore rules (use `micromatch` or similar)
- ZIP extraction via `jszip` (web) or Rust zip crate (desktop)

**Tier Selection & Optimization**:
- State-driven: tier selection affects bundling algorithm thresholds
- Real-time source count estimation during preview
- Warning thresholds at 80% and 100% of tier limit

**Preview Phase** (Complex - needs detailed breakdown):
1. Build virtual file tree from scanned input
2. Classify each file (pass-through, conversion, OCR, unsupported)
3. Run word count estimation
4. Execute bundling algorithm simulation
5. Detect naming collisions and generate resolutions
6. Present interactive tree with color coding
7. Allow user overrides (exclude files, force merge)

**Format Handling Challenges**:
- PDF text extraction quality varies wildly
- Detecting scanned vs. text PDFs requires heuristics (text-to-page ratio)
- DOCX/XLSX parsing in browser is possible but limited
- OCR is too heavy for browser - desktop only

**Chunking Algorithm**:
- Need semantic boundary detection (headers, code blocks, paragraphs)
- Overlap handling for context preservation
- Part linking via metadata headers
- Edge case: single section exceeds limit (force split with overlap)

### 4. Database Schema Design

**Not applicable in traditional sense** - this is a local-first tool with no remote database.

**Local Storage Schemas**:
1. `FlatpackConfig` - User preferences (JSON)
2. `FlatpackManifest` - Output manifest (JSON)
3. `ProcessingPlan` - In-memory data structure for preview phase
4. `ProcessingState` - Session state for resumability

### 5. Server Actions and Integrations

**Tauri Commands (Desktop Backend)**:
- `scan_directory` - Recursive file listing with metadata
- `read_file` - Read file contents with encoding detection
- `write_files` - Batch write processed files
- `convert_pdf` - PDF to text/Markdown conversion
- `ocr_image` - Tesseract OCR invocation
- `extract_zip` - ZIP archive extraction
- `get_config` / `set_config` - Persistence

**Web Adapters**:
- Same interfaces but implemented with browser APIs
- File System Access API or fallback to manual upload
- Web Workers for heavy processing
- JSZip for ZIP handling

### 6. Design System and Component Architecture

**Visual Design**:
- Clean, minimal (similar to Linear, Raycast)
- Dark mode default with system preference detection
- Status color palette: green (keep), yellow (merge), blue (chunk), red (fail), orange (OCR)
- shadcn/ui as component foundation

**Component Hierarchy**:
1. App Shell (navigation, phase management)
2. Input Phase (DropZone, SettingsSidebar, TierSelector)
3. Preview Phase (FileTree, FileDetails, ActionEditor, ProcessButton)
4. Processing Phase (ProgressBar, FileLog, ErrorPrompt)
5. Results Phase (Summary, QuickActions, FailuresList)

### 7. Authentication and Authorization

**Not applicable** - local tool with no user accounts.

**Future consideration**: License key validation for Pro features if monetized.

### 8. Data Flow and State Management

**State Management**: Zustand (simpler than Redux, good TypeScript support)

**Stores**:
- `configStore` - User preferences
- `sessionStore` - Current processing session
- `fileTreeStore` - Virtual file tree for preview
- `processingStore` - Processing progress and results

**Data Flow**:
1. User drops files → `sessionStore.setInput(files)`
2. Scanner processes → `fileTreeStore.setTree(tree)`
3. Planner analyzes → `sessionStore.setPlan(plan)`
4. User confirms → Processing begins with progress updates
5. Results stored → `sessionStore.setResults(results)`

### 9. Payment Implementation

**Not in Phase 1** - tool is local-only.

**Future**: Could implement license key validation via Gumroad/Paddle/LemonSqueezy.

### 10. Analytics Implementation

**Open question from spec** - recommend opt-in anonymous analytics.

**If implemented**:
- PostHog or Plausible (privacy-focused)
- Events: session start, tier selection, file counts, processing times, errors
- No file content or names transmitted

### 11. Testing Strategy

**Unit Tests** (Vitest):
- Converters (each format → Markdown)
- Chunking algorithm (semantic boundary detection)
- Bundling algorithm (priority calculations)
- Naming collision resolution
- Word counting accuracy

**Integration Tests**:
- Full pipeline with sample files
- Tauri command execution
- File system operations

**E2E Tests** (Playwright):
- Complete workflow: drop → preview → process → results
- Settings persistence
- Error handling flows

### Edge Cases and Error Handling

**Critical Edge Cases**:
1. Empty directories/ZIPs
2. Circular symlinks
3. Permission denied on files
4. Disk full during output
5. Extremely large files (>1GB)
6. Files with no extension
7. Mixed encodings (UTF-8, Latin-1, etc.)
8. Deeply nested directories (>50 levels)
9. Files with identical names in different folders
10. Processing interruption (app close mid-process)

**Error Recovery**:
- Checkpoint system for resumable processing
- Atomic writes to prevent partial outputs
- Graceful degradation for individual file failures

</specification_planning>

---

# Flatpack Technical Specification

## 1. System Overview

### Core Purpose and Value Proposition

Flatpack transforms messy folder structures and ZIP archives into NotebookLM-optimized flat file sets. It solves three critical problems for NotebookLM users:

1. **Citation Granularity**: Burns folder hierarchy into filenames and injects YAML metadata, preserving source context for precise NotebookLM citations
2. **Source Limit Optimization**: Intelligently bundles files to respect NotebookLM's 50-source (Free) or 300-source (Pro) limits
3. **Format Optimization**: Converts all documents to Markdown, which NotebookLM processes more reliably than PDFs

**Privacy-First Design**: All processing occurs locally on the user's machine. No data transmission, no cloud dependencies.

### Key Workflows

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FLATPACK WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────┐    ┌──────────┐    ┌────────────┐    ┌──────────────────┐ │
│  │  INPUT   │───▶│  PREVIEW │───▶│ PROCESSING │───▶│     RESULTS      │ │
│  │  PHASE   │    │  PHASE   │    │   PHASE    │    │      PHASE       │ │
│  └──────────┘    └──────────┘    └────────────┘    └──────────────────┘ │
│       │               │                │                    │           │
│       ▼               ▼                ▼                    ▼           │
│  • Drag-drop     • File tree      • Progress bar      • Summary stats  │
│  • ZIP upload    • Color status   • Current file      • Quick actions  │
│  • Settings      • Edit actions   • Running log       • Retry failed   │
│  • Tier select   • Confirm/Cancel • Error prompts     • Open folder    │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

**Processing Pipeline Detail**:

```
Input Files → Scan & Filter → Analyze → Plan → Convert → Chunk → Bundle → Output
     │             │            │        │        │         │        │        │
     ▼             ▼            ▼        ▼        ▼         ▼        ▼        ▼
  Folder/    Apply ignore   Count    Generate   Format    Split    Merge   Flat
   ZIP       patterns       words    bundling   to MD     >450K    small   folder
                           /tokens   strategy            words    files
```

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLATPACK ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         REACT FRONTEND                               │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────────┐ │   │
│  │  │   UI Layer  │  │ State (Zustand)│  │    Platform Adapter       │ │   │
│  │  │  shadcn/ui  │  │  • config     │  │  • TauriAdapter (desktop) │ │   │
│  │  │  Tailwind   │  │  • session    │  │  • WebAdapter (browser)   │ │   │
│  │  └─────────────┘  │  • fileTree   │  └────────────────────────────┘ │   │
│  │                    │  • processing │                                  │   │
│  │                    └──────────────┘                                  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                       │
│                     ┌────────────────┴────────────────┐                     │
│                     ▼                                  ▼                     │
│  ┌──────────────────────────┐      ┌──────────────────────────────────┐    │
│  │     TAURI BACKEND        │      │        WEB WORKERS               │    │
│  │        (Desktop)         │      │         (Browser)                │    │
│  │  ┌────────────────────┐  │      │  ┌────────────────────────────┐ │    │
│  │  │   Rust Commands    │  │      │  │   Processing Worker        │ │    │
│  │  │  • scan_directory  │  │      │  │  • file_analysis          │ │    │
│  │  │  • convert_pdf     │  │      │  │  • text_conversion        │ │    │
│  │  │  • ocr_image       │  │      │  │  • chunking               │ │    │
│  │  │  • extract_zip     │  │      │  └────────────────────────────┘ │    │
│  │  └────────────────────┘  │      └──────────────────────────────────┘    │
│  │  ┌────────────────────┐  │                                              │
│  │  │  Native Libraries  │  │                                              │
│  │  │  • Tesseract OCR   │  │                                              │
│  │  │  • pdf-extract     │  │                                              │
│  │  │  • docx-rs         │  │                                              │
│  │  └────────────────────┘  │                                              │
│  └──────────────────────────┘                                              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Platform Capability Matrix**:

| Feature | Desktop (Tauri) | Web |
|---------|-----------------|-----|
| Folder drag-drop | ✅ Native | ✅ File System Access API |
| ZIP upload | ✅ | ✅ |
| OCR processing | ✅ Tesseract | ❌ Too heavy |
| PDF conversion | ✅ Full | ⚠️ Basic (pdf.js) |
| Output location | ✅ User choice | ❌ Downloads only |
| File size limit | None practical | ~2GB (browser limit) |
| Background processing | ✅ Multi-threaded | ⚠️ Web Workers |

---

## 2. Project Structure

```
flatpack/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, test, typecheck
│       ├── release-desktop.yml       # Tauri builds for macOS/Windows/Linux
│       └── release-web.yml           # Web deployment
│
├── packages/
│   ├── core/                         # Shared processing logic
│   │   ├── src/
│   │   │   ├── analyzer/
│   │   │   │   ├── index.ts
│   │   │   │   ├── word-counter.ts   # Word/token counting
│   │   │   │   ├── file-classifier.ts # Determine processing tier
│   │   │   │   └── related-files.ts  # Detect file relationships
│   │   │   │
│   │   │   ├── planner/
│   │   │   │   ├── index.ts
│   │   │   │   ├── bundling-strategy.ts
│   │   │   │   ├── naming-resolver.ts
│   │   │   │   └── preview-generator.ts
│   │   │   │
│   │   │   ├── converters/
│   │   │   │   ├── index.ts
│   │   │   │   ├── base-converter.ts
│   │   │   │   ├── text-converter.ts     # txt, md, code files
│   │   │   │   ├── pdf-converter.ts      # Platform-specific impl
│   │   │   │   ├── docx-converter.ts
│   │   │   │   ├── xlsx-converter.ts
│   │   │   │   ├── pptx-converter.ts
│   │   │   │   ├── html-converter.ts
│   │   │   │   ├── epub-converter.ts
│   │   │   │   └── rtf-converter.ts
│   │   │   │
│   │   │   ├── processors/
│   │   │   │   ├── index.ts
│   │   │   │   ├── chunker.ts           # Semantic splitting
│   │   │   │   ├── bundler.ts           # File merging
│   │   │   │   ├── flattener.ts         # Path-to-filename
│   │   │   │   └── metadata-injector.ts # YAML headers
│   │   │   │
│   │   │   ├── output/
│   │   │   │   ├── index.ts
│   │   │   │   ├── manifest-generator.ts
│   │   │   │   ├── structure-generator.ts # 00_MASTER_STRUCTURE.md
│   │   │   │   └── failures-reporter.ts
│   │   │   │
│   │   │   ├── types/
│   │   │   │   ├── index.ts
│   │   │   │   ├── file-tree.ts
│   │   │   │   ├── processing-plan.ts
│   │   │   │   ├── config.ts
│   │   │   │   └── manifest.ts
│   │   │   │
│   │   │   ├── constants/
│   │   │   │   ├── index.ts
│   │   │   │   ├── limits.ts            # NotebookLM constraints
│   │   │   │   ├── file-extensions.ts   # Format mappings
│   │   │   │   └── ignore-patterns.ts   # Default ignores
│   │   │   │
│   │   │   └── utils/
│   │   │       ├── index.ts
│   │   │       ├── glob-matcher.ts
│   │   │       ├── path-utils.ts
│   │   │       └── encoding-detector.ts
│   │   │
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   ├── ui/                            # Shared React components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── AppShell.tsx
│   │   │   │   │   ├── Header.tsx
│   │   │   │   │   └── Sidebar.tsx
│   │   │   │   │
│   │   │   │   ├── input-phase/
│   │   │   │   │   ├── DropZone.tsx
│   │   │   │   │   ├── SettingsPanel.tsx
│   │   │   │   │   ├── TierSelector.tsx
│   │   │   │   │   ├── IgnorePatternEditor.tsx
│   │   │   │   │   └── PdfHandlingToggle.tsx
│   │   │   │   │
│   │   │   │   ├── preview-phase/
│   │   │   │   │   ├── FileTree.tsx
│   │   │   │   │   ├── FileTreeItem.tsx
│   │   │   │   │   ├── FileDetails.tsx
│   │   │   │   │   ├── ActionBadge.tsx
│   │   │   │   │   ├── WarningsList.tsx
│   │   │   │   │   ├── PreviewSummary.tsx
│   │   │   │   │   └── ProcessingConfirm.tsx
│   │   │   │   │
│   │   │   │   ├── processing-phase/
│   │   │   │   │   ├── ProgressView.tsx
│   │   │   │   │   ├── ProgressBar.tsx
│   │   │   │   │   ├── CurrentFile.tsx
│   │   │   │   │   ├── ProcessingLog.tsx
│   │   │   │   │   └── ErrorPrompt.tsx
│   │   │   │   │
│   │   │   │   ├── results-phase/
│   │   │   │   │   ├── ResultsSummary.tsx
│   │   │   │   │   ├── StatsBreakdown.tsx
│   │   │   │   │   ├── QuickActions.tsx
│   │   │   │   │   ├── FailuresList.tsx
│   │   │   │   │   └── ManifestViewer.tsx
│   │   │   │   │
│   │   │   │   └── shared/
│   │   │   │       ├── Button.tsx        # shadcn/ui wrapper
│   │   │   │       ├── Badge.tsx
│   │   │   │       ├── Progress.tsx
│   │   │   │       ├── Tooltip.tsx
│   │   │   │       ├── Dialog.tsx
│   │   │   │       ├── Switch.tsx
│   │   │   │       └── Select.tsx
│   │   │   │
│   │   │   ├── hooks/
│   │   │   │   ├── useConfig.ts
│   │   │   │   ├── useSession.ts
│   │   │   │   ├── useFileTree.ts
│   │   │   │   ├── useProcessing.ts
│   │   │   │   └── usePlatform.ts
│   │   │   │
│   │   │   ├── stores/
│   │   │   │   ├── config-store.ts
│   │   │   │   ├── session-store.ts
│   │   │   │   ├── file-tree-store.ts
│   │   │   │   └── processing-store.ts
│   │   │   │
│   │   │   ├── lib/
│   │   │   │   ├── platform-adapter.ts
│   │   │   │   └── cn.ts               # Tailwind class merge utility
│   │   │   │
│   │   │   └── styles/
│   │   │       └── globals.css
│   │   │
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── desktop/                       # Tauri application
│   │   ├── src/                       # React app entry
│   │   │   ├── App.tsx
│   │   │   ├── main.tsx
│   │   │   └── tauri-adapter.ts       # Tauri command bindings
│   │   │
│   │   ├── src-tauri/                 # Rust backend
│   │   │   ├── src/
│   │   │   │   ├── main.rs
│   │   │   │   ├── commands/
│   │   │   │   │   ├── mod.rs
│   │   │   │   │   ├── scan.rs        # Directory scanning
│   │   │   │   │   ├── convert.rs     # Format conversion
│   │   │   │   │   ├── ocr.rs         # Tesseract integration
│   │   │   │   │   ├── zip.rs         # Archive handling
│   │   │   │   │   └── config.rs      # Settings persistence
│   │   │   │   │
│   │   │   │   ├── converters/
│   │   │   │   │   ├── mod.rs
│   │   │   │   │   ├── pdf.rs
│   │   │   │   │   ├── docx.rs
│   │   │   │   │   └── xlsx.rs
│   │   │   │   │
│   │   │   │   └── utils/
│   │   │   │       ├── mod.rs
│   │   │   │       └── encoding.rs
│   │   │   │
│   │   │   ├── Cargo.toml
│   │   │   ├── tauri.conf.json
│   │   │   └── build.rs
│   │   │
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── index.html
│   │
│   └── web/                           # Web application
│       ├── src/
│       │   ├── App.tsx
│       │   ├── main.tsx
│       │   ├── web-adapter.ts         # Browser API bindings
│       │   └── workers/
│       │       └── processing.worker.ts
│       │
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       └── index.html
│
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── tsconfig.base.json
├── .eslintrc.js
├── .prettierrc
└── README.md
```

---

## 3. Feature Specification

### 3.1 Core Ingestion

**User Story**: As a user, I want to drag a folder or ZIP file into Flatpack and have it automatically discover all processable files while respecting my ignore patterns.

**Implementation Steps**:

1. **Drop Zone Interaction**
   ```typescript
   // DropZone.tsx handles both folder and file drops
   const handleDrop = async (e: DragEvent) => {
     e.preventDefault();
     const items = e.dataTransfer?.items;
     
     if (!items) return;
     
     // Check for folder vs file
     for (const item of items) {
       const entry = item.webkitGetAsEntry?.();
       if (entry?.isDirectory) {
         await processDirectory(entry);
       } else if (entry?.isFile) {
         const file = item.getAsFile();
         if (file?.name.endsWith('.zip')) {
           await processZip(file);
         }
       }
     }
   };
   ```

2. **Recursive Directory Scanning**
   ```typescript
   // packages/core/src/analyzer/directory-scanner.ts
   interface ScanOptions {
     ignorePatterns: string[];
     maxDepth?: number;  // Default: unlimited
   }
   
   interface ScannedFile {
     path: string;           // Relative path from input root
     absolutePath: string;   // Full system path
     name: string;
     extension: string;
     size: number;
     modifiedAt: Date;
     depth: number;          // Nesting level (0 = root)
   }
   
   async function scanDirectory(
     rootPath: string, 
     options: ScanOptions
   ): Promise<ScannedFile[]> {
     const files: ScannedFile[] = [];
     const matcher = createGlobMatcher(options.ignorePatterns);
     
     async function walk(currentPath: string, depth: number) {
       const entries = await platform.readDirectory(currentPath);
       
       for (const entry of entries) {
         const relativePath = path.relative(rootPath, entry.path);
         
         // Check ignore patterns
         if (matcher.matches(relativePath)) continue;
         
         if (entry.isDirectory) {
           await walk(entry.path, depth + 1);
         } else {
           files.push({
             path: relativePath,
             absolutePath: entry.path,
             name: entry.name,
             extension: path.extname(entry.name).toLowerCase(),
             size: entry.size,
             modifiedAt: entry.modifiedAt,
             depth,
           });
         }
       }
     }
     
     await walk(rootPath, 0);
     return files;
   }
   ```

3. **ZIP Extraction**
   ```typescript
   // Desktop: Rust command
   // Web: JSZip
   async function extractZip(file: File | string): Promise<ScannedFile[]> {
     if (platform.isDesktop) {
       return await invoke('extract_zip', { path: file });
     } else {
       const zip = await JSZip.loadAsync(file);
       const files: ScannedFile[] = [];
       
       for (const [path, zipEntry] of Object.entries(zip.files)) {
         if (zipEntry.dir) continue;
         
         files.push({
           path,
           absolutePath: path,  // Virtual path for ZIPs
           name: path.split('/').pop()!,
           extension: path.split('.').pop()?.toLowerCase() || '',
           size: zipEntry._data?.uncompressedSize || 0,
           modifiedAt: zipEntry.date,
           depth: path.split('/').length - 1,
         });
       }
       
       return files;
     }
   }
   ```

4. **Default Ignore Patterns**
   ```typescript
   // packages/core/src/constants/ignore-patterns.ts
   export const DEFAULT_IGNORE_PATTERNS = [
     'node_modules/**',
     '.git/**',
     '__pycache__/**',
     '.DS_Store',
     '.Spotlight-V100/**',
     '.Trashes/**',
     'Thumbs.db',
     '*.log',
     '.env.local',
     '.env*.local',
     '*.pyc',
     '.venv/**',
     'venv/**',
     '.idea/**',
     '.vscode/**',
     '*.swp',
     '*.swo',
     '*~',
   ];
   ```

**Error Handling**:
- Permission denied: Log warning, continue scanning accessible paths
- Symlink loops: Detect visited paths, skip duplicates
- Corrupted ZIP: Surface error, allow retry with different file
- Empty input: Show message "No files found" with troubleshooting tips

**Edge Cases**:
- Hidden files (starting with `.`): Include by default, let ignore patterns filter
- Files with no extension: Classify as unknown/binary, attempt text detection
- Very long paths (>260 chars on Windows): Warn user, truncate output filename

---

### 3.2 Tier Selection & Optimization

**User Story**: As a user, I want to select my NotebookLM tier (Free/Pro) so Flatpack optimizes output to respect my source limits.

**Implementation**:

```typescript
// packages/core/src/types/config.ts
export type NotebookTier = 'free' | 'pro';

export interface TierLimits {
  maxSources: number;
  maxWordsPerSource: number;
  maxBytesPerSource: number;
}

export const TIER_LIMITS: Record<NotebookTier, TierLimits> = {
  free: {
    maxSources: 50,
    maxWordsPerSource: 500_000,
    maxBytesPerSource: 200 * 1024 * 1024, // 200MB
  },
  pro: {
    maxSources: 300,
    maxWordsPerSource: 500_000,
    maxBytesPerSource: 200 * 1024 * 1024,
  },
};
```

```typescript
// packages/core/src/planner/tier-optimizer.ts
interface OptimizationResult {
  estimatedSources: number;
  bundlingRequired: boolean;
  warnings: Warning[];
}

function analyzeTierFit(
  files: AnalyzedFile[],
  tier: NotebookTier
): OptimizationResult {
  const limits = TIER_LIMITS[tier];
  const totalFiles = files.filter(f => f.classification !== 'unsupported').length;
  
  const warnings: Warning[] = [];
  
  // Check source count
  if (totalFiles > limits.maxSources) {
    warnings.push({
      type: 'source_limit_exceeded',
      severity: 'error',
      message: `${totalFiles} files exceeds ${tier} tier limit of ${limits.maxSources} sources`,
      suggestion: 'Files will be bundled to fit within limits',
    });
  } else if (totalFiles > limits.maxSources * 0.8) {
    warnings.push({
      type: 'approaching_source_limit',
      severity: 'warning',
      message: `${totalFiles} files is ${Math.round(totalFiles / limits.maxSources * 100)}% of ${tier} tier limit`,
    });
  }
  
  // Check individual file sizes
  for (const file of files) {
    if (file.estimatedWords > limits.maxWordsPerSource * 0.9) {
      warnings.push({
        type: 'large_file',
        severity: file.estimatedWords > limits.maxWordsPerSource ? 'error' : 'warning',
        message: `${file.path} has ~${file.estimatedWords.toLocaleString()} words`,
        filePath: file.path,
      });
    }
  }
  
  return {
    estimatedSources: Math.min(totalFiles, limits.maxSources),
    bundlingRequired: totalFiles > limits.maxSources,
    warnings,
  };
}
```

**UI Component**:
```tsx
// packages/ui/src/components/input-phase/TierSelector.tsx
export function TierSelector() {
  const { tier, setTier } = useConfig();
  
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-muted-foreground">
        NotebookLM Tier
      </label>
      <div className="flex gap-2">
        <button
          onClick={() => setTier('free')}
          className={cn(
            "flex-1 px-4 py-3 rounded-lg border-2 transition-all",
            tier === 'free' 
              ? "border-primary bg-primary/10" 
              : "border-border hover:border-muted-foreground"
          )}
        >
          <div className="font-semibold">Free</div>
          <div className="text-sm text-muted-foreground">50 sources</div>
        </button>
        <button
          onClick={() => setTier('pro')}
          className={cn(
            "flex-1 px-4 py-3 rounded-lg border-2 transition-all",
            tier === 'pro' 
              ? "border-primary bg-primary/10" 
              : "border-border hover:border-muted-foreground"
          )}
        >
          <div className="font-semibold">Pro</div>
          <div className="text-sm text-muted-foreground">300 sources</div>
        </button>
      </div>
    </div>
  );
}
```

---

### 3.3 Preview Before Processing

**User Story**: As a user, I want to see exactly what Flatpack will do before processing starts, so I can adjust settings or exclude files.

**Processing Plan Data Structure**:

```typescript
// packages/core/src/types/processing-plan.ts
export type FileAction = 
  | 'keep'           // Pass through as individual source
  | 'convert'        // Convert format (e.g., PDF → MD)
  | 'chunk'          // Split into multiple parts
  | 'merge'          // Bundle with other files
  | 'ocr'            // Requires OCR processing
  | 'skip'           // User excluded
  | 'fail';          // Cannot process

export interface PlannedFile {
  id: string;
  originalPath: string;
  outputPath: string;           // Flattened filename
  action: FileAction;
  estimatedWords: number;
  estimatedOutputSize: number;
  warnings: Warning[];
  
  // For chunked files
  chunkInfo?: {
    totalParts: number;
    partNumber: number;
  };
  
  // For merged files
  mergeInfo?: {
    bundleId: string;
    bundleName: string;
    filesInBundle: string[];
  };
  
  // Conversion details
  conversionInfo?: {
    sourceFormat: string;
    targetFormat: 'markdown' | 'pdf';
    requiresOcr: boolean;
  };
}

export interface ProcessingPlan {
  tier: NotebookTier;
  files: PlannedFile[];
  
  summary: {
    totalInputFiles: number;
    estimatedOutputSources: number;
    
    byAction: Record<FileAction, number>;
    
    totalInputWords: number;
    totalOutputWords: number;
    
    estimatedProcessingTime: number; // seconds
  };
  
  warnings: Warning[];
  errors: Warning[];
}
```

**Plan Generation Algorithm**:

```typescript
// packages/core/src/planner/preview-generator.ts
async function generateProcessingPlan(
  files: ScannedFile[],
  config: FlatpackConfig
): Promise<ProcessingPlan> {
  const limits = TIER_LIMITS[config.tier];
  const plannedFiles: PlannedFile[] = [];
  
  // Step 1: Classify and analyze each file
  const analyzed = await analyzeFiles(files, config);
  
  // Step 2: Separate by classification
  const passThrough = analyzed.filter(f => f.classification === 'tier1');
  const needsConversion = analyzed.filter(f => f.classification === 'tier2');
  const needsOcr = analyzed.filter(f => f.classification === 'tier3');
  const unsupported = analyzed.filter(f => f.classification === 'unsupported');
  
  // Step 3: Identify files needing chunking (>450K words)
  const oversized = analyzed.filter(f => f.estimatedWords > 450_000);
  
  // Step 4: Calculate total source count
  let sourceCount = passThrough.length + needsConversion.length + needsOcr.length;
  
  // Add chunk parts
  for (const file of oversized) {
    const parts = Math.ceil(file.estimatedWords / 400_000); // ~400K per part for safety
    sourceCount += parts - 1; // Already counted once
  }
  
  // Step 5: Determine if bundling needed
  const bundlingRequired = sourceCount > limits.maxSources;
  
  if (bundlingRequired) {
    // Execute bundling strategy
    const bundles = calculateBundles(analyzed, limits.maxSources);
    // Convert bundles to planned files...
  } else {
    // Simple flattening
    for (const file of analyzed) {
      plannedFiles.push(createPlannedFile(file, config));
    }
  }
  
  // Step 6: Resolve naming collisions
  resolveNamingCollisions(plannedFiles, config.pathSeparator);
  
  // Step 7: Generate summary and warnings
  return {
    tier: config.tier,
    files: plannedFiles,
    summary: calculateSummary(plannedFiles),
    warnings: collectWarnings(plannedFiles),
    errors: collectErrors(plannedFiles),
  };
}
```

**Preview UI Tree Component**:

```tsx
// packages/ui/src/components/preview-phase/FileTree.tsx
export function FileTree({ plan }: { plan: ProcessingPlan }) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const tree = buildTreeFromPlan(plan);
  
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="bg-muted px-4 py-2 border-b flex justify-between items-center">
        <span className="font-medium">Processing Plan</span>
        <span className="text-sm text-muted-foreground">
          {plan.summary.estimatedOutputSources} sources
        </span>
      </div>
      <div className="max-h-[400px] overflow-auto p-2">
        {tree.children.map(node => (
          <TreeNode 
            key={node.path}
            node={node}
            expanded={expandedFolders}
            onToggle={setExpandedFolders}
          />
        ))}
      </div>
    </div>
  );
}

function TreeNode({ node, expanded, onToggle }: TreeNodeProps) {
  const isExpanded = expanded.has(node.path);
  
  if (node.type === 'folder') {
    return (
      <div>
        <div 
          className="flex items-center gap-2 py-1 px-2 hover:bg-muted/50 rounded cursor-pointer"
          onClick={() => onToggle(prev => {
            const next = new Set(prev);
            isExpanded ? next.delete(node.path) : next.add(node.path);
            return next;
          })}
        >
          <ChevronRight className={cn(
            "h-4 w-4 transition-transform",
            isExpanded && "rotate-90"
          )} />
          <Folder className="h-4 w-4 text-muted-foreground" />
          <span>{node.name}</span>
          <span className="text-xs text-muted-foreground ml-auto">
            {node.fileCount} files
          </span>
        </div>
        {isExpanded && (
          <div className="ml-4 border-l pl-2">
            {node.children.map(child => (
              <TreeNode key={child.path} node={child} expanded={expanded} onToggle={onToggle} />
            ))}
          </div>
        )}
      </div>
    );
  }
  
  // File node
  return (
    <div className="flex items-center gap-2 py-1 px-2 hover:bg-muted/50 rounded">
      <FileIcon className="h-4 w-4 text-muted-foreground" />
      <span className="truncate flex-1">{node.name}</span>
      <ActionBadge action={node.action} />
    </div>
  );
}

function ActionBadge({ action }: { action: FileAction }) {
  const styles: Record<FileAction, string> = {
    keep: 'bg-green-500/20 text-green-700 dark:text-green-400',
    convert: 'bg-blue-500/20 text-blue-700 dark:text-blue-400',
    chunk: 'bg-purple-500/20 text-purple-700 dark:text-purple-400',
    merge: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400',
    ocr: 'bg-orange-500/20 text-orange-700 dark:text-orange-400',
    skip: 'bg-gray-500/20 text-gray-700 dark:text-gray-400',
    fail: 'bg-red-500/20 text-red-700 dark:text-red-400',
  };
  
  return (
    <span className={cn("px-2 py-0.5 rounded text-xs font-medium", styles[action])}>
      {action}
    </span>
  );
}
```

---

### 3.4 Smart Flattening (Under Limit)

**User Story**: As a user, when my file count is under the tier limit, I want each file preserved as an individual source with its path burned into the filename.

**Path-to-Filename Algorithm**:

```typescript
// packages/core/src/processors/flattener.ts
interface FlattenOptions {
  separator: '_' | '-';
  maxLength: number;      // Default: 200 characters
  preserveExtension: boolean;
}

function flattenPath(
  relativePath: string, 
  options: FlattenOptions
): string {
  // Input: "folder/subfolder/my file.txt"
  // Output: "folder_subfolder_my-file.md"
  
  const parts = relativePath.split('/');
  const filename = parts.pop()!;
  const folders = parts;
  
  // Clean folder names
  const cleanFolders = folders.map(f => sanitizePathPart(f, options.separator));
  
  // Clean filename (without extension)
  const ext = path.extname(filename);
  const baseName = path.basename(filename, ext);
  const cleanBaseName = sanitizePathPart(baseName, options.separator);
  
  // Combine
  const combined = [...cleanFolders, cleanBaseName].join(options.separator);
  
  // Truncate if needed
  const maxBase = options.maxLength - 4; // Reserve space for .md extension
  const truncated = combined.length > maxBase 
    ? combined.slice(0, maxBase - 3) + '...'
    : combined;
  
  // Always output as .md (content is Markdown)
  return truncated + '.md';
}

function sanitizePathPart(part: string, separator: string): string {
  return part
    .replace(/\s+/g, separator)           // Spaces → separator
    .replace(/[^\w\-]/g, '')              // Remove special chars
    .replace(new RegExp(`${separator}+`, 'g'), separator) // Collapse separators
    .replace(new RegExp(`^${separator}|${separator}$`, 'g'), ''); // Trim separators
}
```

**Naming Collision Resolution**:

```typescript
// packages/core/src/planner/naming-resolver.ts
function resolveNamingCollisions(
  files: PlannedFile[], 
  separator: string
): void {
  const nameCount = new Map<string, number>();
  const usedNames = new Set<string>();
  
  // First pass: count occurrences
  for (const file of files) {
    const count = nameCount.get(file.outputPath) || 0;
    nameCount.set(file.outputPath, count + 1);
  }
  
  // Second pass: add suffixes where needed
  for (const file of files) {
    if (nameCount.get(file.outputPath)! > 1) {
      const baseName = file.outputPath.replace(/\.md$/, '');
      let counter = 1;
      let newName: string;
      
      do {
        newName = `${baseName}${separator}${counter}.md`;
        counter++;
      } while (usedNames.has(newName));
      
      file.outputPath = newName;
      file.warnings.push({
        type: 'naming_collision',
        severity: 'info',
        message: `Renamed to avoid collision with another file`,
      });
    }
    
    usedNames.add(file.outputPath);
  }
}
```

---

### 3.5 Semantic Bundling (Over Limit)

**User Story**: As a user, when my file count exceeds the tier limit, I want Flatpack to intelligently merge files while preserving context and prioritizing important content.

**Bundling Strategy Algorithm**:

```typescript
// packages/core/src/planner/bundling-strategy.ts
interface BundleCandidate {
  folderPath: string;
  files: AnalyzedFile[];
  depth: number;
  totalWords: number;
}

interface Bundle {
  id: string;
  name: string;
  files: AnalyzedFile[];
  totalWords: number;
}

function calculateBundles(
  files: AnalyzedFile[],
  targetSourceCount: number
): Bundle[] {
  const bundles: Bundle[] = [];
  const individualFiles: AnalyzedFile[] = [];
  
  // Group files by folder
  const byFolder = groupByFolder(files);
  
  // Sort folders by priority for bundling:
  // 1. Deepest folders first (supporting material)
  // 2. Within same depth, smallest folders first
  const sortedFolders = Array.from(byFolder.entries())
    .map(([folderPath, files]) => ({
      folderPath,
      files,
      depth: folderPath.split('/').length,
      totalWords: files.reduce((sum, f) => sum + f.estimatedWords, 0),
    }))
    .sort((a, b) => {
      if (b.depth !== a.depth) return b.depth - a.depth;
      return a.totalWords - b.totalWords;
    });
  
  let currentSourceCount = files.length;
  
  for (const folder of sortedFolders) {
    if (currentSourceCount <= targetSourceCount) break;
    
    // Check if folder contents can fit in one bundle
    if (folder.totalWords <= 400_000 && folder.files.length > 1) {
      // Create bundle
      const bundle: Bundle = {
        id: generateBundleId(),
        name: folderPathToBundleName(folder.folderPath),
        files: folder.files,
        totalWords: folder.totalWords,
      };
      
      bundles.push(bundle);
      currentSourceCount -= (folder.files.length - 1); // N files → 1 bundle
    } else {
      // Too large to bundle, keep as individual files
      individualFiles.push(...folder.files);
    }
  }
  
  return bundles;
}

function groupByFolder(files: AnalyzedFile[]): Map<string, AnalyzedFile[]> {
  const map = new Map<string, AnalyzedFile[]>();
  
  for (const file of files) {
    const folder = path.dirname(file.path);
    if (!map.has(folder)) map.set(folder, []);
    map.get(folder)!.push(file);
  }
  
  return map;
}
```

**Merged File Format**:

```typescript
// packages/core/src/processors/bundler.ts
function generateMergedContent(bundle: Bundle): string {
  const sections: string[] = [];
  
  // Header
  sections.push(`# ${bundle.name}\n`);
  sections.push(`> This file contains ${bundle.files.length} merged sources from the "${bundle.name}" directory.\n`);
  sections.push(`> Total word count: ~${bundle.totalWords.toLocaleString()}\n`);
  sections.push(`---\n`);
  
  // Table of contents
  sections.push(`## Contents\n`);
  for (let i = 0; i < bundle.files.length; i++) {
    sections.push(`${i + 1}. [${bundle.files[i].name}](#${slugify(bundle.files[i].name)})`);
  }
  sections.push(`\n---\n`);
  
  // Individual file contents
  for (const file of bundle.files) {
    sections.push(`## ${file.name} {#${slugify(file.name)}}\n`);
    sections.push(`> Original path: \`${file.path}\``);
    sections.push(`> Word count: ~${file.estimatedWords.toLocaleString()}\n`);
    sections.push(file.content);
    sections.push(`\n---\n`);
  }
  
  return sections.join('\n');
}
```

---

### 3.6 Context Preservation

**User Story**: As a user, I want processed files to retain context about their original location and relationships so NotebookLM can provide accurate citations.

**YAML Metadata Header**:

```typescript
// packages/core/src/processors/metadata-injector.ts
interface FileMetadata {
  originalPath: string;
  originalName: string;
  processingNotes: string[];
  relatedFiles: string[];
  wordCount: number;
  processedAt: string;
}

function injectMetadata(content: string, metadata: FileMetadata): string {
  const yamlHeader = [
    '---',
    `original_path: "${metadata.originalPath}"`,
    `original_name: "${metadata.originalName}"`,
    `word_count: ${metadata.wordCount}`,
    `processed_at: "${metadata.processedAt}"`,
  ];
  
  if (metadata.processingNotes.length > 0) {
    yamlHeader.push('processing_notes:');
    for (const note of metadata.processingNotes) {
      yamlHeader.push(`  - "${note}"`);
    }
  }
  
  if (metadata.relatedFiles.length > 0) {
    yamlHeader.push('related_files:');
    for (const related of metadata.relatedFiles) {
      yamlHeader.push(`  - "${related}"`);
    }
  }
  
  yamlHeader.push('---', '');
  
  return yamlHeader.join('\n') + content;
}
```

**Related Files Detection**:

```typescript
// packages/core/src/analyzer/related-files.ts
interface RelatedFilesResult {
  filePath: string;
  relatedFiles: string[];
}

async function detectRelatedFiles(
  files: ScannedFile[]
): Promise<Map<string, string[]>> {
  const relationships = new Map<string, Set<string>>();
  
  // Initialize sets
  for (const file of files) {
    relationships.set(file.path, new Set());
  }
  
  // 1. Same directory siblings
  const byDirectory = groupBy(files, f => path.dirname(f.path));
  for (const [dir, siblings] of byDirectory) {
    for (const file of siblings) {
      for (const sibling of siblings) {
        if (sibling.path !== file.path) {
          relationships.get(file.path)!.add(sibling.path);
        }
      }
    }
  }
  
  // 2. Filename pattern matching
  for (const file of files) {
    const baseName = path.basename(file.path, file.extension);
    
    for (const other of files) {
      if (other.path === file.path) continue;
      
      const otherBase = path.basename(other.path, other.extension);
      
      // Check for shared prefix (e.g., "report_v1", "report_v2")
      if (sharePrefix(baseName, otherBase, 5)) {
        relationships.get(file.path)!.add(other.path);
      }
      
      // Check for shared suffix (e.g., "utils_test", "api_test")
      if (shareSuffix(baseName, otherBase, 4)) {
        relationships.get(file.path)!.add(other.path);
      }
    }
  }
  
  // 3. Reference parsing (imports, links)
  for (const file of files) {
    if (isTextFile(file)) {
      const content = await readFileContent(file);
      const references = extractReferences(content, file.extension);
      
      for (const ref of references) {
        // Resolve relative reference to actual file
        const resolved = resolveReference(ref, file.path, files);
        if (resolved) {
          relationships.get(file.path)!.add(resolved);
          relationships.get(resolved)!.add(file.path); // Bidirectional
        }
      }
    }
  }
  
  // Convert sets to arrays
  return new Map(
    Array.from(relationships.entries()).map(([k, v]) => [k, Array.from(v)])
  );
}

function extractReferences(content: string, extension: string): string[] {
  const refs: string[] = [];
  
  // JavaScript/TypeScript imports
  if (['.js', '.ts', '.jsx', '.tsx'].includes(extension)) {
    const importRegex = /(?:import|require)\s*\(?['"](\.\/[^'"]+)['"]\)?/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      refs.push(match[1]);
    }
  }
  
  // Markdown links
  if (['.md', '.mdx'].includes(extension)) {
    const linkRegex = /\[.*?\]\((\.\/[^)]+)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      refs.push(match[1]);
    }
  }
  
  // Python imports
  if (extension === '.py') {
    const importRegex = /from\s+(\.[.\w]+)\s+import/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      refs.push(match[1].replace(/\./g, '/') + '.py');
    }
  }
  
  return refs;
}
```

**Master Structure File Generation**:

```typescript
// packages/core/src/output/structure-generator.ts
function generateMasterStructure(
  originalFiles: ScannedFile[],
  processedFiles: PlannedFile[],
  manifest: FlatpackManifest
): string {
  const lines: string[] = [];
  
  lines.push('# Flatpack Master Structure');
  lines.push('');
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push(`> Tier: ${manifest.config.tier}`);
  lines.push(`> Input files: ${manifest.summary.totalInputFiles}`);
  lines.push(`> Output sources: ${manifest.summary.totalOutputSources}`);
  lines.push('');
  
  // Directory tree
  lines.push('## Original Directory Structure');
  lines.push('');
  lines.push('```');
  lines.push(generateTreeOutput(originalFiles));
  lines.push('```');
  lines.push('');
  
  // Processing summary
  lines.push('## Processing Summary');
  lines.push('');
  lines.push(`| Action | Count |`);
  lines.push(`|--------|-------|`);
  for (const [action, count] of Object.entries(manifest.summary.byAction)) {
    if (count > 0) {
      lines.push(`| ${action} | ${count} |`);
    }
  }
  lines.push('');
  
  // File mapping
  lines.push('## File Mapping');
  lines.push('');
  lines.push('| Original | Output | Words | Action |');
  lines.push('|----------|--------|-------|--------|');
  for (const file of processedFiles) {
    lines.push(`| \`${file.originalPath}\` | \`${file.outputPath}\` | ${file.estimatedWords.toLocaleString()} | ${file.action} |`);
  }
  
  return lines.join('\n');
}

function generateTreeOutput(files: ScannedFile[]): string {
  // Build tree structure
  const root: TreeNode = { name: '.', children: new Map() };
  
  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;
    
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current.children.has(parts[i])) {
        current.children.set(parts[i], { name: parts[i], children: new Map() });
      }
      current = current.children.get(parts[i])!;
    }
    
    current.children.set(parts[parts.length - 1], { name: parts[parts.length - 1], children: new Map(), isFile: true });
  }
  
  // Render tree
  function renderNode(node: TreeNode, prefix: string = ''): string[] {
    const entries = Array.from(node.children.entries()).sort((a, b) => {
      // Folders first, then files
      if (a[1].isFile !== b[1].isFile) return a[1].isFile ? 1 : -1;
      return a[0].localeCompare(b[0]);
    });
    
    const lines: string[] = [];
    
    for (let i = 0; i < entries.length; i++) {
      const [name, child] = entries[i];
      const isLast = i === entries.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const childPrefix = isLast ? '    ' : '│   ';
      
      lines.push(prefix + connector + name);
      
      if (!child.isFile) {
        lines.push(...renderNode(child, prefix + childPrefix));
      }
    }
    
    return lines;
  }
  
  return renderNode(root).join('\n');
}
```

---

### 3.7 Format Handling

**File Classification System**:

```typescript
// packages/core/src/analyzer/file-classifier.ts
export type FileClassification = 
  | 'tier1_passthrough'   // Text-based, minimal conversion
  | 'tier2_conversion'    // Needs format conversion
  | 'tier3_ocr'           // Needs OCR
  | 'unsupported';        // Cannot process

export interface ClassificationResult {
  classification: FileClassification;
  converter: string | null;
  warnings: string[];
  estimatedProcessingTime: number; // seconds
}

const EXTENSION_MAP: Record<string, FileClassification> = {
  // Tier 1 - Pass-through
  '.txt': 'tier1_passthrough',
  '.md': 'tier1_passthrough',
  '.mdx': 'tier1_passthrough',
  '.json': 'tier1_passthrough',
  '.yaml': 'tier1_passthrough',
  '.yml': 'tier1_passthrough',
  '.xml': 'tier1_passthrough',
  '.csv': 'tier1_passthrough',
  '.tsv': 'tier1_passthrough',
  // Code files
  '.py': 'tier1_passthrough',
  '.js': 'tier1_passthrough',
  '.ts': 'tier1_passthrough',
  '.jsx': 'tier1_passthrough',
  '.tsx': 'tier1_passthrough',
  '.go': 'tier1_passthrough',
  '.rs': 'tier1_passthrough',
  '.java': 'tier1_passthrough',
  '.c': 'tier1_passthrough',
  '.cpp': 'tier1_passthrough',
  '.h': 'tier1_passthrough',
  '.hpp': 'tier1_passthrough',
  '.rb': 'tier1_passthrough',
  '.php': 'tier1_passthrough',
  '.swift': 'tier1_passthrough',
  '.kt': 'tier1_passthrough',
  '.sql': 'tier1_passthrough',
  '.sh': 'tier1_passthrough',
  '.bash': 'tier1_passthrough',
  '.zsh': 'tier1_passthrough',
  '.ps1': 'tier1_passthrough',
  '.r': 'tier1_passthrough',
  '.scala': 'tier1_passthrough',
  '.lua': 'tier1_passthrough',
  '.pl': 'tier1_passthrough',
  '.m': 'tier1_passthrough',
  '.css': 'tier1_passthrough',
  '.scss': 'tier1_passthrough',
  '.sass': 'tier1_passthrough',
  '.less': 'tier1_passthrough',
  // Config files
  '.ini': 'tier1_passthrough',
  '.toml': 'tier1_passthrough',
  '.env': 'tier1_passthrough',
  '.conf': 'tier1_passthrough',
  '.cfg': 'tier1_passthrough',
  
  // Tier 2 - Conversion
  '.pdf': 'tier2_conversion',
  '.docx': 'tier2_conversion',
  '.doc': 'tier2_conversion',
  '.xlsx': 'tier2_conversion',
  '.xls': 'tier2_conversion',
  '.pptx': 'tier2_conversion',
  '.ppt': 'tier2_conversion',
  '.html': 'tier2_conversion',
  '.htm': 'tier2_conversion',
  '.rtf': 'tier2_conversion',
  '.epub': 'tier2_conversion',
  
  // Tier 3 - OCR
  '.png': 'tier3_ocr',
  '.jpg': 'tier3_ocr',
  '.jpeg': 'tier3_ocr',
  '.gif': 'tier3_ocr',
  '.webp': 'tier3_ocr',
  '.tiff': 'tier3_ocr',
  '.bmp': 'tier3_ocr',
};

function classifyFile(file: ScannedFile): ClassificationResult {
  const ext = file.extension.toLowerCase();
  const classification = EXTENSION_MAP[ext] || 'unsupported';
  
  const result: ClassificationResult = {
    classification,
    converter: null,
    warnings: [],
    estimatedProcessingTime: 0,
  };
  
  switch (classification) {
    case 'tier1_passthrough':
      result.converter = 'text-converter';
      result.estimatedProcessingTime = 0.1;
      break;
      
    case 'tier2_conversion':
      result.converter = getConverterForExtension(ext);
      result.estimatedProcessingTime = getEstimatedTime(ext, file.size);
      break;
      
    case 'tier3_ocr':
      result.converter = 'ocr-converter';
      result.estimatedProcessingTime = estimateOcrTime(file.size);
      result.warnings.push('OCR processing may take several minutes');
      break;
      
    case 'unsupported':
      result.warnings.push(`File type "${ext}" is not supported`);
      break;
  }
  
  return result;
}
```

**Tier 1 Text Converter**:

```typescript
// packages/core/src/converters/text-converter.ts
const CODE_EXTENSIONS: Record<string, string> = {
  '.py': 'python',
  '.js': 'javascript',
  '.ts': 'typescript',
  '.jsx': 'jsx',
  '.tsx': 'tsx',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.c': 'c',
  '.cpp': 'cpp',
  '.h': 'c',
  '.hpp': 'cpp',
  '.rb': 'ruby',
  '.php': 'php',
  '.swift': 'swift',
  '.kt': 'kotlin',
  '.sql': 'sql',
  '.sh': 'bash',
  '.bash': 'bash',
  '.zsh': 'zsh',
  '.ps1': 'powershell',
  '.r': 'r',
  '.scala': 'scala',
  '.lua': 'lua',
  '.pl': 'perl',
  '.css': 'css',
  '.scss': 'scss',
  '.sass': 'sass',
  '.less': 'less',
};

async function convertText(
  file: ScannedFile,
  content: string
): Promise<ConversionResult> {
  const ext = file.extension.toLowerCase();
  
  // Already Markdown - return as-is
  if (['.md', '.mdx'].includes(ext)) {
    return { content, wordCount: countWords(content) };
  }
  
  // Code files - wrap in code block
  if (CODE_EXTENSIONS[ext]) {
    const language = CODE_EXTENSIONS[ext];
    const wrapped = `\`\`\`${language}\n${content}\n\`\`\``;
    return { content: wrapped, wordCount: countWords(content) };
  }
  
  // Data files - wrap in code block with appropriate language
  if (['.json', '.yaml', '.yml', '.xml', '.csv', '.tsv'].includes(ext)) {
    const language = ext.slice(1); // Remove dot
    const wrapped = `\`\`\`${language}\n${content}\n\`\`\``;
    return { content: wrapped, wordCount: countWords(content) };
  }
  
  // Config files - wrap in code block
  if (['.ini', '.toml', '.env', '.conf', '.cfg'].includes(ext)) {
    const wrapped = `\`\`\`ini\n${content}\n\`\`\``;
    return { content: wrapped, wordCount: countWords(content) };
  }
  
  // Plain text - return as-is
  return { content, wordCount: countWords(content) };
}
```

**Tier 2 PDF Converter**:

```typescript
// packages/core/src/converters/pdf-converter.ts
interface PdfConversionOptions {
  preserveAsPdf: boolean;
  stripImages: boolean;
}

interface PdfAnalysis {
  pageCount: number;
  hasText: boolean;
  textToPageRatio: number; // Characters per page
  isLikelyScanned: boolean;
  isProtected: boolean;
}

async function convertPdf(
  file: ScannedFile,
  options: PdfConversionOptions
): Promise<ConversionResult> {
  // First, analyze the PDF
  const analysis = await analyzePdf(file);
  
  if (analysis.isProtected) {
    throw new ConversionError('PDF is copy-protected and cannot be processed');
  }
  
  if (analysis.isLikelyScanned) {
    // Route to OCR
    throw new OcrRequiredError('PDF appears to be scanned, OCR required');
  }
  
  if (options.preserveAsPdf) {
    // Return original file unchanged
    return {
      content: null,
      preserveOriginal: true,
      wordCount: await estimatePdfWordCount(file),
    };
  }
  
  // Extract text
  const text = await extractPdfText(file);
  
  // Convert to Markdown
  const markdown = pdfTextToMarkdown(text, analysis.pageCount);
  
  return {
    content: markdown,
    wordCount: countWords(markdown),
  };
}

// Desktop implementation (Rust)
// packages/desktop/src-tauri/src/converters/pdf.rs
/*
use lopdf::Document;
use pdf_extract::extract_text;

#[tauri::command]
pub async fn analyze_pdf(path: String) -> Result<PdfAnalysis, String> {
    let doc = Document::load(&path).map_err(|e| e.to_string())?;
    
    // Check for encryption
    if doc.is_encrypted() {
        return Ok(PdfAnalysis {
            is_protected: true,
            ..Default::default()
        });
    }
    
    let page_count = doc.get_pages().len();
    let text = extract_text(&path).unwrap_or_default();
    let text_length = text.len();
    
    let text_per_page = if page_count > 0 {
        text_length / page_count
    } else {
        0
    };
    
    // Heuristic: scanned PDFs have very little extractable text
    let is_likely_scanned = text_per_page < 100;
    
    Ok(PdfAnalysis {
        page_count,
        has_text: text_length > 0,
        text_to_page_ratio: text_per_page,
        is_likely_scanned,
        is_protected: false,
    })
}

#[tauri::command]
pub async fn extract_pdf_text(path: String) -> Result<String, String> {
    extract_text(&path).map_err(|e| e.to_string())
}
*/
```

**Tier 2 DOCX Converter**:

```typescript
// packages/core/src/converters/docx-converter.ts
// Uses mammoth.js for conversion
import mammoth from 'mammoth';

async function convertDocx(file: ScannedFile): Promise<ConversionResult> {
  const buffer = await platform.readFileBuffer(file.absolutePath);
  
  const result = await mammoth.convertToMarkdown(
    { buffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => # $1",
        "p[style-name='Heading 2'] => ## $1",
        "p[style-name='Heading 3'] => ### $1",
        "p[style-name='List Paragraph'] => * $1",
      ],
    }
  );
  
  if (result.messages.length > 0) {
    console.warn('DOCX conversion warnings:', result.messages);
  }
  
  return {
    content: result.value,
    wordCount: countWords(result.value),
  };
}
```

**Tier 2 XLSX Converter**:

```typescript
// packages/core/src/converters/xlsx-converter.ts
// Uses SheetJS for parsing
import * as XLSX from 'xlsx';

interface XlsxConversionOptions {
  maxRowsPerSheet: number;  // Default: 1000
  maxColumns: number;       // Default: 20
}

async function convertXlsx(
  file: ScannedFile,
  options: XlsxConversionOptions = { maxRowsPerSheet: 1000, maxColumns: 20 }
): Promise<ConversionResult> {
  const buffer = await platform.readFileBuffer(file.absolutePath);
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  
  const sections: string[] = [];
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
    
    // Section header
    sections.push(`## Sheet: ${sheetName}\n`);
    
    if (jsonData.length === 0) {
      sections.push('*Empty sheet*\n');
      continue;
    }
    
    // Limit columns
    const headers = jsonData[0]?.slice(0, options.maxColumns) || [];
    const rows = jsonData.slice(1, options.maxRowsPerSheet + 1);
    
    // Generate Markdown table
    const table: string[] = [];
    
    // Header row
    table.push('| ' + headers.map(h => String(h || '')).join(' | ') + ' |');
    table.push('| ' + headers.map(() => '---').join(' | ') + ' |');
    
    // Data rows
    for (const row of rows) {
      const cells = row.slice(0, options.maxColumns).map(c => String(c || ''));
      table.push('| ' + cells.join(' | ') + ' |');
    }
    
    sections.push(table.join('\n'));
    
    // Truncation notice
    if (jsonData.length > options.maxRowsPerSheet + 1) {
      sections.push(`\n*Table truncated: showing ${options.maxRowsPerSheet} of ${jsonData.length - 1} rows*\n`);
    }
    
    sections.push('');
  }
  
  const markdown = sections.join('\n');
  return {
    content: markdown,
    wordCount: countWords(markdown),
  };
}
```

**Tier 3 OCR Converter** (Desktop Only):

```typescript
// packages/desktop/src-tauri/src/converters/ocr.rs
/*
use tesseract::Tesseract;

#[tauri::command]
pub async fn ocr_image(
    path: String,
    language: Option<String>,
) -> Result<String, String> {
    let lang = language.unwrap_or_else(|| "eng".to_string());
    
    let tesseract = Tesseract::new(None, Some(&lang))
        .map_err(|e| format!("Failed to initialize Tesseract: {}", e))?;
    
    let tesseract = tesseract
        .set_image(&path)
        .map_err(|e| format!("Failed to load image: {}", e))?;
    
    let text = tesseract
        .get_text()
        .map_err(|e| format!("OCR failed: {}", e))?;
    
    Ok(text)
}

#[tauri::command]
pub async fn ocr_pdf(
    path: String,
    language: Option<String>,
) -> Result<String, String> {
    // Convert PDF pages to images, then OCR each
    let images = pdf_to_images(&path)?;
    let mut all_text = String::new();
    
    for (i, image_path) in images.iter().enumerate() {
        let page_text = ocr_image(image_path.clone(), language.clone()).await?;
        all_text.push_str(&format!("\n--- Page {} ---\n{}", i + 1, page_text));
    }
    
    Ok(all_text)
}
*/
```

---

### 3.8 Chunking (Oversized Files)

**User Story**: As a user, when a file exceeds 450K words, I want Flatpack to split it at semantic boundaries while maintaining context between parts.

**Semantic Chunking Algorithm**:

```typescript
// packages/core/src/processors/chunker.ts
interface ChunkingOptions {
  hardLimit: number;       // Default: 450_000 words
  targetSize: number;      // Default: 400_000 words (leaves buffer)
  overlapWords: number;    // Default: 500 words for context
}

interface Chunk {
  content: string;
  wordCount: number;
  partNumber: number;
  totalParts: number;
  startBoundary: string;   // Description of where chunk starts
  endBoundary: string;     // Description of where chunk ends
}

async function chunkFile(
  content: string,
  contentType: 'markdown' | 'code' | 'text',
  options: ChunkingOptions
): Promise<Chunk[]> {
  const wordCount = countWords(content);
  
  if (wordCount <= options.hardLimit) {
    return [{
      content,
      wordCount,
      partNumber: 1,
      totalParts: 1,
      startBoundary: 'Start of document',
      endBoundary: 'End of document',
    }];
  }
  
  // Find semantic boundaries
  const boundaries = findSemanticBoundaries(content, contentType);
  
  // Group content into chunks
  const chunks: Chunk[] = [];
  let currentStart = 0;
  let currentWords = 0;
  
  for (let i = 0; i < boundaries.length; i++) {
    const boundary = boundaries[i];
    const sectionWords = countWords(content.slice(currentStart, boundary.position));
    
    if (currentWords + sectionWords > options.targetSize) {
      // Create chunk up to previous boundary
      const chunkContent = content.slice(currentStart, boundary.position);
      
      chunks.push({
        content: chunkContent,
        wordCount: currentWords,
        partNumber: chunks.length + 1,
        totalParts: 0, // Will be updated later
        startBoundary: boundaries[currentStart === 0 ? 0 : i - 1]?.description || 'Start',
        endBoundary: boundary.description,
      });
      
      // Start new chunk (with overlap)
      const overlapStart = findOverlapStart(content, boundary.position, options.overlapWords);
      currentStart = overlapStart;
      currentWords = countWords(content.slice(overlapStart, boundary.position));
    } else {
      currentWords += sectionWords;
    }
  }
  
  // Final chunk
  if (currentStart < content.length) {
    chunks.push({
      content: content.slice(currentStart),
      wordCount: countWords(content.slice(currentStart)),
      partNumber: chunks.length + 1,
      totalParts: 0,
      startBoundary: boundaries[boundaries.length - 1]?.description || 'Continuation',
      endBoundary: 'End of document',
    });
  }
  
  // Update total parts
  for (const chunk of chunks) {
    chunk.totalParts = chunks.length;
  }
  
  return chunks;
}

interface SemanticBoundary {
  position: number;       // Character position
  type: 'h1' | 'h2' | 'h3' | 'function' | 'class' | 'paragraph' | 'line';
  description: string;
  priority: number;       // Higher = better split point
}

function findSemanticBoundaries(
  content: string,
  contentType: 'markdown' | 'code' | 'text'
): SemanticBoundary[] {
  const boundaries: SemanticBoundary[] = [];
  
  if (contentType === 'markdown') {
    // Find headers
    const h1Regex = /^# .+$/gm;
    const h2Regex = /^## .+$/gm;
    const h3Regex = /^### .+$/gm;
    
    for (const match of content.matchAll(h1Regex)) {
      boundaries.push({
        position: match.index!,
        type: 'h1',
        description: match[0].slice(2).trim(),
        priority: 3,
      });
    }
    
    for (const match of content.matchAll(h2Regex)) {
      boundaries.push({
        position: match.index!,
        type: 'h2',
        description: match[0].slice(3).trim(),
        priority: 2,
      });
    }
    
    for (const match of content.matchAll(h3Regex)) {
      boundaries.push({
        position: match.index!,
        type: 'h3',
        description: match[0].slice(4).trim(),
        priority: 1,
      });
    }
  } else if (contentType === 'code') {
    // Find function/class definitions (simplified)
    const functionRegex = /^(?:function|def|fn|func|public|private|async)\s+(\w+)/gm;
    const classRegex = /^(?:class|struct|interface|enum)\s+(\w+)/gm;
    
    for (const match of content.matchAll(functionRegex)) {
      boundaries.push({
        position: match.index!,
        type: 'function',
        description: `Function: ${match[1]}`,
        priority: 2,
      });
    }
    
    for (const match of content.matchAll(classRegex)) {
      boundaries.push({
        position: match.index!,
        type: 'class',
        description: `Class: ${match[1]}`,
        priority: 3,
      });
    }
  }
  
  // Fallback: paragraph breaks
  const paragraphRegex = /\n\n+/g;
  for (const match of content.matchAll(paragraphRegex)) {
    boundaries.push({
      position: match.index! + match[0].length,
      type: 'paragraph',
      description: 'Paragraph break',
      priority: 0,
    });
  }
  
  // Sort by position
  return boundaries.sort((a, b) => a.position - b.position);
}
```

**Chunk Header Generation**:

```typescript
// packages/core/src/processors/chunker.ts
function generateChunkHeader(chunk: Chunk, originalPath: string): string {
  return [
    '---',
    `source: "${originalPath}"`,
    `part: ${chunk.partNumber} of ${chunk.totalParts}`,
    `words: ${chunk.wordCount}`,
    chunk.partNumber > 1 ? `continues_from: "Part ${chunk.partNumber - 1}"` : null,
    chunk.partNumber < chunk.totalParts ? `continues_in: "Part ${chunk.partNumber + 1}"` : null,
    `section_start: "${chunk.startBoundary}"`,
    `section_end: "${chunk.endBoundary}"`,
    '---',
    '',
    `> **Part ${chunk.partNumber} of ${chunk.totalParts}**`,
    chunk.partNumber > 1 ? `> Continues from Part ${chunk.partNumber - 1}` : null,
    '',
  ].filter(Boolean).join('\n');
}
```

---

### 3.9 Output Generation

**Manifest File Schema**:

```typescript
// packages/core/src/types/manifest.ts
export interface FlatpackManifest {
  version: '1.0';
  generatedAt: string;
  
  config: {
    tier: NotebookTier;
    pathSeparator: '_' | '-';
    pdfHandling: 'convert' | 'preserve';
    ignorePatterns: string[];
  };
  
  input: {
    sourcePath: string;
    sourceType: 'folder' | 'zip';
    totalFiles: number;
    totalBytes: number;
  };
  
  summary: {
    totalInputFiles: number;
    totalOutputSources: number;
    totalInputWords: number;
    totalOutputWords: number;
    processingTimeSeconds: number;
    
    byAction: Record<FileAction, number>;
    byClassification: Record<FileClassification, number>;
  };
  
  files: ManifestFileEntry[];
  
  warnings: ManifestWarning[];
  errors: ManifestError[];
}

export interface ManifestFileEntry {
  id: string;
  originalPath: string;
  outputPath: string;
  action: FileAction;
  
  originalSize: number;
  outputSize: number;
  inputWords: number;
  outputWords: number;
  
  conversionDetails?: {
    sourceFormat: string;
    targetFormat: string;
    processingTime: number;
  };
  
  chunkDetails?: {
    partNumber: number;
    totalParts: number;
  };
  
  mergeDetails?: {
    bundleId: string;
    filesInBundle: string[];
  };
  
  warnings?: string[];
}

export interface ManifestWarning {
  filePath: string;
  type: string;
  message: string;
}

export interface ManifestError {
  filePath: string;
  type: string;
  message: string;
  stack?: string;
}
```

**Output Writer**:

```typescript
// packages/core/src/output/output-writer.ts
interface OutputConfig {
  outputPath: string;
  createFailuresFolder: boolean;
}

async function writeOutput(
  processedFiles: ProcessedFile[],
  failedFiles: FailedFile[],
  manifest: FlatpackManifest,
  masterStructure: string,
  config: OutputConfig
): Promise<void> {
  // Create output directory
  await platform.createDirectory(config.outputPath);
  
  // Write processed files
  for (const file of processedFiles) {
    const outputPath = path.join(config.outputPath, file.outputPath);
    await platform.writeFile(outputPath, file.content);
  }
  
  // Write master structure
  await platform.writeFile(
    path.join(config.outputPath, '00_MASTER_STRUCTURE.md'),
    masterStructure
  );
  
  // Write manifest
  await platform.writeFile(
    path.join(config.outputPath, 'FLATPACK_MANIFEST.json'),
    JSON.stringify(manifest, null, 2)
  );
  
  // Handle failed files
  if (failedFiles.length > 0 && config.createFailuresFolder) {
    const failuresPath = path.join(config.outputPath, '_failures');
    await platform.createDirectory(failuresPath);
    
    // Copy original files
    for (const file of failedFiles) {
      const destPath = path.join(failuresPath, path.basename(file.originalPath));
      await platform.copyFile(file.originalPath, destPath);
    }
    
    // Write failures report
    const failuresReport = generateFailuresReport(failedFiles);
    await platform.writeFile(
      path.join(failuresPath, 'FAILURES.md'),
      failuresReport
    );
  }
}

function generateFailuresReport(failures: FailedFile[]): string {
  const lines: string[] = [
    '# Processing Failures',
    '',
    `${failures.length} file(s) could not be processed.`,
    '',
    '## Failure Details',
    '',
  ];
  
  for (const file of failures) {
    lines.push(`### ${file.originalPath}`);
    lines.push('');
    lines.push(`**Reason:** ${file.error.message}`);
    lines.push('');
    lines.push(`**Error Type:** ${file.error.type}`);
    lines.push('');
    if (file.error.suggestion) {
      lines.push(`**Suggestion:** ${file.error.suggestion}`);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }
  
  return lines.join('\n');
}
```

---

### 3.10 Error Handling

**Error Handling System**:

```typescript
// packages/core/src/types/errors.ts
export type ErrorSeverity = 'warning' | 'error' | 'critical';

export interface ProcessingError {
  type: string;
  message: string;
  severity: ErrorSeverity;
  filePath?: string;
  suggestion?: string;
  recoverable: boolean;
}

export class FlatpackError extends Error {
  constructor(
    public type: string,
    message: string,
    public severity: ErrorSeverity,
    public recoverable: boolean,
    public suggestion?: string
  ) {
    super(message);
    this.name = 'FlatpackError';
  }
}

export const ERROR_TYPES = {
  // File access
  PERMISSION_DENIED: 'permission_denied',
  FILE_NOT_FOUND: 'file_not_found',
  
  // Conversion
  CONVERSION_FAILED: 'conversion_failed',
  OCR_FAILED: 'ocr_failed',
  UNSUPPORTED_FORMAT: 'unsupported_format',
  PROTECTED_FILE: 'protected_file',
  CORRUPTED_FILE: 'corrupted_file',
  
  // Resource
  DISK_FULL: 'disk_full',
  MEMORY_LIMIT: 'memory_limit',
  
  // Processing
  TIMEOUT: 'timeout',
  CANCELLED: 'cancelled',
} as const;
```

**Error Handling Flow**:

```typescript
// packages/core/src/processors/pipeline.ts
interface ProcessingOptions {
  continueOnErrors: boolean;
  onError: (error: ProcessingError, context: ErrorContext) => Promise<ErrorAction>;
  onProgress: (progress: ProcessingProgress) => void;
}

type ErrorAction = 'skip' | 'retry' | 'abort';

async function processFiles(
  plan: ProcessingPlan,
  options: ProcessingOptions
): Promise<ProcessingResult> {
  const processed: ProcessedFile[] = [];
  const failed: FailedFile[] = [];
  
  for (let i = 0; i < plan.files.length; i++) {
    const file = plan.files[i];
    
    options.onProgress({
      current: i + 1,
      total: plan.files.length,
      currentFile: file.originalPath,
      phase: 'processing',
    });
    
    try {
      const result = await processFile(file);
      processed.push(result);
    } catch (error) {
      const processingError = normalizeError(error, file);
      
      if (processingError.severity === 'critical') {
        // Critical errors always halt
        throw processingError;
      }
      
      if (options.continueOnErrors) {
        // Log and continue
        failed.push({ file, error: processingError });
        continue;
      }
      
      // Prompt user for action
      const action = await options.onError(processingError, { file, index: i });
      
      switch (action) {
        case 'skip':
          failed.push({ file, error: processingError });
          break;
        case 'retry':
          i--; // Retry same file
          break;
        case 'abort':
          throw new FlatpackError(
            'CANCELLED',
            'Processing aborted by user',
            'error',
            false
          );
      }
    }
  }
  
  return { processed, failed };
}
```

**Error UI Component**:

```tsx
// packages/ui/src/components/processing-phase/ErrorPrompt.tsx
interface ErrorPromptProps {
  error: ProcessingError;
  filePath: string;
  onAction: (action: ErrorAction) => void;
}

export function ErrorPrompt({ error, filePath, onAction }: ErrorPromptProps) {
  return (
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            Processing Error
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <p className="font-medium">{error.message}</p>
            <p className="text-sm text-muted-foreground mt-1">
              File: {filePath}
            </p>
          </div>
          
          {error.suggestion && (
            <div className="bg-muted p-3 rounded text-sm">
              <strong>Suggestion:</strong> {error.suggestion}
            </div>
          )}
        </div>
        
        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onAction('skip')}>
            Skip File
          </Button>
          {error.recoverable && (
            <Button variant="outline" onClick={() => onAction('retry')}>
              Retry
            </Button>
          )}
          <Button variant="destructive" onClick={() => onAction('abort')}>
            Abort Processing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

### 3.11 Configuration & Persistence

**Configuration Schema**:

```typescript
// packages/core/src/types/config.ts
export interface FlatpackConfig {
  // Tier settings
  defaultTier: NotebookTier;
  
  // Output settings
  pathSeparator: '_' | '-';
  pdfHandling: 'convert' | 'preserve';
  defaultOutputLocation?: string; // Desktop only
  
  // Ignore patterns
  useDefaultIgnorePatterns: boolean;
  customIgnorePatterns: string[];
  
  // Processing settings
  softWarningThreshold: number;  // Default: 200_000 words
  errorHandlingMode: 'pause' | 'continue';
  
  // OCR settings (desktop only)
  ocrLanguage: string;  // Default: 'eng'
  
  // UI settings
  theme: 'system' | 'light' | 'dark';
}

export const DEFAULT_CONFIG: FlatpackConfig = {
  defaultTier: 'pro',
  pathSeparator: '_',
  pdfHandling: 'convert',
  useDefaultIgnorePatterns: true,
  customIgnorePatterns: [],
  softWarningThreshold: 200_000,
  errorHandlingMode: 'pause',
  ocrLanguage: 'eng',
  theme: 'system',
};
```

**Configuration Persistence**:

```typescript
// packages/core/src/config/config-manager.ts
interface ConfigManager {
  load(): Promise<FlatpackConfig>;
  save(config: FlatpackConfig): Promise<void>;
  reset(): Promise<void>;
}

// Desktop implementation
class TauriConfigManager implements ConfigManager {
  private configPath: string;
  
  constructor() {
    this.configPath = ''; // Will be set by Tauri app data path
  }
  
  async init() {
    const appDataDir = await invoke('get_app_data_dir');
    this.configPath = `${appDataDir}/config.json`;
  }
  
  async load(): Promise<FlatpackConfig> {
    try {
      const content = await invoke('read_file', { path: this.configPath });
      return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
    } catch {
      return DEFAULT_CONFIG;
    }
  }
  
  async save(config: FlatpackConfig): Promise<void> {
    await invoke('write_file', {
      path: this.configPath,
      content: JSON.stringify(config, null, 2),
    });
  }
  
  async reset(): Promise<void> {
    await this.save(DEFAULT_CONFIG);
  }
}

// Web implementation
class WebConfigManager implements ConfigManager {
  private readonly STORAGE_KEY = 'flatpack_config';
  
  async load(): Promise<FlatpackConfig> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
      }
    } catch {
      // Ignore parse errors
    }
    return DEFAULT_CONFIG;
  }
  
  async save(config: FlatpackConfig): Promise<void> {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(config));
  }
  
  async reset(): Promise<void> {
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
```

---

## 4. Database Schema

Flatpack is a local-first tool with no remote database. Data is stored locally in the following structures:

### 4.1 Configuration Store (JSON File / localStorage)

**Location**:
- Desktop: `{app_data_dir}/config.json`
- Web: `localStorage['flatpack_config']`

**Schema**: See `FlatpackConfig` interface in section 3.11

### 4.2 Processing Session (In-Memory / Temporary)

**Schema**: See `ProcessingPlan` and `ProcessingState` interfaces

### 4.3 Output Manifest (JSON File)

**Location**: `{output_dir}/FLATPACK_MANIFEST.json`

**Schema**: See `FlatpackManifest` interface in section 3.9

---

## 5. Server Actions

Flatpack has no remote server. "Server actions" are implemented as:
- **Desktop**: Tauri commands (Rust → JavaScript IPC)
- **Web**: In-browser JavaScript / Web Workers

### 5.1 Tauri Commands (Desktop Backend)

```rust
// packages/desktop/src-tauri/src/commands/mod.rs

// File system operations
#[tauri::command]
pub async fn scan_directory(
    path: String,
    ignore_patterns: Vec<String>,
) -> Result<Vec<ScannedFile>, String>;

#[tauri::command]
pub async fn read_file(path: String) -> Result<String, String>;

#[tauri::command]
pub async fn read_file_bytes(path: String) -> Result<Vec<u8>, String>;

#[tauri::command]
pub async fn write_file(path: String, content: String) -> Result<(), String>;

#[tauri::command]
pub async fn write_file_bytes(path: String, content: Vec<u8>) -> Result<(), String>;

#[tauri::command]
pub async fn copy_file(source: String, dest: String) -> Result<(), String>;

#[tauri::command]
pub async fn create_directory(path: String) -> Result<(), String>;

#[tauri::command]
pub async fn open_folder_in_explorer(path: String) -> Result<(), String>;

// ZIP handling
#[tauri::command]
pub async fn extract_zip(path: String, dest: String) -> Result<Vec<ScannedFile>, String>;

#[tauri::command]
pub async fn create_zip(source_dir: String, dest: String) -> Result<String, String>;

// Conversion
#[tauri::command]
pub async fn analyze_pdf(path: String) -> Result<PdfAnalysis, String>;

#[tauri::command]
pub async fn extract_pdf_text(path: String) -> Result<String, String>;

#[tauri::command]
pub async fn ocr_image(path: String, language: Option<String>) -> Result<String, String>;

#[tauri::command]
pub async fn ocr_pdf(path: String, language: Option<String>) -> Result<String, String>;

// Configuration
#[tauri::command]
pub async fn get_app_data_dir() -> Result<String, String>;

#[tauri::command]
pub async fn get_config() -> Result<FlatpackConfig, String>;

#[tauri::command]
pub async fn set_config(config: FlatpackConfig) -> Result<(), String>;
```

### 5.2 Platform Adapter Interface

```typescript
// packages/ui/src/lib/platform-adapter.ts
export interface PlatformAdapter {
  // Platform detection
  readonly isDesktop: boolean;
  readonly isWeb: boolean;
  readonly supportsOcr: boolean;
  readonly supportsFileSystemAccess: boolean;
  
  // File system
  scanDirectory(path: string, ignorePatterns: string[]): Promise<ScannedFile[]>;
  readFile(path: string): Promise<string>;
  readFileBuffer(path: string): Promise<ArrayBuffer>;
  writeFile(path: string, content: string): Promise<void>;
  writeFileBuffer(path: string, content: ArrayBuffer): Promise<void>;
  copyFile(source: string, dest: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  
  // ZIP
  extractZip(file: File | string): Promise<ScannedFile[]>;
  createZip(files: OutputFile[]): Promise<Blob | string>;
  
  // Conversion
  analyzePdf(file: ScannedFile): Promise<PdfAnalysis>;
  extractPdfText(file: ScannedFile): Promise<string>;
  ocrImage(file: ScannedFile, language?: string): Promise<string>;
  ocrPdf(file: ScannedFile, language?: string): Promise<string>;
  
  // Platform actions
  openInExplorer(path: string): Promise<void>;
  downloadFile(blob: Blob, filename: string): void;
  
  // Configuration
  getConfig(): Promise<FlatpackConfig>;
  setConfig(config: FlatpackConfig): Promise<void>;
}
```

### 5.3 Tauri Adapter Implementation

```typescript
// packages/desktop/src/tauri-adapter.ts
import { invoke } from '@tauri-apps/api/tauri';
import type { PlatformAdapter } from '@flatpack/ui/lib/platform-adapter';

export class TauriAdapter implements PlatformAdapter {
  readonly isDesktop = true;
  readonly isWeb = false;
  readonly supportsOcr = true;
  readonly supportsFileSystemAccess = true;
  
  async scanDirectory(path: string, ignorePatterns: string[]): Promise<ScannedFile[]> {
    return invoke('scan_directory', { path, ignorePatterns });
  }
  
  async readFile(path: string): Promise<string> {
    return invoke('read_file', { path });
  }
  
  async readFileBuffer(path: string): Promise<ArrayBuffer> {
    const bytes: number[] = await invoke('read_file_bytes', { path });
    return new Uint8Array(bytes).buffer;
  }
  
  async writeFile(path: string, content: string): Promise<void> {
    return invoke('write_file', { path, content });
  }
  
  async analyzePdf(file: ScannedFile): Promise<PdfAnalysis> {
    return invoke('analyze_pdf', { path: file.absolutePath });
  }
  
  async ocrImage(file: ScannedFile, language?: string): Promise<string> {
    return invoke('ocr_image', { path: file.absolutePath, language });
  }
  
  async openInExplorer(path: string): Promise<void> {
    return invoke('open_folder_in_explorer', { path });
  }
  
  // ... remaining implementations
}
```

### 5.4 Web Adapter Implementation

```typescript
// packages/web/src/web-adapter.ts
import JSZip from 'jszip';
import * as pdfjs from 'pdfjs-dist';
import type { PlatformAdapter } from '@flatpack/ui/lib/platform-adapter';

export class WebAdapter implements PlatformAdapter {
  readonly isDesktop = false;
  readonly isWeb = true;
  readonly supportsOcr = false; // Too heavy for browser
  readonly supportsFileSystemAccess = 'showDirectoryPicker' in window;
  
  private fileHandles = new Map<string, FileSystemFileHandle>();
  
  async scanDirectory(path: string, ignorePatterns: string[]): Promise<ScannedFile[]> {
    if (!this.supportsFileSystemAccess) {
      throw new Error('File System Access API not supported');
    }
    
    const dirHandle = await window.showDirectoryPicker();
    return this.walkDirectory(dirHandle, '', ignorePatterns);
  }
  
  private async walkDirectory(
    handle: FileSystemDirectoryHandle,
    basePath: string,
    ignorePatterns: string[]
  ): Promise<ScannedFile[]> {
    const files: ScannedFile[] = [];
    const matcher = createGlobMatcher(ignorePatterns);
    
    for await (const [name, entry] of handle.entries()) {
      const path = basePath ? `${basePath}/${name}` : name;
      
      if (matcher.matches(path)) continue;
      
      if (entry.kind === 'directory') {
        const subFiles = await this.walkDirectory(entry, path, ignorePatterns);
        files.push(...subFiles);
      } else {
        const file = await entry.getFile();
        this.fileHandles.set(path, entry);
        
        files.push({
          path,
          absolutePath: path,
          name,
          extension: name.split('.').pop() || '',
          size: file.size,
          modifiedAt: new Date(file.lastModified),
          depth: path.split('/').length - 1,
        });
      }
    }
    
    return files;
  }
  
  async extractZip(file: File): Promise<ScannedFile[]> {
    const zip = await JSZip.loadAsync(file);
    const files: ScannedFile[] = [];
    
    zip.forEach((path, entry) => {
      if (entry.dir) return;
      
      files.push({
        path,
        absolutePath: path,
        name: path.split('/').pop()!,
        extension: path.split('.').pop() || '',
        size: entry._data?.uncompressedSize || 0,
        modifiedAt: entry.date,
        depth: path.split('/').length - 1,
      });
    });
    
    return files;
  }
  
  async analyzePdf(file: ScannedFile): Promise<PdfAnalysis> {
    const buffer = await this.readFileBuffer(file.absolutePath);
    const pdf = await pdfjs.getDocument(buffer).promise;
    
    let totalTextLength = 0;
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      totalTextLength += content.items.map(i => i.str).join('').length;
    }
    
    const textPerPage = totalTextLength / pdf.numPages;
    
    return {
      pageCount: pdf.numPages,
      hasText: totalTextLength > 0,
      textToPageRatio: textPerPage,
      isLikelyScanned: textPerPage < 100,
      isProtected: false, // Can't easily detect in browser
    };
  }
  
  ocrImage(): Promise<string> {
    throw new Error('OCR not supported in web version');
  }
  
  ocrPdf(): Promise<string> {
    throw new Error('OCR not supported in web version');
  }
  
  downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  // ... remaining implementations
}
```

---

## 6. Design System

### 6.1 Visual Style

**Color Palette**:

```css
/* packages/ui/src/styles/globals.css */

:root {
  /* Background */
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  
  /* Card / Surfaces */
  --card: 0 0% 100%;
  --card-foreground: 222.2 84% 4.9%;
  
  /* Primary */
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  
  /* Secondary */
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222.2 47.4% 11.2%;
  
  /* Muted */
  --muted: 210 40% 96.1%;
  --muted-foreground: 215.4 16.3% 46.9%;
  
  /* Accent */
  --accent: 210 40% 96.1%;
  --accent-foreground: 222.2 47.4% 11.2%;
  
  /* Destructive */
  --destructive: 0 84.2% 60.2%;
  --destructive-foreground: 210 40% 98%;
  
  /* Border */
  --border: 214.3 31.8% 91.4%;
  --input: 214.3 31.8% 91.4%;
  --ring: 222.2 84% 4.9%;
  
  /* Radius */
  --radius: 0.5rem;
  
  /* Status Colors */
  --status-keep: 142 76% 36%;       /* Green */
  --status-convert: 217 91% 60%;    /* Blue */
  --status-chunk: 262 83% 58%;      /* Purple */
  --status-merge: 45 93% 47%;       /* Yellow */
  --status-ocr: 24 95% 53%;         /* Orange */
  --status-fail: 0 84% 60%;         /* Red */
  --status-skip: 220 9% 46%;        /* Gray */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
  
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 212.7 26.8% 83.9%;
}
```

**Typography**:

```css
/* Font family */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'SF Mono', monospace;

/* Font sizes */
--text-xs: 0.75rem;    /* 12px */
--text-sm: 0.875rem;   /* 14px */
--text-base: 1rem;     /* 16px */
--text-lg: 1.125rem;   /* 18px */
--text-xl: 1.25rem;    /* 20px */
--text-2xl: 1.5rem;    /* 24px */
--text-3xl: 1.875rem;  /* 30px */

/* Font weights */
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

**Spacing**:

```css
/* Spacing scale (Tailwind default) */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
```

### 6.2 Core Components

**Layout Structure**:

```tsx
// packages/ui/src/components/layout/AppShell.tsx
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
}

// packages/ui/src/components/layout/Header.tsx
export function Header() {
  const { theme, setTheme } = useConfig();
  
  return (
    <header className="h-14 border-b flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6" />
        <span className="font-semibold text-lg">Flatpack</span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
```

**Phase Transitions**:

```tsx
// packages/ui/src/components/PhaseManager.tsx
type Phase = 'input' | 'preview' | 'processing' | 'results';

export function PhaseManager() {
  const { phase } = useSession();
  
  return (
    <AnimatePresence mode="wait">
      {phase === 'input' && (
        <motion.div
          key="input"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
        >
          <InputPhase />
        </motion.div>
      )}
      {phase === 'preview' && (
        <motion.div key="preview" {...fadeTransition}>
          <PreviewPhase />
        </motion.div>
      )}
      {phase === 'processing' && (
        <motion.div key="processing" {...fadeTransition}>
          <ProcessingPhase />
        </motion.div>
      )}
      {phase === 'results' && (
        <motion.div key="results" {...fadeTransition}>
          <ResultsPhase />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

**Drop Zone Component**:

```tsx
// packages/ui/src/components/input-phase/DropZone.tsx
interface DropZoneProps {
  onFiles: (files: ScannedFile[]) => void;
  onZip: (file: File) => void;
}

export function DropZone({ onFiles, onZip }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const platform = usePlatform();
  
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const items = e.dataTransfer.items;
    
    for (const item of items) {
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file?.name.endsWith('.zip')) {
          onZip(file);
          return;
        }
      }
      
      // Check for directory (if supported)
      const entry = item.webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        const files = await platform.scanDirectory(entry.fullPath, []);
        onFiles(files);
        return;
      }
    }
  };
  
  const handleBrowse = async () => {
    if (platform.supportsFileSystemAccess) {
      const files = await platform.scanDirectory('', []);
      onFiles(files);
    } else {
      // Fallback: file input for ZIP
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.zip';
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) onZip(file);
      };
      input.click();
    }
  };
  
  return (
    <div
      className={cn(
        "border-2 border-dashed rounded-xl p-12 text-center transition-colors",
        isDragOver ? "border-primary bg-primary/5" : "border-border",
        "hover:border-muted-foreground cursor-pointer"
      )}
      onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      onClick={handleBrowse}
    >
      <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
      <h2 className="text-xl font-semibold mb-2">
        Drop folder or ZIP here
      </h2>
      <p className="text-muted-foreground">
        or click to browse
      </p>
      {!platform.supportsFileSystemAccess && (
        <p className="text-sm text-muted-foreground mt-4">
          Note: Only ZIP files supported in this browser
        </p>
      )}
    </div>
  );
}
```

**Action Badge States**:

```tsx
// packages/ui/src/components/shared/ActionBadge.tsx
const ACTION_STYLES: Record<FileAction, { bg: string; text: string; label: string }> = {
  keep: {
    bg: 'bg-green-500/20',
    text: 'text-green-700 dark:text-green-400',
    label: 'Keep',
  },
  convert: {
    bg: 'bg-blue-500/20',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'Convert',
  },
  chunk: {
    bg: 'bg-purple-500/20',
    text: 'text-purple-700 dark:text-purple-400',
    label: 'Chunk',
  },
  merge: {
    bg: 'bg-yellow-500/20',
    text: 'text-yellow-700 dark:text-yellow-400',
    label: 'Merge',
  },
  ocr: {
    bg: 'bg-orange-500/20',
    text: 'text-orange-700 dark:text-orange-400',
    label: 'OCR',
  },
  skip: {
    bg: 'bg-gray-500/20',
    text: 'text-gray-700 dark:text-gray-400',
    label: 'Skip',
  },
  fail: {
    bg: 'bg-red-500/20',
    text: 'text-red-700 dark:text-red-400',
    label: 'Fail',
  },
};

export function ActionBadge({ action }: { action: FileAction }) {
  const style = ACTION_STYLES[action];
  
  return (
    <span className={cn(
      "px-2 py-0.5 rounded text-xs font-medium",
      style.bg,
      style.text
    )}>
      {style.label}
    </span>
  );
}
```

---

## 7. Component Architecture

### 7.1 State Management (Zustand)

```typescript
// packages/ui/src/stores/config-store.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ConfigState {
  config: FlatpackConfig;
  setConfig: (config: Partial<FlatpackConfig>) => void;
  resetConfig: () => void;
}

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,
      setConfig: (partial) => set((state) => ({
        config: { ...state.config, ...partial },
      })),
      resetConfig: () => set({ config: DEFAULT_CONFIG }),
    }),
    {
      name: 'flatpack-config',
      // Only persist in web; desktop uses file system
      skipHydration: typeof window !== 'undefined' && 'invoke' in window,
    }
  )
);
```

```typescript
// packages/ui/src/stores/session-store.ts
import { create } from 'zustand';

type Phase = 'input' | 'preview' | 'processing' | 'results';

interface SessionState {
  phase: Phase;
  setPhase: (phase: Phase) => void;
  
  inputFiles: ScannedFile[];
  setInputFiles: (files: ScannedFile[]) => void;
  
  processingPlan: ProcessingPlan | null;
  setProcessingPlan: (plan: ProcessingPlan | null) => void;
  
  processingResult: ProcessingResult | null;
  setProcessingResult: (result: ProcessingResult | null) => void;
  
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  phase: 'input',
  setPhase: (phase) => set({ phase }),
  
  inputFiles: [],
  setInputFiles: (files) => set({ inputFiles: files }),
  
  processingPlan: null,
  setProcessingPlan: (plan) => set({ processingPlan: plan }),
  
  processingResult: null,
  setProcessingResult: (result) => set({ processingResult: result }),
  
  reset: () => set({
    phase: 'input',
    inputFiles: [],
    processingPlan: null,
    processingResult: null,
  }),
}));
```

```typescript
// packages/ui/src/stores/processing-store.ts
import { create } from 'zustand';

interface ProcessingProgress {
  current: number;
  total: number;
  currentFile: string;
  phase: 'scanning' | 'analyzing' | 'processing' | 'writing';
  startTime: number;
}

interface ProcessingState {
  isProcessing: boolean;
  progress: ProcessingProgress | null;
  
  setProcessing: (isProcessing: boolean) => void;
  setProgress: (progress: ProcessingProgress | null) => void;
  
  logs: ProcessingLog[];
  addLog: (log: ProcessingLog) => void;
  clearLogs: () => void;
  
  currentError: ProcessingError | null;
  setCurrentError: (error: ProcessingError | null) => void;
}

export const useProcessingStore = create<ProcessingState>((set) => ({
  isProcessing: false,
  progress: null,
  
  setProcessing: (isProcessing) => set({ isProcessing }),
  setProgress: (progress) => set({ progress }),
  
  logs: [],
  addLog: (log) => set((state) => ({
    logs: [...state.logs.slice(-99), log], // Keep last 100
  })),
  clearLogs: () => set({ logs: [] }),
  
  currentError: null,
  setCurrentError: (error) => set({ currentError: error }),
}));
```

### 7.2 React Hooks

```typescript
// packages/ui/src/hooks/useConfig.ts
import { useConfigStore } from '../stores/config-store';

export function useConfig() {
  const { config, setConfig, resetConfig } = useConfigStore();
  
  return {
    ...config,
    tier: config.defaultTier,
    setTier: (tier: NotebookTier) => setConfig({ defaultTier: tier }),
    setPathSeparator: (sep: '_' | '-') => setConfig({ pathSeparator: sep }),
    setPdfHandling: (handling: 'convert' | 'preserve') => setConfig({ pdfHandling: handling }),
    setIgnorePatterns: (patterns: string[]) => setConfig({ customIgnorePatterns: patterns }),
    setTheme: (theme: 'system' | 'light' | 'dark') => setConfig({ theme }),
    reset: resetConfig,
  };
}
```

```typescript
// packages/ui/src/hooks/useProcessing.ts
import { useCallback } from 'react';
import { useSessionStore } from '../stores/session-store';
import { useProcessingStore } from '../stores/processing-store';
import { useConfigStore } from '../stores/config-store';
import { usePlatform } from './usePlatform';
import { processFiles, generateProcessingPlan } from '@flatpack/core';

export function useProcessing() {
  const platform = usePlatform();
  const { config } = useConfigStore();
  const { inputFiles, setProcessingPlan, setProcessingResult, setPhase } = useSessionStore();
  const { setProcessing, setProgress, addLog, setCurrentError, clearLogs } = useProcessingStore();
  
  const analyze = useCallback(async () => {
    if (inputFiles.length === 0) return;
    
    setProcessing(true);
    setProgress({ current: 0, total: inputFiles.length, currentFile: '', phase: 'analyzing', startTime: Date.now() });
    
    try {
      const plan = await generateProcessingPlan(inputFiles, config, platform);
      setProcessingPlan(plan);
      setPhase('preview');
    } catch (error) {
      setCurrentError(normalizeError(error));
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  }, [inputFiles, config, platform]);
  
  const process = useCallback(async (plan: ProcessingPlan) => {
    setProcessing(true);
    clearLogs();
    setPhase('processing');
    
    try {
      const result = await processFiles(plan, platform, {
        continueOnErrors: config.errorHandlingMode === 'continue',
        onProgress: (progress) => {
          setProgress(progress);
          addLog({ type: 'progress', file: progress.currentFile, timestamp: Date.now() });
        },
        onError: async (error) => {
          setCurrentError(error);
          // Wait for user action if in pause mode
          return new Promise((resolve) => {
            // Error prompt will call resolve with action
            (window as any).__flatpack_error_resolve = resolve;
          });
        },
      });
      
      setProcessingResult(result);
      setPhase('results');
    } catch (error) {
      setCurrentError(normalizeError(error));
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  }, [config, platform]);
  
  return { analyze, process };
}
```

```typescript
// packages/ui/src/hooks/usePlatform.ts
import { createContext, useContext, useMemo } from 'react';
import type { PlatformAdapter } from '../lib/platform-adapter';

const PlatformContext = createContext<PlatformAdapter | null>(null);

export function PlatformProvider({ 
  adapter, 
  children 
}: { 
  adapter: PlatformAdapter; 
  children: React.ReactNode;
}) {
  return (
    <PlatformContext.Provider value={adapter}>
      {children}
    </PlatformContext.Provider>
  );
}

export function usePlatform(): PlatformAdapter {
  const platform = useContext(PlatformContext);
  if (!platform) {
    throw new Error('usePlatform must be used within PlatformProvider');
  }
  return platform;
}
```

### 7.3 TypeScript Interfaces

```typescript
// packages/core/src/types/index.ts

// Re-export all types
export * from './file-tree';
export * from './processing-plan';
export * from './config';
export * from './manifest';
export * from './errors';

// Common interfaces
export interface ScannedFile {
  path: string;
  absolutePath: string;
  name: string;
  extension: string;
  size: number;
  modifiedAt: Date;
  depth: number;
}

export interface AnalyzedFile extends ScannedFile {
  classification: FileClassification;
  estimatedWords: number;
  warnings: Warning[];
  content?: string; // Loaded on demand
}

export interface ProcessedFile {
  originalPath: string;
  outputPath: string;
  content: string;
  wordCount: number;
  action: FileAction;
  metadata: FileMetadata;
}

export interface FailedFile {
  originalPath: string;
  error: ProcessingError;
}

export interface ProcessingResult {
  processed: ProcessedFile[];
  failed: FailedFile[];
  manifest: FlatpackManifest;
  masterStructure: string;
  processingTime: number;
}

export interface Warning {
  type: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  filePath?: string;
  suggestion?: string;
}

export interface ProcessingLog {
  type: 'start' | 'progress' | 'complete' | 'error' | 'skip';
  file: string;
  timestamp: number;
  message?: string;
}
```

---

## 8. Authentication & Authorization

**Not applicable** - Flatpack is a local-first tool with no user accounts or remote authentication.

**Future Consideration**: If the app is monetized, license key validation could be implemented:

```typescript
// Potential future implementation
interface LicenseValidation {
  isValid: boolean;
  tier: 'free' | 'pro';
  expiresAt?: Date;
}

async function validateLicense(key: string): Promise<LicenseValidation> {
  // Could use Gumroad, LemonSqueezy, or custom validation
  // For now, always return valid
  return { isValid: true, tier: 'pro' };
}
```

---

## 9. Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLATPACK DATA FLOW                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐ │
│  │   Input     │──▶│   Session   │──▶│  Processing │──▶│     Config      │ │
│  │   Files     │   │    Store    │   │    Store    │   │     Store       │ │
│  └─────────────┘   └─────────────┘   └─────────────┘   └─────────────────┘ │
│        │                 │                 │                   │            │
│        │                 │                 │                   │            │
│        ▼                 ▼                 ▼                   ▼            │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        REACT COMPONENTS                              │   │
│  │  • useSessionStore()  • useProcessingStore()  • useConfigStore()    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                    │
│        ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      PLATFORM ADAPTER                                │   │
│  │  • TauriAdapter (Desktop)                                           │   │
│  │  • WebAdapter (Browser)                                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                    │
│        ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      NATIVE BACKEND                                  │   │
│  │  • Tauri Commands (Rust)                                            │   │
│  │  • Web Workers (Browser)                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│        │                                                                    │
│        ▼                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                      FILE SYSTEM                                     │   │
│  │  • Read input files                                                 │   │
│  │  • Write output files                                               │   │
│  │  • Persist configuration                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**State Flow by Phase**:

1. **Input Phase**:
   - User drops files → `sessionStore.setInputFiles(files)`
   - User adjusts settings → `configStore.setConfig(partial)`
   - User clicks analyze → triggers `useProcessing().analyze()`

2. **Preview Phase**:
   - Analysis completes → `sessionStore.setProcessingPlan(plan)`
   - User adjusts plan → modify `sessionStore.processingPlan`
   - User confirms → triggers `useProcessing().process(plan)`

3. **Processing Phase**:
   - Processing starts → `processingStore.setProcessing(true)`
   - Progress updates → `processingStore.setProgress(progress)`
   - Errors → `processingStore.setCurrentError(error)`
   - User resolves error → clears error, continues/aborts

4. **Results Phase**:
   - Processing completes → `sessionStore.setProcessingResult(result)`
   - User clicks retry failed → reprocesses failed files
   - User clicks start over → `sessionStore.reset()`

---

## 10. Stripe Integration

**Not applicable** - Flatpack does not include payment processing in Phase 1.

**Future Consideration**: If monetized, could implement one-time license purchase or subscription:

```typescript
// Potential future integration (not in Phase 1)
// Using Stripe Checkout or LemonSqueezy
interface LicenseCheckout {
  checkoutUrl: string;
  licenseKey: string;
}

async function createCheckout(email: string): Promise<LicenseCheckout> {
  // Implementation would depend on payment provider
}
```

---

## 11. PostHog Analytics

**Open Question from Spec**: Telemetry remains an open decision. If implemented, should be opt-in and anonymous.

**Potential Implementation** (if decided to include):

```typescript
// packages/ui/src/lib/analytics.ts
import posthog from 'posthog-js';

const POSTHOG_KEY = process.env.POSTHOG_KEY || '';
const ANALYTICS_ENABLED = process.env.ENABLE_ANALYTICS === 'true';

export function initAnalytics() {
  if (!ANALYTICS_ENABLED || !POSTHOG_KEY) return;
  
  posthog.init(POSTHOG_KEY, {
    api_host: 'https://app.posthog.com',
    autocapture: false,  // Disable automatic tracking
    capture_pageview: false,
    persistence: 'localStorage',
  });
}

// Events to track (if analytics enabled)
export const AnalyticsEvents = {
  SESSION_START: 'session_start',
  FILES_DROPPED: 'files_dropped',
  PROCESSING_STARTED: 'processing_started',
  PROCESSING_COMPLETED: 'processing_completed',
  PROCESSING_FAILED: 'processing_failed',
} as const;

export function trackEvent(
  event: keyof typeof AnalyticsEvents,
  properties?: Record<string, any>
) {
  if (!ANALYTICS_ENABLED) return;
  
  // Sanitize properties - never include file names or content
  const safeProps = {
    tier: properties?.tier,
    fileCount: properties?.fileCount,
    totalWords: properties?.totalWords,
    processingTime: properties?.processingTime,
    errorType: properties?.errorType,
    // Platform info
    platform: typeof window !== 'undefined' && 'invoke' in window ? 'desktop' : 'web',
  };
  
  posthog.capture(AnalyticsEvents[event], safeProps);
}
```

---

## 12. Testing

### 12.1 Unit Tests (Vitest)

```typescript
// packages/core/src/converters/__tests__/text-converter.test.ts
import { describe, it, expect } from 'vitest';
import { convertText } from '../text-converter';

describe('Text Converter', () => {
  it('should pass through markdown files unchanged', async () => {
    const file = { extension: '.md', name: 'test.md' } as ScannedFile;
    const content = '# Hello\n\nWorld';
    
    const result = await convertText(file, content);
    
    expect(result.content).toBe(content);
  });
  
  it('should wrap code files in code blocks', async () => {
    const file = { extension: '.py', name: 'test.py' } as ScannedFile;
    const content = 'print("hello")';
    
    const result = await convertText(file, content);
    
    expect(result.content).toBe('```python\nprint("hello")\n```');
  });
  
  it('should wrap JSON in code blocks', async () => {
    const file = { extension: '.json', name: 'config.json' } as ScannedFile;
    const content = '{"key": "value"}';
    
    const result = await convertText(file, content);
    
    expect(result.content).toBe('```json\n{"key": "value"}\n```');
  });
});
```

```typescript
// packages/core/src/processors/__tests__/chunker.test.ts
import { describe, it, expect } from 'vitest';
import { chunkFile } from '../chunker';

describe('Chunker', () => {
  it('should not chunk files under limit', async () => {
    const content = 'Short content';
    const options = { hardLimit: 450_000, targetSize: 400_000, overlapWords: 500 };
    
    const chunks = await chunkFile(content, 'text', options);
    
    expect(chunks).toHaveLength(1);
    expect(chunks[0].partNumber).toBe(1);
    expect(chunks[0].totalParts).toBe(1);
  });
  
  it('should split at markdown headers', async () => {
    const content = `# Chapter 1\n${'word '.repeat(200_000)}\n# Chapter 2\n${'word '.repeat(200_000)}\n# Chapter 3\n${'word '.repeat(200_000)}`;
    const options = { hardLimit: 450_000, targetSize: 400_000, overlapWords: 500 };
    
    const chunks = await chunkFile(content, 'markdown', options);
    
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].startBoundary).toContain('Chapter 1');
  });
  
  it('should include overlap between chunks', async () => {
    const content = `# Section 1\n${'word '.repeat(500_000)}`;
    const options = { hardLimit: 450_000, targetSize: 400_000, overlapWords: 500 };
    
    const chunks = await chunkFile(content, 'markdown', options);
    
    expect(chunks.length).toBe(2);
    // Check that chunk 2 starts before chunk 1 ends
    const chunk1End = chunks[0].content.length;
    const chunk2Start = chunks[1].content.slice(0, 100);
    // Overlap should be present
  });
});
```

```typescript
// packages/core/src/planner/__tests__/naming-resolver.test.ts
import { describe, it, expect } from 'vitest';
import { resolveNamingCollisions } from '../naming-resolver';

describe('Naming Resolver', () => {
  it('should add numeric suffix to colliding names', () => {
    const files: PlannedFile[] = [
      { outputPath: 'readme.md', originalPath: 'a/readme.md' } as PlannedFile,
      { outputPath: 'readme.md', originalPath: 'b/readme.md' } as PlannedFile,
      { outputPath: 'readme.md', originalPath: 'c/readme.md' } as PlannedFile,
    ];
    
    resolveNamingCollisions(files, '_');
    
    expect(files[0].outputPath).toBe('readme_1.md');
    expect(files[1].outputPath).toBe('readme_2.md');
    expect(files[2].outputPath).toBe('readme_3.md');
  });
  
  it('should not modify unique names', () => {
    const files: PlannedFile[] = [
      { outputPath: 'file1.md', originalPath: 'a/file1.md' } as PlannedFile,
      { outputPath: 'file2.md', originalPath: 'b/file2.md' } as PlannedFile,
    ];
    
    resolveNamingCollisions(files, '_');
    
    expect(files[0].outputPath).toBe('file1.md');
    expect(files[1].outputPath).toBe('file2.md');
  });
});
```

### 12.2 Integration Tests

```typescript
// packages/core/src/__tests__/pipeline.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestDirectory, cleanupTestDirectory } from './test-utils';
import { generateProcessingPlan, processFiles } from '../index';

describe('Processing Pipeline', () => {
  let testDir: string;
  
  beforeAll(async () => {
    testDir = await createTestDirectory({
      'readme.md': '# Project\n\nDescription',
      'src/index.ts': 'console.log("hello")',
      'src/utils/helper.ts': 'export const help = () => {}',
      'docs/guide.txt': 'User guide content',
    });
  });
  
  afterAll(async () => {
    await cleanupTestDirectory(testDir);
  });
  
  it('should process a simple project structure', async () => {
    const files = await scanDirectory(testDir, []);
    const config = { ...DEFAULT_CONFIG, defaultTier: 'pro' as const };
    
    const plan = await generateProcessingPlan(files, config);
    
    expect(plan.files).toHaveLength(4);
    expect(plan.summary.byAction.keep).toBe(4); // All should be kept (under limit)
  });
  
  it('should flatten paths correctly', async () => {
    const files = await scanDirectory(testDir, []);
    const config = { ...DEFAULT_CONFIG, pathSeparator: '_' as const };
    
    const plan = await generateProcessingPlan(files, config);
    
    const utilsFile = plan.files.find(f => f.originalPath.includes('helper.ts'));
    expect(utilsFile?.outputPath).toBe('src_utils_helper.md');
  });
});
```

### 12.3 E2E Tests (Playwright)

```typescript
// packages/desktop/e2e/workflow.spec.ts
import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Complete Workflow', () => {
  test('should process a folder and generate output', async ({ page }) => {
    // Navigate to app
    await page.goto('/');
    
    // Check initial state
    await expect(page.getByText('Drop folder or ZIP here')).toBeVisible();
    
    // Select tier
    await page.getByRole('button', { name: 'Pro' }).click();
    await expect(page.getByRole('button', { name: 'Pro' })).toHaveClass(/border-primary/);
    
    // Simulate file drop (would need test fixtures)
    // In real test, use Playwright's file chooser or Tauri test utils
    
    // Verify preview phase
    await expect(page.getByText('Processing Plan')).toBeVisible();
    
    // Confirm processing
    await page.getByRole('button', { name: 'Process' }).click();
    
    // Wait for completion
    await expect(page.getByText('Processing Complete')).toBeVisible({ timeout: 30000 });
    
    // Verify results
    await expect(page.getByText(/\d+ sources processed/)).toBeVisible();
  });
  
  test('should handle errors gracefully', async ({ page }) => {
    await page.goto('/');
    
    // Setup error scenario (e.g., protected PDF)
    // ...
    
    // Verify error prompt appears
    await expect(page.getByText('Processing Error')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Skip File' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Abort Processing' })).toBeVisible();
  });
  
  test('should persist settings between sessions', async ({ page }) => {
    await page.goto('/');
    
    // Change settings
    await page.getByRole('button', { name: 'Free' }).click();
    await page.getByLabel('Path Separator').selectOption('-');
    
    // Reload page
    await page.reload();
    
    // Verify settings persisted
    await expect(page.getByRole('button', { name: 'Free' })).toHaveClass(/border-primary/);
    await expect(page.getByLabel('Path Separator')).toHaveValue('-');
  });
});
```

```typescript
// packages/web/e2e/web-specific.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Web Platform Specifics', () => {
  test('should show web limitations', async ({ page }) => {
    await page.goto('/');
    
    // OCR should not be available
    await expect(page.getByText('OCR processing')).not.toBeVisible();
    
    // Should show File System Access API support status
    const hasApi = await page.evaluate(() => 'showDirectoryPicker' in window);
    if (!hasApi) {
      await expect(page.getByText('Only ZIP files supported')).toBeVisible();
    }
  });
  
  test('should generate downloadable ZIP', async ({ page }) => {
    await page.goto('/');
    
    // Process files via ZIP upload
    const fileChooser = await page.waitForEvent('filechooser');
    await fileChooser.setFiles('./fixtures/test-project.zip');
    
    // Complete processing
    await page.getByRole('button', { name: 'Process' }).click();
    await expect(page.getByText('Processing Complete')).toBeVisible();
    
    // Verify download button
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Download ZIP' }).click(),
    ]);
    
    expect(download.suggestedFilename()).toBe('flatpack-output.zip');
  });
});
```

---

## Appendix: Key Decisions & Rationale

1. **Monorepo Structure**: Enables code sharing between desktop and web while maintaining platform-specific implementations.

2. **Zustand over Redux**: Lighter weight, simpler API, excellent TypeScript support. Sufficient for this application's state complexity.

3. **Tauri over Electron**: Significantly smaller binary size (~10MB vs ~150MB), better performance, native Rust capabilities for file processing.

4. **Markdown as Output Format**: Consistently produces better results in NotebookLM than PDF. Converting to Markdown is the primary value proposition.

5. **Platform Adapter Pattern**: Clean abstraction over platform differences, enabling shared UI code with platform-specific implementations.

6. **Semantic Chunking**: Splitting at headers/functions preserves context better than arbitrary word-count boundaries.

7. **Depth-First Bundling**: Deeper folders typically contain supporting material, making them better candidates for merging than top-level content.