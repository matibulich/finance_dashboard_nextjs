import { RegisterData } from "../validations/auth";




export type FormState = {
  success?: boolean;
  message?: string;
  fields?:RegisterData,
  
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
  };
}