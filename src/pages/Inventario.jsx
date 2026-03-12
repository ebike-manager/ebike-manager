import { useState, useMemo } from 'react';
import {
  Plus, Search, Edit2, Trash2, Package,
  AlertTriangle, DollarSign, LayoutGrid,
  Sparkles, Brain, X, ChevronDown, ChevronUp, Clock,
} from 'lucide-react';
import Modal from '../components/Modal';
import { useInventario }  from '../hooks/useInventario';
import { useConfig }      from '../hooks/useConfig';
import { usePermissions } from '../hooks/usePermissions';
import { MONEDAS, formatMoney } from '../utils/moneda';
import { llamarClaude, streamOrMock, MOCK_RESPONSES } from '../services/aiService';

const CATEGORIAS = ['Bicicletas', 'Motores', 'Baterías', 'Accesorios', 'Repuestos', 'Herramientas'];

const CATEGORIA_COLORS = {
  Bicicletas:   'bg-blue-100 text-blue-700',
  Motores:      'bg-violet-100 text-violet-700',
  Baterías:     'bg-amber-100 text-amber-700',
  Accesorios:   'bg-pink-100 text-pink-700',
  Repuestos:    'bg-orange-100 text-orange-700',
  Herramientas: 'bg-cyan-100 text-cyan-700',
};

const HEADERS = [
  { label: 'Producto',  align: '' },
  { label: 'Categoría', align: '' },
  { label: 'Precio',    align: 'text-right' },
  { label: 'Stock',     align: 'text-center' },
  { label: 'Estado',    align: 'text-center' },
  { label: 'Acciones',  align: 'text-center' },
];

const FORM_VACIO = {
  nombre: '',
  categoria: CATEGORIAS[0],
  descripcion: '',
  precio: '',
  moneda: 'USD',
  stock: '',
  umbralMinimo: '5',
  estado: 'activo',
};

