'use client';

// apps/admin/src/components/charts/RevenueChart.tsx
// 6-month revenue bar chart for admin dashboard

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface RevenueChartProps {
  data: Record<string, number>;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function RevenueChart({ data }: RevenueChartProps) {
  // Transform data for chart - API returns "YYYY-MM" format
  const chartData = Object.entries(data).map(([key, revenue]) => {
    const monthNum = parseInt(key.split("-")[1], 10);
    return {
      month: MONTHS[monthNum - 1] || key,
      revenue,
    };
  }).sort((a, b) => {
    const monthA = MONTHS.indexOf(a.month);
    const monthB = MONTHS.indexOf(b.month);
    return monthA - monthB;
  });

  // Get last 6 months from current month
  const currentMonth = new Date().getMonth();
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const monthIndex = (currentMonth - 5 + i + 12) % 12;
    return MONTHS[monthIndex];
  });

  const filledData = last6Months.map((month) => {
    const found = chartData.find(d => d.month === month);
    return found || { month, revenue: 0 };
  });

  const formatINR = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
    return `₹${value}`;
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{value: number}>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 shadow-lg rounded-lg border">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-sm text-secondary">
            Revenue: {formatINR(payload[0].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={filledData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12, fill: '#6B7280' }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={{ stroke: '#E5E7EB' }}
          />
          <YAxis 
            tickFormatter={(v: number) => formatINR(v)}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={{ stroke: '#E5E7EB' }}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="revenue" 
            radius={[4, 4, 0, 0]}
            animationDuration={1000}
          >
            {filledData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={index === filledData.length - 1 ? '#E17055' : '#E17055'} 
                fillOpacity={0.7 + (index * 0.05)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default RevenueChart;