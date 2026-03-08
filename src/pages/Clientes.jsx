import { useState, useMemo } from 'react';
import {
  Plus, Search, Edit2, Trash2, Users,
  Phone, ShoppingBag, DollarSign, X,
  CalendarDays, Mail, MessageCircle, Bike,
  AlertTriangle, ChevronRight,
} from 'lucide-react';
import Modal from '../components/Modal';
import { useClientes } from '../hooks/useClientes';

// ── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  ['bg-blue-500',   'text-white'],
  ['bg-violet-500', 'text-white'],
  ['bg-emerald-500','text-white'],
  ['bg-amber-500',  'text-white'],
  ['bg-pink-500',   'text-white'],
  ['bg-cyan-600',   'text-white'],
  ['bg-orange-500', 'text-white'],
  ['bg-rose-500',   'text-white'],
];

const getAvatarColors = (id) => {
  const hash = String(id).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const getInitials = (nombre, apellido) =>
  `${nombre.charAt(0)}${apellido.charAt(0)}`.toUpperCase();

const formatFecha = (fechaStr) => {
  if (!fechaStr) return '—';
  const d = new Date(fechaStr + (fechaStr.includes('T') ? '' : 'T00:00:00'));
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getTodayStr = () => new Date().toISOString().split('T')[0];

// ── Formulario de cliente ────────────────────────────────────────────────────
const CLIENTE_VACIO = {
  nombre: '', apellido: '', telefono: '',
  email: '', ebikePrincipal: '', notas: '',
};

function ClienteForm({ inicial = {}, onGuardar, onCancelar }) {
  const [form, setForm] = useState({ ...CLIENTE_VACIO, ...inicial });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: null }));
  };

  const validar = () => {
    const e = {};
    if (!form.nombre.trim())    e.nombre   = 'El nombre es requerido';
    if (!form.apellido.trim())  e.apellido = 'El apellido es requerido';
    if (!form.telefono.trim())  e.telefono = 'El teléfono es requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validar()) onGuardar(form);
  };

  const inputCls = (field) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-slate-300'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nombre + Apellido */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input type="text" value={form.nombre} onChange={set('nombre')}
            className={inputCls('nombre')} placeholder="Martín" autoFocus />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Apellido <span className="text-red-500">*</span>
          </label>
          <input type="text" value={form.apellido} onChange={set('apellido')}
            className={inputCls('apellido')} placeholder="González" />
          {errors.apellido && <p className="text-red-500 text-xs mt-1">{errors.apellido}</p>}
        </div>
      </div>

      {/* Teléfono */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Teléfono / WhatsApp <span className="text-red-500">*</span>
        </label>
        <input type="tel" value={form.telefono} onChange={set('telefono')}
          className={inputCls('telefono')} placeholder="+54 9 11 1234-5678" />
        {errors.telefono && <p className="text-red-500 text-xs mt-1">{errors.telefono}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
        <input type="email" value={form.email} onChange={set('email')}
          className={inputCls('email')} placeholder="cliente@email.com" />
      </div>

      {/* E-bike principal */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">E-bike principal</label>
        <input type="text" value={form.ebikePrincipal} onChange={set('ebikePrincipal')}
          className={inputCls('ebikePrincipal')} placeholder='Ej: E-Bike Mountain Pro 29"' />
      </div>

      {/* Notas */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
        <textarea value={form.notas} onChange={set('notas')} rows={2}
          className={`${inputCls('notas')} resize-none`}
          placeholder="Observaciones del cliente..." />
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" onClick={onCancelar}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">
          Cancelar
        </button>
        <button type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors">
          Guardar cliente
        </button>
      </div>
    </form>
  );
}

// ── Formulario de compra ─────────────────────────────────────────────────────
function CompraForm({ onGuardar, onCancelar }) {
  const [form, setForm] = useState({ fecha: getTodayStr(), producto: '', precio: '', descripcion: '' });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: null }));
  };

  const validar = () => {
    const e = {};
    if (!form.producto.trim()) e.producto = 'El producto es requerido';
    if (form.precio === '' || isNaN(Number(form.precio)) || Number(form.precio) < 0)
      e.precio = 'Ingresá un precio válido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validar()) onGuardar({ ...form, precio: parseFloat(form.precio) });
  };

  const inputCls = (field) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
      errors[field] ? 'border-red-400 bg-red-50' : 'border-slate-300'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
        <input type="date" value={form.fecha} onChange={set('fecha')} className={inputCls('fecha')} />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Producto / E-bike <span className="text-red-500">*</span>
        </label>
        <input type="text" value={form.producto} onChange={set('producto')}
          className={inputCls('producto')} placeholder='Ej: E-Bike Mountain Pro 29"' autoFocus />
        {errors.producto && <p className="text-red-500 text-xs mt-1">{errors.producto}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Precio ($) <span className="text-red-500">*</span>
        </label>
        <input type="number" min="0" step="0.01" value={form.precio} onChange={set('precio')}
          className={inputCls('precio')} placeholder="0.00" />
        {errors.precio && <p className="text-red-500 text-xs mt-1">{errors.precio}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Descripción / Nota</label>
        <input type="text" value={form.descripcion} onChange={set('descripcion')}
          className={inputCls('descripcion')} placeholder="Nota opcional..." />
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" onClick={onCancelar}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
          Cancelar
        </button>
        <button type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
          Registrar compra
        </button>
      </div>
    </form>
  );
}

