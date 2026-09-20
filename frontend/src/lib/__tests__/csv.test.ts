import { describe, it, expect } from 'vitest';
import { escapeCsvField, toCsv } from '../csv';

describe('CSV Pure Functions', () => {
  it('escapes fields with commas, double quotes, and newlines', () => {
    expect(escapeCsvField('Dr. Anand')).toBe('Dr. Anand');
    expect(escapeCsvField('Cardiology, OPD')).toBe('"Cardiology, OPD"');
    expect(escapeCsvField('Dr. "The Specialist"')).toBe('"Dr. ""The Specialist"""');
    expect(escapeCsvField('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    expect(escapeCsvField(null)).toBe('');
    expect(escapeCsvField(undefined)).toBe('');
  });

  it('generates proper RFC4180 CSV with UTF-8 BOM', () => {
    const columns = [
      { key: 'id', label: 'ID' },
      { key: 'name', label: 'Doctor Name' },
      { key: 'notes', label: 'Specialty, Notes' },
    ];

    const data = [
      { id: '1', name: 'Dr. Anand', notes: 'Senior, "Interventional" Cardiologist' },
      { id: '2', name: 'Dr. Meera', notes: 'Pediatrics' },
    ];

    const csvOutput = toCsv(columns, data);

    // Verifies UTF-8 BOM prefix
    expect(csvOutput.startsWith('\uFEFF')).toBe(true);

    // Verifies header escaping
    expect(csvOutput).toContain('ID,Doctor Name,"Specialty, Notes"');

    // Verifies row escaping
    expect(csvOutput).toContain('1,Dr. Anand,"Senior, ""Interventional"" Cardiologist"');
    expect(csvOutput).toContain('2,Dr. Meera,Pediatrics');
  });
});
