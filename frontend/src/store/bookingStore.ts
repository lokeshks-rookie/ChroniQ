import { create } from 'zustand';
import type { MockDoctor } from '@/data/mockData';

export interface BookingState {
  // Doctor & slot selection (page 12)
  doctor: MockDoctor | null;
  slotId: string | null;
  slotDate: string | null;
  slotTime: string | null;
  holdExpiry: number | null;

  // Patient details (page 13)
  visitFor: 'myself' | string; // 'myself' or family member _id
  visitForName: string;
  reason: string;
  symptoms: string;
  attachedFile: File | null;

  // Actions
  initBooking: (doctor: MockDoctor) => void;
  setSlot: (slotId: string, date: string, time: string) => void;
  setHoldExpiry: (expiry: number) => void;
  setPatientDetails: (details: {
    visitFor: string;
    visitForName: string;
    reason: string;
    symptoms: string;
    attachedFile: File | null;
  }) => void;
  clearBooking: () => void;
}

const INITIAL: Pick<BookingState,
  'doctor' | 'slotId' | 'slotDate' | 'slotTime' | 'holdExpiry' |
  'visitFor' | 'visitForName' | 'reason' | 'symptoms' | 'attachedFile'
> = {
  doctor: null,
  slotId: null,
  slotDate: null,
  slotTime: null,
  holdExpiry: null,
  visitFor: 'myself',
  visitForName: '',
  reason: '',
  symptoms: '',
  attachedFile: null,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...INITIAL,

  initBooking: (doctor) =>
    set({ ...INITIAL, doctor }),

  setSlot: (slotId, slotDate, slotTime) =>
    set({ slotId, slotDate, slotTime }),

  setHoldExpiry: (holdExpiry) =>
    set({ holdExpiry }),

  setPatientDetails: (details) =>
    set(details),

  clearBooking: () =>
    set(INITIAL),
}));
