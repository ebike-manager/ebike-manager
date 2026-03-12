// Role-based permission system
// Roles: 'admin' | 'vendedor' | 'viewer'
//
// admin   → full access
// vendedor → sell, view clients, create clients, no delete, no config
// viewer  → read only, no creates/edits/deletes

const PERMISSIONS = {
  admin: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canSell: true,
    canCreateClientes: true,
    canViewConfig: true,
    canExportPDF: true,
    canViewLog: true,
    canManageGarantias: true,
    canManageServicio: true,
    canManageProveedores: true,
  },
  vendedor: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canSell: true,
    canCreateClientes: true,
    canViewConfig: false,
    canExportPDF: true,
    canViewLog: false,
    canManageGarantias: true,
    canManageServicio: true,
    canManageProveedores: false,
  },
  viewer: {
    canCreate: false,
    canEdit: false,
    canDelete: false,
    canSell: false,
    canCreateClientes: false,
    canViewConfig: false,
    canExportPDF: true,
    canViewLog: false,
    canManageGarantias: false,
    canManageServicio: false,
    canManageProveedores: false,
  },
};

const VIEWER_DEFAULTS = PERMISSIONS.viewer;

export function usePermissions(currentUser) {
  const rol = currentUser?.rol ?? 'viewer';
  return PERMISSIONS[rol] ?? VIEWER_DEFAULTS;
}

export function getPermissions(rol) {
  return PERMISSIONS[rol] ?? VIEWER_DEFAULTS;
}

export const ROL_LABELS = {
  admin:    { label: 'Administrador', color: 'bg-violet-100 text-violet-700' },
  vendedor: { label: 'Vendedor',      color: 'bg-blue-100 text-blue-700'    },
  viewer:   { label: 'Solo lectura',  color: 'bg-slate-100 text-slate-600'  },
};

export const ROLES_DESCRIPCION = [
  {
    rol: 'admin',
    label: 'Administrador',
    descripcion: 'Acceso total: crear, editar, eliminar, configuración, log de actividad.',
    color: 'bg-violet-100 text-violet-700',
  },
  {
    rol: 'vendedor',
    label: 'Vendedor',
    descripcion: 'Puede crear ventas y clientes, gestionar garantías y servicio técnico. No puede eliminar ni acceder a configuración.',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    rol: 'viewer',
    label: 'Solo lectura',
    descripcion: 'Solo puede ver información. No puede crear, editar ni eliminar nada.',
    color: 'bg-slate-100 text-slate-600',
  },
];
