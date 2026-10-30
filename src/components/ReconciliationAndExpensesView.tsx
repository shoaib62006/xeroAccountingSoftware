import React, { useState } from 'react';
import {
  CheckCircle2,
  ArrowRightLeft,
  Receipt,
  Plus,
  Sparkles,
  Building2,
  AlertCircle,
} from 'lucide-react';
import { BankTransactionRecord, ExpenseRecord, InvoiceRecord } from '../types';
import {
  SupportedCurrency,
  formatMoney,
  suggestBankReconciliationMatch,
} from '../utils/accounting';

interface ReconciliationAndExpensesViewProps {
  bankTransactions: BankTransactionRecord[];
  invoices: InvoiceRecord[];
  expenses: ExpenseRecord[];
  onReconcileTransaction: (
    txId: number,
    matchedInvoiceId?: number | null,
    customNote?: string
  ) => Promise<void>;
  onCreateExpense: (payload: {
    merchant: string;
    category: string;
    expenseDate: string;
    amount: string;
    currency: SupportedCurrency;
    taxAmount: string;
    submittedBy: string;
  }) => Promise<void>;
}

export const ReconciliationAndExpensesView: React.FC<ReconciliationAndExpensesViewProps> = ({
  bankTransactions,
  invoices,
  expenses,
  onReconcileTransaction,
  onCreateExpense,
}) => {
  const [subView, setSubView] = useState<'reconcile' | 'reconciled_history' | 'expenses'>(
    'reconcile'
  );
  const [reconcilingId, setReconcilingId] = useState<number | null>(null);
  const [selectedLedgerMap, setSelectedLedgerMap] = useState<Record<number, string>>({});

  // Mobile / Web Expense Claim Form State
  const [merchant, setMerchant] = useState('');
  const [category, setCategory] = useState('420 - Cloud Infrastructure & Hosting');
  const [expenseDate, setExpenseDate] = useState('2026-10-30');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<SupportedCurrency>('USD');
  const [submittedBy, setSubmittedBy] = useState('Elena Rostova (CFO)');
  const [expenseError, setExpenseError] = useState<string | null>(null);
  const [submittingExpense, setSubmittingExpense] = useState(false);

  const unreconciledTxs = bankTransactions.filter((t) => !t.reconciled);
  const reconciledTxs = bankTransactions.filter((t) => t.reconciled);

  const candidates = invoices.map((inv) => ({
    invoiceId: inv.id,
    invoiceNumber: inv.invoiceNumber,
    clientName: inv.clientName,
    totalAmount: Number(inv.totalAmount),
    currency: inv.currency,
    status: inv.status,
  }));

  const handleMatchClick = async (
    tx: BankTransactionRecord,
    suggestedInvoiceId?: number | null
  ) => {
    setReconcilingId(tx.id);
    try {
      const customCategory = selectedLedgerMap[tx.id] || tx.category;
      await onReconcileTransaction(
        tx.id,
        suggestedInvoiceId ?? null,
        `Reconciled to ${customCategory}`
      );
    } finally {
      setReconcilingId(null);
    }
  };

  const handleExpenseFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError(null);
    if (!merchant.trim() || !amount || Number(amount) <= 0) {
      setExpenseError('Merchant name and a positive expense amount are required.');
      return;
    }
    setSubmittingExpense(true);
    try {
      const amtNum = Number(amount);
      const taxNum = (amtNum * 0.1).toFixed(2);
      await onCreateExpense({
        merchant: merchant.trim(),
        category,
        expenseDate,
        amount: amtNum.toFixed(2),
        currency,
        taxAmount: taxNum,
        submittedBy,
      });
      setMerchant('');
      setAmount('');
    } catch (err: unknown) {
      setExpenseError(err instanceof Error ? err.message : 'Failed to submit expense claim');
    } finally {
      setSubmittingExpense(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Bank Feed Reconciliation & Mobile Expense Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Match OpenBanking statement lines against invoices or categorize expenses on the go
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
          <button
            type="button"
            onClick={() => setSubView('reconcile')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subView === 'reconcile'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            To Reconcile ({unreconciledTxs.length})
          </button>
          <button
            type="button"
            onClick={() => setSubView('reconciled_history')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subView === 'reconciled_history'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Reconciled Lines ({reconciledTxs.length})
          </button>
          <button
            type="button"
            onClick={() => setSubView('expenses')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
              subView === 'expenses'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Expense Claims ({expenses.length})
          </button>
        </div>
      </div>

      {/* Dual-Column Xero-Style Bank Reconciliation Workbench */}
      {subView === 'reconcile' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 px-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <div className="lg:col-span-5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              Imported Bank Feed Statement Lines
            </div>
            <div className="lg:col-span-2 text-center hidden lg:block">Rule / Match</div>
            <div className="lg:col-span-5">General Ledger Transaction Match</div>
          </div>

          {unreconciledTxs.map((tx) => {
            const suggestion = suggestBankReconciliationMatch(tx, candidates);
            return (
              <div
                key={tx.id}
                data-testid={`unreconciled-row-${tx.id}`}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center"
              >
                {/* Left Column: Imported Bank Statement Line */}
                <div className="lg:col-span-5 space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>{tx.accountName}</span>
                    <span className="font-mono tabular-nums">{tx.transactionDate}</span>
                  </div>
                  <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {tx.description}
                  </div>
                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-slate-500 font-mono">Ref: {tx.reference}</span>
                    <span
                      className={`font-mono tabular-nums font-semibold ${
                        tx.type === 'CREDIT'
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      {tx.type === 'CREDIT' ? 'Received ' : 'Spent '}
                      {formatMoney(tx.amount, tx.currency)} ({tx.currency})
                    </span>
                  </div>
                </div>

                {/* Center Action Button */}
                <div className="lg:col-span-2 flex flex-col items-center justify-center">
                  <button
                    type="button"
                    disabled={reconcilingId === tx.id}
                    onClick={() =>
                      handleMatchClick(tx, suggestion ? suggestion.invoiceId : tx.matchedInvoiceId)
                    }
                    aria-label={`Reconcile ${tx.reference}`}
                    className="w-full lg:w-auto px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-md transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    {reconcilingId === tx.id ? 'Matching...' : 'OK · Reconcile'}
                  </button>
                </div>

                {/* Right Column: Suggested Invoice Match or Account Rule */}
                <div className="lg:col-span-5 lg:border-l lg:border-slate-200 dark:lg:border-slate-800 lg:pl-5 pt-3 lg:pt-0 border-t border-slate-100 dark:border-slate-800 lg:border-t-0">
                  {suggestion ? (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          Auto-Matched Invoice ({suggestion.confidence}% confidence)
                        </span>
                        <span className="font-mono text-slate-600 dark:text-slate-400">
                          {suggestion.invoiceNumber}
                        </span>
                      </div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {suggestion.clientName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {suggestion.reason}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label
                        htmlFor={`ledger-cat-${tx.id}`}
                        className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                      >
                        Assign Chart of Accounts Ledger Code
                      </label>
                      <select
                        id={`ledger-cat-${tx.id}`}
                        value={selectedLedgerMap[tx.id] || tx.category}
                        onChange={(e) =>
                          setSelectedLedgerMap((prev) => ({
                            ...prev,
                            [tx.id]: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                      >
                        <option value="420 - Cloud Infrastructure & Hosting">
                          420 - Cloud Infrastructure & Hosting
                        </option>
                        <option value="410 - Legal & Tax Compliance">
                          410 - Legal & Tax Compliance
                        </option>
                        <option value="460 - International Client Travel">
                          460 - International Client Travel
                        </option>
                        <option value="200 - Accounts Receivable">200 - Accounts Receivable</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {unreconciledTxs.length === 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-8 text-center">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                All Bank Feed Lines Reconciled
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Every imported statement line is matched to your general ledger.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Reconciled History Table */}
      {subView === 'reconciled_history' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-medium">Date</th>
                  <th className="py-3 px-4 font-medium">Bank Account</th>
                  <th className="py-3 px-4 font-medium">Statement Description & Ref</th>
                  <th className="py-3 px-4 font-medium">General Ledger Audit Note</th>
                  <th className="py-3 px-4 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {reconciledTxs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {tx.transactionDate}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
                      {tx.accountName}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {tx.description}
                      </div>
                      <div className="text-xs font-mono text-slate-500">{tx.reference}</div>
                    </td>
                    <td className="py-3 px-4 text-xs text-emerald-700 dark:text-emerald-400">
                      {tx.matchedLedgerNote || tx.category}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {tx.type === 'CREDIT' ? '+' : '-'}
                      {formatMoney(tx.amount, tx.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile & Web Expense Claims View */}
      {subView === 'expenses' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <Receipt className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Submit Employee Expense / Receipt Claim
              </h3>
            </div>
            <form onSubmit={handleExpenseFormSubmit} className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="exp-merchant"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Merchant Name
                </label>
                <input
                  id="exp-merchant"
                  type="text"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  placeholder="e.g. Eurostar Business Premier"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="exp-amount"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Receipt Total
                  </label>
                  <input
                    id="exp-amount"
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="380.00"
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label
                    htmlFor="exp-currency"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Currency
                  </label>
                  <select
                    id="exp-currency"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                    className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                  >
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="AUD">AUD</option>
                    <option value="SGD">SGD</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="exp-category"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Expense Account
                  </label>
                  <select
                    id="exp-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                  >
                    <option value="420 - Cloud Infrastructure & Hosting">
                      420 - Cloud Infrastructure
                    </option>
                    <option value="460 - International Client Travel">
                      460 - International Travel
                    </option>
                    <option value="410 - Legal & Tax Compliance">410 - Legal & Tax</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="exp-date"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Receipt Date
                  </label>
                  <input
                    id="exp-date"
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="exp-submitted-by"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Submitted By Employee
                </label>
                <input
                  id="exp-submitted-by"
                  type="text"
                  value={submittedBy}
                  onChange={(e) => setSubmittedBy(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>

              {expenseError && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {expenseError}
                </p>
              )}

              <button
                type="submit"
                disabled={submittingExpense}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                {submittingExpense ? 'Posting Claim...' : 'Submit Receipt & Sync Bank Feed'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Submitted Expense Claims & Input VAT/Tax Credits
              </h3>
              <span className="text-xs text-slate-500 font-mono">{expenses.length} claims</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs text-slate-500 dark:text-slate-400">
                    <th className="py-2.5 px-4 font-medium">Receipt Ref · Date</th>
                    <th className="py-2.5 px-4 font-medium">Merchant & Category</th>
                    <th className="py-2.5 px-4 font-medium">Employee</th>
                    <th className="py-2.5 px-4 font-medium text-right">Amount (Tax Credit)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div>{exp.receiptReference}</div>
                        <div className="text-slate-400">{exp.expenseDate}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {exp.merchant}
                        </div>
                        <div className="text-xs text-slate-500">{exp.category}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-700 dark:text-slate-300">
                        <div>{exp.submittedBy}</div>
                        <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                          {exp.status}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {formatMoney(exp.amount, exp.currency)}
                        </div>
                        <div className="text-xs text-slate-500">
                          Input Tax: {formatMoney(exp.taxAmount, exp.currency)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
