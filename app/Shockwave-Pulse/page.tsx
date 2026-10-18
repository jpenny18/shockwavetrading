'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Particles from '../components/Particles';
import Header from '../components/Header';
import { ArrowRight, ThumbsUp, ThumbsDown, MessageSquare, Plus, MoreVertical, Clock, User } from 'lucide-react';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { getAuth, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';

interface Poll {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: any;
  yesVotes: number;
  noVotes: number;
  userVotes: Record<string, 'yes' | 'no'>;
}

interface Comment {
  id: string;
  pollId: string;
  text: string;
  username: string;
  createdAt: any;
}

export default function ShockwavePulsePage() {
  const [username, setUsername] = useState('');
  const [isSettingUsername, setIsSettingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [polls, setPolls] = useState<Poll[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newPollTitle, setNewPollTitle] = useState('');
  const [newPollDescription, setNewPollDescription] = useState('');
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [selectedPollId, setSelectedPollId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const router = useRouter();

  // Helper function to format text with line breaks
  const formatText = (text: string) => {
    return text.split('\n').map((line, index) => (
      <React.Fragment key={index}>
        {line}
        {index < text.split('\n').length - 1 && <br />}
      </React.Fragment>
    ));
  };

  // Helper function to format time ago
  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        if (user.displayName) {
          setUsername(user.displayName);
          setIsSettingUsername(false);
          await initializeData();
        } else {
          setIsSettingUsername(true);
        }
      } else {
        router.push('/access');
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

  // Add a simple useEffect to handle keyboard events for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCreatingPoll(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const initializeData = async () => {
    await fetchPolls();
    await fetchComments();
  };

  const fetchPolls = async () => {
    const querySnapshot = await getDocs(query(collection(db, 'polls'), orderBy('createdAt', 'desc')));
    const pollsData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Poll));
    setPolls(pollsData);
  };

  const fetchComments = async () => {
    const querySnapshot = await getDocs(query(collection(db, 'comments'), orderBy('createdAt', 'asc')));
    const commentsData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Comment));
    setComments(commentsData);
  };

  const handleSetUsername = async () => {
    if (!auth.currentUser) return;
    
    // Validate username
    if (!newUsername || newUsername.length < 3) {
      alert('Username must be at least 3 characters long');
      return;
    }
    
    if (newUsername.length > 20) {
      alert('Username must be less than 20 characters');
      return;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(newUsername)) {
      alert('Username can only contain letters, numbers, underscores and hyphens');
      return;
    }

    try {
      // Update Firebase Auth profile
      await updateProfile(auth.currentUser, {
        displayName: newUsername
      });

      // Store additional user info in Firestore
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await setDoc(userRef, {
        username: newUsername,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      }, { merge: true });

      setUsername(newUsername);
      setIsSettingUsername(false);
    } catch (error) {
      console.error('Error setting username:', error);
      alert('Failed to set username. Please try again.');
    }
  };

  // Add a helper function for starting poll creation
  const startCreatePoll = () => {
    console.log("Start create poll clicked", { username, isLoggedIn: !!auth.currentUser });
    
    if (!auth.currentUser) {
      console.log("No auth user, redirecting to auth");
      router.push('/access');
      return;
    }
    
    if (!username) {
      console.log("No username, showing username modal");
      setIsSettingUsername(true);
      return;
    }
    
    console.log("Opening create poll modal");
    setIsCreatingPoll(true);
  };

  const handleCreatePoll = async () => {
    try {
      // Validate inputs
      if (!newPollTitle.trim() || !newPollDescription.trim()) {
        alert('Please provide both a title and description for your poll.');
        return;
      }
      
      if (!auth.currentUser) {
        alert('You must be logged in to create a poll.');
        router.push('/access');
        return;
      }
      
      if (!username) {
        alert('Please set a username before creating a poll.');
        setIsSettingUsername(true);
        return;
      }

      // Close modal first
      setIsCreatingPoll(false);
      
      // Create poll data
      const pollData = {
        title: newPollTitle.trim(),
        description: newPollDescription.trim(),
        createdBy: username,
        createdAt: serverTimestamp(),
        yesVotes: 0,
        noVotes: 0,
        userVotes: {},
        userId: auth.currentUser.uid
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, 'polls'), pollData);
      console.log('Poll created successfully with ID:', docRef.id);

      // Reset form
      setNewPollTitle('');
      setNewPollDescription('');
      
      // Refresh polls
      await fetchPolls();
      
      // Show success message
      alert('Poll created successfully!');
    } catch (error) {
      console.error('Error creating poll:', error);
      alert('Failed to create poll. Please try again.');
    }
  };

  const handleVote = async (pollId: string, vote: 'yes' | 'no') => {
    const user = auth.currentUser;
    if (!user) return;
    
    const pollRef = doc(db, 'polls', pollId);
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;

    const userId = user.uid;
    const previousVote = poll.userVotes?.[userId];

    const updates: any = {
      yesVotes: poll.yesVotes,
      noVotes: poll.noVotes,
      userVotes: { ...(poll.userVotes || {}) }
    };

    // Remove previous vote if exists
    if (previousVote) {
      updates[`${previousVote}Votes`]--;
      delete updates.userVotes[userId];
    }

    // Add new vote
    if (previousVote !== vote) {
      updates[`${vote}Votes`]++;
      updates.userVotes[userId] = vote;
    }

    await updateDoc(pollRef, updates);
    fetchPolls();
  };

  const handleAddComment = async (pollId: string) => {
    const commentText = commentInputs[pollId]?.trim();
    if (!commentText) return;

    await addDoc(collection(db, 'comments'), {
      pollId,
      text: commentText,
      username,
      createdAt: serverTimestamp()
    });

    setCommentInputs(prev => ({ ...prev, [pollId]: '' }));
    fetchComments();
  };

  const toggleComments = (pollId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pollId)) {
        newSet.delete(pollId);
      } else {
        newSet.add(pollId);
      }
      return newSet;
    });
  };

  const UsernameSetupModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#0D0D0D] rounded-2xl p-6 md:p-8 border border-[#2F2F2F] max-w-md w-full">
        <h2 className="text-xl md:text-2xl font-bold text-[#0FF1CE] mb-4 md:mb-6">Welcome to Shockwave Pulse!</h2>
        <p className="text-sm md:text-base text-gray-300 mb-4 md:mb-6">Before you can participate, please set your username. This will be your identity in the community.</p>
        <p className="text-xs md:text-sm text-gray-400 mb-4 md:mb-6">
          Username requirements:
          <ul className="list-disc list-inside mt-2">
            <li>3-20 characters long</li>
            <li>Letters, numbers, underscores and hyphens only</li>
            <li>Cannot be changed once set</li>
          </ul>
        </p>
        <input
          type="text"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          className="w-full bg-[#1A1A1A] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white mb-4 md:mb-6 text-sm md:text-base"
          placeholder="Enter username"
          maxLength={20}
          pattern="[a-zA-Z0-9_-]+"
        />
        <button
          onClick={handleSetUsername}
          className="w-full bg-[#0FF1CE] text-black px-6 py-3 rounded-full font-bold hover:scale-105 transition-transform text-sm md:text-base"
        >
          Set Username & Continue
        </button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="bg-gradient-to-b from-[#0D0D0D] via-[#121212] to-[#151515] text-white min-h-screen font-sans flex items-center justify-center">
        <div className="text-[#0FF1CE] text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-[#0D0D0D] via-[#121212] to-[#151515] text-white min-h-screen font-sans">
      <Header />
      
      {isSettingUsername && <UsernameSetupModal />}
      
      {/* Hero Section - Simplified for Mobile */}
      <section className="relative px-4 md:px-6 pt-24 md:pt-40 pb-16 md:pb-32 overflow-hidden bg-gradient-to-b from-[#121212] to-[#131313]">
        <div className="absolute top-0 left-0 w-full h-full bg-[#0FF1CE]/[0.02] background-noise"></div>
        <Particles />
        
        <div className="relative z-10 max-w-5xl mx-auto">
          <h1 className="text-3xl md:text-6xl font-extrabold text-[#0FF1CE] mb-4 md:mb-6 text-center">
            Shockwave Pulse
          </h1>
          <p className="text-base md:text-xl text-gray-300 max-w-3xl mx-auto text-center md:text-center">
            Shape the future of Shockwave Capital. Vote, discuss, and propose new features.
          </p>
          {username && (
            <div className="flex items-center justify-center gap-2 mt-4 text-sm">
              <User size={16} className="text-gray-400" />
              <span className="text-gray-400">
                <span className="text-[#0FF1CE]">{username}</span>
              </span>
            </div>
          )}
          
          {/* Important Notice Card - Mobile Optimized */}
          <div className="mt-6 md:mt-8 bg-[#0FF1CE]/10 border border-[#0FF1CE]/30 rounded-lg p-4 md:p-6 backdrop-blur-sm">
            <p className="text-xs md:text-sm text-gray-200 leading-relaxed">
              <span className="text-[#0FF1CE] font-semibold">Important:</span> This forum is exclusively for proposing new features and changes. For support, please email our team.
            </p>
          </div>
        </div>
      </section>

      {/* Mobile-First Content Section */}
      <section className="relative px-4 md:px-6 lg:px-8 xl:px-12 py-4 md:py-20 w-full">
        {/* Floating Action Button - Mobile Style */}
        <div 
          className="fixed bottom-6 right-6 md:relative md:bottom-auto md:right-auto md:flex md:justify-end md:mb-8 z-40"
          onClick={() => setIsCreatingPoll(true)}
        >
          <button className="bg-[#0FF1CE] text-black p-4 md:px-6 md:py-3 rounded-full font-bold shadow-lg hover:shadow-xl transition-all flex items-center gap-2 group">
            <Plus size={24} className="md:w-5 md:h-5" />
            <span className="hidden md:inline">Create Poll</span>
          </button>
        </div>

        {/* Create Poll Modal - Mobile Optimized */}
        {isCreatingPoll && (
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-end md:items-center justify-center z-[100] p-0 md:p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsCreatingPoll(false);
              }
            }}
          >
            <div className="bg-gradient-to-b from-[#0D0D0D] to-[#131313] rounded-t-3xl md:rounded-2xl p-6 md:p-8 border border-[#2F2F2F] w-full md:max-w-lg shadow-xl animate-slide-up md:animate-none">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl md:text-2xl font-bold text-[#0FF1CE]">Create New Poll</h3>
                <button 
                  onClick={() => setIsCreatingPoll(false)}
                  className="text-gray-400 hover:text-white transition-colors p-2"
                  aria-label="Close"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <form onSubmit={(e) => {
                e.preventDefault();
                handleCreatePoll();
              }} className="space-y-5">
                <div>
                  <label htmlFor="pollTitle" className="block text-white text-sm font-medium mb-2">Poll Title</label>
                  <input
                    id="pollTitle"
                    type="text"
                    value={newPollTitle}
                    onChange={(e) => setNewPollTitle(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                    placeholder="Enter a clear, concise title"
                    maxLength={100}
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="pollDescription" className="block text-white text-sm font-medium mb-2">Poll Description</label>
                  <textarea
                    id="pollDescription"
                    value={newPollDescription}
                    onChange={(e) => setNewPollDescription(e.target.value)}
                    className="w-full bg-[#1A1A1A] border border-[#2F2F2F] rounded-lg px-4 py-3 text-white text-sm md:text-base h-24 md:h-32 resize-none focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50 focus:border-transparent transition-all"
                    placeholder="Describe your poll in detail. Press Enter for new lines."
                    maxLength={1000}
                    required
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    {newPollDescription.length}/1000 characters
                  </p>
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsCreatingPoll(false)}
                    className="flex-1 px-4 py-3 rounded-full font-medium border border-[#2F2F2F] hover:bg-[#1A1A1A] transition-colors text-sm md:text-base"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#0FF1CE] text-black px-4 py-3 rounded-full font-bold hover:opacity-90 transition-all text-sm md:text-base"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Polls Feed - Reddit/Facebook Style */}
        <div className="w-full max-w-none">
          <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-1 lg:grid-cols-3 lg:gap-6 pb-20 md:pb-0">
            {polls.map((poll) => {
              const pollComments = comments.filter(c => c.pollId === poll.id);
              const isExpanded = expandedComments.has(poll.id);
              const totalVotes = poll.yesVotes + poll.noVotes;
              const yesPercentage = totalVotes > 0 ? (poll.yesVotes / totalVotes) * 100 : 0;
              const noPercentage = totalVotes > 0 ? (poll.noVotes / totalVotes) * 100 : 0;
              
              return (
                <div key={poll.id} className="bg-[#0D0D0D]/80 backdrop-blur-sm rounded-xl md:rounded-2xl border border-[#2F2F2F]/50 overflow-hidden mb-4 lg:mb-6 break-inside-avoid w-full">
                  {/* Poll Header */}
                  <div className="p-4 md:p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs md:text-sm text-gray-400">
                        <User size={14} className="md:w-4 md:h-4" />
                        <span>{poll.createdBy}</span>
                        <span className="text-gray-500">•</span>
                        <Clock size={14} className="md:w-4 md:h-4" />
                        <span>{formatTimeAgo(poll.createdAt)}</span>
                      </div>
                      <button className="text-gray-400 hover:text-white p-1">
                        <MoreVertical size={18} className="md:w-5 md:h-5" />
                      </button>
                    </div>
                    
                    <h3 className="text-lg md:text-xl font-bold text-white mb-2">{poll.title}</h3>
                    <p className="text-sm md:text-base text-gray-300 leading-relaxed">{formatText(poll.description)}</p>
                  </div>

                  {/* Voting Section - Progress Bar Style */}
                  <div className="px-4 md:px-6 pb-4">
                    <div className="space-y-3">
                      {/* Yes Vote Bar */}
                      <button
                        onClick={() => handleVote(poll.id, 'yes')}
                        className={`w-full relative overflow-hidden rounded-lg p-3 transition-all ${
                          auth.currentUser && poll.userVotes?.[auth.currentUser.uid] === 'yes' 
                            ? 'ring-2 ring-green-500' 
                            : 'hover:bg-[#1A1A1A]'
                        }`}
                      >
                        <div className="absolute inset-0 bg-green-500/20" style={{ width: `${yesPercentage}%` }}></div>
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ThumbsUp size={18} className="text-green-500" />
                            <span className="font-medium">Yes</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{poll.yesVotes}</span>
                            <span className="text-xs text-gray-400">({yesPercentage.toFixed(0)}%)</span>
                          </div>
                        </div>
                      </button>

                      {/* No Vote Bar */}
                      <button
                        onClick={() => handleVote(poll.id, 'no')}
                        className={`w-full relative overflow-hidden rounded-lg p-3 transition-all ${
                          auth.currentUser && poll.userVotes?.[auth.currentUser.uid] === 'no' 
                            ? 'ring-2 ring-red-500' 
                            : 'hover:bg-[#1A1A1A]'
                        }`}
                      >
                        <div className="absolute inset-0 bg-red-500/20" style={{ width: `${noPercentage}%` }}></div>
                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ThumbsDown size={18} className="text-red-500" />
                            <span className="font-medium">No</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{poll.noVotes}</span>
                            <span className="text-xs text-gray-400">({noPercentage.toFixed(0)}%)</span>
                          </div>
                        </div>
                      </button>
                    </div>
                    
                    <div className="mt-2 text-center text-xs text-gray-400">
                      {totalVotes} total vote{totalVotes !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="border-t border-[#2F2F2F]/50 px-4 md:px-6 py-3">
                    <button
                      onClick={() => toggleComments(poll.id)}
                      className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      <MessageSquare size={18} />
                      <span>{pollComments.length} Comment{pollComments.length !== 1 ? 's' : ''}</span>
                    </button>
                  </div>

                  {/* Comments Section - Expandable */}
                  {isExpanded && (
                    <div className="border-t border-[#2F2F2F]/50 bg-[#0A0A0A]/50">
                      {/* Comment Input */}
                      <div className="p-4 md:p-6 border-b border-[#2F2F2F]/50">
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#0FF1CE]/20 flex items-center justify-center flex-shrink-0">
                            <User size={16} className="text-[#0FF1CE]" />
                          </div>
                          <div className="flex-1">
                            <textarea
                              value={commentInputs[poll.id] || ''}
                              onChange={(e) => setCommentInputs(prev => ({ ...prev, [poll.id]: e.target.value }))}
                              className="w-full bg-[#1A1A1A] border border-[#2F2F2F] rounded-lg px-3 py-2 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#0FF1CE]/50"
                              placeholder="Add a comment..."
                              rows={3}
                            />
                            <div className="flex justify-end mt-2">
                              <button
                                onClick={() => handleAddComment(poll.id)}
                                disabled={!commentInputs[poll.id]?.trim()}
                                className="bg-[#0FF1CE] text-black px-4 py-1.5 rounded-full text-sm font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Comment
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Comments List */}
                      <div className="max-h-96 overflow-y-auto">
                        {pollComments.length === 0 ? (
                          <p className="text-center text-gray-400 py-8 text-sm">No comments yet. Be the first!</p>
                        ) : (
                          pollComments.map(comment => (
                            <div key={comment.id} className="p-4 md:p-6 border-b border-[#2F2F2F]/30 last:border-0">
                              <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                                  <User size={16} className="text-gray-400" />
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-sm text-[#0FF1CE]">{comment.username}</span>
                                    <span className="text-xs text-gray-500">•</span>
                                    <span className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</span>
                                  </div>
                                  <p className="text-sm text-gray-300">{formatText(comment.text)}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {polls.length === 0 && (
              <div className="text-center py-16 lg:col-span-3">
                <p className="text-gray-400 text-lg mb-4">No polls yet. Be the first to create one!</p>
                <button
                  onClick={() => setIsCreatingPoll(true)}
                  className="bg-[#0FF1CE] text-black px-6 py-3 rounded-full font-bold hover:opacity-90 transition-opacity"
                >
                  Create First Poll
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <style jsx>{`
        @keyframes slide-up {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
    </div>
  );
} 