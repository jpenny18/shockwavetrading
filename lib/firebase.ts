import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  updateDoc, 
  Timestamp,
  getDocs,
  query,
  where,
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser,
  UserCredential
} from 'firebase/auth';
import { isVipMetaApiAccount } from './vip-accounts';
import { 
  getStorage, 
  ref, 
  uploadBytes, 
  getDownloadURL,
  deleteObject 
} from 'firebase/storage';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Verify Firebase config is loaded
if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
  console.error('Firebase configuration is missing required values. Check your .env.local file.');
}

// Initialize Firebase
let app: FirebaseApp;

if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

/**
 * Interface for user data to be stored in Firestore
 */
export interface UserData {
  uid: string;
  email: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  status: 'active' | 'inactive';
  notes?: string;
  totalSpent?: number;
  orderCount?: number;
  lastOrderDate?: Timestamp;
  payoutsUnlocked?: boolean;
  payoutsUnlockedAt?: Timestamp;
  payoutsUnlockedBy?: string;
}

/**
 * Interface for order data to be stored in Firestore
 */
export interface OrderData {
  userId?: string | null;
  customerEmail: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  discordUsername?: string;
  challengeType: string;
  challengeAmount: string;
  platform: string;
  addOns?: string[];
  totalAmount: number;
  paymentMethod: 'card' | 'crypto';
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed';
  paymentIntentId?: string;
  transactionId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Interface for MetaAPI account mapping
 */
export interface UserMetaApiAccount {
  userId: string;
  accountId: string;
  accountToken: string;
  accountType: 'standard' | 'instant' | '1-step' | 'gauntlet' | 'vip';
  accountSize: number;
  platform: 'mt4' | 'mt5';
  status: 'active' | 'inactive' | 'passed' | 'failed' | 'funded';
  step: 1 | 2 | 3; // 1 = Step 1, 2 = Step 2, 3 = Funded
  startDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMetricsUpdate?: Timestamp;
  trackerId?: string; // Risk management tracker ID
  fundedDate?: Timestamp; // Date when account became funded
  loginCredentials?: {
    login: string;
    password: string;
    server: string;
  };
  profitSplit?: number; // VIP funded accounts only, 80-100
}

/**
 * Interface for cached MetaAPI metrics in Firestore
 */
export interface CachedMetrics {
  accountId: string;
  balance: number;
  equity: number;
  averageProfit: number;
  averageLoss: number;
  numberOfTrades: number;
  averageRRR: number;
  lots: number;
  expectancy: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  dailyDrawdown: number;
  maxDailyDrawdown: number; // Maximum daily drawdown achieved during the challenge
  currentProfit: number;
  tradingDays: number;
  lastUpdated: Timestamp;
  // Additional cached data from enhanced metrics
  accountName?: string;
  broker?: string;
  server?: string;
  wonTrades?: number;
  lostTrades?: number;
  lastTrades?: any[];
  lastEquityChart?: any[];
  lastObjectives?: any;
  lastRiskEvents?: any[]; // Risk events from MetaAPI Risk Management
  lastPeriodStats?: any[]; // Period statistics from MetaAPI Risk Management
  lastTrackers?: any[]; // Risk management trackers
}

/**
 * Interface for KYC submission data
 */
export interface KYCSubmission {
  userId: string;
  email: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_resubmission';
  personalInfo: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
    email: string;
  };
  documents: {
    governmentIdUrl?: string;
    governmentIdFileName?: string;
    proofOfAddressUrl?: string;
    proofOfAddressFileName?: string;
    tradingAgreementUrl?: string;
    tradingAgreementSignedAt?: Timestamp;
  };
  reviewNotes?: string;
  submittedAt: Timestamp;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  updatedAt: Timestamp;
}

/**
 * Interface for withdrawal request data
 */
