import MessageBubble from './MessageBubble';
export default function ChatMessages({ messages, currentUserId }) {
  return (
    <div className="chat-messages">
      {messages?.map(message => (
        <MessageBubble key={message.id} message={message} currentUserId={currentUserId} />
      ))}
    </div>
  );
}