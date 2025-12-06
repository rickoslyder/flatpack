<brainstorming>
## Analysis of the Flatpack Technical Specification

### Architecture Overview
This is a **monorepo** with four main packages:
1. `packages/core` - Platform-agnostic processing logic (TypeScript)
2. `packages/ui` - Shared React components and state management
3. `packages/desktop` - Tauri application (React + Rust)
4. `packages/web` - Web application (React + Web Workers)

### Key Technical Decisions
- **State Management**: Zustand (lightweight, great TypeScript support)
- **Styling**: Tailwind CSS + shadcn/ui components
- **Desktop**: Tauri (Rust backend) - smaller binary, native performance
- **Platform Abstraction**: PlatformAdapter pattern for cross-platform compatibility
- **Processing**: Local-first, no cloud dependencies

### Implementation Order Strategy
1. **Foundation First**: Monorepo setup, TypeScript config, shared types
2. **Core Logic Before UI**: Build the processing engine first, then UI
3. **Web Before Desktop**: Web is simpler (no Rust), validates core logic
4. **Desktop Enhancement**: Add Tauri-specific features like OCR

### Complexity Breakdown
- **High Complexity**: Chunking algorithm, bundling strategy, format converters
- **Medium Complexity**: File tree preview, processing pipeline, state management
- **Lower Complexity**: UI components, configuration persistence, output generation

### Dependencies to Consider
- Each phase needs previous types/interfaces
- Converters need utilities (word counting, path handling)
- UI needs stores which need types
- Platform adapters need core processing functions

### Potential Risks
- PDF conversion quality varies by platform
- OCR is desktop-only (Tesseract too heavy for browser)
- File System Access API has limited browser support
- Large file processing needs careful memory management
</brainstorming>

# Implementation Plan

## Phase 1: Monorepo Foundation

- [ ] Step 1.1: Initialize monorepo with pnpm workspaces
  - **Task**: Set up the root project structure with pnpm workspaces, create the basic package directories, and configure TypeScript for the monorepo
  - **Files**:
    - `package.json`: Root package.json with pnpm workspace configuration
    - `pnpm-workspace.yaml`: Workspace definition for packages
    - `turbo.json`: Turborepo configuration for build orchestration
    - `tsconfig.base.json`: Base TypeScript configuration shared across packages
    - `.eslintrc.js`: ESLint configuration for the monorepo
    - `.prettierrc`: Prettier configuration
    - `.gitignore`: Git ignore patterns
    - `README.md`: Project documentation
  - **Step Dependencies**: None
  - **User Instructions**: Run `pnpm install` after this step to initialize the workspace

- [ ] Step 1.2: Set up core package structure
  - **Task**: Create the `packages/core` package with its directory structure, TypeScript config, and package.json
  - **Files**:
    - `packages/core/package.json`: Core package configuration
    - `packages/core/tsconfig.json`: TypeScript config extending base
    - `packages/core/vitest.config.ts`: Vitest configuration for testing
    - `packages/core/src/index.ts`: Main entry point (exports)
  - **Step Dependencies**: Step 1.1
  - **User Instructions**: None

- [ ] Step 1.3: Set up UI package structure
  - **Task**: Create the `packages/ui` package with React, Tailwind CSS, and shadcn/ui setup
  - **Files**:
    - `packages/ui/package.json`: UI package configuration with React dependencies
    - `packages/ui/tsconfig.json`: TypeScript config for React
    - `packages/ui/tailwind.config.js`: Tailwind CSS configuration
    - `packages/ui/postcss.config.js`: PostCSS configuration
    - `packages/ui/src/styles/globals.css`: Global styles with Tailwind directives and CSS variables
    - `packages/ui/src/index.ts`: Main entry point
    - `packages/ui/src/lib/cn.ts`: Tailwind class merge utility (cn function)
    - `packages/ui/components.json`: shadcn/ui configuration
  - **Step Dependencies**: Step 1.1
  - **User Instructions**: Run `pnpm install` to install new dependencies

## Phase 2: Core Types & Constants

- [ ] Step 2.1: Define core type definitions
  - **Task**: Create all TypeScript interfaces for the application including ScannedFile, AnalyzedFile, ProcessingPlan, and related types
  - **Files**:
    - `packages/core/src/types/index.ts`: Re-export all types
    - `packages/core/src/types/file-tree.ts`: ScannedFile, AnalyzedFile interfaces
    - `packages/core/src/types/config.ts`: FlatpackConfig, NotebookTier, TierLimits interfaces
    - `packages/core/src/types/processing-plan.ts`: FileAction, PlannedFile, ProcessingPlan interfaces
    - `packages/core/src/types/manifest.ts`: FlatpackManifest, ManifestFileEntry interfaces
    - `packages/core/src/types/errors.ts`: ProcessingError, FlatpackError, error types
  - **Step Dependencies**: Step 1.2
  - **User Instructions**: None

