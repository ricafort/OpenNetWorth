export interface Mentor {
    id: string;
    name: string;
    archetype: string;
    description: string;
    avatar: string;
    quote: string;
}

export interface MentorInteraction {
    id: string;
    user_id: string;
    mentor_id: string;
    message: string;
    role: 'user' | 'mentor';
    mode: 'learn' | 'reflect';
    created_at: string;
}
