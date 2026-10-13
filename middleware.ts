import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { get(name) { return request.cookies.get(name)?.value; }, set(name, value, options) { request.cookies.set({ name, value, ...options }); response = NextResponse.next({ request }); response.cookies.set({ name, value, ...options }); }, remove(name, options) { request.cookies.set({ name, value: '', ...options }); response = NextResponse.next({ request }); response.cookies.set({ name, value: '', ...options }); } },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  if (!user && path !== '/login') return NextResponse.redirect(new URL('/login', request.url));
  if (!user) return response;
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (path === '/login') return NextResponse.redirect(new URL(profile?.role === 'ADMIN' ? '/admin/teachers' : '/dashboard', request.url));
  if (!profile) return NextResponse.redirect(new URL('/login?error=profile', request.url));
  if (path.startsWith('/admin') && profile.role !== 'ADMIN') return NextResponse.redirect(new URL('/dashboard', request.url));
  if (profile.role === 'ADMIN' && !path.startsWith('/admin')) return NextResponse.redirect(new URL('/admin/teachers', request.url));
  return response;
}

export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] };
