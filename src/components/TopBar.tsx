import React from 'react';
import { User } from 'firebase/auth';
import { Compass, Gamepad2, Grid3X3, LayoutGrid, BookmarkCheck } from 'lucide-react';
import { ActiveTab, Language } from '../types';
import { copy } from '../i18n';
import { PWAInstallButton } from './PWAInstallButton';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  user: User | null;
  onSignIn: () => void;
  onOpenAccount: () => void;
  lang: Language;
  isSigningIn: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  user,
  onSignIn,
  onOpenAccount,
  lang,
  isSigningIn,
}) => {
  const t = copy[lang];

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: t.navHome, icon: <Compass className="w-5 h-5" /> },
    { id: 'games', label: t.navGames, icon: <Gamepad2 className="w-5 h-5" /> },
    { id: 'apps', label: t.navApps, icon: <LayoutGrid className="w-5 h-5" /> },
    { id: 'categories', label: t.navCategories, icon: <Grid3X3 className="w-5 h-5" /> },
    { id: 'library', label: t.navLibrary, icon: <BookmarkCheck className="w-5 h-5" /> },
  ];

  return (
    <>
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single text element wordmark */}
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className="flex items-center gap-2.5 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01875F] rounded-lg py-1"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="shrink-0"
            >
              <path d="M5 4.6C5 3.3 6.4 2.5 7.5 3.2L26.8 14.6C27.9 15.2 27.9 16.8 26.8 17.4L7.5 28.8C6.4 29.5 5 28.7 5 27.4V4.6Z" fill="#01875F" />
              <path d="M5 4.6C5 3.3 6.4 2.5 7.5 3.2L18.2 16L7.5 28.8C6.4 29.5 5 28.7 5 27.4V4.6Z" fill="#059669" />
              <path d="M18.2 16L26.8 14.6C27.9 15.2 27.9 16.8 26.8 17.4L18.2 16Z" fill="#FBBF24" />
            </svg>
            <span className="font-display text-xl font-bold tracking-tight text-slate-900">
              {t.brand}
            </span>
          </button>

          {/* Zone 2: 5 concise single-line navigation links */}
          <nav
            aria-label="Primary Store Navigation"
            className="hidden md:flex items-center gap-6"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectTab(item.id)}
                  className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01875F] rounded-md px-1 ${
                    isActive
                      ? 'text-[#01875F] font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <span className="absolute left-1 right-1 -bottom-[13px] h-0.5 bg-[#01875F] rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Install App & Gmail Sign-In / Account Avatar */}
          <div className="flex items-center gap-2.5 shrink-0">
            <PWAInstallButton lang={lang} variant="compact" />
            {user ? (
              <button
                type="button"
                onClick={onOpenAccount}
                aria-label="Open Appzora Account"
                className="flex items-center gap-2.5 min-h-[42px] pl-1.5 pr-3 py-1 rounded-full border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#01875F]"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Gmail Profile'}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover bg-slate-100"
                  />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-[#01875F] text-white text-xs font-semibold flex items-center justify-center">
                    {(user.displayName || user.email || 'A').charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="hidden sm:inline text-sm font-medium text-slate-800 max-w-[140px] truncate">
                  {user.displayName?.split(' ')[0] || user.email?.split('@')[0]}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                disabled={isSigningIn}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[#01875F] hover:bg-[#016e4d] disabled:opacity-60 text-white text-sm font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#01875F]"
              >
                {isSigningIn ? '...' : t.signInGmail}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Tab Bar (Thumb Zone) */}
      <nav
        aria-label="Mobile Store Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200"
      >
        <div className="grid grid-cols-5 h-16">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex flex-col items-center justify-center min-h-[44px] gap-1 transition-colors ${
                  isActive ? 'text-[#01875F]' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {item.icon}
                <span className="text-[11px] font-medium leading-none truncate max-w-[64px]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
