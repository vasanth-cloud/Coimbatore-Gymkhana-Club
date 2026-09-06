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
  ClipboardList,
  X,
} from 'lucide-react';

interface SidebarProps {
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ mobileOpen, onCloseMobile }) => {
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
      roles: ['ADMIN', 'STAFF'],
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
      name: 'Staff Attendance',
      path: '/attendance',
      icon: ClipboardList,
      roles: ['ADMIN'],
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

  const sidebarContent = (
    <div className="flex flex-col justify-between h-full">
      <nav className="p-4 space-y-1.5">
        <div className="flex items-center justify-between px-3 py-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">
            Main Navigation
          </span>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-[#21262d]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {allowedItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => {
                if (onCloseMobile) onCloseMobile();
              }}
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

      <div className="p-4 m-4 rounded-xl bg-[#0d1117] border border-[#21262d] text-xs text-slate-400 space-y-1">
        <p className="font-bold text-amber-400">Harvid Technologies</p>
        <p className="text-[11px] text-slate-300">Coimbatore Gymkhana System</p>
        <p className="pt-1 text-[11px] font-mono text-slate-400">
          <a href="tel:6381901759" className="hover:text-amber-400 transition-colors">Ph: 6381901759</a>
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex w-64 bg-[#161b22] border-r border-[#21262d] flex-col justify-between shrink-0 sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto z-20">
        {sidebarContent}
      </aside>

      {/* Mobile Slide-Over Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
            onClick={onCloseMobile}
          />
          <aside className="relative w-72 max-w-[85vw] bg-[#161b22] border-r border-[#21262d] h-full shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
