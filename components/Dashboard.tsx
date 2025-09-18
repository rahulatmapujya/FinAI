
import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Transaction, TransactionType, ForecastDataPoint, Category } from '../types';
import { CATEGORIES, PIE_CHART_COLORS } from '../constants';
import { getExpenseForecast, getFinancialInsights } from '../services/geminiService';
import { Spinner, InsightIcon } from './Icons';

interface DashboardProps {
  transactions: Transaction[];
}

const Dashboard: React.FC<DashboardProps> = ({ transactions }) => {
  const [forecastData, setForecastData] = useState<ForecastDataPoint[]>([]);
  const [insights, setInsights] = useState<string>('');
  const [isLoadingForecast, setIsLoadingForecast] = useState(true);
  const [isLoadingInsights, setIsLoadingInsights] = useState(true);

  const spendingByCategory = useMemo(() => {
    const spendingMap = new Map<Category, number>();
    transactions
      .filter(t => t.type === TransactionType.Debit)
      .forEach(t => {
        spendingMap.set(t.category, (spendingMap.get(t.category) || 0) + t.amount);
      });

    return Array.from(spendingMap.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);
  
  useEffect(() => {
    const fetchForecast = async () => {
      setIsLoadingForecast(true);
      const forecastResult = await getExpenseForecast(transactions);
      
      // Combine with actual data
      const actualCumulative: { [key: string]: number } = {};
      let runningTotal = 0;
      transactions
        .filter(t => t.type === TransactionType.Debit)
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .forEach(t => {
            runningTotal += t.amount;
            actualCumulative[t.date] = runningTotal;
        });
      
      const allDates = new Set([...Object.keys(actualCumulative), ...forecastResult.map(f => f.date)]);
      const sortedDates = Array.from(allDates).sort();

      let lastActual = 0;
      const combinedData = sortedDates.map(date => {
          if (actualCumulative[date]) {
              lastActual = actualCumulative[date];
          }
          const forecastPoint = forecastResult.find(f => f.date === date);
          return {
              date,
              actual: actualCumulative[date] || lastActual,
              forecast: forecastPoint ? forecastPoint.forecast : undefined
          };
      }).filter(d => new Date(d.date) >= new Date(new Date().setDate(new Date().getDate() - 30)));

      setForecastData(combinedData);
      setIsLoadingForecast(false);
    };

    const fetchInsights = async () => {
      setIsLoadingInsights(true);
      const insightsResult = await getFinancialInsights(transactions);
      setInsights(insightsResult);
      setIsLoadingInsights(false);
    };

    fetchForecast();
    fetchInsights();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transactions]);
  
  const Card: React.FC<{ title: string; children: React.ReactNode; isLoading?: boolean; className?: string }> = ({ title, children, isLoading = false, className = '' }) => (
    <div className={`bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md transition-all duration-300 ${className}`}>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-4">{title}</h2>
        {isLoading ? <div className="flex justify-center items-center h-48"><Spinner /></div> : children}
    </div>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Spending by Category" className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie data={spendingByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} fill="#8884d8" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {spendingByCategory.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_CHART_COLORS[index % PIE_CHART_COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`}/>
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </Card>

        <Card title="AI Insights" isLoading={isLoadingInsights}>
            <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                    <InsightIcon />
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-300 prose prose-sm dark:prose-invert" dangerouslySetInnerHTML={{ __html: insights.replace(/\n/g, '<br />') }} />
            </div>
        </Card>

        <Card title="Expense Forecast vs Actual" className="lg:col-span-3" isLoading={isLoadingForecast}>
            <ResponsiveContainer width="100%" height={400}>
                <LineChart data={forecastData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2}/>
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(value) => `$${value}`} tick={{ fontSize: 12 }}/>
                    <Tooltip formatter={(value: number, name: string) => [`$${value.toFixed(2)}`, name.charAt(0).toUpperCase() + name.slice(1)]}/>
                    <Legend />
                    <Line type="monotone" dataKey="actual" stroke="#3b82f6" strokeWidth={2} dot={false}/>
                    <Line type="monotone" dataKey="forecast" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={false}/>
                </LineChart>
            </ResponsiveContainer>
        </Card>
    </div>
  );
};

export default Dashboard;
