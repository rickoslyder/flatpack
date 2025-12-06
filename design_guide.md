# NotebookLM Pro limits and preprocessing tool design guide

**The key constraints for any NotebookLM preprocessing tool: 300 sources per notebook (Pro), 500,000 words and 200MB per source, with Markdown consistently outperforming PDF for content comprehension.** A well-designed preprocessing tool should convert documents to plain text or Markdown, intelligently split files exceeding limits while preserving semantic context, and consolidate small related files to maximize the 300-source cap. The absence of a public API means drag-and-drop remains the primary ingestion method for consumer NotebookLM.

## Core limits remain identical across free and Pro tiers—except source count

NotebookLM's most significant constraint is the **per-source word limit of 500,000 words**, which applies equally to free and Pro users. The 200MB file size cap functions as a secondary limit, typically reached only with image-heavy PDFs. Importantly, Google states there is **no page limit**—a 300-page book averaging 82,500 words fits comfortably within one source slot.

| Limit | Free Tier | Pro Tier ($19.99/mo) |
|-------|-----------|---------------------|
| Sources per notebook | 50 | **300** |
| Notebooks per account | 100 | 500 |
| Words per source | 500,000 | 500,000 |
| File size per source | 200MB | 200MB |
| Daily chat queries | 50 | 500 |
| Audio overviews/day | 3 | 20 |

The **Pro tier's primary value proposition is the 6x increase in sources per notebook**—from 50 to 300—enabling substantial research projects without constant source management. Total theoretical capacity reaches 150 million words per notebook (300 sources × 500K words), though Gemini 2.0's context window processes approximately 4 million words at query time.

## Supported formats vary significantly in reliability

NotebookLM accepts a wide range of file types, but user testing reveals substantial differences in processing quality. **Markdown and plain text consistently produce the best results**, while PDFs with complex layouts frequently cause extraction failures.

**Tier-one formats (highly reliable):**
- Plain text (.txt) and Markdown (.md)—cleanest parsing, no formatting confusion
- Google Docs—native integration with tabs support
- Google Slides (up to 100 slides)
- YouTube URLs with captions—transcript auto-extraction works well

**Tier-two formats (generally reliable):**
- Text-heavy PDFs with selectable text
- Web URLs (text-only scraping; images and nested pages ignored)
- Audio files with clear speech—supports 130+ languages via transcription

**Tier-three formats (problematic):**
- Image-heavy or scanned PDFs—OCR improved since September 2024 but remains inconsistent
- Copy-protected or DRM-encrypted PDFs—**will not import**
- DOCX/PPTX/XLSX—**Enterprise tier only**; convert to Google formats for consumer version
- Paywalled websites—not supported

User testing found that "results were significantly better when uploading Markdown documents rather than PDFs with complex formatting, as NotebookLM sometimes skipped information when documents weren't in an optimal format."

## Format-specific constraints create preprocessing requirements

Several format-specific limits affect preprocessing strategy. Google Sheets imports are capped at approximately **100,000 tokens**, with each sheet processed separately. Google Slides max out at **100 slides**. YouTube videos uploaded within **72 hours may fail to import**, and videos without captions (auto-generated or manual) cannot be processed.

For web URLs, NotebookLM scrapes text only—images, embedded videos, JavaScript-rendered content, and nested pages are excluded. PDFs accessed via URL are treated as PDF sources with the same extraction limitations. **Footnotes and comments in Google Docs are not imported**, and changes to source Drive documents require manual re-sync; automatic synchronization does not exist.

## Chunking architecture uses Gemini 2.0's massive context window

NotebookLM processes documents through a multi-layered indexing system built on Gemini 2.0 Flash's **2-million-token context window**. The system creates semantic embeddings, keyword indices, and structural metadata simultaneously, enabling both precise fact-finding and broad conceptual exploration.

Documents are automatically analyzed for structural elements—headers, tables, lists—which inform retrieval. **Clear hierarchical structure (H1/H2/H3 headers) significantly improves citation accuracy** by helping the system identify logical content boundaries. Short source content produces vague citations; if a source lacks sufficient length, NotebookLM references the entire document rather than specific passages.

## Five preprocessing strategies maximize NotebookLM comprehension

Based on user experiences and format-handling characteristics, these preprocessing approaches yield optimal results:

**1. Convert PDF to Markdown before upload.** This single transformation provides the largest quality improvement. Tools like `Marker` (open-source), Adobe's PDF export, or AI assistants can perform conversion. Strip headers, footers, and page numbers during conversion. For tables, convert to Markdown table syntax rather than relying on PDF extraction.

**2. Split by semantic boundaries, not arbitrary sizes.** When documents exceed 500K words, split at chapter or section breaks rather than mid-paragraph. Include brief context summaries at the start of each split segment. Maintain consistent naming: "Project_Part1_Overview", "Project_Part2_Methods".

