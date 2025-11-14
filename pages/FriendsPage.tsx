
import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { TrashIcon } from '../components/icons';

const FriendsPage: React.FC = () => {
    const { friends, addFriend, removeFriend, expenses, session } = useAppContext();
    const [newFriendEmail, setNewFriendEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAddFriend = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!newFriendEmail || !/\S+@\S+\.\S+/.test(newFriendEmail)) {
            setError('Please enter a valid email address.');
            return;
        }
        if (friends.some(f => f.friend_email === newFriendEmail)) {
            setError('This person is already in your friends list.');
            return;
        }
        if (session?.user?.email === newFriendEmail) {
            setError("You can't add yourself as a friend.");
            return;
        }

        setLoading(true);
        try {
            await addFriend(newFriendEmail);
            setNewFriendEmail('');
        } catch (err: any) {
            setError(err.message || "Failed to add friend.");
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveFriend = async (id: string) => {
        if (window.confirm("Are you sure you want to remove this friend?")) {
            try {
                await removeFriend(id);
            } catch (err: any) {
                setError(err.message || "Failed to remove friend.");
            }
        }
    };
    
    const friendBalances = useMemo(() => {
        const balances = new Map<string, { totalOwed: number, count: number }>();
        if (!session) return balances;

        expenses.forEach(expense => {
            if (expense.collaborators) {
                const myShareData = expense.collaborators.participants.find(p => p.name === 'Me');
                // Only consider bills where I (the user) participated
                if (!myShareData) return;

                expense.collaborators.participants.forEach(participant => {
                    const friend = friends.find(f => f.id === participant.friend_id);
                    if (friend) {
                        const current = balances.get(friend.id) || { totalOwed: 0, count: 0 };
                        // Amount the friend owes me for this specific bill
                        const owedForThisBill = participant.amount; 
                        
                        current.totalOwed += owedForThisBill;
                        current.count += 1;
                        balances.set(friend.id, current);
                    }
                });
            }
        });

        return balances;

    }, [expenses, friends, session]);


    return (
        <div>
            <h2 className="text-3xl font-bold text-light-text-primary dark:text-dark-text-primary mb-6">Friends & Balances</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 bg-light-bg-secondary dark:bg-dark-bg-secondary p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4 text-light-text-primary dark:text-dark-text-primary">Add Friend</h3>
                    <form onSubmit={handleAddFriend} className="flex flex-col gap-3 mb-4">
                        <div>
                            <label htmlFor="friend-email" className="block text-sm font-medium text-light-text-secondary dark:text-dark-text-secondary">Friend's Email</label>
                            <input 
                                type="email"
                                id="friend-email"
                                value={newFriendEmail}
                                onChange={e => setNewFriendEmail(e.target.value)}
                                placeholder="friend@example.com"
                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-primary focus:ring-brand-primary sm:text-sm bg-light-bg dark:bg-dark-bg text-light-text-primary dark:text-dark-text-primary"
                            />
                        </div>
                        <button type="submit" disabled={loading} className="bg-brand-primary text-white font-semibold py-2 px-4 rounded-lg shadow-sm hover:bg-brand-secondary transition-colors h-10 disabled:opacity-50">
                            {loading ? 'Adding...' : 'Add Friend'}
                        </button>
                    </form>
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                </div>
                 <div className="lg:col-span-2 bg-light-bg-secondary dark:bg-dark-bg-secondary p-6 rounded-lg shadow-md">
                    <h3 className="text-xl font-bold mb-4 text-light-text-primary dark:text-dark-text-primary">Your Friends</h3>
                    <div className="space-y-3">
                        {friends.length === 0 && <p className="text-light-text-secondary dark:text-dark-text-secondary text-sm text-center py-8">No friends added yet. Add a friend to easily split bills!</p>}
                        {friends.map(friend => {
                            const balance = friendBalances.get(friend.id);
                            const amountOwed = balance ? balance.totalOwed : 0;
                            return (
                                <div key={friend.id} className="flex justify-between items-center bg-light-bg dark:bg-dark-bg p-3 rounded-md">
                                    <div>
                                        <p className="font-medium text-light-text-primary dark:text-dark-text-primary truncate">{friend.friend_email}</p>
                                        <p className="text-sm">
                                            {amountOwed > 0 ? (
                                                <span className="text-emerald-600 dark:text-emerald-400">Owes you {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amountOwed)}</span>
                                            ) : (
                                                <span className="text-light-text-secondary dark:text-dark-text-secondary">Settled up</span>
                                            )}
                                            {balance && <span className="text-light-text-secondary dark:text-dark-text-secondary"> from {balance.count} bills</span>}
                                        </p>
                                    </div>
                                    <button onClick={() => handleRemoveFriend(friend.id)} className="p-1 text-light-text-secondary dark:text-dark-text-secondary hover:text-red-500 flex-shrink-0" aria-label={`Remove ${friend.friend_email}`}>
                                        <TrashIcon className="h-4 w-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FriendsPage;
