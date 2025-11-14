import React from 'react';
import { Bars3Icon, LogoutIcon } from '../icons';
import { useAppContext } from '../../contexts/AppContext';
import { supabase } from '../../services/supabase';
import Logo from '../Logo';

const Header: React.FC<{ setSidebarOpen: (open: boolean) => void }> = ({ setSidebarOpen }) => {
    const { session } = useAppContext();

    const handleLogout = async () => {
      await supabase.auth.signOut();
    };

    return (
        <header className="flex-shrink-0 flex items-center justify-between p-4 bg-light-bg-secondary dark:bg-dark-bg-secondary border-b border-gray-200 dark:border-gray-700">
            {/* Mobile hamburger */}
            <button
                onClick={() => setSidebarOpen(true)}
                className="text-light-text-secondary dark:text-dark-text-secondary focus:outline-none lg:hidden"
            >
                <Bars3Icon className="h-6 w-6" />
            </button>
            
            {/* Desktop spacer/logo */}
            <div className="hidden lg:flex items-center gap-2"> 
                 <Logo className="h-8 w-8" />
                 <h1 className="text-xl font-bold text-brand-primary">MyPocket</h1>
            </div>

            {/* Mobile Title */}
            <div className="flex items-center gap-2 lg:hidden">
                <Logo className="h-8 w-8" />
                <h1 className="text-xl font-bold text-brand-primary">MyPocket</h1>
            </div>
            
            <div className="flex items-center gap-4">
                 <div className="hidden lg:flex items-center gap-2 text-sm">
                    <span className="text-light-text-secondary dark:text-dark-text-secondary">Signed in as</span>
                    <span className="font-semibold text-light-text-primary dark:text-dark-text-primary truncate max-w-xs">{session?.user.email}</span>
                 </div>
                 <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm font-medium text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 p-2 rounded-lg transition-colors"
                    aria-label="Logout"
                >
                    <LogoutIcon className="h-5 w-5" />
                    <span className="hidden lg:inline">Logout</span>
                </button>
            </div>
        </header>
    );
};

export default Header;