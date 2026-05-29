import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../api/chat';
import { formatDate } from '../../utils/format';

type Props = {
  messages: ChatMessage[];
  systemMessages?: { id: string; text: string; at: string }[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: (e: React.FormEvent) => void;
  placeholder?: string;
  emptyHint?: string;
  mySender: 'user' | 'admin';
  loading?: boolean;
  quickReplies?: string[];
  onQuickReply?: (text: string) => void;
};

export function ChatBox({
  messages,
  systemMessages = [],
  input,
  onInputChange,
  onSend,
  placeholder = 'Escribe un mensaje...',
  emptyHint = 'Envía un mensaje para iniciar la conversación.',
  mySender,
  loading,
  quickReplies,
  onQuickReply,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (loading) return <p className="hint">Cargando mensajes...</p>;

  return (
    <div className="chat-box">
      <div className="chat-messages">
        {messages.length === 0 && systemMessages.length === 0 && <p className="hint">{emptyHint}</p>}
        {systemMessages.map((m) => (
          <div key={m.id} className="chat-system-msg chat-system-msg--auto">
            <span className="chat-auto-label">Asistente Zardain</span>
            <span>{m.text}</span>
            <small>{formatDate(m.at)}</small>
          </div>
        ))}
        {messages.map((m) => {
          if (m.sender === 'system') {
            return (
              <div key={m.id} className="chat-system-msg chat-system-msg--auto">
                <span className="chat-auto-label">Asistente Zardain</span>
                <span>{m.message}</span>
                <small>{formatDate(m.createdAt)}</small>
              </div>
            );
          }
          const isMine = m.sender === mySender;
          const senderLabel = m.sender === 'admin' ? 'Zardain' : 'Cliente';
          return (
            <div
              key={m.id}
              className={`chat-row ${isMine ? 'chat-row--mine' : 'chat-row--theirs'}`}
            >
              {!isMine && <span className="chat-sender-label">{senderLabel}</span>}
              <div className={`chat-bubble chat-bubble--${m.sender} ${isMine ? 'mine' : 'theirs'}`}>
                <p>{m.message}</p>
                <div className="chat-meta">
                  <small>{formatDate(m.createdAt)}</small>
                  {isMine && (
                    <span className={`read-status ${m.read ? 'read' : ''}`}>
                      {m.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {quickReplies && quickReplies.length > 0 && (
        <div className="chat-quick-replies">
          {quickReplies.map((text) => (
            <button
              key={text}
              type="button"
              className="chat-quick-reply-btn"
              onClick={() => onQuickReply?.(text)}
            >
              {text}
            </button>
          ))}
        </div>
      )}
      <form className="chat-input-row" onSubmit={onSend}>
        <input
          className="input"
          placeholder={placeholder}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          autoComplete="off"
        />
        <button type="submit" className="btn btn-primary btn-md" disabled={!input.trim()}>
          Enviar
        </button>
      </form>
    </div>
  );
}
