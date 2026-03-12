import { useState, useMemo, useEffect } from 'react';
import {
  Save, Plus, Edit2, Trash2, Eye, EyeOff,
  AlertTriangle, ShieldAlert, Check, Users, Building2,
  Activity, Shield, Clock, Search,
} from 'lucide-react';
import Modal from '../components/Modal';
import { useConfig }       from '../hooks/useConfig';
import { useActivityLog }  from '../hooks/useActivityLog';
import { usePermissions, ROLES_DESCRIPCION, ROL_LABELS } from '../hooks/usePermissions';

// ── Formulario de usuario ────────────────────────────────────────────────────
const USER_VACIO = { nombre: '', email: '', rol: 'vendedor', password: '', activo: true };

function UsuarioForm({ inicial = {}, esNuevo, onGuardar, onCancelar }) {
  const [form, setForm] = useState({ ...USER_VACIO, ...inicial, password: '' });
  const [showPass, setShowPass] = useState(false);
  const [errors, setErrors]     = useState({});

  const set = (field) => (e) =>
    setForm((f) => ({ ...f, [field]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const validar = () => {
    const e = {};
    if (!form.nombre.trim())           e.nombre   = 'El nombre es requerido';
    if (!form.email.trim())            e.email    = 'El email es requerido';
    if (esNuevo && !form.password)     e.password = 'La contraseña es requerida';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validar()) return;
    const datos = { ...form };
    if (!esNuevo && !form.password) delete datos.password; // no cambiar si está vacío
    onGuardar(datos);
  };

  const inputCls = (err) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
      err ? 'border-red-400 bg-red-50' : 'border-slate-300'
    }`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input type="text" value={form.nombre} onChange={set('nombre')}
            className={inputCls(errors.nombre)} placeholder="Juan Pérez" autoFocus />
          {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
          <select value={form.rol} onChange={set('rol')} className={inputCls(false)}>
            <option value="admin">Administrador</option>
            <option value="vendedor">Vendedor</option>
            <option value="viewer">Solo lectura</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Email <span className="text-red-500">*</span>
        </label>
        <input type="email" value={form.email} onChange={set('email')}
          className={inputCls(errors.email)} placeholder="usuario@ebike.com" />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Contraseña {esNuevo && <span className="text-red-500">*</span>}
          {!esNuevo && <span className="text-slate-400 font-normal ml-1">(dejar vacío para no cambiar)</span>}
        </label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            value={form.password} onChange={set('password')}
            className={`${inputCls(errors.password)} pr-10`}
            placeholder={esNuevo ? 'Mínimo 6 caracteres' : '••••••••'} />
          <button type="button" onClick={() => setShowPass((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="activo" checked={form.activo} onChange={set('activo')}
          className="w-4 h-4 text-emerald-600 border-slate-300 rounded" />
        <label htmlFor="activo" className="text-sm text-slate-700">Usuario activo</label>
      </div>

      <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
        <button type="button" onClick={onCancelar}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
          Cancelar
        </button>
        <button type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700">
          {esNuevo ? 'Agregar usuario' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}

// ── Sección Log de Actividad ──────────────────────────────────────────────────
function LogActividad() {
  const { log, limpiarLog, refresh } = useActivityLog();

  // Fetch log on mount
  useEffect(() => { refresh(); }, [refresh]);
  const [searchLog, setSearchLog]     = useState('');
  const [filtroDias, setFiltroDias]   = useState('30');
  const [filtroModulo, setFiltroModulo] = useState('');

  const modulos = useMemo(() => {
    const set = new Set(log.map((e) => e.modulo).filter(Boolean));
    return [...set].sort();
  }, [log]);

  const filtrado = useMemo(() => {
    const ahora = new Date();
    const dias  = parseInt(filtroDias, 10);
    return log.filter((e) => {
      if (dias > 0) {
        const diff = (ahora - new Date(e.timestamp)) / (1000 * 60 * 60 * 24);
        if (diff > dias) return false;
      }
      if (filtroModulo && e.modulo !== filtroModulo) return false;
      const term = searchLog.toLowerCase();
      if (term) {
        return (
          e.accion.toLowerCase().includes(term) ||
          e.usuario.toLowerCase().includes(term) ||
          (e.detalles ?? '').toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [log, filtroDias, filtroModulo, searchLog]);

  const formatTs = (ts) => {
    const d = new Date(ts);
    return d.toLocaleDateString('es-AR', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-slate-100 p-2 rounded-lg">
            <Activity size={16} className="text-slate-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Log de actividad</h2>
            <p className="text-xs text-slate-400">{log.length} entradas registradas</p>
          </div>
        </div>
        {log.length > 0 && (
          <button
            onClick={() => { if (window.confirm('¿Limpiar el log de actividad?')) limpiarLog(); }}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded hover:bg-red-50"
          >
            Limpiar log
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-2 items-center bg-slate-50/50">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
          <input
            type="text"
            value={searchLog}
            onChange={(e) => setSearchLog(e.target.value)}
            placeholder="Buscar..."
            className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44"
          />
        </div>
        <select
          value={filtroDias}
          onChange={(e) => setFiltroDias(e.target.value)}
          className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="7">Últimos 7 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
          <option value="0">Todo</option>
        </select>
        <select
          value={filtroModulo}
          onChange={(e) => setFiltroModulo(e.target.value)}
          className="border border-slate-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">Todos los módulos</option>
          {modulos.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <span className="text-xs text-slate-400 ml-auto">{filtrado.length} resultados</span>
      </div>

      <div className="overflow-x-auto">
        {filtrado.length === 0 ? (
          <div className="py-12 text-center">
            <Clock size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">No hay registros en este período.</p>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Fecha y hora', 'Usuario', 'Acción', 'Módulo', 'Detalles'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtrado.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">{formatTs(e.timestamp)}</td>
                  <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{e.usuario}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-700">{e.accion}</td>
                  <td className="px-4 py-2.5">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 capitalize">
                      {e.modulo ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500 max-w-[200px] truncate">{e.detalles || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function Configuracion({ currentUser }) {
  const {
    empresa, actualizarEmpresa,
    usuarios, agregarUsuario, editarUsuario, eliminarUsuario,
  } = useConfig();
  const perms = usePermissions(currentUser);

  const [empresaForm, setEmpresaForm] = useState(empresa);
  const [guardado, setGuardado]       = useState(false);
  const [showAdd, setShowAdd]         = useState(false);
  const [editando, setEditando]       = useState(null);
  const [eliminando, setEliminando]   = useState(null);

  const handleGuardarEmpresa = async (e) => {
    e.preventDefault();
    await actualizarEmpresa(empresaForm);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
  };

  const [userError, setUserError] = useState('');

  const handleGuardarUsuario = async (datos) => {
    setUserError('');
    try {
      if (editando) {
        await editarUsuario(editando.id, datos);
        setEditando(null);
      } else {
        await agregarUsuario(datos);
        setShowAdd(false);
      }
    } catch (err) {
      setUserError(err.message || 'Error al guardar usuario');
    }
  };

  const handleEliminar = async () => {
    if (eliminando) { await eliminarUsuario(eliminando.id); setEliminando(null); }
  };

  const ROL_BADGE = {
    admin:    'bg-violet-100 text-violet-700',
    vendedor: 'bg-blue-100 text-blue-700',
    viewer:   'bg-slate-100 text-slate-600',
  };
  const ROL_LABEL = {
    admin:    'Admin',
    vendedor: 'Vendedor',
    viewer:   'Solo lectura',
  };

  return (
    <div className="space-y-6 max-w-3xl">

      {/* ── Sección empresa ── */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="bg-slate-100 p-2 rounded-lg">
            <Building2 size={16} className="text-slate-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Datos de la empresa</h2>
            <p className="text-xs text-slate-400">Esta info aparece en el panel y en la pantalla de login</p>
          </div>
        </div>

        <form onSubmit={handleGuardarEmpresa} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de la empresa</label>
            <input type="text" value={empresaForm.nombre}
              onChange={(e) => setEmpresaForm((f) => ({ ...f, nombre: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Mi Tienda de E-Bikes" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Eslogan</label>
            <input type="text" value={empresaForm.slogan}
              onChange={(e) => setEmpresaForm((f) => ({ ...f, slogan: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Movilidad eléctrica inteligente" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Moneda del sistema</label>
            <select
              value={empresaForm.moneda ?? 'USD'}
              onChange={(e) => setEmpresaForm((f) => ({ ...f, moneda: e.target.value }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              <option value="USD">Dólar estadounidense (US$)</option>
              <option value="UYU">Peso uruguayo ($U)</option>
            </select>
            <p className="text-xs text-slate-400 mt-1">
              Se usa para mostrar precios en Inventario, Ventas y Reportes.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-1">
            <button type="submit"
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
              <Save size={14} /> Guardar cambios
            </button>
            {guardado && (
              <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
                <Check size={14} /> Guardado
              </span>
            )}
          </div>
        </form>
      </section>

      {/* ── Sección usuarios ── */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="bg-slate-100 p-2 rounded-lg">
              <Users size={16} className="text-slate-600" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Usuarios del sistema</h2>
              <p className="text-xs text-slate-400">{usuarios.length} {usuarios.length === 1 ? 'usuario' : 'usuarios'} registrados</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors">
            <Plus size={14} /> Agregar usuario
          </button>
        </div>

        {/* Aviso de seguridad */}
        <div className="flex items-start gap-2.5 px-6 py-3 bg-emerald-50 border-b border-emerald-100">
          <ShieldAlert size={15} className="text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-emerald-700 leading-relaxed">
            <strong>Supabase Auth:</strong> Los usuarios se autentican de forma segura a través de Supabase.
            Las contraseñas se encriptan y almacenan de forma segura en la nube.
          </p>
        </div>

        {userError && (
          <div className="flex items-start gap-2.5 px-6 py-3 bg-red-50 border-b border-red-100">
            <AlertTriangle size={15} className="text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{userError}</p>
          </div>
        )}

        {/* Tabla de usuarios */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {['Usuario', 'Email', 'Rol', 'Estado', 'Acciones'].map((h) => (
                  <th key={h} className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="px-4 py-3.5">
                    <p className="text-sm font-semibold text-slate-800">{u.nombre}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-slate-600">{u.email}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${ROL_BADGE[u.rol] ?? 'bg-slate-100 text-slate-600'}`}>
                      {ROL_LABEL[u.rol] ?? u.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      u.activo ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditando({ ...u })}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Editar usuario">
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setEliminando(u)}
                        disabled={usuarios.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title={usuarios.length <= 1 ? 'Debe haber al menos un usuario' : 'Eliminar usuario'}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Roles y Permisos ── */}
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
          <div className="bg-slate-100 p-2 rounded-lg">
            <Shield size={16} className="text-slate-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-900">Roles y permisos</h2>
            <p className="text-xs text-slate-400">Qué puede hacer cada tipo de usuario</p>
          </div>
        </div>

        <div className="p-6 space-y-3">
          {ROLES_DESCRIPCION.map((r) => {
            const rolInfo = ROL_LABELS[r.rol];
            return (
              <div key={r.rol} className="flex items-start gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                <span className={`mt-0.5 inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${rolInfo?.color ?? 'bg-slate-100 text-slate-600'}`}>
                  {r.label}
                </span>
                <p className="text-sm text-slate-600 leading-relaxed">{r.descripcion}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Log de actividad (solo admin) ── */}
      {perms.canViewLog && <LogActividad />}

      {/* Modal: Agregar usuario */}
      {showAdd && (
        <Modal title="Agregar usuario" onClose={() => setShowAdd(false)}>
          <UsuarioForm esNuevo onGuardar={handleGuardarUsuario} onCancelar={() => setShowAdd(false)} />
        </Modal>
      )}

      {/* Modal: Editar usuario */}
      {editando && (
        <Modal title="Editar usuario" onClose={() => setEditando(null)}>
          <UsuarioForm inicial={editando} onGuardar={handleGuardarUsuario} onCancelar={() => setEditando(null)} />
        </Modal>
      )}

      {/* Modal: Confirmar eliminación */}
      {eliminando && (
        <Modal title="Eliminar usuario" onClose={() => setEliminando(null)}>
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-100">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-red-700">
                ¿Desactivar al usuario <strong>{eliminando.nombre}</strong> ({eliminando.email})?
                El usuario no podrá iniciar sesión.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setEliminando(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={handleEliminar}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700">
                Eliminar usuario
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
