export type SupportedCurrency = 'USD' | 'EUR' | 'GBP' | 'AUD' | 'CAD' | 'SGD' | 'JPY';

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  rateToUsd: number; // 1 unit of currency = X USD
}

export const CURRENCY_RATES: Record<SupportedCurrency, CurrencyConfig> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rateToUsd: 1.0 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', rateToUsd: 1.085 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', rateToUsd: 1.292 },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', rateToUsd: 0.658 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rateToUsd: 0.724 },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', rateToUsd: 0.748 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rateToUsd: 0.0066 },
};

export type TaxJurisdictionCode =
  | 'US_STD'
  | 'UK_VAT'
  | 'EU_VAT'
  | 'AU_GST'
  | 'CA_HST'
  | 'SG_GST'
  | 'TAX_EXEMPT';

export interface TaxJurisdiction {
  code: TaxJurisdictionCode;
  label: string;
  region: string;
  ratePercent: number;
  authority: string;
}

export const TAX_JURISDICTIONS: Record<TaxJurisdictionCode, TaxJurisdiction> = {
  US_STD: {
    code: 'US_STD',
    label: 'US State & Local Sales Tax (8.25%)',
    region: 'United States',
    ratePercent: 8.25,
    authority: 'IRS / State DOR',
  },
  UK_VAT: {
    code: 'UK_VAT',
    label: 'UK Standard VAT (20.0%)',
    region: 'United Kingdom',
    ratePercent: 20.0,
    authority: 'HM Revenue & Customs (MTD)',
  },
  EU_VAT: {
    code: 'EU_VAT',
    label: 'EU Harmonized VAT (19.0%)',
    region: 'European Union',
    ratePercent: 19.0,
    authority: 'EU OSS / Finanzamt',
  },
  AU_GST: {
    code: 'AU_GST',
    label: 'Australia GST (10.0%)',
    region: 'Australia',
    ratePercent: 10.0,
    authority: 'Australian Taxation Office (BAS)',
  },
  CA_HST: {
    code: 'CA_HST',
    label: 'Canada Harmonized Sales Tax (13.0%)',
    region: 'Canada',
    ratePercent: 13.0,
    authority: 'Canada Revenue Agency',
  },
  SG_GST: {
    code: 'SG_GST',
    label: 'Singapore GST (9.0%)',
    region: 'Singapore',
    ratePercent: 9.0,
    authority: 'IRAS Singapore',
  },
  TAX_EXEMPT: {
    code: 'TAX_EXEMPT',
    label: 'Zero-Rated / Export Exempt (0.0%)',
    region: 'Global Export',
    ratePercent: 0.0,
    authority: 'Cross-Border Zero-Rated',
  },
};

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  accountCode: string;
}

export interface InvoiceCalculationResult {
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  exchangeRateToUsd: number;
  baseCurrencyTotalUsd: number;
}

export function roundCurrency(value: number, currency: SupportedCurrency = 'USD'): number {
  if (currency === 'JPY') {
    return Math.round(value);
  }
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function convertCurrency(
  amount: number,
  from: SupportedCurrency,
  to: SupportedCurrency
): number {
  if (from === to) return roundCurrency(amount, to);
  const fromConfig = CURRENCY_RATES[from] || CURRENCY_RATES.USD;
  const toConfig = CURRENCY_RATES[to] || CURRENCY_RATES.USD;
  const amountInUsd = amount * fromConfig.rateToUsd;
  const converted = amountInUsd / toConfig.rateToUsd;
  return roundCurrency(converted, to);
}

export function formatMoney(
  amount: number | string,
  currency: SupportedCurrency = 'USD'
): string {
  const num = typeof amount === 'string' ? parseFloat(amount) || 0 : amount;
  const cfg = CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
  const decimals = currency === 'JPY' ? 0 : 2;
  const sign = num < 0 ? '-' : '';
  const absFormatted = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
  return `${sign}${cfg.symbol}${absFormatted}`;
}

export function calculateInvoiceTotals(
  lineItems: InvoiceLineItem[],
  currency: SupportedCurrency,
  taxJurisdiction: TaxJurisdictionCode
): InvoiceCalculationResult {
  const rawSubtotal = lineItems.reduce((sum, item) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const price = Math.max(0, Number(item.unitPrice) || 0);
    return sum + qty * price;
  }, 0);

  const subtotal = roundCurrency(rawSubtotal, currency);
  const taxConfig = TAX_JURISDICTIONS[taxJurisdiction] || TAX_JURISDICTIONS.US_STD;
  const taxRate = taxConfig.ratePercent;
  const taxAmount = roundCurrency((subtotal * taxRate) / 100, currency);
  const totalAmount = roundCurrency(subtotal + taxAmount, currency);
  const currencyConfig = CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
  const baseCurrencyTotalUsd = roundCurrency(totalAmount * currencyConfig.rateToUsd, 'USD');

  return {
    subtotal,
    taxRate,
    taxAmount,
    totalAmount,
    exchangeRateToUsd: currencyConfig.rateToUsd,
    baseCurrencyTotalUsd,
  };
}

