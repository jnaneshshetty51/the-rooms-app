'use client';

// apps/admin/src/components/charts/OccupancyChart.tsx
// 30-day occupancy trend line chart for admin dashboard

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface OccupancyDataPoint {
  date: string;
  occupancy: number;
}

interface OccupancyChartProps {
  data: OccupancyDataPoint[];
}

export function OccupancyChart({ data }: OccupancyChartProps) {
  // Ensure 30 data points
  const chartData = data.slice(-30);

  const formatPercent = (value: number) => `${value}%`;

  const CustomTooltip = ({ active, payload, label }: { 
    active?: boolean; 
    payload?: Array<{ value: number; name: string }>; 
    label?: string 
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white px-3 py-2 shadow-lg rounded-lg border">
          <p className="text-sm font-semibold">{label}</p>
          <p className="text-sm text-secondary">
            Occupancy: {payload[0].value.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={{ stroke: '#E5E7EB' }}
            tickFormatter={(val) => {
              const date = new Date(val);
              return `${date.getDate()}`;
            }}
            interval={4}
          />
          <YAxis 
            tickFormatter={formatPercent}
            tick={{ fontSize: 11, fill: '#6B7280' }}
            axisLine={{ stroke: '#E5E7EB' }}
            tickLine={{ stroke: '#E5E7EB' }}
            domain={[0, 100]}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend 
            verticalAlign="top" 
            height={36}
            iconType="line"
          />
          <Line 
            type="monotone" 
            dataKey="occupancy" 
            name="Occupancy %"
            stroke="#E17055" 
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#E17055' }}
            animationDuration={1500}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default OccupancyChart;