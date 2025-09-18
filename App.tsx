
import React, { useState, useMemo } from 'react';
import { useTransactions } from './hooks/useTransactions';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Chatbot from './components/Chatbot';
import { NavIcon, LogoIcon } from './components/Icons';

type View = 'dashboard' | 'transactions';

const App: React.FC = () => {
  const [view, setView] = useState<View>('dashboard');
  const transactionsHook = useTransactions();

  const activeNavClass = 'bg-gray-800 text-white';
  const inactiveNavClass = 'text-gray-400 hover:text-white hover:bg-gray-700';

  const navButton = (targetView: View, icon: React.ReactNode, text: string) => (
    <button
      onClick={() => setView(targetView)}
      className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${view === targetView ? activeNavClass : inactiveNavClass}`}
    >
      {icon}
      {text}
    </button>
  );

  const memoizedDashboard = useMemo(() => <Dashboard transactions={transactionsHook.transactions} />, [transactionsHook.transactions]);
  const memoizedTransactions = useMemo(() => <Transactions hook={transactionsHook} />, [transactionsHook]);

  return (
    <div className="min-h-screen flex bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      {/* Sidebar Navigation */}
      <div className="flex flex-col w-64 bg-gray-900 dark:bg-gray-950 border-r border-gray-700">
        <div className="flex items-center justify-center h-16 border-b border-gray-700">
          <LogoIcon />
          <span className="text-white text-xl font-bold ml-2">Fin-AI</span>
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            {navButton('dashboard', <NavIcon type="dashboard" />, 'Dashboard')}
            {navButton('transactions', <NavIcon type="transactions" />, 'Transactions')}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 relative overflow-y-auto focus:outline-none p-6">
          {view === 'dashboard' ? memoizedDashboard : memoizedTransactions}
        </main>
      </div>

      {/* Chatbot */}
      <Chatbot transactions={transactionsHook.transactions} />
    </div>
  );
};

export default App;
