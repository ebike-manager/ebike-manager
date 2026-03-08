import { Bell, ChevronRight } from 'lucide-react';

export default function Header({ module }) {
  return (
    <header className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>E-Bike Manager</span>
        <ChevronRight size={14} />
        <span className="text-slate-900 font-semibold">{module}</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell size={18} />
        </button>
        <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs font-bold select-none">
          A
        </div>
      </div>
    </header>
  );
}
