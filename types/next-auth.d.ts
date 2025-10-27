import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    role?: string
    department?: string
  }

  interface Session {
    user: {
      id: string
      role: string
      department: string
    } & DefaultSession["user"]
  }
}