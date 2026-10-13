import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type UserRole = 'ADMIN' | 'TEACHER';
export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from('profiles').select('id, full_name, username, role, class_name, phone').eq('id', user.id).single();
  return profile;
}
export async function requireRole(role?: UserRole) {
  const profile = await getCurrentProfile();
  if (!profile) redirect('/login');
  if (role && profile.role !== role) redirect(profile.role === 'ADMIN' ? '/admin/teachers' : '/dashboard');
  return profile;
}
