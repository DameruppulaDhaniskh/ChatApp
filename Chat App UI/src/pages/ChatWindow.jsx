import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import axiosInstance from '../utils/axiosInstance';
import ChatMessages from '../components/ChatMessages';
import MessageInput from '../components/MessageInput';

export default function ChatWindow({ userId: propUserId, onBack, socket }) {
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
  const [isTyping, setIsTyping] = useState(false);

  const currentUserStr = localStorage.getItem('user');
  const currentUser = currentUserStr ? JSON.parse(currentUserStr) : null;
  const currentUserId = currentUser ? currentUser.id : null;

  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Sync socket prop to socketRef
  useEffect(() => {
    socketRef.current = socket;
  }, [socket]);

  // Determine socket connection URL
  const socketUrl = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : 'http://localhost:5000';

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
        
        // Mark messages as read on backend via API call
        await axiosInstance.patch('/messages/read', {
          chatId: chat.id,
          senderId: parseInt(userId)
        });

        // Emit markAsRead socket event
        if (socketRef.current) {
          socketRef.current.emit('markAsRead', {
            chatId: chat.id,
            readerId: currentUserId,
            senderId: parseInt(userId)
          });
        }

        // Notify RecentChatList to update
        window.dispatchEvent(new Event('chat-updated'));
        
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
  }, [userId, currentUserId]);

  // Setup Socket listeners for active chat events
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !chat) return;

    const handleNewMessage = (message) => {
      if (message.chat_id === chat.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
        scrollToBottom('smooth');
        
        // Mark new message as read on backend via HTTP and Socket
        axiosInstance.patch('/messages/read', {
          chatId: chat.id,
          senderId: parseInt(userId)
        }).catch(err => console.error('Failed to mark incoming message as read:', err));

        socket.emit('markAsRead', {
          chatId: chat.id,
          readerId: currentUserId,
          senderId: parseInt(userId)
        });

        window.dispatchEvent(new Event('chat-updated'));
      } else {
        // Just trigger sidebar refresh for other chats
        window.dispatchEvent(new Event('chat-updated'));
      }
    };

    const handleUserTyping = ({ chatId, senderId }) => {
      if (chatId === chat.id && senderId === parseInt(userId)) {
        setIsTyping(true);
      }
    };

    const handleUserStopTyping = ({ chatId, senderId }) => {
      if (chatId === chat.id && senderId === parseInt(userId)) {
        setIsTyping(false);
      }
    };

    const handleMessagesRead = ({ chatId, readerId }) => {
      if (chatId === chat.id && readerId === parseInt(userId)) {
        setMessages((prev) =>
          prev.map((m) => (m.sender_id === currentUserId ? { ...m, is_read: true } : m))
        );
      }
      window.dispatchEvent(new Event('chat-updated'));
    };

    socket.on('newMessage', handleNewMessage);
    socket.on('userTyping', handleUserTyping);
    socket.on('userStopTyping', handleUserStopTyping);
    socket.on('messagesRead', handleMessagesRead);

    return () => {
      socket.off('newMessage', handleNewMessage);
      socket.off('userTyping', handleUserTyping);
      socket.off('userStopTyping', handleUserStopTyping);
      socket.off('messagesRead', handleMessagesRead);
    };
  }, [chat, userId, currentUserId]);

  // Clear typing indicators when switching chats
  useEffect(() => {
    setIsTyping(false);
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (socketRef.current && chat) {
        socketRef.current.emit('stopTyping', {
          chatId: chat.id,
          senderId: currentUserId,
          receiverId: parseInt(userId)
        });
      }
    };
  }, [userId, chat, currentUserId]);

  // Emit typing event and handle debounce stopTyping trigger
  const handleTyping = () => {
    if (!chat || !socketRef.current) return;

    socketRef.current.emit('typing', {
      chatId: chat.id,
      senderId: currentUserId,
      receiverId: parseInt(userId)
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (socketRef.current) {
        socketRef.current.emit('stopTyping', {
          chatId: chat.id,
          senderId: currentUserId,
          receiverId: parseInt(userId)
        });
      }
    }, 2000);
  };

  // Send message with Optimistic UI updates
  const handleSendMessage = async (content) => {
    if (!chat) return;
    
    // Stop typing immediately when message is sent
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (socketRef.current) {
      socketRef.current.emit('stopTyping', {
        chatId: chat.id,
        senderId: currentUserId,
        receiverId: parseInt(userId)
      });
    }

    // Create optimistic message for instant UI feedback
    const optimisticMessage = {
      id: 'optimistic-' + Date.now(),
      content: content,
      sender_id: currentUserId,
      created_at: new Date().toISOString(),
      sender_name: currentUser?.full_name || 'Me',
      is_read: false,
      sentiment: 'neutral'
    };

    // Append immediately to state
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Scroll to bottom right away
    setTimeout(() => scrollToBottom('smooth'), 20);

    try {
      setSending(true);
      const res = await axiosInstance.post('/messages', {
        chatId: chat.id,
        content
      });

      // Update optimistic message with real message containing sentiment and DB ID
      const officialMessage = res.data.newMessage;
      setMessages(prev => 
        prev.map(m => m.id === optimisticMessage.id ? officialMessage : m)
      );

      // Trigger sidebar update
      window.dispatchEvent(new Event('chat-updated'));
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
    } finally {
      setSending(false);
    }
  };

  const recipientName = recipient ? recipient.full_name : 'User';
  const recipientStatus = recipient ? recipient.status : 'offline';
  const avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(recipientName)}&backgroundType=gradientLinear&fontSize=42`;

  const chatCard = (
    <div className="card shadow-sm border-0 d-flex flex-column h-100" style={{ borderRadius: '16px', minHeight: isEmbedded ? 'auto' : '620px' }}>
      
      {/* CSS Bounce Animation for Typing Dots */}
      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1.0); }
        }
      `}</style>

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

            {/* Typing Indicator Bubble */}
            {isTyping && (
              <div className="text-muted text-start ps-3 py-2 small d-flex align-items-center" style={{ fontStyle: 'italic', zIndex: 5 }}>
                <span className="me-1">{recipientName} is typing</span>
                <span className="typing-dots d-inline-flex gap-1 align-items-center">
                  <span className="dot" style={{ width: '4px', height: '4px', backgroundColor: '#6c757d', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out both' }}></span>
                  <span className="dot" style={{ width: '4px', height: '4px', backgroundColor: '#6c757d', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.2s' }}></span>
                  <span className="dot" style={{ width: '4px', height: '4px', backgroundColor: '#6c757d', borderRadius: '50%', display: 'inline-block', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.4s' }}></span>
                </span>
              </div>
            )}
            
            <MessageInput onSendMessage={handleSendMessage} disabled={sending} onTyping={handleTyping} />
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