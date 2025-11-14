
export interface Expense {
  id: number;
  user_id: string;
  amount: number;
  category: string;
  description?: string;
  created_at: string;
  source_type: 'manual' | 'voice' | 'photo';
  image_url?: string;
  voice_url?: string;
  
  // V4 Features
  recurring_type?: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurring_end_date?: string | null;
  location?: string | null;
  collaborators?: {
    total_amount: number;
    my_share: number;
    participants: {
      name: string;
      amount: number;
      friend_id?: string; // Link to a friend
    }[];
  } | null;
  currency_code?: string | null;
  converted_amount?: number | null;
}

export interface Budget {
  category: string;
  limit: number;
  id: string; // e.g., 'monthly-Food'
}

export interface Friend {
  id: string; // This is now a UUID from the database
  user_id: string;
  friend_email: string;
  created_at: string;
}

export interface Insight {
  id: string;
  user_id: string;
  message: string;
  insight_type: 'BUDGET_WARNING' | 'SPENDING_SPIKE' | 'PRICE_INCREASE';
  related_category?: string;
  related_expense_id?: number;
  created_at: string;
  is_read: boolean;
}
