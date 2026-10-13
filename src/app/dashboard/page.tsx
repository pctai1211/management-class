import Link from 'next/link';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AttendanceChart, type ChartPoint } from './attendance-chart';
import { signOut } from '@/app/logout/actions';

type Params = { period?: string; month?: string; schoolYear?: string; start?: string; end?: string };
type RankedStudent = { student_id: string; full_name: string; count: number };
type Stats = { summary: { student_count: number; absence_count: number; permitted_count: number; unpermitted_count: number; students_absent: number }; chart: ChartPoint[]; top_absences: RankedStudent[]; top_permitted: RankedStudent[]; top_unpermitted: RankedStudent[] };
const isoDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const validDate = (value?: string) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
};
function safePeriod(params: Params) {
  const now = new Date();
  const period = ['month', 'year', 'custom'].includes(params.period ?? '') ? params.period! : 'month';
  if (period === 'month') {
    const month = params.month && /^\d{4}-(0[1-9]|1[0-2])$/.test(params.month) ? params.month : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const [y, m] = month.split('-').map(Number);
    const start = `${month}-01`;
    const end = isoDate(new Date(y, m, 0));
    return { period, month, schoolYear: '', start, end, granularity: 'daily' as const, error: '' };
  }
  if (period === 'year') {
    const currentStartYear = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1;
    const year = /^\d{4}$/.test(params.schoolYear ?? '') ? Number(params.schoolYear) : currentStartYear;
    if (year < 2000 || year > 2098) return { period, month: '', schoolYear: String(currentStartYear), start: '', end: '', granularity: 'monthly' as const, error: 'Năm học không hợp lệ.' };
    return { period, month: '', schoolYear: String(year), start: `${year}-09-01`, end: `${year + 1}-08-31`, granularity: 'monthly' as const, error: '' };
  }
  const start = validDate(params.start) ? params.start! : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const end = validDate(params.end) ? params.end! : isoDate(now);
  if (end < start) return { period, month: '', schoolYear: '', start, end, granularity: 'daily' as const, error: 'Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.' };
  const span = (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000;
  return { period, month: '', schoolYear: '', start, end, granularity: (span > 62 ? 'monthly' : 'daily') as 'daily' | 'monthly', error: '' };
}
function RankCard({ title, data, color }: { title: string; data: RankedStudent[]; color: string }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h3 className="font-semibold">{title}</h3>{!data.length ? <p className="py-8 text-center text-sm text-slate-500">Chưa có lượt nghỉ.</p> : <ol className="mt-3 divide-y divide-slate-100">{data.map((row, i) => <li key={row.student_id} className="flex items-center gap-3 py-2.5"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">{i + 1}</span><span className="min-w-0 flex-1 truncate text-sm">{row.full_name}</span><span className="font-semibold" style={{ color }}>{row.count}</span></li>)}</ol>}</section>;
}
export default async function DashboardPage({ searchParams }: { searchParams: Params }) {
  const profile = await requireRole('TEACHER');
  const filter = safePeriod(searchParams);
  const supabase = await createClient();
  const { data, error } = filter.error ? { data: null, error: null } : await supabase.rpc('get_teacher_attendance_stats', { p_start: filter.start, p_end: filter.end, p_granularity: filter.granularity });
  const stats = data as Stats | null;
  const summary = stats?.summary ?? { student_count: 0, absence_count: 0, permitted_count: 0, unpermitted_count: 0, students_absent: 0 };
  const yearNow = new Date().getFullYear();
  const schoolYearNow = new Date().getMonth() >= 8 ? yearNow : yearNow - 1;
  const cards = [
    ['Tổng số học sinh', summary.student_count, 'text-slate-900'],
    ['Tổng lượt nghỉ', summary.absence_count, 'text-brand-700'],
    ['Nghỉ có phép', summary.permitted_count, 'text-amber-700'],
    ['Nghỉ không phép', summary.unpermitted_count, 'text-red-700'],
    ['Học sinh có nghỉ', summary.students_absent, 'text-violet-700'],
  ] as const;
  return <main className="min-h-screen px-4 py-7 sm:px-8"><div className="mx-auto max-w-7xl">
    <header className="mb-6 flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-brand-600">{profile.class_name || 'Lớp chủ nhiệm'}</p><h1 className="mt-1 text-3xl font-bold">Thống kê chuyên cần</h1><p className="mt-2 text-slate-500">Xin chào, {profile.full_name}</p></div><div className="flex flex-wrap gap-2"><Link href="/students" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Học sinh</Link><Link href="/attendance" className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Điểm danh</Link><form action={signOut}><button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">Đăng xuất</button></form></div></header>
    <form action="/dashboard" className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6 lg:items-end"><label className="text-sm font-medium">Kiểu thống kê<select name="period" defaultValue={filter.period} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"><option value="month">Theo tháng</option><option value="year">Năm học</option><option value="custom">Khoảng ngày</option></select></label><label className="text-sm font-medium">Tháng<input type="month" name="month" defaultValue={filter.month || `${yearNow}-${String(new Date().getMonth() + 1).padStart(2, '0')}`} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">Năm học bắt đầu<select name="schoolYear" defaultValue={filter.schoolYear || String(schoolYearNow)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2">{[schoolYearNow - 1, schoolYearNow, schoolYearNow + 1].map((year) => <option key={year} value={year}>{year}–{year + 1}</option>)}</select></label><label className="text-sm font-medium">Từ ngày<input type="date" name="start" defaultValue={filter.start} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label><label className="text-sm font-medium">Đến ngày<input type="date" name="end" defaultValue={filter.end} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2" /></label><button className="rounded-lg bg-brand-600 px-4 py-2 font-semibold text-white hover:bg-brand-700">Áp dụng</button></form>
    {filter.error && <p role="alert" className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{filter.error}</p>}
    {error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">Không tải được thống kê. Hãy áp dụng migration `202610130003_dashboard_stats_rpc.sql` và tải lại trang. Chi tiết: {error.message}</p>}
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{cards.map(([label, value, color]) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p></article>)}</div>
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="mb-2"><h2 className="text-lg font-semibold">Lượt nghỉ theo {filter.granularity === 'daily' ? 'ngày' : 'tháng'}</h2><p className="mt-1 text-sm text-slate-500">{filter.start && new Date(`${filter.start}T00:00:00`).toLocaleDateString('vi-VN')} – {filter.end && new Date(`${filter.end}T00:00:00`).toLocaleDateString('vi-VN')}</p></div>{stats?.chart?.length ? <AttendanceChart data={stats.chart} /> : <p className="py-12 text-center text-sm text-slate-500">Chưa có dữ liệu biểu đồ.</p>}</section>
    <div className="grid gap-4 lg:grid-cols-3"><RankCard title="Nghỉ nhiều nhất" data={stats?.top_absences ?? []} color="#2563eb" /><RankCard title="Nghỉ có phép nhiều nhất" data={stats?.top_permitted ?? []} color="#b45309" /><RankCard title="Nghỉ không phép nhiều nhất" data={stats?.top_unpermitted ?? []} color="#b91c1c" /></div>
  </div></main>;
}