// ── Drawer de detalle ────────────────────────────────────────────────────────
function ClienteDetalle({ cliente, onClose, onEdit, onDelete, onAddCompra, onDeleteCompra }) {
  const [avatarBg, avatarText] = getAvatarColors(cliente.id);
  const totalGastado = cliente.historialCompras.reduce((s, c) => s + c.precio, 0);
  const waLink = `https://wa.me/${cliente.telefono.replace(/\D/g, '')}`;

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white shadow-2xl flex flex-col">

        {/* Header oscuro con info principal */}
        <div className="bg-slate-900 px-6 pt-5 pb-5 flex-shrink-0">
          <div className="flex items-center justify-between mb-5">
            <span className="text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Ficha de cliente
            </span>
            <button onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Avatar + nombre + teléfono */}
          <div className="flex items-center gap-4">
            <div className={`${avatarBg} w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0`}>
              <span className={`${avatarText} text-xl font-bold`}>
                {getInitials(cliente.nombre, cliente.apellido)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-white font-bold text-lg leading-tight">
                {cliente.nombre} {cliente.apellido}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <Phone size={12} className="text-emerald-400 flex-shrink-0" />
                <span className="text-slate-300 text-sm">{cliente.telefono}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <CalendarDays size={11} className="text-slate-500 flex-shrink-0" />
                <span className="text-slate-500 text-xs">Desde {formatFecha(cliente.fechaRegistro)}</span>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 mt-4">
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors">
              <Edit2 size={12} /> Editar
            </button>
            <button onClick={onDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-red-500/40 text-white text-xs font-medium rounded-lg transition-colors">
              <Trash2 size={12} /> Eliminar
            </button>
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors">
              <MessageCircle size={12} /> WhatsApp
            </a>
          </div>
        </div>

        {/* Cuerpo scrollable */}
        <div className="flex-1 overflow-y-auto">

          {/* Info adicional */}
          <div className="px-6 py-4 border-b border-slate-100 space-y-2.5">
            {cliente.ebikePrincipal && (
              <div className="flex items-center gap-2.5">
                <Bike size={14} className="text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-700">{cliente.ebikePrincipal}</span>
              </div>
            )}
            {cliente.email && (
              <div className="flex items-center gap-2.5">
                <Mail size={14} className="text-slate-400 flex-shrink-0" />
                <span className="text-sm text-slate-700">{cliente.email}</span>
              </div>
            )}
            {cliente.notas && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-1">
                <p className="text-xs text-amber-800 leading-relaxed">{cliente.notas}</p>
              </div>
            )}
            {!cliente.ebikePrincipal && !cliente.email && !cliente.notas && (
              <p className="text-xs text-slate-400">Sin información adicional registrada.</p>
            )}
          </div>

          {/* Historial de compras */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag size={14} className="text-slate-500" />
                <h4 className="text-sm font-semibold text-slate-700">Historial de compras</h4>
                <span className="bg-slate-100 text-slate-500 text-xs px-1.5 py-0.5 rounded-full font-medium">
                  {cliente.historialCompras.length}
                </span>
              </div>
              <button onClick={onAddCompra}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 transition-colors">
                <Plus size={12} /> Agregar
              </button>
            </div>

            {cliente.historialCompras.length === 0 ? (
              <div className="text-center py-8">
                <ShoppingBag size={28} className="text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400 text-sm">Sin compras registradas.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {cliente.historialCompras.map((compra) => (
                  <div key={compra.id}
                    className="group flex items-start gap-3 p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/60 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-800 truncate">{compra.producto}</p>
                        <span className="text-sm font-bold text-emerald-700 whitespace-nowrap flex-shrink-0">
                          ${compra.precio.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-slate-400">{formatFecha(compra.fecha)}</span>
                        {compra.descripcion && (
                          <span className="text-xs text-slate-400 truncate">· {compra.descripcion}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => onDeleteCompra(compra.id)}
                      title="Eliminar compra"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 rounded transition-all flex-shrink-0 mt-0.5">
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer: total */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500 font-medium">Total facturado</span>
            <span className="text-xl font-bold text-slate-900">
              ${totalGastado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Fila de tabla ────────────────────────────────────────────────────────────
function ClienteRow({ cliente, onVerDetalle }) {
  const [avatarBg, avatarText] = getAvatarColors(cliente.id);
  const totalCompras = cliente.historialCompras.length;
  const ultimaCompra = cliente.historialCompras[0];

  return (
    <tr className="hover:bg-slate-50/80 transition-colors cursor-pointer group" onClick={onVerDetalle}>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3">
          <div className={`${avatarBg} w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0`}>
            <span className={`${avatarText} text-xs font-bold`}>
              {getInitials(cliente.nombre, cliente.apellido)}
            </span>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">
              {cliente.nombre} {cliente.apellido}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">Desde {formatFecha(cliente.fechaRegistro)}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5 text-sm text-slate-600">
          <Phone size={12} className="text-slate-400" />
          {cliente.telefono}
        </div>
      </td>
      <td className="px-4 py-3.5">
        {cliente.ebikePrincipal
          ? <span className="text-sm text-slate-700 font-medium">{cliente.ebikePrincipal}</span>
          : <span className="text-xs text-slate-400">Sin registrar</span>}
      </td>
      <td className="px-4 py-3.5 text-center">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
          totalCompras > 0 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
        }`}>
          {totalCompras} {totalCompras === 1 ? 'compra' : 'compras'}
        </span>
      </td>
      <td className="px-4 py-3.5">
        {ultimaCompra ? (
          <div>
            <p className="text-xs text-slate-600 font-medium">{formatFecha(ultimaCompra.fecha)}</p>
            <p className="text-xs text-slate-400 truncate max-w-[140px]">{ultimaCompra.producto}</p>
          </div>
        ) : <span className="text-xs text-slate-400">—</span>}
      </td>
      <td className="px-4 py-3.5 text-center">
        <span className="opacity-0 group-hover:opacity-100 inline-flex items-center gap-1 text-xs text-emerald-600 font-medium transition-opacity">
          Ver detalle <ChevronRight size={12} />
        </span>
      </td>
    </tr>
  );
}

// ── Tarjeta de stat (igual que Inventario) ───────────────────────────────────
const STAT_COLORS = {
  blue:   'bg-blue-50 text-blue-600',
  emerald:'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  amber:  'bg-amber-50 text-amber-600',
};

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`rounded-xl p-3 ${STAT_COLORS[color]}`}>
        <Icon size={20} />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
const HEADERS = [
  { label: 'Cliente',         align: '' },
  { label: 'Teléfono',        align: '' },
  { label: 'E-bike principal',align: '' },
  { label: 'Compras',         align: 'text-center' },
  { label: 'Última compra',   align: '' },
  { label: '',                align: 'text-center' },
];

export default function Clientes() {
  const { clientes, agregarCliente, editarCliente, eliminarCliente, agregarCompra, eliminarCompra } = useClientes();
  const [search, setSearch]               = useState('');
  const [detalleClienteId, setDetalleClienteId] = useState(null);
  const [showAdd, setShowAdd]             = useState(false);
  const [editando, setEditando]           = useState(null);
  const [eliminando, setEliminando]       = useState(null);
  const [addingCompra, setAddingCompra]   = useState(null); // guarda el id del cliente

  // Siempre derivado del array fresco → se actualiza automáticamente tras edits
  const clienteEnDetalle = detalleClienteId
    ? clientes.find((c) => c.id === detalleClienteId) ?? null
    : null;

  const filtrados = useMemo(() => {
    const term = search.toLowerCase();
    return clientes.filter((c) =>
      `${c.nombre} ${c.apellido}`.toLowerCase().includes(term) ||
      c.telefono.includes(term) ||
      (c.ebikePrincipal ?? '').toLowerCase().includes(term)
    );
  }, [clientes, search]);

  const stats = useMemo(() => {
    const ahora = new Date();
    const estesMes = clientes.filter((c) => {
      const f = new Date(c.fechaRegistro + 'T00:00:00');
      return f.getMonth() === ahora.getMonth() && f.getFullYear() === ahora.getFullYear();
    }).length;
    const totalCompras   = clientes.reduce((s, c) => s + c.historialCompras.length, 0);
    const totalFacturado = clientes.reduce(
      (s, c) => s + c.historialCompras.reduce((cs, cp) => cs + cp.precio, 0), 0
    );
    return { total: clientes.length, estesMes, totalCompras, totalFacturado };
  }, [clientes]);

  const handleEliminar = () => {
    if (!eliminando) return;
    if (clienteEnDetalle?.id === eliminando.id) setDetalleClienteId(null);
    eliminarCliente(eliminando.id);
    setEliminando(null);
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}       label="Total clientes"        value={stats.total}        color="blue"   />
        <StatCard icon={CalendarDays} label="Nuevos este mes"       value={stats.estesMes}     color="violet" />
        <StatCard icon={ShoppingBag} label="Compras registradas"   value={stats.totalCompras} color="emerald"/>
        <StatCard
          icon={DollarSign}
          label="Total facturado"
          value={`$${stats.totalFacturado.toLocaleString('es-AR', { minimumFractionDigits: 0 })}`}
          color="amber"
        />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Controles */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, teléfono o e-bike..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
            <Plus size={15} /> Agregar cliente
          </button>
        </div>

        {/* Tabla de clientes */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {HEADERS.map(({ label, align }, i) => (
                  <th key={label || i}
                    className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${align}`}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400 text-sm">
                    {search
                      ? 'No hay clientes que coincidan con la búsqueda.'
                      : 'No hay clientes registrados. ¡Agregá el primero!'}
                  </td>
                </tr>
              ) : (
                filtrados.map((c) => (
                  <ClienteRow
                    key={c.id}
                    cliente={c}
                    onVerDetalle={() => setDetalleClienteId(c.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {filtrados.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-400 bg-slate-50/50">
            Mostrando {filtrados.length} de {clientes.length} clientes
          </div>
        )}
      </div>

      {/* Drawer: detalle del cliente */}
      {clienteEnDetalle && (
        <ClienteDetalle
          cliente={clienteEnDetalle}
          onClose={() => setDetalleClienteId(null)}
          onEdit={() => setEditando({ ...clienteEnDetalle })}
          onDelete={() => setEliminando(clienteEnDetalle)}
          onAddCompra={() => setAddingCompra(clienteEnDetalle.id)}
          onDeleteCompra={(compraId) => eliminarCompra(clienteEnDetalle.id, compraId)}
        />
      )}

      {/* Modal: Agregar cliente */}
      {showAdd && (
        <Modal title="Agregar cliente" onClose={() => setShowAdd(false)}>
          <ClienteForm
            onGuardar={(datos) => { agregarCliente(datos); setShowAdd(false); }}
            onCancelar={() => setShowAdd(false)}
          />
        </Modal>
      )}

      {/* Modal: Editar cliente */}
      {editando && (
        <Modal title="Editar cliente" onClose={() => setEditando(null)}>
          <ClienteForm
            inicial={editando}
            onGuardar={(datos) => { editarCliente(editando.id, datos); setEditando(null); }}
            onCancelar={() => setEditando(null)}
          />
        </Modal>
      )}

      {/* Modal: Confirmar eliminación */}
      {eliminando && (
        <Modal title="Eliminar cliente" onClose={() => setEliminando(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700">
                Estás a punto de eliminar a{' '}
                <strong>{eliminando.nombre} {eliminando.apellido}</strong>{' '}
                y todo su historial de compras. Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEliminando(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={handleEliminar}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
                Eliminar cliente
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Registrar compra */}
      {addingCompra && (
        <Modal title="Registrar compra" onClose={() => setAddingCompra(null)}>
          <CompraForm
            onGuardar={(compra) => { agregarCompra(addingCompra, compra); setAddingCompra(null); }}
            onCancelar={() => setAddingCompra(null)}
          />
        </Modal>
      )}
    </div>
  );
}
