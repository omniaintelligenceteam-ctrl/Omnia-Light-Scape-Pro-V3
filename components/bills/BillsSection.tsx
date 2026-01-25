import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Building2, FileText, Calendar, DollarSign, Trash2, Edit2,
  Loader2, AlertCircle, Clock
} from 'lucide-react';
import { useBills, type Bill } from '../../hooks/useBills';
import { useVendors, type Vendor } from '../../hooks/useVendors';
import { useExpenses } from '../../hooks/useExpenses';
import { BillForm } from './BillForm';
import { VendorForm } from './VendorForm';
import { BillPaymentModal } from './BillPaymentModal';
import type { SavedProject } from '../../types';

interface BillsSectionProps {
  projects?: SavedProject[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

type ViewTab = 'bills' | 'vendors';

export const BillsSection: React.FC<BillsSectionProps> = ({ projects = [] }) => {
  const {
    bills,
    isLoading: billsLoading,
    summary,
    groupedBills,
    createBill,
    updateBill,
    deleteBill,
    recordPayment,
  } = useBills();

  const {
    vendors,
    isLoading: vendorsLoading,
    createVendor,
    updateVendor,
    deleteVendor,
  } = useVendors();

  const { categories } = useExpenses();

  const [activeTab, setActiveTab] = useState<ViewTab>('bills');
  const [searchQuery, setSearchQuery] = useState('');
  const [showBillForm, setShowBillForm] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [payingBill, setPayingBill] = useState<Bill | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter bills by search
  const filteredBills = useMemo(() => {
    if (!searchQuery) return groupedBills;

    const query = searchQuery.toLowerCase();
    const filterFn = (bill: Bill) =>
      bill.vendor_name?.toLowerCase().includes(query) ||
      bill.bill_number?.toLowerCase().includes(query) ||
      bill.category.toLowerCase().includes(query) ||
      bill.description?.toLowerCase().includes(query);

    return {
      overdue: groupedBills.overdue.filter(filterFn),
      dueThisWeek: groupedBills.dueThisWeek.filter(filterFn),
      upcoming: groupedBills.upcoming.filter(filterFn),
      paid: groupedBills.paid.filter(filterFn),
    };
  }, [groupedBills, searchQuery]);

  // Filter vendors by search
  const filteredVendors = useMemo(() => {
    if (!searchQuery) return vendors;
    const query = searchQuery.toLowerCase();
    return vendors.filter(v =>
      v.name.toLowerCase().includes(query) ||
      v.email?.toLowerCase().includes(query) ||
      v.phone?.toLowerCase().includes(query)
    );
  }, [vendors, searchQuery]);

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setShowBillForm(true);
  };

  const handleDeleteBill = async (billId: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return;
    setDeletingId(billId);
    await deleteBill(billId);
    setDeletingId(null);
  };

  const handlePayBill = (bill: Bill) => {
    setPayingBill(bill);
    setShowPaymentModal(true);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setShowVendorForm(true);
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!confirm('Are you sure you want to delete this vendor?')) return;
    setDeletingId(vendorId);
    await deleteVendor(vendorId);
    setDeletingId(null);
  };

  const handleCloseBillForm = () => {
    setShowBillForm(false);
    setEditingBill(null);
  };

  const handleCloseVendorForm = () => {
    setShowVendorForm(false);
    setEditingVendor(null);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setPayingBill(null);
  };

  const handleBillSubmit = async (data: any) => {
    if (editingBill) {
      return updateBill(editingBill.id, data);
    }
    return createBill(data);
  };

  const handleVendorSubmit = async (data: any) => {
    if (editingVendor) {
      return updateVendor(editingVendor.id, data);
    }
    return createVendor(data);
  };

  const isLoading = billsLoading || vendorsLoading;

