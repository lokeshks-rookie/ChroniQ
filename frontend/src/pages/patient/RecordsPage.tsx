import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Calendar,
  MapPin,
  Star,
  Upload,
  Trash2,
  Search,
  ChevronDown,
  Clock,
  Image,
  File,
  Eye,
  Pencil,
} from 'lucide-react';
import { usePatientStore } from '@/store/patientStore';
import { useHospitalStore } from '@/store/hospitalStore';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { RatingBadge } from '@/components/patient/RatingPills';
import { validateDocument } from '@/lib/patient';
import type { Appointment, DocumentCategory } from '@/types';

// ==========================================
// Status config (reused from admin, but patient-friendly labels)
// ==========================================

const STATUS_STYLES: Record<string, { label: string; dotColor: string }> = {
  completed: { label: 'Completed', dotColor: 'bg-success' },
  booked: { label: 'Upcoming', dotColor: 'bg-info' },
  checked_in: { label: 'Checked in', dotColor: 'bg-accent' },
  in_queue: { label: 'In queue', dotColor: 'bg-accent' },
  called: { label: 'Called', dotColor: 'bg-accent' },
  in_consultation: { label: 'With doctor', dotColor: 'bg-success' },
  cancelled: { label: 'Cancelled', dotColor: 'bg-danger' },
  no_show: { label: 'Missed', dotColor: 'bg-danger' },
  rescheduled: { label: 'Rescheduled', dotColor: 'bg-info' },
  expired: { label: 'Expired', dotColor: 'bg-muted' },
};

const DOC_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  lab_report: 'Lab report',
  prescription: 'Prescription',
  imaging: 'Imaging',
  discharge_summary: 'Discharge',
  other: 'Other',
};

const DOC_CATEGORY_OPTIONS: DocumentCategory[] = ['lab_report', 'prescription', 'imaging', 'discharge_summary', 'other'];

type TabId = 'visits' | 'documents';
type StatusFilter = 'all' | 'upcoming' | 'completed' | 'cancelled';

