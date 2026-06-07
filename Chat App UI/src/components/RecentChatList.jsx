import { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';

export default function RecentChatList({ navigateTo, refreshTrigger, searchQuery = '' }) {
  const [recentChats, setRecentChats] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchChats = async (isBackground = false) => {
    try {
      const response = await axiosInstance.get('/chats');
      setRecentChats(prevChats => {
        if (JSON.stringify(prevChats) !== JSON.stringify(response.data)) {
          return response.data;
        }
        return prevChats;
      });
    } catch (err) {
      console.error('Error fetching recent chats:', err);
      if (!isBackground) {
        setError('Could not load recent chats.');
      }
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  const fetchFriendships = async () => {
    try {
      const response = await axiosInstance.get('/friendships');
      // Filter only accepted friendships to search friends
      const accepted = response.data.filter(f => f.status === 'accepted');
      setFriendships(accepted);
    } catch (err) {
      console.error('Error fetching friendships in RecentChatList:', err);
    }
  };

  useEffect(() => {
    fetchChats();
    fetchFriendships();

    const handleFriendshipChange = () => {
      fetchChats(true);
      fetchFriendships();
    };

    const handleChatUpdated = () => {
      fetchChats(true);
      fetchFriendships();
    };

    window.addEventListener('friendship-changed', handleFriendshipChange);
    window.addEventListener('chat-updated', handleChatUpdated);

    return () => {
      window.removeEventListener('friendship-changed', handleFriendshipChange);
      window.removeEventListener('chat-updated', handleChatUpdated);
    };
  }, [refreshTrigger]);

  const handleStartChat = async (friendId) => {
    try {
      setLoading(true);
      // Call create chat endpoint
      await axiosInstance.post('/chats/create', { otherUserId: friendId });
      // Notify sidebar update
      window.dispatchEvent(new Event('chat-updated'));
      // Navigate to chat
      navigateTo('chat', friendId);
    } catch (err) {
      console.error('Failed to start chat with friend:', err);
      alert(err.response?.data?.error || 'Failed to open chat');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filter existing active chats based on search
  const filteredChats = recentChats.filter(chat => 
    chat.other_user_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Find accepted friends who do not have an active chat yet, matching search query
  const chatUserIds = new Set(recentChats.map(c => c.other_user_id));
  const filteredFriends = friendships.filter(f => 
    !chatUserIds.has(f.friend_id) && 
    f.friend_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && recentChats.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary spinner-border-sm" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <span className="ms-2 text-muted small">Loading conversations...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger py-2 small" role="alert">
        {error}
      </div>
    );
  }

  const hasNoMatches = filteredChats.length === 0 && filteredFriends.length === 0;

  if (recentChats.length === 0 && friendships.length === 0) {
    return (
      <div className="text-center py-5 text-muted small border rounded bg-light">
        <div className="fs-3 mb-2">💬</div>
        No active conversations yet.<br />
        Find friends in the directory and click <strong>Chat</strong> to start messaging!
      </div>
    );
  }

  return (
    <div className="list-group overflow-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
      {/* 1. Active Chats Section */}
      {filteredChats.length > 0 && (
        <>
          {searchQuery && <div className="text-muted fw-bold small px-3 pt-2 pb-1 text-start">Conversations</div>}
          {filteredChats.map(chat => {
            const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(chat.other_user_name)}&backgroundType=gradientLinear&fontSize=42`;
            return (
              <button
                key={chat.id} 
                className="list-group-item list-group-item-action d-flex align-items-center justify-content-between border-0 py-3 px-3 rounded-3 mb-1 transition-all hover-bg-light-custom"
                onClick={() => navigateTo('chat', chat.other_user_id)}
              >
                <div className="d-flex align-items-center flex-grow-1 text-truncate me-2">
                  <img 
                    src={avatarUrl} 
                    alt={chat.other_user_name} 
                    className="rounded-circle me-3 border shadow-sm"
                    width="44"
                    height="44"
                  />
                  <div className="text-start text-truncate">
                    <h6 className="mb-0 fw-semibold text-dark text-truncate">{chat.other_user_name}</h6>
                    <p className="mb-0 text-muted text-truncate small mt-1" style={{ maxWidth: '280px' }}>
                      {chat.last_message || <span className="text-muted fst-italic">No messages yet</span>}
                    </p>
                  </div>
                </div>
                <div className="d-flex flex-column align-items-end flex-shrink-0">
                  <small className="text-muted mb-1" style={{ fontSize: '0.7rem' }}>
                    {formatTime(chat.last_message_time || chat.updated_at)}
                  </small>
                  {chat.unread_count > 0 && (
                    <span className="badge bg-primary rounded-pill fw-bold text-white small px-2 py-1">
                      {chat.unread_count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </>
      )}

      {/* 2. Friends / Contacts Section (WhatsApp-style start chat) */}
      {filteredFriends.length > 0 && (
        <>
          <div className="text-muted fw-bold small px-3 pt-3 pb-1 text-start">Contacts & Friends</div>
          {filteredFriends.map(friend => {
            const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(friend.friend_name)}&backgroundType=gradientLinear&fontSize=42`;
            return (
              <button
                key={friend.friend_id} 
                className="list-group-item list-group-item-action d-flex align-items-center justify-content-between border-0 py-3 px-3 rounded-3 mb-1 transition-all hover-bg-light-custom"
                onClick={() => handleStartChat(friend.friend_id)}
              >
                <div className="d-flex align-items-center flex-grow-1 text-truncate me-2">
                  <img 
                    src={avatarUrl} 
                    alt={friend.friend_name} 
                    className="rounded-circle me-3 border shadow-sm"
                    width="44"
                    height="44"
                  />
                  <div className="text-start text-truncate">
                    <h6 className="mb-0 fw-semibold text-dark text-truncate">{friend.friend_name}</h6>
                    <p className="mb-0 text-muted text-truncate small mt-1">
                      Click to start chat
                    </p>
                  </div>
                </div>
                <div className="d-flex align-items-center flex-shrink-0">
                  <span className={`badge ${friend.friend_status === 'online' ? 'bg-success' : 'bg-secondary'} rounded-pill px-2 py-1`}>
                    {friend.friend_status === 'online' ? 'Online' : 'Offline'}
                  </span>
                </div>
              </button>
            );
          })}
        </>
      )}

      {/* 3. Empty Search State */}
      {searchQuery && hasNoMatches && (
        <div className="text-center py-5 text-muted small">
          <div className="fs-3 mb-2">🔍</div>
          No conversations or friends found for "<strong>{searchQuery}</strong>"
        </div>
      )}
    </div>
  );
}