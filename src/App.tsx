import React, { useState, useEffect, useCallback } from 'react';
import { signInWithPopup, onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  LayoutDashboard,
  FileText,
  ArrowRightLeft,
  BarChart3,
  Users,
  ShieldCheck,
  Bell,
  Globe,
  Coins,
  Lock,
  LogIn,
  LogOut,
  Plus,
  X,
} from 'lucide-react';
import { auth, googleAuthProvider } from './lib/firebase';
import {
  WorkspaceBundle,
  RealTimeNotification,
  InvoiceRecord,
} from './types';
import {
  CURRENCY_RATES,
  SupportedCurrency,
  TaxJurisdictionCode,
  InvoiceLineItem,
  formatMoney,
} from './utils/accounting';
import { LOCALE_LABELS, SupportedLocale } from './utils/i18n';
import { OverviewView } from './components/OverviewView';
import { InvoicingView } from './components/InvoicingView';
import { ReconciliationAndExpensesView } from './components/ReconciliationAndExpensesView';
import { ReportsAndTemplatesView } from './components/ReportsAndTemplatesView';
import { PayrollView } from './components/PayrollView';
import { AdvisorAndSecurityView } from './components/AdvisorAndSecurityView';

type ActiveTab = 'dashboard' | 'invoicing' | 'reconciliation' | 'reports' | 'payroll' | 'advisors';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [openInvoiceBuilderOnLoad, setOpenInvoiceBuilderOnLoad] = useState(false);

  // Firebase Auth & Token State (in-memory token per security guidelines)
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string>('DEMO_SANDBOX_TOKEN');
  const [authError, setAuthError] = useState<string | null>(null);

  // Workspace Data from Cloud SQL (PostgreSQL)
  const [bundle, setBundle] = useState<WorkspaceBundle | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);

  // Multi-Currency & Multilingual Localization State
  const [displayCurrency, setDisplayCurrency] = useState<SupportedCurrency>('USD');
  const [locale, setLocale] = useState<SupportedLocale>('en');

  // Automated Real-Time Transaction Notifications
  const [notifications, setNotifications] = useState<RealTimeNotification[]>([
    {
      id: 'notif-init-1',
      title: 'OpenBanking Feed Synced',
      message: '3 statement lines imported from Mercury Operating & HSBC Multi-Currency.',
      timestamp: '15:24 UTC',
      category: 'RECONCILIATION',
      read: false,
    },
    {
      id: 'notif-init-2',
      title: 'Stripe Payout Reconciled',
      message: 'INV-2026-102 (A$15,400.00) settled and matched to General Ledger.',
      timestamp: '14:50 UTC',
      category: 'STRIPE',
      read: false,
    },
  ]);
  const [showNotificationDrawer, setShowNotificationDrawer] = useState(false);

  const pushNotification = useCallback(
    (
      title: string,
      message: string,
      category: RealTimeNotification['category']
    ) => {
      const nowStr = new Date().toISOString().slice(11, 16) + ' UTC';
      setNotifications((prev) => [
        {
          id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title,
          message,
          timestamp: nowStr,
          category,
          read: false,
        },
        ...prev,
      ]);
    },
    []
  );

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setFirebaseUser(user);
        const token = await user.getIdToken();
        setIdToken(token);
      } else {
        setFirebaseUser(null);
        setIdToken('DEMO_SANDBOX_TOKEN');
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchWorkspace = useCallback(async (tokenToUse: string) => {
    setApiError(null);
    try {
      const res = await fetch('/api/workspace', {
        headers: {
          Authorization: `Bearer ${tokenToUse}`,
        },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to load workspace ledger');
      }
      const data: WorkspaceBundle = await res.json();
      setBundle(data);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Unable to connect to ledger service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWorkspace(idToken);
  }, [idToken, fetchWorkspace]);

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      setIdToken(token);
      pushNotification(
        'Authenticated via Google OAuth',
        `Signed in as ${cred.user.email} — PostgreSQL ledger synchronized.`,
        'SECURITY'
      );
    } catch (err: unknown) {
      setAuthError(
        err instanceof Error ? err.message : 'Google Sign-In popup was closed or blocked.'
      );
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setIdToken('DEMO_SANDBOX_TOKEN');
    pushNotification(
      'Switched to Sandbox Organization',
      'Active session returned to Meridian Labs CFO Sandbox.',
      'SECURITY'
    );
  };

  // API Handlers
  const handleCreateInvoice = async (payload: {
    clientName: string;
    clientEmail: string;
    issueDate: string;
    dueDate: string;
    currency: SupportedCurrency;
    taxJurisdiction: TaxJurisdictionCode;
    lineItems: InvoiceLineItem[];
    notes: string;
  }) => {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to create invoice');
    }
    const created: InvoiceRecord = await res.json();
    await fetchWorkspace(idToken);
    pushNotification(
      `Invoice ${created.invoiceNumber} Issued`,
      `Billed ${created.clientName} for ${formatMoney(created.totalAmount, created.currency)} (${created.taxJurisdiction}).`,
      'INVOICE'
    );
  };

  const handlePayViaStripe = async (inv: InvoiceRecord) => {
    const res = await fetch(`/api/invoices/${inv.id}/pay-stripe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        invoiceNumber: inv.invoiceNumber,
        amount: inv.totalAmount,
        currency: inv.currency,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Stripe settlement failed');
    }
    const result = await res.json();
    await fetchWorkspace(idToken);
    pushNotification(
      `Stripe Payment Settled (${inv.invoiceNumber})`,
      `Processed ${formatMoney(inv.totalAmount, inv.currency)} via Stripe (${result.stripeSessionId}) & reconciled bank feed.`,
      'STRIPE'
    );
  };

  const handleReconcileTransaction = async (
    txId: number,
    matchedInvoiceId?: number | null,
    customNote?: string
  ) => {
    const res = await fetch(`/api/bank-transactions/${txId}/reconcile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ matchedInvoiceId, customNote }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to reconcile bank transaction');
    }
    await fetchWorkspace(idToken);
    pushNotification(
      'Bank Feed Line Reconciled',
      `Transaction #${txId} matched to General Ledger and verified in Audit Trail.`,
      'RECONCILIATION'
    );
  };

  const handleCreateExpense = async (payload: {
    merchant: string;
    category: string;
    expenseDate?: string;
    amount: string;
    currency: SupportedCurrency;
    taxAmount: string;
    submittedBy?: string;
  }) => {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to submit expense claim');
    }
    await fetchWorkspace(idToken);
    pushNotification(
      `Expense Claim Logged (${payload.merchant})`,
      `${formatMoney(payload.amount, payload.currency)} posted to ${payload.category} and Corporate Card feed.`,
      'EXPENSE'
    );
  };

  const handleRunPayroll = async (payload: {
    employeeName: string;
    roleTitle: string;
    department: string;
    payPeriod: string;
    grossPay: string;
    taxWithheld: string;
    retirementContribution: string;
    netPay: string;
    currency: SupportedCurrency;
    paymentDate: string;
  }) => {
    const res = await fetch('/api/payroll', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to run payroll');
    }
    await fetchWorkspace(idToken);
    pushNotification(
      `Payroll Disbursed (${payload.employeeName})`,
      `Net pay of ${formatMoney(payload.netPay, payload.currency)} processed for ${payload.payPeriod}.`,
      'PAYROLL'
    );
  };

  const handleSaveReportTemplate = async (payload: {
    name: string;
    reportType: string;
    columns: string[];
    grouping: string;
    showComparison: boolean;
    includeTaxSummary: boolean;
  }) => {
    const res = await fetch('/api/report-templates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to save report template');
    }
    await fetchWorkspace(idToken);
    pushNotification(
      'Custom Report Template Saved',
      `Template "${payload.name}" (${payload.grouping}) saved to PostgreSQL.`,
      'INVOICE'
    );
  };

  const handleInviteAdvisor = async (payload: {
    advisorName: string;
    advisorEmail: string;
    firmName: string;
    permissionLevel: string;
  }) => {
    const res = await fetch('/api/advisors', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to invite advisor');
    }
    await fetchWorkspace(idToken);
    pushNotification(
      'Advisor Portal Access Granted',
      `${payload.advisorName} (${payload.firmName}) added with ${payload.permissionLevel}.`,
      'SECURITY'
    );
  };

  const handleToggle2FA = async (code: string, enable: boolean) => {
    const res = await fetch('/api/security/2fa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ code, enable }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Invalid 6-digit authenticator code');
    }
    await fetchWorkspace(idToken);
    pushNotification(
      enable ? 'Two-Factor Authentication Enabled' : 'Two-Factor Authentication Disabled',
      `Organization TOTP policy updated and signed in cryptographic audit log.`,
      'SECURITY'
    );
  };

  const t = LOCALE_LABELS[locale].strings;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('dashboard');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 font-display whitespace-nowrap shrink-0"
        >
          XeroCloud
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400"
        >
          <button
            type="button"
            onClick={() => setActiveTab('dashboard')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'dashboard'
                ? 'text-slate-900 dark:text-slate-100 underline underline-offset-8 decoration-2 decoration-sky-600'
                : ''
            }`}
          >
            {t.dashboard}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invoicing')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'invoicing'
                ? 'text-slate-900 dark:text-slate-100 underline underline-offset-8 decoration-2 decoration-sky-600'
                : ''
            }`}
          >
            {t.invoicing}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reconciliation')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'reconciliation'
                ? 'text-slate-900 dark:text-slate-100 underline underline-offset-8 decoration-2 decoration-sky-600'
                : ''
            }`}
          >
            {t.reconciliation}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'reports'
                ? 'text-slate-900 dark:text-slate-100 underline underline-offset-8 decoration-2 decoration-sky-600'
                : ''
            }`}
          >
            {t.reports}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payroll')}
            className={`hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'payroll'
                ? 'text-slate-900 dark:text-slate-100 underline underline-offset-8 decoration-2 decoration-sky-600'
                : ''
            }`}
          >
            {t.payroll}
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              setOpenInvoiceBuilderOnLoad(true);
              setActiveTab('invoicing');
            }}
            className="px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            {t.newInvoice}
          </button>
        </div>
      </header>

      {/* Workspace Layout: Sidebar (256px) + Main Content Viewport */}
      <div className="flex-1 flex">
        {/* Left Workspace Sidebar */}
        <aside className="hidden lg:flex flex-col justify-between w-64 shrink-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-4">
          <div className="space-y-6">
            {/* Organization Ledger Profile */}
            <div className="pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                Meridian Global Labs Inc.
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {bundle?.userProfile?.email || 'finance@meridian-labs.io'}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>E2E Vault Encrypted</span>
              </div>
            </div>

            {/* Sidebar Navigation List */}
            <nav aria-label="Workspace Modules" className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{t.dashboard}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('invoicing')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'invoicing'
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4" />
                  <span>{t.invoicing}</span>
                </span>
                <span className="font-mono text-slate-400">
                  {bundle?.invoices.length ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reconciliation')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'reconciliation'
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>{t.reconciliation}</span>
                </span>
                <span className="font-mono text-amber-600">
                  {bundle?.bankTransactions.filter((b) => !b.reconciled).length ?? 0}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('reports')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'reports'
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>{t.reports}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('payroll')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'payroll'
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{t.payroll}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('advisors')}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  activeTab === 'advisors'
                    ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{t.advisorsAndAudit}</span>
                </span>
                <span className="font-mono text-xs text-emerald-600">2FA</span>
              </button>
            </nav>
          </div>

          {/* Bottom Sidebar Auth & Security Controls */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
            {firebaseUser ? (
              <div className="space-y-2">
                <div className="text-xs text-slate-600 dark:text-slate-400 truncate">
                  Signed in: <span className="font-medium">{firebaseUser.email}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign in with Google
              </button>
            )}
            {authError && <p className="text-xs text-amber-600">{authError}</p>}
          </div>
        </aside>

        {/* Main Workspace Container */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-20 md:pb-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Contextual Workspace Toolbar (Breadcrumbs, Currency, Localization, Notifications) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-900 dark:text-slate-100">
                Meridian Global Labs
              </span>
              <span aria-hidden="true">/</span>
              <span className="text-sky-600 dark:text-sky-400 font-medium capitalize">
                {activeTab === 'advisors' ? t.advisorsAndAudit : activeTab}
              </span>
              <span aria-hidden="true" className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">{t.e2eEncryptionActive}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Multi-Currency Selector */}
              <div className="flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-slate-400" />
                <label htmlFor="workspace-currency-select" className="sr-only">
                  Reporting Currency
                </label>
                <select
                  id="workspace-currency-select"
                  aria-label="Reporting Currency"
                  value={displayCurrency}
                  onChange={(e) => setDisplayCurrency(e.target.value as SupportedCurrency)}
                  className="px-2.5 py-1 text-xs font-mono bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                >
                  {Object.values(CURRENCY_RATES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol})
                    </option>
                  ))}
                </select>
              </div>

              {/* Multilingual Localization Selector */}
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                <label htmlFor="workspace-locale-select" className="sr-only">
                  Interface Language
                </label>
                <select
                  id="workspace-locale-select"
                  aria-label="Interface Language"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value as SupportedLocale)}
                  className="px-2.5 py-1 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                >
                  {(Object.keys(LOCALE_LABELS) as SupportedLocale[]).map((loc) => (
                    <option key={loc} value={loc}>
                      {LOCALE_LABELS[loc].name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Advisor & 2FA Quick Access Button */}
              <button
                type="button"
                onClick={() => setActiveTab('advisors')}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors inline-flex items-center gap-1 whitespace-nowrap"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t.twoFactorAuth}</span>
              </button>

              {/* Real-Time Transaction Notification Drawer Trigger */}
              <button
                type="button"
                onClick={() => {
                  setShowNotificationDrawer((v) => !v);
                  setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
                }}
                aria-label="Toggle transaction notifications"
                className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
              >
                <Bell className="w-3.5 h-3.5 text-sky-600" />
                <span className="font-mono tabular-nums">Alerts ({unreadCount})</span>
              </button>
            </div>
          </div>

          {/* Expandable Real-Time Notifications Panel */}
          {showNotificationDrawer && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Automated Real-Time Ledger Notifications
                </span>
                <button
                  type="button"
                  onClick={() => setShowNotificationDrawer(false)}
                  aria-label="Close notifications panel"
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-48 overflow-y-auto mt-2">
                {notifications.map((n) => (
                  <div key={n.id} className="py-2 flex items-start justify-between gap-4 text-xs">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {n.title}:{' '}
                      </span>
                      <span className="text-slate-600 dark:text-slate-400">{n.message}</span>
                    </div>
                    <span className="font-mono text-slate-400 shrink-0">{n.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Banner if API call failed */}
          {apiError && (
            <div className="p-4 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-900 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
              <span>{apiError}</span>
              <button
                type="button"
                onClick={() => fetchWorkspace(idToken)}
                className="px-3 py-1 bg-red-600 text-white rounded-md font-medium"
              >
                Retry Connection
              </button>
            </div>
          )}

          {/* Loading Skeleton or Active Module View */}
          {loading || !bundle ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-28 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <OverviewView
                  invoices={bundle.invoices}
                  bankTransactions={bundle.bankTransactions}
                  expenses={bundle.expenses}
                  payrollRuns={bundle.payrollRuns}
                  displayCurrency={displayCurrency}
                  t={t}
                  notifications={notifications}
                  onNavigate={(tab) => setActiveTab(tab)}
                  onQuickCreateExpense={handleCreateExpense}
                />
              )}

              {activeTab === 'invoicing' && (
                <InvoicingView
                  invoices={bundle.invoices}
                  displayCurrency={displayCurrency}
                  showNewModalInitial={openInvoiceBuilderOnLoad}
                  onCreateInvoice={handleCreateInvoice}
                  onPayViaStripe={handlePayViaStripe}
                />
              )}

              {activeTab === 'reconciliation' && (
                <ReconciliationAndExpensesView
                  bankTransactions={bundle.bankTransactions}
                  invoices={bundle.invoices}
                  expenses={bundle.expenses}
                  onReconcileTransaction={handleReconcileTransaction}
                  onCreateExpense={handleCreateExpense}
                />
              )}

              {activeTab === 'reports' && (
                <ReportsAndTemplatesView
                  invoices={bundle.invoices}
                  bankTransactions={bundle.bankTransactions}
                  expenses={bundle.expenses}
                  payrollRuns={bundle.payrollRuns}
                  reportTemplates={bundle.reportTemplates}
                  displayCurrency={displayCurrency}
                  t={t}
                  onSaveTemplate={handleSaveReportTemplate}
                  onExportTriggered={(format, reportTitle) =>
                    pushNotification(
                      `${format} Financial Report Exported`,
                      `Generated ${reportTitle} (${displayCurrency}) with active custom columns.`,
                      'INVOICE'
                    )
                  }
                />
              )}

              {activeTab === 'payroll' && (
                <PayrollView
                  payrollRuns={bundle.payrollRuns}
                  displayCurrency={displayCurrency}
                  onRunPayroll={handleRunPayroll}
                />
              )}

              {activeTab === 'advisors' && (
                <AdvisorAndSecurityView
                  userProfile={bundle.userProfile}
                  advisors={bundle.advisors}
                  auditLogs={bundle.auditLogs}
                  onInviteAdvisor={handleInviteAdvisor}
                  onToggle2FA={handleToggle2FA}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar (<= 15% mobile viewport height) */}
      <nav
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 px-2 py-1.5 grid grid-cols-5 gap-1 z-30"
      >
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center py-1 text-[11px] font-medium rounded ${
            activeTab === 'dashboard' ? 'text-sky-600' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span className="truncate">Home</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('invoicing')}
          className={`flex flex-col items-center justify-center py-1 text-[11px] font-medium rounded ${
            activeTab === 'invoicing' ? 'text-sky-600' : 'text-slate-500'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="truncate">Invoices</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reconciliation')}
          className={`flex flex-col items-center justify-center py-1 text-[11px] font-medium rounded ${
            activeTab === 'reconciliation' ? 'text-sky-600' : 'text-slate-500'
          }`}
        >
          <ArrowRightLeft className="w-4 h-4" />
          <span className="truncate">Bank/Exp</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className={`flex flex-col items-center justify-center py-1 text-[11px] font-medium rounded ${
            activeTab === 'reports' ? 'text-sky-600' : 'text-slate-500'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span className="truncate">Reports</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('advisors')}
          className={`flex flex-col items-center justify-center py-1 text-[11px] font-medium rounded ${
            activeTab === 'advisors' ? 'text-sky-600' : 'text-slate-500'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span className="truncate">Security</span>
        </button>
      </nav>
    </div>
  );
}
