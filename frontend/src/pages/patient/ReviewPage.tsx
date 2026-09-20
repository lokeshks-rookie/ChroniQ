import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Star,
  Calendar,
  MapPin,
  Hash,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { usePatientStore } from '@/store/patientStore';
import { useHospitalStore } from '@/store/hospitalStore';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { RatingPills } from '@/components/patient/RatingPills';
import { canReview, applyReviewToRatings } from '@/lib/patient';
import * as patientApi from '@/services/patientApi';

// Tag options
const DOCTOR_TAGS_POSITIVE = ['Listened well', 'Clear explanation', 'On time', 'Kind and patient'];
const DOCTOR_TAGS_NEGATIVE = ['Rushed', 'Unclear instructions', 'Long consultation delay'];
const HOSPITAL_TAGS = ['Clean facilities', 'Friendly staff', 'Easy to find', 'Crowded', 'Billing problem'];

export const ReviewPage: React.FC = () => {
  const { appointmentId } = useParams<{ appointmentId: string }>();
  const navigate = useNavigate();
  const { addToast } = useUiStore();

  const appointments = usePatientStore((s) => s.appointments);
  const reviews = usePatientStore((s) => s.reviews);
  const patient = usePatientStore((s) => s.patient);
  const doctors = usePatientStore((s) => s.doctors);

  // Also check hospital store (admin's City Hospital)
  const hospitalStoreAppts = useHospitalStore((s) => s.appointments);
  const hospitalDoctors = useHospitalStore((s) => s.doctors);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [doctorRating, setDoctorRating] = useState(0);
  const [hospitalRating, setHospitalRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState('');
  const [waitExpectation, setWaitExpectation] = useState<'shorter' | 'as_expected' | 'longer' | undefined>();

  // Find the appointment (check both stores)
  const appointment = useMemo(() => {
    return (
      appointments.find((a) => a.id === appointmentId) ||
      hospitalStoreAppts.find((a) => a.id === appointmentId)
    );
  }, [appointmentId, appointments, hospitalStoreAppts]);

  // Find existing review
  const existingReview = useMemo(
    () => reviews.find((r) => r.appointment_id === appointmentId),
    [appointmentId, reviews]
  );

  // Check ownership
  const isOwner = appointment?.patient_id === patient.id;

  // Review eligibility
  const reviewEligibility = useMemo(() => {
    if (!appointment) return null;
    return canReview(appointment, existingReview);
  }, [appointment, existingReview]);

  // Pre-fill form when editing
  useEffect(() => {
    if (existingReview) {
      setDoctorRating(existingReview.doctor_rating);
      setHospitalRating(existingReview.hospital_rating);
      setSelectedTags(existingReview.tags || []);
      setComment(existingReview.comment || '');
      setWaitExpectation(existingReview.wait_as_expected);
    }
    setLoading(false);
  }, [existingReview]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (!appointment || !appointmentId) return;
    if (doctorRating === 0 || hospitalRating === 0) {
      addToast({ title: 'Missing rating', description: 'Rate both the doctor and the hospital.', variant: 'danger' });
      return;
    }

    setSubmitting(true);
    try {
      if (existingReview && reviewEligibility?.canEdit) {
        // Update existing review
        const oldDoctorRating = existingReview.doctor_rating;
        const oldHospitalRating = existingReview.hospital_rating;

        await patientApi.updateReview(existingReview.id, {
          doctor_rating: doctorRating,
          hospital_rating: hospitalRating,
          comment: comment.trim() || undefined,
          tags: selectedTags,
          wait_as_expected: waitExpectation,
        });

        // Update doctor and hospital ratings
        updateRatings(appointment.doctor_id, appointment.hospital_id, doctorRating, hospitalRating, oldDoctorRating, oldHospitalRating);

        addToast({ title: 'Review updated', description: 'Your feedback has been saved.', variant: 'success' });
      } else {
        // Create new review
        await patientApi.submitReview({
          appointment_id: appointmentId,
          patient_id: patient.id,
          doctor_id: appointment.doctor_id,
          hospital_id: appointment.hospital_id,
          doctor_rating: doctorRating,
          hospital_rating: hospitalRating,
          comment: comment.trim() || undefined,
          tags: selectedTags,
          wait_as_expected: waitExpectation,
        });

        // Update doctor and hospital ratings
        updateRatings(appointment.doctor_id, appointment.hospital_id, doctorRating, hospitalRating);

        addToast({ title: 'Review submitted', description: 'Thank you for your feedback.', variant: 'success' });
      }
      setSubmitted(true);
    } catch (err) {
      addToast({ title: 'Failed to submit', description: 'Please try again.', variant: 'danger' });
    } finally {
      setSubmitting(false);
    }
  };

  const updateRatings = (
    doctorId: string,
    hospitalId: string,
    newDoctorRating: number,
    newHospitalRating: number,
    oldDoctorRating?: number,
    oldHospitalRating?: number
  ) => {
    // Update doctor rating in patient store doctors
    const pDoc = doctors.find((d) => d.id === doctorId);
    const hDoc = hospitalDoctors.find((d) => d.id === doctorId);
    const doc = pDoc || hDoc;
    if (doc) {
      const { avg, count } = applyReviewToRatings(doc.rating_avg, doc.rating_count, newDoctorRating, oldDoctorRating);
      // Try to update in hospital store if it's a City Hospital doctor
      if (hDoc) {
        const updatedDoc = { ...hDoc, rating_avg: avg, rating_count: count };
        useHospitalStore.getState().updateDoctor(updatedDoc);
      }
    }

    // Update hospital rating
    const hospital = useHospitalStore.getState().hospital;
    if (hospital.id === hospitalId) {
      const { avg } = applyReviewToRatings(hospital.rating_avg, hospital.rating_count, newHospitalRating, oldHospitalRating);
      // Hospital rating updates (hospital store has updateHospitalProfile)
      useHospitalStore.getState().updateHospitalProfile({
        rating_avg: avg,
        rating_count: hospital.rating_count + (oldHospitalRating !== undefined ? 0 : 1),
      });
    }
  };

  // Format date
  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // ========== LOADING STATE ==========
  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 rounded-card w-full" />
        <Skeleton className="h-48 rounded-card w-full" />
      </div>
    );
  }

  // ========== NOT FOUND / ACCESS DENIED ==========
  if (!appointment) {
    return (
      <div className="text-center py-16 space-y-4">
        <ShieldAlert className="w-12 h-12 mx-auto text-danger" strokeWidth={1.5} />
        <h1 className="text-xl font-medium text-ink">Appointment not found</h1>
        <p className="text-sm text-muted">This appointment does not exist or has been removed.</p>
        <Button variant="secondary" onClick={() => navigate('/app/records')}>
          Back to records
        </Button>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="text-center py-16 space-y-4">
        <ShieldAlert className="w-12 h-12 mx-auto text-danger" strokeWidth={1.5} />
        <h1 className="text-xl font-medium text-ink">Access denied</h1>
        <p className="text-sm text-muted">You can only review your own appointments.</p>
        <Button variant="secondary" onClick={() => navigate('/app/records')}>
          Back to records
        </Button>
      </div>
    );
  }

  // ========== NOT COMPLETED GUARD ==========
  if (appointment.status !== 'completed') {
    return (
      <div className="text-center py-16 space-y-4">
        <AlertCircle className="w-12 h-12 mx-auto text-info" strokeWidth={1.5} />
        <h1 className="text-xl font-medium text-ink">Visit not completed</h1>
        <p className="text-sm text-muted">You can review after your visit.</p>
        {/* // TODO(page 17): link to /app/appointments/:id */}
        <Button variant="secondary" onClick={() => navigate('/app/records')}>
          Back to records
        </Button>
      </div>
    );
  }

  // ========== SUCCESS PANEL ==========
  if (submitted) {
    return (
      <div className="space-y-8">
        {/* Accent band */}
        <div className="bg-accent rounded-panel p-8 text-center space-y-3">
          <CheckCircle2 className="w-12 h-12 mx-auto text-ink" strokeWidth={1.5} />
          <h1 className="text-2xl font-medium text-ink">Thank you for your feedback</h1>
          <p className="text-sm text-ink/80">
            Your review helps other patients and improves hospital services.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="secondary" onClick={() => navigate('/app/records')} className="flex-1">
            Back to visits
          </Button>
          {/* // TODO(page 13): link to /app/book/:doctorId */}
          <Button
            variant="primary"
            onClick={() => navigate(`/app/records`)}
            className="flex-1"
          >
            Book again
          </Button>
        </div>
      </div>
    );
  }

  // ========== READ-ONLY ==========
  const isReadOnly = reviewEligibility?.readOnly;
  const isEditMode = !!existingReview && reviewEligibility?.canEdit;

  return (
    <div className="space-y-6">
      {/* Eyebrow */}
      <div>
        <div className="text-xs uppercase tracking-wider font-semibold text-muted flex items-center gap-1.5 mb-2">
          <span className="w-1.5 h-1.5 bg-ink inline-block shrink-0" />
          RATE YOUR VISIT
        </div>
        <h1 className="text-2xl sm:text-3xl font-medium text-ink">
          {isEditMode ? 'Edit your review' : isReadOnly ? 'Your review' : 'Rate your visit'}
        </h1>
        <p className="text-sm text-muted mt-1">
          {isReadOnly
            ? 'The 14-day edit window has passed. This review is now read-only.'
            : 'Your feedback is anonymous to the doctor and helps other patients.'}
        </p>
      </div>

      {/* Visit summary card */}
      <div className="bg-base border border-ink/10 rounded-card p-4 sm:p-6 space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-cream/30 flex items-center justify-center shrink-0">
            <Star className="w-5 h-5 text-ink" strokeWidth={1.75} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">{appointment.doctor_name}</p>
            <p className="text-sm text-muted">{appointment.department_name}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" strokeWidth={1.75} />
            {appointment.hospital_name}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" strokeWidth={1.75} />
            {formatDate(appointment.scheduled_start)}
          </span>
          <span className="inline-flex items-center gap-1">
            <Hash className="w-3.5 h-3.5" strokeWidth={1.75} />
            {appointment.booking_code}
          </span>
        </div>
      </div>

      {/* Form with numbered sections */}
      <div className="space-y-8">
        {/* 01 Your doctor */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-light text-accent/70">01</span>
            <h2 className="text-lg font-medium text-ink">Your doctor</h2>
          </div>
          <RatingPills
            name="doctor-rating"
            value={doctorRating}
            onChange={setDoctorRating}
            disabled={isReadOnly}
          />
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider font-medium text-muted">Tags (optional)</p>
            <div className="flex flex-wrap gap-2">
              {[...DOCTOR_TAGS_POSITIVE, ...DOCTOR_TAGS_NEGATIVE].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => !isReadOnly && toggleTag(tag)}
                  disabled={isReadOnly}
                  className={`h-9 px-3 rounded-full text-xs font-medium transition-all cursor-pointer select-none
                    ${selectedTags.includes(tag)
                      ? 'bg-accent text-ink'
                      : 'bg-transparent border border-ink/15 text-ink hover:bg-ink/5'
                    }
                    ${isReadOnly ? 'opacity-60 pointer-events-none' : ''}
                  `}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 02 The hospital */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-light text-accent/70">02</span>
            <h2 className="text-lg font-medium text-ink">The hospital</h2>
          </div>
          <RatingPills
            name="hospital-rating"
            value={hospitalRating}
            onChange={setHospitalRating}
            disabled={isReadOnly}
          />
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider font-medium text-muted">Tags (optional)</p>
            <div className="flex flex-wrap gap-2">
              {HOSPITAL_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => !isReadOnly && toggleTag(tag)}
                  disabled={isReadOnly}
                  className={`h-9 px-3 rounded-full text-xs font-medium transition-all cursor-pointer select-none
                    ${selectedTags.includes(tag)
                      ? 'bg-accent text-ink'
                      : 'bg-transparent border border-ink/15 text-ink hover:bg-ink/5'
                    }
                    ${isReadOnly ? 'opacity-60 pointer-events-none' : ''}
                  `}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 03 Your comments */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-light text-accent/70">03</span>
            <h2 className="text-lg font-medium text-ink">Your comments</h2>
          </div>

          <div className="space-y-1">
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value.slice(0, 500))}
              disabled={isReadOnly}
              placeholder="Share your experience (optional)"
              rows={4}
              className="w-full bg-base border border-ink/15 rounded-card px-4 py-3 text-sm text-ink placeholder:text-muted/60
                         focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none transition-colors resize-none
                         disabled:opacity-60 disabled:pointer-events-none"
            />
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Do not share personal or medical details</span>
              <span>{comment.length}/500</span>
            </div>
          </div>

          {/* Wait expectation */}
          <div className="space-y-2">
            <p className="text-sm text-ink font-medium">Was your waiting time as estimated?</p>
            <div className="flex gap-2">
              {([
                { value: 'shorter' as const, label: 'Shorter' },
                { value: 'as_expected' as const, label: 'As expected' },
                { value: 'longer' as const, label: 'Longer' },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => !isReadOnly && setWaitExpectation(waitExpectation === opt.value ? undefined : opt.value)}
                  disabled={isReadOnly}
                  className={`h-10 px-4 rounded-full text-sm font-medium transition-all cursor-pointer select-none
                    ${waitExpectation === opt.value
                      ? 'bg-accent text-ink'
                      : 'bg-transparent border border-ink/15 text-ink hover:bg-ink/5'
                    }
                    ${isReadOnly ? 'opacity-60 pointer-events-none' : ''}
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* Sticky submit */}
      {!isReadOnly && (
        <div className="sticky bottom-20 lg:bottom-4 bg-base border-t border-ink/10 -mx-4 px-4 py-4 sm:mx-0 sm:px-0 sm:border-t-0">
          <Button
            variant="primary"
            size="lg"
            onClick={handleSubmit}
            isLoading={submitting}
            disabled={doctorRating === 0 || hospitalRating === 0}
            className="w-full"
          >
            {isEditMode ? 'Update review' : 'Submit review'}
          </Button>
        </div>
      )}

      {isReadOnly && (
        <div className="pt-4">
          <Button variant="secondary" onClick={() => navigate('/app/records')} className="w-full">
            Back to visits
          </Button>
        </div>
      )}
    </div>
  );
};
