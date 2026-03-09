import { useState } from 'react';
import Sidebar        from './components/Sidebar';
import Header         from './components/Header';
import Login          from './pages/Login';
import Inventario     from './pages/Inventario';
import Clientes       from './pages/Clientes';
import Ventas         from './pages/Ventas';
import Reportes       from './pages/Reportes';
import Configuracion  from './pages/Configuracion';

const MODULES = {
  inventario:    { label: 'Inventario',    component: Inventario    },
  clientes:      { label: 'Clientes',      component: Clientes      },
  ventas:        { label: 'Ventas',        component: Ventas        },
  reportes:      { label: 'Reportes',      component: Reportes      },
  configuracion: { label: 'Configuración', component: Configuracion },
};

export default function App() {
  const [activeModule, setActiveModule] = useState('inventario');
  const [currentUser, setCurrentUser]   = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('ebike_user') || 'null'); }
    catch { return null; }
  });

  const handleLogin = (user) => {
    sessionStorage.setItem('ebike_user', JSON.stringify(user));
    setCurrentUser(user);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ebike_user');
    setCurrentUser(null);
    setActiveModule('inventario');
  };

  if (!currentUser) return <Login onLogin={handleLogin} />;

  const { label, component: ActiveComponent } = MODULES[activeModule] || {};

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar
        activeModule={activeModule}
        onNavigate={setActiveModule}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header module={label} />
        <main className="flex-1 overflow-y-auto p-6">
          {ActiveComponent && <ActiveComponent />}
        </main>
      </div>
    </div>
  );
}
