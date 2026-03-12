import { useState, useMemo } from 'react';
import {
  Plus, Search, Edit2, Trash2, Wrench, AlertTriangle,
  ChevronRight, Phone, DollarSign, Clock,
} from 'lucide-react';
import Modal from '../components/Modal';
import { useServicioTecnico, ESTADOS_SERVICIO } from '../hooks/useServicioTecnico';
import { usePermissions } from '../hooks/usePermissions';
import { appendLog } from '../hooks/useActivityLog';
import { formatMoney } from '../utils/moneda';

const FORM_VACIO = {
  clienteNombre: '', clienteTelefono: '', ebike: '',
  problemaReportado: '', diagnostico: '', costo: '', moneda: 'USD',
  estado: 'pendiente', fechaIngreso: new Date().toISOString().split('T')[0],
  fechaEstimadaEntrega: '', notas: '',
};

const ESTADO_NEXT = {
  pendiente:  'en_proceso',
  en_proceso: 'listo',
  listo:      'entregado',
  entregado:  null,
};

// ── Formulario ────────────────────────────────────────────────────────────────
function OrdenForm({ inicial = {}, onGuardar, onCancelar }) {
  const [form, setForm] = useState({ ...FORM_VACIO, ...inicial,
    costo: inicial.costo != null ? String(inicial.costo) : '',
  });
  const [errors, setErrors] = useState({});

  const set = (f) => (e) => {
    setForm((p) => ({ ...p, [f]: e.target.value }));
    setErrors((er) => ({ ...er, [f]: null }));
  };

  const validar = () => {
    const e = {};
    if (!form.clienteNombre.trim()) e.clienteNombre = 'El nombre del cliente es requerido';
    if (!form.ebike.trim()) e.ebike = 'La e-bike es requerida';
    if (!form.problemaReportado.trim()) e.problemaReportado = 'El problema reportado es requerido';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validar()) return;
    onGuardar({ ...form, costo: form.costo ? parseFloat(form.costo) : 0 });
  };

  const inp = (f) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
      errors[f] ? 'border-red-400 bg-red-50' : 'border-slate-300'
    }`;

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
          <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
          <input value={form.clienteTelefono} onChange={set('clienteTelefono')} className={inp('clienteTelefono')}
            placeholder="+598 99 000 000" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          E-Bike / Equipo <span className="text-red-500">*</span>
        </label>
        <input value={form.ebike} onChange={set('ebike')} className={inp('ebike')}
          placeholder="Modelo y descripción del equipo" />
        {errors.ebike && <p className="text-red-500 text-xs mt-1">{errors.ebike}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Problema reportado <span className="text-red-500">*</span>
        </label>
        <textarea value={form.problemaReportado} onChange={set('problemaReportado')} rows={2}
          className={`${inp('problemaReportado')} resize-none`}
          placeholder="Describí el problema que reporta el cliente" />
        {errors.problemaReportado && <p className="text-red-500 text-xs mt-1">{errors.problemaReportado}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Diagnóstico técnico</label>
        <textarea value={form.diagnostico} onChange={set('diagnostico')} rows={2}
          className={`${inp('diagnostico')} resize-none`}
          placeholder="Diagnóstico del técnico (completar después del análisis)" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Costo</label>
          <input type="number" min="0" step="0.01" value={form.costo} onChange={set('costo')}
            className={inp('costo')} placeholder="0.00" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
          <select value={form.moneda} onChange={set('moneda')} className={inp('moneda')}>
            <option value="USD">USD</option>
            <option value="UYU">UYU</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
          <select value={form.estado} onChange={set('estado')} className={inp('estado')}>
            {ESTADOS_SERVICIO.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Ingreso</label>
          <input type="date" value={form.fechaIngreso} onChange={set('fechaIngreso')} className={inp('fechaIngreso')} />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Fecha estimada de entrega</label>
        <input type="date" value={form.fechaEstimadaEntrega} onChange={set('fechaEstimadaEntrega')}
          className={inp('fechaEstimadaEntrega')} />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
        <textarea value={form.notas} onChange={set('notas')} rows={2}
          className={`${inp('notas')} resize-none`}
          placeholder="Información adicional, repuestos necesarios, etc." />
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" onClick={onCancelar}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
          Cancelar
        </button>
        <button type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
          Guardar orden
        </button>
      </div>
    </form>
  );
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color }) {
  const COLORS = {
    blue:    'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50 text-amber-600',
    violet:  'bg-violet-50 text-violet-600',
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
export default function ServicioTecnico({ currentUser }) {
  const { ordenes, agregarOrden, editarOrden, cambiarEstado, eliminarOrden } = useServicioTecnico();
  const perms = usePermissions(currentUser);

  const [search, setSearch]           = useState('');
  const [estadoFiltro, setEstadoFiltro] = useState('todos');
  const [showAdd, setShowAdd]         = useState(false);
  const [editando, setEditando]       = useState(null);
  const [eliminando, setEliminando]   = useState(null);
  const [detalle, setDetalle]         = useState(null);

  const filtradas = useMemo(() => {
    const t = search.toLowerCase();
    return ordenes.filter((o) => {
      const matchSearch = o.clienteNombre.toLowerCase().includes(t) || o.ebike.toLowerCase().includes(t);
      const matchEstado = estadoFiltro === 'todos' || o.estado === estadoFiltro;
      return matchSearch && matchEstado;
    });
  }, [ordenes, search, estadoFiltro]);

  const stats = useMemo(() => ({
    total:     ordenes.length,
    pendientes: ordenes.filter((o) => o.estado === 'pendiente').length,
    enProceso:  ordenes.filter((o) => o.estado === 'en_proceso').length,
    listos:     ordenes.filter((o) => o.estado === 'listo').length,
  }), [ordenes]);

  const handleGuardar = (datos) => {
    if (editando) {
      editarOrden(editando.id, datos);
      appendLog(`Editó orden de servicio de "${datos.clienteNombre}"`, 'Servicio Técnico');
      setEditando(null);
    } else {
      agregarOrden(datos);
      appendLog(`Creó orden de servicio para "${datos.clienteNombre}" — ${datos.ebike}`, 'Servicio Técnico');
      setShowAdd(false);
    }
  };

  const handleAvanzarEstado = (orden) => {
    const next = ESTADO_NEXT[orden.estado];
    if (!next) return;
    cambiarEstado(orden.id, next);
    appendLog(`Cambió estado de orden de "${orden.clienteNombre}" → ${next}`, 'Servicio Técnico');
  };

  const handleEliminar = () => {
    appendLog(`Eliminó orden de servicio de "${eliminando.clienteNombre}"`, 'Servicio Técnico');
    eliminarOrden(eliminando.id);
    setEliminando(null);
  };

  const getEstadoConfig = (id) => ESTADOS_SERVICIO.find((e) => e.id === id) ?? ESTADOS_SERVICIO[0];
  const getNextEstado = (id) => ESTADOS_SERVICIO.find((e) => e.id === ESTADO_NEXT[id]);

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={Wrench}    label="Total órdenes"    value={stats.total}      color="blue"    />
        <StatCard icon={Clock}     label="Pendientes"       value={stats.pendientes} color="amber"   />
        <StatCard icon={Wrench}    label="En proceso"       value={stats.enProceso}  color="violet"  />
        <StatCard icon={Phone}     label="Listos a entregar" value={stats.listos}    color="emerald" />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por cliente o e-bike..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
              <option value="todos">Todos</option>
              {ESTADOS_SERVICIO.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
            </select>
          </div>
          {perms.canManageServicio && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">
              <Plus size={15} />
              Nueva orden
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Cliente / E-Bike', 'Problema', 'Estado', 'Costo', 'Ingreso', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400 text-sm">
                    {search || estadoFiltro !== 'todos' ? 'No hay órdenes que coincidan.' : 'No hay órdenes de servicio. ¡Creá la primera!'}
                  </td>
                </tr>
              ) : filtradas.map((o) => {
                const ec = getEstadoConfig(o.estado);
                const nextEst = getNextEstado(o.estado);
                return (
                  <tr key={o.id} className="hover:bg-slate-50/80 group cursor-pointer" onClick={() => setDetalle(o)}>
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-slate-800">{o.clienteNombre}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{o.ebike}</p>
                      {o.clienteTelefono && (
                        <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <Phone size={9} />{o.clienteTelefono}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-sm text-slate-700 line-clamp-2 max-w-xs">{o.problemaReportado}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ec.color}`}>
                        {ec.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm font-semibold text-slate-900">
                        {o.costo > 0 ? formatMoney(o.costo, o.moneda) : <span className="text-slate-400 font-normal">—</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {o.fechaIngreso ? new Date(o.fechaIngreso + 'T00:00:00').toLocaleDateString('es-AR') : '—'}
                    </td>
                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {perms.canManageServicio && nextEst && (
                          <button onClick={() => handleAvanzarEstado(o)}
                            title={`Avanzar a: ${nextEst.label}`}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100">
                            {nextEst.label} <ChevronRight size={12} />
                          </button>
                        )}
                        {perms.canManageServicio && (
                          <>
                            <button onClick={() => setEditando(o)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => setEliminando(o)}
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
            Mostrando {filtradas.length} de {ordenes.length} órdenes
          </div>
        )}
      </div>

      {/* Detail modal */}
      {detalle && (
        <Modal title="Detalle de orden" onClose={() => setDetalle(null)} size="lg">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Cliente</p>
                <p className="text-sm font-semibold text-slate-900">{detalle.clienteNombre}</p>
                {detalle.clienteTelefono && (
                  <a href={`tel:${detalle.clienteTelefono}`} className="text-xs text-emerald-600 hover:underline">{detalle.clienteTelefono}</a>
                )}
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">E-Bike</p>
                <p className="text-sm text-slate-800">{detalle.ebike}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Estado</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoConfig(detalle.estado).color}`}>
                  {getEstadoConfig(detalle.estado).label}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1">Costo</p>
                <p className="text-sm font-bold text-slate-900">{detalle.costo > 0 ? formatMoney(detalle.costo, detalle.moneda) : '—'}</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-xs text-slate-500 font-medium mb-1">Problema reportado</p>
              <p className="text-sm text-slate-800">{detalle.problemaReportado}</p>
            </div>

            {detalle.diagnostico && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-600 font-medium mb-1">Diagnóstico técnico</p>
                <p className="text-sm text-slate-800">{detalle.diagnostico}</p>
              </div>
            )}

            {detalle.notas && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs text-amber-600 font-medium mb-1">Notas</p>
                <p className="text-sm text-slate-800">{detalle.notas}</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <div className="flex gap-4 text-xs text-slate-500">
                {detalle.fechaIngreso && <span>Ingreso: {new Date(detalle.fechaIngreso + 'T00:00:00').toLocaleDateString('es-AR')}</span>}
                {detalle.fechaEstimadaEntrega && <span>Entrega estimada: {new Date(detalle.fechaEstimadaEntrega + 'T00:00:00').toLocaleDateString('es-AR')}</span>}
              </div>
              {perms.canManageServicio && ESTADO_NEXT[detalle.estado] && (
                <button
                  onClick={() => { handleAvanzarEstado(detalle); setDetalle(null); }}
                  className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">
                  Avanzar a {getNextEstado(detalle.estado)?.label} <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Add/Edit modal */}
      {showAdd && (
        <Modal title="Nueva orden de servicio" onClose={() => setShowAdd(false)} size="lg">
          <OrdenForm onGuardar={handleGuardar} onCancelar={() => setShowAdd(false)} />
        </Modal>
      )}
      {editando && (
        <Modal title="Editar orden" onClose={() => setEditando(null)} size="lg">
          <OrdenForm inicial={editando} onGuardar={handleGuardar} onCancelar={() => setEditando(null)} />
        </Modal>
      )}

      {/* Delete confirmation */}
      {eliminando && (
        <Modal title="Eliminar orden" onClose={() => setEliminando(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700">
                ¿Eliminar la orden de <strong>{eliminando.clienteNombre}</strong> ({eliminando.ebike})?
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
