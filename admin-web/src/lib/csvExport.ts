// RFC 4180-style CSV: quote-wrap any field containing a comma/quote/newline,
// doubling internal quotes; CRLF line endings.
export function toCsv(columns: string[], rows: Array<Array<string | number>>): string {
  const escapeField = (value: string | number) => {
    let str = String(value);
    // Neutralize formula injection: a field starting with =, +, -, or @ is
    // interpreted as a formula by Excel/Sheets/LibreOffice when opened, and
    // visitor-supplied fields like full name aren't restricted from starting
    // with these characters.
    if (/^[=+\-@]/.test(str)) {
      str = `'${str}`;
    }
    if (/[",\r\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  return [columns, ...rows].map((row) => row.map(escapeField).join(",")).join("\r\n");
}

// A leading UTF-8 BOM makes Excel reliably detect the encoding instead of
// mis-rendering accented characters (common in Filipino names/addresses).
const UTF8_BOM = "﻿";

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([UTF8_BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
