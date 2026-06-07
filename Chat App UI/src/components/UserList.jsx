import { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';

export default function UserList({ navigateTo, onFriendshipChange }) {
  const [users, setUsers] = useState([]);
  const [friendships, setFriendships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const currentUserStr = localStorage.getItem('user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const currentUserId = currentUser ? currentUser.id : null;

  const fetchData = async () => {
    try {
      const [usersResponse, friendshipsResponse] = await Promise.all([
        axiosInstance.get('/users'),
        axiosInstance.get('/friendships')
      ]);
      setUsers(usersResponse.data);
      setFriendships(friendshipsResponse.data);
    } catch (err) {
      console.error('Error fetching dashboard users and friendships data:', err);
      setError('Could not load friends directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    const handleFriendshipChange = () => {
      fetchData();
    };

    window.addEventListener('friendship-changed', handleFriendshipChange);
    return () => {
      window.removeEventListener('friendship-changed', handleFriendshipChange);
    };
  }, []);

  const handleSendRequest = async (userId) => {
    try {
      await axiosInstance.post('/friendships/request', { receiverId: userId });
      await fetchData();
      window.dispatchEvent(new Event('friendship-changed'));
      if (onFriendshipChange) onFriendshipChange();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send friend request');
    }
  };

  const handleAcceptRequest = async (userId) => {
    try {
      await axiosInstance.post('/friendships/accept', { senderId: userId });
      await fetchData();
      window.dispatchEvent(new Event('friendship-changed'));
      if (onFriendshipChange) onFriendshipChange();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to accept friend request');
    }
  };

  const handleRejectOrCancel = async (userId) => {
    try {
      await axiosInstance.post('/friendships/reject', { otherUserId: userId });
      await fetchData();
      window.dispatchEvent(new Event('friendship-changed'));
      if (onFriendshipChange) onFriendshipChange();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject or cancel');
    }
  };

  const getFriendshipState = (userId) => {
    const f = friendships.find(item => item.friend_id === userId);
    if (!f) return { status: 'none' };
    
    if (f.status === 'accepted') {
      return { status: 'friends', friendship: f };
    }
    
    if (f.status === 'pending') {
      if (f.sender_id === currentUserId) {
        return { status: 'requested_sent', friendship: f };
      } else {
        return { status: 'requested_received', friendship: f };
      }
    }
    
    return { status: 'none' };
  };

  const filteredUsers = users.filter(user => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (user.full_name && user.full_name.toLowerCase().includes(query)) ||
      (user.username && user.username.toLowerCase().includes(query))
    );
  });

  return (
    <div className="d-flex flex-column h-100">
      {/* Search Input */}
      <div className="mb-3">
        <div className="input-group shadow-sm rounded-3 overflow-hidden">
          <span className="input-group-text bg-white border-0 text-muted ps-3 pe-2">
            🔍
          </span>
          <input
            type="text"
            className="form-control border-0 py-2 shadow-none bg-white"
            placeholder="Search friends by name or username..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ fontSize: '0.9rem' }}
          />
          {searchQuery && (
            <button 
              className="btn btn-white border-0 text-muted px-3" 
              type="button"
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* User List */}
      {loading ? (
        <div className="text-center py-4">
          <div className="spinner-border text-primary spinner-border-sm" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <span className="ms-2 text-muted small">Loading directory...</span>
        </div>
      ) : error ? (
        <div className="alert alert-danger py-2 small" role="alert">
          {error}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-4 text-muted small border rounded-3 bg-light">
          No users found
        </div>
      ) : (
        <div className="list-group overflow-auto" style={{ maxHeight: '420px' }}>
          {filteredUsers.map(user => {
            const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.full_name)}&backgroundType=gradientLinear&fontSize=42`;
            const fState = getFriendshipState(user.id);
            
            return (
              <div
                key={user.id} 
                className="list-group-item d-flex align-items-center justify-content-between border-0 border-bottom py-3 px-3 rounded-0 transition-all hover-bg-light-custom"
              >
                <div className="d-flex align-items-center flex-grow-1 text-truncate">
                  <img 
                    src={avatarUrl} 
                    alt={user.full_name} 
                    className="rounded-circle me-3 border shadow-sm"
                    width="44"
                    height="44"
                  />
                  <div className="text-start text-truncate me-2">
                    <h6 className="mb-0 fw-semibold text-dark text-truncate">{user.full_name}</h6>
                    <small className="text-muted d-block text-truncate" style={{ fontSize: '0.75rem' }}>
                      @{user.username}
                    </small>
                  </div>
                </div>

                <div className="d-flex align-items-center ms-2 flex-shrink-0">
                  {fState.status === 'none' && (
                    <button 
                      className="btn btn-outline-success btn-sm fw-semibold px-2 py-1 rounded-pill"
                      onClick={() => handleSendRequest(user.id)}
                    >
                      ➕ Add
                    </button>
                  )}

                  {fState.status === 'requested_sent' && (
                    <button 
                      className="btn btn-secondary btn-sm fw-semibold px-2 py-1 rounded-pill text-light position-relative"
                      title="Click to Cancel Request"
                      onClick={() => handleRejectOrCancel(user.id)}
                    >
                      🕒 Requested
                    </button>
                  )}

                  {fState.status === 'requested_received' && (
                    <div className="d-flex gap-1">
                      <button 
                        className="btn btn-success btn-sm fw-semibold px-2 py-1 rounded-pill"
                        title="Accept request"
                        onClick={() => handleAcceptRequest(user.id)}
                      >
                        ✓ Accept
                      </button>
                      <button 
                        className="btn btn-outline-danger btn-sm fw-semibold px-2 py-1 rounded-circle d-flex align-items-center justify-content-center"
                        title="Reject request"
                        onClick={() => handleRejectOrCancel(user.id)}
                        style={{ width: '28px', height: '28px' }}
                      >
                        ✗
                      </button>
                    </div>
                  )}

                  {fState.status === 'friends' && (
                    <div className="d-flex gap-1 align-items-center">
                      <button 
                        className="btn btn-primary btn-sm fw-semibold px-3 py-1 rounded-pill"
                        onClick={() => navigateTo('chat', user.id)}
                      >
                        💬 Chat
                      </button>
                      <button 
                        className="btn btn-outline-danger btn-sm rounded-circle d-flex align-items-center justify-content-center"
                        title="Unfriend"
                        onClick={() => handleRejectOrCancel(user.id)}
                        style={{ width: '28px', height: '28px' }}
                      >
                        🗑️
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}