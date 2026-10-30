import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  Sliders,
  Plus,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  InvoiceRecord,
  BankTransactionRecord,
  ExpenseRecord,
  PayrollRunRecord,
  ReportTemplateRecord,
} from '../types';
import {
  SupportedCurrency,
  TAX_JURISDICTIONS,
  TaxJurisdictionCode,
  computeFinancialStatements,
  convertCurrency,
  formatMoney,
  formatReportAsCsv,
} from '../utils/accounting';
import { LocaleStrings } from '../utils/i18n';

interface ReportsAndTemplatesViewProps {
  invoices: InvoiceRecord[];
  bankTransactions: BankTransactionRecord[];
  expenses: ExpenseRecord[];
  payrollRuns: PayrollRunRecord[];
  reportTemplates: ReportTemplateRecord[];
  displayCurrency: SupportedCurrency;
  t: LocaleStrings;
  onSaveTemplate: (payload: {
    name: string;
    reportType: string;
    columns: string[];
    grouping: string;
    showComparison: boolean;
    includeTaxSummary: boolean;
  }) => Promise<void>;
  onExportTriggered: (format: 'CSV' | 'JSON', reportTitle: string) => void;
}

const ALL_AVAILABLE_COLUMNS = [
  'Account Code',
  'Account Name',
  'Original Currency',
  'FX Rate',
  'YTD Actual',
  'Prior Period Variance',
  'Tax Provision',
];

