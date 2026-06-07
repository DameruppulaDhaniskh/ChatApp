export default function MessageBubble({ message, currentUserId }) {
  const isMe = message.sender_id === currentUserId;
  const timeStr = message.created_at 
    ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <div className={`d-flex ${isMe ? 'justify-content-end' : 'justify-content-start'} mb-3`}>
      <div className={`${isMe ? 'text-end' : 'text-start'}`} style={{maxWidth: '75%'}}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div 
            className={`p-3 shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-white text-dark border'}`}
            style={{
              display: 'inline-block',
              borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              textAlign: 'left'
            }}
          >
            {message.content}
          </div>
          {message.sentiment && message.sentiment !== 'neutral' && (
            <span 
              style={{ 
                position: 'absolute', 
                bottom: '-8px', 
                right: isMe ? 'auto' : '-8px',
                left: isMe ? '-8px' : 'auto',
                background: '#f8f9fa',
                borderRadius: '50%',
                padding: '2px',
                fontSize: '0.8rem',
                border: '1px solid #dee2e6',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
              title={`Sentiment: ${message.sentiment}`}
            >
              {message.sentiment === 'positive' ? '😊' : '😢'}
            </span>
          )}
        </div>
        <small className="text-muted d-block mt-1 px-1" style={{ fontSize: '0.7rem' }}>
          {timeStr}
          {isMe && (
            <span className="ms-1 font-monospace" style={{ color: message.is_read ? '#0d6efd' : '#6c757d', fontWeight: 'bold' }}>
              {message.is_read ? ' ✓✓' : ' ✓'}
            </span>
          )}
        </small>
      </div>
    </div>
  );
}