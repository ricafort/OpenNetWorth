
export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            assets: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    type: 'cash' | 'investment' | 'real_estate' | 'retirement' | 'other'
                    value: number
                    is_liquid: boolean
                    currency: string
                    investment_details: Json | null
                    last_updated: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    type: 'cash' | 'investment' | 'real_estate' | 'retirement' | 'other'
                    value?: number
                    is_liquid?: boolean
                    currency?: string
                    investment_details?: Json | null
                    last_updated?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    type?: 'cash' | 'investment' | 'real_estate' | 'retirement' | 'other'
                    value?: number
                    is_liquid?: boolean
                    currency?: string
                    investment_details?: Json | null
                    last_updated?: string
                }
            }
            liabilities: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    type: 'mortgage' | 'student_loan' | 'auto_loan' | 'credit_card' | 'other'
                    balance: number
                    interest_rate: number
                    minimum_payment: number
                    is_good_debt: boolean
                    currency: string
                    last_updated: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    type: 'mortgage' | 'student_loan' | 'auto_loan' | 'credit_card' | 'other'
                    balance?: number
                    interest_rate?: number
                    minimum_payment?: number
                    is_good_debt?: boolean
                    currency?: string
                    last_updated?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    type?: 'mortgage' | 'student_loan' | 'auto_loan' | 'credit_card' | 'other'
                    balance?: number
                    interest_rate?: number
                    minimum_payment?: number
                    is_good_debt?: boolean
                    currency?: string
                    last_updated?: string
                }
            }
            recurring_transactions: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    amount: number
                    type: 'income' | 'expense'
                    frequency: string
                    category: string
                    start_date: string
                    end_date: string | null
                    is_active: boolean
                    currency: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    amount: number
                    type: 'income' | 'expense'
                    frequency: string
                    category: string
                    start_date: string
                    end_date?: string | null
                    is_active?: boolean
                    currency?: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    amount?: number
                    type?: 'income' | 'expense'
                    frequency?: string
                    category?: string
                    start_date?: string
                    end_date?: string | null
                    is_active?: boolean
                    currency?: string
                    created_at?: string
                }
            }
            economic_benchmarks: {
                Row: {
                    id: string
                    person_country_code: string
                    percentile_bracket: string
                    year: number
                    tax_year: number | null
                    currency: string
                    effective_tax_rate: number | null
                    marginal_tax_rate: number | null
                    metrics: Json
                    created_at: string
                }
                Insert: {
                    id?: string
                    person_country_code: string
                    percentile_bracket: string
                    year: number
                    tax_year?: number | null
                    currency: string
                    effective_tax_rate?: number | null
                    marginal_tax_rate?: number | null
                    metrics: Json
                    created_at?: string
                }
                Update: {
                    id?: string
                    person_country_code?: string
                    percentile_bracket?: string
                    year?: number
                    tax_year?: number | null
                    currency?: string
                    effective_tax_rate?: number | null
                    marginal_tax_rate?: number | null
                    metrics?: Json
                    created_at?: string
                }
            }
            profiles: {
                Row: {
                    id: string
                    email: string
                    full_name: string | null
                    avatar_url: string | null
                    privacy_mode: boolean
                    is_template: boolean
                    role: string
                    template_name: string | null
                    country_code: string | null
                    currency_code: string
                    created_at: string
                    benchmark_bracket: string | null
                    income_range_display: string | null
                }
                Insert: {
                    id: string
                    email: string
                    full_name?: string | null
                    avatar_url?: string | null
                    privacy_mode?: boolean
                    is_template?: boolean
                    role?: string
                    template_name?: string | null
                    country_code?: string | null
                    currency_code?: string
                    created_at?: string
                    benchmark_bracket?: string | null
                    income_range_display?: string | null
                }
                Update: {
                    id?: string
                    email?: string
                    full_name?: string | null
                    avatar_url?: string | null
                    privacy_mode?: boolean
                    is_template?: boolean
                    role?: string
                    template_name?: string | null
                    country_code?: string | null
                    currency_code?: string
                    created_at?: string
                    benchmark_bracket?: string | null
                    income_range_display?: string | null
                }
            }
            user_badges: {
                Row: {
                    user_id: string
                    badge_id: string
                    earned_at: string
                    metadata: Json | null
                }
                Insert: {
                    user_id: string
                    badge_id: string
                    earned_at?: string
                    metadata?: Json | null
                }
                Update: {
                    user_id?: string
                    badge_id?: string
                    earned_at?: string
                    metadata?: Json | null
                }
            }
            goals: {
                Row: {
                    id: string
                    user_id: string
                    name: string
                    target_amount: number
                    current_amount: number
                    start_amount: number
                    deadline: string | null
                    currency: string
                    category: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    name: string
                    target_amount: number
                    current_amount?: number
                    start_amount?: number
                    deadline?: string | null
                    currency?: string
                    category: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    name?: string
                    target_amount?: number
                    current_amount?: number
                    start_amount?: number
                    deadline?: string | null
                    currency?: string
                    category?: string
                    created_at?: string
                }
            }
            net_worth_history: {
                Row: {
                    id: string
                    user_id: string
                    date: string
                    total_assets: number
                    total_liabilities: number
                    net_worth: number
                }
                Insert: {
                    id?: string
                    user_id: string
                    date?: string
                    total_assets: number
                    total_liabilities: number
                    net_worth: number
                }
                Update: {
                    id?: string
                    user_id?: string
                    date?: string
                    total_assets?: number
                    total_liabilities?: number
                    net_worth?: number
                }
            }
            cash_flow_history: {
                Row: {
                    id: string
                    user_id: string
                    month: string
                    income: number
                    expenses: number
                    currency: string
                }
                Insert: {
                    id?: string
                    user_id: string
                    month: string
                    income?: number
                    expenses?: number
                    currency?: string
                }
                Update: {
                    id?: string
                    user_id?: string
                    month?: string
                    income?: number
                    expenses?: number
                    currency?: string
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
    }
}
