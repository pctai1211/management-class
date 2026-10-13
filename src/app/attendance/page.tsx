import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MonthGrid } from "./month-grid";
import { StatusDialog, type AttendanceStatus } from "./status-dialog";

type Params = { month?: string };
function monthValue(input?: string) {
  if (input && /^\d{4}-(0[1-9]|1[0-2])$/.test(input)) {
    const [year, month] = input.split("-").map(Number);
    if (year >= 2000 && year <= 2100) return { year, month };
  }
  const today = new Date();
  return { year: today.getFullYear(), month: today.getMonth() + 1 };
}
function shiftMonth(year: number, month: number, offset: number) {
  const date = new Date(year, month - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
export default async function AttendancePage({ searchParams }: { searchParams: Params }) {
  const profile = await requireRole("TEACHER");
  const { year, month } = monthValue(searchParams.month);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = shiftMonth(year, month, 1);
  const end = `${nextMonth}-01`;
  const days = new Date(year, month, 0).getDate();
  const supabase = await createClient();
  const [studentsResult, statusesResult, attendanceResult] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name")
      .eq("teacher_id", profile.id)
      .order("full_name"),
    supabase
      .from("attendance_statuses")
      .select("id, name, code, color, sort_order")
      .eq("teacher_id", profile.id)
      .order("sort_order"),
    supabase
      .from("attendance")
      .select("student_id, date, status_id, note")
      .gte("date", start)
      .lt("date", end)
      .order("date"),
  ]);
  const title = new Date(year, month - 1, 1).toLocaleDateString("vi-VN", {
    month: "long",
    year: "numeric",
  });
  const statuses = (statusesResult.data ?? []) as AttendanceStatus[];
  return (
    <main className="min-h-screen px-3 py-6 sm:px-6">
      <div className="mx-auto max-w-[1600px]">
        <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-sm font-medium text-brand-700">
              ← Trang chủ
            </Link>
            <p className="mt-2 text-sm font-medium text-brand-600">
              {profile.class_name || "Lớp chủ nhiệm"}
            </p>
            <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Điểm danh theo tháng</h1>
            <p className="mt-1 text-sm text-slate-500">{profile.full_name}</p>
          </div>
          <StatusDialog statuses={statuses} />
        </header>
        <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Link
                href={`/attendance?month=${shiftMonth(year, month, -1)}`}
                aria-label="Tháng trước"
                className="rounded-lg border px-3 py-2 hover:bg-slate-50"
              >
                ←
              </Link>
              <form action="/attendance" className="flex items-center gap-2">
                <input
                  aria-label="Chọn tháng"
                  type="month"
                  name="month"
                  defaultValue={`${year}-${String(month).padStart(2, "0")}`}
                  className="rounded-lg border border-slate-300 px-3 py-2 font-semibold"
                />
                <button className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white">
                  Chọn
                </button>
              </form>
              <Link
                href={`/attendance?month=${shiftMonth(year, month, 1)}`}
                aria-label="Tháng sau"
                className="rounded-lg border px-3 py-2 hover:bg-slate-50"
              >
                →
              </Link>
              <h2 className="ml-1 hidden font-semibold capitalize sm:block">{title}</h2>
            </div>
            <p className="text-xs text-slate-500">
              Bấm ô để chuyển trạng thái · dấu ✓ nghĩa là đã lưu
            </p>
          </div>
          {studentsResult.error && (
            <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Không tải được danh sách học sinh.
            </p>
          )}
          {attendanceResult.error && (
            <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Không tải được điểm danh tháng này.
            </p>
          )}
          {statusesResult.error && (
            <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              Không tải được cấu hình trạng thái.
            </p>
          )}
          {!studentsResult.data?.length ? (
            <div className="rounded-xl bg-slate-50 px-4 py-12 text-center">
              <p className="font-medium">Chưa có học sinh nào</p>
              <Link href="/students/new" className="mt-2 inline-block text-sm text-brand-700">
                Thêm học sinh
              </Link>
            </div>
          ) : !statuses.length ? (
            <div className="mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Hãy tạo ít nhất một trạng thái trong phần cấu hình để bắt đầu điểm danh.
            </div>
          ) : null}
          {!!studentsResult.data?.length && (
            <MonthGrid
              students={studentsResult.data}
              statuses={statuses}
              entries={attendanceResult.data ?? []}
              year={year}
              month={month}
              days={days}
            />
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {statuses.map((status) => (
              <span key={status.id} className="inline-flex items-center gap-1.5 text-sm">
                <span
                  className="inline-flex h-6 min-w-6 items-center justify-center rounded px-1 text-xs font-bold"
                  style={{
                    backgroundColor: status.color,
                    color: status.code === "P" ? "#713f12" : "#fff",
                  }}
                >
                  {status.code}
                </span>
                {status.name}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 text-sm text-slate-500">
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded bg-slate-100 text-xs">
                ·
              </span>
              Có mặt
            </span>
          </div>
        </section>
      </div>
    </main>
  );
}
