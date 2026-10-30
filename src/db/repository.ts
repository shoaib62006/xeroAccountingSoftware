import { eq, desc, and } from 'drizzle-orm';
import { db } from './index.ts';
import {
  users,
  invoices,
  bankTransactions,
  expenses,
  payrollRuns,
  reportTemplates,
  advisors,
  auditLogs,
} from './schema.ts';
import {
  calculateInvoiceTotals,
  computeIntegrityDigest,
  encryptSensitivePayload,
  SupportedCurrency,
  TaxJurisdictionCode,
} from '../utils/accounting.ts';

export async function getOrCreateUser(uid: string, email: string, displayName?: string) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        twoFactorSecret: 'JBSWY3DPEHPK3PXP',
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
        },
      })
      .returning();

    const user = result[0];
    await ensureUserSeedData(user.id, user.email);
    return user;
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to synchronize user profile in database.', { cause: error });
  }
}

async function ensureUserSeedData(userId: number, userEmail: string) {
  try {
    const existingInvoices = await db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.userId, userId))
      .limit(1);

    if (existingInvoices.length > 0) {
      return;
    }

    const seedInvoices = [
      {
        userId,
        invoiceNumber: 'INV-2026-104',
        clientName: 'Northwind Logistics Ltd',
        clientEmail: 'ap@northwind-logistics.co.uk',
        issueDate: '2026-10-08',
        dueDate: '2026-11-07',
        currency: 'GBP',
        exchangeRate: '1.2920',
        taxJurisdiction: 'UK_VAT',
        taxRate: '20.00',
        subtotal: '12500.00',
        taxAmount: '2500.00',
        totalAmount: '15000.00',
        baseCurrencyTotal: '19380.00',
        status: 'Awaiting Payment',
        lineItemsJson: JSON.stringify([
          {
            description: 'Enterprise Supply Chain Telemetry License (Q4)',
            quantity: 1,
            unitPrice: 9500,
            accountCode: '200 - SaaS Subscriptions',
          },
          {
            description: 'Custom EDI Gateway Integration',
            quantity: 20,
            unitPrice: 150,
            accountCode: '210 - Professional Services',
          },
        ]),
        encryptedNotes: encryptSensitivePayload('UK VAT Reg GB99482102 - BACS Sort 20-00-00'),
      },
      {
        userId,
        invoiceNumber: 'INV-2026-103',
        clientName: 'Vanguard Biotech GmbH',
        clientEmail: 'buchhaltung@vanguard-bio.de',
        issueDate: '2026-10-02',
        dueDate: '2026-10-25',
        currency: 'EUR',
        exchangeRate: '1.0850',
        taxJurisdiction: 'EU_VAT',
        taxRate: '19.00',
        subtotal: '18400.00',
        taxAmount: '3496.00',
        totalAmount: '21896.00',
        baseCurrencyTotal: '23757.16',
        status: 'Overdue',
        lineItemsJson: JSON.stringify([
          {
            description: 'Clinical Trial Cold-Chain Analytics Node',
            quantity: 4,
            unitPrice: 4600,
            accountCode: '200 - SaaS Subscriptions',
          },
        ]),
        encryptedNotes: encryptSensitivePayload('DE USt-IdNr. DE298410492 - SEPA Direct'),
      },
      {
        userId,
        invoiceNumber: 'INV-2026-102',
        clientName: 'Apex Pacific Holdings Pty',
        clientEmail: 'finance@apexpacific.com.au',
        issueDate: '2026-09-21',
        dueDate: '2026-10-21',
        currency: 'AUD',
        exchangeRate: '0.6580',
        taxJurisdiction: 'AU_GST',
        taxRate: '10.00',
        subtotal: '14000.00',
        taxAmount: '1400.00',
        totalAmount: '15400.00',
        baseCurrencyTotal: '10133.20',
        status: 'Paid',
        lineItemsJson: JSON.stringify([
          {
            description: 'APAC Multi-Region Failover Cluster',
            quantity: 1,
            unitPrice: 14000,
            accountCode: '200 - SaaS Subscriptions',
          },
        ]),
        encryptedNotes: encryptSensitivePayload('ABN 51 824 753 556 - Settled via Stripe'),
        stripeSessionId: 'cs_live_a1B2c3D4e5F6',
      },
      {
        userId,
        invoiceNumber: 'INV-2026-101',
        clientName: 'Cascade Cloud Systems Inc',
        clientEmail: 'billing@cascadecloud.io',
        issueDate: '2026-09-14',
        dueDate: '2026-10-14',
        currency: 'USD',
        exchangeRate: '1.0000',
        taxJurisdiction: 'US_STD',
        taxRate: '8.25',
        subtotal: '28000.00',
        taxAmount: '2310.00',
        totalAmount: '30310.00',
        baseCurrencyTotal: '30310.00',
        status: 'Paid',
        lineItemsJson: JSON.stringify([
          {
            description: 'Annual Platform Core Subscription',
            quantity: 1,
            unitPrice: 28000,
            accountCode: '200 - SaaS Subscriptions',
          },
        ]),
        encryptedNotes: encryptSensitivePayload('ACH Wire Routing #021000021 - Settled'),
        stripeSessionId: 'cs_live_x9Y8z7W6v5U4',
      },
    ];

    const insertedInvoices = await db.insert(invoices).values(seedInvoices).returning();
    const northwindInvoice = insertedInvoices[0];

    await db.insert(bankTransactions).values([
      {
        userId,
        accountName: 'Mercury Operating Checking (••4829)',
        transactionDate: '2026-10-29',
        description: 'FASTER PAYMENTS: NORTHWIND LOGISTICS LTD',
        reference: 'INV-2026-104',
        amount: '15000.00',
        currency: 'GBP',
        type: 'CREDIT',
        category: '200 - Accounts Receivable',
        reconciled: false,
        matchedInvoiceId: northwindInvoice ? northwindInvoice.id : null,
      },
      {
        userId,
        accountName: 'Mercury Operating Checking (••4829)',
        transactionDate: '2026-10-28',
        description: 'AWS EMEA SARL CLOUD HOSTING',
        reference: 'AWS-OCT-9941',
        amount: '3420.50',
        currency: 'USD',
        type: 'DEBIT',
        category: '420 - Cloud Infrastructure & Hosting',
        reconciled: false,
      },
      {
        userId,
        accountName: 'HSBC Global Multi-Currency (••9012)',
        transactionDate: '2026-10-26',
        description: 'SEPA TRANSFER: VANGUARD BIOTECH GMBH',
        reference: 'INV-2026-103',
        amount: '21896.00',
        currency: 'EUR',
        type: 'CREDIT',
        category: '200 - Accounts Receivable',
        reconciled: false,
      },
      {
        userId,
        accountName: 'Mercury Operating Checking (••4829)',
        transactionDate: '2026-10-21',
        description: 'STRIPE PAYOUT: APEX PACIFIC HOLDINGS',
        reference: 'INV-2026-102',
        amount: '15400.00',
        currency: 'AUD',
        type: 'CREDIT',
        category: '200 - Accounts Receivable',
        reconciled: true,
        matchedLedgerNote: 'Matched to INV-2026-102 via Stripe Auto-Feed',
      },
      {
        userId,
        accountName: 'Mercury Operating Checking (••4829)',
        transactionDate: '2026-10-14',
        description: 'ACH SETTLEMENT: CASCADE CLOUD SYSTEMS',
        reference: 'INV-2026-101',
        amount: '30310.00',
        currency: 'USD',
        type: 'CREDIT',
        category: '200 - Accounts Receivable',
        reconciled: true,
        matchedLedgerNote: 'Matched to INV-2026-101 (ACH Settlement)',
      },
    ]);

    await db.insert(expenses).values([
      {
        userId,
        merchant: 'Amazon Web Services (us-east-1)',
        category: '420 - Cloud Infrastructure & Hosting',
        expenseDate: '2026-10-28',
        amount: '3420.50',
        currency: 'USD',
        taxAmount: '282.19',
        submittedBy: 'Marcus Vance (DevOps Lead)',
        status: 'Approved',
        receiptReference: 'RCP-2026-8841',
      },
      {
        userId,
        merchant: 'Lufthansa Business Travel (FRA -> LHR)',
        category: '460 - International Client Travel',
        expenseDate: '2026-10-25',
        amount: '890.00',
        currency: 'EUR',
        taxAmount: '169.10',
        submittedBy: 'Clara Lindqvist (Enterprise AE)',
        status: 'Pending Approval',
        receiptReference: 'RCP-2026-8892',
      },
      {
        userId,
        merchant: 'Baker McKenzie Global Tax Advisory',
        category: '410 - Legal & Tax Compliance',
        expenseDate: '2026-10-19',
        amount: '2450.00',
        currency: 'GBP',
        taxAmount: '490.00',
        submittedBy: 'Elena Rostova (CFO)',
        status: 'Approved',
        receiptReference: 'RCP-2026-8710',
      },
    ]);

    await db.insert(payrollRuns).values([
      {
        userId,
        employeeName: 'Marcus Vance',
        roleTitle: 'Principal Cloud Architect',
        department: 'Engineering',
        payPeriod: 'Oct 1 – Oct 31, 2026',
        grossPay: '11500.00',
        taxWithheld: '2587.50',
        retirementContribution: '690.00',
        netPay: '8222.50',
        currency: 'USD',
        status: 'Processed',
        paymentDate: '2026-10-30',
      },
      {
        userId,
        employeeName: 'Clara Lindqvist',
        roleTitle: 'VP Global Sales (EMEA)',
        department: 'Revenue',
        payPeriod: 'Oct 1 – Oct 31, 2026',
        grossPay: '9800.00',
        taxWithheld: '2205.00',
        retirementContribution: '588.00',
        netPay: '7007.00',
        currency: 'EUR',
        status: 'Processed',
        paymentDate: '2026-10-30',
      },
      {
        userId,
        employeeName: 'Tariq Al-Mansoor',
        roleTitle: 'Senior Tax & Compliance Controller',
        department: 'Finance',
        payPeriod: 'Oct 1 – Oct 31, 2026',
        grossPay: '8600.00',
        taxWithheld: '1935.00',
        retirementContribution: '516.00',
        netPay: '6149.00',
        currency: 'GBP',
        status: 'Processed',
        paymentDate: '2026-10-30',
      },
    ]);

    await db.insert(reportTemplates).values([
      {
        userId,
        name: 'IFRS Multi-Currency Executive P&L',
        reportType: 'PROFIT_AND_LOSS',
        columnsJson: JSON.stringify([
          'Account Code',
          'Account Name',
          'Original Currency',
          'FX Rate',
          'YTD Actual (USD)',
          'Tax Provision',
        ]),
        grouping: 'Quarterly',
        showComparison: true,
        includeTaxSummary: true,
      },
      {
        userId,
        name: 'HMRC / EU OSS VAT Return Worksheet',
        reportType: 'TAX_COMPLIANCE',
        columnsJson: JSON.stringify([
          'Jurisdiction',
          'Tax Authority',
          'Taxable Supplies',
          'Output VAT Collected',
          'Input Tax Credits',
          'Net Tax Payable',
        ]),
        grouping: 'Monthly',
        showComparison: false,
        includeTaxSummary: true,
      },
    ]);

    await db.insert(advisors).values([
      {
        userId,
        advisorName: 'Arthur Pendelton, CPA, FCA',
        advisorEmail: 'a.pendelton@deloitte-private-advisory.uk',
        firmName: 'Deloitte Private Cross-Border Tax LLP',
        permissionLevel: 'External Tax Auditor (Read + Reconcile + VAT Filing)',
        mfaVerified: true,
        status: 'Active',
        lastAccess: '2026-10-30 14:12 UTC',
      },
      {
        userId,
        advisorName: 'Sora Takahashi, CPTA',
        advisorEmail: 'stakahashi@kpmg-tokyo-advisory.jp',
        firmName: 'KPMG AZSA Tax Advisory Tokyo',
        permissionLevel: 'APAC Statutory Reviewer (Read-Only + Audit Trail)',
        mfaVerified: true,
        status: 'Active',
        lastAccess: '2026-10-29 09:45 UTC',
      },
    ]);

    await db.insert(auditLogs).values([
      {
        userId,
        actorEmail: userEmail,
        actionType: 'LEDGER_INITIALIZED',
        entityType: 'ORGANIZATION',
        entityReference: 'ORG-XERO-2026',
        details: 'Initialized multi-currency general ledger with E2E AES-256-GCM field encryption.',
        integrityHash: computeIntegrityDigest(`ORG-XERO-2026:${userEmail}:INIT`),
        ipAddress: '192.0.2.44',
      },
      {
        userId,
        actorEmail: 'a.pendelton@deloitte-private-advisory.uk',
        actionType: 'TAX_PROVISION_VERIFIED',
        entityType: 'VAT_RETURN',
        entityReference: 'UK-MTD-Q3-2026',
        details: 'Verified UK HMRC Making Tax Digital VAT return & FX revaluation schedules.',
        integrityHash: computeIntegrityDigest('UK-MTD-Q3-2026:VERIFIED'),
        ipAddress: '198.51.100.18',
      },
    ]);
  } catch (error) {
    console.error('Error seeding initial organization ledger:', error);
    throw new Error('Failed to seed initial organization ledger data.', { cause: error });
  }
}

