import { ChevronRight, Menu } from 'lucide-react';
import NotificationBell from './NotificationBell';

export default function Header({ module, currentUser, productos = [], garantias = [], pagosVenta = {}, onNavigate, onMenuClick }) {
  const initial = currentUser?.nombre?.charAt(0)?.toUpperCase() ?? 'A';

  return (
    <header className="bg-white border-b border-slate-200 px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between flex-shrink-0">
      {/* Left: hamburger (mobile) + breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
          aria-label="Abrir menú"
        >
          <Menu size={20} />
        </button>

        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-sm text-slate-500 min-w-0">
          <span className="hidden sm:inline truncate">E-Bike Manager</span>
          <ChevronRight size={14} className="hidden sm:block flex-shrink-0" />
          <span className="text-slate-900 font-semibold truncate">{module}</span>
        </div>
      </div>

      {/* Right: notifications + avatar */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        <NotificationBell
          productos={productos}
          garantias={garantias}
          pagosVenta={pagosVenta}
          onNavigate={onNavigate}
        />
        <div
          className="w-7 h-7 sm:w-8 sm:h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold select-none"
          title={currentUser?.nombre}
        >
          {initial}
        </div>
      </div>
    </header>
  );
}
