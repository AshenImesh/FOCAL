/* Bulk paper-results upload: one result per line.
   Format: Grade, Student name, Paper name, Marks, Total
   - Total is optional and defaults to 100.
   - Lines starting with # are comments and are ignored.
   - Blank lines are ignored.
   Example:
     6, Kavindu Perera, Paper 1 – Term 1 2026, 78, 100
     6, Kavindu Perera, Paper 2 – Term 1 2026, 82
     7, Nethmi Silva, Mid Term 2026, 45, 50
*/

export interface ParsedResult {
  line: number;
  grade: number;
  name: string;
  paper: string;
  marks: number;
  total: number;
}

export function parseResultsText(text: string): { rows: ParsedResult[]; errors: string[] } {
  const rows: ParsedResult[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const lineNo = i + 1;
    if (!raw.trim() || raw.trim().startsWith("#")) continue;

    const parts = raw.split(",").map((p) => p.trim());
    if (parts.length < 4 || parts.length > 5) {
      errors.push(`Line ${lineNo}: expected "Grade, Student name, Paper name, Marks, Total".`);
      continue;
    }

    const [g, name, paper, m, t] = parts;
    const grade = Number(g);
    const marks = Number(m);
    const total = t === undefined || t === "" ? 100 : Number(t);

    if (!Number.isInteger(grade) || grade < 6 || grade > 11) {
      errors.push(`Line ${lineNo}: grade "${g}" is not valid (use 6–11).`);
      continue;
    }
    if (!name) {
      errors.push(`Line ${lineNo}: missing student name.`);
      continue;
    }
    if (!paper) {
      errors.push(`Line ${lineNo}: missing paper name.`);
      continue;
    }
    if (!Number.isFinite(marks) || marks < 0) {
      errors.push(`Line ${lineNo}: marks "${m}" is not a valid number.`);
      continue;
    }
    if (!Number.isFinite(total) || total <= 0) {
      errors.push(`Line ${lineNo}: total "${t}" is not a valid number.`);
      continue;
    }
    if (marks > total) {
      errors.push(`Line ${lineNo}: marks (${marks}) cannot exceed the total (${total}).`);
      continue;
    }

    rows.push({ line: lineNo, grade, name, paper, marks, total });
  }

  return { rows, errors };
}

export function buildResultsTemplate(): string {
  return [
    "# Grade, Student name, Paper name, Marks, Total",
    "# Total is optional — defaults to 100.",
    "# One result per line. Re-uploading a paper for the same student updates it.",
    "6, Kavindu Perera, Paper 1 – Term 1 2026, 78, 100",
    "6, Kavindu Perera, Paper 2 – Term 1 2026, 82",
    "7, Nethmi Silva, Mid Term 2026, 45, 50",
  ].join("\n");
}