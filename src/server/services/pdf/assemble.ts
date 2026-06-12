import { PDFDocument } from "pdf-lib";

/** Photographed signed pages → one PDF (A4, image fitted with margins). */
export async function imagesToPdf(
  images: { data: Buffer; mimeType: string }[],
): Promise<Buffer> {
  const doc = await PDFDocument.create();

  for (const image of images) {
    const embedded = image.mimeType.includes("png")
      ? await doc.embedPng(image.data)
      : await doc.embedJpg(image.data);

    const page = doc.addPage([595.28, 841.89]); // A4 in points
    const margin = 24;
    const maxWidth = page.getWidth() - margin * 2;
    const maxHeight = page.getHeight() - margin * 2;
    const scale = Math.min(maxWidth / embedded.width, maxHeight / embedded.height, 1);
    const width = embedded.width * scale;
    const height = embedded.height * scale;

    page.drawImage(embedded, {
      x: (page.getWidth() - width) / 2,
      y: (page.getHeight() - height) / 2,
      width,
      height,
    });
  }

  return Buffer.from(await doc.save());
}

/** Final archive PDF: generated report + scanned signed pages appended. */
export async function mergePdfs(parts: Buffer[]): Promise<Buffer> {
  const merged = await PDFDocument.create();
  for (const part of parts) {
    const doc = await PDFDocument.load(part);
    const pages = await merged.copyPages(doc, doc.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }
  return Buffer.from(await merged.save());
}
