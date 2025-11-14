import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Budget } from '../types';
import { TrashIcon } from '../components/icons';

const BudgetsPage: React.FC = () => {
    const { expenses, budgets, saveBudgets, allCategories } = useAppContext();
    const [newBudgetCategory, setNewBudgetCategory] = useState('');
    const [newBudgetLimit, setNewBudgetLimit] = useState('');

    const handleAddBudget = (e: React.FormEvent) => {
        e.preventDefault();
        const limit = parseFloat(newBudgetLimit);
        if (newBudgetCategory && limit > 0 && !budgets.find(b => b.category === newBudgetCategory)) {
            const newBudget: Budget = {
                category: newBudgetCategory,
                limit,
                id: `monthly-${newBudgetCategory}`
            };
            saveBudgets([...budgets, newBudget]);
            setNewBudgetCategory('');
            setNewBudgetLimit('');
        }
    };

    const handleDeleteBudget = (id: string) => {
        saveBudgets(budgets.filter(b => b.id !== id));
    };

    const monthlyExpenses = useMemo(() => {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return expenses.filter(expense => new Date(expense.created_at) >= firstDayOfMonth);
    }, [expenses]);

    const categorySpending = useMemo(() => {
        const spending: { [key: string]: number } = {};
        for (const expense of monthlyExpenses) {
            const amount = expense.converted_amount || expense.amount;
            spending[expense.category] = (spending[expense.category] || 0) + amount;
        }
        return spending;
    }, [monthlyExpenses]);
    
    const availableCategories = allCategories.filter(cat => !budgets.some(b => b.category === cat));

    return (
        <div>
            <h2 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-6">Budgets</h2>
            <div className="bg-light-bg-secondary dark:bg-dark-bg-secondary p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4 text-light-text-primary dark:text-dark-text-primary">Set Monthly Budgets</h3>
                <form onSubmit={handleAddBudget} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
                    <div className="md:col-span-1">
                        <label htmlFor="budget-category" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Category</label>
                        <select
                            id="budget-category"
                            value={newBudgetCategory}
                            onChange={e => setNewBudgetCategory(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary"
                        >
                            <option value="">Select a category</option>
                            {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="budget-limit" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Limit (₹)</label>
                        <input
                            type="number"
                            id="budget-limit"
                            value={newBudgetLimit}
                            onChange={e => setNewBudgetLimit(e.target.value)}
                            placeholder="e.g., 5000"
                            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary"
                        />
                    </div>
                    <button type="submit" className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-secondary transition-colors h-10 w-full md:w-auto">Set Budget</button>
                </form>
                <div className="space-y-4">
                    {budgets.length === 0 && <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm text-center py-8">No budgets set yet. Set a budget to track your spending.</p>}
                    {budgets.map(budget => {
                        const spent = categorySpending[budget.category] || 0;
                        const percentage = Math.min((spent / budget.limit) * 100, 100);
                        const isWarning = percentage >= 80 && percentage < 100;
                        const isCritical = percentage >= 100;
                        const bgColor = isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-brand-primary';
                        const formattedSpent = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(spent);
                        const formattedLimit = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(budget.limit);

                        return (
                            <div key={budget.id} className="p-4 bg-light-bg dark:bg-dark-bg rounded-lg">
                                <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-light-text-primary dark:text-dark-text-primary">{budget.category}</span>
                                        {isCritical && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-800">Over Budget!</span>}
                                        {isWarning && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Nearing Limit</span>}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-light-text-secondary dark:text-dark-text-secondary">{formattedSpent} / {formattedLimit}</span>
                                        <button onClick={() => handleDeleteBudget(budget.id)} className="p-1 text-light-text-secondary dark:text-dark-text-secondary hover:text-red-500" aria-label={`Delete ${budget.category} budget`}>
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                    <div className={`${bgColor} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default BudgetsPage;