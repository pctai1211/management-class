-- Thống kê được tính trong PostgreSQL và chạy dưới quyền người gọi (RLS vẫn áp dụng).
create or replace function public.get_teacher_attendance_stats(
  p_start date,
  p_end date,
  p_granularity text default 'daily'
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'Yêu cầu đăng nhập.' using errcode = '28000';
  end if;
  if not exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'TEACHER') then
    raise exception 'Chức năng chỉ dành cho giáo viên.' using errcode = '42501';
  end if;
  if p_start is null or p_end is null or p_end < p_start then
    raise exception 'Khoảng ngày không hợp lệ.' using errcode = '22023';
  end if;
  if p_granularity is null or p_granularity not in ('daily', 'monthly') then
    raise exception 'Kiểu nhóm biểu đồ không hợp lệ.' using errcode = '22023';
  end if;

  with
  teacher_students as (
    select s.id, s.full_name
    from public.students s
    where s.teacher_id = auth.uid()
  ),
  period_attendance as (
    select a.student_id, s.full_name, a.date, st.code
    from public.attendance a
    join teacher_students s on s.id = a.student_id
    join public.attendance_statuses st on st.id = a.status_id
    where a.date between p_start and p_end
  ),
  summary as (
    select
      (select count(*) from teacher_students) as student_count,
      count(*) as absence_count,
      count(*) filter (where code = 'P') as permitted_count,
      count(*) filter (where code = 'K') as unpermitted_count,
      count(distinct student_id) as students_absent
    from period_attendance
  ),
  buckets as (
    select generate_series(
      date_trunc(case when p_granularity = 'daily' then 'day' else 'month' end, p_start::timestamp),
      date_trunc(case when p_granularity = 'daily' then 'day' else 'month' end, p_end::timestamp),
      case when p_granularity = 'daily' then interval '1 day' else interval '1 month' end
    )::date as bucket
  ),
  chart_counts as (
    select date_trunc(case when p_granularity = 'daily' then 'day' else 'month' end, date::timestamp)::date as bucket,
      count(*) as total,
      count(*) filter (where code = 'P') as permitted,
      count(*) filter (where code = 'K') as unpermitted
    from period_attendance group by 1
  ),
  chart as (
    select b.bucket,
      coalesce(c.total, 0) as total,
      coalesce(c.permitted, 0) as permitted,
      coalesce(c.unpermitted, 0) as unpermitted
    from buckets b left join chart_counts c using (bucket)
    order by b.bucket
  ),
  ranked as (
    select student_id, full_name,
      count(*) as total,
      count(*) filter (where code = 'P') as permitted,
      count(*) filter (where code = 'K') as unpermitted
    from period_attendance group by student_id, full_name
  )
  select jsonb_build_object(
    'summary', (select to_jsonb(summary) from summary),
    'chart', coalesce((select jsonb_agg(jsonb_build_object(
      'bucket', bucket,
      'label', case when p_granularity = 'daily' then to_char(bucket, 'DD/MM') else to_char(bucket, 'MM/YYYY') end,
      'total', total, 'permitted', permitted, 'unpermitted', unpermitted
    ) order by bucket) from chart), '[]'::jsonb),
    'top_absences', coalesce((select jsonb_agg(jsonb_build_object('student_id', student_id, 'full_name', full_name, 'count', total) order by total desc, full_name) from (select * from ranked order by total desc, full_name limit 10) q), '[]'::jsonb),
    'top_permitted', coalesce((select jsonb_agg(jsonb_build_object('student_id', student_id, 'full_name', full_name, 'count', permitted) order by permitted desc, full_name) from (select * from ranked where permitted > 0 order by permitted desc, full_name limit 10) q), '[]'::jsonb),
    'top_unpermitted', coalesce((select jsonb_agg(jsonb_build_object('student_id', student_id, 'full_name', full_name, 'count', unpermitted) order by unpermitted desc, full_name) from (select * from ranked where unpermitted > 0 order by unpermitted desc, full_name limit 10) q), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.get_teacher_attendance_stats(date, date, text) from public;
grant execute on function public.get_teacher_attendance_stats(date, date, text) to authenticated;
