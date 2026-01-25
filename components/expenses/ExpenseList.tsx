import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Plus, Search, Filter, DollarSign, Calendar, Tag, Building2,
  Trash2, Edit2, Receipt, Loader2, ChevronDown, X
} from 'lucide-react';
import { useExpenses, type Expense } from '../../hooks/useExpenses';
import { ExpenseForm, type ExpenseFormData } from './ExpenseForm';
import type { SavedProject } from '../../types';

interface ExpenseListProps {
  projects?: SavedProject[];
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const ExpenseList: React.FC<ExpenseListProps> = ({ projects = [] }) => {
  const {
    expenses,
    categories,
    isLoading,
    createExpense,
    updateExpense,
    deleteExpense,
    getSummary
  } = useExpenses();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(expense => {
      const matchesSearch = !searchQuery ||
        expense.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = !selectedCategory || expense.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [expenses, searchQuery, selectedCategory]);

  // Get summary
  const summary = useMemo(() => getSummary(filteredExpenses), [filteredExpenses, getSummary]);

  // Get unique categories from expenses
  const usedCategories = useMemo(() => {
    const cats = new Set(expenses.map(e => e.category));
    return Array.from(cats).sort();
  }, [expenses]);

  const handleSubmit = async (data: ExpenseFormData) => {
    if (editingExpense) {
      return updateExpense({ id: editingExpense.id, ...data });
    }
    return createExpense(data);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setIsFormOpen(true);
  };

  const handleDelete = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    setDeletingId(expenseId);
    await deleteExpense(expenseId);
    setDeletingId(null);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingExpense(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Total Expenses</p>
              <p className="text-xl font-bold text-white">{formatCurrency(summary.totalExpenses)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
              <Receipt className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Billable</p>
              <p className="text-xl font-bold text-white">{formatCurrency(summary.billableTotal)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gray-500/10 rounded-xl flex items-center justify-center">
              <Tag className="w-5 h-5 text-gray-400" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Categories</p>
              <p className="text-xl font-bold text-white">{Object.keys(summary.expensesByCategory).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[#F6B45A]/50"
          />
        </div>

        {/* Category Filter */}
        <div className="relative">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-colors ${
              selectedCategory
                ? 'bg-[#F6B45A]/10 border-[#F6B45A]/30 text-[#F6B45A]'
                : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/20'
            }`}
          >
            <Filter className="w-4 h-4" />
            {selectedCategory || 'All Categories'}
            <ChevronDown className="w-4 h-4" />
          </button>

          {showFilters && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-[#0a0a0a] border border-white/10 rounded-xl shadow-xl z-10 overflow-hidden">
              <button
                onClick={() => { setSelectedCategory(''); setShowFilters(false); }}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors ${
                  !selectedCategory ? 'text-[#F6B45A] bg-[#F6B45A]/10' : 'text-gray-300'
                }`}
              >
                All Categories
              </button>
              {usedCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setShowFilters(false); }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 transition-colors ${
                    selectedCategory === cat ? 'text-[#F6B45A] bg-[#F6B45A]/10' : 'text-gray-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear Filters */}
        {(searchQuery || selectedCategory) && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
            Clear
          </button>
        )}

        {/* Add Expense Button */}
        <button
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#F6B45A] rounded-xl text-black font-semibold hover:bg-[#F6B45A]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Expense
        </button>
      </div>

      {/* Expenses List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#F6B45A]" />
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
          <Receipt className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No expenses yet</h3>
          <p className="text-sm text-gray-400 mb-6">
            {searchQuery || selectedCategory
              ? 'No expenses match your filters. Try adjusting your search.'
              : 'Start tracking your business expenses by adding your first one.'}
          </p>
          {!searchQuery && !selectedCategory && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#F6B45A] rounded-xl text-black font-semibold hover:bg-[#F6B45A]/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add First Expense
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredExpenses.map((expense, index) => (
            <motion.div
              key={expense.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Category Icon */}
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center shrink-0">
                    <Tag className="w-5 h-5 text-gray-400" />
                  </div>

                  {/* Details */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium truncate">
                        {expense.vendor || expense.category}
                      </p>
                      {expense.is_billable && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                          Billable
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(expense.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="w-3.5 h-3.5" />
                        {expense.category}
                      </span>
                      {expense.project_name && (
                        <span className="flex items-center gap-1 truncate">
                          <Building2 className="w-3.5 h-3.5" />
                          {expense.project_name}
                        </span>
                      )}
                    </div>
                    {expense.description && (
                      <p className="text-xs text-gray-500 mt-1 truncate">{expense.description}</p>
                    )}
                  </div>
                </div>

                {/* Amount and Actions */}
                <div className="flex items-center gap-4 shrink-0">
                  <p className="text-lg font-semibold text-white">
                    {formatCurrency(Number(expense.amount))}
                  </p>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4 text-gray-400 hover:text-white" />
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      disabled={deletingId === expense.id}
                      className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      {deletingId === expense.id ? (
                        <Loader2 className="w-4 h-4 text-red-400 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Expense Form Modal */}
      <ExpenseForm
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        expense={editingExpense}
        categories={categories}
        projects={projects}
        isLoading={isLoading}
      />
    </div>
  );
};

export default ExpenseList;
