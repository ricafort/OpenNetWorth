
export const CURRENCY_MULTIPLIER: Record<string, number> = {
    USD: 1,
    AUD: 1.5,
    PHP: 55
};

export function scaleAmount(amount: number, currency: string) {
    return Math.round(amount * (CURRENCY_MULTIPLIER[currency] ?? 1));
}
