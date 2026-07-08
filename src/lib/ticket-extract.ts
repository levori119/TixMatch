import "server-only";
import { PDFParse } from "pdf-parse";

export type Extracted = {
  barcode?: string;
  section?: string;
  row?: string;
  seat?: string;
};

/** Best-effort: pull barcode/section/row/seat text out of a ticket PDF. */
export async function extractFromPdf(buf: Buffer): Promise<Extracted> {
  let text = "";
  try {
    const parser = new PDFParse({ data: buf });
    const res = await parser.getText();
    text = res?.text ?? "";
    parser.destroy?.();
  } catch {
    return {};
  }
  return scan(text);
}

function first(re: RegExp, text: string): string | undefined {
  const m = text.match(re);
  return m?.[1]?.trim() || undefined;
}

function scan(text: string): Extracted {
  const t = text.replace(/\s+/g, " ");
  const out: Extracted = {};

  // barcode: labelled, else longest 8–20 digit run
  out.barcode =
    first(/(?:ברקוד|barcode|bar\s*code|קוד\s*כרטיס)[\s:#]*([A-Za-z0-9\-]{6,24})/i, t) ||
    (t.match(/\b\d{8,20}\b/g) || []).sort((a, b) => b.length - a.length)[0];

  out.section = first(/(?:אזור|יציע|גוש|section|sec|gate|שער)[\s:.]*([A-Za-z0-9֐-׿]{1,10})/i, t);
  out.row = first(/(?:שורה|row)[\s:.]*([A-Za-z0-9֐-׿]{1,6})/i, t);
  out.seat = first(/(?:כיסא|מושב|seat)[\s:.]*([A-Za-z0-9֐-׿\-–]{1,10})/i, t);

  // drop empties
  (Object.keys(out) as (keyof Extracted)[]).forEach((k) => out[k] || delete out[k]);
  return out;
}
