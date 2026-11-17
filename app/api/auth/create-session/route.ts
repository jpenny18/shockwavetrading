import { NextRequest, NextResponse } from 'next/server';
import { auth, createSessionCookie } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token is required' },
        { status: 400 }
      );
    }

    // Verify the ID token and check admin status
    const decodedToken = await auth.verifyIdToken(idToken);
    if (!decodedToken.admin) {
      return NextResponse.json(
        { error: 'Access denied. You do not have admin privileges.' },
        { status: 403 }
      );
    }

    // Firebase wants milliseconds. The browser cookie maxAge is seconds.
    const expiresIn = 60 * 60 * 24 * 5 * 1000; // 5 days
    const sessionCookie = await createSessionCookie(idToken, expiresIn);

    const response = NextResponse.json({ success: true });
    response.cookies.set('session', sessionCookie, {
      maxAge: Math.floor(expiresIn / 1000),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Error creating session:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create session' },
      { status: 401 }
    );
  }
} 