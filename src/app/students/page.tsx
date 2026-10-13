import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ToastNotice } from '@/components/toast-notice';
import { deleteStudent } from './actions';
import { StudentDelete, StudentTools, type StudentExport } from './student-tools';

type Search = { q?: string; page?: string; sort?: string; dir?: string; notice?: string; error?: string };
const columns: Record<string, string> = { full_name: 'Họ tên', date_of_birth: 'Ngày sinh', address: 'Địa chỉ', phone: 'Số điện thoại' };
export default async function StudentsPage({ searchParams }: { searchParams: Search }) {
  const profile = await requireRole('TEACHER');
  const supabase = await createClient();
  const query = (searchParams.q ?? '').trim();
  const page = Math.max(1, Number.parseInt(searchParams.page ?? '1', 10) || 1);
  const sort = columns[searchParams.sort ?? ''] ? searchParams.sort! : 'full_name';
  const ascending = searchParams.dir !== 'desc';
  const from = (page - 1) * 15;
  let dataQuery = supabase.from('students').select('id, full_name, date_of_birth, address, phone', { count: 'exact' }).eq('teacher_id', profile.id);
  let exportQuery = supabase.from('students').select('full_name, date_of_birth, address, phone').eq('teacher_id', profile.id);
  if (query) {
    const pattern = `%${query.replace(/[%_,]/g, ' ').replace(/[()]/g, '')}%`;
    dataQuery = dataQuery.ilike('full_name', pattern);
    exportQuery = exportQuery.ilike('full_name', pattern);
  }
  const [{ data: students, count, error }, { data: exportData }] = await Promise.all([
    dataQuery.order(sort, { ascending }).range(from, from + 14),
    exportQuery.order('full_name', { ascending: true }),
  ]);
  const pageCount = Math.max(1, Math.ceil((count ?? 0) / 15));
  return <main className="min-h-screen px-4 py-7 sm:px-8"><ToastNotice message={searchParams.notice} /><ToastNotice message={searchParams.error} kind="error" /><div className="mx-auto max-w-7xl">
    <header className="mb-7 flex flex-wrap items-start justify-between gap-4"><div><Link href="/dashboard" className="text-sm text-brand-700">← Trang chủ</Link><p className="mt-3 text-sm font-medium text-brand-600">{profile.class_name || 'Lớp chủ nhiệm'}</p><h1 className="mt-1 text-3xl font-bold">Danh sách học sinh</h1><p className="mt-2 text-slate-500">Xin chào, {profile.full_name}</p></div><Link href="/students/new" className="rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">+ Thêm học sinh</Link></header>
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Không tải được danh sách: {error.message}</p>}
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><form className="flex min-w-[240px] flex-1 gap-2" action="/students"><input name="q" defaultValue={query} placeholder="Tìm theo họ tên…" className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2" /><button className="rounded-lg border px-4 py-2">Tìm</button>{query && <Link href="/students" className="self-center text-sm text-slate-500">Xóa lọc</Link>}</form><StudentTools students={(exportData ?? []) as StudentExport[]} /></div>
      {!students?.length ? <div className="rounded-xl bg-slate-50 px-4 py-12 text-center"><p className="font-medium text-slate-700">{query ? 'Không tìm thấy học sinh phù hợp.' : 'Chưa có học sinh nào'}</p><p className="mt-1 text-sm text-slate-500">{query ? 'Thử từ khóa khác.' : 'Thêm học sinh hoặc nhập từ tệp Excel/CSV để bắt đầu.'}</p></div> : <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr><th className="px-3 py-3">STT</th>{Object.entries(columns).map(([key, title]) => { const nextDir = sort === key && ascending ? 'desc' : 'asc'; const params = new URLSearchParams(); if (query) params.set('q', query); params.set('sort', key); params.set('dir', nextDir); return <th key={key} className="px-3 py-3"><Link href={`/students?${params.toString()}`} className="hover:text-brand-700">{title}{sort === key ? (ascending ? ' ↑' : ' ↓') : ''}</Link></th>; })}<th className="px-3 py-3">Thao tác</th></tr></thead><tbody className="divide-y divide-slate-100">{students.map((student, i) => <tr key={student.id} className="hover:bg-slate-50"><td className="px-3 py-3 text-slate-500">{from + i + 1}</td><td className="px-3 py-3 font-medium">{student.full_name}</td><td className="px-3 py-3">{new Date(`${student.date_of_birth}T00:00:00`).toLocaleDateString('vi-VN')}</td><td className="px-3 py-3">{student.address || '—'}</td><td className="px-3 py-3">{student.phone || '—'}</td><td className="px-3 py-3"><div className="flex items-center gap-3"><Link href={`/students/${student.id}/edit`} className="font-medium text-brand-700 hover:underline">Sửa</Link><StudentDelete id={student.id} name={student.full_name} action={deleteStudent} /></div></td></tr>)}</tbody></table></div>}
      {count && count > 15 ? <nav aria-label="Phân trang" className="mt-4 flex items-center justify-between border-t pt-4 text-sm"><span className="text-slate-500">Trang {page} / {pageCount} · {count} học sinh</span><div className="flex gap-2">{page > 1 && <Link href={`/students?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(page - 1), sort, dir: ascending ? 'asc' : 'desc' })}`} className="rounded border px-3 py-1.5">Trước</Link>}{page < pageCount && <Link href={`/students?${new URLSearchParams({ ...(query ? { q: query } : {}), page: String(page + 1), sort, dir: ascending ? 'asc' : 'desc' })}`} className="rounded border px-3 py-1.5">Tiếp</Link>}</div></nav> : null}
    </section>
  </div></main>;
}