export const RecordsPage: React.FC = () => {
  const navigate = useNavigate();
  const { addToast } = useUiStore();

  const appointments = usePatientStore((s) => s.appointments);
  const reviews = usePatientStore((s) => s.reviews);
  const documents = usePatientStore((s) => s.documents);
  const patient = usePatientStore((s) => s.patient);
  const getTotalDocumentBytes = usePatientStore((s) => s.getTotalDocumentBytes);
  const addDocument = usePatientStore((s) => s.addDocument);
  const deleteDocument = usePatientStore((s) => s.deleteDocument);
  const renameDocument = usePatientStore((s) => s.renameDocument);

  // Also merge hospital store appointments
  const hospitalAppts = useHospitalStore((s) => s.appointments);

  const [activeTab, setActiveTab] = useState<TabId>('visits');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedApptId, setExpandedApptId] = useState<string | null>(null);

  // Document state
  const [docCategoryFilter, setDocCategoryFilter] = useState<DocumentCategory | 'all'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ========== Merged & filtered appointments ==========
  const allAppointments = useMemo(() => {
    const seen = new Set<string>();
    const merged: Appointment[] = [];
    for (const a of [...appointments, ...hospitalAppts]) {
      if (!seen.has(a.id) && a.patient_id === patient.id) {
        seen.add(a.id);
        merged.push(a);
      }
    }
    // Sort by scheduled_start descending (most recent first)
    merged.sort((a, b) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime());
    return merged;
  }, [appointments, hospitalAppts, patient.id]);

  const filteredAppointments = useMemo(() => {
    let result = allAppointments;

    if (statusFilter !== 'all') {
      if (statusFilter === 'upcoming') {
        result = result.filter((a) => ['booked', 'checked_in', 'in_queue', 'called', 'in_consultation'].includes(a.status));
      } else if (statusFilter === 'completed') {
        result = result.filter((a) => a.status === 'completed');
      } else if (statusFilter === 'cancelled') {
        result = result.filter((a) => ['cancelled', 'no_show', 'expired'].includes(a.status));
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.doctor_name.toLowerCase().includes(q) ||
          a.hospital_name.toLowerCase().includes(q) ||
          a.department_name.toLowerCase().includes(q) ||
          a.booking_code.toLowerCase().includes(q) ||
          (a.patient.name || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [allAppointments, statusFilter, searchQuery]);

  // ========== Filtered documents ==========
  const filteredDocuments = useMemo(() => {
    let docs = documents.filter((d) => d.patient_id === patient.id);
    if (docCategoryFilter !== 'all') {
      docs = docs.filter((d) => d.category === docCategoryFilter);
    }
    // Sort by uploaded_at descending
    docs.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());
    return docs;
  }, [documents, patient.id, docCategoryFilter]);

  // ========== Helpers ==========
  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

  const getReviewForAppointment = (apptId: string) =>
    reviews.find((r) => r.appointment_id === apptId);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return Image;
    return File;
  };

  // ========== Upload handler ==========
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const totalBytes = getTotalDocumentBytes();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const error = validateDocument(
        { name: file.name, size: file.size, type: file.type },
        totalBytes
      );

      if (error) {
        addToast({ title: 'Upload error', description: error, variant: 'danger' });
        continue;
      }

      addDocument(
        {
          name: file.name.replace(/\.[^/.]+$/, ''),
          category: 'other',
          mime: file.type,
          size_bytes: file.size,
          patient_id: patient.id,
        },
        file
      );

      addToast({
        title: 'File uploaded',
        description: `${file.name} added to your records.`,
        variant: 'success',
      });
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = (id: string) => {
    deleteDocument(id);
    setDeleteConfirmId(null);
    addToast({ title: 'Document deleted', variant: 'success' });
  };

  const handleRename = () => {
    if (renameId && renameValue.trim()) {
      renameDocument(renameId, renameValue.trim());
      setRenameId(null);
      setRenameValue('');
      addToast({ title: 'Document renamed', variant: 'success' });
    }
  };

  // ========== Counts ==========
  const upcomingCount = allAppointments.filter((a) =>
    ['booked', 'checked_in', 'in_queue', 'called', 'in_consultation'].includes(a.status)
  ).length;

  const totalQuota = 50 * 1024 * 1024;
  const usedBytes = getTotalDocumentBytes();
  const usedPercent = Math.round((usedBytes / totalQuota) * 100);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 style={{ fontSize: '30px', fontWeight: 600, color: 'var(--color-ink)', letterSpacing: '-0.02em', marginBottom: '8px' }}>
Visit history & documents</h1>
        <p className="text-sm text-muted mt-1">
          {allAppointments.length} visits · {documents.length} documents
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-ink/10">
        {([
          { id: 'visits' as TabId, label: 'Visits', count: allAppointments.length },
          { id: 'documents' as TabId, label: 'Documents', count: documents.length },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors cursor-pointer
              ${activeTab === tab.id
                ? 'border-accent text-ink'
                : 'border-transparent text-muted hover:text-ink'
              }`}
          >
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.id ? 'bg-accent text-ink' : 'bg-ink/10 text-muted'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ========== VISITS TAB ========== */}
      {activeTab === 'visits' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" strokeWidth={1.75} />
              <input
                type="text"
                placeholder="Search by doctor, hospital, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 bg-base border border-ink/15 rounded-full text-sm text-ink placeholder:text-muted/60
                           focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none transition-colors"
              />
            </div>
            <div className="flex gap-2">
              {([
                { id: 'all' as StatusFilter, label: 'All' },
                { id: 'upcoming' as StatusFilter, label: `Upcoming (${upcomingCount})` },
                { id: 'completed' as StatusFilter, label: 'Completed' },
                { id: 'cancelled' as StatusFilter, label: 'Cancelled' },
              ]).map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setStatusFilter(opt.id)}
                  className={`h-10 px-3 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap
                    ${statusFilter === opt.id
                      ? 'bg-accent text-ink'
                      : 'bg-transparent border border-ink/15 text-ink hover:bg-ink/5'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Appointment list */}
          {filteredAppointments.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Calendar className="w-10 h-10 mx-auto text-muted/50" strokeWidth={1.5} />
              <p className="text-sm text-muted">
                {searchQuery ? 'No visits match your search.' : 'No visits in this category.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAppointments.map((appt) => {
                const status = STATUS_STYLES[appt.status] || { label: appt.status, dotColor: 'bg-muted' };
                const review = getReviewForAppointment(appt.id);
                const isExpanded = expandedApptId === appt.id;
                const isForFamily = !!appt.family_member_id;

                return (
                  <div
                    key={appt.id}
                    className="bg-base border border-ink/10 rounded-card overflow-hidden transition-shadow hover:shadow-sm"
                  >
                    {/* Main row */}
                    <button
                      onClick={() => setExpandedApptId(isExpanded ? null : appt.id)}
                      className="w-full flex items-start gap-3 p-4 text-left cursor-pointer"
                    >
                      {/* Status dot */}
                      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${status.dotColor}`} />

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-ink">{appt.doctor_name}</p>
                            <p className="text-xs text-muted">{appt.department_name}</p>
                          </div>
                          <ChevronDown
                            className={`w-4 h-4 text-muted shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            strokeWidth={1.75}
                          />
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3 h-3" strokeWidth={1.75} />
                            {formatDate(appt.scheduled_start)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" strokeWidth={1.75} />
                            {formatTime(appt.scheduled_start)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3" strokeWidth={1.75} />
                            {appt.hospital_name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-ink/10`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${status.dotColor}`} />
                            {status.label}
                          </span>
                          {isForFamily && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-cream/20 text-muted">
                              For {appt.patient.name}
                            </span>
                          )}
                          {review && (
                            <RatingBadge avg={review.doctor_rating} count={1} className="text-xs" />
                          )}
                        </div>
                      </div>
                    </button>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="border-t border-ink/10 px-4 py-3 bg-ink/[0.02] space-y-3">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <span className="text-muted">Booking code</span>
                            <p className="font-medium text-ink">{appt.booking_code}</p>
                          </div>
                          <div>
                            <span className="text-muted">Fee</span>
                            <p className="font-medium text-ink">₹{appt.fee.toLocaleString('en-IN')}</p>
                          </div>
                          <div>
                            <span className="text-muted">Type</span>
                            <p className="font-medium text-ink capitalize">{appt.type.replace('_', '-')}</p>
                          </div>
                          <div>
                            <span className="text-muted">Booked via</span>
                            <p className="font-medium text-ink capitalize">{appt.created_via}</p>
                          </div>
                          {appt.reason && (
                            <div className="col-span-2">
                              <span className="text-muted">Reason</span>
                              <p className="font-medium text-ink">{appt.reason}</p>
                            </div>
                          )}
                          {appt.cancelled_reason && (
                            <div className="col-span-2">
                              <span className="text-muted">Cancellation reason</span>
                              <p className="font-medium text-danger">{appt.cancelled_reason}</p>
                            </div>
                          )}
                        </div>

                        {/* Related documents */}
                        {documents.filter((d) => d.appointment_id === appt.id).length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted mb-1.5">Documents</p>
                            <div className="space-y-1">
                              {documents.filter((d) => d.appointment_id === appt.id).map((doc) => {
                                const Icon = getFileIcon(doc.mime);
                                return (
                                  <div key={doc.id} className="flex items-center gap-2 text-xs py-1">
                                    <Icon className="w-3.5 h-3.5 text-muted" strokeWidth={1.75} />
                                    <span className="text-ink font-medium truncate">{doc.name}</span>
                                    <span className="text-muted ml-auto">{formatBytes(doc.size_bytes)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-1">
                          {appt.status === 'completed' && !review && (
                            <Button
                              variant="primary"
                              size="sm"
                              icon={<Star className="w-3.5 h-3.5" strokeWidth={1.75} />}
                              onClick={() => navigate(`/app/reviews/${appt.id}`)}
                            >
                              Rate visit
                            </Button>
                          )}
                          {appt.status === 'completed' && review && (
                            <Button
                              variant="secondary"
                              size="sm"
                              icon={<Eye className="w-3.5 h-3.5" strokeWidth={1.75} />}
                              onClick={() => navigate(`/app/reviews/${appt.id}`)}
                            >
                              View review
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========== DOCUMENTS TAB ========== */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          {/* Storage usage bar */}
          <div className="bg-base border border-ink/10 rounded-card p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">Storage used</span>
              <span className="font-medium text-ink">
                {formatBytes(usedBytes)} / {formatBytes(totalQuota)}
              </span>
            </div>
            <div className="h-1.5 bg-ink/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${Math.min(usedPercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Filters & upload */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-2 flex-1 overflow-x-auto">
              {(['all', ...DOC_CATEGORY_OPTIONS] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setDocCategoryFilter(cat)}
                  className={`h-9 px-3 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0
                    ${docCategoryFilter === cat
                      ? 'bg-accent text-ink'
                      : 'bg-transparent border border-ink/15 text-ink hover:bg-ink/5'
                    }`}
                >
                  {cat === 'all' ? 'All' : DOC_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="doc-upload"
              />
              <Button
                variant="primary"
                size="sm"
                icon={<Upload className="w-3.5 h-3.5" strokeWidth={1.75} />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload
              </Button>
            </div>
          </div>

          {/* Document list */}
          {filteredDocuments.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <FileText className="w-10 h-10 mx-auto text-muted/50" strokeWidth={1.5} />
              <p className="text-sm text-muted">No documents yet.</p>
              <p className="text-xs text-muted">Upload PDFs, JPGs, or PNGs (max 10 MB each).</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocuments.map((doc) => {
                const Icon = getFileIcon(doc.mime);
                const isRenaming = renameId === doc.id;

                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 bg-base border border-ink/10 rounded-card hover:shadow-sm transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-lg bg-cream/20 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-muted" strokeWidth={1.5} />
                    </div>

                    <div className="flex-1 min-w-0">
                      {isRenaming ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            className="flex-1 h-8 px-2 text-sm bg-base border border-ink/20 rounded-sm outline-none focus:border-accent"
                          />
                          <Button variant="ghost" size="sm" onClick={handleRename}>Save</Button>
                          <Button variant="ghost" size="sm" onClick={() => setRenameId(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-medium text-ink truncate">{doc.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted">
                            <span className="px-1.5 py-0.5 rounded bg-ink/5">
                              {DOC_CATEGORY_LABELS[doc.category]}
                            </span>
                            <span>{formatBytes(doc.size_bytes)}</span>
                            <span>·</span>
                            <span>{formatDate(doc.uploaded_at)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {!isRenaming && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => { setRenameId(doc.id); setRenameValue(doc.name); }}
                          className="p-2 rounded-lg hover:bg-ink/5 transition-colors cursor-pointer"
                          aria-label="Rename document"
                        >
                          <Pencil className="w-3.5 h-3.5 text-muted" strokeWidth={1.75} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(doc.id)}
                          className="p-2 rounded-lg hover:bg-danger/10 transition-colors cursor-pointer"
                          aria-label="Delete document"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-danger" strokeWidth={1.75} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        title="Delete document?"
        eyebrow="CONFIRM ACTION"
        maxWidth="sm"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="secondary" onClick={() => setDeleteConfirmId(null)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="flex-1"
            >
              Delete
            </Button>
          </div>
        }
      >
        <p className="text-sm text-muted">
          This document will be permanently removed from your records. This action cannot be undone.
        </p>
      </Modal>
    </div>
  );
};
