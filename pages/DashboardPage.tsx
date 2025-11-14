import React, { useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import ExpenseItem from '../components/ExpenseItem';
import { SparklesIcon } from '../components/icons';
import PieChart from '../components/charts/PieChart';
import { Insight } from '../types';

const SummaryCard: React.FC<{ title: string, value: string, color: string }> = React.memo(({ title, value, color }) => (
    <div className="bg-light-bg-secondary dark:bg-dark-bg-secondary p-4 rounded-lg shadow-md h-full">
        <h3 className="text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">{title}</h3>
        <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
));

const SmartInsights: React.FC = () => {
    const { insights } = useAppContext();
    
    if (insights.length === 0) return (
         <div className="bg-blue-50 dark:bg-blue-900/50 border-l-4 border-blue-400 p-4 rounded-r-lg shadow-sm">
            <p className="text-sm text-blue-700 dark:text-blue-300">No special insights from ARVS right now. Keep tracking to get personalized tips!</p>
        </div>
    );

    return (
        <div className="bg-blue-50 dark:bg-blue-900/50 border-l-4 border-blue-400 p-4 rounded-r-lg shadow-sm">
            <div className="flex">
                <div className="flex-shrink-0">
                    <SparklesIcon className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                    <p className="text-sm font-bold text-blue-800 dark:text-blue-200">ARVS Smart Insights</p>
                    <div className="mt-2 text-sm text-blue-700 dark:text-blue-300 space-y-1">
                        {insights.slice(0, 3).map((insight: Insight) => (
                            <p key={insight.id}>💡 {insight.message}</p>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const DashboardPage: React.FC = () => {
    const { expenses, loading, session } = useAppContext();

    const { summary, categoryData } = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const todayExpenses = expenses.filter(e => new Date(e.created_at) >= today);
        const monthExpenses = expenses.filter(e => new Date(e.created_at) >= firstDayOfMonth);

        const totalToday = todayExpenses.reduce((sum, e) => sum + (e.converted_amount || e.amount), 0);
        const totalMonth = monthExpenses.reduce((sum, e) => sum + (e.converted_amount || e.amount), 0);

        const spendingByCategory: { [key: string]: number } = {};
        monthExpenses.forEach(e => {
            const amount = e.converted_amount || e.amount;
            spendingByCategory[e.category] = (spendingByCategory[e.category] || 0) + amount;
        });

        const categoryChartData = Object.entries(spendingByCategory)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([label, value]) => ({ label, value }));

        return {
            summary: {
                today: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalToday),
                month: new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalMonth),
                totalTransactions: expenses.length
            },
            categoryData: categoryChartData
        };
    }, [expenses]);

    const recentExpenses = expenses.slice(0, 5);

    const handleEditClick = (expenseId: number) => {
        window.location.hash = `#/expenses?edit=${expenseId}`;
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-2">
                Welcome back, {session?.user.email?.split('@')[0]}
            </h2>
            <p className="text-light-text-secondary dark:text-dark-text-secondary mb-6">Here's your financial snapshot.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <SummaryCard title="Spent Today" value={summary.today} color="text-brand-primary" />
                <SummaryCard title="Spent This Month" value={summary.month} color="text-light-text-primary dark:text-dark-text-primary" />
                <SummaryCard title="Total Transactions" value={summary.totalTransactions.toString()} color="text-light-text-primary dark:text-dark-text-primary" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-light-bg-secondary dark:bg-dark-bg-secondary p-6 rounded-lg shadow-md">
                     <h3 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary mb-4">Recent Expenses</h3>
                     {loading ? (
                         <p>Loading...</p>
                     ) : recentExpenses.length > 0 ? (
                         <div className="space-y-2">
                             {recentExpenses.map(expense => (
                                <div key={expense.id} className="cursor-pointer" onClick={() => handleEditClick(expense.id)}>
                                    <ExpenseItem expense={expense} onEdit={() => handleEditClick(expense.id)} onDelete={() => {}} />
                                </div>
                             ))}
                         </div>
                     ) : (
                         <p className="text-light-text-secondary dark:text-dark-text-secondary text-center py-8">No expenses recorded yet.</p>
                     )}
                </div>
                 <div className="space-y-6">
                    <div className="bg-light-bg-secondary dark:bg-dark-bg-secondary p-6 rounded-lg shadow-md">
                        <h3 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary mb-4">This Month's Spending</h3>
                        {categoryData.length > 0 ? <PieChart data={categoryData} /> : <p className="text-sm text-center text-light-text-secondary dark:text-dark-text-secondary py-8">No spending this month yet.</p>}
                    </div>
                     <SmartInsights />
                     <div className="bg-light-bg-secondary dark:bg-dark-bg-secondary p-6 rounded-lg shadow-md">
                        <h3 className="text-xl font-bold text-light-text-primary dark:text-dark-text-primary mb-4">Quick Actions</h3>
                        <div className="flex flex-col space-y-3">
                             <a href="#/add" className="w-full text-center text-white bg-brand-primary hover:bg-brand-secondary font-bold py-3 px-4 rounded-lg transition-colors">
                                Add New Expense
                            </a>
                            <a href="#/reports" className="w-full text-center text-brand-primary dark:text-brand-accent border border-brand-primary font-bold py-3 px-4 rounded-lg transition-colors hover:bg-brand-primary/10">
                                View Reports
                            </a>
                        </div>
                     </div>
                </div>
            </div>

        </div>
    );
};

export default DashboardPage;