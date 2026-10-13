import type { Metadata } from 'next';
import './globals.css';
import { AppToaster } from '@/components/toast-notice';

export const metadata: Metadata = { title: 'Quản lý học sinh', description: 'Công cụ dành cho giáo viên chủ nhiệm' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body>{children}<AppToaster /></body></html>;
}
