import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import { authenticateResetRequest, customerForReset, loadOwnedReset } from '@/lib/reset-order-server';
import { resolveVipPurchase } from '@/lib/vip-purchase-server';
import { loadOwnedVipCheckout, markVipCheckoutPending, normalizeCheckoutPlatform, pricesMatch } from '@/lib/vip-offer-server';
import { VIP_CUSTOM_OFFER_KIND, VIP_PORTAL_OFFER_KIND } from '@/lib/vip-offers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { challengeData, cryptoDetails } = body;

    if (challengeData?.orderKind === 'account-reset') {
      if (!cryptoDetails) {
        return NextResponse.json({ error: 'Payment details are missing.' }, { status: 400 });
      }
      if (challengeData.termsAccepted !== true || challengeData.freshStartAccepted !== true) {
        return NextResponse.json({ error: 'Accept the fresh start and the terms before paying.' }, { status: 400 });
      }

      const authResult = await authenticateResetRequest(req);
      if (!authResult.ok) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
      }

      const owned = await loadOwnedReset(authResult.uid, String(challengeData.accountId || ''));
      if (!owned.ok) return NextResponse.json({ error: owned.error }, { status: owned.status });

      const customerResult = customerForReset(
        challengeData.formData,
        authResult.email,
        challengeData.price,
        owned.reset.quote
      );
      if (!customerResult.ok) {
        return NextResponse.json({ error: customerResult.error }, { status: customerResult.status });
      }

      const { quote } = owned.reset;
      cryptoDetails = { ...cryptoDetails, usdAmount: quote.price };
      challengeData = {
        ...challengeData,
        type: quote.challengeType,
        amount: quote.amountLabel,
        platform: quote.platform,
        price: quote.price,
        originalPrice: quote.originalPrice,
        discountPercent: quote.discountPercent,
        addOns: [],
        userId: authResult.uid,
        accountId: owned.reset.accountId,
        accountType: quote.accountType,
        accountSize: quote.accountSize,
        resetCategory: quote.category,
        orderKind: 'account-reset',
        activationMode: 'reset',
        formData: customerResult.customer,
      };
    }

    if (challengeData?.orderKind === 'vip-allocation') {
      if (!cryptoDetails) {
        return NextResponse.json({ error: 'Payment details are missing.' }, { status: 400 });
      }
      const authResult = await authenticateResetRequest(req);
      if (!authResult.ok) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
      }
      const priced = await resolveVipPurchase({
        level: challengeData.amount,
        platform: challengeData.platform,
        discountCode: challengeData.discount?.code,
        expectedAmount: challengeData.price,
      });
      if (!priced.ok) {
        return NextResponse.json({ error: priced.error }, { status: priced.status });
      }
      cryptoDetails = { ...cryptoDetails, usdAmount: priced.price };
      challengeData = {
        ...challengeData,
        type: 'VIP Activation',
        amount: priced.option.level,
        platform: priced.platform,
        price: priced.price,
        originalPrice: priced.originalPrice,
        userId: authResult.uid,
        addOns: [],
        discount: priced.discount,
        orderKind: 'vip-allocation',
        formData: {
          ...challengeData.formData,
          email: authResult.email,
        },
      };
    }

    if (challengeData?.orderKind === VIP_PORTAL_OFFER_KIND || challengeData?.orderKind === VIP_CUSTOM_OFFER_KIND) {
      if (!cryptoDetails) {
        return NextResponse.json({ error: 'Payment details are missing.' }, { status: 400 });
      }
      const authResult = await authenticateResetRequest(req);
      if (!authResult.ok) {
        return NextResponse.json({ error: authResult.error }, { status: authResult.status });
      }
      const owned = await loadOwnedVipCheckout(authResult.uid, challengeData.orderKind, challengeData.offerId);
      if (!owned.ok) return NextResponse.json({ error: owned.error }, { status: owned.status });
      if (!pricesMatch(challengeData.price, owned.checkout.price)) {
        return NextResponse.json({ error: 'This offer price has changed. Close the window and try again.' }, { status: 409 });
      }
      const platform = normalizeCheckoutPlatform(challengeData.platform);
      if (!platform) return NextResponse.json({ error: 'Choose MT4 or MT5.' }, { status: 400 });
      const form = challengeData.formData || {};
      if (!String(form.firstName || '').trim() || !String(form.lastName || '').trim() || !String(form.phone || '').trim() || !String(form.country || '').trim()) {
        return NextResponse.json({ error: 'First name, last name, phone, and country are required.' }, { status: 400 });
      }
      cryptoDetails = { ...cryptoDetails, usdAmount: owned.checkout.price };
      challengeData = {
        ...challengeData,
        type: owned.checkout.title,
        amount: owned.checkout.amountLabel,
        platform,
        price: owned.checkout.price,
        originalPrice: owned.checkout.price,
        addOns: [],
        userId: authResult.uid,
        offerId: owned.checkout.offerId,
        orderKind: owned.checkout.kind,
        formData: {
          ...form,
          firstName: String(form.firstName).trim(),
          lastName: String(form.lastName).trim(),
          phone: String(form.phone).trim(),
          country: String(form.country).trim(),
          email: authResult.email,
        },
      };
    }

    // Create crypto order in Firebase
    const orderData: any = {
      status: 'PENDING',
      cryptoType: cryptoDetails.type,
      cryptoAmount: cryptoDetails.amount.toString(),
      cryptoAddress: cryptoDetails.address,
      usdAmount: cryptoDetails.usdAmount,
      verificationPhrase: cryptoDetails.verificationPhrase,
      challengeType: challengeData.type,
      challengeAmount: challengeData.amount,
      platform: challengeData.platform,
      addOns: challengeData.addOns || [],
      customerEmail: challengeData.formData.email,
      customerName: `${challengeData.formData.firstName} ${challengeData.formData.lastName}`,
      customerPhone: challengeData.formData.phone,
      customerCountry: challengeData.formData.country,
      customerDiscordUsername: challengeData.formData.discordUsername || null,
      userId: challengeData.userId || null,
      activationMode: challengeData.activationMode || null,
      discountCode: challengeData.discount?.code || null,
      discountId: challengeData.discount?.id || null,
      originalAmount: typeof challengeData.originalPrice === 'number'
        ? challengeData.originalPrice
        : (challengeData.discount ? Math.round(challengeData.price / (1 - challengeData.discount.value / 100)) : challengeData.price),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // If this is a fund trader application, include the application data
    if (challengeData.applicationData) {
      orderData.applicationData = challengeData.applicationData;
      orderData.applicationType = 'fund-trader';
    }

    if (challengeData.orderKind === 'account-reset') {
      orderData.orderKind = 'account-reset';
      orderData.resetCategory = challengeData.resetCategory;
      orderData.accountId = challengeData.accountId;
      orderData.sourceAccountType = challengeData.accountType;
      orderData.accountSize = challengeData.accountSize;
      orderData.discountPercent = challengeData.discountPercent;
    }

    if (challengeData.orderKind === VIP_PORTAL_OFFER_KIND || challengeData.orderKind === VIP_CUSTOM_OFFER_KIND) {
      orderData.orderKind = challengeData.orderKind;
      orderData.offerId = challengeData.offerId;
    }

    const orderRef = await db.collection('crypto-orders').add(orderData);

    if (challengeData.orderKind === VIP_PORTAL_OFFER_KIND || challengeData.orderKind === VIP_CUSTOM_OFFER_KIND) {
      try {
        await markVipCheckoutPending({
          kind: challengeData.orderKind,
          offerId: challengeData.offerId,
          userId: challengeData.userId,
          price: challengeData.price,
          amountLabel: challengeData.amount,
          title: challengeData.type,
          tierName: '',
        }, orderRef.id);
      } catch (markError) {
        console.error('Error marking VIP offer payment pending:', markError);
      }
    }

    return NextResponse.json({ success: true, orderId: orderRef.id });
  } catch (error) {
    console.error('Error submitting crypto order:', error);
    return NextResponse.json(
      { error: 'Failed to submit order' },
      { status: 500 }
    );
  }
} 