import { useState } from 'react';
import Sidebar         from './components/Sidebar';
import Header          from './components/Header';
import FloatingChat    from './components/FloatingChat';
import CommandBar      from './components/CommandBar';
import Login           from './pages/Login';
import Dashboard       from './pages/Dashboard';
import Inventario      from './pages/Inventario';
import Clientes        from './pages/Clientes';
import Ventas          from './pages/Ventas';
import Reportes        from './pages/Reportes';
import Calculadora     from './pages/Calculadora';
import Configuracion   from './pages/Configuracion';
import Proveedores     from './pages/Proveedores';
import Garantias       from './pages/Garantias';
import ServicioTecnico from './pages/ServicioTecnico';
import { useAuth }       from './contexts/AuthContext';
import { useInventario } from './hooks/useInventario';
import { useVentas }     from './hooks/useVentas';
import { useClientes }   from './hooks/useClientes';
import { useGarantias }  from './hooks/useGarantias';
import { usePagosVenta } from './hooks/usePagosVenta';
import { appendLog }     from './hooks/useActivityLog';
import { Loader2 }       from 'lucide-react';

const MODULES = {
  dashboard:     { label: 'Dashboard',       component: Dashboard      },
  inventario:    { label: 'Inventario',      component: Inventario     },
  clientes:      { label: 'Clientes',        component: Clientes       },
  ventas:        { label: 'Ventas',          component: Ventas         },
  reportes:      { label: 'Reportes',        component: Reportes       },
  proveedores:   { label: 'Proveedores',     component: Proveedores    },
  garantias:     { label: 'Garantías',       component: Garantias      },
  servicio:      { label: 'Servicio Técnico', component: ServicioTecnico },
  calculadora:   { label: 'Calculadora',     component: Calculadora    },
  configuracion: { label: 'Configuración',   component: Configuracion  },
};

// Inner component — hooks available inside ConfigProvider tree
function AppShell({ currentUser, onLogout }) {
  const [activeModule, setActiveModule] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen]   = useState(false);

  const { productos }          = useInventario();
  const { ventas }             = useVentas();
  const { clientes }           = useClientes();
  const { garantias }          = useGarantias();
  const { planes: pagosVenta } = usePagosVenta();

  const { label, component: ActiveComponent } = MODULES[activeModule] ?? MODULES.dashboard;
  const systemData = { productos, ventas, clientes };

  const handleNavigate = (module) => {
    setActiveModule(module);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    await appendLog('Cerró sesión', 'Sistema');
    onLogout();
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        activeModule={activeModule}
        onNavigate={handleNavigate}
        currentUser={currentUser}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <Header
          module={label}
          currentUser={currentUser}
          productos={productos}
          garantias={garantias}
          pagosVenta={pagosVenta}
          onNavigate={handleNavigate}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {ActiveComponent && (
            <ActiveComponent onNavigate={handleNavigate} currentUser={currentUser} />
          )}
        </main>
      </div>

      {/* Global AI components — always visible after login */}
      <FloatingChat />
      <CommandBar onNavigate={handleNavigate} systemData={systemData} />
    </div>
  );
}

export default function App() {
  const { currentUser, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="text-emerald-500 animate-spin mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <Login />;

  return <AppShell currentUser={currentUser} onLogout={signOut} />;
}
