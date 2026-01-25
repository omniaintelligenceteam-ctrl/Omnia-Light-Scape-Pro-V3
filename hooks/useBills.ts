import { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser } from '@clerk/clerk-react';

export interface Bill {
  id: string;
  user_id: string;
  vendor_id: string;
  vendor_name?: string;
  bill_number?: string;
  bill_date: string;
  due_date: string;
  amount: number;
  amount_paid: number;
  balance_due: number;
  status: 'unpaid' | 'partial' | 'paid' | 'overdue';
  category: string;
  description?: string;
  project_id?: string;
  project_name?: string;
  attachment_url?: string;
  paid_date?: string;
  payment_method?: string;
  payment_reference?: string;
  created_at: string;
  updated_at: string;
}

export interface BillPayment {
  id: string;
  user_id: string;
  bill_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
  created_at: string;
}

export interface BillFormData {
  vendor_id: string;
  bill_number?: string;
  bill_date: string;
  due_date: string;
  amount: number;
  category: string;
  description?: string;
  project_id?: string;
  attachment_url?: string;
}

export interface BillPaymentData {
  bill_id: string;
  amount: number;
  payment_date: string;
  payment_method?: string;
  reference_number?: string;
  notes?: string;
}

export interface BillSummary {
  totalUnpaid: number;
  totalOverdue: number;
  overdueCount: number;
  dueThisWeek: number;
  dueThisWeekCount: number;
  upcoming: number;
  upcomingCount: number;
}

export function useBills() {
  const { user } = useUser();
  const [bills, setBills] = useState<Bill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all bills
  const fetchBills = useCallback(async () => {
    if (!user?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/bills?userId=${user.id}`);
      const data = await res.json();

      if (data.success) {
        setBills(data.bills || []);
      } else {
        setError(data.error || 'Failed to fetch bills');
      }
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError('Failed to fetch bills');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Create a new bill
  const createBill = useCallback(async (data: BillFormData): Promise<{ success: boolean; bill?: Bill; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`/api/bills?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (result.success && result.bill) {
        setBills(prev => [result.bill, ...prev]);
        return { success: true, bill: result.bill };
      }
      return { success: false, error: result.error || 'Failed to create bill' };
    } catch (err) {
      console.error('Error creating bill:', err);
      return { success: false, error: 'Failed to create bill' };
    }
  }, [user?.id]);

  // Update a bill
  const updateBill = useCallback(async (id: string, data: Partial<BillFormData>): Promise<{ success: boolean; bill?: Bill; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`/api/bills?userId=${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });
      const result = await res.json();

      if (result.success && result.bill) {
        setBills(prev => prev.map(b => b.id === id ? result.bill : b));
        return { success: true, bill: result.bill };
      }
      return { success: false, error: result.error || 'Failed to update bill' };
    } catch (err) {
      console.error('Error updating bill:', err);
      return { success: false, error: 'Failed to update bill' };
    }
  }, [user?.id]);

  // Delete a bill
  const deleteBill = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`/api/bills?userId=${user.id}&billId=${id}`, {
        method: 'DELETE',
      });
      const result = await res.json();

      if (result.success) {
        setBills(prev => prev.filter(b => b.id !== id));
        return { success: true };
      }
      return { success: false, error: result.error || 'Failed to delete bill' };
    } catch (err) {
      console.error('Error deleting bill:', err);
      return { success: false, error: 'Failed to delete bill' };
    }
  }, [user?.id]);

  // Record a payment
  const recordPayment = useCallback(async (data: BillPaymentData): Promise<{ success: boolean; bill?: Bill; error?: string }> => {
    if (!user?.id) return { success: false, error: 'Not authenticated' };

    try {
      const res = await fetch(`/api/bills/pay?userId=${user.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (result.success && result.bill) {
        setBills(prev => prev.map(b => b.id === data.bill_id ? result.bill : b));
        return { success: true, bill: result.bill };
      }
      return { success: false, error: result.error || 'Failed to record payment' };
    } catch (err) {
      console.error('Error recording payment:', err);
      return { success: false, error: 'Failed to record payment' };
    }
  }, [user?.id]);

  // Calculate summary
  const summary = useMemo((): BillSummary => {
    const today = new Date();
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    let totalUnpaid = 0;
    let totalOverdue = 0;
    let overdueCount = 0;
    let dueThisWeek = 0;
    let dueThisWeekCount = 0;
    let upcoming = 0;
    let upcomingCount = 0;

    bills.forEach(bill => {
      if (bill.status === 'paid') return;

      const dueDate = new Date(bill.due_date);
      const balanceDue = bill.balance_due;

      totalUnpaid += balanceDue;

      if (dueDate < today) {
        totalOverdue += balanceDue;
        overdueCount++;
      } else if (dueDate <= weekFromNow) {
        dueThisWeek += balanceDue;
        dueThisWeekCount++;
      } else {
        upcoming += balanceDue;
        upcomingCount++;
      }
    });

    return {
      totalUnpaid,
      totalOverdue,
      overdueCount,
      dueThisWeek,
      dueThisWeekCount,
      upcoming,
      upcomingCount,
    };
  }, [bills]);

  // Grouped bills by status
  const groupedBills = useMemo(() => {
    const today = new Date();
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    const overdue: Bill[] = [];
    const dueThisWeek: Bill[] = [];
    const upcoming: Bill[] = [];
    const paid: Bill[] = [];

    bills.forEach(bill => {
      if (bill.status === 'paid') {
        paid.push(bill);
        return;
      }

      const dueDate = new Date(bill.due_date);

      if (dueDate < today) {
        overdue.push(bill);
      } else if (dueDate <= weekFromNow) {
        dueThisWeek.push(bill);
      } else {
        upcoming.push(bill);
      }
    });

    // Sort by due date
    const sortByDueDate = (a: Bill, b: Bill) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    overdue.sort(sortByDueDate);
    dueThisWeek.sort(sortByDueDate);
    upcoming.sort(sortByDueDate);

    return { overdue, dueThisWeek, upcoming, paid };
  }, [bills]);

  // Fetch on mount
  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  return {
    bills,
    isLoading,
    error,
    summary,
    groupedBills,
    fetchBills,
    createBill,
    updateBill,
    deleteBill,
    recordPayment,
  };
}

export default useBills;
