import React, { useState, useMemo } from 'react';
import {
  Search,
  HelpCircle,
  ChevronDown,
  MessageCircle,
  Mail,
  Phone,
  Clock,
  ExternalLink,
  Ticket,
  CheckCircle2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { usePatientStore } from '@/store/patientStore';
import { useUiStore } from '@/store/uiStore';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { searchFaq } from '@/lib/patient';
import type { FaqItem } from '@/lib/patient';
import type { SupportCategory, Channel } from '@/types';
import * as patientApi from '@/services/patientApi';

// ==========================================
// FAQ data
// ==========================================

const FAQ_ITEMS: FaqItem[] = [
  // Booking
  { id: 'faq_01', category: 'Booking', question: 'How do I book an appointment?', answer: 'Open the Home tab, search for your doctor or specialty, pick an available slot, and confirm. You will receive a booking code and QR immediately.' },
  { id: 'faq_02', category: 'Booking', question: 'Can I book for a family member?', answer: 'Yes. Add them under Profile → Family members first. When booking, switch the "For" field from yourself to the family member.' },
  { id: 'faq_03', category: 'Booking', question: 'What is the cancellation policy?', answer: 'You can cancel free of charge at least 2 hours before the appointment. Within the 2-hour window, cancellation is still possible but may be subject to the hospital\'s policy.' },
  { id: 'faq_04', category: 'Booking', question: 'Can I reschedule an appointment?', answer: 'Yes — tap the appointment, then "Reschedule". You\'ll see available slots for the same doctor. Rescheduling is free if done at least 2 hours before.' },
  // Queue & Waiting
  { id: 'faq_05', category: 'Queue & Waiting', question: 'How does the queue work?', answer: 'After checking in (via QR at the kiosk or by front desk), you receive a token and enter the live queue. Your position and estimated wait time update in real time.' },
  { id: 'faq_06', category: 'Queue & Waiting', question: 'What does "ETA" mean?', answer: 'ETA (Estimated Time of Arrival) shows how many minutes until your turn. It is calculated from the doctor\'s average consultation time and how many patients are ahead of you.' },
  { id: 'faq_07', category: 'Queue & Waiting', question: 'What happens if I miss my call?', answer: 'If the doctor calls you twice and you don\'t respond, you\'re marked as a no-show. Contact the front desk immediately to be re-queued.' },
  { id: 'faq_08', category: 'Queue & Waiting', question: 'What if the doctor is running late?', answer: 'You\'ll receive a push notification with the updated delay. Your ETA adjusts automatically. You can wait at the cafeteria — the display board also shows live updates.' },
  // Account
  { id: 'faq_09', category: 'Account', question: 'How do I change my phone number?', answer: 'Go to Profile → Edit Profile → Contact Details → Change. You\'ll need to verify the new number with an OTP.' },
  { id: 'faq_10', category: 'Account', question: 'How do I delete my account?', answer: 'Go to Profile → Delete Account. Your data will be permanently removed within 30 days. You can cancel the deletion within that period.' },
  { id: 'faq_11', category: 'Account', question: 'Is my data secure?', answer: 'Yes. We follow industry-standard encryption for data at rest and in transit. Your personal and medical information is never shared without your consent.' },
  // Documents
  { id: 'faq_12', category: 'Documents', question: 'What file types can I upload?', answer: 'You can upload PDF, JPG, and PNG files. Each file must be under 10 MB, and your total storage limit is 50 MB.' },
  { id: 'faq_13', category: 'Documents', question: 'Can my doctor see my uploaded documents?', answer: 'Currently, documents are private to your account. Sharing with doctors will be available in a future update.' },
  // Fees
  { id: 'faq_14', category: 'Fees & Payments', question: 'How do I pay the consultation fee?', answer: 'Fees are currently collected at the hospital reception during your visit. Online payment will be added in a future update.' },
  { id: 'faq_15', category: 'Fees & Payments', question: 'Can I get a refund for a cancelled appointment?', answer: 'Since fees are collected at the hospital, refund policies are set by each hospital. If you paid in advance, contact the hospital directly.' },
];

const FAQ_CATEGORIES = ['All', ...Array.from(new Set(FAQ_ITEMS.map((f) => f.category)))];

const SUPPORT_CATEGORY_LABELS: Record<SupportCategory, string> = {
  booking_problem: 'Booking problem',
  queue_or_waiting: 'Queue / waiting issue',
  fee_or_payment: 'Fee or payment',
  app_problem: 'App problem',
  privacy_concern: 'Privacy concern',
  other: 'Other',
};

const SUPPORT_CATEGORIES: SupportCategory[] = [
  'booking_problem', 'queue_or_waiting', 'fee_or_payment', 'app_problem', 'privacy_concern', 'other',
];

export const HelpPage: React.FC = () => {
  const { addToast } = useUiStore();
  const tickets = usePatientStore((s) => s.tickets);
  const patient = usePatientStore((s) => s.patient);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>(null);

  // Support ticket form
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketCategory, setTicketCategory] = useState<SupportCategory>('booking_problem');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketContact, setTicketContact] = useState<Channel>('in_app');
  const [submittingTicket, setSubmittingTicket] = useState(false);

  // ========== Search results ==========
  const searchResults = useMemo(() => {
    if (searchQuery.trim()) {
      return searchFaq(searchQuery, FAQ_ITEMS);
    }
    return null;
  }, [searchQuery]);

  const filteredFaqs = useMemo(() => {
    if (selectedCategory === 'All') return FAQ_ITEMS;
    return FAQ_ITEMS.filter((f) => f.category === selectedCategory);
  }, [selectedCategory]);

  // ========== Ticket submit ==========
  const handleSubmitTicket = async () => {
    if (!ticketDescription.trim()) {
      addToast({ title: 'Description required', variant: 'danger' });
      return;
    }
    if (ticketDescription.trim().length < 20) {
      addToast({ title: 'Too short', description: 'Please describe the issue in at least 20 characters.', variant: 'danger' });
      return;
    }

    setSubmittingTicket(true);
    try {
      const ticket = await patientApi.submitSupportTicket({
        category: ticketCategory,
        description: ticketDescription.trim(),
        contact_preference: ticketContact,
      });
      addToast({
        title: 'Ticket submitted',
        description: `Reference: ${ticket.reference}. We'll get back to you soon.`,
        variant: 'success',
        duration: 6000,
      });
      setTicketModalOpen(false);
      setTicketDescription('');
    } catch {
      addToast({ title: 'Failed to submit', variant: 'danger' });
    } finally {
      setSubmittingTicket(false);
    }
  };

  // ========== Ticket status helpers ==========
  const myTickets = useMemo(
    () => tickets.filter((t) => t.patient_id === patient.id).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ),
    [tickets, patient.id]
  );

  const ticketStatusConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
    open: { label: 'Open', icon: AlertCircle, color: 'text-info' },
    in_review: { label: 'In review', icon: Clock, color: 'text-accent' },
    resolved: { label: 'Resolved', icon: CheckCircle2, color: 'text-success' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="text-xs uppercase tracking-wider font-semibold text-muted flex items-center gap-1.5 mb-2">
          <span className="w-1.5 h-1.5 bg-ink inline-block shrink-0" />
          HELP
        </div>
        <h1 className="text-2xl sm:text-3xl font-medium text-ink">Help & FAQ</h1>
        <p className="text-sm text-muted mt-1">Find answers or reach out to support.</p>
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" strokeWidth={1.75} />
        <input
          type="text"
          placeholder="Search help topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full h-12 pl-12 pr-4 bg-base border border-ink/15 rounded-full text-sm text-ink placeholder:text-muted/60
                     focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none transition-colors"
        />
      </div>

      {/* Search results */}
      {searchResults && (
        <div className="space-y-2">
          <p className="text-xs text-muted font-medium">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
          </p>
          {searchResults.length === 0 ? (
            <div className="text-center py-8 space-y-2">
              <HelpCircle className="w-8 h-8 mx-auto text-muted/50" strokeWidth={1.5} />
              <p className="text-sm text-muted">No results found. Try different keywords or contact support.</p>
            </div>
          ) : (
            searchResults.map((result) => (
              <button
                key={result.item.id}
                onClick={() => { setSearchQuery(''); setExpandedFaqId(result.item.id); }}
                className="w-full text-left p-3 bg-base border border-ink/10 rounded-card hover:bg-ink/[0.02] transition-colors cursor-pointer"
              >
                <p
                  className="text-sm font-medium text-ink"
                  dangerouslySetInnerHTML={{ __html: result.highlightedQuestion }}
                />
                <p
                  className="text-xs text-muted mt-1 line-clamp-2"
                  dangerouslySetInnerHTML={{ __html: result.highlightedAnswer }}
                />
                <span className="inline-block text-xs mt-1 px-2 py-0.5 rounded bg-cream/20 text-muted">
                  {result.item.category}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {/* FAQ section (hidden when searching) */}
      {!searchResults && (
        <>
          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {FAQ_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`h-9 px-4 rounded-full text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0
                  ${selectedCategory === cat
                    ? 'bg-accent text-ink'
                    : 'bg-transparent border border-ink/15 text-ink hover:bg-ink/5'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Accordion */}
          <div className="space-y-2">
            {filteredFaqs.map((faq) => {
              const isExpanded = expandedFaqId === faq.id;
              return (
                <div
                  key={faq.id}
                  className="bg-base border border-ink/10 rounded-card overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                    className="w-full flex items-start gap-3 p-4 text-left cursor-pointer"
                  >
                    <HelpCircle className="w-4 h-4 text-accent shrink-0 mt-0.5" strokeWidth={1.75} />
                    <span className="flex-1 text-sm font-medium text-ink">{faq.question}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      strokeWidth={1.75}
                    />
                  </button>
                  {isExpanded && (
                    <div className="px-4 pb-4 pl-11">
                      <p className="text-sm text-muted leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Contact & Support section */}
      <div className="space-y-4 pt-4 border-t border-ink/10">
        <h2 className="text-lg font-medium text-ink">Still need help?</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Contact cards */}
          <div className="p-4 bg-base border border-ink/10 rounded-card space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-cream/20 flex items-center justify-center">
                <Phone className="w-4 h-4 text-muted" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Call us</p>
                <p className="text-xs text-muted">Mon–Sat, 8 AM – 8 PM</p>
              </div>
            </div>
            <a
              href="tel:+914428290000"
              className="inline-flex items-center gap-1 text-sm text-accent font-medium hover:underline"
            >
              +91 44 2829 0000
              <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
            </a>
          </div>

          <div className="p-4 bg-base border border-ink/10 rounded-card space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-cream/20 flex items-center justify-center">
                <Mail className="w-4 h-4 text-muted" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-medium text-ink">Email support</p>
                <p className="text-xs text-muted">Response within 24 hours</p>
              </div>
            </div>
            <a
              href="mailto:support@chroniq.example.com"
              className="inline-flex items-center gap-1 text-sm text-accent font-medium hover:underline"
            >
              support@chroniq.example.com
              <ExternalLink className="w-3 h-3" strokeWidth={1.75} />
            </a>
          </div>
        </div>

        {/* Raise a ticket */}
        <Button
          variant="secondary"
          icon={<Ticket className="w-4 h-4" strokeWidth={1.75} />}
          onClick={() => setTicketModalOpen(true)}
          className="w-full"
        >
          Raise a support ticket
        </Button>
      </div>

      {/* My tickets */}
      {myTickets.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-ink/10">
          <h2 className="text-lg font-medium text-ink">Your tickets</h2>
          {myTickets.map((ticket) => {
            const statusConf = ticketStatusConfig[ticket.status] || ticketStatusConfig.open;
            const Icon = statusConf.icon;
            return (
              <div key={ticket.id} className="flex items-start gap-3 p-3 bg-base border border-ink/10 rounded-card">
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${statusConf.color}`} strokeWidth={1.75} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-muted">{ticket.reference}</span>
                    <span className={`text-xs font-medium ${statusConf.color}`}>{statusConf.label}</span>
                  </div>
                  <p className="text-sm text-ink mt-0.5 line-clamp-2">{ticket.description}</p>
                  <div className="flex items-center gap-2 text-xs text-muted mt-1">
                    <Tag className="w-3 h-3" strokeWidth={1.75} />
                    {SUPPORT_CATEGORY_LABELS[ticket.category]}
                    <span>·</span>
                    {new Date(ticket.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit ticket modal */}
      <Modal
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        title="Raise a support ticket"
        eyebrow="SUPPORT"
        maxWidth="md"
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="secondary" onClick={() => setTicketModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmitTicket}
              isLoading={submittingTicket}
              disabled={!ticketDescription.trim()}
              className="flex-1"
            >
              Submit ticket
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider">Category</label>
            <div className="flex flex-wrap gap-2">
              {SUPPORT_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setTicketCategory(cat)}
                  className={`h-9 px-3 rounded-full text-xs font-medium transition-all cursor-pointer select-none
                    ${ticketCategory === cat
                      ? 'bg-accent text-ink'
                      : 'bg-transparent border border-ink/15 text-ink hover:bg-ink/5'
                    }`}
                >
                  {SUPPORT_CATEGORY_LABELS[cat]}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider">
              Description <span className="text-danger">*</span>
            </label>
            <textarea
              value={ticketDescription}
              onChange={(e) => setTicketDescription(e.target.value.slice(0, 1000))}
              placeholder="Describe your issue in detail..."
              rows={5}
              className="w-full bg-base border border-ink/15 rounded-card px-4 py-3 text-sm text-ink placeholder:text-muted/60
                         focus:border-accent focus:ring-1 focus:ring-accent/30 outline-none transition-colors resize-none"
            />
            <p className="text-xs text-muted text-right">{ticketDescription.length}/1000</p>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted uppercase tracking-wider">Preferred contact method</label>
            <div className="flex gap-2">
              {([
                { value: 'in_app' as Channel, label: 'In-app', icon: MessageCircle },
                { value: 'email' as Channel, label: 'Email', icon: Mail },
                { value: 'sms' as Channel, label: 'SMS', icon: Phone },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTicketContact(opt.value)}
                  className={`flex items-center gap-1.5 h-10 px-4 rounded-full text-sm font-medium transition-all cursor-pointer
                    ${ticketContact === opt.value
                      ? 'bg-accent text-ink'
                      : 'bg-transparent border border-ink/15 text-ink hover:bg-ink/5'
                    }`}
                >
                  <opt.icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
