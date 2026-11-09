
// Minimal .xlsx reader: rows of the first worksheet as arrays of strings.
// An .xlsx is a zip of XML files; entries are inflated with the browser's
// DecompressionStream, the XML read with DOMParser. Cells formatted as dates
// come back marked, for `import::dated_cells`; so does which calendar the
// workbook counts them from.
async function inflate(bytes) {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw")));
  return new Uint8Array(await out.arrayBuffer());
}
function entries(buf) {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("not a zip");
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const map = new Map();
  const dec = new TextDecoder();
  for (let n = 0; n < count; n++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error("bad zip");
    const method = v.getUint16(p + 10, true), size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true), extraLen = v.getUint16(p + 30, true), commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(buf.subarray(p + 46, p + 46 + nameLen));
    map.set(name, { method, size, local });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return map;
}
async function read(buf, map, name) {
  const e = map.get(name);
  if (!e) return null;
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const start = e.local + 30 + v.getUint16(e.local + 26, true) + v.getUint16(e.local + 28, true);
  const raw = buf.subarray(start, start + e.size);
  const data = e.method === 0 ? raw : e.method === 8 ? await inflate(raw) : null;
  if (!data) throw new Error("unsupported compression");
  return new DOMParser().parseFromString(new TextDecoder().decode(data), "application/xml");
}
const tags = (node, name) => Array.from(node.getElementsByTagName(name));
const BUILTIN_DATE = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);
function colIndex(ref) {
  let n = 0;
  for (const ch of ref) { const c = ch.charCodeAt(0); if (c < 65 || c > 90) break; n = n * 26 + (c - 64); }
  return n - 1;
}
// Text of `bytes` in an encoding, if they're valid in it (see
// `import::decode_text`).
export function decode_as(bytes, enc) {
  try { return new TextDecoder(enc, { fatal: true }).decode(bytes); } catch { return undefined; }
}
export async function xlsx_rows(bytes) {
  const buf = new Uint8Array(bytes);
  const map = entries(buf);
  const wb = await read(buf, map, "xl/workbook.xml");
  if (!wb) throw new Error("not an xlsx");
  const date1904 = /^(1|true)$/i.test(tags(wb, "workbookPr")[0]?.getAttribute("date1904") || "");
  let sheetPath = "xl/worksheets/sheet1.xml";
  const first = tags(wb, "sheet")[0];
  const rels = await read(buf, map, "xl/_rels/workbook.xml.rels");
  if (first && rels) {
    const rid = first.getAttribute("r:id") || first.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
    const rel = tags(rels, "Relationship").find((r) => r.getAttribute("Id") === rid);
    if (rel) {
      const t = rel.getAttribute("Target");
      sheetPath = t.startsWith("/") ? t.slice(1) : "xl/" + t.replace(/^\.\//, "");
    }
  }
  const sst = await read(buf, map, "xl/sharedStrings.xml");
  const strings = sst ? tags(sst, "si").map((si) => tags(si, "t").filter((t) => t.parentNode.nodeName !== "rPh").map((t) => t.textContent).join("")) : [];
  const styles = await read(buf, map, "xl/styles.xml");
  const custom = new Map();
  const dateStyle = [];
  if (styles) {
    for (const f of tags(styles, "numFmt")) {
      const code = (f.getAttribute("formatCode") || "").replace(/"[^"]*"|\[[^\]]*\]|\\./g, "");
      custom.set(+f.getAttribute("numFmtId"), /[dy]/i.test(code));
    }
    const xfs = tags(styles, "cellXfs")[0];
    if (xfs) for (const xf of tags(xfs, "xf")) {
      const id = +xf.getAttribute("numFmtId");
      dateStyle.push(BUILTIN_DATE.has(id) || custom.get(id) === true);
    }
  }
  const sheet = await read(buf, map, sheetPath);
  if (!sheet) throw new Error("no worksheet");
  const out = [];
  for (const row of tags(sheet, "row")) {
    const cells = [];
    let next = 0;
    for (const c of tags(row, "c")) {
      const ref = c.getAttribute("r");
      const i = ref ? colIndex(ref) : next;
      next = i + 1;
      const t = c.getAttribute("t");
      const v = tags(c, "v")[0]?.textContent ?? "";
      let text;
      if (t === "s") text = strings[+v] ?? "";
      else if (t === "inlineStr") text = tags(c, "t").map((x) => x.textContent).join("");
      else if (t === "b") text = v === "1" ? "TRUE" : "FALSE";
      else if ((t === null || t === "n") && v !== "" && dateStyle[+(c.getAttribute("s") || 0)]) text = "\uE000" + v;
      else text = v;
      while (cells.length < i) cells.push("");
      cells[i] = text;
    }
    const at = +(row.getAttribute("r") || out.length + 1) - 1;
    while (out.length < at) out.push([]);
    out.push(cells);
  }
  return [out, date1904];
}
// True when the locale writes numeric dates month first (US style).
export function month_first(locale) {
  try {
    const parts = new Intl.DateTimeFormat(locale || undefined, { year: "numeric", month: "numeric", day: "numeric" }).formatToParts(new Date(2000, 10, 22));
    return parts.findIndex((p) => p.type === "month") < parts.findIndex((p) => p.type === "day");
  } catch (_) { return false; }
}
