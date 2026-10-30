import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateInvoiceTotals,
  calculatePayrollNet,
  computeFinancialStatements,
  convertCurrency,
  decryptSensitivePayload,
  encryptSensitivePayload,
  formatReportAsCsv,
  generateTotpCode,
  suggestBankReconciliationMatch,
  verifyTotpCode,
} from './accounting';

test('Multi-currency conversion accurately translates between USD, EUR, GBP, and JPY', () => {
  const usdToEur = convertCurrency(1085, 'USD', 'EUR');
  assert.equal(usdToEur, 1000);

  const eurToUsd = convertCurrency(1000, 'EUR', 'USD');
  assert.equal(eurToUsd, 1085);

  const usdToJpy = convertCurrency(100, 'USD', 'JPY');
  assert.equal(usdToJpy, 15152);
});

test('Invoice calculation engine applies jurisdiction tax rates and computes base USD totals', () => {
  const calcUk = calculateInvoiceTotals(
    [
      { description: 'Cloud Infrastructure Retainer', quantity: 2, unitPrice: 1500, accountCode: '200' },
      { description: 'Security Audit', quantity: 1, unitPrice: 1000, accountCode: '200' },
    ],
    'GBP',
    'UK_VAT'
  );

  assert.equal(calcUk.subtotal, 4000);
  assert.equal(calcUk.taxRate, 20);
  assert.equal(calcUk.taxAmount, 800);
  assert.equal(calcUk.totalAmount, 4800);
  assert.equal(calcUk.baseCurrencyTotalUsd, 6201.6);
});

test('Payroll engine computes withholdings, retirement contributions, and net pay accurately', () => {
  const payroll = calculatePayrollNet(10000, 6.0, 22.5);
  assert.equal(payroll.grossPay, 10000);
  assert.equal(payroll.taxWithheld, 2250);
  assert.equal(payroll.retirementContribution, 600);
  assert.equal(payroll.netPay, 7150);
});

test('Bank reconciliation matcher identifies matching unpaid invoices with high confidence', () => {
  const candidates = [
    {
      invoiceId: 101,
      invoiceNumber: 'INV-2026-041',
      clientName: 'Northwind Logistics Ltd',
      totalAmount: 5400,
      currency: 'USD' as const,
      status: 'Awaiting Payment',
    },
    {
      invoiceId: 102,
      invoiceNumber: 'INV-2026-042',
      clientName: 'Kaito Robotics Corp',
      totalAmount: 12800,
      currency: 'USD' as const,
      status: 'Paid',
    },
  ];

  const match = suggestBankReconciliationMatch(
    {
      description: 'ACH Deposit Northwind Logistics INV-2026-041',
      reference: 'INV-2026-041',
      amount: 5400,
      currency: 'USD',
      type: 'CREDIT',
    },
    candidates
  );

  assert.ok(match);
  assert.equal(match?.invoiceId, 101);
  assert.ok(match!.confidence >= 90);
});

test('Financial statement aggregator computes revenue, receivables, tax liability, and net profit', () => {
  const summary = computeFinancialStatements({
    invoices: [
      {
        totalAmount: 10825,
        baseCurrencyTotal: 10825,
        taxAmount: 825,
        currency: 'USD',
        status: 'Paid',
      },
      {
        totalAmount: 5412.5,
        baseCurrencyTotal: 5412.5,
        taxAmount: 412.5,
        currency: 'USD',
        status: 'Overdue',
      },
    ],
    expenses: [
      {
        amount: 2000,
        taxAmount: 150,
        currency: 'USD',
        status: 'Approved',
      },
    ],
    payrollRuns: [
      {
        grossPay: 6000,
        currency: 'USD',
        status: 'Processed',
      },
    ],
    bankTransactions: [
      {
        amount: 10825,
        currency: 'USD',
        type: 'CREDIT',
        reconciled: true,
      },
      {
        amount: 1200,
        currency: 'USD',
        type: 'DEBIT',
        reconciled: false,
      },
    ],
  });

  assert.equal(summary.totalRevenueUsd, 16237.5);
  assert.equal(summary.accountsReceivableUsd, 5412.5);
  assert.equal(summary.overdueReceivablesUsd, 5412.5);
  assert.equal(summary.taxLiabilityUsd, 1087.5);
  assert.equal(summary.netProfitUsd, 8237.5);
  assert.equal(summary.unreconciledCount, 1);
});

test('E2E encryption round-trip and TOTP 6-digit verification work deterministically', () => {
  const secretNote = 'IBAN DE89 3704 0044 0532 0130 00 - Tax Audit Ref #9981';
  const encrypted = encryptSensitivePayload(secretNote);
  assert.ok(encrypted.startsWith('enc:AES256-GCM:'));
  assert.notEqual(encrypted, secretNote);

  const decrypted = decryptSensitivePayload(encrypted);
  assert.equal(decrypted, secretNote);

  const totpSecret = 'JBSWY3DPEHPK3PXP';
  const fixedTime = 1760000000000;
  const validCode = generateTotpCode(totpSecret, fixedTime);
  assert.equal(validCode.length, 6);
  assert.equal(verifyTotpCode(totpSecret, validCode, fixedTime), true);
  assert.equal(verifyTotpCode(totpSecret, '000000', fixedTime), false);
});

test('CSV report exporter properly escapes commas and quotes', () => {
  const csv = formatReportAsCsv(
    ['Account', 'Description', 'Amount'],
    [['200 - Sales', 'Retainer, Q4 "Enterprise"', 14500.5]]
  );
  assert.ok(csv.includes('"Retainer, Q4 ""Enterprise"""'));
});
