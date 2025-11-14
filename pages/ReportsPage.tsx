import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { DocumentArrowDownIcon } from '../components/icons';
import BarChart from '../components/charts/BarChart';
import LineChart from '../components/charts/LineChart';
import { Expense } from '../types';

/**
 * @description
 * These `declare` statements inform TypeScript that `jspdf` and `XLSX` will be available
 * on the global scope at runtime. These libraries are loaded via script tags in `index.html`
 * for the data export functionality.
 */
declare var jspdf: any;
declare var XLSX: any;

const ReportsPage: React.FC = () => {
    const { expenses } = useAppContext();
    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(thirtyDaysAgo);
    const [endDate, setEndDate] = useState(today);

    const filteredExpenses = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        return expenses.filter(e => {
            const expenseDate = new Date(e.created_at);
            return expenseDate >= start && expenseDate <= end;
        }).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    }, [expenses, startDate, endDate]);

    const chartData = useMemo(() => {
        const spendingByCategory: { [key: string]: number } = {};
        const spendingByDay: { [key: string]: number } = {};
        
        filteredExpenses.forEach(e => {
            const amount = e.converted_amount || e.amount;
            spendingByCategory[e.category] = (spendingByCategory[e.category] || 0) + amount;
            
            const day = new Date(e.created_at).toISOString().split('T')[0];
            spendingByDay[day] = (spendingByDay[day] || 0) + amount;
        });

        const barChartData = Object.entries(spendingByCategory)
            .sort(([, a], [, b]) => b - a)
            .map(([label, value]) => ({ label, value }));

        const lineChartData = Object.entries(spendingByDay)
            .map(([label, value]) => ({ label, value }));
            
        return { barChartData, lineChartData };

    }, [filteredExpenses]);


    /**
     * Handles exporting the currently filtered expenses to an Excel (.xlsx) file.
     * It relies on the `XLSX` library (SheetJS) being loaded globally.
     */
    const handleExportExcel = () => {
        const dataToExport = filteredExpenses.map(e => ({
            Date: new Date(e.created_at).toLocaleString('en-IN'),
            Category: e.category,
            Description: e.description || '',
            Amount: e.amount,
            Currency: e.currency_code || 'INR',
            Amount_INR: e.converted_amount || e.amount,
            Source: e.source_type,
            Location: e.location || '',
            Collaborators: e.collaborators ? JSON.stringify(e.collaborators.participants) : ''
        }));
        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
        XLSX.writeFile(workbook, `MyPocket_Expenses_${startDate}_to_${endDate}.xlsx`);
    };

    /**
     * Handles exporting the currently filtered expenses to a PDF document.
     * It relies on the `jspdf` and `jspdf-autotable` libraries being loaded globally.
     */
    const handleExportPdf = () => {
        if (typeof jspdf === 'undefined') {
            alert('PDF export library is not loaded. Please try again later.');
            return;
        }
        const doc = new jspdf.jsPDF();
        const dataToExport = filteredExpenses;
        const head = [['Date', 'Category', 'Description', 'Amount (INR)']];
        const body = dataToExport.map(e => [
            new Date(e.created_at).toLocaleDateString('en-IN'),
            e.category,
            e.description || '-',
            new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(e.converted_amount || e.amount)
        ]);

        (doc as any).autoTable({
            head, body,
            didDrawPage: (data: any) => { doc.text('MyPocket Expenses', data.settings.margin.left, 15); },
            styles: { fontSize: 8 }, headStyles: { fillColor: [4, 120, 87] }
        });
        doc.save(`MyPocket_Expenses_${startDate}_to_${endDate}.pdf`);
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-6">Reports & Analytics</h2>
             <div className="mb-6 bg-light-bg-secondary dark:bg-dark-bg-secondary p-6 rounded-lg shadow-md">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Start Date</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary" />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">End Date</label>
                        <input type="date" id="end-date" value={endDate} onChange={e => setEndDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                 <div className="bg-light-bg-secondary dark:bg-dark-bg-secondary p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4 text-light-text-primary dark:text-dark-text-primary">Spending by Category</h3>
                    {chartData.barChartData.length > 0 ? <BarChart data={chartData.barChartData} /> : <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary py-10">No data for this period.</p>}
                </div>
                 <div className="bg-light-bg-secondary dark:bg-dark-bg-secondary p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4 text-light-text-primary dark:text-dark-text-primary">Spending Over Time</h3>
                    {chartData.lineChartData.length > 1 ? <LineChart data={chartData.lineChartData} /> : <p className="text-center text-sm text-light-text-secondary dark:text-dark-text-secondary py-10">Not enough data to draw a trend.</p>}
                </div>
            </div>

            <div className="bg-light-bg-secondary dark:bg-dark-bg-secondary p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold mb-4 text-light-text-primary dark:text-dark-text-primary">Export Your Data</h3>
                <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mb-4">Export the filtered expenses as a PDF or Excel file.</p>
                <div className="flex flex-wrap items-end gap-2">
                    <button onClick={handleExportExcel} className="flex items-center gap-2 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-gray-700 transition-colors h-10">
                        <DocumentArrowDownIcon className="h-5 w-5" /> Excel
                    </button>
                    <button onClick={handleExportPdf} className="flex items-center gap-2 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-red-700 transition-colors h-10">
                        <DocumentArrowDownIcon className="h-5 w-5" /> PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;