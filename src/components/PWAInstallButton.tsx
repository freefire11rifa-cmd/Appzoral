import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Language } from '../types';

interface PWAInstallButtonProps {
  lang?: Language;
  variant?: 'compact' | 'menu';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  lang = 'en',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowGuide(true);
  };

  const label =
    lang === 'bn'
      ? isInstallable
        ? 'অ্যাপ ইনস্টল'
        : 'অ্যান্ড্রয়েড অ্যাপ'
      : isInstallable
        ? 'Install App'
        : 'Get App';

  return (
    <>
      {variant === 'menu' ? (
        <button
          type="button"
          onClick={handleClick}
          className="w-full min-h-[52px] px-4 py-2.5 rounded-2xl hover:bg-slate-50 flex items-center gap-3.5 text-left transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#01875F] flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-900">
              {lang === 'bn'
                ? 'Appzora মোবাইল অ্যাপ ইনস্টল'
                : 'Install Appzora on Device'}
            </div>
            <div className="text-xs text-slate-500">
              {isInstallable
                ? lang === 'bn'
                  ? 'সরাসরি হোম স্ক্রিনে ইনস্টল করুন'
                  : '1-tap Android / Desktop WebAPK install'
                : lang === 'bn'
                  ? 'অ্যান্ড্রয়েড / iOS ইনস্টল গাইড দেখুন'
                  : 'Android WebAPK & APK packaging steps'}
            </div>
          </div>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="min-h-[38px] px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100/80 text-[#01875F] text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{label}</span>
        </button>
      )}

      {showGuide && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowGuide(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#01875F]" />
                <h3 className="font-display text-base font-bold text-slate-900">
                  {lang === 'bn'
                    ? 'মোবাইলে Appzora ইনস্টল করুন'
                    : 'Install Appzora on Mobile'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Close install guide"
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-sm text-slate-600 leading-relaxed">
              {isIOS ? (
                <div className="space-y-2">
                  <p className="font-semibold text-slate-900">
                    {lang === 'bn' ? 'iPhone / iPad (Safari):' : 'iPhone / iPad (Safari):'}
                  </p>
                  <ol className="list-decimal pl-5 space-y-1.5 text-xs">
                    <li>
                      {lang === 'bn'
                        ? 'Safari টুলবারের Share বোতামে ট্যাপ করুন।'
                        : 'Tap the Share button in the Safari toolbar.'}
                    </li>
                    <li>
                      {lang === 'bn'
                        ? 'নিচে স্ক্রল করে "Add to Home Screen" সিলেক্ট করুন।'
                        : 'Scroll down and tap "Add to Home Screen".'}
                    </li>
                  </ol>
                </div>
              ) : (
                <>
                  <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5">
                    <p className="text-xs font-semibold text-[#01875F]">
                      {lang === 'bn'
                        ? '১) অ্যান্ড্রয়েড ফোনে সরাসরি ইনস্টল (WebAPK):'
                        : '1) Direct Install on Android (WebAPK):'}
                    </p>
                    <p className="text-xs text-slate-700">
                      {lang === 'bn'
                        ? 'অ্যান্ড্রয়েড Chrome ব্রাউজারে এই অ্যাপটি সরাসরি ওপেন করে মেনু (⋮) → "Install app" বা "Add to Home screen" চাপুন। এটি আসল অ্যাপের মতোই কাজ করবে।'
                        : 'Open the Shared App URL directly in Android Chrome, then tap menu (⋮) → "Install app". Android installs Appzora as a standalone app.'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                    <p className="text-xs font-semibold text-slate-900">
                      {lang === 'bn'
                        ? '২) ডাউনলোডযোগ্য .APK ফাইল তৈরি করতে চাইলে:'
                        : '2) To generate a downloadable .APK file:'}
                    </p>
                    <p className="text-xs text-slate-600">
                      {lang === 'bn'
                        ? 'এই অ্যাপে PWA Manifest ও আইকন যুক্ত করা হয়েছে। আপনার Shared App URL-টি PWABuilder (pwabuilder.com)-এ দিয়ে এক ক্লিকে সাইন্ড Android .APK ডাউনলোড করতে পারবেন।'
                        : 'Appzora now includes a full PWA Manifest and icons. Enter your Shared App URL at PWABuilder (pwabuilder.com) to package a signed Android .APK.'}
                    </p>
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="w-full h-11 rounded-xl bg-[#01875F] hover:bg-[#016e4d] text-white text-sm font-semibold transition-colors"
              >
                {lang === 'bn' ? 'বুঝেছি' : 'Got it'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
