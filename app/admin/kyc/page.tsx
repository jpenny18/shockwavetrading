'use client';

import React, { useState, useEffect } from 'react';
import {
  getAllKYCSubmissions,
  updateKYCStatus,
  createOrUpdateKYCSubmission,
  KYCSubmission,
  UserData,
  isUserEligibleForKYC,
  db
} from '@/lib/firebase';
import {
  query,
  collection,
  where,
  getDocs
} from 'firebase/firestore';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Eye,
  Download,
  AlertCircle,
  Shield,
  FileText,
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  ChevronDown,
  Loader2,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface KYCSubmissionWithUser extends KYCSubmission {
  id: string;
  userData?: UserData;
}

export default function AdminKYCPage() {
  const [submissions, setSubmissions] = useState<KYCSubmissionWithUser[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<KYCSubmissionWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<KYCSubmission['status'] | 'all'>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<KYCSubmissionWithUser | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [userSearchEmail, setUserSearchEmail] = useState('');
  const [searchedUser, setSearchedUser] = useState<UserData | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [userEligible, setUserEligible] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  useEffect(() => {
    filterSubmissions();
  }, [submissions, searchQuery, statusFilter]);

  const loadSubmissions = async () => {
    try {
      setIsLoading(true);
      const allSubmissions = await getAllKYCSubmissions();
      
      // Load user data for each submission
      const submissionsWithUsers = await Promise.all(
        allSubmissions.map(async (submission) => {
          try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where('uid', '==', submission.userId));
            const querySnapshot = await getDocs(q);
            
            const userData = querySnapshot.empty ? undefined : querySnapshot.docs[0].data() as UserData;
            
            return {
              ...submission,
              userData
            };
          } catch (error) {
            console.error(`Error loading user data for ${submission.userId}:`, error);
            return submission;
          }
        })
      );
      
      setSubmissions(submissionsWithUsers);
    } catch (error) {
      console.error('Error loading KYC submissions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterSubmissions = () => {
    let filtered = [...submissions];
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }
    
    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(s => 
        s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.personalInfo.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.personalInfo.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.userData?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Sort by submission date (newest first)
    filtered.sort((a, b) => {
      const dateA = a.submittedAt?.toDate?.() || new Date(0);
      const dateB = b.submittedAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });
    
    setFilteredSubmissions(filtered);
  };

  const handleStatusUpdate = async (status: KYCSubmission['status']) => {
    if (!selectedSubmission) return;
    
    try {
      setIsUpdating(true);
      await updateKYCStatus(
        selectedSubmission.userId,
        status,
        reviewNotes,
        'admin' // In production, use actual admin user ID
      );
      
      // Reload submissions
      await loadSubmissions();
      setSelectedSubmission(null);
      setReviewNotes('');
    } catch (error) {
      console.error('Error updating KYC status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const searchUserByEmail = async () => {
    if (!userSearchEmail) return;
    
    try {
      setIsSearching(true);
      setSearchedUser(null);
      setUserEligible(false);
      
      // Search for user by email
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', userSearchEmail.toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as UserData;
        setSearchedUser(userData);
        
        // Check if user is eligible
        const eligible = await isUserEligibleForKYC(userData.uid);
        setUserEligible(eligible);
      } else {
        alert('User not found');
      }
    } catch (error) {
      console.error('Error searching user:', error);
      alert('Error searching for user');
    } finally {
      setIsSearching(false);
    }
  };

  const unlockKYCForUser = async () => {
    if (!searchedUser) return;
    
    try {
      setIsUpdating(true);
      
      // Create a placeholder KYC submission to unlock the page
      await createOrUpdateKYCSubmission(searchedUser.uid, {
        email: searchedUser.email,
        status: 'pending',
        personalInfo: {
          firstName: searchedUser.firstName || '',
          lastName: searchedUser.lastName || '',
          address: '',
          city: '',
          state: '',
          postalCode: '',
          country: searchedUser.country || '',
          phone: searchedUser.phone || '',
          email: searchedUser.email
        },
        documents: {}
      });
      
      alert('KYC unlocked for user successfully');
      setUserSearchEmail('');
      setSearchedUser(null);
      await loadSubmissions();
    } catch (error) {
      console.error('Error unlocking KYC:', error);
      alert('Failed to unlock KYC for user');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: KYCSubmission['status']) => {
    const config = {
      pending: { color: 'bg-yellow-500', icon: Clock, text: 'Pending' },
      approved: { color: 'bg-green-500', icon: CheckCircle, text: 'Approved' },
      rejected: { color: 'bg-red-500', icon: XCircle, text: 'Rejected' },
      needs_resubmission: { color: 'bg-orange-500', icon: RefreshCw, text: 'Needs Resubmission' }
    };
    
    const { color, icon: Icon, text } = config[status];
    
    return (
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${color}/20 text-white`}>
        <Icon className="w-4 h-4" />
        <span className="text-sm">{text}</span>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-[#0FF1CE] animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 md:mb-8">
        <h1 className="text-xl md:text-3xl font-bold text-white mb-1 md:mb-2">KYC Management</h1>
        <p className="text-gray-400 text-sm">Review and manage KYC submissions from traders</p>
      </div>

      {/* User Search Section */}
      <div className="bg-black rounded-xl p-4 md:p-6 border border-white/10 mb-5 md:mb-8">
        <h2 className="text-base md:text-lg font-semibold text-white mb-2 md:mb-4">Unlock KYC for User</h2>
        <p className="text-xs md:text-sm text-gray-400 mb-3 md:mb-4">
          Search for a user by email to manually unlock KYC verification for them.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
          <input
            type="email"
            value={userSearchEmail}
            onChange={(e) => setUserSearchEmail(e.target.value)}
            placeholder="user@example.com"
            className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
          />
          <button
            onClick={searchUserByEmail}
            disabled={isSearching || !userSearchEmail}
            className="px-4 md:px-6 py-2 bg-[#0FF1CE] text-black rounded-lg font-medium hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
          >
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </button>
        </div>
        
        {searchedUser && (
          <div className="mt-4 p-4 bg-black rounded-lg border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">
                  {searchedUser.firstName} {searchedUser.lastName}
                </p>
                <p className="text-sm text-gray-400">{searchedUser.email}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Status: {userEligible ? (
                    <span className="text-green-500">Eligible (Passed Challenge)</span>
                  ) : (
                    <span className="text-yellow-500">Not Eligible (No Passed Challenge)</span>
                  )}
                </p>
              </div>
              <button
                onClick={unlockKYCForUser}
                disabled={isUpdating}
                className="px-4 py-2 bg-[#0FF1CE] text-black rounded-lg text-sm font-medium hover:bg-[#0FF1CE]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Unlock KYC'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filters and Stats */}
      <div className="flex flex-col gap-3 md:grid md:grid-cols-5 md:gap-4 mb-5 md:mb-8">
        <div className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="w-full bg-black border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#0FF1CE]/50"
            />
          </div>
        </div>
        
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full bg-black border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm appearance-none focus:outline-none focus:border-[#0FF1CE]/50"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="needs_resubmission">Needs Resubmission</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-2 md:contents">
          <div className="bg-black rounded-lg p-3 md:p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs md:text-sm">Total</p>
                <p className="text-xl md:text-2xl font-bold text-white">{submissions.length}</p>
              </div>
              <Shield className="text-[#0FF1CE]" size={20} />
            </div>
          </div>
          
          <div className="bg-black rounded-lg p-3 md:p-4 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs md:text-sm">Pending</p>
                <p className="text-xl md:text-2xl font-bold text-yellow-500">
                  {submissions.filter(s => s.status === 'pending').length}
                </p>
              </div>
              <Clock className="text-yellow-500" size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* KYC Submissions - Mobile cards */}
      <div className="md:hidden space-y-2">
        {filteredSubmissions.length === 0 ? (
          <div className="bg-black rounded-xl border border-white/10 px-4 py-8 text-center text-gray-400">
            No KYC submissions found
          </div>
        ) : filteredSubmissions.map((submission) => (
          <div key={submission.id} className="bg-black rounded-xl border border-white/10 p-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-white font-medium text-sm">{submission.personalInfo.firstName} {submission.personalInfo.lastName}</p>
                <p className="text-gray-400 text-xs">{submission.email}</p>
              </div>
              {getStatusBadge(submission.status)}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1">
                  {submission.documents.governmentIdUrl ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-gray-500" />}
                  <span className="text-gray-400">ID</span>
                </div>
                <div className="flex items-center gap-1">
                  {submission.documents.proofOfAddressUrl ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-gray-500" />}
                  <span className="text-gray-400">Address</span>
                </div>
                <div className="flex items-center gap-1">
                  {submission.documents.tradingAgreementSignedAt ? <CheckCircle className="w-3 h-3 text-green-500" /> : <XCircle className="w-3 h-3 text-gray-500" />}
                  <span className="text-gray-400">Agreement</span>
                </div>
              </div>
              <button onClick={() => setSelectedSubmission(submission)} className="text-[#0FF1CE] text-sm flex items-center gap-1 font-medium">
                <Eye className="w-3.5 h-3.5" />Review
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* KYC Submissions Table - Desktop */}
      <div className="hidden md:block bg-black rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Documents</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Submitted</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2F2F2F]">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                    No KYC submissions found
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-black transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-white font-medium">
                          {submission.personalInfo.firstName} {submission.personalInfo.lastName}
                        </p>
                        <p className="text-sm text-gray-400">{submission.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        <p className="text-gray-400 flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {submission.personalInfo.phone}
                        </p>
                        <p className="text-gray-400 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {submission.personalInfo.city}, {submission.personalInfo.country}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          {submission.documents.governmentIdUrl ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="text-sm text-gray-400">ID</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {submission.documents.proofOfAddressUrl ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="text-sm text-gray-400">Address</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {submission.documents.tradingAgreementSignedAt ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="text-sm text-gray-400">Agreement</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(submission.status)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-400">
                        <p>{submission.submittedAt?.toDate?.().toLocaleDateString() || 'N/A'}</p>
                        <p className="text-xs">
                          {submission.submittedAt && formatDistanceToNow(submission.submittedAt.toDate(), { addSuffix: true })}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setSelectedSubmission(submission)}
                        className="text-[#0FF1CE] hover:text-[#0FF1CE]/80 font-medium text-sm flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {selectedSubmission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-black rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-black border-b border-white/10 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Review KYC Submission</h2>
                <button
                  onClick={() => {
                    setSelectedSubmission(null);
                    setReviewNotes('');
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-[#0FF1CE]" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-400">Full Name</p>
                    <p className="text-white">
                      {selectedSubmission.personalInfo.firstName} {selectedSubmission.personalInfo.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="text-white">{selectedSubmission.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Phone</p>
                    <p className="text-white">{selectedSubmission.personalInfo.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Address</p>
                    <p className="text-white">
                      {selectedSubmission.personalInfo.address}<br />
                      {selectedSubmission.personalInfo.city}, {selectedSubmission.personalInfo.state} {selectedSubmission.personalInfo.postalCode}<br />
                      {selectedSubmission.personalInfo.country}
                    </p>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#0FF1CE]" />
                  Uploaded Documents
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black rounded-lg p-4 border border-white/10">
                    <p className="text-sm font-medium text-gray-400 mb-2">Government ID</p>
                    {selectedSubmission.documents.governmentIdUrl ? (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">
                          {selectedSubmission.documents.governmentIdFileName}
                        </p>
                        <a
                          href={selectedSubmission.documents.governmentIdUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[#0FF1CE] hover:text-[#0FF1CE]/80 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          View Document
                        </a>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Not uploaded</p>
                    )}
                  </div>
                  
                  <div className="bg-black rounded-lg p-4 border border-white/10">
                    <p className="text-sm font-medium text-gray-400 mb-2">Proof of Address</p>
                    {selectedSubmission.documents.proofOfAddressUrl ? (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">
                          {selectedSubmission.documents.proofOfAddressFileName}
                        </p>
                        <a
                          href={selectedSubmission.documents.proofOfAddressUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[#0FF1CE] hover:text-[#0FF1CE]/80 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          View Document
                        </a>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-sm">Not uploaded</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Trading Agreement */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#0FF1CE]" />
                  Trading Agreement
                </h3>
                <div className="bg-black rounded-lg p-4 border border-white/10">
                  {selectedSubmission.documents.tradingAgreementSignedAt ? (
                    <div className="flex items-center gap-2 text-green-500">
                      <CheckCircle className="w-5 h-5" />
                      <span>
                        Signed on {selectedSubmission.documents.tradingAgreementSignedAt instanceof Date 
                          ? selectedSubmission.documents.tradingAgreementSignedAt.toLocaleDateString()
                          : selectedSubmission.documents.tradingAgreementSignedAt?.toDate?.().toLocaleDateString()}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-500">
                      <XCircle className="w-5 h-5" />
                      <span>Not signed</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Review Notes */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">Review Notes</h3>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Add notes about this submission (optional)..."
                  className="w-full bg-black border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#0FF1CE]/50 min-h-[100px]"
                />
              </div>

              {/* Previous Review Notes */}
              {selectedSubmission.reviewNotes && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-sm font-medium text-yellow-500 mb-1">Previous Review Notes</p>
                  <p className="text-sm text-gray-300">{selectedSubmission.reviewNotes}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleStatusUpdate('approved')}
                  disabled={isUpdating}
                  className="flex-1 bg-green-500 text-white py-3 rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Approve
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => handleStatusUpdate('needs_resubmission')}
                  disabled={isUpdating}
                  className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="w-5 h-5" />
                      Request Resubmission
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => handleStatusUpdate('rejected')}
                  disabled={isUpdating}
                  className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isUpdating ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="w-5 h-5" />
                      Reject
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 