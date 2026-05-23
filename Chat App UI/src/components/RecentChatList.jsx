import { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';

export default function RecentChatList({ navigateTo, refreshTrigger }) {
  const [recentChats, setRecentChats] = useState([]);
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

  useEffect(() => {
    fetchChats();

    const handleFriendshipChange = () => {
      fetchChats(true);
    };

    // Polling loop to fetch new messages and status updates every 2 seconds
    const pollInterval = setInterval(() => {
      fetchChats(true);
    }, 2000);

    window.addEventListener('friendship-changed', handleFriendshipChange);
    return () => {
      window.removeEventListener('friendship-changed', handleFriendshipChange);
      clearInterval(pollInterval);
    };
  }, [refreshTrigger]);

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

  if (loading) {
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

  if (recentChats.length === 0) {
    return (
      <div className="text-center py-5 text-muted small border rounded bg-light">
        <div className="fs-3 mb-2">💬</div>
        No active conversations yet.<br />
        Find friends in the directory and click <strong>Chat</strong> to start messaging!
      </div>
    );
  }

  return (
    <div className="list-group overflow-auto" style={{ maxHeight: 'calc(100vh - 180px)' }}>
      {recentChats.map(chat => {
        const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(chat.other_user_name)}&backgroundType=gradientLinear&fontSize=42`;
        return (
          <button
            key={chat.id} 
            className="list-group-item list-group-item-action d-flex align-items-center justify-content-between border-0 border-bottom py-3 px-3 rounded-0 transition-all hover-bg-light"
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
    </div>
  );
}