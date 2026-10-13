import { redirect } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';

export default async function HomePage() {
  const profile = await getCurrentProfile();
  redirect(profile ? (profile.role === 'ADMIN' ? '/admin/teachers' : '/dashboard') : '/login');
}
