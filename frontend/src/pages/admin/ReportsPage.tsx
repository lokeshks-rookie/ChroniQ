import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { TiltCard } from '@/components/ui/tilt-card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { StatCard } from '@/components/ui/StatCard';
import { useHospitalStore } from '@/store/hospitalStore';
import { toCsv, downloadCsv } from '@/lib/csv';
import { formatTimeIST, formatDateIST } from '@/lib/time';
import {
  Download,
  Printer,
  Star,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Grid,
  BarXAxis,
  XAxis,
  ChartTooltip,
} from '@/components/ui/Chart';

export const ReportsPage: React.FC = () => {
  const { hospital, departments, doctors } = useHospitalStore();

  const [datePreset, setDatePreset] = useState<'today' | '7d' | '30d' | '90d'>('7d');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedDoctor, setSelectedDoctor] = useState('all');
  const [exportDataset, setExportDataset] = useState('footfall');

  // Days of week and hours for the heatmap
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const HOURS = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];

  // Seeded Heatmap Values (0 to 1 intensity representing patient density)
  const heatmapData = useMemo(() => {
    // Realistic peak around 10-12 AM and 4-6 PM
    const matrix: Record<string, Record<string, number>> = {};
    DAYS.forEach((day) => {
      matrix[day] = {};
      HOURS.forEach((hour) => {
        let val = 0.2;
        if (hour === '10:00' || hour === '11:00') val = 0.85;
        else if (hour === '16:00' || hour === '17:00') val = 0.7;
        else if (hour === '12:00' || hour === '15:00') val = 0.5;
        if (day === 'Sat' && (hour === '16:00' || hour === '17:00')) val = 0.1; // Saturday afternoon low
        matrix[day][hour] = Number(val.toFixed(2));
      });
    });
    return matrix;
  }, []);

  // Trend Charts Mock Datasets
  const footfallTrendData = [
    { day: 'Mon', prebooked: 65, walkin: 22 },
    { day: 'Tue', prebooked: 72, walkin: 28 },
    { day: 'Wed', prebooked: 80, walkin: 34 },
    { day: 'Thu', prebooked: 75, walkin: 26 },
    { day: 'Fri', prebooked: 88, walkin: 38 },
    { day: 'Sat', prebooked: 60, walkin: 18 },
    { day: 'Sun', prebooked: 24, walkin: 8 },
  ];

  const waitTimeHourlyData = [
    { hour: '09:00', avgWait: 8 },
    { hour: '10:00', avgWait: 18 },
    { hour: '11:00', avgWait: 26 },
    { hour: '12:00', avgWait: 19 },
    { hour: '14:00', avgWait: 10 },
    { hour: '15:00', avgWait: 16 },
    { hour: '16:00', avgWait: 22 },
    { hour: '17:00', avgWait: 14 },
  ];

  const noShowTrendData = [
    { period: 'Week 1', noshow: 4.2, cancelled: 6.1 },
    { period: 'Week 2', noshow: 3.8, cancelled: 5.5 },
    { period: 'Week 3', noshow: 4.9, cancelled: 6.8 },
    { period: 'Week 4', noshow: 3.4, cancelled: 4.9 },
  ];

  // Doctor Utilization
  const doctorUtilizationData = doctors.slice(0, 6).map((d) => ({
    name: d.name.replace('Dr. ', ''),
    utilization: Math.min(96, Math.floor(65 + d.avg_consult_minutes * 2.2)),
  })).sort((a, b) => b.utilization - a.utilization);

  // Ratings Distribution
  const satisfactionRatings = [
    { stars: '5 Stars', count: 840, pct: 65 },
    { stars: '4 Stars', count: 320, pct: 24 },
    { stars: '3 Stars', count: 90, pct: 7 },
    { stars: '2 Stars', count: 30, pct: 2 },
    { stars: '1 Star', count: 20, pct: 2 },
  ];

  // Export CSV
  const handleExportCsv = () => {
    if (exportDataset === 'footfall') {
      const content = toCsv(
        [
          { key: 'day', label: 'Day' },
          { key: 'prebooked', label: 'Pre-Booked' },
          { key: 'walkin', label: 'Walk-In' },
        ],
        footfallTrendData
      );
      downloadCsv('chroniq-footfall-report.csv', content);
    } else if (exportDataset === 'wait_times') {
      const content = toCsv(
        [
          { key: 'hour', label: 'Hour' },
          { key: 'avgWait', label: 'Average Wait (mins)' },
        ],
        waitTimeHourlyData
      );
      downloadCsv('chroniq-wait-times-report.csv', content);
    } else if (exportDataset === 'utilization') {
      const content = toCsv(
        [
          { key: 'name', label: 'Doctor' },
          { key: 'utilization', label: 'OPD Utilization (%)' },
        ],
        doctorUtilizationData
      );
      downloadCsv('chroniq-doctor-utilization-report.csv', content);
    } else {
      const content = toCsv(
        [
          { key: 'period', label: 'Period' },
          { key: 'noshow', label: 'No Show Rate (%)' },
          { key: 'cancelled', label: 'Cancellation Rate (%)' },
        ],
        noShowTrendData
      );
      downloadCsv('chroniq-noshow-report.csv', content);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Print-only Report Header (A4) */}
      <div className="hidden print:block mb-8 text-ink font-sans border-b border-ink/30 pb-4">
        <div className="text-2xl font-bold uppercase">{hospital.name}</div>
        <div className="text-sm">Administrative Analytics & Operations Audit</div>
        <div className="text-xs text-ink/70 mt-1">
          Date Period: {datePreset.toUpperCase()} • Generated IST: {formatDateIST(new Date())} {formatTimeIST(new Date())}
        </div>
      </div>

      <PageHeader
        eyebrow="REPORTS"
        title="Analytics & Operational Reports"
        description="Comprehensive OPD throughput, peak-hour bottlenecks, doctor utilization, and no-show trends."
        actions={
          <div className="flex items-center gap-2.5 no-print">
            <div className="w-36">
              <Select
                value={exportDataset}
                onChange={(e) => setExportDataset(e.target.value)}
                options={[
                  { value: 'footfall', label: 'Footfall data' },
                  { value: 'wait_times', label: 'Wait times' },
                  { value: 'utilization', label: 'Utilization' },
                  { value: 'noshows', label: 'No-show rates' },
                ]}
              />
            </div>

            <Button
              variant="secondary"
              size="md"
              onClick={handleExportCsv}
              icon={<Download className="w-4 h-4" />}
            >
              Export CSV
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={handlePrintPdf}
              icon={<Printer className="w-4 h-4" />}
            >
              Print report
            </Button>
          </div>
        }
      />

      {/* Filter Presets Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-card bg-base border border-ink/10 no-print">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { id: 'today', label: 'Today' },
            { id: '7d', label: 'Last 7 Days' },
            { id: '30d', label: 'Last 30 Days' },
            { id: '90d', label: 'Last 90 Days' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setDatePreset(preset.id as any)}
              className={`px-3.5 py-1.5 rounded-full font-medium transition-colors cursor-pointer ${
                datePreset === preset.id
                  ? 'bg-accent text-ink font-semibold'
                  : 'border border-ink/20 text-ink hover:border-ink/40'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            options={[
              { value: 'all', label: 'All Departments' },
              ...departments.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
          <Select
            value={selectedDoctor}
            onChange={(e) => setSelectedDoctor(e.target.value)}
            options={[
              { value: 'all', label: 'All Doctors' },
              ...doctors.map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
        </div>
      </div>

      {/* KPI Row (6 Metric Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          eyebrow="FOOTFALL"
          title="Total Patients"
          value="482"
          subtitle="Pre-booked & walk-ins"
        />
        <StatCard
          eyebrow="EFFICIENCY"
          title="Average Wait"
          value="16m"
          subtitle="Threshold: < 20m"
        />
        <StatCard
          eyebrow="DURATION"
          title="Consult Time"
          value="11.4m"
          subtitle="Rolling clinical avg"
        />
        <StatCard
          eyebrow="ATTENDANCE"
          title="No-Show Rate"
          value="3.8%"
          trend={{ delta: '-0.6%', isPositive: true }}
        />
        <StatCard
          eyebrow="DROPOUT"
          title="Cancel Rate"
          value="5.2%"
          trend={{ delta: '-1.1%', isPositive: true }}
        />
        <StatCard
          eyebrow="CAPACITY"
          title="OPD Utilization"
          value="88%"
          trend={{ delta: '+4%', isPositive: true }}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Footfall Trend */}
        <Card padding="md" className="space-y-4">
          <div>
            <div className="eyebrow flex items-center gap-1.5">
              <span>PATIENT VOLUME</span>
            </div>
            <h3 className="text-base font-medium text-ink mt-0.5">Footfall by Day of Week</h3>
          </div>

          <div className="h-64" aria-label="Footfall chart comparing prebooked and walk-in patient volume">
            <BarChart margin={{ top: 8, right: 8, bottom: 40, left: 8 }} data={footfallTrendData} xDataKey="day">
              <Grid horizontal />
              <Bar dataKey="prebooked" fill="var(--color-ink)" lineCap="round" name="Pre-booked" />
              <Bar dataKey="walkin" fill="var(--color-accent)" lineCap="round" name="Walk-in" />
              <BarXAxis />
              <ChartTooltip />
            </BarChart>
          </div>
        </Card>

        {/* Average Wait by Hour */}
        <Card padding="md" className="space-y-4">
          <div>
            <div className="eyebrow flex items-center gap-1.5">
              <span>QUEUE DELAYS</span>
            </div>
            <h3 className="text-base font-medium text-ink mt-0.5">Average Waiting Duration by Hour</h3>
          </div>

          <div className="h-64" aria-label="Average waiting duration line chart by hour">
            <LineChart margin={{ top: 8, right: 8, bottom: 40, left: 8 }} data={waitTimeHourlyData}>
              <Grid horizontal vertical />
              <Line dataKey="avgWait" strokeWidth={2} name="Avg Wait (Minutes)" />
              <XAxis />
              <ChartTooltip />
            </LineChart>
          </div>
        </Card>
      </div>

      {/* PEAK-HOUR HEATMAP (Day of Week × Hour, Accent Opacity Ramp) */}
      <Card padding="md" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-ink/10 pb-3">
          <div>
            <div className="eyebrow flex items-center gap-1.5">
              <span>CONGESTION MATRIX</span>
            </div>
            <h3 className="text-base font-medium text-ink mt-0.5">Peak-Hour OPD Heatmap</h3>
          </div>

          {/* Opacity ramp legend */}
          <div className="flex items-center gap-2 text-[11px] text-ink/70">
            <span>Low load</span>
            <div className="flex items-center gap-1">
              {[0.1, 0.3, 0.5, 0.7, 0.9].map((op) => (
                <span
                  key={op}
                  style={{ backgroundColor: `rgba(154, 110, 86, ${op})` }}
                  className="w-4 h-4 rounded-xs inline-block border border-ink/10"
                />
              ))}
            </div>
            <span>Peak wait</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full text-center border-collapse text-xs">
            <thead>
              <tr>
                <th className="p-2 text-left text-ink/60 font-medium">Day \ Hour</th>
                {HOURS.map((h) => (
                  <th key={h} className="p-2 text-ink/70 font-mono font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => (
                <tr key={day} className="border-t border-ink/10">
                  <td className="p-2.5 text-left font-semibold text-ink">{day}</td>
                  {HOURS.map((hour) => {
                    const intensity = heatmapData[day][hour] || 0.1;
                    const isPeak = intensity >= 0.7;

                    return (
                      <td key={hour} className="p-1">
                        <div
                          style={{ backgroundColor: `rgba(154, 110, 86, ${intensity})` }}
                          title={`${day} at ${hour}: ${(intensity * 100).toFixed(0)}% queue load`}
                          className={`h-9 rounded flex items-center justify-center font-mono text-[11px] font-bold transition-all cursor-default select-none ${
                            isPeak ? 'text-ink' : 'text-ink/80'
                          }`}
                        >
                          {(intensity * 100).toFixed(0)}%
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Utilization & Patient Satisfaction */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doctor Utilization */}
        <Card padding="md" className="space-y-4">
          <div>
            <div className="eyebrow flex items-center gap-1.5">
              <span>CLINICAL OCCUPANCY</span>
            </div>
            <h3 className="text-base font-medium text-ink mt-0.5">Specialist Utilization Rates</h3>
          </div>

          <div className="space-y-3 pt-2">
            {doctorUtilizationData.map((doc) => (
              <div key={doc.name} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-ink">
                  <span>Dr. {doc.name}</span>
                  <span className="font-mono">{doc.utilization}%</span>
                </div>
                <div className="h-2 w-full bg-ink/10 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${doc.utilization}%` }}
                    className="h-full bg-accent rounded-full"
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Patient Satisfaction */}
        <Card padding="md" className="space-y-4">
          <div>
            <div className="eyebrow flex items-center gap-1.5">
              <span>PATIENT REVIEWS</span>
            </div>
            <h3 className="text-base font-medium text-ink mt-0.5">Post-Visit Review Ratings</h3>
          </div>

          <TiltCard
            tiltLimit={14}
            scale={1.03}
            className="flex items-center gap-6 p-4 rounded-card bg-ink/5 border border-ink/10 cursor-pointer shadow-xs hover:shadow-md transition-shadow"
          >
            <div className="text-center">
              <div className="text-4xl font-extrabold text-ink font-mono">{hospital.rating_avg}</div>
              <div className="flex items-center justify-center gap-0.5 my-1 text-accent">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-accent" />
                ))}
              </div>
              <div className="text-xs text-ink/60">{hospital.rating_count} total verified reviews</div>
            </div>

            <div className="flex-1 space-y-1.5 text-xs">
              {satisfactionRatings.map((r) => (
                <div key={r.stars} className="flex items-center gap-2">
                  <span className="w-12 text-ink/70 font-medium">{r.stars}</span>
                  <div className="flex-1 h-1.5 bg-ink/10 rounded-full overflow-hidden">
                    <div style={{ width: `${r.pct}%` }} className="h-full bg-ink rounded-full" />
                  </div>
                  <span className="w-8 text-right font-mono text-ink/60">{r.pct}%</span>
                </div>
              ))}
            </div>
          </TiltCard>
        </Card>
      </div>
    </div>
  );
};
