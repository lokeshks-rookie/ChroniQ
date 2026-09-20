import React from 'react';
import {
  BarChart,
  Bar,
  Grid,
  BarXAxis,
  ChartTooltip,
} from '@/components/ui/Chart';

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
      <BarChart margin={{ top: 8, right: 8, bottom: 40, left: 8 }} data={data} xDataKey="hour">
        <Grid horizontal />
        <Bar dataKey="appointments" fill="var(--color-ink)" lineCap="round" name="Appointments" />
        <Bar dataKey="waiting" fill="var(--color-accent)" lineCap="round" name="Patients waiting" />
        <BarXAxis />
        <ChartTooltip />
      </BarChart>
    </div>
  );
};
