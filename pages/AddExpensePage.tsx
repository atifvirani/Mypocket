import React, { useState } from 'react';
import ExpenseForm from '../components/ExpenseForm';
import { useAppContext } from '../contexts/AppContext';

const AddExpensePage: React.FC = () => {
    // Fix: Changed refetchExpenses to refetchData to match AppContextType.
    const { refetchData } = useAppContext();
    const [key, setKey] = useState(Date.now()); // Used to reset the form

    const handleSave = () => {
        refetchData();
        // A bit of a hack to force the form to reset after saving
        // In a real app with routing, navigating away would handle this.
        setKey(Date.now()); 
        // Optionally navigate back to expenses page
        window.location.hash = '#/expenses';
    };

    const handleCancel = () => {
        window.location.hash = '#/expenses';
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-6">Add an Expense</h2>
            <ExpenseForm 
                key={key}
                expenseToEdit={null} 
                onSave={handleSave} 
                onCancel={handleCancel}
                isPage={true}
            />
        </div>
    );
};

export default AddExpensePage;