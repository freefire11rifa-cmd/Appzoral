import React from 'react';
import { User } from 'firebase/auth';
import {
  X,
  UploadCloud,
  BookmarkCheck,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Clock,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { DeveloperProfile, Language } from '../types';
import { copy } from '../i18n';
import { PWAInstallButton } from './PWAInstallButton';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  developer: DeveloperProfile | null;
  installedCount: number;
  onOpenUploadFlow: () => void;
  onOpenLibrary: () => void;
  onSwitchAccount: () => void;
  onSignOut: () => void;
  lang: Language;
  onToggleLang: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  user,
  developer,
  installedCount,
  onOpenUploadFlow,
  onOpenLibrary,
  onSwitchAccount,
  onSignOut,
  lang,
  onToggleLang,
}) => {
  if (!isOpen || !user) return null;
  const t = copy[lang];

  const isVerifiedDev = developer?.status === 'verified';
  const isPendingDev = developer?.status === 'pending_verification';

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-sm flex items-start justify-center sm:justify-end p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden mt-12 sm:mt-14"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="font-display text-sm font-semibold text-slate-900">
            {t.accountTitle}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account menu"
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Gmail Identity */}
        <div className="p-6 bg-slate-50/70 border-b border-slate-100 flex items-center gap-4">
          {user.photoURL ? (
            <img
              src={user.photoURL}
              alt={user.displayName || 'Gmail'}
              referrerPolicy="no-referrer"
              className="w-14 h-14 rounded-full object-cover border border-slate-200 bg-white"
            />
          ) : (
            <div className="w-14 h-14 rounded-full bg-[#01875F] text-white font-display font-bold text-xl flex items-center justify-center">
              {(user.displayName || user.email || 'A').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-bold text-slate-900 truncate">
              {user.displayName || 'Appzora User'}
            </h3>
            <p className="text-xs text-slate-600 truncate">{user.email}</p>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs font-medium">
              {isVerifiedDev ? (
                <span className="inline-flex items-center gap-1 text-[#01875F]">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Verified Developer · {developer.studioName}</span>
                </span>
              ) : isPendingDev ? (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending Gmail Apply</span>
                </span>
              ) : (
                <span className="text-slate-500">Gmail Connected</span>
              )}
            </div>
          </div>
        </div>

        {/* Play Store Menu Actions */}
        <div className="p-3 space-y-1.5">
          {/* Upload App Option */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenUploadFlow();
            }}
            className="w-full min-h-[60px] px-4 py-3 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-200/80 flex items-center gap-3.5 text-left transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-[#01875F] text-white flex items-center justify-center shrink-0">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-slate-900">{t.uploadApp}</div>
              <div className="text-xs text-slate-600 truncate">
                {isVerifiedDev
                  ? t.uploadAppSubReady
                  : isPendingDev
                    ? t.uploadAppSubPending
                    : t.uploadAppSubNew}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#01875F] shrink-0" />
          </button>

          {/* My Installed Apps & Library */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenLibrary();
            }}
            className="w-full min-h-[52px] px-4 py-2.5 rounded-2xl hover:bg-slate-50 flex items-center gap-3.5 text-left transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <BookmarkCheck className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900">{t.myLibrary}</div>
              <div className="text-xs text-slate-500 tabular-nums">
                {installedCount} {lang === 'en' ? 'installed apps' : 'টি অ্যাপ ইনস্টল করা'}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {/* Install Appzora on Device */}
          <PWAInstallButton lang={lang} variant="menu" />

          {/* Language Toggle */}
          <button
            type="button"
            onClick={onToggleLang}
            className="w-full min-h-[52px] px-4 py-2.5 rounded-2xl hover:bg-slate-50 flex items-center gap-3.5 text-left transition-colors"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-900">{t.languageLabel}</div>
              <div className="text-xs text-slate-500">
                {lang === 'en' ? 'Current: English (Switch to বাংলা)' : 'বর্তমান: বাংলা (Switch to English)'}
              </div>
            </div>
          </button>

          <div className="my-2 border-t border-slate-100" />

          {/* Switch Gmail */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSwitchAccount();
            }}
            className="w-full min-h-[48px] px-4 py-2 rounded-2xl hover:bg-slate-50 flex items-center gap-3.5 text-left transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-slate-600 ml-2.5" />
            <span className="text-sm font-medium text-slate-800">{t.switchGmail}</span>
          </button>

          {/* Sign Out */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSignOut();
            }}
            className="w-full min-h-[48px] px-4 py-2 rounded-2xl hover:bg-rose-50 flex items-center gap-3.5 text-left transition-colors text-rose-700"
          >
            <LogOut className="w-4 h-4 ml-2.5" />
            <span className="text-sm font-medium">{t.signOut}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
