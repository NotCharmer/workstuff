const fs = require('fs');
const Papa = require('papaparse');

const input = 'c:/Users/שמעון/Downloads/ClassEventsSadinExcel.csv';
const output = 'c:/Users/שמעון/Downloads/ClassEventsSadinExcel.table.csv';
const text = fs.readFileSync(input, 'utf8');
const parsed = Papa.parse(text, { header: false, skipEmptyLines: false });
const grid = parsed.data;

const norm = (s) => String(s || '').replace(/^\uFEFF/, '').trim().toLowerCase().replace(/\s+/g, ' ');
const cleanSubject = (s) => String(s || '').replace(/\r?\n/g, ' ').replace(/\([^)]*\)/g, '').replace(/`/g, '').replace(/\s+/g, ' ').trim();
const looksGeneric = (s) => /מחצית|מטלה|מבחן|בוחן|שליליים|שם התלמיד/.test(s);

const markerRowIdx = grid.findIndex((row) => row.some((c) => norm(c).includes('שם התלמיד')));
if (markerRowIdx < 0) throw new Error('Could not find student marker row');
const markerRow = grid[markerRowIdx] || [];
const nameCol = markerRow.findIndex((c) => norm(c).includes('שם התלמיד'));
if (nameCol < 0) throw new Error('Could not find student name column');

const probes = grid.slice(markerRowIdx + 1, markerRowIdx + 16);
const nearby = [nameCol - 1, nameCol, nameCol + 1, nameCol + 2].filter((c) => c >= 0);
const isNameLike = (v) => /[A-Za-z\u0590-\u05FF]/.test(v) && !/^\d+$/.test(v);
const isNumericLike = (v) => /^-?\d+(?:[.,]\d+)?$/.test(v);
const resolvedNameCol = nearby
  .map((col) => ({ col, score: probes.reduce((a, row) => a + (isNameLike(String(row[col] || '').trim()) ? 1 : 0), 0), dist: Math.abs(col - nameCol) }))
  .sort((a, b) => b.score - a.score || a.dist - b.dist)[0].col;
const extCandidate = nearby
  .filter((c) => c !== resolvedNameCol)
  .map((col) => ({ col, score: probes.reduce((a, row) => a + (isNumericLike(String(row[col] || '').trim()) ? 1 : 0), 0), dist: Math.abs(col - resolvedNameCol) }))
  .sort((a, b) => b.score - a.score || a.dist - b.dist)[0];
const resolvedExternalCol = extCandidate ? extCandidate.col : null;

let subjectRowIdx = -1;
for (let i = markerRowIdx; i >= 0; i--) {
  const row = grid[i] || [];
  const meaningful = row.map((c) => cleanSubject(c)).filter((c) => c && !looksGeneric(c));
  if (meaningful.length >= 2) { subjectRowIdx = i; break; }
}
if (subjectRowIdx < 0) throw new Error('Could not find subjects row');

const titleRow = grid.find((row) => row.some((c) => norm(c).includes('לכיתה')));
const titleCell = (titleRow || []).find((c) => norm(c).includes('לכיתה')) || '';
const classMatch = String(titleCell).match(/לכיתה\s+(.+?)\s+מתאריך/) || String(titleCell).match(/לכיתה\s+([^,]+)/);
const className = classMatch ? classMatch[1].trim() : '';

const subjectRow = grid[subjectRowIdx] || [];
const subjectByCol = [];
let current = '';
for (let col = 0; col < resolvedNameCol; col++) {
  const s = cleanSubject(subjectRow[col]);
  if (s && !looksGeneric(s)) current = s;
  subjectByCol[col] = current || '';
}

const outRows = [];
for (let r = markerRowIdx + 1; r < grid.length; r++) {
  const row = grid[r] || [];
  const studentName = String(row[resolvedNameCol] || '').trim();
  if (!studentName) continue;
  const externalId = resolvedExternalCol != null ? String(row[resolvedExternalCol] || '').trim() : '';

  for (let col = 0; col < resolvedNameCol; col++) {
    const subject = subjectByCol[col];
    if (!subject) continue;
    const raw = String(row[col] || '').trim().replace(',', '.');
    if (!raw) continue;
    const g = Number.parseFloat(raw);
    if (Number.isNaN(g)) continue;
    outRows.push({ studentName, subject, grade: Math.max(0, Math.min(100, g)), className, externalId: externalId || '' });
  }
}

const csv = Papa.unparse(outRows, { columns: ['studentName', 'subject', 'grade', 'className', 'externalId'] });
fs.writeFileSync(output, csv, 'utf8');
console.log(`Wrote ${outRows.length} rows to ${output}`);
