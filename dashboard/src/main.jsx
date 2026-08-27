import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ImagePlus, Send, X, Sparkles } from 'lucide-react';
import './style.css';

const API = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

function App() {
  const [messages, setMessages] = useState([{ role: 'ai', text: 'Hi! Ask me about your quick-commerce data, or upload a product/store image.' }]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const picker = useRef(null);

  async function send() {
    if ((!input.trim() && !file) || busy) return;
    setBusy(true);
    let imageId = null;
    try {
      if (file) {
        const form = new FormData();
        form.append('file', file);
        form.append('message', input);
        const upload = await fetch(`${API}/chat/upload-image`, { method: 'POST', body: form });
        if (!upload.ok) throw new Error((await upload.json()).detail || 'Upload failed');
        imageId = (await upload.json()).image_id;
      }
      const text = input.trim() || 'Please process this image.';
      setMessages(m => [...m, { role: 'user', text, image: file?.name }]);
      const response = await fetch(`${API}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, image_id: imageId })
      });
      if (!response.ok) throw new Error('Chat request failed');
      const data = await response.json();
      setMessages(m => [...m, { role: 'ai', text: data.answer }]);
      setInput(''); setFile(null);
    } catch (e) {
      setMessages(m => [...m, { role: 'ai', text: `Sorry, something went wrong: ${e.message}` }]);
    } finally { setBusy(false); }
  }

  return <main className="app">
    <section className="chat">
      <header><div><Sparkles size={20}/> <strong>QuickAI Assistant</strong></div><span>Image-enabled</span></header>
      <div className="messages">{messages.map((m, i) => <div key={i} className={`row ${m.role}`}>
        <div className="bubble">{m.image && <div className="attachment">📷 {m.image}</div>}{m.text}</div>
      </div>)}</div>
      {file && <div className="preview"><ImagePlus size={16}/>{file.name}<button onClick={() => setFile(null)}><X size={15}/></button></div>}
      <div className="composer">
        <input ref={picker} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={e => setFile(e.target.files?.[0] || null)}/>
        <button className="icon" onClick={() => picker.current?.click()} title="Upload image"><ImagePlus size={20}/></button>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} placeholder="Ask about recommendations..."/>
        <button className="send" onClick={send} disabled={busy || (!input.trim() && !file)}><Send size={18}/></button>
      </div>
    </section>
  </main>
}

createRoot(document.getElementById('root')).render(<App />);