export interface WithdrawalRequest {
  userId: string;
  userEmail: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  amountOwed: number;
  profitSplit: number; // Percentage (e.g., 80 for 80%)
  payoutAmount: number; // Calculated amount after profit split
  paymentMethod: 'usdc_solana' | 'usdt_trc20';
  walletAddress?: string;
  transactionHash?: string;
  submittedAt?: Timestamp;
  enabledAt: Timestamp;
  enabledBy: string; // Admin who enabled
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  reviewNotes?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Interface for a VIP activation offer (admin-unlocked, per-user)
 * Doc ID = userId in the 'vipActivations' collection.
 * Presence of the doc unlocks the /dashboard/vip page for that user.
 */
export interface VIPActivation {
  userId: string;
  userEmail: string;
  accountSize: string;
  tierName?: string;
  price: number;
  publicPrice?: number;
  adminNotes?: string;
  enabledAt: Timestamp;
  enabledBy: string;
  paymentStatus: 'unpaid' | 'pending' | 'completed';
  platform?: string;
  cryptoOrderId?: string;
  paymentSubmittedAt?: Timestamp;
  paymentCompletedAt?: Timestamp;
  kybStatus: 'not_submitted' | 'pending' | 'approved' | 'rejected' | 'needs_resubmission';
  companyName?: string;
  customTerms?: {
    title: string;
    content: string;
  };
  documents: {
    corporateDocs?: Array<{
      url: string;
      fileName: string;
      uploadedAt: Timestamp;
    }>;
    agreementSignedAt?: Timestamp;
    customTermsSignedAt?: Timestamp;
  };
  kybSubmittedAt?: Timestamp;
  reviewNotes?: string;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
  lastVisitedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Register a new user with email and password
 * @param email User's email
 * @param password User's password
 * @param userData Additional user data
 * @returns Firebase UserCredential
 */
export async function registerUser(
  email: string, 
  password: string, 
  userData: Partial<UserData>
): Promise<UserCredential> {
  try {
    // Create auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Add display name if provided
    if (userData.displayName) {
      await updateProfile(user, {
        displayName: userData.displayName
      });
    }
    
    // Store additional user data in Firestore
    const now = Timestamp.now();
    const userDoc = {
      uid: user.uid,
      email: user.email || email,
      displayName: userData.displayName || '',
      firstName: userData.firstName || '',
      lastName: userData.lastName || '',
      phone: userData.phone || '',
      country: userData.country || '',
      createdAt: now,
      updatedAt: now,
      status: 'active' as const,
      totalSpent: 0,
      orderCount: 0
    };
    
    await setDoc(doc(db, 'users', user.uid), userDoc);
    
    return userCredential;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

/**
 * Sign in a user with email and password
 * @param email User's email
 * @param password User's password
 * @returns Firebase UserCredential
 */
export async function signInUser(email: string, password: string): Promise<UserCredential> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update last login timestamp in Firestore
    const userRef = doc(db, 'users', userCredential.user.uid);
    await updateDoc(userRef, {
      lastLoginAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    return userCredential;
  } catch (error) {
    console.error('Error signing in user:', error);
    throw error;
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
}

/**
 * Send a password reset email to the user
 * @param email User's email
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw error;
  }
}

/**
 * Get the current authenticated user
 * @returns Promise that resolves with the current user
 */
export function getCurrentUser(): Promise<FirebaseUser | null> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        resolve(user);
      },
      (error) => {
        reject(error);
      }
    );
  });
}

/**
 * Get a user from Firestore by ID
 * @param userId The user ID to retrieve
 * @returns The user data
 */
export async function getUser(userId: string): Promise<UserData | null> {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return userSnap.data() as UserData;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error retrieving user:', error);
    throw error;
  }
}

/**
 * Get all users from Firestore
 * @returns Array of users
 */
export async function getAllUsers(): Promise<UserData[]> {
  try {
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    const users: UserData[] = [];
    querySnapshot.forEach((doc) => {
      users.push(doc.data() as UserData);
    });
    
    return users;
  } catch (error) {
    console.error('Error retrieving users:', error);
    throw error;
  }
}

/**
 * Open or close the customer payouts page without creating a payout request.
 */
export async function setUserPayoutsAccess(userId: string, unlocked: boolean, adminId: string): Promise<void> {
  await updateUser(userId, {
    payoutsUnlocked: unlocked,
    payoutsUnlockedAt: Timestamp.now(),
    payoutsUnlockedBy: adminId,
  });
}

/**
 * Update a user's data in Firestore
 * @param userId The user ID to update
 * @param userData The user data to update
 */
export async function updateUser(userId: string, userData: Partial<UserData>): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...userData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
}