- [ ] Step 2.2: Define constants and default configurations
  - **Task**: Create all constant values including NotebookLM limits, file extension mappings, and default ignore patterns
  - **Files**:
    - `packages/core/src/constants/index.ts`: Re-export all constants
    - `packages/core/src/constants/limits.ts`: TIER_LIMITS, word count limits, size limits
    - `packages/core/src/constants/file-extensions.ts`: EXTENSION_MAP, CODE_EXTENSIONS, format tier mappings
    - `packages/core/src/constants/ignore-patterns.ts`: DEFAULT_IGNORE_PATTERNS array
    - `packages/core/src/constants/defaults.ts`: DEFAULT_CONFIG object
  - **Step Dependencies**: Step 2.1
  - **User Instructions**: None

## Phase 3: Core Utilities

- [ ] Step 3.1: Implement path and string utilities
  - **Task**: Create utility functions for path manipulation, string sanitization, and filename flattening
  - **Files**:
    - `packages/core/src/utils/index.ts`: Re-export all utilities
    - `packages/core/src/utils/path-utils.ts`: Path manipulation (flattenPath, sanitizePathPart, slugify)
    - `packages/core/src/utils/string-utils.ts`: String utilities (truncate, escapeYaml)
  - **Step Dependencies**: Step 2.2
  - **User Instructions**: None

- [ ] Step 3.2: Implement glob matching utility
  - **Task**: Create a glob pattern matcher for ignore patterns using micromatch-compatible logic
  - **Files**:
    - `packages/core/src/utils/glob-matcher.ts`: GlobMatcher class with matches() method
  - **Step Dependencies**: Step 3.1
  - **User Instructions**: None

- [ ] Step 3.3: Implement word counting utility
  - **Task**: Create accurate word counting functions that handle various text formats and code
  - **Files**:
    - `packages/core/src/utils/word-counter.ts`: countWords, estimateWordCount functions
  - **Step Dependencies**: Step 3.1
  - **User Instructions**: None

- [ ] Step 3.4: Implement encoding detection utility
  - **Task**: Create utility for detecting file encoding and handling non-UTF8 content
  - **Files**:
    - `packages/core/src/utils/encoding-detector.ts`: detectEncoding, decodeContent functions
  - **Step Dependencies**: Step 3.1
  - **User Instructions**: None

## Phase 4: File Analysis

- [ ] Step 4.1: Implement file classifier
  - **Task**: Create the file classification system that categorizes files into Tier 1 (passthrough), Tier 2 (conversion), Tier 3 (OCR), or unsupported
  - **Files**:
    - `packages/core/src/analyzer/index.ts`: Re-export analyzer functions
    - `packages/core/src/analyzer/file-classifier.ts`: classifyFile function with ClassificationResult
  - **Step Dependencies**: Step 2.2
  - **User Instructions**: None

- [ ] Step 4.2: Implement directory scanner interface
  - **Task**: Create the directory scanning interface and types (platform implementations come later)
  - **Files**:
    - `packages/core/src/analyzer/directory-scanner.ts`: ScanOptions interface, scanDirectory function signature
  - **Step Dependencies**: Step 4.1, Step 3.2
  - **User Instructions**: None

- [ ] Step 4.3: Implement related files detector
  - **Task**: Create the system for detecting file relationships (siblings, pattern matching, reference parsing)
  - **Files**:
    - `packages/core/src/analyzer/related-files.ts`: detectRelatedFiles, extractReferences functions
  - **Step Dependencies**: Step 4.2
  - **User Instructions**: None

- [ ] Step 4.4: Implement file analyzer
  - **Task**: Create the main file analysis function that combines classification, word counting, and warning generation
  - **Files**:
    - `packages/core/src/analyzer/file-analyzer.ts`: analyzeFile, analyzeFiles functions with AnalyzedFile output
  - **Step Dependencies**: Steps 4.1, 4.3, 3.3
  - **User Instructions**: None

## Phase 5: Format Converters

- [ ] Step 5.1: Create base converter interface and registry
  - **Task**: Define the converter interface and create a registry for managing converters
  - **Files**:
    - `packages/core/src/converters/index.ts`: Re-export converters and registry
    - `packages/core/src/converters/base-converter.ts`: BaseConverter interface, ConversionResult type
    - `packages/core/src/converters/converter-registry.ts`: ConverterRegistry class
  - **Step Dependencies**: Step 2.1
  - **User Instructions**: None

- [ ] Step 5.2: Implement text converter (Tier 1)
  - **Task**: Create the converter for text-based files (txt, md, code, data formats) that wraps content in appropriate code blocks
  - **Files**:
    - `packages/core/src/converters/text-converter.ts`: convertText function with code block wrapping
  - **Step Dependencies**: Step 5.1, Step 3.3
  - **User Instructions**: None

- [ ] Step 5.3: Implement HTML converter
  - **Task**: Create HTML to Markdown converter using turndown
  - **Files**:
    - `packages/core/src/converters/html-converter.ts`: convertHtml function using turndown
  - **Step Dependencies**: Step 5.1
  - **User Instructions**: Add turndown to dependencies: `pnpm add turndown -F @flatpack/core`

- [ ] Step 5.4: Implement DOCX converter
  - **Task**: Create Word document converter using mammoth.js
  - **Files**:
    - `packages/core/src/converters/docx-converter.ts`: convertDocx function with style mapping
  - **Step Dependencies**: Step 5.1
  - **User Instructions**: Add mammoth to dependencies: `pnpm add mammoth -F @flatpack/core`

