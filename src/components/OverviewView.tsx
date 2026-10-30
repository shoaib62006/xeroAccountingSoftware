import React, { useState } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Plus,
  Receipt,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import {
  InvoiceRecord,
  BankTransactionRecord,
  ExpenseRecord,
  PayrollRunRecord,
  RealTimeNotification,
} from '../types';
import {
  SupportedCurrency,
  computeFinancialStatements,
  convertCurrency,
  formatMoney,
} from '../utils/accounting';
import { LocaleStrings } from '../utils/i18n';

interface OverviewViewProps {
  invoices: InvoiceRecord[];
  bankTransactions: BankTransactionRecord[];
  expenses: ExpenseRecord[];
  payrollRuns: PayrollRunRecord[];
  displayCurrency: SupportedCurrency;
  t: LocaleStrings;
  notifications: RealTimeNotification[];
  onNavigate: (tab: 'invoicing' | 'reconciliation' | 'reports' | 'payroll' | 'advisors') => void;
  onQuickCreateExpense: (payload: {
    merchant: string;
    category: string;
    amount: string;
    currency: SupportedCurrency;
    taxAmount: string;
  }) => Promise<void>;
}

const CASH_FLOW_MONTHS = [
  { month: 'May', inflowUsd: 42800, outflowUsd: 26400 },
  { month: 'Jun', inflowUsd: 49200, outflowUsd: 29100 },
  { month: 'Jul', inflowUsd: 46500, outflowUsd: 31800 },
  { month: 'Aug', inflowUsd: 58900, outflowUsd: 33200 },
  { month: 'Sep', inflowUsd: 64100, outflowUsd: 35600 },
  { month: 'Oct', inflowUsd: 83580, outflowUsd: 39450 },
];

