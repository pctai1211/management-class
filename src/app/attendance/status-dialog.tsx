'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { createAttendanceStatus, deleteAttendanceStatus, updateAttendanceStatus } from './actions';

export type AttendanceStatus = { id: string; name: string; code: string; color: string; sort_order: number };
export function StatusDialog({ statuses }: { statuses: AttendanceStatus[] }) {
  const [open, setOpen] = useState(false); const [busy, startTransition] = useTransition();
  function submit(form: FormData, statusId?: string) {
    const input = { name: String(form.get('name') ?? ''), code: String(form.get('code') ?? ''), color: String(form.get('color') ?? '') };
    startTransition(async () => {
      const result = statusId ? await updateAttendanceStatus(statusId, input) : await createAttendanceStatus(input);
      if (!result.ok) toast.error(result.error); else { toast.success(statusId ? 'Đã cập nhật trạng thái.' : 'Đã thêm trạng thái.'); if (!statusId) setOpen(false); }
    });
  }
  return <>
    <button onClick={() => setOpen(true)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Cấu hình trạng thái</button>
    {open && <div role="presentation" className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="status-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"><div className="flex items-start justify-between"><div><h2 id="status-title" className="text-xl font-bold">Cấu hình trạng thái</h2><p className="mt-1 text-sm text-slate-500">Mã P và K được dùng để tính lượt nghỉ có phép/không phép.</p></div><button onClick={() => setOpen(false)} aria-label="Đóng" className="rounded px-2 text-xl text-slate-500">×</button></div>
      <div className="mt-4 space-y-3">{statuses.map((status) => <form key={status.id} onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget), status.id); }} className="grid grid-cols-[1fr_72px_42px_auto] items-end gap-2 rounded-lg border p-3"><label className="text-xs font-medium">Tên<input name="name" required maxLength={40} defaultValue={status.name} className="mt-1 block w-full rounded border px-2 py-2 text-sm" /></label><label className="text-xs font-medium">Mã<input name="code" required maxLength={5} defaultValue={status.code} className="mt-1 block w-full rounded border px-2 py-2 text-sm uppercase" /></label><label className="text-xs font-medium">Màu<input name="color" type="color" defaultValue={status.color} className="mt-1 block h-10 w-full rounded border p-1" /></label><div className="flex gap-1"><button disabled={busy} className="rounded bg-brand-600 px-2 py-2 text-xs font-medium text-white">Lưu</button><button type="button" disabled={busy} onClick={() => { if (!window.confirm(`Xóa trạng thái “${status.name}”?`)) return; startTransition(async () => { const result = await deleteAttendanceStatus(status.id); if (result.ok) toast.success('Đã xóa trạng thái.'); else toast.error(result.error); }); }} className="rounded border border-red-200 px-2 py-2 text-xs text-red-700">Xóa</button></div></form>)}</div>
      <form onSubmit={(e) => { e.preventDefault(); submit(new FormData(e.currentTarget)); }} className="mt-5 rounded-xl bg-slate-50 p-3"><h3 className="mb-3 font-semibold">Thêm trạng thái mới</h3><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><label className="col-span-2 text-xs font-medium sm:col-span-1">Tên<input name="name" required maxLength={40} placeholder="Ví dụ: Muộn" className="mt-1 block w-full rounded border px-2 py-2 text-sm" /></label><label className="text-xs font-medium">Mã<input name="code" required maxLength={5} placeholder="M" className="mt-1 block w-full rounded border px-2 py-2 text-sm uppercase" /></label><label className="text-xs font-medium">Màu<input name="color" type="color" defaultValue="#60A5FA" className="mt-1 block h-10 w-full rounded border p-1" /></label><div className="flex items-end"><button disabled={busy} className="w-full rounded bg-brand-600 px-3 py-2 text-sm font-semibold text-white">Thêm</button></div></div></form>
      </section></div>}
  </>;
}
