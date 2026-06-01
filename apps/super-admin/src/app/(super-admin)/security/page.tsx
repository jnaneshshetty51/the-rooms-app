'use client';

// apps/super-admin/src/app/(super-admin)/security/page.tsx
// Security Compliance for Super Admin

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@the-rooms/ui';
import { Shield, Lock, Key, FileText, AlertTriangle, CheckCircle, XCircle, Eye, EyeOff } from 'lucide-react';

interface SecurityCheck {
  id: string;
  category: 'ACCESS' | 'DATA' | 'INFRASTRUCTURE' | 'COMPLIANCE';
  name: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  lastChecked: string;
  details: string;
}

interface ComplianceFramework {
  name: string;
  status: 'COMPLIANT' | 'NON_COMPLIANT' | 'PARTIAL';
  lastAudit: string;
  findings: number;
}

// Demo security checks
const securityChecks: SecurityCheck[] = [
  { id: '1', category: 'ACCESS', name: 'Two-Factor Authentication', status: 'PASS', lastChecked: '2026-05-29T00:00:00Z', details: '2FA enforced for all admin accounts' },
  { id: '2', category: 'ACCESS', name: 'Password Policy', status: 'PASS', lastChecked: '2026-05-29T00:00:00Z', details: 'Min 12 chars, complexity requirements enabled' },
  { id: '3', category: 'ACCESS', name: 'Session Timeout', status: 'WARNING', lastChecked: '2026-05-29T00:00:00Z', details: '30min timeout - consider reducing to 15min' },
  { id: '4', category: 'DATA', name: 'Encryption at Rest', status: 'PASS', lastChecked: '2026-05-29T00:00:00Z', details: 'AES-256 encryption enabled for all data' },
  { id: '5', category: 'DATA', name: 'Encryption in Transit', status: 'PASS', lastChecked: '2026-05-29T00:00:00Z', details: 'TLS 1.3 enforced' },
  { id: '6', category: 'DATA', name: 'Backup Encryption', status: 'PASS', lastChecked: '2026-05-29T00:00:00Z', details: 'Backups encrypted with customer-managed keys' },
  { id: '7', category: 'INFRASTRUCTURE', name: 'Firewall Rules', status: 'PASS', lastChecked: '2026-05-29T00:00:00Z', details: 'Only whitelisted IPs have access' },
  { id: '8', category: 'INFRASTRUCTURE', name: 'DDoS Protection', status: 'PASS', lastChecked: '2026-05-29T00:00:00Z', details: 'CloudFlare protection active' },
  { id: '9', category: 'INFRASTRUCTURE', name: 'SSL Certificate', status: 'PASS', lastChecked: '2026-05-29T00:00:00Z', details: 'Expires in 45 days - renewal scheduled' },
  { id: '10', category: 'COMPLIANCE', name: 'GDPR Compliance', status: 'PASS', lastChecked: '2026-05-29T00:00:00Z', details: 'Data retention policies implemented' },
  { id: '11', category: 'COMPLIANCE', name: 'PCI-DSS', status: 'WARNING', lastChecked: '2026-05-29T00:00:00Z', details: 'Annual assessment due in 30 days' },
  { id: '12', category: 'COMPLIANCE', name: 'Audit Logging', status: 'PASS', lastChecked: '2026-05-29T00:00:00Z', details: 'All admin actions logged' },
];

const complianceFrameworks: ComplianceFramework[] = [
  { name: 'ISO 27001', status: 'COMPLIANT', lastAudit: '2026-03-15', findings: 0 },
  { name: 'SOC 2 Type II', status: 'COMPLIANT', lastAudit: '2026-01-20', findings: 2 },
  { name: 'PCI-DSS 4.0', status: 'PARTIAL', lastAudit: '2025-12-10', findings: 5 },
  { name: 'GDPR', status: 'COMPLIANT', lastAudit: '2026-02-28', findings: 0 },
];

