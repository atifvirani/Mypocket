import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import ExpenseItem from '../components/ExpenseItem';
import ExpenseForm from '../components/ExpenseForm';
import { Expense } from '../types';
import Modal from '../components/ui/Modal';
import ConfirmationModal from '../components/ui/ConfirmationModal';
import { supabase } from '../services/supabase';

const ExpensesPage: React.FC = () => {
    // Fix: Changed refetchExpenses to refetchData to match AppContextType.
    const { expenses, loading, error, refetchData, allCategories } = useAppContext();
    const [filterCategory, setFilterCategory] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [expenseToDeleteId, setExpenseToDeleteId] = useState<number | null>(null);

    // Effect to open edit modal from URL hash
    useEffect(() => {
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.split('?')[1]);
        const editId = params.get('edit');
        if (editId) {
            const expense = expenses.find(e => e.id === parseInt(editId, 10));
            if (expense) {
                handleEdit(expense);
                // Clean up URL
                window.history.replaceState(null, '', window.location.pathname + '#/expenses');
            }
        }
    }, [expenses]);


    const filteredExpenses = useMemo(() => {
        return expenses.filter(expense => {
            const categoryMatch = filterCategory ? expense.category === filterCategory : true;
            const searchMatch = searchTerm ? 
                (expense.description || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                expense.category.toLowerCase().includes(searchTerm.toLowerCase())
                : true;
            return categoryMatch && searchMatch;
        });
    }, [expenses, filterCategory, searchTerm]);
    
    const handleEdit = (expense: Expense) => {
        setExpenseToEdit(expense);
        setIsEditModalOpen(true);
    };

    const handleDeleteRequest = (id: number) => {
        setExpenseToDeleteId(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!expenseToDeleteId) return;
        
        const { error } = await supabase.from('expenses').delete().eq('id', expenseToDeleteId);
        if (error) {
            alert('Error deleting expense: ' + error.message);
        } else {
            // Fix: Changed refetchExpenses to refetchData to match AppContextType.
            refetchData();
        }
        setIsDeleteModalOpen(false);
        setExpenseToDeleteId(null);
    };

    const handleSave = () => {
        setIsEditModalOpen(false);
        setExpenseToEdit(null);
        // Fix: Changed refetchExpenses to refetchData to match AppContextType.
        refetchData();
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-6">All Expenses</h2>
            
            <div className="mb-6 p-4 bg-light-bg-secondary dark:bg-dark-bg-secondary rounded-lg shadow-md flex flex-wrap gap-4 items-center">
                <div className="flex-grow">
                    <label htmlFor="search" className="sr-only">Search</label>
                    <input 
                        type="text" 
                        id="search" 
                        placeholder="Search by description or category..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary"
                    />
                </div>
                 <div>
                    <label htmlFor="filterCategory" className="sr-only">Filter by Category</label>
                     <select
                        id="filterCategory"
                        value={filterCategory}
                        onChange={e => setFilterCategory(e.target.value)}
                        className="rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary"
                    >
                        <option value="">All Categories</option>
                        {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
            </div>

            <div className="bg-light-bg-secondary dark:bg-dark-bg-secondary p-4 rounded-lg shadow-md">
                {loading && <p className="text-center p-4">Loading expenses...</p>}
                {error && <p className="text-red-500 text-center p-4">Error: {error}</p>}
                {!loading && !error && filteredExpenses.length === 0 && (
                    <p className="text-light-text-secondary dark:text-dark-text-secondary text-center py-10">
                        {expenses.length === 0 ? "No expenses recorded yet." : "No expenses match your filters."}
                    </p>
                )}
                <div className="space-y-2">
                    {filteredExpenses.map(expense => (
                        <ExpenseItem
                            key={expense.id}
                            expense={expense}
                            onEdit={handleEdit}
                            onDelete={handleDeleteRequest}
                        />
                    ))}
                </div>
            </div>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Expense">
                <ExpenseForm 
                    expenseToEdit={expenseToEdit} 
                    onSave={handleSave} 
                    onCancel={() => setIsEditModalOpen(false)}
                />
            </Modal>
            
            <ConfirmationModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={confirmDelete}
                title="Confirm Deletion"
                message="Are you sure you want to delete this expense? This action cannot be undone."
            />
        </div>
    );
};

export default ExpensesPage;