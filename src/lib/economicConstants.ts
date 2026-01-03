
// ============================================================================
// ECONOMIC TRUTH ENGINE - CONSTANTS LIBRARY
// ============================================================================
// Maintenance: Update this file Quarterly.
// Last Updated: Late 2024
//
// INSTRUCTIONS FOR UPDATE:
// 1. Click the links provided for each currency.
// 2. Find the "Headline" or "Average" rate for each category.
// 3. Update the value.
// ============================================================================

export const INTEREST_RATES = {
    // ------------------------------------------------------------------------
    // AUSTRALIA (AUD)
    // Sources:
    // - Cash Rate: https://www.rba.gov.au/
    // - Mortgage: https://www.rba.gov.au/statistics/tables/ (Look for 'Indicator Lending Rates - F5')
    // - Student Loan (HELP): https://www.ato.gov.au/rates/help,-tsl-and-sfss-indexation-rates/
    // - Credit Cards: https://www.rba.gov.au/statistics/tables/ (Look for 'Personal Lending Rates')
    // ------------------------------------------------------------------------
    AUD: {
        MORTGAGE: 6.20,      // Avg of discounted variable & 3yr fixed.
        STUDENT_LOAN: 4.00,  // HELP Indexation Rate (CPI linked).
        CREDIT_CARD: 20.99,  // Standard purchase rate (Big 4 avg).
        PERSONAL_LOAN: 14.50,// Unsecured personal loan avg.
        SAVINGS: 4.75,       // Bonus saver avg.
    },

    // ------------------------------------------------------------------------
    // UNITED KINGDOM (GBP)
    // Sources:
    // - Base Rate: https://www.bankofengland.co.uk/
    // - Mortgage: https://www.bankofengland.co.uk/statistics/visual-summaries/quoted-household-interest-rates
    // - Student Loan: https://www.gov.uk/repaying-your-student-loan/what-you-pay (Plan 2/5)
    // ------------------------------------------------------------------------
    GBP: {
        MORTGAGE: 4.75,      // Avg of 2yr/5yr Fixed.
        STUDENT_LOAN: 7.30,  // Plan 2 Cap (RPI + 3%).
        CREDIT_CARD: 23.50,  // Bank of England effective rate.
        PERSONAL_LOAN: 9.90, // Avg £7.5k-£15k loan.
        SAVINGS: 4.50,       // Top easy-access rate.
    },

    // ------------------------------------------------------------------------
    // UNITED STATES (USD)
    // Sources:
    // - Mortgage: https://www.freddiemac.com/pmms (Primary Mortgage Market Survey)
    // - Student Loan: https://studentaid.gov/understand-aid/types/loans/interest-rates
    // - Fed Rate: https://www.federalreserve.gov/releases/h15/
    // ------------------------------------------------------------------------
    USD: {
        MORTGAGE: 6.90,      // 30-Year Fixed (Freddie Mac).
        STUDENT_LOAN: 6.53,  // Direct Subsidized/Unsubsidized (Undergrad).
        CREDIT_CARD: 24.50,  // Commercial bank interest rate on credit card plans.
        PERSONAL_LOAN: 12.00,// 24-month personal loan.
        SAVINGS: 4.50,       // HYSA benchmark.
    },

    // ------------------------------------------------------------------------
    // PHILIPPINES (PHP)
    // Sources:
    // - Mortgage: Major Banks (BDO/BPI) typically 7-9% fixing.
    // - Credit Card: Capped at 3% per month (36% PA) by BSP.
    // - Savings: Digital Banks (Maya/CIMB/Seabank) ~4-6%.
    // ------------------------------------------------------------------------
    PHP: {
        MORTGAGE: 7.50,
        STUDENT_LOAN: 6.00,  // Often SSS/GSIS or school internal.
        CREDIT_CARD: 36.00,  // BSP Cap.
        PERSONAL_LOAN: 16.00,// Unsecured high risk.
        SAVINGS: 4.25,       // High interest digital bank avg.
    },

    // ------------------------------------------------------------------------
    // SOUTH KOREA (KRW)
    // Sources:
    // - Mortgage: BOK Base Rate + Spread ~5.0%
    // - Credit Card: Standard commercial ~15-18%
    // ------------------------------------------------------------------------
    KRW: {
        MORTGAGE: 5.00,
        STUDENT_LOAN: 3.50,
        CREDIT_CARD: 15.00,
        PERSONAL_LOAN: 8.00,
        SAVINGS: 3.50,
    },


    // ------------------------------------------------------------------------
    // JAPAN (JPY)
    // Sources:
    // - Mortgage: Ultra-low rates (Flat 35 ~1.5%, Variable ~0.3%) -> Avg 1.0%
    // - Student Loan: JASSO ~0.5% - 1.0%
    // ------------------------------------------------------------------------
    JPY: {
        MORTGAGE: 1.00,
        STUDENT_LOAN: 0.50,
        CREDIT_CARD: 15.00,
        PERSONAL_LOAN: 4.00,
        SAVINGS: 0.02, // Essentially zero
    },

    // ------------------------------------------------------------------------
    // CHINA (CNY)
    // Sources:
    // - PBOC LPR (Loan Prime Rate)
    // ------------------------------------------------------------------------
    CNY: {
        MORTGAGE: 3.95,      // 5-year LPR
        STUDENT_LOAN: 2.75,
        CREDIT_CARD: 18.00,
        PERSONAL_LOAN: 6.00,
        SAVINGS: 1.50,
    },

    // ------------------------------------------------------------------------
    // DEFAULT FALLBACK (Conservative Global Average)
    // ------------------------------------------------------------------------
    DEFAULT: {
        MORTGAGE: 4.50,
        STUDENT_LOAN: 3.50,
        CREDIT_CARD: 18.00,
        PERSONAL_LOAN: 10.00,
        SAVINGS: 3.00,
    }
} as const;

export type CurrencyKey = keyof typeof INTEREST_RATES;

export const getInterestRate = (currency: string, type: 'MORTGAGE' | 'STUDENT_LOAN' | 'CREDIT_CARD' | 'PERSONAL_LOAN' | 'SAVINGS'): number => {
    // Basic mapping for minor currencies to regions if needed, otherwise fallback
    const key = currency as CurrencyKey;
    const rates = INTEREST_RATES[key] || INTEREST_RATES.DEFAULT;
    return rates[type] || INTEREST_RATES.DEFAULT[type];
};
