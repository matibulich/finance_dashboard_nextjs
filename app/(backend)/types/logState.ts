import { LoginData } from "@/app/(backend)/validations/auth";


export type LoginState = {
  success: boolean;
  token_jwt?: string;
  message?: string;
  fields?:LoginData,
  errors?: {
    email?: string[];
    password?: string[];
  };
};