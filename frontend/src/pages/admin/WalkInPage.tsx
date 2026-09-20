import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { TokenSlip } from '@/components/queue/TokenSlip';
import { useHospitalStore } from '@/store/hospitalStore';
import { registerWalkInPatient } from '@/services/adminApi';
import { formatInr, normalizePhone } from '@/lib/format';
import { formatTimeIST } from '@/lib/time';
import {
  UserPlus,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Siren,
  Info,
} from 'lucide-react';
import type { Appointment, QueueEntry } from '@/types';

const walkInSchema = z.object({
  phone: z.string().min(10, 'Enter valid 10-digit Indian mobile number'),
  name: z.string().min(2, 'Patient full name is required'),
  age: z.coerce.number().min(0).max(120),
  gender: z.enum(['male', 'female', 'other']),
  departmentId: z.string().min(1, 'Select a department'),
  doctorId: z.string().min(1, 'Select an available doctor'),
  priority: z.coerce.number().default(2),
  reason: z.string().min(3, 'Specify reason for consultation'),
});

type WalkInFormValues = z.infer<typeof walkInSchema>;

export const WalkInPage: React.FC = () => {
  const {
    hospital,
    departments,
    doctors,
    queue_entries,
    appointments,
  } = useHospitalStore();

  const [createdAppointment, setCreatedAppointment] = useState<Appointment | null>(null);
  const [createdQueueEntry, setCreatedQueueEntry] = useState<QueueEntry | null>(null);
  const [emergencyConfirmOpen, setEmergencyConfirmOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<WalkInFormValues | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneLookupMsg, setPhoneLookupMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<WalkInFormValues>({
    resolver: zodResolver(walkInSchema),
    defaultValues: {
      phone: '',
      name: '',
      age: 30,
      gender: 'male',
      departmentId: departments[0]?.id || '',
      doctorId: '',
      priority: 2,
      reason: 'General outpatient consultation',
    },
  });

  const selectedPhone = watch('phone');
  const selectedDeptId = watch('departmentId');
  const selectedDoctorId = watch('doctorId');
  const selectedPriority = watch('priority');

  // Phone auto-lookup on 10 digits
  useEffect(() => {
    const cleaned = normalizePhone(selectedPhone);
    if (cleaned.length === 10) {
      const match = appointments.find((a) => a.patient.phone?.includes(cleaned));
      if (match) {
        setValue('name', match.patient.name);
        if (match.patient.age) setValue('age', match.patient.age);
        if (match.patient.gender) setValue('gender', match.patient.gender as any);
        setPhoneLookupMsg(`Existing patient identified: ${match.patient.name}`);
      } else {
        setPhoneLookupMsg('New patient registration');
      }
    } else {
      setPhoneLookupMsg(null);
    }
  }, [selectedPhone, appointments, setValue]);

  // Filter available doctors in the chosen department
  const departmentDoctors = doctors.filter((doc) => doc.department_id === selectedDeptId);

  // Calculate doctor wait metrics and identify the "Fastest"
  const doctorWaitMetrics = departmentDoctors.map((doc) => {
    const waiting = queue_entries.filter((q) => q.doctor_id === doc.id && q.status === 'waiting');
    const active = queue_entries.find(
      (q) => q.doctor_id === doc.id && (q.status === 'in_consultation' || q.status === 'called')
    );
    const estWait = (waiting.length + (active ? 1 : 0)) * doc.avg_consult_minutes;
    return {
      doctor: doc,
      waitingCount: waiting.length,
      estWait,
      isAvailable: doc.is_active,
    };
  });

  const fastestDoctorId = doctorWaitMetrics
    .filter((m) => m.isAvailable)
    .sort((a, b) => a.estWait - b.estWait)[0]?.doctor.id;

  // Set default doctor when department changes
  useEffect(() => {
    if (departmentDoctors.length > 0 && (!selectedDoctorId || !departmentDoctors.some(d => d.id === selectedDoctorId))) {
      setValue('doctorId', fastestDoctorId || departmentDoctors[0].id);
    }
  }, [selectedDeptId, departmentDoctors, selectedDoctorId, fastestDoctorId, setValue]);

  const selectedDoctor = doctors.find((d) => d.id === selectedDoctorId);
  const selectedDept = departments.find((d) => d.id === selectedDeptId);

  const onFormSubmit = async (values: WalkInFormValues) => {
    if (values.priority === 0) {
      // Emergency requires explicit confirmation
      setPendingValues(values);
      setEmergencyConfirmOpen(true);
      return;
    }
    await executeRegistration(values);
  };

  const executeRegistration = async (values: WalkInFormValues) => {
    setIsSubmitting(true);
    try {
      const res = await registerWalkInPatient({
        patient: {
          name: values.name,
          age: values.age,
          gender: values.gender,
          phone: `+91 ${normalizePhone(values.phone)}`,
        },
        departmentId: values.departmentId,
        doctorId: values.doctorId,
        reason: values.reason,
        priority: values.priority,
      });

      setCreatedAppointment(res.appointment);
      setCreatedQueueEntry(res.queueEntry);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterAnother = () => {
    setCreatedAppointment(null);
    setCreatedQueueEntry(null);
    reset({
      phone: '',
      name: '',
      age: 30,
      gender: 'male',
      departmentId: departments[0]?.id || '',
      doctorId: fastestDoctorId || '',
      priority: 2,
      reason: 'General outpatient consultation',
    });
  };

  // Recent walk-ins today
  const recentWalkIns = appointments
    .filter((a) => a.type === 'walk_in')
    .slice(0, 5);

  const walkInsEnabled = hospital.settings.walk_ins_enabled;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="WALK-IN"
        title="Walk-In Patient Registration"
        description="Immediate front-desk outpatient intake, dynamic doctor wait matching, and physical token ticket generation."
      />

      {!walkInsEnabled && (
        <div className="p-4 rounded-card bg-info/10 border border-info/30 text-xs text-info flex items-center gap-3">
          <Info className="w-5 h-5 shrink-0" />
          <div>
            <strong>Walk-ins Disabled:</strong> Hospital policy currently suspends walk-in registrations. Update policy in Hospital Settings to re-enable intake.
          </div>
        </div>
      )}

      {/* Two-Column Layout: Form on Left, Token Preview / Success on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Form (7 cols) */}
        <div className="lg:col-span-7">
          <Card padding="lg" className="space-y-6">
            <div>
              <div className="text-xs uppercase tracking-wider font-semibold text-ink/70 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-ink inline-block" />
                <span>PATIENT DETAILS</span>
              </div>
              <h2 className="text-xl font-medium text-ink mt-0.5">Quick Intake Form</h2>
            </div>

            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
              {/* Phone Lookup First */}
              <div>
                <Input
                  label="Patient Mobile Number (+91) *"
                  placeholder="e.g. 9840123456"
                  disabled={!walkInsEnabled}
                  leftIcon={<Search className="w-4 h-4" />}
                  {...register('phone')}
                  error={errors.phone?.message}
                  hint="Type 10 digits to search existing hospital records"
                />
                {phoneLookupMsg && (
                  <p className="text-xs font-semibold text-accent mt-1 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{phoneLookupMsg}</span>
                  </p>
                )}
              </div>

              {/* Patient Basic Profile */}
              <Input
                label="Patient Full Name *"
                placeholder="e.g. Meenakshi Sundaram"
                disabled={!walkInsEnabled}
                {...register('name')}
                error={errors.name?.message}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Age *"
                  type="number"
                  disabled={!walkInsEnabled}
                  {...register('age')}
                  error={errors.age?.message}
                />
                <Select
                  label="Gender *"
                  disabled={!walkInsEnabled}
                  {...register('gender')}
                  options={[
                    { value: 'male', label: 'Male' },
                    { value: 'female', label: 'Female' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
              </div>

              {/* Department Selection */}
              <Select
                label="Department *"
                disabled={!walkInsEnabled}
                value={selectedDeptId}
                onChange={(e) => setValue('departmentId', e.target.value)}
                options={departments.map((d) => ({
                  value: d.id,
                  label: `${d.name} (${d.token_prefix})`,
                }))}
              />

              {/* Doctor Selection with Wait Times Comparison */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink/70">
                  Assign Doctor *
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {doctorWaitMetrics.map(({ doctor, waitingCount, estWait, isAvailable }) => {
                    const isSelected = selectedDoctorId === doctor.id;
                    const isFastest = fastestDoctorId === doctor.id;

                    return (
                      <div
                        key={doctor.id}
                        onClick={() => isAvailable && walkInsEnabled && setValue('doctorId', doctor.id)}
                        className={`p-3.5 rounded-card border cursor-pointer transition-all flex items-center justify-between ${
                          !isAvailable
                            ? 'opacity-40 border-ink/10 cursor-not-allowed bg-ink/5'
                            : isSelected
                            ? 'border-ink bg-ink/5 ring-1 ring-ink'
                            : 'border-ink/15 hover:border-ink/30 bg-base'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="doctorRadio"
                            checked={isSelected}
                            onChange={() => setValue('doctorId', doctor.id)}
                            disabled={!isAvailable || !walkInsEnabled}
                            className="accent-ink w-4 h-4 cursor-pointer"
                          />
                          <div>
                            <div className="text-sm font-semibold text-ink flex items-center gap-2">
                              <span>{doctor.name}</span>
                              {isFastest && (
                                <span className="px-2 py-0.2 rounded-full bg-accent text-ink text-[10px] font-bold">
                                  Fastest
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-ink/65">
                              {doctor.specialty} • Fee: {formatInr(doctor.fee)}
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-xs">
                          <div className="font-semibold text-ink flex items-center gap-1 justify-end">
                            <Clock className="w-3.5 h-3.5 text-ink/50" />
                            <span>~{estWait}m wait</span>
                          </div>
                          <div className="text-ink/60 mt-0.5">{waitingCount} in line</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Priority Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink/70">
                  Triage Priority
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 2, label: 'Normal', icon: null },
                    { val: 1, label: 'Priority', icon: <AlertTriangle className="w-3.5 h-3.5 text-accent" /> },
                    { val: 0, label: 'Emergency', icon: <Siren className="w-3.5 h-3.5 text-danger" /> },
                  ].map((p) => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setValue('priority', p.val)}
                      disabled={!walkInsEnabled}
                      className={`p-2.5 rounded-card border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                        selectedPriority === p.val
                          ? 'bg-ink text-base border-ink'
                          : 'bg-base border-ink/20 text-ink hover:border-ink/40'
                      }`}
                    >
                      {p.icon}
                      <span>{p.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-ink/60">
                  {selectedPriority === 1 && 'Priority applies to elderly (65+), pregnant, or pediatric critical cases.'}
                  {selectedPriority === 0 && 'Emergency places the patient at position #1 immediately.'}
                </p>
              </div>

              <Textarea
                label="Reason for Visit *"
                rows={2}
                disabled={!walkInsEnabled}
                {...register('reason')}
                error={errors.reason?.message}
              />

              {/* Fee and Submit Button (Single Primary Button on Page) */}
              <div className="pt-4 border-t border-ink/10 flex items-center justify-between">
                <div>
                  <div className="text-xs text-ink/65">Consultation Fee</div>
                  <div className="text-xl font-bold font-mono text-ink">
                    {selectedDoctor ? formatInr(selectedDoctor.fee) : '—'}
                  </div>
                </div>

                <Button
                  variant="primary"
                  size="lg"
                  type="submit"
                  disabled={!walkInsEnabled}
                  isLoading={isSubmitting}
                  icon={<UserPlus className="w-4 h-4" />}
                >
                  Generate token
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Live Token Slip Preview or Generated Ticket (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {createdAppointment && createdQueueEntry ? (
            <Card padding="md" className="space-y-4">
              <div className="p-3 bg-success/10 border border-success/30 rounded-card text-xs text-success flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Walk-in registered successfully. Token issued.</span>
              </div>

              <TokenSlip
                hospitalName={hospital.name}
                token={createdQueueEntry.token}
                patientName={createdAppointment.patient.name}
                doctorName={selectedDoctor?.name || 'Doctor'}
                departmentName={selectedDept?.name || 'OPD'}
                room={selectedDoctor?.room || 'Room 101'}
                position={createdQueueEntry.position}
                etaMinutes={createdQueueEntry.eta_minutes}
                bookingCode={createdAppointment.booking_code}
                appointmentTime={createdAppointment.scheduled_start}
                onClose={handleRegisterAnother}
              />

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleRegisterAnother}
                  className="text-xs font-semibold text-accent hover:underline cursor-pointer"
                >
                  + Register another walk-in patient
                </button>
              </div>
            </Card>
          ) : (
            <Card padding="lg" className="space-y-4 text-center">
              <div>
                <div className="text-xs uppercase tracking-wider font-semibold text-ink/70 flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-ink inline-block" />
                  <span>PREVIEW TICKET</span>
                </div>
                <h3 className="text-lg font-medium text-ink mt-0.5">80mm Thermal Slip Preview</h3>
              </div>

              <div className="border border-dashed border-ink/20 rounded-card p-6 bg-base/50 space-y-3 font-mono text-xs text-left">
                <div className="text-center border-b border-dashed border-ink/20 pb-2">
                  <div className="font-bold text-sm uppercase">{hospital.name}</div>
                  <div className="text-[10px] text-ink/60">Outpatient Intake Token</div>
                </div>

                <div className="py-2 text-center">
                  <div className="text-3xl font-extrabold text-ink/40 tracking-widest">
                    {selectedDept?.token_prefix ? `${selectedDept.token_prefix}-•••` : 'CARD-•••'}
                  </div>
                  <div className="text-[11px] text-ink/60 mt-1">
                    {selectedDept?.name || 'Department'}
                  </div>
                </div>

                <div className="border-t border-dashed border-ink/20 pt-2 space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-ink/60">Doctor:</span>
                    <span className="font-semibold">{selectedDoctor?.name || 'Select Doctor'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-ink/60">Fee:</span>
                    <span className="font-semibold">{selectedDoctor ? formatInr(selectedDoctor.fee) : '—'}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-ink/60 leading-relaxed">
                Clicking <strong>Generate token</strong> creates an appointment record, issues the next sequential departmental token, and prints the thermal slip.
              </p>
            </Card>
          )}

          {/* Today's Recent Walk-Ins List */}
          <Card padding="md">
            <div className="text-xs uppercase tracking-wider font-semibold text-ink/70 flex items-center gap-1.5 mb-3">
              <span className="w-1.5 h-1.5 bg-ink inline-block" />
              <span>TODAY'S WALK-INS</span>
            </div>

            <div className="divide-y divide-ink/10 text-xs">
              {recentWalkIns.length === 0 ? (
                <div className="py-4 text-center text-ink/50">No walk-ins registered yet today</div>
              ) : (
                recentWalkIns.map((w) => (
                  <div key={w.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold text-ink">{w.patient.name}</div>
                      <div className="text-[11px] text-ink/60">
                        {w.doctor_name} • {formatTimeIST(w.scheduled_start)}
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-ink/5 text-ink">
                      {w.booking_code}
                    </span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Emergency Confirmation Dialog */}
      <ConfirmDialog
        isOpen={emergencyConfirmOpen}
        onClose={() => setEmergencyConfirmOpen(false)}
        onConfirm={() => {
          setEmergencyConfirmOpen(false);
          if (pendingValues) executeRegistration(pendingValues);
        }}
        title="Confirm Emergency Queue Insertion"
        isDestructive={true}
        confirmLabel="Confirm emergency priority"
        description="Are you sure you want to register this patient as an EMERGENCY (Priority 0)? They will be inserted at the very top of the doctor's queue, ahead of all pre-booked appointments."
      />
    </div>
  );
};

export default WalkInPage;
