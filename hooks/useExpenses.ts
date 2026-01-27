import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/clerk-react';

export interface Expense {
  id: string;
  user_id: string;
  project_id: string | null;
  category: string;
  vendor: string | null;
  description: string | null;
  amount: number;
  date: string;
  receipt_url: string | null;
  payment_method: string;
  is_billable: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  project_name?: string;
}

export interface ExpenseCategory {
  id: string;
  code: string;
  name: string;
  type: 'income' | 'cogs' | 'expense';
  description: string | null;
}

export interface ExpenseFilters {
  startDate?: string;
  endDate?: string;
  category?: string;
  projectId?: string;
  minAmount?: number;
  maxAmount?: number;
}

export interface ExpenseSummary {
  totalExpenses: number;
  expensesByCategory: Record<string, number>;
  expensesByMonth: Record<string, number>;
  billableTotal: number;
  nonBillableTotal: number;
}

interface CreateExpenseData {
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

interface UpdateExpenseData extends Partial<CreateExpenseData> {
  id: string;
}

export function useExpenses() {
  const { user } = useUser();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch expenses
  const fetchExpenses = useCallback(async (filters?: ExpenseFilters) => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ userId: user.id });

      if (filters?.startDate) params.append('startDate', filters.startDate);
      if (filters?.endDate) params.append('endDate', filters.endDate);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.projectId) params.append('projectId', filters.projectId);

      const response = await fetch(`/api/expenses?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setExpenses(data.expenses || []);
      } else {
        setError(data.error || 'Failed to fetch expenses');
      }
    } catch (err) {
      console.error('Error fetching expenses:', err);
      setError('Failed to fetch expenses');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`/api/expenses?userId=${user.id}&type=categories`);

      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, [user?.id]);

  // Create expense
  const createExpense = useCallback(async (expenseData: CreateExpenseData): Promise<{ success: boolean; expense?: Expense; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const response = await fetch(`/api/expenses?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      });

      const data = await response.json();

      if (data.success && data.expense) {
        setExpenses(prev => [data.expense, ...prev]);
        return { success: true, expense: data.expense };
      }

      return { success: false, error: data.error || 'Failed to create expense' };
    } catch (err) {
      console.error('Error creating expense:', err);
      return { success: false, error: 'Failed to create expense' };
    }
  }, [user?.id]);

  // Update expense
  const updateExpense = useCallback(async (expenseData: UpdateExpenseData): Promise<{ success: boolean; expense?: Expense; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const response = await fetch(`/api/expenses?userId=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      });

      const data = await response.json();

      if (data.success && data.expense) {
        setExpenses(prev => prev.map(e => e.id === data.expense.id ? data.expense : e));
        return { success: true, expense: data.expense };
      }

      return { success: false, error: data.error || 'Failed to update expense' };
    } catch (err) {
      console.error('Error updating expense:', err);
      return { success: false, error: 'Failed to update expense' };
    }
  }, [user?.id]);

  // Delete expense
  const deleteExpense = useCallback(async (expenseId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const response = await fetch(`/api/expenses?userId=${user.id}&expenseId=${expenseId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setExpenses(prev => prev.filter(e => e.id !== expenseId));
        return { success: true };
      }

      return { success: false, error: data.error || 'Failed to delete expense' };
    } catch (err) {
      console.error('Error deleting expense:', err);
      return { success: false, error: 'Failed to delete expense' };
    }
  }, [user?.id]);

  // Calculate summary
  const getSummary = useCallback((expenseList: Expense[] = expenses): ExpenseSummary => {
    const summary: ExpenseSummary = {
      totalExpenses: 0,
      expensesByCategory: {},
      expensesByMonth: {},
      billableTotal: 0,
      nonBillableTotal: 0
    };

    expenseList.forEach(expense => {
      const amount = Number(expense.amount);
      summary.totalExpenses += amount;

      // By category
      if (!summary.expensesByCategory[expense.category]) {
        summary.expensesByCategory[expense.category] = 0;
      }
      summary.expensesByCategory[expense.category] += amount;

      // By month
      const month = expense.date.substring(0, 7); // YYYY-MM
      if (!summary.expensesByMonth[month]) {
        summary.expensesByMonth[month] = 0;
      }
      summary.expensesByMonth[month] += amount;

      // Billable vs non-billable
      if (expense.is_billable) {
        summary.billableTotal += amount;
      } else {
        summary.nonBillableTotal += amount;
      }
    });

    return summary;
  }, [expenses]);

  // Initial fetch
  useEffect(() => {
    if (user?.id) {
      fetchExpenses();
      fetchCategories();
    }
  }, [user?.id, fetchExpenses, fetchCategories]);

  return {
    expenses,
    categories,
    isLoading,
    error,
    fetchExpenses,
    fetchCategories,
    createExpense,
    updateExpense,
    deleteExpense,
    getSummary
  };
}
