import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import {
  X,
  Star,
  Download,
  Check,
  Bookmark,
  ExternalLink,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { AppReview, Language, StoreApp } from '../types';
import { copy } from '../i18n';
import { formatInstallCount, sanitizeIdSlug } from '../utils/crypto';

interface AppDetailModalProps {
  app: StoreApp | null;
  onClose: () => void;
  user: User | null;
  isInstalled: boolean;
  isWishlisted: boolean;
  isInstalling: boolean;
  onInstall: (app: StoreApp) => void;
  onUninstall: (app: StoreApp) => void;
  onToggleWishlist: (app: StoreApp) => void;
  onSignIn: () => void;
  lang: Language;
}

export const AppDetailModal: React.FC<AppDetailModalProps> = ({
  app,
  onClose,
  user,
  isInstalled,
  isWishlisted,
  isInstalling,
  onInstall,
  onUninstall,
  onToggleWishlist,
  onSignIn,
  lang,
}) => {
  const [reviews, setReviews] = useState<AppReview[]>([]);
  const [ratingInput, setRatingInput] = useState(5);
  const [commentInput, setCommentInput] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [iconErr, setIconErr] = useState(false);

  const t = copy[lang];

  useEffect(() => {
    setIconErr(false);
    setReviewError('');
    if (!app || app.isSeed) {
      setReviews([]);
      return;
    }

    const reviewsPath = `apps/${app.id}/reviews`;
    const q = query(collection(db, reviewsPath), where('appId', '==', app.id));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const getMs = (ts: unknown) =>
          ts && typeof ts === 'object' && 'toMillis' in ts
            ? (ts as { toMillis: () => number }).toMillis()
            : 0;
        const items: AppReview[] = snap.docs
          .map((d) => d.data() as AppReview)
          .sort((a, b) => getMs(b.createdAt) - getMs(a.createdAt));
        setReviews(items);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, reviewsPath);
      }
    );

    return () => unsub();
  }, [app]);

  if (!app) return null;

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onSignIn();
      return;
    }
    if (app.isSeed) {
      setReviewError(
        lang === 'en'
          ? 'Reviews are enabled for community-published apps.'
          : 'কমিউনিটি প্রকাশিত অ্যাপগুলোর জন্য রিভিউ সক্রিয় রয়েছে।'
      );
      return;
    }
    const trimmed = commentInput.trim();
    if (trimmed.length < 2) {
      setReviewError(lang === 'en' ? 'Please write at least 2 characters.' : 'অন্তত ২ অক্ষরের রিভিউ লিখুন।');
      return;
    }

    setSubmittingReview(true);
    setReviewError('');
    try {
      const reviewId = sanitizeIdSlug(`${user.uid.slice(0, 8)}-${Date.now()}`);
      const appRef = doc(db, 'apps', app.id);
      const reviewRef = doc(db, `apps/${app.id}/reviews`, reviewId);

      await runTransaction(db, async (tx) => {
        const appSnap = await tx.get(appRef);
        if (!appSnap.exists()) throw new Error('App not found');
        const current = appSnap.data() as StoreApp;
        const nextCount = (current.ratingCount || 0) + 1;
        const nextRating = Number(
          (((current.rating || 0) * (current.ratingCount || 0) + ratingInput) / nextCount).toFixed(2)
        );

        tx.set(reviewRef, {
          id: reviewId,
          appId: app.id,
          authorId: user.uid,
          authorName: (user.displayName || user.email?.split('@')[0] || 'Appzora User').slice(0, 80),
          authorPhoto: (user.photoURL || '').slice(0, 500),
          rating: ratingInput,
          comment: trimmed,
          createdAt: serverTimestamp(),
        });

        tx.update(appRef, {
          rating: nextRating,
          ratingCount: nextCount,
          updatedAt: serverTimestamp(),
        });
      });

      setCommentInput('');
      setRatingInput(5);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : 'Failed to post review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-3xl bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Top bar */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <span className="text-xs font-medium text-slate-500">
            {app.appType} / {app.category}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close app details"
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="p-6 overflow-y-auto space-y-7">
          {/* Header Hero */}
          <div className="flex flex-col sm:flex-row sm:items-start gap-5">
            <div className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center shadow-sm">
              {!iconErr && app.iconUrl ? (
                <img
                  src={app.iconUrl}
                  alt={app.title}
                  referrerPolicy="no-referrer"
                  onError={() => setIconErr(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-display font-bold text-3xl flex items-center justify-center">
                  {app.title.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                {app.title}
              </h2>
              <div className="mt-1 flex items-center gap-2 text-sm font-medium text-[#01875F]">
                <span>{app.developerName}</span>
                <ShieldCheck className="w-4 h-4 shrink-0" aria-label="Verified Developer" />
              </div>
              <p className="mt-2 text-sm text-slate-600">{app.shortDescription}</p>

              {/* Key Play Store Metrics Strip */}
              <div className="mt-5 grid grid-cols-4 gap-3 py-3 border-y border-slate-100 text-center">
                <div>
                  <div className="text-sm font-semibold text-slate-900 tabular-nums inline-flex items-center gap-1">
                    {app.rating > 0 ? app.rating.toFixed(1) : 'New'}
                    <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                    {app.ratingCount.toLocaleString()} reviews
                  </div>
                </div>
                <div className="border-l border-slate-100">
                  <div className="text-sm font-semibold text-slate-900 font-mono tabular-nums">
                    {app.sizeLabel}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Size</div>
                </div>
                <div className="border-l border-slate-100">
                  <div className="text-sm font-semibold text-slate-900 tabular-nums">
                    {formatInstallCount(app.installCount)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{t.downloads}</div>
                </div>
                <div className="border-l border-slate-100">
                  <div className="text-sm font-semibold text-slate-900 font-mono">
                    {app.ageRating}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Rated for</div>
                </div>
              </div>

              {/* Action Row */}
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {isInstalled ? (
                  <>
                    <button
                      type="button"
                      onClick={() => onUninstall(app)}
                      className="min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium inline-flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>{t.uninstall}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (app.downloadUrl && app.downloadUrl.startsWith('http')) {
                          // Safe display feedback without popup blocking
                        }
                      }}
                      className="min-h-[44px] px-6 py-2.5 rounded-xl bg-[#01875F] hover:bg-[#016e4d] text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                      <span>{t.installed}</span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => onInstall(app)}
                    disabled={isInstalling}
                    className="min-h-[44px] flex-1 sm:flex-initial sm:min-w-[190px] px-6 py-2.5 rounded-xl bg-[#01875F] hover:bg-[#016e4d] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>{isInstalling ? t.installing : t.install}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onToggleWishlist(app)}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl border text-sm font-medium inline-flex items-center gap-2 transition-colors ${
                    isWishlisted
                      ? 'border-emerald-200 bg-emerald-50 text-[#01875F]'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 ${isWishlisted ? 'fill-[#01875F]' : ''}`} />
                  <span>{isWishlisted ? 'Saved' : 'Wishlist'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* HD Screenshots */}
          {(app.screenshots.length > 0 || app.bannerUrl) && (
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900 mb-3">
                Preview Screenshots
              </h3>
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {(app.screenshots.length > 0 ? app.screenshots : [app.bannerUrl]).map((src, idx) => (
                  <div
                    key={`${app.id}-shot-${idx}`}
                    className="w-72 aspect-video rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0"
                  >
                    <img
                      src={src}
                      alt={`${app.title} preview ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* About this app */}
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900 mb-2">
              {t.aboutThisApp}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
              {app.description}
            </p>
          </div>

          {/* What's new */}
          {app.whatsNew && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <h4 className="font-display text-sm font-semibold text-slate-900">
                What&apos;s New in v{app.version}
              </h4>
              <p className="mt-1 text-sm text-slate-600">{app.whatsNew}</p>
            </div>
          )}

          {/* App Info Specs */}
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900 mb-3">
              {t.appInfo}
            </h3>
            <dl className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
              <div>
                <dt className="text-xs text-slate-500">Version</dt>
                <dd className="font-mono text-slate-900 mt-0.5 tabular-nums">{app.version}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Package ID</dt>
                <dd className="font-mono text-slate-900 mt-0.5 truncate">{app.packageName}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate-500">Package File</dt>
                <dd className="font-mono text-slate-900 mt-0.5 truncate inline-flex items-center gap-1">
                  <span>{app.apkFileName || 'app-release.apk'}</span>
                  {app.downloadUrl && <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />}
                </dd>
              </div>
            </dl>
          </div>

          {/* Ratings & Reviews */}
          <div className="pt-2 border-t border-slate-100">
            <h3 className="font-display text-base font-semibold text-slate-900 mb-3">
              {t.reviewsTitle}
            </h3>

            {!app.isSeed && (
              <form onSubmit={handleSubmitReview} className="mb-5 bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">{t.writeReview}</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((starVal) => (
                      <button
                        key={starVal}
                        type="button"
                        onClick={() => setRatingInput(starVal)}
                        className="p-1 focus:outline-none"
                        aria-label={`Rate ${starVal} stars`}
                      >
                        <Star
                          className={`w-5 h-5 ${
                            starVal <= ratingInput
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  placeholder={
                    user
                      ? 'Share your experience with this app...'
                      : 'Sign in with Gmail to leave a verified review'
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#01875F]"
                />
                {reviewError && <p className="text-xs text-rose-600">{reviewError}</p>}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-4 py-2 rounded-xl bg-[#01875F] hover:bg-[#016e4d] disabled:opacity-60 text-white text-xs font-semibold transition-colors"
                  >
                    {submittingReview ? 'Posting...' : user ? t.submitReview : t.signInGmail}
                  </button>
                </div>
              </form>
            )}

            {reviews.length === 0 ? (
              <p className="text-xs text-slate-500">
                {app.isSeed
                  ? `${app.ratingCount.toLocaleString()} verified store ratings averaged ${app.rating.toFixed(1)} stars.`
                  : 'No reviews yet. Be the first to review this app!'}
              </p>
            ) : (
              <div className="space-y-3">
                {reviews.map((rev) => (
                  <div key={rev.id} className="border border-slate-200/80 rounded-2xl p-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-[#01875F] text-xs font-bold flex items-center justify-center">
                          {rev.authorName.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-slate-900">{rev.authorName}</span>
                      </div>
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