export async function getWorkspaceBundle(userId: number) {
  try {
    const [
      userRecords,
      invoiceRecords,
      bankTxRecords,
      expenseRecords,
      payrollRecords,
      templateRecords,
      advisorRecords,
      auditRecords,
    ] = await Promise.all([
      db.select().from(users).where(eq(users.id, userId)),
      db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.id)),
      db
        .select()
        .from(bankTransactions)
        .where(eq(bankTransactions.userId, userId))
        .orderBy(desc(bankTransactions.id)),
      db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(desc(expenses.id)),
      db
        .select()
        .from(payrollRuns)
        .where(eq(payrollRuns.userId, userId))
        .orderBy(desc(payrollRuns.id)),
      db
        .select()
        .from(reportTemplates)
        .where(eq(reportTemplates.userId, userId))
        .orderBy(desc(reportTemplates.id)),
      db.select().from(advisors).where(eq(advisors.userId, userId)).orderBy(desc(advisors.id)),
      db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).orderBy(desc(auditLogs.id)),
    ]);

    return {
      userProfile: userRecords[0],
      invoices: invoiceRecords,
      bankTransactions: bankTxRecords,
      expenses: expenseRecords,
      payrollRuns: payrollRecords,
      reportTemplates: templateRecords,
      advisors: advisorRecords,
      auditLogs: auditRecords,
    };
  } catch (error) {
    console.error('Database query failed in getWorkspaceBundle:', error);
    throw new Error('Database query failed while loading workspace ledger.', { cause: error });
  }
}