// ── Markdown renderer (simple) ────────────────────────────────────────────────
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
      // Simple table
      const rows = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        if (!lines[i].match(/^[\|\s\-:]+$/)) {
          rows.push(lines[i].split('|').filter(Boolean).map(c => c.trim()));
        }
        i++;
      }
      if (rows.length > 0) {
        elements.push(
          <div key={`table-${i}`} className="overflow-x-auto my-2">
            <table className="text-xs w-full border-collapse">
              <thead>
                <tr className="bg-slate-100">
                  {rows[0].map((h, j) => <th key={j} className="px-2 py-1 text-left font-semibold text-slate-700 border border-slate-200">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.slice(1).map((r, ri) => (
                  <tr key={ri} className="even:bg-slate-50">
                    {r.map((c, ci) => <td key={ci} className="px-2 py-1 text-slate-600 border border-slate-200">{c}</td>)}
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

// ── Formulario de producto ───────────────────────────────────────────────────
function ProductoForm({ inicial = {}, onGuardar, onCancelar }) {
  const [form, setForm] = useState({
    ...FORM_VACIO,
    ...inicial,
    precio:       inicial.precio       != null ? String(inicial.precio)       : '',
    stock:        inicial.stock        != null ? String(inicial.stock)        : '',
    umbralMinimo: inicial.umbralMinimo != null ? String(inicial.umbralMinimo) : '5',
    moneda:       inicial.moneda       ?? 'USD',
  });
  const [errors, setErrors]       = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError]     = useState('');

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: null }));
  };

  const handleAISuggest = async () => {
    const nombre = form.nombre.trim();
    if (!nombre) {
      setErrors((er) => ({ ...er, nombre: 'Escribí el nombre primero para que la IA sugiera los detalles' }));
      return;
    }
    setAiLoading(true);
    setAiError('');
    try {
      const system = `Sos un asistente especializado en tiendas de bicicletas eléctricas.
Cuando el usuario te dé un nombre de producto, respondé ÚNICAMENTE con un JSON válido (sin markdown, sin explicaciones) con esta estructura:
{"categoria":"<una de: Bicicletas|Motores|Baterías|Accesorios|Repuestos|Herramientas>","descripcion":"<descripción concisa de 1-2 oraciones>","precioSugerido":<número en USD>,"sku":"<código SKU corto>"}`;

      const raw = await llamarClaude({
        system,
        messages: [{ role: 'user', content: `Producto: ${nombre}` }],
        maxTokens: 256,
      });

      const text = raw ?? MOCK_RESPONSES.producto;

      // Parse JSON – strip potential markdown fences
      const jsonStr = text.replace(/```[a-z]*\n?/gi, '').trim();
      const data = JSON.parse(jsonStr);

      setForm((f) => ({
        ...f,
        categoria:   CATEGORIAS.includes(data.categoria) ? data.categoria : f.categoria,
        descripcion: data.descripcion ?? f.descripcion,
        precio:      data.precioSugerido != null ? String(data.precioSugerido) : f.precio,
      }));
    } catch (err) {
      setAiError('No se pudo interpretar la respuesta de la IA. Completá los campos manualmente.');
      console.error('[AI Suggest]', err);
    } finally {
      setAiLoading(false);
    }
  };

  const validar = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'El nombre es requerido';
    if (form.precio === '' || isNaN(Number(form.precio)) || Number(form.precio) < 0)
      e.precio = 'Ingresá un precio válido';
    if (form.stock === '' || isNaN(Number(form.stock)) || Number(form.stock) < 0)
      e.stock = 'Ingresá un stock válido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validar()) return;
    onGuardar({
      ...form,
      precio:       parseFloat(form.precio),
      stock:        parseInt(form.stock, 10),
      umbralMinimo: parseInt(form.umbralMinimo, 10) || 5,
    });
  };

  const inputCls = (field) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-slate-300'
    }`;

  const simbolo = MONEDAS[form.moneda]?.simbolo ?? 'US$';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* AI error */}
      {aiError && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <AlertTriangle size={13} className="flex-shrink-0" />
          {aiError}
        </div>
      )}

      {/* Nombre + botón IA */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nombre del producto <span className="text-red-500">*</span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={form.nombre}
            onChange={set('nombre')}
            className={`${inputCls('nombre')} flex-1`}
            placeholder="Ej: E-Bike Mountain Pro 29"
            autoFocus
          />
          <button
            type="button"
            onClick={handleAISuggest}
            disabled={aiLoading}
            title="Completar con IA"
            className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {aiLoading ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                IA...
              </span>
            ) : (
              <>
                <Sparkles size={13} />
                IA
              </>
            )}
          </button>
        </div>
        {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
        {!aiLoading && !aiError && (
          <p className="text-xs text-slate-400 mt-1">
            Escribí el nombre y presioná <strong>IA</strong> para que se autocomplete la categoría, descripción y precio
          </p>
        )}
      </div>

      {/* Categoría + Moneda + Estado */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
          <select value={form.categoria} onChange={set('categoria')} className={inputCls('categoria')}>
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Moneda <span className="text-red-500">*</span>
          </label>
          <select value={form.moneda} onChange={set('moneda')} className={inputCls('moneda')}>
            <option value="USD">USD – Dólar</option>
            <option value="UYU">UYU – Peso</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
          <select value={form.estado} onChange={set('estado')} className={inputCls('estado')}>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
          </select>
        </div>
      </div>

      {/* Descripción */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
        <textarea
          value={form.descripcion}
          onChange={set('descripcion')}
          rows={2}
          className={`${inputCls('descripcion')} resize-none`}
          placeholder="Descripción opcional del producto..."
        />
      </div>

      {/* Precio / Stock / Mínimo */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Precio ({simbolo}) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.precio}
            onChange={set('precio')}
            className={inputCls('precio')}
            placeholder="0.00"
          />
          {errors.precio && <p className="text-red-500 text-xs mt-1">{errors.precio}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Stock <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            min="0"
            value={form.stock}
            onChange={set('stock')}
            className={inputCls('stock')}
            placeholder="0"
          />
          {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Alerta mín.</label>
          <input
            type="number"
            min="0"
            value={form.umbralMinimo}
            onChange={set('umbralMinimo')}
            className={inputCls('umbralMinimo')}
            placeholder="5"
          />
        </div>
      </div>

      {/* Acciones */}
      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          type="button"
          onClick={onCancelar}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
        >
          Guardar producto
        </button>
      </div>
    </form>
  );
}

// ── Modal de edición rápida de stock ────────────────────────────────────────
function StockModal({ producto, onGuardar, onCancelar }) {
  const [valor, setValor] = useState(String(producto.stock));

  const handleGuardar = () => {
    const n = parseInt(valor, 10);
    if (!isNaN(n) && n >= 0) onGuardar(n);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Actualizá el stock de{' '}
        <strong className="text-slate-900">{producto.nombre}</strong>.
      </p>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Cantidad en stock
        </label>
        <input
          type="number"
          min="0"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleGuardar()}
          className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          autoFocus
        />
        <p className="text-xs text-slate-400 mt-1">
          Alerta de stock mínimo: {producto.umbralMinimo} unidades
        </p>
      </div>
      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button
          onClick={onCancelar}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleGuardar}
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
        >
          Actualizar
        </button>
      </div>
    </div>
  );
}

// ── Modal de historial de precios ─────────────────────────────────────────────
function HistorialPreciosModal({ producto, onClose }) {
  const historial = producto.historialPrecios ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-slate-600 text-sm">
        <Package size={14} />
        <span className="font-semibold text-slate-800">{producto.nombre}</span>
        <span className="text-slate-400">—</span>
        <span>precio actual: <strong>{formatMoney(producto.precio, producto.moneda ?? 'USD')}</strong></span>
      </div>

      {historial.length === 0 ? (
        <div className="py-10 text-center">
          <Clock size={28} className="text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No hay cambios de precio registrados.</p>
          <p className="text-xs text-slate-300 mt-1">Los cambios futuros se registrarán automáticamente.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-3 py-2.5 text-left text-xs text-slate-500 font-semibold">Fecha</th>
                <th className="px-3 py-2.5 text-left text-xs text-slate-500 font-semibold">Usuario</th>
                <th className="px-3 py-2.5 text-right text-xs text-slate-500 font-semibold">Precio anterior</th>
                <th className="px-3 py-2.5 text-right text-xs text-slate-500 font-semibold">Precio nuevo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...historial].reverse().map((h, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  <td className="px-3 py-2 text-slate-600 text-xs">
                    {new Date(h.fecha).toLocaleDateString('es-AR', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </td>
                  <td className="px-3 py-2 text-slate-700">{h.usuario ?? '—'}</td>
                  <td className="px-3 py-2 text-right text-slate-500 line-through text-xs">
                    {formatMoney(h.precioAnterior, h.moneda ?? 'USD')}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-slate-800">
                    {formatMoney(h.precioNuevo, h.moneda ?? 'USD')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
          Cerrar
        </button>
      </div>
    </div>
  );
}

// ── Fila de tabla ────────────────────────────────────────────────────────────
function ProductoRow({ producto, onEdit, onDelete, onEditStock, onHistorial, canEdit, canDelete }) {
  const stockBajo = producto.stock <= producto.umbralMinimo;
  const monedaProducto = producto.moneda ?? 'USD';

  return (
    <tr className="hover:bg-slate-50/80 transition-colors group">
      <td className="px-4 py-3.5">
        <p className="text-sm font-semibold text-slate-800">{producto.nombre}</p>
        {producto.descripcion && (
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-xs">
            {producto.descripcion}
          </p>
        )}
      </td>
      <td className="px-4 py-3.5">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            CATEGORIA_COLORS[producto.categoria] ?? 'bg-slate-100 text-slate-600'
          }`}
        >
          {producto.categoria}
        </span>
      </td>
      <td className="px-4 py-3.5 text-right">
        <span className="text-sm font-bold text-slate-900">
          {formatMoney(producto.precio, monedaProducto)}
        </span>
        <span className="ml-1 text-[10px] font-medium text-slate-400 uppercase">{monedaProducto}</span>
      </td>
      <td className="px-4 py-3.5 text-center">
        <button
          onClick={onEditStock}
          title="Clic para actualizar stock"
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-opacity hover:opacity-75 cursor-pointer ${
            stockBajo ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
          }`}
        >
          {stockBajo && <AlertTriangle size={10} />}
          {producto.stock} ud
        </button>
      </td>
      <td className="px-4 py-3.5 text-center">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            producto.estado === 'activo'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          {producto.estado === 'activo' ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Historial de precios — siempre visible */}
          <button
            onClick={onHistorial}
            title="Ver historial de precios"
            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Clock size={14} />
          </button>
          {canEdit && (
            <button
              onClick={onEdit}
              title="Editar producto"
              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            >
              <Edit2 size={14} />
            </button>
          )}
          {canDelete && (
            <button
              onClick={onDelete}
              title="Eliminar producto"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Tarjeta de estadística ───────────────────────────────────────────────────
const STAT_COLORS = {
  blue:    'bg-blue-50 text-blue-600',
  red:     'bg-red-50 text-red-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet:  'bg-violet-50 text-violet-600',
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`rounded-xl p-3 ${STAT_COLORS[color]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-900 leading-tight break-words">{value}</p>
      </div>
    </div>
  );
}

// ── Banner de errores automáticos ────────────────────────────────────────────
function ErrorBanner({ errores }) {
  const [expanded, setExpanded] = useState(true);
  if (errores.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100/50 transition-colors"
      >
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle size={15} className="flex-shrink-0" />
          <span className="text-sm font-semibold">
            Detector de errores — {errores.length} {errores.length === 1 ? 'problema encontrado' : 'problemas encontrados'}
          </span>
        </div>
        {expanded ? <ChevronUp size={15} className="text-amber-600" /> : <ChevronDown size={15} className="text-amber-600" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-1.5">
          {errores.map((e, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-700">
              <span className="mt-0.5 text-amber-400">•</span>
              <span>
                <strong>{e.tipo}:</strong>{' '}
                {e.productos.map((n, j) => (
                  <span key={j}>
                    <em>{n}</em>{j < e.productos.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Modal de análisis de inventario ─────────────────────────────────────────
function AnalisisModal({ productos, onClose }) {
  const [texto, setTexto]       = useState('');
  const [cargando, setCargando] = useState(false);
  const [iniciado, setIniciado] = useState(false);

  const iniciarAnalisis = async () => {
    setIniciado(true);
    setCargando(true);
    setTexto('');

    const resumen = productos.map((p) =>
      `- ${p.nombre} | Cat: ${p.categoria} | Stock: ${p.stock} (min: ${p.umbralMinimo}) | Precio: ${p.moneda ?? 'USD'} ${p.precio} | Estado: ${p.estado}`
    ).join('\n');

    const system = `Sos un analista experto en gestión de inventario para tiendas de bicicletas eléctricas.
Analizá el inventario y producí un reporte en Markdown con:
1. Alertas críticas de stock
2. Productos sin movimiento o con posibles problemas de precio
3. Recomendaciones concretas (máx. 4 puntos)
Sé conciso y accionable. Respondé en español.`;

    await streamOrMock({
      system,
      messages: [{ role: 'user', content: `Inventario actual (${productos.length} productos):\n${resumen}` }],
      mockText: MOCK_RESPONSES.inventario,
      onChunk: (full) => setTexto(full),
    });

    setCargando(false);
  };

  return (
    <div className="space-y-4">
      {!iniciado ? (
        <div className="text-center py-8 space-y-4">
          <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
            <Brain size={28} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Análisis inteligente de inventario</h3>
            <p className="text-sm text-slate-500 mt-1">
              La IA analizará stock, precios y movimiento de {productos.length} productos y generará recomendaciones.
            </p>
          </div>
          <button
            onClick={iniciarAnalisis}
            className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Iniciar análisis
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {cargando && !texto && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <svg className="animate-spin h-4 w-4 text-emerald-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              Analizando inventario...
            </div>
          )}
          {texto && (
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 max-h-[400px] overflow-y-auto">
              <Markdown text={texto} />
              {cargando && (
                <span className="inline-block w-1.5 h-4 bg-emerald-500 ml-0.5 animate-pulse rounded-sm" />
              )}
            </div>
          )}
          {!cargando && (
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-slate-400">Análisis completado</span>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
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

// ── Página principal de Inventario ───────────────────────────────────────────
export default function Inventario({ currentUser }) {
  const { productos, agregarProducto, editarProducto, eliminarProducto } = useInventario();
  const { empresa } = useConfig();
  const perms = usePermissions(currentUser);
  const monedaGlobal = empresa.moneda ?? 'USD';

  const [search, setSearch]                 = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [showAdd, setShowAdd]               = useState(false);
  const [editando, setEditando]             = useState(null);
  const [eliminando, setEliminando]         = useState(null);
  const [editandoStock, setEditandoStock]   = useState(null);
  const [showAnalisis, setShowAnalisis]     = useState(false);
  const [showHistorial, setShowHistorial]   = useState(null); // product object

  const filtrados = useMemo(() => {
    const term = search.toLowerCase();
    return productos.filter((p) => {
      const matchSearch =
        p.nombre.toLowerCase().includes(term) ||
        (p.descripcion ?? '').toLowerCase().includes(term);
      const matchCat = categoriaFiltro === 'todas' || p.categoria === categoriaFiltro;
      return matchSearch && matchCat;
    });
  }, [productos, search, categoriaFiltro]);

  const stats = useMemo(() => {
    const stockBajo = productos.filter(
      (p) => p.estado === 'activo' && p.stock <= p.umbralMinimo
    ).length;
    const categorias = new Set(productos.map((p) => p.categoria)).size;

    // Aggregate inventory value per currency
    const valorPorMoneda = {};
    productos.forEach((p) => {
      const m = p.moneda ?? monedaGlobal;
      valorPorMoneda[m] = (valorPorMoneda[m] ?? 0) + p.precio * p.stock;
    });
    const valorStr =
      Object.entries(valorPorMoneda)
        .map(([m, v]) => formatMoney(v, m))
        .join(' · ') || formatMoney(0, monedaGlobal);

    return { total: productos.length, stockBajo, valorStr, categorias };
  }, [productos, monedaGlobal]);

  // ── Detector automático de errores ──────────────────────────────────────
  const erroresDetectados = useMemo(() => {
    const errores = [];

    // Stock negativo
    const stockNeg = productos.filter((p) => p.stock < 0).map((p) => p.nombre);
    if (stockNeg.length > 0)
      errores.push({ tipo: 'Stock negativo', productos: stockNeg });

    // Precio en cero (activos)
    const precioCero = productos
      .filter((p) => p.estado === 'activo' && (p.precio === 0 || p.precio == null))
      .map((p) => p.nombre);
    if (precioCero.length > 0)
      errores.push({ tipo: 'Precio en $0 (producto activo)', productos: precioCero });

    // Duplicados por nombre (case-insensitive)
    const counts = {};
    productos.forEach((p) => {
      const key = p.nombre.trim().toLowerCase();
      counts[key] = (counts[key] ?? 0) + 1;
    });
    const dupes = productos
      .filter((p) => counts[p.nombre.trim().toLowerCase()] > 1)
      .map((p) => p.nombre)
      .filter((v, i, a) => a.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i);
    if (dupes.length > 0)
      errores.push({ tipo: 'Nombres duplicados', productos: dupes });

    return errores;
  }, [productos]);

  return (
    <div className="space-y-5">
      {/* Banner de errores */}
      <ErrorBanner errores={erroresDetectados} />

      {/* Estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package}       label="Total productos"      value={stats.total}       color="blue"    />
        <StatCard icon={AlertTriangle} label="Stock bajo"           value={stats.stockBajo}   color="red"     />
        <StatCard icon={DollarSign}    label="Valor del inventario" value={stats.valorStr}    color="emerald" />
        <StatCard icon={LayoutGrid}    label="Categorías"           value={stats.categorias}  color="violet"  />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Controles */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar productos..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="todas">Todas</option>
              {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setShowAnalisis(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-700 transition-colors"
            >
              <Brain size={15} />
              Analizar inventario
            </button>
            {perms.canCreate && (
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Plus size={15} />
                Agregar producto
              </button>
            )}
          </div>
        </div>

        {/* Tabla de productos */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {HEADERS.map(({ label, align }) => (
                  <th
                    key={label}
                    className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${align}`}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400 text-sm">
                    {search || categoriaFiltro !== 'todas'
                      ? 'No hay productos que coincidan con la búsqueda.'
                      : 'No hay productos en el inventario. ¡Agregá el primero!'}
                  </td>
                </tr>
              ) : (
                filtrados.map((p) => (
                  <ProductoRow
                    key={p.id}
                    producto={p}
                    canEdit={perms.canEdit}
                    canDelete={perms.canDelete}
                    onEdit={() => setEditando(p)}
                    onDelete={() => setEliminando(p)}
                    onEditStock={() => setEditandoStock(p)}
                    onHistorial={() => setShowHistorial(p)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer de tabla */}
        {filtrados.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-400 bg-slate-50/50">
            Mostrando {filtrados.length} de {productos.length} productos
          </div>
        )}
      </div>

      {/* Modal: Analizar inventario */}
      {showAnalisis && (
        <Modal title="Análisis de inventario con IA" onClose={() => setShowAnalisis(false)}>
          <AnalisisModal productos={productos} onClose={() => setShowAnalisis(false)} />
        </Modal>
      )}

      {/* Modal: Agregar producto */}
      {showAdd && perms.canCreate && (
        <Modal title="Agregar producto" onClose={() => setShowAdd(false)}>
          <ProductoForm
            onGuardar={(datos) => { agregarProducto(datos); setShowAdd(false); }}
            onCancelar={() => setShowAdd(false)}
          />
        </Modal>
      )}

      {/* Modal: Editar producto */}
      {editando && perms.canEdit && (
        <Modal title="Editar producto" onClose={() => setEditando(null)}>
          <ProductoForm
            inicial={editando}
            onGuardar={(datos) => { editarProducto(editando.id, datos); setEditando(null); }}
            onCancelar={() => setEditando(null)}
          />
        </Modal>
      )}

      {/* Modal: Confirmar eliminación */}
      {eliminando && perms.canDelete && (
        <Modal title="Eliminar producto" onClose={() => setEliminando(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700">
                Estás a punto de eliminar{' '}
                <strong>{eliminando.nombre}</strong>.{' '}
                Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setEliminando(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => { eliminarProducto(eliminando.id); setEliminando(null); }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Eliminar producto
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Editar stock rápido */}
      {editandoStock && (
        <Modal title="Actualizar stock" onClose={() => setEditandoStock(null)}>
          <StockModal
            producto={editandoStock}
            onGuardar={(cantidad) => {
              editarProducto(editandoStock.id, { stock: cantidad });
              setEditandoStock(null);
            }}
            onCancelar={() => setEditandoStock(null)}
          />
        </Modal>
      )}

      {/* Modal: Historial de precios */}
      {showHistorial && (
        <Modal
          title={`Historial de precios — ${showHistorial.nombre}`}
          onClose={() => setShowHistorial(null)}
        >
          <HistorialPreciosModal
            producto={showHistorial}
            onClose={() => setShowHistorial(null)}
          />
        </Modal>
      )}
    </div>
  );
}
