import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPublishedTemplates, getTemplateFullData } from './templateService';

// Define the mock object so it can be hoisted
const overrides = vi.hoisted(() => ({
    from: vi.fn()
}));

vi.mock('@/utils/supabase/client', () => ({
    createClient: () => ({
        from: overrides.from
    })
}));

// Helper to create a thennable object (Promise-like)
const createQueryBuilder = (result: any) => {
    return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue(result),
        then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject)
    };
};

describe('templateService', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should fetch published templates', async () => {
        const mockTemplates = [{ id: 't1', is_template: true, full_name: 'Template 1' }];

        // Setup "from" to return a builder that resolves to mockTemplates
        const builder = createQueryBuilder({ data: mockTemplates, error: null });
        overrides.from.mockReturnValue(builder);

        const result = await getPublishedTemplates();

        expect(result).toEqual(mockTemplates);
        expect(overrides.from).toHaveBeenCalledWith('profiles');
    });

    it('should fetch full template data', async () => {
        // Mock implementation on the hoisted spy
        overrides.from.mockImplementation((table: string) => {
            if (table === 'profiles') {
                return createQueryBuilder({ data: { id: 'p1' }, error: null });
            }
            if (table === 'assets') {
                return createQueryBuilder({ data: [{ id: 'a1', investment_details: { ticker: 'ABC' } }], error: null });
            }
            if (table === 'liabilities') {
                return createQueryBuilder({ data: [{ id: 'l1' }], error: null });
            }
            return createQueryBuilder({ data: [], error: null });
        });

        const data = await getTemplateFullData('t1');

        expect(data).toBeDefined();
        if (data) {
            expect(data.profile.id).toBe('p1');
            expect(data.assets.length).toBe(1);
            expect(data.assets[0].investment_details).toBeDefined();
            expect(data.liabilities.length).toBe(1);
        }
    });

    it('should return null if profile fetch fails', async () => {
        overrides.from.mockImplementation((table: string) => {
            if (table === 'profiles') {
                return createQueryBuilder({ data: null, error: { message: 'Not found' } });
            }
            return createQueryBuilder({ data: [], error: null });
        });

        const data = await getTemplateFullData('bad-id');
        expect(data).toBeNull();
    });
});
