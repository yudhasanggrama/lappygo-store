"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

type Point = {
  date: string;   // YYYY-MM-DD
  revenue: number;
  orders: number;
};

function formatShortDate(ymd: string) {
  // "2026-02-16" -> "16/02"
  const [y, m, d] = ymd.split("-");
  return `${d}/${m}`;
}

function formatIDR(n: number) {
  return new Intl.NumberFormat("id-ID").format(n);
}

export default function SalesChart({ data }: { data: Point[] }) {
  return (
    <div className="grid gap-4">
      {/* Revenue line */}
      <div className="h-56 rounded-lg border bg-background p-3">
        <div className="mb-2 text-xs font-medium text-muted-foreground">Revenue (Paid)</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatIDR(Number(v))} />
            <Tooltip
              formatter={(value: any) => `Rp ${formatIDR(Number(value))}`}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Line type="monotone" dataKey="revenue" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Orders bar */}
      <div className="h-48 rounded-lg border bg-background p-3">
        <div className="mb-2 text-xs font-medium text-muted-foreground">Orders (Paid)</div>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tickFormatter={formatShortDate} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              formatter={(value: any) => Number(value)}
              labelFormatter={(label) => `Date: ${label}`}
            />
            <Bar dataKey="orders" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}