// Minimal RFC-4180-style CSV field escaping. A field is wrapped in double
// quotes (and any internal double quote doubled) if it contains a comma, a
// double quote, or a newline — otherwise it's written as-is. Pure formatting
// logic with no I/O or business rules, hence `utils/` rather than a service.
export function csvEscapeField(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function csvRow(fields: unknown[]): string {
  return fields.map(csvEscapeField).join(",") + "\n";
}
