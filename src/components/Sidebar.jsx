import { Package, BarChart2, ShoppingCart, Users, Settings, Zap, LogOut } from 'lucide-react';
import { useConfig } from '../hooks/useConfig';

const NAV_ITEMS = [
  { id: 'inventario',    label: 'Inventario',    icon: Package      },
  { id: 'ventas',        label: 'Ventas',        icon: ShoppingCart },
  { id: 'clientes',      label: 'Clientes',      icon: Users        },
  { id: 'reportes',      label: 'Reportes',      icon: BarChart2    },
  { id: 'configuracion', label: 'Configuración', icon: Settings     },
];

export default function Sidebar({ activeModule, onNavigate, currentUser, onLogout }) {
  const { empresa } = useConfig();

  return (
    <div className="w-60 bg-slate-900 flex flex-col h-screen flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-lg">
            <Zap className="text-white" size={16} />
          </div>
          <div className="min-w-0">
            <h1 className="text-white font-bold text-sm leading-tight truncate">{empresa.nombre}</h1>
            <p className="text-slate-400 text-xs leading-tight mt-0.5 truncate">{empresa.slogan}</p>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider px-3 py-2 mt-1">
          Módulos
        </p>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left',
              activeModule === id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-300 hover:bg-white/5 hover:text-white',
            ].join(' ')}
          >
            <Icon size={16} className="flex-shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Usuario actual + logout */}
      {currentUser && (
        <div className="p-3 border-t border-white/10">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors group">
            <div className="w-7 h-7 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {currentUser.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-slate-200 text-xs font-medium truncate leading-tight">
                {currentUser.nombre}
              </p>
              <p className="text-slate-500 text-[10px] leading-tight">
                {currentUser.rol === 'admin' ? 'Administrador' : 'Vendedor'}
              </p>
            </div>
            <button
              onClick={onLogout}
              title="Cerrar sesión"
              className="text-slate-500 hover:text-slate-200 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
