import React, { useState } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { SunIcon, MoonIcon, LogoutIcon, TrashIcon } from '../components/icons';
import { supabase } from '../services/supabase';
import ConfirmationModal from '../components/ui/ConfirmationModal';

const SettingsPage: React.FC = () => {
    const { theme, toggleTheme, clearLocalData } = useAppContext();
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };
    
    const handleClearData = () => {
        clearLocalData();
        setIsConfirmOpen(false);
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-6">Settings</h2>

            <div className="bg-light-bg-secondary dark:bg-dark-bg-secondary p-6 rounded-lg shadow-md space-y-8 max-w-2xl mx-auto">
                
                {/* Theme Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">Appearance</h3>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">Choose between light and dark mode.</p>
                    </div>
                    <div className="flex items-center gap-2 mt-4 sm:mt-0 bg-light-bg dark:bg-dark-bg p-2 rounded-full">
                        <SunIcon className={`h-6 w-6 ${theme === 'light' ? 'text-brand-primary' : 'text-light-text-secondary dark:text-dark-text-secondary'}`} />
                        <button
                            onClick={toggleTheme}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 ${theme === 'dark' ? 'bg-brand-primary' : 'bg-gray-200 dark:bg-gray-600'}`}
                            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
                        >
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                        <MoonIcon className={`h-6 w-6 ${theme === 'dark' ? 'text-brand-primary' : 'text-light-text-secondary dark:text-dark-text-secondary'}`} />
                    </div>
                </div>

                {/* Data Management */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                     <div>
                        <h3 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">Data Management</h3>
                         <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">Delete locally stored data on this device.</p>
                     </div>
                    <button
                        onClick={() => setIsConfirmOpen(true)}
                        className="mt-4 sm:mt-0 flex items-center justify-center gap-2 text-sm font-medium text-amber-600 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:hover:bg-amber-900 p-3 rounded-lg transition-colors"
                    >
                        <TrashIcon className="h-5 w-5" />
                        <span>Clear Local Data</span>
                    </button>
                </div>

                {/* Account Actions */}
                 <div className="border-t border-gray-200 dark:border-gray-700 pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                     <div>
                        <h3 className="text-lg font-bold text-light-text-primary dark:text-dark-text-primary">Account</h3>
                        <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary mt-1">Log out of your current session.</p>
                     </div>
                     <button
                        onClick={handleLogout}
                        className="mt-4 sm:mt-0 w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 p-3 rounded-lg transition-colors"
                    >
                        <LogoutIcon className="h-5 w-5" />
                        <span>Logout</span>
                    </button>
                 </div>

            </div>
            
            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setIsConfirmOpen(false)}
                onConfirm={handleClearData}
                title="Confirm Clear Data"
                message="Are you sure you want to clear all local data? This will permanently delete your friends list, budgets, and custom categories from this device."
                confirmButtonText="Yes, Clear Data"
            />
        </div>
    );
};

export default SettingsPage;