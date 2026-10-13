'use client';

import { useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { saveAttendance } from './actions';
import type { AttendanceStatus } from './status-dialog';

type Student = { id: string; full_name: string };
type Entry = { student_id: string; date: string; status_id: string; note: string | null };
export function MonthGrid({ students, statuses, entries, year, month, days }: { students: Student[]; statuses: AttendanceStatus[]; entries: Entry[]; year: number; month: number; days: number }) {
  const initial: Record<string, string> = {};
  entries.forEach((entry) => { initial[`${entry.student_id}:${entry.date}`] = entry.status_id; });
  const [marks, setMarks] = useState(initial);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [busy, startTransition] = useTransition();
  const pending = useRef(new Set<string>());
  const ordered = [...statuses].sort((a, b) => a.sort_order - b.sort_order);
  const statusById = new Map<string, AttendanceStatus>(statuses.map((status) => [status.id, status] as const));
  async function toggle(studentId: string, day: number) {
    const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const key = `${studentId}:${date}`;
    if (pending.current.has(key)) return;
    const before = marks[key] ?? null;
    const index = ordered.findIndex((status) => status.id === before);
    const next = !before ? ordered[0]?.id ?? null : index >= ordered.length - 1 ? null : ordered[index + 1]?.id ?? null;
    if (next === before) return;
    pending.current.add(key); setSaving((old) => ({ ...old, [key]: true })); setSaved((old) => ({ ...old, [key]: false }));
    setMarks((old) => { const updated = { ...old }; if (next) updated[key] = next; else delete updated[key]; return updated; });
    startTransition(async () => {
      const result = await saveAttendance(studentId, date, next);
      pending.current.delete(key); setSaving((old) => ({ ...old, [key]: false }));
      if (!result.ok) { setMarks((old) => { const updated = { ...old }; if (before) updated[key] = before; else delete updated[key]; return updated; }); toast.error(result.error); }
      else setSaved((old) => ({ ...old, [key]: true }));
    });
  }
  function totals(studentId: string) {
    let permitted = 0; let unpermitted = 0; let total = 0;
    for (let day = 1; day <= days; day++) {
      const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const statusId = marks[`${studentId}:${date}`];
      if (!statusId) continue;
      const code = statusById.get(statusId)?.code;
      total++; if (code === 'P') permitted++; if (code === 'K') unpermitted++;
    }
    return { permitted, unpermitted, total };
  }
  return <div className="relative max-h-[calc(100vh-260px)] min-h-[340px] overflow-auto rounded-xl border border-slate-200 bg-white"><table className="w-max min-w-full border-separate border-spacing-0 text-center text-xs"><thead className="sticky top-0 z-20 bg-slate-50"><tr><th rowSpan={2} className="sticky left-0 z-30 min-w-[190px] border-b border-r bg-slate-50 px-3 py-2 text-left text-sm">Học sinh</th>{Array.from({ length: days }, (_, i) => { const day = i + 1; const weekday = new Date(year, month - 1, day).getDay(); const weekend = weekday === 0 || weekday === 6; return <th key={day} className={`min-w-[42px] border-b px-1 py-1 ${weekend ? 'bg-blue-50 text-blue-700' : ''}`}><div className="text-sm font-semibold">{day}</div><div className="font-normal">{['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][weekday]}</div></th>; })}<th colSpan={3} className="min-w-[150px] border-b border-l bg-slate-100 px-2 py-1">Tổng lượt nghỉ</th></tr><tr>{Array.from({ length: days }, (_, i) => { const day = i + 1; const weekday = new Date(year, month - 1, day).getDay(); return <th key={day} className={`border-b px-1 py-1 font-normal ${weekday === 0 || weekday === 6 ? 'bg-blue-50' : ''}`} />; })}<th className="border-b border-l px-2 py-1 text-amber-800">Có phép</th><th className="border-b px-2 py-1 text-red-700">Không phép</th><th className="border-b px-2 py-1">Tổng</th></tr></thead><tbody>{students.map((student, row) => { const count = totals(student.id); return <tr key={student.id} className="group"><th scope="row" className="sticky left-0 z-10 min-w-[190px] border-b border-r bg-white px-3 py-1.5 text-left text-sm font-medium group-hover:bg-slate-50"><span className="mr-2 text-xs text-slate-400">{row + 1}</span>{student.full_name}</th>{Array.from({ length: days }, (_, i) => { const day = i + 1; const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`; const key = `${student.id}:${date}`; const statusId = marks[key]; const status = statusId ? statusById.get(statusId) : undefined; const weekday = new Date(year, month - 1, day).getDay(); return <td key={day} className={`border-b px-0.5 py-0.5 ${weekday === 0 || weekday === 6 ? 'bg-blue-50/60' : ''}`}><button type="button" disabled={!ordered.length || saving[key]} onClick={() => void toggle(student.id, day)} title={`${student.full_name} · ${day}/${month}/${year}: ${status?.name ?? 'Có mặt'}${saved[key] ? ' · Đã lưu' : ''}`} aria-label={`Điểm danh ${student.full_name}, ngày ${day}: ${status?.name ?? 'Có mặt'}`} className={`h-8 w-9 rounded font-semibold transition hover:ring-2 hover:ring-brand-300 disabled:cursor-wait ${status ? 'shadow-sm' : 'text-slate-300 hover:text-slate-600'}`} style={status ? { backgroundColor: status.color, color: status.code === 'P' ? '#713f12' : '#fff' } : undefined}>{saving[key] ? '…' : status ? <>{status.code}{saved[key] && <span className="ml-0.5 text-[9px]">✓</span>}</> : '·'}</button></td>; })}<td className="border-b border-l px-2 font-medium text-amber-800">{count.permitted}</td><td className="border-b px-2 font-medium text-red-700">{count.unpermitted}</td><td className="border-b px-2 font-bold">{count.total}</td></tr>; })}</tbody></table>{busy && <span className="sr-only">Đang lưu điểm danh</span>}</div>;
}
