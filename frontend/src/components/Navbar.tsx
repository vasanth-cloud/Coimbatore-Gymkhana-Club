import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, User as UserIcon, Shield, Sun, Moon } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 bg-[#161b22] border-b border-[#21262d] flex items-center justify-between px-6 sticky top-0 z-30 shadow-md">
      {/* Official Gymkhana Club Logo & Title */}
      <div className="flex items-center gap-3.5">
        <img
          src="/gymkhana-logo-transparent.png"
          alt="Coimbatore Gymkhana Club Official Crest Logo"
          className="h-12 w-auto object-contain shrink-0 drop-shadow-md"
        />

        <div>
          <h1 className="font-extrabold text-base sm:text-lg text-slate-100 tracking-tight font-serif flex items-center gap-2">
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
              COIMBATORE GYMKHANA CLUB
            </span>
            <span className="text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
              VIP
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 font-semibold tracking-wide">
            Est. 2024 • Digital Bar & Membership System
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2.5 rounded-xl bg-[#21262d] hover:bg-amber-500/20 hover:text-amber-400 text-slate-300 transition-colors border border-[#30363d] flex items-center gap-2 text-xs font-bold"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Light Mode</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500" />
              <span className="hidden sm:inline">Dark Mode</span>
            </>
          )}
        </button>

        {user && (
          <div className="flex items-center gap-3 border-l border-[#30363d] pl-4">
            <div className="text-right">
              <p className="text-sm font-bold text-slate-200">{user.full_name}</p>
              <div className="flex items-center justify-end gap-1">
                <Shield className={`w-3 h-3 ${user.role === 'ADMIN' ? 'text-amber-400' : 'text-emerald-400'}`} />
                <span className="text-xs text-slate-400 uppercase font-mono tracking-wider font-semibold">
                  {user.role}
                </span>
              </div>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center text-slate-300 font-semibold">
              <UserIcon className="w-5 h-5" />
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-lg bg-[#21262d] hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors border border-[#30363d]"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
