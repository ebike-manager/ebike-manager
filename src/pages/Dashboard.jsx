import { useMemo, useState, useCallback } from 'react';
import {
  Package, TrendingUp, ShoppingCart, Users,
  AlertTriangle, Sparkles, ChevronRight, BarChart2,
  Settings, Calculator, Clock, Zap, RefreshCw,
  CheckCircle, XCircle, ArrowRight,
} from 'lucide-react';
import { useInventario } from '../hooks/useInventario';
import { useVentas }     from '../hooks/useVentas';
import { useClientes }   from '../hooks/useClientes';
import { useConfig }     from '../hooks/useConfig';
import { formatMoney }   from '../utils/moneda';
import { streamOrMock, MOCK_RESPONSES } from '../services/aiService';

// ── Helpers ──────────────────────────────────────────────────────────────────
const estesMes = (fecha) => {
  const d = new Date(fecha + 'T00:00:00'), h = new Date();
  return d.getMonth() === h.getMonth() && d.getFullYear() === h.getFullYear();
};

const formatFechaCorta = (str) => {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short',
  });
};

// ── SimpleMarkdown renderer ──────────────────────────────────────────────────
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i} className="font-semibold text-slate-900">{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`'))
      return <code key={i} className="bg-slate-100 text-slate-700 px-1 rounded text-xs font-mono">{p.slice(1, -1)}</code>;
    return p;
  });
}

function Markdown({ text = '' }) {
  const lines = text.split('\n');
  const els = [];
  let i = 0;
  while (i < lines.length) {
    const l = lines[i];
    if (l.startsWith('### ')) {
      els.push(<h3 key={i} className="font-bold text-slate-900 text-sm mt-3 mb-1">{renderInline(l.slice(4))}</h3>);
    } else if (l.startsWith('## ')) {
      els.push(<h2 key={i} className="font-bold text-slate-900 mt-4 mb-1">{renderInline(l.slice(3))}</h2>);
    } else if (l.startsWith('# ')) {
      els.push(<h1 key={i} className="font-bold text-slate-900 text-lg mt-4 mb-2">{renderInline(l.slice(2))}</h1>);
    } else if (l.startsWith('- ') || l.startsWith('* ')) {
      els.push(<li key={i} className="ml-4 text-slate-700 text-sm leading-relaxed list-disc">{renderInline(l.slice(2))}</li>);
    } else if (l.startsWith('> ')) {
      els.push(<blockquote key={i} className="border-l-2 border-emerald-400 pl-3 text-slate-500 text-sm italic">{renderInline(l.slice(2))}</blockquote>);
    } else if (l === '---') {
      els.push(<hr key={i} className="border-slate-200 my-3" />);
    } else if (l.trim() === '') {
      els.push(<div key={i} className="h-1.5" />);
    } else {
      els.push(<p key={i} className="text-slate-700 text-sm leading-relaxed">{renderInline(l)}</p>);
    }
    i++;
  }
  return <div className="space-y-0.5">{els}</div>;
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color, onClick }) {
  const COLORS = {
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue:    'bg-blue-50 text-blue-600 border-blue-100',
    violet:  'bg-violet-50 text-violet-600 border-violet-100',
    amber:   'bg-amber-50 text-amber-600 border-amber-100',
    red:     'bg-red-50 text-red-600 border-red-100',
  };
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-md transition-all' : ''}`}
    >
      <div className={`rounded-xl p-3 flex-shrink-0 ${COLORS[color]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Alert Item ────────────────────────────────────────────────────────────────
function AlertItem({ type, text, onAction, actionLabel }) {
  const cfg = {
    error:   { icon: XCircle,       cls: 'bg-red-50 border-red-200 text-red-700',   iconCls: 'text-red-500'   },
    warning: { icon: AlertTriangle, cls: 'bg-amber-50 border-amber-200 text-amber-700', iconCls: 'text-amber-500' },
    info:    { icon: CheckCircle,   cls: 'bg-blue-50 border-blue-200 text-blue-700', iconCls: 'text-blue-500'   },
    ok:      { icon: CheckCircle,   cls: 'bg-emerald-50 border-emerald-200 text-emerald-700', iconCls: 'text-emerald-500' },
  };
  const { icon: Icon, cls, iconCls } = cfg[type] ?? cfg.info;
  return (
    <div className={`flex items-start gap-2.5 p-3 rounded-lg border text-sm ${cls}`}>
      <Icon size={15} className={`flex-shrink-0 mt-0.5 ${iconCls}`} />
      <span className="flex-1 leading-snug">{text}</span>
      {onAction && (
        <button onClick={onAction} className="text-xs font-medium underline underline-offset-2 flex-shrink-0">
          {actionLabel ?? 'Ver'}
        </button>
      )}
    </div>
  );
}

// ── Quick Action ──────────────────────────────────────────────────────────────
function QuickAction({ icon: Icon, label, color, onClick }) {
  const COLORS = {
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    blue:    'bg-blue-600 hover:bg-blue-700 text-white',
    violet:  'bg-violet-600 hover:bg-violet-700 text-white',
    slate:   'bg-slate-700 hover:bg-slate-800 text-white',
    amber:   'bg-amber-500 hover:bg-amber-600 text-white',
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm ${COLORS[color]}`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}