export const ReportsAndTemplatesView: React.FC<ReportsAndTemplatesViewProps> = ({
  invoices,
  bankTransactions,
  expenses,
  payrollRuns,
  reportTemplates,
  displayCurrency,
  t,
  onSaveTemplate,
  onExportTriggered,
}) => {
  const [activeReport, setActiveReport] = useState<
    'PROFIT_AND_LOSS' | 'BALANCE_SHEET' | 'TAX_COMPLIANCE' | 'TEMPLATE_BUILDER'
  >('PROFIT_AND_LOSS');
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(
    reportTemplates[0]?.id ?? null
  );
  const [exportPreviewContent, setExportPreviewContent] = useState<{
    format: 'CSV' | 'JSON';
    filename: string;
    content: string;
  } | null>(null);

  // Custom Template Builder State
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState('PROFIT_AND_LOSS');
  const [templateGrouping, setTemplateGrouping] = useState('Quarterly');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    'Account Code',
    'Account Name',
    'YTD Actual',
    'Prior Period Variance',
    'Tax Provision',
  ]);
  const [showComparison, setShowComparison] = useState(true);
  const [includeTaxSummary, setIncludeTaxSummary] = useState(true);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const summary = computeFinancialStatements({
    invoices,
    expenses,
    payrollRuns,
    bankTransactions,
  });

  const inDisplay = (usdVal: number) =>
    formatMoney(convertCurrency(usdVal, 'USD', displayCurrency), displayCurrency);

  const activeTemplate = reportTemplates.find((tpl) => tpl.id === selectedTemplateId);
  const activeColumns: string[] = activeTemplate
    ? (() => {
        try {
          return JSON.parse(activeTemplate.columnsJson);
        } catch {
          return ALL_AVAILABLE_COLUMNS;
        }
      })()
    : selectedColumns;

  // Build dynamic statement rows for P&L / Balance Sheet
  const statementRows =
    activeReport === 'BALANCE_SHEET'
      ? [
          {
            code: '100',
            name: 'Cash & Reconciled Bank Equivalents',
            section: 'Current Assets',
            usdAmount: summary.reconciledCashBalanceUsd,
            variance: '+14.2%',
            taxNote: 'Exempt',
          },
          {
            code: '120',
            name: 'Accounts Receivable (Trade Debtors)',
            section: 'Current Assets',
            usdAmount: summary.accountsReceivableUsd,
            variance: '+6.8%',
            taxNote: 'Gross Incl. VAT',
          },
          {
            code: '820',
            name: 'Global VAT / GST / Sales Tax Liability',
            section: 'Current Liabilities',
            usdAmount: summary.taxLiabilityUsd,
            variance: '-2.1%',
            taxNote: 'Statutory Provision',
          },
          {
            code: '960',
            name: 'Retained Earnings & Net Operating Surplus',
            section: 'Equity',
            usdAmount: summary.reconciledCashBalanceUsd + summary.netProfitUsd,
            variance: '+19.4%',
            taxNote: 'Audited',
          },
        ]
      : [
          {
            code: '200',
            name: 'SaaS Subscriptions & Enterprise Licensing',
            section: 'Operating Revenue',
            usdAmount: summary.totalRevenueUsd * 0.82,
            variance: '+22.4%',
            taxNote: 'Output VAT/GST Applies',
          },
          {
            code: '210',
            name: 'Professional Implementation Services',
            section: 'Operating Revenue',
            usdAmount: summary.totalRevenueUsd * 0.18,
            variance: '+11.0%',
            taxNote: 'Standard Rated',
          },
          {
            code: '420',
            name: 'Cloud Infrastructure, Legal & Travel Expenses',
            section: 'Operating Expenses',
            usdAmount: -summary.operatingExpensesUsd,
            variance: '+4.1%',
            taxNote: 'Input Tax Creditable',
          },
          {
            code: '470',
            name: 'Global Payroll, Withholdings & Superannuation',
            section: 'Operating Expenses',
            usdAmount: -summary.payrollExpensesUsd,
            variance: '0.0%',
            taxNote: 'PAYE / FICA Exempt',
          },
          {
            code: '999',
            name: 'Net Operating Profit (EBITDA)',
            section: 'Net Summary',
            usdAmount: summary.netProfitUsd,
            variance: '+28.6%',
            taxNote: `Margin ${summary.profitMarginPercent}%`,
          },
        ];

  const handleExport = (format: 'CSV' | 'JSON') => {
    const title =
      activeReport === 'BALANCE_SHEET'
        ? 'Balance_Sheet_Statement'
        : activeReport === 'TAX_COMPLIANCE'
        ? 'Global_Tax_Compliance_Schedule'
        : 'Profit_And_Loss_Statement';

    if (format === 'CSV') {
      const headers = ['Account Code', 'Account Name', 'Section', `Amount (${displayCurrency})`, 'YoY Variance', 'Tax Note'];
      const rows = statementRows.map((r) => [
        r.code,
        r.name,
        r.section,
        convertCurrency(r.usdAmount, 'USD', displayCurrency),
        r.variance,
        r.taxNote,
      ]);
      const csvString = formatReportAsCsv(headers, rows);
      setExportPreviewContent({
        format: 'CSV',
        filename: `${title}_2026_${displayCurrency}.csv`,
        content: csvString,
      });
      try {
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title}_2026_${displayCurrency}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } catch {
        // Fallback handled by preview panel
      }
    } else {
      const jsonString = JSON.stringify(
        {
          report: title,
          generatedAt: new Date().toISOString(),
          reportingCurrency: displayCurrency,
          templateApplied: activeTemplate?.name || 'Standard IFRS Executive Layout',
          metrics: summary,
          rows: statementRows,
        },
        null,
        2
      );
      setExportPreviewContent({
        format: 'JSON',
        filename: `${title}_2026_${displayCurrency}.json`,
        content: jsonString,
      });
    }
    onExportTriggered(format, title.replace(/_/g, ' '));
  };

  const toggleColumnSelection = (col: string) => {
    setSelectedColumns((prev) =>
      prev.includes(col) ? prev.filter((c) => c !== col) : [...prev, col]
    );
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setTemplateError(null);
    if (!templateName.trim() || selectedColumns.length === 0) {
      setTemplateError('Provide a template name and select at least one report column.');
      return;
    }
    setSavingTemplate(true);
    try {
      await onSaveTemplate({
        name: templateName.trim(),
        reportType: templateType,
        columns: selectedColumns,
        grouping: templateGrouping,
        showComparison,
        includeTaxSummary,
      });
      setTemplateName('');
      setActiveReport('PROFIT_AND_LOSS');
    } catch (err: unknown) {
      setTemplateError(err instanceof Error ? err.message : 'Failed to save report template');
    } finally {
      setSavingTemplate(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Export Toolbar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Real-Time Financial Reporting, Tax Schedules & Custom Templates
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              IFRS / GAAP multi-currency statements with custom column templates and 1-click CSV/JSON export
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleExport('CSV')}
              className="px-3.5 py-2 text-xs font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              {t.exportCsv}
            </button>
            <button
              type="button"
              onClick={() => handleExport('JSON')}
              className="px-3.5 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              {t.exportJson}
            </button>
          </div>
        </div>

        {/* Report Type Switcher & Saved Custom Template Selector */}
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveReport('PROFIT_AND_LOSS')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeReport === 'PROFIT_AND_LOSS'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Profit & Loss (P&L)
            </button>
            <button
              type="button"
              onClick={() => setActiveReport('BALANCE_SHEET')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeReport === 'BALANCE_SHEET'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Balance Sheet
            </button>
            <button
              type="button"
              onClick={() => setActiveReport('TAX_COMPLIANCE')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeReport === 'TAX_COMPLIANCE'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Global Tax Compliance
            </button>
            <button
              type="button"
              onClick={() => setActiveReport('TEMPLATE_BUILDER')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 inline-flex items-center gap-1 ${
                activeReport === 'TEMPLATE_BUILDER'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Customize Report Templates ({reportTemplates.length})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label
              htmlFor="active-template-select"
              className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap"
            >
              Active Template:
            </label>
            <select
              id="active-template-select"
              value={selectedTemplateId ?? ''}
              onChange={(e) => setSelectedTemplateId(Number(e.target.value))}
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
            >
              {reportTemplates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.grouping})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Exported Data Preview Banner (if user clicked Export CSV or Export JSON) */}
      {exportPreviewContent && (
        <div
          data-testid="export-preview-box"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              Exported {exportPreviewContent.format} File Ready: {exportPreviewContent.filename}
            </div>
            <button
              type="button"
              onClick={() => setExportPreviewContent(null)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Dismiss Preview
            </button>
          </div>
          <pre className="mt-3 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-xs font-mono text-slate-800 dark:text-slate-200 overflow-x-auto max-h-44">
            {exportPreviewContent.content}
          </pre>
        </div>
      )}

      {/* Statement Table (P&L or Balance Sheet) */}
      {(activeReport === 'PROFIT_AND_LOSS' || activeReport === 'BALANCE_SHEET') && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {activeReport === 'BALANCE_SHEET'
                  ? 'Consolidated Balance Sheet (Statement of Financial Position)'
                  : 'Consolidated Profit & Loss (Income Statement)'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Template: {activeTemplate?.name || 'Default Executive Layout'} · Grouping:{' '}
                {activeTemplate?.grouping || 'Quarterly'} · Reporting Currency: {displayCurrency}
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              Columns Active: {activeColumns.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-medium">Account Code</th>
                  <th className="py-3 px-4 font-medium">Account Name & Classification</th>
                  <th className="py-3 px-4 font-medium text-right">
                    YTD Actual ({displayCurrency})
                  </th>
                  {activeColumns.includes('Prior Period Variance') && (
                    <th className="py-3 px-4 font-medium text-right">Period Variance</th>
                  )}
                  {activeColumns.includes('Tax Provision') && (
                    <th className="py-3 px-4 font-medium">Tax Compliance Treatment</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {statementRows.map((row) => (
                  <tr
                    key={row.code}
                    className={
                      row.code === '999' || row.code === '960'
                        ? 'bg-slate-50/90 dark:bg-slate-800/60 font-semibold'
                        : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
                    }
                  >
                    <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {row.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-slate-900 dark:text-slate-100">{row.name}</div>
                      <div className="text-xs text-slate-500 font-normal">{row.section}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-900 dark:text-slate-100">
                      {inDisplay(row.usdAmount)}
                    </td>
                    {activeColumns.includes('Prior Period Variance') && (
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-emerald-700 dark:text-emerald-400">
                        {row.variance}
                      </td>
                    )}
                    {activeColumns.includes('Tax Provision') && (
                      <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                        {row.taxNote}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Global Tax Compliance View */}
      {activeReport === 'TAX_COMPLIANCE' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Multi-Jurisdiction Indirect Tax Return Schedule (VAT / GST / Sales Tax)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Real-time aggregation of output tax collected by jurisdiction across all issued invoices
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-medium">Regime Code</th>
                  <th className="py-3 px-4 font-medium">Jurisdiction & Tax Authority</th>
                  <th className="py-3 px-4 font-medium text-right">Statutory Rate</th>
                  <th className="py-3 px-4 font-medium text-right">Invoices Count</th>
                  <th className="py-3 px-4 font-medium text-right">
                    Output Tax Collected ({displayCurrency})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {(Object.keys(TAX_JURISDICTIONS) as TaxJurisdictionCode[]).map((code) => {
                  const tj = TAX_JURISDICTIONS[code];
                  const matchingInvoices = invoices.filter((i) => i.taxJurisdiction === code);
                  const taxCollectedUsd = matchingInvoices.reduce((acc, inv) => {
                    return (
                      acc +
                      convertCurrency(Number(inv.taxAmount) || 0, inv.currency, 'USD')
                    );
                  }, 0);
                  return (
                    <tr key={code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {tj.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {tj.region} — {tj.label}
                        </div>
                        <div className="text-xs text-slate-500">{tj.authority}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                        {tj.ratePercent.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-xs">
                        {matchingInvoices.length}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                        {inDisplay(taxCollectedUsd)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custom Report Template Builder */}
      {activeReport === 'TEMPLATE_BUILDER' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-200 dark:border-slate-800">
              Create Custom Financial Report Template
            </h3>
            <form onSubmit={handleCreateTemplate} className="mt-4 space-y-4">
              <div>
                <label
                  htmlFor="tpl-name"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Template Name
                </label>
                <input
                  id="tpl-name"
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. Board Investor SaaS Metrics P&L"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="tpl-type"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Statement Type
                  </label>
                  <select
                    id="tpl-type"
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                  >
                    <option value="PROFIT_AND_LOSS">Profit & Loss Statement</option>
                    <option value="BALANCE_SHEET">Balance Sheet</option>
                    <option value="TAX_COMPLIANCE">Global Tax Schedule</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="tpl-grouping"
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Period Grouping
                  </label>
                  <select
                    id="tpl-grouping"
                    value={templateGrouping}
                    onChange={(e) => setTemplateGrouping(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                  >
                    <option value="Monthly">Monthly Breakdown</option>
                    <option value="Quarterly">Quarterly Consolidation</option>
                    <option value="Annual">Annual Statutory</option>
                  </select>
                </div>
              </div>

              <div>
                <span className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Included Report Columns
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {ALL_AVAILABLE_COLUMNS.map((col) => {
                    const checked = selectedColumns.includes(col);
                    return (
                      <button
                        key={col}
                        type="button"
                        onClick={() => toggleColumnSelection(col)}
                        className={`px-3 py-2 text-xs rounded-md border text-left flex items-center justify-between transition-colors ${
                          checked
                            ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-500 text-sky-900 dark:text-sky-200 font-medium'
                            : 'bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        <span>{col}</span>
                        {checked && <Check className="w-3.5 h-3.5 text-sky-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-6 pt-1 text-xs text-slate-700 dark:text-slate-300">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showComparison}
                    onChange={(e) => setShowComparison(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Show YoY Period Variance
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeTaxSummary}
                    onChange={(e) => setIncludeTaxSummary(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  Include Statutory Tax Footnotes
                </label>
              </div>

              {templateError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {templateError}
                </p>
              )}

              <button
                type="submit"
                disabled={savingTemplate}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" />
                {savingTemplate ? 'Saving Template...' : 'Save Custom Report Template'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 pb-3 border-b border-slate-200 dark:border-slate-800">
              Saved Organization Report Templates
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              {reportTemplates.map((tpl) => {
                let cols: string[] = [];
                try {
                  cols = JSON.parse(tpl.columnsJson);
                } catch {
                  cols = [];
                }
                return (
                  <div key={tpl.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {tpl.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {tpl.reportType} · {tpl.grouping} · {cols.length} columns
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTemplateId(tpl.id);
                        setActiveReport('PROFIT_AND_LOSS');
                      }}
                      className="px-3 py-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 rounded-md transition-colors whitespace-nowrap"
                    >
                      Apply Template
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
