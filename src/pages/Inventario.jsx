import { useState, useMemo } from 'react';
import {
  Plus, Search, Edit2, Trash2, Package,
  AlertTriangle, DollarSign, LayoutGrid,
} from 'lucide-react';
import Modal from '../components/Modal';
import { useInventario } from '../hooks/useInventario';
import { useConfig }     from '../hooks/useConfig';
import { MONEDAS, formatMoney } from '../utils/moneda';

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
  stock: '',
  umbralMinimo: '5',
  estado: 'activo',
};

// ── Formulario de producto ───────────────────────────────────────────────────
function ProductoForm({ inicial = {}, moneda = 'USD', onGuardar, onCancelar }) {
  const [form, setForm] = useState({
    ...FORM_VACIO,
    ...inicial,
    precio:       inicial.precio       != null ? String(inicial.precio)       : '',
    stock:        inicial.stock        != null ? String(inicial.stock)        : '',
    umbralMinimo: inicial.umbralMinimo != null ? String(inicial.umbralMinimo) : '5',
  });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }));
    setErrors((er) => ({ ...er, [field]: null }));
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

  const simbolo = MONEDAS[moneda]?.simbolo ?? 'US$';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Nombre */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Nombre del producto <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={form.nombre}
          onChange={set('nombre')}
          className={inputCls('nombre')}
          placeholder="Ej: E-Bike Mountain Pro 29"
          autoFocus
        />
        {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre}</p>}
      </div>

      {/* Categoría + Estado */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
          <select value={form.categoria} onChange={set('categoria')} className={inputCls('categoria')}>
            {CATEGORIAS.map((c) => <option key={c}>{c}</option>)}
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

// ── Fila de tabla ────────────────────────────────────────────────────────────
function ProductoRow({ producto, moneda, onEdit, onDelete, onEditStock }) {
  const stockBajo = producto.stock <= producto.umbralMinimo;

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
          {formatMoney(producto.precio, moneda)}
        </span>
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
          <button
            onClick={onEdit}
            title="Editar producto"
            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <Edit2 size={14} />
          </button>
          <button
            onClick={onDelete}
            title="Eliminar producto"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 size={14} />
          </button>
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
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
      </div>
    </div>
  );
}

// ── Página principal de Inventario ───────────────────────────────────────────
export default function Inventario() {
  const { productos, agregarProducto, editarProducto, eliminarProducto } = useInventario();
  const { empresa }  = useConfig();
  const moneda       = empresa.moneda ?? 'USD';

  const [search, setSearch]             = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [showAdd, setShowAdd]           = useState(false);
  const [editando, setEditando]         = useState(null);
  const [eliminando, setEliminando]     = useState(null);
  const [editandoStock, setEditandoStock] = useState(null);

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
    const valorTotal = productos.reduce((s, p) => s + p.precio * p.stock, 0);
    const categorias = new Set(productos.map((p) => p.categoria)).size;
    return { total: productos.length, stockBajo, valorTotal, categorias };
  }, [productos]);

  return (
    <div className="space-y-5">
      {/* Estadísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Package}       label="Total productos"      value={stats.total}                           color="blue"    />
        <StatCard icon={AlertTriangle} label="Stock bajo"           value={stats.stockBajo}                       color="red"     />
        <StatCard
          icon={DollarSign}
          label="Valor del inventario"
          value={formatMoney(stats.valorTotal, moneda)}
          color="emerald"
        />
        <StatCard icon={LayoutGrid}    label="Categorías"           value={stats.categorias}                      color="violet"  />
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
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <Plus size={15} />
            Agregar producto
          </button>
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
                    moneda={moneda}
                    onEdit={() => setEditando(p)}
                    onDelete={() => setEliminando(p)}
                    onEditStock={() => setEditandoStock(p)}
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

      {/* Modal: Agregar producto */}
      {showAdd && (
        <Modal title="Agregar producto" onClose={() => setShowAdd(false)}>
          <ProductoForm
            moneda={moneda}
            onGuardar={(datos) => { agregarProducto(datos); setShowAdd(false); }}
            onCancelar={() => setShowAdd(false)}
          />
        </Modal>
      )}

      {/* Modal: Editar producto */}
      {editando && (
        <Modal title="Editar producto" onClose={() => setEditando(null)}>
          <ProductoForm
            inicial={editando}
            moneda={moneda}
            onGuardar={(datos) => { editarProducto(editando.id, datos); setEditando(null); }}
            onCancelar={() => setEditando(null)}
          />
        </Modal>
      )}

      {/* Modal: Confirmar eliminación */}
      {eliminando && (
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
    </div>
  );
}
