'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where
} from 'firebase/firestore';
import {
  db,
  getCachedMetrics,
  getVIPActivation,
  setUserMetaApiAccount,
  Timestamp,
  UserData,
  UserMetaApiAccount
} from '../../../lib/firebase';
import {
  formatVipAllocation,
  formatVipDollars,
  getVipObjectiveAmounts,
  getVipProfitTracker,
  getVipTierName,
  normalizeVipProfitSplit,
  isVipAccountType,
  isVipMetaApiAccount,
  parseVipCustomSize,
  VIP_ACCOUNT_SIZES,
  VIP_PROFIT_SPLIT_OPTIONS,
  VIP_RULES,
  VIP_SIZE_PRESETS
} from '../../../lib/vip-accounts';
import {
  CheckCircle,
  Crown,
  DollarSign,
  Eye,
  KeyRound,
  Loader2,
  Mail,
  Plus,
  Power,
  RefreshCw,
  Search,
  Server,
  Trash2,
  X,
  XCircle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserWithVipAccount extends UserData {
  metaApiAccount: UserMetaApiAccount;
  cachedMetrics?: any;
}

interface ConnectStep1 {
  login: string;
  password: string;
  server: string;
  platform: 'mt4' | 'mt5';
  nickname: string;
}

export default function AdminVipAccountsPage() {
  const router = useRouter();
  const [accounts, setAccounts] = useState<UserWithVipAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [refreshingAccounts, setRefreshingAccounts] = useState<Set<string>>(new Set());

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [connectStep, setConnectStep] = useState<1 | 2 | 3>(1);
  const [connectingToMetaAPI, setConnectingToMetaAPI] = useState(false);
  const [connectStep1, setConnectStep1] = useState<ConnectStep1>({
    login: '',
    password: '',
    server: '',
    platform: 'mt5',
    nickname: ''
  });
  const [createdAccountId, setCreatedAccountId] = useState('');

  const [searchUserEmail, setSearchUserEmail] = useState('');
  const [searchedUser, setSearchedUser] = useState<UserData | null>(null);
  const [searchingUser, setSearchingUser] = useState(false);
  const [accountForm, setAccountForm] = useState({
    accountId: '',
    accountToken: 'main-token',
    accountSize: 1_000_000,
    customSize: '',
    useCustomSize: false,
    platform: 'mt5' as 'mt4' | 'mt5',
    status: 'active' as UserMetaApiAccount['status'],
    login: '',
    password: '',
    server: '',
    profitSplit: 80
  });
  const [sendingCredentialsEmail, setSendingCredentialsEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [credentialsAccount, setCredentialsAccount] = useState<UserWithVipAccount | null>(null);
  const [credentialForm, setCredentialForm] = useState({ login: '', password: '', server: '' });
  const [sizeAccount, setSizeAccount] = useState<UserWithVipAccount | null>(null);
  const [sizeForm, setSizeForm] = useState('');
  const [splitForm, setSplitForm] = useState('80');

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const accountsRef = collection(db, 'userMetaApiAccounts');
      const snapshot = await getDocs(accountsRef);
      const loaded = await Promise.all(snapshot.docs.map(async (accountDoc) => {
        const accountData = accountDoc.data() as UserMetaApiAccount;
        if (!isVipMetaApiAccount(accountData)) return null;
        if (!isVipAccountType(accountData.accountType)) {
          try {
            await updateDoc(accountDoc.ref, {
              accountType: 'vip',
              updatedAt: Timestamp.now()
            });
            accountData.accountType = 'vip';
          } catch (retagError) {
            console.error('Error retagging VIP account type:', retagError);
          }
        }

        const userRef = collection(db, 'users');
        const userQuery = query(userRef, where('uid', '==', accountData.userId));
        const userSnapshot = await getDocs(userQuery);
        const userData = userSnapshot.empty
          ? { uid: accountData.userId, email: 'Unknown user' } as UserData
          : userSnapshot.docs[0].data() as UserData;
        const metrics = await getCachedMetrics(accountData.accountId);

        return {
          ...userData,
          uid: userData.uid || accountData.userId,
          metaApiAccount: accountData,
          cachedMetrics: metrics
        } as UserWithVipAccount;
      }));

      setAccounts(loaded.filter(Boolean) as UserWithVipAccount[]);
    } catch (error) {
      console.error('Error loading VIP accounts:', error);
      setMessage({ type: 'error', text: 'Failed to load VIP accounts' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const filteredAccounts = useMemo(() => {
    const queryText = searchQuery.toLowerCase().trim();
    return accounts.filter((account) => {
      const matchesStatus = statusFilter === 'all' || account.metaApiAccount.status === statusFilter;
      const matchesSearch = !queryText ||
        account.email?.toLowerCase().includes(queryText) ||
        account.displayName?.toLowerCase().includes(queryText) ||
        `${account.firstName || ''} ${account.lastName || ''}`.toLowerCase().includes(queryText) ||
        account.metaApiAccount.accountId.toLowerCase().includes(queryText);
      return matchesStatus && matchesSearch;
    });
  }, [accounts, searchQuery, statusFilter]);

  const stats = {
    total: accounts.length,
    active: accounts.filter((a) => a.metaApiAccount.status === 'active').length,
    passed: accounts.filter((a) => a.metaApiAccount.status === 'passed').length,
    failed: accounts.filter((a) => a.metaApiAccount.status === 'failed').length,
    totalBalance: accounts.reduce((sum, a) => sum + (a.cachedMetrics?.balance || 0), 0)
  };

  const generateTransactionId = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const searchUserByEmail = async () => {
    if (!searchUserEmail.trim()) {
      setMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }

    setSearchingUser(true);
    setSearchedUser(null);
    try {
      const response = await fetch('/api/admin/resolve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: searchUserEmail })
      });

      if (response.status === 404) {
        setMessage({ type: 'error', text: 'No user found with this email address' });
        return;
      }
      if (!response.ok) {
        throw new Error('Failed to search for user');
      }

      const resolved = await response.json();
      const vip = await getVIPActivation(resolved.uid);
      setSearchedUser({
        uid: resolved.uid,
        email: resolved.email,
        firstName: resolved.firstName,
        lastName: resolved.lastName,
        displayName: `${resolved.firstName || ''} ${resolved.lastName || ''}`.trim()
      } as UserData);

      if (vip) {
        const inferredSize = parseVipCustomSize(vip.accountSize);
        if (inferredSize > 0) {
          const isPreset = VIP_ACCOUNT_SIZES.includes(inferredSize as typeof VIP_ACCOUNT_SIZES[number]);
          setAccountForm((prev) => ({
            ...prev,
            accountSize: isPreset ? inferredSize : prev.accountSize,
            customSize: isPreset ? '' : String(inferredSize),
            useCustomSize: !isPreset
          }));
        }
        setMessage({ type: 'success', text: `User found with VIP portal unlocked (${vip.accountSize} ${vip.tierName || ''}).` });
      } else {
        setMessage({ type: 'success', text: 'User found. They do not have a VIP portal unlock yet, but you can still attach a VIP trading account.' });
      }
    } catch (error) {
      console.error('Error searching user:', error);
      setMessage({ type: 'error', text: 'Failed to search for user' });
    } finally {
      setSearchingUser(false);
    }
  };

  const selectedAccountSize = accountForm.useCustomSize
    ? parseVipCustomSize(accountForm.customSize)
    : accountForm.accountSize;
  const selectedObjectiveAmounts = selectedAccountSize > 0
    ? getVipObjectiveAmounts(selectedAccountSize)
    : null;

  const saveVipAccount = async (
    accountId: string,
    platform: 'mt4' | 'mt5',
    credentials?: { login: string; password: string; server: string }
  ) => {
    if (!searchedUser) {
      setMessage({ type: 'error', text: 'Please search for a user first.' });
      return false;
    }
    if (!accountId) {
      setMessage({ type: 'error', text: 'Account ID is required.' });
      return false;
    }
    if (!selectedAccountSize || selectedAccountSize < 10_000) {
      setMessage({ type: 'error', text: 'Please enter a valid VIP allocation size (for example 1500000 or 1.5M).' });
      return false;
    }

    const payload: Omit<UserMetaApiAccount, 'createdAt' | 'updatedAt'> = {
      userId: searchedUser.uid,
      accountId,
      accountToken: accountForm.accountToken || 'main-token',
      accountType: 'vip',
      accountSize: Math.round(selectedAccountSize),
      profitSplit: normalizeVipProfitSplit(accountForm.profitSplit),
      platform,
      status: accountForm.status,
      step: 1,
      startDate: Timestamp.now()
    };

    if (credentials?.login && credentials.password && credentials.server) {
      payload.loginCredentials = {
        login: credentials.login,
        password: credentials.password,
        server: credentials.server
      };
    }

    await setUserMetaApiAccount(payload);
    return true;
  };

  const sendVipLoginCredentialsEmail = async ({
    user,
    platform,
    login,
    password,
    server,
    accountSize
  }: {
    user: UserData;
    platform: 'mt4' | 'mt5';
    login: string;
    password: string;
    server: string;
    accountSize: number;
  }) => {
    const loginTemplate = {
      id: Date.now(),
      name: 'Login Credentials',
      subject: 'VIP Login Details - Shockwave Capital',
      body: `<!DOCTYPE html>
<html lang="en">
<head>
  <title>VIP Login Details - Shockwave Capital</title>
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
              <h1 style="font-size: 28px; font-weight: 700; color: #1a1a1a; margin: 0 0 20px 0;">Your VIP Trading Account Details</h1>
              <p style="margin: 0 0 20px 0; color: #444;">Hello {{firstName}},</p>
              <p style="margin: 0 0 25px 0; color: #444;">Welcome to Shockwave Capital VIP. Your VIP allocation account has been set up. Below are your login credentials and setup instructions.</p>
              
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
                <tr>
                  <td colspan="2" style="background: #0FF1CE; color: #1a1a1a; font-size: 18px; font-weight: 700; text-align: center; padding: 20px; border-radius: 8px 8px 0 0;">
                    Your VIP Trading Account Credentials
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #E5E5E5;">
                  <td bgcolor="#fafafa" style="width: 35%; color: #1a1a1a; font-weight: 600; font-size: 14px; padding: 15px; border: 1px solid #E5E5E5;">
                    Platform:
                  </td>
                  <td style="color: #1a1a1a; font-weight: 600; font-family: monospace; font-size: 14px; background: rgba(15, 241, 206, 0.1); padding: 15px; border: 1px solid #E5E5E5;">
                    {{platform}}
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #E5E5E5;">
                  <td bgcolor="#fafafa" style="width: 35%; color: #1a1a1a; font-weight: 600; font-size: 14px; padding: 15px; border: 1px solid #E5E5E5;">
                    Login ID:
                  </td>
                  <td style="color: #1a1a1a; font-weight: 600; font-family: monospace; font-size: 14px; background: rgba(15, 241, 206, 0.1); padding: 15px; border: 1px solid #E5E5E5;">
                    {{loginId}}
                  </td>
                </tr>
                <tr style="border-bottom: 1px solid #E5E5E5;">
                  <td bgcolor="#fafafa" style="width: 35%; color: #1a1a1a; font-weight: 600; font-size: 14px; padding: 15px; border: 1px solid #E5E5E5;">
                    Password:
                  </td>
                  <td style="color: #1a1a1a; font-weight: 600; font-family: monospace; font-size: 14px; background: rgba(15, 241, 206, 0.1); padding: 15px; border: 1px solid #E5E5E5;">
                    {{password}}
                  </td>
                </tr>
                <tr>
                  <td bgcolor="#fafafa" style="width: 35%; color: #1a1a1a; font-weight: 600; font-size: 14px; border-radius: 0 0 0 8px; padding: 15px; border: 1px solid #E5E5E5;">
                    Server:
                  </td>
                  <td style="color: #1a1a1a; font-weight: 600; font-family: monospace; font-size: 14px; background: rgba(15, 241, 206, 0.1); border-radius: 0 0 8px 0; padding: 15px; border: 1px solid #E5E5E5;">
                    {{server}}
                  </td>
                </tr>
              </table>
              
              <div style="text-align: center; margin: 40px 0;">
                <a href="https://shockwave-capital.com/dashboard/vip/accounts" style="display: inline-block; background-color: #1a1a1a; color: #0FF1CE; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">OPEN VIP ACCOUNTS</a>
              </div>
              
              <h3 style="color: #444; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">Getting Started</h3>
              <ol style="margin: 0; padding-left: 20px; color: #444;">
                <li style="margin-bottom: 12px;">Download and install the {{platform}} trading platform</li>
                <li style="margin-bottom: 12px;">Use the credentials above to log in</li>
                <li style="margin-bottom: 12px;">You can also copy these credentials from your VIP Accounts page</li>
                <li style="margin-bottom: 12px;">Trade within the 15% max drawdown and 8% daily drawdown limits. This is a funded VIP allocation with no profit target.</li>
              </ol>
              
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
      variables: ['firstName', 'platform', 'loginId', 'password', 'server']
    };

    const testValues = {
      firstName: user.firstName || user.displayName?.split(' ')[0] || user.email.split('@')[0],
      platform: platform === 'mt5' ? 'MetaTrader 5' : 'MetaTrader 4',
      loginId: login,
      password,
      server
    };

    const response = await fetch('/api/send-template-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: loginTemplate,
        user,
        testValues
      })
    });

    if (!response.ok) {
      throw new Error('Failed to send login credentials email');
    }

    try {
      const adminNotificationBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h2 style="color: #0FF1CE;">VIP Login Credentials Sent</h2>
            <p><strong>User Email:</strong> ${user.email}</p>
            <p><strong>Name:</strong> ${user.firstName || user.displayName || 'N/A'}</p>
            <p><strong>Account Type:</strong> VIP</p>
            <p><strong>Account Size:</strong> $${accountSize.toLocaleString()}</p>
            <p><strong>Platform:</strong> ${platform.toUpperCase()}</p>
            <p><strong>Server:</strong> ${server}</p>
            <p><strong>Login ID:</strong> ${login}</p>
            <p style="margin-top: 20px; padding: 15px; background-color: #e7f5ff; border: 1px solid #bee3f8; border-radius: 5px;">
              VIP login credentials have been successfully sent to the user. The account is now ready for trading.
            </p>
          </div>
        `;

      await fetch('/api/send-template-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: {
            id: Date.now(),
            name: 'Admin Notification',
            subject: `VIP Login Credentials Sent: ${user.email}`,
            body: adminNotificationBody,
            variables: []
          },
          user: { email: 'support@shockwave-capital.com' },
          testValues: {}
        })
      });
    } catch (error) {
      console.error('Error sending admin VIP credentials notification:', error);
    }
  };

  const handleConnectStep1 = async () => {
    const { login, password, server, platform, nickname } = connectStep1;
    if (!searchedUser) {
      setMessage({ type: 'error', text: 'Please search for a user first.' });
      return;
    }
    if (!login || !password || !server || !platform || !nickname) {
      setMessage({ type: 'error', text: 'All fields are required for MetaAPI connection.' });
      return;
    }

    setConnectingToMetaAPI(true);
    setMessage({ type: 'info', text: 'Connecting to MetaAPI. Broker detection can take up to a minute...' });

    try {
      const transactionId = generateTransactionId();
      const createAccountResponse = await fetch('/api/metaapi/create-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          login,
          password,
          name: nickname,
          server,
          platform,
          magic: 0,
          keywords: ['Shockwave Capital'],
          transactionId
        })
      });

      const createAccountData = await createAccountResponse.json().catch(() => ({}));
      if (!createAccountResponse.ok) {
        throw new Error(createAccountData.error || createAccountData.message || 'Failed to create MetaAPI account');
      }

      const { accountId } = createAccountData;
      if (!accountId) {
        throw new Error(createAccountData.message || 'MetaAPI did not return an account ID. Please retry in a minute.');
      }

      if (createAccountData.warning) {
        console.warn('MetaAPI Warning:', createAccountData.warning);
      }

      setCreatedAccountId(accountId);
      setConnectStep(2);

      if (createAccountData.warning) {
        setMessage({
          type: 'success',
          text: 'Connected successfully! (Using mock data - configure METAAPI_AUTH_TOKEN for production)'
        });
      } else {
        setMessage({
          type: 'success',
          text: 'Successfully connected to MetaAPI! Now configure VIP allocation settings.'
        });
      }
    } catch (error) {
      console.error('Error connecting to MetaAPI:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setMessage({ type: 'error', text: `Failed to connect to MetaAPI: ${errorMessage}` });
    } finally {
      setConnectingToMetaAPI(false);
    }
  };

  const handleConnectStep2 = async () => {
    setSaving(true);
    try {
      const saved = await saveVipAccount(createdAccountId, connectStep1.platform, {
        login: connectStep1.login,
        password: connectStep1.password,
        server: connectStep1.server
      });
      if (!saved) return;

      setSendingCredentialsEmail(true);
      try {
        await sendVipLoginCredentialsEmail({
          user: searchedUser!,
          platform: connectStep1.platform,
          login: connectStep1.login,
          password: connectStep1.password,
          server: connectStep1.server,
          accountSize: selectedAccountSize
        });
        setEmailSent(true);
        setConnectStep(3);
        setMessage({ type: 'success', text: `VIP account created and login credentials emailed to ${searchedUser!.email}. Admin was notified.` });
      } catch (emailError) {
        console.error('Error sending VIP login emails:', emailError);
        setEmailSent(false);
        setConnectStep(3);
        setMessage({ type: 'error', text: 'VIP account was created, but sending login credentials email failed. You can resend it from the account row.' });
      } finally {
        setSendingCredentialsEmail(false);
      }
    } catch (error) {
      console.error('Error saving VIP account:', error);
      setMessage({ type: 'error', text: 'Failed to save VIP account.' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddExisting = async () => {
    setSaving(true);
    try {
      const credentials = {
        login: accountForm.login.trim(),
        password: accountForm.password,
        server: accountForm.server.trim()
      };
      const saved = await saveVipAccount(
        accountForm.accountId.trim(),
        accountForm.platform,
        credentials.login && credentials.password && credentials.server ? credentials : undefined
      );
      if (!saved) return;

      if (credentials.login && credentials.password && credentials.server && searchedUser) {
        try {
          await sendVipLoginCredentialsEmail({
            user: searchedUser,
            platform: accountForm.platform,
            login: credentials.login,
            password: credentials.password,
            server: credentials.server,
            accountSize: selectedAccountSize
          });
          setMessage({ type: 'success', text: `VIP account linked and login credentials emailed to ${searchedUser.email}.` });
        } catch (emailError) {
          console.error('Error sending VIP login emails:', emailError);
          setMessage({ type: 'error', text: 'VIP account was linked, but sending login credentials email failed.' });
        }
      } else {
        setMessage({ type: 'success', text: 'VIP account linked successfully.' });
      }

      setShowAddModal(false);
      resetModals();
      await loadAccounts();
    } catch (error) {
      console.error('Error adding VIP account:', error);
      setMessage({ type: 'error', text: 'Failed to link VIP account.' });
    } finally {
      setSaving(false);
    }
  };

  const resetModals = () => {
    setShowConnectModal(false);
    setShowAddModal(false);
    setConnectStep(1);
    setCreatedAccountId('');
    setSearchedUser(null);
    setSearchUserEmail('');
    setEmailSent(false);
    setSendingCredentialsEmail(false);
    setConnectStep1({ login: '', password: '', server: '', platform: 'mt5', nickname: '' });
    setAccountForm({
      accountId: '',
      accountToken: 'main-token',
      accountSize: 1_000_000,
      customSize: '',
      useCustomSize: false,
      platform: 'mt5',
      status: 'active',
      login: '',
      password: '',
      server: '',
      profitSplit: 80
    });
  };

  const saveExistingCredentials = async () => {
    if (!credentialsAccount) return;
    if (!credentialForm.login.trim() || !credentialForm.password || !credentialForm.server.trim()) {
      setMessage({ type: 'error', text: 'Login, password, and server are required.' });
      return;
    }

    setSaving(true);
    try {
      const docId = await findAccountDocId(credentialsAccount.uid, credentialsAccount.metaApiAccount.accountId);
      if (!docId) {
        setMessage({ type: 'error', text: 'Account not found' });
        return;
      }

      await updateDoc(doc(db, 'userMetaApiAccounts', docId), {
        accountType: 'vip',
        loginCredentials: {
          login: credentialForm.login.trim(),
          password: credentialForm.password,
          server: credentialForm.server.trim()
        },
        updatedAt: Timestamp.now()
      });

      await sendVipLoginCredentialsEmail({
        user: credentialsAccount,
        platform: credentialsAccount.metaApiAccount.platform,
        login: credentialForm.login.trim(),
        password: credentialForm.password,
        server: credentialForm.server.trim(),
        accountSize: credentialsAccount.metaApiAccount.accountSize
      });

      setCredentialsAccount(null);
      await loadAccounts();
      setMessage({ type: 'success', text: `Login details saved and emailed to ${credentialsAccount.email}.` });
    } catch (error) {
      console.error('Error saving VIP login details:', error);
      setMessage({ type: 'error', text: 'Failed to save login details or send email.' });
    } finally {
      setSaving(false);
    }
  };

  const findAccountDocId = async (userId: string, accountId: string) => {
    const accountsRef = collection(db, 'userMetaApiAccounts');
    const snapshot = await getDocs(query(accountsRef, where('userId', '==', userId), where('accountId', '==', accountId)));
    return snapshot.empty ? null : snapshot.docs[0].id;
  };

  const handleStatusChange = async (userId: string, accountId: string, status: UserMetaApiAccount['status']) => {
    if (!confirm(`Mark this VIP account as ${status}?`)) return;
    try {
      const docId = await findAccountDocId(userId, accountId);
      if (!docId) {
        setMessage({ type: 'error', text: 'Account not found' });
        return;
      }
      await updateDoc(doc(db, 'userMetaApiAccounts', docId), {
        status,
        updatedAt: Timestamp.now()
      });
      await loadAccounts();
      setMessage({ type: 'success', text: `Account marked as ${status}` });
    } catch (error) {
      console.error('Error updating VIP account:', error);
      setMessage({ type: 'error', text: 'Failed to update account status' });
    }
  };

  const handleDelete = async (userId: string, accountId: string) => {
    if (!confirm('Permanently delete this VIP account mapping? This cannot be undone.')) return;
    try {
      const docId = await findAccountDocId(userId, accountId);
      if (!docId) {
        setMessage({ type: 'error', text: 'Account not found' });
        return;
      }
      await deleteDoc(doc(db, 'userMetaApiAccounts', docId));
      try {
        await deleteDoc(doc(db, 'cachedMetrics', accountId));
      } catch {
        // Cached metrics may not exist
      }
      await loadAccounts();
      setMessage({ type: 'success', text: 'VIP account deleted' });
    } catch (error) {
      console.error('Error deleting VIP account:', error);
      setMessage({ type: 'error', text: 'Failed to delete account' });
    }
  };

  const refreshAccount = async (account: UserWithVipAccount) => {
    const { accountId, accountToken, accountSize, step, profitSplit } = account.metaApiAccount;
    setRefreshingAccounts((prev) => new Set(prev).add(accountId));
    try {
      const response = await fetch('/api/metaapi/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          accountToken,
          accountType: 'vip',
          accountSize,
          profitSplit,
          step,
          isAdmin: true
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to refresh metrics');
      }
      const updatedMetrics = await getCachedMetrics(accountId);
      setAccounts((prev) => prev.map((item) =>
        item.metaApiAccount.accountId === accountId
          ? { ...item, cachedMetrics: updatedMetrics }
          : item
      ));
      setMessage({ type: 'success', text: `Refreshed ${accountId.slice(0, 8)}...` });
    } catch (error: any) {
      setMessage({ type: 'error', text: `Failed to refresh ${accountId}${error?.message ? `: ${error.message}` : ''}` });
    } finally {
      setRefreshingAccounts((prev) => {
        const next = new Set(prev);
        next.delete(accountId);
        return next;
      });
    }
  };

  const saveExistingSize = async () => {
    if (!sizeAccount) return;
    const parsedSize = Math.round(parseVipCustomSize(sizeForm));
    if (!parsedSize || parsedSize < 10_000) {
      setMessage({ type: 'error', text: 'Please enter a valid VIP allocation size (for example 1500000 or 1.5M).' });
      return;
    }

    setSaving(true);
    try {
      const docId = await findAccountDocId(sizeAccount.uid, sizeAccount.metaApiAccount.accountId);
      if (!docId) {
        setMessage({ type: 'error', text: 'Account not found' });
        return;
      }
      await updateDoc(doc(db, 'userMetaApiAccounts', docId), {
        accountType: 'vip',
        accountSize: parsedSize,
        profitSplit: normalizeVipProfitSplit(splitForm),
        updatedAt: Timestamp.now()
      });
      const updatedAccount: UserWithVipAccount = {
        ...sizeAccount,
        metaApiAccount: {
          ...sizeAccount.metaApiAccount,
          accountSize: parsedSize,
          profitSplit: normalizeVipProfitSplit(splitForm)
        }
      };
      setSizeAccount(null);
      await loadAccounts();
      setMessage({ type: 'success', text: `Allocation updated to ${formatVipAllocation(parsedSize)}. Refreshing trackers and objectives...` });
      await refreshAccount(updatedAccount);
    } catch (error) {
      console.error('Error updating VIP allocation size:', error);
      setMessage({ type: 'error', text: 'Failed to update allocation size.' });
    } finally {
      setSaving(false);
    }
  };

  const enableFeatures = async (accountId: string) => {
    try {
      const response = await fetch('/api/metaapi/enable-features', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId })
      });
      if (!response.ok) throw new Error('Failed to enable features');
      setMessage({ type: 'success', text: `MetaStats and Risk Management enabled for ${accountId}. Wait a few minutes before refreshing.` });
    } catch (error) {
      setMessage({ type: 'error', text: `Failed to enable features for ${accountId}` });
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-white mb-1 flex items-center gap-2">
            <Crown className="w-7 h-7 text-[#0FF1CE]" />
            VIP Accounts
          </h1>
          <p className="text-gray-400 text-sm">
            Connect MetaAPI accounts for VIP customers and track live profit, their 80–100% split, 15% max drawdown, and 8% daily drawdown.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { resetModals(); setShowAddModal(true); }}
            className="px-4 py-2 bg-[#151515] border border-[#2F2F2F] text-white rounded-lg hover:border-[#0FF1CE]/40 transition-colors inline-flex items-center gap-2 text-sm"
          >
            <Server size={16} />
            Add Existing
          </button>
          <button
            onClick={() => { resetModals(); setShowConnectModal(true); }}
            className="px-4 py-2 bg-[#0FF1CE] text-black font-semibold rounded-lg hover:bg-[#0FF1CE]/90 transition-colors inline-flex items-center gap-2 text-sm"
          >
            <Plus size={16} />
            Connect VIP Account
          </button>
        </div>
      </div>

      {message.text && (
        <div className={`mb-4 p-3 rounded-lg border text-sm ${
          message.type === 'error'
            ? 'bg-red-500/10 border-red-500/30 text-red-400'
            : message.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-[#0FF1CE]/10 border-[#0FF1CE]/30 text-[#0FF1CE]'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total VIP', value: stats.total },
          { label: 'Active', value: stats.active },
          { label: 'Passed', value: stats.passed },
          { label: 'Failed', value: stats.failed }
        ].map((stat) => (
          <div key={stat.label} className="bg-[#1A1A1A] border border-[#2F2F2F] rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-1">{stat.label}</p>
            <p className="text-white text-xl font-semibold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email, name, or account ID"
            className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="inactive">Inactive</option>
          <option value="funded">Funded</option>
        </select>
        <button
          onClick={loadAccounts}
          className="px-4 py-2 bg-[#151515] border border-[#2F2F2F] text-white rounded-lg hover:border-[#0FF1CE]/40 inline-flex items-center gap-2 text-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Reload
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-[#0FF1CE] animate-spin" />
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="bg-[#1A1A1A] border border-[#2F2F2F] rounded-xl p-10 text-center">
          <Crown className="w-10 h-10 text-[#0FF1CE] mx-auto mb-3" />
          <h2 className="text-white font-semibold mb-2">No VIP trading accounts yet</h2>
          <p className="text-gray-400 text-sm mb-4">
            Connect a MetaAPI account after a VIP customer completes onboarding to start tracking live profit, profit split, and drawdown.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAccounts.map((account) => {
            const metrics = account.cachedMetrics;
            const maxDD = metrics?.maxDrawdown || 0;
            const dailyDD = metrics?.maxDailyDrawdown || metrics?.dailyDrawdown || 0;
            const isRefreshing = refreshingAccounts.has(account.metaApiAccount.accountId);
            const amounts = getVipObjectiveAmounts(account.metaApiAccount.accountSize);
            const size = account.metaApiAccount.accountSize || 1;
            const profitAmount = (metrics?.balance || size) - size;
            const profitTracker = getVipProfitTracker(profitAmount, account.metaApiAccount.profitSplit);

            return (
              <div key={account.metaApiAccount.accountId} className="bg-[#1A1A1A] border border-[#2F2F2F] rounded-xl p-4 md:p-5">
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-white font-semibold truncate">
                        {account.displayName || `${account.firstName || ''} ${account.lastName || ''}`.trim() || account.email}
                      </h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        account.metaApiAccount.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        account.metaApiAccount.status === 'passed' ? 'bg-blue-500/20 text-blue-400' :
                        account.metaApiAccount.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                        account.metaApiAccount.status === 'funded' ? 'bg-purple-500/20 text-purple-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>
                        {account.metaApiAccount.status}
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm truncate">{account.email}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      {formatVipAllocation(account.metaApiAccount.accountSize)} {getVipTierName(account.metaApiAccount.accountSize)} • {normalizeVipProfitSplit(account.metaApiAccount.profitSplit)}% split • {account.metaApiAccount.platform.toUpperCase()}
                      {account.metaApiAccount.loginCredentials?.server ? ` • ${account.metaApiAccount.loginCredentials.server}` : ''} • {account.metaApiAccount.accountId}
                    </p>
                    {metrics?.lastUpdated && (
                      <p className="text-gray-600 text-xs mt-1">
                        Updated {formatDistanceToNow(metrics.lastUpdated.toDate ? metrics.lastUpdated.toDate() : new Date(metrics.lastUpdated), { addSuffix: true })}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 lg:w-[640px]">
                    <MetricChip label="Balance" value={metrics?.balance != null ? `$${Number(metrics.balance).toLocaleString()}` : '-'} />
                    <MetricChip
                      label="Profit"
                      value={formatVipDollars(profitTracker.profit)}
                      warn={profitTracker.profit > 0}
                      danger={profitTracker.profit < 0}
                    />
                    <MetricChip
                      label={`Share (${profitTracker.profitSplit}%)`}
                      value={formatVipDollars(profitTracker.traderShare)}
                      warn={profitTracker.traderShare > 0}
                    />
                    <MetricChip
                      label={`Max DD / ${formatVipDollars(amounts.maxDrawdownAmount)}`}
                      value={`${maxDD.toFixed(2)}%`}
                      danger={maxDD > VIP_RULES.maxDrawdown}
                    />
                    <MetricChip
                      label={`Daily DD / ${formatVipDollars(amounts.dailyDrawdownAmount)}`}
                      value={`${dailyDD.toFixed(2)}%`}
                      danger={dailyDD > VIP_RULES.maxDailyDrawdown}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#2F2F2F]">
                  <button
                    onClick={() => router.push(`/admin/vip-accounts/${account.metaApiAccount.accountId}`)}
                    className="px-3 py-1.5 bg-[#0FF1CE]/10 text-[#0FF1CE] rounded-lg text-xs inline-flex items-center gap-1 hover:bg-[#0FF1CE]/20"
                  >
                    <Eye size={14} /> View
                  </button>
                  <button
                    onClick={() => refreshAccount(account)}
                    disabled={isRefreshing || account.metaApiAccount.status === 'failed'}
                    className="px-3 py-1.5 bg-[#151515] border border-[#2F2F2F] text-white rounded-lg text-xs inline-flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> Refresh
                  </button>
                  <button
                    onClick={() => {
                      setSizeAccount(account);
                      setSizeForm(String(account.metaApiAccount.accountSize || ''));
                      setSplitForm(String(normalizeVipProfitSplit(account.metaApiAccount.profitSplit)));
                    }}
                    className="px-3 py-1.5 bg-[#151515] border border-[#2F2F2F] text-white rounded-lg text-xs inline-flex items-center gap-1"
                  >
                    <DollarSign size={14} /> Size / Split
                  </button>
                  <button
                    onClick={() => enableFeatures(account.metaApiAccount.accountId)}
                    className="px-3 py-1.5 bg-[#151515] border border-[#2F2F2F] text-white rounded-lg text-xs"
                  >
                    Enable Features
                  </button>
                  <button
                    onClick={() => handleStatusChange(account.uid, account.metaApiAccount.accountId, 'passed')}
                    className="px-3 py-1.5 bg-blue-500/10 text-blue-400 rounded-lg text-xs inline-flex items-center gap-1"
                  >
                    <CheckCircle size={14} /> Pass
                  </button>
                  <button
                    onClick={() => handleStatusChange(account.uid, account.metaApiAccount.accountId, 'failed')}
                    className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs inline-flex items-center gap-1"
                  >
                    <XCircle size={14} /> Fail
                  </button>
                  <button
                    onClick={() => handleStatusChange(account.uid, account.metaApiAccount.accountId, 'inactive')}
                    className="px-3 py-1.5 bg-[#151515] border border-[#2F2F2F] text-white rounded-lg text-xs inline-flex items-center gap-1"
                  >
                    <Power size={14} /> Disconnect
                  </button>
                  <button
                    onClick={() => {
                      setCredentialsAccount(account);
                      setCredentialForm({
                        login: account.metaApiAccount.loginCredentials?.login || '',
                        password: account.metaApiAccount.loginCredentials?.password || '',
                        server: account.metaApiAccount.loginCredentials?.server || ''
                      });
                    }}
                    className="px-3 py-1.5 bg-[#151515] border border-[#2F2F2F] text-white rounded-lg text-xs inline-flex items-center gap-1"
                  >
                    <KeyRound size={14} /> Login details
                  </button>
                  <button
                    onClick={() => handleDelete(account.uid, account.metaApiAccount.accountId)}
                    className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs inline-flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {(showConnectModal || showAddModal) && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151515] border border-[#2F2F2F] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-[#2F2F2F]">
              <h2 className="text-white font-semibold">
                {showAddModal ? 'Link Existing VIP Account' : `Connect VIP Account${connectStep ? ` • Step ${connectStep}` : ''}`}
              </h2>
              <button onClick={resetModals} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {(showAddModal || connectStep >= 1) && (
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5">Customer email</label>
                  <div className="flex gap-2">
                    <input
                      value={searchUserEmail}
                      onChange={(e) => setSearchUserEmail(e.target.value)}
                      placeholder="vip.customer@email.com"
                      className="flex-1 bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm"
                    />
                    <button
                      onClick={searchUserByEmail}
                      disabled={searchingUser}
                      className="px-4 py-2 bg-[#0FF1CE] text-black rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {searchingUser ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
                    </button>
                  </div>
                  {searchedUser && (
                    <p className="text-green-400 text-xs mt-2">
                      {searchedUser.email} • {searchedUser.uid}
                    </p>
                  )}
                </div>
              )}

              {showConnectModal && connectStep === 1 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <TextField label="Broker login" value={connectStep1.login} onChange={(value) => setConnectStep1((prev) => ({ ...prev, login: value }))} />
                  <TextField label="Password" type="password" value={connectStep1.password} onChange={(value) => setConnectStep1((prev) => ({ ...prev, password: value }))} />
                  <TextField label="Server" value={connectStep1.server} onChange={(value) => setConnectStep1((prev) => ({ ...prev, server: value }))} />
                  <TextField label="Nickname" value={connectStep1.nickname} onChange={(value) => setConnectStep1((prev) => ({ ...prev, nickname: value }))} />
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Platform</label>
                    <select
                      value={connectStep1.platform}
                      onChange={(e) => setConnectStep1((prev) => ({ ...prev, platform: e.target.value as 'mt4' | 'mt5' }))}
                      className="w-full bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="mt5">MT5</option>
                      <option value="mt4">MT4</option>
                    </select>
                  </div>
                </div>
              )}

              {(showAddModal || (showConnectModal && connectStep === 2)) && (
                <>
                  {showAddModal && (
                    <>
                      <TextField label="MetaAPI Account ID" value={accountForm.accountId} onChange={(value) => setAccountForm((prev) => ({ ...prev, accountId: value }))} />
                      <div>
                        <label className="block text-xs text-gray-400 mb-1.5">Platform</label>
                        <select
                          value={accountForm.platform}
                          onChange={(e) => setAccountForm((prev) => ({ ...prev, platform: e.target.value as 'mt4' | 'mt5' }))}
                          className="w-full bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm"
                        >
                          <option value="mt5">MT5</option>
                          <option value="mt4">MT4</option>
                        </select>
                      </div>
                      <TextField label="Broker login" value={accountForm.login} onChange={(value) => setAccountForm((prev) => ({ ...prev, login: value }))} />
                      <TextField label="Password" type="password" value={accountForm.password} onChange={(value) => setAccountForm((prev) => ({ ...prev, password: value }))} />
                      <TextField label="Server" value={accountForm.server} onChange={(value) => setAccountForm((prev) => ({ ...prev, server: value }))} />
                    </>
                  )}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">VIP allocation</label>
                    <select
                      value={accountForm.useCustomSize ? 'custom' : String(accountForm.accountSize)}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setAccountForm((prev) => ({ ...prev, useCustomSize: true, customSize: prev.customSize || '' }));
                        } else {
                          setAccountForm((prev) => ({ ...prev, accountSize: Number(e.target.value), customSize: '', useCustomSize: false }));
                        }
                      }}
                      className="w-full bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm"
                    >
                      {VIP_SIZE_PRESETS.map((preset) => (
                        <option key={preset.size} value={preset.size}>
                          {preset.label} • {preset.tierName}
                        </option>
                      ))}
                      <option value="custom">Custom size</option>
                    </select>
                  </div>
                  {accountForm.useCustomSize && (
                    <TextField
                      label="Custom size"
                      value={accountForm.customSize}
                      placeholder="1500000 or 1.5M"
                      onChange={(value) => setAccountForm((prev) => ({ ...prev, customSize: value, useCustomSize: true }))}
                    />
                  )}
                  <ProfitSplitField
                    value={accountForm.profitSplit}
                    onChange={(value) => setAccountForm((prev) => ({ ...prev, profitSplit: value }))}
                  />
                  {selectedObjectiveAmounts && (
                    <div className="bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg p-3 space-y-1">
                      <p className="text-white text-xs font-medium">
                        Trackers and payout for {formatVipAllocation(selectedObjectiveAmounts.accountSize)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Max drawdown ({VIP_RULES.maxDrawdown}%): {formatVipDollars(selectedObjectiveAmounts.maxDrawdownAmount)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Daily drawdown ({VIP_RULES.maxDailyDrawdown}%): {formatVipDollars(selectedObjectiveAmounts.dailyDrawdownAmount)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Profit split: {normalizeVipProfitSplit(accountForm.profitSplit)}% trader / {100 - normalizeVipProfitSplit(accountForm.profitSplit)}% firm. No profit target.
                      </p>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-gray-400 mb-1.5">Status</label>
                    <select
                      value={accountForm.status}
                      onChange={(e) => setAccountForm((prev) => ({ ...prev, status: e.target.value as UserMetaApiAccount['status'] }))}
                      className="w-full bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="passed">Passed</option>
                      <option value="failed">Failed</option>
                      <option value="funded">Funded</option>
                    </select>
                  </div>
                  <p className="text-xs text-gray-500">
                    Each trading account is sized on its own. For a $3M split across two servers, create two accounts with custom size 1.5M. Risk trackers and objectives use that account&apos;s value, not the original $3M unlock.
                  </p>
                </>
              )}

              {showConnectModal && connectStep === 3 && (
                <div className="text-center py-4">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <p className="text-white font-medium">VIP account connected</p>
                  <p className="text-gray-400 text-sm mt-1">Account ID: {createdAccountId}</p>
                  <p className={`text-sm mt-3 ${emailSent ? 'text-green-400' : 'text-yellow-400'}`}>
                    {sendingCredentialsEmail
                      ? 'Sending login credentials email...'
                      : emailSent
                        ? 'Login credentials email sent to the user. Admin was notified.'
                        : 'Account saved. Login email still needs to be sent.'}
                  </p>
                </div>
              )}
            </div>

            <div className="p-5 border-t border-[#2F2F2F] flex justify-end gap-2">
              <button onClick={resetModals} className="px-4 py-2 text-gray-300 text-sm">
                {connectStep === 3 ? 'Close' : 'Cancel'}
              </button>
              {showAddModal && (
                <button
                  onClick={handleAddExisting}
                  disabled={saving}
                  className="px-4 py-2 bg-[#0FF1CE] text-black rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Link Account'}
                </button>
              )}
              {showConnectModal && connectStep === 1 && (
                <button
                  onClick={handleConnectStep1}
                  disabled={connectingToMetaAPI || !searchedUser}
                  className="px-4 py-2 bg-[#0FF1CE] text-black rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {connectingToMetaAPI ? 'Connecting to MetaAPI...' : 'Connect MetaAPI'}
                </button>
              )}
              {showConnectModal && connectStep === 2 && (
                <button
                  onClick={handleConnectStep2}
                  disabled={saving || sendingCredentialsEmail}
                  className="px-4 py-2 bg-[#0FF1CE] text-black rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : sendingCredentialsEmail ? 'Sending email...' : 'Create VIP Account'}
                </button>
              )}
              {showConnectModal && connectStep === 3 && (
                <button
                  onClick={async () => {
                    resetModals();
                    await loadAccounts();
                  }}
                  className="px-4 py-2 bg-[#0FF1CE] text-black rounded-lg text-sm font-semibold"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {credentialsAccount && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151515] border border-[#2F2F2F] rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-[#2F2F2F]">
              <h2 className="text-white font-semibold">VIP login details</h2>
              <button onClick={() => setCredentialsAccount(null)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-400">
                These credentials appear on the user VIP Accounts page and are emailed to {credentialsAccount.email} plus support@shockwave-capital.com.
              </p>
              <TextField label="Broker login" value={credentialForm.login} onChange={(value) => setCredentialForm((prev) => ({ ...prev, login: value }))} />
              <TextField label="Password" type="password" value={credentialForm.password} onChange={(value) => setCredentialForm((prev) => ({ ...prev, password: value }))} />
              <TextField label="Server" value={credentialForm.server} onChange={(value) => setCredentialForm((prev) => ({ ...prev, server: value }))} />
            </div>
            <div className="p-5 border-t border-[#2F2F2F] flex justify-end gap-2">
              <button onClick={() => setCredentialsAccount(null)} className="px-4 py-2 text-gray-300 text-sm">
                Cancel
              </button>
              <button
                onClick={saveExistingCredentials}
                disabled={saving}
                className="px-4 py-2 bg-[#0FF1CE] text-black rounded-lg text-sm font-semibold disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Mail size={14} />
                {saving ? 'Saving...' : 'Save and email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {sizeAccount && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#151515] border border-[#2F2F2F] rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-[#2F2F2F]">
              <h2 className="text-white font-semibold">Update VIP allocation</h2>
              <button onClick={() => setSizeAccount(null)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-xs text-gray-400">
                Use this for split allocations (for example two $1.5M accounts instead of one $3M). Trackers and objectives will be rebuilt from this size on refresh.
              </p>
              <TextField
                label="Account size"
                value={sizeForm}
                placeholder="1500000 or 1.5M"
                onChange={setSizeForm}
              />
              <ProfitSplitField
                value={Number(splitForm)}
                onChange={(value) => setSplitForm(String(value))}
              />
              {parseVipCustomSize(sizeForm) >= 10_000 && (
                <div className="bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg p-3 space-y-1">
                  <p className="text-white text-xs font-medium">
                    Trackers and payout for {formatVipAllocation(parseVipCustomSize(sizeForm))}
                  </p>
                  <p className="text-xs text-gray-400">
                    Max drawdown ({VIP_RULES.maxDrawdown}%): {formatVipDollars(getVipObjectiveAmounts(parseVipCustomSize(sizeForm)).maxDrawdownAmount)}
                  </p>
                  <p className="text-xs text-gray-400">
                    Daily drawdown ({VIP_RULES.maxDailyDrawdown}%): {formatVipDollars(getVipObjectiveAmounts(parseVipCustomSize(sizeForm)).dailyDrawdownAmount)}
                  </p>
                  <p className="text-xs text-gray-400">
                    Profit split: {normalizeVipProfitSplit(splitForm)}% trader / {100 - normalizeVipProfitSplit(splitForm)}% firm. No profit target.
                  </p>
                </div>
              )}
            </div>
            <div className="p-5 border-t border-[#2F2F2F] flex justify-end gap-2">
              <button onClick={() => setSizeAccount(null)} className="px-4 py-2 text-gray-300 text-sm">
                Cancel
              </button>
              <button
                onClick={saveExistingSize}
                disabled={saving}
                className="px-4 py-2 bg-[#0FF1CE] text-black rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save size'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricChip({
  label,
  value,
  danger,
  warn
}: {
  label: string;
  value: string;
  danger?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg p-3">
      <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-sm font-medium ${danger ? 'text-red-400' : warn ? 'text-green-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}

function ProfitSplitField({
  value,
  onChange
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">Profit split</label>
      <select
        value={normalizeVipProfitSplit(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm"
      >
        {VIP_PROFIT_SPLIT_OPTIONS.map((split) => (
          <option key={split} value={split}>
            {split}% trader / {100 - split}% firm
          </option>
        ))}
      </select>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg px-3 py-2 text-white text-sm"
      />
    </div>
  );
}