- [ ] Step 5.5: Implement XLSX converter
  - **Task**: Create Excel spreadsheet converter using SheetJS, outputting Markdown tables
  - **Files**:
    - `packages/core/src/converters/xlsx-converter.ts`: convertXlsx function with table generation
  - **Step Dependencies**: Step 5.1
  - **User Instructions**: Add xlsx to dependencies: `pnpm add xlsx -F @flatpack/core`

- [ ] Step 5.6: Implement PPTX converter
  - **Task**: Create PowerPoint converter that extracts slide text and speaker notes
  - **Files**:
    - `packages/core/src/converters/pptx-converter.ts`: convertPptx function with slide structure
  - **Step Dependencies**: Step 5.1
  - **User Instructions**: Add pptx parser library (or use JSZip + XML parsing)

- [ ] Step 5.7: Implement RTF and EPUB converters
  - **Task**: Create converters for RTF and EPUB formats
  - **Files**:
    - `packages/core/src/converters/rtf-converter.ts`: convertRtf function
    - `packages/core/src/converters/epub-converter.ts`: convertEpub function with chapter structure
  - **Step Dependencies**: Step 5.1
  - **User Instructions**: Add epub.js and rtf-parser dependencies

- [ ] Step 5.8: Implement PDF converter (platform-agnostic interface)
  - **Task**: Create PDF converter interface with analysis functions (platform-specific implementations will extend this)
  - **Files**:
    - `packages/core/src/converters/pdf-converter.ts`: PdfAnalysis interface, analyzePdf, extractPdfText function signatures
  - **Step Dependencies**: Step 5.1
  - **User Instructions**: None

## Phase 6: Processors

- [ ] Step 6.1: Implement path flattener
  - **Task**: Create the path-to-filename conversion system with configurable separators and collision handling
  - **Files**:
    - `packages/core/src/processors/index.ts`: Re-export processors
    - `packages/core/src/processors/flattener.ts`: flattenPath, FlattenOptions interface
  - **Step Dependencies**: Step 3.1
  - **User Instructions**: None

- [ ] Step 6.2: Implement metadata injector
  - **Task**: Create the YAML metadata header injection system for processed files
  - **Files**:
    - `packages/core/src/processors/metadata-injector.ts`: injectMetadata, FileMetadata interface
  - **Step Dependencies**: Step 2.1
  - **User Instructions**: None

- [ ] Step 6.3: Implement semantic chunker
  - **Task**: Create the file chunking system that splits oversized files at semantic boundaries (headers, functions, paragraphs)
  - **Files**:
    - `packages/core/src/processors/chunker.ts`: chunkFile, findSemanticBoundaries, ChunkingOptions, Chunk interfaces
  - **Step Dependencies**: Steps 3.3, 6.2
  - **User Instructions**: None

- [ ] Step 6.4: Implement file bundler
  - **Task**: Create the file merging system for combining multiple files into single bundles
  - **Files**:
    - `packages/core/src/processors/bundler.ts`: generateMergedContent, Bundle interface
  - **Step Dependencies**: Steps 3.1, 3.3
  - **User Instructions**: None

## Phase 7: Planning System

- [ ] Step 7.1: Implement tier optimizer
  - **Task**: Create the tier analysis system that determines if bundling is needed and generates warnings
  - **Files**:
    - `packages/core/src/planner/index.ts`: Re-export planner functions
    - `packages/core/src/planner/tier-optimizer.ts`: analyzeTierFit, OptimizationResult interface
  - **Step Dependencies**: Step 2.2
  - **User Instructions**: None

- [ ] Step 7.2: Implement bundling strategy
  - **Task**: Create the algorithm for determining which files to bundle based on folder depth and size
  - **Files**:
    - `packages/core/src/planner/bundling-strategy.ts`: calculateBundles, BundleCandidate interface
  - **Step Dependencies**: Steps 7.1, 3.3
  - **User Instructions**: None

- [ ] Step 7.3: Implement naming resolver
  - **Task**: Create the collision resolution system that adds numeric suffixes to conflicting filenames
  - **Files**:
    - `packages/core/src/planner/naming-resolver.ts`: resolveNamingCollisions function
  - **Step Dependencies**: Step 6.1
  - **User Instructions**: None

- [ ] Step 7.4: Implement preview generator
  - **Task**: Create the main planning function that generates the complete ProcessingPlan
  - **Files**:
    - `packages/core/src/planner/preview-generator.ts`: generateProcessingPlan function
  - **Step Dependencies**: Steps 7.1, 7.2, 7.3, 4.4
  - **User Instructions**: None

## Phase 8: Output Generation

- [ ] Step 8.1: Implement manifest generator
  - **Task**: Create the FLATPACK_MANIFEST.json generator with complete file mapping and statistics
  - **Files**:
    - `packages/core/src/output/index.ts`: Re-export output functions
    - `packages/core/src/output/manifest-generator.ts`: generateManifest function
  - **Step Dependencies**: Step 2.1
  - **User Instructions**: None

- [ ] Step 8.2: Implement structure generator
  - **Task**: Create the 00_MASTER_STRUCTURE.md generator with directory tree and processing summary
  - **Files**:
    - `packages/core/src/output/structure-generator.ts`: generateMasterStructure, generateTreeOutput functions
  - **Step Dependencies**: Step 8.1
  - **User Instructions**: None

