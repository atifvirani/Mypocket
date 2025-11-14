import React from 'react';
import { HomeIcon, ListBulletIcon, PlusIcon, ChartPieIcon, UserGroupIcon, DocumentChartBarIcon, Cog6ToothIcon, XMarkIcon } from '../icons';
import { useAppContext } from '../../contexts/AppContext';
import Logo from '../Logo';

const navItems = [
    { href: '#_', label: 'Dashboard', icon: HomeIcon },
    { href: '#/expenses', label: 'Expenses', icon: ListBulletIcon },
    { href: '#/add', label: 'Add Expense', icon: PlusIcon, isPrimary: true },
    { href: '#/budgets', label: 'Budgets', icon: ChartPieIcon },
    { href: '#/friends', label: 'Friends', icon: UserGroupIcon },
    { href: '#/reports', label: 'Reports', icon: DocumentChartBarIcon },
    { href: '#/settings', label: 'Settings', icon: Cog6ToothIcon },
];

const NavLink: React.FC<{ item: typeof navItems[0], setSidebarOpen: (open: boolean) => void }> = ({ item, setSidebarOpen }) => {
    const currentHash = window.location.hash || '#_';
    const isActive = currentHash === item.href;

    if (item.isPrimary) {
        return (
            <a href={item.href} onClick={() => setSidebarOpen(false)} className="block w-full text-center text-white bg-brand-primary hover:bg-brand-secondary font-bold py-3 px-4 rounded-lg transition-colors">
                {item.label}
            </a>
        );
    }

    return (
        <a href={item.href} onClick={() => setSidebarOpen(false)}
            className={`flex items-center p-2 rounded-lg transition-colors text-base
            ${isActive
                ? 'bg-brand-primary/10 text-brand-primary font-semibold'
                : 'text-light-text-secondary dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}>
            <item.icon className="w-6 h-6" />
            <span className="ml-3">{item.label}</span>
        </a>
    );
};

interface SidebarProps {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ sidebarOpen, setSidebarOpen }) => {
    const { session } = useAppContext();

    return (
        <>
            {/* Mobile overlay */}
            <div
                className={`fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
                onClick={() => setSidebarOpen(false)}
            ></div>

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 bg-light-bg-secondary dark:bg-dark-bg-secondary w-64 p-4 z-30 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-2">
                        <Logo className="h-8 w-8" />
                        <h1 className="text-2xl font-bold text-brand-primary">MyPocket</h1>
                    </div>
                    <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1">
                        <XMarkIcon className="w-6 h-6 text-light-text-secondary dark:text-dark-text-secondary" />
                    </button>
                </div>
                <nav className="space-y-2">
                    {navItems.map(item => <NavLink key={item.href} item={item} setSidebarOpen={setSidebarOpen} />)}
                </nav>
                <div className="absolute bottom-4 left-4 right-4 text-center">
                    <p className="text-xs text-light-text-secondary dark:text-dark-text-secondary truncate">{session?.user.email}</p>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;