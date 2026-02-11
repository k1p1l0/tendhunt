/** Maximum characters to send to AI (roughly ~8000 tokens) */
export const MAX_TEXT_LENGTH = 32000;

/**
 * Extract plain text from a file buffer based on its MIME type.
 * Supports PDF (pdf-parse v2 class API), DOCX/DOC (officeparser v6), and TXT.
 *
 * NOTE: pdf-parse is dynamically imported to avoid pdfjs-dist pulling in
 * DOMMatrix/canvas polyfills at module-evaluation time during Next.js build.
 */
export async function extractTextFromBuffer(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/pdf") {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy();
    return result.text?.trim() || "";
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    const { parseOffice } = await import("officeparser");
    const ast = await parseOffice(buffer);
    return ast.toText();
  }

  if (mimeType === "text/plain") {
    return buffer.toString("utf-8");
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}
