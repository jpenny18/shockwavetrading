import type { VipCustomOfferRecord } from '@/lib/vip-offers';

export type PortalVipOffer = VipCustomOfferRecord & { id: string };

export async function fetchMyVipOffers(token: string): Promise<PortalVipOffer[]> {
  const response = await fetch('/api/vip-offers', {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store'
  });
  if (!response.ok) throw new Error('Could not load VIP offers');
  const data = await response.json();
  return Array.isArray(data.offers) ? data.offers : [];
}

export async function acceptMyVipOffer(token: string, offerId: string): Promise<void> {
  const response = await fetch('/api/vip-offers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ offerId, accepted: true })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Could not save the offer terms');
  }
}
