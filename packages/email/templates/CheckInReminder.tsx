// packages/email/templates/CheckInReminder.tsx
// Check-in reminder email template

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

interface CheckInReminderProps {
  guestName: string;
  bookingNumber: string;
  roomNumber: string;
  checkIn: string;
  checkInTime: string;
  hotelAddress: string;
  hotelPhone: string;
  hotelEmail: string;
  hotelMapUrl: string;
  documentsUploaded: boolean;
}

export function CheckInReminderEmail({
  guestName,
  bookingNumber,
  roomNumber,
  checkIn,
  checkInTime,
  hotelAddress,
  hotelPhone,
  hotelEmail,
  hotelMapUrl,
  documentsUploaded,
}: CheckInReminderProps) {
  const previewText = `Reminder: Check-in tomorrow at The Rooms - ${roomNumber}`;

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
            <Text style={styles.greeting}>Hello {guestName},</Text>
            <Heading style={styles.heading}>Your check-in is tomorrow!</Heading>
            <Text style={styles.subheading}>
              We're excited to welcome you to The Rooms. Here's everything you need to
              know for a smooth check-in.
            </Text>
          </Section>

          {/* Stay Details */}
          <Section style={styles.detailsSection}>
            <Heading style={styles.sectionTitle}>Your Stay</Heading>
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
                    <strong>{roomNumber}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={styles.label}>Check-in</td>
                  <td style={styles.value}>
                    <strong>{checkIn}</strong> at <strong>{checkInTime}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Documents Status */}
          {!documentsUploaded && (
            <Section style={styles.alertSection}>
              <Text style={styles.alertTitle}>&#9888; Action Required</Text>
              <Text style={styles.alertText}>
                You haven't uploaded your ID documents yet. Please bring a valid
                government-issued ID (Aadhaar, Passport, or Driving License) for check-in.
              </Text>
              <Button href="https://my.therooms.in/documents" style={styles.secondaryButton}>
                Upload Documents Now
              </Button>
            </Section>
          )}

          {documentsUploaded && (
            <Section style={styles.successSection}>
              <Text style={styles.successIcon}>&#10003;</Text>
              <Text style={styles.successText}>
                Your ID documents have been uploaded and verified. You're all set!
              </Text>
            </Section>
          )}

          {/* Location */}
          <Section style={styles.locationSection}>
            <Heading style={styles.sectionTitle}>Location</Heading>
            <Hr style={styles.divider} />
            <Text style={styles.text}>{hotelAddress}</Text>
            <Button href={hotelMapUrl} style={styles.mapButton}>
              Get Directions
            </Button>
          </Section>

          {/* What to Bring */}
          <Section style={styles.bringSection}>
            <Heading style={styles.sectionTitle}>What to Bring</Heading>
            <Hr style={styles.divider} />
            <ul style={styles.list}>
              <li style={styles.listItem}>Valid government-issued ID (Aadhaar, Passport, or DL)</li>
              <li style={styles.listItem}>Booking confirmation (this email or booking ID)</li>
              <li style={styles.listItem}>
                Payment method (if paying balance at hotel)
              </li>
            </ul>
          </Section>

          {/* Contact */}
          <Section style={styles.contactSection}>
            <Heading style={styles.sectionTitle}>Questions?</Heading>
            <Hr style={styles.divider} />
            <Text style={styles.text}>
              Our reception is open 24/7. Call us at{' '}
              <Link href={`tel:${hotelPhone}`}>{hotelPhone}</Link> or email{' '}
              <Link href={`mailto:${hotelEmail}`}>{hotelEmail}</Link>
            </Text>
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
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
    backgroundColor: '#FEF3C7',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '20px',
    borderLeft: '4px solid #F59E0B',
  },
  alertTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#92400E',
    margin: '0 0 10px',
  },
  alertText: {
    fontSize: '14px',
    color: '#92400E',
    margin: '0 0 15px',
    lineHeight: '1.6',
  },
  secondaryButton: {
    backgroundColor: '#F59E0B',
    color: '#FFFFFF',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'inline-block',
  },
  successSection: {
    backgroundColor: '#D1FAE5',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '20px',
    textAlign: 'center' as const,
  },
  successIcon: {
    fontSize: '36px',
    color: '#059669',
    margin: '0 0 10px',
  },
  successText: {
    fontSize: '14px',
    color: '#065F46',
    margin: '0',
  },
  locationSection: {
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
  mapButton: {
    backgroundColor: '#E17055',
    color: '#FFFFFF',
    padding: '10px 24px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'inline-block',
  },
  bringSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  list: {
    margin: '0',
    paddingLeft: '20px',
  },
  listItem: {
    fontSize: '14px',
    color: '#2D3436',
    marginBottom: '8px',
    lineHeight: '1.5',
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
    margin: '0',
  },
};
