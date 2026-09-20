/**
 * Pure RFC4180 CSV formatter with UTF-8 BOM
 */

export interface CsvColumn<T> {
  key: keyof T | string;
  label: string;
  format?: (value: any, row: T) => string;
}

/**
 * Escape a field for CSV:
 * - Wrap in quotes if it contains commas, double quotes, or newlines
 * - Double up existing quotes
 */
export function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }
  const str = String(val);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generate CSV string from dataset and columns specification.
 * Prefixes with UTF-8 Byte Order Mark (BOM: \uFEFF) for Excel compatibility.
 */
export function toCsv<T extends Record<string, any>>(columns: CsvColumn<T>[], rows: T[]): string {
  const headerRow = columns.map((col) => escapeCsvField(col.label)).join(',');

  const dataRows = rows.map((row) => {
    return columns
      .map((col) => {
        const rawVal = (row as any)[col.key];
        const formatted = col.format ? col.format(rawVal, row) : rawVal;
        return escapeCsvField(formatted);
      })
      .join(',');
  });

  return '\uFEFF' + [headerRow, ...dataRows].join('\r\n');
}

/**
 * Trigger client-side file download for generated CSV
 */
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
