import Razorpay from 'razorpay';
import crypto from 'crypto';

let razorpayClientInstance: Razorpay | null = null;

export function getRazorpayClient(): Razorpay {
  if (razorpayClientInstance) return razorpayClientInstance;

  const key_id = process.env.RAZORPAY_KEY_ID ?? '';
  const key_secret = process.env.RAZORPAY_KEY_SECRET ?? '';

  if (!key_id || !key_secret) {
    const message = 'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must be configured';
    if (process.env.NODE_ENV === 'production') {
      throw new Error(message);
    }
    console.warn(`[Razorpay] ${message} - using test credentials`);
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
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    console.error('[Razorpay] RAZORPAY_KEY_SECRET not configured');
    return false;
  }
  const generatedSignature = crypto
    .createHmac('sha256', secret)
    .update(orderId + '|' + paymentId)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(generatedSignature, 'utf-8'),
    Buffer.from(signature, 'utf-8')
  );
}

export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  return Razorpay.validateWebhookSignature(body, signature, secret);
}
