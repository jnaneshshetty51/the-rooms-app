// packages/email/templates/InvoiceEmail.tsx
// Invoice email template (GST-compliant format for India)

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

interface InvoiceEmailProps {
  guestName: string;
  guestEmail: string;
  invoiceNumber: string;
  invoiceDate: string;
  bookingNumber: string;
  roomType: string;
  roomNumber: string;
  checkIn: string;
  checkOut: string;
  guestsCount: number;
  baseAmount: number;
  discountAmount: number;
  cgst: number;
  sgst: number;
  totalAmount: number;
  paymentMethod: string;
  transactionId: string;
  hotelName: string;
  hotelAddress: string;
  hotelPhone: string;
  hotelEmail: string;
  hotelGstin: string;
  invoicePdfUrl?: string;
}

export function InvoiceEmail({
  guestName,
  guestEmail,
  invoiceNumber,
  invoiceDate,
  bookingNumber,
  roomType,
  roomNumber,
  checkIn,
  checkOut,
  guestsCount,
  baseAmount,
  discountAmount,
  cgst,
  sgst,
  totalAmount,
  paymentMethod,
  transactionId,
  hotelName,
  hotelAddress,
  hotelPhone,
  hotelEmail,
  hotelGstin,
  invoicePdfUrl,
}: InvoiceEmailProps) {
  const previewText = `Invoice ${invoiceNumber} from ${hotelName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Invoice Header */}
          <Section style={styles.invoiceHeader}>
            <div style={styles.headerLeft}>
              <Heading style={styles.hotelName}>{hotelName}</Heading>
              <Text style={styles.hotelDetails}>
                {hotelAddress}
              </Text>
              <Text style={styles.hotelDetails}>Phone: {hotelPhone}</Text>
              <Text style={styles.hotelDetails}>Email: {hotelEmail}</Text>
              <Text style={styles.hotelDetails}>GSTIN: {hotelGstin}</Text>
            </div>
            <div style={styles.headerRight}>
              <Heading style={styles.invoiceTitle}>INVOICE</Heading>
              <Text style={styles.invoiceMeta}>Invoice No: {invoiceNumber}</Text>
              <Text style={styles.invoiceMeta}>Date: {invoiceDate}</Text>
              <Text style={styles.invoiceMeta}>Booking ID: {bookingNumber}</Text>
            </div>
          </Section>

          <Hr style={styles.divider} />

          {/* Bill To */}
          <Section style={styles.billToSection}>
            <Text style={styles.billToLabel}>Bill To:</Text>
            <Text style={styles.billToName}>{guestName}</Text>
            <Text style={styles.billToDetails}>{guestEmail}</Text>
          </Section>

          <Hr style={styles.divider} />

          {/* Stay Details */}
          <Section style={styles.staySection}>
            <table style={styles.stayTable}>
              <tbody>
                <tr>
                  <td style={styles.stayLabel}>Room Type</td>
                  <td style={styles.stayValue}>{roomType} (Room {roomNumber})</td>
                </tr>
                <tr>
                  <td style={styles.stayLabel}>Check-in</td>
                  <td style={styles.stayValue}>{checkIn} at 2:00 PM</td>
                </tr>
                <tr>
                  <td style={styles.stayLabel}>Check-out</td>
                  <td style={styles.stayValue}>{checkOut} at 11:00 AM</td>
                </tr>
                <tr>
                  <td style={styles.stayLabel}>Number of Guests</td>
                  <td style={styles.stayValue}>{guestsCount}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          <Hr style={styles.divider} />

          {/* Invoice Items */}
          <Section style={styles.itemsSection}>
            <table style={styles.itemsTable}>
              <thead>
                <tr style={styles.itemsHeaderRow}>
                  <th style={styles.itemHeader}>Description</th>
                  <th style={styles.itemHeaderRight}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={styles.itemDesc}>Room Rent ({checkIn} to {checkOut})</td>
                  <td style={styles.itemValue}>{baseAmount.toLocaleString('en-IN')}</td>
                </tr>
                {discountAmount > 0 && (
                  <tr>
                    <td style={styles.itemDesc}>Discount</td>
                    <td style={styles.itemValueDiscount}>-{discountAmount.toLocaleString('en-IN')}</td>
                  </tr>
                )}
                <tr>
                  <td style={styles.itemDesc}>CGST (9%)</td>
                  <td style={styles.itemValue}>{cgst.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style={styles.itemDesc}>SGST (9%)</td>
                  <td style={styles.itemValue}>{sgst.toLocaleString('en-IN')}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <td style={styles.totalLabel}>Total</td>
                  <td style={styles.totalValue}>₹{totalAmount.toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>
          </Section>

          <Hr style={styles.divider} />

          {/* Payment Info */}
          <Section style={styles.paymentSection}>
            <Text style={styles.paymentLabel}>Payment Information</Text>
            <Text style={styles.paymentText}>Payment Method: {paymentMethod}</Text>
            <Text style={styles.paymentText}>Transaction ID: {transactionId}</Text>
          </Section>

          {/* Download PDF */}
          {invoicePdfUrl && (
            <Section style={styles.downloadSection}>
              <Button href={invoicePdfUrl} style={styles.downloadButton}>
                Download Invoice PDF
              </Button>
            </Section>
          )}

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerNote}>
              This invoice is generated electronically and is valid without a signature.
            </Text>
            <Text style={styles.footerText}>
              © 2026 {hotelName}. All rights reserved.
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
    maxWidth: '700px',
    margin: '0 auto',
    padding: '40px 30px',
    backgroundColor: '#FFFFFF',
  },
  invoiceHeader: {
    display: 'flex' as const,
    justifyContent: 'space-between' as const,
    marginBottom: '20px',
  },
  headerLeft: {
    flex: '1',
  },
  headerRight: {
    textAlign: 'right' as const,
  },
  hotelName: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#2D3436',
    margin: '0 0 10px',
  },
  hotelDetails: {
    fontSize: '12px',
    color: '#636E72',
    margin: '0 0 3px',
    lineHeight: '1.5',
  },
  invoiceTitle: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#E17055',
    margin: '0 0 10px',
  },
  invoiceMeta: {
    fontSize: '12px',
    color: '#636E72',
    margin: '0 0 3px',
  },
  divider: {
    border: 'none',
    borderTop: '2px solid #DFE6E9',
    margin: '20px 0',
  },
  billToSection: {
    marginBottom: '20px',
  },
  billToLabel: {
    fontSize: '12px',
    color: '#636E72',
    margin: '0 0 5px',
    textTransform: 'uppercase' as const,
  },
  billToName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2D3436',
    margin: '0 0 3px',
  },
  billToDetails: {
    fontSize: '14px',
    color: '#636E72',
    margin: '0',
  },
  staySection: {
    marginBottom: '20px',
  },
  stayTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  stayLabel: {
    fontSize: '14px',
    color: '#636E72',
    width: '30%',
    padding: '5px 0',
  },
  stayValue: {
    fontSize: '14px',
    color: '#2D3436',
    textAlign: 'right' as const,
  },
  itemsSection: {
    marginBottom: '20px',
  },
  itemsTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  },
  itemsHeaderRow: {
    backgroundColor: '#F8F9FA',
  },
  itemHeader: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#636E72',
    textTransform: 'uppercase' as const,
    padding: '10px',
    textAlign: 'left' as const,
    borderBottom: '1px solid #DFE6E9',
  },
  itemHeaderRight: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#636E72',
    textTransform: 'uppercase' as const,
    padding: '10px',
    textAlign: 'right' as const,
    borderBottom: '1px solid #DFE6E9',
  },
  itemDesc: {
    fontSize: '14px',
    color: '#2D3436',
    padding: '10px 0',
    borderBottom: '1px solid #F0F0F0',
  },
  itemValue: {
    fontSize: '14px',
    color: '#2D3436',
    padding: '10px 0',
    textAlign: 'right' as const,
    borderBottom: '1px solid #F0F0F0',
  },
  itemValueDiscount: {
    fontSize: '14px',
    color: '#10B981',
    padding: '10px 0',
    textAlign: 'right' as const,
    borderBottom: '1px solid #F0F0F0',
  },
  totalLabel: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#2D3436',
    padding: '15px 0 5px',
  },
  totalValue: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#2D3436',
    padding: '15px 0 5px',
    textAlign: 'right' as const,
  },
  paymentSection: {
    marginBottom: '20px',
  },
  paymentLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#636E72',
    textTransform: 'uppercase' as const,
    margin: '0 0 10px',
  },
  paymentText: {
    fontSize: '14px',
    color: '#2D3436',
    margin: '0 0 5px',
  },
  downloadSection: {
    textAlign: 'center' as const,
    marginBottom: '30px',
  },
  downloadButton: {
    backgroundColor: '#E17055',
    color: '#FFFFFF',
    padding: '12px 28px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    textDecoration: 'none',
    display: 'inline-block',
  },
  footer: {
    textAlign: 'center' as const,
    paddingTop: '20px',
    borderTop: '1px solid #DFE6E9',
  },
  footerNote: {
    fontSize: '11px',
    color: '#636E72',
    margin: '0 0 10px',
    fontStyle: 'italic' as const,
  },
  footerText: {
    fontSize: '12px',
    color: '#636E72',
    margin: '0',
  },
};
