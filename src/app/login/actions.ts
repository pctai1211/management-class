'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const loginSchema = z.object({ username: z.string().trim().min(1), password: z.string().min(1) });
export async function signIn(formData: FormData) {
  const parsed = loginSchema.safeParse({ username: formData.get('username'), password: formData.get('password') });
  if (!parsed.success) redirect('/login?error=invalid');
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.username, password: parsed.data.password });
  console.log('error', error);
  if (error) redirect('/login?error=credentials');
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
  if (!profile) { await supabase.auth.signOut(); redirect('/login?error=profile'); }
  redirect(profile.role === 'ADMIN' ? '/admin/teachers' : '/dashboard');
}
