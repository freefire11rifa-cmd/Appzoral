import React, { useEffect, useMemo, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  ArrowRight,
  BookmarkCheck,
  CheckCircle2,
  Gamepad2,
  LayoutGrid,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  ActiveTab,
  DeveloperProfile,
  Language,
  StoreApp,
  UserLibraryItem,
} from './types';
import { copy } from './i18n';
import { SEED_APPS } from './data/seedApps';
import { APP_CATEGORIES, GAME_CATEGORIES } from './data/categories';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TopBar } from './components/TopBar';
import { StoreToolbar } from './components/StoreToolbar';
import { AppCard } from './components/AppCard';
import { AppDetailModal } from './components/AppDetailModal';
import { AccountModal } from './components/AccountModal';
import { DeveloperOnboardingModal } from './components/DeveloperOnboardingModal';
import { AddAppModal } from './components/AddAppModal';
import { OfflineIndicator } from './components/OfflineIndicator';

interface LocalLibraryMap {
  [appId: string]: { installed: boolean; wishlisted: boolean };
}

function getTimestampMillis(ts: unknown): number {
  if (!ts) return 0;
  if (typeof ts === 'object' && ts !== null && 'toMillis' in ts) {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return 0;
}

function AppzoraStore() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const [developer, setDeveloper] = useState<DeveloperProfile | null>(null);
  const [firestoreApps, setFirestoreApps] = useState<StoreApp[]>([]);
  const [localLibrary, setLocalLibrary] = useState<LocalLibraryMap>({});
  const [installingIds, setInstallingIds] = useState<Record<string, boolean>>({});

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [lang, setLang] = useState<Language>('en');

  const [selectedApp, setSelectedApp] = useState<StoreApp | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isDevOnboardingOpen, setIsDevOnboardingOpen] = useState(false);
  const [isAddAppOpen, setIsAddAppOpen] = useState(false);
  const [pendingUploadAfterSignIn, setPendingUploadAfterSignIn] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const t = copy[lang];

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((curr) => (curr === msg ? null : curr));
    }, 3500);
  };

  // Load local library cache per user
  useEffect(() => {
    const key = `appzora_lib_${user?.uid || 'guest'}`;
    try {
      const raw = localStorage.getItem(key);
      setLocalLibrary(raw ? (JSON.parse(raw) as LocalLibraryMap) : {});
    } catch {
      setLocalLibrary({});
    }
  }, [user]);

  const updateLocalLibrary = (appId: string, patch: { installed?: boolean; wishlisted?: boolean }) => {
    const key = `appzora_lib_${user?.uid || 'guest'}`;
    setLocalLibrary((prev) => {
      const existing = prev[appId] || { installed: false, wishlisted: false };
      const next: LocalLibraryMap = {
        ...prev,
        [appId]: {
          installed: patch.installed ?? existing.installed,
          wishlisted: patch.wishlisted ?? existing.wishlisted,
        },
      };
      try {
        localStorage.setItem(key, JSON.stringify(next));
      } catch {
        // Ignore storage quota issues
      }
      return next;
    });
  };

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  // Real-time Firestore catalog listener
  useEffect(() => {
    if (!authReady) return;
    const q = query(collection(db, 'apps'), where('status', '==', 'published'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs
          .map((d) => d.data() as StoreApp)
          .sort((a, b) => getTimestampMillis(b.createdAt) - getTimestampMillis(a.createdAt));
        setFirestoreApps(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'apps');
      }
    );
    return () => unsub();
  }, [authReady]);

  // Developer profile & user library listeners when signed in
  useEffect(() => {
    if (!authReady || !user) {
      setDeveloper(null);
      return;
    }

    const devPath = `developers/${user.uid}`;
    const unsubDev = onSnapshot(
      doc(db, 'developers', user.uid),
      (snap) => {
        setDeveloper(snap.exists() ? (snap.data() as DeveloperProfile) : null);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, devPath);
      }
    );

    const libPath = `users/${user.uid}/library`;
    const libQuery = query(collection(db, libPath), where('userId', '==', user.uid));
    const unsubLib = onSnapshot(
      libQuery,
      (snap) => {
        if (snap.empty) return;
        setLocalLibrary((prev) => {
          const merged = { ...prev };
          snap.docs.forEach((d) => {
            const item = d.data() as UserLibraryItem;
            merged[item.appId] = {
              installed: item.installed,
              wishlisted: item.wishlisted,
            };
          });
          return merged;
        });
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, libPath);
      }
    );

    return () => {
      unsubDev();
      unsubLib();
    };
  }, [authReady, user]);

  // If user triggered Upload App while signed out, continue once signed in
  useEffect(() => {
    if (pendingUploadAfterSignIn && user && authReady) {
      setPendingUploadAfterSignIn(false);
      // Wait briefly for developer snapshot
      const timer = setTimeout(() => {
        if (developer?.status === 'verified') {
          setIsAddAppOpen(true);
        } else {
          setIsDevOnboardingOpen(true);
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [pendingUploadAfterSignIn, user, authReady, developer]);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      await signInWithPopup(auth, googleProvider);
      showToast(lang === 'en' ? 'Signed in with Gmail' : 'জিমেইল দিয়ে লগইন সম্পন্ন হয়েছে');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-in cancelled';
      if (!message.includes('popup-closed-by-user')) {
        showToast(message);
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setDeveloper(null);
    showToast(lang === 'en' ? 'Signed out of Appzora' : 'লগ আউট সম্পন্ন হয়েছে');
  };

  const handleOpenUploadFlow = () => {
    if (!user) {
      setPendingUploadAfterSignIn(true);
      void handleSignIn();
      return;
    }
    if (developer?.status === 'verified') {
      setIsAddAppOpen(true);
    } else {
      setIsDevOnboardingOpen(true);
    }
  };

  const allApps: StoreApp[] = useMemo(() => {
    return [...firestoreApps, ...SEED_APPS];
  }, [firestoreApps]);

  // Keep selectedApp synced if Firestore updates ratings/installs
  const syncedSelectedApp = useMemo(() => {
    if (!selectedApp) return null;
    return allApps.find((a) => a.id === selectedApp.id) || selectedApp;
  }, [allApps, selectedApp]);

  const myPublishedApps = useMemo(() => {
    if (!user) return [];
    return firestoreApps.filter((a) => a.ownerId === user.uid);
  }, [firestoreApps, user]);

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allApps.filter((app) => {
      if (activeTab === 'games' && app.appType !== 'Games') return false;
      if (activeTab === 'apps' && app.appType !== 'Apps') return false;
      if (selectedCategory !== 'All' && app.category !== selectedCategory) return false;
      if (q) {
        const matchTitle = app.title.toLowerCase().includes(q);
        const matchDev = app.developerName.toLowerCase().includes(q);
        const matchCat = app.category.toLowerCase().includes(q);
        const matchDesc = app.shortDescription.toLowerCase().includes(q);
        if (!matchTitle && !matchDev && !matchCat && !matchDesc) return false;
      }
      return true;
    });
  }, [allApps, activeTab, selectedCategory, searchQuery]);

  const installedApps = useMemo(() => {
    return allApps.filter((app) => localLibrary[app.id]?.installed);
  }, [allApps, localLibrary]);

  const wishlistedApps = useMemo(() => {
    return allApps.filter((app) => localLibrary[app.id]?.wishlisted);
  }, [allApps, localLibrary]);

  const handleInstallApp = async (app: StoreApp, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (localLibrary[app.id]?.installed) {
      setSelectedApp(app);
      return;
    }

    setInstallingIds((prev) => ({ ...prev, [app.id]: true }));
    await new Promise((r) => setTimeout(r, 750));

    updateLocalLibrary(app.id, { installed: true });

    // Sync to Firestore if it's a published Firestore app and user is signed in
    if (!app.isSeed && user) {
      try {
        const appRef = doc(db, 'apps', app.id);
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(appRef);
          if (!snap.exists()) return;
          const current = snap.data() as StoreApp;
          tx.update(appRef, {
            installCount: (current.installCount || 0) + 1,
            updatedAt: serverTimestamp(),
          });
        });

        await setDoc(
          doc(db, `users/${user.uid}/library`, app.id),
          {
            appId: app.id,
            userId: user.uid,
            installed: true,
            wishlisted: Boolean(localLibrary[app.id]?.wishlisted),
            installedVersion: app.version,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `apps/${app.id}`);
      }
    }

    setInstallingIds((prev) => ({ ...prev, [app.id]: false }));
    showToast(
      lang === 'en' ? `${app.title} installed` : `${app.title} ইনস্টল সম্পন্ন হয়েছে`
    );
  };

  const handleUninstallApp = async (app: StoreApp) => {
    updateLocalLibrary(app.id, { installed: false });
    if (!app.isSeed && user) {
      try {
        await setDoc(
          doc(db, `users/${user.uid}/library`, app.id),
          {
            appId: app.id,
            userId: user.uid,
            installed: false,
            wishlisted: Boolean(localLibrary[app.id]?.wishlisted),
            installedVersion: app.version,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/library/${app.id}`);
      }
    }
    showToast(lang === 'en' ? `${app.title} uninstalled` : `${app.title} আনইনস্টল করা হয়েছে`);
  };

  const handleToggleWishlist = async (app: StoreApp) => {
    const nextWish = !localLibrary[app.id]?.wishlisted;
    updateLocalLibrary(app.id, { wishlisted: nextWish });
    if (!app.isSeed && user) {
      try {
        await setDoc(
          doc(db, `users/${user.uid}/library`, app.id),
          {
            appId: app.id,
            userId: user.uid,
            installed: Boolean(localLibrary[app.id]?.installed),
            wishlisted: nextWish,
            installedVersion: app.version,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/library/${app.id}`);
      }
    }
  };

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setSelectedCategory('All');
  };

  const handleCategoryJump = (categoryName: string, appType: 'Games' | 'Apps') => {
    setActiveTab(appType === 'Games' ? 'games' : 'apps');
    setSelectedCategory(categoryName);
    setSearchQuery('');
  };

  const isFilteredView =
    searchQuery.trim().length > 0 || selectedCategory !== 'All' || activeTab === 'games' || activeTab === 'apps';

  const heroGame = allApps.find((a) => a.id === 'seed-apex-nitro-drift') || allApps[0];
  const heroApp = allApps.find((a) => a.id === 'seed-luminary-pro-editor') || allApps[2];

  const topGames = allApps.filter((a) => a.appType === 'Games').slice(0, 6);
  const essentialApps = allApps.filter((a) => a.appType === 'Apps').slice(0, 6);

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAF9] text-slate-900 pb-20 md:pb-0">
      <TopBar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        user={user}
        onSignIn={handleSignIn}
        onOpenAccount={() => setIsAccountOpen(true)}
        lang={lang}
        isSigningIn={isSigningIn}
      />

      <StoreToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        activeTab={activeTab}
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'en' ? 'bn' : 'en'))}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-7 space-y-10">
        {/* CATEGORIES DIRECTORY VIEW */}
        {activeTab === 'categories' && !searchQuery.trim() && (
          <div className="space-y-10">
            <section>
              <div className="flex items-center gap-2.5 mb-5">
                <Gamepad2 className="w-5 h-5 text-[#01875F]" />
                <h1 className="font-display text-2xl font-bold text-slate-900">
                  {lang === 'en' ? 'Game Categories' : 'গেমের ক্যাটাগরি'}
                </h1>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {GAME_CATEGORIES.map((cat) => {
                  const count = allApps.filter((a) => a.category === cat.name).length;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => handleCategoryJump(cat.name, 'Games')}
                      className="text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#01875F] hover:shadow-sm transition-all flex items-center justify-between gap-4"
                    >
                      <div>
                        <h3 className="font-display text-base font-semibold text-slate-900">
                          {lang === 'en' ? cat.name : cat.bnName}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">{cat.description}</p>
                        <p className="mt-2 text-xs font-mono text-[#01875F] tabular-nums">
                          {count} {count === 1 ? 'title' : 'titles'}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2.5 mb-5">
                <LayoutGrid className="w-5 h-5 text-[#01875F]" />
                <h2 className="font-display text-2xl font-bold text-slate-900">
                  {lang === 'en' ? 'App Categories' : 'অ্যাপের ক্যাটাগরি'}
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {APP_CATEGORIES.map((cat) => {
                  const count = allApps.filter((a) => a.category === cat.name).length;
                  return (
                    <button
                      key={cat.name}
                      type="button"
                      onClick={() => handleCategoryJump(cat.name, 'Apps')}
                      className="text-left p-5 rounded-2xl bg-white border border-slate-200 hover:border-[#01875F] hover:shadow-sm transition-all flex items-center justify-between gap-4"
                    >
                      <div>
                        <h3 className="font-display text-base font-semibold text-slate-900">
                          {lang === 'en' ? cat.name : cat.bnName}
                        </h3>
                        <p className="mt-1 text-xs text-slate-500">{cat.description}</p>
                        <p className="mt-2 text-xs font-mono text-[#01875F] tabular-nums">
                          {count} {count === 1 ? 'app' : 'apps'}
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {/* MY LIBRARY VIEW */}
        {activeTab === 'library' && !searchQuery.trim() && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white border border-slate-200 rounded-2xl p-5">
              <div>
                <h1 className="font-display text-xl font-bold text-slate-900">{t.myLibrary}</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {user
                    ? `${user.email} · ${installedApps.length} installed · ${wishlistedApps.length} saved`
                    : 'Sign in with Gmail to sync your installed apps and developer console across devices.'}
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenUploadFlow}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-[#01875F] hover:bg-[#016e4d] text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <UploadCloud className="w-4 h-4" />
                <span>{t.uploadApp}</span>
              </button>
            </div>

            <section>
              <h2 className="font-display text-lg font-bold text-slate-900 mb-4">
                {lang === 'en' ? 'Installed on this device' : 'ইনস্টল করা অ্যাপস'}
              </h2>
              {installedApps.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
                  <BookmarkCheck className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="mt-2 text-sm text-slate-600">
                    {lang === 'en'
                      ? 'You have not installed any apps yet. Explore the Home Lobby to install HD apps and games.'
                      : 'এখনো কোনো অ্যাপ ইনস্টল করা হয়নি। হোম লবি থেকে পছন্দের অ্যাপ ইনস্টল করুন।'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {installedApps.map((app) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      isInstalled={true}
                      isInstalling={Boolean(installingIds[app.id])}
                      onOpen={setSelectedApp}
                      onInstall={handleInstallApp}
                      lang={lang}
                    />
                  ))}
                </div>
              )}
            </section>

            {wishlistedApps.length > 0 && (
              <section>
                <h2 className="font-display text-lg font-bold text-slate-900 mb-4">Wishlist</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {wishlistedApps.map((app) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      isInstalled={Boolean(localLibrary[app.id]?.installed)}
                      isInstalling={Boolean(installingIds[app.id])}
                      onOpen={setSelectedApp}
                      onInstall={handleInstallApp}
                      lang={lang}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {/* FILTERED / SEARCH / GAMES / APPS GRID */}
        {activeTab !== 'categories' && activeTab !== 'library' && isFilteredView && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="font-display text-2xl font-bold text-slate-900">
                  {searchQuery.trim()
                    ? `Results for "${searchQuery.trim()}"`
                    : selectedCategory !== 'All'
                      ? selectedCategory
                      : activeTab === 'games'
                        ? t.navGames
                        : t.navApps}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                  {filteredApps.length} {filteredApps.length === 1 ? 'listing' : 'listings'}
                </p>
              </div>
              {(searchQuery || selectedCategory !== 'All') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                  }}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700"
                >
                  {t.resetFilters}
                </button>
              )}
            </div>

            {filteredApps.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                <h3 className="font-display text-base font-semibold text-slate-900">
                  {t.noResultsTitle}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{t.noResultsDesc}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('All');
                    setActiveTab('home');
                  }}
                  className="mt-4 px-5 py-2.5 rounded-xl bg-[#01875F] text-white text-xs font-semibold"
                >
                  {t.resetFilters}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredApps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    isInstalled={Boolean(localLibrary[app.id]?.installed)}
                    isInstalling={Boolean(installingIds[app.id])}
                    onOpen={setSelectedApp}
                    onInstall={handleInstallApp}
                    lang={lang}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* HOME LOBBY */}
        {activeTab === 'home' && !isFilteredView && (
          <>
            {/* Editorial HD Hero Showcase */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
              {heroGame && (
                <div
                  onClick={() => setSelectedApp(heroGame)}
                  className="lg:col-span-2 relative rounded-3xl overflow-hidden cursor-pointer border border-slate-200/80 min-h-[290px] sm:min-h-[340px] flex flex-col justify-end group"
                >
                  <img
                    src="/src/assets/images/appzora_hero_games_1794991680202.jpg"
                    alt={heroGame.title}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent" />
                  <div className="relative z-10 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div className="max-w-xl">
                      <span className="text-xs font-semibold tracking-wide text-emerald-300">
                        {t.heroFeaturedTag} · {heroGame.category}
                      </span>
                      <h1 className="mt-1.5 font-display text-2xl sm:text-4xl font-bold text-white tracking-tight text-balance">
                        {heroGame.title}
                      </h1>
                      <p className="mt-2 text-sm text-slate-200 line-clamp-2">
                        {heroGame.shortDescription}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => handleInstallApp(heroGame, e)}
                      className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#01875F] hover:bg-[#016e4d] text-white text-sm font-semibold whitespace-nowrap shrink-0 transition-colors"
                    >
                      {localLibrary[heroGame.id]?.installed ? t.installed : t.install}
                    </button>
                  </div>
                </div>
              )}

              {heroApp && (
                <div
                  onClick={() => setSelectedApp(heroApp)}
                  className="relative rounded-3xl overflow-hidden cursor-pointer border border-slate-200/80 min-h-[260px] flex flex-col justify-end group"
                >
                  <img
                    src="/src/assets/images/appzora_hero_apps_1794991680266.jpg"
                    alt={heroApp.title}
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/35 to-transparent" />
                  <div className="relative z-10 p-6 space-y-3">
                    <span className="text-xs font-semibold text-amber-300">
                      Editors&apos; Choice · {heroApp.category}
                    </span>
                    <div className="flex items-center gap-3">
                      <img
                        src={heroApp.iconUrl}
                        alt={heroApp.title}
                        className="w-12 h-12 rounded-xl object-cover border border-white/20 shrink-0"
                      />
                      <div className="min-w-0">
                        <h2 className="font-display text-lg font-bold text-white truncate">
                          {heroApp.title}
                        </h2>
                        <p className="text-xs text-slate-300 truncate">{heroApp.developerName}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* Fresh on Appzora — Live Community Published Apps */}
            {firestoreApps.length > 0 && (
              <section>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-[#01875F]" />
                    <div>
                      <h2 className="font-display text-xl font-bold text-slate-900">
                        {t.freshSection}
                      </h2>
                      <p className="text-xs text-slate-500">{t.freshSub}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {firestoreApps.map((app) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      isInstalled={Boolean(localLibrary[app.id]?.installed)}
                      isInstalling={Boolean(installingIds[app.id])}
                      onOpen={setSelectedApp}
                      onInstall={handleInstallApp}
                      lang={lang}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Top HD Games */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-slate-900">
                  {t.topGamesSection}
                </h2>
                <button
                  type="button"
                  onClick={() => handleSelectTab('games')}
                  className="text-xs font-semibold text-[#01875F] hover:underline inline-flex items-center gap-1"
                >
                  <span>{lang === 'en' ? 'See all games' : 'সব গেম দেখুন'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topGames.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    isInstalled={Boolean(localLibrary[app.id]?.installed)}
                    isInstalling={Boolean(installingIds[app.id])}
                    onOpen={setSelectedApp}
                    onInstall={handleInstallApp}
                    lang={lang}
                  />
                ))}
              </div>
            </section>

            {/* Essential Apps */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-xl font-bold text-slate-900">
                  {t.essentialAppsSection}
                </h2>
                <button
                  type="button"
                  onClick={() => handleSelectTab('apps')}
                  className="text-xs font-semibold text-[#01875F] hover:underline inline-flex items-center gap-1"
                >
                  <span>{lang === 'en' ? 'See all apps' : 'সব অ্যাপ দেখুন'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {essentialApps.map((app) => (
                  <AppCard
                    key={app.id}
                    app={app}
                    isInstalled={Boolean(localLibrary[app.id]?.installed)}
                    isInstalling={Boolean(installingIds[app.id])}
                    onOpen={setSelectedApp}
                    onInstall={handleInstallApp}
                    lang={lang}
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      {/* Clean Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="font-medium text-slate-700">
            © {new Date().getFullYear()} Appzora Store · HD Apps &amp; Games Marketplace
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => handleSelectTab('games')}
              className="hover:text-slate-900"
            >
              {t.navGames}
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('apps')}
              className="hover:text-slate-900"
            >
              {t.navApps}
            </button>
            <button
              type="button"
              onClick={() => handleSelectTab('categories')}
              className="hover:text-slate-900"
            >
              {t.navCategories}
            </button>
            <button
              type="button"
              onClick={handleOpenUploadFlow}
              className="text-[#01875F] font-semibold hover:underline"
            >
              {t.uploadApp}
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AppDetailModal
        app={syncedSelectedApp}
        onClose={() => setSelectedApp(null)}
        user={user}
        isInstalled={syncedSelectedApp ? Boolean(localLibrary[syncedSelectedApp.id]?.installed) : false}
        isWishlisted={syncedSelectedApp ? Boolean(localLibrary[syncedSelectedApp.id]?.wishlisted) : false}
        isInstalling={syncedSelectedApp ? Boolean(installingIds[syncedSelectedApp.id]) : false}
        onInstall={(a) => void handleInstallApp(a)}
        onUninstall={(a) => void handleUninstallApp(a)}
        onToggleWishlist={(a) => void handleToggleWishlist(a)}
        onSignIn={handleSignIn}
        lang={lang}
      />

      <AccountModal
        isOpen={isAccountOpen}
        onClose={() => setIsAccountOpen(false)}
        user={user}
        developer={developer}
        installedCount={installedApps.length}
        onOpenUploadFlow={handleOpenUploadFlow}
        onOpenLibrary={() => handleSelectTab('library')}
        onSwitchAccount={handleSignIn}
        onSignOut={handleSignOut}
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'en' ? 'bn' : 'en'))}
      />

      <DeveloperOnboardingModal
        isOpen={isDevOnboardingOpen}
        onClose={() => setIsDevOnboardingOpen(false)}
        user={user}
        developer={developer}
        onVerifiedComplete={() => {
          setIsDevOnboardingOpen(false);
          setIsAddAppOpen(true);
          showToast(
            lang === 'en'
              ? 'Developer account verified! You can now publish apps.'
              : 'ডেভেলপার অ্যাকাউন্ট ভেরিফাই হয়েছে! এখন অ্যাপ আপলোড করুন।'
          );
        }}
        lang={lang}
      />

      <AddAppModal
        isOpen={isAddAppOpen}
        onClose={() => setIsAddAppOpen(false)}
        user={user}
        developer={developer}
        myApps={myPublishedApps}
        onPublished={(newApp) => {
          setIsAddAppOpen(false);
          setActiveTab('home');
          setSelectedCategory('All');
          setSearchQuery('');
          showToast(
            lang === 'en'
              ? `"${newApp.title}" is now live in the Appzora Home Lobby!`
              : `"${newApp.title}" এখন Appzora হোম লবিতে লাইভ হয়েছে!`
          );
        }}
        lang={lang}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-medium max-w-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <OfflineIndicator lang={lang} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppzoraStore />
    </ErrorBoundary>
  );
}
