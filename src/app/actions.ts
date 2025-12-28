'use server';

import { getMentorDebtAdvice, getMentorInvestmentAdvice, DebtAdviceContext, InvestmentAdviceContext } from "@/lib/mentorAdvice";

export async function generateDebtAdviceAction(
    mentorName: string,
    mentorArchetype: string,
    context: DebtAdviceContext
) {
    return await getMentorDebtAdvice(mentorName, mentorArchetype, context);
}

export async function generateInvestmentAdviceAction(
    mentorName: string,
    mentorArchetype: string,
    context: InvestmentAdviceContext
) {
    return await getMentorInvestmentAdvice(mentorName, mentorArchetype, context);
}
