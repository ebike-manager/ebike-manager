import { useMemo, useState } from 'react';
import { TrendingUp, DollarSign, ShoppingCart, Users, Brain, FileText } from 'lucide-react';
import { useVentas }      from '../hooks/useVentas';
import { useClientes }    from '../hooks/useClientes';
import { useInventario }  from '../hooks/useInventario';
import { useConfig }      from '../hooks/useConfig';
import { formatMoney }    from '../utils/moneda';
import Modal              from '../components/Modal';
import { streamOrMock, MOCK_RESPONSES } from '../services/aiService';

// ── Helpers ──────────────────────────────────────────────────────────────────
const estesMes = (fecha) => {
  const d = new Date(fecha + 'T00:00:00'), h = new Date();
  return d.getMonth() === h.getMonth() && d.getFullYear() === h.getFullYear();
};

const ultimos30Dias = (ventas) => {
  const hoy = new Date();
  const desde = new Date(hoy);
  desde.setDate(desde.getDate() - 30);
  return ventas.filter((v) => new Date(v.fecha + 'T00:00:00') >= desde);
};

// Últimos N días con totales de ventas
const ultimos14Dias = (ventas) => {
  const hoy = new Date();
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(hoy);
    d.setDate(d.getDate() - (13 - i));
    const key = d.toISOString().split('T')[0];
    const valor = ventas
      .filter((v) => v.fecha === key)
      .reduce((s, v) => s + v.total, 0);
    return {
      key,
      label:      d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }),
      labelCorto: i % 2 === 0 ? d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : '',
      valor,
    };
  });
};

const topProductos = (ventas, n = 5) => {
  const map = {};
  ventas.forEach((v) =>
    v.items.forEach((it) => {
      if (!map[it.productoNombre])
        map[it.productoNombre] = { nombre: it.productoNombre, cantidad: 0, ingresos: 0, moneda: it.moneda ?? 'USD' };
      map[it.productoNombre].cantidad += it.cantidad;
      map[it.productoNombre].ingresos += it.subtotal;
      if (it.moneda) map[it.productoNombre].moneda = it.moneda;
    })
  );
  return Object.values(map).sort((a, b) => b.cantidad - a.cantidad).slice(0, n);
};

const topClientes = (ventas, n = 5) => {
  const map = {};
  ventas.forEach((v) => {
    if (!map[v.clienteNombre]) map[v.clienteNombre] = { nombre: v.clienteNombre, compras: 0, totalPorMoneda: {} };
    map[v.clienteNombre].compras++;
    if (v.items?.length) {
      v.items.forEach((it) => {
        const m = it.moneda ?? 'USD';
        map[v.clienteNombre].totalPorMoneda[m] = (map[v.clienteNombre].totalPorMoneda[m] ?? 0) + (it.subtotal ?? 0);
      });
    } else {
      map[v.clienteNombre].totalPorMoneda['USD'] = (map[v.clienteNombre].totalPorMoneda['USD'] ?? 0) + v.total;
    }
  });
  return Object.values(map)
    .map((c) => ({
      ...c,
      total: Object.values(c.totalPorMoneda).reduce((s, v) => s + v, 0),
      totalStr: Object.entries(c.totalPorMoneda).map(([m, v]) => formatMoney(v, m)).join(' + '),
    }))
    .sort((a, b) => b.compras - a.compras)
    .slice(0, n);
};

// ── Markdown renderer ─────────────────────────────────────────────────────────
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((p, i) => {
    if (p.startsWith('**') && p.endsWith('**'))
      return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith('`') && p.endsWith('`'))
      return <code key={i} className="bg-slate-100 text-emerald-700 px-1 rounded text-xs font-mono">{p.slice(1, -1)}</code>;
    return p;
  });
}

