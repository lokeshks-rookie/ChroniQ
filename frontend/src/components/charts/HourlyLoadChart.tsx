import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

export interface HourlyLoadPoint {
  hour: string;
  appointments: number;
  waiting: number;
}

export interface HourlyLoadChartProps {
  data: HourlyLoadPoint[];
}

export const HourlyLoadChart: React.FC<HourlyLoadChartProps> = ({ data }) => {
  return (
    <div className="w-full h-64" aria-label="Hourly load chart showing appointments scheduled and patients waiting by hour">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="hour"
            stroke="var(--color-text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: 'var(--color-ink)', strokeOpacity: 0.15 }}
          />
          <YAxis
            stroke="var(--color-text-muted)"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-base)',
              borderColor: 'var(--color-ink)',
              borderWidth: '1px',
              borderRadius: 'var(--radius-card)',
              color: 'var(--color-ink)',
              fontSize: '12px',
              boxShadow: '0 4px 12px rgba(25, 8, 1, 0.08)',
            }}
            cursor={{ fill: 'var(--color-ink)', fillOpacity: 0.04 }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            wrapperStyle={{ fontSize: '11px', paddingBottom: '10px' }}
          />
          <Bar
            name="Appointments"
            dataKey="appointments"
            fill="var(--color-ink)"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            name="Patients waiting"
            dataKey="waiting"
            fill="var(--color-accent)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
