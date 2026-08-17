'use client';
import React, { useState, useEffect } from 'react';
import Particles from '../../components/Particles';
import { 
  User, 
  Lock, 
  Bell, 
  Palette, 
  Save,
  Camera,
  Mail,
  Phone,
  Globe,
  CheckCircle,
  XCircle,
  ArrowRight,
  LogOut,
  AlertCircle,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react';
import { auth, db } from '@/lib/firebase';
import { 
  updateProfile, 
  updatePassword, 
  EmailAuthProvider, 
  reauthenticateWithCredential,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc, 
  serverTimestamp 
} from 'firebase/firestore';

interface SettingsTab {
  id: string;
  label: string;
  icon: React.ElementType;
}

const settingsTabs: SettingsTab[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Lock },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'appearance', label: 'Appearance', icon: Palette }
];

const SettingsTabButton = ({ tab, isActive, onClick }: {
  tab: SettingsTab;
  isActive: boolean;
  onClick: () => void;
}) => {
  const Icon = tab.icon;
  
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-3 rounded-lg w-full transition-colors ${
        isActive 
          ? 'bg-[#0FF1CE]/10 text-[#0FF1CE]' 
          : 'text-gray-400 hover:text-white hover:bg-[#0FF1CE]/5'
      }`}
    >
      <Icon size={20} />
      <span>{tab.label}</span>
      {isActive && <ArrowRight size={16} className="ml-auto" />}
    </button>
  );
};

const ToggleSwitch = ({ enabled, onChange }: { enabled: boolean; onChange: () => void }) => (
  <button
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      enabled ? 'bg-[#0FF1CE]' : 'bg-[#2F2F2F]'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
        enabled ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  username: string;
  profileImage: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  username?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<string>('profile');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  
  const [profile, setProfile] = useState<UserProfile>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    country: '',
    username: '',
    profileImage: ''
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailUpdates: true,
    tradingNotifications: true,
    marketingEmails: false,
    accountAlerts: true,
    smsAlerts: false
  });
  const [themePreference, setThemePreference] = useState('dark');

  // Fetch user profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          // Handle not authenticated state
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfile({
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            email: user.email || '',
            phone: userData.phone || '',
            country: userData.country || '',
            username: userData.username || '',
            profileImage: userData.profileImage || ''
          });
          if (userData.profileImage) {
            setProfileImage(userData.profileImage);
          }
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  const validateUsername = async (username: string): Promise<boolean> => {
    if (!username) return false;
    if (username.length < 3) {
      setFormErrors(prev => ({ ...prev, username: 'Username must be at least 3 characters long' }));
      return false;
    }
    if (username.length > 20) {
      setFormErrors(prev => ({ ...prev, username: 'Username must be less than 20 characters' }));
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setFormErrors(prev => ({ ...prev, username: 'Username can only contain letters, numbers, underscores and hyphens' }));
      return false;
    }
    return true;
  };

  const handleProfileUpdate = async () => {
    try {
      setSaving(true);
      setFormErrors({});
      setSuccessMessage('');

      const user = auth.currentUser;
      if (!user) return;

      // Validate username
      if (!(await validateUsername(profile.username))) {
        setSaving(false);
        return;
      }

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: profile.username
      });

      // Update Firestore profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        phone: profile.phone,
        country: profile.country,
        username: profile.username,
        profileImage: profileImage,
        lastUpdated: serverTimestamp()
      });

      setSuccessMessage('Profile updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      setFormErrors(prev => ({ ...prev, general: 'Failed to update profile. Please try again.' }));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    try {
      setSaving(true);
      setFormErrors({});
      setSuccessMessage('');

      const user = auth.currentUser;
      if (!user || !user.email) return;

      // Validate password requirements
      if (passwordForm.newPassword.length < 8) {
        setFormErrors(prev => ({ ...prev, newPassword: 'Password must be at least 8 characters long' }));
        return;
      }

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setFormErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
        return;
      }

      // Reauthenticate user
      const credential = EmailAuthProvider.credential(user.email, passwordForm.currentPassword);
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, passwordForm.newPassword);

      // Clear form
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      setSuccessMessage('Password updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      console.error('Error changing password:', error);
      if (error.code === 'auth/wrong-password') {
        setFormErrors(prev => ({ ...prev, currentPassword: 'Current password is incorrect' }));
      } else {
        setFormErrors(prev => ({ ...prev, general: 'Failed to update password. Please try again.' }));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    try {
      // Here you would typically upload to your storage solution
      // For now, we'll just use local FileReader
      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageDataUrl = e.target?.result as string;
        setProfileImage(imageDataUrl);
        
        // Update profile with new image
        setProfile(prev => ({
          ...prev,
          profileImage: imageDataUrl
        }));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const toggleNotification = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div className="relative">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full bg-[#0FF1CE]/[0.02] background-noise"></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full md:w-3/4 h-full rounded-full bg-[#0FF1CE]/[0.03] blur-[150px] opacity-60"></div>
      <div className="absolute top-1/4 -left-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-1/4 w-96 h-96 bg-[#0FF1CE]/10 rounded-full blur-[150px] animate-pulse delay-1000"></div>
      <Particles />

      {/* Content */}
      <div className="relative z-10">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] bg-clip-text text-transparent mb-6">Settings</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-4 space-y-2">
              {settingsTabs.map(tab => (
                <SettingsTabButton
                  key={tab.id}
                  tab={tab}
                  isActive={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                />
              ))}
              
              <div className="pt-4 mt-4 border-t border-[#2F2F2F]/50">
                <button className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 rounded-xl transition-all w-full">
                  <LogOut size={20} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3 bg-gradient-to-br from-[#1A1A1A]/80 to-[#151515]/80 backdrop-blur-sm rounded-2xl border border-[#2F2F2F]/50 p-6">
            {/* Success Message */}
            {successMessage && (
              <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-2 text-green-500">
                <CheckCircle size={20} />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-lg font-bold text-white mb-6">Profile Settings</h2>
                
                <div className="flex flex-col md:flex-row gap-8 mb-8">
                  {/* Profile Picture */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative">
                      <div className="w-32 h-32 rounded-full bg-[#2F2F2F] flex items-center justify-center overflow-hidden">
                        {profileImage ? (
                          <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[#0FF1CE] text-4xl font-medium">
                            {profile.firstName && profile.lastName 
                              ? `${profile.firstName[0]}${profile.lastName[0]}`
                              : 'U'}
                          </span>
                        )}
                      </div>
                      <label 
                        htmlFor="profile-upload" 
                        className="absolute bottom-0 right-0 p-2 bg-[#0FF1CE] rounded-full cursor-pointer hover:bg-[#0FF1CE]/90 transition-colors"
                      >
                        <Camera size={16} className="text-black" />
                      </label>
                      <input 
                        type="file" 
                        id="profile-upload" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file);
                          }
                        }}
                      />
                    </div>
                    <div className="text-center">
                      <div className="text-white font-medium">
                        {profile.firstName} {profile.lastName}
                      </div>
                      <div className="text-gray-400 text-sm">@{profile.username}</div>
                    </div>
                  </div>

                  {/* Profile Form */}
                  <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">First Name</label>
                        <input
                          type="text"
                          value={profile.firstName}
                          onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                          className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                        />
                        {formErrors.firstName && (
                          <p className="mt-1 text-sm text-red-500">{formErrors.firstName}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Last Name</label>
                        <input
                          type="text"
                          value={profile.lastName}
                          onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                          className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                        />
                        {formErrors.lastName && (
                          <p className="mt-1 text-sm text-red-500">{formErrors.lastName}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Username</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <User size={16} className="text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={profile.username}
                          onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                          className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg pl-10 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                          placeholder="Your display name for leaderboard"
                        />
                      </div>
                      {formErrors.username && (
                        <p className="mt-1 text-sm text-red-500">{formErrors.username}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <Mail size={16} className="text-gray-400" />
                        </div>
                        <input
                          type="email"
                          value={profile.email}
                          disabled
                          className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg pl-10 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all opacity-50"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Phone Number</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <Phone size={16} className="text-gray-400" />
                        </div>
                        <input
                          type="tel"
                          value={profile.phone}
                          onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                          className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg pl-10 px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                        />
                      </div>
                      {formErrors.phone && (
                        <p className="mt-1 text-sm text-red-500">{formErrors.phone}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Country</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                          <Globe size={16} className="text-gray-400" />
                        </div>
                        <select 
                          value={profile.country}
                          onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                          className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg pl-10 px-4 py-2.5 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                        >
                          <option value="">Select a country</option>
                          <option value="US">United States</option>
                          <option value="GB">United Kingdom</option>
                          <option value="CA">Canada</option>
                          <option value="AU">Australia</option>
                          <option value="DE">Germany</option>
                          {/* Add more countries as needed */}
                        </select>
                      </div>
                      {formErrors.country && (
                        <p className="mt-1 text-sm text-red-500">{formErrors.country}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="pt-6 border-t border-[#2F2F2F]">
                  <button 
                    onClick={handleProfileUpdate}
                    disabled={saving}
                    className="px-6 py-2.5 bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                    <Save size={18} />
                    <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div>
                <h2 className="text-lg font-bold text-white mb-6">Security Settings</h2>
                
                {/* Password Change Section */}
                <div className="mb-8 p-6 bg-gradient-to-b from-[#151515] to-[#0D0D0D] rounded-xl border border-[#2F2F2F]/50">
                  <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                    <Lock size={18} />
                    <span>Change Password</span>
                  </h3>
                    
                    <div className="space-y-4">
                      <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {formErrors.currentPassword && (
                        <p className="mt-1 text-sm text-red-500">{formErrors.currentPassword}</p>
                      )}
                      </div>

                      <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {formErrors.newPassword && (
                        <p className="mt-1 text-sm text-red-500">{formErrors.newPassword}</p>
                      )}
                  </div>
                  
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        className="w-full bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                      />
                      {formErrors.confirmPassword && (
                        <p className="mt-1 text-sm text-red-500">{formErrors.confirmPassword}</p>
                      )}
                    </div>

                    <button
                      onClick={handlePasswordChange}
                      disabled={saving}
                      className="px-6 py-2.5 bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {saving ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Shield size={18} />
                          <span>Update Password</span>
                        </>
                      )}
                    </button>
                  </div>
                  </div>
                  
                {/* Two-Factor Authentication Section */}
                <div className="p-6 bg-gradient-to-b from-[#151515] to-[#0D0D0D] rounded-xl border border-[#2F2F2F]/50">
                  <div className="flex items-start justify-between">
                        <div>
                      <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                        <Shield size={18} />
                        <span>Two-Factor Authentication</span>
                      </h3>
                      <p className="text-gray-400 text-sm">
                        Add an extra layer of security to your account by enabling two-factor authentication.
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-transparent border border-[#0FF1CE]/50 text-[#0FF1CE] font-bold rounded-xl hover:bg-[#0FF1CE]/10 transition-all duration-300">
                      Enable
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-lg font-bold text-white mb-6">Notification Preferences</h2>
                
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-[#2F2F2F]">
                      <div>
                        <div className="text-white font-medium">Email Updates</div>
                        <div className="text-gray-400 text-sm">Receive weekly account summary and updates</div>
                      </div>
                      <ToggleSwitch 
                        enabled={notificationSettings.emailUpdates} 
                        onChange={() => toggleNotification('emailUpdates')} 
                      />
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-[#2F2F2F]">
                      <div>
                        <div className="text-white font-medium">Trading Notifications</div>
                        <div className="text-gray-400 text-sm">Receive notifications about your trading activity</div>
                      </div>
                      <ToggleSwitch 
                        enabled={notificationSettings.tradingNotifications} 
                        onChange={() => toggleNotification('tradingNotifications')} 
                      />
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-[#2F2F2F]">
                      <div>
                        <div className="text-white font-medium">Marketing Emails</div>
                        <div className="text-gray-400 text-sm">Receive offers, promotions and updates</div>
                      </div>
                      <ToggleSwitch 
                        enabled={notificationSettings.marketingEmails} 
                        onChange={() => toggleNotification('marketingEmails')} 
                      />
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-[#2F2F2F]">
                      <div>
                        <div className="text-white font-medium">Account Alerts</div>
                        <div className="text-gray-400 text-sm">Receive alerts about important account changes</div>
                      </div>
                      <ToggleSwitch 
                        enabled={notificationSettings.accountAlerts} 
                        onChange={() => toggleNotification('accountAlerts')} 
                      />
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-[#2F2F2F]">
                      <div>
                        <div className="text-white font-medium">SMS Alerts</div>
                        <div className="text-gray-400 text-sm">Receive text messages for important updates</div>
                      </div>
                      <ToggleSwitch 
                        enabled={notificationSettings.smsAlerts} 
                        onChange={() => toggleNotification('smsAlerts')} 
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <button className="px-6 py-2.5 bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 flex items-center gap-2">
                      <Save size={18} />
                      <span>Save Preferences</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div>
                <h2 className="text-lg font-bold text-white mb-6">Appearance Settings</h2>
                
                <div className="space-y-8">
                  {/* Theme Selection */}
                  <div>
                    <h3 className="text-white font-medium mb-4">Theme</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <label className={`
                        relative cursor-pointer
                        border border-[#2F2F2F] rounded-lg p-4 transition-colors
                        ${themePreference === 'dark' ? 'border-[#0FF1CE] shadow-[0_0_20px_rgba(15,241,206,0.3)]' : 'hover:border-[#0FF1CE]/50'}
                      `}>
                        <input
                          type="radio"
                          name="theme"
                          value="dark"
                          checked={themePreference === 'dark'}
                          onChange={() => setThemePreference('dark')}
                          className="sr-only"
                        />
                        <div className="bg-[#121212] w-full h-24 rounded-lg mb-3 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-[#0FF1CE]"></div>
                        </div>
                        <div className="text-center">
                          <span className="text-white font-medium">Dark</span>
                        </div>
                        {themePreference === 'dark' && (
                          <div className="absolute top-2 right-2 text-[#0FF1CE]">
                            <CheckCircle size={16} />
                          </div>
                        )}
                      </label>
                      
                      <label className={`
                        relative cursor-pointer
                        border border-[#2F2F2F] rounded-lg p-4 transition-colors
                        ${themePreference === 'light' ? 'border-[#0FF1CE] shadow-[0_0_20px_rgba(15,241,206,0.3)]' : 'hover:border-[#0FF1CE]/50'}
                      `}>
                        <input
                          type="radio"
                          name="theme"
                          value="light"
                          checked={themePreference === 'light'}
                          onChange={() => setThemePreference('light')}
                          className="sr-only"
                        />
                        <div className="bg-[#F5F5F5] w-full h-24 rounded-lg mb-3 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-[#0FF1CE]"></div>
                        </div>
                        <div className="text-center">
                          <span className="text-white font-medium">Light</span>
                        </div>
                        {themePreference === 'light' && (
                          <div className="absolute top-2 right-2 text-[#0FF1CE]">
                            <CheckCircle size={16} />
                          </div>
                        )}
                      </label>
                      
                      <label className={`
                        relative cursor-pointer
                        border border-[#2F2F2F] rounded-lg p-4 transition-colors
                        ${themePreference === 'system' ? 'border-[#0FF1CE] shadow-[0_0_20px_rgba(15,241,206,0.3)]' : 'hover:border-[#0FF1CE]/50'}
                      `}>
                        <input
                          type="radio"
                          name="theme"
                          value="system"
                          checked={themePreference === 'system'}
                          onChange={() => setThemePreference('system')}
                          className="sr-only"
                        />
                        <div className="bg-gradient-to-r from-[#121212] to-[#F5F5F5] w-full h-24 rounded-lg mb-3 flex items-center justify-center">
                          <div className="w-8 h-8 rounded-full bg-[#0FF1CE]"></div>
                        </div>
                        <div className="text-center">
                          <span className="text-white font-medium">System</span>
                        </div>
                        {themePreference === 'system' && (
                          <div className="absolute top-2 right-2 text-[#0FF1CE]">
                            <CheckCircle size={16} />
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                  
                  {/* Language Selection */}
                  <div>
                    <h3 className="text-white font-medium mb-4">Language</h3>
                    <select className="w-full md:w-1/3 bg-[#151515]/50 backdrop-blur-sm border border-[#2F2F2F] rounded-lg px-4 py-2.5 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all">
                      <option>English (US)</option>
                      <option>English (UK)</option>
                      <option>Spanish</option>
                      <option>French</option>
                      <option>German</option>
                      <option>Japanese</option>
                    </select>
                  </div>
                  
                  <div className="pt-4">
                    <button className="px-6 py-2.5 bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[#0FF1CE]/25 transition-all duration-300 flex items-center gap-2">
                      <Save size={18} />
                      <span>Save Preferences</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        .background-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.05'/%3E%3C/svg%3E");
          opacity: 0.15;
        }
      `}</style>
    </div>
  );
} 