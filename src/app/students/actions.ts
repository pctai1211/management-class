"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

const phoneSchema = z
  .string()
  .trim()
  .refine(
    (v) => !v || /^(?:(?:\+?84)|0)(?:3|5|7|8|9)\d{8}$/.test(v),
    "Số điện thoại Việt Nam chưa đúng định dạng.",
  );
const fields = z.object({
  full_name: z.string().trim().min(1, "Vui lòng nhập họ tên.").max(150),
  date_of_birth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày sinh không hợp lệ.")
    .refine((v) => {
      const d = new Date(`${v}T00:00:00Z`);
      return !Number.isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === v && d <= new Date();
    }, "Ngày sinh không hợp lệ hoặc ở tương lai."),
  address: z.string().trim().max(300).optional(),
  phone: phoneSchema,
});
const importedRow = fields;
function field(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}
function go(message: string, error = false): never {
  redirect(`/students?${error ? "error" : "notice"}=${encodeURIComponent(message)}`);
}
async function teacherContext() {
  const profile = await requireRole("TEACHER");
  return { profile, supabase: await createClient() };
}

export async function createStudent(form: FormData) {
  const { profile, supabase } = await teacherContext();
  const parsed = fields.safeParse({
    full_name: field(form, "full_name"),
    date_of_birth: field(form, "date_of_birth"),
    address: field(form, "address") || undefined,
    phone: field(form, "phone"),
  });
  if (!parsed.success) go(parsed.error.issues[0].message, true);
  const { error } = await supabase
    .from("students")
    .insert({ ...parsed.data, teacher_id: profile.id });
  if (error) go(`Không thêm được học sinh: ${error.message}`, true);
  revalidatePath("/students");
  go("Đã thêm học sinh.");
}

export async function updateStudent(form: FormData) {
  const { profile, supabase } = await teacherContext();
  const id = z.string().uuid().safeParse(field(form, "id"));
  if (!id.success) go("Mã học sinh không hợp lệ.", true);
  const parsed = fields.safeParse({
    full_name: field(form, "full_name"),
    date_of_birth: field(form, "date_of_birth"),
    address: field(form, "address") || undefined,
    phone: field(form, "phone"),
  });
  if (!parsed.success) go(parsed.error.issues[0].message, true);
  const { data, error } = await supabase
    .from("students")
    .update(parsed.data)
    .eq("id", id.data)
    .eq("teacher_id", profile.id)
    .select("id")
    .maybeSingle();
  if (error || !data)
    go(
      error
        ? `Không cập nhật được: ${error.message}`
        : "Không tìm thấy học sinh trong lớp của bạn.",
      true,
    );
  revalidatePath("/students");
  go("Đã cập nhật thông tin học sinh.");
}

export async function deleteStudent(form: FormData) {
  const { profile, supabase } = await teacherContext();
  const id = z.string().uuid().safeParse(field(form, "id"));
  if (!id.success) go("Mã học sinh không hợp lệ.", true);
  const { data, error } = await supabase
    .from("students")
    .delete()
    .eq("id", id.data)
    .eq("teacher_id", profile.id)
    .select("id")
    .maybeSingle();
  if (error || !data)
    go(
      error
        ? `Không xóa được học sinh: ${error.message}`
        : "Không tìm thấy học sinh trong lớp của bạn.",
      true,
    );
  revalidatePath("/students");
  go("Đã xóa học sinh và dữ liệu điểm danh liên quan.");
}

export async function importStudents(rows: unknown) {
  const { profile, supabase } = await teacherContext();
  const parsed = z
    .array(importedRow)
    .min(1, "Không có dòng hợp lệ để nhập.")
    .max(500, "Mỗi lần nhập tối đa 500 học sinh.")
    .safeParse(rows);
  if (!parsed.success) go(parsed.error.issues[0].message, true);
  const batch = parsed.data.map((row) => ({ ...row, teacher_id: profile.id }));
  const { error } = await supabase.from("students").insert(batch);
  if (error) go(`Không nhập được dữ liệu: ${error.message}`, true);
  revalidatePath("/students");
  go(`Đã nhập ${batch.length} học sinh.`);
}
