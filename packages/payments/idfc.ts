// packages/payments/idfc.ts
// IDFC Bank Payment Gateway SDK wrapper

import crypto from 'crypto';

const IDFC_API_BASE = 'https://api.idfcbank.com/payment/v1';
const IDFC_SANDBOX_BASE = 'https://sandbox.idfcbank.com/payment/v1';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IDFCCredentials {
  clientId: string;
  clientSecret: string;
  merchantId: string;
  environment: 'sandbox' | 'production';
}

export interface InitiatePaymentRequest {
  orderId: string;
  amount: number; // in paise (integer)
  currency?: string; // default: INR
  customerEmail: string;
  customerPhone: string;
  customerName?: string;
  description?: string;
  returnUrl: string;
  notifyUrl?: string;
}

export interface InitiatePaymentResponse {
  orderId: string;
  paymentUrl: string;
  embeddedToken?: string;
  expiresAt: string;
}

export interface PaymentStatusRequest {
  orderId?: string;
  transactionId?: string;
}

export interface PaymentStatusResponse {
  orderId: string;
  transactionId?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
  amount: number;
  currency: string;
  customerEmail?: string;
  paymentMethod?: string;
  gatewayTransactionId?: string;
  errorMessage?: string;
  paidAt?: string;
}

export interface RefundRequest {
  transactionId: string;
  refundAmount: number; // in paise
  reason: string;
  refundReference?: string;
}

export interface RefundResponse {
  refundId: string;
  transactionId: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  refundAmount: number;
  initiatedAt: string;
  completedAt?: string;
}

export interface WebhookPayload {
  orderId: string;
  transactionId: string;
  status: 'SUCCESS' | 'FAILED' | 'CANCELLED' | 'PENDING';
  amount: number;
  currency: string;
  paymentMethod?: string;
  gatewayTransactionId?: string;
  errorCode?: string;
  errorMessage?: string;
  checksum: string;
}

// ── IDFC Client ───────────────────────────────────────────────────────────────

export class IDFCPaymentClient {
  private credentials: IDFCCredentials;
  private baseUrl: string;
  private accessToken?: string;
  private tokenExpiry: number = 0;

  constructor(credentials: IDFCCredentials) {
    this.credentials = credentials;
    this.baseUrl =
      credentials.environment === 'sandbox' ? IDFC_SANDBOX_BASE : IDFC_API_BASE;
  }

  /**
   * Authenticate and get access token
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        scope: 'payment',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new IDFCError('Failed to authenticate with IDFC', response.status, error);
    }

    const data = await response.json();
    this.accessToken = data.access_token;
    // Token typically expires in 1 hour, refresh 5 min before
    this.tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;
    return this.accessToken!;
  }

  /**
   * Make authenticated API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Merchant-Id': this.credentials.merchantId,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new IDFCError(
        `IDFC API error at ${endpoint}`,
        response.status,
        error
      );
    }

    return response.json();
  }

  /**
   * Generate checksum for webhook verification
   */
  generateChecksum(payload: Record<string, unknown>): string {
    const data = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', this.credentials.clientSecret)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify webhook checksum
   */
  verifyWebhookChecksum(
    payload: WebhookPayload,
    providedChecksum: string
  ): boolean {
    const { checksum, ...payloadWithoutChecksum } = payload;
    const expectedChecksum = this.generateChecksum(payloadWithoutChecksum);
    return crypto.timingSafeEqual(
      Buffer.from(expectedChecksum),
      Buffer.from(providedChecksum)
    );
  }

  /**
   * Initiate a payment
   */
  async initiatePayment(
    request: InitiatePaymentRequest
  ): Promise<InitiatePaymentResponse> {
    const payload = {
      orderId: request.orderId,
      amount: request.amount,
      currency: request.currency ?? 'INR',
      customer: {
        email: request.customerEmail,
        phone: request.customerPhone,
        name: request.customerName,
      },
      description: request.description,
      returnUrl: request.returnUrl,
      notifyUrl: request.notifyUrl,
    };

    return this.request<InitiatePaymentResponse>('/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(
    request: PaymentStatusRequest
  ): Promise<PaymentStatusResponse> {
    const params = new URLSearchParams();
    if (request.orderId) params.append('orderId', request.orderId);
    if (request.transactionId)
      params.append('transactionId', request.transactionId);

    return this.request<PaymentStatusResponse>(`/orders/status?${params}`);
  }

  /**
   * Initiate a refund
   */
  async refundPayment(request: RefundRequest): Promise<RefundResponse> {
    const payload = {
      transactionId: request.transactionId,
      refundAmount: request.refundAmount,
      reason: request.reason,
      refundReference: request.refundReference,
    };

    return this.request<RefundResponse>('/refunds', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}

// ── Custom Error ─────────────────────────────────────────────────────────────

export class IDFCError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public responseBody?: string
  ) {
    super(message);
    this.name = 'IDFCError';
  }
}

// ── Singleton instance factory ───────────────────────────────────────────────

let idfcClientInstance: IDFCPaymentClient | null = null;

export function getIDFCClient(): IDFCPaymentClient {
  if (idfcClientInstance) return idfcClientInstance;

  const credentials: IDFCCredentials = {
    clientId: process.env.IDFC_CLIENT_ID ?? '',
    clientSecret: process.env.IDFC_CLIENT_SECRET ?? '',
    merchantId: process.env.IDFC_MERCHANT_ID ?? '',
    environment:
      (process.env.IDFC_ENV as 'sandbox' | 'production') ?? 'sandbox',
  };

  if (!credentials.clientId || !credentials.clientSecret || !credentials.merchantId) {
    throw new Error('IDFC credentials not configured');
  }

  idfcClientInstance = new IDFCPaymentClient(credentials);
  return idfcClientInstance;
}

// ── Helper: Convert INR to paise ─────────────────────────────────────────────

export function toPaise(inr: number): number {
  return Math.round(inr * 100);
}

export function fromPaise(paise: number): number {
  return paise / 100;
}
