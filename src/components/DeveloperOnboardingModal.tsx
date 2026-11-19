import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import {
  X,
  Eye,
  EyeOff,
  Loader2,
  MailCheck,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Smartphone,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { DeveloperProfile, Language } from '../types';
import { copy } from '../i18n';
import {
  generateVerificationToken,
  isValidBangladeshiMobile,
  sha256Hex,
} from '../utils/crypto';

interface DeveloperOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  developer: DeveloperProfile | null;
  onVerifiedComplete: () => void;
  lang: Language;
}

type OnboardingStage = 'form' | 'loading' | 'verify_email' | 'success';

export const DeveloperOnboardingModal: React.FC<DeveloperOnboardingModalProps> = ({
  isOpen,
  onClose,
  user,
  developer,
  onVerifiedComplete,
  lang,
}) => {
  const [stage, setStage] = useState<OnboardingStage>('form');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [verifying, setVerifying] = useState(false);

  const t = copy[lang];

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    if (developer?.status === 'pending_verification') {
      setStage('verify_email');
      setEmail(developer.email);
      setFirstName(developer.firstName);
      setLastName(developer.lastName);
      setMobile(developer.mobile);
    } else {
      setStage('form');
      if (user) {
        const parts = (user.displayName || '').trim().split(/\s+/);
        setFirstName((prev) => prev || parts[0] || '');
        setLastName((prev) => prev || parts.slice(1).join(' ') || '');
        setEmail((prev) => prev || user.email || '');
      }
    }
  }, [isOpen, developer, user]);

  if (!isOpen || !user) return null;

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const fn = firstName.trim();
    const ln = lastName.trim();
    const mob = mobile.trim();
    const em = email.trim();

    if (!fn || !ln) {
      setErrorMsg(
        lang === 'en'
          ? 'Please enter both your First Name and Last Name.'
          : 'অনুগ্রহ করে আপনার ফার্স্ট নেম এবং লাস্ট নেম লিখুন।'
      );
      return;
    }

    if (!isValidBangladeshiMobile(mob)) {
      setErrorMsg(
        lang === 'en'
          ? 'Enter a valid 11-digit Bangladeshi mobile number starting with 01 (e.g. 01712345678).'
          : 'সঠিক ১১ ডিজিটের বাংলাদেশি মোবাইল নম্বর দিন (যেমন: 01712345678)।'
      );
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setErrorMsg(
        lang === 'en'
          ? 'Please enter a valid Gmail / email address.'
          : 'অনুগ্রহ করে একটি সঠিক জিমেইল ঠিকানা লিখুন।'
      );
      return;
    }

    if (password.length < 6) {
      setErrorMsg(
        lang === 'en'
          ? 'Password must be at least 6 characters.'
          : 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'
      );
      return;
    }

    if (!agreed) {
      setErrorMsg(
        lang === 'en'
          ? 'You must check the "I agree" box before continuing.'
          : 'এগিয়ে যাওয়ার আগে "I agree" বক্সে টিক চিহ্ন দিন।'
      );
      return;
    }

    // Show centered loading spinner
    setStage('loading');

    try {
      const passwordHash = await sha256Hex(password);
      const token = generateVerificationToken();
      const studioName = `${fn} ${ln}`.slice(0, 80);

      const devPath = `developers/${user.uid}`;
      const payload: DeveloperProfile = {
        uid: user.uid,
        firstName: fn,
        lastName: ln,
        mobile: mob,
        email: em,
        passwordHash,
        agreedToTerms: true,
        status: 'pending_verification',
        verificationToken: token,
        studioName,
      };

      await setDoc(doc(db, 'developers', user.uid), {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Keep loading spinner visible briefly so the transition feels intentional and smooth
      await new Promise((r) => setTimeout(r, 1200));
      setStage('verify_email');
    } catch (err) {
      setStage('form');
      if (err instanceof Error && err.message.includes('permission')) {
        handleFirestoreError(err, OperationType.CREATE, `developers/${user.uid}`);
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to create developer account.');
      }
    }
  };

  const handleApplyAndVerify = async () => {
    setVerifying(true);
    setErrorMsg('');
    try {
      await updateDoc(doc(db, 'developers', user.uid), {
        status: 'verified',
        updatedAt: serverTimestamp(),
      });
      setStage('success');
      setTimeout(() => {
        onVerifiedComplete();
      }, 950);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `developers/${user.uid}`);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-[#01875F]" />
            <h2 className="font-display text-base font-bold text-slate-900">
              {stage === 'verify_email' ? t.verifyTitle : t.devRegTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close developer setup"
            className="w-9 h-9 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stage 1: Registration Form */}
        {stage === 'form' && (
          <form onSubmit={handleSubmitForm} className="p-6 space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">{t.devRegSub}</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.firstName}
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Rifa"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-[#01875F]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t.lastName}
                </label>
                <input
                  type="text"
                  required
                  maxLength={60}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Ahmed"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-[#01875F]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">{t.mobileNumber}</label>
                <span className="text-[11px] font-mono tabular-nums text-slate-500">
                  {mobile.length}/11 digits
                </span>
              </div>
              <div className="relative">
                <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  maxLength={11}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 11))}
                  placeholder="01712345678"
                  className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-slate-200 bg-white font-mono tabular-nums text-sm text-slate-900 outline-none focus:border-[#01875F]"
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-500">{t.mobileHint}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.emailLabel}
              </label>
              <input
                type="email"
                required
                maxLength={150}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com"
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-[#01875F]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t.passwordLabel}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  maxLength={64}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full h-11 pl-3.5 pr-11 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 outline-none focus:border-[#01875F]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-[#01875F] rounded cursor-pointer"
              />
              <span className="text-xs text-slate-700 leading-relaxed">{t.agreeText}</span>
            </label>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              className="w-full h-12 rounded-xl bg-[#01875F] hover:bg-[#016e4d] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <span>{t.continueNext}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Stage 2: Centered Circular Loading Spinner */}
        {stage === 'loading' && (
          <div className="p-12 flex flex-col items-center justify-center text-center min-h-[340px]">
            <Loader2 className="w-12 h-12 text-[#01875F] animate-spin" />
            <h3 className="mt-5 font-display text-lg font-bold text-slate-900">
              {t.creatingAccountTitle}
            </h3>
            <p className="mt-2 text-sm text-slate-600 max-w-xs">{t.creatingAccountSub}</p>
          </div>
        )}

        {/* Stage 3: Gmail Verification / Apply Step */}
        {stage === 'verify_email' && (
          <div className="p-6 space-y-5">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#01875F] flex items-center justify-center shrink-0">
                <MailCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-slate-700">
                  {t.verifySentTo}{' '}
                  <span className="font-semibold text-slate-900">{email || developer?.email}</span>
                </p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">{t.verifyInstructions}</p>
              </div>
            </div>

            {/* Interactive Gmail Notification Message Card */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50">
              <div className="px-4 py-3 bg-white border-b border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-900">
                    Appzora Developer Console
                  </div>
                  <div className="text-[11px] text-slate-500">
                    noreply@appzora.store → {email || developer?.email}
                  </div>
                </div>
                <span className="text-[11px] font-mono text-slate-500">Just now</span>
              </div>

              <div className="p-4 space-y-3">
                <h4 className="font-display text-sm font-bold text-slate-900">
                  Apply &amp; Activate Your Appzora Developer Account
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Hello <span className="font-medium text-slate-900">{firstName} {lastName}</span>,
                  your registration with mobile <span className="font-mono">{mobile}</span> is ready.
                  Click the Apply button below to verify your Gmail and unlock the Add App console permanently.
                </p>

                <button
                  type="button"
                  onClick={handleApplyAndVerify}
                  disabled={verifying}
                  className="w-full h-11 rounded-xl bg-[#01875F] hover:bg-[#016e4d] disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t.verifyingBtn}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{t.applyNowBtn}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stage 4: Verified Success */}
        {stage === 'success' && (
          <div className="p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-[#01875F] flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="mt-4 font-display text-lg font-bold text-slate-900">
              {lang === 'en' ? 'Developer Account Verified!' : 'ডেভেলপার অ্যাকাউন্ট ভেরিফায়েড!'}
            </h3>
            <p className="mt-1.5 text-sm text-slate-600">
              {lang === 'en'
                ? 'Opening Add App publishing studio...'
                : 'অ্যাপ যোগ করার স্টুডিও (Add App) খোলা হচ্ছে...'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
