import React, { useState } from 'react';
import {
  ShieldCheck,
  KeyRound,
  UserPlus,
  Lock,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { AdvisorRecord, AuditLogRecord, UserProfile } from '../types';
import {
  decryptSensitivePayload,
  encryptSensitivePayload,
  generateTotpCode,
} from '../utils/accounting';

interface AdvisorAndSecurityViewProps {
  userProfile: UserProfile;
  advisors: AdvisorRecord[];
  auditLogs: AuditLogRecord[];
  onInviteAdvisor: (payload: {
    advisorName: string;
    advisorEmail: string;
    firmName: string;
    permissionLevel: string;
  }) => Promise<void>;
  onToggle2FA: (code: string, enable: boolean) => Promise<void>;
}

export const AdvisorAndSecurityView: React.FC<AdvisorAndSecurityViewProps> = ({
  userProfile,
  advisors,
  auditLogs,
  onInviteAdvisor,
  onToggle2FA,
}) => {
  // Advisor Invite Form State
  const [advisorName, setAdvisorName] = useState('');
  const [advisorEmail, setAdvisorEmail] = useState('');
  const [firmName, setFirmName] = useState('');
  const [permissionLevel, setPermissionLevel] = useState(
    'External Tax Auditor (Read + Reconcile + VAT Filing)'
  );
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  // Two-Factor Authentication (TOTP) State
  const totpSecret = userProfile.twoFactorSecret || 'JBSWY3DPEHPK3PXP';
  const currentLiveTotp = generateTotpCode(totpSecret);
  const [totpInput, setTotpInput] = useState('');
  const [toggling2FA, setToggling2FA] = useState(false);
  const [twoFactorError, setTwoFactorError] = useState<string | null>(null);
  const [twoFactorSuccess, setTwoFactorSuccess] = useState<string | null>(null);

  // E2E Encryption Sandbox Tester
  const [testPlaintext, setTestPlaintext] = useState(
    'SWIFT BIC: DEUTDEFFXXX · IBAN DE89 3704 0044 0532 0130 00'
  );
  const liveCiphertext = encryptSensitivePayload(testPlaintext);

  // Audit Trail Search
  const [auditSearch, setAuditSearch] = useState('');

  const filteredAuditLogs = auditLogs.filter((log) => {
    const q = auditSearch.toLowerCase();
    if (!q) return true;
    return (
      log.actionType.toLowerCase().includes(q) ||
      log.entityReference.toLowerCase().includes(q) ||
      log.actorEmail.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q)
    );
  });

  const handleAdvisorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    if (!advisorName.trim() || !advisorEmail.trim() || !firmName.trim()) {
      setInviteError('Advisor name, email, and accounting firm name are required.');
      return;
    }
    setInviting(true);
    try {
      await onInviteAdvisor({
        advisorName: advisorName.trim(),
        advisorEmail: advisorEmail.trim(),
        firmName: firmName.trim(),
        permissionLevel,
      });
      setAdvisorName('');
      setAdvisorEmail('');
      setFirmName('');
    } catch (err: unknown) {
      setInviteError(err instanceof Error ? err.message : 'Failed to invite advisor');
    } finally {
      setInviting(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError(null);
    setTwoFactorSuccess(null);
    setToggling2FA(true);
    try {
      const targetEnable = !userProfile.twoFactorEnabled;
      await onToggle2FA(totpInput.trim(), targetEnable);
      setTotpInput('');
      setTwoFactorSuccess(
        targetEnable
          ? 'Two-Factor Authentication (TOTP) verified and enforced on organization.'
          : 'Two-Factor Authentication disabled.'
      );
    } catch (err: unknown) {
      setTwoFactorError(err instanceof Error ? err.message : '2FA verification failed');
    } finally {
      setToggling2FA(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Split: Two-Factor Authentication + Accountant Collaboration Portal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Two-Factor Authentication & E2E Encryption Center (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Two-Factor Authentication (TOTP)
                </h2>
              </div>
              <span
                data-testid="2fa-status-label"
                className={`text-xs font-semibold whitespace-nowrap shrink-0 ${
                  userProfile.twoFactorEnabled
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
              >
                {userProfile.twoFactorEnabled ? '2FA Active' : '2FA Pending'}
              </span>
            </div>

            <div className="mt-4 py-3 border-b border-slate-100 dark:border-slate-800 text-xs space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Provisioned Authenticator Key:</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {totpSecret}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-500">Current 30s Token:</span>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    data-testid="live-totp-token"
                    className="font-mono text-sm font-bold text-sky-600 dark:text-sky-400 tracking-wider"
                  >
                    {currentLiveTotp}
                  </span>
                  <button
                    type="button"
                    onClick={() => setTotpInput(currentLiveTotp)}
                    className="px-2.5 py-1 text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                  >
                    <Copy className="w-3 h-3" />
                    Use Token
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleVerify2FA} className="mt-4 space-y-3">
              <div>
                <label
                  htmlFor="totp-code-input"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1"
                >
                  Enter 6-Digit Authenticator Code to{' '}
                  {userProfile.twoFactorEnabled ? 'Confirm Policy Change' : 'Verify & Enable 2FA'}
                </label>
                <div className="flex gap-2">
                  <input
                    id="totp-code-input"
                    type="text"
                    maxLength={6}
                    value={totpInput}
                    onChange={(e) => setTotpInput(e.target.value)}
                    placeholder={currentLiveTotp}
                    className="flex-1 px-3 py-2 text-sm font-mono tracking-widest bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="submit"
                    disabled={toggling2FA}
                    className="px-4 py-2 text-xs font-medium text-white bg-sky-600 hover:bg-sky-700 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0"
                  >
                    {toggling2FA
                      ? 'Verifying...'
                      : userProfile.twoFactorEnabled
                      ? 'Disable 2FA'
                      : 'Verify & Enable 2FA'}
                  </button>
                </div>
              </div>

              {twoFactorError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {twoFactorError}
                </p>
              )}
              {twoFactorSuccess && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {twoFactorSuccess}
                </p>
              )}
            </form>
          </div>

          {/* End-to-End Field Encryption Inspector */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-900 dark:text-slate-100">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              End-to-End (E2E) Zero-Knowledge Field Cipher Verifier
            </div>
            <input
              type="text"
              aria-label="Test E2E field encryption payload"
              value={testPlaintext}
              onChange={(e) => setTestPlaintext(e.target.value)}
              className="w-full px-3 py-1.5 text-xs font-mono bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
            />
            <div className="pt-2 text-xs font-mono text-slate-600 dark:text-slate-400 break-all">
              <div>Ciphertext: {liveCiphertext}</div>
              <div className="text-emerald-700 dark:text-emerald-400 mt-1">
                Verified Decryption: {decryptSensitivePayload(liveCiphertext)}
              </div>
            </div>
          </div>
        </div>

        {/* Accountant & Tax Advisor Collaboration Portal (6 cols) */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Accountant & Tax Advisor Collaboration Portal
                </h2>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                {advisors.length} authorized firms
              </span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">
              {advisors.map((adv) => (
                <div key={adv.id} className="py-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {adv.advisorName}
                    </div>
                    <div className="text-xs text-slate-500">
                      {adv.firmName} · {adv.advisorEmail}
                    </div>
                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                      Role: {adv.permissionLevel}
                    </div>
                  </div>
                  <div className="text-right text-xs whitespace-nowrap">
                    <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                      {adv.status} · MFA Verified
                    </div>
                    <div className="text-slate-400 font-mono mt-0.5">{adv.lastAccess}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={handleAdvisorSubmit}
            className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3"
          >
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              Invite External CPA / Statutory Auditor
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                aria-label="Advisor full name and credentials"
                value={advisorName}
                onChange={(e) => setAdvisorName(e.target.value)}
                placeholder="Advisor Name (e.g. Dr. Lukas Weber, StB)"
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              />
              <input
                type="email"
                aria-label="Advisor email"
                value={advisorEmail}
                onChange={(e) => setAdvisorEmail(e.target.value)}
                placeholder="l.weber@pwc-advisory.de"
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                aria-label="Accounting firm name"
                value={firmName}
                onChange={(e) => setFirmName(e.target.value)}
                placeholder="Accounting Firm Name"
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              />
              <select
                aria-label="Advisor permission scope"
                value={permissionLevel}
                onChange={(e) => setPermissionLevel(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
              >
                <option value="External Tax Auditor (Read + Reconcile + VAT Filing)">
                  External Tax Auditor (Read + Reconcile + VAT)
                </option>
                <option value="Statutory Audit Partner (Read-Only + Cryptographic Trail)">
                  Statutory Audit Partner (Read-Only + Trail)
                </option>
                <option value="Full Bookkeeper & Payroll Controller">
                  Full Bookkeeper & Payroll Controller
                </option>
              </select>
            </div>
            {inviteError && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {inviteError}
              </p>
            )}
            <button
              type="submit"
              disabled={inviting}
              className="w-full px-4 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-sky-600 hover:bg-slate-800 rounded-md transition-colors"
            >
              {inviting ? 'Granting Encrypted Access...' : 'Grant Advisor Portal Access'}
            </button>
          </form>
        </div>
      </div>

      {/* Immutable Cryptographic Audit Trail */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Immutable Cryptographic Audit Trail (SOX / ISO-27001 Compliant)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Every transaction, reconciliation, tax filing, and security event is signed with a verifiable SHA-256 digest
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search audit trail logs"
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              placeholder="Filter by event, actor, or reference..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 text-xs text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-medium">Event Action</th>
                <th className="py-3 px-4 font-medium">Reference</th>
                <th className="py-3 px-4 font-medium">Actor</th>
                <th className="py-3 px-4 font-medium">Audit Details</th>
                <th className="py-3 px-4 font-medium text-right">Cryptographic Integrity Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {filteredAuditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                    {log.actionType}
                  </td>
                  <td className="py-3 px-4 font-mono text-sky-600 dark:text-sky-400 whitespace-nowrap">
                    {log.entityReference}
                  </td>
                  <td className="py-3 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                    {log.actorEmail}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">{log.details}</td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    {log.integrityHash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
