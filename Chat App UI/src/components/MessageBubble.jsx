export default function MessageBubble({ message, currentUserId }) {
  const isMe = message.sender_id === currentUserId;
  const timeStr = message.created_at 
    ? new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  return (
    <div className={`d-flex ${isMe ? 'justify-content-end' : 'justify-content-start'} mb-3`}>
      <div className={`${isMe ? 'text-end' : 'text-start'}`} style={{maxWidth: '75%'}}>
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
        <small className="text-muted d-block mt-1 px-1" style={{ fontSize: '0.7rem' }}>
          {timeStr}
        </small>
      </div>
    </div>
  );
}