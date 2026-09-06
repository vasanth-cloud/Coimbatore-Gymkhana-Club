import React, { useState } from 'react';
import { Navigate, Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Loader2, QrCode, TrendingUp, Users, PackageCheck, Menu } from 'lucide-react';
import { UserRole } from '../types';

interface ProtectedLayoutProps {
  allowedRoles?: UserRole[];
}

export const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ allowedRoles }) => {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <p className="text-sm font-medium">Loading Bar Management System...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // STAFF user trying to access admin route -> redirect to /entries
    return <Navigate to="/entries" replace />;
  }

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col pb-16 md:pb-0">
      <Navbar onToggleMobileMenu={() => setMobileOpen((prev) => !prev)} />

      <div className="flex flex-1 min-w-0">
        <Sidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />
        
        <main className="flex-1 min-w-0 p-3 sm:p-6 overflow-y-auto overflow-x-hidden w-full max-w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Quick Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#161b22]/95 border-t border-[#21262d] flex items-center justify-around z-40 px-2 shadow-2xl backdrop-blur-md">
        <NavLink
          to="/entries"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
              isActive ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <QrCode className="w-5 h-5" />
          <span>Scanner</span>
        </NavLink>

        <NavLink
          to="/sales"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
              isActive ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <TrendingUp className="w-5 h-5" />
          <span>Sales POS</span>
        </NavLink>

        <NavLink
          to="/customers"
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
              isActive ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <Users className="w-5 h-5" />
          <span>Members</span>
        </NavLink>

        {user.role === 'ADMIN' && (
          <NavLink
            to="/stock"
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 text-[10px] font-bold transition-all ${
                isActive ? 'text-amber-400 scale-105' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <PackageCheck className="w-5 h-5" />
            <span>Stock</span>
          </NavLink>
        )}

        <button
          onClick={() => setMobileOpen((prev) => !prev)}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-slate-400 hover:text-slate-200 transition-all"
        >
          <Menu className="w-5 h-5" />
          <span>Menu</span>
        </button>
      </nav>
    </div>
  );
};