**3. Consolidate small related files using Google Docs tabs.** Google Docs' tabs feature allows organizing multiple related documents as a single source. A 12-month report series can become one source with 12 tabs instead of consuming 12 source slots. This preserves queryability ("summarize March takeaways") while conserving the 50/300 source limit.

**4. Remove images entirely from PDFs.** NotebookLM cannot process image content, but images inflate file size toward the 200MB limit. Extract and delete images, then add text descriptions of critical visual information where needed.

**5. Create topic-focused notebooks rather than catch-all repositories.** Users report that notebooks with 30+ diverse sources produce "diluted summaries" and generic responses. Splitting a 40-document "AI Research" notebook into themed sub-notebooks ("Gemini Features", "NotebookLM Workflows", "AI Writing Tools") yielded "3x more precise responses with concrete examples."

## Preprocessing tool design specifications

A preprocessing tool for NotebookLM ingestion should implement these capabilities:

**Input handling:**
- Accept folders and ZIP archives with nested directory structures
- Support PDF, DOCX, TXT, MD, HTML, and common document formats
- Preserve filename metadata for source naming

**Core transformations:**
- Convert all documents to Markdown or plain text (Markdown preferred)
- Strip headers, footers, page numbers, and non-content elements
- Extract table data into readable Markdown tables
- Remove images while optionally generating text descriptions via OCR
- Remove copy protection where possible (or flag protected files)

**Intelligent chunking:**
- Count words per document; flag files exceeding 450,000 words (buffer below 500K limit)
- Split oversized files at semantic boundaries (chapter/section headers)
- Inject context headers into split segments
- Generate sequential naming: "SourceName_Part01.md"

**Consolidation logic:**
- Group related small files (under 50K words) into combined documents
- Insert clear separators and original filename headers between merged content
- Track total word count to prevent merged files from exceeding limits

**Output structure:**
- Flat folder of processed files ready for drag-and-drop
- Manifest file listing: original filename → processed filename, word count, processing notes
- Separate "failed" folder for files that couldn't be processed (copy-protected PDFs, corrupt files)
- Naming convention: descriptive names without special characters (NotebookLM uses filenames as source titles)

**Size optimization targets:**
- Individual files: ≤450,000 words, ≤150MB (buffers for processing overhead)
- Total files: ≤300 (Pro) or ≤50 (free tier)—tool should warn when exceeding

## Existing tools provide partial solutions but no complete workflow

The ecosystem lacks a comprehensive preprocessing-to-ingestion tool. **No public API exists for consumer NotebookLM**; only NotebookLM Enterprise offers programmatic access through Google Cloud.

The most mature existing tools include:

**nlm CLI** (204 GitHub stars)—A Go-based command-line tool supporting notebook management, source addition (URLs, PDFs, files), and audio overview creation. Requires browser authentication but enables scripted workflows: `nlm add <notebook-id> <file.pdf>`.

**WebSync Chrome extension** (4.8 rating)—Crawls entire websites and bulk-imports pages, including content behind logins. Handles YouTube playlists and dynamically rendered sites.

**notebooklm-mcp servers**—MCP protocol implementations letting AI agents (Claude Code, Cursor) query NotebookLM directly. TypeScript and Python versions exist, both using browser automation.

**PDF splitting scripts** (`sshnaidm/notebooklm` on GitHub)—Bash scripts for splitting/combining PDFs by word count to meet NotebookLM limits.

**Notable gap: No tool currently handles folder/ZIP preprocessing** with format conversion, intelligent chunking, and consolidation optimized for NotebookLM's specific constraints. Browser automation tools address ingestion but assume pre-processed content.

## Rate limits and upload constraints remain largely undocumented

Google does not publish upload rate limits for sources. User reports indicate no explicit throttling on consecutive uploads, though large document collections process more slowly. The 50/500 daily query limits operate on a **rolling 24-hour window from limit hit**, not midnight resets.

Processing failures typically stem from content issues rather than rate limits: copy-protected PDFs, scanned documents with poor OCR, safety flags on sensitive content, or network timeouts. When uploads fail, error messages remain generic ("Error uploading source"), requiring trial-and-error diagnosis.

## Conclusion: Markdown-first preprocessing enables maximum utility

The optimal preprocessing pipeline prioritizes format conversion over all other transformations. **Converting documents to Markdown before upload—rather than relying on NotebookLM's PDF parsing—produces consistently better retrieval and citation accuracy.** A preprocessing tool should automate this conversion alongside intelligent chunking at semantic boundaries and consolidation of related small files.

The 300-source Pro limit accommodates substantial research projects when sources are properly prepared. The word-per-source limit (500K) rarely constrains typical documents but requires attention for legal contracts, technical specifications, or book-length content. File size limits (200MB) primarily affect image-heavy PDFs—which should have images stripped anyway since NotebookLM cannot process them.

Key implementation priorities for a preprocessing tool: (1) robust PDF-to-Markdown conversion with table extraction, (2) semantic-aware document splitting with context preservation, (3) small-file consolidation respecting word count limits, and (4) clear output manifests enabling verification before manual drag-and-drop ingestion.