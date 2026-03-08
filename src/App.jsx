import { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Inventario from './pages/Inventario';
import Clientes from './pages/Clientes';

const MODULES = {
  inventario: { label: 'Inventario', component: Inventario },
  clientes:   { label: 'Clientes',   component: Clientes   },
};

export default function App() {
  const [activeModule, setActiveModule] = useState('inventario');
  const { label, component: ActiveComponent } = MODULES[activeModule] || {};

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar activeModule={activeModule} onNavigate={setActiveModule} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header module={label} />
        <main className="flex-1 overflow-y-auto p-6">
          {ActiveComponent && <ActiveComponent />}
        </main>
      </div>
    </div>
  );
}
