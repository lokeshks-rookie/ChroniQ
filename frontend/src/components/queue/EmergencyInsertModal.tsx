import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useHospitalStore } from '@/store/hospitalStore';
import { emergencyInsertPatient } from '@/services/adminApi';
import { Siren } from 'lucide-react';

export interface EmergencyInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedDoctorId?: string;
}

export const EmergencyInsertModal: React.FC<EmergencyInsertModalProps> = ({
  isOpen,
  onClose,
  preselectedDoctorId,
}) => {
  const { doctors, departments } = useHospitalStore();

  const [doctorId, setDoctorId] = useState(preselectedDoctorId || doctors[0]?.id || '');
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState('Acute trauma / severe chest distress');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedDoctor = doctors.find((d) => d.id === doctorId);
  const selectedDept = departments.find((d) => d.id === selectedDoctor?.department_id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      setError('Patient name is required for emergency insert.');
      return;
    }
    if (!selectedDoctor || !selectedDept) {
      setError('Please select a doctor.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await emergencyInsertPatient({
        doctorId,
        departmentId: selectedDept.id,
        patientName: patientName.trim(),
        age: age ? Number(age) : undefined,
        gender,
        phone: phone || undefined,
        reason,
      });
      onClose();
      // Reset form
      setPatientName('');
      setAge('');
      setPhone('');
    } catch (err: any) {
      setError(err.message || 'Failed to insert emergency patient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Emergency queue insertion"
      eyebrow="PRIORITY 0 EMERGENCY"
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={handleSubmit}
            isLoading={isSubmitting}
            icon={<Siren className="w-4 h-4" />}
          >
            Insert at top of queue
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="p-3 bg-danger/10 border border-danger/20 rounded-card text-xs text-danger flex items-start gap-2">
          <Siren className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Emergency Override:</strong> This patient will be assigned Priority 0 and placed at the very top of the doctor's queue, ahead of all scheduled appointments.
          </div>
        </div>

        {error && <div className="text-xs text-danger font-medium">{error}</div>}

        <Select
          label="Target Doctor"
          value={doctorId}
          onChange={(e) => setDoctorId(e.target.value)}
          options={doctors.map((d) => ({
            value: d.id,
            label: `${d.name} (${departments.find((dep) => dep.id === d.department_id)?.name || ''})`,
          }))}
        />

        <Input
          label="Patient Full Name *"
          placeholder="e.g. Ramesh Babu"
          value={patientName}
          onChange={(e) => setPatientName(e.target.value)}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Age"
            type="number"
            placeholder="e.g. 52"
            value={age}
            onChange={(e) => setAge(e.target.value)}
          />
          <Select
            label="Gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </div>

        <Input
          label="Contact Phone"
          type="tel"
          placeholder="+91 98400 00000"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />

        <Textarea
          label="Emergency Reason *"
          rows={2}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required
        />
      </form>
    </Modal>
  );
};
