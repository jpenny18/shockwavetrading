import type { ActivationSize } from './ActivationSteps';

const RESET_DISCOUNT = 0.12;
const BLACK_FRIDAY_DISCOUNT = 0.5;

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

export const GAUNTLET_ACTIVATION_SIZES: ActivationSize[] = [
  { level: '$10k', price: 199, whopCheckoutUrl: 'https://whop.com/checkout/plan_gYWVAVyu65Zwa' },
  { level: '$25k', price: 349, whopCheckoutUrl: 'https://whop.com/checkout/plan_4JiIRmkyRqjq8' },
  { level: '$50k', price: 599, whopCheckoutUrl: 'https://whop.com/checkout/plan_9t46Mcti2Gl1G' },
  { level: '$100k', price: 999, whopCheckoutUrl: 'https://whop.com/checkout/plan_mYd9abFhGM9Mg' },
  { level: '$200k', price: 1899, whopCheckoutUrl: 'https://whop.com/checkout/plan_ArcXmNChT9aLe' },
  { level: '$500k', price: 4499 },
];

export const ACTIVATE_FUNDED_SIZES: ActivationSize[] = [
  { level: '$10k', price: 349, whopCheckoutUrl: 'https://whop.com/checkout/plan_gYWVAVyu65Zwa' },
  { level: '$25k', price: 699, whopCheckoutUrl: 'https://whop.com/checkout/plan_4JiIRmkyRqjq8' },
  { level: '$50k', price: 1299, whopCheckoutUrl: 'https://whop.com/checkout/plan_9t46Mcti2Gl1G' },
  { level: '$100k', price: 2499, whopCheckoutUrl: 'https://whop.com/checkout/plan_mYd9abFhGM9Mg' },
  { level: '$200k', price: 4999, whopCheckoutUrl: 'https://whop.com/checkout/plan_ArcXmNChT9aLe' },
  { level: '$500k', price: 11999 },
];

export function gauntletActivationPrice(size: ActivationSize, mode: 'activate' | 'reset') {
  if (mode === 'reset') return roundMoney(size.price * (1 - RESET_DISCOUNT));
  return size.price;
}

export function activateFundedPrice(size: ActivationSize, mode: 'activate' | 'reset') {
  const discount = mode === 'reset' ? RESET_DISCOUNT : BLACK_FRIDAY_DISCOUNT;
  return roundMoney(size.price * (1 - discount));
}
