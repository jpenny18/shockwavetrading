export const FUNDED_CHECKOUT_KEY = 'sw-funded-checkout';

export interface FundedCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  platform: string;
  discordUsername: string;
}

export interface FundedCheckoutDraft {
  source: 'gauntlet-activation' | 'activate-funded';
  level: string;
  mode: 'activate' | 'reset';
  price: number;
  originalPrice: number;
  whopCheckoutUrl?: string;
  formData: FundedCustomer;
}

export function emptyFundedCustomer(): FundedCustomer {
  return {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    platform: 'MT5',
    discordUsername: '',
  };
}

export function saveFundedCheckout(draft: FundedCheckoutDraft) {
  sessionStorage.setItem(FUNDED_CHECKOUT_KEY, JSON.stringify(draft));
}

export function readFundedCheckout(source: FundedCheckoutDraft['source']): FundedCheckoutDraft | null {
  try {
    const raw = sessionStorage.getItem(FUNDED_CHECKOUT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw) as FundedCheckoutDraft;
    if (!draft || draft.source !== source || !draft.formData?.email || !draft.level) return null;
    return draft;
  } catch {
    return null;
  }
}
