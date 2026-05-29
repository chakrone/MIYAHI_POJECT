import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User, Sparkles } from 'lucide-react';
import { sendChatMessage } from '../../services/api';
import type { ChatMessage, ChatResponse } from '../../services/api';

interface Props {
  meterId: string;
}

interface DisplayMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const DEFAULT_SUGGESTIONS = [
  "How much water did I use today?",
  "What's my estimated bill?",
  "Any anomalies detected?",
  "Explain the billing tiers",
];

export default function ChatWidget({ meterId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(DEFAULT_SUGGESTIONS);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || isLoading) return;

    // Add user message
    const userMsg: DisplayMessage = {
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Build history from previous messages
      const history: ChatMessage[] = messages.map(m => ({
        role: m.role,
        content: m.content,
      }));

      const response: ChatResponse = await sendChatMessage({
        message: messageText,
        meter_id: meterId,
        history,
      });

      const botMsg: DisplayMessage = {
        role: 'assistant',
        content: response.reply,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);

      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: DisplayMessage = {
        role: 'assistant',
        content: `Sorry, I couldn't connect to the chatbot service. Error: ${err?.message || 'Unknown error'}. Make sure the service is running and try again.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          className="chat-fab"
          onClick={() => setIsOpen(true)}
          aria-label="Open chat assistant"
          id="chat-fab-button"
        >
          <MessageCircle size={24} />
          <span className="chat-fab__pulse" />
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="chat-panel" id="chat-panel">
          {/* Header */}
          <div className="chat-panel__header">
            <div className="chat-panel__header-info">
              <div className="chat-panel__avatar">
                <Bot size={18} />
              </div>
              <div>
                <div className="chat-panel__title">MIYAHI Assistant</div>
                <div className="chat-panel__subtitle">
                  <Sparkles size={10} /> AI-powered · {meterId.replace('_', ' ')}
                </div>
              </div>
            </div>
            <button
              className="chat-panel__close"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="chat-panel__messages">
            {messages.length === 0 && (
              <div className="chat-welcome">
                <div className="chat-welcome__icon">
                  <Bot size={32} />
                </div>
                <div className="chat-welcome__title">Hi! I'm MIYAHI Assistant</div>
                <div className="chat-welcome__text">
                  Ask me about water consumption, billing, anomalies, or anything about your meters.
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`chat-message chat-message--${msg.role}`}
              >
                <div className="chat-message__icon">
                  {msg.role === 'assistant' ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div className="chat-message__content">
                  <div className="chat-message__text">{msg.content}</div>
                  <div className="chat-message__time">{formatTime(msg.timestamp)}</div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="chat-message chat-message--assistant">
                <div className="chat-message__icon">
                  <Bot size={14} />
                </div>
                <div className="chat-message__content">
                  <div className="chat-typing">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length === 0 && (
            <div className="chat-suggestions">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  className="chat-suggestion-chip"
                  onClick={() => handleSend(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input Area */}
          <div className="chat-panel__input">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about consumption, billing, alerts..."
              disabled={isLoading}
              id="chat-input"
            />
            <button
              className="chat-send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
