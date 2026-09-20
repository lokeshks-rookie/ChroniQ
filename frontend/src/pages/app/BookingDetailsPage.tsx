import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, AlertCircle, Plus, X, Upload } from 'lucide-react';
import { Dropdown } from '@/components/ui/Dropdown';
import { useBookingStore } from '@/store/bookingStore';
import { useAuthStore } from '@/store/authStore';
import { mockFamilyMembers, type MockFamilyMember } from '@/data/mockData';

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function BookingDetailsPage() {
  const navigate = useNavigate();
  const store = useBookingStore();
  const { user } = useAuthStore();

  const [visitFor, setVisitFor] = useState<'myself' | string>(store.visitFor || 'myself');
  const [reason, setReason] = useState(store.reason || '');
  const [symptoms, setSymptoms] = useState(store.symptoms || '');
  const [attachedFile, setAttachedFile] = useState<File | null>(store.attachedFile);
  const [countdown, setCountdown] = useState('');
  const [showFamilyModal, setShowFamilyModal] = useState(false);
  const [familyList, setFamilyList] = useState<MockFamilyMember[]>(mockFamilyMembers);

  // New family member form
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [newGender, setNewGender] = useState('');
  const [newRelation, setNewRelation] = useState('');

  // Redirect if no booking in progress
  useEffect(() => {
    if (!store.doctor || !store.slotId) {
      navigate('/app/search', { replace: true });
    }
  }, []);

  // Countdown timer
  useEffect(() => {
    if (!store.holdExpiry) return;
    const tick = () => {
      const remaining = (store.holdExpiry || 0) - Date.now();
      if (remaining <= 0) {
        setCountdown('0:00');
        navigate(`/app/book/${store.doctor?._id}`, { replace: true });
      } else {
        setCountdown(formatCountdown(remaining));
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [store.holdExpiry]);

  if (!store.doctor || !store.slotId) return null;

  const getVisitForName = () => {
    if (visitFor === 'myself') return user?.name || 'Myself';
    const member = familyList.find((m) => m._id === visitFor);
    return member?.name || 'Family member';
  };

  const handleAddFamily = () => {
    if (!newName.trim() || !newAge || !newGender || !newRelation.trim()) return;
    const newMember: MockFamilyMember = {
      _id: 'fam-new-' + Date.now(),
      name: newName.trim(),
      age: Number(newAge),
      gender: newGender as 'male' | 'female' | 'other',
      relation: newRelation.trim(),
    };
    setFamilyList([...familyList, newMember]);
    setVisitFor(newMember._id);
    setShowFamilyModal(false);
    setNewName(''); setNewAge(''); setNewGender(''); setNewRelation('');
  };

  const handleContinue = () => {
    if (!reason.trim()) return;
    store.setPatientDetails({
      visitFor,
      visitForName: getVisitForName(),
      reason: reason.trim(),
      symptoms: symptoms.trim(),
      attachedFile,
    });
    navigate('/app/book/confirm');
  };

  return (
    <div style={{ maxWidth: '640px' }}>
      <style>{`
        .detail-input {
          width: 100%; padding: 12px 14px; border-radius: 10px;
          border: 1.5px solid rgba(154,110,86,0.15); background: var(--color-base);
          color: var(--color-ink); font-family: var(--font-sans); font-size: 14px;
        }
        .detail-input:focus { outline: none; border-color: var(--color-accent); }
        .detail-input::placeholder { color: var(--color-muted); }
      `}</style>

      {/* ── Sticky Summary ── */}
      <div style={{
        position: 'sticky', top: '64px', zIndex: 20,
        backgroundColor: 'var(--color-base)', padding: '16px 0',
        borderBottom: '1px solid rgba(154,110,86,0.08)', marginBottom: '24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-ink)' }}>{store.doctor.name}</p>
            <p style={{ fontSize: '13px', color: 'var(--color-muted)' }}>
              {store.slotDate} • {store.slotTime}
            </p>
          </div>
          {countdown && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '10px',
              backgroundColor: 'rgba(154,110,86,0.08)',
            }}>
              <Clock size={14} color="var(--color-accent)" />
              <span style={{ fontSize: '14px', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{countdown}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Who is this visit for? ── */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '12px' }}>
          Who is this visit for?
        </label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px',
            borderRadius: '10px', border: `1.5px solid ${visitFor === 'myself' ? 'var(--color-ink)' : 'rgba(154,110,86,0.12)'}`,
            cursor: 'pointer', backgroundColor: visitFor === 'myself' ? 'rgba(25,8,1,0.03)' : 'transparent',
          }}>
            <input type="radio" name="visitFor" checked={visitFor === 'myself'} onChange={() => setVisitFor('myself')} style={{ accentColor: 'var(--color-ink)' }} />
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>Myself</span>
          </label>

          {familyList.map((member) => (
            <label key={member._id} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px',
              borderRadius: '10px', border: `1.5px solid ${visitFor === member._id ? 'var(--color-ink)' : 'rgba(154,110,86,0.12)'}`,
              cursor: 'pointer', backgroundColor: visitFor === member._id ? 'rgba(25,8,1,0.03)' : 'transparent',
            }}>
              <input type="radio" name="visitFor" checked={visitFor === member._id} onChange={() => setVisitFor(member._id)} style={{ accentColor: 'var(--color-ink)' }} />
              <div>
                <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-ink)' }}>{member.name}</span>
                <span style={{ fontSize: '12px', color: 'var(--color-muted)', marginLeft: '8px' }}>{member.relation} • {member.age}y</span>
              </div>
            </label>
          ))}

          <button onClick={() => setShowFamilyModal(true)} style={{
            display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px',
            borderRadius: '10px', border: '1.5px dashed rgba(154,110,86,0.2)',
            background: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
            color: 'var(--color-accent)', fontFamily: 'var(--font-sans)',
          }}>
            <Plus size={14} /> Add family member
          </button>
        </div>
      </div>

      {/* ── Reason ── */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
          Reason for visit <span style={{ color: 'var(--color-danger)' }}>*</span>
        </label>
        <input className="detail-input" placeholder="e.g. Chest discomfort follow-up" value={reason} onChange={(e) => setReason(e.target.value)} />
      </div>

      {/* ── Symptoms ── */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
          Symptoms or notes <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--color-muted)' }}>(optional)</span>
        </label>
        <textarea className="detail-input" rows={3} placeholder="Describe any symptoms..." value={symptoms} onChange={(e) => setSymptoms(e.target.value)} style={{ resize: 'vertical' }} />
      </div>

      {/* ── Attach report ── */}
      <div style={{ marginBottom: '32px' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 700, color: 'var(--color-ink)', marginBottom: '8px' }}>
          Attach report <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--color-muted)' }}>(optional)</span>
        </label>
        {/* TODO: Wire to a real upload endpoint. File is stored in local component state only. */}
        <label style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '14px',
          borderRadius: '10px', border: '1.5px dashed rgba(154,110,86,0.2)',
          cursor: 'pointer', backgroundColor: 'rgba(154,110,86,0.02)',
        }}>
          <Upload size={16} color="var(--color-muted)" />
          <span style={{ fontSize: '13px', color: attachedFile ? 'var(--color-ink)' : 'var(--color-muted)', fontWeight: 500 }}>
            {attachedFile ? attachedFile.name : 'Choose a file...'}
          </span>
          <input type="file" hidden onChange={(e) => setAttachedFile(e.target.files?.[0] || null)} />
        </label>
      </div>

      {/* ── Continue ── */}
      <button
        onClick={handleContinue}
        disabled={!reason.trim()}
        style={{
          width: '100%', padding: '14px', borderRadius: '12px',
          backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
          border: 'none', fontSize: '15px', fontWeight: 700,
          cursor: !reason.trim() ? 'not-allowed' : 'pointer',
          opacity: !reason.trim() ? 0.5 : 1, transition: 'opacity 0.2s',
        }}
      >
        Continue to review
      </button>

      {/* ── Add Family Modal ── */}
      {showFamilyModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          backgroundColor: 'rgba(25,8,1,0.4)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '24px',
        }} onClick={() => setShowFamilyModal(false)}>
          <div style={{
            width: '100%', maxWidth: '400px', backgroundColor: 'var(--color-base)',
            borderRadius: '20px', padding: '28px', boxShadow: '0 16px 48px rgba(25,8,1,0.12)',
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-ink)' }}>Add family member</h3>
              <button onClick={() => setShowFamilyModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-muted)' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input className="detail-input" placeholder="Full name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <div style={{ display: 'flex', gap: '10px' }}>
                <input className="detail-input" type="number" placeholder="Age" value={newAge} onChange={(e) => setNewAge(e.target.value)} style={{ flex: 1 }} />
                <div style={{ flex: 1 }}>
                  <Dropdown
                    value={newGender}
                    onChange={(val) => setNewGender(val)}
                    placeholder="Gender"
                    options={[
                      { value: '', label: 'Gender' },
                      { value: 'male', label: 'Male' },
                      { value: 'female', label: 'Female' },
                      { value: 'other', label: 'Other' },
                    ]}
                    width="w-full"
                    className="w-full"
                    triggerClassName="w-full justify-between h-[42px] rounded-[10px]"
                  />
                </div>
              </div>
              <input className="detail-input" placeholder="Relation (e.g. Spouse, Child)" value={newRelation} onChange={(e) => setNewRelation(e.target.value)} />
              <button onClick={handleAddFamily} disabled={!newName.trim() || !newAge || !newGender || !newRelation.trim()}
                style={{
                  padding: '12px', borderRadius: '10px',
                  backgroundColor: 'var(--color-ink)', color: 'var(--color-base)',
                  border: 'none', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
                  opacity: (!newName.trim() || !newAge || !newGender || !newRelation.trim()) ? 0.5 : 1,
                  marginTop: '4px',
                }}
              >
                Add member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
