'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const baseSchema = z.object({
  full_name: z.string().trim().min(2, 'Nhập họ tên hợp lệ.').max(120),
  username: z.string().trim().toLowerCase().min(3, 'Tên đăng nhập cần ít nhất 3 ký tự.').max(32).regex(/^[a-z0-9._-]+$/, 'Chỉ dùng chữ thường, số, dấu chấm, gạch dưới hoặc gạch ngang.'),
  class_name: z.string().trim().min(1, 'Nhập lớp chủ nhiệm.').max(30),
  phone: z.string().trim().max(20).optional(),
});

async function requireAdmin() {
  const session = await createClient();
  const { data: { user } } = await session.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await session.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'ADMIN') redirect('/dashboard');
  return user;
}
function value(form: FormData, key: string) { return String(form.get(key) ?? '').trim(); }
function back(message: string): never { redirect(`/admin/teachers?notice=${encodeURIComponent(message)}`); }

export async function createTeacher(form: FormData) {
  await requireAdmin();
  const parsed = baseSchema.extend({ password: z.string().min(8, 'Mật khẩu cần ít nhất 8 ký tự.') }).safeParse({
    full_name: value(form, 'full_name'), username: value(form, 'username'), class_name: value(form, 'class_name'), phone: value(form, 'phone') || undefined, password: value(form, 'password'),
  });
  if (!parsed.success) back(parsed.error.issues[0].message);
  const admin = createAdminClient();
  const email = `${parsed.data.username}@school.local`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: parsed.data.password, email_confirm: true });
  if (error || !data.user) back(error?.message.includes('already') ? 'Tên đăng nhập đã tồn tại.' : `Không tạo được tài khoản: ${error?.message ?? 'Lỗi không xác định'}`);
  const { error: profileError } = await admin.from('profiles').insert({ id: data.user.id, full_name: parsed.data.full_name, username: parsed.data.username, role: 'TEACHER', class_name: parsed.data.class_name, phone: parsed.data.phone ?? null });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    back(profileError.code === '23505' ? 'Tên đăng nhập đã tồn tại.' : `Không tạo được hồ sơ giáo viên: ${profileError.message}`);
  }
  revalidatePath('/admin/teachers');
  back('Đã thêm giáo viên.');
}

export async function updateTeacher(form: FormData) {
  await requireAdmin();
  const id = value(form, 'id');
  const parsed = baseSchema.extend({ id: z.string().uuid(), password: z.string().optional() }).safeParse({
    id, full_name: value(form, 'full_name'), username: value(form, 'username'), class_name: value(form, 'class_name'), phone: value(form, 'phone') || undefined, password: value(form, 'password'),
  });
  if (!parsed.success) back(parsed.error.issues[0].message);
  if (parsed.data.password && parsed.data.password.length < 8) back('Mật khẩu mới cần ít nhất 8 ký tự.');
  const admin = createAdminClient();
  const { data: target } = await admin.from('profiles').select('id, role').eq('id', id).single();
  if (!target || target.role !== 'TEACHER') back('Không tìm thấy giáo viên.');
  const { data: authUser } = await admin.auth.admin.getUserById(id);
  const email = `${parsed.data.username}@school.local`;
  const update: { email: string; password?: string; email_confirm: boolean } = { email, email_confirm: true };
  if (parsed.data.password) update.password = parsed.data.password;
  const { error: authError } = await admin.auth.admin.updateUserById(id, update);
  if (authError) back(authError.message.includes('already') ? 'Tên đăng nhập đã tồn tại.' : `Không cập nhật được tài khoản: ${authError.message}`);
  const { error } = await admin.from('profiles').update({ full_name: parsed.data.full_name, username: parsed.data.username, class_name: parsed.data.class_name, phone: parsed.data.phone ?? null }).eq('id', id);
  if (error) {
    // Giữ email Auth nhất quán nếu cập nhật profile thất bại.
    if (authUser.user?.email) await admin.auth.admin.updateUserById(id, { email: authUser.user.email, email_confirm: true });
    back(error.code === '23505' ? 'Tên đăng nhập đã tồn tại.' : `Không cập nhật được hồ sơ: ${error.message}`);
  }
  revalidatePath('/admin/teachers');
  back('Đã cập nhật thông tin giáo viên.');
}

export async function deleteTeacher(form: FormData) {
  const actor = await requireAdmin();
  const id = z.string().uuid().safeParse(value(form, 'id'));
  if (!id.success) back('Mã giáo viên không hợp lệ.');
  if (actor.id === id.data) back('Bạn không thể xóa tài khoản quản trị đang sử dụng.');
  const admin = createAdminClient();
  const { data: teacher } = await admin.from('profiles').select('id, role').eq('id', id.data).single();
  if (!teacher || teacher.role !== 'TEACHER') back('Không tìm thấy giáo viên.');
  const { count, error: countError } = await admin.from('students').select('id', { count: 'exact', head: true }).eq('teacher_id', id.data);
  if (countError) back(`Không kiểm tra được danh sách học sinh: ${countError.message}`);
  if (count) back(`Không thể xóa: giáo viên vẫn còn ${count} học sinh. Hãy chuyển hoặc xóa học sinh trước.`);
  const { error } = await admin.auth.admin.deleteUser(id.data);
  if (error) back(`Không xóa được giáo viên: ${error.message}`);
  revalidatePath('/admin/teachers');
  back('Đã xóa tài khoản giáo viên.');
}
