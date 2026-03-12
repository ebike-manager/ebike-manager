import { useState, useMemo } from 'react';
import {
  Plus, Search, Edit2, Trash2, Globe, Phone, Mail,
  Truck, CreditCard, AlertTriangle, Package,
} from 'lucide-react';
import Modal from '../components/Modal';
import { useProveedores } from '../hooks/useProveedores';
import { usePermissions } from '../hooks/usePermissions';
import { appendLog } from '../hooks/useActivityLog';

const PAISES = ['Argentina', 'Brasil', 'China', 'Colombia', 'España', 'México', 'Taiwan', 'Uruguay', 'USA', 'Otro'];

const FORM_VACIO = {
  nombre: '', pais: 'China', contacto: '', email: '',
  telefono: '', condicionesPago: '', tiempoEntregaDias: '', notas: '',
};

// ── Formulario ───────────────────────────────────────────────────────────────
function ProveedorForm({ inicial = {}, onGuardar, onCancelar }) {
  const [form, setForm] = useState({ ...FORM_VACIO, ...inicial });
  const [errors, setErrors] = useState({});

  const set = (f) => (e) => {
    setForm((p) => ({ ...p, [f]: e.target.value }));
    setErrors((er) => ({ ...er, [f]: null }));
  };

  const validar = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'El nombre es requerido';
    if (!form.contacto.trim()) e.contacto = 'El contacto es requerido';
    if (form.tiempoEntregaDias !== '' && isNaN(Number(form.tiempoEntregaDias)))
      e.tiempoEntregaDias = 'Debe ser un número';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validar()) return;
    onGuardar({ ...form, tiempoEntregaDias: form.tiempoEntregaDias ? Number(form.tiempoEntregaDias) : null });
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
            Nombre <span className="text-red-500">*</span>
          </label>
          <input value={form.nombre} onChange={set('nombre')} className={inp('nombre')}
            placeholder="Ej: BafangParts China" autoFocus />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">País</label>
          <select value={form.pais} onChange={set('pais')} className={inp('pais')}>
            {PAISES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Contacto <span className="text-red-500">*</span>
          </label>
          <input value={form.contacto} onChange={set('contacto')} className={inp('contacto')}
            placeholder="Nombre del responsable" />
          {errors.contacto && <p className="text-red-500 text-xs mt-1">{errors.contacto}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Tiempo entrega (días)</label>
          <input type="number" min="0" value={form.tiempoEntregaDias} onChange={set('tiempoEntregaDias')}
            className={inp('tiempoEntregaDias')} placeholder="Ej: 30" />
          {errors.tiempoEntregaDias && <p className="text-red-500 text-xs mt-1">{errors.tiempoEntregaDias}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={set('email')} className={inp('email')}
            placeholder="ventas@proveedor.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
          <input value={form.telefono} onChange={set('telefono')} className={inp('telefono')}
            placeholder="+598 99 000 000" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Condiciones de pago</label>
        <input value={form.condicionesPago} onChange={set('condicionesPago')} className={inp('condicionesPago')}
          placeholder="Ej: 50% adelanto, 50% contra entrega" />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notas</label>
        <textarea value={form.notas} onChange={set('notas')} rows={2}
          className={`${inp('notas')} resize-none`}
          placeholder="Mínimo de compra, certificaciones, notas importantes..." />
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" onClick={onCancelar}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
          Cancelar
        </button>
        <button type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
          Guardar proveedor
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
    violet:  'bg-violet-50 text-violet-600',
    amber:   'bg-amber-50 text-amber-600',
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
export default function Proveedores({ currentUser }) {
  const { proveedores, agregarProveedor, editarProveedor, eliminarProveedor } = useProveedores();
  const perms = usePermissions(currentUser);

  const [search, setSearch]       = useState('');
  const [paisFiltro, setPaisFiltro] = useState('todos');
  const [showAdd, setShowAdd]     = useState(false);
  const [editando, setEditando]   = useState(null);
  const [eliminando, setEliminando] = useState(null);

  const filtrados = useMemo(() => {
    const t = search.toLowerCase();
    return proveedores.filter((p) => {
      const matchSearch = p.nombre.toLowerCase().includes(t) || p.contacto.toLowerCase().includes(t);
      const matchPais = paisFiltro === 'todos' || p.pais === paisFiltro;
      return matchSearch && matchPais;
    });
  }, [proveedores, search, paisFiltro]);

  const stats = useMemo(() => {
    const paises = new Set(proveedores.map((p) => p.pais)).size;
    const entrega = proveedores.filter((p) => p.tiempoEntregaDias).map((p) => p.tiempoEntregaDias);
    const promedioEntrega = entrega.length ? Math.round(entrega.reduce((s, v) => s + v, 0) / entrega.length) : 0;
    return { total: proveedores.length, paises, promedioEntrega };
  }, [proveedores]);

  const paisesFiltro = [...new Set(proveedores.map((p) => p.pais))].sort();

  const handleGuardar = (datos) => {
    if (editando) {
      editarProveedor(editando.id, datos);
      appendLog(`Editó proveedor "${datos.nombre}"`, 'Proveedores');
      setEditando(null);
    } else {
      agregarProveedor(datos);
      appendLog(`Creó proveedor "${datos.nombre}"`, 'Proveedores');
      setShowAdd(false);
    }
  };

  const handleEliminar = () => {
    appendLog(`Eliminó proveedor "${eliminando.nombre}"`, 'Proveedores');
    eliminarProveedor(eliminando.id);
    setEliminando(null);
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Package} label="Total proveedores" value={stats.total} color="blue" />
        <StatCard icon={Globe}   label="Países"            value={stats.paises} color="violet" />
        <StatCard icon={Truck}   label="Entrega promedio"  value={stats.promedioEntrega ? `${stats.promedioEntrega} días` : '—'} color="emerald" />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="px-4 py-3 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar proveedores..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            </div>
            <select value={paisFiltro} onChange={(e) => setPaisFiltro(e.target.value)}
              className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white">
              <option value="todos">Todos los países</option>
              {paisesFiltro.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          {perms.canManageProveedores && (
            <button onClick={() => setShowAdd(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700">
              <Plus size={15} />
              Agregar proveedor
            </button>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Proveedor', 'País', 'Contacto', 'Condiciones de pago', 'Entrega', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400 text-sm">
                    {search || paisFiltro !== 'todos' ? 'No hay proveedores que coincidan.' : 'No hay proveedores registrados. ¡Agregá el primero!'}
                  </td>
                </tr>
              ) : filtrados.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 group">
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-semibold text-slate-800">{p.nombre}</p>
                    {p.notas && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-xs">{p.notas}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="flex items-center gap-1 text-sm text-slate-700">
                      <Globe size={12} className="text-slate-400" /> {p.pais}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-medium text-slate-800">{p.contacto}</p>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      {p.email && (
                        <a href={`mailto:${p.email}`} className="text-xs text-emerald-600 hover:underline flex items-center gap-1">
                          <Mail size={10} />{p.email}
                        </a>
                      )}
                      {p.telefono && (
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Phone size={10} />{p.telefono}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="flex items-center gap-1 text-sm text-slate-700">
                      <CreditCard size={12} className="text-slate-400 flex-shrink-0" />
                      <span className="line-clamp-1">{p.condicionesPago || '—'}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {p.tiempoEntregaDias ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        <Truck size={10} /> {p.tiempoEntregaDias} días
                      </span>
                    ) : <span className="text-slate-400 text-sm">—</span>}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {perms.canManageProveedores && (
                        <>
                          <button onClick={() => setEditando(p)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                            <Edit2 size={14} />
                          </button>
                          <button onClick={() => setEliminando(p)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtrados.length > 0 && (
          <div className="px-4 py-2.5 border-t border-slate-100 text-xs text-slate-400 bg-slate-50/50">
            Mostrando {filtrados.length} de {proveedores.length} proveedores
          </div>
        )}
      </div>

      {/* Modals */}
      {showAdd && (
        <Modal title="Agregar proveedor" onClose={() => setShowAdd(false)}>
          <ProveedorForm onGuardar={handleGuardar} onCancelar={() => setShowAdd(false)} />
        </Modal>
      )}
      {editando && (
        <Modal title="Editar proveedor" onClose={() => setEditando(null)}>
          <ProveedorForm inicial={editando} onGuardar={handleGuardar} onCancelar={() => setEditando(null)} />
        </Modal>
      )}
      {eliminando && (
        <Modal title="Eliminar proveedor" onClose={() => setEliminando(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700">
                Estás a punto de eliminar <strong>{eliminando.nombre}</strong>. Esta acción no se puede deshacer.
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