/**
 * Create a new order in Firestore
 * @param orderData Order data to be stored
 * @returns The created order's ID
 */
export async function createOrder(orderData: Omit<OrderData, 'createdAt' | 'updatedAt'>) {
  try {
    const now = Timestamp.now();
    
    const orderRef = await addDoc(collection(db, 'orders'), {
      ...orderData,
      createdAt: now,
      updatedAt: now,
    });
    
    // If order has a userId, update the user's order stats
    if (orderData.userId) {
      const userRef = doc(db, 'users', orderData.userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data() as UserData;
        await updateDoc(userRef, {
          totalSpent: (userData.totalSpent || 0) + orderData.totalAmount,
          orderCount: (userData.orderCount || 0) + 1,
          lastOrderDate: now,
          updatedAt: now
        });
      }
    }
    
    return orderRef.id;
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

/**
 * Get an order from Firestore by ID
 * @param orderId The ID of the order to retrieve
 * @returns The order data
 */
export async function getOrder(orderId: string) {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const orderSnap = await getDoc(orderRef);
    
    if (orderSnap.exists()) {
      return { id: orderSnap.id, ...orderSnap.data() } as OrderData & { id: string };
    } else {
      throw new Error(`Order with ID ${orderId} not found`);
    }
  } catch (error) {
    console.error('Error retrieving order:', error);
    throw error;
  }
}

/**
 * Update an order's payment status in Firestore
 * @param orderId The ID of the order to update
 * @param paymentStatus The new payment status
 * @param paymentIntentId Optional payment intent ID to store
 * @param transactionId Optional transaction ID to store
 */
export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: OrderData['paymentStatus'],
  paymentIntentId?: string,
  transactionId?: string
) {
  try {
    const orderRef = doc(db, 'orders', orderId);
    const updateData: Partial<OrderData> = {
      paymentStatus,
      updatedAt: Timestamp.now(),
    };
    
    if (paymentIntentId) {
      updateData.paymentIntentId = paymentIntentId;
    }
    
    if (transactionId) {
      updateData.transactionId = transactionId;
    }
    
    await updateDoc(orderRef, updateData);
  } catch (error) {
    console.error('Error updating order payment status:', error);
    throw error;
  }
}

/**
 * Get orders by payment intent ID
 * @param paymentIntentId The payment intent ID to search for
 * @returns Array of matching orders
 */
export async function getOrdersByPaymentIntentId(paymentIntentId: string) {
  try {
    const ordersRef = collection(db, 'orders');
    const q = query(ordersRef, where('paymentIntentId', '==', paymentIntentId));
    const querySnapshot = await getDocs(q);
    
    const orders: Array<OrderData & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      orders.push({ id: doc.id, ...doc.data() } as OrderData & { id: string });
    });
    
    return orders;
  } catch (error) {
    console.error('Error retrieving orders by payment intent ID:', error);
    throw error;
  }
}

/**
 * Get user's MetaAPI account mapping
 * @param userId The user ID
 * @param accountId Optional specific account ID to fetch
 */
export async function getUserMetaApiAccount(userId: string, accountId?: string): Promise<UserMetaApiAccount | null> {
  try {
    const accountsRef = collection(db, 'userMetaApiAccounts');
    
    // If accountId is provided, fetch that specific account
    if (accountId) {
      const q = query(
        accountsRef, 
        where('userId', '==', userId), 
        where('accountId', '==', accountId)
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].data() as UserMetaApiAccount;
      }
      return null;
    }
    
    // Otherwise, get the first active account (original behavior)
    const q = query(accountsRef, where('userId', '==', userId), where('status', '==', 'active'));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as UserMetaApiAccount;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user MetaAPI account:', error);
    throw error;
  }
}

/**
 * Get a specific MetaAPI account by accountId for a user
 * @param userId The user ID
 * @param accountId The specific account ID
 */
export async function getUserMetaApiAccountById(userId: string, accountId: string): Promise<UserMetaApiAccount | null> {
  try {
    const accountsRef = collection(db, 'userMetaApiAccounts');
    const q = query(
      accountsRef, 
      where('userId', '==', userId), 
      where('accountId', '==', accountId)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].data() as UserMetaApiAccount;
    }
    return null;
  } catch (error) {
    console.error('Error fetching specific MetaAPI account:', error);
    throw error;
  }
}

