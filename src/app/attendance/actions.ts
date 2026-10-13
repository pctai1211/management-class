'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const id = z.string().uuid();
const statusInput = z.object({ name: z.string().trim().min(1).max(40), code: z.string().trim().toUpperCase().min(1).max(5).regex(/^[A-Z0-9]+$/, 'Mã chỉ gồm chữ và số.'), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) });
async function context() { const profile = await requireRole('TEACHER'); return { profile, supabase: await createClient() }; }

export async function saveAttendance(studentId: string, date: string, statusId: string | null) {
  const { profile, supabase } = await context();
  const valid = z.object({ studentId: id, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), statusId: id.nullable() }).safeParse({ studentId, date, statusId });
  if (!valid.success) return { ok: false, error: 'Dữ liệu điểm danh không hợp lệ.' };
  if (statusId) {
    const { data: status } = await supabase.from('attendance_statuses').select('id').eq('id', statusId).eq('teacher_id', profile.id).maybeSingle();
    if (!status) return { ok: false, error: 'Trạng thái không thuộc lớp của bạn.' };
  }
  if (!statusId) {
    const { error } = await supabase.from('attendance').delete().eq('student_id', studentId).eq('date', date);
    if (error) return { ok: false, error: 'Không xóa được lượt điểm danh.' };
  } else {
    const { error } = await supabase.from('attendance').upsert({ student_id: studentId, date, status_id: statusId }, { onConflict: 'student_id,date' });
    if (error) return { ok: false, error: 'Không lưu được điểm danh. Hãy tải lại và thử lại.' };
  }
  revalidatePath('/attendance');
  return { ok: true };
}

export async function createAttendanceStatus(input: unknown) {
  const { profile, supabase } = await context();
  const parsed = statusInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { error } = await supabase.from('attendance_statuses').insert({ ...parsed.data, teacher_id: profile.id, sort_order: 10 });
  if (error) return { ok: false, error: error.code === '23505' ? 'Mã trạng thái đã được dùng trong lớp.' : 'Không thêm được trạng thái.' };
  revalidatePath('/attendance');
  return { ok: true };
}

export async function updateAttendanceStatus(statusId: string, input: unknown) {
  const { profile, supabase } = await context();
  const validId = id.safeParse(statusId); const parsed = statusInput.safeParse(input);
  if (!validId.success || !parsed.success) return { ok: false, error: parsed.success ? 'Mã trạng thái không hợp lệ.' : parsed.error.issues[0].message };
  const { error } = await supabase.from('attendance_statuses').update(parsed.data).eq('id', statusId).eq('teacher_id', profile.id);
  if (error) return { ok: false, error: error.code === '23505' ? 'Mã trạng thái đã được dùng trong lớp.' : 'Không cập nhật được trạng thái.' };
  revalidatePath('/attendance');
  return { ok: true };
}

export async function deleteAttendanceStatus(statusId: string) {
  const { profile, supabase } = await context();
  if (!id.safeParse(statusId).success) return { ok: false, error: 'Mã trạng thái không hợp lệ.' };
  const { error } = await supabase.from('attendance_statuses').delete().eq('id', statusId).eq('teacher_id', profile.id);
  if (error) return { ok: false, error: error.code === '23503' ? 'Không thể xóa vì trạng thái đang được dùng trong điểm danh.' : 'Không xóa được trạng thái.' };
  revalidatePath('/attendance');
  return { ok: true };
}
