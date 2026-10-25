'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock,
  AlertCircle
} from 'lucide-react';
import { signInWithEmailAndPassword, onAuthStateChanged, getIdToken } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface AdminAuthData {
  email: string;
  password: string;
}

interface AuthErrors {
  email?: string;
  password?: string;
  general?: string;
}

const FloatingLabelInput = ({ 
  id, 
  type = 'text', 
  label, 
  icon: Icon,
  showPasswordToggle,
  value,
  onChange,
  ...props 
}: { 
  id: string;
  type?: string;
  label: string;
  icon: React.ElementType;
  showPasswordToggle?: boolean;
  value: string;
  onChange: (value: string) => void;
  [key: string]: any;
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isFloating = isFocused || value.length > 0;

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Icon size={18} className={`transition-colors ${isFloating ? 'text-[#0FF1CE]' : 'text-gray-400'}`} />
        </div>
        <input
          id={id}
          type={showPassword ? 'text' : type}
          className={`
            w-full bg-black border rounded-lg pl-10 pr-4 py-3 text-white 
            transition-all focus:outline-none placeholder-transparent
            ${isFloating ? 'border-[#0FF1CE]/60' : 'border-white/10'}
          `}
          placeholder={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          {...props}
        />
        <label
          htmlFor={id}
          className={`
            absolute left-10 transition-all pointer-events-none
            ${isFloating 
              ? '-top-2 text-xs text-[#0FF1CE] bg-black px-2' 
              : 'top-3 text-gray-400'
            }
          `}
        >
          {label}
        </label>
        {showPasswordToggle && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default function AdminAuthPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<AdminAuthData>({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<AuthErrors>({});
  const [loading, setLoading] = useState(false);

  // Check if user is already authenticated and is an admin
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Check if user has admin role
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          router.push('/admin');
        }
      }
    });

    return () => unsubscribe();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Validation
      if (!formData.email || !formData.password) {
        setErrors({ 
          email: !formData.email ? 'Please enter your email address' : undefined,
          password: !formData.password ? 'Please enter your password' : undefined
        });
        setLoading(false);
        return;
      }

      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Get the ID token
      const idToken = await getIdToken(userCredential.user, true);

      // Create session cookie through our API
      const response = await fetch('/api/auth/create-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create session');
      }

      // If successful, redirect to admin dashboard
      router.push('/admin');
    } catch (error: any) {
      console.error('Admin authentication error:', error);
      setErrors({ 
        general: error.message || 'Authentication failed. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-white">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-white/10 p-5">
            {errors.general && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm flex items-center gap-2">
                <AlertCircle size={16} />
                <span>{errors.general}</span>
              </div>
            )}

            <div className="space-y-4">
              <FloatingLabelInput
                id="email"
                type="email"
                label="Email address"
                icon={Mail}
                value={formData.email}
                onChange={(value) => setFormData({ ...formData, email: value })}
                error={errors.email}
              />

              <FloatingLabelInput
                id="password"
                type="password"
                label="Password"
                icon={Lock}
                showPasswordToggle
                value={formData.password}
                onChange={(value) => setFormData({ ...formData, password: value })}
                error={errors.password}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`
                w-full bg-gradient-to-r from-[#0FF1CE] to-[#00D4FF] text-black font-semibold py-3 px-4 rounded-lg
                transition duration-200
                ${loading ? 'opacity-80 cursor-not-allowed' : 'hover:brightness-110'}
              `}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span>Signing in...</span>
                </div>
              ) : (
                'Sign In'
              )}
            </button>
        </form>
      </div>
    </div>
  );
} 