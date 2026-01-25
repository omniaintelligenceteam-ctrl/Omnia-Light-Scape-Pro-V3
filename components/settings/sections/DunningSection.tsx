import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  Mail,
  Clock,
  Plus,
  Trash2,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle,
  Send,
  ChevronDown,
  ChevronUp,
  History,
  Settings,
} from 'lucide-react';
import { SettingsCard } from '../ui/SettingsCard';
import { useDunning, DunningStep } from '../../../hooks/useDunning';

const contentVariants = {
  hidden: { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

type TemplateType = 'friendly_reminder' | 'second_reminder' | 'urgent_reminder' | 'final_notice';

const TEMPLATE_OPTIONS: { value: TemplateType; label: string; description: string }[] = [
  { value: 'friendly_reminder', label: 'Friendly Reminder', description: 'Gentle first reminder' },
  { value: 'second_reminder', label: 'Second Notice', description: 'Firmer follow-up' },
  { value: 'urgent_reminder', label: 'Urgent Reminder', description: 'Emphasizes urgency' },
  { value: 'final_notice', label: 'Final Notice', description: 'Last warning before escalation' },
];

const CHANNEL_OPTIONS = [
  { value: 'email', label: 'Email', icon: Mail },
];

export const DunningSection: React.FC = () => {
  const {
    schedule,
    reminders,
    isLoading,
    error,
    fetchSchedule,
    saveSchedule,
  } = useDunning();

  const [isActive, setIsActive] = useState(false);
  const [steps, setSteps] = useState<DunningStep[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // Load schedule data
  useEffect(() => {
    if (schedule) {
      setIsActive(schedule.is_active);
      setSteps(schedule.steps || []);
    }
  }, [schedule]);

  // Fetch on mount
  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  const handleAddStep = () => {
    const maxDays = steps.length > 0 ? Math.max(...steps.map(s => s.days_after_due)) : 0;
    const newStep: DunningStep = {
      days_after_due: maxDays + 7,
      template: 'friendly_reminder',
      subject: 'Payment Reminder',
      channel: 'email',
    };
    setSteps([...steps, newStep]);
    setExpandedStep(steps.length);
  };

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleUpdateStep = (index: number, updates: Partial<DunningStep>) => {
    setSteps(steps.map((step, i) => (i === index ? { ...step, ...updates } : step)));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    // Sort steps by days
    const sortedSteps = [...steps].sort((a, b) => a.days_after_due - b.days_after_due);

    const result = await saveSchedule(sortedSteps, isActive);

    setIsSaving(false);

    if (result.success) {
      setSaveMessage({ type: 'success', text: 'Settings saved successfully' });
      setSteps(sortedSteps);
    } else {
      setSaveMessage({ type: 'error', text: result.error || 'Failed to save settings' });
    }

    setTimeout(() => setSaveMessage(null), 3000);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getTemplateLabel = (template: string) => {
    return TEMPLATE_OPTIONS.find(t => t.value === template)?.label || template;
  };

  if (isLoading) {
    return (
      <motion.div
        variants={contentVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={{ duration: 0.2 }}
        className="flex items-center justify-center py-12"
      >
        <Loader2 className="w-8 h-8 text-[#F6B45A] animate-spin" />
      </motion.div>
    );
  }

  return (
    <motion.div
      key="dunning"
      variants={contentVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <p className="text-sm text-gray-400 mb-6">
        Automate payment reminders for overdue invoices. Set up a sequence of reminders that escalate over time.
      </p>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Enable Toggle */}
      <SettingsCard className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#F6B45A]/10 rounded-xl flex items-center justify-center">
              <Bell className="w-6 h-6 text-[#F6B45A]" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Automatic Payment Reminders</h3>
              <p className="text-sm text-gray-500">
                Send automated reminders to clients with overdue invoices
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsActive(!isActive)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              isActive ? 'bg-[#F6B45A]' : 'bg-white/10'
            }`}
          >
            <motion.div
              className="absolute top-1 left-1 w-5 h-5 bg-white rounded-full"
              animate={{ x: isActive ? 28 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </button>
        </div>
      </SettingsCard>

      {/* Reminder Schedule */}
      <SettingsCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-gray-400" />
            <h3 className="text-white font-semibold">Reminder Schedule</h3>
          </div>
          <button
            onClick={handleAddStep}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#F6B45A]/10 hover:bg-[#F6B45A]/20 border border-[#F6B45A]/20 rounded-lg text-sm text-[#F6B45A] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Step
          </button>
        </div>

        {steps.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No reminder steps configured</p>
            <p className="text-sm text-gray-500 mt-1">Add steps to create your reminder sequence</p>
          </div>
        ) : (
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div
                key={index}
                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
              >
                {/* Step Header */}
                <button
                  onClick={() => setExpandedStep(expandedStep === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 bg-[#F6B45A]/20 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-semibold text-[#F6B45A]">{index + 1}</span>
                    </div>
                    <div className="text-left">
                      <p className="text-white font-medium">
                        {step.days_after_due} day{step.days_after_due !== 1 ? 's' : ''} after due date
                      </p>
                      <p className="text-sm text-gray-500">{getTemplateLabel(step.template)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveStep(index);
                      }}
                      className="p-2 hover:bg-red-500/10 rounded-lg text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {expandedStep === index ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </div>
                </button>

                {/* Step Details */}
                <AnimatePresence>
                  {expandedStep === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-white/10"
                    >
                      <div className="p-4 space-y-4">
                        {/* Days After Due */}
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Days After Due Date</label>
                          <input
                            type="number"
                            min="1"
                            max="365"
                            value={step.days_after_due}
                            onChange={(e) =>
                              handleUpdateStep(index, { days_after_due: parseInt(e.target.value) || 1 })
                            }
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#F6B45A]/50"
                          />
                        </div>

                        {/* Template Selection */}
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Email Template</label>
                          <div className="grid grid-cols-2 gap-2">
                            {TEMPLATE_OPTIONS.map((template) => (
                              <button
                                key={template.value}
                                onClick={() => handleUpdateStep(index, { template: template.value })}
                                className={`p-3 rounded-xl border text-left transition-all ${
                                  step.template === template.value
                                    ? 'bg-[#F6B45A]/10 border-[#F6B45A]/30 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                <p className="text-sm font-medium">{template.label}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{template.description}</p>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Subject Override */}
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Custom Subject (optional)</label>
                          <input
                            type="text"
                            value={step.subject || ''}
                            onChange={(e) => handleUpdateStep(index, { subject: e.target.value })}
                            placeholder="Leave blank to use template default"
                            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#F6B45A]/50"
                          />
                        </div>

                        {/* Channel */}
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Send Via</label>
                          <div className="flex gap-2">
                            {CHANNEL_OPTIONS.map((channel) => (
                              <button
                                key={channel.value}
                                onClick={() => handleUpdateStep(index, { channel: channel.value as 'email' })}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${
                                  step.channel === channel.value
                                    ? 'bg-[#F6B45A]/10 border-[#F6B45A]/30 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                <channel.icon className="w-4 h-4" />
                                {channel.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}

        {/* Save Button */}
        <div className="flex items-center justify-between mt-6 pt-6 border-t border-white/10">
          {saveMessage ? (
            <div
              className={`flex items-center gap-2 text-sm ${
                saveMessage.type === 'success' ? 'text-green-400' : 'text-red-400'
              }`}
            >
              {saveMessage.type === 'success' ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              {saveMessage.text}
            </div>
          ) : (
            <div />
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#F6B45A] hover:bg-[#F6B45A]/90 text-black rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </SettingsCard>

      {/* Reminder History */}
      <SettingsCard className="p-6">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-gray-400" />
            <h3 className="text-white font-semibold">Reminder History</h3>
            {reminders.length > 0 && (
              <span className="px-2 py-0.5 bg-white/10 rounded-full text-xs text-gray-400">
                {reminders.length}
              </span>
            )}
          </div>
          {showHistory ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-white/10">
                {reminders.length === 0 ? (
                  <div className="text-center py-6">
                    <Mail className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                    <p className="text-gray-400">No reminders sent yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {reminders.map((reminder) => (
                      <div
                        key={reminder.id}
                        className="flex items-center justify-between p-3 bg-white/5 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              reminder.reminder_type === 'friendly_reminder'
                                ? 'bg-blue-500/20'
                                : reminder.reminder_type === 'second_reminder'
                                ? 'bg-yellow-500/20'
                                : reminder.reminder_type === 'urgent_reminder'
                                ? 'bg-orange-500/20'
                                : 'bg-red-500/20'
                            }`}
                          >
                            <Send className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-white">
                              {getTemplateLabel(reminder.reminder_type)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {reminder.project_name || 'Unknown Project'} • {reminder.sent_to}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{formatDate(reminder.sent_at)}</p>
                          {reminder.opened_at && (
                            <p className="text-xs text-green-400">Opened</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </SettingsCard>

      {/* Tips */}
      <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
        <h4 className="text-sm font-medium text-blue-400 mb-2">💡 Tips for Effective Reminders</h4>
        <ul className="text-sm text-gray-400 space-y-1">
          <li>• Start with a friendly tone and escalate gradually</li>
          <li>• Space reminders 5-7 days apart for best response rates</li>
          <li>• Include a "Pay Now" button for easier client payments</li>
          <li>• Review reminder history to identify slow-paying clients</li>
        </ul>
      </div>
    </motion.div>
  );
};

export default DunningSection;
