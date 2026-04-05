import { useState, useRef, useEffect } from 'react';
import { quickChips } from '../data/chatbotData';

const API_URL = 'http://localhost:5000/get_response';

export default function Chatbot() {
  const [msgs, setMsgs] = useState([{
    type: 'bot',
    text: "Hello! I'm your Ocean & Climate AI assistant powered by Llama 3.3 70B. Ask me about cyclones, rip currents, tsunami warnings, marine biology, or any ocean science topic!"
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  async function send(text) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');
    setMsgs(m => [...m, { type: 'user', text: msg }]);
    setLoading(true);

    try {
      const res  = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMsgs(m => [...m, { type: 'bot', text: data.reply }]);
    } catch {
      setMsgs(m => [...m, {
        type: 'bot',
        text: 'Could not reach the AI server. Make sure the chatbot backend is running on port 5000.'
      }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="chat-box">
      <div className="chat-title">
        Ocean Safety AI Assistant
        <span style={{ fontSize: '0.72rem', fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
          Powered by Llama 3.3 70B · Groq
        </span>
      </div>
      <div className="chip-row">
        {quickChips.map(c => (
          <span key={c} className="chip" onClick={() => !loading && send(c)}>{c}</span>
        ))}
      </div>
      <div className="chat-msgs">
        {msgs.map((m, i) => (
          <div key={i} className={`msg ${m.type}`}>{m.text}</div>
        ))}
        {loading && (
          <div className="msg bot" style={{ opacity: 0.6, fontStyle: 'italic' }}>
            Thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input
          className="chat-input"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about ocean safety, climate, marine science..."
          disabled={loading}
        />
        <button className="chat-send" onClick={() => send()} disabled={loading}>
          {loading ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
