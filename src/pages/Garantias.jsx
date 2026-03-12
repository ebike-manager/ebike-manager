import { useState, useMemo } from 'react';
import {
  Plus, Search, Edit2, Trash2, Shield, AlertTriangle,
  CheckCircle, Clock, ChevronDown, ChevronUp,
} from 'lucide-react';
import Modal from '../components/Modal';
import { useGarantias } from '../hooks/useGarantias';
import { usePermissions } from '../hooks/usePermissions';
import { appendLog } from '../hooks/useActivityLog';

const DURACIONES = [
  { value: 3,  label: '3 meses' },
  { value: 6,  label: '6 meses' },
  { value: 12, label: '1 año' },
  { value: 24, label: '2 años' },
  { value: 36, label: '3 años' },
];

const FORM_VACIO = {
  clienteNombre: '', productoNombre: '', fechaCompra: new Date().toISOString().split('T')[0],
  duracionMeses: 12, notas: '',
};

const ESTADO_CONFIG = {
  activa:      { label: 'Activa',       icon: CheckCircle, color: 'bg-emerald-100 text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  por_vencer:  { label: 'Por vencer',   icon: Clock,       color: 'bg-amber-100 text-amber-700',     badge: 'bg-amber-100 text-amber-700' },
  vencida:     { label: 'Vencida',      icon: AlertTriangle, color: 'bg-red-100 text-red-700',       badge: 'bg-red-100 text-red-700' },
};

// ── Formulario ────────────────────────────────────────────────────────────────
function GarantiaForm({ inicial = {}, onGuardar, onCancelar }) {
  const [form, setForm] = useState({ ...FORM_VACIO, ...inicial });
  const [errors, setErrors] = useState({});

  const set = (f) => (e) => {
    setForm((p) => ({ ...p, [f]: e.target.value }));
    setErrors((er) => ({ ...er, [f]: null }));
  };

  const validar = () => {
    const e = {};
    if (!form.clienteNombre.trim()) e.clienteNombre = 'El nombre del cliente es requerido';
    if (!form.productoNombre.trim()) e.productoNombre = 'El nombre del producto es requerido';
    if (!form.fechaCompra) e.fechaCompra = 'La fecha de compra es requerida';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validar()) return;
    onGuardar({ ...form, duracionMeses: Number(form.duracionMeses) });
  };

  const inp = (f) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
      errors[f] ? 'border-red-400 bg-red-50' : 'border-slate-300'
    }`;

  // Compute preview of expiration
  const vencimiento = useMemo(() => {
    if (!form.fechaCompra || !form.duracionMeses) return '';
    const d = new Date(form.fechaCompra + 'T00:00:00');
    d.setMonth(d.getMonth() + Number(form.duracionMeses));
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });
  }, [form.fechaCompra, form.duracionMeses]);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cliente <span className="text-red-500">*</span>
          </label>
          <input value={form.clienteNombre} onChange={set('clienteNombre')} className={inp('clienteNombre')}
            placeholder="Nombre del cliente" autoFocus />
          {errors.clienteNombre && <p className="text-red-500 text-xs mt-1">{errors.clienteNombre}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Producto <span className="text-red-500">*</span>
          </label>
          <input value={form.productoNombre} onChange={set('productoNombre')} className={inp('productoNombre')}
            placeholder="Nombre del producto o e-bike" />
          {errors.productoNombre && <p className="text-red-500 text-xs mt-1">{errors.productoNombre}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Fecha de compra <span className="text-red-500">*</span>
          </label>
          <input type="date" value={form.fechaCompra} onChange={set('fechaCompra')} className={inp('fechaCompra')} />
          {errors.fechaCompra && <p className="text-red-500 text-xs mt-1">{errors.fechaCompra}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Duración de garantía</label>
          <select value={form.duracionMeses} onChange={set('duracionMeses')} className={inp('duracionMeses')}>
            {DURACIONES.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
      </div>

      {vencimiento && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700">
          <Shield size={13} className="flex-shrink-0" />
          Vencimiento: <strong>{vencimiento}</strong>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
        <textarea value={form.notas} onChange={set('notas')} rows={2}
          className={`${inp('notas')} resize-none`}
          placeholder="Términos especiales, número de serie, observaciones..." />
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" onClick={onCancelar}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
          Cancelar
        </button>
        <button type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
          Guardar garantía
        </button>
      </div>
    </form>
  );
}

// ── Banner de alertas ─────────────────────────────────────────────────────────
function AlertaBanner({ porVencer, vencidas }) {
  const [expanded, setExpanded] = useState(true);
  const total = porVencer.length + vencidas.length;
  if (total === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-100/50">
        <div className="flex items-center gap-2 text-amber-800">
          <AlertTriangle size={15} />
          <span className="text-sm font-semibold">
            {total === 1 ? '1 garantía requiere atención' : `${total} garantías requieren atención`}
          </span>
        </div>
        {expanded ? <ChevronUp size={15} className="text-amber-600" /> : <ChevronDown size={15} className="text-amber-600" />}
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-1.5">
          {vencidas.length > 0 && (
            <div className="text-xs text-red-700">
              <strong>Vencidas ({vencidas.length}):</strong>{' '}
              {vencidas.map((g) => `${g.clienteNombre} — ${g.productoNombre}`).join(', ')}
            </div>
          )}
          {porVencer.length > 0 && (
            <div className="text-xs text-amber-700">
              <strong>Por vencer en 30 días ({porVencer.length}):</strong>{' '}
              {porVencer.map((g) => `${g.clienteNombre} — ${g.productoNombre} (${g.diasRestantes} días)`).join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  const COLORS = {
    blue:    'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
    red:     'bg-red-50 text-red-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`rounded-xl p-3 ${COLORS[color]}`}><Icon size={20} /></div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function Garantias({ currentUser }) {
  const { garantias, agregarGarantia, editarGarantia, eliminarGarantia } = useGarantias();
  const perms = usePermissions(currentUser);

  const [search, setSearch]         = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [showAdd, setShowAdd]       = useState(false);
  const [editando, setEditando]     = useState(null);
  const [eliminando, setEliminando] = useState(null);

  const filtradas = useMemo(() => {
    const t = search.toLowerCase();
    return garantias.filter((g) => {
      const matchSearch = g.clienteNombre.toLowerCase().includes(t) || g.productoNombre.toLowerCase().includes(t);
      const matchEstado = estadoFiltro === 'todos' || g.estado === estadoFiltro;
      return matchSearch && matchEstado;
    });
  }, [garantias, search, estadoFiltro]);

  const stats = useMemo(() => ({
    total:     garantias.length,
    activas:   garantias.filter((g) => g.estado === 'activa').length,
    porVencer: garantias.filter((g) => g.estado === 'por_vencer'),
    vencidas:  garantias.filter((g) => g.estado === 'vencida'),
  }), [garantias]);

  const handleGuardar = (datos) => {
    if (editando) {
      editarGarantia(editando.id, datos);
      appendLog(`Editó garantía de "${datos.clienteNombre}"`, 'Garantías');
      setEditando(null);
    } else {
      agregarGarantia(datos);
      appendLog(`Registró garantía de "${datos.clienteNombre}" — ${datos.productoNombre}`, 'Garantías');
      setShowAdd(false);
    }
  };

  const handleEliminar = () => {
    appendLog(`Eliminó garantía de "${eliminando.clienteNombre}"`, 'Garantías');
    eliminarGarantia(eliminando.id);
    setEliminando(null);
  };

  return (
    <div className="space-y-5">
      {/* Alert banner */}
      <AlertaBanner porVencer={stats.porVencer} vencidas={stats.vencidas} />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Shield}       label="Total garantías"  value={stats.total}              color="blue"    />
        <StatCard icon={CheckCircle}  label="Activas"          value={stats.activas}            color="emerald" />
        <StatCard icon={Clock}        label="Por vencer"       value={stats.porVencer.length}   color="amber"   />
        <StatCard icon={AlertTriangle} label="Vencidas"        value={stats.vencidas.length}    color="red"     />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cliente o producto..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
              <option value="todos">Todos</option>
              <option value="activa">Activas</option>
              <option value="por_vencer">Por vencer</option>
              <option value="vencida">Vencidas</option>
            </select>
          </div>
          {perms.canManageGarantias && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">
              <Plus size={15} />
              Registrar garantía
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Cliente', 'Producto', 'Fecha compra', 'Duración', 'Vencimiento', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400 text-sm">
                    {search || estadoFiltro !== 'todos' ? 'No hay garantías que coincidan.' : 'No hay garantías registradas.'}
                  </td>
                </tr>
              ) : filtradas.map((g) => {
                const ec = ESTADO_CONFIG[g.estado];
                const EstadoIcon = ec.icon;
                return (
                  <tr key={g.id} className="hover:bg-slate-50/80 group">
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-slate-800">{g.clienteNombre}</p>
                      {g.notas && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{g.notas}</p>}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-700">{g.productoNombre}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {new Date(g.fechaCompra + 'T00:00:00').toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {g.duracionMeses >= 12 ? `${g.duracionMeses / 12} año${g.duracionMeses / 12 > 1 ? 's' : ''}` : `${g.duracionMeses} meses`}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {new Date(g.fechaVencimiento + 'T00:00:00').toLocaleDateString('es-AR')}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${ec.badge}`}>
                          <EstadoIcon size={10} />
                          {ec.label}
                        </span>
                        {g.estado === 'por_vencer' && (
                          <span className="text-xs text-amber-600 font-medium">{g.diasRestantes}d</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {perms.canManageGarantias && (
                          <>
                            <button onClick={() => setEditando(g)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => setEliminando(g)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtradas.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-400 bg-slate-50/50">
            Mostrando {filtradas.length} de {garantias.length} garantías
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <Modal title="Registrar garantía" onClose={() => setShowAdd(false)}>
          <GarantiaForm onGuardar={handleGuardar} onCancelar={() => setShowAdd(false)} />
        </Modal>
      )}
      {editando && (
        <Modal title="Editar garantía" onClose={() => setEditando(null)}>
          <GarantiaForm inicial={editando} onGuardar={handleGuardar} onCancelar={() => setEditando(null)} />
        </Modal>
      )}
      {eliminando && (
        <Modal title="Eliminar garantía" onClose={() => setEliminando(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700">
                ¿Eliminar la garantía de <strong>{eliminando.clienteNombre}</strong> para <strong>{eliminando.productoNombre}</strong>?
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEliminando(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={handleEliminar}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
                Eliminar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
