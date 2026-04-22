import { useState, useEffect, useRef } from 'react';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { FiX, FiSend, FiMaximize2, FiMinimize2 } from 'react-icons/fi';
import './ChatModal.css';

const ChatModal = ({ partnerId, partnerName, partnerRole, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchMessages();
    markMessagesAsRead();
    
    // Polling for new messages every 3 seconds
    const interval = setInterval(() => {
      fetchMessages();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [partnerId]);

  const fetchMessages = async () => {
    try {
      const { data } = await API.get(`/chat/${partnerId}`);
      setMessages(data);
      scrollToBottom();
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      await API.post('/chat/mark-read', { senderId: partnerId });
    } catch (err) {
      console.error('Error marking messages as read:', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    // Optimistic UI update
    const newMessage = {
      _id: Date.now().toString(),
      sender: user.id,
      receiver: partnerId,
      content: inputText.trim(),
      timestamp: new Date().toISOString()
    };
    setMessages(prev => [...prev, newMessage]);
    setInputText('');
    scrollToBottom();

    try {
      await API.post('/chat/send', {
        receiverId: partnerId,
        content: inputText.trim()
      });
      fetchMessages();
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <div className={`chat-modal-container ${isMinimized ? 'minimized' : ''}`}>
      <div className="chat-modal-header" onClick={() => setIsMinimized(!isMinimized)}>
        <div className="chat-modal-header-info">
          <div className="chat-avatar">
            {partnerName?.charAt(0) || '?'}
          </div>
          <div>
            <strong>{partnerName}</strong>
            <span className="chat-role">{partnerRole === 'doctor' ? 'Doctor' : 'Patient'}</span>
          </div>
        </div>
        <div className="chat-modal-actions">
          <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}>
            {isMinimized ? <FiMaximize2 /> : <FiMinimize2 />}
          </button>
          <button onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <FiX />
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <>
          <div className="chat-messages-area">
            {messages.length === 0 ? (
              <div className="chat-empty-state">
                <p>Start a conversation with {partnerName}</p>
              </div>
            ) : (
              messages.map((msg, index) => {
                const isMine = msg.sender === user.id;
                return (
                  <div key={msg._id || index} className={`chat-bubble-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                    <div className="chat-bubble">
                      <p>{msg.content}</p>
                      <span className="chat-time">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
          
          <form className="chat-input-area" onSubmit={handleSend}>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type a message..."
              autoComplete="off"
            />
            <button type="submit" disabled={!inputText.trim()}>
              <FiSend />
            </button>
          </form>
        </>
      )}
    </div>
  );
};

export default ChatModal;
