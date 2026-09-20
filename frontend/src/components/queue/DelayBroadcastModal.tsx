import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { useHospitalStore } from '@/store/hospitalStore';
import { broadcastDoctorDelay } from '@/services/adminApi';
import { Clock, Send } from 'lucide-react';

export interface DelayBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedDoctorId?: string;
}

export const DelayBroadcastModal: React.FC<DelayBroadcastModalProps> = ({
  isOpen,
  onClose,
  preselectedDoctorId,
}) => {
  const { doctors, queue_entries } = useHospitalStore();

  const [doctorId, setDoctorId] = useState(preselectedDoctorId || doctors[0]?.id || '');
  const [minutes, setMinutes] = useState<number>(15);
  const [customMinutes, setCustomMinutes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const selectedDoctor = doctors.find((d) => d.id === doctorId);
  const affectedWaiting = queue_entries.filter((q) => q.doctor_id === doctorId && q.status === 'waiting');
  const affectedCount = affectedWaiting.length;

  const effectiveMinutes = minutes === 0 ? Number(customMinutes) || 15 : minutes;

  const defaultMessage = `Delay Notice: ${selectedDoctor?.name || 'Your doctor'} is delayed by approximately ${effectiveMinutes} minutes due to an emergency case. Your live queue token ETA has updated.`;
  const [message, setMessage] = useState(defaultMessage);

  const handleMinutesChange = (newMin: number) => {
    setMinutes(newMin);
    const minVal = newMin === 0 ? Number(customMinutes) || 15 : newMin;
    setMessage(`Delay Notice: ${selectedDoctor?.name || 'Your doctor'} is delayed by approximately ${minVal} minutes due to an emergency case. Your live queue token ETA has updated.`);
  };

  const handleSend = async () => {
    if (!doctorId) {
      setError('Please select a doctor.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      await broadcastDoctorDelay({
        doctorId,
        minutes: effectiveMinutes,
        message,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to send delay broadcast.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Broadcast doctor delay"
      eyebrow="QUEUE DELAY ADVISORY"
      maxWidth="md"
      footer={
        <>
          <Button variant="secondary" size="md" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={handleSend}
            isLoading={isSubmitting}
            icon={<Send className="w-4 h-4" />}
          >
            Send broadcast ({affectedCount} patients)
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-left">
        {error && <div className="text-xs text-danger font-medium">{error}</div>}

        <Select
          label="Affected Doctor"
          value={doctorId}
          onChange={(e) => {
            setDoctorId(e.target.value);
            const doc = doctors.find((d) => d.id === e.target.value);
            setMessage(`Delay Notice: ${doc?.name || 'Your doctor'} is delayed by approximately ${effectiveMinutes} minutes due to an emergency case. Your live queue token ETA has updated.`);
          }}
          options={doctors.map((d) => ({
            value: d.id,
            label: `${d.name} (${d.specialty})`,
          }))}
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold uppercase tracking-wider text-ink/70">
            Delay duration (minutes)
          </label>
          <div className="flex flex-wrap gap-2">
            {[5, 10, 15, 30].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => handleMinutesChange(m)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                  minutes === m
                    ? 'bg-ink text-base border-ink'
                    : 'bg-base border-ink/20 text-ink hover:border-ink/40'
                }`}
              >
                +{m} mins
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleMinutesChange(0)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors ${
                minutes === 0
                  ? 'bg-ink text-base border-ink'
                  : 'bg-base border-ink/20 text-ink hover:border-ink/40'
              }`}
            >
              Custom
            </button>
          </div>

          {minutes === 0 && (
            <div className="pt-2">
              <input
                type="number"
                placeholder="Enter minutes (e.g. 45)"
                value={customMinutes}
                onChange={(e) => {
                  setCustomMinutes(e.target.value);
                  const minVal = Number(e.target.value) || 15;
                  setMessage(`Delay Notice: ${selectedDoctor?.name || 'Your doctor'} is delayed by approximately ${minVal} minutes due to an emergency case. Your live queue token ETA has updated.`);
                }}
                className="w-full h-10 px-3.5 rounded-card bg-base border border-ink/15 text-sm"
              />
            </div>
          )}
        </div>

        {/* Affected summary banner */}
        <div className="p-3.5 rounded-card bg-ink/5 border border-ink/10 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-accent" />
            <span className="text-ink/80">Affected in active queue:</span>
          </div>
          <span className="font-bold text-ink text-sm font-mono">{affectedCount} patients</span>
        </div>

        <Textarea
          label="Broadcast Message Preview"
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          hint="Channels: In-app live push + SMS alert."
        />
      </div>
    </Modal>
  );
};
