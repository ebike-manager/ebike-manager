import { Package, BarChart2, ShoppingCart, Users, Settings, Zap } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'inventario', label: 'Inventario', icon: Package },
  { id: 'ventas', label: 'Ventas', icon: ShoppingCart, disabled: true },
  { id: 'clientes', label: 'Clientes', icon: Users },
  { id: 'reportes', label: 'Reportes', icon: BarChart2, disabled: true },
  { id: 'configuracion', label: 'Configuración', icon: Settings, disabled: true },
];

export default function Sidebar({ activeModule, onNavigate }) {
  return (
    <div className="w-60 bg-slate-900 flex flex-col h-screen flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg">
            <Zap className="text-white" size={16} />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">E-Bike Manager</h1>
            <p className="text-slate-400 text-xs leading-tight mt-0.5">Panel de gestión</p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 py-2 mt-1">
          Módulos
        </p>
        {NAV_ITEMS.map(({ id, label, icon: Icon, disabled }) => (
          <button
            key={id}
            onClick={() => !disabled && onNavigate(id)}
            disabled={disabled}
            className={[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
              disabled
                ? 'text-slate-600 cursor-not-allowed'
                : activeModule === id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-white/5 hover:text-white',
            ].join(' ')}
          >
            <Icon size={16} className="flex-shrink-0" />
            <span className="flex-1">{label}</span>
            {disabled && (
              <span className="text-[10px] bg-white/5 text-slate-500 px-1.5 py-0.5 rounded font-normal">
                Próximo
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-slate-500 text-xs text-center">v0.1.0 · E-Bike Manager</p>
      </div>
    </div>
  );
}
