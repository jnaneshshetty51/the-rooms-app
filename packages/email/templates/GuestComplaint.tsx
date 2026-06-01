// packages/email/templates/GuestComplaint.tsx
// Guest complaint notification to Front Office

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';

interface GuestComplaintProps {
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  bookingNumber: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  complaintId: string;
  subject: string;
  description: string;
  isUrgent: boolean;
  imageUrl?: string;
  complaintUrl: string;
  createdAt: string;
}

export function GuestComplaintEmail({
  guestName,
  guestPhone,
  guestEmail,
  bookingNumber,
  roomNumber,
  checkIn,
  checkOut,
  complaintId,
  subject,
  description,
  isUrgent,
  imageUrl,
  complaintUrl,
  createdAt,
}: GuestComplaintProps) {
  const previewText = isUrgent ? `URGENT: ${subject} - Room ${roomNumber}` : `${subject} - Room ${roomNumber}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Heading style={styles.logo}>THE ROOMS</Heading>
            <Text style={styles.headerBadge}>
              {isUrgent ? '⚠️ URGENT' : 'Complaint'} - Front Office Action Required
            </Text>
          </Section>

          {/* Urgent Alert */}
          {isUrgent && (
            <Section style={styles.urgentAlert}>
              <Text style={styles.urgentTitle}>&#9888; Urgent Complaint</Text>
              <Text style={styles.urgentText}>
                This complaint has been marked as urgent by the guest. Please attend to this
                immediately.
              </Text>
            </Section>
          )}

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
                  <td style={styles.value}>{bookingNumber}</td>
                </tr>
                <tr>
                  <td style={styles.label}>Room</td>
                  <td style={styles.value}>
                    <strong>Room {roomNumber}</strong>
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

          {/* Complaint Details */}
          <Section style={styles.complaintSection}>
            <Heading style={styles.sectionTitle}>Complaint Details</Heading>
            <Hr style={styles.divider} />

            <Text style={styles.complaintId}>Complaint ID: {complaintId}</Text>
            <Text style={styles.complaintId}>Reported: {createdAt}</Text>

            <div style={styles.subjectBox}>
              <Text style={styles.subjectLabel}>Subject</Text>
              <Text style={styles.subject}>{subject}</Text>
            </div>

            <div style={styles.descriptionBox}>
              <Text style={styles.descriptionLabel}>Description</Text>
              <Text style={styles.description}>{description}</Text>
            </div>

            {imageUrl && (
              <div style={styles.imageBox}>
                <Text style={styles.imageLabel}>Attached Image</Text>
                <Img
                  src={imageUrl}
                  alt="Complaint image"
                  style={styles.image}
                  width={400}
                />
              </div>
            )}
          </Section>

          {/* Action Required */}
          <Section style={styles.actionSection}>
            <Heading style={styles.sectionTitle}>Action Required</Heading>
            <Hr style={styles.divider} />
            <Text style={styles.text}>
              Please address this complaint and update the status. Contact the guest if
              additional information is needed.
            </Text>
            <Button href={complaintUrl} style={styles.button}>
              View & Resolve Complaint
            </Button>
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Please respond within 2 hours for standard complaints, or immediately for
              urgent matters.
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
    padding: '5px 15px',
    borderRadius: '20px',
    display: 'inline-block',
    margin: '0',
  },
  urgentAlert: {
    backgroundColor: '#FEE2E2',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    borderLeft: '4px solid #EF4444',
  },
  urgentTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#991B1B',
    margin: '0 0 10px',
  },
  urgentText: {
    fontSize: '14px',
    color: '#991B1B',
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
  complaintSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: '12px',
    padding: '30px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  complaintId: {
    fontSize: '12px',
    color: '#636E72',
    margin: '0 0 5px',
  },
  subjectBox: {
    backgroundColor: '#FEF3F0',
    borderRadius: '8px',
    padding: '20px',
    marginTop: '20px',
    marginBottom: '15px',
  },
  subjectLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#636E72',
    textTransform: 'uppercase' as const,
    margin: '0 0 5px',
  },
  subject: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#2D3436',
    margin: '0',
  },
  descriptionBox: {
    marginBottom: '15px',
  },
  descriptionLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#636E72',
    textTransform: 'uppercase' as const,
    margin: '0 0 5px',
  },
  description: {
    fontSize: '14px',
    color: '#2D3436',
    lineHeight: '1.6',
    margin: '0',
    whiteSpace: 'pre-wrap' as const,
  },
  imageBox: {
    marginTop: '15px',
  },
  imageLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#636E72',
    textTransform: 'uppercase' as const,
    margin: '0 0 10px',
  },
  image: {
    borderRadius: '8px',
    maxWidth: '100%',
    height: 'auto',
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