- [ ] Step 8.3: Implement failures reporter
  - **Task**: Create the FAILURES.md generator for documenting processing failures
  - **Files**:
    - `packages/core/src/output/failures-reporter.ts`: generateFailuresReport function
  - **Step Dependencies**: Step 2.1
  - **User Instructions**: None

- [ ] Step 8.4: Implement output writer interface
  - **Task**: Create the output writing interface (platform-specific implementations come later)
  - **Files**:
    - `packages/core/src/output/output-writer.ts`: OutputConfig, writeOutput function signature
  - **Step Dependencies**: Steps 8.1, 8.2, 8.3
  - **User Instructions**: None

## Phase 9: Processing Pipeline

- [ ] Step 9.1: Implement main processing pipeline
  - **Task**: Create the main processing orchestrator that coordinates all phases from scanning to output
  - **Files**:
    - `packages/core/src/pipeline/index.ts`: Re-export pipeline functions
    - `packages/core/src/pipeline/processor.ts`: processFiles, ProcessingOptions interface
  - **Step Dependencies**: All Phase 5-8 steps
  - **User Instructions**: None

- [ ] Step 9.2: Implement error handling and recovery
  - **Task**: Create error normalization, recovery mechanisms, and the pause/continue error handling flow
  - **Files**:
    - `packages/core/src/pipeline/error-handler.ts`: normalizeError, ErrorContext, ErrorAction types
  - **Step Dependencies**: Step 9.1
  - **User Instructions**: None

## Phase 10: UI State Management

- [ ] Step 10.1: Implement config store
  - **Task**: Create Zustand store for user configuration with persistence
  - **Files**:
    - `packages/ui/src/stores/config-store.ts`: useConfigStore with persist middleware
  - **Step Dependencies**: Step 2.2
  - **User Instructions**: Add zustand to dependencies: `pnpm add zustand -F @flatpack/ui`

- [ ] Step 10.2: Implement session store
  - **Task**: Create Zustand store for current session state (phase, files, plan, results)
  - **Files**:
    - `packages/ui/src/stores/session-store.ts`: useSessionStore with phase management
  - **Step Dependencies**: Step 2.1
  - **User Instructions**: None

- [ ] Step 10.3: Implement processing store
  - **Task**: Create Zustand store for processing progress, logs, and error state
  - **Files**:
    - `packages/ui/src/stores/processing-store.ts`: useProcessingStore with progress tracking
  - **Step Dependencies**: Step 2.1
  - **User Instructions**: None

- [ ] Step 10.4: Create React hooks for stores
  - **Task**: Create convenience hooks that wrap stores with computed values and actions
  - **Files**:
    - `packages/ui/src/hooks/index.ts`: Re-export hooks
    - `packages/ui/src/hooks/useConfig.ts`: Config hook with setters
    - `packages/ui/src/hooks/useSession.ts`: Session hook with phase transitions
    - `packages/ui/src/hooks/useProcessing.ts`: Processing hook with analyze/process functions
  - **Step Dependencies**: Steps 10.1, 10.2, 10.3
  - **User Instructions**: None

## Phase 11: Platform Adapter System

- [ ] Step 11.1: Define platform adapter interface
  - **Task**: Create the PlatformAdapter interface defining all platform-specific operations
  - **Files**:
    - `packages/ui/src/lib/platform-adapter.ts`: PlatformAdapter interface with all method signatures
  - **Step Dependencies**: Step 2.1
  - **User Instructions**: None

- [ ] Step 11.2: Create platform context and hook
  - **Task**: Create React context and hook for accessing the platform adapter
  - **Files**:
    - `packages/ui/src/hooks/usePlatform.ts`: PlatformProvider, usePlatform hook
  - **Step Dependencies**: Step 11.1
  - **User Instructions**: None

## Phase 12: UI Shared Components

- [ ] Step 12.1: Add shadcn/ui base components
  - **Task**: Set up shadcn/ui and add base components (Button, Badge, Progress, Dialog, etc.)
  - **Files**:
    - `packages/ui/src/components/ui/button.tsx`: Button component
    - `packages/ui/src/components/ui/badge.tsx`: Badge component
    - `packages/ui/src/components/ui/progress.tsx`: Progress bar component
    - `packages/ui/src/components/ui/dialog.tsx`: Dialog/Modal component
    - `packages/ui/src/components/ui/switch.tsx`: Switch toggle component
    - `packages/ui/src/components/ui/select.tsx`: Select dropdown component
    - `packages/ui/src/components/ui/tooltip.tsx`: Tooltip component
    - `packages/ui/src/components/ui/input.tsx`: Input component
  - **Step Dependencies**: Step 1.3
  - **User Instructions**: Run `pnpm dlx shadcn@latest init -F @flatpack/ui` and follow prompts, then add components

- [ ] Step 12.2: Create custom shared components
  - **Task**: Create application-specific shared components
  - **Files**:
    - `packages/ui/src/components/shared/index.ts`: Re-export shared components
    - `packages/ui/src/components/shared/ActionBadge.tsx`: Status badge with color-coded actions
    - `packages/ui/src/components/shared/FileIcon.tsx`: File type icon component
    - `packages/ui/src/components/shared/LoadingSpinner.tsx`: Loading indicator
  - **Step Dependencies**: Step 12.1
  - **User Instructions**: Add lucide-react for icons: `pnpm add lucide-react -F @flatpack/ui`

