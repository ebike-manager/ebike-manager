import { useState, useMemo, useRef, useEffect } from 'react';
import { Bell, X, AlertTriangle, Shield, CreditCard, Package } from 'lucide-react';

const DISMISSED_KEY = 'ebike_notif_dismissed';

function getDismissed() {
  try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')); }
  catch { return new Set(); }
}
function addDismissed(id) {
  const s = getDismissed();
  s.add(id);
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...s].slice(-200)));
}

// ── Compute notifications from data ──────────────────────────────────────────
function computeNotifications({ productos = [], garantias = [], pagosVenta = {} }) {
  const notifs = [];

  // Stock bajo
  productos.forEach((p) => {
    if (p.estado === 'activo' && p.stock <= p.umbralMinimo) {
      notifs.push({
        id: `stock-${p.id}`,
        tipo: 'stock',
        urgencia: p.stock === 0 ? 'alta' : 'media',
        mensaje: `${p.nombre}: ${p.stock === 0 ? 'sin stock' : `solo ${p.stock} unidades (mín. ${p.umbralMinimo})`}`,
        modulo: 'inventario',
      });
    }
  });

  // Garantías por vencer / vencidas
  garantias.forEach((g) => {
    if (g.estado === 'vencida') {
      notifs.push({
        id: `garantia-vencida-${g.id}`,
        tipo: 'garantia',
        urgencia: 'baja',
        mensaje: `Garantía vencida: ${g.clienteNombre} — ${g.productoNombre}`,
        modulo: 'garantias',
      });
    } else if (g.estado === 'por_vencer') {
      notifs.push({
        id: `garantia-proxima-${g.id}`,
        tipo: 'garantia',
        urgencia: 'media',
        mensaje: `Garantía por vencer (${g.diasRestantes}d): ${g.clienteNombre} — ${g.productoNombre}`,
        modulo: 'garantias',
      });
    }
  });

  // Cuotas vencidas
  const hoy = new Date().toISOString().split('T')[0];
  Object.entries(pagosVenta).forEach(([ventaId, plan]) => {
    plan.pagos?.forEach((p) => {
      if (!p.pagado && p.fechaVencimiento < hoy) {
        notifs.push({
          id: `cuota-${ventaId}-${p.numeroCuota}`,
          tipo: 'cuota',
          urgencia: 'alta',
          mensaje: `Cuota ${p.numeroCuota} vencida — venta ${ventaId.slice(-6)}`,
          modulo: 'ventas',
        });
      }
    });
  });

  return notifs;
}

const TIPO_CONFIG = {
  stock:   { icon: Package,       color: 'text-amber-500',  bg: 'bg-amber-50'   },
  garantia:{ icon: Shield,        color: 'text-blue-500',   bg: 'bg-blue-50'    },
  cuota:   { icon: CreditCard,    color: 'text-red-500',    bg: 'bg-red-50'     },
};

const URGENCIA_DOT = {
  alta:  'bg-red-500',
  media: 'bg-amber-500',
  baja:  'bg-slate-400',
};

export default function NotificationBell({ productos, garantias, pagosVenta, onNavigate }) {
  const [open, setOpen]         = useState(false);
  const [dismissed, setDismissed] = useState(getDismissed);
  const ref = useRef(null);

  const allNotifs = useMemo(
    () => computeNotifications({ productos, garantias, pagosVenta }),
    [productos, garantias, pagosVenta]
  );

  const visible = useMemo(
    () => allNotifs.filter((n) => !dismissed.has(n.id)),
    [allNotifs, dismissed]
  );

  const altaCount = visible.filter((n) => n.urgencia === 'alta').length;
  const badgeCount = visible.length;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const dismiss = (id, e) => {
    e.stopPropagation();
    addDismissed(id);
    setDismissed(getDismissed());
  };

  const handleClick = (notif) => {
    setOpen(false);
    if (onNavigate) onNavigate(notif.modulo);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`relative p-2 rounded-lg transition-colors ${
          open ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
        }`}
        aria-label="Notificaciones"
      >
        <Bell size={18} />
        {badgeCount > 0 && (
          <span className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${
            altaCount > 0 ? 'bg-red-500' : 'bg-amber-500'
          }`}>
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-900">
                Notificaciones
                {badgeCount > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full font-medium">
                    {badgeCount}
                  </span>
                )}
              </span>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
              <X size={15} />
            </button>
          </div>

          {/* Notifications list */}
          <div className="max-h-80 overflow-y-auto">
            {visible.length === 0 ? (
              <div className="py-10 text-center">
                <Bell size={28} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Sin notificaciones pendientes</p>
              </div>
            ) : (
              visible.map((n) => {
                const tc = TIPO_CONFIG[n.tipo] ?? TIPO_CONFIG.stock;
                const NIcon = tc.icon;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 text-left"
                  >
                    <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${tc.bg}`}>
                      <NIcon size={14} className={tc.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 leading-relaxed">{n.mensaje}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${URGENCIA_DOT[n.urgencia]}`} />
                      <button
                        onClick={(e) => dismiss(n.id, e)}
                        className="text-slate-300 hover:text-slate-500 transition-colors"
                        title="Descartar"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {visible.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50">
              <button
                onClick={() => {
                  allNotifs.forEach((n) => addDismissed(n.id));
                  setDismissed(getDismissed());
                }}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Marcar todas como leídas
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
