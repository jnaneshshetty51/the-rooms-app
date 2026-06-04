'use client';

// apps/super-admin/src/app/(super-admin)/security/page.tsx
// Security Compliance for Super Admin

import { useState, useEffect } from 'react';
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

// Mocks removed

import { LoadingSpinner } from '@the-rooms/ui';

export default function SecurityPage() {
  const [activeCategory, setActiveCategory] = useState<SecurityCheck['category'] | 'ALL'>('ALL');
  const [showApiKeys, setShowApiKeys] = useState(false);
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [complianceFrameworks, setComplianceFrameworks] = useState<ComplianceFramework[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/security");
        if (res.ok) {
          const json = await res.json();
          setSecurityChecks(json.data.checks || []);
          setComplianceFrameworks(json.data.compliance || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

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
              { name: 'INDUSIND Bank API', key: 'indusind_live_****', status: 'ACTIVE' },
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