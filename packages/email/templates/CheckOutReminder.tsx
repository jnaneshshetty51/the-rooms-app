// packages/email/templates/CheckOutReminder.tsx
// Check-out reminder email template

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

interface CheckOutReminderProps {
  guestName: string;
  bookingNumber: string;
  roomNumber: string;
  checkOut: string;
  checkOutTime: string;
  hasOutstanding: boolean;
  outstandingAmount?: number;
  hotelPhone: string;
  hotelEmail: string;
}

export function CheckOutReminderEmail({
  guestName,
  bookingNumber,
  roomNumber,
  checkOut,
  checkOutTime,
  hasOutstanding,
  outstandingAmount = 0,
  hotelPhone,
  hotelEmail,
}: CheckOutReminderProps) {
  const previewText = `Reminder: Check-out today at ${checkOutTime} - Room ${roomNumber}`;

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

          {/* Reminder */}
          <Section style={styles.reminderSection}>
            <Text style={styles.greeting}>Good morning, {guestName},</Text>
            <Heading style={styles.heading}>Check-out Today</Heading>
            <Text style={styles.subheading}>
              We hope you enjoyed your stay at The Rooms. Here's your check-out summary.
            </Text>
          </Section>

          {/* Stay Details */}
          <Section style={styles.detailsSection}>
            <Heading style={styles.sectionTitle}>Check-out Details</Heading>
            <Hr style={styles.divider} />

            <table style={styles.table}>
              <tbody>
                <tr>
                  <td style={styles.label}>Room</td>
                  <td style={styles.value}>
                    <strong>{roomNumber}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={styles.label}>Check-out Time</td>
                  <td style={styles.value}>
                    <strong>{checkOutTime}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={styles.label}>Booking ID</td>
                  <td style={styles.value}>{bookingNumber}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Outstanding Balance */}
          {hasOutstanding && (
            <Section style={styles.alertSection}>
              <Text style={styles.alertTitle}>&#9888; Outstanding Balance</Text>
              <Text style={styles.alertText}>
                Please settle your balance of{' '}
                <strong>₹{outstandingAmount.toLocaleString('en-IN')}</strong> at reception
                before departure.
              </Text>
              <Button href="https://my.therooms.in/bookings" style={styles.payButton}>
                Pay Now
              </Button>
            </Section>
          )}

          {/* Express Check-out */}
          <Section style={styles.expressSection}>
            <Heading style={styles.sectionTitle}>Express Check-out</Heading>
            <Hr style={styles.divider} />
            <Text style={styles.text}>
              No need to visit reception! Simply:
            </Text>
            <ol style={styles.stepsList}>
              <li style={styles.stepsItem}>Leave your key in the key drop box at reception</li>
              <li style={styles.stepsItem}>Ensure all personal belongings are packed</li>
              <li style={styles.stepsItem}>Settle any outstanding balance via the link above (if applicable)</li>
            </ol>
            <Text style={styles.text}>
              Your invoice will be emailed to you automatically.
            </Text>
          </Section>

          {/* Feedback */}
          <Section style={styles.feedbackSection}>
            <Heading style={styles.sectionTitle}>How was your stay?</Heading>
            <Hr style={styles.divider} />
            <Text style={styles.text}>
              We'd love to hear about your experience! Your feedback helps us improve.
            </Text>
            <Button href="https://my.therooms.in/feedback" style={styles.feedbackButton}>
              Leave a Review
            </Button>
          </Section>

          {/* Contact */}
          <Section style={styles.contactSection}>
            <Heading style={styles.sectionTitle}>Need More Time?</Heading>
            <Hr style={styles.divider} />
            <Text style={styles.text}>
              If you need a late check-out, please contact reception at least 1 hour before
              your scheduled check-out time. Late check-out is subject to availability.
            </Text>
            <Text style={styles.text}>
              Phone: <Link href={`tel:${hotelPhone}`}>{hotelPhone}</Link> (24/7)
            </Text>
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Thank you for staying with us. We hope to welcome you back soon!
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
  reminderSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '40px 30px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    textAlign: 'center' as const,
  },
  greeting: {
    fontSize: '16px',
    color: '#636E72',
    margin: '0 0 15px',
  },
  heading: {
    fontSize: '26px',
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
  alertSection: {
    backgroundColor: '#FEE2E2',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '20px',
    borderLeft: '4px solid #EF4444',
  },
  alertTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#991B1B',
    margin: '0 0 10px',
  },
  alertText: {
    fontSize: '14px',
    color: '#991B1B',
    margin: '0 0 15px',
    lineHeight: '1.6',
  },
  payButton: {
    backgroundColor: '#EF4444',
    color: '#FFFFFF',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'inline-block',
  },
  expressSection: {
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
    margin: '0 0 15px',
  },
  stepsList: {
    margin: '0 0 15px',
    paddingLeft: '20px',
  },
  stepsItem: {
    fontSize: '14px',
    color: '#2D3436',
    marginBottom: '8px',
    lineHeight: '1.5',
  },
  feedbackSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    textAlign: 'center' as const,
  },
  feedbackButton: {
    backgroundColor: '#10B981',
    color: '#FFFFFF',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'inline-block',
  },
  contactSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  footer: {
    textAlign: 'center' as const,
    paddingTop: '20px',
  },
  footerText: {
    fontSize: '12px',
    color: '#636E72',
    margin: '0 0 5px',
  },
};
