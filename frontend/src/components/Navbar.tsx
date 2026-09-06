import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { LogOut, User as UserIcon, Shield, Sun, Moon, Menu } from 'lucide-react';

interface NavbarProps {
  onToggleMobileMenu?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileMenu }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-16 bg-[#161b22] border-b border-[#21262d] flex items-center justify-between px-3 sm:px-6 sticky top-0 z-30 shadow-md">
      {/* Mobile Hamburger Menu & Official Gymkhana Club Logo */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl bg-[#21262d] text-slate-300 hover:text-amber-400 hover:bg-amber-500/10 border border-[#30363d] transition-colors"
            title="Open Mobile Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <img
          src="/gymkhana-logo-transparent.png"
          alt="Coimbatore Gymkhana Club Official Crest Logo"
          className="h-9 sm:h-11 w-auto object-contain shrink-0 drop-shadow-md"
        />

        <div className="min-w-0">
          <h1 className="font-extrabold text-xs sm:text-base text-slate-100 tracking-tight font-serif flex items-center gap-1.5 truncate">
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent truncate">
              COIMBATORE GYMKHANA CLUB
            </span>
            <span className="hidden sm:inline-block text-[10px] bg-amber-500/15 text-amber-400 border border-amber-500/40 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider shrink-0">
              VIP
            </span>
          </h1>
          <p className="text-[9px] sm:text-[11px] text-slate-400 font-semibold tracking-wide truncate">
            Est. 1928 • Digital Bar & Membership
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 sm:p-2.5 rounded-xl bg-[#21262d] hover:bg-amber-500/20 hover:text-amber-400 text-slate-300 transition-colors border border-[#30363d] flex items-center gap-2 text-xs font-bold"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </button>

        {user && (
          <div className="flex items-center gap-2 sm:gap-3 border-l border-[#30363d] pl-2 sm:pl-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs sm:text-sm font-bold text-slate-200 truncate max-w-[120px] sm:max-w-none">{user.full_name}</p>
              <div className="flex items-center justify-end gap-1">
                <Shield className={`w-3 h-3 ${user.role === 'ADMIN' ? 'text-amber-400' : 'text-emerald-400'}`} />
                <span className="text-[10px] sm:text-xs text-slate-400 uppercase font-mono tracking-wider font-semibold">
                  {user.role}
                </span>
              </div>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#21262d] border border-[#30363d] flex items-center justify-center text-slate-300 font-semibold text-xs shrink-0">
              <UserIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-xl bg-[#21262d] hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 transition-colors border border-[#30363d] shrink-0"
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
