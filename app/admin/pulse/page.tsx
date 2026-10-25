'use client';
import React, { useState, useEffect } from 'react';
import {
  collection,
  getDocs,
  doc,
  deleteDoc,
  query,
  orderBy,
  updateDoc,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Trash2, AlertCircle, CheckCircle, XCircle, MessageSquare } from 'lucide-react';

interface Poll {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  createdAt: any;
  yesVotes: number;
  noVotes: number;
  userVotes: Record<string, 'yes' | 'no'>;
  status?: 'active' | 'archived' | 'flagged';
}

interface Comment {
  id: string;
  pollId: string;
  text: string;
  username: string;
  createdAt: any;
  status?: 'active' | 'hidden';
}

export default function PulseManagementPage() {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'archived' | 'flagged'>('all');
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchPolls();
    fetchComments();
  }, []);

  const fetchPolls = async () => {
    try {
      const pollsQuery = query(collection(db, 'polls'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(pollsQuery);
      const pollsData = querySnapshot.docs.map(pollDoc => ({
        id: pollDoc.id,
        ...pollDoc.data()
      } as Poll));
      setPolls(pollsData);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching polls:', error);
      setActionError('Failed to load polls. Please refresh the page.');
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const querySnapshot = await getDocs(query(collection(db, 'comments'), orderBy('createdAt', 'desc')));
      const commentsData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Comment));
      setComments(commentsData);
    } catch (error) {
      console.error('Error fetching comments:', error);
      setActionError('Failed to load comments. Please refresh the page.');
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm('Are you sure you want to delete this poll? This action cannot be undone.')) return;

    try {
      // Delete the poll
      await deleteDoc(doc(db, 'polls', pollId));
      
      // Delete associated comments
      const pollComments = comments.filter(comment => comment.pollId === pollId);
      for (const comment of pollComments) {
        await deleteDoc(doc(db, 'comments', comment.id));
      }
      
      // Refresh data
      await fetchPolls();
      await fetchComments();
    } catch (error) {
      console.error('Error deleting poll:', error);
      setActionError('Failed to delete poll. Please try again.');
    }
  };

  const handleUpdatePollStatus = async (pollId: string, status: 'active' | 'archived' | 'flagged') => {
    try {
      await updateDoc(doc(db, 'polls', pollId), { status });
      await fetchPolls();
    } catch (error) {
      console.error('Error updating poll status:', error);
      setActionError('Failed to update poll status. Please try again.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteDoc(doc(db, 'comments', commentId));
      await fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
      setActionError('Failed to delete comment. Please try again.');
    }
  };

  const handleToggleCommentVisibility = async (commentId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'hidden' : 'active';
      await updateDoc(doc(db, 'comments', commentId), { status: newStatus });
      await fetchComments();
    } catch (error) {
      console.error('Error updating comment visibility:', error);
      setActionError('Failed to update comment visibility. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-[#0FF1CE]">Loading...</div>
      </div>
    );
  }

  const visiblePolls = filter === 'all'
    ? polls
    : polls.filter((poll) => (poll.status || 'active') === filter);

  return (
    <div>
      <div className="mb-5 md:mb-8">
        <h1 className="text-xl md:text-3xl font-bold text-white mb-3 md:mb-4">Pulse Management</h1>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-0.5 px-0.5">
          {['all', 'active', 'archived', 'flagged'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg text-sm whitespace-nowrap capitalize ${filter === f ? 'bg-[#0FF1CE] text-black font-medium' : 'bg-[#1A1A1A] text-white'}`}
            >
              {f === 'all' ? 'All Polls' : f}
            </button>
          ))}
        </div>
      </div>

      {actionError && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          {actionError}
        </div>
      )}

      <div className="space-y-4 md:space-y-6">
        {visiblePolls.length === 0 ? (
          <div className="text-gray-400 text-sm">No polls in this view.</div>
        ) : visiblePolls.map((poll) => (
          <div key={poll.id} className="bg-[#0D0D0D] rounded-xl p-4 md:p-6 border border-[#2F2F2F]">
            <div className="flex justify-between items-start mb-3 md:mb-4 gap-3">
              <div className="min-w-0">
                <h3 className="text-base md:text-xl font-bold text-white mb-1 md:mb-2">{poll.title}</h3>
                <p className="text-gray-300 text-sm">{poll.description}</p>
                <div className="mt-1 md:mt-2 text-xs md:text-sm text-gray-400">
                  By: {poll.createdBy} · {poll.yesVotes + poll.noVotes} votes
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                <button
                  onClick={() => handleUpdatePollStatus(poll.id, 'active')}
                  className={`p-2 rounded-lg ${poll.status === 'active' ? 'text-[#0FF1CE]' : 'text-gray-400'} hover:bg-[#1A1A1A]`}
                  title="Mark as Active"
                >
                  <CheckCircle size={20} />
                </button>
                <button
                  onClick={() => handleUpdatePollStatus(poll.id, 'archived')}
                  className={`p-2 rounded-lg ${poll.status === 'archived' ? 'text-yellow-500' : 'text-gray-400'} hover:bg-[#1A1A1A]`}
                  title="Archive Poll"
                >
                  <AlertCircle size={20} />
                </button>
                <button
                  onClick={() => handleUpdatePollStatus(poll.id, 'flagged')}
                  className={`p-2 rounded-lg ${poll.status === 'flagged' ? 'text-red-500' : 'text-gray-400'} hover:bg-[#1A1A1A]`}
                  title="Flag Poll"
                >
                  <XCircle size={20} />
                </button>
                <button
                  onClick={() => handleDeletePoll(poll.id)}
                  className="p-2 rounded-lg text-red-500 hover:bg-[#1A1A1A]"
                  title="Delete Poll"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </div>

            <button
              onClick={() => setSelectedPoll(selectedPoll === poll.id ? null : poll.id)}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-[#0FF1CE]"
            >
              <MessageSquare size={16} />
              {comments.filter(c => c.pollId === poll.id).length} Comments
            </button>

            {selectedPoll === poll.id && (
              <div className="mt-3 space-y-3">
                {comments.filter(comment => comment.pollId === poll.id).length === 0 && (
                  <p className="text-sm text-gray-500">No comments on this poll.</p>
                )}
                {comments
                  .filter(comment => comment.pollId === poll.id)
                  .map(comment => (
                    <div key={comment.id} className="bg-[#1A1A1A] rounded-lg p-3 flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[#0FF1CE] text-sm font-medium">{comment.username}</span>
                          <span className="text-xs text-gray-400">
                            {comment.createdAt?.toDate ? comment.createdAt.toDate().toLocaleDateString() : ''}
                          </span>
                          {comment.status === 'hidden' && (
                            <span className="text-xs text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">Hidden</span>
                          )}
                        </div>
                        <p className="text-gray-300 text-sm">{comment.text}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleToggleCommentVisibility(comment.id, comment.status || 'active')}
                          className={`p-1.5 rounded-lg ${comment.status === 'hidden' ? 'text-yellow-500' : 'text-[#0FF1CE]'} hover:bg-[#0D0D0D]`}
                          title={comment.status === 'hidden' ? 'Show Comment' : 'Hide Comment'}
                        >
                          {comment.status === 'hidden' ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="p-1.5 rounded-lg text-red-500 hover:bg-[#0D0D0D]"
                          title="Delete Comment"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 