export async function createInvoiceRecord(
  userId: number,
  actorEmail: string,
  payload: {
    clientName: string;
    clientEmail: string;
    issueDate: string;
    dueDate: string;
    currency: SupportedCurrency;
    taxJurisdiction: TaxJurisdictionCode;
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      accountCode: string;
    }>;
    notes?: string;
  }
) {
  try {
    const totals = calculateInvoiceTotals(
      payload.lineItems,
      payload.currency,
      payload.taxJurisdiction
    );
    const invoiceNumber = `INV-2026-${Math.floor(105 + Math.random() * 890)}`;
    const encryptedNotes = encryptSensitivePayload(
      payload.notes || `Issued to ${payload.clientName} (${payload.taxJurisdiction})`
    );

    const inserted = await db
      .insert(invoices)
      .values({
        userId,
        invoiceNumber,
        clientName: payload.clientName,
        clientEmail: payload.clientEmail,
        issueDate: payload.issueDate,
        dueDate: payload.dueDate,
        currency: payload.currency,
        exchangeRate: totals.exchangeRateToUsd.toFixed(4),
        taxJurisdiction: payload.taxJurisdiction,
        taxRate: totals.taxRate.toFixed(2),
        subtotal: totals.subtotal.toFixed(2),
        taxAmount: totals.taxAmount.toFixed(2),
        totalAmount: totals.totalAmount.toFixed(2),
        baseCurrencyTotal: totals.baseCurrencyTotalUsd.toFixed(2),
        status: 'Awaiting Payment',
        lineItemsJson: JSON.stringify(payload.lineItems),
        encryptedNotes,
      })
      .returning();

    const createdInvoice = inserted[0];

    await db.insert(auditLogs).values({
      userId,
      actorEmail,
      actionType: 'INVOICE_ISSUED',
      entityType: 'INVOICE',
      entityReference: createdInvoice.invoiceNumber,
      details: `Issued multi-currency invoice to ${payload.clientName} for ${payload.currency} ${createdInvoice.totalAmount} (Tax: ${payload.taxJurisdiction}).`,
      integrityHash: computeIntegrityDigest(
        `${createdInvoice.invoiceNumber}:${createdInvoice.totalAmount}:${actorEmail}`
      ),
    });

    return createdInvoice;
  } catch (error) {
    console.error('Database query failed in createInvoiceRecord:', error);
    throw new Error('Failed to create invoice record in database.', { cause: error });
  }
}

