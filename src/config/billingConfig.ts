export type BillingPlan = 'monthly' | 'yearly';

export function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
}

export function isSandboxMode(): boolean {
  const envSetting = process.env.NEXT_PUBLIC_PADDLE_ENV;
  if (envSetting) {
    return envSetting === 'sandbox';
  }
  return isLocalhost();
}

const PRICE_ID_REGEX = /^pri_[a-zA-Z0-9]+$/;

export function validatePriceId(priceId: string, context: string = ''): { valid: boolean; error?: string } {
  const prefix = context ? `[${context}]` : '[Paddle Debug]';
  
  console.log(`${prefix} Validating price_id:`, {
    value: priceId || '(empty)',
    length: priceId?.length || 0,
    type: typeof priceId,
  });

  if (!priceId) {
    const error = 'price_id is empty or undefined';
    console.error(`${prefix} VALIDATION FAILED:`, error);
    return { valid: false, error };
  }

  if (typeof priceId !== 'string') {
    const error = `price_id must be a string, got ${typeof priceId}`;
    console.error(`${prefix} VALIDATION FAILED:`, error);
    return { valid: false, error };
  }

  if (!PRICE_ID_REGEX.test(priceId)) {
    const error = `price_id "${priceId}" does not match expected format (pri_xxx)`;
    console.error(`${prefix} VALIDATION FAILED:`, error);
    return { valid: false, error };
  }

  return { valid: true };
}

export function getCurrentPriceId(plan: BillingPlan = 'yearly'): string {
  const sandboxMode = isSandboxMode();
  const priceId = sandboxMode 
    ? process.env.NEXT_PUBLIC_PADDLE_SANDBOX_PRICE_ID 
    : process.env.NEXT_PUBLIC_PADDLE_LIVE_PRICE_ID;

  console.log('[Paddle] getCurrentPriceId', { plan, sandboxMode, priceId });
  validatePriceId(priceId || '', 'getCurrentPriceId');

  return priceId || '';
}

export const PADDLE_CONFIG = {
  sandbox: {
    token: process.env.NEXT_PUBLIC_PADDLE_SANDBOX_TOKEN || 'test_79d40c5949ab08e0777f0736248',
    sellerId: 48907,
  },
  live: {
    token: process.env.NEXT_PUBLIC_PADDLE_LIVE_TOKEN || '',
  }
};

export function getPaddleToken(): string {
  if (isSandboxMode()) {
    return PADDLE_CONFIG.sandbox.token;
  }
  return PADDLE_CONFIG.live.token;
}

export function getSellerId(): number | null {
  if (isSandboxMode()) {
    return PADDLE_CONFIG.sandbox.sellerId;
  }
  return null;
}
