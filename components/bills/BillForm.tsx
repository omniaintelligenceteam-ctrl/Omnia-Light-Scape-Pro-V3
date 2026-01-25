import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Calendar, Tag, Building2, FileText, Paperclip, Loader2 } from 'lucide-react';
import type { Bill, BillFormData } from '../../hooks/useBills';
import type { Vendor } from '../../hooks/useVendors';
import type { SavedProject } from '../../types';

interface BillFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BillFormData) => Promise<{ success: boolean; error?: string }>;
  bill?: Bill | null;
  vendors: Vendor[];
  projects?: SavedProject[];
  categories: { id: string; name: string }[];
  isLoading?: boolean;
  onAddVendor?: () => void;
}

export const BillForm: React.FC<BillFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  bill,
  vendors,
  projects = [],
  categories,
  isLoading = false,
  onAddVendor,
}) => {
  const [formData, setFormData] = useState<BillFormData>({
    vendor_id: '',
    bill_number: '',
    bill_date: new Date().toISOString().split('T')[0],
    due_date: '',
    amount: 0,
    category: '',
    description: '',
    project_id: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (bill) {
      setFormData({
        vendor_id: bill.vendor_id,
        bill_number: bill.bill_number || '',
        bill_date: bill.bill_date,
        due_date: bill.due_date,
        amount: bill.amount,
        category: bill.category,
        description: bill.description || '',
        project_id: bill.project_id || '',
      });
    } else {
      // Set default due date to 30 days from today
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 30);

      setFormData({
        vendor_id: '',
        bill_number: '',
        bill_date: today.toISOString().split('T')[0],
        due_date: dueDate.toISOString().split('T')[0],
        amount: 0,
        category: categories[0]?.name || '',
        description: '',
        project_id: '',
      });
    }
    setError(null);
  }, [bill, isOpen, categories]);

  // Update due date when vendor changes based on payment terms
  useEffect(() => {
    if (!bill && formData.vendor_id) {
      const vendor = vendors.find(v => v.id === formData.vendor_id);
      if (vendor) {
        const billDate = new Date(formData.bill_date);
        let daysToAdd = 30;
        switch (vendor.payment_terms) {
          case 'due_on_receipt':
            daysToAdd = 0;
            break;
          case 'net15':
            daysToAdd = 15;
            break;
          case 'net30':
            daysToAdd = 30;
            break;
          case 'net60':
            daysToAdd = 60;
            break;
        }
        const dueDate = new Date(billDate);
        dueDate.setDate(dueDate.getDate() + daysToAdd);
        setFormData(prev => ({
          ...prev,
          due_date: dueDate.toISOString().split('T')[0],
          default_category: vendor.default_category || prev.category,
        }));
      }
    }
  }, [formData.vendor_id, formData.bill_date, vendors, bill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.vendor_id) {
      setError('Please select a vendor');
      return;
    }
    if (!formData.amount || formData.amount <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    if (!formData.category) {
      setError('Please select a category');
      return;
    }

    setIsSubmitting(true);
    const result = await onSubmit({
      ...formData,
      project_id: formData.project_id || undefined,
    });
    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to save bill');
    }
  };

  const handleChange = (field: keyof BillFormData, value: string | number) => {
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
              {bill ? 'Edit Bill' : 'Add Bill'}
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
            {/* Vendor */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Vendor *
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <select
                    value={formData.vendor_id}
                    onChange={e => handleChange('vendor_id', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#F6B45A]/50 appearance-none"
                    required
                  >
                    <option value="">Select vendor...</option>
                    {vendors.filter(v => v.is_active).map(vendor => (
                      <option key={vendor.id} value={vendor.id}>
                        {vendor.name}
                      </option>
                    ))}
                  </select>
                </div>
                {onAddVendor && (
                  <button
                    type="button"
                    onClick={onAddVendor}
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-gray-300 hover:bg-white/10 transition-colors"
                  >
                    + New
                  </button>
                )}
              </div>
            </div>

            {/* Amount and Bill Number */}
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
                  Bill Number
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    value={formData.bill_number}
                    onChange={e => handleChange('bill_number', e.target.value)}
                    placeholder="INV-12345"
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#F6B45A]/50"
                  />
                </div>
              </div>
            </div>

            {/* Bill Date and Due Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Bill Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={formData.bill_date}
                    onChange={e => handleChange('bill_date', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-[#F6B45A]/50"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Due Date *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={e => handleChange('due_date', e.target.value)}
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

            {/* Link to Project */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Link to Project (for job costing)
              </label>
              <select
                value={formData.project_id || ''}
                onChange={e => handleChange('project_id', e.target.value)}
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

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={e => handleChange('description', e.target.value)}
                placeholder="What is this bill for?"
                rows={2}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#F6B45A]/50 resize-none"
              />
            </div>

            {/* Attachment Placeholder */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Attachment
              </label>
              <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center hover:border-white/20 transition-colors">
                <Paperclip className="w-6 h-6 text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Attach bill or receipt</p>
                <button
                  type="button"
                  className="mt-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-gray-300 hover:bg-white/10 transition-colors"
                >
                  Upload File
                </button>
              </div>
            </div>

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
                  bill ? 'Update Bill' : 'Add Bill'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BillForm;
