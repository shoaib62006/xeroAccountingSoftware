import React, { useState } from 'react';
import { Users, Plus, CheckCircle2, AlertCircle } from 'lucide-react';
import { PayrollRunRecord } from '../types';
import {
  SupportedCurrency,
  calculatePayrollNet,
  convertCurrency,
  formatMoney,
} from '../utils/accounting';

interface PayrollViewProps {
  payrollRuns: PayrollRunRecord[];
  displayCurrency: SupportedCurrency;
  onRunPayroll: (payload: {
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
  }) => Promise<void>;
}

export const PayrollView: React.FC<PayrollViewProps> = ({
  payrollRuns,
  displayCurrency,
  onRunPayroll,
}) => {
  const [employeeName, setEmployeeName] = useState('');
  const [roleTitle, setRoleTitle] = useState('Staff Security Engineer');
  const [department, setDepartment] = useState('Engineering');
  const [payPeriod, setPayPeriod] = useState('Nov 1 – Nov 30, 2026');
  const [grossPay, setGrossPay] = useState('9200');
  const [currency, setCurrency] = useState<SupportedCurrency>('USD');
  const [retirementRate, setRetirementRate] = useState('6.0');
  const [taxRate, setTaxRate] = useState('22.5');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liveCalc = calculatePayrollNet(
    Number(grossPay) || 0,
    Number(retirementRate) || 6.0,
    Number(taxRate) || 22.5
  );

  const totalGrossUsd = payrollRuns.reduce(
    (sum, r) => sum + convertCurrency(Number(r.grossPay) || 0, r.currency, 'USD'),
    0
  );
  const totalTaxUsd = payrollRuns.reduce(
    (sum, r) => sum + convertCurrency(Number(r.taxWithheld) || 0, r.currency, 'USD'),
    0
  );
  const totalNetUsd = payrollRuns.reduce(
    (sum, r) => sum + convertCurrency(Number(r.netPay) || 0, r.currency, 'USD'),
    0
  );

  const inDisplay = (usd: number) =>
    formatMoney(convertCurrency(usd, 'USD', displayCurrency), displayCurrency);

  const handlePayrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!employeeName.trim() || Number(grossPay) <= 0) {
      setError('Employee full name and a positive gross salary are required.');
      return;
    }
    setSubmitting(true);
    try {
      await onRunPayroll({
        employeeName: employeeName.trim(),
        roleTitle,
        department,
        payPeriod,
        grossPay: liveCalc.grossPay.toFixed(2),
        taxWithheld: liveCalc.taxWithheld.toFixed(2),
        retirementContribution: liveCalc.retirementContribution.toFixed(2),
        netPay: liveCalc.netPay.toFixed(2),
        currency,
        paymentDate: '2026-10-30',
      });
      setEmployeeName('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to process payroll run');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Total Gross Payroll Disbursed
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-slate-900 dark:text-slate-100 font-mono tabular-nums">
            {inDisplay(totalGrossUsd)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {payrollRuns.length} processed employee pay runs
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            PAYE / FICA / Income Tax Withheld
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-amber-700 dark:text-amber-400 font-mono tabular-nums">
            {inDisplay(totalTaxUsd)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Automated statutory tax remittance</div>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            Net Take-Home Disbursed
          </div>
          <div className="mt-1.5 text-2xl font-semibold text-emerald-700 dark:text-emerald-400 font-mono tabular-nums">
            {inDisplay(totalNetUsd)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Direct deposit ACH / SEPA / Faster Payments</div>
        </div>
      </div>

      {/* Main Payroll Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Run Payroll Form */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
            <Users className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Process Employee Pay Period
            </h3>
          </div>

          <form onSubmit={handlePayrollSubmit} className="mt-4 space-y-3">
            <div>
              <label
                htmlFor="pay-emp-name"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
              >
                Employee Full Name
              </label>
              <input
                id="pay-emp-name"
                type="text"
                value={employeeName}
                onChange={(e) => setEmployeeName(e.target.value)}
                placeholder="e.g. Hannah Abbott"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="pay-role"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Role Title
                </label>
                <input
                  id="pay-role"
                  type="text"
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="pay-dept"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Department
                </label>
                <select
                  id="pay-dept"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Revenue">Revenue</option>
                  <option value="Finance">Finance</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label
                  htmlFor="pay-gross"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Gross Salary
                </label>
                <input
                  id="pay-gross"
                  type="number"
                  step="100"
                  value={grossPay}
                  onChange={(e) => setGrossPay(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="pay-currency"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Currency
                </label>
                <select
                  id="pay-currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as SupportedCurrency)}
                  className="w-full px-2 py-2 text-sm font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                >
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="AUD">AUD</option>
                  <option value="CAD">CAD</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="pay-tax-rate"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Tax Withholding (%)
                </label>
                <input
                  id="pay-tax-rate"
                  type="number"
                  step="0.5"
                  value={taxRate}
                  onChange={(e) => setTaxRate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label
                  htmlFor="pay-retire-rate"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Pension / 401(k) (%)
                </label>
                <input
                  id="pay-retire-rate"
                  type="number"
                  step="0.5"
                  value={retirementRate}
                  onChange={(e) => setRetirementRate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md text-xs font-mono tabular-nums space-y-1">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Tax Withheld ({taxRate}%):</span>
                <span>-{formatMoney(liveCalc.taxWithheld, currency)}</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Pension / Super ({retirementRate}%):</span>
                <span>-{formatMoney(liveCalc.retirementContribution, currency)}</span>
              </div>
              <div className="flex justify-between font-semibold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>Net Pay Disbursed:</span>
                <span>{formatMoney(liveCalc.netPay, currency)}</span>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Disbursing Payroll...' : 'Approve & Run Employee Payroll'}
            </button>
          </form>
        </div>

        {/* Payroll Roster & History */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Processed Payroll Register
            </h3>
            <span className="text-xs font-mono text-slate-500">{payPeriod}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-medium">Employee & Role</th>
                  <th className="py-3 px-4 font-medium">Pay Period</th>
                  <th className="py-3 px-4 font-medium text-right">Gross Pay</th>
                  <th className="py-3 px-4 font-medium text-right">Tax + Pension</th>
                  <th className="py-3 px-4 font-medium text-right">Net Disbursed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {payrollRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {run.employeeName}
                      </div>
                      <div className="text-xs text-slate-500">
                        {run.roleTitle} · {run.department}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                      <div>{run.payPeriod}</div>
                      <div className="text-emerald-700 dark:text-emerald-400 font-medium inline-flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        {run.status}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-700 dark:text-slate-300">
                      {formatMoney(run.grossPay, run.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-500">
                      -{formatMoney(Number(run.taxWithheld) + Number(run.retirementContribution), run.currency)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100">
                      {formatMoney(run.netPay, run.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
