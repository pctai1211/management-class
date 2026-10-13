'use client';

import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export type ChartPoint = { bucket: string; label: string; total: number; permitted: number; unpermitted: number };
export function AttendanceChart({ data }: { data: ChartPoint[] }) {
  return <div className="h-72 w-full sm:h-80"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data} margin={{ top: 12, right: 12, left: -12, bottom: 4 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={16} fontSize={12} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} /><Tooltip labelFormatter={(label) => `Thời gian: ${label}`} formatter={(value, name) => [value, name]} /><Legend /><Bar dataKey="total" name="Tổng lượt nghỉ" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={32} /><Line type="monotone" dataKey="permitted" name="Có phép" stroke="#eab308" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="unpermitted" name="Không phép" stroke="#ef4444" strokeWidth={2} dot={false} /></ComposedChart></ResponsiveContainer></div>;
}
