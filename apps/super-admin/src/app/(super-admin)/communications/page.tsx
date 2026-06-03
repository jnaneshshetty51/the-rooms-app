'use client';

// apps/super-admin/src/app/(super-admin)/communications/page.tsx
// Communication & Alerts management for Super Admin

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@the-rooms/ui';
import { Bell, Mail, MessageSquare, Send, Users, AlertTriangle, CheckCircle } from 'lucide-react';

interface Communication {
  id: string;
  type: 'EMAIL' | 'WHATSAPP' | 'SMS' | 'SYSTEM';
  recipient: string;
  subject: string;
  status: 'SENT' | 'FAILED' | 'PENDING';
  sentAt: string;
}

interface Alert {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  title: string;
  message: string;
  acknowledged: boolean;
  createdAt: string;
}

// Demo data
const recentCommunications: Communication[] = [
  { id: '1', type: 'EMAIL', recipient: 'admin@therooms.in', subject: 'Daily Report - May 29, 2026', status: 'SENT', sentAt: '2026-05-29T08:00:00Z' },
  { id: '2', type: 'WHATSAPP', recipient: '+91 98765 43210', subject: 'Booking Confirmation - BKN-20260528-0001', status: 'SENT', sentAt: '2026-05-28T14:30:00Z' },
  { id: '3', type: 'EMAIL', recipient: 'fo@therooms.in', subject: 'Night Audit Report', status: 'FAILED', sentAt: '2026-05-28T23:00:00Z' },
];

const alerts: Alert[] = [
  { id: '1', severity: 'WARNING', title: 'Low Room Availability', message: 'Only 3 rooms available for tomorrow. Consider enabling maintenance mode on some rooms.', acknowledged: false, createdAt: '2026-05-29T10:00:00Z' },
  { id: '2', severity: 'CRITICAL', title: 'Payment Gateway Timeout', message: 'INDUSIND payment gateway showing increased response times (>30s). Monitor closely.', acknowledged: false, createdAt: '2026-05-29T09:45:00Z' },
  { id: '3', severity: 'INFO', title: 'Daily Backup Complete', message: 'Automated database backup completed successfully. Backup size: 245MB', acknowledged: true, createdAt: '2026-05-29T03:00:00Z' },
];

export default function CommunicationsPage() {
  const [activeTab, setActiveTab] = useState<'alerts' | 'logs' | 'templates'>('alerts');

  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-700 border-red-200';
      case 'WARNING': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'INFO': return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusIcon = (status: Communication['status']) => {
    switch (status) {
      case 'SENT': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'FAILED': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'PENDING': return <Bell className="w-4 h-4 text-yellow-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Communication & Alerts</h1>
        <p className="text-gray-500 mt-1">Monitor system alerts and communication logs</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { id: 'alerts', label: 'Active Alerts', count: alerts.filter(a => !a.acknowledged).length },
            { id: 'logs', label: 'Communication Logs', count: null },
            { id: 'templates', label: 'Message Templates', count: null },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#E17055] text-[#E17055]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.count !== null && tab.count > 0 && (
                <span className="ml-2 bg-red-100 text-red-600 text-xs px-2 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <Card key={alert.id} className={alert.acknowledged ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                      <span className="text-xs text-gray-500" suppressHydrationWarning>
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                    {!alert.acknowledged && (
                      <button className="mt-3 text-sm text-[#E17055] hover:text-[#D35B3F] font-medium">
                        Acknowledge Alert
                      </button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === 'logs' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Communications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCommunications.map((comm) => (
                <div key={comm.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    {comm.type === 'EMAIL' && <Mail className="w-5 h-5 text-gray-400" />}
                    {comm.type === 'WHATSAPP' && <MessageSquare className="w-5 h-5 text-green-500" />}
                    {comm.type === 'SMS' && <Bell className="w-5 h-5 text-blue-500" />}
                    <div>
                      <p className="font-medium text-gray-900">{comm.subject}</p>
                      <p className="text-sm text-gray-500">{comm.recipient}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400" suppressHydrationWarning>
                      {new Date(comm.sentAt).toLocaleString()}
                    </span>
                    {getStatusIcon(comm.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === 'templates' && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-lg">Message Templates</CardTitle>
            <button className="inline-flex items-center gap-2 px-4 py-2 bg-[#E17055] text-white text-sm font-medium rounded-lg hover:bg-[#D35B3F]">
              <Send className="w-4 h-4" />
              New Template
            </button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: 'Booking Confirmation', type: 'EMAIL', usage: 156 },
                { name: 'Check-in Reminder', type: 'WHATSAPP', usage: 89 },
                { name: 'Payment Receipt', type: 'EMAIL', usage: 234 },
                { name: 'Check-out Reminder', type: 'SMS', usage: 67 },
              ].map((template, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    {template.type === 'EMAIL' && <Mail className="w-5 h-5 text-gray-400" />}
                    {template.type === 'WHATSAPP' && <MessageSquare className="w-5 h-5 text-green-500" />}
                    {template.type === 'SMS' && <Bell className="w-5 h-5 text-blue-500" />}
                    <span className="font-medium text-gray-900">{template.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">{template.usage} sent</span>
                    <button className="text-sm text-[#E17055] hover:text-[#D35B3F]">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}