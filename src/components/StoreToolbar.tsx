import React from 'react';
import { Search, X, Globe } from 'lucide-react';
import { ActiveTab, Language } from '../types';
import { APP_CATEGORIES, GAME_CATEGORIES, ALL_CATEGORIES } from '../data/categories';
import { copy } from '../i18n';

interface StoreToolbarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  activeTab: ActiveTab;
  lang: Language;
  onToggleLang: () => void;
}

export const StoreToolbar: React.FC<StoreToolbarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  activeTab,
  lang,
  onToggleLang,
}) => {
  const t = copy[lang];

  const categoryList =
    activeTab === 'games'
      ? GAME_CATEGORIES
      : activeTab === 'apps'
        ? APP_CATEGORIES
        : ALL_CATEGORIES.slice(0, 10);

  return (
    <section className="bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              className="w-full h-11 pl-10 pr-20 rounded-xl bg-slate-100/80 hover:bg-slate-100 focus:bg-white border border-transparent focus:border-[#01875F] text-sm text-slate-900 placeholder:text-slate-500 outline-none transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg"
              >
                <X className="w-3.5 h-3.5" />
                {t.clearSearch}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onToggleLang}
            title="Switch Language (English / বাংলা)"
            className="h-11 px-3.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <Globe className="w-4 h-4 text-[#01875F]" />
            <span>{lang === 'en' ? 'বাংলা' : 'EN'}</span>
          </button>
        </div>

        {activeTab !== 'categories' && activeTab !== 'library' && (
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            <button
              type="button"
              onClick={() => onSelectCategory('All')}
              className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                selectedCategory === 'All'
                  ? 'bg-[#01875F] text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
              }`}
            >
              {lang === 'en' ? 'All' : 'সবগুলো'}
            </button>
            {categoryList.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => onSelectCategory(cat.name)}
                  className={`min-h-[36px] px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-[#01875F] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200/80'
                  }`}
                >
                  {lang === 'en' ? cat.name : cat.bnName}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