## Phase 13: UI Layout Components

- [ ] Step 13.1: Create app shell and header
  - **Task**: Create the main application layout with header, theme toggle, and settings access
  - **Files**:
    - `packages/ui/src/components/layout/index.ts`: Re-export layout components
    - `packages/ui/src/components/layout/AppShell.tsx`: Main layout wrapper
    - `packages/ui/src/components/layout/Header.tsx`: Header with logo and controls
  - **Step Dependencies**: Steps 12.1, 10.1
  - **User Instructions**: None

- [ ] Step 13.2: Create phase manager
  - **Task**: Create the component that manages phase transitions with animations
  - **Files**:
    - `packages/ui/src/components/PhaseManager.tsx`: Phase switching with framer-motion transitions
  - **Step Dependencies**: Step 10.2
  - **User Instructions**: Add framer-motion: `pnpm add framer-motion -F @flatpack/ui`

## Phase 14: Input Phase Components

- [ ] Step 14.1: Create drop zone component
  - **Task**: Create the main drag-and-drop zone for folder/ZIP input
  - **Files**:
    - `packages/ui/src/components/input-phase/index.ts`: Re-export input phase components
    - `packages/ui/src/components/input-phase/DropZone.tsx`: Drop zone with drag states and file handling
  - **Step Dependencies**: Steps 11.2, 10.2
  - **User Instructions**: None

- [ ] Step 14.2: Create tier selector component
  - **Task**: Create the Free/Pro tier selection UI
  - **Files**:
    - `packages/ui/src/components/input-phase/TierSelector.tsx`: Tier toggle buttons
  - **Step Dependencies**: Step 10.4
  - **User Instructions**: None

- [ ] Step 14.3: Create settings panel
  - **Task**: Create the settings sidebar with ignore patterns, PDF handling, and other options
  - **Files**:
    - `packages/ui/src/components/input-phase/SettingsPanel.tsx`: Main settings container
    - `packages/ui/src/components/input-phase/IgnorePatternEditor.tsx`: Glob pattern editor
    - `packages/ui/src/components/input-phase/PdfHandlingToggle.tsx`: PDF convert/preserve toggle
  - **Step Dependencies**: Steps 12.1, 10.4
  - **User Instructions**: None

- [ ] Step 14.4: Create input phase container
  - **Task**: Create the main Input Phase view combining all input components
  - **Files**:
    - `packages/ui/src/components/input-phase/InputPhase.tsx`: Complete input phase layout
  - **Step Dependencies**: Steps 14.1, 14.2, 14.3
  - **User Instructions**: None

## Phase 15: Preview Phase Components

- [ ] Step 15.1: Create file tree component
  - **Task**: Create the interactive file tree for displaying the processing plan
  - **Files**:
    - `packages/ui/src/components/preview-phase/index.ts`: Re-export preview phase components
    - `packages/ui/src/components/preview-phase/FileTree.tsx`: Expandable tree view
    - `packages/ui/src/components/preview-phase/FileTreeItem.tsx`: Individual tree node
  - **Step Dependencies**: Steps 12.2, 10.2
  - **User Instructions**: None

- [ ] Step 15.2: Create file details and warnings
  - **Task**: Create components for displaying file details and warning lists
  - **Files**:
    - `packages/ui/src/components/preview-phase/FileDetails.tsx`: Selected file detail panel
    - `packages/ui/src/components/preview-phase/WarningsList.tsx`: Warning display component
  - **Step Dependencies**: Step 12.1
  - **User Instructions**: None

- [ ] Step 15.3: Create preview summary and confirmation
  - **Task**: Create the summary statistics and process confirmation UI
  - **Files**:
    - `packages/ui/src/components/preview-phase/PreviewSummary.tsx`: Statistics display
    - `packages/ui/src/components/preview-phase/ProcessingConfirm.tsx`: Confirm/Cancel buttons
  - **Step Dependencies**: Step 12.1
  - **User Instructions**: None

- [ ] Step 15.4: Create preview phase container
  - **Task**: Create the main Preview Phase view combining all preview components
  - **Files**:
    - `packages/ui/src/components/preview-phase/PreviewPhase.tsx`: Complete preview phase layout
  - **Step Dependencies**: Steps 15.1, 15.2, 15.3
  - **User Instructions**: None

## Phase 16: Processing Phase Components

- [ ] Step 16.1: Create progress components
  - **Task**: Create progress bar, current file display, and overall progress view
  - **Files**:
    - `packages/ui/src/components/processing-phase/index.ts`: Re-export processing phase components
    - `packages/ui/src/components/processing-phase/ProgressBar.tsx`: Visual progress indicator
    - `packages/ui/src/components/processing-phase/CurrentFile.tsx`: Current file being processed
    - `packages/ui/src/components/processing-phase/ProgressView.tsx`: Overall progress container
  - **Step Dependencies**: Steps 12.1, 10.3
  - **User Instructions**: None