/**
 * Get all MetaAPI accounts for a user
 */
export async function getAllUserMetaApiAccounts(userId: string): Promise<UserMetaApiAccount[]> {
  try {
    const accountsRef = collection(db, 'userMetaApiAccounts');
    const q = query(accountsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const accounts: UserMetaApiAccount[] = [];
    querySnapshot.forEach((doc) => {
      accounts.push(doc.data() as UserMetaApiAccount);
    });
    
    return accounts;
  } catch (error) {
    console.error('Error fetching user MetaAPI accounts:', error);
    throw error;
  }
}

/**
 * Get a user's VIP MetaAPI accounts only (excludes challenge accounts).
 */
export async function getUserVipMetaApiAccounts(userId: string): Promise<UserMetaApiAccount[]> {
  const accounts = await getAllUserMetaApiAccounts(userId);
  return accounts.filter((account) => isVipMetaApiAccount(account));
}

/**
 * Create or update user's MetaAPI account mapping
 */
export async function setUserMetaApiAccount(data: Omit<UserMetaApiAccount, 'createdAt' | 'updatedAt'>): Promise<void> {
  try {
    const payload = isVipMetaApiAccount(data) ? { ...data, accountType: 'vip' as const } : data;
    const accountsRef = collection(db, 'userMetaApiAccounts');
    
    // Check if this specific accountId already exists for this user (to prevent duplicates)
    const duplicateQuery = query(
      accountsRef, 
      where('userId', '==', data.userId),
      where('accountId', '==', data.accountId)
    );
    const duplicateSnapshot = await getDocs(duplicateQuery);
    
    if (!duplicateSnapshot.empty) {
      // Update existing account with same accountId
      const docId = duplicateSnapshot.docs[0].id;
      await updateDoc(doc(db, 'userMetaApiAccounts', docId), {
        ...payload,
        updatedAt: Timestamp.now()
      });
    } else {
      // Create new account (allow multiple accounts per user)
      await addDoc(accountsRef, {
        ...payload,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }
  } catch (error) {
    console.error('Error setting user MetaAPI account:', error);
    throw error;
  }
}

/**
 * Get cached metrics for an account
 */
export async function getCachedMetrics(accountId: string): Promise<CachedMetrics | null> {
  try {
    const metricsRef = doc(db, 'cachedMetrics', accountId);
    const metricsSnap = await getDoc(metricsRef);
    
    if (metricsSnap.exists()) {
      return metricsSnap.data() as CachedMetrics;
    }
    return null;
  } catch (error) {
    console.error('Error fetching cached metrics:', error);
    throw error;
  }
}

/**
 * Update cached metrics for an account
 */
export async function updateCachedMetrics(accountId: string, metrics: Partial<Omit<CachedMetrics, 'lastUpdated'>>): Promise<void> {
  try {
    const metricsRef = doc(db, 'cachedMetrics', accountId);
    // Merge write: a partial update must never delete fields written by the
    // server-side metrics route (lastTrades, lastEquityChart, lastObjectives, ...)
    await setDoc(metricsRef, {
      ...metrics,
      lastUpdated: Timestamp.now()
    }, { merge: true });
  } catch (error) {
    console.error('Error updating cached metrics:', error);
    throw error;
  }
}

export { app, db, auth, storage, Timestamp };

/**
 * Upload a file to Firebase Storage
 * @param file The file to upload
 * @param path The storage path
 * @returns The download URL
 */
export async function uploadFile(file: File, path: string): Promise<string> {
  try {
    const storageRef = ref(storage, path);
    const snapshot = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
}

/**
 * Delete a file from Firebase Storage
 * @param path The storage path
 */
export async function deleteFile(path: string): Promise<void> {
  try {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw error;
  }
}

/**
 * Create or update KYC submission
 * @param userId The user ID
 * @param kycData The KYC data
 * @returns The submission ID
 */
export async function createOrUpdateKYCSubmission(
  userId: string, 
  kycData: Partial<KYCSubmission>
): Promise<string> {
  try {
    const kycRef = doc(db, 'kycSubmissions', userId);
    const existingDoc = await getDoc(kycRef);
    
    if (existingDoc.exists()) {
      // Update existing submission
      const existingData = existingDoc.data() as KYCSubmission;
      
      // Merge documents field properly
      const mergedData: any = {
        ...kycData,
        updatedAt: Timestamp.now()
      };
      
      // If documents field is being updated, merge it with existing documents
      if (kycData.documents) {
        mergedData.documents = {
          ...existingData.documents,
          ...kycData.documents
        };
      }
      
      await updateDoc(kycRef, mergedData);
      return userId;
    } else {
      // Create new submission
      await setDoc(kycRef, {
        userId,
        status: 'pending',
        ...kycData,
        submittedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      return userId;
    }
  } catch (error) {
    console.error('Error creating/updating KYC submission:', error);
    throw error;
  }
}

/**
 * Get KYC submission by user ID
 * @param userId The user ID
 * @returns The KYC submission data
 */
export async function getKYCSubmission(userId: string): Promise<KYCSubmission | null> {
  try {
    const kycRef = doc(db, 'kycSubmissions', userId);
    const kycSnap = await getDoc(kycRef);
    
    if (kycSnap.exists()) {
      return kycSnap.data() as KYCSubmission;
    }
    return null;
  } catch (error) {
    console.error('Error fetching KYC submission:', error);
    throw error;
  }
}

/**
 * Get all KYC submissions (admin only)
 * @param statusFilter Optional status filter
 * @returns Array of KYC submissions
 */
export async function getAllKYCSubmissions(
  statusFilter?: KYCSubmission['status']
): Promise<(KYCSubmission & { id: string })[]> {
  try {
    const kycRef = collection(db, 'kycSubmissions');
    let q = query(kycRef);
    
    if (statusFilter) {
      q = query(kycRef, where('status', '==', statusFilter));
    }
    
    const querySnapshot = await getDocs(q);
    const submissions: (KYCSubmission & { id: string })[] = [];
    
    querySnapshot.forEach((doc) => {
      submissions.push({ 
        ...(doc.data() as KYCSubmission), 
        id: doc.id 
      });
    });
    
    return submissions;
  } catch (error) {
    console.error('Error fetching KYC submissions:', error);
    throw error;
  }
}

/**
 * Update KYC submission status (admin only)
 * @param userId The user ID
 * @param status The new status
 * @param reviewNotes Optional review notes
 * @param reviewedBy The reviewer's ID
 */
export async function updateKYCStatus(
  userId: string,
  status: KYCSubmission['status'],
  reviewNotes?: string,
  reviewedBy?: string
): Promise<void> {
  try {
    const kycRef = doc(db, 'kycSubmissions', userId);
    const updateData: Partial<KYCSubmission> = {
      status,
      reviewedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    if (reviewNotes) {
      updateData.reviewNotes = reviewNotes;
    }
    
    if (reviewedBy) {
      updateData.reviewedBy = reviewedBy;
    }
    
    await updateDoc(kycRef, updateData);
    
    // If approved and trader passed challenge, update user status
    if (status === 'approved') {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        kycVerified: true,
        kycVerifiedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
    }
  } catch (error) {
    console.error('Error updating KYC status:', error);
    throw error;
  }
}

/**
 * Check if user is eligible for KYC (passed challenge)
 * @param userId The user ID
 * @returns Whether user is eligible
 */
export async function isUserEligibleForKYC(userId: string): Promise<boolean> {
  try {
    const accountsRef = collection(db, 'userMetaApiAccounts');
    const q = query(
      accountsRef, 
      where('userId', '==', userId),
      where('status', 'in', ['passed', 'funded'])
    );
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking KYC eligibility:', error);
    return false;
  }
}

/**
 * Enable withdrawal for a user (admin only)
 * @param userId The user ID
 * @param userEmail The user's email
 * @param amountOwed Total amount owed to the user
 * @param profitSplit Profit split percentage
 * @param enabledBy Admin user ID who enabled
 */
export async function enableUserWithdrawal(
  userId: string,
  userEmail: string,
  amountOwed: number,
  profitSplit: number,
  enabledBy: string
): Promise<string> {
  try {
    const withdrawalRef = doc(db, 'withdrawalRequests', userId);
    const payoutAmount = (amountOwed * profitSplit) / 100;
    
    await setDoc(withdrawalRef, {
      userId,
      userEmail,
      status: 'pending',
      amountOwed,
      profitSplit,
      payoutAmount,
      enabledAt: Timestamp.now(),
      enabledBy,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    
    return userId;
  } catch (error) {
    console.error('Error enabling withdrawal:', error);
    throw error;
  }
}

/**
 * Get withdrawal request by user ID
 * @param userId The user ID
 * @returns The withdrawal request data
 */
export async function getWithdrawalRequest(userId: string): Promise<WithdrawalRequest | null> {
  try {
    const withdrawalRef = doc(db, 'withdrawalRequests', userId);
    const withdrawalSnap = await getDoc(withdrawalRef);
    
    if (withdrawalSnap.exists()) {
      return withdrawalSnap.data() as WithdrawalRequest;
    }
    return null;
  } catch (error) {
    console.error('Error fetching withdrawal request:', error);
    throw error;
  }
}

/**
 * Update withdrawal request (user submitting wallet details)
 * @param userId The user ID
 * @param paymentMethod Payment method chosen
 * @param walletAddress Wallet address
 */
export async function submitWithdrawalDetails(
  userId: string,
  paymentMethod: 'usdc_solana' | 'usdt_trc20',
  walletAddress: string
): Promise<void> {
  try {
    const withdrawalRef = doc(db, 'withdrawalRequests', userId);
    await updateDoc(withdrawalRef, {
      paymentMethod,
      walletAddress,
      submittedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error submitting withdrawal details:', error);
    throw error;
  }
}

/**
 * Get all withdrawal requests (admin only)
 * @param statusFilter Optional status filter
 * @returns Array of withdrawal requests
 */
export async function getAllWithdrawalRequests(
  statusFilter?: WithdrawalRequest['status']
): Promise<(WithdrawalRequest & { id: string })[]> {
  try {
    const withdrawalsRef = collection(db, 'withdrawalRequests');
    let q = query(withdrawalsRef);
    
    if (statusFilter) {
      q = query(withdrawalsRef, where('status', '==', statusFilter));
    }
    
    const querySnapshot = await getDocs(q);
    const withdrawals: (WithdrawalRequest & { id: string })[] = [];
    
    querySnapshot.forEach((doc) => {
      withdrawals.push({ 
        ...(doc.data() as WithdrawalRequest), 
        id: doc.id 
      });
    });
    
    return withdrawals;
  } catch (error) {
    console.error('Error fetching withdrawal requests:', error);
    throw error;
  }
}

/**
 * Update withdrawal request status (admin only)
 * @param userId The user ID
 * @param status The new status
 * @param reviewNotes Optional review notes
 * @param reviewedBy The reviewer's ID
 * @param transactionHash Optional transaction hash for completed withdrawals
 */
export async function updateWithdrawalStatus(
  userId: string,
  status: WithdrawalRequest['status'],
  reviewNotes?: string,
  reviewedBy?: string,
  transactionHash?: string
): Promise<void> {
  try {
    const withdrawalRef = doc(db, 'withdrawalRequests', userId);
    const updateData: Partial<WithdrawalRequest> = {
      status,
      reviewedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };
    
    if (reviewNotes) {
      updateData.reviewNotes = reviewNotes;
    }
    
    if (reviewedBy) {
      updateData.reviewedBy = reviewedBy;
    }
    
    if (transactionHash) {
      updateData.transactionHash = transactionHash;
    }
    
    await updateDoc(withdrawalRef, updateData);
  } catch (error) {
    console.error('Error updating withdrawal status:', error);
    throw error;
  }
}

/**
 * Check if user has a funded account (eligible for withdrawal)
 * @param userId The user ID
 * @returns Whether user is eligible
 */
export async function isUserEligibleForWithdrawal(userId: string): Promise<boolean> {
  try {
    const accountsRef = collection(db, 'userMetaApiAccounts');
    const q = query(
      accountsRef, 
      where('userId', '==', userId),
      where('status', '==', 'funded')
    );
    const querySnapshot = await getDocs(q);
    
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking withdrawal eligibility:', error);
    return false;
  }
}

/**
 * Enable (unlock) the VIP portal for a user with a custom offer (admin only)
 */
export async function enableVIPActivation(
  userId: string,
  userEmail: string,
  offer: {
    accountSize: string;
    tierName?: string;
    price: number;
    publicPrice?: number;
    adminNotes?: string;
    customTermsTitle?: string;
    customTermsContent?: string;
  },
  enabledBy: string
): Promise<string> {
  try {
    const vipRef = doc(db, 'vipActivations', userId);

    const data: Record<string, unknown> = {
      userId,
      userEmail,
      accountSize: offer.accountSize,
      price: offer.price,
      paymentStatus: 'unpaid',
      kybStatus: 'not_submitted',
      documents: {},
      enabledAt: Timestamp.now(),
      enabledBy,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    if (offer.tierName) data.tierName = offer.tierName;
    if (offer.publicPrice !== undefined) data.publicPrice = offer.publicPrice;
    if (offer.adminNotes) data.adminNotes = offer.adminNotes;
    if (offer.customTermsContent && offer.customTermsContent.trim()) {
      data.customTerms = {
        title: offer.customTermsTitle?.trim() || 'Additional Account Terms',
        content: offer.customTermsContent.trim()
      };
    }

    await setDoc(vipRef, data);
    return userId;
  } catch (error) {
    console.error('Error enabling VIP activation:', error);
    throw error;
  }
}

export async function recordVIPPageVisit(userId: string): Promise<void> {
  try {
    const vipRef = doc(db, 'vipActivations', userId);
    const vipSnap = await getDoc(vipRef);
    if (!vipSnap.exists()) return;
    await updateDoc(vipRef, { lastVisitedAt: Timestamp.now() });
  } catch (error) {
    console.error('Error recording VIP page visit:', error);
  }
}

export async function getVIPActivation(userId: string): Promise<VIPActivation | null> {
  try {
    const vipRef = doc(db, 'vipActivations', userId);
    const vipSnap = await getDoc(vipRef);
    if (vipSnap.exists()) {
      return vipSnap.data() as VIPActivation;
    }
    return null;
  } catch (error) {
    console.error('Error fetching VIP activation:', error);
    throw error;
  }
}

export async function getAllVIPActivations(): Promise<(VIPActivation & { id: string })[]> {
  try {
    const vipRef = collection(db, 'vipActivations');
    const querySnapshot = await getDocs(query(vipRef));
    const activations: (VIPActivation & { id: string })[] = [];
    querySnapshot.forEach((vipDoc) => {
      activations.push({
        ...(vipDoc.data() as VIPActivation),
        id: vipDoc.id
      });
    });
    return activations;
  } catch (error) {
    console.error('Error fetching VIP activations:', error);
    throw error;
  }
}

export async function updateVIPActivation(
  userId: string,
  vipData: Partial<VIPActivation>
): Promise<void> {
  try {
    const vipRef = doc(db, 'vipActivations', userId);
    const existingDoc = await getDoc(vipRef);
    if (!existingDoc.exists()) {
      throw new Error('VIP activation not found');
    }

    const existingData = existingDoc.data() as VIPActivation;
    const mergedData: Record<string, any> = {
      ...vipData,
      updatedAt: Timestamp.now()
    };

    if (vipData.documents) {
      mergedData.documents = {
        ...existingData.documents,
        ...vipData.documents
      };
    }

    await updateDoc(vipRef, mergedData);
  } catch (error) {
    console.error('Error updating VIP activation:', error);
    throw error;
  }
}

export async function updateVIPKybStatus(
  userId: string,
  kybStatus: VIPActivation['kybStatus'],
  reviewNotes?: string,
  reviewedBy?: string
): Promise<void> {
  try {
    const vipRef = doc(db, 'vipActivations', userId);
    const updateData: Record<string, any> = {
      kybStatus,
      reviewedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    if (reviewNotes) updateData.reviewNotes = reviewNotes;
    if (reviewedBy) updateData.reviewedBy = reviewedBy;

    await updateDoc(vipRef, updateData);
  } catch (error) {
    console.error('Error updating VIP KYB status:', error);
    throw error;
  }
}

export async function deleteVIPActivation(userId: string): Promise<void> {
  try {
    const vipRef = doc(db, 'vipActivations', userId);
    await deleteDoc(vipRef);
  } catch (error) {
    console.error('Error deleting VIP activation:', error);
    throw error;
  }
} 