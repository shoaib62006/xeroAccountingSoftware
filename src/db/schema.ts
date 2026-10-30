import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('Organization Owner'),
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  twoFactorSecret: text('two_factor_secret'),
  preferredCurrency: text('preferred_currency').notNull().default('USD'),
  preferredLocale: text('preferred_locale').notNull().default('en'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  invoiceNumber: text('invoice_number').notNull(),
  clientName: text('client_name').notNull(),
  clientEmail: text('client_email').notNull(),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date').notNull(),
  currency: text('currency').notNull().default('USD'),
  exchangeRate: text('exchange_rate').notNull().default('1.0000'),
  taxJurisdiction: text('tax_jurisdiction').notNull().default('US_STD'),
  taxRate: text('tax_rate').notNull().default('8.25'),
  subtotal: text('subtotal').notNull(),
  taxAmount: text('tax_amount').notNull(),
  totalAmount: text('total_amount').notNull(),
  baseCurrencyTotal: text('base_currency_total').notNull(),
  status: text('status').notNull().default('Awaiting Payment'),
  lineItemsJson: text('line_items_json').notNull(),
  encryptedNotes: text('encrypted_notes'),
  stripeSessionId: text('stripe_session_id'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const bankTransactions = pgTable('bank_transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  accountName: text('account_name').notNull(),
  transactionDate: text('transaction_date').notNull(),
  description: text('description').notNull(),
  reference: text('reference').notNull(),
  amount: text('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  type: text('type').notNull(), // 'CREDIT' | 'DEBIT'
  category: text('category').notNull(),
  reconciled: boolean('reconciled').notNull().default(false),
  matchedInvoiceId: integer('matched_invoice_id'),
  matchedLedgerNote: text('matched_ledger_note'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  merchant: text('merchant').notNull(),
  category: text('category').notNull(),
  expenseDate: text('expense_date').notNull(),
  amount: text('amount').notNull(),
  currency: text('currency').notNull().default('USD'),
  taxAmount: text('tax_amount').notNull().default('0.00'),
  submittedBy: text('submitted_by').notNull(),
  status: text('status').notNull().default('Pending Approval'),
  receiptReference: text('receipt_reference'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const payrollRuns = pgTable('payroll_runs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  employeeName: text('employee_name').notNull(),
  roleTitle: text('role_title').notNull(),
  department: text('department').notNull(),
  payPeriod: text('pay_period').notNull(),
  grossPay: text('gross_pay').notNull(),
  taxWithheld: text('tax_withheld').notNull(),
  retirementContribution: text('retirement_contribution').notNull(),
  netPay: text('net_pay').notNull(),
  currency: text('currency').notNull().default('USD'),
  status: text('status').notNull().default('Processed'),
  paymentDate: text('payment_date').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const reportTemplates = pgTable('report_templates', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  name: text('name').notNull(),
  reportType: text('report_type').notNull(),
  columnsJson: text('columns_json').notNull(),
  grouping: text('grouping').notNull().default('Monthly'),
  showComparison: boolean('show_comparison').notNull().default(true),
  includeTaxSummary: boolean('include_tax_summary').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow(),
});

export const advisors = pgTable('advisors', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  advisorName: text('advisor_name').notNull(),
  advisorEmail: text('advisor_email').notNull(),
  firmName: text('firm_name').notNull(),
  permissionLevel: text('permission_level').notNull(),
  mfaVerified: boolean('mfa_verified').notNull().default(true),
  status: text('status').notNull().default('Active'),
  lastAccess: text('last_access').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  actorEmail: text('actor_email').notNull(),
  actionType: text('action_type').notNull(),
  entityType: text('entity_type').notNull(),
  entityReference: text('entity_reference').notNull(),
  details: text('details').notNull(),
  integrityHash: text('integrity_hash').notNull(),
  ipAddress: text('ip_address').notNull().default('10.24.0.1'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  invoices: many(invoices),
  bankTransactions: many(bankTransactions),
  expenses: many(expenses),
  payrollRuns: many(payrollRuns),
  reportTemplates: many(reportTemplates),
  advisors: many(advisors),
  auditLogs: many(auditLogs),
}));
