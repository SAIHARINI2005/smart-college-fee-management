import crypto from 'crypto';
import Razorpay from 'razorpay';

export function getRazorpayCredentials() {
  const rawKeyId = process.env.RAZORPAY_KEY_ID || '';
  const rawKeySecret = process.env.RAZORPAY_KEY_SECRET || '';
  const rawWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || '';

  // Clean strings by trimming spaces and stripping surrounding quotes
  const keyId = rawKeyId.trim().replace(/^['"]|['"]$/g, '');
  const keySecret = rawKeySecret.trim().replace(/^['"]|['"]$/g, '');
  const webhookSecret = rawWebhookSecret.trim().replace(/^['"]|['"]$/g, '');

  return {
    keyId,
    keySecret,
    webhookSecret,
    isConfigured: Boolean(keyId && keySecret),
    isTestMode: keyId.startsWith('rzp_test_')
  };
}

export function getRazorpayClient(): Razorpay {
  const { keyId, keySecret, isConfigured } = getRazorpayCredentials();

  if (!isConfigured) {
    throw new Error(
      'Razorpay configuration missing: Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Settings > Environment Variables.'
    );
  }

  if (!keyId.startsWith('rzp_test_') && !keyId.startsWith('rzp_live_')) {
    console.warn('⚠️ Warning: RAZORPAY_KEY_ID should start with "rzp_test_" for test mode integration.');
  }

  // Always instantiate with current cleaned credentials
  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
}

export interface CreateOrderParams {
  amount: number; // in INR rupees (will be converted to paise)
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  entity: string;
  amount: number; // in paise
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
  key_id: string;
}

// Server-side REAL Razorpay Order creation
export async function createRazorpayOrder(params: CreateOrderParams): Promise<RazorpayOrderResult> {
  const { keyId, keySecret } = getRazorpayCredentials();
  const client = getRazorpayClient();
  const amountInPaise = Math.round(params.amount * 100);
  const receipt = params.receipt;
  const currency = params.currency || 'INR';
  const notes = params.notes || {};

  console.log(`📡 [Razorpay Test Mode] Creating order for ₹${params.amount} (${amountInPaise} paise), key: ${keyId.substring(0, 12)}...`);

  try {
    const order = await client.orders.create({
      amount: amountInPaise,
      currency,
      receipt,
      notes
    });

    console.log(`✅ [Razorpay Test Mode] Order created successfully:`, {
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      status: order.status,
      receipt: order.receipt
    });

    return {
      ...(order as any),
      key_id: keyId
    };
  } catch (error: any) {
    const rawDescription = error?.error?.description || error?.message || 'Razorpay Order API error';
    const errorCode = error?.error?.code || error?.statusCode || 'BAD_REQUEST_ERROR';

    console.error(`❌ [Razorpay Test Mode] Order creation failed [${errorCode}]:`, rawDescription);

    if (rawDescription.toLowerCase().includes('authentication failed')) {
      throw new Error(
        `Razorpay Authentication Failed: The RAZORPAY_KEY_ID (${keyId.slice(0, 10)}...) and RAZORPAY_KEY_SECRET in Settings do not match or the secret was regenerated in your Razorpay Dashboard. Please copy the fresh Key ID & Key Secret together from Razorpay Dashboard > Account & Settings > API Keys.`
      );
    }

    throw new Error(`Razorpay order creation failed: ${rawDescription} (${errorCode})`);
  }
}

// Server-side HMAC SHA256 Signature Verification
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const { keySecret } = getRazorpayCredentials();

  if (!orderId || !paymentId || !signature) {
    console.warn('⚠️ [Razorpay] Missing signature verification parameters:', { orderId, paymentId, hasSignature: Boolean(signature) });
    return false;
  }

  if (!keySecret) {
    console.error('❌ [Razorpay] Cannot verify signature: RAZORPAY_KEY_SECRET is not configured.');
    return false;
  }

  try {
    const generatedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = generatedSignature === signature;
    console.log(`🔍 [Razorpay] Signature verification check:`, {
      orderId,
      paymentId,
      match: isValid
    });

    return isValid;
  } catch (err) {
    console.error('❌ [Razorpay] Signature computation error:', err);
    return false;
  }
}

// Fetch verified payment details directly from Razorpay API
export async function fetchRazorpayPaymentDetails(paymentId: string): Promise<any> {
  const client = getRazorpayClient();
  try {
    console.log(`📡 [Razorpay Test Mode] Fetching payment details from Razorpay API for: ${paymentId}`);
    const payment = await client.payments.fetch(paymentId);
    console.log(`✅ [Razorpay Test Mode] Payment details fetched:`, {
      paymentId: payment.id,
      orderId: payment.order_id,
      amount: payment.amount,
      status: payment.status,
      method: payment.method,
      email: payment.email,
      contact: payment.contact
    });
    return payment;
  } catch (error: any) {
    const desc = error?.error?.description || error?.message || 'Failed to fetch payment details';
    console.error(`❌ [Razorpay Test Mode] Failed to fetch payment ${paymentId}:`, desc);
    throw new Error(`Failed to fetch payment from Razorpay API: ${desc}`);
  }
}

// Webhook Signature Verification
export function verifyWebhookSignature(
  webhookBody: string,
  webhookSignature: string
): boolean {
  const { webhookSecret } = getRazorpayCredentials();

  if (!webhookBody || !webhookSignature || !webhookSecret) {
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(webhookBody)
      .digest('hex');

    return expectedSignature === webhookSignature;
  } catch (err) {
    console.error('❌ [Razorpay] Webhook signature verification error:', err);
    return false;
  }
}

export function getPublicKey(): string {
  const { keyId } = getRazorpayCredentials();
  return keyId;
}
