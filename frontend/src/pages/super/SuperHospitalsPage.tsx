import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Hospital,
  Building2,
  MapPin,
  Phone,
  Star,
  Users,
  UserCheck,
  Stethoscope,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { mockHospitals, mockDoctors, type MockHospital } from '@/data/mockData';
import { useHospitalStore } from '@/store/hospitalStore';
import { useUiStore } from '@/store/uiStore';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const DISTRICTS = ['All Districts', 'Chennai', 'Madurai', 'Coimbatore'] as const;
type DistrictFilter = (typeof DISTRICTS)[number];

export default function SuperHospitalsPage() {
  const navigate = useNavigate();
  const { addToast } = useUiStore();
  const storeUsers = useHospitalStore((s) => s.users);

  const [hospitalsList, setHospitalsList] = useState<MockHospital[]>(mockHospitals);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictFilter>('All Districts');
  const [searchQuery, setSearchQuery] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  // New hospital form
  const [newHospName, setNewHospName] = useState('');
  const [newHospCity, setNewHospCity] = useState<'Chennai' | 'Madurai' | 'Coimbatore'>('Chennai');
  const [newHospAddress, setNewHospAddress] = useState('');
  const [newHospPhone, setNewHospPhone] = useState('+91 ');
  const [newHospFacilities, setNewHospFacilities] = useState('General Medicine, Cardiology, Emergency');

  // Filtered hospitals
  const filteredHospitals = useMemo(() => {
    return hospitalsList.filter((h) => {
      const matchesDistrict =
        selectedDistrict === 'All Districts' ||
        h.city.toLowerCase() === selectedDistrict.toLowerCase();
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        h.name.toLowerCase().includes(q) ||
        h.city.toLowerCase().includes(q) ||
        h.address.toLowerCase().includes(q);
      return matchesDistrict && matchesSearch;
    });
  }, [hospitalsList, selectedDistrict, searchQuery]);

  // Counts
  const totalDoctors = useMemo(() => mockDoctors.length, []);
  const totalStaff = useMemo(() => storeUsers.length, [storeUsers]);
  const districtCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'All Districts': hospitalsList.length,
      Chennai: 0,
      Madurai: 0,
      Coimbatore: 0,
    };
    hospitalsList.forEach((h) => {
      if (counts[h.city] !== undefined) {
        counts[h.city]++;
      }
    });
    return counts;
  }, [hospitalsList]);

  // Handle create new hospital
  const handleCreateHospital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospName.trim()) {
      addToast({ title: 'Hospital name required', variant: 'danger' });
      return;
    }

    const newHosp: MockHospital = {
      _id: `hosp_${Date.now()}`,
      name: newHospName.trim(),
      city: newHospCity,
      address: newHospAddress.trim() || `${newHospCity}, Tamil Nadu`,
      phone: newHospPhone.trim() || '+91 44 0000 0000',
      rating_avg: 4.8,
      rating_count: 1,
      facilities: newHospFacilities.split(',').map((f) => f.trim()).filter(Boolean),
      amenities: ['Emergency 24x7', 'ICU', 'Pharmacy', 'Lab', 'Parking'],
      about: `${newHospName.trim()} is an accredited hospital serving patients in ${newHospCity}.`,
      timings: '24×7',
      status: 'active',
      lat: newHospCity === 'Madurai' ? 9.9252 : newHospCity === 'Coimbatore' ? 11.0168 : 13.0604,
      lng: newHospCity === 'Madurai' ? 78.1198 : newHospCity === 'Coimbatore' ? 77.0033 : 80.2508,
      openNow: true,
    };

    setHospitalsList((prev) => [newHosp, ...prev]);
    setModalOpen(false);
    setNewHospName('');
    setNewHospAddress('');
    setNewHospPhone('+91 ');
    addToast({
      title: 'Hospital Registered',
      description: `${newHosp.name} added to ChroniQ network.`,
      variant: 'success',
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-accent mb-1">
            <Hospital className="w-3.5 h-3.5" />
            <span>Super Admin Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-ink tracking-tight">
            Hospital Network & Facilities
          </h1>
          <p className="text-sm text-ink/65 mt-1">
            Centrally oversee registered healthcare institutions across Tamil Nadu (Chennai, Madurai, Coimbatore).
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-card bg-ink text-base text-sm font-semibold hover:bg-ink/90 active:scale-95 transition-all shadow-sm shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Hospital</span>
        </button>
      </div>

      {/* ── Summary KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-card bg-base border border-ink/10 shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Hospitals</span>
            <Building2 className="w-4 h-4 text-accent" />
          </div>
          <div className="text-3xl font-extrabold text-ink">{hospitalsList.length}</div>
          <div className="text-[12px] text-ink/60 mt-1">Across 3 Major Districts in TN</div>
        </div>

        <div className="p-5 rounded-card bg-base border border-ink/10 shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Staff Enrolled</span>
            <Users className="w-4 h-4 text-accent" />
          </div>
          <div className="text-3xl font-extrabold text-ink">{totalStaff}</div>
          <div className="text-[12px] text-ink/60 mt-1">Admins, Receptionists & Personnel</div>
        </div>

        <div className="p-5 rounded-card bg-base border border-ink/10 shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Registered Doctors</span>
            <Stethoscope className="w-4 h-4 text-accent" />
          </div>
          <div className="text-3xl font-extrabold text-ink">{totalDoctors}</div>
          <div className="text-[12px] text-ink/60 mt-1">Active Medical Consultants</div>
        </div>

        <div className="p-5 rounded-card bg-base border border-ink/10 shadow-xs">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Districts Covered</span>
            <MapPin className="w-4 h-4 text-accent" />
          </div>
          <div className="text-3xl font-extrabold text-ink">3</div>
          <div className="text-[12px] text-ink/60 mt-1">Chennai • Madurai • Coimbatore</div>
        </div>
      </div>

      {/* ── District Filter Tabs & Search Bar ── */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
        {/* District Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-card bg-ink/5 border border-ink/10 overflow-x-auto">
          {DISTRICTS.map((district) => {
            const count = districtCounts[district] || 0;
            const isActive = selectedDistrict === district;
            return (
              <button
                key={district}
                onClick={() => setSelectedDistrict(district)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-ink text-base shadow-xs'
                    : 'text-ink/70 hover:text-ink hover:bg-ink/5'
                }`}
              >
                <span>{district}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-bold ${
                    isActive ? 'bg-base/20 text-base' : 'bg-ink/10 text-ink/70'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none" />
          <input
            type="text"
            placeholder="Search hospitals or addresses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-card bg-base border border-ink/15 text-ink placeholder:text-ink/40 focus:outline-hidden focus:border-accent"
          />
        </div>
      </div>

      {/* ── Hospital Cards Grid ── */}
      {filteredHospitals.length === 0 ? (
        <div className="text-center py-16 px-4 bg-base rounded-card border border-dashed border-ink/20">
          <Hospital className="w-12 h-12 mx-auto text-ink/30 mb-3" />
          <h3 className="text-base font-bold text-ink mb-1">No hospitals match your criteria</h3>
          <p className="text-xs text-ink/60 max-w-sm mx-auto mb-4">
            Try adjusting your search query or selecting a different district filter.
          </p>
          <button
            onClick={() => {
              setSelectedDistrict('All Districts');
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-accent hover:underline cursor-pointer"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredHospitals.map((hosp) => {
            // Count matching staff from storeUsers
            const hospitalStaff = storeUsers.filter(
              (u) => u.hospital_id === hosp._id || (hosp._id === 'hosp_city_01' && !u.hospital_id)
            );
            // Count matching doctors from mockDoctors
            const hospitalDoctors = mockDoctors.filter((d) => d.hospitalId === hosp._id);

            const cityColor =
              hosp.city === 'Madurai'
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : hosp.city === 'Coimbatore'
                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                : 'bg-blue-100 text-blue-900 border-blue-300';

            return (
              <div
                key={hosp._id}
                className="rounded-card bg-base border border-ink/10 p-5 flex flex-col justify-between hover:border-accent/40 transition-all shadow-xs"
              >
                <div>
                  {/* Top Bar: District Badge & Timings */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${cityColor}`}
                    >
                      {hosp.city}
                    </span>
                    <div className="flex items-center gap-1.5 text-[11px] text-ink/60 font-medium">
                      <Clock className="w-3.5 h-3.5 text-accent" />
                      <span>{hosp.timings}</span>
                    </div>
                  </div>

                  {/* Hospital Name & Rating */}
                  <h3 className="text-base font-bold text-ink line-clamp-1 mb-1" title={hosp.name}>
                    {hosp.name}
                  </h3>

                  <div className="flex items-center gap-2 mb-3 text-xs text-ink/70">
                    <div className="flex items-center gap-1 text-amber-600 font-semibold">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{hosp.rating_avg.toFixed(1)}</span>
                    </div>
                    <span>•</span>
                    <span>{hosp.rating_count} reviews</span>
                  </div>

                  {/* Address & Contact */}
                  <div className="space-y-1.5 text-xs text-ink/65 mb-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-3.5 h-3.5 text-ink/40 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{hosp.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-ink/40 shrink-0" />
                      <span>{hosp.phone}</span>
                    </div>
                  </div>

                  {/* Facilities Badges */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {hosp.facilities.slice(0, 3).map((fac) => (
                      <span
                        key={fac}
                        className="text-[10px] px-2 py-0.5 rounded bg-ink/5 text-ink/75 font-medium"
                      >
                        {fac}
                      </span>
                    ))}
                    {hosp.facilities.length > 3 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-ink/5 text-ink/50 font-medium">
                        +{hosp.facilities.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* Bottom Section: Staff Counts & Action */}
                <div className="pt-3 border-t border-ink/10 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-xs font-semibold text-ink/80">
                    <div className="flex items-center gap-1.5" title="Registered Staff Members">
                      <UserCheck className="w-4 h-4 text-accent" />
                      <span>{hospitalStaff.length} Staff</span>
                    </div>
                    <div className="flex items-center gap-1.5" title="Active Doctors">
                      <Stethoscope className="w-4 h-4 text-accent" />
                      <span>{hospitalDoctors.length || 4} Doctors</span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/admin/staff?hospital=${hosp._id}`)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-accent hover:text-ink transition-colors cursor-pointer"
                  >
                    <span>Manage Staff</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Hospital Modal ── */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Register Hospital Facility"
          eyebrow="ONBOARDING"
        >
          <form onSubmit={handleCreateHospital} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-1.5">
                Hospital Name *
              </label>
              <Input
                placeholder="e.g. Apollo Speciality Hospital"
                value={newHospName}
                onChange={(e) => setNewHospName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-1.5">
                  District / City *
                </label>
                <Select
                  value={newHospCity}
                  onChange={(e) => setNewHospCity(e.target.value as any)}
                  options={[
                    { value: 'Chennai', label: 'Chennai' },
                    { value: 'Madurai', label: 'Madurai' },
                    { value: 'Coimbatore', label: 'Coimbatore' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-1.5">
                  Phone Number
                </label>
                <Input
                  placeholder="+91 44 2829 0000"
                  value={newHospPhone}
                  onChange={(e) => setNewHospPhone(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-1.5">
                Full Physical Address
              </label>
              <Input
                placeholder="Door No, Street Name, Area, Pincode"
                value={newHospAddress}
                onChange={(e) => setNewHospAddress(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink/70 mb-1.5">
                Specialties & Facilities (comma-separated)
              </label>
              <Input
                placeholder="Cardiology, Orthopedics, Pediatrics, Emergency"
                value={newHospFacilities}
                onChange={(e) => setNewHospFacilities(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-ink/10">
              <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Register Hospital
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
