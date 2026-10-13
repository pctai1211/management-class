'use client';

import { useState, useTransition } from 'react';
import * as XLSX from 'xlsx';
import { importStudents } from './actions';

export type StudentExport = { full_name: string; date_of_birth: string; address: string | null; phone: string | null };
type PreviewRow = StudentExport & { line: number; errors: string[] };
const columns = ['Họ tên', 'Ngày sinh', 'Địa chỉ', 'Số điện thoại'];
const escapeCsv = (cell: unknown) => `"${String(cell ?? '').replaceAll('"', '""')}"`;
function saveCsv(name: string, rows: unknown[][]) {
  const contents = '\ufeff' + rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
}
function saveXlsx(name: string, rows: unknown[][]) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Học sinh'); XLSX.writeFile(book, name);
}
const isoDate = (value: unknown): string => {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
  }
  const text = String(value ?? '').trim();
  let match = text.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (match) return `${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
  match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) return `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  return text;
};
const validDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(new Date(`${v}T00:00:00`).valueOf()) && new Date(`${v}T00:00:00`).toISOString().slice(0, 10) === v;
const validPhone = (v: string) => !v || /^(?:(?:\+?84)|0)(?:3|5|7|8|9)\d{8}$/.test(v);
const norm = (v: unknown) => String(v ?? '').trim().normalize('NFD').toLowerCase().replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
const normalizePhone = (v: unknown) => {
  const phone = String(v ?? '').trim();
  return /^\d{9}$/.test(phone) && /^[35789]/.test(phone) ? `0${phone}` : phone;
};

export function StudentTools({ students }: { students: StudentExport[] }) {
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [fileError, setFileError] = useState('');
  const [busy, startTransition] = useTransition();
  const exportRows = [columns, ...students.map((s) => [s.full_name, s.date_of_birth.split('-').reverse().join('/'), s.address ?? '', s.phone ?? ''])];
  async function chooseFile(file?: File) {
    setFileError(''); setPreview(null);
    if (!file) return;
    if (!/\.(csv|xlsx)$/i.test(file.name)) { setFileError('Chỉ hỗ trợ tệp .csv hoặc .xlsx.'); return; }
    try {
      const bytes = await file.arrayBuffer();
      const book = XLSX.read(bytes, { type: 'array', cellDates: true, raw: false });
      const sheet = book.Sheets[book.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: '', raw: false });
      if (matrix.length < 2) { setFileError('Tệp chưa có dòng dữ liệu.'); return; }
      const headers = (matrix[0] as unknown[]).map(norm);
      const find = (names: string[]) => headers.findIndex((h) => names.includes(h));
      const indexes = { name: find(['ho ten', 'ho va ten', 'ho_ten']), dob: find(['ngay sinh', 'ngay_sinh']), address: find(['dia chi', 'dia_chi']), phone: find(['so dien thoai', 'dien thoai', 'so_dien_thoai']) };
      if (indexes.name < 0 || indexes.dob < 0) { setFileError('Không tìm thấy cột bắt buộc “Họ tên” và “Ngày sinh”.'); return; }
      const rows = (matrix.slice(1) as unknown[][]).map((r, i): PreviewRow => {
        const name = String(r[indexes.name] ?? '').trim();
        const dob = isoDate(r[indexes.dob]);
        const address = indexes.address >= 0 ? String(r[indexes.address] ?? '').trim() : '';
        const phone = indexes.phone >= 0 ? normalizePhone(r[indexes.phone]) : '';
        const errors: string[] = [];
        if (!name) errors.push('Thiếu họ tên');
        if (!dob || !validDate(dob) || new Date(`${dob}T00:00:00`) > new Date()) errors.push('Ngày sinh không hợp lệ');
        if (!validPhone(phone)) errors.push('Sai định dạng số điện thoại');
        return { line: i + 2, full_name: name, date_of_birth: dob, address, phone, errors };
      }).filter((r) => r.full_name || r.date_of_birth || r.address || r.phone);
      if (!rows.length) { setFileError('Không tìm thấy dòng học sinh trong tệp.'); return; }
      if (rows.length > 500) { setFileError('Mỗi lần nhập tối đa 500 dòng.'); return; }
      setPreview(rows);
    } catch { setFileError('Không đọc được tệp. Hãy kiểm tra định dạng và thử lại.'); }
  }
  const validRows = preview?.filter((r) => !r.errors.length) ?? [];
  return <div className="flex flex-wrap items-center gap-2">
    <button onClick={() => saveCsv('mau-hoc-sinh.csv', [columns])} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Tải mẫu CSV</button>
    <button onClick={() => saveXlsx('mau-hoc-sinh.xlsx', [columns])} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Tải mẫu Excel</button>
    <label className="cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm">Import .csv / .xlsx<input type="file" accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" onChange={(e) => { void chooseFile(e.target.files?.[0]); e.currentTarget.value = ''; }} /></label>
    <button onClick={() => saveCsv('danh-sach-hoc-sinh.csv', exportRows)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">Export CSV</button>
    <button onClick={() => saveXlsx('danh-sach-hoc-sinh.xlsx', exportRows)} className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white">Export Excel</button>
    {fileError && <p role="alert" className="w-full text-sm text-red-700">{fileError}</p>}
    {preview && <section className="mt-3 w-full rounded-xl border border-slate-200 bg-white p-4"><h3 className="font-semibold">Xem trước nhập dữ liệu</h3><p className="mb-3 mt-1 text-sm text-slate-600">{preview.length} dòng, {validRows.length} hợp lệ, {preview.length - validRows.length} dòng lỗi. Ngày dd/mm/yyyy được hỗ trợ.</p><div className="max-h-72 overflow-auto"><table className="w-full text-left text-xs"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-2">Dòng</th><th className="p-2">Họ tên</th><th className="p-2">Ngày sinh</th><th className="p-2">Số điện thoại</th><th className="p-2">Kết quả</th></tr></thead><tbody>{preview.map((r) => <tr key={r.line} className="border-t"><td className="p-2">{r.line}</td><td className="p-2">{r.full_name || '—'}</td><td className="p-2">{r.date_of_birth || '—'}</td><td className="p-2">{r.phone || '—'}</td><td className={`p-2 ${r.errors.length ? 'text-red-700' : 'text-green-700'}`}>{r.errors.join(', ') || 'Hợp lệ'}</td></tr>)}</tbody></table></div><div className="mt-3 flex gap-2"><button disabled={!validRows.length || busy} onClick={() => startTransition(() => importStudents(validRows.map(({ line, errors, ...student }) => ({ ...student, address: student.address || undefined, phone: student.phone || '' })) ))} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Đang nhập…' : `Nhập ${validRows.length} dòng hợp lệ`}</button><button onClick={() => setPreview(null)} className="rounded-lg border px-4 py-2 text-sm">Hủy</button></div></section>}
  </div>;
}

export function StudentDelete({ id, name, action }: { id: string; name: string; action: (formData: FormData) => void }) {
  return <form action={action} onSubmit={(e) => { if (!window.confirm(`Xóa học sinh ${name}? Toàn bộ dữ liệu điểm danh của học sinh này cũng sẽ bị xóa và không thể khôi phục.`)) e.preventDefault(); }}><input type="hidden" name="id" value={id} /><button className="font-medium text-red-600 hover:underline">Xóa</button></form>;
}
