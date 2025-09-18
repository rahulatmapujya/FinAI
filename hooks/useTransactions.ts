
import { useState, useEffect, useCallback } from 'react';
import { Transaction, TransactionType, Category } from '../types';

const STORAGE_KEY = 'fin-ai-transactions';

const initialTransactions: Transaction[] = [
    { id: '1', date: new Date(new Date().setDate(new Date().getDate() - 28)).toISOString().split('T')[0], description: 'PAYCHECK DEPOSIT', amount: 3500, type: TransactionType.Credit, category: Category.Income },
    { id: '2', date: new Date(new Date().setDate(new Date().getDate() - 25)).toISOString().split('T')[0], description: 'MONTHLY RENT', amount: 1200, type: TransactionType.Debit, category: Category.Rent },
    { id: '3', date: new Date(new Date().setDate(new Date().getDate() - 20)).toISOString().split('T')[0], description: 'Trader Joes Groceries', amount: 125.50, type: TransactionType.Debit, category: Category.Groceries },
    { id: '4', date: new Date(new Date().setDate(new Date().getDate() - 15)).toISOString().split('T')[0], description: 'ELECTRICITY BILL', amount: 75.20, type: TransactionType.Debit, category: Category.Utilities },
    { id: '5', date: new Date(new Date().setDate(new Date().getDate() - 10)).toISOString().split('T')[0], description: 'NETFLIX', amount: 15.99, type: TransactionType.Debit, category: Category.Entertainment },
    { id: '6', date: new Date(new Date().setDate(new Date().getDate() - 5)).toISOString().split('T')[0], description: 'UBER RIDE', amount: 22.45, type: TransactionType.Debit, category: Category.Transport },
    { id: '7', date: new Date().toISOString().split('T')[0], description: 'WHOLE FOODS MARKET', amount: 89.90, type: TransactionType.Debit, category: Category.Groceries },
];

export const useTransactions = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    try {
      const storedTransactions = localStorage.getItem(STORAGE_KEY);
      if (storedTransactions) {
        setTransactions(JSON.parse(storedTransactions));
      } else {
        setTransactions(initialTransactions);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialTransactions));
      }
    } catch (error) {
      console.error("Failed to load transactions from localStorage", error);
      setTransactions(initialTransactions);
    }
  }, []);

  const saveTransactions = useCallback((newTransactions: Transaction[]) => {
    try {
      const sorted = [...newTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(sorted);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    } catch (error) {
      console.error("Failed to save transactions to localStorage", error);
    }
  }, []);

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = { ...transaction, id: new Date().toISOString() };
    saveTransactions([newTransaction, ...transactions]);
  }, [transactions, saveTransactions]);
  
  const addBulkTransactions = useCallback((newTransactions: Omit<Transaction, 'id'>[]) => {
    const fullTransactions = newTransactions.map((t, i) => ({...t, id: `${new Date().toISOString()}-${i}`}));
    saveTransactions([...fullTransactions, ...transactions]);
  }, [transactions, saveTransactions]);

  const updateTransaction = useCallback((updatedTransaction: Transaction) => {
    const newTransactions = transactions.map(t => t.id === updatedTransaction.id ? updatedTransaction : t);
    saveTransactions(newTransactions);
  }, [transactions, saveTransactions]);

  const deleteTransaction = useCallback((id: string) => {
    const newTransactions = transactions.filter(t => t.id !== id);
    saveTransactions(newTransactions);
  }, [transactions, saveTransactions]);

  return {
    transactions,
    addTransaction,
    addBulkTransactions,
    updateTransaction,
    deleteTransaction,
  };
};