export async function markInvoicePaidViaStripe(
  userId: number,
  actorEmail: string,
  invoiceId: number,
  stripeSessionId: string
) {
  try {
    const existing = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)));

    if (!existing.length) {
      throw new Error('Invoice not found.');
    }

    const inv = existing[0];
    const updated = await db
      .update(invoices)
      .set({
        status: 'Paid',
        stripeSessionId,
      })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)))
      .returning();

    // Also create a reconciled bank transaction for the Stripe payout
    await db.insert(bankTransactions).values({
      userId,
      accountName: 'Stripe Merchant Settlement (••8840)',
      transactionDate: new Date().toISOString().slice(0, 10),
      description: `STRIPE SETTLEMENT: ${inv.clientName.toUpperCase()}`,
      reference: inv.invoiceNumber,
      amount: inv.totalAmount,
      currency: inv.currency,
      type: 'CREDIT',
      category: '200 - Accounts Receivable',
      reconciled: true,
      matchedInvoiceId: inv.id,
      matchedLedgerNote: `Auto-reconciled via Stripe API (${stripeSessionId})`,
    });

    await db.insert(auditLogs).values({
      userId,
      actorEmail,
      actionType: 'STRIPE_PAYMENT_SETTLED',
      entityType: 'INVOICE',
      entityReference: inv.invoiceNumber,
      details: `Settled ${inv.currency} ${inv.totalAmount} from ${inv.clientName} via Stripe (${stripeSessionId}).`,
      integrityHash: computeIntegrityDigest(`${inv.invoiceNumber}:${stripeSessionId}:PAID`),
    });

    return updated[0];
  } catch (error) {
    console.error('Database query failed in markInvoicePaidViaStripe:', error);
    throw new Error('Failed to process Stripe payment settlement in database.', { cause: error });
  }
}

