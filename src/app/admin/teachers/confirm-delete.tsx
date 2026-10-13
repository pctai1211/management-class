"use client";

import type { FormEvent } from "react";
import { deleteTeacher } from "./actions";

export function ConfirmDelete({ id, studentCount }: { id: string; studentCount: number }) {
  function confirm(event: FormEvent<HTMLFormElement>) {
    const warning =
      studentCount > 0
        ? `Giáo viên này còn ${studentCount} học sinh nên hiện không thể xóa. Hãy chuyển hoặc xóa học sinh trước.`
        : "Bạn có chắc muốn xóa tài khoản giáo viên này?";
    if (studentCount > 0 || !window.confirm(warning)) event.preventDefault();
  }
  return (
    <form action={deleteTeacher} onSubmit={confirm} className="mt-2">
      <input type="hidden" name="id" value={id} />
      <button className="rounded border border-red-200 px-3 py-2 text-red-700">
        Xóa giáo viên
      </button>
      <p className="mt-1 text-xs text-slate-500">Không thể xóa khi giáo viên còn học sinh.</p>
    </form>
  );
}
