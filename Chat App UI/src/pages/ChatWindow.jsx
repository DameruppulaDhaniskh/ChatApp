import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import ChatMessages from '../components/ChatMessages';
import MessageInput from '../components/MessageInput';

export default function ChatWindow({ userId: propUserId, onBack }) {
  const navigate = useNavigate();
  const { userId: paramUserId } = useParams(); // other user's ID
  const userId = propUserId || paramUserId;
  const isEmbedded = !!propUserId;
  const messagesEndRef = useRef(null);
  
  const [chat, setChat] = useState(null);
  const [recipient, setRecipient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const currentUserStr = localStorage.getItem('user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const currentUserId = currentUser ? currentUser.id : null;

  // Scroll to bottom helper
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Initialize: Fetch consolidated chat session (recipient, chat details, and messages)
  useEffect(() => {
    let active = true;
    const initializeChat = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Fetch all chat session details in a single consolidated API call
        const response = await axiosInstance.get(`/chats/session/${userId}`);
        if (!active) return;
        
        const { recipient, chat, messages } = response.data;
        setRecipient(recipient);
        setChat(chat);
        setMessages(messages);
        
        // Immediate scroll to bottom
        setTimeout(() => scrollToBottom('auto'), 50);
      } catch (err) {
        console.error('Failed to initialize chat session:', err);
        if (active) {
          setError(err.response?.data?.error || 'Failed to establish chat session.');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    initializeChat();

    return () => {
      active = false;
    };
  }, [userId]);

  // Polling loop for real-time messages
  useEffect(() => {
    if (!chat) return;

    let pollInterval = setInterval(async () => {
      try {
        const res = await axiosInstance.get(`/messages/${chat.id}`);
        // Only update if there are new messages or changes to avoid redundant re-renders
        if (JSON.stringify(res.data) !== JSON.stringify(messages)) {
          setMessages(res.data);
          scrollToBottom('smooth');
        }
      } catch (err) {
        console.error('Error polling messages:', err);
      }
    }, 1000);

    return () => clearInterval(pollInterval);
  }, [chat, messages]);

  // Send message
  const handleSendMessage = async (content) => {
    if (!chat) return;
    
    // Create optimistic message for instant UI feedback
    const optimisticMessage = {
      id: 'optimistic-' + Date.now(),
      content: content,
      sender_id: currentUserId,
      created_at: new Date().toISOString(),
      sender_name: currentUser?.full_name || 'Me',
      is_read: false
    };

    // Append immediately to state
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Scroll to bottom right away
    setTimeout(() => scrollToBottom('smooth'), 20);

    try {
      await axiosInstance.post('/messages', {
        chatId: chat.id,
        content
      });
      
      // Fetch actual message list with official database keys in background
      const res = await axiosInstance.get(`/messages/${chat.id}`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to send message:', err);
      alert(err.response?.data?.error || 'Failed to send message');
      
      // Rollback optimistic message by fetching verified messages list
      try {
        const res = await axiosInstance.get(`/messages/${chat.id}`);
        setMessages(res.data);
      } catch (rollbackErr) {
        console.error('Rollback fetch failed:', rollbackErr);
      }
    }
  };

  const recipientName = recipient ? recipient.full_name : 'User';
  const recipientStatus = recipient ? recipient.status : 'offline';
  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(recipientName)}&backgroundType=gradientLinear&fontSize=42`;

  const chatCard = (
    <div className="card shadow-sm border-0 d-flex flex-column h-100" style={{ borderRadius: '16px', minHeight: '620px' }}>
      
      {/* Card Header */}
      <div className="card-header bg-white border-0 py-3 px-4 d-flex align-items-center justify-content-between shadow-sm" style={{ borderTopLeftRadius: '16px', borderTopRightRadius: '16px' }}>
        <div className="d-flex align-items-center">
          {(!isEmbedded || onBack) && (
            <button 
              className="btn btn-outline-secondary btn-sm rounded-circle me-3 d-flex align-items-center justify-content-center" 
              onClick={isEmbedded ? onBack : () => navigate('/home')}
              style={{ width: '32px', height: '32px', borderWidth: '1.5px' }}
              title="Go Back"
            >
              ←
            </button>
          )}
          {recipient && (
            <div className="d-flex align-items-center">
              <img 
                src={avatarUrl} 
                alt={recipientName} 
                className="rounded-circle me-3 border"
                width="42"
                height="42"
              />
              <div className="text-start">
                <h6 className="mb-0 fw-bold text-dark">{recipientName}</h6>
                <small className="d-flex align-items-center text-muted">
                  <span 
                    className="d-inline-block rounded-circle me-1" 
                    style={{ 
                      width: '8px', 
                      height: '8px', 
                      backgroundColor: recipientStatus === 'online' ? '#28a745' : '#6c757d' 
                    }}
                  />
                  {recipientStatus === 'online' ? 'Online' : 'Offline'}
                </small>
              </div>
            </div>
          )}
        </div>
        <span className="badge bg-light text-muted border px-2 py-1 small">Secure Chat</span>
      </div>

      {/* Card Body / Messages Container */}
      <div className="card-body bg-light bg-opacity-25 d-flex flex-column px-4 py-3 overflow-hidden" style={{ position: 'relative' }}>
        {loading ? (
          <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <small className="text-muted mt-2">Opening chat session...</small>
          </div>
        ) : error ? (
          <div className="d-flex flex-column align-items-center justify-content-center flex-grow-1 text-center py-4 px-3">
            <div className="fs-1 mb-2">🔒</div>
            <h6 className="fw-bold text-dark mb-1">Access Restricted</h6>
            <p className="text-muted small mb-3" style={{ maxWidth: '280px' }}>
              {error}
            </p>
            <button className="btn btn-primary btn-sm fw-semibold px-3" onClick={isEmbedded ? onBack : () => navigate('/home')}>
              Back to Directory
            </button>
          </div>
        ) : (
          <>
            <div className="flex-grow-1 overflow-auto pe-1" style={{ scrollbarWidth: 'thin' }}>
              {messages.length === 0 ? (
                <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted small text-center">
                  <div className="fs-3 mb-2">👋</div>
                  Say hello to <strong>{recipientName}</strong>!<br />
                  Type a message below to start the conversation.
                </div>
              ) : (
                <ChatMessages messages={messages} currentUserId={currentUserId} />
              )}
              <div ref={messagesEndRef} />
            </div>
            
            <MessageInput onSendMessage={handleSendMessage} disabled={sending} />
          </>
        )}
      </div>

    </div>
  );

  if (isEmbedded) {
    return chatCard;
  }

  return (
    <div className="container mt-4 mb-5">
      <div className="row justify-content-center">
        <div className="col-md-9 col-lg-8">
          {chatCard}
        </div>
      </div>
    </div>
  );
}