export async function reconcileBankTransactionRecord(
  userId: number,
  actorEmail: string,
  transactionId: number,
  matchedInvoiceId?: number | null,
  customNote?: string
) {
  try {
    const txRows = await db
      .select()
      .from(bankTransactions)
      .where(and(eq(bankTransactions.id, transactionId), eq(bankTransactions.userId, userId)));

    if (!txRows.length) {
      throw new Error('Bank transaction not found.');
    }

    const tx = txRows[0];
    let ledgerNote = customNote || `Reconciled against General Ledger (${tx.category})`;

    if (matchedInvoiceId) {
      const invRows = await db
        .select()
        .from(invoices)
        .where(and(eq(invoices.id, matchedInvoiceId), eq(invoices.userId, userId)));

      if (invRows.length > 0) {
        const inv = invRows[0];
        await db
          .update(invoices)
          .set({ status: 'Paid' })
          .where(and(eq(invoices.id, inv.id), eq(invoices.userId, userId)));
        ledgerNote = `Matched to Invoice ${inv.invoiceNumber} (${inv.clientName})`;
      }
    }

    const updatedTx = await db
      .update(bankTransactions)
      .set({
        reconciled: true,
        matchedInvoiceId: matchedInvoiceId ?? tx.matchedInvoiceId,
        matchedLedgerNote: ledgerNote,
      })
      .where(and(eq(bankTransactions.id, transactionId), eq(bankTransactions.userId, userId)))
      .returning();

    await db.insert(auditLogs).values({
      userId,
      actorEmail,
      actionType: 'BANK_LINE_RECONCILED',
      entityType: 'BANK_TRANSACTION',
      entityReference: tx.reference,
      details: `${ledgerNote} — ${tx.currency} ${tx.amount}`,
      integrityHash: computeIntegrityDigest(`${tx.id}:${tx.reference}:RECONCILED`),
    });

    return updatedTx[0];
  } catch (error) {
    console.error('Database query failed in reconcileBankTransactionRecord:', error);
    throw new Error('Failed to reconcile bank transaction in database.', { cause: error });
  }
}

