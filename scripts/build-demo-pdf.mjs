#!/usr/bin/env bun
/**
 * Build & upload a synthetic 2-page "plan sheet" PDF for the demo project.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ... bun scripts/build-demo-pdf.mjs
 *
 * Requires the seed.sql to have already been applied (creates the project row
 * with ID 11111111-1111-1111-1111-111111111111). This script:
 *   1. Generates a 2-page PDF in memory using pdf-lib
 *   2. Uploads it to the project-pdfs bucket at <project-id>/demo.pdf
 *   3. Updates projects.pdf_storage_path with the storage key
 *
 * pdf-lib is a peer dep — install with `bun add -D pdf-lib` if missing.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createClient } from '@supabase/supabase-js';

const PROJECT_ID = '11111111-1111-1111-1111-111111111111';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env');
  process.exit(1);
}

async function buildPdf() {
  const doc  = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const mono = await doc.embedFont(StandardFonts.Courier);

  for (let pageNum = 1; pageNum <= 2; pageNum++) {
    const page = doc.addPage([792, 612]); // ANSI B landscape (11x8.5)
    const { width, height } = page.getSize();

    // Title block
    page.drawRectangle({ x: 0, y: 0, width, height, color: rgb(0.98, 0.98, 0.98) });
    page.drawText(`NJTA I-95 RESURFACING — DEMO PLAN SHEET ${pageNum}`, {
      x: 40, y: height - 50, size: 18, font, color: rgb(0.06, 0.1, 0.2),
    });
    page.drawText(`Contract NJTA-2026-DEMO   |   Scale: 1" = 20'   |   Page ${pageNum} of 2`, {
      x: 40, y: height - 75, size: 10, font: mono, color: rgb(0.3, 0.3, 0.3),
    });

    // Blueprint grid
    for (let x = 40; x < width - 40; x += 36) {
      page.drawLine({ start: { x, y: 100 }, end: { x, y: height - 100 },
        thickness: 0.3, color: rgb(0.85, 0.9, 0.95) });
    }
    for (let y = 100; y < height - 100; y += 36) {
      page.drawLine({ start: { x: 40, y }, end: { x: width - 40, y },
        thickness: 0.3, color: rgb(0.85, 0.9, 0.95) });
    }

    // Calibration reference (100 ft scale bar)
    page.drawLine({ start: { x: 100, y: height - 100 }, end: { x: 460, y: height - 100 },
      thickness: 2, color: rgb(0, 0, 0) });
    page.drawText('100 FT', { x: 250, y: height - 95, size: 9, font: mono });

    // Some "drawn" callouts
    page.drawText(`STA 10${pageNum}+00`, { x: 120, y: 200, size: 10, font: mono });
    page.drawText('CURB RUN', { x: 200, y: 220, size: 9, font: mono, color: rgb(0.2, 0.4, 0.8) });
    page.drawRectangle({ x: 400, y: 200, width: 120, height: 100,
      borderColor: rgb(0.4, 0.6, 0.9), borderWidth: 1.5 });
    page.drawText('SIDEWALK PAD', { x: 420, y: 245, size: 9, font: mono });
  }

  return doc.save();
}

async function main() {
  console.log('Building synthetic plan PDF...');
  const pdfBytes = await buildPdf();
  console.log(`PDF built (${pdfBytes.length} bytes), uploading...`);

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const storagePath = `${PROJECT_ID}/demo.pdf`;
  const { error: uploadErr } = await supabase
    .storage
    .from('project-pdfs')
    .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true });
  if (uploadErr) throw uploadErr;

  const { error: updateErr } = await supabase
    .from('projects')
    .update({ pdf_storage_path: storagePath })
    .eq('id', PROJECT_ID);
  if (updateErr) throw updateErr;

  console.log(`✓ Uploaded to project-pdfs/${storagePath}`);
  console.log(`✓ projects.pdf_storage_path updated`);
}

main().catch((e) => { console.error(e); process.exit(1); });
