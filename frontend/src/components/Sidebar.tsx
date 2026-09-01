import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  QrCode,
  Users,
  GlassWater,
  PackageCheck,
  TrendingUp,
  FileText,
  UserCheck,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const navItems = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: LayoutDashboard,
      roles: ['ADMIN'],
    },
    {
      name: 'Entry Scanner',
      path: '/entries',
      icon: QrCode,
      roles: ['ADMIN', 'STAFF'],
    },
    {
      name: 'Customers',
      path: '/customers',
      icon: Users,
      roles: ['ADMIN'],
    },
    {
      name: 'Brands & Products',
      path: '/products',
      icon: GlassWater,
      roles: ['ADMIN'],
    },
    {
      name: 'Stock & Inventory',
      path: '/stock',
      icon: PackageCheck,
      roles: ['ADMIN'],
    },
    {
      name: 'Sales Log',
      path: '/sales',
      icon: TrendingUp,
      roles: ['ADMIN', 'STAFF'],
    },
    {
      name: 'Reports & Downloads',
      path: '/reports',
      icon: FileText,
      roles: ['ADMIN'],
    },
    {
      name: 'Staff Accounts',
      path: '/staff',
      icon: UserCheck,
      roles: ['ADMIN'],
    },
  ];

  const allowedItems = navItems.filter((item) =>
    user ? item.roles.includes(user.role) : false
  );

  return (
    <aside className="w-64 bg-[#161b22] border-r border-[#21262d] flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <nav className="p-4 space-y-1.5">
        <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
          Main Navigation
        </div>
        {allowedItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-[#21262d]'
                }`
              }
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 m-4 rounded-xl bg-[#0d1117] border border-[#21262d] text-xs text-slate-400">
        <p className="font-semibold text-slate-300 mb-1">System Info</p>
        <p>API v1.0.0 • Connected</p>
        <p className="mt-2 text-[11px] text-slate-500">FastAPI + PostgreSQL Backend</p>
      </div>
    </aside>
  );
};
