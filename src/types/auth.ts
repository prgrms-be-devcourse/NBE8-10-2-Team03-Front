export interface Me {
    id: number;
    email?: string;
    nickname?: string;
    // Add other fields as needed
}

export type AuthStatus = "checking" | "authed" | "guest";