export const OverviewView: React.FC<OverviewViewProps> = ({
  invoices,
  bankTransactions,
  expenses,
  payrollRuns,
  displayCurrency,
  t,
  notifications,
  onNavigate,
  onQuickCreateExpense,
}) => {
  const [selectedMonthIdx, setSelectedMonthIdx] = useState<number>(5);
  const [projectionMode, setProjectionMode] = useState<'actual' | 'forecast'>('actual');
  const [quickMerchant, setQuickMerchant] = useState('');
  const [quickAmount, setQuickAmount] = useState('');
  const [quickCurrency, setQuickCurrency] = useState<SupportedCurrency>(displayCurrency);
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  const metrics = computeFinancialStatements({
    invoices,
    expenses,
    payrollRuns,
    bankTransactions,
  });

  const inDisplay = (usdVal: number) =>
    formatMoney(convertCurrency(usdVal, 'USD', displayCurrency), displayCurrency);

  const chartSeries = CASH_FLOW_MONTHS.map((m, idx) => {
    const multiplier = projectionMode === 'forecast' ? 1.12 : 1.0;
    const inflow =
      idx === 5
        ? Math.max(m.inflowUsd, metrics.totalRevenueUsd) * multiplier
        : m.inflowUsd * multiplier;
    const outflow =
      idx === 5
        ? Math.max(m.outflowUsd, metrics.operatingExpensesUsd + metrics.payrollExpensesUsd)
        : m.outflowUsd;
    return {
      month: m.month,
      inflow,
      outflow,
      net: inflow - outflow,
    };
  });

  const maxChartVal = Math.max(...chartSeries.map((c) => Math.max(c.inflow, c.outflow)), 90000);
  const activePoint = chartSeries[selectedMonthIdx] || chartSeries[chartSeries.length - 1];

  const handleQuickExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuickError(null);
    if (!quickMerchant.trim() || !quickAmount || Number(quickAmount) <= 0) {
      setQuickError('Enter a valid merchant name and positive expense amount.');
      return;
    }
    setQuickSubmitting(true);
    try {
      const amtNum = Number(quickAmount);
      const taxNum = (amtNum * 0.0825).toFixed(2);
      await onQuickCreateExpense({
        merchant: quickMerchant.trim(),
        category: '420 - Cloud Infrastructure & Hosting',
        amount: amtNum.toFixed(2),
        currency: quickCurrency,
        taxAmount: taxNum,
      });
      setQuickMerchant('');
      setQuickAmount('');
    } catch (err: unknown) {
      setQuickError(err instanceof Error ? err.message : 'Failed to log expense');
    } finally {
      setQuickSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 4-Column Financial KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t.reconciledCash}</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div
            data-testid="kpi-reconciled-cash"
            className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums"
          >
            {inDisplay(metrics.reconciledCashBalanceUsd)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{metrics.unreconciledCount} unreconciled lines</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onNavigate('reconciliation')}
              className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
            >
              Reconcile feed
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t.accountsReceivable}</span>
            <CreditCard className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          </div>
          <div
            data-testid="kpi-receivables"
            className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums"
          >
            {inDisplay(metrics.accountsReceivableUsd)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="text-amber-700 dark:text-amber-400 font-mono tabular-nums">
              {inDisplay(metrics.overdueReceivablesUsd)} overdue
            </span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onNavigate('invoicing')}
              className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
            >
              View invoices
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t.netProfit}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div
            data-testid="kpi-net-profit"
            className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums"
          >
            {inDisplay(metrics.netProfitUsd)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-mono tabular-nums">{metrics.profitMarginPercent}% margin</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
            >
              P&L Statement
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>{t.taxLiability}</span>
            <ShieldCheck className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </div>
          <div
            data-testid="kpi-tax-liability"
            className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums"
          >
            {inDisplay(metrics.taxLiabilityUsd)}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>Net of Input VAT/GST</span>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-sky-600 dark:text-sky-400 hover:underline font-medium"
            >
              Tax schedule
            </button>
          </div>
        </div>
      </div>

      {/* Main Split: Cash Flow Chart + Bank Accounts & Quick Mobile Expense */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Cash Flow Visualization (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {t.cashFlowAnalysis}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Consolidated cash inflows vs operating & payroll disbursements ({displayCurrency})
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                  type="button"
                  onClick={() => setProjectionMode('actual')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    projectionMode === 'actual'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Actual Ledger
                </button>
                <button
                  type="button"
                  onClick={() => setProjectionMode('forecast')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    projectionMode === 'forecast'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  30-Day Runway Forecast
                </button>
              </div>
            </div>

            {/* Selected Month Metrics Summary Bar */}
            <div className="grid grid-cols-3 gap-4 py-4 border-b border-slate-100 dark:border-slate-800/70">
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {activePoint.month} Cash Inflows
                </div>
                <div className="mt-1 text-base font-semibold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
                  +{inDisplay(activePoint.inflow)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {activePoint.month} Cash Outflows
                </div>
                <div className="mt-1 text-base font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
                  -{inDisplay(activePoint.outflow)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {activePoint.month} Net Cash Movement
                </div>
                <div className="mt-1 text-base font-semibold text-sky-600 dark:text-sky-400 font-mono tabular-nums">
                  {activePoint.net >= 0 ? '+' : ''}
                  {inDisplay(activePoint.net)}
                </div>
              </div>
            </div>

            {/* Interactive SVG Bar & Net Line Chart */}
            <div className="mt-6">
              <div className="grid grid-cols-6 gap-4 items-end h-52 pt-4 px-2">
                {chartSeries.map((item, idx) => {
                  const inHeight = Math.max(12, Math.round((item.inflow / maxChartVal) * 160));
                  const outHeight = Math.max(12, Math.round((item.outflow / maxChartVal) * 160));
                  const isSelected = idx === selectedMonthIdx;
                  return (
                    <button
                      key={item.month}
                      type="button"
                      onClick={() => setSelectedMonthIdx(idx)}
                      aria-label={`Inspect ${item.month} cash flow`}
                      className={`group flex flex-col items-center p-2 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-slate-100/80 dark:bg-slate-800/70 ring-1 ring-slate-300 dark:ring-slate-700'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-end justify-center gap-2 w-full h-40">
                        <div
                          style={{ height: `${inHeight}px` }}
                          className="w-4 sm:w-5 bg-sky-600 dark:bg-sky-500 rounded-t transition-transform group-hover:scale-y-105"
                          title={`Inflow: ${inDisplay(item.inflow)}`}
                        />
                        <div
                          style={{ height: `${outHeight}px` }}
                          className="w-4 sm:w-5 bg-slate-300 dark:bg-slate-700 rounded-t transition-transform group-hover:scale-y-105"
                          title={`Outflow: ${inDisplay(item.outflow)}`}
                        />
                      </div>
                      <span className="mt-2 text-xs font-medium text-slate-700 dark:text-slate-300 font-mono">
                        {item.month}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-sky-600 inline-block rounded-xs" />
                    Cash Inflows (Operating + Stripe)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-slate-300 dark:bg-slate-700 inline-block rounded-xs" />
                    Cash Outflows (AP + Payroll)
                  </span>
                </div>
                <span className="font-mono tabular-nums">Base FX: 1 USD = {inDisplay(1)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Connected Bank Feeds & Mobile Expense Quick-Add (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-6 justify-between">
          {/* Bank Accounts Summary */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Connected Bank Accounts
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('reconciliation')}
                className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline whitespace-nowrap shrink-0"
              >
                Manage Feeds
              </button>
            </div>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    Mercury Operating (••4829)
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    USD Primary · Direct OpenBanking Feed
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatMoney(142500, 'USD')}
                  </div>
                  <div className="text-xs text-amber-700 dark:text-amber-400">
                    2 lines to reconcile
                  </div>
                </div>
              </div>
              <div className="py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    HSBC Multi-Currency (••9012)
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    EUR / GBP Treasury · SWIFT Feed
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums">
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {formatMoney(48200, 'EUR')}
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-400">
                    Synced 4m ago
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile-Ready On-The-Go Expense Capture */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Mobile Quick Expense Claim
                </h3>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">Auto-Tax 8.25%</span>
            </div>

            <form onSubmit={handleQuickExpenseSubmit} className="mt-3 space-y-3">
              <div>
                <label
                  htmlFor="quick-expense-merchant"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Merchant / Vendor
                </label>
                <input
                  id="quick-expense-merchant"
                  type="text"
                  value={quickMerchant}
                  onChange={(e) => setQuickMerchant(e.target.value)}
                  placeholder="e.g. Cloudflare Enterprise"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label
                    htmlFor="quick-expense-amount"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Amount
                  </label>
                  <input
                    id="quick-expense-amount"
                    type="number"
                    step="0.01"
                    value={quickAmount}
                    onChange={(e) => setQuickAmount(e.target.value)}
                    placeholder="240.00"
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="quick-expense-currency"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Currency
                  </label>
                  <select
                    id="quick-expense-currency"
                    value={quickCurrency}
                    onChange={(e) => setQuickCurrency(e.target.value as SupportedCurrency)}
                    className="w-full px-2 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="AUD">AUD</option>
                    <option value="CAD">CAD</option>
                    <option value="SGD">SGD</option>
                  </select>
                </div>
              </div>
              {quickError && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {quickError}
                </p>
              )}
              <button
                type="submit"
                disabled={quickSubmitting}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                {quickSubmitting ? 'Posting to Ledger...' : 'Log Expense & Bank Feed'}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Row: Invoices Owed vs Real-Time Ledger Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Recent Multi-Currency Invoices
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('invoicing')}
              className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline"
            >
              Open Invoicing Workbench
            </button>
          </div>
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 font-medium">Invoice</th>
                  <th className="py-2.5 font-medium">Client</th>
                  <th className="py-2.5 font-medium">Status · Due</th>
                  <th className="py-2.5 font-medium text-right">Total (Native)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {invoices.slice(0, 4).map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 font-mono text-xs font-medium text-slate-900 dark:text-slate-100">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2.5 text-slate-700 dark:text-slate-300">{inv.clientName}</td>
                    <td className="py-2.5 text-xs text-slate-500 dark:text-slate-400">
                      <span
                        className={
                          inv.status === 'Paid'
                            ? 'text-emerald-700 dark:text-emerald-400 font-medium'
                            : inv.status === 'Overdue'
                            ? 'text-red-600 dark:text-red-400 font-medium'
                            : 'text-amber-700 dark:text-amber-400 font-medium'
                        }
                      >
                        {inv.status}
                      </span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono tabular-nums">{inv.dueDate}</span>
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                      {formatMoney(inv.totalAmount, inv.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Real-Time Transaction Notifications
            </h3>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              {notifications.length} events
            </span>
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2 max-h-56 overflow-y-auto">
            {notifications.slice(0, 5).map((notif) => (
              <div key={notif.id} className="py-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {notif.title}
                  </span>
                  <span className="text-slate-400 font-mono tabular-nums">{notif.timestamp}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{notif.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
