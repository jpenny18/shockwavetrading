'use client';

import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { Check } from 'lucide-react';
import { createOrder } from '../../lib/firebase';
import { useRouter } from 'next/navigation';

// Initialize Stripe with publishable key
const stripePromise = loadStripe(
  process.env.NODE_ENV === 'production'
    ? process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''
    : process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY || ''
);

interface FormErrors {
  cardNumber?: string;
  cardExpiry?: string;
  cardCvc?: string;
  name?: string;
  general?: string;
}

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#ffffff',
      fontFamily: '"Inter", sans-serif',
      fontSize: '16px',
      '::placeholder': {
        color: 'rgba(255, 255, 255, 0.3)',
      },
    },
    invalid: {
      color: '#ff5e5e',
      iconColor: '#ff5e5e',
    },
  },
};

interface CardFormProps {
  clientSecret: string;
  challengeData: {
    type: string;
    amount: string;
    platform: string;
    formData: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      country: string;
      discordUsername?: string;
    };
    price: number;
    userId?: string | null;
  };
  successRedirectPath: string;
  onProcessingStateChange?: (isProcessing: boolean) => void;
}

const CardForm: React.FC<CardFormProps> = ({
  clientSecret,
  challengeData,
  successRedirectPath,
  onProcessingStateChange,
}) => {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [cardholderName, setCardholderName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [is3DSecure, setIs3DSecure] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // Function to send order emails
  const sendOrderEmails = async (orderData: any) => {
    try {
      console.log('Sending order emails via API...');
      const response = await fetch('/api/send-order-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      
      const result = await response.json();
      console.log('Email sending result:', result);
      return result;
    } catch (error) {
      console.error('Error sending order emails:', error);
      return { success: false, error };
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js has not loaded yet. Wait for it to load before proceeding.
      return;
    }

    // Validate cardholder name
    if (!cardholderName.trim()) {
      setFormErrors(prev => ({ ...prev, name: 'Cardholder name is required' }));
      return;
    }

    setIsProcessing(true);
    setIs3DSecure(false);
    onProcessingStateChange?.(true);

    try {
      const cardElement = elements.getElement(CardNumberElement);
      
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Start the payment process
      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: cardholderName,
            email: challengeData.formData.email,
            phone: challengeData.formData.phone,
            address: {
              country: challengeData.formData.country,
            },
          },
        },
      });

      if (result.error) {
        if (result.error.type === 'card_error' || result.error.type === 'validation_error') {
        setFormErrors(prev => ({ ...prev, general: result.error.message }));
        } else {
          setFormErrors(prev => ({ ...prev, general: 'An unexpected error occurred. Please try again.' }));
        }
      } else {
        // Handle 3D Secure authentication if required
        if (result.paymentIntent.status === 'requires_action') {
          setIs3DSecure(true);
          
          // Handle 3D Secure authentication
          const { error: threeDSecureError } = await stripe.handleCardAction(result.paymentIntent.client_secret || '');
          
          if (threeDSecureError) {
            setFormErrors(prev => ({ ...prev, general: threeDSecureError.message }));
            return;
          }
          
          // Confirm the payment after 3D Secure authentication
          const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret);
          
          if (confirmError) {
            setFormErrors(prev => ({ ...prev, general: confirmError.message }));
            return;
          }
          
          if (paymentIntent.status === 'succeeded') {
            await handlePaymentSuccess(paymentIntent);
          }
        } else if (result.paymentIntent.status === 'succeeded') {
          await handlePaymentSuccess(result.paymentIntent);
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      setFormErrors(prev => ({ ...prev, general: 'An unexpected error occurred. Please try again.' }));
    } finally {
      setIsProcessing(false);
      setIs3DSecure(false);
      onProcessingStateChange?.(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntent: any) => {
    console.log('Payment succeeded, creating order...');
    
    try {
      // Create order in Firebase
      const orderId = await createOrder({
        userId: challengeData.userId || null,
          customerEmail: challengeData.formData.email,
          firstName: challengeData.formData.firstName,
          lastName: challengeData.formData.lastName,
          phone: challengeData.formData.phone,
          country: challengeData.formData.country,
          discordUsername: challengeData.formData.discordUsername,
          challengeType: challengeData.type,
          challengeAmount: challengeData.amount,
          platform: challengeData.platform,
          totalAmount: challengeData.price,
          paymentMethod: 'card',
          paymentStatus: 'completed',
        paymentIntentId: paymentIntent.id,
      });
      
      console.log('Order created with ID:', orderId);

      // Prepare order data for email notifications
      const orderData = {
        id: orderId,
        customerEmail: challengeData.formData.email,
        firstName: challengeData.formData.firstName,
        lastName: challengeData.formData.lastName,
        phone: challengeData.formData.phone,
        country: challengeData.formData.country,
        discordUsername: challengeData.formData.discordUsername,
        challengeType: challengeData.type,
        challengeAmount: challengeData.amount,
        platform: challengeData.platform,
        totalAmount: challengeData.price,
        paymentMethod: 'card' as const,
        paymentStatus: 'completed' as const,
        paymentIntentId: paymentIntent.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Send email notifications
      try {
        await sendOrderEmails(orderData);
      } catch (emailError) {
        console.error('Error sending email notifications:', emailError);
      }

      // Store payment success data
        sessionStorage.setItem('paymentSuccess', JSON.stringify({
        orderId: paymentIntent.id,
          amount: challengeData.price,
          challengeType: challengeData.type,
          paymentMethod: 'card',
        }));
        
      // Clear payment intent data
        const paymentIntentKey = `payment_intent_${challengeData.type}_${challengeData.amount}_${challengeData.price}_${challengeData.formData.email}`;
        sessionStorage.removeItem(`${paymentIntentKey}_client_secret`);
        sessionStorage.removeItem(`${paymentIntentKey}_payment_intent_id`);

      // Redirect to success page
        router.push(successRedirectPath);
    } catch (error) {
      console.error('Error handling payment success:', error);
      setFormErrors(prev => ({ ...prev, general: 'Payment successful but there was an error processing your order. Please contact support.' }));
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCardholderName(event.target.value);
    // Clear name error when user types
    if (formErrors.name) {
      setFormErrors(prev => ({ ...prev, name: undefined }));
    }
  };

  const handleStripeElementChange = (event: any) => {
    // Clear related error when user interacts with Stripe element
    if (event.elementType === 'cardNumber' && formErrors.cardNumber) {
      setFormErrors(prev => ({ ...prev, cardNumber: undefined }));
    } else if (event.elementType === 'cardExpiry' && formErrors.cardExpiry) {
      setFormErrors(prev => ({ ...prev, cardExpiry: undefined }));
    } else if (event.elementType === 'cardCvc' && formErrors.cardCvc) {
      setFormErrors(prev => ({ ...prev, cardCvc: undefined }));
    }
    
    // Clear general error when any element changes
    if (formErrors.general) {
      setFormErrors(prev => ({ ...prev, general: undefined }));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Card Number */}
      <div className="mb-4">
        <label htmlFor="cardNumber" className="block text-sm font-medium text-white/70 mb-1">
          Card Number
        </label>
        <div className="bg-[#101010] border border-[#2F2F2F]/50 rounded-lg px-4 py-2">
          <CardNumberElement
            id="cardNumber"
            options={CARD_ELEMENT_OPTIONS}
            onChange={handleStripeElementChange}
          />
        </div>
        {formErrors.cardNumber && (
          <p className="text-red-500 text-xs mt-1">{formErrors.cardNumber}</p>
        )}
      </div>

      {/* Expiry and CVC */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label htmlFor="cardExpiry" className="block text-sm font-medium text-white/70 mb-1">
            Expiry Date
          </label>
          <div className="bg-[#101010] border border-[#2F2F2F]/50 rounded-lg px-4 py-2">
            <CardExpiryElement
              id="cardExpiry"
              options={CARD_ELEMENT_OPTIONS}
              onChange={handleStripeElementChange}
            />
          </div>
          {formErrors.cardExpiry && (
            <p className="text-red-500 text-xs mt-1">{formErrors.cardExpiry}</p>
          )}
        </div>
        <div>
          <label htmlFor="cardCvc" className="block text-sm font-medium text-white/70 mb-1">
            CVC
          </label>
          <div className="bg-[#101010] border border-[#2F2F2F]/50 rounded-lg px-4 py-2">
            <CardCvcElement
              id="cardCvc"
              options={CARD_ELEMENT_OPTIONS}
              onChange={handleStripeElementChange}
            />
          </div>
          {formErrors.cardCvc && (
            <p className="text-red-500 text-xs mt-1">{formErrors.cardCvc}</p>
          )}
        </div>
      </div>

      {/* Cardholder Name */}
      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-white/70 mb-1">
          Cardholder Name
        </label>
        <input
          type="text"
          id="name"
          value={cardholderName}
          onChange={handleInputChange}
          placeholder="John Doe"
          className={`w-full bg-[#101010] border ${formErrors.name ? 'border-red-500' : 'border-[#2F2F2F]/50'} rounded-lg px-4 py-2 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#0FF1CE]/50`}
        />
        {formErrors.name && (
          <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
        )}
      </div>

      {/* Secure Payment Note */}
      <div className="flex items-center mb-6 text-white/50 text-sm">
        <Check className="text-green-500 mr-2" size={16} />
        <span>Your payment information is secure and encrypted</span>
      </div>

      {/* 3D Secure Processing Overlay */}
      {is3DSecure && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-[#101010] p-6 rounded-lg text-center max-w-md mx-4">
            <div className="w-16 h-16 border-4 border-[#0FF1CE] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h3 className="text-xl font-semibold text-white mb-2">3D Secure Authentication</h3>
            <p className="text-gray-400">
              Please complete the authentication process in the secure window.
              Do not close this window until the process is complete.
            </p>
          </div>
        </div>
      )}

      {/* Display General Error */}
      {formErrors.general && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {formErrors.general}
        </div>
      )}

      {/* Pay Now Button */}
      <button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-[#0FF1CE] hover:bg-[#0FF1CE]/90 text-black font-semibold py-3 px-4 rounded-lg transition duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isProcessing ? (is3DSecure ? 'Authenticating...' : 'Processing...') : `Pay $${challengeData.price.toFixed(2)}`}
      </button>
    </form>
  );
};

interface StripeCardFormProps {
  clientSecret: string; // Now required prop
  challengeData: CardFormProps['challengeData'];
  successRedirectPath: string;
  onProcessingStateChange?: (isProcessing: boolean) => void;
}

// Simplified StripeCardForm without internal payment intent fetching
const StripeCardForm: React.FC<StripeCardFormProps> = ({
  clientSecret,
  challengeData,
  successRedirectPath,
  onProcessingStateChange,
}) => {
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <CardForm
        clientSecret={clientSecret}
        challengeData={challengeData}
        successRedirectPath={successRedirectPath}
        onProcessingStateChange={onProcessingStateChange}
      />
    </Elements>
  );
};

export default StripeCardForm; 