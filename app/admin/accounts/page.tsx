'use client';

import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, orderBy, limit, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { db, getAllUsers, setUserMetaApiAccount, getUserMetaApiAccount, UserData, UserMetaApiAccount, Timestamp, getCachedMetrics } from '../../../lib/firebase';
import { isVipMetaApiAccount } from '../../../lib/vip-accounts';
import { 
  Search, 
  User, 
  Key, 
  Save, 
  AlertCircle, 
  CheckCircle,
  Server,
  Activity,
  Edit2,
  Loader2,
  XCircle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Bell,
  Download,
  Filter,
  RefreshCw,
  Power,
  Eye,
  Users,
  Target,
  BarChart,
  Shield,
  Trash2,
  X,
  Plus,
  Clock,
  Mail,
  KeyRound
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface UserWithAccount extends UserData {
  metaApiAccount?: UserMetaApiAccount;
  cachedMetrics?: any;
}

interface Alert {
  id: string;
  type: 'breach' | 'pass' | 'warning' | 'info';
  accountId: string;
  userEmail: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

interface ConnectMetaModalStep1Data {
  login: string;
  password: string;
  server: string;
  platform: 'mt4' | 'mt5';
  nickname: string;
}

interface ConnectMetaModalData {
  step1: ConnectMetaModalStep1Data;
  accountId: string;
  authToken: string;
  sendEmail?: boolean;
  emailSent?: boolean;
}

export default function AdminAccountsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [allAccounts, setAllAccounts] = useState<UserWithAccount[]>([]);
  const [filteredAccounts, setFilteredAccounts] = useState<UserWithAccount[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserWithAccount | null>(null);
  const [accountForm, setAccountForm] = useState({
    accountId: '',
    accountToken: '',
    accountType: 'standard' as 'standard' | 'instant' | '1-step' | 'gauntlet',
    accountSize: 10000,
    platform: 'mt5' as 'mt4' | 'mt5',
    status: 'active' as 'active' | 'inactive' | 'passed' | 'failed' | 'funded',
    step: 1 as 1 | 2 | 3
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [alerts, setAlerts] = useState<Alert[]>(() => {
    // Load alerts from localStorage only on client side
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('adminAlerts');
      if (stored) {
        const parsedAlerts = JSON.parse(stored) as Alert[];
        // Convert timestamp strings back to Date objects
        return parsedAlerts.map(alert => ({
          ...alert,
          timestamp: new Date(alert.timestamp)
        }));
      }
    }
    return [];
  });
  const [showAlerts, setShowAlerts] = useState(false);
  const [alertFilter, setAlertFilter] = useState<'all' | 'breach' | 'pass' | 'warning' | 'info'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('profit-high'); // Changed from 'newest' to 'profit-high'
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchUserEmail, setSearchUserEmail] = useState('');
  const [searchedUser, setSearchedUser] = useState<UserData | null>(null);
  const [allUsers, setAllUsers] = useState<UserData[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserData[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [showRecentOrdersDropdown, setShowRecentOrdersDropdown] = useState(false);
  const [recentOrdersType, setRecentOrdersType] = useState<'crypto' | 'credit'>('crypto');
  const [showEmailSendingModal, setShowEmailSendingModal] = useState(false);
  const [emailSendingStatus, setEmailSendingStatus] = useState<'sending' | 'success' | 'error'>('sending');
  const [emailSendingMessage, setEmailSendingMessage] = useState('');
  const [refreshingAccounts, setRefreshingAccounts] = useState<Set<string>>(new Set());
  const [bulkRefreshing, setBulkRefreshing] = useState(false);
  const [refreshQueue, setRefreshQueue] = useState<string[]>([]);
  const [processedAlerts, setProcessedAlerts] = useState<Set<string>>(() => {
    // Load processed alerts from localStorage only on client side
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('processedAlerts');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [connectModalStep, setConnectModalStep] = useState<1 | 2 | 3>(1);
  const [connectModalData, setConnectModalData] = useState<ConnectMetaModalData>({
    step1: {
      login: '',
      password: '',
      server: '',
      platform: 'mt5',
      nickname: ''
    },
    accountId: '',
    authToken: '',
    sendEmail: false,
    emailSent: false
  });
  const [connectingToMetaAPI, setConnectingToMetaAPI] = useState(false);
  const [sendingCredentialsEmail, setSendingCredentialsEmail] = useState(false);
  const [credentialsAccount, setCredentialsAccount] = useState<UserWithAccount | null>(null);
  const [credentialForm, setCredentialForm] = useState({ login: '', password: '', server: '' });
  const [nextAutoRefreshTime, setNextAutoRefreshTime] = useState<Date | null>(null);

  // Helper functions for Firebase auto-refresh timing
  const getAutoRefreshTime = async (): Promise<number | null> => {
    try {
      const configRef = doc(db, 'systemConfig', 'autoRefresh');
      const configDoc = await getDoc(configRef);
      
      if (configDoc.exists()) {
        const data = configDoc.data();
        return data.lastAutoRefreshTime || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting auto refresh time:', error);
      return null;
    }
  };

  const setAutoRefreshTime = async (timestamp: number) => {
    try {
      const configRef = doc(db, 'systemConfig', 'autoRefresh');
      await setDoc(configRef, {
        lastAutoRefreshTime: timestamp,
        updatedAt: Timestamp.now()
      }, { merge: true });
    } catch (error) {
      console.error('Error setting auto refresh time:', error);
    }
  };

  // Load all accounts function
  const loadAllAccounts = async () => {
    setLoading(true);
    try {
      // Query userMetaApiAccounts directly instead of loading all users
      const accountsRef = collection(db, 'userMetaApiAccounts');
      const accountsSnapshot = await getDocs(accountsRef);
      
      const accountPromises = accountsSnapshot.docs.map(async (doc) => {
        const accountData = doc.data() as UserMetaApiAccount;
        // VIP accounts are managed on /admin/vip-accounts
        if (isVipMetaApiAccount(accountData)) return null;
        
        // Get user data for this account
        const userRef = collection(db, 'users');
        const userQuery = query(userRef, where('uid', '==', accountData.userId), limit(1));
        const userSnapshot = await getDocs(userQuery);
        
        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data() as UserData;
          
          // Get cached metrics
          const metrics = await getCachedMetrics(accountData.accountId);
          
          return {
            ...userData,
            metaApiAccount: accountData,
            cachedMetrics: metrics
          };
        }
        return null;
      });
      
      const users = (await Promise.all(accountPromises)).filter(Boolean) as UserWithAccount[];
      
      setAllAccounts(users);
      setFilteredAccounts(users);
      
      // Check for alerts
      checkForAlerts(users);
    } catch (error) {
      console.error('Error loading accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load all users for search functionality
  const loadAllUsersForSearch = async () => {
    try {
      const users = await getAllUsers();
      setAllUsers(users);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  // Load recent orders
  const loadRecentOrders = async () => {
    try {
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
            email: data.customerEmail,
            challengeType: data.challengeType,
            challengeAmount: data.challengeAmount,
            platform: data.platform,
            type: 'crypto',
            createdAt: data.createdAt
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
            email: data.customerEmail,
            challengeType: data.challengeType,
            challengeAmount: data.challengeAmount,
            platform: data.platform,
            type: 'credit',
            createdAt: data.createdAt
          });
        });
      }
      
      setRecentOrders(orders);
    } catch (error) {
      console.error('Error loading recent orders:', error);
    }
  };

  // Filter users based on search input
  useEffect(() => {
    if (searchUserEmail.trim() === '') {
      setFilteredUsers([]);
    } else {
      const filtered = allUsers.filter(user => {
        if (!user || !user.email) return false; // Skip users without email
        
        const emailMatch = user.email.toLowerCase().includes(searchUserEmail.toLowerCase());
        const displayNameMatch = user.displayName ? 
          user.displayName.toLowerCase().includes(searchUserEmail.toLowerCase()) : false;
        const fullNameMatch = (user.firstName || user.lastName) ? 
          `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchUserEmail.toLowerCase()) : false;
        
        return emailMatch || displayNameMatch || fullNameMatch;
      });
      setFilteredUsers(filtered.slice(0, 10)); // Limit to 10 results
    }
  }, [searchUserEmail, allUsers]);

  // Load recent orders when dropdown type changes
  useEffect(() => {
    if (showRecentOrdersDropdown) {
      loadRecentOrders();
    }
  }, [recentOrdersType, showRecentOrdersDropdown]);

  // Load all accounts with real-time updates
  useEffect(() => {
    loadAllAccounts();
    loadAllUsersForSearch();
    
    // Clean up old processed alerts (older than 30 days)
    const cleanupOldAlerts = () => {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('processedAlerts');
        if (stored) {
          const alerts = JSON.parse(stored) as string[];
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          
          const recentAlerts = alerts.filter(alertKey => {
            // Extract timestamp from alert key if present
            const timestampMatch = alertKey.match(/-(\d+)$/);
            if (timestampMatch) {
              const timestamp = parseInt(timestampMatch[1]);
              return timestamp > thirtyDaysAgo.getTime();
            }
            return true; // Keep alerts without timestamps
          });
          
          if (recentAlerts.length !== alerts.length) {
            localStorage.setItem('processedAlerts', JSON.stringify(recentAlerts));
            setProcessedAlerts(new Set(recentAlerts));
          }
        }
      }
    };
    
    cleanupOldAlerts();
    
    // Set up real-time listener for account updates with debounce
    let reloadTimeout: NodeJS.Timeout;
    const accountsRef = collection(db, 'userMetaApiAccounts');
    const unsubscribe = onSnapshot(accountsRef, (snapshot) => {
      // Clear any pending reload
      if (reloadTimeout) clearTimeout(reloadTimeout);
      
      // Debounce the reload to prevent multiple rapid calls
      reloadTimeout = setTimeout(() => {
        const hasChanges = snapshot.docChanges().some(change => change.type === 'modified');
        if (hasChanges) {
          loadAllAccounts();
        }
      }, 1000); // Wait 1 second before reloading
    });

    return () => {
      unsubscribe();
      if (reloadTimeout) clearTimeout(reloadTimeout);
    };
  }, []);

  // Keep a ref with the latest accounts so the auto-refresh timers always see
  // fresh data without having to be torn down and recreated on every change
  const allAccountsRef = useRef<UserWithAccount[]>([]);
  useEffect(() => {
    allAccountsRef.current = allAccounts;
  }, [allAccounts]);

  // Set up automatic refresh every 12 hours.
  // Initializes once (after accounts first load) and keeps timer ids in refs so
  // they survive re-renders; timers are cleared only on unmount. The previous
  // version recreated leaked timers every time allAccounts changed.
  const autoRefreshInitialized = useRef(false);
  const autoRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  useEffect(() => {
    // Only set up auto-refresh after accounts have been loaded, and only once
    if (allAccounts.length === 0 || autoRefreshInitialized.current) return;
    autoRefreshInitialized.current = true;
    
    const twelveHours = 12 * 60 * 60 * 1000; // 12 hours in milliseconds
    
    const queueActiveAccounts = async () => {
      console.log('Auto-refreshing all active accounts...');
      const activeAccounts = allAccountsRef.current.filter(a => a.metaApiAccount?.status === 'active');
      if (activeAccounts.length > 0) {
        const accountIds = activeAccounts.map(a => a.metaApiAccount?.accountId).filter(Boolean) as string[];
        setRefreshQueue(accountIds);
        setMessage({ type: 'info', text: `Auto-refresh started for ${accountIds.length} active accounts` });
        await setAutoRefreshTime(Date.now());
      }
      setNextAutoRefreshTime(new Date(Date.now() + twelveHours));
    };
    
    const setupAutoRefresh = async () => {
      // Check last auto-refresh time from Firebase
      const lastAutoRefresh = await getAutoRefreshTime();
      const now = Date.now();
      
      // Calculate time until next refresh
      let timeUntilNextRefresh = twelveHours;
      if (lastAutoRefresh) {
        const timeSinceLastRefresh = now - lastAutoRefresh;
        if (timeSinceLastRefresh >= twelveHours) {
          // It's been 12+ hours, refresh now
          timeUntilNextRefresh = 5000; // Wait 5 seconds after page load
        } else {
          // Calculate remaining time until 12 hours
          timeUntilNextRefresh = twelveHours - timeSinceLastRefresh;
        }
      }
      
      // Calculate and set next refresh time
      setNextAutoRefreshTime(new Date(now + timeUntilNextRefresh));
      
      // Initial timeout for the first refresh, then a recurring interval
      autoRefreshTimeoutRef.current = setTimeout(async () => {
        await queueActiveAccounts();
        autoRefreshIntervalRef.current = setInterval(queueActiveAccounts, twelveHours);
      }, timeUntilNextRefresh);
    };
    
    setupAutoRefresh();
  }, [allAccounts]);
  
  // Clear auto-refresh timers on unmount only
  useEffect(() => {
    return () => {
      if (autoRefreshTimeoutRef.current) clearTimeout(autoRefreshTimeoutRef.current);
      if (autoRefreshIntervalRef.current) clearInterval(autoRefreshIntervalRef.current);
    };
  }, []);

  // Send admin notification email
  const sendAdminNotification = async (type: 'pass' | 'fail', account: UserWithAccount) => {
    if (!account.metaApiAccount) return;
    
    try {
      const response = await fetch('/api/send-challenge-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: type === 'pass' ? 'admin-pass-notification' : 'admin-fail-notification',
          email: account.email,
          name: account.displayName || `${account.firstName} ${account.lastName}`.trim() || account.email,
          challengeType: account.metaApiAccount.accountType,
          accountSize: account.metaApiAccount.accountSize,
          adminEmail: 'support@shockwave-capital.com',
          maxDrawdown: account.cachedMetrics?.maxDrawdown || 0,
          dailyDrawdown: account.cachedMetrics?.maxDailyDrawdown || account.cachedMetrics?.dailyDrawdown || 0
        })
      });
      
      if (!response.ok) {
        console.error('Failed to send admin notification');
      }
    } catch (error) {
      console.error('Error sending admin notification:', error);
    }
  };

  // Mark alert as read
  const markAlertAsRead = (alertId: string) => {
    setAlerts(prev => {
      const updated = prev.map(alert => 
        alert.id === alertId ? { ...alert, read: true } : alert
      );
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminAlerts', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Mark all alerts as read
  const markAllAlertsAsRead = () => {
    setAlerts(prev => {
      const updated = prev.map(alert => ({ ...alert, read: true }));
      if (typeof window !== 'undefined') {
        localStorage.setItem('adminAlerts', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Check for alerts function - Enhanced with risk events
  const checkForAlerts = (accounts: UserWithAccount[]) => {
    const newAlerts: Alert[] = [];
    
    accounts.forEach((account) => {
      if (!account.cachedMetrics || !account.metaApiAccount) return;
      
      const metrics = account.cachedMetrics;
      const config = account.metaApiAccount;
      
      // Create unique alert keys to prevent duplicates
      const maxDDKey = `${account.uid}-maxdd-${metrics.maxDrawdown?.toFixed(2)}`;
      const dailyDDKey = `${account.uid}-dailydd-${(metrics.maxDailyDrawdown || metrics.dailyDrawdown)?.toFixed(2)}`;
      const profitKey = `${account.uid}-profit-${((metrics.balance - config.accountSize) / config.accountSize * 100).toFixed(2)}`;
      const warningKey = `${account.uid}-warning-${metrics.maxDrawdown?.toFixed(2)}`;
      
      // Check for recent risk events (from MetaAPI Risk Management)
      if (metrics.lastRiskEvents && metrics.lastRiskEvents.length > 0) {
        metrics.lastRiskEvents.forEach((event: any) => {
          const eventKey = `${account.uid}-riskevent-${event.id}`;
          if (!processedAlerts.has(eventKey)) {
            newAlerts.push({
              id: eventKey,
              type: 'breach',
              accountId: config.accountId,
              userEmail: account.email,
              message: `Risk Event: ${event.exceededThresholdType} threshold exceeded - ${event.relativeDrawdown?.toFixed(2)}%`,
              timestamp: new Date(event.brokerTime),
              read: false
            });
            setProcessedAlerts(prev => {
              const newSet = new Set(prev).add(eventKey);
              if (typeof window !== 'undefined') {
                localStorage.setItem('processedAlerts', JSON.stringify(Array.from(newSet)));
              }
              return newSet;
            });
          }
        });
      }
      
      // Check for objective breaches
      const maxDDLimit = config.accountType === '1-step' ? 8 : 
                        config.accountType === 'instant' ? 4 : 
                        config.accountType === 'gauntlet' ? 15 :
                        config.accountType === 'standard' ? 15 : 15;
      const dailyDDLimit = config.accountType === '1-step' ? 4 :
                          config.accountType === 'instant' ? null : // No daily limit for instant
                          config.accountType === 'gauntlet' ? 8 :
                          config.accountType === 'standard' ? 8 : 8;
      
      if (metrics.maxDrawdown > maxDDLimit && !processedAlerts.has(maxDDKey)) {
        newAlerts.push({
          id: maxDDKey,
          type: 'breach',
          accountId: config.accountId,
          userEmail: account.email,
          message: `Maximum drawdown breach: ${metrics.maxDrawdown.toFixed(2)}% (limit: ${maxDDLimit}%)`,
          timestamp: new Date(),
          read: false
        });
        setProcessedAlerts(prev => {
          const newSet = new Set(prev).add(maxDDKey);
          if (typeof window !== 'undefined') {
            localStorage.setItem('processedAlerts', JSON.stringify(Array.from(newSet)));
          }
          return newSet;
        });
        
        // DISABLED: Automatic admin notification for breach
        // sendAdminNotification('fail', account);
      }
      
      // Only check daily drawdown if there's a limit
      if (dailyDDLimit !== null && (metrics.maxDailyDrawdown || metrics.dailyDrawdown) > dailyDDLimit && !processedAlerts.has(dailyDDKey)) {
        newAlerts.push({
          id: dailyDDKey,
          type: 'breach',
          accountId: config.accountId,
          userEmail: account.email,
          message: `Daily drawdown breach: ${(metrics.maxDailyDrawdown || metrics.dailyDrawdown).toFixed(2)}% (limit: ${dailyDDLimit}%)`,
          timestamp: new Date(),
          read: false
        });
        setProcessedAlerts(prev => {
          const newSet = new Set(prev).add(dailyDDKey);
          if (typeof window !== 'undefined') {
            localStorage.setItem('processedAlerts', JSON.stringify(Array.from(newSet)));
          }
          return newSet;
        });
        
        // DISABLED: Automatic admin notification for breach
        // sendAdminNotification('fail', account);
      }
      
      // Check for profit target achievement
      const profitPercent = ((metrics.balance - config.accountSize) / config.accountSize) * 100;
      const isFunded = config.step === 3 || config.status === 'funded';
      
      if (isFunded) {
        // Special checks for funded accounts
        const fundedMaxDDKey = `${account.uid}-funded-maxdd-${metrics.maxDrawdown?.toFixed(2)}`;
        const fundedRiskKey = `${account.uid}-funded-risk-${(metrics.maxDailyDrawdown || metrics.dailyDrawdown)?.toFixed(2)}`;
        
        // Check for funded account max drawdown breach (15%)
        if (metrics.maxDrawdown > 15 && !processedAlerts.has(fundedMaxDDKey)) {
          newAlerts.push({
            id: fundedMaxDDKey,
            type: 'breach',
            accountId: config.accountId,
            userEmail: account.email,
            message: `Funded account max drawdown breach: ${metrics.maxDrawdown.toFixed(2)}% (limit: 15%)`,
            timestamp: new Date(),
            read: false
          });
          setProcessedAlerts(prev => {
            const newSet = new Set(prev).add(fundedMaxDDKey);
            if (typeof window !== 'undefined') {
              localStorage.setItem('processedAlerts', JSON.stringify(Array.from(newSet)));
            }
            return newSet;
          });
        }
        
        // Check for funded account daily drawdown breach (8%)
        if ((metrics.maxDailyDrawdown || metrics.dailyDrawdown) > 8 && !processedAlerts.has(fundedRiskKey)) {
          newAlerts.push({
            id: fundedRiskKey,
            type: 'breach',
            accountId: config.accountId,
            userEmail: account.email,
            message: `Funded account daily drawdown breach: ${(metrics.maxDailyDrawdown || metrics.dailyDrawdown).toFixed(2)}% (limit: 8%)`,
            timestamp: new Date(),
            read: false
          });
          setProcessedAlerts(prev => {
            const newSet = new Set(prev).add(fundedRiskKey);
            localStorage.setItem('processedAlerts', JSON.stringify(Array.from(newSet)));
            return newSet;
          });
        }
        
        // Check for funded account risk violation (daily drawdown > 2% means risking more than 2%)
        const fundedRiskViolationKey = `${account.uid}-funded-risk-violation-${(metrics.maxDailyDrawdown || metrics.dailyDrawdown)?.toFixed(2)}`;
        if ((metrics.maxDailyDrawdown || metrics.dailyDrawdown) > 2 && (metrics.maxDailyDrawdown || metrics.dailyDrawdown) < 8 && !processedAlerts.has(fundedRiskViolationKey)) {
          newAlerts.push({
            id: fundedRiskViolationKey,
            type: 'warning',
            accountId: config.accountId,
            userEmail: account.email,
            message: `Funded account risk violation: Daily drawdown of ${(metrics.maxDailyDrawdown || metrics.dailyDrawdown).toFixed(2)}% indicates risking more than 2% (violation)`,
            timestamp: new Date(),
            read: false
          });
          setProcessedAlerts(prev => {
            const newSet = new Set(prev).add(fundedRiskViolationKey);
            localStorage.setItem('processedAlerts', JSON.stringify(Array.from(newSet)));
            return newSet;
          });
        }
        
        // Warning for approaching funded account limits
        const fundedWarningKey = `${account.uid}-funded-warning-${metrics.maxDrawdown?.toFixed(2)}`;
        if (metrics.maxDrawdown > 12 && metrics.maxDrawdown <= 15 && !processedAlerts.has(fundedWarningKey)) {
          newAlerts.push({
            id: fundedWarningKey,
            type: 'warning',
            accountId: config.accountId,
            userEmail: account.email,
            message: `Approaching funded account max drawdown limit: ${metrics.maxDrawdown.toFixed(2)}%`,
            timestamp: new Date(),
            read: false
          });
          setProcessedAlerts(prev => {
            const newSet = new Set(prev).add(fundedWarningKey);
            localStorage.setItem('processedAlerts', JSON.stringify(Array.from(newSet)));
            return newSet;
          });
        }
      } else {
        // Regular challenge account checks
        const targetProfit = config.accountType === '1-step' ? 10 :  // 1-step: 10%
                           config.accountType === 'gauntlet' ? 10 :  // Gauntlet: 10%
                           config.accountType === 'standard' 
          ? (config.step === 1 ? 10 : 5)  // Standard: Step 1 = 10%, Step 2 = 5%
          : 12;  // Instant: 12%
      
      const minTradingDays = config.accountType === 'gauntlet' ? 0 : 5;
      const currentTradingDays = metrics.tradingDays || 0;
      const hasMetTradingDays = currentTradingDays >= minTradingDays;
      
      // Check if account is at least 1 hour old to prevent false positives on new accounts
      const accountAge = config.startDate ? Date.now() - config.startDate.toDate().getTime() : 0;
      const isAccountMature = accountAge > (60 * 60 * 1000); // 1 hour in milliseconds
      
      if (profitPercent >= targetProfit && config.status === 'active' && hasMetTradingDays && isAccountMature && !processedAlerts.has(profitKey)) {
        newAlerts.push({
          id: profitKey,
          type: 'pass',
          accountId: config.accountId,
          userEmail: account.email,
          message: `Profit target achieved: ${profitPercent.toFixed(2)}%! Challenge complete - all objectives met.`,
          timestamp: new Date(),
          read: false
        });
        setProcessedAlerts(prev => {
          const newSet = new Set(prev).add(profitKey);
          if (typeof window !== 'undefined') {
            localStorage.setItem('processedAlerts', JSON.stringify(Array.from(newSet)));
          }
          return newSet;
        });
        
        // DISABLED: Automatic admin notification for pass
        // sendAdminNotification('pass', account);
      }
      
      // Warning for approaching limits - adjusted for new challenge types
      const warningThreshold = config.accountType === '1-step' ? 6 :    // 75% of 8%
                              config.accountType === 'instant' ? 3 :    // 75% of 4%
                              config.accountType === 'gauntlet' ? 12 :   // 80% of 15%
                              config.accountType === 'standard' ? 12 : 12; // 80% of 15%
      
      if (metrics.maxDrawdown > warningThreshold && 
          metrics.maxDrawdown < maxDDLimit &&
          !processedAlerts.has(warningKey)) {
        newAlerts.push({
          id: warningKey,
          type: 'warning',
          accountId: config.accountId,
          userEmail: account.email,
          message: `Approaching max drawdown limit: ${metrics.maxDrawdown.toFixed(2)}% (limit: ${maxDDLimit}%)`,
          timestamp: new Date(),
          read: false
        });
        setProcessedAlerts(prev => {
          const newSet = new Set(prev).add(warningKey);
          if (typeof window !== 'undefined') {
            localStorage.setItem('processedAlerts', JSON.stringify(Array.from(newSet)));
          }
          return newSet;
        });
        }
      }
    });
    
    if (newAlerts.length > 0) {
      setAlerts(prev => {
        // Filter out any alerts that already exist (by ID)
        const existingIds = new Set(prev.map(alert => alert.id));
        const uniqueNewAlerts = newAlerts.filter(alert => !existingIds.has(alert.id));
        
        if (uniqueNewAlerts.length === 0) return prev; // No new alerts to add
        
        const updated = [...uniqueNewAlerts, ...prev].slice(0, 50); // Keep last 50 alerts
        if (typeof window !== 'undefined') {
          localStorage.setItem('adminAlerts', JSON.stringify(updated));
        }
        return updated;
      });
    }
  };

  // Refresh single account metrics
  const refreshAccount = async (account: UserWithAccount) => {
    if (!account.metaApiAccount) return;
    
    const { accountId, accountToken, accountType, accountSize, step } = account.metaApiAccount;
    
    setRefreshingAccounts(prev => new Set(prev).add(accountId)); // Use accountId instead of uid
    
    try {
      const response = await fetch('/api/metaapi/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId,
          accountToken,
          accountType,
          accountSize,
          step, // Required so funded (step 3) accounts get funded rules, not step-1 rules
          isAdmin: true
        })
      });
      
      if (!response.ok) {
        let serverError = '';
        try {
          const errorData = await response.json();
          serverError = errorData?.error || '';
        } catch {}
        throw new Error(serverError || 'Failed to refresh metrics');
      }
      
      // Update just this account's row from the fresh cache instead of reloading
      // every account (the old full reload caused O(N^2) reads during bulk refresh)
      const updatedMetrics = await getCachedMetrics(accountId);
      setAllAccounts(prev => prev.map(a =>
        a.metaApiAccount?.accountId === accountId
          ? { ...a, cachedMetrics: updatedMetrics }
          : a
      ));
    } catch (error: any) {
      console.error('Error refreshing account:', error);
      setMessage({ type: 'error', text: `Failed to refresh account ${accountId}${error?.message ? `: ${error.message}` : ''}` });
    } finally {
      setRefreshingAccounts(prev => {
        const newSet = new Set(prev);
        newSet.delete(accountId); // Use accountId instead of uid
        return newSet;
      });
    }
  };

  // Process refresh queue
  useEffect(() => {
    const processQueue = async () => {
      if (refreshQueue.length === 0 || bulkRefreshing) return;
      
      setBulkRefreshing(true);
      const accountIdToRefresh = refreshQueue[0]; // Now this is an accountId
      const account = allAccounts.find(a => a.metaApiAccount?.accountId === accountIdToRefresh); // Find by accountId
      
      if (account) {
        await refreshAccount(account);
        // Small delay between accounts so we don't hammer MetaApi rate limits
        if (refreshQueue.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      
      const wasLastItem = refreshQueue.length === 1;
      setRefreshQueue(prev => prev.slice(1));
      setBulkRefreshing(false);
      
      // Single full reload at the end of the queue (refreshes alerts and any
      // data that changed outside the refreshed rows)
      if (wasLastItem) {
        await loadAllAccounts();
      }
    };
    
    processQueue();
  }, [refreshQueue, bulkRefreshing, allAccounts]);

  // Bulk refresh accounts
  const handleBulkRefresh = () => {
    const accountsToRefresh = selectedAccounts.length > 0 
      ? selectedAccounts // Use accountIds directly
      : filteredAccounts.filter(a => a.metaApiAccount?.status === 'active').map(a => a.metaApiAccount?.accountId).filter(Boolean) as string[];
    
    if (accountsToRefresh.length === 0) {
      setMessage({ type: 'error', text: 'No active accounts to refresh' });
      return;
    }
    
    setRefreshQueue(accountsToRefresh);
    setMessage({ type: 'info', text: `Refreshing ${accountsToRefresh.length} accounts...` });
  };

  // Filter and sort accounts
  useEffect(() => {
    let filtered = [...allAccounts];
    
    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(account => 
        account.metaApiAccount?.status === statusFilter
      );
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(account => {
        const emailMatch = account.email?.toLowerCase().includes(query);
        const accountIdMatch = account.metaApiAccount?.accountId?.toLowerCase().includes(query);
        const nameMatch = account.displayName?.toLowerCase().includes(query) || 
                         `${account.firstName} ${account.lastName}`.toLowerCase().includes(query);
        
        return emailMatch || accountIdMatch || nameMatch;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aMetrics = a.cachedMetrics;
      const bMetrics = b.cachedMetrics;
      const aConfig = a.metaApiAccount;
      const bConfig = b.metaApiAccount;

      switch(sortBy) {
        case 'newest':
          // Sort by account creation date (newest first)
          const aDate = aConfig?.startDate?.toDate ? aConfig.startDate.toDate() : new Date(0);
          const bDate = bConfig?.startDate?.toDate ? bConfig.startDate.toDate() : new Date(0);
          return bDate.getTime() - aDate.getTime();
          
        case 'oldest':
          // Sort by account creation date (oldest first)
          const aDateOld = aConfig?.startDate?.toDate ? aConfig.startDate.toDate() : new Date(0);
          const bDateOld = bConfig?.startDate?.toDate ? bConfig.startDate.toDate() : new Date(0);
          return aDateOld.getTime() - bDateOld.getTime();
          
        case 'status':
          // Sort by status: active > passed > failed > inactive
          const statusOrder = { 'active': 4, 'passed': 3, 'failed': 2, 'inactive': 1 };
          const aStatus = statusOrder[aConfig?.status as keyof typeof statusOrder] || 0;
          const bStatus = statusOrder[bConfig?.status as keyof typeof statusOrder] || 0;
          return bStatus - aStatus;
          
        case 'email-az':
          // Sort by email A-Z
          return (a.email || '').localeCompare(b.email || '');
          
        case 'email-za':
          // Sort by email Z-A
          return (b.email || '').localeCompare(a.email || '');
          
        case 'account-type':
          // Sort by account type (instant first, then standard)
          const aType = aConfig?.accountType === 'instant' ? 1 : 0;
          const bType = bConfig?.accountType === 'instant' ? 1 : 0;
          return bType - aType;
          
        case 'balance-high':
          // Sort by balance (highest first)
          return (bMetrics?.balance || 0) - (aMetrics?.balance || 0);
          
        case 'balance-low':
          // Sort by balance (lowest first)
          return (aMetrics?.balance || 0) - (bMetrics?.balance || 0);
          
        case 'drawdown-high':
          // Sort by max drawdown (highest risk first)
          return (bMetrics?.maxDrawdown || 0) - (aMetrics?.maxDrawdown || 0);
          
        case 'drawdown-low':
          // Sort by max drawdown (lowest risk first)
          return (aMetrics?.maxDrawdown || 0) - (bMetrics?.maxDrawdown || 0);
          
        case 'daily-drawdown-high':
          // Sort by daily drawdown (highest risk first)
          const aDailyDD = aMetrics?.maxDailyDrawdown || aMetrics?.dailyDrawdown || 0;
          const bDailyDD = bMetrics?.maxDailyDrawdown || bMetrics?.dailyDrawdown || 0;
          return bDailyDD - aDailyDD;
          
        case 'profit-high':
          // Sort by profit percentage (highest first)
          const aProfit = aConfig && aMetrics ? ((aMetrics.balance - aConfig.accountSize) / aConfig.accountSize * 100) : -999;
          const bProfit = bConfig && bMetrics ? ((bMetrics.balance - bConfig.accountSize) / bConfig.accountSize * 100) : -999;
          return bProfit - aProfit;
          
        case 'last-updated':
          // Sort by last metrics update (most recent first)
          const aUpdated = aMetrics?.lastUpdated?.toDate ? aMetrics.lastUpdated.toDate() : new Date(0);
          const bUpdated = bMetrics?.lastUpdated?.toDate ? bMetrics.lastUpdated.toDate() : new Date(0);
          return bUpdated.getTime() - aUpdated.getTime();
          
        case 'account-size':
          // Sort by account size (largest first)
          return (bConfig?.accountSize || 0) - (aConfig?.accountSize || 0);
          
        default:
          return 0;
      }
    });
    
    setFilteredAccounts(filtered);
  }, [allAccounts, statusFilter, searchQuery, sortBy]); // Add sortBy to dependencies

  // Handle account disconnect
  const handleDisconnect = async (userId: string, accountId: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;
    
    try {
      // Find the specific account document by userId AND accountId
      const accountsRef = collection(db, 'userMetaApiAccounts');
      const q = query(
        accountsRef, 
        where('userId', '==', userId),
        where('accountId', '==', accountId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        const accountRef = doc(db, 'userMetaApiAccounts', docId);
        await updateDoc(accountRef, {
          status: 'inactive',
          updatedAt: Timestamp.now()
        });
        
        setMessage({ type: 'success', text: 'Account disconnected successfully' });
        
        // Reload accounts after update
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to ensure update is processed
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: 'Account not found' });
      }
    } catch (error) {
      console.error('Error disconnecting account:', error);
      setMessage({ type: 'error', text: 'Failed to disconnect account' });
    }
  };

  // Handle account fail
  const handleFail = async (userId: string, accountId: string) => {
    if (!confirm('Are you sure you want to mark this account as failed?')) return;
    
    try {
      // Find the specific account document by userId AND accountId
      const accountsRef = collection(db, 'userMetaApiAccounts');
      const q = query(
        accountsRef, 
        where('userId', '==', userId),
        where('accountId', '==', accountId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        const accountRef = doc(db, 'userMetaApiAccounts', docId);
        await updateDoc(accountRef, {
          status: 'failed',
          updatedAt: Timestamp.now()
        });
        
        setMessage({ type: 'success', text: 'Account marked as failed' });
        
        // Reload accounts after update
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay to ensure update is processed
        window.location.reload();
      } else {
        setMessage({ type: 'error', text: 'Account not found' });
      }
    } catch (error) {
      console.error('Error updating account:', error);
      setMessage({ type: 'error', text: 'Failed to update account status' });
    }
  };

  // Handle account delete
  const handleDelete = async (userId: string, accountId: string) => {
    if (!confirm('Are you sure you want to permanently delete this account? This action cannot be undone.')) return;
    
    try {
      // Find the specific account document by userId AND accountId
      const accountsRef = collection(db, 'userMetaApiAccounts');
      const q = query(
        accountsRef, 
        where('userId', '==', userId),
        where('accountId', '==', accountId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const docId = querySnapshot.docs[0].id;
        
        // Delete the account document
        await deleteDoc(doc(db, 'userMetaApiAccounts', docId));
        
        // Also delete the cached metrics if they exist
        try {
          await deleteDoc(doc(db, 'cachedMetrics', accountId));
        } catch (err) {
          // Ignore if cached metrics don't exist
          console.log('No cached metrics to delete');
        }
        
        setMessage({ type: 'success', text: 'Account deleted successfully' });
        
        // Reload accounts after deletion
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        setMessage({ type: 'error', text: 'Account not found' });
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      setMessage({ type: 'error', text: 'Failed to delete account' });
    }
  };

  // Bulk actions
  const handleBulkDisconnect = async () => {
    if (selectedAccounts.length === 0) return;
    if (!confirm(`Disconnect ${selectedAccounts.length} accounts?`)) return;
    
    try {
      const accountsRef = collection(db, 'userMetaApiAccounts');
      
      for (const accountId of selectedAccounts) {
        // Find the specific account document by accountId
        const q = query(accountsRef, where('accountId', '==', accountId));
        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          const docId = querySnapshot.docs[0].id;
          const accountRef = doc(db, 'userMetaApiAccounts', docId);
          await updateDoc(accountRef, {
            status: 'inactive',
            updatedAt: Timestamp.now()
          });
        }
      }
      
      setSelectedAccounts([]);
      setMessage({ type: 'success', text: `${selectedAccounts.length} accounts disconnected` });
      
      // Reload accounts after updates
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('Error in bulk disconnect:', error);
      setMessage({ type: 'error', text: 'Failed to disconnect some accounts' });
    }
  };

  // Export accounts data
  const handleExport = () => {
    const data = filteredAccounts.map(account => ({
      email: account.email,
      accountId: account.metaApiAccount?.accountId,
      status: account.metaApiAccount?.status,
      accountType: account.metaApiAccount?.accountType,
      accountSize: account.metaApiAccount?.accountSize,
      balance: account.cachedMetrics?.balance,
      equity: account.cachedMetrics?.equity,
      maxDrawdown: account.cachedMetrics?.maxDrawdown,
      dailyDrawdown: account.cachedMetrics?.dailyDrawdown,
      maxDailyDrawdown: account.cachedMetrics?.maxDailyDrawdown || account.cachedMetrics?.dailyDrawdown,
      profitFactor: account.cachedMetrics?.profitFactor,
      winRate: account.cachedMetrics?.winRate,
      trades: account.cachedMetrics?.numberOfTrades
    }));
    
    const csv = [
      Object.keys(data[0]).join(','),
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `accounts_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  // Search for user by email
  const searchUserByEmail = async () => {
    if (!searchUserEmail || searchUserEmail.trim() === '') {
      setMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }

    setLoading(true);
    setSearchedUser(null);
    
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', searchUserEmail.toLowerCase().trim()));
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const userData = snapshot.docs[0].data() as UserData;
        
        // Validate user data has required fields
        if (!userData.uid) {
          setMessage({ type: 'error', text: 'Invalid user data: missing user ID' });
          return;
        }
        
        // Check how many active accounts this user has
        const accountsRef = collection(db, 'userMetaApiAccounts');
        const accountQuery = query(
          accountsRef, 
          where('userId', '==', userData.uid),
          where('status', 'in', ['active', 'inactive']) // Don't count failed/passed accounts
        );
        const accountSnapshot = await getDocs(accountQuery);
        const challengeAccountCount = accountSnapshot.docs.filter(
          (accountDoc) => !isVipMetaApiAccount(accountDoc.data() as UserMetaApiAccount)
        ).length;
        
        if (challengeAccountCount >= 5) {
          setMessage({ type: 'error', text: 'This user already has 5 active challenge accounts (maximum allowed)' });
          setSearchedUser(null);
        } else {
          setSearchedUser(userData);
          const remainingSlots = 5 - challengeAccountCount;
          setMessage({ 
            type: 'success', 
            text: `User found! They have ${challengeAccountCount} active account(s) and can add ${remainingSlots} more.` 
          });
        }
      } else {
        setMessage({ type: 'error', text: 'No user found with this email address' });
      }
    } catch (error) {
      console.error('Error searching for user:', error);
      setMessage({ type: 'error', text: 'Failed to search for user' });
    } finally {
      setLoading(false);
    }
  };

  // Save MetaAPI account configuration
  const handleSaveAccount = async () => {
    if (!selectedUser) return;
    
    if (!accountForm.accountId || !accountForm.accountToken) {
      setMessage({ type: 'error', text: 'Account ID and Token are required.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      await setUserMetaApiAccount({
        userId: selectedUser.uid,
        accountId: accountForm.accountId,
        accountToken: accountForm.accountToken,
        accountType: accountForm.accountType,
        accountSize: accountForm.accountSize,
        platform: accountForm.platform,
        status: accountForm.status,
        step: accountForm.step,
        startDate: selectedUser.metaApiAccount?.startDate || Timestamp.now(),
        ...(selectedUser.metaApiAccount?.loginCredentials
          ? { loginCredentials: selectedUser.metaApiAccount.loginCredentials }
          : {})
      });

      setMessage({ type: 'success', text: 'Account configuration saved successfully!' });
      setShowEditModal(false);
      
      // Reload accounts
      window.location.reload();
    } catch (error) {
      console.error('Error saving account:', error);
      setMessage({ type: 'error', text: 'Failed to save account configuration.' });
    } finally {
      setSaving(false);
    }
  };

  const accountSizes = [5000, 10000, 25000, 50000, 100000, 200000];

  // Account sizes based on type
  const standardAccountSizes = [5000, 10000, 25000, 50000, 100000, 200000, 500000];
  const instantAccountSizes = [25000, 50000, 100000];
  const oneStepAccountSizes = [5000, 10000, 25000, 50000, 100000, 200000, 500000]; // Same sizes as standard
  const gauntletAccountSizes = [10000, 25000, 50000, 100000, 200000]; // Gauntlet specific sizes
  
  const getAccountSizes = (accountType: 'standard' | 'instant' | '1-step' | 'gauntlet' | 'funded') => {
    if (accountType === 'funded') return standardAccountSizes; // Funded uses standard sizes
    if (accountType === '1-step') return oneStepAccountSizes;
    if (accountType === 'gauntlet') return gauntletAccountSizes;
    return accountType === 'standard' ? standardAccountSizes : instantAccountSizes;
  };

  // Calculate overview statistics
  const stats = {
    total: allAccounts.length,
    active: allAccounts.filter(a => a.metaApiAccount?.status === 'active').length,
    passed: allAccounts.filter(a => a.metaApiAccount?.status === 'passed').length,
    failed: allAccounts.filter(a => a.metaApiAccount?.status === 'failed').length,
    funded: allAccounts.filter(a => a.metaApiAccount?.status === 'funded').length,
    totalBalance: allAccounts.reduce((sum, a) => sum + (a.cachedMetrics?.balance || 0), 0),
    totalEquity: allAccounts.reduce((sum, a) => sum + (a.cachedMetrics?.equity || 0), 0)
  };

  // Wrapper function for sending emails with loading modal
  const sendEmailWithModal = async (emailFunction: () => Promise<void>, emailType: string) => {
    setShowEmailSendingModal(true);
    setEmailSendingStatus('sending');
    setEmailSendingMessage(`Sending ${emailType}...`);
    
    try {
      await emailFunction();
      setEmailSendingStatus('success');
      setEmailSendingMessage(`${emailType} sent successfully!`);
      setTimeout(() => {
        setShowEmailSendingModal(false);
      }, 2000);
    } catch (error) {
      setEmailSendingStatus('error');
      setEmailSendingMessage(`Failed to send ${emailType}. Please try again.`);
      setTimeout(() => {
        setShowEmailSendingModal(false);
      }, 3000);
    }
  };

  // Send challenge pass email
  const sendPassEmail = async (account: UserWithAccount) => {
    if (!account.metaApiAccount) return;
    
    const { accountType, step, accountSize } = account.metaApiAccount;
    const isStandard = accountType === 'standard';
    const stepText = isStandard ? (step === 1 ? 'Step 1' : 'Step 2') : 'Instant Challenge';
    
      const response = await fetch('/api/send-challenge-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'pass',
          email: account.email,
          name: account.displayName || `${account.firstName} ${account.lastName}`.trim() || account.email,
          challengeType: accountType,
          step: stepText,
          accountSize,
          adminEmail: 'support@shockwave-capital.com'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      
      setMessage({ type: 'success', text: `Pass email sent to ${account.email}` });
  };

  // Send challenge fail email
  const sendFailEmail = async (account: UserWithAccount) => {
    if (!account.metaApiAccount) return;
    
    const { accountType, accountSize } = account.metaApiAccount;
    const metrics = account.cachedMetrics;
    
    // Determine breach type based on challenge type
    let breachType = '';
    let maxDDLimit: number;
    let dailyDDLimit: number | null;
    
    if (accountType === '1-step') {
      maxDDLimit = 8;
      dailyDDLimit = 4;
    } else if (accountType === 'instant') {
      maxDDLimit = 4;
      dailyDDLimit = null; // No daily limit for instant
    } else {
      // Standard challenge
      maxDDLimit = 15;
      dailyDDLimit = 8;
    }
    
    const maxDDBreached = metrics?.maxDrawdown > maxDDLimit;
    const dailyDDBreached = dailyDDLimit !== null && (metrics?.maxDailyDrawdown || metrics?.dailyDrawdown) > dailyDDLimit;
    
    if (maxDDBreached && dailyDDBreached) {
      breachType = 'both';
    } else if (maxDDBreached) {
      breachType = 'maxDrawdown';
    } else if (dailyDDBreached) {
      breachType = 'dailyDrawdown';
    }
    
      const response = await fetch('/api/send-challenge-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'fail',
          email: account.email,
          name: account.displayName || `${account.firstName} ${account.lastName}`.trim() || account.email,
          challengeType: accountType,
          accountSize,
          breachType,
          maxDrawdown: metrics?.maxDrawdown || 0,
          dailyDrawdown: metrics?.maxDailyDrawdown || metrics?.dailyDrawdown || 0,
          adminEmail: 'support@shockwave-capital.com'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      
      setMessage({ type: 'success', text: `Fail email sent to ${account.email}` });
  };

  // Send drawdown warning email
  const sendDrawdownWarningEmail = async (account: UserWithAccount) => {
    if (!account.metaApiAccount || !account.cachedMetrics) return;
    
    const { accountType, accountSize } = account.metaApiAccount;
    const { maxDrawdown } = account.cachedMetrics;
    
    try {
      const response = await fetch('/api/send-challenge-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'drawdown-warning',
          email: account.email,
          name: account.displayName || `${account.firstName} ${account.lastName}`.trim() || account.email,
          challengeType: accountType,
          accountSize,
          currentDrawdown: maxDrawdown,
          adminEmail: 'support@shockwave-capital.com'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      
      setMessage({ type: 'success', text: `Drawdown warning email sent to ${account.email}` });
    } catch (error) {
      console.error('Error sending drawdown warning email:', error);
      setMessage({ type: 'error', text: 'Failed to send drawdown warning email' });
    }
  };

  // Send funded account pass email
  const sendFundedPassEmail = async (account: UserWithAccount) => {
    if (!account.metaApiAccount) return;
    
    const { accountSize } = account.metaApiAccount;
    
    try {
      const response = await fetch('/api/send-challenge-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'funded-pass',
          email: account.email,
          name: account.displayName || `${account.firstName} ${account.lastName}`.trim() || account.email,
          accountSize,
          adminEmail: 'support@shockwave-capital.com'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      
      setMessage({ type: 'success', text: `Funded account pass email sent to ${account.email}` });
    } catch (error) {
      console.error('Error sending funded pass email:', error);
      setMessage({ type: 'error', text: 'Failed to send funded pass email' });
    }
  };

  // Send funded account fail email
  const sendFundedFailEmail = async (account: UserWithAccount) => {
    if (!account.metaApiAccount) return;
    
    const { accountSize } = account.metaApiAccount;
    const metrics = account.cachedMetrics;
    
    // Determine breach type for funded accounts
    let breachType: 'maxDrawdown' | 'riskViolation' | 'both' = 'maxDrawdown';
    const maxDDBreached = metrics?.maxDrawdown > 15;
    const dailyDD = metrics?.maxDailyDrawdown || metrics?.dailyDrawdown || 0;
    const dailyDDBreached = dailyDD > 8; // Daily drawdown breach
    const riskViolation = dailyDD > 2 && dailyDD <= 8; // Risk violation (2-8%)
    
    // Determine the primary breach reason
    if (maxDDBreached && (dailyDDBreached || riskViolation)) {
      breachType = 'both';
    } else if (dailyDDBreached || riskViolation) {
      breachType = 'riskViolation';
    } else if (maxDDBreached) {
      breachType = 'maxDrawdown';
    }
    
    try {
      const response = await fetch('/api/send-challenge-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'funded-fail',
          email: account.email,
          name: account.displayName || `${account.firstName} ${account.lastName}`.trim() || account.email,
          accountSize,
          breachType,
          maxDrawdown: metrics?.maxDrawdown || 0,
          dailyDrawdown: metrics?.maxDailyDrawdown || metrics?.dailyDrawdown || 0,
          adminEmail: 'support@shockwave-capital.com'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      
      setMessage({ type: 'success', text: `Funded fail email sent to ${account.email}` });
    } catch (error) {
      console.error('Error sending funded fail email:', error);
      setMessage({ type: 'error', text: 'Failed to send funded fail email' });
    }
  };

  // Send funded account drawdown warning email
  const sendFundedDrawdownWarningEmail = async (account: UserWithAccount) => {
    if (!account.metaApiAccount || !account.cachedMetrics) return;
    
    const { accountSize } = account.metaApiAccount;
    const metrics = account.cachedMetrics;
    
    // Determine warning type
    const warningType = metrics.maxDrawdown > 6 
      ? 'approaching-max' 
      : 'approaching-risk-limit';
    
    try {
      const response = await fetch('/api/send-challenge-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'funded-drawdown-warning',
          email: account.email,
          name: account.displayName || `${account.firstName} ${account.lastName}`.trim() || account.email,
          accountSize,
          currentDrawdown: metrics.maxDrawdown || 0,
          warningType,
          adminEmail: 'support@shockwave-capital.com'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to send email');
      }
      
      setMessage({ type: 'success', text: `Funded drawdown warning email sent to ${account.email}` });
    } catch (error) {
      console.error('Error sending funded drawdown warning email:', error);
      setMessage({ type: 'error', text: 'Failed to send funded drawdown warning email' });
    }
  };

  // Helper function to generate transaction ID
  const generateTransactionId = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  // Handle Step 1 submission - Connect to MetaAPI
  const handleConnectStep1Submit = async () => {
    const { login, password, server, platform, nickname } = connectModalData.step1;
    
    // Validation
    if (!login || !password || !server || !platform || !nickname) {
      setMessage({ type: 'error', text: 'All fields are required for MetaAPI connection.' });
      return;
    }

    setConnectingToMetaAPI(true);
    setMessage({ type: '', text: '' });

    try {
      // Step 1: Create account in MetaAPI
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

      if (!createAccountResponse.ok) {
        const errorData = await createAccountResponse.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to create MetaAPI account');
      }

      const createAccountData = await createAccountResponse.json();
      const { accountId } = createAccountData;
      if (!accountId) {
        throw new Error(createAccountData.message || 'MetaAPI did not return an account ID. Please retry in a minute.');
      }

      // Check for warnings (e.g., mock responses)
      if (createAccountData.warning) {
        console.warn('MetaAPI Warning:', createAccountData.warning);
      }

      // Update modal data and proceed to Step 2
      // Note: We use the main METAAPI_AUTH_TOKEN for all operations, not a per-account token
      setConnectModalData(prev => ({
        ...prev,
        accountId,
        authToken: 'use-main-token' // Placeholder - we'll use the main METAAPI_AUTH_TOKEN
      }));

      setConnectModalStep(2);
      
      // Show appropriate message based on whether this is a mock or real response
      if (createAccountData.warning) {
        setMessage({ 
          type: 'success', 
          text: 'Connected successfully! (Using mock data - configure METAAPI_AUTH_TOKEN for production)' 
        });
      } else {
        setMessage({ 
          type: 'success', 
          text: 'Successfully connected to MetaAPI! Now configure challenge settings.' 
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

  // Handle Step 2 submission - Create challenge account
  const handleConnectStep2Submit = async () => {
    if (!searchedUser) {
      setMessage({ type: 'error', text: 'Please search for a user first.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const { login, password, server, platform } = connectModalData.step1;
      await setUserMetaApiAccount({
        userId: searchedUser.uid,
        accountId: connectModalData.accountId,
        accountToken: 'main-token', // We use the main METAAPI_AUTH_TOKEN for all operations
        accountType: accountForm.accountType,
        accountSize: accountForm.accountSize,
        platform,
        status: accountForm.status,
        step: accountForm.step,
        startDate: Timestamp.now(),
        ...(login && password && server
          ? { loginCredentials: { login, password, server } }
          : {})
      });

      setMessage({ type: 'success', text: 'Challenge account created successfully!' });
      
      // Proceed to email step
      setConnectModalStep(3);
      setConnectModalData(prev => ({
        ...prev,
        sendEmail: true
      }));
    } catch (error) {
      console.error('Error creating challenge account:', error);
      setMessage({ type: 'error', text: 'Failed to create challenge account.' });
    } finally {
      setSaving(false);
    }
  };

  // Send login credentials email
  const sendLoginCredentialsEmail = async (options?: {
    user?: UserData;
    platform?: 'mt4' | 'mt5';
    login?: string;
    password?: string;
    server?: string;
    accountType?: string;
    accountSize?: number;
    skipModalReset?: boolean;
  }) => {
    const user = options?.user || searchedUser;
    if (!user) return;

    const platform = options?.platform || connectModalData.step1.platform;
    const login = options?.login ?? connectModalData.step1.login;
    const password = options?.password ?? connectModalData.step1.password;
    const server = options?.server ?? connectModalData.step1.server;
    const accountType = options?.accountType || accountForm.accountType;
    const accountSize = options?.accountSize ?? accountForm.accountSize;
    
    setSendingCredentialsEmail(true);
    
    try {
      // Create the email template with the login credentials
      const loginTemplate = {
        id: Date.now(),
        name: 'Login Credentials',
        subject: 'Challenge Login Details - Shockwave Capital',
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
              <p style="margin: 0 0 25px 0; color: #444;">Welcome to Shockwave Capital! Your trading challenge account has been successfully set up. Below are your login credentials and setup instructions.</p>
              
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 30px;">
                <tr>
                  <td colspan="2" style="background: #0FF1CE; color: #1a1a1a; font-size: 18px; font-weight: 700; text-align: center; padding: 20px; border-radius: 8px 8px 0 0;">
                    Your Trading Account Credentials
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
                <a href="https://shockwave-capital.com/dashboard/accounts" style="display: inline-block; background-color: #1a1a1a; color: #0FF1CE; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">OPEN MY ACCOUNTS</a>
              </div>
              
              <h3 style="color: #444; font-size: 20px; font-weight: 600; margin: 0 0 20px 0;">Getting Started</h3>
              <ol style="margin: 0; padding-left: 20px; color: #444;">
                <li style="margin-bottom: 12px;">Download and install the {{platform}} trading platform</li>
                <li style="margin-bottom: 12px;">Use the credentials above to log in</li>
                <li style="margin-bottom: 12px;">You can also copy these credentials from your My Accounts page</li>
                <li style="margin-bottom: 12px;">Review the challenge rules thoroughly</li>
                <li style="margin-bottom: 12px;">Start trading with your defined strategy</li>
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
      
      // Prepare test values with the actual login credentials
      const testValues = {
        firstName: user.firstName || user.displayName?.split(' ')[0] || user.email.split('@')[0],
        platform: platform === 'mt5' ? 'MetaTrader 5' : 'MetaTrader 4',
        loginId: login,
        password,
        server
      };
      
      const response = await fetch('/api/send-template-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template: loginTemplate,
          user,
          testValues
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      if (!options?.skipModalReset) {
        setConnectModalData(prev => ({
          ...prev,
          emailSent: true
        }));
      }
      
      setMessage({ type: 'success', text: `Login credentials email sent to ${user.email}` });
      
      // Send admin notification with custom email
      try {
        const adminNotificationBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h2 style="color: #0FF1CE;">Login Credentials Sent</h2>
            <p><strong>User Email:</strong> ${user.email}</p>
            <p><strong>Name:</strong> ${user.firstName || user.displayName || 'N/A'}</p>
            <p><strong>Challenge Type:</strong> ${accountType}</p>
            <p><strong>Account Size:</strong> $${accountSize.toLocaleString()}</p>
            <p><strong>Platform:</strong> ${platform.toUpperCase()}</p>
            <p><strong>Server:</strong> ${server}</p>
            <p style="margin-top: 20px; padding: 15px; background-color: #e7f5ff; border: 1px solid #bee3f8; border-radius: 5px;">
              Login credentials have been successfully sent to the user. The account is now ready for trading.
            </p>
          </div>
        `;
        
        // Use the general template email API instead of challenge email API
        const adminResponse = await fetch('/api/send-template-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            template: {
              id: Date.now(),
              name: 'Admin Notification',
              subject: `Login Credentials Sent: ${user.email}`,
              body: adminNotificationBody,
              variables: []
            },
            user: { email: 'support@shockwave-capital.com' },
            testValues: {}
          }),
        });
        
        if (!adminResponse.ok) {
          console.error('Failed to send admin notification');
        }
      } catch (error) {
        console.error('Error sending admin notification:', error);
      }
      
      if (!options?.skipModalReset) {
        // Close modal and reset after 2 seconds
        setTimeout(() => {
          setShowConnectModal(false);
          setConnectModalStep(1);
          setConnectModalData({
            step1: {
              login: '',
              password: '',
              server: '',
              platform: 'mt5',
              nickname: ''
            },
            accountId: '',
            authToken: '',
            sendEmail: false,
            emailSent: false
          });
          setSearchedUser(null);
          setSearchUserEmail('');
          
          // Reload accounts
          loadAllAccounts();
        }, 2000);
      }
    } catch (error) {
      console.error('Error sending login credentials email:', error);
      setMessage({ type: 'error', text: 'Failed to send login credentials email' });
    } finally {
      setSendingCredentialsEmail(false);
    }
  };

  const openLoginDetails = (account: UserWithAccount) => {
    setCredentialsAccount(account);
    setCredentialForm({
      login: account.metaApiAccount?.loginCredentials?.login || '',
      password: account.metaApiAccount?.loginCredentials?.password || '',
      server: account.metaApiAccount?.loginCredentials?.server || ''
    });
  };

  const saveExistingCredentials = async () => {
    if (!credentialsAccount?.metaApiAccount) return;
    if (!credentialForm.login.trim() || !credentialForm.password || !credentialForm.server.trim()) {
      setMessage({ type: 'error', text: 'Login, password, and server are required.' });
      return;
    }

    setSaving(true);
    try {
      const accountsRef = collection(db, 'userMetaApiAccounts');
      const snapshot = await getDocs(query(
        accountsRef,
        where('userId', '==', credentialsAccount.uid),
        where('accountId', '==', credentialsAccount.metaApiAccount.accountId)
      ));
      if (snapshot.empty) {
        setMessage({ type: 'error', text: 'Account not found' });
        return;
      }

      await updateDoc(doc(db, 'userMetaApiAccounts', snapshot.docs[0].id), {
        loginCredentials: {
          login: credentialForm.login.trim(),
          password: credentialForm.password,
          server: credentialForm.server.trim()
        },
        updatedAt: Timestamp.now()
      });

      await sendLoginCredentialsEmail({
        user: credentialsAccount,
        platform: credentialsAccount.metaApiAccount.platform,
        login: credentialForm.login.trim(),
        password: credentialForm.password,
        server: credentialForm.server.trim(),
        accountType: credentialsAccount.metaApiAccount.accountType,
        accountSize: credentialsAccount.metaApiAccount.accountSize,
        skipModalReset: true
      });

      setCredentialsAccount(null);
      await loadAllAccounts();
    } catch (error) {
      console.error('Error saving login details:', error);
      setMessage({ type: 'error', text: 'Failed to save login details or send email.' });
    } finally {
      setSaving(false);
    }
  };

  // Enable MetaStats and Risk Management APIs on an account
  const enableAccountFeatures = async (account: UserWithAccount) => {
    if (!account.metaApiAccount) return;
    
    const { accountId } = account.metaApiAccount;
    
    try {
      const response = await fetch('/api/metaapi/enable-features', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accountId })
      });
      
      if (!response.ok) {
        throw new Error('Failed to enable features');
      }
      
      const result = await response.json();
      setMessage({ type: 'success', text: `Features enabled for account ${accountId}. Please wait a few minutes for changes to take effect.` });
      
      // Reload accounts after a delay
      setTimeout(() => {
        loadAllAccounts();
      }, 3000);
    } catch (error) {
      console.error('Error enabling features:', error);
      setMessage({ type: 'error', text: `Failed to enable features for account ${accountId}` });
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header with Alerts */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-white">Account Management</h1>
        <div className="flex items-center gap-2 md:gap-4 flex-wrap">
          <button
            onClick={() => {
              setShowConnectModal(true);
              setConnectModalStep(1);
              setConnectModalData({
                step1: {
                  login: '',
                  password: '',
                  server: '',
                  platform: 'mt5',
                  nickname: ''
                },
                accountId: '',
                authToken: ''
              });
              setSearchUserEmail('');
              setSearchedUser(null);
              setAccountForm({
                accountId: '',
                accountToken: '',
                accountType: 'standard' as 'standard' | 'instant' | '1-step' | 'gauntlet',
                accountSize: 10000,
                platform: 'mt5' as 'mt4' | 'mt5',
                status: 'active' as 'active' | 'inactive' | 'passed' | 'failed' | 'funded',
                step: 1 as 1 | 2 | 3
              });
            }}
            className="bg-green-500 text-white font-semibold px-3 md:px-4 py-2 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-1.5 text-sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Connect Demo Account</span>
            <span className="sm:hidden">Connect Demo</span>
          </button>
          <button
            onClick={() => {
              setShowAddModal(true);
              setSearchUserEmail('');
              setSearchedUser(null);
              setAccountForm({
                accountId: '',
                accountToken: '',
                accountType: 'standard' as 'standard' | 'instant' | '1-step' | 'gauntlet',
                accountSize: 10000,
                platform: 'mt5' as 'mt4' | 'mt5',
                status: 'active' as 'active' | 'inactive' | 'passed' | 'failed' | 'funded',
                step: 1 as 1 | 2 | 3
              });
            }}
            className="bg-[#0FF1CE] text-black font-semibold px-3 md:px-4 py-2 rounded-lg hover:bg-[#0FF1CE]/90 transition-colors flex items-center gap-1.5 text-sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Existing Account</span>
            <span className="sm:hidden">Add Account</span>
          </button>
          <button
            onClick={() => window.location.reload()}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw size={20} />
          </button>
          <div className="relative">
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="relative p-2 text-gray-400 hover:text-white transition-colors"
            >
              <Bell size={20} />
              {alerts.filter(a => !a.read).length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {alerts.filter(a => !a.read).length}
                </span>
              )}
            </button>
            
            {/* Alerts Dropdown */}
            {showAlerts && (
              <div className="absolute right-0 mt-2 w-96 bg-[#0D0D0D] border border-[#2F2F2F] rounded-xl shadow-2xl z-50 max-h-[500px] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-[#2F2F2F]">
                  <div className="flex items-center justify-between mb-3">
                  <h3 className="text-white font-semibold">Notifications</h3>
                    {alerts.length > 0 && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => markAllAlertsAsRead()}
                          className="text-xs text-gray-400 hover:text-white transition-colors"
                        >
                          Mark all as read
                        </button>
                        <button
                          onClick={() => {
                            setAlerts([]);
                            if (typeof window !== 'undefined') {
                              localStorage.removeItem('adminAlerts');
                            }
                          }}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Clear all
                        </button>
                </div>
                    )}
                  </div>
                  
                  {/* Filter Tabs */}
                  <div className="flex gap-1 bg-[#151515] p-1 rounded-lg">
                    <button
                      onClick={() => setAlertFilter('all')}
                      className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        alertFilter === 'all' 
                          ? 'bg-[#0FF1CE] text-black' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      All ({alerts.length})
                    </button>
                    <button
                      onClick={() => setAlertFilter('pass')}
                      className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        alertFilter === 'pass' 
                          ? 'bg-green-500 text-white' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Passed ({alerts.filter(a => a.type === 'pass').length})
                    </button>
                    <button
                      onClick={() => setAlertFilter('breach')}
                      className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        alertFilter === 'breach' 
                          ? 'bg-red-500 text-white' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Failed ({alerts.filter(a => a.type === 'breach').length})
                    </button>
                    <button
                      onClick={() => setAlertFilter('warning')}
                      className={`flex-1 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                        alertFilter === 'warning' 
                          ? 'bg-yellow-500 text-white' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Warnings ({alerts.filter(a => a.type === 'warning').length})
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                  {alerts.filter(alert => alertFilter === 'all' || alert.type === alertFilter).length === 0 ? (
                    <p className="p-4 text-gray-400 text-sm text-center">
                      No {alertFilter === 'breach' ? 'failed ' : alertFilter === 'pass' ? 'passed ' : alertFilter === 'warning' ? 'warning ' : alertFilter === 'all' ? '' : `${alertFilter} `}notifications
                    </p>
                  ) : (
                    alerts
                      .filter(alert => alertFilter === 'all' || alert.type === alertFilter)
                      .map((alert) => (
                    <div
                      key={alert.id}
                          onClick={() => markAlertAsRead(alert.id)}
                          className={`p-4 border-b border-[#2F2F2F]/50 hover:bg-white/5 transition-colors cursor-pointer ${
                        !alert.read ? 'bg-white/5' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {alert.type === 'breach' && <XCircle className="text-red-400 mt-1" size={16} />}
                        {alert.type === 'pass' && <CheckCircle className="text-green-400 mt-1" size={16} />}
                        {alert.type === 'warning' && <AlertTriangle className="text-yellow-400 mt-1" size={16} />}
                        {alert.type === 'info' && <AlertCircle className="text-blue-400 mt-1" size={16} />}
                        <div className="flex-1">
                          <p className="text-sm text-white">{alert.message}</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {alert.userEmail} • {formatDistanceToNow(alert.timestamp, { addSuffix: true })}
                          </p>
                        </div>
                            <div className="flex items-center gap-2">
                              {!alert.read && (
                                <div className="w-2 h-2 bg-[#0FF1CE] rounded-full" />
                              )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAlerts(prev => {
                                    const updated = prev.filter(a => a.id !== alert.id);
                                    if (typeof window !== 'undefined') {
                                      localStorage.setItem('adminAlerts', JSON.stringify(updated));
                                    }
                                    return updated;
                                  });
                                }}
                                className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                                title="Delete notification"
                              >
                                <X size={14} />
                              </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Overview Statistics */}
      <div className="mb-6">
        {/* Primary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
          <div className="bg-gradient-to-br from-[#0D0D0D] to-[#0D0D0D]/60 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-6 hover:border-[#0FF1CE]/30 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-[#0FF1CE]/10 rounded-lg">
                <Users className="text-[#0FF1CE]" size={24} />
            </div>
              <span className="text-xs text-gray-500 bg-[#151515] px-2 py-1 rounded">Overview</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">{stats.total}</p>
              <p className="text-sm text-gray-400">Total Accounts</p>
              <div className="pt-3 mt-3 border-t border-[#2F2F2F]/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Active Rate</span>
                  <span className="text-[#0FF1CE]">{stats.total > 0 ? ((stats.active / stats.total) * 100).toFixed(1) : 0}%</span>
                </div>
              </div>
          </div>
        </div>
        
          <div className="bg-gradient-to-br from-[#0D0D0D] to-[#0D0D0D]/60 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-6 hover:border-[#0FF1CE]/30 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-yellow-500/10 rounded-lg">
                <DollarSign className="text-yellow-400" size={24} />
            </div>
              <span className="text-xs text-gray-500 bg-[#151515] px-2 py-1 rounded">Financial</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">${(stats.totalBalance / 1000).toFixed(1)}k</p>
              <p className="text-sm text-gray-400">Total Balance</p>
              <div className="pt-3 mt-3 border-t border-[#2F2F2F]/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Total Equity</span>
                  <span className="text-yellow-400">${(stats.totalEquity / 1000).toFixed(1)}k</span>
                </div>
              </div>
          </div>
        </div>
        
          <div className="bg-gradient-to-br from-[#0D0D0D] to-[#0D0D0D]/60 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-6 hover:border-[#0FF1CE]/30 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Target className="text-purple-400" size={24} />
            </div>
              <span className="text-xs text-gray-500 bg-[#151515] px-2 py-1 rounded">Performance</span>
            </div>
            <div className="space-y-1">
              <p className="text-3xl font-bold text-white">{stats.total > 0 ? ((stats.passed + stats.funded) / stats.total * 100).toFixed(0) : 0}%</p>
              <p className="text-sm text-gray-400">Success Rate</p>
              <div className="pt-3 mt-3 border-t border-[#2F2F2F]/50">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Failed Rate</span>
                  <span className="text-red-400">{stats.total > 0 ? (stats.failed / stats.total * 100).toFixed(1) : 0}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Secondary Stats */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-5 gap-2 md:gap-3">
          <div className="bg-[#0D0D0D]/60 backdrop-blur-sm rounded-lg border border-[#2F2F2F]/30 p-4 hover:bg-[#0D0D0D]/80 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400">Active</span>
            </div>
              <Activity className="text-green-400" size={16} />
          </div>
            <p className="text-xl font-bold text-white mt-2">{stats.active}</p>
        </div>
        
          <div className="bg-[#0D0D0D]/60 backdrop-blur-sm rounded-lg border border-[#2F2F2F]/30 p-4 hover:bg-[#0D0D0D]/80 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                <span className="text-xs text-gray-400">Passed</span>
            </div>
              <CheckCircle className="text-blue-400" size={16} />
          </div>
            <p className="text-xl font-bold text-white mt-2">{stats.passed}</p>
        </div>
        
          <div className="bg-[#0D0D0D]/60 backdrop-blur-sm rounded-lg border border-[#2F2F2F]/30 p-4 hover:bg-[#0D0D0D]/80 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <span className="text-xs text-gray-400">Failed</span>
            </div>
              <XCircle className="text-red-400" size={16} />
          </div>
            <p className="text-xl font-bold text-white mt-2">{stats.failed}</p>
        </div>
        
          <div className="bg-[#0D0D0D]/60 backdrop-blur-sm rounded-lg border border-[#2F2F2F]/30 p-4 hover:bg-[#0D0D0D]/80 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-xs text-gray-400">Funded</span>
            </div>
              <Shield className="text-purple-400" size={16} />
          </div>
            <p className="text-xl font-bold text-white mt-2">{stats.funded}</p>
          </div>
          
          <div className="bg-[#0D0D0D]/60 backdrop-blur-sm rounded-lg border border-[#2F2F2F]/30 p-4 hover:bg-[#0D0D0D]/80 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                <span className="text-xs text-gray-400">Inactive</span>
              </div>
              <Power className="text-gray-400" size={16} />
            </div>
            <p className="text-xl font-bold text-white mt-2">{stats.total - stats.active - stats.passed - stats.failed - stats.funded}</p>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 p-3 md:p-4 mb-4 md:mb-6">
        <div className="flex flex-col gap-2 md:flex-row md:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by email, name, or account ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg pl-9 pr-9 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#0FF1CE]/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            )}
          </div>
          
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 md:flex-none bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0FF1CE]/50"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="funded">Funded</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 md:flex-none bg-[#151515] border border-[#2F2F2F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#0FF1CE]/50 md:min-w-[160px]"
              title="Sort accounts by"
            >
              <optgroup label="Date & Time">
                <option value="newest">Newest Accounts</option>
                <option value="oldest">Oldest Accounts</option>
                <option value="last-updated">Recently Updated</option>
              </optgroup>
              <optgroup label="Status & Type">
                <option value="status">Status Priority</option>
                <option value="account-type">Account Type</option>
                <option value="account-size">Account Size</option>
              </optgroup>
              <optgroup label="User Info">
                <option value="email-az">Email A-Z</option>
                <option value="email-za">Email Z-A</option>
              </optgroup>
              <optgroup label="Performance">
                <option value="balance-high">Highest Balance</option>
                <option value="balance-low">Lowest Balance</option>
                <option value="profit-high">Highest Profit %</option>
              </optgroup>
              <optgroup label="Risk Management">
                <option value="drawdown-high">Highest Risk (Max DD)</option>
                <option value="drawdown-low">Lowest Risk (Max DD)</option>
                <option value="daily-drawdown-high">Highest Daily DD</option>
              </optgroup>
            </select>
            
            <div className="relative">
            <button
              onClick={handleBulkRefresh}
              disabled={bulkRefreshing || refreshQueue.length > 0}
              className="bg-[#0FF1CE]/10 text-[#0FF1CE] px-3 py-2 rounded-lg hover:bg-[#0FF1CE]/20 transition-colors flex items-center gap-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw size={15} className={bulkRefreshing || refreshQueue.length > 0 ? 'animate-spin' : ''} />
              <span className="hidden sm:inline">
                {refreshQueue.length > 0 
                  ? `Refreshing (${refreshQueue.length})` 
                  : selectedAccounts.length > 0 
                    ? `Refresh (${selectedAccounts.length})`
                    : 'Refresh All'
                }
              </span>
              <span className="sm:hidden">
                {refreshQueue.length > 0 ? refreshQueue.length : selectedAccounts.length > 0 ? selectedAccounts.length : 'All'}
              </span>
            </button>
              {nextAutoRefreshTime && (
                <div className="absolute -bottom-5 left-0 text-xs text-gray-500 whitespace-nowrap flex items-center gap-1">
                  <Clock size={10} />
                  <span>Auto-refresh in {formatDistanceToNow(nextAutoRefreshTime)}</span>
                </div>
              )}
            </div>
            
            {selectedAccounts.length > 0 && (
              <button
                onClick={handleBulkDisconnect}
                className="bg-red-500/10 text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/20 transition-colors flex items-center gap-1.5 text-sm"
              >
                <Power size={15} />
                <span className="hidden sm:inline">Disconnect ({selectedAccounts.length})</span>
                <span className="sm:hidden">({selectedAccounts.length})</span>
              </button>
            )}
            
            <button
              onClick={handleExport}
              className="bg-[#0FF1CE]/10 text-[#0FF1CE] px-3 py-2 rounded-lg hover:bg-[#0FF1CE]/20 transition-colors flex items-center gap-1.5 text-sm"
            >
              <Download size={15} />
              Export
            </button>
          </div>
        </div>
        
        {/* Search Results Info */}
        {(searchQuery || statusFilter !== 'all') && (
          <div className="mt-3 text-sm text-gray-400">
            Found {filteredAccounts.length} {filteredAccounts.length === 1 ? 'account' : 'accounts'}
            {searchQuery && <span> matching "{searchQuery}"</span>}
            {statusFilter !== 'all' && <span> with status "{statusFilter}"</span>}
          </div>
        )}
      </div>

      {/* Accounts Table */}
      <div className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl border border-[#2F2F2F]/50 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-[#0FF1CE] animate-spin" />
          </div>
        ) : filteredAccounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12">
            <Users className="w-12 h-12 text-gray-500 mb-4" />
            <p className="text-gray-400">No accounts found</p>
          </div>
        ) : (
          <>
          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-[#2F2F2F]/50">
            {filteredAccounts.map((account) => {
              const metrics = account.cachedMetrics;
              const config = account.metaApiAccount;
              const isBreached = metrics && (
                metrics.maxDrawdown > (config?.accountType === 'standard' ? 15 : config?.accountType === 'gauntlet' ? 15 : config?.accountType === '1-step' ? 8 : 4) ||
                (metrics.maxDailyDrawdown || metrics.dailyDrawdown) > (config?.accountType === 'standard' ? 8 : config?.accountType === 'gauntlet' ? 8 : config?.accountType === '1-step' ? 4 : 999)
              );
              const profitPercent = config && metrics ? ((metrics.balance - config.accountSize) / config.accountSize * 100) : 0;
              const targetProfit = config?.accountType === '1-step' ? 10 :
                                   config?.accountType === 'gauntlet' ? 10 :
                                   config?.accountType === 'standard'
                                     ? (config.step === 1 ? 10 : 5)
                                     : 12;
              const minTradingDays = config?.accountType === 'gauntlet' ? 0 : 5;
              const currentTradingDays = metrics?.tradingDays || 0;
              const hasPassed = config?.status === 'passed' ||
                                (config?.status === 'active' && profitPercent >= targetProfit && !isBreached && currentTradingDays >= minTradingDays);
              const maxDDLimit = config?.accountType === 'standard' || config?.accountType === 'gauntlet' ? 15 : config?.accountType === '1-step' ? 8 : 4;
              const dailyDDLimit = config?.accountType === 'standard' || config?.accountType === 'gauntlet' ? 8 : config?.accountType === '1-step' ? 4 : 999;
              const dailyDDValue = metrics?.maxDailyDrawdown || metrics?.dailyDrawdown || 0;

              return (
                <div key={config?.accountId || account.uid} className={`p-4 ${isBreached ? 'bg-red-500/5' : hasPassed ? 'bg-green-500/5' : ''}`}>

                  {/* Row 1: Checkbox + User info + Status */}
                  <div className="flex items-start gap-3 mb-3">
                    <input
                      type="checkbox"
                      checked={selectedAccounts.includes(config?.accountId || '')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAccounts([...selectedAccounts, config?.accountId || '']);
                        } else {
                          setSelectedAccounts(selectedAccounts.filter(id => id !== config?.accountId));
                        }
                      }}
                      className="rounded border-gray-600 mt-0.5 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{account.email}</p>
                          <p className="text-xs text-gray-400 truncate">{account.displayName || `${account.firstName} ${account.lastName}`.trim() || 'No name'}</p>
                          {config?.accountId && (
                            <p className="text-xs text-gray-500 font-mono mt-0.5" title={config.accountId}>{config.accountId.slice(0, 12)}...</p>
                          )}
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 text-xs font-medium rounded-full ${
                          config?.status === 'active' ? 'bg-green-500/20 text-green-400' :
                          config?.status === 'passed' ? 'bg-blue-500/20 text-blue-400' :
                          config?.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                          config?.status === 'funded' ? 'bg-purple-500/20 text-purple-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {config?.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </div>
                      {/* Account Type + Step */}
                      <div className="flex items-center gap-1 mt-1.5">
                        <Shield size={11} className="text-gray-500 shrink-0" />
                        <span className="text-xs text-gray-400">
                          {config?.accountType === '1-step' ? '1-Step' :
                           config?.accountType === 'gauntlet' ? 'Gauntlet' :
                           config?.accountType === 'standard' ? 'Standard' : 'Instant'}
                          {config?.step && ` · ${config.step === 3 ? 'Funded' :
                            (config.accountType === '1-step' || config.accountType === 'gauntlet') ? 'Challenge' :
                            `Step ${config.step}`}`}
                          {config?.accountSize && ` · $${config.accountSize.toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Stats grid */}
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    {/* Balance */}
                    <div className="bg-[#151515] rounded-lg p-2.5">
                      <p className="text-gray-500 mb-1">Balance</p>
                      <p className="text-white font-medium">${metrics?.balance?.toLocaleString() || '-'}</p>
                      {config && metrics && config.status === 'active' && (
                        <div className="mt-1.5">
                          <div className="h-1 bg-[#0D0D0D] rounded-full overflow-hidden mb-0.5">
                            <div
                              className={`h-full transition-all duration-500 ${
                                profitPercent >= targetProfit ? 'bg-green-400' :
                                profitPercent >= targetProfit * 0.8 ? 'bg-yellow-400' :
                                profitPercent >= 0 ? 'bg-[#0FF1CE]' : 'bg-red-400'
                              }`}
                              style={{ width: `${Math.min(Math.max((profitPercent / targetProfit) * 100, 0), 100)}%` }}
                            />
                          </div>
                          <span className={`text-[10px] ${
                            profitPercent >= targetProfit ? 'text-green-400' :
                            profitPercent < 0 ? 'text-red-400' : 'text-gray-500'
                          }`}>
                            {profitPercent >= 0 ? '+' : ''}{profitPercent.toFixed(1)}% / {targetProfit}%
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Equity */}
                    <div className="bg-[#151515] rounded-lg p-2.5">
                      <p className="text-gray-500 mb-1">Equity</p>
                      <p className="text-white font-medium">${metrics?.equity?.toLocaleString() || '-'}</p>
                      {metrics?.balance && metrics?.equity && (
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          {metrics.equity < metrics.balance ? '-' : '+'}{Math.abs(((metrics.equity - metrics.balance) / metrics.balance * 100)).toFixed(1)}% vs bal
                        </p>
                      )}
                    </div>

                    {/* Max Drawdown */}
                    <div className="bg-[#151515] rounded-lg p-2.5">
                      <p className="text-gray-500 mb-1">Max DD</p>
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1 bg-[#0D0D0D] rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              (metrics?.maxDrawdown || 0) > maxDDLimit ? 'bg-red-400' :
                              (metrics?.maxDrawdown || 0) > maxDDLimit * 0.8 ? 'bg-yellow-400' : 'bg-green-400'
                            }`}
                            style={{ width: `${Math.min(((metrics?.maxDrawdown || 0) / maxDDLimit) * 100, 100)}%` }}
                          />
                        </div>
                        <span className={`font-medium ${
                          (metrics?.maxDrawdown || 0) > maxDDLimit ? 'text-red-400' :
                          (metrics?.maxDrawdown || 0) > maxDDLimit * 0.8 ? 'text-yellow-400' : 'text-gray-300'
                        }`}>
                          {metrics?.maxDrawdown?.toFixed(2) || '-'}%
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-600 mt-0.5">Limit: {maxDDLimit}%</p>
                    </div>

                    {/* Daily DD */}
                    <div className="bg-[#151515] rounded-lg p-2.5">
                      <p className="text-gray-500 mb-1">Daily DD (Peak)</p>
                      {config?.accountType === 'instant' ? (
                        <p className="text-gray-400 font-medium">N/A</p>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1 bg-[#0D0D0D] rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${
                                  dailyDDValue > dailyDDLimit ? 'bg-red-400' :
                                  dailyDDValue > dailyDDLimit * 0.75 ? 'bg-yellow-400' : 'bg-green-400'
                                }`}
                                style={{ width: `${Math.min((dailyDDValue / dailyDDLimit) * 100, 100)}%` }}
                              />
                            </div>
                            <span className={`font-medium ${
                              dailyDDValue > dailyDDLimit ? 'text-red-400' :
                              dailyDDValue > dailyDDLimit * 0.75 ? 'text-yellow-400' : 'text-gray-300'
                            }`}>
                              {dailyDDValue.toFixed(2)}%
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-600 mt-0.5">Limit: {dailyDDLimit}%</p>
                        </>
                      )}
                    </div>

                    {/* Trading Days */}
                    <div className="bg-[#151515] rounded-lg p-2.5">
                      <p className="text-gray-500 mb-1">Trading Days</p>
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 h-1 bg-[#0D0D0D] rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              currentTradingDays >= minTradingDays ? 'bg-green-400' :
                              currentTradingDays >= minTradingDays * 0.8 ? 'bg-yellow-400' : 'bg-gray-400'
                            }`}
                            style={{ width: minTradingDays > 0 ? `${Math.min((currentTradingDays / minTradingDays) * 100, 100)}%` : '0%' }}
                          />
                        </div>
                        <span className={`font-medium ${currentTradingDays >= minTradingDays ? 'text-green-400' : 'text-gray-300'}`}>
                          {currentTradingDays}/{minTradingDays}
                        </span>
                      </div>
                    </div>

                    {/* Last Updated */}
                    <div className="bg-[#151515] rounded-lg p-2.5">
                      <p className="text-gray-500 mb-1">Last Updated</p>
                      <p className="text-gray-400 text-[11px] leading-tight">
                        {metrics?.lastUpdated
                          ? formatDistanceToNow(metrics.lastUpdated.toDate ? metrics.lastUpdated.toDate() : new Date(metrics.lastUpdated), { addSuffix: true })
                          : config?.updatedAt
                            ? formatDistanceToNow(config.updatedAt.toDate(), { addSuffix: true })
                            : 'Never'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Row 3: Action buttons */}
                  <div className="flex flex-wrap gap-1.5">
                    {/* Primary Actions */}
                    <div className="flex items-center gap-1 bg-[#151515] rounded-lg p-1">
                      <button
                        onClick={() => window.location.href = `/admin/accounts/${config?.accountId}`}
                        className="p-1.5 text-gray-400 hover:text-[#0FF1CE] hover:bg-[#0FF1CE]/10 rounded transition-all"
                        title="View Account Details"
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        onClick={() => refreshAccount(account)}
                        disabled={refreshingAccounts.has(config?.accountId || '')}
                        className="p-1.5 text-gray-400 hover:text-[#0FF1CE] hover:bg-[#0FF1CE]/10 rounded transition-all disabled:opacity-50"
                        title="Refresh Metrics"
                      >
                        <RefreshCw size={15} className={refreshingAccounts.has(config?.accountId || '') ? 'animate-spin' : ''} />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedUser(account);
                          setAccountForm({
                            accountId: config?.accountId || '',
                            accountToken: config?.accountToken || '',
                            accountType: config?.accountType && config.accountType !== 'vip' ? config.accountType : 'standard',
                            accountSize: config?.accountSize || 10000,
                            platform: config?.platform || 'mt5',
                            status: config?.status || 'active',
                            step: config?.step || 1
                          });
                          setShowEditModal(true);
                        }}
                        className="p-1.5 text-gray-400 hover:text-[#0FF1CE] hover:bg-[#0FF1CE]/10 rounded transition-all"
                        title="Edit Configuration"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => openLoginDetails(account)}
                        className="p-1.5 text-gray-400 hover:text-[#0FF1CE] hover:bg-[#0FF1CE]/10 rounded transition-all"
                        title="Login details"
                      >
                        <KeyRound size={15} />
                      </button>
                    </div>

                    {/* Email Actions */}
                    {(config?.status === 'active' || config?.status === 'failed' || config?.status === 'passed' || config?.status === 'funded') && (
                      <div className="flex items-center gap-1 bg-[#151515] rounded-lg p-1">
                        {config?.status === 'passed' && (
                          <button
                            onClick={() => sendEmailWithModal(() => sendPassEmail(account), 'pass email')}
                            className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded transition-all"
                            title="Send Pass Email"
                          >
                            <Mail size={15} />
                          </button>
                        )}
                        {config?.status === 'failed' && (
                          <button
                            onClick={() => sendEmailWithModal(() => config.step === 3 ? sendFundedFailEmail(account) : sendFailEmail(account), config.step === 3 ? 'funded fail email' : 'fail email')}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                            title={config.step === 3 ? 'Send Funded Fail Email' : 'Send Fail Email'}
                          >
                            <Mail size={15} />
                          </button>
                        )}
                        {config?.status === 'funded' && (
                          <>
                            <button
                              onClick={() => sendEmailWithModal(() => sendFundedPassEmail(account), 'funded welcome email')}
                              className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-400/10 rounded transition-all"
                              title="Send Funded Welcome Email"
                            >
                              <Mail size={15} />
                            </button>
                            <button
                              onClick={() => sendEmailWithModal(() => sendFundedFailEmail(account), 'funded fail email')}
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                              title="Send Funded Fail Email"
                            >
                              <Mail size={15} />
                            </button>
                            {metrics && (metrics.maxDrawdown >= 6 || (metrics.maxDailyDrawdown || metrics.dailyDrawdown) <= 3) && (
                              <button
                                onClick={() => sendEmailWithModal(() => sendFundedDrawdownWarningEmail(account), 'funded risk warning email')}
                                className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-all"
                                title="Send Funded Risk Warning Email"
                              >
                                <Mail size={15} />
                              </button>
                            )}
                          </>
                        )}
                        {config?.status === 'active' && (
                          <>
                            <button
                              onClick={() => sendEmailWithModal(() => sendPassEmail(account), 'pass email')}
                              className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded transition-all"
                              title="Send Pass Email"
                            >
                              <Mail size={15} />
                            </button>
                            <button
                              onClick={() => sendEmailWithModal(() => sendFailEmail(account), 'fail email')}
                              className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                              title="Send Fail Email"
                            >
                              <Mail size={15} />
                            </button>
                            {metrics && metrics.maxDrawdown >= 6 && (
                              <button
                                onClick={() => sendEmailWithModal(() => sendDrawdownWarningEmail(account), 'drawdown warning email')}
                                className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-all"
                                title="Send Drawdown Warning Email"
                              >
                                <Mail size={15} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Account Management Actions */}
                    <div className="flex items-center gap-1 bg-[#151515] rounded-lg p-1">
                      <button
                        onClick={() => enableAccountFeatures(account)}
                        className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-all"
                        title="Enable MetaStats & Risk APIs"
                      >
                        <Activity size={15} />
                      </button>
                      {config?.status === 'active' && (
                        <>
                          <button
                            onClick={() => handleDisconnect(account.uid, config?.accountId || '')}
                            className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-all"
                            title="Disconnect Account"
                          >
                            <Power size={15} />
                          </button>
                          <button
                            onClick={() => handleFail(account.uid, config?.accountId || '')}
                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                            title="Mark as Failed"
                          >
                            <XCircle size={15} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(account.uid, config?.accountId || '')}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                        title="Delete Account"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2F2F2F] bg-[#151515]">
                  <th className="text-left p-4">
                    <input
                      type="checkbox"
                      checked={selectedAccounts.length === filteredAccounts.length && filteredAccounts.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAccounts(filteredAccounts.map(a => a.metaApiAccount?.accountId || '').filter(Boolean));
                        } else {
                          setSelectedAccounts([]);
                        }
                      }}
                      className="rounded border-gray-600"
                    />
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">User</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Account ID</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Status</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Type</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-400">Balance</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-400">Equity</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-400">Max DD</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-400" title="Highest daily drawdown achieved during the challenge">Daily DD (Peak)</th>
                  <th className="text-right p-4 text-sm font-medium text-gray-400" title="Trading days with at least 1 trade">Trading Days</th>
                  <th className="text-left p-4 text-sm font-medium text-gray-400">Last Updated</th>
                  <th className="text-center p-4 text-sm font-medium text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2F2F2F]/50">
                {filteredAccounts.map((account) => {
                  const metrics = account.cachedMetrics;
                  const config = account.metaApiAccount;
                  const isBreached = metrics && (
                    metrics.maxDrawdown > (config?.accountType === 'standard' ? 15 : config?.accountType === 'gauntlet' ? 15 : config?.accountType === '1-step' ? 8 : 4) ||
                    (metrics.maxDailyDrawdown || metrics.dailyDrawdown) > (config?.accountType === 'standard' ? 8 : config?.accountType === 'gauntlet' ? 8 : config?.accountType === '1-step' ? 4 : 999)
                  );
                  
                  // Check if account has passed objectives
                  const profitPercent = config && metrics ? ((metrics.balance - config.accountSize) / config.accountSize * 100) : 0;
                  const targetProfit = config?.accountType === '1-step' ? 10 :
                                     config?.accountType === 'gauntlet' ? 10 : // Gauntlet: 10%
                                     config?.accountType === 'standard' 
                                       ? (config.step === 1 ? 10 : 5)
                                       : 12; // Instant: 12%
                  const minTradingDays = config?.accountType === 'gauntlet' ? 0 : 5; // Gauntlet has 0 min trading days
                  const currentTradingDays = metrics?.tradingDays || 0;
                  const hasPassed = config?.status === 'passed' || 
                                  (config?.status === 'active' && profitPercent >= targetProfit && !isBreached && currentTradingDays >= minTradingDays);
                  
                  return (
                    <tr key={config?.accountId || account.uid} className={`hover:bg-white/5 transition-colors ${
                      isBreached ? 'bg-red-500/5' : hasPassed ? 'bg-green-500/5' : ''
                    }`}>
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedAccounts.includes(account.metaApiAccount?.accountId || '')}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedAccounts([...selectedAccounts, account.metaApiAccount?.accountId || '']);
                            } else {
                              setSelectedAccounts(selectedAccounts.filter(id => id !== account.metaApiAccount?.accountId));
                            }
                          }}
                          className="rounded border-gray-600"
                        />
                      </td>
                      <td className="p-4">
                        <div>
                          <p className="text-sm text-white font-medium">{account.email}</p>
                          <p className="text-xs text-gray-400">
                            {account.displayName || `${account.firstName} ${account.lastName}`.trim() || 'No name'}
                          </p>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-300 font-mono cursor-help" title={config?.accountId || 'No ID'}>
                          {config?.accountId ? `${config.accountId.slice(0, 12)}...` : 'No ID'}
                        </p>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          config?.status === 'active'
                            ? 'bg-green-500/20 text-green-400'
                            : config?.status === 'passed'
                            ? 'bg-blue-500/20 text-blue-400'
                            : config?.status === 'failed'
                            ? 'bg-red-500/20 text-red-400'
                            : config?.status === 'funded'
                            ? 'bg-purple-500/20 text-purple-400'
                            : 'bg-gray-500/20 text-gray-400'
                        }`}>
                          {config?.status?.toUpperCase() || 'UNKNOWN'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1">
                          <Shield size={14} className="text-gray-400" />
                          <span className="text-sm text-gray-300">
                            {config?.accountType === '1-step' ? '1-Step' : 
                             config?.accountType === 'gauntlet' ? 'Gauntlet' :
                             config?.accountType === 'standard' ? 'Standard' : 'Instant'}
                            {config?.step && ` - ${config.step === 3 ? 'Funded' : 
                                                  (config.accountType === '1-step' || config.accountType === 'gauntlet') ? 'Challenge' : 
                                                  `Step ${config.step}`}`}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-right">
                        <p className="text-sm text-white font-medium">
                          ${metrics?.balance?.toLocaleString() || '-'}
                        </p>
                          {config && metrics && config.status === 'active' && (
                            <div className="mt-1">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-20">
                                  <div className="h-1 bg-[#151515] rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full transition-all duration-500 ${
                                        profitPercent >= targetProfit ? 'bg-green-400' : 
                                        profitPercent >= targetProfit * 0.8 ? 'bg-yellow-400' : 
                                        profitPercent >= 0 ? 'bg-[#0FF1CE]' : 'bg-red-400'
                                      }`}
                                      style={{ width: `${Math.min(Math.max((profitPercent / targetProfit) * 100, 0), 100)}%` }}
                                    />
                                  </div>
                                </div>
                                <p className={`text-xs ${
                                  profitPercent >= targetProfit ? 'text-green-400' : 
                                  profitPercent < 0 ? 'text-red-400' : 
                                  'text-gray-500'
                                }`}>
                                  {profitPercent.toFixed(1)}% / {targetProfit}%
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div>
                        <p className="text-sm text-white">
                          ${metrics?.equity?.toLocaleString() || '-'}
                        </p>
                          {metrics && metrics.balance && (
                            <p className="text-xs text-gray-500 mt-0.5">
                              {metrics.equity < metrics.balance ? '-' : '+'}{Math.abs(((metrics.equity - metrics.balance) / metrics.balance * 100)).toFixed(1)}%
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16">
                              <div className="h-1.5 bg-[#151515] rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-500 ${
                                    metrics && metrics.maxDrawdown > (config?.accountType === 'standard' || config?.accountType === 'gauntlet' ? 15 : config?.accountType === '1-step' ? 8 : 4)
                                      ? 'bg-red-400'
                                      : metrics && metrics.maxDrawdown > (config?.accountType === 'standard' || config?.accountType === 'gauntlet' ? 12 : config?.accountType === '1-step' ? 6 : 3)
                                      ? 'bg-yellow-400'
                                      : 'bg-green-400'
                                  }`}
                                  style={{ width: `${Math.min((metrics?.maxDrawdown || 0) / (config?.accountType === 'standard' || config?.accountType === 'gauntlet' ? 15 : config?.accountType === '1-step' ? 8 : 4) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                            <p className={`text-sm font-medium min-w-[45px] text-right ${
                              metrics && metrics.maxDrawdown > (config?.accountType === 'standard' || config?.accountType === 'gauntlet' ? 15 : config?.accountType === '1-step' ? 8 : 4)
                            ? 'text-red-400'
                                : metrics && metrics.maxDrawdown > (config?.accountType === 'standard' || config?.accountType === 'gauntlet' ? 12 : config?.accountType === '1-step' ? 6 : 3)
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}>
                          {metrics?.maxDrawdown?.toFixed(2) || '-'}%
                        </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16">
                              <div className="h-1.5 bg-[#151515] rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-500 ${
                                    metrics && (metrics.maxDailyDrawdown || metrics.dailyDrawdown) > (config?.accountType === 'standard' || config?.accountType === 'gauntlet' ? 8 : config?.accountType === '1-step' ? 4 : 999)
                                      ? 'bg-red-400'
                                      : metrics && (metrics.maxDailyDrawdown || metrics.dailyDrawdown) > (config?.accountType === 'standard' || config?.accountType === 'gauntlet' ? 6 : config?.accountType === '1-step' ? 3 : 999)
                                      ? 'bg-yellow-400'
                                      : 'bg-green-400'
                                  }`}
                                  style={{ width: config?.accountType === 'instant' ? '0%' : `${Math.min(((metrics?.maxDailyDrawdown || metrics?.dailyDrawdown || 0) / (config?.accountType === 'standard' || config?.accountType === 'gauntlet' ? 8 : 4)) * 100, 100)}%` }}
                                />
                              </div>
                            </div>
                            <p className={`text-sm font-medium min-w-[45px] text-right ${
                              metrics && (metrics.maxDailyDrawdown || metrics.dailyDrawdown) > (config?.accountType === 'standard' || config?.accountType === 'gauntlet' ? 8 : config?.accountType === '1-step' ? 4 : 999)
                            ? 'text-red-400'
                                : metrics && (metrics.maxDailyDrawdown || metrics.dailyDrawdown) > (config?.accountType === 'standard' || config?.accountType === 'gauntlet' ? 6 : config?.accountType === '1-step' ? 3 : 999)
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}>
                              {config?.accountType === 'instant' ? 'N/A' : `${(metrics?.maxDailyDrawdown || metrics?.dailyDrawdown)?.toFixed(2) || '-'}%`}
                        </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16">
                              <div className="h-1.5 bg-[#151515] rounded-full overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-500 ${
                                    currentTradingDays >= minTradingDays
                                      ? 'bg-green-400'
                                      : currentTradingDays >= minTradingDays * 0.8
                                      ? 'bg-yellow-400'
                                      : 'bg-gray-400'
                                  }`}
                                  style={{ width: minTradingDays > 0 ? `${Math.min((currentTradingDays / minTradingDays) * 100, 100)}%` : '0%' }}
                                />
                              </div>
                            </div>
                            <p className={`text-sm font-medium min-w-[45px] text-right ${
                              currentTradingDays >= minTradingDays
                                ? 'text-green-400'
                                : 'text-gray-300'
                            }`}>
                              {currentTradingDays}/{minTradingDays}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <p className="text-sm text-gray-400">
                          {metrics?.lastUpdated 
                            ? formatDistanceToNow(metrics.lastUpdated.toDate ? metrics.lastUpdated.toDate() : new Date(metrics.lastUpdated), { addSuffix: true })
                            : config?.updatedAt 
                              ? formatDistanceToNow(config.updatedAt.toDate(), { addSuffix: true })
                              : 'Never'
                          }
                        </p>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-1">
                          {/* Primary Actions */}
                          <div className="flex items-center gap-1 bg-[#151515] rounded-lg p-1">
                          <button
                            onClick={() => window.location.href = `/admin/accounts/${config?.accountId}`}
                              className="p-1.5 text-gray-400 hover:text-[#0FF1CE] hover:bg-[#0FF1CE]/10 rounded transition-all"
                              title="View Account Details"
                          >
                              <Eye size={15} />
                          </button>
                          <button
                            onClick={() => refreshAccount(account)}
                            disabled={refreshingAccounts.has(config?.accountId || '')}
                              className="p-1.5 text-gray-400 hover:text-[#0FF1CE] hover:bg-[#0FF1CE]/10 rounded transition-all disabled:opacity-50"
                              title="Refresh Metrics"
                            >
                              <RefreshCw size={15} className={refreshingAccounts.has(config?.accountId || '') ? 'animate-spin' : ''} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUser(account);
                              setAccountForm({
                                accountId: config?.accountId || '',
                                accountToken: config?.accountToken || '',
                                accountType: config?.accountType && config.accountType !== 'vip' ? config.accountType : 'standard',
                                accountSize: config?.accountSize || 10000,
                                platform: config?.platform || 'mt5',
                                status: config?.status || 'active',
                                step: config?.step || 1
                              });
                              setShowEditModal(true);
                            }}
                              className="p-1.5 text-gray-400 hover:text-[#0FF1CE] hover:bg-[#0FF1CE]/10 rounded transition-all"
                              title="Edit Configuration"
                          >
                              <Edit2 size={15} />
                          </button>
                          <button
                            onClick={() => openLoginDetails(account)}
                            className="p-1.5 text-gray-400 hover:text-[#0FF1CE] hover:bg-[#0FF1CE]/10 rounded transition-all"
                            title="Login details"
                          >
                            <KeyRound size={15} />
                          </button>
                          </div>
                          
                          {/* Email Actions */}
                          {(config?.status === 'active' || config?.status === 'failed' || config?.status === 'passed' || config?.status === 'funded') && (
                            <div className="flex items-center gap-1 bg-[#151515] rounded-lg p-1">
                              {config?.status === 'passed' && (
                                <button
                                  onClick={() => sendEmailWithModal(() => sendPassEmail(account), 'pass email')}
                                  className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded transition-all"
                                  title="Send Pass Email"
                                >
                                  <Mail size={15} />
                                </button>
                              )}
                              {config?.status === 'failed' && (
                                <button
                                  onClick={() => sendEmailWithModal(() => config.step === 3 ? sendFundedFailEmail(account) : sendFailEmail(account), config.step === 3 ? 'funded fail email' : 'fail email')}
                                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                                  title={config.step === 3 ? "Send Funded Fail Email" : "Send Fail Email"}
                                >
                                  <Mail size={15} />
                                </button>
                              )}
                              {config?.status === 'funded' && (
                                <>
                                  <button
                                    onClick={() => sendEmailWithModal(() => sendFundedPassEmail(account), 'funded welcome email')}
                                    className="p-1.5 text-gray-400 hover:text-purple-400 hover:bg-purple-400/10 rounded transition-all"
                                    title="Send Funded Welcome Email"
                                  >
                                    <Mail size={15} />
                                  </button>
                                  <button
                                    onClick={() => sendEmailWithModal(() => sendFundedFailEmail(account), 'funded fail email')}
                                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                                    title="Send Funded Fail Email"
                                  >
                                    <Mail size={15} />
                                  </button>
                                  {metrics && (metrics.maxDrawdown >= 6 || (metrics.maxDailyDrawdown || metrics.dailyDrawdown) <= 3) && (
                                    <button
                                      onClick={() => sendEmailWithModal(() => sendFundedDrawdownWarningEmail(account), 'funded risk warning email')}
                                      className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-all"
                                      title="Send Funded Risk Warning Email"
                                    >
                                      <Mail size={15} />
                                    </button>
                                  )}
                                </>
                              )}
                              {config?.status === 'active' && (
                                <>
                                  <button
                                    onClick={() => sendEmailWithModal(() => sendPassEmail(account), 'pass email')}
                                    className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-green-400/10 rounded transition-all"
                                    title="Send Pass Email"
                                  >
                                    <Mail size={15} />
                                  </button>
                                  <button
                                    onClick={() => sendEmailWithModal(() => sendFailEmail(account), 'fail email')}
                                    className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                                    title="Send Fail Email"
                                  >
                                    <Mail size={15} />
                                  </button>
                                  {metrics && metrics.maxDrawdown >= 6 && (
                                    <button
                                      onClick={() => sendEmailWithModal(() => sendDrawdownWarningEmail(account), 'drawdown warning email')}
                                      className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-all"
                                      title="Send Drawdown Warning Email"
                                    >
                                      <Mail size={15} />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                          
                          {/* Account Management Actions */}
                          <div className="flex items-center gap-1 bg-[#151515] rounded-lg p-1">
                            <button
                              onClick={() => enableAccountFeatures(account)}
                              className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 rounded transition-all"
                              title="Enable MetaStats & Risk APIs"
                            >
                              <Activity size={15} />
                            </button>
                          {config?.status === 'active' && (
                            <>
                              <button
                                onClick={() => handleDisconnect(account.uid, config?.accountId || '')}
                                  className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-yellow-400/10 rounded transition-all"
                                title="Disconnect Account"
                              >
                                  <Power size={15} />
                              </button>
                              <button
                                onClick={() => handleFail(account.uid, config?.accountId || '')}
                                  className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded transition-all"
                                title="Mark as Failed"
                              >
                                  <XCircle size={15} />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(account.uid, config?.accountId || '')}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded transition-all"
                            title="Delete Account"
                          >
                              <Trash2 size={15} />
                          </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D0D0D] border border-[#2F2F2F] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#2F2F2F]">
              <h2 className="text-xl font-semibold text-white">Edit Account Configuration</h2>
              <p className="text-sm text-gray-400 mt-1">{selectedUser.email}</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    MetaAPI Account ID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={accountForm.accountId}
                    onChange={(e) => setAccountForm({ ...accountForm, accountId: e.target.value })}
                    placeholder="e.g., 50e36bcb-f0c2-49d2-939f-4aea4ea8eb94"
                    className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#0FF1CE]/50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    MetaAPI Token <span className="text-red-400">*</span>
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="password"
                      value={accountForm.accountToken}
                      onChange={(e) => setAccountForm({ ...accountForm, accountToken: e.target.value })}
                      placeholder="Enter MetaAPI token"
                      className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#0FF1CE]/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Account Type
                  </label>
                  <select
                    value={accountForm.accountType}
                    onChange={(e) => {
                      const newType = e.target.value as 'standard' | 'instant' | '1-step' | 'gauntlet' | 'funded';
                      // For funded accounts, set step to 3 automatically
                      if (newType === 'funded') {
                        setAccountForm({ 
                          ...accountForm, 
                          accountType: 'standard', // Funded accounts use standard rules
                          step: 3 // Step 3 indicates funded status
                        });
                      } else {
                      const sizes = getAccountSizes(newType);
                      setAccountForm({ 
                        ...accountForm, 
                        accountType: newType,
                          accountSize: sizes[0], // Reset to first available size for the new type
                          step: 1 // Reset to step 1 for non-funded accounts
                      });
                      }
                    }}
                    className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                  >
                    <option value="standard">Shockwave Standard</option>
                    <option value="instant">Shockwave Instant</option>
                    <option value="1-step">Shockwave 1-Step</option>
                    <option value="gauntlet">Shockwave Gauntlet</option>
                    <option value="funded">Funded Account</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Account Size
                  </label>
                  <select
                    value={accountForm.accountSize}
                    onChange={(e) => setAccountForm({ ...accountForm, accountSize: parseInt(e.target.value) })}
                    className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                  >
                    {getAccountSizes(accountForm.accountType).map((size) => (
                      <option key={size} value={size}>
                        ${size.toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Platform
                  </label>
                  <select
                    value={accountForm.platform}
                    onChange={(e) => setAccountForm({ ...accountForm, platform: e.target.value as 'mt4' | 'mt5' })}
                    className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                  >
                    <option value="mt4">MetaTrader 4</option>
                    <option value="mt5">MetaTrader 5</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Status
                  </label>
                  <select
                    value={accountForm.status}
                    onChange={(e) => setAccountForm({ ...accountForm, status: e.target.value as any })}
                    className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="funded">Funded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Challenge Step
                  </label>
                  <select
                    value={accountForm.step}
                    onChange={(e) => setAccountForm({ ...accountForm, step: parseInt(e.target.value) as 1 | 2 | 3 })}
                    className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                    disabled={accountForm.status === 'funded' || accountForm.step === 3}
                  >
                    <option value={1}>Step 1</option>
                    <option value={2}>Step 2</option>
                    <option value={3}>Funded</option>
                  </select>
                </div>
              </div>

              {/* Messages */}
              {message.text && (
                <div className={`p-4 rounded-lg mb-4 flex items-center gap-3 ${
                  message.type === 'error'
                    ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                    : message.type === 'success'
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                }`}>
                  {message.type === 'error' ? (
                    <AlertCircle size={20} />
                  ) : message.type === 'success' ? (
                    <CheckCircle size={20} />
                  ) : (
                    <AlertCircle size={20} />
                  )}
                  {message.text}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedUser(null);
                    setMessage({ type: '', text: '' });
                  }}
                  className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAccount}
                  disabled={saving || !accountForm.accountId || !accountForm.accountToken}
                  className="bg-[#0FF1CE] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Account Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D0D0D] border border-[#2F2F2F] rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#2F2F2F]">
              <h2 className="text-xl font-semibold text-white">Add Existing MetaAPI Account</h2>
              <p className="text-sm text-gray-400 mt-1">Manually add an existing MetaAPI account by entering its credentials</p>
            </div>
            
            <div className="p-6">
              {/* User Search */}
              {!searchedUser && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Search User by Email
                  </label>
                  <div className="relative">
                  <div className="flex gap-3">
                      <div className="flex-1 relative">
                    <input
                          type="text"
                      value={searchUserEmail}
                      onChange={(e) => setSearchUserEmail(e.target.value)}
                          onFocus={() => setShowRecentOrdersDropdown(true)}
                          placeholder="Start typing to search users..."
                          className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#0FF1CE]/50"
                        />
                        
                        {/* Recent Orders Dropdown */}
                        {showRecentOrdersDropdown && searchUserEmail === '' && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                            <div className="p-3 border-b border-[#2F2F2F] flex items-center justify-between">
                              <span className="text-sm text-gray-400">Recent Orders</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setRecentOrdersType('crypto')}
                                  className={`text-xs px-2 py-1 rounded ${recentOrdersType === 'crypto' ? 'bg-[#0FF1CE] text-black' : 'bg-[#151515] text-gray-400'}`}
                                >
                                  Crypto
                                </button>
                                <button
                                  onClick={() => setRecentOrdersType('credit')}
                                  className={`text-xs px-2 py-1 rounded ${recentOrdersType === 'credit' ? 'bg-[#0FF1CE] text-black' : 'bg-[#151515] text-gray-400'}`}
                                >
                                  Credit
                                </button>
                              </div>
                            </div>
                            {recentOrders.map((order) => (
                              <button
                                key={order.id}
                                onClick={() => {
                                  setSearchUserEmail(order.email || '');
                                  setShowRecentOrdersDropdown(false);
                                  // Auto-populate account form with order details
                                  setAccountForm(prev => ({
                                    ...prev,
                                    accountType: order.challengeType?.toLowerCase().includes('instant') ? 'instant' : 
                                                order.challengeType?.toLowerCase().includes('1-step') ? '1-step' : 
                                                order.challengeType?.toLowerCase().includes('gauntlet') ? 'gauntlet' : 'standard',
                                    accountSize: parseInt(order.challengeAmount?.replace(/[^0-9]/g, '') || '10000'),
                                    platform: (order.platform?.toLowerCase() || 'mt5') as 'mt4' | 'mt5'
                                  }));
                                }}
                                className="w-full p-3 hover:bg-white/5 text-left transition-colors flex items-center justify-between"
                              >
                                <div>
                                  <p className="text-sm text-white">{order.email || 'No email'}</p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {order.challengeType || 'Unknown'} • ${order.challengeAmount || '0'} • {order.platform || 'Unknown'}
                                  </p>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded ${order.type === 'crypto' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                  {order.type}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                        
                        {/* User Search Results */}
                        {searchUserEmail && filteredUsers.length > 0 && (
                          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                            {filteredUsers.map((user) => (
                              <button
                                key={user.uid}
                                onClick={() => {
                                  setSearchUserEmail(user.email || '');
                                  setSearchedUser(user);
                                  setShowRecentOrdersDropdown(false);
                                }}
                                className="w-full p-3 hover:bg-white/5 text-left transition-colors"
                              >
                                <p className="text-sm text-white">{user.email || 'No email'}</p>
                                {(user.displayName || user.firstName || user.lastName) && (
                                  <p className="text-xs text-gray-400 mt-1">
                                    {user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No name'}
                                  </p>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    <button
                      onClick={searchUserByEmail}
                      disabled={!searchUserEmail}
                      className="bg-[#0FF1CE] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Search size={20} />
                        Select
                    </button>
                    </div>
                    
                    {/* Click outside to close dropdowns */}
                    {(showRecentOrdersDropdown || (searchUserEmail && filteredUsers.length > 0)) && (
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowRecentOrdersDropdown(false)}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* User Found - Show Configuration Form */}
              {searchedUser && (
                <>
                  <div className="bg-[#151515] border border-[#2F2F2F] rounded-lg p-4 mb-6">
                    <p className="text-sm text-gray-400 mb-1">Configuring account for:</p>
                    <p className="text-white font-medium">{searchedUser.email || 'No email'}</p>
                    <p className="text-sm text-gray-400">
                      {searchedUser.displayName || `${searchedUser.firstName || ''} ${searchedUser.lastName || ''}`.trim() || 'No name'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        MetaAPI Account ID <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={accountForm.accountId}
                        onChange={(e) => setAccountForm({ ...accountForm, accountId: e.target.value })}
                        placeholder="e.g., 50e36bcb-f0c2-49d2-939f-4aea4ea8eb94"
                        className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#0FF1CE]/50"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        MetaAPI Token <span className="text-red-400">*</span>
                      </label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="password"
                          value={accountForm.accountToken}
                          onChange={(e) => setAccountForm({ ...accountForm, accountToken: e.target.value })}
                          placeholder="Enter MetaAPI token"
                          className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#0FF1CE]/50"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Account Type
                      </label>
                      <select
                        value={accountForm.accountType}
                        onChange={(e) => {
                          const newType = e.target.value as 'standard' | 'instant' | '1-step' | 'gauntlet' | 'funded';
                          // For funded accounts, set step to 3 automatically
                          if (newType === 'funded') {
                            setAccountForm({ 
                              ...accountForm, 
                              accountType: 'standard', // Funded accounts use standard rules
                              step: 3 // Step 3 indicates funded status
                            });
                          } else {
                          const sizes = getAccountSizes(newType);
                          setAccountForm({ 
                            ...accountForm, 
                            accountType: newType,
                              accountSize: sizes[0], // Reset to first available size for the new type
                              step: 1 // Reset to step 1 for non-funded accounts
                          });
                          }
                        }}
                        className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                      >
                        <option value="standard">Shockwave Standard</option>
                        <option value="instant">Shockwave Instant</option>
                        <option value="1-step">Shockwave 1-Step</option>
                        <option value="gauntlet">Shockwave Gauntlet</option>
                        <option value="funded">Funded Account</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Account Size
                      </label>
                      <select
                        value={accountForm.accountSize}
                        onChange={(e) => setAccountForm({ ...accountForm, accountSize: parseInt(e.target.value) })}
                        className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                      >
                        {getAccountSizes(accountForm.accountType).map((size) => (
                          <option key={size} value={size}>
                            ${size.toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Platform
                      </label>
                      <select
                        value={accountForm.platform}
                        onChange={(e) => setAccountForm({ ...accountForm, platform: e.target.value as 'mt4' | 'mt5' })}
                        className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                      >
                        <option value="mt4">MetaTrader 4</option>
                        <option value="mt5">MetaTrader 5</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Challenge Step
                      </label>
                      <select
                        value={accountForm.step}
                        onChange={(e) => setAccountForm({ ...accountForm, step: parseInt(e.target.value) as 1 | 2 | 3 })}
                        className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                        disabled={accountForm.status === 'funded' || accountForm.step === 3}
                      >
                        <option value={1}>Step 1</option>
                        <option value={2}>Step 2</option>
                        <option value={3}>Funded</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Messages */}
              {message.text && (
                <div className={`p-4 rounded-lg mb-4 flex items-center gap-3 ${
                  message.type === 'error'
                    ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                    : message.type === 'success'
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                }`}>
                  {message.type === 'error' ? (
                    <AlertCircle size={20} />
                  ) : message.type === 'success' ? (
                    <CheckCircle size={20} />
                  ) : (
                    <AlertCircle size={20} />
                  )}
                  {message.text}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSearchedUser(null);
                    setSearchUserEmail('');
                    setMessage({ type: '', text: '' });
                  }}
                  className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                {searchedUser && (
                  <button
                    onClick={() => {
                      setSelectedUser(searchedUser);
                      handleSaveAccount();
                    }}
                    disabled={saving || !accountForm.accountId || !accountForm.accountToken}
                    className="bg-[#0FF1CE] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Create Account
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ConnectMetaAccountModal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D0D0D] border border-[#2F2F2F] rounded-xl max-w-3xl w-full max-h-[90vh] overflow-visible relative">
            <div className="p-6 border-b border-[#2F2F2F]">
              <h2 className="text-xl font-semibold text-white">
                Connect Demo Account to MetaAPI
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                Step {connectModalStep} of 3: {connectModalStep === 1 ? 'Connect MT4/MT5 Demo Account' : connectModalStep === 2 ? 'Configure Challenge Settings' : 'Send Login Credentials'}
              </p>
              
              {/* Progress Indicator */}
              <div className="flex items-center mt-4 space-x-4">
                <div className={`flex items-center space-x-2 ${connectModalStep >= 1 ? 'text-[#0FF1CE]' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${connectModalStep >= 1 ? 'border-[#0FF1CE] bg-[#0FF1CE]/10' : 'border-gray-400'}`}>
                    {connectModalStep > 1 ? <CheckCircle size={16} /> : '1'}
                  </div>
                  <span className="text-sm font-medium">Connect Account</span>
                </div>
                <div className={`h-0.5 flex-1 ${connectModalStep > 1 ? 'bg-[#0FF1CE]' : 'bg-gray-600'}`}></div>
                <div className={`flex items-center space-x-2 ${connectModalStep >= 2 ? 'text-[#0FF1CE]' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${connectModalStep >= 2 ? 'border-[#0FF1CE] bg-[#0FF1CE]/10' : 'border-gray-400'}`}>
                    {connectModalStep > 2 ? <CheckCircle size={16} /> : '2'}
                  </div>
                  <span className="text-sm font-medium">Configure Challenge</span>
                </div>
                <div className={`h-0.5 flex-1 ${connectModalStep > 2 ? 'bg-[#0FF1CE]' : 'bg-gray-600'}`}></div>
                <div className={`flex items-center space-x-2 ${connectModalStep >= 3 ? 'text-[#0FF1CE]' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${connectModalStep >= 3 ? 'border-[#0FF1CE] bg-[#0FF1CE]/10' : 'border-gray-400'}`}>
                    <Mail size={16} />
                  </div>
                  <span className="text-sm font-medium">Send Credentials</span>
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Step 1: MetaTrader Account Details */}
              {connectModalStep === 1 && (
                <>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-4">MetaTrader Demo Account Details</h3>
                    <p className="text-sm text-gray-400 mb-6">
                      Enter the details of your manually created MT4/MT5 demo account to connect it to MetaAPI.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Login <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={connectModalData.step1.login}
                          onChange={(e) => setConnectModalData(prev => ({
                            ...prev,
                            step1: { ...prev.step1, login: e.target.value }
                          }))}
                          placeholder="Enter MT account login"
                          className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#0FF1CE]/50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Password <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="password"
                          value={connectModalData.step1.password}
                          onChange={(e) => setConnectModalData(prev => ({
                            ...prev,
                            step1: { ...prev.step1, password: e.target.value }
                          }))}
                          placeholder="Enter MT account password"
                          className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#0FF1CE]/50"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Server <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={connectModalData.step1.server}
                          onChange={(e) => setConnectModalData(prev => ({
                            ...prev,
                            step1: { ...prev.step1, server: e.target.value }
                          }))}
                          className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                        >
                          <option value="">Select Server</option>
                          <option value="AXI-US03-DEMO">AXI-US03-DEMO</option>
                          <option value="ADMIRALSGROUP-DEMO">ADMIRALSGROUP-DEMO</option>
                          <option value="FUSIONMARKETS-DEMO">FUSIONMARKETS-DEMO</option>
                          <option value="DominionMarkets-Live">DominionMarkets-Live</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Platform <span className="text-red-400">*</span>
                        </label>
                        <select
                          value={connectModalData.step1.platform}
                          onChange={(e) => setConnectModalData(prev => ({
                            ...prev,
                            step1: { ...prev.step1, platform: e.target.value as 'mt4' | 'mt5' }
                          }))}
                          className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                        >
                          <option value="mt5">MetaTrader 5</option>
                          <option value="mt4">MetaTrader 4</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Nickname <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={connectModalData.step1.nickname}
                          onChange={(e) => setConnectModalData(prev => ({
                            ...prev,
                            step1: { ...prev.step1, nickname: e.target.value }
                          }))}
                          placeholder="Enter a friendly name for this account"
                          className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#0FF1CE]/50"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Step 2: Challenge Configuration */}
              {connectModalStep === 2 && (
                <>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Configure Challenge Settings</h3>
                    
                    {/* Connected Account Info */}
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="text-green-400" size={20} />
                        <div>
                          <p className="text-green-400 font-medium">MetaAPI Connection Successful</p>
                          <p className="text-sm text-gray-400">
                            Account ID: {connectModalData.accountId.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* User Search */}
                    {!searchedUser && (
                      <div className="mb-6 relative">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Search User by Email
                        </label>
                        <div className="relative">
                        <div className="flex gap-3">
                            <div className="flex-1 relative">
                          <input
                                type="text"
                            value={searchUserEmail}
                            onChange={(e) => setSearchUserEmail(e.target.value)}
                                onFocus={() => setShowRecentOrdersDropdown(true)}
                                placeholder="Start typing to search users..."
                                className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#0FF1CE]/50"
                              />
                              
                              {/* Recent Orders Dropdown */}
                              {showRecentOrdersDropdown && searchUserEmail === '' && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg shadow-xl z-[60] max-h-96 overflow-y-auto">
                                  <div className="p-3 border-b border-[#2F2F2F] flex items-center justify-between">
                                    <span className="text-sm text-gray-400">Recent Orders</span>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setRecentOrdersType('crypto')}
                                        className={`text-xs px-2 py-1 rounded ${recentOrdersType === 'crypto' ? 'bg-[#0FF1CE] text-black' : 'bg-[#151515] text-gray-400'}`}
                                      >
                                        Crypto
                                      </button>
                                      <button
                                        onClick={() => setRecentOrdersType('credit')}
                                        className={`text-xs px-2 py-1 rounded ${recentOrdersType === 'credit' ? 'bg-[#0FF1CE] text-black' : 'bg-[#151515] text-gray-400'}`}
                                      >
                                        Credit
                                      </button>
                                    </div>
                                  </div>
                                  {recentOrders.map((order) => (
                                    <button
                                      key={order.id}
                                      onClick={() => {
                                        setSearchUserEmail(order.email);
                                        setShowRecentOrdersDropdown(false);
                                        // Auto-populate account form with order details
                                        setAccountForm(prev => ({
                                          ...prev,
                                          accountType: order.challengeType.toLowerCase().includes('instant') ? 'instant' : 
                                                      order.challengeType.toLowerCase().includes('1-step') ? '1-step' : 
                                                      order.challengeType.toLowerCase().includes('gauntlet') ? 'gauntlet' : 'standard',
                                          accountSize: parseInt(order.challengeAmount.replace(/[^0-9]/g, '')),
                                          platform: order.platform.toLowerCase() as 'mt4' | 'mt5'
                                        }));
                                      }}
                                      className="w-full p-3 hover:bg-white/5 text-left transition-colors flex items-center justify-between"
                                    >
                                      <div>
                                        <p className="text-sm text-white">{order.email}</p>
                                        <p className="text-xs text-gray-400 mt-1">
                                          {order.challengeType} • ${order.challengeAmount} • {order.platform}
                                        </p>
                                      </div>
                                      <span className={`text-xs px-2 py-1 rounded ${order.type === 'crypto' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                        {order.type}
                                      </span>
                                    </button>
                                  ))}
                                </div>
                              )}
                              
                              {/* User Search Results */}
                              {searchUserEmail && filteredUsers.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#0D0D0D] border border-[#2F2F2F] rounded-lg shadow-xl z-[60] max-h-96 overflow-y-auto">
                                  {filteredUsers.map((user) => (
                                    <button
                                      key={user.uid}
                                      onClick={() => {
                                        setSearchUserEmail(user.email || '');
                                        setSearchedUser(user);
                                        setShowRecentOrdersDropdown(false);
                                      }}
                                      className="w-full p-3 hover:bg-white/5 text-left transition-colors"
                                    >
                                      <p className="text-sm text-white">{user.email || 'No email'}</p>
                                      {(user.displayName || user.firstName || user.lastName) && (
                                        <p className="text-xs text-gray-400 mt-1">
                                          {user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'No name'}
                                        </p>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          <button
                            onClick={searchUserByEmail}
                            disabled={!searchUserEmail}
                            className="bg-[#0FF1CE] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <Search size={20} />
                              Select
                          </button>
                          </div>
                          
                          {/* Click outside to close dropdowns */}
                          {(showRecentOrdersDropdown || (searchUserEmail && filteredUsers.length > 0)) && (
                            <div
                              className="fixed inset-0 z-[55]"
                              onClick={() => setShowRecentOrdersDropdown(false)}
                            />
                          )}
                        </div>
                      </div>
                    )}

                    {/* User Found */}
                    {searchedUser && (
                      <>
                        <div className="bg-[#151515] border border-[#2F2F2F] rounded-lg p-4 mb-6">
                          <p className="text-sm text-gray-400 mb-1">Configuring account for:</p>
                          <p className="text-white font-medium">{searchedUser.email}</p>
                          <p className="text-sm text-gray-400">
                            {searchedUser.displayName || `${searchedUser.firstName} ${searchedUser.lastName}`.trim() || 'No name'}
                          </p>
                        </div>

                        {/* Pre-filled Account Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              MetaAPI Account ID
                            </label>
                            <input
                              type="text"
                              value={connectModalData.accountId}
                              disabled
                              className="w-full bg-[#0A0A0A] border border-[#2F2F2F] rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed font-mono text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Platform
                            </label>
                            <input
                              type="text"
                              value={connectModalData.step1.platform.toUpperCase()}
                              disabled
                              className="w-full bg-[#0A0A0A] border border-[#2F2F2F] rounded-lg px-4 py-3 text-gray-400 cursor-not-allowed"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Account Type
                            </label>
                            <select
                              value={accountForm.accountType}
                              onChange={(e) => {
                                const newType = e.target.value as 'standard' | 'instant' | '1-step' | 'gauntlet' | 'funded';
                                // For funded accounts, set step to 3 automatically
                                if (newType === 'funded') {
                                  setAccountForm({ 
                                    ...accountForm, 
                                    accountType: 'standard', // Funded accounts use standard rules
                                    step: 3 // Step 3 indicates funded status
                                  });
                                } else {
                                const sizes = getAccountSizes(newType);
                                setAccountForm({ 
                                  ...accountForm, 
                                  accountType: newType,
                                    accountSize: sizes[0], // Reset to first available size for the new type
                                    step: 1 // Reset to step 1 for non-funded accounts
                                });
                                }
                              }}
                              className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                            >
                              <option value="standard">Shockwave Standard</option>
                              <option value="instant">Shockwave Instant</option>
                              <option value="1-step">Shockwave 1-Step</option>
                              <option value="gauntlet">Shockwave Gauntlet</option>
                              <option value="funded">Funded Account</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Account Size
                            </label>
                            <select
                              value={accountForm.accountSize}
                              onChange={(e) => setAccountForm({ ...accountForm, accountSize: parseInt(e.target.value) })}
                              className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                            >
                              {getAccountSizes(accountForm.accountType).map((size) => (
                                <option key={size} value={size}>
                                  ${size.toLocaleString()}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-400 mb-2">
                              Challenge Step
                            </label>
                            <select
                              value={accountForm.step}
                              onChange={(e) => setAccountForm({ ...accountForm, step: parseInt(e.target.value) as 1 | 2 | 3 })}
                              className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                              disabled={accountForm.status === 'funded' || accountForm.step === 3}
                            >
                              <option value={1}>Step 1</option>
                              <option value={2}>Step 2</option>
                              <option value={3}>Funded</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Step 3: Send Login Credentials */}
              {connectModalStep === 3 && (
                <>
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Send Login Credentials</h3>
                    
                    {/* Success Message */}
                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="text-green-400" size={20} />
                        <div>
                          <p className="text-green-400 font-medium">Challenge Account Created Successfully!</p>
                          <p className="text-sm text-gray-400">
                            The account has been connected to {searchedUser?.email || 'the user'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {/* Email Preview */}
                    <div className="bg-[#151515] border border-[#2F2F2F] rounded-lg p-6">
                      <h4 className="text-white font-medium mb-4">Email Preview</h4>
                      
                      <div className="space-y-3 mb-6">
                        <div>
                          <p className="text-sm text-gray-400">To:</p>
                          <p className="text-white">{searchedUser?.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Subject:</p>
                          <p className="text-white">Challenge Login Details - Shockwave Capital</p>
                        </div>
                      </div>
                      
                      <div className="border border-[#2F2F2F] rounded-lg overflow-hidden">
                        <div className="bg-[#0FF1CE] p-4 text-center">
                          <h2 className="text-[#0D0D0D] text-xl font-bold">Shockwave Capital</h2>
                        </div>
                        <div className="p-6 bg-[#0D0D0D]">
                          <h3 className="text-white text-lg font-semibold mb-4">Your Trading Challenge Details</h3>
                          
                          <div className="bg-[#151515] border border-[#2F2F2F] rounded-lg overflow-hidden mb-4">
                            <div className="bg-[#0FF1CE] p-3 text-center">
                              <p className="text-[#0D0D0D] font-semibold">Your Trading Account Credentials</p>
                            </div>
                            <div className="p-4 space-y-2">
                              <div className="flex justify-between">
                                <span className="text-gray-400">Platform:</span>
                                <span className="text-white font-mono">{connectModalData.step1.platform === 'mt5' ? 'MetaTrader 5' : 'MetaTrader 4'}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Login ID:</span>
                                <span className="text-white font-mono">{connectModalData.step1.login}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Password:</span>
                                <span className="text-white font-mono">{'•'.repeat(connectModalData.step1.password.length)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-400">Server:</span>
                                <span className="text-white font-mono">{connectModalData.step1.server}</span>
                              </div>
                            </div>
                          </div>
                          
                          <p className="text-gray-400 text-sm">
                            The user will receive detailed instructions on how to connect to their trading account.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {connectModalData.emailSent && (
                      <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="text-green-400" size={20} />
                          <p className="text-green-400">Login credentials email has been sent successfully!</p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Messages */}
              {message.text && (
                <div className={`p-4 rounded-lg mb-4 flex items-center gap-3 ${
                  message.type === 'error'
                    ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                    : message.type === 'success'
                    ? 'bg-green-500/10 border border-green-500/30 text-green-400'
                    : 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                }`}>
                  {message.type === 'error' ? (
                    <AlertCircle size={20} />
                  ) : message.type === 'success' ? (
                    <CheckCircle size={20} />
                  ) : (
                    <AlertCircle size={20} />
                  )}
                  {message.text}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between">
                <div>
                  {(connectModalStep === 2 || connectModalStep === 3) && (
                    <button
                      onClick={() => {
                        setConnectModalStep(connectModalStep === 3 ? 2 : 1);
                        setMessage({ type: '', text: '' });
                        if (connectModalStep === 3) {
                          setConnectModalData(prev => ({ ...prev, emailSent: false }));
                        }
                      }}
                      className="px-6 py-3 text-gray-400 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <span>← Back</span>
                    </button>
                  )}
                </div>
                
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      setShowConnectModal(false);
                      setConnectModalStep(1);
                      setConnectModalData({
                        step1: {
                          login: '',
                          password: '',
                          server: '',
                          platform: 'mt5',
                          nickname: ''
                        },
                        accountId: '',
                        authToken: '',
                        sendEmail: false,
                        emailSent: false
                      });
                      setSearchedUser(null);
                      setSearchUserEmail('');
                      setMessage({ type: '', text: '' });
                    }}
                    className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  {connectModalStep === 3 && !connectModalData.emailSent && (
                    <button
                      onClick={() => {
                        setShowConnectModal(false);
                        setConnectModalStep(1);
                        setConnectModalData({
                          step1: {
                            login: '',
                            password: '',
                            server: '',
                            platform: 'mt5',
                            nickname: ''
                          },
                          accountId: '',
                          authToken: '',
                          sendEmail: false,
                          emailSent: false
                        });
                        setSearchedUser(null);
                        setSearchUserEmail('');
                        setMessage({ type: '', text: '' });
                        loadAllAccounts();
                      }}
                      className="px-6 py-3 text-gray-400 hover:text-white transition-colors"
                    >
                      Skip Email
                    </button>
                  )}
                  
                  {connectModalStep === 1 ? (
                    <button
                      onClick={handleConnectStep1Submit}
                      disabled={connectingToMetaAPI || !connectModalData.step1.login || !connectModalData.step1.password || !connectModalData.step1.server || !connectModalData.step1.nickname}
                      className="bg-green-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {connectingToMetaAPI ? <Loader2 className="animate-spin" size={20} /> : <Server size={20} />}
                      Connect to MetaAPI
                    </button>
                  ) : connectModalStep === 2 ? (
                    <button
                      onClick={handleConnectStep2Submit}
                      disabled={saving || !searchedUser}
                      className="bg-[#0FF1CE] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                      Create Challenge Account
                    </button>
                  ) : (
                    <>
                      {!connectModalData.emailSent ? (
                        <button
                          onClick={() => sendLoginCredentialsEmail()}
                          disabled={sendingCredentialsEmail}
                          className="bg-[#0FF1CE] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                          {sendingCredentialsEmail ? <Loader2 className="animate-spin" size={20} /> : <Mail size={20} />}
                          Send Login Email
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setShowConnectModal(false);
                            setConnectModalStep(1);
                            setConnectModalData({
                              step1: {
                                login: '',
                                password: '',
                                server: '',
                                platform: 'mt5',
                                nickname: ''
                              },
                              accountId: '',
                              authToken: '',
                              sendEmail: false,
                              emailSent: false
                            });
                            setSearchedUser(null);
                            setSearchUserEmail('');
                            setMessage({ type: '', text: '' });
                            loadAllAccounts();
                          }}
                          className="bg-green-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                        >
                          <CheckCircle size={20} />
                          Complete
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Sending Modal */}
      {showEmailSendingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D0D0D] border border-[#2F2F2F] rounded-xl p-8 max-w-sm w-full">
            <div className="flex flex-col items-center">
              {emailSendingStatus === 'sending' && (
                <>
                  <Loader2 className="w-12 h-12 text-[#0FF1CE] animate-spin mb-4" />
                  <p className="text-white text-lg font-medium mb-2">Sending Email</p>
                  <p className="text-gray-400 text-sm text-center">{emailSendingMessage}</p>
                </>
              )}
              {emailSendingStatus === 'success' && (
                <>
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <p className="text-white text-lg font-medium mb-2">Email Sent!</p>
                  <p className="text-gray-400 text-sm text-center">{emailSendingMessage}</p>
                </>
              )}
              {emailSendingStatus === 'error' && (
                <>
                  <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                    <XCircle className="w-8 h-8 text-red-400" />
                  </div>
                  <p className="text-white text-lg font-medium mb-2">Failed to Send</p>
                  <p className="text-gray-400 text-sm text-center">{emailSendingMessage}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {credentialsAccount && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0D0D0D] border border-[#2F2F2F] rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-[#2F2F2F]">
              <h2 className="text-xl font-semibold text-white">Login details</h2>
              <button onClick={() => setCredentialsAccount(null)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-400">
                These credentials appear on the user My Accounts page and are emailed to {credentialsAccount.email} plus support@shockwave-capital.com.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Broker login</label>
                <input
                  type="text"
                  value={credentialForm.login}
                  onChange={(e) => setCredentialForm((prev) => ({ ...prev, login: e.target.value }))}
                  className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Password</label>
                <input
                  type="password"
                  value={credentialForm.password}
                  onChange={(e) => setCredentialForm((prev) => ({ ...prev, password: e.target.value }))}
                  className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Server</label>
                <input
                  type="text"
                  value={credentialForm.server}
                  onChange={(e) => setCredentialForm((prev) => ({ ...prev, server: e.target.value }))}
                  className="w-full bg-[#151515] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50"
                />
              </div>
            </div>
            <div className="p-6 border-t border-[#2F2F2F] flex justify-end gap-3">
              <button onClick={() => setCredentialsAccount(null)} className="px-6 py-3 text-gray-400 hover:text-white transition-colors">
                Cancel
              </button>
              <button
                onClick={saveExistingCredentials}
                disabled={saving || sendingCredentialsEmail}
                className="bg-[#0FF1CE] text-black font-semibold px-6 py-3 rounded-lg hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                <Mail size={16} />
                {saving || sendingCredentialsEmail ? 'Saving...' : 'Save and email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 