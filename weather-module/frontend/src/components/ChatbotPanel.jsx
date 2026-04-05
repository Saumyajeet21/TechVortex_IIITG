import React, { useState, useEffect, useRef, useCallback } from 'react';

const CHATBOT_URL = 'http://localhost:5000/get_response';

// ── SVG Icons ──────────────────────────────────────────────────────────────
function Icon({ d, d2, size = 20, color = 'currentColor', sw = 1.5 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />{d2 && <path d={d2} />}
    </svg>
  );
}
const SendIcon     = ({ s, c }) => <Icon size={s||18} color={c||'currentColor'} d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />;
const BotIcon      = ({ s, c }) => <Icon size={s||18} color={c||'currentColor'}
  d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 12 2z"
  d2="M5 14v7h14v-7M9 21v-4h6v4" />;
const ChevronIcon  = ({ s, c }) => <Icon size={s||16} color={c||'currentColor'} d="M15 18l-6-6 6-6" sw={2} />;
const SparkleIcon  = ({ s = 14, c = 'currentColor' }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill={c} stroke="none">
    <path d="M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2z" />
  </svg>
);
const CopyIcon     = ({ s, c }) => <Icon size={s||14} color={c||'currentColor'}
  d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M8 4h8M8 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2" />;

// ── Suggested questions ────────────────────────────────────────────────────
const SUGGESTIONS = [
  { label: 'Ocean acidification', q: 'What causes ocean acidification and its effects?' },
  { label: 'Hurricane formation', q: 'How do hurricanes form over warm ocean water?' },
  { label: 'El Niño effects',     q: 'How does El Niño affect global weather patterns?' },
  { label: 'Deep ocean currents', q: 'Explain thermohaline circulation and its role in climate.' },
  { label: 'Sea level rise',      q: 'What are the primary drivers of sea level rise?' },
  { label: 'Marine heatwaves',    q: 'What are marine heatwaves and why are they increasing?' },
];

// ── Simple markdown bold renderer ─────────────────────────────────────────
function RenderContent({ text }) {
  const lines = text.split('\n');
  return (
    <div style={{ color: '#e2e8f0', fontSize: '0.85rem', lineHeight: 1.75, wordBreak: 'break-word' }}>
      {lines.map((line, i) => {
        const parts = line.split(/\*\*(.+?)\*\*/g);
        const rendered = parts.map((p, j) =>
          j % 2 === 1 ? <strong key={j} style={{ color: '#f1f5f9', fontWeight: 600 }}>{p}</strong> : p
        );
        const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('• ');
        return (
          <div key={i} style={{ marginBottom: isBullet ? 4 : (line ? 0 : 8) }}>
            {isBullet
              ? <span><span style={{ color: '#3b82f6', marginRight: 8 }}>—</span>{rendered}</span>
              : rendered
            }
          </div>
        );
      })}
    </div>
  );
}

// ── Message Bubble ─────────────────────────────────────────────────────────
function MessageBubble({ msg, idx }) {
  const isUser = msg.role === 'user';
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div style={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      gap: 12, marginBottom: 20, alignItems: 'flex-start',
      animation: `msgSlide 0.25s ease both`,
    }}>
      {/* Bot avatar */}
      {!isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0, marginTop: 2,
          background: 'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(6,182,212,0.15))',
          border: '1px solid rgba(59,130,246,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <SparkleIcon s={14} c="#3b82f6" />
        </div>
      )}

      {/* Bubble */}
      <div style={{ maxWidth: '70%', position: 'relative' }}>
        <div style={{
          padding: '14px 18px',
          borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isUser
            ? 'linear-gradient(135deg,rgba(59,130,246,0.18),rgba(99,102,241,0.14))'
            : 'rgba(255,255,255,0.04)',
          border: `1px solid ${isUser ? 'rgba(59,130,246,0.28)' : 'rgba(255,255,255,0.07)'}`,
          backdropFilter: 'blur(8px)',
        }}>
          <RenderContent text={msg.content} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, gap: 12 }}>
            <span style={{ color: '#1e293b', fontSize: '0.6rem', fontWeight: 500 }}>{msg.time}</span>
            {!isUser && (
              <button onClick={handleCopy} style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                color: copied ? '#10b981' : '#334155', display: 'flex', alignItems: 'center', gap: 4,
                fontSize: '0.6rem', fontWeight: 500, transition: 'color 0.2s',
              }}>
                <CopyIcon s={12} c={copied ? '#10b981' : '#334155'} />
                {copied ? 'Copied' : 'Copy'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div style={{
          width: 34, height: 34, borderRadius: 10, flexShrink: 0, marginTop: 2,
          background: 'linear-gradient(135deg,rgba(99,102,241,0.25),rgba(59,130,246,0.2))',
          border: '1px solid rgba(99,102,241,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.7rem', fontWeight: 700, color: '#a5b4fc',
        }}>
          You
        </div>
      )}
    </div>
  );
}

