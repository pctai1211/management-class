# Quản lý học sinh dành cho giáo viên chủ nhiệm

Ứng dụng Next.js App Router + TypeScript, Tailwind CSS và Supabase. Giao diện hiện tại tập trung vào bước nền tảng: đăng nhập, phân luồng role và cấu trúc dữ liệu có RLS.

## Yêu cầu

- Node.js 20 trở lên và npm
- Một project Supabase

## Thiết lập Supabase

1. Tạo project tại [Supabase](https://supabase.com/) và chờ cơ sở dữ liệu sẵn sàng.
2. Vào **Project Settings → API** (hoặc **Data API**) để lấy Project URL, anon/public key và service_role key.
3. Sao chép `.env.example` thành `.env.local`, điền URL và anon key. Chỉ dùng service role key ở script phía server; không đặt tiền tố `NEXT_PUBLIC_`, không commit `.env.local`.
4. Chạy migration bằng Supabase CLI:

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase db push
   ```

   Hoặc mở **SQL Editor** trong Supabase Dashboard, dán toàn bộ nội dung `supabase/migrations/202610130001_initial_schema.sql` rồi chạy.

Migration tạo bốn bảng `profiles`, `students`, `attendance_statuses`, `attendance`, các index, hàm `is_admin()`, trigger tạo trạng thái mặc định cho profile TEACHER và policy RLS. Hãy tắt đăng ký công khai trong **Authentication → Settings**; tài khoản được tạo qua quy trình quản trị/seed.

## Tạo tài khoản đầu tiên

Đăng nhập cần một user trong Supabase Auth cùng profile có cùng UUID. Dùng Supabase Dashboard để tạo user email `admin@school.local` với mật khẩu ban đầu, sau đó chạy SQL sau trong SQL Editor, thay UUID bằng ID user vừa tạo:

```sql
insert into public.profiles (id, full_name, username, role)
values ('UUID-USER-VUA-TAO', 'Quản trị viên', 'admin', 'ADMIN');
```

Thông tin đăng nhập trên ứng dụng là username `admin` và mật khẩu bạn đặt lúc tạo user. Quy ước email ảo là `{username}@school.local`.

## Chạy ứng dụng

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Chưa đăng nhập sẽ được chuyển đến `/login`; đăng nhập thành công sẽ chuyển theo role trong `profiles`.

## Quản lý giáo viên (ADMIN)

Đăng nhập bằng tài khoản ADMIN để mở `/admin/teachers` (đường dẫn `/teachers` cũng được chuyển về trang này). Cần đặt `SUPABASE_SERVICE_ROLE_KEY` trong `.env.local` để tạo/sửa/xóa user và đặt lại mật khẩu. Khóa chỉ được đọc trong module server `src/lib/supabase/admin.ts`; không chuyển nó vào component trình duyệt.

Quản trị viên có thể thêm giáo viên (tài khoản Auth và profile được tạo cùng nhau), sửa thông tin hoặc đặt lại mật khẩu. Khi đổi username, email Auth được cập nhật theo quy ước `{username}@school.local`. Không thể xóa tài khoản ADMIN đang đăng nhập hoặc giáo viên còn học sinh; chuyển/xóa học sinh trước.

## Quản lý học sinh (TEACHER)

Giáo viên dùng `/students` để tìm kiếm theo tên, sắp xếp, phân trang, sửa và xóa học sinh. Form tạo/sửa kiểm tra ngày sinh và số điện thoại Việt Nam. Mỗi lần ghi đều lấy `teacher_id` từ profile trong session; policy RLS tiếp tục giới hạn dữ liệu theo `auth.uid()`.

Import nhận `.csv`/`.xlsx`, hỗ trợ ngày `dd/mm/yyyy`, xem trước từng dòng và chỉ nhập các dòng hợp lệ (tối đa 500 dòng mỗi lần). Có nút tải mẫu Excel/CSV. Export CSV dùng UTF-8 BOM để giữ tiếng Việt; export Excel tạo tệp `.xlsx`.

## Điểm danh theo tháng (TEACHER)

Mở `/attendance`, chọn tháng hoặc dùng nút tháng trước/sau. Ứng dụng chỉ truy vấn attendance trong khoảng ngày của tháng đang xem. Bấm một ô để xoay vòng từ có mặt qua từng trạng thái rồi trở về có mặt; thay đổi được lưu ngay, giao diện cập nhật trước và hoàn tác nếu lưu lỗi. Trạng thái đang được dùng trong lịch sử không thể xóa; có thể đổi tên, mã hoặc màu.

Sau khi thêm migration `202610130002_attendance_status_restrict_delete.sql`, hãy chạy lại `npx supabase db push` (hoặc dán file migration mới vào SQL Editor) để bảo toàn các bản ghi điểm danh khi quản lý trạng thái.

## Dashboard thống kê

Trang `/dashboard` hỗ trợ lọc theo tháng, năm học (từ tháng 9 đến tháng 8) hoặc khoảng ngày tùy chọn. Khoảng ngắn được vẽ theo ngày; khoảng dài được gộp theo tháng. Tổng quan, ba bảng xếp hạng top 10 và chuỗi biểu đồ được tính bằng RPC `get_teacher_attendance_stats` trong PostgreSQL với `SECURITY INVOKER`, nên policy RLS tiếp tục giới hạn theo lớp giáo viên.

Sau khi thêm `202610130003_dashboard_stats_rpc.sql`, chạy `npx supabase db push` hoặc áp dụng migration đó trong SQL Editor để bật dashboard. Biểu đồ dùng Recharts.

## Kiểm tra thủ công RLS

Tạo hai tài khoản TEACHER, mỗi tài khoản một profile. Đăng nhập bằng từng tài khoản, thêm một học sinh và ghi nhận UUID của học sinh. Khi gọi Supabase bằng session của giáo viên A:

- `select` học sinh của giáo viên B phải trả về 0 dòng.
- `update`/`delete` học sinh của B không thay đổi dòng nào; `insert` với `teacher_id` của B bị từ chối.
- Ghi attendance với student/status thuộc giáo viên B bị từ chối; truy vấn attendance của B không trả dòng.
- Đọc `profiles` của giáo viên khác trả về 0 dòng. Giáo viên không có quyền sửa profile/role.
- Profile TEACHER mới tự có hai trạng thái `P` (Có phép, vàng) và `K` (Không phép, đỏ).
- Đăng nhập user ADMIN: có thể đọc/sửa profile và xem dữ liệu bảng qua policy; middleware chỉ cho ADMIN vào `/admin/*`.

Nên kiểm tra bằng tài khoản thật/session của Supabase (hoặc tab **Authentication** và **Table Editor**), không dùng service role key vì khóa này bỏ qua RLS.

## Các giai đoạn

1. Khởi tạo project, schema Supabase, RLS và auth.
2. Quản lý giáo viên.
3. Quản lý học sinh và import/export.
4. Điểm danh.
5. Dashboard thống kê.
