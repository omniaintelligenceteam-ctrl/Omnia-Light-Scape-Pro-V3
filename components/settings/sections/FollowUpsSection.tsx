import React from 'react';
import { motion } from 'framer-motion';
import { SettingsCard } from '../ui/SettingsCard';
import { ToggleRow } from '../ui/SettingsToggle';
import { FollowUpSettings } from '../types';

interface FollowUpsSectionProps {
  followUpSettings?: FollowUpSettings;
  onFollowUpSettingsChange?: (settings: FollowUpSettings) => void;
}

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 }
};

export const FollowUpsSection: React.FC<FollowUpsSectionProps> = ({
  followUpSettings,
  onFollowUpSettingsChange
}) => {
  return (
    <motion.div
      key="followups"
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <p className="text-sm text-gray-400 mb-6">
        Configure automatic follow-up reminders for quotes, invoices, and installations.
      </p>

      {/* Quote Follow-ups */}
      <SettingsCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Quote Reminders</h3>
        <div className="space-y-4">
          <ToggleRow
            title="Enable quote reminders"
            description="Automatically remind clients about pending quotes"
            checked={followUpSettings?.enableQuoteReminders ?? true}
            onChange={(checked) => onFollowUpSettingsChange?.({
              ...followUpSettings!,
              enableQuoteReminders: checked
            })}
          />
          {followUpSettings?.enableQuoteReminders !== false && (
            <>
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-white">Reminder after</span>
                  <p className="text-xs text-gray-500">Days after quote is sent</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={14}
                    value={followUpSettings?.quoteReminderDays ?? 3}
                    onChange={(e) => onFollowUpSettingsChange?.({
                      ...followUpSettings!,
                      quoteReminderDays: parseInt(e.target.value) || 3
                    })}
                    className="w-16 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center"
                  />
                  <span className="text-sm text-gray-400">days</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-white">Expiration warning</span>
                  <p className="text-xs text-gray-500">Days before quote expires</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={followUpSettings?.quoteExpiringDays ?? 2}
                    onChange={(e) => onFollowUpSettingsChange?.({
                      ...followUpSettings!,
                      quoteExpiringDays: parseInt(e.target.value) || 2
                    })}
                    className="w-16 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center"
                  />
                  <span className="text-sm text-gray-400">days</span>
                </div>
              </div>
            </>
          )}
        </div>
      </SettingsCard>

      {/* Invoice Follow-ups */}
      <SettingsCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Invoice Reminders</h3>
        <div className="space-y-4">
          <ToggleRow
            title="Enable invoice reminders"
            description="Automatically remind clients about unpaid invoices"
            checked={followUpSettings?.enableInvoiceReminders ?? true}
            onChange={(checked) => onFollowUpSettingsChange?.({
              ...followUpSettings!,
              enableInvoiceReminders: checked
            })}
          />
          {followUpSettings?.enableInvoiceReminders !== false && (
            <>
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-white">Payment reminder</span>
                  <p className="text-xs text-gray-500">Days after invoice sent</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={followUpSettings?.invoiceReminderDays ?? 7}
                    onChange={(e) => onFollowUpSettingsChange?.({
                      ...followUpSettings!,
                      invoiceReminderDays: parseInt(e.target.value) || 7
                    })}
                    className="w-16 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center"
                  />
                  <span className="text-sm text-gray-400">days</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-white">Overdue notice</span>
                  <p className="text-xs text-gray-500">Days after due date</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={7}
                    value={followUpSettings?.invoiceOverdueDays ?? 1}
                    onChange={(e) => onFollowUpSettingsChange?.({
                      ...followUpSettings!,
                      invoiceOverdueDays: parseInt(e.target.value) || 1
                    })}
                    className="w-16 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center"
                  />
                  <span className="text-sm text-gray-400">days</span>
                </div>
              </div>
              <ToggleRow
                title="SMS for overdue invoices"
                description="Send SMS reminders for overdue payments (requires phone number)"
                checked={followUpSettings?.enableSmsForOverdue ?? false}
                onChange={(checked) => onFollowUpSettingsChange?.({
                  ...followUpSettings!,
                  enableSmsForOverdue: checked
                })}
              />
            </>
          )}
        </div>
      </SettingsCard>

      {/* Installation Reminders */}
      <SettingsCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Installation Reminders</h3>
        <div className="space-y-4">
          <ToggleRow
            title="Enable pre-installation reminders"
            description="Remind clients before their scheduled installation"
            checked={followUpSettings?.enablePreInstallReminders ?? true}
            onChange={(checked) => onFollowUpSettingsChange?.({
              ...followUpSettings!,
              enablePreInstallReminders: checked
            })}
          />
          {followUpSettings?.enablePreInstallReminders !== false && (
            <div className="flex items-center justify-between py-2">
              <div>
                <span className="text-sm text-white">Reminder before</span>
                <p className="text-xs text-gray-500">Days before scheduled date</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={followUpSettings?.preInstallationDays ?? 1}
                  onChange={(e) => onFollowUpSettingsChange?.({
                    ...followUpSettings!,
                    preInstallationDays: parseInt(e.target.value) || 1
                  })}
                  className="w-16 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center"
                />
                <span className="text-sm text-gray-400">days</span>
              </div>
            </div>
          )}
        </div>
      </SettingsCard>

      {/* Review Requests */}
      <SettingsCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Review Requests</h3>
        <div className="space-y-4">
          <ToggleRow
            title="Enable review request emails"
            description="Automatically request Google reviews after job completion"
            checked={followUpSettings?.enableReviewRequests ?? true}
            onChange={(checked) => onFollowUpSettingsChange?.({
              ...followUpSettings!,
              enableReviewRequests: checked
            })}
          />
          {followUpSettings?.enableReviewRequests !== false && (
            <>
              <div className="py-2">
                <div className="mb-2">
                  <span className="text-sm text-white">Google Review URL</span>
                  <p className="text-xs text-gray-500">Paste your Google Business review link</p>
                </div>
                <input
                  type="url"
                  placeholder="https://g.page/r/your-business/review"
                  value={followUpSettings?.googleReviewUrl ?? ''}
                  onChange={(e) => onFollowUpSettingsChange?.({
                    ...followUpSettings!,
                    googleReviewUrl: e.target.value
                  })}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500"
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-sm text-white">Send review request</span>
                  <p className="text-xs text-gray-500">Days after job marked complete</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={followUpSettings?.reviewRequestDays ?? 7}
                    onChange={(e) => onFollowUpSettingsChange?.({
                      ...followUpSettings!,
                      reviewRequestDays: parseInt(e.target.value) || 7
                    })}
                    className="w-16 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-center"
                  />
                  <span className="text-sm text-gray-400">days</span>
                </div>
              </div>
            </>
          )}
        </div>
      </SettingsCard>
    </motion.div>
  );
};
