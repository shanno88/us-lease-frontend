declare global {
  interface Window {
    Paddle: {
      Initialize: (options: {
        token: string;
        eventCallback?: (data: PaddleEventData) => void;
      }) => void;
      Environment: {
        set: (env: 'sandbox' | 'production') => void;
      };
      Checkout: {
        open: (options: {
          items: { price_id: string; quantity: number }[];
          custom_data?: Record<string, unknown>;
        }) => void;
      };
      Update: (options: {
        eventCallback?: (data: PaddleEventData) => void;
      }) => void;
    };
    paddlePaymentCompleted?: boolean;
  }
}

let paddleReady = false;
let paddleInitPromise: Promise<void> | null = null;

interface PaddleEventData {
  name: string;
  data: {
    id?: string;
    transaction_id?: string;
    status?: string;
    custom_data?: Record<string, unknown>;
    customer?: {
      email?: string;
    };
    items?: Array<{
      price?: { id?: string };
      product?: { name?: string };
    }>;
  };
}

export const PADDLE_EVENTS = {
  CHECKOUT_COMPLETED: 'checkout.completed',
  CHECKOUT_CLOSED: 'checkout.closed',
  CHECKOUT_LOADED: 'checkout.loaded',
};

import {
  getCurrentPriceId,
  isSandboxMode,
  getPaddleToken,
  getSellerId,
  validatePriceId
} from './billingConfig';

export type { BillingPlan } from './billingConfig';
export { getCurrentPriceId, isSandboxMode, getPaddleToken, getSellerId };

function paddleEventHandler(data: PaddleEventData): void {
  console.log('[Paddle Event]', data.name, data);

  switch (data.name) {
    case PADDLE_EVENTS.CHECKOUT_COMPLETED:
      console.log('[Paddle] Checkout completed!', data.data);
      window.paddlePaymentCompleted = true;
      window.dispatchEvent(new CustomEvent('paddle:checkout:completed', { 
        detail: data.data 
      }));
      break;

    case PADDLE_EVENTS.CHECKOUT_CLOSED:
      console.log('[Paddle] Checkout closed', data.data);
      window.dispatchEvent(new CustomEvent('paddle:checkout:closed', { 
        detail: data.data 
      }));
      break;

    case PADDLE_EVENTS.CHECKOUT_LOADED:
      console.log('[Paddle] Checkout loaded');
      break;

    default:
      console.log('[Paddle] Unhandled event:', data.name);
  }
}

export function initPaddle(): Promise<void> {
  if (paddleInitPromise) {
    return paddleInitPromise;
  }

  paddleInitPromise = new Promise((resolve) => {
    const tryInit = () => {
      if (typeof window === 'undefined') {
        console.warn('[Paddle] Not in browser environment');
        resolve();
        return;
      }

      if (window.Paddle) {
        const token = getPaddleToken();
        const sandbox = isSandboxMode();
        const sellerId = getSellerId();

        if (sandbox) {
          window.Paddle.Environment.set('sandbox');
        }

        console.log(`[Paddle] Initializing in ${sandbox ? 'sandbox' : 'production'} mode`);
        console.log(`[Paddle] Token: ${token.substring(0, 10)}...`);
        if (sellerId) {
          console.log(`[Paddle] Seller ID: ${sellerId}`);
        }

        window.Paddle.Initialize({ 
          token,
          eventCallback: paddleEventHandler
        });

        paddleReady = true;
        console.log('[Paddle] Initialization complete');
        resolve();
        return;
      }

      console.log('[Paddle] SDK not yet loaded, waiting...');
    };

    tryInit();

    if (!paddleReady) {
      const checkInterval = setInterval(() => {
        if (window.Paddle) {
          clearInterval(checkInterval);
          tryInit();
        }
      }, 100);

      setTimeout(() => {
        clearInterval(checkInterval);
        if (!paddleReady) {
          console.warn('[Paddle] SDK load timeout after 10 seconds');
        }
        resolve();
      }, 10000);
    }
  });

  return paddleInitPromise;
}

export function isPaddleReady(): boolean {
  return paddleReady && typeof window !== 'undefined' && !!window.Paddle;
}

export interface CheckoutOptions {
  priceId: string;
  customData?: Record<string, unknown>;
}

export interface CheckoutError {
  type: 'validation' | 'paddle' | 'not_ready';
  message: string;
  details?: unknown;
}

export function openCheckout(options: CheckoutOptions): { success: boolean; error?: CheckoutError } {
  const { priceId, customData } = options;

  console.log('[Paddle Debug] openCheckout called:', {
    priceId,
    customData,
    paddleReady,
    hasPaddle: typeof window !== 'undefined' && !!window.Paddle,
  });

  if (!isPaddleReady()) {
    const error: CheckoutError = {
      type: 'not_ready',
      message: 'Paddle SDK is not ready. Ensure initPaddle() has been called and completed.',
      details: { paddleReady, hasPaddle: typeof window !== 'undefined' && !!window.Paddle },
    };
    console.error('[Paddle Debug] Checkout failed:', error);
    return { success: false, error };
  }

  const validation = validatePriceId(priceId, 'openCheckout');
  if (!validation.valid) {
    const error: CheckoutError = {
      type: 'validation',
      message: validation.error || 'Invalid price_id',
      details: { priceId },
    };
    console.error('[Paddle Debug] Checkout failed:', error);
    return { success: false, error };
  }

  try {
    const items = [{ price_id: priceId, quantity: 1 }];
    const checkoutParams = {
      items,
      ...(customData && { custom_data: customData }),
    };

    console.log('[Paddle Debug] Calling Paddle.Checkout.open');
    window.Paddle.Checkout.open(checkoutParams);
    return { success: true };
  } catch (err) {
    const error: CheckoutError = {
      type: 'paddle',
      message: err instanceof Error ? err.message : 'Unknown Paddle error',
      details: err,
    };
    console.error('[Paddle Debug] Paddle.Checkout.open threw an error:', error);
    return { success: false, error };
  }
}
