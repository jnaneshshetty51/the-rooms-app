"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type RoomType = "STUDIO" | "PREMIUM" | "MONTHLY";
export type BookingStep = 1 | 2 | 3 | 4 | 5;

export interface GuestDetails {
  name: string;
  phone: string;
  email: string;
  specialRequests?: string;
}

export interface BookingState {
  // Step 1: Date & Type
  checkIn: string | null;
  checkOut: string | null;
  guestsCount: number;
  roomType: RoomType | null;
  // Step 2: Room
  selectedRoomId: string | null;
  selectedRoomNumber: string | null;
  selectedRoomPrice: number;
  // Step 3: Extras
  extras: string[];
  // Step 4: Guest Details
  guestDetails: GuestDetails | null;
  discountCode: string;
  // Step 5: Payment
  paymentId: string | null;
  bookingId: string | null;
  bookingNumber: string | null;
  // Progress
  step: BookingStep;
  // Actions
  setDates: (checkIn: string, checkOut: string) => void;
  setRoomType: (roomType: RoomType | null) => void;
  setGuestsCount: (count: number) => void;
  selectRoom: (id: string, roomNumber: string, price: number) => void;
  setExtras: (extras: string[]) => void;
  setGuestDetails: (details: GuestDetails) => void;
  setDiscountCode: (code: string) => void;
  setPaymentInfo: (paymentId: string, bookingId: string, bookingNumber: string) => void;
  setStep: (step: BookingStep) => void;
  reset: () => void;
}

const initialState = {
  checkIn: null,
  checkOut: null,
  guestsCount: 1,
  roomType: null as RoomType | null,
  selectedRoomId: null,
  selectedRoomNumber: null,
  selectedRoomPrice: 0,
  extras: [] as string[],
  guestDetails: null as GuestDetails | null,
  discountCode: "",
  paymentId: null,
  bookingId: null,
  bookingNumber: null,
  step: 1 as BookingStep,
};

export const useBookingStore = create<BookingState>()(
  persist(
    (set) => ({
      ...initialState,
      setDates: (checkIn, checkOut) => set({ checkIn, checkOut }),
      setRoomType: (roomType) => set({ roomType }),
      setGuestsCount: (count) => set({ guestsCount: count }),
      selectRoom: (id, roomNumber, price) =>
        set({ selectedRoomId: id, selectedRoomNumber: roomNumber, selectedRoomPrice: price }),
      setExtras: (extras) => set({ extras }),
      setGuestDetails: (details) => set({ guestDetails: details }),
      setDiscountCode: (code) => set({ discountCode: code }),
      setPaymentInfo: (paymentId, bookingId, bookingNumber) =>
        set({ paymentId, bookingId, bookingNumber }),
      setStep: (step) => set({ step }),
      reset: () => set(initialState),
    }),
    {
      name: "therooms-booking",
      partialize: (state) => ({
        checkIn: state.checkIn,
        checkOut: state.checkOut,
        guestsCount: state.guestsCount,
        roomType: state.roomType,
        discountCode: state.discountCode,
      }),
    }
  )
);
