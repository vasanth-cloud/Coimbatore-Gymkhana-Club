import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { Loader2 } from 'lucide-react';
import { UserRole } from '../types';

interface ProtectedLayoutProps {
  allowedRoles?: UserRole[];
}

export const ProtectedLayout: React.FC<ProtectedLayoutProps> = ({ allowedRoles }) => {
  const { user, loading } = useAuth();

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
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      <Navbar />
      <div className="flex flex-1 min-w-0">
        <Sidebar />
        <main className="flex-1 min-w-0 p-4 sm:p-6 overflow-y-auto overflow-x-hidden w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
