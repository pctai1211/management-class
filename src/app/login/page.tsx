import { signIn } from './actions';

const errors: Record<string, string> = { invalid: 'Vui lòng nhập tên đăng nhập và mật khẩu.', credentials: 'Tên đăng nhập hoặc mật khẩu không đúng.', profile: 'Tài khoản chưa được thiết lập hồ sơ. Vui lòng liên hệ quản trị viên.' };
export default async function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return <main className="flex min-h-screen items-center justify-center px-4 py-10"><div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
    <div className="mb-8"><div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-100 text-xl">🎓</div><h1 className="text-2xl font-bold">Quản lý học sinh</h1><p className="mt-2 text-sm text-slate-500">Đăng nhập dành cho giáo viên và quản trị viên</p></div>
    {searchParams.error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors[searchParams.error] ?? 'Đã xảy ra lỗi. Vui lòng thử lại.'}</p>}
    <form action={signIn} className="space-y-4"><label className="block text-sm font-medium">Tên đăng nhập<input name="username" autoComplete="username" required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" /></label><label className="block text-sm font-medium">Mật khẩu<input name="password" type="password" autoComplete="current-password" required className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100" /></label><button className="w-full rounded-lg bg-brand-600 px-4 py-2.5 font-semibold text-white hover:bg-brand-700">Đăng nhập</button></form>
  </div></main>;
}
