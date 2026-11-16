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

function fillTokens(input: string, tokens: Record<string, string>) {
  const keys = Object.keys(tokens).sort((left, right) => right.length - left.length);
  return keys.reduce((output, key) => output.split(`{{${key}}}`).join(tokens[key] ?? ''), input);
}

export function renderLoginCredentialsEmail(
  template: { subject: string; body: string },
  values: Record<string, string>
) {
  const raw: Record<string, string> = {};
  Object.entries(values).forEach(([key, value]) => {
    raw[key] = value == null ? '' : String(value);
  });

  const htmlValues: Record<string, string> = {};
  Object.entries(raw).forEach(([key, value]) => {
    htmlValues[key] = escapeHtml(value);
  });

  return {
    subject: fillTokens(template.subject, raw),
    html: fillTokens(template.body, htmlValues),
    raw,
  };
}

function credentialRow(label: string, token: string) {
  return `<p style="margin: 0 0 14px 0; color: #333;">
      <strong>${label}:</strong>
      <span style="font-family: Consolas, Menlo, Courier, monospace; font-weight: bold; background-color: #eee; padding: 2px 6px; border-radius: 3px; word-break: break-all; -webkit-user-select: all; user-select: all;">{{${token}}}</span>
    </p>`;
}

export function buildLoginCredentialsTemplate() {
  const year = new Date().getFullYear();
  const rows = [
    credentialRow('PLATFORM', 'platform'),
    credentialRow('LOGIN ID', 'loginId'),
    credentialRow('PASSWORD', 'password'),
    credentialRow('SERVER', 'server'),
  ].join('');

  return {
    name: 'Login Credentials',
    subject: 'Challenge Login Details - Shockwave Capital',
    variables: ['firstName', 'platform', 'loginId', 'password', 'server'],
    body: `<!-- shockwave-standalone-email -->
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background-color: #0D0D0D; padding: 20px; margin-bottom: 20px; border-radius: 5px; text-align: center;">
    <h1 style="color: #0FF1CE; margin: 0; font-size: 24px;">Your login details</h1>
  </div>

  <div style="margin-bottom: 30px;">
    <p>Hello {{firstName}},</p>
    <p>Your trading account is ready. Use the details below to sign in to {{platform}}.</p>
    <p>Press and hold a value, then choose Copy to put it on your clipboard.</p>
  </div>

  <div style="margin-bottom: 30px; background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
    <h2 style="color: #333; font-size: 18px; margin: 0 0 15px 0; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Trading Account Credentials</h2>
    ${rows}
  </div>

  <div style="margin-bottom: 30px; background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
    <h2 style="color: #333; font-size: 18px; margin: 0 0 15px 0; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Hold to copy everything</h2>
    <p style="margin: 0; font-family: Consolas, Menlo, Courier, monospace; background-color: #eee; padding: 10px; border-radius: 3px; color: #333; word-break: break-all; -webkit-user-select: all; user-select: all;">Platform: {{platform}}<br>Login ID: {{loginId}}<br>Password: {{password}}<br>Server: {{server}}</p>
  </div>

  <div style="margin-bottom: 30px;">
    <h2 style="color: #0FF1CE; font-size: 18px; margin-bottom: 15px;">Next Steps</h2>
    <div style="margin-bottom: 15px;">
      <h3 style="margin: 0 0 5px 0; color: #333;">1. Install {{platform}}</h3>
      <p style="margin: 0; color: #666;">Download the platform on your phone or computer.</p>
    </div>
    <div style="margin-bottom: 15px;">
      <h3 style="margin: 0 0 5px 0; color: #333;">2. Copy your login details</h3>
      <p style="margin: 0; color: #666;">Press and hold the login, password, or server above, then choose Copy.</p>
    </div>
    <div style="margin-bottom: 15px;">
      <h3 style="margin: 0 0 5px 0; color: #333;">3. Start trading</h3>
      <p style="margin: 0; color: #666;">Sign in, review your challenge rules, then place your first trade. You can also open your accounts at <a href="https://shockwavetrading.com/dashboard/accounts" style="color: #0FF1CE;">shockwavetrading.com</a>.</p>
    </div>
  </div>

  <div style="margin-bottom: 30px;">
    <p>If you have any questions or need assistance, please contact our support team at <a href="mailto:support@shockwave-capital.com" style="color: #0FF1CE;">support@shockwave-capital.com</a>.</p>
    <p style="margin-bottom: 0;">Best regards,</p>
    <p style="margin-top: 5px;"><strong>The Shockwave Capital Team</strong></p>
  </div>

  <div style="background-color: #0D0D0D; padding: 15px; border-radius: 5px; text-align: center; font-size: 12px; color: #999;">
    <p style="margin-bottom: 5px;">© ${year} Shockwave Capital. All rights reserved.</p>
    <p style="margin: 0;">These details are private. Don't forward this email.</p>
  </div>
</div>`,
  };
}