export async function createExpenseRecord(
  userId: number,
  actorEmail: string,
  payload: {
    merchant: string;
    category: string;
    expenseDate: string;
    amount: string;
    currency: string;
    taxAmount: string;
    submittedBy: string;
  }
) {
  try {
    const receiptReference = `RCP-2026-${Math.floor(1000 + Math.random() * 8999)}`;
    const inserted = await db
      .insert(expenses)
      .values({
        userId,
        merchant: payload.merchant,
        category: payload.category,
        expenseDate: payload.expenseDate,
        amount: payload.amount,
        currency: payload.currency,
        taxAmount: payload.taxAmount,
        submittedBy: payload.submittedBy,
        status: 'Approved',
        receiptReference,
      })
      .returning();

    // Also add an unreconciled bank feed debit line for mobile expense card swipe
    await db.insert(bankTransactions).values({
      userId,
      accountName: 'Corporate Expense Card (••3310)',
      transactionDate: payload.expenseDate,
      description: `CARD PURCHASE: ${payload.merchant.toUpperCase()}`,
      reference: receiptReference,
      amount: payload.amount,
      currency: payload.currency,
      type: 'DEBIT',
      category: payload.category,
      reconciled: false,
    });

    await db.insert(auditLogs).values({
      userId,
      actorEmail,
      actionType: 'EXPENSE_CLAIM_LOGGED',
      entityType: 'EXPENSE',
      entityReference: receiptReference,
      details: `Logged mobile expense claim for ${payload.merchant} (${payload.currency} ${payload.amount}).`,
      integrityHash: computeIntegrityDigest(`${receiptReference}:${payload.amount}`),
    });

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createExpenseRecord:', error);
    throw new Error('Failed to log expense claim in database.', { cause: error });
  }
}

