import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/layout/PageHeader';
import { StatCard } from '@/components/ui/StatCard';
import { Card } from '@/components/ui/Card';
import { TiltCard } from '@/components/ui/tilt-card';
import DotCard from '@/components/ui/moving-dot-card';
import { Button } from '@/components/ui/Button';
import { DoctorAvailabilityChip } from '@/components/ui/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { HourlyLoadChart } from '@/components/charts/HourlyLoadChart';
import { useHospitalStore } from '@/store/hospitalStore';
import { useUiStore } from '@/store/uiStore';
import {
  UserPlus,
  QrCode,
  ListOrdered,
  Megaphone,
  AlertTriangle,
  Info,
  Clock,
  ArrowRight,
  X,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    departments,
    doctors,
    appointments,
    queue_entries,
  } = useHospitalStore();
  const { alerts, dismissAlert } = useUiStore();

  const [deptFilter, setDeptFilter] = useState('all');

  // Stat metrics computed from store
  const totalAppointmentsToday = appointments.length;
  const completedAppointments = appointments.filter((a) => a.status === 'completed').length;
  const remainingAppointments = appointments.filter(
    (a) => a.status === 'booked' || a.status === 'in_queue' || a.status === 'in_consultation'
  ).length;

  const waitingPatientsNow = queue_entries.filter((q) => q.status === 'waiting').length;

  // Average wait in minutes
  const avgWaitMinutes = useMemo(() => {
    const waitingItems = queue_entries.filter((q) => q.status === 'waiting');
    if (waitingItems.length === 0) return 14;
    const total = waitingItems.reduce((acc, curr) => acc + (curr.eta_minutes || 10), 0);
    return Math.round(total / waitingItems.length);
  }, [queue_entries]);

  // No show rate
  const noShows = appointments.filter((a) => a.status === 'no_show').length;
  const noShowRate = totalAppointmentsToday > 0 ? Math.round((noShows / totalAppointmentsToday) * 100) : 4;

  // Department "Now Serving" data for the feature band
  const departmentServingData = useMemo(() => {
    return departments.map((dept) => {
      const activeEntry = queue_entries.find(
        (q) =>
          q.department_id === dept.id &&
          (q.status === 'in_consultation' || q.status === 'called')
      );
      const waitingCount = queue_entries.filter(
        (q) => q.department_id === dept.id && q.status === 'waiting'
      ).length;

      // Longest wait calculation
      const waitingList = queue_entries.filter(
        (q) => q.department_id === dept.id && q.status === 'waiting'
      );
      let longestWait = 0;
      if (waitingList.length > 0) {
        const oldest = waitingList[0];
        const arrival = oldest.checked_in_at ? new Date(oldest.checked_in_at).getTime() : new Date(oldest.sort_time).getTime();
        longestWait = Math.max(1, Math.floor((Date.now() - arrival) / 60000));
      }

      return {
        department: dept,
        activeToken: activeEntry?.token || '—',
        isActive: Boolean(activeEntry),
        waitingCount,
        longestWait,
      };
    });
  }, [departments, queue_entries]);

  // Doctor list filtered by department
  const filteredDoctors = useMemo(() => {
    if (deptFilter === 'all') return doctors;
    return doctors.filter((d) => d.department_id === deptFilter);
  }, [doctors, deptFilter]);

  // Hourly Load Data for Recharts
  const hourlyData = useMemo(() => {
    const hours = ['09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00'];
    return hours.map((hour, idx) => ({
      hour,
      appointments: [8, 14, 16, 10, 6, 12, 11, 5][idx] || 8,
      waiting: [2, 5, 8, 4, 1, 6, 4, 1][idx] || 3,
    }));
  }, []);

  const activeAlerts = alerts.filter((a) => !a.dismissed);

  return (
    <div className="space-y-8">
      {/* Page Header with Single Primary CTA */}
      <PageHeader
        eyebrow="TODAY"
        title="Hospital Operations"
        description="Comprehensive daily throughput, live queue movement, and emergency management."
        actions={
          <div className="flex items-center flex-wrap gap-2.5">
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/admin/checkin')}
              icon={<QrCode className="w-4 h-4" />}
            >
              Check in patient
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/admin/queue')}
              icon={<ListOrdered className="w-4 h-4" />}
            >
              Queue control
            </Button>
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate('/admin/notifications')}
              icon={<Megaphone className="w-4 h-4" />}
            >
              Send broadcast
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/admin/walk-in')}
              icon={<UserPlus className="w-4 h-4" />}
            >
              Register walk-in
            </Button>
          </div>
        }
      />

      {/* KPI Stats Row (4 StatCards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          eyebrow="SCHEDULED"
          title="Today's Appointments"
          value={totalAppointmentsToday}
          subtitle={`${completedAppointments} completed • ${remainingAppointments} remaining`}
          sparklineData={[42, 56, 68, 60, 72, 80, totalAppointmentsToday]}
        />
        <StatCard
          eyebrow="IN CLINIC"
          title="Patients Waiting Now"
          value={waitingPatientsNow}
          trend={{ delta: '-3', isPositive: true, label: 'vs peak hour' }}
          sparklineData={[12, 18, 24, 20, 16, 14, waitingPatientsNow]}
        />
        <StatCard
          eyebrow="EFFICIENCY"
          title="Average Wait Time"
          value={`${avgWaitMinutes}m`}
          trend={{ delta: '-4m', isPositive: true, label: 'vs yesterday' }}
          subtitle="Target threshold: < 20 mins"
        />
        <StatCard
          eyebrow="ATTENDANCE"
          title="No-Show Rate"
          value={`${noShowRate}%`}
          trend={{ delta: '+1.2%', isPositive: false, label: '7-day trend' }}
          sparklineData={[5, 4, 3, 6, 5, 4, noShowRate]}
        />
      </div>

      {/* Feature Band: Ink Band "■ NOW SERVING" (The page's ONE feature band) */}
      <section className="bg-ink text-base rounded-panel p-6 md:p-8 border border-ink/20 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-base/15 pb-4">
          <div>
            <div className="eyebrow">
              <span>NOW SERVING</span>
            </div>
            <h2 className="h2 mt-1">
              Active Outpatient OPD Counters
            </h2>
          </div>
          <Link
            to="/admin/queue"
            className="text-xs font-semibold text-accent hover:underline inline-flex items-center gap-1"
          >
            <span>Open live queue control</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {departmentServingData.map(({ department, activeToken, waitingCount, longestWait }) => (
            <TiltCard
              key={department.id}
              tiltLimit={10}
              scale={1.03}
              className="rounded-card bg-base/5 border border-base/10 hover:border-accent/60 transition-all text-left group"
            >
              <Link
                to={`/admin/queue?dept=${department.id}`}
                className="p-4 h-full flex flex-col justify-between"
              >
                <div>
                  <div className="eyebrow">
                    {department.name}
                  </div>
                  <div className="text-2xl md:text-3xl font-extrabold font-mono tracking-wider text-base mt-2 tabular-nums">
                    {activeToken}
                  </div>
                </div>

                <div className="mt-4 pt-2 border-t border-base/10 text-[11px] text-base/60 space-y-1">
                  <div className="flex justify-between">
                    <span>Waiting:</span>
                    <span className="font-bold text-accent">{waitingCount}</span>
                  </div>
                  {waitingCount > 0 && (
                    <div className="flex justify-between">
                      <span>Longest:</span>
                      <span>{longestWait}m</span>
                    </div>
                  )}
                </div>
              </Link>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* Two Column Layout: Doctor Availability Grid & Live Alerts + Hourly Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Doctor Availability */}
        <div className="lg:col-span-2 space-y-4">
          <Card padding="md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="eyebrow">
                  <span>CONSULTANT STATUS</span>
                </div>
                <h3 className="h2 mt-0.5">Doctor Availability</h3>
              </div>

              {/* Department filter pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setDeptFilter('all')}
                  className={`badge text-[11px] whitespace-nowrap shrink-0 ${deptFilter === 'all' ? 'active' : ''}`}
                >
                  All
                </button>
                {departments.map((dep) => (
                  <button
                    key={dep.id}
                    type="button"
                    onClick={() => setDeptFilter(dep.id)}
                    className={`badge text-[11px] whitespace-nowrap shrink-0 ${deptFilter === dep.id ? 'active' : ''}`}
                  >
                    {dep.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Doctors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredDoctors.map((doc) => {
                const dept = departments.find((d) => d.id === doc.department_id);
                const active = queue_entries.find(
                  (q) =>
                    q.doctor_id === doc.id &&
                    (q.status === 'in_consultation' || q.status === 'called')
                );
                const waiting = queue_entries.filter(
                  (q) => q.doctor_id === doc.id && q.status === 'waiting'
                ).length;

                let availability: 'available' | 'in_consultation' | 'break' | 'late' | 'leave' = 'available';
                if (!doc.is_active) availability = 'leave';
                else if (active?.status === 'in_consultation') availability = 'in_consultation';

                return (
                  <TiltCard
                    key={doc.id}
                    tiltLimit={6}
                    scale={1.015}
                    className="p-3.5 rounded-card border border-ink/10 bg-base hover:border-ink/30 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={doc.name} photoUrl={doc.photo_url} size="md" />
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-ink truncate">{doc.name}</div>
                        <div className="text-xs text-ink/65 truncate">
                          {dept?.name} • {doc.room || 'Room 101'}
                        </div>
                        <div className="mt-1">
                          <DoctorAvailabilityChip status={availability} />
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs text-ink/60">Current</div>
                      <div className="text-sm font-bold font-mono text-ink">
                        {active?.token || '—'}
                      </div>
                      <div className="text-[11px] text-ink/70 mt-0.5">{waiting} in queue</div>
                    </div>
                  </TiltCard>
                );
              })}
            </div>
          </Card>

          {/* Hourly Load Chart */}
          <Card padding="md">
            <div className="mb-4">
              <div className="eyebrow">
                <span>LOAD DISTRIBUTION</span>
              </div>
              <h3 className="h2 mt-0.5">Hourly Patient Footfall vs Queue Load</h3>
            </div>
            <HourlyLoadChart data={hourlyData} />
          </Card>
        </div>

        {/* Right 1 Col: Live Alerts Feed & Action shortcuts */}
        <div className="space-y-4">
          <Card padding="md">
            <div className="flex items-center justify-between mb-4 border-b border-ink/10 pb-3">
              <div>
                <div className="eyebrow">
                  <span>OPERATIONAL ADVISORIES</span>
                </div>
                <h3 className="h2 mt-0.5">Live Alerts Feed</h3>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-ink/10 text-ink">
                {activeAlerts.length}
              </span>
            </div>

            <div className="space-y-3">
              {activeAlerts.length === 0 ? (
                <div className="p-6 text-center text-xs text-ink/60 border border-dashed border-ink/20 rounded-card">
                  All systems running smoothly. No active operational alerts.
                </div>
              ) : (
                activeAlerts.map((alert) => {
                  return (
                    <DotCard
                      key={alert.id}
                      className="p-3.5 space-y-2 text-xs relative"
                    >
                      <button
                        type="button"
                        onClick={() => dismissAlert(alert.id)}
                        className="absolute top-2.5 right-2.5 text-ink/40 hover:text-ink cursor-pointer z-20"
                        aria-label="Dismiss alert"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      <div className="flex items-start gap-2 pr-6">
                        {alert.severity === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="font-semibold text-ink">{alert.title}</div>
                          <div className="text-[10px] text-ink/50 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            <span>{alert.time}</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-ink/80 leading-relaxed text-[11px]">{alert.message}</p>

                      {alert.actionUrl && (
                        <div className="pt-1">
                          <Link
                            to={alert.actionUrl}
                            className="inline-flex items-center gap-1 font-semibold text-accent hover:underline text-xs"
                          >
                            <span>{alert.actionLabel || 'Resolve action'}</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        </div>
                      )}
                    </DotCard>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
