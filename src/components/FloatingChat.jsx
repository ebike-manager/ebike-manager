import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, RefreshCw, Minimize2 } from 'lucide-react';
import { useInventario } from '../hooks/useInventario';
import { useVentas }     from '../hooks/useVentas';
import { useClientes }   from '../hooks/useClientes';
import { useConfig }     from '../hooks/useConfig';
import { streamOrMock, MOCK_RESPONSES } from '../services/aiService';

const MAX_HISTORY = 10;

const SYSTEM_PROMPT = (ctx) => `Sos un asistente inteligente de la tienda de e-bikes "${ctx.empresa}".
Tenés acceso a los datos reales del sistema y respondés preguntas sobre inventario, ventas, clientes y finanzas.
Respondés en español rioplatense, de forma concisa y útil. Usás markdown básico para estructurar las respuestas.
Cuando el usuario pregunta por números, los calculás con los datos reales provistos.

DATOS ACTUALES DEL SISTEMA:
Inventario (${ctx.totalProductos} productos):
${ctx.productosResumen}

Ventas recientes (últimas 10):
${ctx.ventasResumen}

Clientes: ${ctx.totalClientes} registrados.
Moneda principal: ${ctx.moneda}.`;

function buildContext(empresa, productos, ventas, clientes) {
  const moneda = empresa.moneda ?? 'USD';

  const productosResumen = productos.slice(0, 15).map((p) =>
    `- ${p.nombre} (${p.categoria}) | ${p.moneda ?? moneda} ${p.precio} | stock: ${p.stock}`
  ).join('\n');

  const ventasResumen = [...ventas]
    .sort((a, b) => b.fecha.localeCompare(a.fecha))
    .slice(0, 10)
    .map((v) => `- ${v.fecha} | ${v.clienteNombre} | ${v.items.map((i) => i.productoNombre).join(', ')} | Total: ${v.total}`)
    .join('\n');

  return {
    empresa: empresa.nombre,
    totalProductos: productos.length,
    productosResumen,
    ventasResumen,
    totalClientes: clientes.length,
    moneda,
  };
}

// Simple markdown renderer for chat bubbles
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`'))
      return <code key={i} className="bg-white/20 px-1 rounded text-[11px] font-mono">{p.slice(1, -1)}</code>;
    return p;
  });
}

function ChatBubble({ role, content, isStreaming }) {
  const isAI = role === 'assistant';
  const lines = content.split('\n');

  return (
    <div className={`flex gap-2.5 ${isAI ? '' : 'flex-row-reverse'}`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
        isAI ? 'bg-emerald-600' : 'bg-slate-600'
      }`}>
        {isAI ? <Bot size={14} className="text-white" /> : <User size={14} className="text-white" />}
      </div>

      {/* Bubble */}
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
        isAI
          ? 'bg-slate-800 text-slate-100 rounded-tl-sm'
          : 'bg-emerald-600 text-white rounded-tr-sm'
      }`}>
        <div className="space-y-0.5">
          {lines.map((line, i) => {
            if (line.startsWith('### '))
              return <p key={i} className="font-bold text-white mt-1">{renderInline(line.slice(4))}</p>;
            if (line.startsWith('## '))
              return <p key={i} className="font-bold text-white mt-2">{renderInline(line.slice(3))}</p>;
            if (line.startsWith('- ') || line.startsWith('* '))
              return <p key={i} className="pl-2">{renderInline('• ' + line.slice(2))}</p>;
            if (line.startsWith('> '))
              return <p key={i} className="opacity-70 italic text-xs">{renderInline(line.slice(2))}</p>;
            if (line.trim() === '') return <div key={i} className="h-1" />;
            return <p key={i}>{renderInline(line)}</p>;
          })}
        </div>
        {isStreaming && (
          <span className="inline-block w-1 h-3.5 bg-emerald-400 rounded-sm animate-pulse ml-0.5 align-middle" />
        )}
      </div>
    </div>
  );
}

export default function FloatingChat() {
  const { productos }  = useInventario();
  const { ventas }     = useVentas();
  const { clientes }   = useClientes();
  const { empresa }    = useConfig();

  const [isOpen,    setIsOpen]    = useState(false);
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const endRef     = useRef(null);
  const inputRef   = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // Welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: `¡Hola! Soy tu asistente de E-Bike Manager 🤖\n\nPuedo ayudarte con:\n- **Inventario**: stock, precios, categorías\n- **Ventas**: historial, totales, tendencias\n- **Clientes**: información y compras\n- **Finanzas**: cálculos y análisis\n\nPreguntame lo que necesites en español.`,
      }]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg].slice(-MAX_HISTORY);
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    // Add streaming placeholder
    setMessages((prev) => [...prev, { role: 'assistant', content: '', _streaming: true }]);

    const ctx = buildContext(empresa, productos, ventas, clientes);
    const apiMessages = newMessages.map(({ role, content }) => ({ role, content }));

    await streamOrMock({
      system: SYSTEM_PROMPT(ctx),
      messages: apiMessages,
      mockText: MOCK_RESPONSES.chat,
      onChunk: (text) => {
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?._streaming) copy[copy.length - 1] = { ...last, content: text };
          return copy;
        });
      },
    });

    setMessages((prev) => {
      const copy = [...prev];
      const last = copy[copy.length - 1];
      if (last?._streaming) copy[copy.length - 1] = { ...last, _streaming: false };
      return copy;
    });

    setIsLoading(false);
  }, [input, messages, isLoading, empresa, productos, ventas, clientes]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => setMessages([]);

  const SUGGESTIONS = [
    '¿Cuánto vendí este mes?',
    '¿Qué productos tienen stock bajo?',
    '¿Quién es mi mejor cliente?',
    'Dame un resumen del inventario',
  ];

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          title="Asistente IA"
        >
          <MessageCircle size={22} />
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full border-2 border-white animate-pulse" />
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col w-[360px] h-[520px] bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 bg-slate-800 border-b border-slate-700">
            <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white text-sm font-semibold leading-tight">Asistente IA</p>
              <p className="text-emerald-400 text-[10px]">● Conectado · E-Bike Manager</p>
            </div>
            <button
              onClick={clearChat}
              title="Limpiar conversación"
              className="text-slate-500 hover:text-slate-300 transition-colors p-1"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.map((msg, i) => (
              <ChatBubble
                key={i}
                role={msg.role}
                content={msg.content}
                isStreaming={msg._streaming}
              />
            ))}

            {/* Suggestions (only when no messages yet) */}
            {messages.length === 1 && !isLoading && (
              <div className="space-y-1.5 mt-2">
                <p className="text-slate-500 text-xs text-center">Sugerencias:</p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); setTimeout(sendMessage, 10); }}
                    className="w-full text-left text-xs text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-3 bg-slate-800 border-t border-slate-700">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Preguntá algo sobre tu negocio..."
                rows={1}
                disabled={isLoading}
                className="flex-1 bg-slate-700 text-slate-100 placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-emerald-500 transition-all disabled:opacity-50 max-h-24 overflow-y-auto"
                style={{ minHeight: '40px' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="w-9 h-9 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all flex-shrink-0"
              >
                {isLoading
                  ? <RefreshCw size={14} className="animate-spin" />
                  : <Send size={14} />
                }
              </button>
            </div>
            <p className="text-slate-600 text-[10px] mt-1.5 text-center">Enter para enviar · Shift+Enter para nueva línea</p>
          </div>
        </div>
      )}
    </>
  );
}