// ── Dashboard Page ────────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate }) {
  const { productos }            = useInventario();
  const { ventas }               = useVentas();
  const { clientes }             = useClientes();
  const { empresa }              = useConfig();
  const moneda                   = empresa.moneda ?? 'USD';

  const [aiOutput, setAiOutput]     = useState('');
  const [aiLoading, setAiLoading]   = useState(false);
  const [aiDone, setAiDone]         = useState(false);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const ventasMes     = ventas.filter((v) => estesMes(v.fecha));
    const ingresosMes   = ventasMes.reduce((s, v) => s + v.total, 0);
    const pendientes    = ventas.filter((v) => v.estado === 'pendiente').length;

    const valorPorMoneda = {};
    productos.forEach((p) => {
      const m = p.moneda ?? moneda;
      valorPorMoneda[m] = (valorPorMoneda[m] ?? 0) + p.precio * p.stock;
    });
    const valorStr =
      Object.entries(valorPorMoneda)
        .map(([m, v]) => formatMoney(v, m))
        .join(' · ') || formatMoney(0, moneda);

    return {
      valorInventario:  valorStr,
      ingresosMes:      formatMoney(ingresosMes, moneda),
      ventasMes:        ventasMes.length,
      pendientes,
      totalClientes:    clientes.length,
    };
  }, [productos, ventas, clientes, moneda]);

  // ── Auto alerts (no AI needed) ────────────────────────────────────────────
  const alertas = useMemo(() => {
    const list = [];
    const criticos = productos.filter((p) => p.estado === 'activo' && p.stock <= p.umbralMinimo);
    if (criticos.length > 0) {
      list.push({
        type: 'warning',
        text: `${criticos.length} producto${criticos.length > 1 ? 's' : ''} con stock crítico: ${criticos.map((p) => p.nombre).join(', ')}.`,
        action: () => onNavigate?.('inventario'),
        actionLabel: 'Ver inventario',
      });
    }
    if (stats.pendientes > 0) {
      list.push({
        type: 'info',
        text: `Tenés ${stats.pendientes} venta${stats.pendientes > 1 ? 's' : ''} en estado pendiente.`,
        action: () => onNavigate?.('ventas'),
        actionLabel: 'Ver ventas',
      });
    }
    const sinMovimiento = productos.filter((p) => {
      return p.stock > p.umbralMinimo * 3 &&
        !ventas.some((v) => v.items.some((it) => it.productoId === p.id));
    });
    if (sinMovimiento.length > 0) {
      list.push({
        type: 'info',
        text: `${sinMovimiento.length} producto${sinMovimiento.length > 1 ? 's' : ''} sin ventas registradas: ${sinMovimiento.map((p) => p.nombre).join(', ')}.`,
      });
    }
    if (list.length === 0) {
      list.push({ type: 'ok', text: 'Todo en orden — sin alertas activas.' });
    }
    return list;
  }, [productos, ventas, stats.pendientes, onNavigate]);

  // ── Recent sales ──────────────────────────────────────────────────────────
  const ventasRecientes = useMemo(
    () => [...ventas].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 5),
    [ventas]
  );

  // ── AI Analysis ───────────────────────────────────────────────────────────
  const handleAiAnalysis = useCallback(async () => {
    setAiLoading(true);
    setAiOutput('');
    setAiDone(false);

    const systemData = {
      empresa: empresa.nombre,
      productos: productos.map((p) => ({
        nombre: p.nombre, categoria: p.categoria, precio: p.precio,
        moneda: p.moneda, stock: p.stock, umbralMinimo: p.umbralMinimo,
      })),
      ventasRecientes: ventas.slice(0, 20).map((v) => ({
        fecha: v.fecha, total: v.total, estado: v.estado,
        productos: v.items.map((it) => it.productoNombre),
      })),
      clientes: clientes.length,
    };

    const system = `Sos un consultor de negocios especializado en tiendas de e-bikes en Uruguay.
Analizás datos reales del sistema y dás recomendaciones concretas y accionables.
Respondés siempre en español rioplatense, de forma clara y estructurada con markdown.
Usá emojis para hacer el reporte más legible. Sé directo y práctico.`;

    const messages = [{
      role: 'user',
      content: `Analizá estos datos de mi tienda de e-bikes y dame un informe inteligente con:
1. Estado actual del inventario (alertas, oportunidades)
2. Análisis de ventas recientes
3. Top 3 recomendaciones de acción inmediata
4. Predicción de tendencia

Datos del sistema: ${JSON.stringify(systemData, null, 2)}`,
    }];

    await streamOrMock({
      system,
      messages,
      mockText: MOCK_RESPONSES.inventario,
      onChunk: (text) => setAiOutput(text),
    });

    setAiLoading(false);
    setAiDone(true);
  }, [empresa, productos, ventas, clientes]);

  const ESTADO_CFG = {
    completada: 'bg-emerald-100 text-emerald-700',
    pendiente:  'bg-amber-100 text-amber-700',
    cancelada:  'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-6">
      {/* Welcome + date */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Bienvenido, {empresa.nombre} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400 bg-white border border-slate-200 px-3 py-1.5 rounded-full">
          <Zap size={12} className="text-emerald-500" />
          <span>Panel activo</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package}       label="Valor del inventario" value={stats.valorInventario}       color="emerald" onClick={() => onNavigate?.('inventario')} />
        <StatCard icon={TrendingUp}    label="Ingresos este mes"    value={stats.ingresosMes}            color="blue"    sub={`${stats.ventasMes} ventas`}           onClick={() => onNavigate?.('ventas')} />
        <StatCard icon={ShoppingCart}  label="Ventas pendientes"    value={stats.pendientes}             color={stats.pendientes > 0 ? 'amber' : 'violet'} onClick={() => onNavigate?.('ventas')} />
        <StatCard icon={Users}         label="Clientes registrados" value={stats.totalClientes}          color="violet"  onClick={() => onNavigate?.('clientes')} />
      </div>

      {/* Middle row: Alerts + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Alerts */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={16} className="text-amber-500" />
            <h2 className="font-semibold text-slate-900">Alertas del sistema</h2>
            <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium ${
              alertas.some(a => a.type === 'warning' || a.type === 'error')
                ? 'bg-amber-100 text-amber-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}>
              {alertas.filter(a => a.type !== 'ok').length} activas
            </span>
          </div>
          <div className="space-y-2">
            {alertas.map((a, i) => (
              <AlertItem key={i} type={a.type} text={a.text} onAction={a.action} actionLabel={a.actionLabel} />
            ))}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-emerald-500" />
            <h2 className="font-semibold text-slate-900">Acciones rápidas</h2>
          </div>
          <div className="flex flex-col gap-2">
            <QuickAction icon={Package}    label="Inventario"    color="emerald" onClick={() => onNavigate?.('inventario')} />
            <QuickAction icon={ShoppingCart} label="Nueva venta" color="blue"    onClick={() => onNavigate?.('ventas')} />
            <QuickAction icon={Users}      label="Clientes"      color="violet"  onClick={() => onNavigate?.('clientes')} />
            <QuickAction icon={Calculator} label="Calculadora"   color="amber"   onClick={() => onNavigate?.('calculadora')} />
            <QuickAction icon={BarChart2}  label="Reportes"      color="slate"   onClick={() => onNavigate?.('reportes')} />
          </div>
        </div>
      </div>

      {/* AI Intelligence Panel */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl border border-slate-700 shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-2.5">
              <Sparkles size={18} className="text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Panel Inteligente con IA</h2>
              <p className="text-slate-400 text-xs mt-0.5">Análisis en tiempo real de tus datos</p>
            </div>
          </div>
          <button
            onClick={handleAiAnalysis}
            disabled={aiLoading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
          >
            {aiLoading
              ? <><RefreshCw size={14} className="animate-spin" /> Analizando...</>
              : <><Sparkles size={14} /> Analizar con IA</>
            }
          </button>
        </div>

        {!aiOutput && !aiLoading && (
          <div className="border border-dashed border-slate-600 rounded-lg p-6 text-center">
            <Sparkles size={28} className="text-slate-500 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">
              Hacé clic en "Analizar con IA" para obtener un informe inteligente de tu negocio con recomendaciones personalizadas.
            </p>
          </div>
        )}

        {(aiOutput || aiLoading) && (
          <div className="bg-slate-800/60 rounded-lg border border-slate-700 p-4">
            {aiLoading && !aiOutput && (
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <RefreshCw size={14} className="animate-spin" />
                <span>Generando análisis...</span>
              </div>
            )}
            <div className="prose-sm max-w-none">
              <Markdown text={aiOutput} />
            </div>
            {aiLoading && (
              <span className="inline-block w-1.5 h-4 bg-emerald-400 rounded-sm animate-pulse ml-1 align-middle" />
            )}
            {aiDone && (
              <p className="text-slate-500 text-xs mt-3 pt-3 border-t border-slate-700">
                Análisis generado por Claude · {new Date().toLocaleTimeString('es-AR')}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Recent Sales */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-400" />
            <h2 className="font-semibold text-slate-900">Actividad reciente</h2>
          </div>
          <button
            onClick={() => onNavigate?.('ventas')}
            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
          >
            Ver todo <ArrowRight size={12} />
          </button>
        </div>

        {ventasRecientes.length === 0 ? (
          <div className="py-10 text-center text-slate-400 text-sm">
            Sin ventas registradas todavía.
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {ventasRecientes.map((v) => (
              <div key={v.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ShoppingCart size={14} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{v.clienteNombre}</p>
                  <p className="text-xs text-slate-400">
                    {v.items.length === 1 ? v.items[0].productoNombre : `${v.items.length} productos`} · {formatFechaCorta(v.fecha)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-slate-900">{formatMoney(v.total, moneda)}</p>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ESTADO_CFG[v.estado] ?? 'bg-slate-100 text-slate-500'}`}>
                    {v.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
