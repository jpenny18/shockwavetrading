import { VIP_CHECKOUT, VIP_OPTIONS, VIP_PLATFORMS, type VipOption } from '@/app/vip/config';

export type VipDiscount = {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
};

export function roundVipDollars(amount: number): number {
  return Math.round(amount * 100) / 100;
}

export function vipOptionByLevel(level: string): VipOption | undefined {
  return VIP_OPTIONS.find((option) => option.level === level);
}

export function priceAfterChallengeDiscount(originalPrice: number, discount: VipDiscount | null): number {
  if (!discount) return roundVipDollars(originalPrice);
  if (discount.type === 'percentage') {
    return roundVipDollars(originalPrice * (1 - discount.value / 100));
  }
  return roundVipDollars(Math.max(0, originalPrice - discount.value));
}

export function vipPurchaseFromInput(input: {
  level: unknown;
  platform: unknown;
  discount: VipDiscount | null;
  expectedAmount?: unknown;
}): { ok: true; option: VipOption; platform: 'MT4' | 'MT5'; price: number; originalPrice: number; discount: VipDiscount | null } | { ok: false; error: string; status: number } {
  const option = vipOptionByLevel(String(input.level || ''));
  if (!option) return { ok: false, error: 'Choose a VIP allocation.', status: 400 };

  const platform = String(input.platform || '').trim().toUpperCase();
  if (platform !== 'MT4' && platform !== 'MT5') {
    return { ok: false, error: 'Choose MT4 or MT5.', status: 400 };
  }

  const price = priceAfterChallengeDiscount(option.price, input.discount);
  if (input.expectedAmount != null && input.expectedAmount !== '') {
    const expectedCents = Math.round(Number(input.expectedAmount) * 100);
    if (!Number.isFinite(expectedCents) || expectedCents !== Math.round(price * 100)) {
      return { ok: false, error: 'This VIP price has changed. Close the window and try again.', status: 409 };
    }
  }

  return {
    ok: true,
    option,
    platform,
    price,
    originalPrice: option.price,
    discount: input.discount,
  };
}

export const VIP_PURCHASE_TYPE = VIP_CHECKOUT.challengeType;
export const VIP_PURCHASE_PLATFORMS = VIP_PLATFORMS;
