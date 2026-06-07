import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import RecentChatList from '../components/RecentChatList';
import ChatWindow from './ChatWindow';
import UserList from '../components/UserList';

export default function Home() {
  const [activeChatUserId, setActiveChatUserId] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showFriendsModal, setShowFriendsModal] = useState(false);

  const currentUserStr = localStorage.getItem('user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const currentUserId = currentUser ? currentUser.id : null;

  const socketRef = useRef(null);

  // Determine socket connection URL
  const socketUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : 'http://localhost:5000';

  // Global socket setup at the Home dashboard level
  useEffect(() => {
    if (!currentUserId) return;

    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('userOnline', currentUserId);
    });

    if (socket.connected) {
      socket.emit('userOnline', currentUserId);
    }

    // Refresh the recent chat list sidebar instantly on incoming message or read receipt
    socket.on('newMessage', (message) => {
      window.dispatchEvent(new Event('chat-updated'));
    });

    socket.on('messagesRead', () => {
      window.dispatchEvent(new Event('chat-updated'));
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUserId, socketUrl]);

  function handleNavigate(page, userId) {
    if (page === 'chat') {
      setActiveChatUserId(userId);
    }
  }

  const handleBack = () => {
    setActiveChatUserId(null);
  };

  return (
    <div className="container-fluid py-4" style={{ height: 'calc(100vh - 64px)', minHeight: '650px' }}>
      <div className="row h-100 g-4">
        
        {/* Left Side: Recent Chats */}
        <div className={`col-md-4 col-lg-3 h-100 ${activeChatUserId ? 'd-none d-md-block' : 'd-block'}`}>
          <div className="card shadow-sm border-0 h-100 d-flex flex-column" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            <div className="card-header bg-white border-0 py-3 d-flex align-items-center justify-content-between">
              <h5 className="mb-0 fw-bold text-dark">Chats</h5>
              <div className="d-flex align-items-center gap-2">
                <button 
                  className="btn btn-outline-primary btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm"
                  style={{ width: '32px', height: '32px', borderWidth: '1.5px', fontSize: '1.2rem', fontWeight: 'bold', lineHeight: 1 }}
                  onClick={() => setShowFriendsModal(true)}
                  title="Find New Friends"
                >
                  +
                </button>
                <span className="badge bg-primary bg-opacity-10 text-primary px-2 py-1 small fw-semibold">Live</span>
              </div>
            </div>
            <div className="card-body pt-0 flex-grow-1 overflow-auto px-2" style={{ scrollbarWidth: 'thin' }}>
              <RecentChatList navigateTo={handleNavigate} refreshTrigger={refreshTrigger} />
            </div>
          </div>
        </div>

        {/* Right Side: Chat Window or Empty Splash */}
        <div className={`col-md-8 col-lg-9 h-100 ${activeChatUserId ? 'd-block' : 'd-none d-md-block'}`}>
          {activeChatUserId ? (
            <ChatWindow 
              userId={activeChatUserId} 
              onBack={handleBack} 
              socket={socketRef.current} 
            />
          ) : (
            <div className="card shadow-sm border-0 h-100 d-flex flex-column justify-content-center align-items-center bg-white" style={{ borderRadius: '16px' }}>
              <div className="text-center p-5">
                <div className="display-3 mb-4 text-primary bg-light rounded-circle d-inline-flex align-items-center justify-content-center shadow-sm" style={{ width: '100px', height: '100px' }}>
                  💬
                </div>
                <h4 className="fw-bold text-dark mb-2">Welcome to ChatApp</h4>
                <p className="text-muted mb-0 mx-auto" style={{ maxWidth: '360px', fontSize: '0.95rem' }}>
                  Select a conversation from the sidebar on the left to start sending messages in real-time.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Friends Finder Modal Overlay */}
      {showFriendsModal && (
        <div 
          className="modal-backdrop fade show" 
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)', zIndex: 1040 }}
          onClick={() => setShowFriendsModal(false)}
        />
      )}
      {showFriendsModal && (
        <div 
          className="modal fade show d-block" 
          tabIndex="-1" 
          style={{ zIndex: 1050, top: '8%' }}
          onClick={() => setShowFriendsModal(false)}
        >
          <div className="modal-dialog modal-dialog-centered modal-md" onClick={e => e.stopPropagation()}>
            <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
              <div className="modal-header bg-white border-0 py-3 px-4 d-flex align-items-center justify-content-between">
                <h5 className="modal-title fw-bold text-dark">Find New Friends</h5>
                <button 
                  type="button" 
                  className="btn-close shadow-none" 
                  onClick={() => setShowFriendsModal(false)}
                  aria-label="Close"
                  style={{ fontSize: '0.8rem' }}
                />
              </div>
              <div className="modal-body px-4 pb-4 pt-1" style={{ maxHeight: '480px', overflowY: 'auto', scrollbarWidth: 'thin' }}>
                <UserList 
                  navigateTo={(page, userId) => {
                    handleNavigate(page, userId);
                    setShowFriendsModal(false);
                  }}
                  onFriendshipChange={() => {
                    setRefreshTrigger(prev => prev + 1);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}