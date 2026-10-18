import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { challengeData, cryptoDetails } = body;

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
      originalAmount: challengeData.discount ? Math.round(challengeData.price / (1 - challengeData.discount.value / 100)) : challengeData.price,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // If this is a fund trader application, include the application data
    if (challengeData.applicationData) {
      orderData.applicationData = challengeData.applicationData;
      orderData.applicationType = 'fund-trader';
    }

    const orderRef = await db.collection('crypto-orders').add(orderData);

    return NextResponse.json({ success: true, orderId: orderRef.id });
  } catch (error) {
    console.error('Error submitting crypto order:', error);
    return NextResponse.json(
      { error: 'Failed to submit order' },
      { status: 500 }
    );
  }
} 