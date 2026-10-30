export type SupportedLocale = 'en' | 'es' | 'fr' | 'de' | 'ja';

export interface LocaleStrings {
  dashboard: string;
  invoicing: string;
  reconciliation: string;
  reports: string;
  payroll: string;
  advisorsAndAudit: string;
  newInvoice: string;
  cashFlowAnalysis: string;
  reconciledCash: string;
  accountsReceivable: string;
  netProfit: string;
  taxLiability: string;
  unreconciledItems: string;
  exportCsv: string;
  exportJson: string;
  twoFactorAuth: string;
  e2eEncryptionActive: string;
}

export const LOCALE_LABELS: Record<SupportedLocale, { name: string; strings: LocaleStrings }> = {
  en: {
    name: 'English (Global)',
    strings: {
      dashboard: 'Dashboard',
      invoicing: 'Invoicing & Billing',
      reconciliation: 'Bank & Expenses',
      reports: 'Financial Reports',
      payroll: 'Payroll',
      advisorsAndAudit: 'Advisor & Security',
      newInvoice: 'Create Invoice',
      cashFlowAnalysis: 'Real-Time Cash Flow & Liquidity Analysis',
      reconciledCash: 'Reconciled Cash Balance',
      accountsReceivable: 'Invoices Owed to You',
      netProfit: 'Net Operating Profit (YTD)',
      taxLiability: 'Estimated Tax Provision',
      unreconciledItems: 'Unreconciled Bank Lines',
      exportCsv: 'Export CSV',
      exportJson: 'Export JSON',
      twoFactorAuth: '2FA Security',
      e2eEncryptionActive: 'E2E Zero-Knowledge Field Encryption Active',
    },
  },
  es: {
    name: 'Español (Intl)',
    strings: {
      dashboard: 'Panel Principal',
      invoicing: 'Facturación y Cobros',
      reconciliation: 'Bancos y Gastos',
      reports: 'Informes Financieros',
      payroll: 'Nómina',
      advisorsAndAudit: 'Asesores y Auditoría',
      newInvoice: 'Crear Factura',
      cashFlowAnalysis: 'Análisis de Flujo de Caja y Liquidez en Tiempo Real',
      reconciledCash: 'Saldo Bancario Conciliado',
      accountsReceivable: 'Cuentas por Cobrar',
      netProfit: 'Beneficio Operativo Neto',
      taxLiability: 'Provisión Fiscal Estimada',
      unreconciledItems: 'Partidas por Conciliar',
      exportCsv: 'Exportar CSV',
      exportJson: 'Exportar JSON',
      twoFactorAuth: 'Seguridad 2FA',
      e2eEncryptionActive: 'Cifrado de Extremo a Extremo Activo',
    },
  },
  fr: {
    name: 'Français (UE)',
    strings: {
      dashboard: 'Tableau de Bord',
      invoicing: 'Facturation',
      reconciliation: 'Banque et Dépenses',
      reports: 'Rapports Financiers',
      payroll: 'Paie',
      advisorsAndAudit: 'Audit et Sécurité',
      newInvoice: 'Créer une Facture',
      cashFlowAnalysis: 'Analyse de Trésorerie en Temps Réel',
      reconciledCash: 'Trésorerie Rapprochée',
      accountsReceivable: 'Créances Clients',
      netProfit: 'Résultat Net d’Exploitation',
      taxLiability: 'Provision TVA / Impôts',
      unreconciledItems: 'Lignes à Rapprocher',
      exportCsv: 'Exporter CSV',
      exportJson: 'Exporter JSON',
      twoFactorAuth: 'Sécurité 2FA',
      e2eEncryptionActive: 'Chiffrement de Bout en Bout Actif',
    },
  },
  de: {
    name: 'Deutsch (DACH)',
    strings: {
      dashboard: 'Finanzübersicht',
      invoicing: 'Rechnungen',
      reconciliation: 'Bankabgleich & Spesen',
      reports: 'Finanzberichte',
      payroll: 'Lohnabrechnung',
      advisorsAndAudit: 'Steuerberater & Audit',
      newInvoice: 'Neue Rechnung',
      cashFlowAnalysis: 'Echtzeit-Cashflow & Liquiditätsanalyse',
      reconciledCash: 'Abgeglichener Kontostand',
      accountsReceivable: 'Offene Forderungen',
      netProfit: 'Operatives Nettoergebnis',
      taxLiability: 'Umsatzsteuer-Zahllast',
      unreconciledItems: 'Offene Bankbuchungen',
      exportCsv: 'CSV Exportieren',
      exportJson: 'JSON Exportieren',
      twoFactorAuth: '2FA-Schutz',
      e2eEncryptionActive: 'Ende-zu-Ende-Verschlüsselung Aktiv',
    },
  },
  ja: {
    name: '日本語 (JP)',
    strings: {
      dashboard: 'ダッシュボード',
      invoicing: '請求書・決済管理',
      reconciliation: '銀行照合・経費精算',
      reports: '財務レポート',
      payroll: '給与計算',
      advisorsAndAudit: '顧問税理士・監査ログ',
      newInvoice: '請求書を作成',
      cashFlowAnalysis: 'リアルタイム資金繰り・キャッシュフロー分析',
      reconciledCash: '照合済現預金残高',
      accountsReceivable: '売掛金残高',
      netProfit: '純営業利益 (YTD)',
      taxLiability: '消費税・税務引当額',
      unreconciledItems: '未照合の銀行明細',
      exportCsv: 'CSV出力',
      exportJson: 'JSON出力',
      twoFactorAuth: '二要素認証 (2FA)',
      e2eEncryptionActive: 'E2Eフィールド暗号化有効',
    },
  },
};
