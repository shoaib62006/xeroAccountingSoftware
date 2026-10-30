import React, { useState } from 'react';
import {
  Plus,
  Search,
  CreditCard,
  Lock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Eye,
  X,
} from 'lucide-react';
import { InvoiceRecord } from '../types';
import {
  CURRENCY_RATES,
  SupportedCurrency,
  TAX_JURISDICTIONS,
  TaxJurisdictionCode,
  InvoiceLineItem,
  calculateInvoiceTotals,
  decryptSensitivePayload,
  encryptSensitivePayload,
  formatMoney,
} from '../utils/accounting';

interface InvoicingViewProps {
  invoices: InvoiceRecord[];
  displayCurrency: SupportedCurrency;
  showNewModalInitial?: boolean;
  onCreateInvoice: (payload: {
    clientName: string;
    clientEmail: string;
    issueDate: string;
    dueDate: string;
    currency: SupportedCurrency;
    taxJurisdiction: TaxJurisdictionCode;
    lineItems: InvoiceLineItem[];
    notes: string;
  }) => Promise<void>;
  onPayViaStripe: (invoice: InvoiceRecord) => Promise<void>;
}

export const InvoicingView: React.FC<InvoicingViewProps> = ({
  invoices,
  displayCurrency,
  showNewModalInitial = false,
  onCreateInvoice,
  onPayViaStripe,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateForm, setShowCreateForm] = useState<boolean>(showNewModalInitial);
  const [settlingInvoiceId, setSettlingInvoiceId] = useState<number | null>(null);
  const [inspectedInvoice, setInspectedInvoice] = useState<InvoiceRecord | null>(null);

  // New Invoice Form State
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [issueDate, setIssueDate] = useState('2026-10-30');
  const [dueDate, setDueDate] = useState('2026-11-29');
  const [currency, setCurrency] = useState<SupportedCurrency>('EUR');
  const [taxJurisdiction, setTaxJurisdiction] = useState<TaxJurisdictionCode>('EU_VAT');
  const [notes, setNotes] = useState('SEPA / SWIFT Wire Settlement — Tax Compliant Invoice');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    {
      description: 'Enterprise Financial Telemetry License (Annual)',
      quantity: 1,
      unitPrice: 4500,
      accountCode: '200 - SaaS Subscriptions',
    },
  ]);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const liveCalc = calculateInvoiceTotals(lineItems, currency, taxJurisdiction);

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = statusFilter === 'All' || inv.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.clientName.toLowerCase().includes(q) ||
      inv.currency.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const handleAddLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        description: 'Implementation & Tax Compliance Setup',
        quantity: 1,
        unitPrice: 1200,
        accountCode: '210 - Professional Services',
      },
    ]);
  };

  const handleRemoveLineItem = (idx: number) => {
    if (lineItems.length <= 1) return;
    setLineItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineChange = (
    idx: number,
    field: keyof InvoiceLineItem,
    value: string | number
  ) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmitInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!clientName.trim() || !clientEmail.trim()) {
      setFormError('Client organization name and billing email are required.');
      return;
    }
    if (lineItems.some((l) => !l.description.trim() || Number(l.unitPrice) <= 0)) {
      setFormError('Every line item requires a description and a positive unit price.');
      return;
    }

    setSubmitting(true);
    try {
      await onCreateInvoice({
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim(),
        issueDate,
        dueDate,
        currency,
        taxJurisdiction,
        lineItems,
        notes,
      });
      setClientName('');
      setClientEmail('');
      setShowCreateForm(false);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to issue invoice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStripePayClick = async (inv: InvoiceRecord) => {
    setSettlingInvoiceId(inv.id);
    try {
      await onPayViaStripe(inv);
    } finally {
      setSettlingInvoiceId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Cloud Invoicing, Multi-Currency FX & Global Tax Compliance
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Automated VAT/GST/Sales Tax calculation, E2E encrypted remittance notes, and Stripe payment settlement
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            {showCreateForm ? 'Close Invoice Builder' : 'Create Multi-Currency Invoice'}
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            {['All', 'Awaiting Payment', 'Overdue', 'Paid'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === status
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search invoices by number, client, or currency"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search invoice #, client, currency..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Expandable Multi-Currency Invoice Creation Builder */}
      {showCreateForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                New Multi-Currency Tax-Compliant Invoice
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Calculates statutory VAT/GST/Sales Tax and converts to base reporting ledger automatically
              </p>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              1 {currency} = ${CURRENCY_RATES[currency].rateToUsd.toFixed(4)} USD
            </span>
          </div>

          <form onSubmit={handleSubmitInvoice} className="mt-4 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label
                  htmlFor="inv-client-name"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Client Organization
                </label>
                <input
                  id="inv-client-name"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g. Zurich Precision AG"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="inv-client-email"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Accounts Payable Email
                </label>
                <input
                  id="inv-client-email"
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="ap@zurich-precision.ch"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label
                  htmlFor="inv-currency"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Billing Currency
                </label>
                <select
                  id="inv-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                >
                  {Object.values(CURRENCY_RATES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} ({c.symbol}) — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="inv-tax-jurisdiction"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Tax Compliance Regime
                </label>
                <select
                  id="inv-tax-jurisdiction"
                  value={taxJurisdiction}
                  onChange={(e) => setTaxJurisdiction(e.target.value as TaxJurisdictionCode)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                >
                  {Object.values(TAX_JURISDICTIONS).map((tj) => (
                    <option key={tj.code} value={tj.code}>
                      {tj.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label
                  htmlFor="inv-issue-date"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Issue Date
                </label>
                <input
                  id="inv-issue-date"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="inv-due-date"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Payment Due Date
                </label>
                <input
                  id="inv-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="inv-encrypted-notes"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  E2E Encrypted Remittance / Tax ID Note
                </label>
                <input
                  id="inv-encrypted-notes"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Invoice Line Items
                </span>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="text-xs font-medium text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line Item
                </button>
              </div>
              <div className="space-y-2">
                {lineItems.map((line, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                  >
                    <div className="sm:col-span-5">
                      <input
                        type="text"
                        aria-label={`Line ${idx + 1} description`}
                        value={line.description}
                        onChange={(e) => handleLineChange(idx, 'description', e.target.value)}
                        placeholder="Service or product description"
                        className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <select
                        aria-label={`Line ${idx + 1} ledger account`}
                        value={line.accountCode}
                        onChange={(e) => handleLineChange(idx, 'accountCode', e.target.value)}
                        className="w-full px-2 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                      >
                        <option value="200 - SaaS Subscriptions">200 - SaaS Subscriptions</option>
                        <option value="210 - Professional Services">
                          210 - Professional Services
                        </option>
                        <option value="220 - Hardware & Licensing">220 - Hardware & Licensing</option>
                      </select>
                    </div>
                    <div className="sm:col-span-1">
                      <input
                        type="number"
                        min="1"
                        aria-label={`Line ${idx + 1} quantity`}
                        value={line.quantity}
                        onChange={(e) =>
                          handleLineChange(idx, 'quantity', Number(e.target.value))
                        }
                        className="w-full px-2 py-1.5 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <input
                        type="number"
                        step="0.01"
                        aria-label={`Line ${idx + 1} unit price`}
                        value={line.unitPrice}
                        onChange={(e) =>
                          handleLineChange(idx, 'unitPrice', Number(e.target.value))
                        }
                        className="w-full px-2 py-1.5 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(idx)}
                        aria-label={`Remove line item ${idx + 1}`}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Live Automated Tax & Multi-Currency Summary */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-mono truncate max-w-md">
                    Ciphertext: {encryptSensitivePayload(notes).slice(0, 44)}...
                  </span>
                </div>
                <div>
                  Tax Authority: {TAX_JURISDICTIONS[taxJurisdiction].authority} ({liveCalc.taxRate}%)
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                <div className="text-right font-mono tabular-nums">
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    Subtotal: {formatMoney(liveCalc.subtotal, currency)} · Tax ({liveCalc.taxRate}%):{' '}
                    {formatMoney(liveCalc.taxAmount, currency)}
                  </div>
                  <div
                    data-testid="live-invoice-total"
                    className="text-base font-semibold text-slate-900 dark:text-slate-100"
                  >
                    Total: {formatMoney(liveCalc.totalAmount, currency)}{' '}
                    <span className="text-xs font-normal text-slate-500">
                      (USD Eq: {formatMoney(liveCalc.baseCurrencyTotalUsd, 'USD')})
                    </span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-lg transition-colors whitespace-nowrap"
                >
                  {submitting ? 'Issuing & Encrypting...' : 'Approve & Issue Invoice'}
                </button>
              </div>
            </div>

            {formError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-md text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Invoices Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-medium">Invoice #</th>
                <th className="py-3 px-4 font-medium">Client Organization</th>
                <th className="py-3 px-4 font-medium">Schedule & Tax Regime</th>
                <th className="py-3 px-4 font-medium text-right">Total & Tax Breakdown</th>
                <th className="py-3 px-4 font-medium">Status</th>
                <th className="py-3 px-4 font-medium text-right">Actions & Stripe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredInvoices.map((inv) => (
                <tr
                  key={inv.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {inv.invoiceNumber}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {inv.clientName}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {inv.clientEmail}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400 whitespace-nowrap">
                    <div className="font-mono tabular-nums">Due {inv.dueDate}</div>
                    <div className="text-slate-500">
                      {inv.taxJurisdiction} ({inv.taxRate}%)
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {formatMoney(inv.totalAmount, inv.currency)}{' '}
                      <span className="text-xs font-normal text-slate-500">
                        ({formatMoney(inv.baseCurrencyTotal, 'USD')} USD)
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Sub: {formatMoney(inv.subtotal, inv.currency)} + Tax:{' '}
                      {formatMoney(inv.taxAmount, inv.currency)}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-xs whitespace-nowrap">
                    <span
                      className={
                        inv.status === 'Paid'
                          ? 'text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1'
                          : inv.status === 'Overdue'
                          ? 'text-red-600 dark:text-red-400 font-semibold flex items-center gap-1'
                          : 'text-amber-700 dark:text-amber-400 font-semibold flex items-center gap-1'
                      }
                    >
                      {inv.status === 'Paid' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {inv.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setInspectedInvoice(inv)}
                        aria-label={`Inspect E2E encrypted payload for ${inv.invoiceNumber}`}
                        className="px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-md transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>
                      {inv.status !== 'Paid' && (
                        <button
                          type="button"
                          disabled={settlingInvoiceId === inv.id}
                          onClick={() => handleStripePayClick(inv)}
                          aria-label={`Pay ${inv.invoiceNumber} via Stripe`}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 dark:hover:bg-sky-700 disabled:opacity-50 rounded-md transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          {settlingInvoiceId === inv.id ? 'Settling...' : 'Pay via Stripe'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    No invoices match your active filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* E2E Decryption & Line-Item Inspector Drawer */}
      {inspectedInvoice && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Invoice {inspectedInvoice.invoiceNumber} — Cryptographic & Line-Item Audit
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Client: {inspectedInvoice.clientName} ({inspectedInvoice.clientEmail})
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInspectedInvoice(null)}
              aria-label="Close invoice inspector"
              className="p-1 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md space-y-1.5">
              <div className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                E2E Encrypted Database Field (AES-256-GCM)
              </div>
              <div className="font-mono text-slate-500 break-all">
                {inspectedInvoice.encryptedNotes || 'None'}
              </div>
              <div className="pt-1 border-t border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100">
                <span className="font-semibold">Decrypted Plaintext: </span>
                <span className="font-mono">
                  {decryptSensitivePayload(inspectedInvoice.encryptedNotes || '')}
                </span>
              </div>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md space-y-1.5">
              <div className="font-semibold text-slate-700 dark:text-slate-300">
                Stripe & Tax Settlement Metadata
              </div>
              <div>
                Tax Jurisdiction: <span className="font-mono">{inspectedInvoice.taxJurisdiction}</span> (
                {inspectedInvoice.taxRate}%)
              </div>
              <div>
                Exchange Rate Locked: <span className="font-mono">1 {inspectedInvoice.currency} = ${inspectedInvoice.exchangeRate} USD</span>
              </div>
              <div>
                Stripe Reference:{' '}
                <span className="font-mono">
                  {inspectedInvoice.stripeSessionId || 'Awaiting Card / SEPA / ACH Settlement'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