function Markdown({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('## ')) {
      elements.push(<h2 key={i} className="text-base font-bold text-slate-900 mt-4 mb-2">{line.slice(3)}</h2>);
    } else if (line.startsWith('### ')) {
      elements.push(<h3 key={i} className="text-sm font-bold text-slate-800 mt-3 mb-1">{line.slice(4)}</h3>);
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-2 border-emerald-400 pl-3 my-2 text-xs text-slate-500 italic">
          {renderInline(line.slice(2))}
        </blockquote>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <li key={i} className="text-sm text-slate-700 ml-4 list-disc leading-relaxed">
          {renderInline(line.slice(2))}
        </li>
      );
    } else if (/^\d+\. /.test(line)) {
      elements.push(
        <li key={i} className="text-sm text-slate-700 ml-4 list-decimal leading-relaxed">
          {renderInline(line.replace(/^\d+\. /, ''))}
        </li>
      );
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} className="border-slate-200 my-3" />);
    } else if (line.startsWith('|')) {
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!lines[i].match(/^[\|\s\-:]+$/)) {
          rows.push(lines[i].split('|').filter(Boolean).map((c) => c.trim()));
        }
        i++;
      }
      if (rows.length > 0) {
        elements.push(
          <div key={`table-${i}`} className="overflow-x-auto my-2">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  {rows[0].map((h, j) => (
                    <th key={j} className="px-2 py-1 text-left font-semibold text-slate-700 border border-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((r, ri) => (
                  <tr key={ri} className="even:bg-slate-50">
                    {r.map((c, ci) => (
                      <td key={ci} className="px-2 py-1 text-slate-600 border border-slate-200">{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    } else if (line.trim()) {
      elements.push(
        <p key={i} className="text-sm text-slate-700 leading-relaxed my-1">
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

// ── Modal de IA genérico (streaming) ─────────────────────────────────────────
function AIStreamModal({ titulo, descripcion, icon: Icon, onInicio, mockText, onClose }) {
  const [texto, setTexto]       = useState('');
  const [cargando, setCargando] = useState(false);
  const [iniciado, setIniciado] = useState(false);

  const iniciar = async () => {
    setIniciado(true);
    setCargando(true);
    setTexto('');

    const { system, messages } = onInicio();

    await streamOrMock({
      system,
      messages,
      mockText,
      onChunk: (full) => setTexto(full),
    });

    setCargando(false);
  };

  return (
    <div className="space-y-4">
      {!iniciado ? (
        <div className="text-center py-8 space-y-4">
          <div className="w-14 h-14 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto">
            <Icon size={28} className="text-violet-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">{titulo}</h3>
            <p className="text-sm text-slate-500 mt-1">{descripcion}</p>
          </div>
          <button
            onClick={iniciar}
            className="px-6 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
          >
            Generar con IA
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {cargando && !texto && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <svg className="animate-spin h-4 w-4 text-violet-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Generando con IA...
            </div>
          )}
          {texto && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 max-h-[420px] overflow-y-auto">
              <Markdown text={texto} />
              {cargando && (
                <span className="inline-block w-1.5 h-4 bg-violet-500 ml-0.5 animate-pulse rounded-sm" />
              )}
            </div>
          )}
          {!cargando && (
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-slate-400">Generado con IA</span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Gráfico de barras vertical ────────────────────────────────────────────────
function GraficoBarras({ datos, moneda }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(...datos.map((d) => d.valor), 1);

  return (
    <div>
      <div className="flex items-end gap-1" style={{ height: '140px' }}>
        {datos.map((d, i) => {
          const pct = d.valor > 0 ? Math.max((d.valor / max) * 100, 4) : 1;
          return (
            <div key={d.key}
              className="group relative flex-1 flex flex-col items-center justify-end"
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {hover === i && d.valor > 0 && (
                <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded-md whitespace-nowrap z-10 shadow-lg pointer-events-none">
                  <span className="font-semibold">{formatMoney(d.valor, moneda)}</span>
                  <br /><span className="text-slate-400">{d.label}</span>
                </div>
              )}
              <div
                className={`w-full rounded-t-sm transition-colors duration-150 ${
                  d.valor > 0 ? 'bg-emerald-500 group-hover:bg-emerald-400' : 'bg-slate-100'
                }`}
                style={{ height: `${pct}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1.5 border-t border-slate-100 pt-1.5">
        {datos.map((d) => (
          <div key={d.key} className="flex-1 text-center overflow-hidden">
            <span className="text-[9px] text-slate-400 block truncate leading-tight">{d.labelCorto}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Barra horizontal para rankings ───────────────────────────────────────────
function BarraRanking({ label, secondary, valor, max, color = 'bg-emerald-500', valueLabel }) {
  const pct = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
      <div className="w-36 flex-shrink-0 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{label}</p>
        {secondary && <p className="text-xs text-slate-400">{secondary}</p>}
      </div>
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-slate-700 w-16 text-right flex-shrink-0">
        {valueLabel ?? valor}
      </span>
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
const STAT_COLORS = {
  emerald: 'bg-emerald-50 text-emerald-600',
  blue:    'bg-blue-50 text-blue-600',
  violet:  'bg-violet-50 text-violet-600',
  amber:   'bg-amber-50 text-amber-600',
};
function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`rounded-xl p-3 flex-shrink-0 ${STAT_COLORS[color]}`}><Icon size={20} /></div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function Reportes() {
  const { ventas }   = useVentas();
  const { clientes } = useClientes();
  const { productos } = useInventario();
  const { empresa }  = useConfig();
  const moneda = empresa.moneda ?? 'USD';

  const [showPrediccion, setShowPrediccion] = useState(false);
  const [showReporte, setShowReporte]       = useState(false);

  const stats = useMemo(() => {
    const ingresosTotal = ventas.reduce((s, v) => s + v.total, 0);
    const ventasMes     = ventas.filter((v) => estesMes(v.fecha));
    const ingresosMes   = ventasMes.reduce((s, v) => s + v.total, 0);
    const ticket        = ventas.length ? ingresosTotal / ventas.length : 0;
    return { ingresosTotal, ingresosMes, ventasMes: ventasMes.length, ticket, totalClientes: clientes.length };
  }, [ventas, clientes]);

  const datos14 = useMemo(() => ultimos14Dias(ventas), [ventas]);
  const prods   = useMemo(() => topProductos(ventas), [ventas]);
  const clis    = useMemo(() => topClientes(ventas), [ventas]);

  const maxProds = prods[0]?.cantidad ?? 1;
  const maxClis  = clis[0]?.compras   ?? 1;

  const totalPeriodo = datos14.reduce((s, d) => s + d.valor, 0);

  // ── Build AI contexts ──────────────────────────────────────────────────────
  const buildPrediccionContext = () => {
    const recientes = ultimos30Dias(ventas);
    const resumenVentas = recientes.map((v) =>
      `${v.fecha} | Cliente: ${v.clienteNombre} | Total: ${v.total} | Items: ${v.items.map((it) => `${it.productoNombre} x${it.cantidad}`).join(', ')}`
    ).join('\n') || 'Sin ventas en los últimos 30 días.';

    const resumenStock = productos.map((p) =>
      `${p.nombre} | Stock: ${p.stock} | Umbral: ${p.umbralMinimo}`
    ).join('\n');

    return {
      system: `Sos un analista de ventas experto en tiendas de bicicletas eléctricas.
Analizá el historial de ventas de los últimos 30 días y el stock actual para predecir la próxima semana.
Generá un reporte en Markdown con:
1. Tabla de predicción por producto (unidades estimadas + ingresos estimados)
2. Productos en riesgo de agotarse
3. Tendencia general (positiva/negativa/estable)
Sé concreto con números. Respondé en español.`,
      messages: [{
        role: 'user',
        content: `Historial últimos 30 días:\n${resumenVentas}\n\nStock actual:\n${resumenStock}`,
      }],
    };
  };

  const buildReporteContext = () => {
    const mes = new Date().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
    const ventasMes = ventas.filter((v) => estesMes(v.fecha));
    const ingresosMes = ventasMes.reduce((s, v) => s + v.total, 0);
    const topProd = topProductos(ventas, 3);
    const topCli = topClientes(ventas, 3);

    const resumen = `
Período: ${mes}
Ventas del mes: ${ventasMes.length}
Ingresos del mes: ${formatMoney(ingresosMes, moneda)}
Total clientes: ${clientes.length}
Top productos: ${topProd.map((p) => `${p.nombre} (${p.cantidad} ud)`).join(', ')}
Top clientes: ${topCli.map((c) => `${c.nombre} (${c.compras} compras)`).join(', ')}
Productos con stock bajo: ${productos.filter((p) => p.stock <= p.umbralMinimo && p.estado === 'activo').map((p) => p.nombre).join(', ') || 'Ninguno'}
    `.trim();

    return {
      system: `Sos un analista de negocios experto en tiendas de bicicletas eléctricas.
Redactá un reporte ejecutivo mensual en Markdown con:
1. Resumen de ventas (KPIs clave)
2. Estado del inventario
3. Análisis de clientes y productos
4. Plan de acción para el próximo mes (3 puntos concretos)
Usá emojis para los títulos. Sé profesional y accionable. Respondé en español.`,
      messages: [{
        role: 'user',
        content: `Datos del mes:\n${resumen}`,
      }],
    };
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign}   label="Ingresos totales"  value={formatMoney(stats.ingresosTotal, moneda)} color="emerald" />
        <StatCard icon={TrendingUp}   label="Ingresos este mes" value={formatMoney(stats.ingresosMes, moneda)}   color="blue"    sub={`${stats.ventasMes} ${stats.ventasMes === 1 ? 'venta' : 'ventas'}`} />
        <StatCard icon={ShoppingCart} label="Ticket promedio"   value={formatMoney(stats.ticket, moneda)}        color="violet"  sub={`sobre ${ventas.length} ventas`} />
        <StatCard icon={Users}        label="Clientes activos"  value={stats.totalClientes}                      color="amber"   />
      </div>

      {/* Gráfico ventas últimos 14 días */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">Ventas — últimos 14 días</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Total del período: <span className="font-semibold text-slate-600">{formatMoney(totalPeriodo, moneda)}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPrediccion(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors"
            >
              <Brain size={13} />
              Predecir semana
            </button>
            <button
              onClick={() => setShowReporte(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <FileText size={13} />
              Reporte del mes
            </button>
          </div>
        </div>
        <GraficoBarras datos={datos14} moneda={moneda} />
      </div>

      {/* Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Top productos */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 mb-1">Productos más vendidos</h3>
          <p className="text-xs text-slate-400 mb-4">Por unidades vendidas (total histórico)</p>
          {prods.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">Sin datos suficientes.</p>
          ) : (
            <div>
              {prods.map((p) => (
                <BarraRanking
                  key={p.nombre}
                  label={p.nombre}
                  secondary={`${formatMoney(p.ingresos, p.moneda ?? moneda)} en ingresos`}
                  valor={p.cantidad}
                  max={maxProds}
                  color="bg-emerald-500"
                  valueLabel={`${p.cantidad} ud`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Top clientes */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <h3 className="font-semibold text-slate-900 mb-1">Clientes más frecuentes</h3>
          <p className="text-xs text-slate-400 mb-4">Por cantidad de compras (total histórico)</p>
          {clis.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">Sin datos suficientes.</p>
          ) : (
            <div>
              {clis.map((c) => (
                <BarraRanking
                  key={c.nombre}
                  label={c.nombre}
                  secondary={`${c.compras} ${c.compras === 1 ? 'compra' : 'compras'} · ${c.totalStr}`}
                  valor={c.compras}
                  max={maxClis}
                  color="bg-blue-500"
                  valueLabel={`${c.compras} ${c.compras === 1 ? 'compra' : 'compras'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-slate-400 text-center pb-2">
        Los datos se calculan en tiempo real desde el historial de ventas registradas.
      </p>

      {/* Modal: Predicción de ventas */}
      {showPrediccion && (
        <Modal title="Predicción de ventas — próxima semana" onClose={() => setShowPrediccion(false)}>
          <AIStreamModal
            titulo="Predicción de ventas inteligente"
            descripcion="La IA analizará el historial de los últimos 30 días y el stock actual para predecir la próxima semana."
            icon={Brain}
            onInicio={buildPrediccionContext}
            mockText={MOCK_RESPONSES.ventas}
            onClose={() => setShowPrediccion(false)}
          />
        </Modal>
      )}

      {/* Modal: Reporte del mes */}
      {showReporte && (
        <Modal title="Reporte ejecutivo del mes" onClose={() => setShowReporte(false)}>
          <AIStreamModal
            titulo="Reporte ejecutivo mensual"
            descripcion="La IA generará un resumen ejecutivo completo del mes con KPIs, análisis y plan de acción."
            icon={FileText}
            onInicio={buildReporteContext}
            mockText={MOCK_RESPONSES.reporte}
            onClose={() => setShowReporte(false)}
          />
        </Modal>
      )}
    </div>
  );
}
