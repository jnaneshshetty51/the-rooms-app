// packages/email/templates/BookingConfirmation.tsx
// Booking confirmation email template

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface BookingConfirmationProps {
  guestName: string;
  bookingId: string;
  bookingNumber: string;
  roomType: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  totalAmount: number;
  paymentMethod: string;
  hotelAddress: string;
  hotelPhone: string;
  hotelEmail: string;
}

export function BookingConfirmationEmail({
  guestName,
  bookingId,
  bookingNumber,
  roomType,
  roomNumber,
  checkIn,
  checkOut,
  guestsCount,
  totalAmount,
  paymentMethod,
  hotelAddress,
  hotelPhone,
  hotelEmail,
}: BookingConfirmationProps) {
  const previewText = `Booking Confirmed! ${bookingNumber} - ${roomType} Room`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Heading style={styles.logo}>THE ROOMS</Heading>
            <Text style={styles.tagline}>Your space. Your stay.</Text>
          </Section>

          {/* Success Message */}
          <Section style={styles.successSection}>
            <Text style={styles.checkmark}>&#10003;</Text>
            <Heading style={styles.heading}>Booking Confirmed!</Heading>
            <Text style={styles.subheading}>
              Thank you for choosing The Rooms. Your reservation is confirmed.
            </Text>
          </Section>

          {/* Booking Details */}
          <Section style={styles.detailsSection}>
            <Heading style={styles.sectionTitle}>Booking Details</Heading>
            <Hr style={styles.divider} />

            <table style={styles.table}>
              <tbody>
                <tr>
                  <td style={styles.label}>Booking ID</td>
                  <td style={styles.value}>
                    <strong>{bookingNumber}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={styles.label}>Room</td>
                  <td style={styles.value}>
                    {roomType} - Room {roomNumber}
                  </td>
                </tr>
                <tr>
                  <td style={styles.label}>Check-in</td>
                  <td style={styles.value}>{checkIn} at 2:00 PM</td>
                </tr>
                <tr>
                  <td style={styles.label}>Check-out</td>
                  <td style={styles.value}>{checkOut} at 11:00 AM</td>
                </tr>
                <tr>
                  <td style={styles.label}>Guests</td>
                  <td style={styles.value}>{guestsCount}</td>
                </tr>
                <tr>
                  <td style={styles.label}>Total Paid</td>
                  <td style={styles.value}>
                    <strong>₹{totalAmount.toLocaleString('en-IN')}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={styles.label}>Payment Method</td>
                  <td style={styles.value}>{paymentMethod}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Check-in Instructions */}
          <Section style={styles.instructionsSection}>
            <Heading style={styles.sectionTitle}>Check-in Instructions</Heading>
            <Hr style={styles.divider} />
            <Text style={styles.text}>
              Please show this email or provide your booking ID at reception upon arrival.
            </Text>
            <Text style={styles.text}>
              Valid government-issued ID (Aadhaar, Passport, or Driving License) is required
              at check-in.
            </Text>
          </Section>

          {/* Hotel Contact */}
          <Section style={styles.contactSection}>
            <Heading style={styles.sectionTitle}>Need Help?</Heading>
            <Hr style={styles.divider} />
            <Text style={styles.text}>{hotelAddress}</Text>
            <Text style={styles.text}>
              Phone: <Link href={`tel:${hotelPhone}`}>{hotelPhone}</Link>
            </Text>
            <Text style={styles.text}>
              Email: <Link href={`mailto:${hotelEmail}`}>{hotelEmail}</Link>
            </Text>
          </Section>

          {/* CTA Button */}
          <Section style={styles.ctaSection}>
            <Button href={`https://my.therooms.in/bookings/${bookingId}`} style={styles.button}>
              View My Booking
            </Button>
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              <strong>Cancellation Policy:</strong> Free cancellation up to 24 hours before
              check-in. Cancellations within 24 hours will be charged one night's stay.
            </Text>
            <Hr style={styles.divider} />
            <Text style={styles.footerText}>
              © 2026 The Rooms. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const styles = {
  body: {
    backgroundColor: '#FAFAF8',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
  },
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
  },
  header: {
    textAlign: 'center' as const,
    marginBottom: '30px',
  },
  logo: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2D3436',
    margin: '0',
    letterSpacing: '2px',
  },
  tagline: {
    fontSize: '14px',
    color: '#636E72',
    margin: '5px 0 0',
  },
  successSection: {
    textAlign: 'center' as const,
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '40px 20px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  checkmark: {
    fontSize: '48px',
    color: '#10B981',
    margin: '0 0 20px',
  },
  heading: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#2D3436',
    margin: '0 0 10px',
  },
  subheading: {
    fontSize: '16px',
    color: '#636E72',
    margin: '0',
  },
  detailsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2D3436',
    margin: '0 0 15px',
  },
  divider: {
    border: 'none',
    borderTop: '1px solid #DFE6E9',
    margin: '15px 0',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  label: {
    padding: '8px 0',
    color: '#636E72',
    fontSize: '14px',
    width: '40%',
  },
  value: {
    padding: '8px 0',
    color: '#2D3436',
    fontSize: '14px',
    textAlign: 'right' as const,
  },
  instructionsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  text: {
    fontSize: '14px',
    color: '#2D3436',
    lineHeight: '1.6',
    margin: '0 0 10px',
  },
  contactSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  ctaSection: {
    textAlign: 'center' as const,
    marginBottom: '30px',
  },
  button: {
    backgroundColor: '#E17055',
    color: '#FFFFFF',
    padding: '14px 32px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'inline-block',
  },
  footer: {
    textAlign: 'center' as const,
    paddingTop: '20px',
  },
  footerText: {
    fontSize: '12px',
    color: '#636E72',
    margin: '0 0 10px',
  },
};
