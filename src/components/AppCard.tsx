import React, { useState } from 'react';
import { Star, Check, Download } from 'lucide-react';
import { Language, StoreApp } from '../types';
import { copy } from '../i18n';
import { formatInstallCount } from '../utils/crypto';

interface AppCardProps {
  app: StoreApp;
  isInstalled: boolean;
  isInstalling: boolean;
  onOpen: (app: StoreApp) => void;
  onInstall: (app: StoreApp, e: React.MouseEvent) => void;
  lang: Language;
}

export const AppCard: React.FC<AppCardProps> = ({
  app,
  isInstalled,
  isInstalling,
  onOpen,
  onInstall,
  lang,
}) => {
  const [imgError, setImgError] = useState(false);
  const t = copy[lang];

  return (
    <article
      onClick={() => onOpen(app)}
      className="group cursor-pointer bg-white border border-slate-200/90 hover:border-slate-300 rounded-2xl p-4 flex flex-col justify-between gap-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/70 shrink-0 flex items-center justify-center">
          {!imgError && app.iconUrl ? (
            <img
              src={app.iconUrl}
              alt={`${app.title} icon`}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-display font-bold text-xl flex items-center justify-center">
              {app.title.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[15px] font-semibold text-slate-900 leading-snug truncate group-hover:text-[#01875F] transition-colors">
            {app.title}
          </h3>
          <p className="text-xs text-slate-500 truncate mt-0.5">{app.developerName}</p>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-slate-600 tabular-nums truncate">
            <span>{app.category}</span>
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-0.5 font-medium text-slate-700">
              {app.rating > 0 ? app.rating.toFixed(1) : 'New'}
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-[11px]">{app.sizeLabel}</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
        {app.shortDescription}
      </p>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <span className="text-[11px] font-mono tabular-nums text-slate-500">
          {formatInstallCount(app.installCount)} {t.downloads}
        </span>

        <button
          type="button"
          onClick={(e) => onInstall(app, e)}
          disabled={isInstalling}
          className={`min-h-[34px] px-3.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors ${
            isInstalled
              ? 'bg-emerald-50 text-[#01875F] border border-emerald-200 hover:bg-emerald-100'
              : 'bg-[#01875F] text-white hover:bg-[#016e4d]'
          }`}
        >
          {isInstalling ? (
            <span>{t.installing}</span>
          ) : isInstalled ? (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>{t.installed}</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>{t.install}</span>
            </>
          )}
        </button>
      </div>
    </article>
  );
};
