export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    roles?: string[];
    avatar?: string | null;
    avatar_url?: string | null;
    phone?: string | null;
    telegram_id?: string | null;
    nip?: string | null;
    address?: string | null;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
    };
};