// ── Typing indicator ───────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 20 }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: 'linear-gradient(135deg,rgba(59,130,246,0.2),rgba(6,182,212,0.15))',
        border: '1px solid rgba(59,130,246,0.25)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <SparkleIcon s={14} c="#3b82f6" />
      </div>
      <div style={{
        padding: '14px 18px', borderRadius: '16px 16px 16px 4px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', gap: 5, alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#3b82f6', opacity: 0.8,
            animation: `typingDot 1.3s ease-in-out ${i * 0.18}s infinite`,
          }} />
        ))}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function ChatbotPanel({ onBack }) {
  const [messages, setMessages] = useState([{
    role: 'bot',
    content: 'Hello. I am your AI Climate and Ocean Science assistant, powered by **Llama 3.3 70B** via Groq.\n\nI specialize in oceanography, marine biology, weather systems, storm dynamics, and climate change research. Ask me anything.',
    time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
  }]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef             = useRef(null);
  const inputRef              = useRef(null);
  const showSuggestions       = messages.length <= 2 && !loading;

  // Inject keyframes
  useEffect(() => {
    const s = document.createElement('style');
    s.textContent = `
      @keyframes msgSlide { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      @keyframes typingDot { 0%,60%,100% { transform:translateY(0); } 30% { transform:translateY(-6px); } }
    `;
    document.head.appendChild(s);
    return () => s.remove();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async (txt) => {
    const msg = (txt || input).trim();
    if (!msg || loading) return;
    setInput('');

    const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setMessages(p => [...p, { role: 'user', content: msg, time }]);
    setLoading(true);

    try {
      const res  = await fetch(CHATBOT_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages(p => [...p, {
        role: 'bot', content: data.reply,
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch {
      setMessages(p => [...p, {
        role: 'bot',
        content: 'Connection failed. Ensure the chatbot server is running:\n\n```\ncd chatbot\npython app.py\n```',
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading]);

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const canSend = !loading && input.trim().length > 0;

  return (
    <div style={{
      minHeight: '100vh', background: '#00060f',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Inter','Segoe UI',system-ui,sans-serif",
    }}>
      {/* ── Header ── */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '0 28px', height: 64,
        background: 'rgba(0,6,15,0.9)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        {onBack && (
          <button onClick={onBack} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none',
            color: '#475569', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
            padding: '6px 10px', borderRadius: 8, transition: 'color 0.2s, background 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color='#e2e8f0'; e.currentTarget.style.background='rgba(255,255,255,0.05)'; }}
          onMouseLeave={e => { e.currentTarget.style.color='#475569'; e.currentTarget.style.background='none'; }}>
            <ChevronIcon s={16} c="currentColor" /> Home
          </button>
        )}
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)' }} />

        {/* Bot identity */}
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: 'linear-gradient(135deg,rgba(16,185,129,0.18),rgba(16,185,129,0.08))',
          border: '1px solid rgba(16,185,129,0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <SparkleIcon s={16} c="#10b981" />
        </div>
        <div>
          <div style={{ color: '#f1f5f9', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1 }}>
            Climate AI Assistant
          </div>
          <div style={{ color: '#475569', fontSize: '0.65rem', marginTop: 3, display: 'flex', gap: 6, alignItems: 'center' }}>
            <span>Llama 3.3 70B</span>
            <span style={{ color: '#1e293b' }}>·</span>
            <span>Groq</span>
            <span style={{ color: '#1e293b' }}>·</span>
            <span>Ocean &amp; Climate Science</span>
          </div>
        </div>

        {/* Status */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', borderRadius: 20,
          background: loading ? 'rgba(251,191,36,0.08)' : 'rgba(34,197,94,0.08)',
          border: `1px solid ${loading ? 'rgba(251,191,36,0.2)' : 'rgba(34,197,94,0.18)'}`,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: loading ? '#fbbf24' : '#22c55e',
            animation: 'pulseDot 2s ease-in-out infinite',
          }} />
          <span style={{ color: loading ? '#fbbf24' : '#22c55e', fontSize: '0.65rem', fontWeight: 600 }}>
            {loading ? 'Processing' : 'Online'}
          </span>
        </div>
      </header>

      {/* ── Message area ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '28px 20px 8px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {messages.map((m, i) => <MessageBubble key={i} msg={m} idx={i} />)}
          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Suggestions ── */}
      {showSuggestions && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ maxWidth: 800, margin: '0 auto' }}>
            <div style={{ color: '#1e293b', fontSize: '0.62rem', fontWeight: 600,
              letterSpacing: 1.2, marginBottom: 10, textTransform: 'uppercase' }}>
              Suggested topics
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTIONS.map(({ label, q }) => (
                <button key={label} onClick={() => send(q)} style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: '0.73rem', fontWeight: 500,
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)',
                  color: '#64748b', cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.18s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(59,130,246,0.1)'; e.currentTarget.style.borderColor='rgba(59,130,246,0.25)'; e.currentTarget.style.color='#93c5fd'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor='rgba(255,255,255,0.07)'; e.currentTarget.style.color='#64748b'; }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div style={{
        background: 'rgba(0,6,15,0.88)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(255,255,255,0.06)', padding: '16px 20px',
      }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={onKey}
              disabled={loading}
              placeholder="Ask about oceans, weather patterns, climate change, marine science..."
              style={{
                width: '100%', padding: '13px 16px', boxSizing: 'border-box',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${input ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 12, color: '#e2e8f0', fontSize: '0.85rem',
                fontFamily: 'inherit', resize: 'none', outline: 'none',
                lineHeight: 1.5, transition: 'border-color 0.18s',
              }}
              onFocus={e => e.target.style.borderColor='rgba(59,130,246,0.4)'}
              onBlur={e => e.target.style.borderColor=input ? 'rgba(59,130,246,0.35)' : 'rgba(255,255,255,0.08)'}
            />
          </div>
          {/* Send button */}
          <button onClick={() => send()} disabled={!canSend} style={{
            width: 46, height: 46, borderRadius: 12, border: 'none', flexShrink: 0,
            background: canSend ? 'linear-gradient(135deg,#3b82f6,#6366f1)' : 'rgba(255,255,255,0.05)',
            cursor: canSend ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.18s ease',
            boxShadow: canSend ? '0 4px 16px rgba(59,130,246,0.3)' : 'none',
          }}
          onMouseEnter={e => canSend && (e.currentTarget.style.transform='scale(1.06)')}
          onMouseLeave={e => e.currentTarget.style.transform='scale(1)'}>
            <SendIcon s={17} c={canSend ? '#fff' : '#334155'} />
          </button>
        </div>
        <div style={{ maxWidth: 800, margin: '8px auto 0', textAlign: 'center',
          color: '#0f172a', fontSize: '0.6rem', fontWeight: 500 }}>
          Llama 3.3 70B · Groq API · Specialized in Marine Science · Press Enter to send
        </div>
      </div>
    </div>
  );
}
