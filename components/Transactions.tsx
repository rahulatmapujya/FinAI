
import React, { useState, useCallback } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { Transaction, Category, TransactionType } from '../types';
import { CATEGORIES } from '../constants';
import { categorizeTransaction } from '../services/geminiService';
import { EditIcon, DeleteIcon, Spinner, UploadIcon, AddIcon } from './Icons';
import { Modal } from './Modal';

interface TransactionFormState extends Omit<Transaction, 'id' | 'amount'> {
  amount: string;
}

const TransactionForm: React.FC<{
  transaction: TransactionFormState;
  setTransaction: React.Dispatch<React.SetStateAction<TransactionFormState>>;
  isCategorizing: boolean;
}> = ({ transaction, setTransaction, isCategorizing }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setTransaction(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="grid grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-8">
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
        <input type="date" name="date" id="date" value={transaction.date} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
      </div>
      <div>
        <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amount</label>
        <input type="number" name="amount" id="amount" value={transaction.amount} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" placeholder="0.00" />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
        <input type="text" name="description" id="description" value={transaction.description} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
      </div>
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
        <select id="type" name="type" value={transaction.type} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
          <option>{TransactionType.Debit}</option>
          <option>{TransactionType.Credit}</option>
        </select>
      </div>
      <div>
        <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
        <div className="relative">
          <select id="category" name="category" value={transaction.category} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {isCategorizing && <div className="absolute inset-y-0 right-0 flex items-center pr-8"><Spinner /></div>}
        </div>
      </div>
    </div>
  );
};

const Transactions: React.FC<{ hook: ReturnType<typeof useTransactions> }> = ({ hook }) => {
  const { transactions, addTransaction, addBulkTransactions, updateTransaction, deleteTransaction } = hook;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formState, setFormState] = useState<TransactionFormState>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: TransactionType.Debit,
    category: Category.Other,
  });
  const [isCategorizing, setIsCategorizing] = useState(false);

  const openModalForNew = () => {
    setEditingTransaction(null);
    setFormState({
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: '',
      type: TransactionType.Debit,
      category: Category.Other,
    });
    setIsModalOpen(true);
  };
  
  const openModalForEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormState({ ...transaction, amount: String(transaction.amount) });
    setIsModalOpen(true);
  };

  const handleDescriptionBlur = useCallback(async () => {
    if (formState.description && (!editingTransaction || formState.description !== editingTransaction.description)) {
      setIsCategorizing(true);
      const suggestedCategory = await categorizeTransaction(formState.description);
      setFormState(prev => ({...prev, category: suggestedCategory}));
      setIsCategorizing(false);
    }
  }, [formState.description, editingTransaction]);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const transactionData = {
      ...formState,
      amount: parseFloat(formState.amount),
    };

    if (isNaN(transactionData.amount) || transactionData.amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (editingTransaction) {
      updateTransaction({ ...transactionData, id: editingTransaction.id });
    } else {
      addTransaction(transactionData);
    }
    setIsModalOpen(false);
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const rows = text.split('\n').slice(1); // Skip header
      const newTransactions: Omit<Transaction, 'id'>[] = [];

      for (const row of rows) {
        if (!row.trim()) continue;
        const [date, description, amount, type] = row.split(',');
        const category = await categorizeTransaction(description);
        newTransactions.push({
          date,
          description,
          amount: parseFloat(amount),
          type: type.trim() as TransactionType,
          category,
        });
      }
      addBulkTransactions(newTransactions);
    };
    reader.readAsText(file);
    event.target.value = ''; // Reset file input
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Transactions</h1>
        <div className="flex space-x-2">
            <label className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
                <UploadIcon/>
                <span className="ml-2">Import CSV</span>
                <input type="file" className="hidden" accept=".csv" onChange={handleFileUpload} />
            </label>
            <button onClick={openModalForNew} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                <AddIcon/>
                <span className="ml-2">Add Transaction</span>
            </button>
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                <th scope="col" className="relative px-6 py-3"><span className="sr-only">Edit</span></th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{t.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{t.description}</td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${t.type === TransactionType.Credit ? 'text-green-500' : 'text-red-500'}`}>
                    {t.type === TransactionType.Credit ? '+' : '-'}${t.amount.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{t.category}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => openModalForEdit(t)} className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-200"><EditIcon /></button>
                    <button onClick={() => deleteTransaction(t.id)} className="ml-4 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-200"><DeleteIcon /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingTransaction ? "Edit Transaction" : "Add Transaction"}>
        <form onSubmit={handleSubmit}>
            <div onBlur={handleDescriptionBlur}>
                <TransactionForm transaction={formState} setTransaction={setFormState} isCategorizing={isCategorizing}/>
            </div>
            <div className="mt-8 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="bg-white dark:bg-gray-600 py-2 px-4 border border-gray-300 dark:border-gray-500 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Cancel</button>
                <button type="submit" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">Save</button>
            </div>
        </form>
      </Modal>
    </>
  );
};

export default Transactions;
