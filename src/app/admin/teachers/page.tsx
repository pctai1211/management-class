import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createTeacher, updateTeacher } from "./actions";
import { signOut } from "@/app/logout/actions";
import { ConfirmDelete } from "./confirm-delete";

type Teacher = {
  id: string;
  full_name: string;
  username: string;
  class_name: string | null;
  phone: string | null;
  created_at: string;
};
export default async function TeachersPage({
  searchParams,
}: {
  searchParams: { notice?: string };
}) {
  await requireRole("ADMIN");
  const supabase = await createClient();
  const { data: teachers, error } = await supabase
    .from("profiles")
    .select("id, full_name, username, class_name, phone, created_at")
    .eq("role", "TEACHER")
    .order("full_name");
  const { data: students } = await supabase.from("students").select("teacher_id");
  const counts = new Map<string, number>();
  students?.forEach((s) => counts.set(s.teacher_id, (counts.get(s.teacher_id) ?? 0) + 1));
  return (
    <main className="min-h-screen px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-brand-600">QUẢN TRỊ HỆ THỐNG</p>
            <h1 className="mt-1 text-3xl font-bold">Quản lý giáo viên</h1>
            <p className="mt-2 text-slate-500">
              Thêm tài khoản, phân lớp và quản lý thông tin giáo viên.
            </p>
          </div>
          <form action={signOut}>
            <button className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-white">
              Đăng xuất
            </button>
          </form>
        </header>
        {searchParams.notice && (
          <div
            className="mb-5 rounded-lg border border-brand-100 bg-brand-50 p-3 text-sm text-brand-700"
            role="status"
          >
            {searchParams.notice}
          </div>
        )}
        {error && (
          <div role="alert" className="mb-5 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            Không tải được danh sách giáo viên: {error.message}
          </div>
        )}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Thêm giáo viên</h2>
          <form action={createTeacher} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-medium">
              Họ và tên
              <input
                name="full_name"
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Tên đăng nhập
              <input
                name="username"
                required
                autoCapitalize="none"
                autoComplete="off"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Mật khẩu ban đầu
              <input
                name="password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Lớp chủ nhiệm
              <input
                name="class_name"
                required
                placeholder="Ví dụ: 10A1"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Số điện thoại
              <input
                name="phone"
                type="tel"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </label>
            <div className="flex items-end">
              <button className="rounded-lg bg-brand-600 px-5 py-2 font-semibold text-white hover:bg-brand-700">
                Thêm giáo viên
              </button>
            </div>
          </form>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold">
              Danh sách giáo viên{" "}
              <span className="ml-1 text-sm font-normal text-slate-500">
                ({teachers?.length ?? 0})
              </span>
            </h2>
          </div>
          {!teachers?.length ? (
            <p className="p-8 text-center text-slate-500">Chưa có giáo viên nào.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3">Họ tên</th>
                    <th className="px-5 py-3">Tên đăng nhập</th>
                    <th className="px-5 py-3">Lớp chủ nhiệm</th>
                    <th className="px-5 py-3">Điện thoại</th>
                    <th className="px-5 py-3">Học sinh</th>
                    <th className="px-5 py-3">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(teachers as Teacher[]).map((t) => (
                    <tr key={t.id} className="align-top">
                      <td className="px-5 py-4 font-medium">{t.full_name}</td>
                      <td className="px-5 py-4">{t.username}</td>
                      <td className="px-5 py-4">{t.class_name || "—"}</td>
                      <td className="px-5 py-4">{t.phone || "—"}</td>
                      <td className="px-5 py-4">{counts.get(t.id) ?? 0}</td>
                      <td className="px-5 py-3">
                        <details>
                          <summary className="cursor-pointer font-medium text-brand-700">
                            Sửa thông tin
                          </summary>
                          <form
                            action={updateTeacher}
                            className="mt-3 grid gap-2 rounded-lg bg-slate-50 p-3"
                          >
                            <input type="hidden" name="id" value={t.id} />
                            <label>
                              Họ tên
                              <input
                                name="full_name"
                                required
                                defaultValue={t.full_name}
                                className="mt-1 block w-full rounded border px-2 py-1.5"
                              />
                            </label>
                            <label>
                              Tên đăng nhập
                              <input
                                name="username"
                                required
                                defaultValue={t.username}
                                className="mt-1 block w-full rounded border px-2 py-1.5"
                              />
                            </label>
                            <label>
                              Lớp chủ nhiệm
                              <input
                                name="class_name"
                                required
                                defaultValue={t.class_name ?? ""}
                                className="mt-1 block w-full rounded border px-2 py-1.5"
                              />
                            </label>
                            <label>
                              Số điện thoại
                              <input
                                name="phone"
                                defaultValue={t.phone ?? ""}
                                className="mt-1 block w-full rounded border px-2 py-1.5"
                              />
                            </label>
                            <label>
                              Mật khẩu mới{" "}
                              <span className="font-normal text-slate-500">
                                (để trống nếu không đổi)
                              </span>
                              <input
                                name="password"
                                type="password"
                                minLength={8}
                                autoComplete="new-password"
                                className="mt-1 block w-full rounded border px-2 py-1.5"
                              />
                            </label>
                            <button className="rounded bg-brand-600 px-3 py-2 text-white">
                              Lưu thay đổi
                            </button>
                          </form>
                          <ConfirmDelete id={t.id} studentCount={counts.get(t.id) ?? 0} />
                        </details>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <p className="mt-5 text-xs text-slate-500">
          Thông tin tài khoản được xử lý phía máy chủ bằng Supabase Admin API.
        </p>
      </div>
    </main>
  );
}