- [ ] Step 16.2: Create processing log
  - **Task**: Create the scrollable processing log component
  - **Files**:
    - `packages/ui/src/components/processing-phase/ProcessingLog.tsx`: Log entry list with auto-scroll
  - **Step Dependencies**: Step 10.3
  - **User Instructions**: None

- [ ] Step 16.3: Create error prompt
  - **Task**: Create the error dialog with Skip/Retry/Abort options
  - **Files**:
    - `packages/ui/src/components/processing-phase/ErrorPrompt.tsx`: Error modal with actions
  - **Step Dependencies**: Steps 12.1, 10.3
  - **User Instructions**: None

- [ ] Step 16.4: Create processing phase container
  - **Task**: Create the main Processing Phase view
  - **Files**:
    - `packages/ui/src/components/processing-phase/ProcessingPhase.tsx`: Complete processing phase layout
  - **Step Dependencies**: Steps 16.1, 16.2, 16.3
  - **User Instructions**: None

## Phase 17: Results Phase Components

- [ ] Step 17.1: Create results summary
  - **Task**: Create the success/warning/failure count display with breakdown
  - **Files**:
    - `packages/ui/src/components/results-phase/index.ts`: Re-export results phase components
    - `packages/ui/src/components/results-phase/ResultsSummary.tsx`: Summary with statistics
    - `packages/ui/src/components/results-phase/StatsBreakdown.tsx`: Detailed stats by action
  - **Step Dependencies**: Steps 12.1, 10.2
  - **User Instructions**: None

- [ ] Step 17.2: Create quick actions
  - **Task**: Create the action buttons (Open Folder, Download ZIP, Retry Failed, Start Over)
  - **Files**:
    - `packages/ui/src/components/results-phase/QuickActions.tsx`: Action button group
  - **Step Dependencies**: Steps 12.1, 11.2
  - **User Instructions**: None

- [ ] Step 17.3: Create failures list
  - **Task**: Create the failures display with expandable details
  - **Files**:
    - `packages/ui/src/components/results-phase/FailuresList.tsx`: Failed files list with reasons
    - `packages/ui/src/components/results-phase/ManifestViewer.tsx`: Optional manifest preview
  - **Step Dependencies**: Step 12.1
  - **User Instructions**: None

- [ ] Step 17.4: Create results phase container
  - **Task**: Create the main Results Phase view
  - **Files**:
    - `packages/ui/src/components/results-phase/ResultsPhase.tsx`: Complete results phase layout
  - **Step Dependencies**: Steps 17.1, 17.2, 17.3
  - **User Instructions**: None

## Phase 18: Web Application

- [ ] Step 18.1: Create web package structure
  - **Task**: Set up the web application package with Vite configuration
  - **Files**:
    - `packages/web/package.json`: Web package configuration
    - `packages/web/tsconfig.json`: TypeScript config
    - `packages/web/vite.config.ts`: Vite configuration
    - `packages/web/index.html`: HTML entry point
  - **Step Dependencies**: Step 1.1
  - **User Instructions**: Run `pnpm install` to install dependencies

- [ ] Step 18.2: Implement web platform adapter
  - **Task**: Create the browser-specific implementation of PlatformAdapter
  - **Files**:
    - `packages/web/src/web-adapter.ts`: WebAdapter class with File System Access API and fallbacks
  - **Step Dependencies**: Step 11.1
  - **User Instructions**: Add jszip and pdfjs-dist: `pnpm add jszip pdfjs-dist -F @flatpack/web`

- [ ] Step 18.3: Create web workers for processing
  - **Task**: Create Web Worker for heavy processing to avoid blocking UI
  - **Files**:
    - `packages/web/src/workers/processing.worker.ts`: Processing Web Worker
    - `packages/web/src/lib/worker-adapter.ts`: Worker communication wrapper
  - **Step Dependencies**: Step 18.2
  - **User Instructions**: None

- [ ] Step 18.4: Create web app entry point
  - **Task**: Create the main React application entry with all providers
  - **Files**:
    - `packages/web/src/main.tsx`: React app entry with StrictMode
    - `packages/web/src/App.tsx`: Main App component with PlatformProvider
  - **Step Dependencies**: Steps 18.2, 13.1, 13.2
  - **User Instructions**: None

## Phase 19: Desktop Application (Tauri)

- [ ] Step 19.1: Create desktop package structure
  - **Task**: Set up the Tauri application with Rust backend and React frontend
  - **Files**:
    - `packages/desktop/package.json`: Desktop package configuration
    - `packages/desktop/tsconfig.json`: TypeScript config
    - `packages/desktop/vite.config.ts`: Vite configuration for Tauri
    - `packages/desktop/index.html`: HTML entry point
    - `packages/desktop/src-tauri/Cargo.toml`: Rust dependencies
    - `packages/desktop/src-tauri/tauri.conf.json`: Tauri configuration
    - `packages/desktop/src-tauri/build.rs`: Tauri build script
  - **Step Dependencies**: Step 1.1
  - **User Instructions**: Install Tauri CLI: `pnpm add -D @tauri-apps/cli -F @flatpack/desktop` and ensure Rust is installed