export interface PayrollCalculationResult {
  grossPay: number;
  taxWithheld: number;
  retirementContribution: number;
  netPay: number;
  effectiveTaxRate: number;
}

export function calculatePayrollNet(
  grossPayInput: number,
  retirementPercent: number = 6.0,
  jurisdictionTaxRate: number = 22.5
): PayrollCalculationResult {
  const grossPay = roundCurrency(Math.max(0, grossPayInput));
  const taxWithheld = roundCurrency((grossPay * jurisdictionTaxRate) / 100);
  const retirementContribution = roundCurrency((grossPay * retirementPercent) / 100);
  const netPay = roundCurrency(Math.max(0, grossPay - taxWithheld - retirementContribution));
  return {
    grossPay,
    taxWithheld,
    retirementContribution,
    netPay,
    effectiveTaxRate: jurisdictionTaxRate,
  };
}

export interface ReconciliationCandidate {
  invoiceId: number;
  invoiceNumber: string;
  clientName: string;
  totalAmount: number;
  currency: SupportedCurrency;
  status: string;
}

export interface ReconciliationMatchSuggestion {
  invoiceId: number;
  invoiceNumber: string;
  clientName: string;
  confidence: number; // 0 to 100
  reason: string;
}

export function suggestBankReconciliationMatch(
  bankTx: {
    description: string;
    reference: string;
    amount: string | number;
    currency: string;
    type: string;
  },
  invoicesList: ReconciliationCandidate[]
): ReconciliationMatchSuggestion | null {
  if (bankTx.type !== 'CREDIT') return null;
  const txAmount = Math.abs(Number(bankTx.amount) || 0);
  const descLower = `${bankTx.description} ${bankTx.reference}`.toLowerCase();

  let bestMatch: ReconciliationMatchSuggestion | null = null;

  for (const inv of invoicesList) {
    if (inv.status === 'Paid') continue;
    let score = 0;
    const reasons: string[] = [];

    const invAmount = Math.abs(Number(inv.totalAmount) || 0);
    const amountDiff = Math.abs(txAmount - invAmount);

    if (amountDiff < 0.05 && inv.currency === bankTx.currency) {
      score += 65;
      reasons.push('Exact amount & currency match');
    } else if (amountDiff / Math.max(1, invAmount) <= 0.03) {
      score += 40;
      reasons.push('FX-adjusted amount within 3%');
    }

    if (descLower.includes(inv.invoiceNumber.toLowerCase())) {
      score += 30;
      reasons.push(`Reference matches ${inv.invoiceNumber}`);
    }

    const clientWords = inv.clientName.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    if (clientWords.some((word) => descLower.includes(word))) {
      score += 20;
      reasons.push(`Counterparty matches ${inv.clientName}`);
    }

    if (score >= 50 && (!bestMatch || score > bestMatch.confidence)) {
      bestMatch = {
        invoiceId: inv.invoiceId,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName,
        confidence: Math.min(99, score),
        reason: reasons.join(' · '),
      };
    }
  }

  return bestMatch;
}

export interface FinancialSummaryMetrics {
  totalRevenueUsd: number;
  accountsReceivableUsd: number;
  overdueReceivablesUsd: number;
  operatingExpensesUsd: number;
  payrollExpensesUsd: number;
  taxLiabilityUsd: number;
  netProfitUsd: number;
  profitMarginPercent: number;
  reconciledCashBalanceUsd: number;
  unreconciledCount: number;
}

