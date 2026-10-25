export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function platformLabel(platform?: string) {
  const value = (platform || '').toLowerCase();
  if (value.includes('mt5') || value === '5') return 'MetaTrader 5';
  if (value.includes('mt4') || value === '4') return 'MetaTrader 4';
  return platform || 'MetaTrader 5';
}

export function buildLoginCredentialsTemplate() {
  return {
    name: 'Login Credentials',
    subject: 'Challenge Login Details - Shockwave Capital',
    variables: ['firstName', 'platform', 'loginId', 'password', 'server'],
    body: `<!DOCTYPE html>
<html lang="en">
<head>
  <title>Challenge Login Details - Shockwave Capital</title>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
              <h1 style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0 0 20px 0;">Your Trading Challenge Details</h1>
              <p style="margin: 0 0 20px 0; color: #444;">Hello {{firstName}},</p>
              <p style="margin: 0 0 25px 0; color: #444;">Welcome to Shockwave Capital! Your trading account has been set up. Below are your login credentials.</p>
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
                <tr>
                  <td colspan="2" style="background: #0FF1CE; color: #1a1a1a; font-size: 18px; font-weight: 700; text-align: center; padding: 20px;">Your Trading Account Credentials</td>
                </tr>
                <tr>
                  <td style="width: 35%; font-weight: 600; padding: 15px; border: 1px solid #E5E5E5;">Platform:</td>
                  <td style="font-family: monospace; padding: 15px; border: 1px solid #E5E5E5;">{{platform}}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; padding: 15px; border: 1px solid #E5E5E5;">Login ID:</td>
                  <td style="font-family: monospace; padding: 15px; border: 1px solid #E5E5E5;">{{loginId}}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; padding: 15px; border: 1px solid #E5E5E5;">Password:</td>
                  <td style="font-family: monospace; padding: 15px; border: 1px solid #E5E5E5;">{{password}}</td>
                </tr>
                <tr>
                  <td style="font-weight: 600; padding: 15px; border: 1px solid #E5E5E5;">Server:</td>
                  <td style="font-family: monospace; padding: 15px; border: 1px solid #E5E5E5;">{{server}}</td>
                </tr>
              </table>
              <div style="text-align: center; margin: 40px 0;">
                <a href="https://shockwave-capital.com/dashboard/accounts" style="display: inline-block; background-color: #1a1a1a; color: #0FF1CE; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">OPEN MY ACCOUNTS</a>
              </div>
              <p style="margin-top: 40px; margin-bottom: 0;">Best regards,</p>
              <p style="margin-top: 5px;"><strong>The Shockwave Capital Team</strong></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
  };
}
