import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { deleteDoc, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  X,
  Upload,
  ImagePlus,
  FileArchive,
  CheckCircle2,
  Loader2,
  Trash2,
  Plus,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AgeRating, AppType, DeveloperProfile, Language, StoreApp } from '../types';
import { APP_CATEGORIES, GAME_CATEGORIES } from '../data/categories';
import { copy } from '../i18n';
import { sanitizeIdSlug } from '../utils/crypto';
import { compressImageFile, STUDIO_ICON_PRESETS } from '../utils/imageCompress';

interface AddAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  developer: DeveloperProfile | null;
  myApps: StoreApp[];
  onPublished: (app: StoreApp) => void;
  lang: Language;
}

export const AddAppModal: React.FC<AddAppModalProps> = ({
  isOpen,
  onClose,
  user,
  developer,
  myApps,
  onPublished,
  lang,
}) => {
  const [activeView, setActiveView] = useState<'add' | 'manage'>('add');
  const [title, setTitle] = useState('');
  const [appType, setAppType] = useState<AppType>('Apps');
  const [category, setCategory] = useState('Tools');
  const [developerName, setDeveloperName] = useState('');
  const [packageName, setPackageName] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [sizeLabel, setSizeLabel] = useState('28 MB');
  const [ageRating, setAgeRating] = useState<AgeRating>('3+');
  const [shortDescription, setShortDescription] = useState('');
  const [description, setDescription] = useState('');
  const [whatsNew, setWhatsNew] = useState('Initial release on Appzora.');
  const [iconUrl, setIconUrl] = useState(STUDIO_ICON_PRESETS[2].url);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [apkFileName, setApkFileName] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const t = copy[lang];

  useEffect(() => {
    if (isOpen && developer) {
      setDeveloperName((prev) => prev || developer.studioName || `${developer.firstName} ${developer.lastName}`);
      setErrorMsg('');
    }
  }, [isOpen, developer]);

  // Keep category synced when switching between Games and Apps
  useEffect(() => {
    const validList = appType === 'Games' ? GAME_CATEGORIES : APP_CATEGORIES;
    if (!validList.some((c) => c.name === category)) {
      setCategory(validList[0].name);
    }
  }, [appType, category]);

  if (!isOpen || !user || !developer || developer.status !== 'verified') return null;

  const availableCategories = appType === 'Games' ? GAME_CATEGORIES : APP_CATEGORIES;

  const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, 256, 256, 0.85);
      setIconUrl(compressed);
    } catch {
      setErrorMsg('Could not process icon image. Please try another PNG/JPG file.');
    }
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).slice(0, 3 - screenshots.length);
    if (files.length === 0) return;
    try {
      const compressedList = await Promise.all(
        files.map((f) => compressImageFile(f, 720, 405, 0.8))
      );
      setScreenshots((prev) => [...prev, ...compressedList].slice(0, 3));
    } catch {
      setErrorMsg('Could not process screenshot image.');
    }
  };

  const handleApkSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setApkFileName(file.name.slice(0, 120));
    const mb = Math.max(1, Math.round(file.size / (1024 * 1024)));
    setSizeLabel(`${mb} MB`);
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanTitle = title.trim();
    if (cleanTitle.length < 2) {
      setErrorMsg(
        lang === 'en' ? 'App title must be at least 2 characters.' : 'অ্যাপের নাম কমপক্ষে ২ অক্ষরের দিন।'
      );
      return;
    }

    const cleanShort = shortDescription.trim();
    if (cleanShort.length < 5) {
      setErrorMsg(
        lang === 'en'
          ? 'Please enter a short tagline (at least 5 characters).'
          : 'সংক্ষিপ্ত পরিচিতি কমপক্ষে ৫ অক্ষরের লিখুন।'
      );
      return;
    }

    const cleanDesc = description.trim();
    if (cleanDesc.length < 10) {
      setErrorMsg(
        lang === 'en'
          ? 'Please provide an app description (at least 10 characters).'
          : 'অ্যাপের বিস্তারিত বিবরণ কমপক্ষে ১০ অক্ষরের লিখুন।'
      );
      return;
    }

    const cleanDev = developerName.trim() || developer.studioName;
    const slugSlug = cleanTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .slice(0, 24) || 'app';
    const rawPackage = (packageName.trim() || `com.appzora.${slugSlug}`).replace(/[^a-zA-Z0-9_.]/g, '');
    const cleanPackage = rawPackage.length >= 3 ? rawPackage : `com.appzora.${slugSlug}`;

    setPublishing(true);
    const appId = sanitizeIdSlug(cleanTitle);

    const banner =
      screenshots[0] ||
      (appType === 'Games'
        ? '/src/assets/images/appzora_hero_games_1794991680202.jpg'
        : '/src/assets/images/appzora_hero_apps_1794991680266.jpg');

    const newApp: StoreApp = {
      id: appId,
      ownerId: user.uid,
      title: cleanTitle.slice(0, 80),
      titleLower: cleanTitle.toLowerCase().slice(0, 80),
      packageName: cleanPackage.slice(0, 100),
      developerName: cleanDev.slice(0, 80),
      appType,
      category,
      shortDescription: cleanShort.slice(0, 160),
      description: cleanDesc.slice(0, 2500),
      whatsNew: (whatsNew.trim() || 'Initial release on Appzora.').slice(0, 500),
      version: (version.trim() || '1.0.0').slice(0, 24),
      sizeLabel: (sizeLabel.trim() || '25 MB').slice(0, 24),
      ageRating,
      iconUrl,
      bannerUrl: banner,
      screenshots: screenshots.slice(0, 3),
      downloadUrl: downloadUrl.trim().slice(0, 500),
      apkFileName: (apkFileName || `${slugSlug}-v${version || '1.0.0'}.apk`).slice(0, 120),
      rating: 0,
      ratingCount: 0,
      installCount: 0,
      status: 'published',
    };

    try {
      await setDoc(doc(db, 'apps', appId), {
        ...newApp,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Reset form cleanly
      setTitle('');
      setPackageName('');
      setShortDescription('');
      setDescription('');
      setScreenshots([]);
      setApkFileName('');
      setDownloadUrl('');
      onPublished(newApp);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `apps/${appId}`);
    } finally {
      setPublishing(false);
    }
  };

  const handleDeleteApp = async (appId: string) => {
    try {
      await deleteDoc(doc(db, 'apps', appId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `apps/${appId}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-white sm:rounded-3xl rounded-t-3xl border border-slate-200 shadow-2xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">{t.addAppTitle}</h2>
            <p className="text-xs text-slate-500">{t.addAppSub}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Add App console"
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Console Tabs */}
        <div className="px-6 pt-3 pb-2 border-b border-slate-100 flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveView('add')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              activeView === 'add'
                ? 'bg-[#01875F] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.addAppTitle}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveView('manage')}
            className={`px-4 py-2 rounded-xl text-xs font-semibold tabular-nums transition-colors ${
              activeView === 'manage'
                ? 'bg-[#01875F] text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {t.myPublishedApps} ({myApps.length})
          </button>
        </div>

        {activeView === 'manage' ? (
          <div className="p-6 overflow-y-auto space-y-3">
            {myApps.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-slate-600">You haven&apos;t published any apps yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveView('add')}
                  className="mt-3 px-4 py-2 rounded-xl bg-[#01875F] text-white text-xs font-semibold"
                >
                  Publish Your First App
                </button>
              </div>
            ) : (
              myApps.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60"
                >
                  <img
                    src={item.iconUrl}
                    alt={item.title}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 bg-white shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 truncate">{item.title}</div>
                    <div className="text-xs text-slate-500">
                      {item.appType} · {item.category} · v{item.version}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteApp(item.id)}
                    title="Delete app"
                    className="w-9 h-9 rounded-xl hover:bg-rose-50 text-slate-500 hover:text-rose-600 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          <form onSubmit={handlePublish} className="p-6 overflow-y-auto space-y-5">
            {/* App Icon Picker + Upload */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <img
                src={iconUrl}
                alt="App icon preview"
                className="w-20 h-20 rounded-2xl object-cover border border-slate-200 bg-white shrink-0 shadow-sm"
              />
              <div className="flex-1 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800">{t.iconLabel}</span>
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-800 inline-flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-[#01875F]" />
                    <span>{t.uploadIconBtn}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleIconUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-500">Presets:</span>
                  {STUDIO_ICON_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setIconUrl(preset.url)}
                      title={preset.label}
                      className={`w-8 h-8 rounded-lg overflow-hidden border-2 transition-all ${
                        iconUrl === preset.url ? 'border-[#01875F] scale-105' : 'border-transparent opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Title & App Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.appTitleLabel} *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Dhaka Runner HD"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-[#01875F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.appTypeLabel} *
                </label>
                <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl h-11">
                  {(['Apps', 'Games'] as AppType[]).map((typeOption) => (
                    <button
                      key={typeOption}
                      type="button"
                      onClick={() => setAppType(typeOption)}
                      className={`rounded-lg text-xs font-semibold transition-colors ${
                        appType === typeOption
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {typeOption}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Category & Developer Name */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.categoryLabel} *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-[#01875F]"
                >
                  {availableCategories.map((c) => (
                    <option key={c.name} value={c.name}>
                      {lang === 'en' ? c.name : `${c.bnName} (${c.name})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.developerLabel} *
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={developerName}
                  onChange={(e) => setDeveloperName(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-[#01875F]"
                />
              </div>
            </div>

            {/* Package ID, Version, Size, Age */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.versionLabel}
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  placeholder="1.0.0"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 outline-none focus:border-[#01875F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.sizeLabel}
                </label>
                <input
                  type="text"
                  maxLength={24}
                  value={sizeLabel}
                  onChange={(e) => setSizeLabel(e.target.value)}
                  placeholder="28 MB"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 outline-none focus:border-[#01875F]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.ageRatingLabel}
                </label>
                <select
                  value={ageRating}
                  onChange={(e) => setAgeRating(e.target.value as AgeRating)}
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-[#01875F]"
                >
                  {(['3+', '7+', '12+', '16+', '18+'] as AgeRating[]).map((age) => (
                    <option key={age} value={age}>
                      {age}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.packageLabel}
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  placeholder="com.appzora.app"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 font-mono text-xs text-slate-900 outline-none focus:border-[#01875F]"
                />
              </div>
            </div>

            {/* Tagline & Full Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.shortDescLabel} *
              </label>
              <input
                type="text"
                required
                maxLength={160}
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
                placeholder="One-line summary shown in the Play Store lobby"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-[#01875F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.fullDescLabel} *
              </label>
              <textarea
                rows={3}
                required
                maxLength={2500}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe features, gameplay, permissions, and highlights..."
                className="w-full p-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-[#01875F]"
              />
            </div>

            {/* Screenshots Upload */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-700">{t.screenshotsLabel}</label>
                {screenshots.length < 3 && (
                  <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-800 inline-flex items-center gap-1.5">
                    <ImagePlus className="w-3.5 h-3.5 text-[#01875F]" />
                    <span>{t.uploadScreenshotBtn}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleScreenshotUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
              {screenshots.length > 0 && (
                <div className="grid grid-cols-3 gap-2.5">
                  {screenshots.map((shot, idx) => (
                    <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-slate-200">
                      <img src={shot} alt={`Screenshot ${idx + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setScreenshots((prev) => prev.filter((_, i) => i !== idx))}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900/75 text-white flex items-center justify-center"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* APK / Download URL */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <label className="block text-xs font-semibold text-slate-700">{t.apkLabel}</label>
              <div className="flex flex-wrap items-center gap-3">
                <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-xs font-medium text-slate-800 inline-flex items-center gap-2">
                  <FileArchive className="w-4 h-4 text-[#01875F]" />
                  <span>{apkFileName || t.chooseApkBtn}</span>
                  <input
                    type="file"
                    accept=".apk,.aab,.zip"
                    onChange={handleApkSelect}
                    className="hidden"
                  />
                </label>
                <input
                  type="url"
                  value={downloadUrl}
                  onChange={(e) => setDownloadUrl(e.target.value)}
                  placeholder="Or paste direct APK download URL (optional)"
                  className="flex-1 min-w-[200px] h-10 px-3 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-[#01875F]"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={publishing}
              className="w-full h-12 rounded-xl bg-[#01875F] hover:bg-[#016e4d] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.publishingBtn}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{t.publishBtn}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
