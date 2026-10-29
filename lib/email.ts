import { Resend } from 'resend';
import { OrderData } from './firebase';

// Initialize Resend with API key (only used in server components/API routes)
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Format currency as USD
 * @param amount Amount to format
 * @returns Formatted amount string
 */
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Send notification email to admin when a new order is placed
 * @param order Order details
 * @returns Email send result
 */
export async function sendAdminNotificationEmail(order: OrderData & { id?: string }) {
  try {
    console.log('Sending admin notification email for order:', order.id || 'unknown');
    
    const { data, error } = await resend.emails.send({
      from: 'support@shockwave-capital.com',
      to: 'support@shockwave-capital.com',
      subject: `New Order: ${order.challengeType} Challenge (${order.challengeAmount})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background-color: #0D0D0D; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
            <h1 style="color: #0FF1CE; margin: 0; font-size: 24px;">New Shockwave Capital Order</h1>
          </div>
          
          <div style="margin-bottom: 30px;">
            <p style="margin-bottom: 5px;"><strong>Order ID:</strong> ${order.id || 'N/A'}</p>
            <p style="margin-bottom: 5px;"><strong>Payment ID:</strong> ${order.transactionId || order.paymentIntentId || 'N/A'}</p>
            <p style="margin-bottom: 5px;"><strong>Date:</strong> ${order.createdAt.toDate().toLocaleString()}</p>
            <p style="margin-bottom: 5px;"><strong>Status:</strong> ${order.paymentStatus}</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h2 style="color: #0FF1CE; font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Customer Details</h2>
            <p style="margin-bottom: 5px;"><strong>Name:</strong> ${order.firstName} ${order.lastName}</p>
            <p style="margin-bottom: 5px;"><strong>Email:</strong> ${order.customerEmail}</p>
            <p style="margin-bottom: 5px;"><strong>Phone:</strong> ${order.phone}</p>
            <p style="margin-bottom: 5px;"><strong>Country:</strong> ${order.country}</p>
            ${order.discordUsername ? `<p style="margin-bottom: 5px;"><strong>Discord:</strong> ${order.discordUsername}</p>` : ''}
          </div>
          
          <div style="margin-bottom: 30px;">
            <h2 style="color: #0FF1CE; font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Order Details</h2>
            <p style="margin-bottom: 5px;"><strong>Challenge Type:</strong> ${order.challengeType}</p>
            <p style="margin-bottom: 5px;"><strong>Account Size:</strong> ${order.challengeAmount}</p>
            <p style="margin-bottom: 5px;"><strong>Platform:</strong> ${order.platform}</p>
            <p style="margin-bottom: 5px;"><strong>Payment Method:</strong> ${order.paymentMethod === 'card' ? 'Credit/Debit Card' : 'Cryptocurrency'}</p>
            <p style="margin-bottom: 5px;"><strong>Amount Paid:</strong> ${formatCurrency(order.totalAmount)}</p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; font-size: 12px; color: #666;">
            <p>This is an automated notification from Shockwave Capital.</p>
          </div>
        </div>
      `,
      text: `
        New Shockwave Capital Order
        
        Order ID: ${order.id || 'N/A'}
        Payment ID: ${order.transactionId || order.paymentIntentId || 'N/A'}
        Date: ${order.createdAt.toDate().toLocaleString()}
        Status: ${order.paymentStatus}
        
        Customer Details:
        Name: ${order.firstName} ${order.lastName}
        Email: ${order.customerEmail}
        Phone: ${order.phone}
        Country: ${order.country}
        ${order.discordUsername ? `Discord: ${order.discordUsername}` : ''}
        
        Order Details:
        Challenge Type: ${order.challengeType}
        Account Size: ${order.challengeAmount}
        Platform: ${order.platform}
        Payment Method: ${order.paymentMethod === 'card' ? 'Credit/Debit Card' : 'Cryptocurrency'}
        Amount Paid: ${formatCurrency(order.totalAmount)}
      `,
    });

    if (error) {
      console.error('Error sending admin notification email:', error);
      return { success: false, error };
    }

    console.log('Admin email sent successfully:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending admin notification email:', error);
    return { success: false, error };
  }
}

/**
 * Send receipt email to customer with order details and next steps
 * @param order Order details
 * @returns Email send result
 */
