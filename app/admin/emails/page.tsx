'use client';
import React, { useState, useEffect, useRef } from 'react';
import { 
  Mail, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  X,
  Send,
  Search,
  User,
  Check,
  Loader,
  Users,
  Eye,
  ChevronDown,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { getAllUsers, UserData, db, getCachedMetrics } from '@/lib/firebase';
import { isVipMetaApiAccount } from '@/lib/vip-accounts';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  body: string;
  variables: string[];
  lastUpdated: string;
  isBulkTemplate?: boolean;
  bulkSource?: 'gauntlet-activation' | 'active-accounts';
}

// Enhanced email templates with improved login credentials template
const initialTemplates: EmailTemplate[] = [
  {
    id: 1,
    name: 'Welcome Email',
    subject: 'Welcome to Shockwave Capital',
    body: `<div style="margin-bottom: 20px;">
<p style="font-size: 18px; color: #333; margin-bottom: 15px;">Hello {{firstName}},</p>
<p style="color: #555; margin-bottom: 15px;">Welcome to Shockwave Capital! We're excited to have you join our trading community.</p>
<p style="color: #555; margin-bottom: 15px;">Your account has been created successfully and you can now log in to your dashboard to get started.</p>
<p style="color: #555; margin-bottom: 15px;">If you have any questions, feel free to reach out to our support team.</p>
<p style="color: #333; margin-top: 25px;">Best regards,<br><strong>The Shockwave Capital Team</strong></p>
</div>`,
    variables: ['firstName', 'lastName', 'email'],
    lastUpdated: '2023-05-25'
  },
  {
    id: 2,
    name: 'Order Confirmation',
    subject: 'Your Shockwave Capital Order Confirmation',
    body: `<div style="margin-bottom: 20px;">
<p style="font-size: 18px; color: #333; margin-bottom: 15px;">Hello {{firstName}},</p>
<p style="color: #555; margin-bottom: 15px;">Thank you for your order with Shockwave Capital!</p>
<p style="color: #555; margin-bottom: 15px;">We're excited to confirm your {{challengeType}} purchase. Your order number is {{orderNumber}}.</p>
<p style="color: #555; margin-bottom: 15px;">Your login credentials will be sent to you shortly in a separate email.</p>
<p style="color: #555; margin-bottom: 15px;">If you have any questions about your order, please don't hesitate to contact us.</p>
<p style="color: #333; margin-top: 25px;">Best regards,<br><strong>The Shockwave Capital Team</strong></p>
</div>`,
    variables: ['firstName', 'lastName', 'email', 'challengeType', 'accountSize', 'orderNumber'],
    lastUpdated: '2023-05-24'
  },
  {
    id: 3,
    name: 'Login Credentials',
    subject: 'Challenge Login Details - Shockwave Capital',
    body: `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Challenge Login Details - Shockwave Capital</title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <style>
    @media screen {
      @font-face {
        font-family: 'Lato';
        font-style: normal;
        font-weight: 400;
        src: local('Lato Regular'), local('Lato-Regular'), url(https://fonts.gstatic.com/s/lato/v11/qIIYRU-oROkIk8vfvxw6QvesZW2xOQ-xsNqO47m55DA.woff) format('woff');
      }
      @font-face {
        font-family: 'Lato';
        font-style: normal;
        font-weight: 700;
        src: local('Lato Bold'), local('Lato-Bold'), url(https://fonts.gstatic.com/s/lato/v11/qdgUG4U09HnJwhYI-uK18wLUuEpTyoUstqEm5AMlJo4.woff) format('woff');
      }
    }
    body {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    body {
      height: 100% !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
    }
    @media all and (max-width:621px) {
      h1 {
        font-size: 24px !important;
        line-height: 26px !important;
      }
      .mobilecontent {
        display: table-row !important;
        max-height: none !important;
      }
      .desktopcontent {
        mso-hide: all;
        display: none !important;
        max-height: 0px;
        overflow: hidden;
      }
      .mobile-header {
        padding: 20px 15px !important;
        text-align: center !important;
      }
      .mobile-header h1 {
        font-size: 18px !important;
        text-align: center !important;
        margin-bottom: 15px !important;
      }
      .mobile-header table {
        width: 100% !important;
      }
      .mobile-header td {
        display: block !important;
        width: 100% !important;
        text-align: center !important;
        padding: 5px 0 !important;
      }
      .mobile-content {
        padding: 20px 15px !important;
      }
      .mobile-table {
        width: 100% !important;
        max-width: 100% !important;
      }
      .mobile-cell {
        padding: 10px 8px !important;
        font-size: 12px !important;
      }
      .mobile-button {
        padding: 8px 12px !important;
        font-size: 12px !important;
      }
    }
  </style>
</head>
<body style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; height: 100% !important; width: 100% !important; margin: 0; padding: 0;" bgcolor="#f4f4f4">
  
  <!-- Preview Text -->
  <span style="display: none !important; font-size: 0px; line-height: 0px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; visibility: hidden;">Your challenge account login details for {{platform}}</span>
  
  <!-- Main Container -->
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse !important; table-layout: fixed; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin: 0;">
    
    <!-- HEADER -->
    <tr>
      <td bgcolor="#0FF1CE" align="center" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse !important; table-layout: fixed; max-width: 600px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin: 0;">
          <tr>
            <td align="center" valign="middle" class="mobile-header" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 30px 20px;">
              <!-- Text Logo -->
              
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- MAIN CONTENT -->
    <tr>
      <td bgcolor="#f4f4f4" align="center" style="width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin: 0; padding: 0px 20px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse !important; table-layout: fixed; max-width: 600px; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin: 0;">
          
          <!-- Welcome Message -->
          <tr>
            <td bgcolor="#ffffff" align="left" class="mobile-content" style="color: #1a1a1a; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 400; line-height: 26px; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 40px;">
              <h1 style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0 0 20px 0;">Your Trading Challenge Details</h1>
              <p style="margin: 0 0 20px 0; color: #444;">Hello {{firstName}},</p>
              <p style="margin: 0 0 25px 0; color: #444;">Welcome to Shockwave Capital! Your trading challenge account has been successfully set up. Below are your login credentials and setup instructions.</p>
            </td>
          </tr>

          <!-- Login Credentials Table -->
          <tr>
            <td bgcolor="#ffffff" align="center" class="mobile-content" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 0 40px 40px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" class="mobile-table" style="border-collapse: collapse !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                
                <!-- Credentials Header -->
                <tr>
                  <td colspan="2" style="background: #0FF1CE; color: #1a1a1a; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 700; text-align: center; padding: 20px; border-radius: 8px 8px 0 0;">
                    Your Trading Account Credentials
                  </td>
                </tr>

                <!-- Platform -->
                <tr style="border-bottom: 1px solid #E5E5E5;">
                  <td bgcolor="#fafafa" valign="left" class="mobile-cell" style="width: 35%; color: #1a1a1a; font-weight: 600; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 18px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 15px; border: 1px solid #E5E5E5;">
                    Platform:
                  </td>
                  <td valign="left" class="mobile-cell" style="color: #1a1a1a; font-weight: 600; font-family: 'Courier New', monospace; font-size: 14px; line-height: 17px; background: rgba(15, 241, 206, 0.1); -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 15px; border: 1px solid #E5E5E5;" bgcolor="#ffffff">
                    {{platform}}
                  </td>
                </tr>

                <!-- Login ID -->
                <tr style="border-bottom: 1px solid #E5E5E5;">
                  <td bgcolor="#fafafa" valign="left" class="mobile-cell" style="width: 35%; color: #1a1a1a; font-weight: 600; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 18px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 15px; border: 1px solid #E5E5E5;">
                    Login ID:
                  </td>
                  <td valign="left" class="mobile-cell" style="color: #1a1a1a; font-weight: 600; font-family: 'Courier New', monospace; font-size: 14px; line-height: 17px; background: rgba(15, 241, 206, 0.1); cursor: pointer; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 15px; border: 1px solid #E5E5E5;" bgcolor="#ffffff" onclick="navigator.clipboard.writeText('{{loginId}}');" title="Click to copy">
                    {{loginId}} <span style="color: #0FF1CE; font-size: 12px; margin-left: 8px;">Copy</span>
                  </td>
                </tr>

                <!-- Password -->
                <tr style="border-bottom: 1px solid #E5E5E5;">
                  <td bgcolor="#fafafa" valign="left" class="mobile-cell" style="width: 35%; color: #1a1a1a; font-weight: 600; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 18px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 15px; border: 1px solid #E5E5E5;">
                    Password:
                  </td>
                  <td valign="left" class="mobile-cell" style="color: #1a1a1a; font-weight: 600; font-family: 'Courier New', monospace; font-size: 14px; line-height: 17px; background: rgba(15, 241, 206, 0.1); cursor: pointer; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 15px; border: 1px solid #E5E5E5;" bgcolor="#ffffff" onclick="navigator.clipboard.writeText('{{password}}');" title="Click to copy">
                    {{password}} <span style="color: #0FF1CE; font-size: 12px; margin-left: 8px;">Copy</span>
                  </td>
                </tr>

                <!-- Server -->
                <tr>
                  <td bgcolor="#fafafa" valign="left" class="mobile-cell" style="width: 35%; color: #1a1a1a; font-weight: 600; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 18px; border-radius: 0 0 0 8px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 15px; border: 1px solid #E5E5E5;">
                    Server:
                  </td>
                  <td valign="left" class="mobile-cell" style="color: #1a1a1a; font-weight: 600; font-family: 'Courier New', monospace; font-size: 14px; line-height: 17px; background: rgba(15, 241, 206, 0.1); cursor: pointer; border-radius: 0 0 8px 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 15px; border: 1px solid #E5E5E5;" bgcolor="#ffffff" onclick="navigator.clipboard.writeText('{{server}}');" title="Click to copy">
                    {{server}} <span style="color: #0FF1CE; font-size: 12px; margin-left: 8px;">Copy</span>
                  </td>
                </tr>

              </table>
            </td>
          </tr>

          <!-- Dashboard Button -->
          <tr>
            <td bgcolor="#ffffff" align="center" class="mobile-content" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 0 40px 40px;">
              <table border="0" cellpadding="0" cellspacing="0" style="border-collapse: separate !important; border-radius: 4px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border: 1px solid #1a1a1a;" bgcolor="#1a1a1a">
                <tbody>
                  <tr>
                    <td align="center" valign="middle" class="mobile-button" style="font-family: 'Lato', 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 12px 16px;">
                      <a href="https://shockwave-capital.com" target="_blank" style="font-weight: normal; letter-spacing: normal; line-height: 100%; text-align: center; text-decoration: none; color: #0FF1CE; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
                        START TRADING
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Setup Instructions -->
          <tr>
            <td bgcolor="#ffffff" align="left" class="mobile-content" style="color: #1a1a1a; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 400; line-height: 26px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 0px 40px 40px;">
              <h3 style="color: #444; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">Getting Started</h3>
              <ol style="margin: 0; padding-left: 20px; color: #444;">
                <li style="margin-bottom: 12px;">Download and install the {{platform}} trading platform</li>
                <li style="margin-bottom: 12px;">Use the credentials above to log in (click to copy)</li>
                <li style="margin-bottom: 12px;">Review the challenge rules thoroughly</li>
                <li style="margin-bottom: 12px;">Start trading with your defined strategy</li>
              </ol>
            </td>
          </tr>

        </table>
      </td>
    </tr>

    <!-- SUPPORT SECTION -->
    <tr>
      <td align="center" bgcolor="#f4f4f4" class="mobile-content" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 0px 20px;">
        <table bgcolor="#e8f8f5" role="presentation" align="center" border="0" cellspacing="0" cellpadding="0" width="100%" class="mobile-table" style="max-width: 600px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important;">
          <tr>
            <td align="center" valign="top" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <table role="presentation" border="0" align="center" cellpadding="0" cellspacing="0" width="100%" class="mobile-table" style="max-width: 536px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important;">
                <tr>
                  <td align="left" class="mobile-content" style="color: #444; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 18px; font-weight: 400; line-height: 25px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 50px 20px 20px;">
                    <h2 style="font-size: 22px; font-weight: 600; margin: 0; color: #444;">Need Help?</h2>
                    <p style="font-size: 16px; font-weight: 300; margin: 10px 0 0; color: #444;">We're here to support your trading journey 24/7</p>
                  </td>
                </tr>
                <tr>
                  <td align="left" class="mobile-content" style="color: #444; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 400; line-height: 26px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 0px 20px 50px;">
                    <table style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important;">
                      <tr>
                        <td valign="top" style="padding-right: 10px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                          <span style="color: #0FF1CE; font-size: 16px;">•</span>
                        </td>
                        <td style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                          Email us at <a href="mailto:support@shockwavecapital.com" style="color: #0FF1CE; text-decoration: none;">support@shockwavecapital.com</a>
                        </td>
                      </tr>
                      <tr>
                        <td valign="top" style="padding-right: 10px; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                          <span style="color: #0FF1CE; font-size: 16px;">•</span>
                        </td>
                        <td style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                          Check our <a href="https://shockwavecapital.com/faq" style="color: #0FF1CE; text-decoration: none;">FAQ page</a> for quick answers
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td bgcolor="#f4f4f4" align="center" style="width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; margin: 0; padding: 20px;">
        <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; width: 100% !important; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-collapse: collapse !important; margin: 0;">
          <tbody>
            <tr>
              <td bgcolor="#ffffff" style="-webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; mso-table-lspace: 0pt; mso-table-rspace: 0pt; padding: 40px 20px; text-align: center;">
                <p style="margin: 0; color: #888; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 12px; line-height: 18px;">
                  © 2025 Shockwave Capital. All rights reserved.<br>
                  This email contains confidential information. Please do not share your login credentials.
                </p>
                <p style="margin: 15px 0 0 0; color: #888; font-family: 'Lato', Helvetica, Arial, sans-serif; font-size: 11px;">
                  You received this email because you signed up for a trading challenge with Shockwave Capital.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>

  </table>
</body>
</html>`,
    variables: ['firstName', 'platform', 'loginId', 'password', 'server'],
    lastUpdated: new Date().toISOString().split('T')[0]
  },
  {
    id: 4,
    name: 'Passed Gauntlet Challenge',
    subject: 'Passed Gauntlet Challenge & Next Steps',
    body: `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Passed Gauntlet Challenge - Shockwave Capital</title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <style>
    body {
      font-family: 'Lato', Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    @media all and (max-width:621px) {
      .mobile-header {
        padding: 20px 15px !important;
      }
      .mobile-content {
        padding: 20px 15px !important;
      }
    }
  </style>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0;">
    <tr>
      <td bgcolor="#0FF1CE" align="center" style="padding: 30px 20px;">
        <h1 style="color: #0D0D0D; margin: 0; font-size: 28px;">Shockwave Capital</h1>
      </td>
    </tr>
    <tr>
      <td bgcolor="#f4f4f4" align="center" style="padding: 20px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
          <tr>
            <td bgcolor="#ffffff" style="padding: 40px; border-radius: 8px;">
              <h1 style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0 0 20px 0;">Congratulations on Passing Your Gauntlet Challenge! 🎉</h1>
              
              <p style="margin: 0 0 20px 0; color: #444;">Dear {{firstName}},</p>
              
              <p style="margin: 0 0 20px 0; color: #444;">
                Congratulations on successfully passing your <strong style="color: #0FF1CE;">{{accountSize}}</strong> Gauntlet Challenge! 
                We're thrilled to see your progress and excited to welcome you into the Shockwave funded trader program.
              </p>
              
              <div style="background: #f8f8f8; padding: 25px; border-radius: 8px; margin: 25px 0;">
                <h2 style="color: #1a1a1a; font-size: 22px; margin: 0 0 20px 0;">Here are your next steps:</h2>
                
                <div style="margin-bottom: 25px;">
                  <h3 style="color: #0FF1CE; font-size: 18px; margin: 0 0 10px 0;">1. Complete KYC</h3>
                  <p style="margin: 0; color: #555; line-height: 1.6;">
                    We have unlocked your KYC on your dashboard. Please upload the required documents for approval and e-sign the Funded Trader Agreement.
                  </p>
                </div>
                
                <div>
                  <h3 style="color: #0FF1CE; font-size: 18px; margin: 0 0 10px 0;">2. Funded Account Activation</h3>
                  <p style="margin: 0 0 15px 0; color: #555; line-height: 1.6;">
                    To gain access to your {{accountSize}} funded account, you'll need to pay the activation fee within 48 hours. 
                    <strong>Please note that if the activation is not completed within this timeframe, your Gauntlet Challenge will expire and you would need to repurchase and pass a new challenge.</strong>
                  </p>
                  <p style="margin: 0; color: #555;">You can complete the activation here:</p>
                </div>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://shockwave-capital.com/gauntlet-activation" style="display: inline-block; background-color: #1a1a1a; color: #0FF1CE; padding: 16px 32px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 16px;">
                  👉 Activate Your Funded Account
                </a>
              </div>
              
              <p style="margin: 20px 0; color: #444;">
                We're excited to have you and can't wait to see your continued success as a Shockwave-funded trader.
              </p>
              
              <p style="margin: 0 0 5px 0; color: #444;">Thank you for choosing Shockwave Capital.</p>
              
              <p style="margin: 25px 0 0 0; color: #444;">
                Best regards,<br>
                <strong>Emily Carter</strong><br>
                Shockwave Capital
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ['firstName', 'accountSize'],
    lastUpdated: new Date().toISOString().split('T')[0]
  },
  {
    id: 5,
    name: 'Gauntlet Final Reminder',
    subject: 'URGENT: Final Reminder!',
    body: `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Final Reminder - Shockwave Capital</title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <style>
    body {
      font-family: 'Lato', Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    @media all and (max-width:621px) {
      .mobile-header {
        padding: 20px 15px !important;
      }
      .mobile-content {
        padding: 20px 15px !important;
      }
    }
  </style>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0;">
    <tr>
      <td bgcolor="#FF4444" align="center" style="padding: 30px 20px;">
        <h1 style="color: #FFFFFF; margin: 0; font-size: 28px;">⚠️ URGENT: Final Reminder!</h1>
      </td>
    </tr>
    <tr>
      <td bgcolor="#f4f4f4" align="center" style="padding: 20px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
          <tr>
            <td bgcolor="#ffffff" style="padding: 40px; border-radius: 8px;">
              <p style="margin: 0 0 20px 0; color: #444;">Dear {{firstName}},</p>
              
              <div style="background: #fff3cd; border: 2px solid #ffc107; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 0; color: #856404; font-weight: bold; font-size: 16px;">
                  This is a final reminder regarding your <strong style="color: #FF4444;">{{accountSize}}</strong> Gauntlet Challenge.
                </p>
              </div>
              
              <p style="margin: 0 0 20px 0; color: #444;">
                You have successfully passed the challenge, and your KYC has been approved. We are still waiting for the activation fee for your accounts.
              </p>
              
              <div style="background: #f8d7da; border: 2px solid #f5c6cb; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <p style="margin: 0; color: #721c24; font-weight: bold;">
                  <strong>⏰ Please note:</strong> If your activation fee is not completed within the next 24 hours, your Gauntlet Challenge will expire and your funded account will be forfeited. 
                  To continue as a Shockwave-funded trader, you would need to repurchase and pass a new challenge.
                </p>
              </div>
              
              <div style="text-align: center; margin: 30px 0;">
                <a href="https://shockwave-capital.com/gauntlet-activation" style="display: inline-block; background-color: #FF4444; color: #FFFFFF; padding: 16px 32px; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 18px;">
                  👉 Complete Your Activation Here
                </a>
              </div>
              
              <p style="margin: 20px 0; color: #444; font-weight: bold;">
                We would hate to see you lose the opportunity you've worked hard for. Please take immediate action today to secure your funded account.
              </p>
              
              <p style="margin: 25px 0 0 0; color: #444;">
                Best regards,<br>
                <strong>Emily Carter</strong><br>
                Shockwave Capital
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ['firstName', 'accountSize'],
    lastUpdated: new Date().toISOString().split('T')[0]
  },
  {
    id: 6,
    name: 'Gauntlet Activation Offer',
    subject: 'Activate Your New Gauntlet Challenge',
    body: `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Activate Your Gauntlet Challenge - Shockwave Capital</title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <style>
    body {
      font-family: 'Lato', Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #f4f4f4;
    }
    @media all and (max-width:621px) {
      .mobile-header {
        padding: 20px 15px !important;
      }
      .mobile-content {
        padding: 20px 15px !important;
      }
    }
  </style>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 0;">
    <tr>
      <td bgcolor="#0FF1CE" align="center" style="padding: 30px 20px;">
        <h1 style="color: #000000; margin: 0; font-size: 28px; font-weight: 700;">SHOCKWAVE CAPITAL</h1>
      </td>
    </tr>
    <tr>
      <td bgcolor="#f4f4f4" align="center" style="padding: 20px;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
          <tr>
            <td bgcolor="#ffffff" style="padding: 40px; border-radius: 8px;">
              <h1 style="font-size: 28px; font-weight: 700; color: #0FF1CE; margin: 0 0 20px 0;">Activate Your New Gauntlet Challenge</h1>
              
              <p style="margin: 0 0 20px 0; color: #444;">Dear {{firstName}},</p>
              
              <p style="margin: 0 0 20px 0; color: #444;">
                You've shown your trading prowess. Now it's time to unlock your funded account and trade with zero restrictions.
              </p>
              
              <div style="background: linear-gradient(135deg, rgba(15, 241, 206, 0.15) 0%, rgba(15, 241, 206, 0.05) 100%); padding: 25px; border-radius: 12px; margin: 25px 0; border: 2px solid rgba(15, 241, 206, 0.3);">
                <h2 style="color: #0FF1CE; font-size: 24px; margin: 0 0 15px 0; text-align: center;">Your Funded Account Awaits</h2>
                <p style="color: #333; margin: 0; font-size: 16px; text-align: center; line-height: 1.6;">
                  Complete your activation and start trading with complete freedom. No restrictions, maximum flexibility.
                </p>
              </div>
              
              <div style="background: linear-gradient(to bottom right, rgba(15, 241, 206, 0.1) 0%, rgba(15, 241, 206, 0.05) 100%); padding: 30px; border-radius: 12px; margin: 30px 0; border: 1px solid rgba(15, 241, 206, 0.2); box-shadow: 0 0 20px rgba(15, 241, 206, 0.1);">
                <h3 style="color: #0FF1CE; font-size: 20px; margin: 0 0 20px 0; text-align: center; font-weight: bold;">NO BS Funded Account RULES</h3>
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="padding: 0;">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td width="50%" style="padding: 8px; vertical-align: top;">
                            <div style="display: flex; align-items: center;">
                              <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(15, 241, 206, 0.1); display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">
                                <span style="color: #0FF1CE; font-size: 14px;">✓</span>
                              </div>
                              <span style="color: #333; font-size: 15px;">No consistency rules</span>
                            </div>
                          </td>
                          <td width="50%" style="padding: 8px; vertical-align: top;">
                            <div style="display: flex; align-items: center;">
                              <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(15, 241, 206, 0.1); display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">
                                <span style="color: #0FF1CE; font-size: 14px;">✓</span>
                              </div>
                              <span style="color: #333; font-size: 15px;">News trading allowed</span>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" style="padding: 8px; vertical-align: top;">
                            <div style="display: flex; align-items: center;">
                              <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(15, 241, 206, 0.1); display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">
                                <span style="color: #0FF1CE; font-size: 14px;">✓</span>
                              </div>
                              <span style="color: #333; font-size: 15px;">Hold over weekends</span>
                            </div>
                          </td>
                          <td width="50%" style="padding: 8px; vertical-align: top;">
                            <div style="display: flex; align-items: center;">
                              <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(15, 241, 206, 0.1); display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">
                                <span style="color: #0FF1CE; font-size: 14px;">✓</span>
                              </div>
                              <span style="color: #333; font-size: 15px;">EAs & Bots allowed</span>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td width="50%" style="padding: 8px; vertical-align: top;">
                            <div style="display: flex; align-items: center;">
                              <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(15, 241, 206, 0.1); display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">
                                <span style="color: #0FF1CE; font-size: 14px;">✓</span>
                              </div>
                              <span style="color: #333; font-size: 15px;">No Profit Caps</span>
                            </div>
                          </td>
                          <td width="50%" style="padding: 8px; vertical-align: top;">
                            <div style="display: flex; align-items: center;">
                              <div style="width: 24px; height: 24px; border-radius: 50%; background: rgba(15, 241, 206, 0.1); display: inline-flex; align-items: center; justify-content: center; margin-right: 12px; flex-shrink: 0;">
                                <span style="color: #0FF1CE; font-size: 14px;">✓</span>
                              </div>
                              <span style="color: #333; font-size: 15px;">No Position size caps</span>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </div>
              
              <div style="text-align: center; margin: 35px 0;">
                <a href="https://shockwave-capital.com/gauntlet-activation" style="display: inline-block; background: linear-gradient(135deg, #0FF1CE 0%, #00D9FF 100%); color: #000000; padding: 18px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(15, 241, 206, 0.3);">
                  Activate Your Funded Account
                </a>
              </div>
              
              <div style="margin: 30px 0;">
                <h3 style="color: #0FF1CE; font-size: 18px; margin: 0 0 15px 0;">What You Get:</h3>
                <ul style="color: #444; line-height: 1.8; padding-left: 20px;">
                  <li>Complete trading freedom with zero restrictions</li>
                  <li>Weekend holding allowed - trade on your schedule</li>
                  <li>15% Max Drawdown - generous risk management</li>
                  <li>1:200 Leverage - maximize your potential</li>
                  <li>Fast activation - start trading within 1 hour</li>
                </ul>
              </div>
              
              <p style="margin: 25px 0 0 0; color: #444;">
                Don't miss this opportunity to trade with a funded account. Activate your challenge today and start trading with complete freedom.
              </p>
              
              <p style="margin: 25px 0 0 0; color: #444;">
                Best regards,<br>
                <strong>The Shockwave Capital Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td bgcolor="#f4f4f4" align="center" style="padding: 20px;">
        <p style="margin: 0; color: #666; font-size: 12px;">
          © ${new Date().getFullYear()} Shockwave Capital. All rights reserved.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ['firstName'],
    lastUpdated: new Date().toISOString().split('T')[0],
    isBulkTemplate: true,
    bulkSource: 'gauntlet-activation'
  },
  {
    id: 7,
    name: 'Drawdown Reset',
    subject: 'Your {{challengeType}} account is in drawdown — reset available',
    body: `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Account Drawdown Reset - Shockwave Capital</title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <style>
    body { margin: 0; padding: 0; background-color: #f4f4f4; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; }
      .mobile-pad { padding: 24px 18px !important; }
      .mobile-title { font-size: 22px !important; line-height: 28px !important; }
      .mobile-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <span style="display: none !important; font-size: 0; line-height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">Your {{challengeType}} account is in drawdown — you can reset it in a few clicks.</span>
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; margin: 0; padding: 0; background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 0;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; max-width: 600px;" class="email-container">
          <tr>
            <td align="center" bgcolor="#0FF1CE" class="mobile-pad" style="padding: 28px 24px;">
              <p style="margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; letter-spacing: 2px; color: #0D0D0D; font-weight: 700;">SHOCKWAVE CAPITAL</p>
              <p style="margin: 6px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 11px; letter-spacing: 1.5px; color: #0D0D0D;">PERSONAL ACCOUNT MANAGEMENT</p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" class="mobile-pad" style="padding: 40px 36px 16px 36px; font-family: Arial, Helvetica, sans-serif;">
              <h1 class="mobile-title" style="margin: 0 0 20px 0; font-size: 26px; line-height: 32px; color: #1a1a1a; font-weight: 700;">A quick note about your account</h1>
              <p style="margin: 0 0 18px 0; font-size: 16px; line-height: 26px; color: #333;">Hi {{firstName}},</p>
              <p style="margin: 0 0 18px 0; font-size: 16px; line-height: 26px; color: #444;">
                I wanted to reach out personally because we noticed your
                <strong style="color: #1a1a1a;">{{accountSize}} {{challengeType}}</strong>
                account is currently in drawdown.
              </p>
              <p style="margin: 0 0 8px 0; font-size: 16px; line-height: 26px; color: #444;">
                You can reset the account and start fresh whenever you're ready. The process is simple and only takes a few minutes.
              </p>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" class="mobile-pad" style="padding: 8px 36px 8px 36px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="border-collapse: collapse; background-color: #f6fffd; border: 1px solid #b7f7ea; border-radius: 12px;">
                <tr>
                  <td align="center" style="padding: 24px 20px;">
                    <p style="margin: 0 0 6px 0; font-family: Arial, Helvetica, sans-serif; font-size: 13px; letter-spacing: 1px; color: #0a8f7a; font-weight: 700;">RESET YOUR ACCOUNT</p>
                    <p style="margin: 0 0 20px 0; font-family: Arial, Helvetica, sans-serif; font-size: 15px; line-height: 22px; color: #333;">
                      Get back to trading on a clean {{challengeType}} account.
                    </p>
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="border-collapse: collapse;">
                      <tr>
                        <td align="center" bgcolor="#0FF1CE" style="border-radius: 8px;">
                          <a class="mobile-btn" href="https://www.shockwavetrading.com/gauntlet-activation" target="_blank" style="display: inline-block; font-family: Arial, Helvetica, sans-serif; font-size: 16px; font-weight: 700; color: #0D0D0D; text-decoration: none; padding: 14px 28px; border-radius: 8px;">
                            Reset Your Account
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 16px 0 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 12px; line-height: 18px; color: #777;">
                      Or copy this link:<br>
                      <a href="https://www.shockwavetrading.com/gauntlet-activation" style="color: #0a8f7a; word-break: break-all;">https://www.shockwavetrading.com/gauntlet-activation</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td bgcolor="#ffffff" class="mobile-pad" style="padding: 28px 36px 40px 36px; font-family: Arial, Helvetica, sans-serif;">
              <p style="margin: 0 0 28px 0; font-size: 16px; line-height: 26px; color: #444;">
                If you have any questions about the reset or your account, I'm here to help.
              </p>
              <p style="margin: 0; font-size: 16px; line-height: 24px; color: #1a1a1a;">
                Warm regards,<br><br>
                <strong>Emily Carter</strong><br>
                <span style="font-size: 14px; color: #666;">Personal Account Manager</span><br>
                <span style="font-size: 14px; color: #666;">Shockwave Capital</span>
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px 24px 28px 24px; font-family: Arial, Helvetica, sans-serif;">
              <p style="margin: 0; font-size: 12px; line-height: 18px; color: #888;">
                © ${new Date().getFullYear()} Shockwave Capital. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    variables: ['firstName', 'challengeType', 'accountSize'],
    lastUpdated: new Date().toISOString().split('T')[0],
    isBulkTemplate: true,
    bulkSource: 'active-accounts'
  }
];

interface TestValues {
  [key: string]: string;
}

interface Customer {
  id: string;
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  [key: string]: any;
}

function getBulkRecipientKey(recipient: { recipientKey?: string; email?: string }): string {
  return recipient.recipientKey || recipient.email || '';
}

function formatAccountChallengeType(accountType?: string, isFunded?: boolean): string {
  if (isFunded) return 'Funded';
  switch (accountType) {
    case '1-step':
      return '1-Step';
    case 'standard':
      return '2-Step';
    case 'gauntlet':
      return 'Gauntlet';
    case 'vip':
      return 'VIP';
    case 'instant':
      return 'Instant';
    default:
      return 'Challenge';
  }
}

function getMaxDrawdownLimit(accountType?: string, isFunded?: boolean): number {
  if (isFunded) return 15;
  if (accountType === '1-step') return 8;
  if (accountType === 'instant') return 4;
  return 15;
}

function formatAccountSize(accountSize: unknown): string {
  if (typeof accountSize === 'number' && !isNaN(accountSize)) {
    return `$${accountSize.toLocaleString()}`;
  }
  if (typeof accountSize === 'string' && accountSize.trim()) {
    return accountSize.startsWith('$') ? accountSize : `$${accountSize}`;
  }
  return '';
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<EmailTemplate | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [testValues, setTestValues] = useState<TestValues>({});
  
  // User selection state
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedUser, setSelectedUser] = useState<Customer | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  
  // Recent orders state
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [showRecentOrdersDropdown, setShowRecentOrdersDropdown] = useState(false);
  const [recentOrdersType, setRecentOrdersType] = useState<'crypto' | 'credit' | 'accounts'>('crypto');
  const [activeAccounts, setActiveAccounts] = useState<any[]>([]);
  
  // Bulk send state
  const [bulkRecipients, setBulkRecipients] = useState<any[]>([]);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [loadingBulkRecipients, setLoadingBulkRecipients] = useState(false);
  const [sendingBulk, setSendingBulk] = useState(false);
  const [bulkSendProgress, setBulkSendProgress] = useState({ sent: 0, total: 0, failed: 0 });
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [bulkUserSearch, setBulkUserSearch] = useState('');
  const [showBulkUserSearch, setShowBulkUserSearch] = useState(false);
  const [bulkListFilter, setBulkListFilter] = useState<'all' | 'drawdown'>('all');
  const [bulkListSearch, setBulkListSearch] = useState('');
  const preselectedRecipient = useRef(false);
  
  // Load customers on component mount
  useEffect(() => {
    loadCustomers();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.user-dropdown-container')) {
        setShowUserDropdown(false);
        setShowRecentOrdersDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Load recent orders when dropdown type changes
  useEffect(() => {
    if (showRecentOrdersDropdown) {
      loadRecentOrders();
    }
  }, [recentOrdersType, showRecentOrdersDropdown]);
  
  const loadCustomers = async () => {
    try {
      setLoadingUsers(true);
      const usersData = await getAllUsers();
  const transformedCustomers: Customer[] = usersData.map(user => ({
    id: user.uid || '',
    uid: user.uid || '',
    email: user.email || '',
    displayName: user.displayName || user.email || 'Unknown User',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    phone: user.phone || '',
    country: user.country || '',
    status: user.status || '',
    totalSpent: user.totalSpent || 0,
    orderCount: user.orderCount || 0
  }));
      setCustomers(transformedCustomers);
      if (!preselectedRecipient.current && typeof window !== 'undefined') {
        const requestedEmail = new URLSearchParams(window.location.search).get('to');
        if (requestedEmail) {
          const match = transformedCustomers.find(
            (customer) => customer.email.toLowerCase() === requestedEmail.toLowerCase()
          );
          preselectedRecipient.current = true;
          const welcome = initialTemplates.find((template) => template.name === 'Welcome Email');
          if (welcome) setCurrentTemplate(welcome);
          setIsEditing(true);
          if (match) {
            setSelectedUser(match);
            setUserSearchTerm(match.displayName || match.email || 'Unknown User');
          } else {
            setUserSearchTerm(requestedEmail);
          }
        }
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoadingUsers(false);
    }
  };
  
  // Load active accounts
  const loadActiveAccounts = async () => {
    try {
      const accounts: any[] = [];
      
      // Load user MetaAPI accounts with active status
      const accountsRef = collection(db, 'userMetaApiAccounts');
      const accountsQuery = query(accountsRef, where('status', '==', 'active'));
      const accountsSnapshot = await getDocs(accountsQuery);
      
      const userIds = new Set<string>();
      const accountsByUser: { [key: string]: any[] } = {};
      
      accountsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (isVipMetaApiAccount(data)) return;
        const userId = data.userId;
        userIds.add(userId);
        if (!accountsByUser[userId]) {
          accountsByUser[userId] = [];
        }
        accountsByUser[userId].push({
          accountType: data.accountType,
          accountSize: data.accountSize,
          platform: data.platform,
          status: data.status,
          step: data.step
        });
      });
      
      // Get user details for each account
      for (const userId of Array.from(userIds)) {
        try {
          const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', userId), limit(1)));
          if (!userDoc.empty) {
            const userData = userDoc.docs[0].data();
            const userAccounts = accountsByUser[userId] || [];
            
            userAccounts.forEach((account) => {
              accounts.push({
                id: `${userId}-${account.accountType}-${account.accountSize}`,
                email: userData.email || '',
                firstName: userData.firstName || userData.displayName?.split(' ')[0] || userData.email?.split('@')[0] || 'Unknown',
                challengeType: account.accountType === '1-step' ? '1-Step' : 
                               account.accountType === 'standard' ? 'Standard' :
                               account.accountType === 'gauntlet' ? 'Gauntlet' : 'Instant',
                challengeAmount: `$${account.accountSize.toLocaleString()}`,
                accountSize: `$${account.accountSize.toLocaleString()}`,
                platform: account.platform || 'mt5',
                type: 'account',
                status: account.status,
                step: account.step
              });
            });
          }
        } catch (error) {
          console.error(`Error loading user ${userId}:`, error);
        }
      }
      
      setActiveAccounts(accounts);
      setRecentOrders(accounts);
    } catch (error) {
      console.error('Error loading active accounts:', error);
    }
  };
  
  // Load recent orders
  const loadRecentOrders = async () => {
    try {
      if (recentOrdersType === 'accounts') {
        await loadActiveAccounts();
        return;
      }
      
      const orders: any[] = [];
      
      if (recentOrdersType === 'crypto') {
        // Load recent crypto orders
        const cryptoOrdersRef = collection(db, 'crypto-orders');
        const cryptoQuery = query(cryptoOrdersRef, orderBy('createdAt', 'desc'), limit(10));
        const cryptoSnapshot = await getDocs(cryptoQuery);
        
        cryptoSnapshot.forEach((doc) => {
          const data = doc.data();
          orders.push({
            id: doc.id,
            email: data.customerEmail || '',
            firstName: data.customerName?.split(' ')[0] || 'Unknown',
            challengeType: data.challengeType || '',
            challengeAmount: data.challengeAmount || '',
            platform: data.platform || '',
            type: 'crypto',
            createdAt: data.createdAt || null
          });
        });
      } else {
        // Load recent credit orders
        const ordersRef = collection(db, 'orders');
        const creditQuery = query(ordersRef, orderBy('createdAt', 'desc'), limit(10));
        const creditSnapshot = await getDocs(creditQuery);
        
        creditSnapshot.forEach((doc) => {
          const data = doc.data();
          orders.push({
            id: doc.id,
            email: data.customerEmail || '',
            firstName: data.firstName || 'Unknown',
            challengeType: data.challengeType || '',
            challengeAmount: data.challengeAmount || '',
            platform: data.platform || '',
            type: 'credit',
            createdAt: data.createdAt || null
          });
        });
      }
      
      setRecentOrders(orders);
    } catch (error) {
      console.error('Error loading recent orders:', error);
    }
  };
  
  const filteredTemplates = templates.filter(template => 
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.subject.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCustomers = customers.filter(customer => {
    if (!customer) return false; // Skip invalid customer objects
    
    const searchLower = userSearchTerm.toLowerCase();
    const displayNameMatch = customer.displayName ? 
      customer.displayName.toLowerCase().includes(searchLower) : false;
    const emailMatch = customer.email ? 
      customer.email.toLowerCase().includes(searchLower) : false;
    const firstNameMatch = customer.firstName ? 
      customer.firstName.toLowerCase().includes(searchLower) : false;
    const lastNameMatch = customer.lastName ? 
      customer.lastName.toLowerCase().includes(searchLower) : false;
    
    return displayNameMatch || emailMatch || firstNameMatch || lastNameMatch;
  }).slice(0, 10); // Limit to 10 results

  const handleCreateNew = () => {
    const newTemplate: EmailTemplate = {
      id: Date.now(),
      name: 'New Template',
      subject: 'New Email Subject',
      body: '<p>New Email Content</p>',
      variables: [],
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    setCurrentTemplate(newTemplate);
    setIsEditing(true);
    setShowPreview(false);
  };

  const handleEdit = (template: EmailTemplate) => {
    setCurrentTemplate(template);
    setIsEditing(true);
    setShowPreview(false);
    setEmailSent(false);
    
    // Set recentOrdersType based on template
    if (template.name === 'Passed Gauntlet Challenge' || template.name === 'Gauntlet Final Reminder') {
      setRecentOrdersType('accounts');
    } else if (template.name === 'Login Credentials') {
      setRecentOrdersType('crypto');
    }

    setBulkListFilter('all');
    setBulkListSearch('');
    
    // Initialize test values with more comprehensive defaults
    const values: Record<string, string> = {};
    template.variables.forEach((variable: string) => {
      values[variable] = variable === 'firstName' ? 'John' : 
                         variable === 'lastName' ? 'Doe' : 
                         variable === 'email' ? 'john@example.com' :
                         variable === 'displayName' ? 'John Doe' :
                         variable === 'challengeType' ? (template.bulkSource === 'active-accounts' ? '2-Step' : 'Standard Challenge') :
                         variable === 'accountSize' ? '$10,000' :
                         variable === 'orderNumber' ? 'OSK1234' :
                         variable === 'platform' ? 'MetaTrader 4' :
                         variable === 'loginId' ? '12345678' :
                         variable === 'password' ? 'TempPass123!' :
                         variable === 'server' ? 'AXI-US03-DEMO' :
                         `Sample ${variable}`;
    });
    setTestValues(values);
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates(templates.filter(template => template.id !== id));
    }
  };

  const handleSave = () => {
    if (!currentTemplate) return;
    
    const updatedTemplate: EmailTemplate = {
      ...currentTemplate,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    
    if (templates.find(t => t.id === currentTemplate.id)) {
      setTemplates(templates.map(t => t.id === currentTemplate.id ? updatedTemplate : t));
    } else {
      setTemplates([...templates, updatedTemplate]);
    }
    
    setIsEditing(false);
    setCurrentTemplate(null);
  };
  
  const handleCancel = () => {
    setIsEditing(false);
    setCurrentTemplate(null);
    setShowPreview(false);
    setEmailSent(false);
  };
  
  const handlePreview = () => {
    if (!currentTemplate) return;
    setShowPreview(!showPreview);
  };

  const handleSendEmail = async () => {
    if (!currentTemplate || !selectedUser) {
      alert('Please select a template and a user');
      return;
    }

    try {
      setSendingEmail(true);
      
      const response = await fetch('/api/send-template-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template: currentTemplate,
          user: selectedUser,
          testValues: testValues
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 3000);
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setSendingEmail(false);
    }
  };
  
  const renderPreview = () => {
    if (!currentTemplate) return null;
    
    let previewSubject = currentTemplate.subject;
    let previewBody = currentTemplate.body;
    
    // Replace variables with test values
    Object.entries(testValues).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      previewSubject = previewSubject.replace(regex, value);
      previewBody = previewBody.replace(regex, value);
    });
    
    return (
      <div className="bg-[#151515] rounded-lg p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-white font-medium mb-2">Subject</h3>
          <div className="bg-[#0D0D0D] p-3 rounded text-white border border-[#2F2F2F]">{previewSubject}</div>
        </div>
        <div>
          <h3 className="text-white font-medium mb-2">Body</h3>
          <div 
            className="bg-[#0D0D0D] p-4 rounded text-white border border-[#2F2F2F] max-h-96 overflow-y-auto"
            dangerouslySetInnerHTML={{ __html: previewBody }}
          ></div>
        </div>
      </div>
    );
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (currentTemplate) {
      setCurrentTemplate({
        ...currentTemplate,
        [name]: value
      });
    }
  };
  
  const handleVariableAdd = (variable: string) => {
    if (variable && currentTemplate && !currentTemplate.variables.includes(variable)) {
      setCurrentTemplate({
        ...currentTemplate,
        variables: [...currentTemplate.variables, variable]
      });
    }
  };

  const handleVariableRemove = (variable: string) => {
    if (currentTemplate) {
      setCurrentTemplate({
        ...currentTemplate,
        variables: currentTemplate.variables.filter((v: string) => v !== variable)
      });
      
      // Remove from test values
      const newTestValues = { ...testValues };
      delete newTestValues[variable];
      setTestValues(newTestValues);
    }
  };
  
  const handleTestValueChange = (variable: string, value: string) => {
    setTestValues({
      ...testValues,
      [variable]: value
    });
  };

  // Get dropdown options for specific variables
  const getVariableOptions = (variable: string) => {
    switch (variable) {
      case 'platform':
        return ['MetaTrader 4', 'MetaTrader 5'];
      case 'server':
        return ['AXI-US03-DEMO', 'AdmiralsGroup-DEMO', 'FusionMarkets-DEMO', 'DominionMarkets-Live'];
      default:
        return null;
    }
  };

  // Render variable input (text input or dropdown)
  const renderVariableInput = (variable: string) => {
    const options = getVariableOptions(variable);
    
    if (options) {
      return (
        <select
          value={testValues[variable] || ''}
          onChange={(e) => handleTestValueChange(variable, e.target.value)}
          className="w-full bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#0FF1CE]/50"
        >
          <option value="">Select {variable}</option>
          {options.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      );
    }
    
    return (
      <input
        type="text"
        value={testValues[variable] || ''}
        onChange={(e) => handleTestValueChange(variable, e.target.value)}
        className="w-full bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#0FF1CE]/50"
      />
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      const value = target.value.trim();
      if (value) {
        handleVariableAdd(value);
        target.value = '';
      }
    }
  };

  const handleUserSelect = (user: Customer) => {
    setSelectedUser(user);
    setShowUserDropdown(false);
    setUserSearchTerm(user.displayName || user.email || 'Unknown User');
  };

  // Load all gauntlet activation recipients
  const loadGauntletActivationRecipients = async () => {
    try {
      setLoadingBulkRecipients(true);
      const recipients: any[] = [];
      
      // Load all gauntlet activation orders from crypto-orders
      // Note: Removed orderBy to avoid requiring composite index
      const gauntletOrdersRef = collection(db, 'crypto-orders');
      const gauntletQuery = query(
        gauntletOrdersRef,
        where('challengeType', '==', 'gauntlet-activation')
      );
      const gauntletSnapshot = await getDocs(gauntletQuery);
      
      // Use a Set to track unique emails
      const seenEmails = new Set<string>();
      
      gauntletSnapshot.forEach((doc) => {
        const data = doc.data();
        const email = data.customerEmail?.toLowerCase();
        
        // Only add if we haven't seen this email before
        if (email && !seenEmails.has(email)) {
          seenEmails.add(email);
          recipients.push({
            id: doc.id,
            email: data.customerEmail || '',
            firstName: data.customerName?.split(' ')[0] || 'Valued Customer',
            lastName: data.customerName?.split(' ').slice(1).join(' ') || '',
            displayName: data.customerName || data.customerEmail || 'Valued Customer',
            accountSize: data.challengeAmount || '$10,000',
            createdAt: data.createdAt || null
          });
        }
      });
      
      // Sort recipients by createdAt in memory (most recent first)
      recipients.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setBulkRecipients(recipients);
      
      // Select all recipients by default
      const allEmails = new Set(recipients.map(r => r.email));
      setSelectedRecipients(allEmails);
      
      console.log(`Loaded ${recipients.length} unique gauntlet activation recipients`);
      return recipients;
    } catch (error) {
      console.error('Error loading gauntlet activation recipients:', error);
      alert('Failed to load recipients. Please try again.');
      return [];
    } finally {
      setLoadingBulkRecipients(false);
    }
  };

  const loadActiveAccountHolders = async () => {
    try {
      setLoadingBulkRecipients(true);
      const accountsRef = collection(db, 'userMetaApiAccounts');
      const accountsQuery = query(accountsRef, where('status', '==', 'active'));
      const accountsSnapshot = await getDocs(accountsQuery);

      const recipientResults = await Promise.all(accountsSnapshot.docs.map(async (accountDoc) => {
        const data = accountDoc.data();
        if (!data.userId || isVipMetaApiAccount(data)) return null;

        try {
          const userSnapshot = await getDocs(query(collection(db, 'users'), where('uid', '==', data.userId), limit(1)));
          if (userSnapshot.empty) return null;

          const userData = userSnapshot.docs[0].data();
          const email = (userData.email || '').trim();
          if (!email) return null;

          let metrics: { maxDrawdown?: number; maxDailyDrawdown?: number; dailyDrawdown?: number } | null = null;
          try {
            if (data.accountId) {
              metrics = await getCachedMetrics(data.accountId);
            }
          } catch (metricsError) {
            console.warn(`Could not load metrics for account ${data.accountId}:`, metricsError);
          }

          const isFunded = data.step === 3 || data.status === 'funded';
          const challengeType = formatAccountChallengeType(data.accountType, isFunded);
          const maxDrawdown = typeof metrics?.maxDrawdown === 'number' ? metrics.maxDrawdown : 0;
          const maxDrawdownLimit = getMaxDrawdownLimit(data.accountType, isFunded);
          const inDrawdown = maxDrawdown > 0;
          const drawdownBreached = maxDrawdown >= maxDrawdownLimit;

          return {
            id: accountDoc.id,
            recipientKey: accountDoc.id,
            email,
            firstName: userData.firstName || userData.displayName?.split(' ')[0] || email.split('@')[0] || 'Valued Customer',
            lastName: userData.lastName || '',
            displayName: userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || email,
            accountSize: formatAccountSize(data.accountSize),
            challengeType,
            accountType: data.accountType,
            isFunded,
            step: data.step,
            maxDrawdown,
            maxDrawdownLimit,
            inDrawdown,
            drawdownBreached,
            createdAt: data.createdAt || null
          };
        } catch (userError) {
          console.error(`Error loading user ${data.userId}:`, userError);
          return null;
        }
      }));

      const recipients = recipientResults.filter(Boolean) as any[];
      recipients.sort((a, b) => {
        if (Boolean(a.inDrawdown) !== Boolean(b.inDrawdown)) return a.inDrawdown ? -1 : 1;
        return (b.maxDrawdown || 0) - (a.maxDrawdown || 0);
      });

      setBulkRecipients(recipients);
      setSelectedRecipients(new Set(
        recipients.filter(r => r.inDrawdown).map(r => getBulkRecipientKey(r))
      ));

      console.log(`Loaded ${recipients.length} active account holders`);
      return recipients;
    } catch (error) {
      console.error('Error loading active account holders:', error);
      alert('Failed to load active accounts. Please try again.');
      return [];
    } finally {
      setLoadingBulkRecipients(false);
    }
  };

  const refreshBulkRecipients = () => {
    if (currentTemplate?.bulkSource === 'active-accounts') {
      return loadActiveAccountHolders();
    }
    return loadGauntletActivationRecipients();
  };

  // Toggle individual recipient selection
  const toggleRecipient = (key: string) => {
    const newSelected = new Set(selectedRecipients);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedRecipients(newSelected);
  };

  // Select all recipients
  const selectAllRecipients = () => {
    setSelectedRecipients(new Set(bulkRecipients.map(r => getBulkRecipientKey(r))));
  };

  const selectDrawdownRecipients = () => {
    setSelectedRecipients(new Set(
      bulkRecipients.filter(r => r.inDrawdown).map(r => getBulkRecipientKey(r))
    ));
  };

  // Deselect all recipients
  const deselectAllRecipients = () => {
    setSelectedRecipients(new Set());
  };

  // Add user from search to bulk recipients
  const addUserToBulk = (user: Customer) => {
    // Check if user already exists
    const exists = bulkRecipients.some(r => r.email === user.email);
    if (exists) {
      alert('This user is already in the recipients list');
      return;
    }

    const newRecipient = {
      id: user.uid || user.id,
      email: user.email,
      firstName: user.firstName || user.displayName?.split(' ')[0] || 'Valued Customer',
      lastName: user.lastName || user.displayName?.split(' ').slice(1).join(' ') || '',
      displayName: user.displayName || `${user.firstName} ${user.lastName}`.trim() || user.email || 'Valued Customer',
      accountSize: '$10,000', // Default account size
      challengeType: 'Challenge',
      createdAt: new Date().toISOString(),
      addedManually: true
    };

    setBulkRecipients([newRecipient, ...bulkRecipients]);
    
    // Automatically select the newly added user
    const newSelected = new Set(selectedRecipients);
    newSelected.add(newRecipient.email);
    setSelectedRecipients(newSelected);
    
    setBulkUserSearch('');
    setShowBulkUserSearch(false);
  };

  // Remove recipient from bulk list
  const removeRecipient = (key: string) => {
    setBulkRecipients(bulkRecipients.filter(r => getBulkRecipientKey(r) !== key));
    const newSelected = new Set(selectedRecipients);
    newSelected.delete(key);
    setSelectedRecipients(newSelected);
  };

  // Handle bulk send with batch processing
  const handleBulkSend = async () => {
    if (!currentTemplate || selectedRecipients.size === 0) {
      alert('No recipients selected to send to');
      return;
    }

    // Filter to only selected recipients
    const recipientsToSend = bulkRecipients.filter(r => selectedRecipients.has(getBulkRecipientKey(r)));

    try {
      setSendingBulk(true);
      setBulkSendProgress({ sent: 0, total: recipientsToSend.length, failed: 0 });

      let successCount = 0;
      let failCount = 0;

      // Send emails in batches of 10 to avoid rate limiting
      const batchSize = 10;
      for (let i = 0; i < recipientsToSend.length; i += batchSize) {
        const batch = recipientsToSend.slice(i, i + batchSize);
        
        // Send all emails in this batch concurrently
        const batchPromises = batch.map(async (recipient) => {
          try {
            const values: Record<string, string> = {
              firstName: recipient.firstName || 'Valued Customer',
              lastName: recipient.lastName || '',
              email: recipient.email,
              displayName: recipient.displayName || recipient.firstName || 'Valued Customer',
              accountSize: recipient.accountSize || '$10,000',
              challengeType: recipient.challengeType || ''
            };

            // Recipient values win over preview placeholders so bulk sends stay personalized
            const finalValues = { ...testValues, ...values };

            const response = await fetch('/api/send-template-email', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                template: currentTemplate,
                user: recipient,
                testValues: finalValues
              }),
            });

            if (!response.ok) {
              throw new Error('Failed to send email');
            }

            successCount++;
            setBulkSendProgress({ sent: successCount, total: recipientsToSend.length, failed: failCount });
            return { success: true, email: recipient.email };
          } catch (error) {
            console.error(`Failed to send to ${recipient.email}:`, error);
            failCount++;
            setBulkSendProgress({ sent: successCount, total: recipientsToSend.length, failed: failCount });
            return { success: false, email: recipient.email };
          }
        });

        // Wait for this batch to complete before moving to next
        await Promise.all(batchPromises);

        // Add a small delay between batches to be respectful of rate limits
        if (i + batchSize < recipientsToSend.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      alert(`Bulk send complete!\n\nSuccessful: ${successCount}\nFailed: ${failCount}\nTotal: ${recipientsToSend.length}`);
      setShowBulkConfirm(false);
    } catch (error) {
      console.error('Error in bulk send:', error);
      alert('Bulk send failed. Please check the console for errors.');
    } finally {
      setSendingBulk(false);
    }
  };

  // Load bulk recipients when template with bulk flag is selected
  useEffect(() => {
    if (currentTemplate?.isBulkTemplate && isEditing) {
      if (currentTemplate.bulkSource === 'active-accounts') {
        loadActiveAccountHolders();
      } else {
        loadGauntletActivationRecipients();
      }
    }
  }, [currentTemplate?.id, isEditing]);

  const isActiveAccountsBulk = currentTemplate?.bulkSource === 'active-accounts';
  const visibleBulkRecipients = bulkRecipients.filter((recipient) => {
    if (isActiveAccountsBulk && bulkListFilter === 'drawdown' && !recipient.inDrawdown) {
      return false;
    }
    if (!bulkListSearch.trim()) return true;
    const queryText = bulkListSearch.toLowerCase();
    return (
      recipient.email?.toLowerCase().includes(queryText) ||
      recipient.displayName?.toLowerCase().includes(queryText) ||
      recipient.firstName?.toLowerCase().includes(queryText) ||
      recipient.challengeType?.toLowerCase().includes(queryText)
    );
  });
  const drawdownCount = bulkRecipients.filter((r) => r.inDrawdown).length;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white mb-1">Email Templates</h1>
          <p className="text-gray-400 text-sm">Create and manage email templates</p>
        </div>
        <button 
          onClick={handleCreateNew}
          className="flex items-center gap-2 bg-[#0FF1CE] text-black px-3 md:px-4 py-2 rounded-lg font-medium hover:bg-[#0FF1CE]/90 transition-colors text-sm w-full sm:w-auto justify-center sm:justify-start flex-shrink-0"
        >
          <Plus size={14} />
          <span>New Template</span>
        </button>
      </div>

      {/* Bulk Send Section */}
      {isEditing && currentTemplate && currentTemplate.isBulkTemplate && (
        <div className={`rounded-lg p-6 mb-6 border ${
          isActiveAccountsBulk
            ? 'bg-gradient-to-br from-amber-500/10 to-red-500/5 border-amber-500/30'
            : 'bg-gradient-to-br from-[#0FF1CE]/10 to-[#0FF1CE]/5 border-[#0FF1CE]/30'
        }`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users size={24} className={isActiveAccountsBulk ? 'text-amber-400' : 'text-[#0FF1CE]'} />
              <div>
                <h3 className="text-white font-bold text-lg">Bulk Email Campaign</h3>
                <p className="text-gray-400 text-sm">
                  {isActiveAccountsBulk
                    ? 'Active account holders — drawdown accounts are highlighted'
                    : 'Send to all gauntlet activation users'}
                </p>
              </div>
            </div>
            {loadingBulkRecipients && (
              <Loader size={20} className="text-[#0FF1CE] animate-spin" />
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-4">
            <div className="bg-[#0D0D0D]/50 rounded-lg p-4 border border-[#2F2F2F]">
              <div className="text-gray-400 text-sm mb-1">Total Recipients</div>
              <div className="text-2xl font-bold text-white">{bulkRecipients.length}</div>
            </div>
            <div className="bg-[#0D0D0D]/50 rounded-lg p-4 border border-[#2F2F2F]">
              <div className="text-gray-400 text-sm mb-1">Selected</div>
              <div className="text-2xl font-bold text-[#0FF1CE]">{selectedRecipients.size}</div>
            </div>
            {isActiveAccountsBulk ? (
              <div className="bg-[#0D0D0D]/50 rounded-lg p-4 border border-[#2F2F2F]">
                <div className="text-gray-400 text-sm mb-1">In Drawdown</div>
                <div className="text-2xl font-bold text-red-400">{drawdownCount}</div>
              </div>
            ) : (
              <div className="bg-[#0D0D0D]/50 rounded-lg p-4 border border-[#2F2F2F]">
                <div className="text-gray-400 text-sm mb-1">Unique Emails</div>
                <div className="text-2xl font-bold text-white">{new Set(bulkRecipients.map(r => r.email)).size}</div>
              </div>
            )}
            <div className="bg-[#0D0D0D]/50 rounded-lg p-4 border border-[#2F2F2F]">
              <div className="text-gray-400 text-sm mb-1">Status</div>
              <div className="text-sm font-medium text-green-400">
                {loadingBulkRecipients ? 'Loading...' : 'Ready to send'}
              </div>
            </div>
          </div>

          {sendingBulk && (
            <div className="bg-[#0D0D0D]/80 rounded-lg p-4 mb-4 border border-[#0FF1CE]/50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">Sending emails...</span>
                <span className="text-[#0FF1CE] font-bold">
                  {bulkSendProgress.sent}/{bulkSendProgress.total}
                </span>
              </div>
              <div className="w-full bg-[#2F2F2F] rounded-full h-3 overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#0FF1CE] to-[#0FF1CE]/60 h-3 transition-all duration-300"
                  style={{ width: `${(bulkSendProgress.sent / bulkSendProgress.total) * 100}%` }}
                />
              </div>
              {bulkSendProgress.failed > 0 && (
                <div className="text-red-400 text-sm mt-2">
                  ⚠️ {bulkSendProgress.failed} failed
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 mb-4">
            <button
              onClick={() => setShowBulkConfirm(true)}
              disabled={sendingBulk || loadingBulkRecipients || selectedRecipients.size === 0}
              className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-[#0FF1CE] to-[#0FF1CE]/80 text-black font-bold py-3 px-6 rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={18} />
              <span>Send to {selectedRecipients.size} Selected Recipient{selectedRecipients.size !== 1 ? 's' : ''}</span>
            </button>
            <button
              onClick={refreshBulkRecipients}
              disabled={loadingBulkRecipients || sendingBulk}
              className="px-4 py-3 bg-[#151515] text-white rounded-lg hover:bg-[#2F2F2F] transition-colors disabled:opacity-50"
              title="Refresh recipients list"
            >
              <RefreshCw size={18} />
            </button>
          </div>

          {/* Recipient Management Section */}
          <div className="bg-[#0D0D0D]/50 rounded-lg p-4 border border-[#2F2F2F]">
            <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
              <h4 className="text-white font-medium">Manage Recipients</h4>
              <div className="flex gap-2 flex-wrap">
                {isActiveAccountsBulk && (
                  <button
                    onClick={selectDrawdownRecipients}
                    disabled={drawdownCount === 0}
                    className="text-xs px-3 py-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    Select In Drawdown
                  </button>
                )}
                <button
                  onClick={selectAllRecipients}
                  disabled={bulkRecipients.length === 0}
                  className="text-xs px-3 py-1.5 bg-[#0FF1CE]/20 text-[#0FF1CE] rounded hover:bg-[#0FF1CE]/30 transition-colors disabled:opacity-50"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllRecipients}
                  disabled={bulkRecipients.length === 0}
                  className="text-xs px-3 py-1.5 bg-[#2F2F2F] text-white rounded hover:bg-[#3F3F3F] transition-colors disabled:opacity-50"
                >
                  Deselect All
                </button>
                <button
                  onClick={() => setShowBulkUserSearch(!showBulkUserSearch)}
                  className="text-xs px-3 py-1.5 bg-[#151515] text-[#0FF1CE] rounded hover:bg-[#2F2F2F] transition-colors flex items-center gap-1"
                >
                  <Plus size={14} />
                  Add User
                </button>
              </div>
            </div>

            {/* User Search */}
            {showBulkUserSearch && (
              <div className="mb-4 relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search users by name or email..."
                    value={bulkUserSearch}
                    onChange={(e) => setBulkUserSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[#151515] border border-[#2F2F2F] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0FF1CE]/50"
                  />
                </div>
                
                {/* User Search Results */}
                {bulkUserSearch && (
                  <div className="absolute z-20 w-full mt-1 bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {customers
                      .filter(c => 
                        c.email?.toLowerCase().includes(bulkUserSearch.toLowerCase()) ||
                        c.displayName?.toLowerCase().includes(bulkUserSearch.toLowerCase()) ||
                        c.firstName?.toLowerCase().includes(bulkUserSearch.toLowerCase()) ||
                        c.lastName?.toLowerCase().includes(bulkUserSearch.toLowerCase())
                      )
                      .slice(0, 10)
                      .map(customer => (
                        <div
                          key={customer.id}
                          onClick={() => addUserToBulk(customer)}
                          className="p-3 hover:bg-[#2F2F2F] cursor-pointer border-b border-[#2F2F2F] last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-white font-medium text-sm">{customer.displayName || 'Unknown User'}</div>
                              <div className="text-gray-400 text-xs">{customer.email || 'No email'}</div>
                            </div>
                            <Plus size={16} className="text-[#0FF1CE]" />
                          </div>
                        </div>
                      ))}
                    {customers.filter(c => 
                      c.email?.toLowerCase().includes(bulkUserSearch.toLowerCase()) ||
                      c.displayName?.toLowerCase().includes(bulkUserSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="p-4 text-center text-gray-400 text-sm">No users found</div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isActiveAccountsBulk && (
              <div className="mb-4 flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                  <input
                    type="text"
                    placeholder="Filter by name, email, or account type..."
                    value={bulkListSearch}
                    onChange={(e) => setBulkListSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-[#151515] border border-[#2F2F2F] rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-[#0FF1CE]/50"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBulkListFilter('all')}
                    className={`text-xs px-3 py-2 rounded transition-colors ${
                      bulkListFilter === 'all' ? 'bg-[#0FF1CE] text-black' : 'bg-[#151515] text-gray-400 hover:text-white'
                    }`}
                  >
                    All Active
                  </button>
                  <button
                    onClick={() => setBulkListFilter('drawdown')}
                    className={`text-xs px-3 py-2 rounded transition-colors flex items-center gap-1 ${
                      bulkListFilter === 'drawdown' ? 'bg-red-500 text-white' : 'bg-[#151515] text-gray-400 hover:text-white'
                    }`}
                  >
                    <AlertTriangle size={12} />
                    In Drawdown ({drawdownCount})
                  </button>
                </div>
              </div>
            )}

            {/* Recipients List with Checkboxes */}
            {visibleBulkRecipients.length > 0 ? (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {visibleBulkRecipients.map((recipient) => (
                  <div
                    key={recipient.id}
                    className={`flex items-center gap-3 p-3 rounded-lg hover:bg-[#1F1F1F] transition-colors group ${
                      recipient.inDrawdown
                        ? recipient.drawdownBreached
                          ? 'bg-red-500/10 border border-red-500/40'
                          : 'bg-amber-500/10 border border-amber-500/30'
                        : 'bg-[#151515]'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecipients.has(getBulkRecipientKey(recipient))}
                      onChange={() => toggleRecipient(getBulkRecipientKey(recipient))}
                      className="w-4 h-4 rounded border-[#2F2F2F] text-[#0FF1CE] focus:ring-[#0FF1CE] focus:ring-offset-0 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="text-white font-medium text-sm truncate">
                          {recipient.displayName}
                        </div>
                        {recipient.addedManually && (
                          <span className="text-xs px-2 py-0.5 bg-[#0FF1CE]/20 text-[#0FF1CE] rounded-full">
                            Manual
                          </span>
                        )}
                        {recipient.challengeType && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            recipient.isFunded
                              ? 'bg-[#0FF1CE]/20 text-[#0FF1CE]'
                              : 'bg-[#2F2F2F] text-gray-300'
                          }`}>
                            {recipient.challengeType}
                            {recipient.accountSize ? ` · ${recipient.accountSize}` : ''}
                          </span>
                        )}
                        {recipient.inDrawdown && (
                          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            recipient.drawdownBreached
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            <AlertTriangle size={10} />
                            {recipient.drawdownBreached ? 'Breached' : 'In Drawdown'} {Number(recipient.maxDrawdown || 0).toFixed(1)}%
                          </span>
                        )}
                      </div>
                      <div className="text-gray-400 text-xs truncate">{recipient.email}</div>
                    </div>
                    <button
                      onClick={() => removeRecipient(getBulkRecipientKey(recipient))}
                      className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:bg-red-400/10 rounded transition-all"
                      title="Remove from list"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                {loadingBulkRecipients
                  ? 'Loading recipients...'
                  : isActiveAccountsBulk && bulkListFilter === 'drawdown'
                    ? 'No accounts currently in drawdown'
                    : 'No recipients loaded yet'}
              </div>
            )}
          </div>

        </div>
      )}

      {/* Bulk Send Confirmation Modal */}
      {showBulkConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D0D0D] border border-[#2F2F2F] rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Confirm Bulk Send</h3>
            <p className="text-gray-400 mb-4">
              You are about to send "<strong className="text-white">{currentTemplate?.subject}</strong>" to <strong className="text-[#0FF1CE]">{selectedRecipients.size} selected recipient{selectedRecipients.size !== 1 ? 's' : ''}</strong>.
            </p>
            {bulkRecipients.length !== selectedRecipients.size && (
              <p className="text-gray-400 text-sm mb-4">
                Note: {bulkRecipients.length - selectedRecipients.size} recipient{bulkRecipients.length - selectedRecipients.size !== 1 ? 's are' : ' is'} not selected and will be skipped.
              </p>
            )}
            <p className="text-yellow-400 text-sm mb-6">
              ⚠️ This action cannot be undone. Please make sure your email template is correct before proceeding.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowBulkConfirm(false)}
                className="flex-1 px-4 py-2 bg-[#151515] text-white rounded-lg hover:bg-[#2F2F2F] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSend}
                className="flex-1 px-4 py-2 bg-[#0FF1CE] text-black font-bold rounded-lg hover:opacity-90 transition-all"
              >
                Confirm & Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Selection Section */}
      {isEditing && currentTemplate && !currentTemplate.isBulkTemplate && (
        <div className="bg-[#151515] rounded-lg p-6 mb-6 border border-[#2F2F2F]/50">
          <div className="flex items-center gap-3 mb-4">
            <Users size={20} className="text-[#0FF1CE]" />
            <h3 className="text-white font-medium">Select User</h3>
            {(currentTemplate.name === 'Login Credentials' || currentTemplate.name === 'Passed Gauntlet Challenge' || currentTemplate.name === 'Gauntlet Final Reminder') && (
              <span className="text-sm text-gray-400">
                {currentTemplate.name === 'Login Credentials' ? '(Recent orders available)' : '(Active accounts available)'}
              </span>
            )}
          </div>
          
          <div className="flex gap-4 items-end">
            <div className="flex-1 relative user-dropdown-container">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Search and select a user to send email to
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={userSearchTerm}
                  onChange={(e) => {
                    setUserSearchTerm(e.target.value);
                    setShowUserDropdown(true);
                    setShowRecentOrdersDropdown(false);
                    if (!e.target.value) setSelectedUser(null);
                  }}
                  onFocus={() => {
                    if ((currentTemplate.name === 'Login Credentials' || currentTemplate.name === 'Passed Gauntlet Challenge' || currentTemplate.name === 'Gauntlet Final Reminder') && !userSearchTerm) {
                      setShowRecentOrdersDropdown(true);
                      setShowUserDropdown(false);
                    } else {
                      setShowUserDropdown(true);
                      setShowRecentOrdersDropdown(false);
                    }
                  }}
                  className="w-full pl-10 pr-12 py-2.5 bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0FF1CE]/50"
                />
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              </div>
              
              {/* Recent Orders/Active Accounts Dropdown */}
              {(currentTemplate.name === 'Login Credentials' || currentTemplate.name === 'Passed Gauntlet Challenge' || currentTemplate.name === 'Gauntlet Final Reminder') && showRecentOrdersDropdown && userSearchTerm === '' && (
                <div className="absolute z-10 w-full mt-1 bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg shadow-lg max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-[#2F2F2F] flex items-center justify-between sticky top-0 bg-[#0D0D0D]">
                    <span className="text-sm text-gray-400">
                      {(currentTemplate.name === 'Passed Gauntlet Challenge' || currentTemplate.name === 'Gauntlet Final Reminder') ? 'Active Accounts' : 'Recent Orders'}
                    </span>
                    <div className="flex gap-2">
                      {(currentTemplate.name === 'Passed Gauntlet Challenge' || currentTemplate.name === 'Gauntlet Final Reminder') ? (
                        <button
                          className="text-xs px-2 py-1 rounded bg-[#0FF1CE] text-black"
                        >
                          Active Accounts
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRecentOrdersType('crypto');
                            }}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              recentOrdersType === 'crypto' ? 'bg-[#0FF1CE] text-black' : 'bg-[#151515] text-gray-400 hover:text-white'
                            }`}
                          >
                            Crypto
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setRecentOrdersType('credit');
                            }}
                            className={`text-xs px-2 py-1 rounded transition-colors ${
                              recentOrdersType === 'credit' ? 'bg-[#0FF1CE] text-black' : 'bg-[#151515] text-gray-400 hover:text-white'
                            }`}
                          >
                            Credit
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {recentOrders.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">
                      {(currentTemplate.name === 'Passed Gauntlet Challenge' || currentTemplate.name === 'Gauntlet Final Reminder') ? 'No active accounts found' : 'No recent orders'}
                    </div>
                  ) : (
                    recentOrders.map((order) => (
                      <div
                        key={order.id}
                        onClick={() => {
                          setUserSearchTerm(order.email || '');
                          setShowRecentOrdersDropdown(false);
                          // Auto-populate test values with order details
                          const newTestValues: TestValues = {
                            ...testValues,
                            email: order.email || '',
                            firstName: order.firstName || 'Unknown',
                            platform: order.platform?.toLowerCase() === 'mt4' ? 'MetaTrader 4' : 
                                     order.platform?.toLowerCase() === 'mt5' ? 'MetaTrader 5' : (order.platform || 'MetaTrader 4')
                          };
                          
                          // Add accountSize for Gauntlet templates
                          if (currentTemplate.name === 'Passed Gauntlet Challenge' || currentTemplate.name === 'Gauntlet Final Reminder') {
                            newTestValues.accountSize = order.accountSize || order.challengeAmount || '$10,000';
                          }
                          
                          setTestValues(newTestValues);
                          
                          // Find and select the user
                          if (order.email) {
                            const user = customers.find(c => c.email === order.email);
                            if (user) {
                              setSelectedUser(user);
                            }
                          }
                        }}
                        className="p-3 hover:bg-[#2F2F2F] cursor-pointer border-b border-[#2F2F2F] last:border-b-0 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-white font-medium">{order.email || 'No email'}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {order.challengeType || 'Unknown'} • {order.accountSize || order.challengeAmount || '$0'} • {order.type === 'account' ? `Step ${order.step || 1}` : order.platform || 'Unknown'}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded ${
                            order.type === 'crypto' ? 'bg-yellow-500/20 text-yellow-400' : 
                            order.type === 'credit' ? 'bg-blue-500/20 text-blue-400' :
                            order.type === 'account' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {order.type === 'account' ? 'Active' : order.type}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
              
              {/* User Dropdown */}
              {showUserDropdown && userSearchTerm && (
                <div className="absolute z-10 w-full mt-1 bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {loadingUsers ? (
                    <div className="p-4 text-center text-gray-400">
                      <Loader size={16} className="animate-spin inline mr-2" />
                      Loading users...
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    filteredCustomers.map(customer => (
                      <div
                        key={customer.id}
                        onClick={() => handleUserSelect(customer)}
                        className="p-3 hover:bg-[#2F2F2F] cursor-pointer border-b border-[#2F2F2F] last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#0FF1CE]/20 rounded-full flex items-center justify-center">
                            <User size={16} className="text-[#0FF1CE]" />
                          </div>
                          <div>
                            <div className="text-white font-medium">{customer.displayName || 'Unknown User'}</div>
                            <div className="text-gray-400 text-sm">{customer.email || 'No email'}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-400">No users found</div>
                  )}
                </div>
              )}
            </div>
            
            {selectedUser && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#0FF1CE]/20 text-[#0FF1CE] rounded-lg">
                <Check size={16} />
                <span className="text-sm font-medium">Selected: {selectedUser.displayName || selectedUser.email || 'Unknown User'}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Templates List */}
        <div className={`lg:col-span-1 ${isEditing ? 'hidden lg:block' : ''}`}>
          <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-6">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input 
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#151515] border border-[#2F2F2F] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-[#0FF1CE]/50"
              />
            </div>
            
            <div className="space-y-3">
              {filteredTemplates.map(template => (
                <div 
                  key={template.id}
                  className="bg-[#151515] rounded-lg p-4 hover:border-[#0FF1CE]/30 transition-all border border-transparent cursor-pointer group"
                  onClick={() => handleEdit(template)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white font-medium group-hover:text-[#0FF1CE] transition-colors">{template.name}</h3>
                        {template.isBulkTemplate && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-[#0FF1CE]/20 text-[#0FF1CE] rounded-full border border-[#0FF1CE]/30">
                            BULK
                          </span>
                        )}
                        {template.bulkSource === 'active-accounts' && (
                          <span className="px-2 py-0.5 text-xs font-bold bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
                            DRAWDOWN
                          </span>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm truncate mb-2">{template.subject}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Updated: {template.lastUpdated}</span>
                        <span className="flex items-center gap-1">
                          <Mail size={12} />
                          {template.variables.length} variables
                        </span>
                        {template.isBulkTemplate && (
                          <span className="flex items-center gap-1 text-[#0FF1CE]">
                            <Users size={12} />
                            Bulk Send
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        className="p-1 text-gray-400 hover:text-[#0FF1CE] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(template);
                        }}
                      >
                        <Edit size={14} />
                      </button>
                      <button 
                        className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(template.id);
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredTemplates.length === 0 && (
                <div className="text-center py-8">
                  <Mail className="mx-auto text-gray-500 mb-2" size={24} />
                  <p className="text-gray-500">No templates found</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Template Editor */}
        {isEditing && currentTemplate && (
          <div className="lg:col-span-2">
            <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white">
                  {templates.find(t => t.id === currentTemplate.id) ? 'Edit Template' : 'Create New Template'}
                </h2>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={handlePreview}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#151515] text-white hover:bg-[#2F2F2F] transition-colors"
                  >
                    <Eye size={16} />
                    <span>{showPreview ? 'Edit' : 'Preview'}</span>
                  </button>
                  
                  {showPreview && selectedUser && (
                    <button 
                      onClick={handleSendEmail}
                      disabled={sendingEmail}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0FF1CE] text-black hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingEmail ? (
                        <Loader size={16} className="animate-spin" />
                      ) : emailSent ? (
                        <Check size={16} />
                      ) : (
                        <Send size={16} />
                      )}
                      <span>
                        {sendingEmail ? 'Sending...' : emailSent ? 'Sent!' : 'Send Email'}
                      </span>
                    </button>
                  )}
                  
                  <button 
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0FF1CE] text-black hover:bg-[#0FF1CE]/90 transition-colors"
                  >
                    <Save size={16} />
                    <span>Save</span>
                  </button>
                  <button 
                    onClick={handleCancel}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#151515] text-white hover:bg-[#2F2F2F] transition-colors"
                  >
                    <X size={16} />
                    <span>Cancel</span>
                  </button>
                </div>
              </div>
              
              {showPreview ? (
                <>
                  <div className="mb-6">
                    <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                      <Mail size={16} />
                      Email Preview
                      {selectedUser && (
                        <span className="text-sm text-gray-400">
                          → {selectedUser.displayName || 'Unknown User'} ({selectedUser.email || 'No email'})
                        </span>
                      )}
                    </h3>
                  {renderPreview()}
                  </div>
                  
                  <div className="bg-[#151515] rounded-lg p-6 border border-[#2F2F2F]">
                    <h3 className="text-white font-medium mb-4">Variable Values</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentTemplate.variables.map((variable: string) => (
                        <div key={variable}>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            {variable}
                            {getVariableOptions(variable) && (
                              <span className="ml-2 text-xs text-[#0FF1CE]">(dropdown)</span>
                            )}
                          </label>
                          {renderVariableInput(variable)}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Template Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={currentTemplate.name}
                      onChange={handleInputChange}
                      className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Email Subject
                    </label>
                    <input
                      type="text"
                      name="subject"
                      value={currentTemplate.subject}
                      onChange={handleInputChange}
                      className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Email Body (HTML)
                    </label>
                    <textarea
                      name="body"
                      value={currentTemplate.body}
                      onChange={handleInputChange}
                      rows={12}
                      className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#0FF1CE]/50 font-mono text-sm"
                    ></textarea>
                    <div className="text-xs text-gray-400 mt-1">
                      Use {'{{'} variableName {'}}'}  to insert dynamic content. HTML tags are supported for styling.
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Variables
                    </label>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {currentTemplate.variables.map((variable: string) => (
                        <div 
                          key={variable}
                          className="flex items-center gap-1 px-3 py-1 bg-[#0FF1CE]/20 text-[#0FF1CE] rounded-full text-sm border border-[#0FF1CE]/30"
                        >
                          <span>{variable}</span>
                          {getVariableOptions(variable) && (
                            <span className="text-xs">📋</span>
                          )}
                          <button 
                            onClick={() => handleVariableRemove(variable)}
                            className="hover:text-red-500 transition-colors ml-1"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      
                      {currentTemplate.variables.length === 0 && (
                        <div className="text-gray-500 text-sm">No variables added yet</div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Add variable name (e.g., firstName, loginId)"
                        onKeyDown={handleKeyDown}
                        className="flex-1 bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-[#0FF1CE]/50"
                      />
                      <button 
                        onClick={() => {
                          const input = document.querySelector('input[placeholder*="Add variable name"]') as HTMLInputElement;
                          if (input?.value) {
                            handleVariableAdd(input.value.trim());
                            input.value = '';
                          }
                        }}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg bg-[#151515] text-white hover:bg-[#2F2F2F] transition-colors border border-[#2F2F2F]"
                      >
                        <Plus size={14} />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Empty state when no template is selected */}
        {!isEditing && (
          <div className="lg:col-span-2 hidden lg:flex items-center justify-center">
            <div className="text-center py-12">
              <Mail className="mx-auto text-gray-500 mb-4" size={48} />
              <h3 className="text-white font-medium mb-2">Select a template to edit</h3>
              <p className="text-gray-500 mb-6">Choose from the list or create a new template to get started</p>
              <button 
                onClick={handleCreateNew}
                className="flex items-center gap-2 bg-[#0FF1CE] text-black px-6 py-3 rounded-lg font-medium hover:bg-[#0FF1CE]/90 transition-colors mx-auto"
              >
                <Plus size={18} />
                <span>Create New Template</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 