import { useEffect, useRef, useState } from 'react';

type Msg = { id: string; role: 'user' | 'bot'; text: string };

export default function MiniChat() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [msgs.length]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = crypto.randomUUID?.() ?? Math.random().toString(36);
    setMsgs(prev => [...prev, { id, role: 'user', text: trimmed }]);
    setInput('');
    setTimeout(() => {
      setMsgs(prev => [
        ...prev,
        { id: (crypto.randomUUID?.() ?? Math.random().toString(36)) + '-b', role: 'bot', text: `You said: ${trimmed}` },
      ]);
    }, 200);
  }

  return (
    <div className="mini-chat">
      {/* <div className="mini-chat__head">Chat</div> */}

      <div className="mini-chat__list" ref={listRef} role="log" aria-live="polite">
        {msgs.length === 0 && <div className="mini-chat__empty">Say hi 👋</div>}
        {msgs.map(m => (
          <div key={m.id} className={`mini-chat__row ${m.role}`}>
            <div className="mini-chat__bubble">{m.text}</div>
          </div>
        ))}
      </div>

      <div className="mini-chat__inputrow">
        <input
          className="mini-chat__input"
          placeholder="Type and press Enter…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') send(input);
          }}
        />
        <button className="mini-chat__send" onClick={() => send(input)}>Send</button>
      </div>
    </div>
  );
}