export async function sendCustomerReceiptEmail(order: OrderData & { id?: string }) {
  try {
    console.log('Sending customer receipt email to:', order.customerEmail);
    
    const { data, error } = await resend.emails.send({
      from: 'support@shockwave-capital.com',
      to: order.customerEmail,
      subject: `Your Shockwave Capital ${order.challengeType} Challenge Order`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background-color: #0D0D0D; padding: 20px; margin-bottom: 20px; border-radius: 5px; text-align: center;">
            <h1 style="color: #0FF1CE; margin: 0; font-size: 24px;">Thanks for your order!</h1>
          </div>
          
          <div style="margin-bottom: 30px;">
            <p>Hello ${order.firstName},</p>
            <p>Thank you for purchasing our ${order.challengeType} Challenge. We're excited to see how you perform!</p>
            <p>Your payment has been processed successfully, and we're preparing your trading account credentials now.</p>
          </div>
          
          <div style="margin-bottom: 30px; background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
            <h2 style="color: #333; font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Order Summary</h2>
            <p style="margin-bottom: 5px;"><strong>Order ID:</strong> ${order.id || 'N/A'}</p>
            <p style="margin-bottom: 5px;"><strong>Date:</strong> ${order.createdAt.toDate().toLocaleString()}</p>
            <p style="margin-bottom: 5px;"><strong>Challenge Type:</strong> ${order.challengeType}</p>
            <p style="margin-bottom: 5px;"><strong>Account Size:</strong> ${order.challengeAmount}</p>
            <p style="margin-bottom: 5px;"><strong>Platform:</strong> ${order.platform}</p>
            <p style="margin-bottom: 5px;"><strong>Amount Paid:</strong> ${formatCurrency(order.totalAmount)}</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h2 style="color: #0FF1CE; font-size: 18px; margin-bottom: 15px;">Next Steps</h2>
            
            <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
              <div style="background-color: #0FF1CE; color: #000; border-radius: 50%; width: 25px; height: 25px; display: flex; justify-content: center; align-items: center; margin-right: 10px; flex-shrink: 0;">1</div>
              <div>
                <h3 style="margin: 0 0 5px 0; color: #333;">Receive Your Login Credentials</h3>
                <p style="margin: 0; color: #666;">We'll send your login credentials to this email address within the next few hours. During busy periods, this may take up to 24 hours.</p>
              </div>
            </div>
            
            <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
              <div style="background-color: #0FF1CE; color: #000; border-radius: 50%; width: 25px; height: 25px; display: flex; justify-content: center; align-items: center; margin-right: 10px; flex-shrink: 0;">2</div>
              <div>
                <h3 style="margin: 0 0 5px 0; color: #333;">Log Into Your Trading Platform</h3>
                <p style="margin: 0; color: #666;">Download and install ${order.platform} if you haven't already, then log in using the credentials we'll provide.</p>
              </div>
            </div>
            
            <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
              <div style="background-color: #0FF1CE; color: #000; border-radius: 50%; width: 25px; height: 25px; display: flex; justify-content: center; align-items: center; margin-right: 10px; flex-shrink: 0;">3</div>
              <div>
                <h3 style="margin: 0 0 5px 0; color: #333;">Start Trading</h3>
                <p style="margin: 0; color: #666;">Begin trading with your new account. Remember to follow the challenge rules to maximize your chances of success!</p>
              </div>
            </div>
          </div>
          
          <div style="margin-bottom: 30px;">
            <p>If you have any questions or need assistance, please contact our support team at <a href="mailto:support@shockwave-capital.com" style="color: #0FF1CE;">support@shockwave-capital.com</a>.</p>
            <p style="margin-bottom: 0;">Best regards,</p>
            <p style="margin-top: 5px;"><strong>The Shockwave Capital Team</strong></p>
          </div>
          
          <div style="background-color: #0D0D0D; padding: 15px; border-radius: 5px; text-align: center; font-size: 12px; color: #999;">
            <p style="margin-bottom: 5px;">© ${new Date().getFullYear()} Shockwave Capital. All rights reserved.</p>
            <p style="margin: 0;">This is an automated email, please do not reply.</p>
          </div>
        </div>
      `,
      text: `
        Thanks for your order!
        
        Hello ${order.firstName},
        
        Thank you for purchasing our ${order.challengeType} Challenge. We're excited to see how you perform!
        Your payment has been processed successfully, and we're preparing your trading account credentials now.
        
        Order Summary:
        Order ID: ${order.id || 'N/A'}
        Date: ${order.createdAt.toDate().toLocaleString()}
        Challenge Type: ${order.challengeType}
        Account Size: ${order.challengeAmount}
        Platform: ${order.platform}
        Amount Paid: ${formatCurrency(order.totalAmount)}
        
        Next Steps:
        
        1. Receive Your Login Credentials
           We'll send your login credentials to this email address within the next few hours. 
           During busy periods, this may take up to 24 hours.
        
        2. Log Into Your Trading Platform
           Download and install ${order.platform} if you haven't already, then log in using the credentials we'll provide.
        
        3. Start Trading
           Begin trading with your new account. Remember to follow the challenge rules to maximize your chances of success!
        
        If you have any questions or need assistance, please contact our support team at support@shockwave-capital.com.
        
        Best regards,
        The Shockwave Capital Team
      `,
    });

    if (error) {
      console.error('Error sending customer receipt email:', error);
      return { success: false, error };
    }

    console.log('Customer receipt email sent successfully:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending customer receipt email:', error);
    return { success: false, error };
  }
}

/**
 * Send challenge email to customer
 */
export async function sendChallengeEmail(data: {
  type: string;
  amount: string;
  platform: string;
  email: string;
  name: string;
}) {
  try {
    const result = await resend.emails.send({
      from: 'support@shockwave-capital.com',
      to: data.email,
      subject: `Your Shockwave Capital ${data.type} Challenge`,
      html: `
        <p>Hello ${data.name},</p>
        <p>Your ${data.type} Challenge (${data.amount}) has been confirmed.</p>
        <p>We will send your ${data.platform} login credentials shortly.</p>
        <p>Best regards,<br>The Shockwave Capital Team</p>
      `
    });

    if ('error' in result && result.error) {
      console.error('Error sending challenge email:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending challenge email:', error);
    return { success: false, error };
  }
}

/**
 * Send notification email for crypto order
 * @param order Crypto order details
 * @returns Email send result
 */
export async function sendCryptoOrderEmail(order: {
  id: string;
  status: string;
  cryptoType: string;
  cryptoAmount: string;
  cryptoAddress: string;
  usdAmount: number;
  verificationPhrase: string;
  challengeType: string;
  challengeAmount: string;
  platform: string;
  addOns?: string[];
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  customerCountry: string;
  customerDiscordUsername?: string;
  createdAt: string;
  accountId?: string;
  orderKind?: string;
}) {
  try {
    console.log('Sending crypto order notification emails for:', order.id);
    const isReset = order.orderKind === 'account-reset';
    
    // Define add-on names mapping
    const addOnNames: { [key: string]: string } = {
      'no-min-days': 'No Min Trading Days',
      'profit-split-80': '80% Initial Profit Split',
      'leverage-500': '1:500 Leverage',
      'reward-150': '150% Reward'
    };
    
    // Send admin notification
    const adminResult = await resend.emails.send({
      from: 'support@shockwave-capital.com',
      to: 'support@shockwave-capital.com',
      subject: order.status === 'COMPLETED'
        ? (isReset
          ? `Crypto Payment Confirmed: ${order.challengeType} (${order.challengeAmount})`
          : `Crypto Payment Confirmed: ${order.challengeType} Challenge (${order.challengeAmount})`)
        : (isReset
          ? `New Crypto Order: ${order.challengeType} (${order.challengeAmount})`
          : `New Crypto Order: ${order.challengeType} Challenge (${order.challengeAmount})`),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background-color: #0D0D0D; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
            <h1 style="color: #0FF1CE; margin: 0; font-size: 24px;">
              ${order.status === 'COMPLETED' ? 'Crypto Payment Confirmed' : 'New Crypto Order Received'}
            </h1>
          </div>
          
          <div style="margin-bottom: 30px;">
            <p style="margin-bottom: 5px;"><strong>Order ID:</strong> ${order.id}</p>
            <p style="margin-bottom: 5px;"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
            <p style="margin-bottom: 5px;"><strong>Status:</strong> ${order.status}</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h2 style="color: #0FF1CE; font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Customer Details</h2>
            <p style="margin-bottom: 5px;"><strong>Name:</strong> ${order.customerName}</p>
            <p style="margin-bottom: 5px;"><strong>Email:</strong> ${order.customerEmail}</p>
            <p style="margin-bottom: 5px;"><strong>Phone:</strong> ${order.customerPhone}</p>
            <p style="margin-bottom: 5px;"><strong>Country:</strong> ${order.customerCountry}</p>
            ${order.customerDiscordUsername ? `<p style="margin-bottom: 5px;"><strong>Discord:</strong> ${order.customerDiscordUsername}</p>` : ''}
          </div>
          
          <div style="margin-bottom: 30px;">
            <h2 style="color: #0FF1CE; font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Order Details</h2>
            <p style="margin-bottom: 5px;"><strong>Challenge Type:</strong> ${order.challengeType}</p>
            <p style="margin-bottom: 5px;"><strong>Account Size:</strong> ${order.challengeAmount}</p>
            <p style="margin-bottom: 5px;"><strong>Platform:</strong> ${order.platform}</p>
            ${order.accountId ? `<p style="margin-bottom: 5px;"><strong>Account ID:</strong> ${order.accountId}</p>` : ''}
            ${order.addOns && order.addOns.length > 0 ? `
              <p style="margin-bottom: 5px;"><strong>Add-ons:</strong></p>
              <ul style="margin: 0 0 5px 20px; padding: 0;">
                ${order.addOns.map(addOn => `<li style="margin-bottom: 2px;">${addOnNames[addOn] || addOn}</li>`).join('')}
              </ul>
            ` : ''}
            <p style="margin-bottom: 5px;"><strong>Payment Method:</strong> Cryptocurrency (${order.cryptoType})</p>
            <p style="margin-bottom: 5px;"><strong>Crypto Amount:</strong> ${order.cryptoAmount} ${order.cryptoType}</p>
            <p style="margin-bottom: 5px;"><strong>USD Amount:</strong> $${order.usdAmount.toFixed(2)}</p>
            <p style="margin-bottom: 5px;"><strong>Wallet Address:</strong> ${order.cryptoAddress}</p>
            <p style="margin-bottom: 5px;"><strong>Verification Phrase:</strong> ${order.verificationPhrase}</p>
          </div>
        </div>
      `
    });

    // Send customer notification
    const customerResult = await resend.emails.send({
      from: 'support@shockwave-capital.com',
      to: order.customerEmail,
      subject: order.status === 'COMPLETED'
        ? (isReset
          ? `Payment Confirmed - Your Shockwave Capital ${order.challengeType}`
          : `Payment Confirmed - Your Shockwave Capital ${order.challengeType} Challenge`)
        : (isReset
          ? `Your Shockwave Capital ${order.challengeType} Order`
          : `Your Shockwave Capital ${order.challengeType} Challenge Order`),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background-color: #0D0D0D; padding: 20px; margin-bottom: 20px; border-radius: 5px; text-align: center;">
            <h1 style="color: #0FF1CE; margin: 0; font-size: 24px;">
              ${order.status === 'COMPLETED' ? 'Payment Confirmed!' : 'Thanks for your order!'}
            </h1>
          </div>
          
          <div style="margin-bottom: 30px;">
            <p>Hello ${order.customerName.split(' ')[0]},</p>
            ${order.status === 'COMPLETED'
              ? (isReset
                ? `<p>Great news! We've confirmed your crypto payment for this account reset. We'll return the profit and loss to zero so you can start fresh on the same account.</p>`
                : `<p>Great news! We've confirmed your crypto payment for the ${order.challengeType} Challenge. Your order is now being processed.</p>
                 <p>Due to high demand, please allow up to 1 hour for your login credentials to be generated. In some cases, this might take up to 24 hours.</p>`)
              : (isReset
                ? `<p>Thank you for your ${order.challengeType} request. We've received your crypto payment and will verify the transaction. Once it is confirmed, we'll reset this account's starting balance.</p>`
                : `<p>Thank you for purchasing our ${order.challengeType} Challenge. We're excited to see how you perform!</p>
                 <p>We've received your crypto payment request and will verify the transaction. Once confirmed, we'll prepare your trading account credentials.</p>`)
            }
          </div>
          
          <div style="margin-bottom: 30px; background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
            <h2 style="color: #333; font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Order Summary</h2>
            <p style="margin-bottom: 5px;"><strong>Order ID:</strong> ${order.id}</p>
            <p style="margin-bottom: 5px;"><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
            <p style="margin-bottom: 5px;"><strong>Challenge Type:</strong> ${order.challengeType}</p>
            <p style="margin-bottom: 5px;"><strong>Account Size:</strong> ${order.challengeAmount}</p>
            <p style="margin-bottom: 5px;"><strong>Platform:</strong> ${order.platform}</p>
            ${order.accountId ? `<p style="margin-bottom: 5px;"><strong>Account ID:</strong> ${order.accountId}</p>` : ''}
            ${order.addOns && order.addOns.length > 0 ? `
              <p style="margin-bottom: 5px;"><strong>Add-ons:</strong></p>
              <ul style="margin: 0 0 5px 20px; padding: 0;">
                ${order.addOns.map(addOn => `<li style="margin-bottom: 2px;">${addOnNames[addOn] || addOn}</li>`).join('')}
              </ul>
            ` : ''}
            <p style="margin-bottom: 5px;"><strong>Payment Amount:</strong> ${order.cryptoAmount} ${order.cryptoType}</p>
            <p style="margin-bottom: 5px;"><strong>USD Value:</strong> $${order.usdAmount.toFixed(2)}</p>
          </div>
          
          ${order.status !== 'COMPLETED' ? `
          <div style="margin-bottom: 30px; background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
            <h2 style="color: #333; font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Payment Verification Details</h2>
            <p style="margin-bottom: 5px;"><strong>Verification Phrase:</strong> <span style="font-family: monospace; background-color: #eee; padding: 2px 4px; border-radius: 3px;">${order.verificationPhrase}</span></p>
            <p style="margin-top: 10px; color: #666; font-size: 14px;">Please keep these details for your records. They help us match your payment to your order.</p>
          </div>
          ` : ''}
          
          <div style="margin-bottom: 30px;">
            <h2 style="color: #0FF1CE; font-size: 18px; margin-bottom: 15px;">Next Steps</h2>
            
            ${order.status === 'COMPLETED' ? (isReset ? `
            <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
              <div style="background-color: #0FF1CE; color: #000; border-radius: 50%; width: 25px; height: 25px; display: flex; justify-content: center; align-items: center; margin-right: 10px; flex-shrink: 0;">1</div>
              <div>
                <h3 style="margin: 0 0 5px 0; color: #333;">Fresh Start</h3>
                <p style="margin: 0; color: #666;">Your payment is confirmed. We reset the starting balance on this same account.</p>
              </div>
            </div>
            ` : `
            <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
              <div style="background-color: #0FF1CE; color: #000; border-radius: 50%; width: 25px; height: 25px; display: flex; justify-content: center; align-items: center; margin-right: 10px; flex-shrink: 0;">1</div>
              <div>
                <h3 style="margin: 0 0 5px 0; color: #333;">Receive Your Login Credentials</h3>
                <p style="margin: 0; color: #666;">We're preparing your login credentials now. You'll receive them in a separate email within 1-24 hours.</p>
              </div>
            </div>
            
            <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
              <div style="background-color: #0FF1CE; color: #000; border-radius: 50%; width: 25px; height: 25px; display: flex; justify-content: center; align-items: center; margin-right: 10px; flex-shrink: 0;">2</div>
              <div>
                <h3 style="margin: 0 0 5px 0; color: #333;">Start Trading</h3>
                <p style="margin: 0; color: #666;">Once you receive your credentials, you can begin trading. Remember to follow the challenge rules to maximize your chances of success!</p>
              </div>
            </div>
            `) : isReset ? `
            <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
              <div style="background-color: #0FF1CE; color: #000; border-radius: 50%; width: 25px; height: 25px; display: flex; justify-content: center; align-items: center; margin-right: 10px; flex-shrink: 0;">1</div>
              <div>
                <h3 style="margin: 0 0 5px 0; color: #333;">Payment Verification</h3>
                <p style="margin: 0; color: #666;">We'll verify your crypto payment. This usually takes 30-60 minutes but may take longer depending on network conditions.</p>
              </div>
            </div>
            
            <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
              <div style="background-color: #0FF1CE; color: #000; border-radius: 50%; width: 25px; height: 25px; display: flex; justify-content: center; align-items: center; margin-right: 10px; flex-shrink: 0;">2</div>
              <div>
                <h3 style="margin: 0 0 5px 0; color: #333;">Fresh Start</h3>
                <p style="margin: 0; color: #666;">Once payment is confirmed, we reset the starting balance on this same account.</p>
              </div>
            </div>
            ` : `
            <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
              <div style="background-color: #0FF1CE; color: #000; border-radius: 50%; width: 25px; height: 25px; display: flex; justify-content: center; align-items: center; margin-right: 10px; flex-shrink: 0;">1</div>
              <div>
                <h3 style="margin: 0 0 5px 0; color: #333;">Payment Verification</h3>
                <p style="margin: 0; color: #666;">We'll verify your crypto payment. This usually takes 30-60 minutes but may take longer depending on network conditions.</p>
              </div>
            </div>
            
            <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
              <div style="background-color: #0FF1CE; color: #000; border-radius: 50%; width: 25px; height: 25px; display: flex; justify-content: center; align-items: center; margin-right: 10px; flex-shrink: 0;">2</div>
              <div>
                <h3 style="margin: 0 0 5px 0; color: #333;">Receive Your Login Credentials</h3>
                <p style="margin: 0; color: #666;">Once payment is confirmed, we'll send your login credentials to this email address.</p>
              </div>
            </div>
            
            <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
              <div style="background-color: #0FF1CE; color: #000; border-radius: 50%; width: 25px; height: 25px; display: flex; justify-content: center; align-items: center; margin-right: 10px; flex-shrink: 0;">3</div>
              <div>
                <h3 style="margin: 0 0 5px 0; color: #333;">Start Trading</h3>
                <p style="margin: 0; color: #666;">Begin trading with your new account. Remember to follow the challenge rules to maximize your chances of success!</p>
              </div>
            </div>
            `}
          </div>
          
          <div style="margin-bottom: 30px;">
            <p>If you have any questions or need assistance, please contact our support team at <a href="mailto:support@shockwave-capital.com" style="color: #0FF1CE;">support@shockwave-capital.com</a>.</p>
            <p style="margin-bottom: 0;">Best regards,</p>
            <p style="margin-top: 5px;"><strong>The Shockwave Capital Team</strong></p>
          </div>
          
          <div style="background-color: #0D0D0D; padding: 15px; border-radius: 5px; text-align: center; font-size: 12px; color: #999;">
            <p style="margin-bottom: 5px;">© ${new Date().getFullYear()} Shockwave Capital. All rights reserved.</p>
            <p style="margin: 0;">This is an automated email, please do not reply.</p>
          </div>
        </div>
      `
    });

    return {
      success: true,
      adminEmail: adminResult,
      customerEmail: customerResult
    };
  } catch (error) {
    console.error('Error sending crypto order emails:', error);
    return { success: false, error };
  }
}

/**
 * Send template-based email with variable replacement
 * @param template Email template object
 * @param user User object containing recipient details
 * @param testValues Optional test values to override template variables
 * @returns Email send result
 */
export async function sendTemplateEmail(
  template: {
    name: string;
    subject: string;
    body: string;
    variables: string[];
  },
  user: {
    email: string;
    displayName?: string;
    firstName?: string;
    lastName?: string;
    [key: string]: any;
  },
  testValues?: { [key: string]: string }
) {
  try {
    console.log('Sending template email to:', user.email);
    
    // Prepare variable values
    const variableValues: { [key: string]: string } = {};
    
    // Set default values from user object
    template.variables.forEach(variable => {
      switch (variable) {
        case 'firstName':
          variableValues[variable] = user.firstName || user.displayName?.split(' ')[0] || 'Valued Customer';
          break;
        case 'lastName':
          variableValues[variable] = user.lastName || user.displayName?.split(' ')[1] || '';
          break;
        case 'email':
          variableValues[variable] = user.email;
          break;
        case 'displayName':
          variableValues[variable] = user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Valued Customer';
          break;
        default:
          // Check if user object has this property
          variableValues[variable] = user[variable] || `{{${variable}}}`;
      }
    });
    
    // Override with test values if provided
    if (testValues) {
      Object.keys(testValues).forEach(key => {
        if (testValues[key] && testValues[key].trim()) {
          variableValues[key] = testValues[key];
        }
      });
    }
    
    // Replace variables in subject and body
    let processedSubject = template.subject;
    let processedBody = template.body;
    
    Object.entries(variableValues).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedSubject = processedSubject.replace(regex, value);
      processedBody = processedBody.replace(regex, value);
    });
    
    // Enhanced HTML body with better styling and logo
    const styledBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333; line-height: 1.6; background-color: #f5f5f5;">
        <!-- Header with Clean Text Branding -->
        <div style="background: #f7f7f7; padding: 30px 20px; margin-bottom: 30px; border-radius: 12px; text-align: center;">
          <h1 style="color: #1a1a1a; margin: 0; font-size: 32px; font-weight: 700; letter-spacing: 1px;">SHOCKWAVE CAPITAL</h1>
          <p style="color: #1a1a1a; margin: 5px 0 0 0; font-size: 14px; font-weight: 500; letter-spacing: 2px;">HIGH OCTANE FUNDING</p>
        </div>
        
        <!-- Main Content -->
        <div style="background-color: #ffffff; padding: 20px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #e5e5e5;">
          ${processedBody}
        </div>
        
        <!-- Footer -->
        <div style="background: #f7f7f7; padding: 25px 20px; border-radius: 12px; text-align: center; font-size: 14px; color: #999;">
          <div style="margin-bottom: 15px;">
            <p style="margin: 0; color: #1a1a1a; font-weight: 600; font-size: 16px;">SHOCKWAVE CAPITAL</p>
            <p style="margin: 5px 0 0 0; color: #666; font-size: 12px;">© ${new Date().getFullYear()} All rights reserved. Empowering traders worldwide.</p>
          </div>
          <div style="border-top: 1px solid #ddd; padding-top: 15px;">
            <p style="margin: 0 0 10px 0; color: #666;">This is an automated email. Please do not reply to this message.</p>
            <p style="margin: 0; font-size: 12px;">
              Need help? Contact us at <a href="mailto:support@shockwave-capital.com" style="color: #0FF1CE; text-decoration: none; font-weight: 500;">support@shockwave-capital.com</a>
            </p>
          </div>
        </div>
      </div>
    `;
    
    // Create text version by stripping HTML
    const textBody = processedBody
      .replace(/<[^>]*>/g, '')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
    
    // Send customer email
    const { data, error } = await resend.emails.send({
      from: 'support@shockwave-capital.com',
      to: user.email,
      subject: processedSubject,
      html: styledBody,
      text: `
        ${processedSubject}
        
        ${textBody}
        
        ---
        © ${new Date().getFullYear()} Shockwave Capital. All rights reserved.
        This is an automated email. Please do not reply to this message.
        Need help? Contact us at support@shockwave-capital.com
      `,
    });

    if (error) {
      console.error('Error sending template email:', error);
      return { success: false, error };
    }

    console.log('Template email sent successfully:', data?.id);
    
    // Send admin notification for Login Credentials template
    if (template.name === 'Login Credentials') {
      try {
        console.log('Sending admin notification for login credentials dispatch');
        
        await resend.emails.send({
          from: 'support@shockwave-capital.com',
          to: 'support@shockwave-capital.com',
          subject: `Login Credentials Sent - ${user.displayName || user.email}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
              <div style="background-color: #0D0D0D; padding: 15px; margin-bottom: 20px; border-radius: 5px;">
                <h1 style="color: #0FF1CE; margin: 0; font-size: 24px;">Login Credentials Dispatched</h1>
              </div>
              
              <div style="margin-bottom: 30px;">
                <p style="margin-bottom: 5px;"><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
                <p style="margin-bottom: 5px;"><strong>Template:</strong> ${template.name}</p>
                <p style="margin-bottom: 5px;"><strong>Email Subject:</strong> ${processedSubject}</p>
              </div>
              
              <div style="margin-bottom: 30px;">
                <h2 style="color: #0FF1CE; font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Customer Details</h2>
                <p style="margin-bottom: 5px;"><strong>Name:</strong> ${user.displayName || 'N/A'}</p>
                <p style="margin-bottom: 5px;"><strong>Email:</strong> ${user.email}</p>
                <p style="margin-bottom: 5px;"><strong>First Name:</strong> ${user.firstName || 'N/A'}</p>
                <p style="margin-bottom: 5px;"><strong>Last Name:</strong> ${user.lastName || 'N/A'}</p>
              </div>
              
              <div style="margin-bottom: 30px;">
                <h2 style="color: #0FF1CE; font-size: 18px; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">Credentials Sent</h2>
                <p style="margin-bottom: 5px;"><strong>Platform:</strong> ${variableValues.platform || 'N/A'}</p>
                <p style="margin-bottom: 5px;"><strong>Login ID:</strong> ${variableValues.loginId || 'N/A'}</p>
                <p style="margin-bottom: 5px;"><strong>Password:</strong> ${variableValues.password || 'N/A'}</p>
                <p style="margin-bottom: 5px;"><strong>Server:</strong> ${variableValues.server || 'N/A'}</p>
              </div>
              
              <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; font-size: 12px; color: #666;">
                <p>This is an automated notification from Shockwave Capital Admin System.</p>
              </div>
            </div>
          `,
          text: `
            Login Credentials Dispatched
            
            Timestamp: ${new Date().toLocaleString()}
            Template: ${template.name}
            Email Subject: ${processedSubject}
            
            Customer Details:
            Name: ${user.displayName || 'N/A'}
            Email: ${user.email}
            First Name: ${user.firstName || 'N/A'}
            Last Name: ${user.lastName || 'N/A'}
            
            Credentials Sent:
            Platform: ${variableValues.platform || 'N/A'}
            Login ID: ${variableValues.loginId || 'N/A'}
            Password: ${variableValues.password || 'N/A'}
            Server: ${variableValues.server || 'N/A'}
            
            This is an automated notification from Shockwave Capital Admin System.
          `,
        });
        
        console.log('Admin notification for login credentials sent successfully');
      } catch (adminError) {
        console.error('Error sending admin notification:', adminError);
        // Don't fail the main email send if admin notification fails
      }
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error sending template email:', error);
    return { success: false, error };
  }
}

/**
 * Send funded account fail email
 * @param data Email data for funded account failure
 * @returns Email send result
 */
export async function sendFundedFailEmail(data: {
  email: string;
  name: string;
  accountSize: number;
  breachType: 'maxDrawdown' | 'riskViolation' | 'both';
  maxDrawdown?: number;
  dailyDrawdown?: number;
}) {
  try {
    const subject = 'Your Funded Account Has Been Terminated';
    
    let breachDetails = '';
    if (data.breachType === 'maxDrawdown') {
      breachDetails = `You exceeded the maximum drawdown limit of 15% (current: ${data.maxDrawdown?.toFixed(2)}%).`;
    } else if (data.breachType === 'riskViolation') {
      breachDetails = `You violated the risk management rule by exceeding the maximum 2% total risk exposure allowed across all open trades at any time. Your loss of ${data.dailyDrawdown?.toFixed(2)}% confirms this violation.`;
    } else {
      breachDetails = `You violated multiple rules: Maximum drawdown limit exceeded (${data.maxDrawdown?.toFixed(2)}%, limit: 15%) and risk management violation by exceeding the maximum 2% total risk exposure allowed across all open trades (loss: ${data.dailyDrawdown?.toFixed(2)}%).`;
    }
    
    const result = await resend.emails.send({
      from: 'support@shockwave-capital.com',
      to: data.email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background-color: #0D0D0D; padding: 20px; margin-bottom: 20px; border-radius: 5px; text-align: center;">
            <h1 style="color: #FF4444; margin: 0; font-size: 24px;">Funded Account Terminated</h1>
          </div>
          
          <div style="margin-bottom: 30px;">
            <p>Hello ${data.name},</p>
            <p>We regret to inform you that your funded account ($${data.accountSize.toLocaleString()}) has been terminated due to rule violations.</p>
          </div>
          
          <div style="margin-bottom: 30px; background-color: #fee; padding: 15px; border-radius: 5px; border-left: 4px solid #f44;">
            <h2 style="color: #333; font-size: 18px; margin-bottom: 10px;">Violation Details</h2>
            <p style="margin: 0; color: #666;">${breachDetails}</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h2 style="color: #0FF1CE; font-size: 18px; margin-bottom: 15px;">Funded Account Rules Reminder</h2>
            <ul style="color: #666; line-height: 1.8;">
              <li><strong>Maximum Drawdown:</strong> 15% from initial balance</li>
              <li><strong>Daily Drawdown:</strong> 8% maximum per day</li>
              <li><strong>Risk Management:</strong> Maximum 2% total risk exposure spread across all open trades at any time</li>
              <li><strong>Important:</strong> Any loss of 2% or more constitutes a risk management violation</li>
            </ul>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h2 style="color: #0FF1CE; font-size: 18px; margin-bottom: 15px;">What's Next?</h2>
            <p>While this funded account has been terminated, you can:</p>
            <ul style="color: #666; line-height: 1.8;">
              <li>Start a new challenge to earn another funded account</li>
              <li>Purchase a new funded account at the same capital level you were funded at (or above) and maintain your funded trader status!</li>
              <li>Review your trading strategy to better manage risk</li>
              <li>Contact support if you have questions about the violation</li>
            </ul>
          </div>
          
          <div style="margin-bottom: 30px; background-color: #0FF1CE10; border: 2px solid #0FF1CE; border-radius: 10px; padding: 20px; text-align: center;">
            <h2 style="color: #0FF1CE; font-size: 20px; margin-bottom: 15px;">🚀 Keep Your Funded Status!</h2>
            <p style="color: #333; font-size: 16px; margin-bottom: 15px;">
              <strong>Special Offer:</strong> Purchase a new funded account at the same capital level you were funded at (or above) and maintain your funded trader status!
            </p>
            <div>
              <a href="https://www.shockwave-capital.com/once-funded-stay-funded" style="display: inline-block; background-color: #0FF1CE; color: #000; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; margin-top: 10px;">
                Get New Funded Account
              </a>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 40px;">
            <a href="https://www.shockwave-capital.com/once-funded-stay-funded" style="display: inline-block; background-color: #0FF1CE; color: #000; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Get New Funded Account</a>
          </div>
          
          <div style="margin-top: 40px;">
            <p style="margin-bottom: 0;">Best regards,</p>
            <p style="margin-top: 5px;"><strong>The Shockwave Capital Team</strong></p>
          </div>
          
          <div style="background-color: #0D0D0D; padding: 15px; border-radius: 5px; text-align: center; font-size: 12px; color: #999; margin-top: 40px;">
            <p style="margin-bottom: 5px;">© ${new Date().getFullYear()} Shockwave Capital. All rights reserved.</p>
            <p style="margin: 0;">This is an automated email, please do not reply.</p>
          </div>
        </div>
      `,
      text: `
        Funded Account Terminated
        
        Hello ${data.name},
        
        We regret to inform you that your funded account ($${data.accountSize.toLocaleString()}) has been terminated due to rule violations.
        
        Violation Details:
        ${breachDetails}
        
        Funded Account Rules Reminder:
        - Maximum Drawdown: 15% from initial balance
        - Daily Drawdown: 8% maximum per day
        - Risk Management: Maximum 2% total risk exposure spread across all open trades at any time
        - Important: Any loss of 2% or more constitutes a risk management violation
        
        What's Next?
        While this funded account has been terminated, you can:
        - Start a new challenge to earn another funded account
        - Review your trading strategy to better manage risk
        - Contact support if you have questions about the violation
        
        🚀 KEEP YOUR FUNDED STATUS! 🚀
        
        Special Offer: Purchase a new funded account at the same capital level you were funded at (or above) and maintain your funded trader status!
        
        Visit https://www.shockwave-capital.com/once-funded-stay-funded to get your new funded account!]
        
        Best regards,
        The Shockwave Capital Team
      `,
    });

    if ('error' in result && result.error) {
      console.error('Error sending funded fail email:', result.error);
      return { success: false, error: result.error };
    }

    // Send admin notification
    await resend.emails.send({
      from: 'support@shockwave-capital.com',
      to: 'support@shockwave-capital.com',
      subject: `Funded Account Terminated - ${data.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Funded Account Termination</h2>
          <p><strong>User:</strong> ${data.name} (${data.email})</p>
          <p><strong>Account Size:</strong> $${data.accountSize.toLocaleString()}</p>
          <p><strong>Breach Type:</strong> ${data.breachType}</p>
          ${data.maxDrawdown ? `<p><strong>Max Drawdown:</strong> ${data.maxDrawdown.toFixed(2)}%</p>` : ''}
          ${data.dailyDrawdown ? `<p><strong>Daily Loss:</strong> ${data.dailyDrawdown.toFixed(2)}%</p>` : ''}
          <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        </div>
      `
    });

    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending funded fail email:', error);
    return { success: false, error };
  }
}

/**
 * Send funded account drawdown warning email
 * @param data Email data for funded account warning
 * @returns Email send result
 */
export async function sendFundedDrawdownWarningEmail(data: {
  email: string;
  name: string;
  accountSize: number;
  currentDrawdown: number;
  warningType: 'approaching-max' | 'approaching-risk-limit';
}) {
  try {
    const subject = data.warningType === 'approaching-max' 
      ? 'Warning: Approaching Maximum Drawdown Limit'
      : 'Warning: Approaching Risk Management Violation';
    
    const warningDetails = data.warningType === 'approaching-max'
      ? `Your current drawdown is ${data.currentDrawdown.toFixed(2)}%, approaching the 15% maximum limit.`
      : `Your current risk exposure is approaching dangerous levels. You must maintain a maximum 2% total risk exposure spread across all open trades at any time. Any loss of 2% or more will result in immediate account termination for risk management violation.`;
    
    const result = await resend.emails.send({
      from: 'support@shockwave-capital.com',
      to: data.email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <div style="background-color: #0D0D0D; padding: 20px; margin-bottom: 20px; border-radius: 5px; text-align: center;">
            <h1 style="color: #FFA500; margin: 0; font-size: 24px;">Risk Warning</h1>
          </div>
          
          <div style="margin-bottom: 30px;">
            <p>Hello ${data.name},</p>
            <p>This is an important risk management alert for your funded account ($${data.accountSize.toLocaleString()}).</p>
          </div>
          
          <div style="margin-bottom: 30px; background-color: #fff3cd; padding: 15px; border-radius: 5px; border-left: 4px solid #ffc107;">
            <h2 style="color: #333; font-size: 18px; margin-bottom: 10px;">Warning Details</h2>
            <p style="margin: 0; color: #666;">${warningDetails}</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <h2 style="color: #0FF1CE; font-size: 18px; margin-bottom: 15px;">Immediate Action Required</h2>
            <ul style="color: #666; line-height: 1.8;">
              <li>Review and close any high-risk positions</li>
              <li>Reduce your position sizes immediately</li>
              <li>Consider hedging your current exposure</li>
              <li>Take a break from trading if necessary</li>
            </ul>
          </div>
          
          <div style="margin-bottom: 30px; background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
            <h3 style="color: #333; font-size: 16px; margin-bottom: 10px;">Funded Account Rules</h3>
            <ul style="color: #666; line-height: 1.6; margin: 0;">
              <li>Maximum Drawdown: 15%</li>
              <li>Daily Drawdown: 8% maximum</li>
              <li>Risk Management: Maximum 2% total risk exposure spread across all open trades</li>
              <li>Violation: Any loss of 2% or more constitutes a risk management violation</li>
            </ul>
          </div>
          
          <div style="margin-top: 40px;">
            <p>Stay disciplined and protect your funded account.</p>
            <p style="margin-bottom: 0;">Best regards,</p>
            <p style="margin-top: 5px;"><strong>The Shockwave Capital Team</strong></p>
          </div>
          
          <div style="background-color: #0D0D0D; padding: 15px; border-radius: 5px; text-align: center; font-size: 12px; color: #999; margin-top: 40px;">
            <p style="margin-bottom: 5px;">© ${new Date().getFullYear()} Shockwave Capital. All rights reserved.</p>
            <p style="margin: 0;">This is an automated risk management notification.</p>
          </div>
        </div>
      `,
      text: `
        Risk Warning
        
        Hello ${data.name},
        
        This is an important risk management alert for your funded account ($${data.accountSize.toLocaleString()}).
        
        Warning Details:
        ${warningDetails}
        
        Immediate Action Required:
        - Review and close any high-risk positions
        - Reduce your position sizes immediately
        - Consider hedging your current exposure
        - Take a break from trading if necessary
        
        Funded Account Rules:
        - Maximum Drawdown: 15%
        - Daily Drawdown: 8% maximum
        - Risk Management: Maximum 2% total risk exposure spread across all open trades
        - Violation: Any loss of 2% or more constitutes a risk management violation
        
        Stay disciplined and protect your funded account.
        
        Best regards,
        The Shockwave Capital Team
      `,
    });

    if ('error' in result && result.error) {
      console.error('Error sending funded drawdown warning email:', result.error);
      return { success: false, error: result.error };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Error sending funded drawdown warning email:', error);
    return { success: false, error };
  }
} 