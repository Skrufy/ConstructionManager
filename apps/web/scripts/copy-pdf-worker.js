/**
 * Script to copy PDF.js worker from node_modules to public folder
 * This allows the PDF viewer to use a local worker instead of CDN
 * for better performance and reduced external dependencies.
 */

const fs = require('fs');
const path = require('path');

// pdfjs-dist v3.x uses .mjs extension (ES modules)
const SOURCE = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs');
const SOURCE_MAP = path.join(__dirname, '..', 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.mjs.map');
const DEST_DIR = path.join(__dirname, '..', 'public');
// Output as .js since browsers expect .js extension for workers loaded via URL
const DEST = path.join(DEST_DIR, 'pdf.worker.min.js');
const DEST_MAP = path.join(DEST_DIR, 'pdf.worker.min.js.map');

function copyPdfWorker() {
  // Check if source exists
  if (!fs.existsSync(SOURCE)) {
    console.log('[copy-pdf-worker] pdfjs-dist not installed, skipping worker copy');
    console.log('[copy-pdf-worker] PDF viewer will use CDN fallback');
    return;
  }

  // Ensure public directory exists
  if (!fs.existsSync(DEST_DIR)) {
    fs.mkdirSync(DEST_DIR, { recursive: true });
  }

  try {
    // Copy worker file
    fs.copyFileSync(SOURCE, DEST);
    console.log('[copy-pdf-worker] Copied pdf.worker.min.js to public folder');

    // Copy source map if exists (optional)
    if (fs.existsSync(SOURCE_MAP)) {
      fs.copyFileSync(SOURCE_MAP, DEST_MAP);
      console.log('[copy-pdf-worker] Copied pdf.worker.min.js.map to public folder');
    }
  } catch (err) {
    console.warn('[copy-pdf-worker] Failed to copy worker:', err.message);
    console.log('[copy-pdf-worker] PDF viewer will use CDN fallback');
  }
}

copyPdfWorker();
