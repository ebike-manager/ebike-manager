import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Command, Package, ShoppingCart, Users, BarChart2,
  Settings, Calculator, LayoutDashboard, Zap, ArrowRight,
  AlertTriangle, RefreshCw, Bot,
} from 'lucide-react';
import { llamarClaude, MOCK_RESPONSES } from '../services/aiService';

// ── Command definitions ───────────────────────────────────────────────────────
const COMMANDS = [
  { id: 'dashboard',    label: 'Ir a Dashboard',      icon: LayoutDashboard, module: 'dashboard',    desc: 'Panel principal con métricas' },
  { id: 'inventario',   label: 'Ir a Inventario',     icon: Package,         module: 'inventario',   desc: 'Gestión de productos y stock' },
  { id: 'ventas',       label: 'Ir a Ventas',         icon: ShoppingCart,    module: 'ventas',       desc: 'Registro y historial de ventas' },
  { id: 'clientes',     label: 'Ir a Clientes',       icon: Users,           module: 'clientes',     desc: 'Base de datos de clientes' },
  { id: 'reportes',     label: 'Ir a Reportes',       icon: BarChart2,       module: 'reportes',     desc: 'Análisis y estadísticas' },
  { id: 'calculadora',  label: 'Ir a Calculadora',    icon: Calculator,      module: 'calculadora',  desc: 'Herramientas financieras' },
  { id: 'configuracion',label: 'Ir a Configuración',  icon: Settings,        module: 'configuracion',desc: 'Empresa y usuarios' },
  { id: 'sin-stock',    label: '/sin stock',           icon: AlertTriangle,   module: 'inventario',   desc: 'Ver productos sin stock' },
  { id: 'pendientes',   label: '/ventas pendientes',   icon: ShoppingCart,    module: 'ventas',       desc: 'Ver ventas en estado pendiente' },
];

const SLASH_COMMANDS = {
  '/inventario':   'inventario',
  '/ventas':       'ventas',
  '/clientes':     'clientes',
  '/reportes':     'reportes',
  '/reporte':      'reportes',
  '/calculadora':  'calculadora',
  '/dashboard':    'dashboard',
  '/configuracion':'configuracion',
  '/sin stock':    'inventario',
  '/sin-stock':    'inventario',
  '/pendientes':   'ventas',
  '/agregar':      'inventario',
};

export default function CommandBar({ onNavigate, systemData }) {
  const [isOpen,    setIsOpen]    = useState(false);
  const [query,     setQuery]     = useState('');
  const [result,    setResult]    = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selected,  setSelected]  = useState(0);
  const inputRef   = useRef(null);

  // Toggle with Cmd+K / Ctrl+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((v) => !v);
        setQuery('');
        setResult('');
        setSelected(0);
      }
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input on open
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [isOpen]);

  // Filter commands
  const filtered = query
    ? COMMANDS.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.desc.toLowerCase().includes(query.toLowerCase()) ||
          c.id.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS;

  const isQuestion = query.length > 3 && !query.startsWith('/') && filtered.length === 0;
  const slashMatch = Object.keys(SLASH_COMMANDS).find(
    (k) => query.toLowerCase().startsWith(k.toLowerCase())
  );

  const execute = useCallback(
    (cmd) => {
      if (cmd.module) {
        onNavigate?.(cmd.module);
        setIsOpen(false);
        setQuery('');
        setResult('');
      }
    },
    [onNavigate]
  );

  const handleSubmit = useCallback(async () => {
    const q = query.trim();
    if (!q) return;

    // Slash command
    if (slashMatch) {
      const mod = SLASH_COMMANDS[slashMatch];
      onNavigate?.(mod);
      setIsOpen(false);
      setQuery('');
      return;
    }

    // Exact command match via selection
    if (filtered.length > 0 && !isQuestion) {
      execute(filtered[selected] ?? filtered[0]);
      return;
    }

    // AI query
    if (isQuestion || q.startsWith('/')) {
      setIsLoading(true);
      setResult('');

      const ctx = systemData
        ? `Datos del sistema:
- Productos: ${systemData.productos?.length ?? 0}
- Ventas recientes: ${systemData.ventas?.slice(0, 5).map((v) => `${v.fecha} ${v.clienteNombre} $${v.total}`).join(', ') ?? 'N/A'}
- Clientes: ${systemData.clientes?.length ?? 0}`
        : 'Sistema E-Bike Manager';

      const messages = [{ role: 'user', content: q }];
      const system = `Sos el asistente de comandos de una tienda de e-bikes. Respondés preguntas de forma MUY CONCISA (2-3 líneas máximo). Usás los datos del sistema cuando es relevante. Respondés en español rioplatense.\n\n${ctx}`;

      const answer = await llamarClaude({ system, messages, maxTokens: 256 });
      setResult(answer ?? MOCK_RESPONSES.comando);
      setIsLoading(false);
    }
  }, [query, slashMatch, filtered, selected, isQuestion, execute, systemData, onNavigate]);

  const handleKey = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((v) => Math.min(v + 1, filtered.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((v) => Math.max(v - 1, 0));
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-20 px-4"
      onClick={() => setIsOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100">
          <Search size={18} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(0); setResult(''); }}
            onKeyDown={handleKey}
            placeholder="Buscar módulo o hacer una pregunta..."
            className="flex-1 outline-none text-slate-900 placeholder-slate-400 text-base bg-transparent"
          />
          <div className="flex items-center gap-1 flex-shrink-0">
            <kbd className="bg-slate-100 text-slate-500 text-xs px-1.5 py-0.5 rounded font-mono">⌘</kbd>
            <kbd className="bg-slate-100 text-slate-500 text-xs px-1.5 py-0.5 rounded font-mono">K</kbd>
          </div>
        </div>

        {/* AI result */}
        {(result || isLoading) && (
          <div className="px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100">
            <div className="flex items-start gap-2.5">
              <div className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={12} className="text-white" />
              </div>
              <div className="flex-1">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <RefreshCw size={12} className="animate-spin" />
                    <span>Consultando IA...</span>
                  </div>
                ) : (
                  <p className="text-sm text-slate-700 leading-relaxed">{result}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Commands list */}
        <div className="py-1.5 max-h-80 overflow-y-auto">
          {filtered.length > 0 ? (
            <>
              <p className="px-4 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                {query ? 'Resultados' : 'Navegación rápida'}
              </p>
              {filtered.map((cmd, i) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={() => execute(cmd)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                      i === selected ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      i === selected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">{cmd.label}</p>
                      <p className="text-xs text-slate-400">{cmd.desc}</p>
                    </div>
                    <ArrowRight size={14} className={`flex-shrink-0 ${i === selected ? 'text-emerald-600' : 'text-slate-300'}`} />
                  </button>
                );
              })}
            </>
          ) : isQuestion ? (
            <div className="px-4 py-3">
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full flex items-center gap-3 p-3 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-left transition-colors"
              >
                <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-emerald-700">Preguntar a la IA</p>
                  <p className="text-xs text-emerald-600 truncate">"{query}"</p>
                </div>
                <ArrowRight size={14} className="text-emerald-500 flex-shrink-0" />
              </button>
            </div>
          ) : null}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-slate-400">
            <span className="flex items-center gap-1">
              <kbd className="bg-slate-100 px-1 rounded font-mono">↑↓</kbd> Navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-slate-100 px-1 rounded font-mono">↵</kbd> Abrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-slate-100 px-1 rounded font-mono">Esc</kbd> Cerrar
            </span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Zap size={10} className="text-emerald-500" />
            <span>IA disponible</span>
          </div>
        </div>
      </div>
    </div>
  );
}
