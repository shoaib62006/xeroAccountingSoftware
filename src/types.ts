import { SupportedCurrency, TaxJurisdictionCode } from './utils/accounting';
import { SupportedLocale } from './utils/i18n';

export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName: string | null;
  role: string;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  preferredCurrency: SupportedCurrency;
  preferredLocale: SupportedLocale;
}

export interface InvoiceRecord {
  id: number;
  userId: number;
  invoiceNumber: string;
  clientName: string;
  clientEmail: string;
  issueDate: string;
  dueDate: string;
  currency: SupportedCurrency;
  exchangeRate: string;
  taxJurisdiction: TaxJurisdictionCode;
  taxRate: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  baseCurrencyTotal: string;
  status: string;
  lineItemsJson: string;
  encryptedNotes: string | null;
  stripeSessionId: string | null;
  createdAt?: string;
}

export interface BankTransactionRecord {
  id: number;
  userId: number;
  accountName: string;
  transactionDate: string;
  description: string;
  reference: string;
  amount: string;
  currency: SupportedCurrency;
  type: 'CREDIT' | 'DEBIT';
  category: string;
  reconciled: boolean;
  matchedInvoiceId: number | null;
  matchedLedgerNote: string | null;
}

export interface ExpenseRecord {
  id: number;
  userId: number;
  merchant: string;
  category: string;
  expenseDate: string;
  amount: string;
  currency: SupportedCurrency;
  taxAmount: string;
  submittedBy: string;
  status: string;
  receiptReference: string | null;
}

export interface PayrollRunRecord {
  id: number;
  userId: number;
  employeeName: string;
  roleTitle: string;
  department: string;
  payPeriod: string;
  grossPay: string;
  taxWithheld: string;
  retirementContribution: string;
  netPay: string;
  currency: SupportedCurrency;
  status: string;
  paymentDate: string;
}

export interface ReportTemplateRecord {
  id: number;
  userId: number;
  name: string;
  reportType: string;
  columnsJson: string;
  grouping: string;
  showComparison: boolean;
  includeTaxSummary: boolean;
}

export interface AdvisorRecord {
  id: number;
  userId: number;
  advisorName: string;
  advisorEmail: string;
  firmName: string;
  permissionLevel: string;
  mfaVerified: boolean;
  status: string;
  lastAccess: string;
}

export interface AuditLogRecord {
  id: number;
  userId: number;
  actorEmail: string;
  actionType: string;
  entityType: string;
  entityReference: string;
  details: string;
  integrityHash: string;
  ipAddress: string;
  createdAt?: string;
}

export interface WorkspaceBundle {
  userProfile: UserProfile;
  invoices: InvoiceRecord[];
  bankTransactions: BankTransactionRecord[];
  expenses: ExpenseRecord[];
  payrollRuns: PayrollRunRecord[];
  reportTemplates: ReportTemplateRecord[];
  advisors: AdvisorRecord[];
  auditLogs: AuditLogRecord[];
}

export interface RealTimeNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  category: 'INVOICE' | 'STRIPE' | 'RECONCILIATION' | 'EXPENSE' | 'PAYROLL' | 'SECURITY';
  read: boolean;
}
