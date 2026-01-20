import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
    workspaceId?: string;
    workspaceRole?: "OWNER" | "ADMIN" | "MEMBER" | "VIEWER";
  }
}

export {};
