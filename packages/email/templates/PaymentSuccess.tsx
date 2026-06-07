import React from 'react';
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

interface PaymentSuccessProps {
  guestName: string;
  bookingNumber: string;
  roomType: string;
  roomNumber: string;
  amount: number;
  transactionId: string;
  paymentMethod: string;
  checkIn: string;
  checkOut: string;
}

export function PaymentSuccessEmail({
  guestName,
  bookingNumber,
  roomType,
  roomNumber,
  amount,
  transactionId,
  paymentMethod,
  checkIn,
  checkOut,
}: PaymentSuccessProps) {
  const previewText = `Payment of ₹${amount.toLocaleString('en-IN')} received - Booking ${bookingNumber}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Heading style={styles.logo}>THE ROOMS</Heading>
          </Section>

          {/* Success */}
          <Section style={styles.successSection}>
            <Text style={styles.checkmark}>&#10003;</Text>
            <Heading style={styles.heading}>Payment Received!</Heading>
            <Text style={styles.subheading}>
              Your payment of <strong>₹{amount.toLocaleString('en-IN')}</strong> has been
              successfully processed.
            </Text>
          </Section>

          {/* Payment Details */}
          <Section style={styles.detailsSection}>
            <Heading style={styles.sectionTitle}>Payment Details</Heading>
            <Hr style={styles.divider} />

            <table style={styles.table}>
              <tbody>
                <tr>
                  <td style={styles.label}>Transaction ID</td>
                  <td style={styles.value}>
                    <strong>{transactionId}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={styles.label}>Amount</td>
                  <td style={styles.value}>
                    <strong>₹{amount.toLocaleString('en-IN')}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={styles.label}>Payment Method</td>
                  <td style={styles.value}>{paymentMethod}</td>
                </tr>
                <tr>
                  <td style={styles.label}>Booking ID</td>
                  <td style={styles.value}>{bookingNumber}</td>
                </tr>
                <tr>
                  <td style={styles.label}>Room</td>
                  <td style={styles.value}>
                    {roomType} - Room {roomNumber}
                  </td>
                </tr>
                <tr>
                  <td style={styles.label}>Stay Period</td>
                  <td style={styles.value}>
                    {checkIn} to {checkOut}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Confirmation Message */}
          <Section style={styles.messageSection}>
            <Text style={styles.text}>
              Hello {guestName}, your room has been confirmed! We look forward to
              welcoming you.
            </Text>
            <Text style={styles.text}>
              A detailed booking confirmation has been sent separately. Please keep this
              payment receipt for your records.
            </Text>
          </Section>

          {/* Actions */}
          <Section style={styles.actionsSection}>
            <Button href="https://my.therooms.in" style={styles.button}>
              View My Bookings
            </Button>
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Hr style={styles.divider} />
            <Text style={styles.footerText}>
              If you have any questions, please contact us at hello@therooms.in
            </Text>
            <Text style={styles.footerText}>
              © 2026 The Rooms. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

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
    margin: '0 0 15px',
  },
  subheading: {
    fontSize: '16px',
    color: '#636E72',
    margin: '0',
    lineHeight: '1.6',
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
  messageSection: {
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
  actionsSection: {
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
    paddingTop: '10px',
  },
  footerText: {
    fontSize: '12px',
    color: '#636E72',
    margin: '0 0 5px',
  },
};
