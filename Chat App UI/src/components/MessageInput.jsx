import { useState } from "react";

export default function MessageInput({ onSendMessage, disabled }) {
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (newMessage.trim() && !disabled) {
      onSendMessage(newMessage.trim());
      setNewMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="d-flex align-items-center pt-3 mt-auto bg-white">
      <input 
        type="text" 
        className="form-control rounded-pill border px-4 py-2 shadow-sm me-2" 
        placeholder="Type a message..." 
        value={newMessage}
        onChange={(e) => setNewMessage(e.target.value)}
        onKeyDown={handleKeyPress}
        disabled={disabled}
      />
      <button 
        className="btn btn-primary rounded-circle shadow-sm d-flex align-items-center justify-content-center flex-shrink-0" 
        onClick={handleSend}
        disabled={disabled || !newMessage.trim()}
        style={{ width: '42px', height: '42px' }}
      >
        <span style={{ fontSize: '1.1rem', transform: 'rotate(45deg)', display: 'inline-block' }}>✈️</span>
      </button>
    </div>
  );
}