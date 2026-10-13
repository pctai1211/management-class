-- Nền tảng dữ liệu của ứng dụng quản lý học sinh.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  username text not null unique,
  role text not null default 'TEACHER' check (role in ('ADMIN', 'TEACHER')),
  class_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  date_of_birth date not null,
  address text,
  phone text,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.attendance_statuses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  color text not null check (color ~ '^#[0-9A-Fa-f]{6}$'),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (teacher_id, code)
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  date date not null,
  status_id uuid not null references public.attendance_statuses(id) on delete cascade,
  note text,
  created_at timestamptz not null default now(),
  unique (student_id, date)
);

create index students_teacher_id_idx on public.students(teacher_id);
create index attendance_student_date_idx on public.attendance(student_id, date);
create index attendance_date_idx on public.attendance(date);
create index attendance_statuses_teacher_id_idx on public.attendance_statuses(teacher_id);

-- Hàm SECURITY DEFINER tránh policy profiles tự gọi đệ quy.
create or replace function public.is_admin()
returns boolean language sql stable security definer
set search_path = public, pg_temp
as $$ select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'ADMIN'); $$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Tạo hai trạng thái mặc định cho mỗi giáo viên vừa được cấp profile.
create or replace function public.create_default_attendance_statuses()
returns trigger language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if new.role = 'TEACHER' then
    insert into public.attendance_statuses (name, code, color, teacher_id, sort_order)
    values ('Có phép', 'P', '#FACC15', new.id, 1), ('Không phép', 'K', '#EF4444', new.id, 2);
  end if;
  return new;
end;
$$;
create trigger profiles_default_attendance_statuses
after insert on public.profiles for each row execute function public.create_default_attendance_statuses();

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.attendance_statuses enable row level security;
alter table public.attendance enable row level security;

create policy "profiles_select_self_or_admin" on public.profiles for select to authenticated using (id = (select auth.uid()) or public.is_admin());
-- Hồ sơ chỉ do ADMIN sửa; giáo viên không được tự đổi role của mình.
create policy "profiles_update_admin_only" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "students_select_owner_or_admin" on public.students for select to authenticated using (teacher_id = (select auth.uid()) or public.is_admin());
create policy "students_insert_owner_or_admin" on public.students for insert to authenticated with check (teacher_id = (select auth.uid()) or public.is_admin());
create policy "students_update_owner_or_admin" on public.students for update to authenticated using (teacher_id = (select auth.uid()) or public.is_admin()) with check (teacher_id = (select auth.uid()) or public.is_admin());
create policy "students_delete_owner_or_admin" on public.students for delete to authenticated using (teacher_id = (select auth.uid()) or public.is_admin());

create policy "statuses_select_owner_or_admin" on public.attendance_statuses for select to authenticated using (teacher_id = (select auth.uid()) or public.is_admin());
create policy "statuses_insert_owner_or_admin" on public.attendance_statuses for insert to authenticated with check (teacher_id = (select auth.uid()) or public.is_admin());
create policy "statuses_update_owner_or_admin" on public.attendance_statuses for update to authenticated using (teacher_id = (select auth.uid()) or public.is_admin()) with check (teacher_id = (select auth.uid()) or public.is_admin());
create policy "statuses_delete_owner_or_admin" on public.attendance_statuses for delete to authenticated using (teacher_id = (select auth.uid()) or public.is_admin());

create policy "attendance_select_owner_or_admin" on public.attendance for select to authenticated using (
  exists (select 1 from public.students s where s.id = student_id and (s.teacher_id = (select auth.uid()) or public.is_admin()))
  and exists (select 1 from public.attendance_statuses st where st.id = status_id and (st.teacher_id = (select auth.uid()) or public.is_admin()))
);
create policy "attendance_insert_owner_or_admin" on public.attendance for insert to authenticated with check (
  exists (select 1 from public.students s where s.id = student_id and (s.teacher_id = (select auth.uid()) or public.is_admin()))
  and exists (select 1 from public.attendance_statuses st where st.id = status_id and (st.teacher_id = (select auth.uid()) or public.is_admin()))
);
create policy "attendance_update_owner_or_admin" on public.attendance for update to authenticated using (
  exists (select 1 from public.students s where s.id = student_id and (s.teacher_id = (select auth.uid()) or public.is_admin()))
) with check (
  exists (select 1 from public.students s where s.id = student_id and (s.teacher_id = (select auth.uid()) or public.is_admin()))
  and exists (select 1 from public.attendance_statuses st where st.id = status_id and (st.teacher_id = (select auth.uid()) or public.is_admin()))
);
create policy "attendance_delete_owner_or_admin" on public.attendance for delete to authenticated using (
  exists (select 1 from public.students s where s.id = student_id and (s.teacher_id = (select auth.uid()) or public.is_admin()))
);

grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.students, public.attendance, public.attendance_statuses to authenticated;
