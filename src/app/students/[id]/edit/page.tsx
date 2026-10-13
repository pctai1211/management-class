import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { updateStudent } from '../../actions';

export default async function EditStudentPage({ params }: { params: { id: string } }) {
  const profile = await requireRole('TEACHER');
  const supabase = await createClient();
  const { data: student } = await supabase.from('students').select('id, full_name, date_of_birth, address, phone').eq('id', params.id).eq('teacher_id', profile.id).maybeSingle();
  if (!student) notFound();
  return <main className="mx-auto max-w-3xl px-4 py-8 sm:px-8"><Link href="/students" className="text-sm font-medium text-brand-700">← Danh sách học sinh</Link><h1 className="mb-7 mt-5 text-3xl font-bold">Sửa thông tin học sinh</h1><form action={updateStudent} className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2"><input type="hidden" name="id" value={student.id} /><label className="text-sm font-medium sm:col-span-2">Họ và tên<input name="full_name" required defaultValue={student.full_name} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="text-sm font-medium">Ngày sinh<input name="date_of_birth" type="date" required defaultValue={student.date_of_birth} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="text-sm font-medium">Số điện thoại<input name="phone" type="tel" defaultValue={student.phone ?? ''} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="text-sm font-medium sm:col-span-2">Địa chỉ<input name="address" defaultValue={student.address ?? ''} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><div className="flex gap-3 sm:col-span-2"><button className="rounded-lg bg-brand-600 px-5 py-2.5 font-semibold text-white">Lưu thay đổi</button><Link href="/students" className="rounded-lg border border-slate-300 px-5 py-2.5">Hủy</Link></div></form></main>;
}