export default function SecurityPage() {
  const [activeCategory, setActiveCategory] = useState<SecurityCheck['category'] | 'ALL'>('ALL');
  const [showApiKeys, setShowApiKeys] = useState(false);

  const filteredChecks = activeCategory === 'ALL' 
    ? securityChecks 
    : securityChecks.filter(c => c.category === activeCategory);

  const getStatusIcon = (status: SecurityCheck['status']) => {
    switch (status) {
      case 'PASS': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'FAIL': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'WARNING': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: SecurityCheck['status']) => {
    switch (status) {
      case 'PASS': return 'bg-green-100 text-green-700';
      case 'FAIL': return 'bg-red-100 text-red-700';
      case 'WARNING': return 'bg-yellow-100 text-yellow-700';
    }
  };

  const getComplianceBadge = (status: ComplianceFramework['status']) => {
    switch (status) {
      case 'COMPLIANT': return 'bg-green-100 text-green-700';
      case 'NON_COMPLIANT': return 'bg-red-100 text-red-700';
      case 'PARTIAL': return 'bg-yellow-100 text-yellow-700';
    }
  };

  const passCount = securityChecks.filter(c => c.status === 'PASS').length;
  const warnCount = securityChecks.filter(c => c.status === 'WARNING').length;
  const failCount = securityChecks.filter(c => c.status === 'FAIL').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Security & Compliance</h1>
        <p className="text-gray-500 mt-1">Monitor security status and compliance frameworks</p>
      </div>

      {/* Security Score */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{passCount}</p>
            <p className="text-sm text-gray-500">Passed</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{warnCount}</p>
            <p className="text-sm text-gray-500">Warnings</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4 text-center">
            <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{failCount}</p>
            <p className="text-sm text-gray-500">Failed</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 text-center">
            <Shield className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{Math.round((passCount / securityChecks.length) * 100)}%</p>
            <p className="text-sm text-gray-500">Security Score</p>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {['ALL', 'ACCESS', 'DATA', 'INFRASTRUCTURE', 'COMPLIANCE'].map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat as typeof activeCategory)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-[#E17055] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat === 'ALL' ? 'All Checks' : cat}
          </button>
        ))}
      </div>

      {/* Security Checks */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Security Checks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredChecks.map((check) => (
              <div key={check.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-4">
                  {getStatusIcon(check.status)}
                  <div>
                    <p className="font-medium text-gray-900">{check.name}</p>
                    <p className="text-sm text-gray-500">{check.details}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusBadge(check.status)}`}>
                    {check.status}
                  </span>
                  <span className="text-xs text-gray-400 whitespace-nowrap">
                    {new Date(check.lastChecked).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Frameworks */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg">Compliance Frameworks</CardTitle>
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#E17055] text-white text-sm font-medium rounded-lg hover:bg-[#D35B3F]">
            <FileText className="w-4 h-4" />
            Schedule Audit
          </button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {complianceFrameworks.map((framework) => (
              <div key={framework.name} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-4">
                  <Shield className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{framework.name}</p>
                    <p className="text-sm text-gray-500">Last audit: {new Date(framework.lastAudit).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getComplianceBadge(framework.status)}`}>
                    {framework.status}
                  </span>
                  {framework.findings > 0 && (
                    <span className="text-sm text-gray-500">{framework.findings} findings</span>
                  )}
                  <button className="text-sm text-[#E17055] hover:text-[#D35B3F]">View Report</button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Keys & Secrets */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-lg">API Keys & Secrets</CardTitle>
          <button 
            onClick={() => setShowApiKeys(!showApiKeys)}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
          >
            {showApiKeys ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showApiKeys ? 'Hide' : 'Show'}
          </button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'IDFC Bank API', key: 'idfc_live_****', status: 'ACTIVE' },
              { name: 'Resend Email API', key: 're_****', status: 'ACTIVE' },
              { name: 'MinIO Access', key: 'minio_****', status: 'ACTIVE' },
            ].map((api, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{api.name}</p>
                    <p className="text-sm text-gray-500 font-mono">
                      {showApiKeys ? api.key : '••••••••••••••••'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-green-100 text-green-700">
                    {api.status}
                  </span>
                  <button className="text-sm text-[#E17055] hover:text-[#D35B3F]">Rotate</button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}