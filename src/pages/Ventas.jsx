import { useState, useMemo } from 'react';
import {
  Plus, Search, Trash2, ShoppingCart,
  DollarSign, TrendingUp, X,
  AlertTriangle, Eye, Package, FileText, CreditCard,
} from 'lucide-react';
import Modal from '../components/Modal';
import { useVentas }             from '../hooks/useVentas';
import { useInventario }         from '../hooks/useInventario';
import { useClientes }           from '../hooks/useClientes';
import { useConfig }             from '../hooks/useConfig';
import { usePagosVenta }         from '../hooks/usePagosVenta';
import { usePermissions }        from '../hooks/usePermissions';
import { appendLog }             from '../hooks/useActivityLog';
import { generarPresupuestoPDF } from '../utils/pdfPresupuesto';
import { formatMoney }           from '../utils/moneda';

// ── Helpers ──────────────────────────────────────────────────────────────────
const formatFecha = (str) => {
  if (!str) return '—';
  return new Date(str + 'T00:00:00').toLocaleDateString('es-AR', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};
const getTodayStr = () => new Date().toISOString().split('T')[0];
const estesMes = (fecha) => {
  const d = new Date(fecha + 'T00:00:00'), hoy = new Date();
  return d.getMonth() === hoy.getMonth() && d.getFullYear() === hoy.getFullYear();
};

// Compute per-currency totals from venta items, or fall back to venta.total
const getVentaTotalDisplay = (venta, globalMoneda) => {
  if (!venta.items?.length) return formatMoney(venta.total, globalMoneda);
  const byMoneda = {};
  venta.items.forEach((it) => {
    const m = it.moneda ?? globalMoneda;
    byMoneda[m] = (byMoneda[m] ?? 0) + (it.subtotal ?? 0);
  });
  const keys = Object.keys(byMoneda);
  if (keys.length === 0) return formatMoney(venta.total, globalMoneda);
  if (keys.length === 1) return formatMoney(byMoneda[keys[0]], keys[0]);
  return keys.map((m) => formatMoney(byMoneda[m], m)).join(' + ');
};

const ESTADO_CFG = {
  completada: { label: 'Completada', cls: 'bg-emerald-100 text-emerald-700' },
  pendiente:  { label: 'Pendiente',  cls: 'bg-amber-100 text-amber-700'    },
  cancelada:  { label: 'Cancelada',  cls: 'bg-red-100 text-red-700'        },
};

// ── Formulario de venta ──────────────────────────────────────────────────────
let _itemKey = 0;
const newItem = () => ({
  _key: ++_itemKey, productoId: '', productoNombre: '',
  cantidad: 1, precioUnitario: '', subtotal: 0, moneda: 'USD',
});

const CUOTAS_OPTS = [3, 6, 12, 18, 24];

function VentaForm({ onGuardar, onCancelar, clientes, productos }) {
  const [form, setForm] = useState({
    clienteId: '', fecha: getTodayStr(),
    items: [newItem()], estado: 'completada', notas: '',
    tipoPago: 'contado', nCuotas: 12,
  });
  const [errors, setErrors] = useState({});

  const updateItem = (idx, patch) =>
    setForm((f) => {
      const items = f.items.map((it, i) => (i === idx ? { ...it, ...patch } : it));
      return { ...f, items };
    });

  const handleProductoChange = (idx, productoId) => {
    const p = productos.find((x) => x.id === productoId);
    const precioUnitario = p ? String(p.precio) : '';
    const cantidad = form.items[idx].cantidad || 1;
    updateItem(idx, {
      productoId,
      productoNombre: p?.nombre ?? '',
      precioUnitario,
      moneda: p?.moneda ?? 'USD',
      subtotal: p ? p.precio * cantidad : 0,
    });
  };

  const handleCantidadChange = (idx, raw) => {
    const cantidad = Math.max(1, parseInt(raw, 10) || 1);
    const precio   = parseFloat(form.items[idx].precioUnitario) || 0;
    updateItem(idx, { cantidad, subtotal: cantidad * precio });
  };

  const handlePrecioChange = (idx, raw) => {
    const precio   = parseFloat(raw) || 0;
    const cantidad = form.items[idx].cantidad || 1;
    updateItem(idx, { precioUnitario: raw, subtotal: cantidad * precio });
  };

  const addItem    = () => setForm((f) => ({ ...f, items: [...f.items, newItem()] }));
  const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  // Per-currency totals
  const totalPorMoneda = form.items.reduce((acc, it) => {
    const m = it.moneda ?? 'USD';
    acc[m] = (acc[m] ?? 0) + (it.subtotal || 0);
    return acc;
  }, {});
  const monedaKeys    = Object.keys(totalPorMoneda);
  const totalNumerico = Object.values(totalPorMoneda).reduce((s, v) => s + v, 0);

  // Primary moneda and cuota amount
  const monedaPrimaria = monedaKeys.length === 1 ? monedaKeys[0] : null;
  const montoPorCuota  = form.tipoPago === 'cuotas' && form.nCuotas > 0
    ? Math.round((totalNumerico / form.nCuotas) * 100) / 100
    : 0;

  const validar = () => {
    const e = {};
    if (!form.clienteId) e.clienteId = 'Seleccioná un cliente';
    const sinProducto = form.items.some((it) => !it.productoId);
    if (sinProducto) e.items = 'Todos los items deben tener un producto';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validar()) return;
    const cliente = clientes.find((c) => c.id === form.clienteId);
    const cleanItems = form.items.map(({ _key, ...rest }) => ({
      ...rest,
      cantidad:       parseInt(rest.cantidad, 10),
      precioUnitario: parseFloat(rest.precioUnitario) || 0,
      subtotal:       rest.subtotal,
      moneda:         rest.moneda ?? 'USD',
    }));
    onGuardar({
      clienteId:     form.clienteId,
      clienteNombre: cliente ? `${cliente.nombre} ${cliente.apellido}` : '',
      fecha:         form.fecha,
      items:         cleanItems,
      total:         parseFloat(totalNumerico.toFixed(2)),
      estado:        form.estado,
      notas:         form.notas,
      tipoPago:      form.tipoPago,
      nCuotas:       form.tipoPago === 'cuotas' ? form.nCuotas : null,
      monedaCuotas:  monedaPrimaria ?? 'USD',
    });
  };

  const inputCls = (err) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
      err ? 'border-red-400 bg-red-50' : 'border-slate-300'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Fecha + Cliente */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
          <input type="date" value={form.fecha}
            onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
            className={inputCls(false)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cliente <span className="text-red-500">*</span>
          </label>
          <select value={form.clienteId}
            onChange={(e) => setForm((f) => ({ ...f, clienteId: e.target.value }))}
            className={inputCls(errors.clienteId)}>
            <option value="">Seleccionar cliente...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
            ))}
          </select>
          {errors.clienteId && <p className="text-red-500 text-xs mt-1">{errors.clienteId}</p>}
        </div>
      </div>

      {/* Productos */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-slate-700">
            Productos <span className="text-red-500">*</span>
          </label>
          <button type="button" onClick={addItem}
            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium">
            <Plus size={13} /> Agregar ítem
          </button>
        </div>

        {/* Items header */}
        <div className="grid grid-cols-[1fr_64px_112px_96px_28px] gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 mb-1">
          <span>Producto</span>
          <span className="text-center">Cant.</span>
          <span className="text-right">P. unitario</span>
          <span className="text-right">Subtotal</span>
          <span />
        </div>

        <div className="space-y-2">
          {form.items.map((item, i) => (
            <div key={item._key}
              className="grid grid-cols-[1fr_64px_112px_96px_28px] gap-2 items-center p-2 bg-slate-50 rounded-lg border border-slate-100">
              <select value={item.productoId}
                onChange={(e) => handleProductoChange(i, e.target.value)}
                className="w-full border border-slate-300 bg-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Seleccionar...</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
              <input type="number" min="1" value={item.cantidad}
                onChange={(e) => handleCantidadChange(i, e.target.value)}
                className="w-full border border-slate-300 bg-white rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              <input type="number" min="0" step="0.01" value={item.precioUnitario}
                onChange={(e) => handlePrecioChange(i, e.target.value)}
                className="w-full border border-slate-300 bg-white rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="0.00" />
              <span className="text-sm font-bold text-slate-800 text-right pr-1">
                {formatMoney(item.subtotal, item.moneda ?? 'USD')}
              </span>
              <button type="button" onClick={() => removeItem(i)}
                disabled={form.items.length === 1}
                className="p-1 text-slate-300 hover:text-red-500 disabled:opacity-30 rounded transition-colors">
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        {errors.items && <p className="text-red-500 text-xs mt-1">{errors.items}</p>}
      </div>

      {/* Estado + Notas */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
          <select value={form.estado}
            onChange={(e) => setForm((f) => ({ ...f, estado: e.target.value }))}
            className={inputCls(false)}>
            <option value="completada">Completada</option>
            <option value="pendiente">Pendiente</option>
            <option value="cancelada">Cancelada</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
          <input type="text" value={form.notas}
            onChange={(e) => setForm((f) => ({ ...f, notas: e.target.value }))}
            className={inputCls(false)} placeholder="Opcional..." />
        </div>
      </div>

      {/* Tipo de pago */}
      <div className="border border-slate-200 rounded-xl p-4 space-y-3">
        <p className="text-sm font-medium text-slate-700 flex items-center gap-2">
          <CreditCard size={15} className="text-slate-400" /> Tipo de pago
        </p>
        <div className="flex gap-6">
          {['contado', 'cuotas'].map((tp) => (
            <label key={tp} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="tipoPago" value={tp}
                checked={form.tipoPago === tp}
                onChange={() => setForm((f) => ({ ...f, tipoPago: tp }))}
                className="w-4 h-4 text-emerald-600 border-slate-300" />
              <span className="text-sm text-slate-700">
                {tp === 'contado' ? 'Contado' : 'En cuotas'}
              </span>
            </label>
          ))}
        </div>
        {form.tipoPago === 'cuotas' && (
          <div className="flex flex-wrap items-center gap-4 pt-1">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-600 whitespace-nowrap">Número de cuotas:</label>
              <select value={form.nCuotas}
                onChange={(e) => setForm((f) => ({ ...f, nCuotas: parseInt(e.target.value, 10) }))}
                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
                {CUOTAS_OPTS.map((n) => (
                  <option key={n} value={n}>{n} cuotas</option>
                ))}
              </select>
            </div>
            {totalNumerico > 0 && (
              <div className="text-sm">
                <span className="text-slate-500">≈ </span>
                <span className="font-semibold text-emerald-700">
                  {formatMoney(montoPorCuota, monedaPrimaria ?? 'USD')}
                </span>
                <span className="text-slate-500"> / cuota</span>
                {!monedaPrimaria && (
                  <span className="text-xs text-amber-600 ml-2">(monedas mixtas)</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Total */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
        <span className="text-sm text-slate-500 font-medium">Total de la venta</span>
        {monedaKeys.length <= 1 ? (
          <span className="text-2xl font-bold text-slate-900">
            {formatMoney(totalNumerico, monedaKeys[0] ?? 'USD')}
          </span>
        ) : (
          <div className="text-right">
            {monedaKeys.map((m) => (
              <p key={m} className="text-xl font-bold text-slate-900">
                {formatMoney(totalPorMoneda[m], m)}
              </p>
            ))}
            <p className="text-xs text-slate-400">Venta en monedas mixtas</p>
          </div>
        )}
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancelar}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
          Cancelar
        </button>
        <button type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
          Registrar venta
        </button>
      </div>
    </form>
  );
}

// ── Detalle de venta (modal) ──────────────────────────────────────────────────
function VentaDetalle({ venta, moneda, onClose, onEliminar, plan, onMarcarPago, empresa, canDelete, canExportPDF }) {
  const cfg = ESTADO_CFG[venta.estado] ?? ESTADO_CFG.completada;
  const numero = `${new Date(venta.fecha + 'T00:00:00').getFullYear()}-${venta.id.slice(-6).toUpperCase()}`;

  const handlePDF = () => {
    generarPresupuestoPDF({ empresa, venta, numero });
  };

  return (
    <div className="space-y-4">
      {/* Header info */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">Fecha</p>
          <p className="font-semibold text-slate-900">{formatFecha(venta.fecha)}</p>
        </div>
        <div>
          <p className="text-sm text-slate-500">Cliente</p>
          <p className="font-semibold text-slate-900">{venta.clienteNombre}</p>
        </div>
        <span className={`mt-4 inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
          {cfg.label}
        </span>
      </div>

      {/* Tipo de pago badge */}
      {venta.tipoPago === 'cuotas' && (
        <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
          <CreditCard size={12} />
          <span>Venta en <strong>{venta.nCuotas} cuotas</strong></span>
        </div>
      )}

      {/* Items */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Productos</p>
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs text-slate-500 font-semibold">Producto</th>
                <th className="px-3 py-2 text-center text-xs text-slate-500 font-semibold">Cant.</th>
                <th className="px-3 py-2 text-right text-xs text-slate-500 font-semibold">P. Unit.</th>
                <th className="px-3 py-2 text-right text-xs text-slate-500 font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {venta.items.map((it, i) => (
                <tr key={i}>
                  <td className="px-3 py-2 text-slate-800">{it.productoNombre}</td>
                  <td className="px-3 py-2 text-center text-slate-600">{it.cantidad}</td>
                  <td className="px-3 py-2 text-right text-slate-600">
                    {formatMoney(it.precioUnitario, it.moneda ?? moneda)}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800">
                    {formatMoney(it.subtotal, it.moneda ?? moneda)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Notes */}
      {venta.notas && (
        <div className="bg-slate-50 rounded-lg px-3 py-2 text-sm text-slate-600">
          <span className="font-medium text-slate-500">Nota: </span>{venta.notas}
        </div>
      )}

      {/* Total */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
        <span className="font-medium text-slate-600">Total</span>
        <span className="text-xl font-bold text-slate-900">
          {getVentaTotalDisplay(venta, moneda)}
        </span>
      </div>

      {/* Plan de cuotas */}
      {plan && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <CreditCard size={12} /> Plan de cuotas ({plan.totalCuotas} cuotas)
          </p>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs text-slate-500 font-semibold">Cuota</th>
                  <th className="px-3 py-2 text-left text-xs text-slate-500 font-semibold">Vencimiento</th>
                  <th className="px-3 py-2 text-right text-xs text-slate-500 font-semibold">Monto</th>
                  <th className="px-3 py-2 text-center text-xs text-slate-500 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {plan.pagos.map((p) => {
                  const hoy = new Date().toISOString().split('T')[0];
                  const vencida = !p.pagado && p.fechaVencimiento < hoy;
                  return (
                    <tr key={p.numeroCuota} className={vencida ? 'bg-red-50' : p.pagado ? 'bg-emerald-50/40' : ''}>
                      <td className="px-3 py-2 text-slate-700 font-medium">#{p.numeroCuota}</td>
                      <td className="px-3 py-2 text-slate-600 text-xs">{formatFecha(p.fechaVencimiento)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-800">
                        {formatMoney(p.monto, plan.moneda)}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          onClick={() => onMarcarPago(p.numeroCuota)}
                          title={p.pagado ? 'Marcar como no pagado' : 'Marcar como pagado'}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                            p.pagado
                              ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                              : vencida
                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {p.pagado ? '✓ Pagado' : vencida ? '⚠ Vencida' : 'Pendiente'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-between gap-2 pt-1">
        <div className="flex gap-2">
          {canDelete && (
            <button onClick={onEliminar}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors">
              <Trash2 size={14} /> Eliminar
            </button>
          )}
          {canExportPDF && (
            <button onClick={handlePDF}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
              <FileText size={14} /> Presupuesto PDF
            </button>
          )}
        </div>
        <button onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ── Fila de tabla ────────────────────────────────────────────────────────────
function VentaRow({ venta, moneda, onVer, cuotaVencida }) {
  const cfg = ESTADO_CFG[venta.estado] ?? ESTADO_CFG.completada;
  const resumen = venta.items.length === 1
    ? venta.items[0].productoNombre
    : `${venta.items.length} productos`;

  return (
    <tr className="hover:bg-slate-50/80 transition-colors cursor-pointer group" onClick={onVer}>
      <td className="px-4 py-3.5">
        <p className="text-sm font-medium text-slate-800">{formatFecha(venta.fecha)}</p>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-sm font-semibold text-slate-800">{venta.clienteNombre}</p>
      </td>
      <td className="px-4 py-3.5">
        <p className="text-sm text-slate-600 truncate max-w-[200px]">{resumen}</p>
        {venta.items.length > 1 && (
          <p className="text-xs text-slate-400">
            {venta.items.map((it) => it.productoNombre).join(' · ')}
          </p>
        )}
      </td>
      <td className="px-4 py-3.5 text-right">
        <span className="text-sm font-bold text-slate-900">
          {getVentaTotalDisplay(venta, moneda)}
        </span>
        {venta.tipoPago === 'cuotas' && (
          <p className="text-[10px] text-blue-500 font-medium">{venta.nCuotas} cuotas</p>
        )}
      </td>
      <td className="px-4 py-3.5 text-center">
        <div className="flex flex-col items-center gap-1">
          <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
            {cfg.label}
          </span>
          {cuotaVencida && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700">
              <AlertTriangle size={9} /> Cuota vencida
            </span>
          )}
        </div>
      </td>
      <td className="px-4 py-3.5 text-center">
        <span className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-xs text-emerald-600 font-medium transition-opacity">
          <Eye size={12} /> Ver
        </span>
      </td>
    </tr>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
const STAT_COLORS = {
  blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600', amber: 'bg-amber-50 text-amber-600',
};
function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`rounded-xl p-3 ${STAT_COLORS[color]}`}><Icon size={20} /></div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-900 leading-tight break-words">{value}</p>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
const HEADERS = [
  { label: 'Fecha', align: '' }, { label: 'Cliente', align: '' },
  { label: 'Productos', align: '' }, { label: 'Total', align: 'text-right' },
  { label: 'Estado', align: 'text-center' }, { label: '', align: 'text-center' },
];

const FILTROS = [
  { value: 'todas',     label: 'Todas'    },
  { value: 'este-mes',  label: 'Este mes' },
  { value: 'este-anio', label: 'Este año' },
];

export default function Ventas({ currentUser }) {
  const { ventas, agregarVenta, eliminarVenta }                            = useVentas();
  const { productos, editarProducto }                                      = useInventario();
  const { clientes }                                                       = useClientes();
  const { empresa }                                                        = useConfig();
  const { planes, crearPlan, marcarPago, getPlan, tieneCuotaVencida }     = usePagosVenta();
  const perms  = usePermissions(currentUser);
  const moneda = empresa.moneda ?? 'USD';

  const [search, setSearch]         = useState('');
  const [filtro, setFiltro]         = useState('todas');
  const [showNew, setShowNew]       = useState(false);
  const [detalle, setDetalle]       = useState(null);
  const [eliminando, setEliminando] = useState(null);

  const filtradas = useMemo(() => {
    const hoy = new Date();
    return ventas.filter((v) => {
      const d = new Date(v.fecha + 'T00:00:00');
      if (filtro === 'este-mes' && (d.getMonth() !== hoy.getMonth() || d.getFullYear() !== hoy.getFullYear())) return false;
      if (filtro === 'este-anio' && d.getFullYear() !== hoy.getFullYear()) return false;
      const term = search.toLowerCase();
      return v.clienteNombre.toLowerCase().includes(term) ||
             v.items.some((it) => it.productoNombre.toLowerCase().includes(term));
    });
  }, [ventas, filtro, search]);

  const stats = useMemo(() => {
    const ventasMes     = ventas.filter((v) => estesMes(v.fecha));
    const ingresosMes   = ventasMes.reduce((s, v) => s + v.total, 0);
    const ingresosTotal = ventas.reduce((s, v) => s + v.total, 0);
    const ticket        = ventas.length ? ingresosTotal / ventas.length : 0;
    return { ingresosTotal, ingresosMes, ventasMes: ventasMes.length, ticket };
  }, [ventas]);

  const handleRegistrar = async (datos) => {
    const nueva = await agregarVenta(datos);
    for (const item of datos.items) {
      if (!item.productoId) continue;
      const prod = productos.find((p) => p.id === item.productoId);
      if (prod) await editarProducto(item.productoId, { stock: Math.max(0, prod.stock - item.cantidad) });
    }
    if (nueva && datos.tipoPago === 'cuotas' && datos.nCuotas > 0) {
      await crearPlan(nueva.id, {
        total:      datos.total,
        nCuotas:    datos.nCuotas,
        moneda:     datos.monedaCuotas ?? moneda,
        fechaInicio: datos.fecha,
      });
      appendLog('Venta en cuotas registrada', 'ventas', `${datos.clienteNombre} — ${datos.nCuotas} cuotas`);
    } else {
      appendLog('Venta registrada', 'ventas', `${datos.clienteNombre} — ${formatMoney(datos.total, moneda)}`);
    }
    setShowNew(false);
  };

  const handleEliminar = async () => {
    if (eliminando) {
      appendLog('Venta eliminada', 'ventas', `${eliminando.clienteNombre}`);
      await eliminarVenta(eliminando.id);
      setEliminando(null);
      setDetalle(null);
    }
  };

  const handleMarcarPago = (ventaId, numeroCuota) => {
    marcarPago(ventaId, numeroCuota);
    const plan = getPlan(ventaId);
    const cuota = plan?.pagos?.find((p) => p.numeroCuota === numeroCuota);
    const accion = cuota?.pagado ? 'Pago de cuota revertido' : 'Pago de cuota registrado';
    appendLog(accion, 'ventas', `Venta ${ventaId.slice(-6)} — cuota ${numeroCuota}`);
  };

  // Unused planes suppressor — plane data is accessed via tieneCuotaVencida / getPlan
  void planes;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign}   label="Ingresos totales"  value={formatMoney(stats.ingresosTotal, moneda)} color="emerald" />
        <StatCard icon={TrendingUp}   label="Ingresos este mes" value={formatMoney(stats.ingresosMes, moneda)}   color="blue"    />
        <StatCard icon={ShoppingCart} label="Ventas este mes"   value={stats.ventasMes}                          color="violet"  />
        <StatCard icon={Package}      label="Ticket promedio"   value={formatMoney(stats.ticket, moneda)}        color="amber"   />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cliente o producto..."
                className="pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64" />
            </div>
            <select value={filtro} onChange={(e) => setFiltro(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
              {FILTROS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </div>
          {perms.canSell && (
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
              <Plus size={15} /> Nueva venta
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {HEADERS.map(({ label, align }, i) => (
                  <th key={label || i} className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${align}`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.length === 0 ? (
                <tr><td colSpan={6} className="py-14 text-center text-slate-400 text-sm">
                  {search ? 'Sin resultados para esa búsqueda.' : 'No hay ventas registradas todavía.'}
                </td></tr>
              ) : (
                filtradas.map((v) => (
                  <VentaRow
                    key={v.id}
                    venta={v}
                    moneda={moneda}
                    onVer={() => setDetalle(v)}
                    cuotaVencida={tieneCuotaVencida(v.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtradas.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-400 bg-slate-50/50">
            Mostrando {filtradas.length} de {ventas.length} ventas
          </div>
        )}
      </div>

      {/* Modal: Nueva venta */}
      {showNew && perms.canSell && (
        <Modal title="Registrar nueva venta" onClose={() => setShowNew(false)} size="lg">
          <VentaForm
            clientes={clientes} productos={productos}
            onGuardar={handleRegistrar} onCancelar={() => setShowNew(false)}
          />
        </Modal>
      )}

      {/* Modal: Detalle */}
      {detalle && !eliminando && (
        <Modal title="Detalle de venta" onClose={() => setDetalle(null)}>
          <VentaDetalle
            venta={detalle}
            moneda={moneda}
            onClose={() => setDetalle(null)}
            onEliminar={() => setEliminando(detalle)}
            plan={getPlan(detalle.id)}
            onMarcarPago={(numeroCuota) => handleMarcarPago(detalle.id, numeroCuota)}
            empresa={empresa}
            canDelete={perms.canDelete}
            canExportPDF={perms.canExportPDF}
          />
        </Modal>
      )}

      {/* Modal: Confirmar eliminación */}
      {eliminando && (
        <Modal title="Eliminar venta" onClose={() => setEliminando(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700">
                Estás a punto de eliminar la venta de <strong>{eliminando.clienteNombre}</strong> del {formatFecha(eliminando.fecha)}.
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEliminando(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={handleEliminar}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
                Eliminar venta
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
