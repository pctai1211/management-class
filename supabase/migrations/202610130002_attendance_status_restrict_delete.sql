-- Bảo toàn lịch sử: không cascade xóa các lượt điểm danh khi xóa trạng thái.
alter table public.attendance drop constraint if exists attendance_status_id_fkey;
alter table public.attendance
  add constraint attendance_status_id_fkey
  foreign key (status_id) references public.attendance_statuses(id) on delete restrict;