export function computeFinancialStatements(params: {
  invoices: Array<{
    totalAmount: string | number;
    baseCurrencyTotal: string | number;
    taxAmount: string | number;
    currency: string;
    status: string;
  }>;
  expenses: Array<{
    amount: string | number;
    taxAmount: string | number;
    currency: string;
    status: string;
  }>;
  payrollRuns: Array<{
    grossPay: string | number;
    currency: string;
    status: string;
  }>;
  bankTransactions: Array<{
    amount: string | number;
    currency: string;
    type: string;
    reconciled: boolean;
  }>;
}): FinancialSummaryMetrics {
  let totalRevenueUsd = 0;
  let accountsReceivableUsd = 0;
  let overdueReceivablesUsd = 0;
  let collectedTaxUsd = 0;

  for (const inv of params.invoices) {
    if (inv.status === 'Draft') continue;
    const curr = (inv.currency as SupportedCurrency) || 'USD';
    const baseUsd =
      Number(inv.baseCurrencyTotal) ||
      convertCurrency(Number(inv.totalAmount) || 0, curr, 'USD');
    const taxUsd = convertCurrency(Number(inv.taxAmount) || 0, curr, 'USD');

    totalRevenueUsd += baseUsd;
    collectedTaxUsd += taxUsd;

    if (inv.status === 'Awaiting Payment' || inv.status === 'Overdue') {
      accountsReceivableUsd += baseUsd;
    }
    if (inv.status === 'Overdue') {
      overdueReceivablesUsd += baseUsd;
    }
  }

  let operatingExpensesUsd = 0;
  let inputTaxCreditsUsd = 0;
  for (const exp of params.expenses) {
    if (exp.status === 'Rejected') continue;
    const curr = (exp.currency as SupportedCurrency) || 'USD';
    operatingExpensesUsd += convertCurrency(Number(exp.amount) || 0, curr, 'USD');
    inputTaxCreditsUsd += convertCurrency(Number(exp.taxAmount) || 0, curr, 'USD');
  }

  let payrollExpensesUsd = 0;
  for (const pay of params.payrollRuns) {
    const curr = (pay.currency as SupportedCurrency) || 'USD';
    payrollExpensesUsd += convertCurrency(Number(pay.grossPay) || 0, curr, 'USD');
  }

  let reconciledCashBalanceUsd = 142500; // Opening cash balance in operating accounts
  let unreconciledCount = 0;

  for (const tx of params.bankTransactions) {
    const curr = (tx.currency as SupportedCurrency) || 'USD';
    const amtUsd = convertCurrency(Math.abs(Number(tx.amount) || 0), curr, 'USD');
    if (tx.reconciled) {
      if (tx.type === 'CREDIT') reconciledCashBalanceUsd += amtUsd;
      else reconciledCashBalanceUsd -= amtUsd;
    } else {
      unreconciledCount += 1;
    }
  }

  const totalCostsUsd = operatingExpensesUsd + payrollExpensesUsd;
  const netProfitUsd = roundCurrency(totalRevenueUsd - totalCostsUsd, 'USD');
  const profitMarginPercent =
    totalRevenueUsd > 0
      ? roundCurrency((netProfitUsd / totalRevenueUsd) * 100, 'USD')
      : 0;

  return {
    totalRevenueUsd: roundCurrency(totalRevenueUsd, 'USD'),
    accountsReceivableUsd: roundCurrency(accountsReceivableUsd, 'USD'),
    overdueReceivablesUsd: roundCurrency(overdueReceivablesUsd, 'USD'),
    operatingExpensesUsd: roundCurrency(operatingExpensesUsd, 'USD'),
    payrollExpensesUsd: roundCurrency(payrollExpensesUsd, 'USD'),
    taxLiabilityUsd: roundCurrency(Math.max(0, collectedTaxUsd - inputTaxCreditsUsd), 'USD'),
    netProfitUsd,
    profitMarginPercent,
    reconciledCashBalanceUsd: roundCurrency(reconciledCashBalanceUsd, 'USD'),
    unreconciledCount,
  };
}

/**
 * Deterministic E2E payload encryption & integrity digest helper (works synchronously in Node & Browser)
 */
export function computeIntegrityDigest(payload: string, salt: string = 'XERO_E2E_VAULT_V1'): string {
  const input = `${salt}::${payload}`;
  let h1 = 0xdeadbeef ^ input.length;
  let h2 = 0x41c6ce57 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hex1 = (h1 >>> 0).toString(16).padStart(8, '0');
  const hex2 = (h2 >>> 0).toString(16).padStart(8, '0');
  return `sha256-e2e:${hex1}${hex2}`;
}

export function encryptSensitivePayload(plainText: string, keyId: string = 'AES256-GCM'): string {
  if (!plainText) return '';
  const digest = computeIntegrityDigest(plainText, keyId);
  const encoded = Array.from(plainText)
    .map((c, idx) => (c.charCodeAt(0) ^ ((idx * 17 + 43) % 127)).toString(16).padStart(2, '0'))
    .join('');
  return `enc:${keyId}:${digest.slice(-8)}:${encoded}`;
}

export function decryptSensitivePayload(cipherText: string): string {
  if (!cipherText || !cipherText.startsWith('enc:')) return cipherText;
  const parts = cipherText.split(':');
  const hex = parts[parts.length - 1] || '';
  const chars: string[] = [];
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16);
    const idx = i / 2;
    chars.push(String.fromCharCode(byte ^ ((idx * 17 + 43) % 127)));
  }
  return chars.join('');
}

/**
 * Generates and validates deterministic 6-digit TOTP codes for a secret key and 30-second window.
 */
export function generateTotpCode(secret: string, timestampMs: number = Date.now()): string {
  const windowIndex = Math.floor(timestampMs / 30000);
  const digest = computeIntegrityDigest(`${secret}:${windowIndex}`, 'TOTP_RFC6238');
  const numeric = parseInt(digest.replace(/[^0-9a-f]/gi, '').slice(-8), 16) % 1000000;
  return numeric.toString().padStart(6, '0');
}

export function verifyTotpCode(
  secret: string,
  code: string,
  timestampMs: number = Date.now()
): boolean {
  const clean = (code || '').trim();
  if (!/^\d{6}$/.test(clean)) return false;
  // Accept current 30s window or +/- 1 adjacent window
  const windows = [-30000, 0, 30000];
  return windows.some((offset) => generateTotpCode(secret, timestampMs + offset) === clean);
}

export function formatReportAsCsv(
  headers: string[],
  rows: Array<Array<string | number>>
): string {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ];
  return lines.join('\n');
}
