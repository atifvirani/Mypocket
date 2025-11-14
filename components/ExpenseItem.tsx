import React from 'react';
import { Expense } from '../types';
import { PencilIcon, TrashIcon, MicrophoneIcon, ReceiptIcon, PencilSquareIcon, ArrowPathIcon, UsersIcon } from './icons';

interface ExpenseItemProps {
  expense: Expense;
  onEdit: (expense: Expense) => void;
  onDelete: (id: number) => void;
}

const SourceIcon: React.FC<{ type: Expense['source_type'] }> = ({ type }) => {
    const iconProps = { className: "h-5 w-5 text-light-text-secondary dark:text-dark-text-secondary" };
    switch (type) {
        case 'voice':
            return <MicrophoneIcon {...iconProps} />;
        case 'photo':
            return <ReceiptIcon {...iconProps} />;
        case 'manual':
        default:
            return <PencilSquareIcon {...iconProps} />;
    }
};

const ExpenseItem: React.FC<ExpenseItemProps> = ({ expense, onEdit, onDelete }) => {
  
  const currency = expense.currency_code || 'INR';
  const amount = expense.amount;
  const convertedAmount = expense.converted_amount;

  const formattedAmount = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  
  const formattedConvertedAmount = convertedAmount ? new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(convertedAmount) : null;


  const formattedDate = new Date(expense.created_at).toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).replace(',', ' •');
  
  const isRecurring = expense.recurring_type && expense.recurring_type !== 'none';
  const isSplit = !!expense.collaborators;

  return (
    <div className="flex items-center justify-between p-3 bg-light-bg dark:bg-dark-bg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0">
          <SourceIcon type={expense.source_type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-light-text-primary dark:text-dark-text-primary truncate">{expense.description || expense.category}</p>
            {isRecurring && <ArrowPathIcon className="h-4 w-4 text-blue-500 flex-shrink-0" title={`Recurring ${expense.recurring_type}`} />}
            {isSplit && <UsersIcon className="h-4 w-4 text-purple-500 flex-shrink-0" title="Split bill" />}
          </div>
          <div className="flex items-center gap-2 text-sm text-light-text-secondary dark:text-dark-text-secondary flex-wrap">
            <span className="bg-emerald-100 text-emerald-800 text-xs font-medium px-2.5 py-0.5 rounded-full capitalize">{expense.category}</span>
            <span className="hidden sm:inline">•</span>
            <span className="whitespace-nowrap">{formattedDate}</span>
             {expense.location && <><span className="hidden sm:inline">•</span><span className="truncate">{expense.location}</span></>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 ml-2">
        <div className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary text-right whitespace-nowrap">
            {currency !== 'INR' && formattedConvertedAmount ? (
                <div className="flex flex-col items-end">
                    <span>{formattedAmount}</span>
                    <span className="text-xs font-normal text-light-text-secondary dark:text-dark-text-secondary">{formattedConvertedAmount}</span>
                </div>
            ) : (
                <span>{formattedAmount}</span>
            )}
        </div>
        <div className="flex items-center">
            <button 
              onClick={() => onEdit(expense)} 
              className="p-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-blue-600 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50"
              aria-label="Edit expense"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
            <button 
              onClick={() => onDelete(expense.id)} 
              className="p-2 text-light-text-secondary dark:text-dark-text-secondary hover:text-red-600 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"
              aria-label="Delete expense"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ExpenseItem);