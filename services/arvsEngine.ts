import { supabase } from './supabase';
import { Expense, Budget, Insight } from '../types';

/**
 * @file arvsEngine.ts
 * @description
 * This is the client-side ARVS (Advanced Recognition & Validation System) Smart Insights engine.
 * It runs in the user's browser, analyzing their financial data to generate helpful insights.
 * The engine is designed to be extensible with new insight-generating modules.
 */

/**
 * Checks if an insight of a specific type for a unique condition has already been generated recently.
 * This prevents spamming the user with duplicate alerts (e.g., "You are over budget" every time the app loads).
 * @param existingInsights The array of insights already fetched from the database.
 * @param type The type of insight to check for (e.g., 'BUDGET_WARNING').
 * @param uniqueKey A unique identifier for the condition, e.g., 'BUDGET_80_Food_2023-10'.
 * @returns {boolean} True if a recent, matching insight exists, false otherwise.
 */
const hasRecentInsight = (
    existingInsights: Insight[], 
    type: Insight['insight_type'], 
    uniqueKey: string // A key like 'BUDGET_80_Food_2023-10'
): boolean => {
    return existingInsights.some(insight => 
        insight.insight_type === type &&
        insight.related_category === uniqueKey
    );
};

// --- Insight Generation Logic ---

/**
 * Analyzes spending against set budgets for the current month.
 * Generates warnings if a user is nearing (80%) or has exceeded (100%) a budget.
 * @param expenses The user's expenses.
 * @param budgets The user's set budgets.
 * @param existingInsights Previously generated insights to avoid duplicates.
 * @returns An array of new budget-related insights.
 */
const checkBudgetWarnings = (
    expenses: Expense[], 
    budgets: Budget[], 
    existingInsights: Insight[]
): Omit<Insight, 'id' | 'user_id' | 'created_at' | 'is_read'>[] => {
    const newInsights: Omit<Insight, 'id' | 'user_id' | 'created_at' | 'is_read'>[] = [];
    if (budgets.length === 0) return [];
    
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const monthExpenses = expenses.filter(e => new Date(e.created_at) >= firstDayOfMonth);

    const spendingByCategory: { [key: string]: number } = {};
    monthExpenses.forEach(e => {
        const amount = e.converted_amount || e.amount;
        spendingByCategory[e.category] = (spendingByCategory[e.category] || 0) + amount;
    });

    budgets.forEach(budget => {
        const spent = spendingByCategory[budget.category] || 0;
        const percentage = (spent / budget.limit) * 100;
        const key100 = `BUDGET_100_${budget.category}_${monthKey}`;
        const key80 = `BUDGET_80_${budget.category}_${monthKey}`;

        // Over budget
        if (percentage >= 100) {
            if (!hasRecentInsight(existingInsights, 'BUDGET_WARNING', key100)) {
                newInsights.push({
                    message: `You've gone over your ₹${budget.limit} budget for ${budget.category}, spending ₹${spent.toFixed(0)}.`,
                    insight_type: 'BUDGET_WARNING',
                    related_category: key100, // Use unique key to prevent duplicates
                });
            }
        } 
        // Nearing budget
        else if (percentage >= 80) {
            if (!hasRecentInsight(existingInsights, 'BUDGET_WARNING', key80) && !hasRecentInsight(existingInsights, 'BUDGET_WARNING', key100)) {
                 newInsights.push({
                    message: `You've spent ₹${spent.toFixed(0)} of your ₹${budget.limit} budget for ${budget.category} (over 80%).`,
                    insight_type: 'BUDGET_WARNING',
                    related_category: key80,
                });
            }
        }
    });

    return newInsights;
};

/**
 * Detects potential price increases for recurring expenses.
 * It compares the amount of the latest instance of a recurring expense to the previous one.
 * @param allExpenses The user's expenses.
 * @param existingInsights Previously generated insights to avoid duplicates.
 * @returns An array of new price increase-related insights.
 */
const checkPriceIncreases = (
    allExpenses: Expense[],
    existingInsights: Insight[],
): Omit<Insight, 'id' | 'user_id' | 'created_at' | 'is_read'>[] => {
    const newInsights: Omit<Insight, 'id' | 'user_id' | 'created_at' | 'is_read'>[] = [];
    const recurringExpenses = allExpenses.filter(e => e.recurring_type && e.recurring_type !== 'none');
    
    // Create a unique key for a recurring expense series
    const getRecurringKey = (expense: Expense) => `${expense.description || ''}::${expense.category}`;

    const recurringGroups = new Map<string, Expense[]>();
    recurringExpenses.forEach(exp => {
        const key = getRecurringKey(exp);
        if (!recurringGroups.has(key)) recurringGroups.set(key, []);
        recurringGroups.get(key)!.push(exp);
    });

    recurringGroups.forEach(group => {
        if (group.length < 2) return;
        const sortedGroup = group.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const latest = sortedGroup[0];
        const previous = sortedGroup[1];
        
        // Use a unique key to avoid re-creating the same insight
        const uniqueKey = `PRICE_INCREASE_${latest.id}`;
        
        if (latest.amount > previous.amount) {
            if (!existingInsights.some(i => i.related_expense_id === latest.id && i.insight_type === 'PRICE_INCREASE')) {
                 newInsights.push({
                    message: `The price for your recurring '${latest.category}' expense may have increased from ₹${previous.amount} to ₹${latest.amount}.`,
                    insight_type: 'PRICE_INCREASE',
                    related_category: uniqueKey, // Store the key here
                    related_expense_id: latest.id
                });
            }
        }
    });
    return newInsights;
};

/**
 * The main entry point for the ARVS engine.
 * It runs all registered insight-generating modules and saves any new insights to the database.
 * @param expenses The user's expenses.
 * @param budgets The user's budgets.
 * @param existingInsights Previously generated insights.
 * @param userId The current user's ID.
 * @returns {Promise<boolean>} A promise that resolves to true if new insights were added, false otherwise.
 */
export const runArvsEngine = async (
    expenses: Expense[],
    budgets: Budget[],
    existingInsights: Insight[],
    userId: string
): Promise<boolean> => {
    const allNewInsights: Omit<Insight, 'id' | 'created_at' | 'is_read'>[] = [];

    const budgetInsights = checkBudgetWarnings(expenses, budgets, existingInsights);
    const priceIncreaseInsights = checkPriceIncreases(expenses, existingInsights);

    allNewInsights.push(...budgetInsights.map(i => ({...i, user_id: userId})));
    allNewInsights.push(...priceIncreaseInsights.map(i => ({...i, user_id: userId})));
    
    if (allNewInsights.length > 0) {
        const { error } = await supabase.from('insights').insert(allNewInsights as any);
        if (error) {
            console.error("ARVS Engine: Failed to save insights", error);
            return false;
        }
        return true; // Indicates new insights were added
    }

    return false; // No new insights
};