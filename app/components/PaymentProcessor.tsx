import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createOrder } from '../../lib/firebase';
import Image from 'next/image';

interface CardFields {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
}

interface FormErrors {
  number?: string;
  expiry?: string;
  cvc?: string;
  name?: string;
}

interface PaymentProcessorProps {
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
  cardFieldsState?: [
    CardFields,
    React.Dispatch<React.SetStateAction<CardFields>>
  ];
  formErrorsState?: [
    FormErrors,
    React.Dispatch<React.SetStateAction<FormErrors>>
  ];
  onCardInputChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onProcessPayment?: () => void;
  children: (props: {
    cardFields: CardFields;
    formErrors: FormErrors;
    isProcessing: boolean;
    paymentError: string | null;
    processPayment: () => Promise<void>;
    handleCardInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => React.ReactNode;
}

// Create a hook version to handle the payment logic
export const usePaymentProcessor = (
  challengeData: PaymentProcessorProps['challengeData'],
  successRedirectPath: string,
  onProcessingStateChange?: (isProcessing: boolean) => void,
  cardFieldsState?: [CardFields, React.Dispatch<React.SetStateAction<CardFields>>],
  formErrorsState?: [FormErrors, React.Dispatch<React.SetStateAction<FormErrors>>]
) => {
  const router = useRouter();
  const [localCardFields, setLocalCardFields] = useState<CardFields>({
    number: '',
    expiry: '',
    cvc: '',
    name: '',
  });
  const [localFormErrors, setLocalFormErrors] = useState<FormErrors>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // Use provided state or local state
  const [cardFields, setCardFields] = cardFieldsState || [
    localCardFields,
    setLocalCardFields,
  ];
  const [formErrors, setFormErrors] = formErrorsState || [
    localFormErrors,
    setLocalFormErrors,
  ];

  useEffect(() => {
    if (!challengeData) return;

    // Create payment intent when component mounts
    const createPaymentIntentForChallenge = async () => {
      try {
        const response = await fetch('/api/create-payment-intent', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: challengeData.price,
            email: challengeData.formData.email,
            metadata: {
              challengeType: challengeData.type,
              challengeAmount: challengeData.amount,
              platform: challengeData.platform,
              customerName: `${challengeData.formData.firstName} ${challengeData.formData.lastName}`,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create payment intent');
        }

        const data = await response.json();
        setPaymentIntent(data.paymentIntentId);
        setClientSecret(data.clientSecret);
      } catch (error) {
        console.error('Error creating payment intent:', error);
        setPaymentError('Failed to initialize payment. Please try again later.');
      }
    };

    createPaymentIntentForChallenge();
  }, [challengeData]);

  const formatCardNumber = (value: string) => {
    const cleanValue = value.replace(/\s/g, '');
    const formatted = cleanValue.replace(/(\d{4})/g, '$1 ').trim();
    return formatted.substring(0, 19); // 16 digits + 3 spaces
  };

  const formatExpiry = (value: string) => {
    const cleanValue = value.replace(/\D/g, '');
    if (cleanValue.length >= 3) {
      return `${cleanValue.slice(0, 2)}/${cleanValue.slice(2, 4)}`;
    }
    return cleanValue;
  };

  const handleCardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let formattedValue = value;

    if (name === 'number') {
      formattedValue = formatCardNumber(value);
    } else if (name === 'expiry') {
      formattedValue = formatExpiry(value);
    } else if (name === 'cvc') {
      formattedValue = value.replace(/\D/g, '').substring(0, 4);
    }

    setCardFields(prev => ({ ...prev, [name]: formattedValue }));
  };

  const validateCardDetails = (): boolean => {
    const errors: FormErrors = {};

    if (!cardFields.number) {
      errors.number = 'Card number is required';
    } else if (!/^\d{4}\s\d{4}\s\d{4}\s\d{4}$/.test(cardFields.number)) {
      errors.number = 'Please enter a valid 16-digit card number';
    }

    if (!cardFields.expiry) {
      errors.expiry = 'Expiry date is required';
    } else if (!/^\d{2}\/\d{2}$/.test(cardFields.expiry)) {
      errors.expiry = 'Please enter a valid expiry date (MM/YY)';
    } else {
      // Check if expiry date is valid
      const [month, year] = cardFields.expiry.split('/');
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      
      const expMonth = parseInt(month, 10);
      const expYear = parseInt(year, 10);
      
      if (expMonth < 1 || expMonth > 12) {
        errors.expiry = 'Invalid month';
      } else if (
        expYear < currentYear || 
        (expYear === currentYear && expMonth < currentMonth)
      ) {
        errors.expiry = 'Card has expired';
      }
    }

    if (!cardFields.cvc) {
      errors.cvc = 'CVC is required';
    } else if (!/^\d{3,4}$/.test(cardFields.cvc)) {
      errors.cvc = 'CVC must be 3 or 4 digits';
    }

    if (!cardFields.name) {
      errors.name = 'Cardholder name is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const processPayment = async () => {
    if (!validateCardDetails() || !clientSecret) {
      return;
    }

    setIsProcessing(true);
    onProcessingStateChange?.(true);

    try {
      // Load the Stripe.js script dynamically
      const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY || '';
      const stripe = await loadStripe(stripePublishableKey);
      
      if (!stripe) {
        throw new Error('Failed to load Stripe');
      }

      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: {
            number: cardFields.number.replace(/\s/g, ''),
            exp_month: parseInt(cardFields.expiry.split('/')[0], 10),
            exp_year: parseInt(`20${cardFields.expiry.split('/')[1]}`, 10),
            cvc: cardFields.cvc,
          },
          billing_details: {
            name: cardFields.name,
            email: challengeData.formData.email,
            phone: challengeData.formData.phone,
            address: {
              country: challengeData.formData.country,
            },
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Store order in Firebase
        await createOrder({
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

        // Store payment success data for the success page
        sessionStorage.setItem('paymentSuccess', JSON.stringify({
          orderId: paymentIntent.id,
          amount: challengeData.price,
          challengeType: challengeData.type,
          paymentMethod: 'card',
        }));

        // Redirect to success page
        router.push(successRedirectPath);
      } else {
        throw new Error('Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError(error instanceof Error ? error.message : 'Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
      onProcessingStateChange?.(false);
    }
  };

  // Helper function to load Stripe.js
  const loadStripe = async (publishableKey: string) => {
    if (typeof window === 'undefined') return null;
    
    const stripe = await (window as any).Stripe?.(publishableKey);
    return stripe;
  };

  // Ensure the Stripe.js script is loaded
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    if (!(window as any).Stripe) {
      const script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return {
    cardFields,
    formErrors,
    isProcessing,
    paymentError,
    processPayment,
    handleCardInputChange,
  };
};

// Render prop component that uses the hook
const PaymentProcessor: React.FC<PaymentProcessorProps> = ({
  challengeData,
  successRedirectPath,
  onProcessingStateChange,
  cardFieldsState,
  formErrorsState,
  children,
}) => {
  const paymentProcessor = usePaymentProcessor(
    challengeData,
    successRedirectPath,
    onProcessingStateChange,
    cardFieldsState,
    formErrorsState
  );

  return <>{children(paymentProcessor)}</>;
};

export default PaymentProcessor; 