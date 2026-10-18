import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createOrder } from '../../lib/firebase';
import { generateBitcoinPaymentInfo, BitcoinPaymentInfo } from '../../lib/bitcoin';
import { Copy, Check, RefreshCw } from 'lucide-react';

interface BitcoinPaymentProps {
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
  discountPercentage?: number;
}

const BitcoinPayment: React.FC<BitcoinPaymentProps> = ({
  challengeData,
  successRedirectPath,
  onProcessingStateChange,
  discountPercentage = 10, // Default 10% discount
}) => {
  const router = useRouter();
  const [bitcoinInfo, setBitcoinInfo] = useState<BitcoinPaymentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  // Calculate discounted price
  const discountedPrice = Math.round(challengeData.price * (1 - discountPercentage / 100));

  useEffect(() => {
    generateBitcoinPaymentDetails();
  }, []);

  const generateBitcoinPaymentDetails = async () => {
    try {
      setIsLoading(true);
      onProcessingStateChange?.(true);

      // Create a new order in Firebase first to get an order ID
      const newOrderId = await createOrder({
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
        totalAmount: discountedPrice,
        paymentMethod: 'crypto',
        paymentStatus: 'pending',
      });

      setOrderId(newOrderId);

      // Generate Bitcoin payment information
      const btcInfo = await generateBitcoinPaymentInfo(discountedPrice, newOrderId);
      setBitcoinInfo(btcInfo);
    } catch (error) {
      console.error('Error generating Bitcoin payment details:', error);
      setError('Failed to generate Bitcoin payment details. Please try again.');
    } finally {
      setIsLoading(false);
      onProcessingStateChange?.(false);
    }
  };

  const handleCopyAddress = () => {
    if (bitcoinInfo?.bitcoinAddress) {
      navigator.clipboard.writeText(bitcoinInfo.bitcoinAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleManualConfirmation = () => {
    // In a real application, you would verify the payment on the blockchain
    // For this demo, we'll just simulate a successful payment
    
    // Store success data in session storage for the success page
    sessionStorage.setItem('paymentSuccess', JSON.stringify({
      orderId: orderId || 'unknown',
      amount: discountedPrice,
      challengeType: challengeData.type,
      paymentMethod: 'crypto',
    }));
    
    // Redirect to success page
    router.push(successRedirectPath);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-4">
        <div className="animate-spin w-10 h-10 border-2 border-[#0FF1CE] border-t-transparent rounded-full"></div>
        <p className="text-white/80">Generating Bitcoin payment details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-4">
        <div className="text-red-500 text-center">{error}</div>
        <button 
          onClick={generateBitcoinPaymentDetails}
          className="flex items-center space-x-2 px-4 py-2 bg-[#0FF1CE]/10 hover:bg-[#0FF1CE]/20 rounded-lg border border-[#0FF1CE]/30 text-white transition duration-200"
        >
          <RefreshCw size={16} />
          <span>Try Again</span>
        </button>
      </div>
    );
  }

  if (!bitcoinInfo) {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-4">
        <div className="text-white/80 text-center">No payment information available. Please try again.</div>
        <button 
          onClick={generateBitcoinPaymentDetails}
          className="flex items-center space-x-2 px-4 py-2 bg-[#0FF1CE]/10 hover:bg-[#0FF1CE]/20 rounded-lg border border-[#0FF1CE]/30 text-white transition duration-200"
        >
          <RefreshCw size={16} />
          <span>Generate Payment Details</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex flex-col items-center text-center">
        <h3 className="text-lg font-medium mb-2 text-white">Bitcoin Payment</h3>
        <p className="text-white/70 text-sm mb-4">
          Send exactly <span className="text-[#0FF1CE] font-mono">{bitcoinInfo.formattedBTCAmount} BTC</span> to the address below
        </p>
        
        {/* QR Code */}
        <div className="bg-white p-4 rounded-lg mb-6 relative overflow-hidden">
          <Image 
            src={bitcoinInfo.qrCodeUrl} 
            alt="Bitcoin QR Code" 
            width={200} 
            height={200} 
            unoptimized
          />
          <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition duration-200"></div>
        </div>
        
        {/* Bitcoin Address */}
        <div className="w-full mb-6">
          <div className="flex items-center justify-between p-3 bg-[#0FF1CE]/5 border border-[#0FF1CE]/20 rounded-lg">
            <div className="text-white/80 font-mono text-xs overflow-hidden text-ellipsis">
              {bitcoinInfo.bitcoinAddress}
            </div>
            <button 
              onClick={handleCopyAddress}
              className="ml-2 p-2 rounded-full hover:bg-white/10 transition duration-200"
              aria-label="Copy Bitcoin address"
            >
              {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-white/70" />}
            </button>
          </div>
        </div>
        
        {/* Payment Details */}
        <div className="w-full mb-6 grid grid-cols-2 gap-4 text-sm">
          <div className="text-white/70 text-left">Amount (USD):</div>
          <div className="text-white text-right">${discountedPrice}.00</div>
          
          <div className="text-white/70 text-left">Amount (BTC):</div>
          <div className="text-white font-mono text-right">{bitcoinInfo.formattedBTCAmount}</div>
          
          <div className="text-white/70 text-left">BTC Price:</div>
          <div className="text-white text-right">${bitcoinInfo.btcPrice.toLocaleString()}</div>
          
          <div className="text-white/70 text-left">Discount Applied:</div>
          <div className="text-green-400 text-right">{discountPercentage}%</div>
        </div>
        
        {/* Instructions */}
        <div className="text-white/70 text-sm mb-6">
          <p className="mb-2">After sending the payment, it may take a few minutes for the transaction to be confirmed.</p>
          <p>In case of any issues, please contact our support with Order ID: <span className="font-mono text-white">{orderId}</span></p>
        </div>
        
        {/* Manual Confirmation Button (for testing purposes) */}
        <div className="flex justify-center">
          <button
            onClick={handleManualConfirmation}
            className="px-6 py-3 bg-[#0FF1CE]/10 hover:bg-[#0FF1CE]/20 rounded-lg border border-[#0FF1CE]/30 text-white transition duration-200"
          >
            I've Sent the Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default BitcoinPayment; 