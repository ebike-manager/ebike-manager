import {
  Package, BarChart2, ShoppingCart, Users, Settings,
  Zap, LogOut, LayoutDashboard, Calculator, Command,
  Truck, Shield, Wrench, X,
} from 'lucide-react';
import { useConfig } from '../hooks/useConfig';
import { usePermissions } from '../hooks/usePermissions';
import { ROL_LABELS } from '../hooks/usePermissions';

const NAV_MAIN = [
  { id: 'dashboard',  label: 'Dashboard',       icon: LayoutDashboard },
  { id: 'inventario', label: 'Inventario',       icon: Package         },
  { id: 'ventas',     label: 'Ventas',           icon: ShoppingCart    },
  { id: 'clientes',   label: 'Clientes',         icon: Users           },
  { id: 'reportes',   label: 'Reportes',         icon: BarChart2       },
  { id: 'proveedores', label: 'Proveedores',     icon: Truck           },
  { id: 'garantias',  label: 'Garantías',        icon: Shield          },
  { id: 'servicio',   label: 'Serv. Técnico',    icon: Wrench          },
];

const NAV_TOOLS = [
  { id: 'calculadora',   label: 'Calculadora',   icon: Calculator },
  { id: 'configuracion', label: 'Configuración', icon: Settings   },
];

export default function Sidebar({ activeModule, onNavigate, currentUser, onLogout, sidebarOpen, setSidebarOpen }) {
  const { empresa } = useConfig();
  const perms = usePermissions(currentUser);

  const rolInfo = ROL_LABELS[currentUser?.rol] ?? ROL_LABELS.viewer;

  const NavItem = ({ id, label, icon: Icon }) => (
    <button
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
  );

  const filteredTools = NAV_TOOLS.filter((item) => {
    if (item.id === 'configuracion') return perms.canViewConfig;
    return true;
  });

  return (
    <>
      {/* Sidebar panel */}
      <div className={[
        'w-60 bg-slate-900 flex flex-col h-screen flex-shrink-0',
        // Mobile: fixed + slide
        'fixed inset-y-0 left-0 z-50 transition-transform duration-200',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        // Desktop: always visible static
        'md:relative md:translate-x-0',
      ].join(' ')}>
        {/* Logo + close button (mobile) */}
        <div className="px-5 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-emerald-600 p-2 rounded-lg flex-shrink-0">
              <Zap className="text-white" size={16} />
            </div>
            <div className="min-w-0">
              <h1 className="text-white font-bold text-sm leading-tight truncate">{empresa.nombre}</h1>
              <p className="text-slate-400 text-xs leading-tight mt-0.5 truncate">{empresa.slogan}</p>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen?.(false)}
            className="md:hidden text-slate-400 hover:text-white ml-2 flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider px-3 py-2 mt-1">
            Módulos
          </p>
          {NAV_MAIN.map((item) => <NavItem key={item.id} {...item} />)}

          {filteredTools.length > 0 && (
            <div className="pt-2 mt-2 border-t border-white/5">
              <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider px-3 py-2">
                Herramientas
              </p>
              {filteredTools.map((item) => <NavItem key={item.id} {...item} />)}
            </div>
          )}

          {/* Keyboard shortcut hint */}
          <div className="mx-2 mt-3 p-2.5 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center gap-2">
              <Command size={11} className="text-slate-500 flex-shrink-0" />
              <p className="text-slate-500 text-[10px] leading-snug">
                <span className="text-slate-300 font-mono">⌘K</span> — búsqueda rápida con IA
              </p>
            </div>
          </div>
        </nav>

        {/* Current user + logout */}
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
                  {rolInfo?.label ?? currentUser.rol}
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
    </>
  );
}
