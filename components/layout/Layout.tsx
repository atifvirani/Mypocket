import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAppContext } from '../../contexts/AppContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { isOffline } = useAppContext();

    return (
        <div className="flex h-screen bg-light-bg dark:bg-dark-bg">
            <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header setSidebarOpen={setSidebarOpen} />
                {isOffline && (
                    <div className="bg-amber-500 text-white text-center py-1 text-sm font-semibold">
                        You are currently offline. Some features may be disabled.
                    </div>
                )}
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-light-bg dark:bg-dark-bg">
                    <div className="container mx-auto px-4 sm:px-6 py-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default Layout;