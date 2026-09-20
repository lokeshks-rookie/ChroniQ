import React from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge, DoctorAvailabilityChip } from '@/components/ui/StatusBadge';
import { TokenBadge } from '@/components/queue/TokenBadge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Toggle } from '@/components/ui/Textarea';
import { Accordion } from '@/components/ui/StatCard';
import { LiveIndicator } from '@/components/ui/LiveIndicator';
import { Sparkline } from '@/components/ui/LiveIndicator';
import { Avatar } from '@/components/ui/Avatar';

export const UiKitPreviewPage: React.FC = () => {
  const [toggleState, setToggleState] = React.useState(true);
  const [sampleInput, setSampleInput] = React.useState('ChroniQ Medical');
  const [sampleSelect, setSampleSelect] = React.useState('opt1');

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SYSTEM"
        title="UI Kit & Design System Tokens"
        description="Verification gallery of core components, tokens, and micro-interactions adhering to brand guidelines."
      />

      {/* Buttons */}
      <Card padding="md" className="space-y-4">
        <h3 className="text-base font-semibold text-ink">Buttons (Pill & Secondary)</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" size="lg">Primary LG</Button>
          <Button variant="primary" size="md">Primary MD</Button>
          <Button variant="primary" size="sm">Primary SM</Button>
          <Button variant="secondary" size="md">Secondary Pill</Button>
          <Button variant="ghost" size="md">Ghost Action</Button>
          <Button variant="danger" size="md">Destructive Danger</Button>
        </div>

        {/* On dark surface test */}
        <div className="p-4 rounded-card bg-ink text-base flex flex-wrap items-center gap-3">
          <span className="text-xs text-base/70">On Ink Band:</span>
          <Button variant="inverted" size="md">Inverted Button</Button>
        </div>
      </Card>

      {/* Badges & Form Controls */}
      <Card padding="md" className="space-y-4">
        <h3 className="text-base font-semibold text-ink">Badges, Pills & Form Controls</h3>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="default">Default Ink</Badge>
          <Badge variant="accent">Accent Active</Badge>
          <Badge variant="outline">Outline Neutral</Badge>
          <Badge variant="success">Success Functional</Badge>
          <Badge variant="danger">Danger Functional</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <Input
            label="Sample Input"
            value={sampleInput}
            onChange={(e) => setSampleInput(e.target.value)}
          />
          <Select
            label="Sample Select"
            value={sampleSelect}
            onChange={(e) => setSampleSelect(e.target.value)}
            options={[
              { value: 'opt1', label: 'Standard Consultation' },
              { value: 'opt2', label: 'Priority Follow-up' },
            ]}
          />
          <div className="flex flex-col justify-end">
            <Toggle
              label="Real-time Synchronization"
              checked={toggleState}
              onChange={setToggleState}
              description="Keep client state mirrored with store ticker."
            />
          </div>
        </div>
      </Card>

      {/* Status Badges & Pills */}
      <Card padding="md" className="space-y-4">
        <h3 className="text-base font-semibold text-ink">Status Badges & Attention Mapping</h3>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status="booked" />
          <StatusBadge status="checked_in" />
          <StatusBadge status="in_queue" />
          <StatusBadge status="called" />
          <StatusBadge status="in_consultation" />
          <StatusBadge status="completed" />
          <StatusBadge status="cancelled" />
          <StatusBadge status="no_show" />
          <StatusBadge status="priority_1" />
          <StatusBadge status="priority_0" />
        </div>

        <h4 className="text-sm font-semibold text-ink pt-2">Doctor Availability Chips</h4>
        <div className="flex flex-wrap items-center gap-4">
          <DoctorAvailabilityChip status="available" />
          <DoctorAvailabilityChip status="in_consultation" />
          <DoctorAvailabilityChip status="break" />
          <DoctorAvailabilityChip status="late" lateMinutes={15} />
          <DoctorAvailabilityChip status="leave" />
        </div>
      </Card>

      {/* Token Badges & Live Indicators */}
      <Card padding="md" className="space-y-4">
        <h3 className="text-base font-semibold text-ink">Department Tokens & Indicators</h3>
        <div className="flex flex-wrap items-center gap-3">
          <TokenBadge token="CARD-014" size="hero" />
          <TokenBadge token="GENM-008" size="lg" />
          <TokenBadge token="ORTH-003" size="md" />
          <TokenBadge token="PEDI-021" size="sm" />
        </div>

        <div className="flex items-center gap-6 pt-2">
          <LiveIndicator label="Live queue pulse active" />
          <Sparkline data={[10, 22, 14, 28, 19, 35, 42]} width={100} height={28} />
          <Avatar name="Dr. Anand Ramanathan" size="md" />
        </div>
      </Card>

      {/* Accordion */}
      <Card padding="md">
        <h3 className="text-base font-semibold text-ink mb-2">Accordion (FAQ & Expandable Details)</h3>
        <Accordion
          items={[
            {
              id: 'q1',
              title: 'How does late arrival grace period work?',
              content: 'If a patient arrives later than the configured grace period (default 10 minutes) after their slot, their sort_time is reset to their arrival time and they join behind the current waiting queue.',
            },
            {
              id: 'q2',
              title: 'What is the dynamic ETA computation formula?',
              content: 'ETA = remaining time of current consultation + (position - 1) * doctor.avg_consult_minutes + 8% buffer, rounded up.',
            },
          ]}
        />
      </Card>
    </div>
  );
};
