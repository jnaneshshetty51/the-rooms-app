// packages/email/templates/ExtendStayRequest.tsx
// Extend stay request notification to Front Office

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

interface ExtendStayRequestProps {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  bookingNumber: string;
  roomNumber: string;
  currentCheckOut: string;
  requestedCheckOut: string;
  additionalNights: number;
  requestId: string;
  foPortalUrl: string;
}

export function ExtendStayRequestEmail({
  guestName,
  guestPhone,
  guestEmail,
  bookingNumber,
  roomNumber,
  currentCheckOut,
  requestedCheckOut,
  additionalNights,
  requestId,
  foPortalUrl,
}: ExtendStayRequestProps) {
  const previewText = `Stay Extension Request - ${bookingNumber} - ${guestName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Heading style={styles.logo}>THE ROOMS</Heading>
            <Text style={styles.headerBadge}>Stay Extension Request</Text>
          </Section>

          {/* Alert */}
          <Section style={styles.alertSection}>
            <Text style={styles.alertTitle}>&#9888; New Extension Request</Text>
            <Text style={styles.alertText}>
              A guest has requested to extend their stay. Please review and take action.
            </Text>
          </Section>

          {/* Guest Details */}
          <Section style={styles.detailsSection}>
            <Heading style={styles.sectionTitle}>Guest Information</Heading>
            <Hr style={styles.divider} />

            <table style={styles.table}>
              <tbody>
                <tr>
                  <td style={styles.label}>Guest Name</td>
                  <td style={styles.value}>
                    <strong>{guestName}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={styles.label}>Phone</td>
                  <td style={styles.value}>
                    <Link href={`tel:${guestPhone}`}>{guestPhone}</Link>
                  </td>
                </tr>
                <tr>
                  <td style={styles.label}>Email</td>
                  <td style={styles.value}>
                    <Link href={`mailto:${guestEmail}`}>{guestEmail}</Link>
                  </td>
                </tr>
              </tbody>
            </table>
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
                  <td style={styles.value}>Room {roomNumber}</td>
                </tr>
                <tr>
                  <td style={styles.label}>Current Check-out</td>
                  <td style={styles.value}>
                    <strong style={styles.strikethrough}>{currentCheckOut}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={styles.label}>Requested Check-out</td>
                  <td style={styles.value}>
                    <strong style={styles.highlight}>{requestedCheckOut}</strong>
                  </td>
                </tr>
                <tr>
                  <td style={styles.label}>Additional Nights</td>
                  <td style={styles.value}>
                    <strong style={styles.highlight}>{additionalNights} night(s)</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Action Required */}
          <Section style={styles.actionSection}>
            <Heading style={styles.sectionTitle}>Action Required</Heading>
            <Hr style={styles.divider} />
            <Text style={styles.text}>
              Please contact the guest to confirm availability and process the extension.
            </Text>
            <Button href={foPortalUrl} style={styles.button}>
              View & Process Request
            </Button>
          </Section>

          {/* Instructions */}
          <Section style={styles.instructionsSection}>
            <Heading style={styles.sectionTitle}>Processing Steps</Heading>
            <Hr style={styles.divider} />
            <ol style={styles.stepsList}>
              <li style={styles.stepsItem}>
                Verify room availability for the extended dates
              </li>
              <li style={styles.stepsItem}>
                Contact guest to confirm new dates and any price difference
              </li>
              <li style={styles.stepsItem}>
                If guest agrees, update booking dates in the system
              </li>
              <li style={styles.stepsItem}>
                Process any additional payment if applicable
              </li>
              <li style={styles.stepsItem}>
                Send confirmation email to guest
              </li>
            </ol>
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Request ID: {requestId}
            </Text>
            <Text style={styles.footerText}>
              Received: {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
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
    margin: '0 0 10px',
    letterSpacing: '2px',
  },
  headerBadge: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#E17055',
    backgroundColor: '#FEF3F0',
    padding: '5px 15px',
    borderRadius: '20px',
    display: 'inline-block',
    margin: '0',
  },
  alertSection: {
    backgroundColor: '#FEF3C7',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '20px',
    borderLeft: '4px solid #F59E0B',
  },
  alertTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#92400E',
    margin: '0 0 10px',
  },
  alertText: {
    fontSize: '14px',
    color: '#92400E',
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
  strikethrough: {
    textDecoration: 'line-through',
    color: '#636E72',
  },
  highlight: {
    color: '#10B981',
  },
  actionSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    textAlign: 'center' as const,
  },
  text: {
    fontSize: '14px',
    color: '#2D3436',
    lineHeight: '1.6',
    margin: '0 0 20px',
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
  instructionsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  stepsList: {
    margin: '0',
    paddingLeft: '20px',
  },
  stepsItem: {
    fontSize: '14px',
    color: '#2D3436',
    marginBottom: '10px',
    lineHeight: '1.5',
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
