"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"

const data = [
  { month: "Sep", billed: 14200, collected: 11800 },
  { month: "Oct", billed: 18500, collected: 15200 },
  { month: "Nov", billed: 16800, collected: 13400 },
  { month: "Dec", billed: 21300, collected: 17900 },
  { month: "Jan", billed: 19500, collected: 16100 },
  { month: "Feb", billed: 19475, collected: 9115 },
]

export default function RevenueChart() {
  return (
    <div className="bg-pampas rounded-2xl border border-sand p-5">
      <h3 className="text-sm font-bold text-warm-800 mb-4">
        Revenue (6-Month)
      </h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%" minHeight={180}>
          <BarChart data={data} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E2D4A" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 10, fill: "#6B7A94" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#6B7A94" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{
                background: "#111D35",
                border: "1px solid #1E2D4A",
                borderRadius: 12,
                fontSize: 11,
                boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              }}
              formatter={(value) =>
                `$${Number(value).toLocaleString()}`
              }
            />
            <Bar
              dataKey="billed"
              name="Billed"
              fill="#1E2D4A"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
            <Bar
              dataKey="collected"
              name="Collected"
              fill="#C5A04E"
              radius={[4, 4, 0, 0]}
              maxBarSize={28}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 mt-3 justify-center">
        <span className="flex items-center gap-1.5 text-[10px] text-warm-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-sand" /> Billed
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-warm-500">
          <span className="w-2.5 h-2.5 rounded-sm bg-terra" /> Collected
        </span>
      </div>
    </div>
  )
}
