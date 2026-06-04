import Razorpay from 'razorpay';
import crypto from 'crypto';

let razorpayClientInstance: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  if (razorpayClientInstance) return razorpayClientInstance;

  const key_id = process.env.RAZORPAY_KEY_ID ?? '';
  const key_secret = process.env.RAZORPAY_KEY_SECRET ?? '';

  if (!key_id || !key_secret) {
    console.warn('RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET not configured.');
  }

  razorpayClientInstance = new Razorpay({
    key_id: key_id || 'test_key',
    key_secret: key_secret || 'test_secret',
  });

  return razorpayClientInstance;
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET ?? 'test_secret';
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(orderId + '|' + paymentId)
    .digest('hex');
  return generatedSignature === signature;
}

export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  return Razorpay.validateWebhookSignature(body, signature, secret);
}
