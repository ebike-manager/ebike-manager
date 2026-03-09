import { useMemo, useState } from 'react';
import { TrendingUp, DollarSign, ShoppingCart, Users } from 'lucide-react';
import { useVentas }   from '../hooks/useVentas';
import { useClientes } from '../hooks/useClientes';
import { useConfig }   from '../hooks/useConfig';
import { formatMoney } from '../utils/moneda';

// ── Helpers ──────────────────────────────────────────────────────────────────
const estesMes = (fecha) => {
  const d = new Date(fecha + 'T00:00:00'), h = new Date();
  return d.getMonth() === h.getMonth() && d.getFullYear() === h.getFullYear();
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
      if (!map[it.productoNombre]) map[it.productoNombre] = { nombre: it.productoNombre, cantidad: 0, ingresos: 0 };
      map[it.productoNombre].cantidad += it.cantidad;
      map[it.productoNombre].ingresos += it.subtotal;
    })
  );
  return Object.values(map).sort((a, b) => b.cantidad - a.cantidad).slice(0, n);
};

const topClientes = (ventas, n = 5) => {
  const map = {};
  ventas.forEach((v) => {
    if (!map[v.clienteNombre]) map[v.clienteNombre] = { nombre: v.clienteNombre, compras: 0, total: 0 };
    map[v.clienteNombre].compras++;
    map[v.clienteNombre].total += v.total;
  });
  return Object.values(map).sort((a, b) => b.compras - a.compras).slice(0, n);
};

// ── Gráfico de barras vertical (custom CSS) ──────────────────────────────────
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
              {/* Tooltip */}
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
      {/* Eje X */}
      <div className="flex gap-1 mt-1.5 border-t border-slate-100 pt-1.5">
        {datos.map((d) => (
          <div key={d.key} className="flex-1 text-center overflow-hidden">
            <span className="text-[9px] text-slate-400 block truncate leading-tight">
              {d.labelCorto}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Barra horizontal para rankings ───────────────────────────────────────────
function BarraRanking({ label, secondary, valor, max, moneda, color = 'bg-emerald-500' }) {
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
        {typeof valor === 'number' && valor < 1000 ? valor : formatMoney(valor, moneda)}
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
  const { empresa }  = useConfig();
  const moneda = empresa.moneda ?? 'USD';

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
          {totalPeriodo === 0 && (
            <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
              Sin ventas en este período
            </span>
          )}
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
                  secondary={`${formatMoney(p.ingresos, moneda)} en ingresos`}
                  valor={p.cantidad}
                  max={maxProds}
                  moneda={moneda}
                  color="bg-emerald-500"
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
                  secondary={`${c.compras} ${c.compras === 1 ? 'compra' : 'compras'} · ${formatMoney(c.total, moneda)}`}
                  valor={c.compras}
                  max={maxClis}
                  moneda={moneda}
                  color="bg-blue-500"
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
    </div>
  );
}
