'use client';

import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';

export function ToastNotice({ message, kind = 'success' }: { message?: string; kind?: 'success' | 'error' }) {
  useEffect(() => { if (message) toast[kind](message); }, [message, kind]);
  return null;
}

export function AppToaster() { return <Toaster position="top-right" richColors />; }