  const renderBillRow = (bill: Bill) => (
    <motion.div
      key={bill.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-white font-medium truncate">{bill.vendor_name}</p>
              {bill.bill_number && (
                <span className="px-2 py-0.5 bg-white/5 text-gray-400 text-xs rounded">
                  {bill.bill_number}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Due: {formatDate(bill.due_date)}
              </span>
              <span>{bill.category}</span>
            </div>
            {bill.description && (
              <p className="text-xs text-gray-500 mt-1 truncate">{bill.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <p className="text-lg font-semibold text-white">{formatCurrency(bill.balance_due)}</p>
            {bill.amount_paid > 0 && (
              <p className="text-xs text-gray-500">of {formatCurrency(bill.amount)}</p>
            )}
          </div>

          <div className="flex items-center gap-1">
            {bill.status !== 'paid' && (
              <button
                onClick={() => handlePayBill(bill)}
                className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 rounded-lg text-xs text-green-400 font-medium transition-colors"
              >
                Pay
              </button>
            )}
            <button
              onClick={() => handleEditBill(bill)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
              title="Edit"
            >
              <Edit2 className="w-4 h-4 text-gray-400 hover:text-white" />
            </button>
            <button
              onClick={() => handleDeleteBill(bill.id)}
              disabled={deletingId === bill.id}
              className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
              title="Delete"
            >
              {deletingId === bill.id ? (
                <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
              )}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Overdue</p>
              <p className="text-xl font-bold text-red-400">{formatCurrency(summary.totalOverdue)}</p>
              <p className="text-xs text-gray-500">{summary.overdueCount} bills</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500/10 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Due This Week</p>
              <p className="text-xl font-bold text-yellow-400">{formatCurrency(summary.dueThisWeek)}</p>
              <p className="text-xs text-gray-500">{summary.dueThisWeekCount} bills</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Upcoming</p>
              <p className="text-xl font-bold text-blue-400">{formatCurrency(summary.upcoming)}</p>
              <p className="text-xs text-gray-500">{summary.upcomingCount} bills</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#F6B45A]/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-[#F6B45A]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Unpaid</p>
              <p className="text-xl font-bold text-white">{formatCurrency(summary.totalUnpaid)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Tabs */}
        <div className="flex bg-white/5 rounded-xl p-1">
          <button
            onClick={() => setActiveTab('bills')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'bills'
                ? 'bg-[#F6B45A] text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Bills
          </button>
          <button
            onClick={() => setActiveTab('vendors')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'vendors'
                ? 'bg-[#F6B45A] text-black'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Vendors
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder={activeTab === 'bills' ? 'Search bills...' : 'Search vendors...'}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#F6B45A]/50"
          />
        </div>

        {/* Add Button */}
        <button
          onClick={() => activeTab === 'bills' ? setShowBillForm(true) : setShowVendorForm(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#F6B45A] rounded-xl text-black font-semibold hover:bg-[#F6B45A]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          {activeTab === 'bills' ? 'Add Bill' : 'Add Vendor'}
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#F6B45A]" />
        </div>
      ) : activeTab === 'bills' ? (
        <div className="space-y-6">
          {/* Overdue Bills */}
          {filteredBills.overdue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider">
                  Overdue ({filteredBills.overdue.length})
                </h3>
                <span className="text-red-400 font-bold">
                  {formatCurrency(filteredBills.overdue.reduce((s, b) => s + b.balance_due, 0))}
                </span>
              </div>
              <div className="space-y-3">
                {filteredBills.overdue.map(renderBillRow)}
              </div>
            </div>
          )}

          {/* Due This Week */}
          {filteredBills.dueThisWeek.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-semibold text-yellow-400 uppercase tracking-wider">
                  Due This Week ({filteredBills.dueThisWeek.length})
                </h3>
                <span className="text-yellow-400 font-bold">
                  {formatCurrency(filteredBills.dueThisWeek.reduce((s, b) => s + b.balance_due, 0))}
                </span>
              </div>
              <div className="space-y-3">
                {filteredBills.dueThisWeek.map(renderBillRow)}
              </div>
            </div>
          )}

          {/* Upcoming */}
          {filteredBills.upcoming.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">
                  Upcoming ({filteredBills.upcoming.length})
                </h3>
                <span className="text-blue-400 font-bold">
                  {formatCurrency(filteredBills.upcoming.reduce((s, b) => s + b.balance_due, 0))}
                </span>
              </div>
              <div className="space-y-3">
                {filteredBills.upcoming.map(renderBillRow)}
              </div>
            </div>
          )}

          {/* No Bills */}
          {bills.length === 0 && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
              <FileText className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No bills yet</h3>
              <p className="text-sm text-gray-400 mb-6">
                Start tracking vendor bills to manage your accounts payable.
              </p>
              <button
                onClick={() => setShowBillForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F6B45A] rounded-xl text-black font-semibold hover:bg-[#F6B45A]/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add First Bill
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Vendors Tab */
        <div className="space-y-3">
          {filteredVendors.length > 0 ? (
            filteredVendors.map((vendor) => (
              <motion.div
                key={vendor.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-10 h-10 bg-[#F6B45A]/10 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5 text-[#F6B45A]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-white font-medium truncate">{vendor.name}</p>
                        {!vendor.is_active && (
                          <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 text-xs rounded">
                            Inactive
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {vendor.email && <span>{vendor.email}</span>}
                        {vendor.phone && <span>{vendor.phone}</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Payment: {vendor.payment_terms.replace('_', ' ').replace('net', 'Net ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditVendor(vendor)}
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 text-gray-400 hover:text-white" />
                    </button>
                    <button
                      onClick={() => handleDeleteVendor(vendor.id)}
                      disabled={deletingId === vendor.id}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      {deletingId === vendor.id ? (
                        <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
              <Building2 className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No vendors yet</h3>
              <p className="text-sm text-gray-400 mb-6">
                Add vendors to easily track who you owe money to.
              </p>
              <button
                onClick={() => setShowVendorForm(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F6B45A] rounded-xl text-black font-semibold hover:bg-[#F6B45A]/90 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add First Vendor
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <BillForm
        isOpen={showBillForm}
        onClose={handleCloseBillForm}
        onSubmit={handleBillSubmit}
        bill={editingBill}
        vendors={vendors}
        projects={projects}
        categories={categories.map(c => ({ id: c.id, name: c.name }))}
        onAddVendor={() => {
          setShowBillForm(false);
          setShowVendorForm(true);
        }}
      />

      <VendorForm
        isOpen={showVendorForm}
        onClose={handleCloseVendorForm}
        onSubmit={handleVendorSubmit}
        vendor={editingVendor}
      />

      <BillPaymentModal
        isOpen={showPaymentModal}
        onClose={handleClosePaymentModal}
        onSubmit={recordPayment}
        bill={payingBill}
      />
    </div>
  );
};

export default BillsSection;
