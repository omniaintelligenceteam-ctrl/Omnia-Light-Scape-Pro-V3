import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Calendar, Tag, Building2, FileText, CreditCard, Receipt, Camera, Upload, Loader2 } from 'lucide-react';
import type { Expense, ExpenseCategory } from '../../hooks/useExpenses';
import type { SavedProject } from '../../types';

interface ExpenseFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExpenseFormData) => Promise<{ success: boolean; error?: string }>;
  expense?: Expense | null;
  categories: ExpenseCategory[];
  projects: SavedProject[];
  isLoading?: boolean;
}

export interface ExpenseFormData {
  project_id?: string | null;
  category: string;
  vendor?: string;
  description?: string;
  amount: number;
  date: string;
  receipt_url?: string;
  payment_method?: string;
  is_billable?: boolean;
}

const PAYMENT_METHODS = [
  { value: 'card', label: 'Credit/Debit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'transfer', label: 'Bank Transfer' },
  { value: 'other', label: 'Other' }
];

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  expense,
  categories,
  projects,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<ExpenseFormData>({
    project_id: null,
    category: '',
    vendor: '',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    receipt_url: '',
    payment_method: 'card',
    is_billable: false
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when expense changes or modal opens
  useEffect(() => {
    if (expense) {
      setFormData({
        project_id: expense.project_id,
        category: expense.category,
        vendor: expense.vendor || '',
        description: expense.description || '',
        amount: Number(expense.amount),
        date: expense.date,
        receipt_url: expense.receipt_url || '',
        payment_method: expense.payment_method || 'card',
        is_billable: expense.is_billable
      });
    } else {
      setFormData({
        project_id: null,
        category: categories[0]?.name || '',
        vendor: '',
        description: '',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        receipt_url: '',
        payment_method: 'card',
        is_billable: false
      });
    }
    setError(null);
  }, [expense, isOpen, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.category) {
      setError('Please select a category');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!formData.date) {
      setError('Please select a date');
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmit(formData);
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to save expense');
    }
  };

  const handleChange = (field: keyof ExpenseFormData, value: string | number | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-[#0a0a0a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5">
            <h2 className="text-xl font-semibold text-white">
              {expense ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Amount and Date Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Amount *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount || ''}
                    onChange={e => handleChange('amount', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#F6B45A]/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={formData.date}
                    onChange={e => handleChange('date', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#F6B45A]/50"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category *
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <select
                  value={formData.category}
                  onChange={e => handleChange('category', e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#F6B45A]/50 appearance-none"
                  required
                >
                  <option value="">Select category...</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Vendor and Payment Method Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Vendor
                </label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={e => handleChange('vendor', e.target.value)}
                    placeholder="e.g., Home Depot"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#F6B45A]/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Payment Method
                </label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select
                    value={formData.payment_method}
                    onChange={e => handleChange('payment_method', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#F6B45A]/50 appearance-none"
                  >
                    {PAYMENT_METHODS.map(method => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                <textarea
                  value={formData.description}
                  onChange={e => handleChange('description', e.target.value)}
                  placeholder="What was this expense for?"
                  rows={2}
                  className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#F6B45A]/50 resize-none"
                />
              </div>
            </div>

            {/* Link to Project */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Link to Project (optional)
              </label>
              <select
                value={formData.project_id || ''}
                onChange={e => handleChange('project_id', e.target.value || null)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#F6B45A]/50 appearance-none"
              >
                <option value="">No project</option>
                {projects.map(project => (
                  <option key={project.id} value={project.id}>
                    {project.name || project.clientName || 'Unnamed Project'}
                  </option>
                ))}
              </select>
            </div>

            {/* Receipt Upload Placeholder */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Receipt
              </label>
              <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-white/20 transition-colors">
                <Receipt className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-400 mb-2">Upload receipt image</p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300 hover:bg-white/10 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Camera
                  </button>
                  <button
                    type="button"
                    className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300 hover:bg-white/10 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Upload
                  </button>
                </div>
              </div>
            </div>

            {/* Billable Toggle */}
            <label className="flex items-center justify-between p-4 bg-white/5 rounded-xl cursor-pointer hover:bg-white/[0.07] transition-colors">
              <div>
                <p className="text-sm font-medium text-white">Billable to client</p>
                <p className="text-xs text-gray-500">This expense can be invoiced to a client</p>
              </div>
              <input
                type="checkbox"
                checked={formData.is_billable}
                onChange={e => handleChange('is_billable', e.target.checked)}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#F6B45A] focus:ring-[#F6B45A]/50"
              />
            </label>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 font-medium hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="flex-1 px-4 py-3 bg-[#F6B45A] rounded-xl text-black font-semibold hover:bg-[#F6B45A]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  expense ? 'Update Expense' : 'Add Expense'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ExpenseForm;
