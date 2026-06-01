"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Star, Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
} from "@the-rooms/ui";
import { formatDate } from "@the-rooms/ui";

type Booking = {
  id: string;
  bookingNumber: string;
  checkIn: string;
  checkOut: string;
  status: string;
  room: { roomNumber: string; type: string };
};

type Review = {
  id: string;
  bookingId: string;
  metadata: {
    rating: number;
    reviewText: string;
    isAnonymous: boolean;
    status: string;
    submittedAt: string;
  };
  createdAt: string;
  booking: {
    bookingNumber: string;
    room: { roomNumber: string; type: string };
  };
};

export default function FeedbackPage() {
  const searchParams = useSearchParams();
  const preselectedBookingId = searchParams.get("bookingId");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [bookingsRes, feedbackRes] = await Promise.all([
          fetch("/api/bookings"),
          fetch("/api/feedback"),
        ]);
        if (bookingsRes.ok) {
          const data = await bookingsRes.json();
          // Only show checked-out bookings for review
          const completed = (data.bookings ?? []).filter(
            (b: Booking) => b.status === "CHECKED_OUT"
          );
          setBookings(completed);

          if (preselectedBookingId) {
            const found = completed.find(
              (b: Booking) => b.id === preselectedBookingId
            );
            setSelectedBooking(found ?? null);
          }
        }
        if (feedbackRes.ok) {
          const data = await feedbackRes.json();
          setReviews(data.reviews ?? []);
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [preselectedBookingId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedBooking || rating === 0) {
      setError("Please select a booking and provide a rating");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          rating,
          reviewText,
          isAnonymous,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to submit review");
      }

      setSuccess(
        "Thank you for your review! It will be published after our team approves it."
      );
      setRating(0);
      setReviewText("");
      setIsAnonymous(false);
      setSelectedBooking(null);

      // Refresh reviews
      const feedbackRes = await fetch("/api/feedback");
      if (feedbackRes.ok) {
        const data = await feedbackRes.json();
        setReviews(data.reviews ?? []);
      }
    } catch (err: any) {
      setError(err.message ?? "Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#E17055] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#2D3436]">Share Feedback</h1>
        <p className="text-sm text-[#636E72] mt-1">
          Help us improve — review your stay
        </p>
      </div>

      {/* Submit review form */}
      {bookings.length > 0 && (
        <Card className="border-[#FDCB6E]/30">
          <div className="h-1 bg-gradient-to-r from-[#FDCB6E] to-[#E17055]" />
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-5 h-5 text-[#FDCB6E]" />
              Write a Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Booking selector */}
              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
                  Select Stay
                </label>
                <select
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055]"
                  value={selectedBooking?.id ?? ""}
                  onChange={(e) => {
                    const found = bookings.find((b) => b.id === e.target.value);
                    setSelectedBooking(found ?? null);
                  }}
                  required
                >
                  <option value="">Choose a completed stay</option>
                  {bookings.map((b) => {
                    const alreadyReviewed = reviews.some(
                      (r) => r.bookingId === b.id
                    );
                    return (
                      <option
                        key={b.id}
                        value={b.id}
                        disabled={alreadyReviewed}
                      >
                        {b.bookingNumber} — Room {b.room.roomNumber} ·{" "}
                        {formatDate(b.checkIn)} to {formatDate(b.checkOut)}
                        {alreadyReviewed ? " (Reviewed)" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Star rating */}
              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-2">
                  Overall Rating <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= (hoverRating || rating)
                            ? "fill-[#FDCB6E] text-[#FDCB6E]"
                            : "text-[#E5E5E5]"
                        } transition-colors`}
                      />
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#B2BEC3] mt-1">
                  {rating === 0
                    ? "Tap to rate"
                    : rating === 1
                    ? "Poor"
                    : rating === 2
                    ? "Fair"
                    : rating === 3
                    ? "Good"
                    : rating === 4
                    ? "Very Good"
                    : "Excellent!"}
                </p>
              </div>

              {/* Review text */}
              <div>
                <label className="block text-sm font-medium text-[#2D3436] mb-1.5">
                  Your Review{" "}
                  <span className="text-xs text-[#B2BEC3]">(optional)</span>
                </label>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your experience — what did you like? What could be better?"
                  rows={4}
                  maxLength={1000}
                  className="w-full px-4 py-3 rounded-lg border border-[#E5E5E5] bg-white text-[#2D3436] text-sm focus:outline-none focus:ring-2 focus:ring-[#E17055] resize-none"
                />
                <p className="text-xs text-[#B2BEC3] text-right mt-1">
                  {reviewText.length}/1000
                </p>
              </div>

              {/* Anonymous toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="w-4 h-4 accent-[#E17055]"
                />
                <div>
                  <span className="text-sm font-medium text-[#2D3436]">
                    Post anonymously
                  </span>
                  <p className="text-xs text-[#B2BEC3]">
                    Your name will be shown as &quot;Guest&quot; on the website
                  </p>
                </div>
              </label>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="p-3 rounded-lg bg-[#00B894]/10 text-[#00A381] text-sm flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  {success}
                </div>
              )}

              <Button
                type="submit"
                disabled={submitting || !selectedBooking || rating === 0}
                className="w-full bg-[#E17055] hover:bg-[#D35B3F]"
              >
                {submitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  <><Star className="w-4 h-4 mr-2" /> Submit Review</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Past reviews */}
      <div>
        <h2 className="text-lg font-semibold text-[#2D3436] mb-3">
          Your Reviews ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <Card className="border-dashed border-2 border-[#E5E5E5]">
            <CardContent className="py-12 text-center">
              <Star className="w-12 h-12 text-[#B2BEC3] mx-auto mb-3" />
              <p className="text-[#636E72] font-medium">No reviews yet</p>
              <p className="text-sm text-[#B2BEC3] mt-1">
                Complete a stay to share your feedback
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#2D3436]">
                        Room {review.booking.room.roomNumber}
                      </p>
                      <p className="text-xs text-[#636E72]">
                        {review.booking.bookingNumber}
                      </p>
                    </div>
                    <Badge
                      variant={
                        review.metadata.status === "APPROVED"
                          ? "default"
                          : "secondary"
                      }
                      className={
                        review.metadata.status === "APPROVED"
                          ? "bg-[#00B894] text-white"
                          : ""
                      }
                    >
                      {review.metadata.status === "APPROVED" ? (
                        <><CheckCircle2 className="w-3 h-3 mr-1" /> Published</>
                      ) : review.metadata.status === "PENDING_APPROVAL" ? (
                        <><Clock className="w-3 h-3 mr-1" /> Pending</>
                      ) : (
                        review.metadata.status
                      )}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.metadata.rating
                            ? "fill-[#FDCB6E] text-[#FDCB6E]"
                            : "text-[#E5E5E5]"
                        }`}
                      />
                    ))}
                  </div>
                  {review.metadata.reviewText && (
                    <p className="text-sm text-[#636E72]">
                      &quot;{review.metadata.reviewText}&quot;
                    </p>
                  )}
                  <p className="text-xs text-[#B2BEC3]">
                    Submitted {formatDate(review.createdAt)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
