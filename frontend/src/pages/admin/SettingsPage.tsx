import React, { useState, useMemo } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TagInput } from '@/components/ui/TagInput';
import { Toggle } from '@/components/ui/Textarea';
import { useHospitalStore } from '@/store/hospitalStore';
import {
  updateHospitalPolicies,
  updateHospitalProfile,
  saveNotificationTemplate,
} from '@/services/adminApi';
import {
  Building,
  Clock,
  ShieldAlert,
  Bell,
  MapPin,
  ExternalLink,
  MessageSquare,
  Lock,
} from 'lucide-react';
import type { NotificationTemplate } from '@/types';

export const SettingsPage: React.FC = () => {
  const { hospital, templates } = useHospitalStore();

  const [activeSection, setActiveSection] = useState<'profile' | 'timings' | 'policies' | 'notifications'>('policies');
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Profile editable fields
  const [name, setName] = useState(hospital.name);
  const [city, setCity] = useState(hospital.city);
  const [address, setAddress] = useState(hospital.address);
  const [phone, setPhone] = useState(hospital.phone);
  const [email, setEmail] = useState(hospital.email || '');
  const [facilities, setFacilities] = useState<string[]>(hospital.facilities || []);
  const [lat, setLat] = useState(hospital.location?.coordinates[1]?.toString() || '13.0604');
  const [lng, setLng] = useState(hospital.location?.coordinates[0]?.toString() || '80.2508');

  // Timings & Holidays
  const [is24x7, setIs24x7] = useState(hospital.timings === '24x7');
  const [holidays, setHolidays] = useState<string[]>(['2026-10-02 (Gandhi Jayanti)', '2026-11-08 (Diwali)']);

  // Policy Settings (mirrors HospitalSettings)
  const [gracePeriod, setGracePeriod] = useState(hospital.settings.grace_period_minutes);
  const [cancelWindow, setCancelWindow] = useState(hospital.settings.cancel_window_hours);
  const [slotHold, setSlotHold] = useState(hospital.settings.slot_hold_minutes);
  const [walkInsEnabled, setWalkInsEnabled] = useState(hospital.settings.walk_ins_enabled);

  // Active Template
  const [selectedTemplateType, setSelectedTemplateType] = useState(templates[0]?.type || 'booking_confirmed');
  const [localTemplates, setLocalTemplates] = useState<NotificationTemplate[]>(JSON.parse(JSON.stringify(templates)));

  const currentTemplate = localTemplates.find((t) => t.type === selectedTemplateType) || localTemplates[0];

  // Insert variable tag into template text
  const handleInsertVariable = (variable: string) => {
    if (!currentTemplate) return;
    const updatedText = currentTemplate.template_text + ' ' + variable;
    updateCurrentTemplateText(updatedText);
  };

  const updateCurrentTemplateText = (text: string) => {
    setLocalTemplates((prev) =>
      prev.map((t) => (t.type === currentTemplate.type ? { ...t, template_text: text } : t))
    );
    setIsDirty(true);
  };

  const toggleChannel = (channel: 'email' | 'sms', val: boolean) => {
    setLocalTemplates((prev) =>
      prev.map((t) =>
        t.type === currentTemplate.type
          ? {
              ...t,
              channels: { ...t.channels, [channel]: val },
            }
          : t
      )
    );
    setIsDirty(true);
  };

  // Sample data preview render
  const renderedPreview = useMemo(() => {
    if (!currentTemplate) return '';
    return currentTemplate.template_text
      .replace(/{{patient_name}}/g, 'Ravi Shankar')
      .replace(/{{doctor_name}}/g, 'Dr. Anand Ramanathan')
      .replace(/{{time}}/g, '10:30 AM')
      .replace(/{{token}}/g, 'CARD-014')
      .replace(/{{eta_minutes}}/g, '15')
      .replace(/{{message}}/g, 'General hospital OPD advisory');
  }, [currentTemplate]);

  // Save all settings
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      // 1. Policies
      await updateHospitalPolicies({
        grace_period_minutes: gracePeriod,
        cancel_window_hours: cancelWindow,
        slot_hold_minutes: slotHold,
        walk_ins_enabled: walkInsEnabled,
      });

      // 2. Profile
      await updateHospitalProfile({
        name,
        city,
        address,
        phone,
        email,
        facilities,
        timings: is24x7 ? '24x7' : '08:00 – 20:00',
        location: {
          type: 'Point',
          coordinates: [parseFloat(lng) || 80.25, parseFloat(lat) || 13.06],
        },
      });

      // 3. Current template
      if (currentTemplate) {
        await saveNotificationTemplate(currentTemplate.type, currentTemplate);
      }

      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setName(hospital.name);
    setCity(hospital.city);
    setAddress(hospital.address);
    setPhone(hospital.phone);
    setEmail(hospital.email || '');
    setFacilities(hospital.facilities);
    setGracePeriod(hospital.settings.grace_period_minutes);
    setCancelWindow(hospital.settings.cancel_window_hours);
    setSlotHold(hospital.settings.slot_hold_minutes);
    setWalkInsEnabled(hospital.settings.walk_ins_enabled);
    setLocalTemplates(JSON.parse(JSON.stringify(templates)));
    setIsDirty(false);
  };

  return (
    <div className="space-y-6 pb-20">
      <PageHeader
        eyebrow="SETTINGS"
        title="Hospital Policies & Configurations"
        description="Global OPD operational guidelines, arrival grace periods, booking cancellation windows, and broadcast templates."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Sub-Navigation (3 cols) */}
        <div className="lg:col-span-3 space-y-1">
          {[
            { id: 'policies', label: 'Queue & Booking Policies', icon: <ShieldAlert className="w-4 h-4" /> },
            { id: 'profile', label: 'Hospital Profile', icon: <Building className="w-4 h-4" /> },
            { id: 'timings', label: 'Timings & Holidays', icon: <Clock className="w-4 h-4" /> },
            { id: 'notifications', label: 'Notification Templates', icon: <Bell className="w-4 h-4" /> },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id as any)}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-full text-xs font-semibold text-left transition-colors cursor-pointer ${
                activeSection === item.id
                  ? 'bg-ink text-base'
                  : 'text-ink/75 hover:text-ink hover:bg-ink/5'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Right Content Section (9 cols) */}
        <div className="lg:col-span-9 space-y-6">
          {/* SECTION 1: Policies (mirrors HospitalSettings) */}
          {activeSection === 'policies' && (
            <Card padding="lg" className="space-y-6">
              <div>
                <div className="eyebrow flex items-center gap-1.5">
                  <span>INTAKE POLICIES</span>
                </div>
                <h3 className="h2 mt-0.5">Queue and Booking Governance</h3>
              </div>

              {/* Grace Period */}
              <div className="p-4 rounded-card border border-ink/10 bg-base space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-ink">
                    Late Arrival Grace Period
                  </label>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-ink/5 text-ink">
                    {gracePeriod} minutes
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="5"
                  value={gracePeriod}
                  onChange={(e) => {
                    setGracePeriod(Number(e.target.value));
                    setIsDirty(true);
                  }}
                  className="w-full accent-ink cursor-pointer"
                />
                <p className="text-xs text-ink/80 font-medium">
                  Impact: Patients arriving more than {gracePeriod} minutes after their slot join behind the current queue and forfeit their original slot position.
                </p>
              </div>

              {/* Cancel Window */}
              <div className="p-4 rounded-card border border-ink/10 bg-base space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-ink">
                    Cancellation Window Prior to Slot
                  </label>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-ink/5 text-ink">
                    {cancelWindow} hours
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="24"
                  step="1"
                  value={cancelWindow}
                  onChange={(e) => {
                    setCancelWindow(Number(e.target.value));
                    setIsDirty(true);
                  }}
                  className="w-full accent-ink cursor-pointer"
                />
                <p className="text-xs text-ink/80 font-medium">
                  Impact: Patients can cancel or reschedule without penalty up to {cancelWindow} hours before their appointment. Inside this window, cancellation requires desk assistance.
                </p>
              </div>

              {/* Slot Hold Duration */}
              <div className="p-4 rounded-card border border-ink/10 bg-base space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-ink">
                    Online Slot Hold Reservation Lock
                  </label>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-ink/5 text-ink">
                    {slotHold} minutes
                  </span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="15"
                  step="1"
                  value={slotHold}
                  onChange={(e) => {
                    setSlotHold(Number(e.target.value));
                    setIsDirty(true);
                  }}
                  className="w-full accent-ink cursor-pointer"
                />
                <p className="text-xs text-ink/80 font-medium">
                  Impact: Booking slots selected by patients on web/mobile are temporarily locked for {slotHold} minutes before expiring back to the open pool.
                </p>
              </div>

              {/* Walk-in Enabled Toggle */}
              <div className="p-4 rounded-card border border-ink/10 bg-base">
                <Toggle
                  label="Enable Outpatient Walk-In Registrations"
                  description="When disabled, front-desk walk-in registration is locked and requires patient pre-booking."
                  checked={walkInsEnabled}
                  onChange={(val) => {
                    setWalkInsEnabled(val);
                    setIsDirty(true);
                  }}
                />
                <p className="text-xs text-ink/80 font-medium mt-2">
                  Impact: {walkInsEnabled ? 'Desk receptionists may issue on-demand walk-in tokens.' : 'Walk-in registrations are suspended across all departments.'}
                </p>
              </div>
            </Card>
          )}

          {/* SECTION 2: Hospital Profile */}
          {activeSection === 'profile' && (
            <Card padding="lg" className="space-y-4">
              <div>
                <div className="eyebrow flex items-center gap-1.5">
                  <span>FACILITY PROFILE</span>
                </div>
                <h3 className="h2 mt-0.5">Facility Identity & Geo Coordinates</h3>
              </div>

              <Input
                label="Hospital Legal Name *"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setIsDirty(true);
                }}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="City *"
                  value={city}
                  onChange={(e) => {
                    setCity(e.target.value);
                    setIsDirty(true);
                  }}
                />
                <Input
                  label="Contact Phone *"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setIsDirty(true);
                  }}
                />
              </div>

              <Input
                label="Official Physical Address *"
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value);
                  setIsDirty(true);
                }}
              />

              <Input
                label="Administrative Contact Email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setIsDirty(true);
                }}
              />

              <TagInput
                label="Registered Clinical Facilities"
                tags={facilities}
                onChange={(tags) => {
                  setFacilities(tags);
                  setIsDirty(true);
                }}
              />

              {/* Geo Location */}
              <div className="p-4 rounded-card border border-ink/10 bg-base/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="eyebrow flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Geo Location Coordinates (GeoJSON Point)</span>
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${lat},${lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                  >
                    <span>Open in maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Latitude"
                    value={lat}
                    onChange={(e) => {
                      setLat(e.target.value);
                      setIsDirty(true);
                    }}
                  />
                  <Input
                    label="Longitude"
                    value={lng}
                    onChange={(e) => {
                      setLng(e.target.value);
                      setIsDirty(true);
                    }}
                  />
                </div>
              </div>
            </Card>
          )}

          {/* SECTION 3: Timings & Holidays */}
          {activeSection === 'timings' && (
            <Card padding="lg" className="space-y-6">
              <div>
                <div className="eyebrow flex items-center gap-1.5">
                  <span>FACILITY HOURS</span>
                </div>
                <h3 className="h2 mt-0.5">Operating Hours and Hospital Holidays</h3>
              </div>

              <div className="p-4 rounded-card border border-ink/10 bg-base">
                <Toggle
                  label="24x7 Facility Operations"
                  description="Hospital OPD, emergency, and triage units operate around the clock."
                  checked={is24x7}
                  onChange={(val) => {
                    setIs24x7(val);
                    setIsDirty(true);
                  }}
                />
              </div>

              <TagInput
                label="Designated Hospital Holidays"
                tags={holidays}
                onChange={(tags) => {
                  setHolidays(tags);
                  setIsDirty(true);
                }}
                placeholder="e.g. 2026-12-25 (Christmas)"
              />
            </Card>
          )}

          {/* SECTION 4: Notification Templates */}
          {activeSection === 'notifications' && (
            <Card padding="lg" className="space-y-6">
              <div>
                <div className="eyebrow flex items-center gap-1.5">
                  <span>MESSAGE TEMPLATES</span>
                </div>
                <h3 className="h2 mt-0.5">Automated Patient Alert Messages</h3>
              </div>

              {/* Template selector pills */}
              <div className="flex flex-wrap gap-2 text-xs">
                {localTemplates.map((tmpl) => (
                  <button
                    key={tmpl.type}
                    type="button"
                    onClick={() => setSelectedTemplateType(tmpl.type)}
                    className={`px-3 py-1.5 rounded-full font-medium cursor-pointer transition-colors ${
                      tmpl.type === currentTemplate.type
                        ? 'bg-accent text-ink font-semibold'
                        : 'border border-ink/20 text-ink hover:border-ink/40 bg-base'
                    }`}
                  >
                    {tmpl.label}
                  </button>
                ))}
              </div>

              {/* Channels */}
              <div className="p-4 rounded-card border border-ink/10 bg-base space-y-3">
                <div className="eyebrow">
                  Dispatched Channels
                </div>
                <div className="flex flex-wrap items-center gap-6 text-xs">
                  <div className="flex items-center gap-2 text-ink">
                    <Lock className="w-3.5 h-3.5 text-ink/50" />
                    <span className="font-semibold">In-App Live Push (Mandatory)</span>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={currentTemplate.channels.email}
                      onChange={(e) => toggleChannel('email', e.target.checked)}
                      className="w-4 h-4 accent-ink cursor-pointer"
                    />
                    <span>Email Notification</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={currentTemplate.channels.sms}
                      onChange={(e) => toggleChannel('sms', e.target.checked)}
                      className="w-4 h-4 accent-ink cursor-pointer"
                    />
                    <span>SMS / WhatsApp Text</span>
                  </label>
                </div>
              </div>

              {/* Variable Chips */}
              <div className="space-y-1.5">
                <div className="eyebrow">
                  Click Variable to Insert into Body:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentTemplate.variables.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => handleInsertVariable(v)}
                      className="px-2.5 py-1 rounded-full bg-ink/5 border border-ink/15 text-xs font-mono text-ink hover:bg-ink hover:text-base transition-colors cursor-pointer"
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Body Input & SMS Counter */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-ink/70">
                  <label className="eyebrow">Template Text Body *</label>
                  <span className="font-mono">{currentTemplate.template_text.length} / 160 chars (1 SMS segment)</span>
                </div>
                <textarea
                  rows={3}
                  value={currentTemplate.template_text}
                  onChange={(e) => updateCurrentTemplateText(e.target.value)}
                  className="w-full p-3.5 rounded-card bg-base text-ink border border-ink/20 text-sm font-sans focus-visible:border-ink outline-none"
                />
              </div>

              {/* Live Preview rendered in phone-shaped card */}
              <div className="p-4 rounded-card border border-ink/10 bg-base/50 space-y-2">
                <div className="eyebrow flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Sample Patient SMS / Push Preview</span>
                </div>
                <div className="max-w-sm p-3.5 rounded-card bg-base border border-ink/20 shadow-sm text-xs leading-relaxed text-ink font-sans">
                  {renderedPreview}
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Sticky Save Bar */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-ink text-base px-6 py-3.5 rounded-full border border-base/20 shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-3">
          <span className="text-xs font-semibold text-base/90">
            Unsaved policy & profile modifications.
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleDiscard} className="text-base hover:bg-base/10">
              Discard
            </Button>
            <Button
              variant="inverted"
              size="sm"
              onClick={handleSaveAll}
              isLoading={isSaving}
            >
              Save hospital settings
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