- [ ] Step 19.2: Implement Tauri Rust commands - File operations
  - **Task**: Create Rust commands for file system operations (scan, read, write, copy)
  - **Files**:
    - `packages/desktop/src-tauri/src/main.rs`: Main entry with command registration
    - `packages/desktop/src-tauri/src/commands/mod.rs`: Commands module
    - `packages/desktop/src-tauri/src/commands/scan.rs`: Directory scanning command
    - `packages/desktop/src-tauri/src/commands/file_ops.rs`: File read/write/copy commands
  - **Step Dependencies**: Step 19.1
  - **User Instructions**: None

- [ ] Step 19.3: Implement Tauri Rust commands - ZIP handling
  - **Task**: Create Rust commands for ZIP extraction and creation
  - **Files**:
    - `packages/desktop/src-tauri/src/commands/zip.rs`: ZIP extract/create commands
  - **Step Dependencies**: Step 19.2
  - **User Instructions**: Add zip crate to Cargo.toml

- [ ] Step 19.4: Implement Tauri Rust commands - PDF conversion
  - **Task**: Create Rust commands for PDF analysis and text extraction
  - **Files**:
    - `packages/desktop/src-tauri/src/converters/mod.rs`: Converters module
    - `packages/desktop/src-tauri/src/converters/pdf.rs`: PDF analysis and extraction
  - **Step Dependencies**: Step 19.2
  - **User Instructions**: Add lopdf and pdf-extract crates to Cargo.toml

- [ ] Step 19.5: Implement Tauri Rust commands - OCR
  - **Task**: Create Rust commands for Tesseract OCR integration
  - **Files**:
    - `packages/desktop/src-tauri/src/commands/ocr.rs`: OCR image and PDF commands
  - **Step Dependencies**: Step 19.4
  - **User Instructions**: Add tesseract-rs crate and ensure Tesseract is installed on system

- [ ] Step 19.6: Implement Tauri Rust commands - Configuration
  - **Task**: Create Rust commands for config persistence
  - **Files**:
    - `packages/desktop/src-tauri/src/commands/config.rs`: Config get/set commands
    - `packages/desktop/src-tauri/src/utils/mod.rs`: Utility functions
  - **Step Dependencies**: Step 19.2
  - **User Instructions**: None

- [ ] Step 19.7: Create Tauri platform adapter
  - **Task**: Create the TypeScript adapter that calls Tauri commands
  - **Files**:
    - `packages/desktop/src/tauri-adapter.ts`: TauriAdapter class implementing PlatformAdapter
  - **Step Dependencies**: Steps 11.1, 19.2-19.6
  - **User Instructions**: None

- [ ] Step 19.8: Create desktop app entry point
  - **Task**: Create the main React application entry for desktop
  - **Files**:
    - `packages/desktop/src/main.tsx`: React app entry
    - `packages/desktop/src/App.tsx`: Main App component with TauriAdapter
  - **Step Dependencies**: Steps 19.7, 13.1, 13.2
  - **User Instructions**: None

## Phase 20: Unit Tests

- [ ] Step 20.1: Test utilities
  - **Task**: Write unit tests for core utility functions
  - **Files**:
    - `packages/core/src/utils/__tests__/path-utils.test.ts`: Path utility tests
    - `packages/core/src/utils/__tests__/word-counter.test.ts`: Word counter tests
    - `packages/core/src/utils/__tests__/glob-matcher.test.ts`: Glob matcher tests
  - **Step Dependencies**: Phase 3 complete
  - **User Instructions**: None

- [ ] Step 20.2: Test converters
  - **Task**: Write unit tests for format converters
  - **Files**:
    - `packages/core/src/converters/__tests__/text-converter.test.ts`: Text converter tests
    - `packages/core/src/converters/__tests__/html-converter.test.ts`: HTML converter tests
    - `packages/core/src/converters/__tests__/xlsx-converter.test.ts`: Excel converter tests
  - **Step Dependencies**: Phase 5 complete
  - **User Instructions**: None

- [ ] Step 20.3: Test processors
  - **Task**: Write unit tests for processors (flattener, chunker, bundler)
  - **Files**:
    - `packages/core/src/processors/__tests__/flattener.test.ts`: Flattener tests
    - `packages/core/src/processors/__tests__/chunker.test.ts`: Chunker tests
    - `packages/core/src/processors/__tests__/bundler.test.ts`: Bundler tests
  - **Step Dependencies**: Phase 6 complete
  - **User Instructions**: None

- [ ] Step 20.4: Test planner
  - **Task**: Write unit tests for planning system
  - **Files**:
    - `packages/core/src/planner/__tests__/naming-resolver.test.ts`: Naming collision tests
    - `packages/core/src/planner/__tests__/bundling-strategy.test.ts`: Bundling algorithm tests
    - `packages/core/src/planner/__tests__/tier-optimizer.test.ts`: Tier analysis tests
  - **Step Dependencies**: Phase 7 complete
  - **User Instructions**: None

## Phase 21: Integration Tests

- [ ] Step 21.1: Create test fixtures
  - **Task**: Create sample files and directory structures for integration testing
  - **Files**:
    - `packages/core/src/__tests__/fixtures/simple-project/readme.md`: Sample markdown
    - `packages/core/src/__tests__/fixtures/simple-project/src/index.ts`: Sample code
    - `packages/core/src/__tests__/fixtures/simple-project/docs/guide.txt`: Sample text
    - `packages/core/src/__tests__/test-utils.ts`: Test helper functions
  - **Step Dependencies**: Step 20.1
  - **User Instructions**: None