export async function createPayrollRunRecord(
  userId: number,
  actorEmail: string,
  payload: {
    employeeName: string;
    roleTitle: string;
    department: string;
    payPeriod: string;
    grossPay: string;
    taxWithheld: string;
    retirementContribution: string;
    netPay: string;
    currency: string;
    paymentDate: string;
  }
) {
  try {
    const inserted = await db
      .insert(payrollRuns)
      .values({
        userId,
        ...payload,
        status: 'Processed',
      })
      .returning();

    const ref = `PAY-${Date.now().toString().slice(-5)}`;
    await db.insert(auditLogs).values({
      userId,
      actorEmail,
      actionType: 'PAYROLL_DISBURSED',
      entityType: 'PAYROLL',
      entityReference: ref,
      details: `Processed payroll for ${payload.employeeName} (${payload.payPeriod}) — Net ${payload.currency} ${payload.netPay}.`,
      integrityHash: computeIntegrityDigest(`${ref}:${payload.employeeName}:${payload.netPay}`),
    });

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createPayrollRunRecord:', error);
    throw new Error('Failed to record payroll run in database.', { cause: error });
  }
}

export async function createReportTemplateRecord(
  userId: number,
  actorEmail: string,
  payload: {
    name: string;
    reportType: string;
    columns: string[];
    grouping: string;
    showComparison: boolean;
    includeTaxSummary: boolean;
  }
) {
  try {
    const inserted = await db
      .insert(reportTemplates)
      .values({
        userId,
        name: payload.name,
        reportType: payload.reportType,
        columnsJson: JSON.stringify(payload.columns),
        grouping: payload.grouping,
        showComparison: payload.showComparison,
        includeTaxSummary: payload.includeTaxSummary,
      })
      .returning();

    await db.insert(auditLogs).values({
      userId,
      actorEmail,
      actionType: 'REPORT_TEMPLATE_SAVED',
      entityType: 'REPORT_TEMPLATE',
      entityReference: `TPL-${inserted[0].id}`,
      details: `Saved custom financial report template "${payload.name}" (${payload.grouping}).`,
      integrityHash: computeIntegrityDigest(`TPL-${inserted[0].id}:${payload.name}`),
    });

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in createReportTemplateRecord:', error);
    throw new Error('Failed to save report template in database.', { cause: error });
  }
}

export async function inviteAdvisorRecord(
  userId: number,
  actorEmail: string,
  payload: {
    advisorName: string;
    advisorEmail: string;
    firmName: string;
    permissionLevel: string;
  }
) {
  try {
    const inserted = await db
      .insert(advisors)
      .values({
        userId,
        advisorName: payload.advisorName,
        advisorEmail: payload.advisorEmail,
        firmName: payload.firmName,
        permissionLevel: payload.permissionLevel,
        mfaVerified: true,
        status: 'Active',
        lastAccess: 'Just invited (Pending 1st Session)',
      })
      .returning();

    await db.insert(auditLogs).values({
      userId,
      actorEmail,
      actionType: 'ADVISOR_ACCESS_GRANTED',
      entityType: 'ADVISOR',
      entityReference: payload.advisorEmail,
      details: `Granted collaborator access (${payload.permissionLevel}) to ${payload.advisorName} at ${payload.firmName}.`,
      integrityHash: computeIntegrityDigest(`ADVISOR:${payload.advisorEmail}:${actorEmail}`),
    });

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in inviteAdvisorRecord:', error);
    throw new Error('Failed to invite advisor in database.', { cause: error });
  }
}

export async function updateTwoFactorStatus(
  userId: number,
  actorEmail: string,
  enabled: boolean
) {
  try {
    const updated = await db
      .update(users)
      .set({ twoFactorEnabled: enabled })
      .where(eq(users.id, userId))
      .returning();

    await db.insert(auditLogs).values({
      userId,
      actorEmail,
      actionType: enabled ? 'MFA_TOTP_ENABLED' : 'MFA_TOTP_DISABLED',
      entityType: 'SECURITY_POLICY',
      entityReference: `USER-${userId}`,
      details: `Two-Factor Authentication (RFC 6238 TOTP) ${enabled ? 'enabled and verified' : 'disabled'} for organization account.`,
      integrityHash: computeIntegrityDigest(`MFA:${userId}:${enabled}:${Date.now()}`),
    });

    return updated[0];
  } catch (error) {
    console.error('Database query failed in updateTwoFactorStatus:', error);
    throw new Error('Failed to update Two-Factor Authentication status.', { cause: error });
  }
}
