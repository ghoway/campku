import type { RoleCode } from "@/shared/constants";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: RoleCode;
  status: string;
}

export type Variables = {
  user: AuthUser;
  requestId: string;
  validated?: any;
};

// Re-export Context type helper
export type AppContext = import("hono").Context<{ Variables: Variables }>;