- [ ] Step 21.2: Pipeline integration tests
  - **Task**: Write integration tests for the complete processing pipeline
  - **Files**:
    - `packages/core/src/__tests__/pipeline.integration.test.ts`: End-to-end pipeline tests
  - **Step Dependencies**: Steps 21.1, Phase 9 complete
  - **User Instructions**: None

## Phase 22: E2E Tests

- [ ] Step 22.1: Set up Playwright
  - **Task**: Configure Playwright for E2E testing of web and desktop apps
  - **Files**:
    - `packages/web/playwright.config.ts`: Playwright configuration
    - `packages/web/e2e/setup.ts`: Test setup and fixtures
  - **Step Dependencies**: Phase 18 complete
  - **User Instructions**: Run `pnpm add -D @playwright/test -F @flatpack/web` and `npx playwright install`

- [ ] Step 22.2: Web E2E tests
  - **Task**: Write E2E tests for web application workflows
  - **Files**:
    - `packages/web/e2e/workflow.spec.ts`: Complete workflow tests
    - `packages/web/e2e/settings.spec.ts`: Settings persistence tests
    - `packages/web/e2e/web-specific.spec.ts`: Web platform-specific tests
  - **Step Dependencies**: Step 22.1
  - **User Instructions**: None

## Phase 23: Polish & Optimization

- [ ] Step 23.1: Add loading states and animations
  - **Task**: Enhance UX with proper loading states, skeleton screens, and smooth animations
  - **Files**:
    - `packages/ui/src/components/shared/Skeleton.tsx`: Skeleton loading component
    - `packages/ui/src/components/input-phase/DropZone.tsx`: Add loading state
    - `packages/ui/src/components/preview-phase/FileTree.tsx`: Add loading skeleton
  - **Step Dependencies**: All UI phases complete
  - **User Instructions**: None

- [ ] Step 23.2: Add keyboard navigation and accessibility
  - **Task**: Implement full keyboard navigation and ARIA labels
  - **Files**:
    - `packages/ui/src/hooks/useKeyboardNavigation.ts`: Keyboard navigation hook
    - Update multiple UI components with aria attributes and keyboard handlers
  - **Step Dependencies**: All UI phases complete
  - **User Instructions**: None

- [ ] Step 23.3: Performance optimization
  - **Task**: Implement virtual scrolling for large file lists, memoization, and lazy loading
  - **Files**:
    - `packages/ui/src/components/preview-phase/VirtualFileTree.tsx`: Virtualized tree for large lists
    - `packages/ui/src/components/processing-phase/VirtualLog.tsx`: Virtualized log component
  - **Step Dependencies**: All UI phases complete
  - **User Instructions**: Add @tanstack/react-virtual: `pnpm add @tanstack/react-virtual -F @flatpack/ui`

- [ ] Step 23.4: Final documentation and build scripts
  - **Task**: Create build scripts, update README, and add usage documentation
  - **Files**:
    - `README.md`: Update with full documentation
    - `packages/web/README.md`: Web-specific documentation
    - `packages/desktop/README.md`: Desktop-specific documentation
    - `scripts/build.sh`: Build script for all packages
    - `scripts/release.sh`: Release script
  - **Step Dependencies**: All phases complete
  - **User Instructions**: None

---

## Summary

This implementation plan breaks down the Flatpack application into **23 phases with 70+ discrete steps**, organized to build functionality incrementally from the ground up.

### Key Implementation Principles

1. **Foundation First**: Phases 1-2 establish the monorepo, TypeScript configuration, and all type definitions before any implementation begins.

2. **Core Before UI**: Phases 3-9 build the complete processing engine (utilities, analyzers, converters, processors, planners, output generators) before touching any UI code. This ensures the business logic is solid and testable in isolation.

3. **State Before Components**: Phase 10-11 sets up Zustand stores and the platform adapter pattern before building UI components, ensuring components have proper data flow from the start.

4. **Component Isolation**: Phases 12-17 build UI components in isolation, grouped by application phase (Input, Preview, Processing, Results), making them easier to develop and test.

5. **Web Before Desktop**: Phase 18 implements the simpler web application first, which validates all shared code. Phase 19 then adds desktop-specific Tauri/Rust functionality including OCR.

6. **Testing Throughout**: Phases 20-22 add comprehensive testing at unit, integration, and E2E levels.

### Critical Dependencies

- **Rust/Tauri**: Desktop app requires Rust toolchain and Tauri CLI
- **Tesseract**: OCR functionality requires Tesseract installation
- **shadcn/ui**: Requires manual initialization step
- **pdfjs-dist**: PDF parsing in web requires worker setup

### Estimated Effort Distribution

- **Core Processing Logic**: ~40% (Phases 2-9)
- **UI Components**: ~35% (Phases 10-17)
- **Platform Adapters**: ~15% (Phases 18-19)
- **Testing & Polish**: ~10% (Phases 20-23)

### Risk Mitigation

- The platform adapter pattern isolates browser vs desktop differences
- Each phase is self-contained and can be tested independently
- The web app validates core logic before desktop complexity is added
- Comprehensive typing prevents integration issues between packages