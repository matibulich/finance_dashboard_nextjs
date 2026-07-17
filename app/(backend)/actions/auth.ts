"use server"

import {LoginData, RegisterData, registerSchema, loginSchema} from "@/app/(backend)/validations/auth";
import {registerUserService,} from "@/app/(backend)/lib/servicios/registerUserService";
import {loginUserService} from "@/app/(backend)/lib/servicios/loginUserService";
import {FormState} from "@/app/(backend)/types/formState";
import {cookies} from "next/headers";
import { LoginState } from "../types/logState";
import { redirect } from "next/navigation";

const configCookies= {
    httpOnly: true, //no accesible desde JavaScript
    secure: process.env.NODE_ENV === "production",//solo en HTTPS en producción
    sameSite: "lax" as const, //protección contra CSRF
    maxAge: 60 * 60 * 24 * 7, // 7 días
    path: "/",//toda la aplicación   
};   


export async function registerUser(prevState: FormState, formData: FormData):Promise<FormState> {
    //console.log("🔴 registerUser llamado");
    const fields = Object.fromEntries(formData.entries()) as RegisterData;
   // console.log("📝 Datos del formulario:", fields);
    const validation = registerSchema.safeParse(fields);

    if (!validation.success) {
        //console.log("❌ Validación fallida:", validation.error.flatten().fieldErrors);
        return {
            success: false,
            message: "Error de validación",
            fields,
            errors: validation.error.flatten().fieldErrors,
        };                      
    }


    try {
        //console.log("🟢 Llamando a registerUserService...");
      const response =  await registerUserService(fields);
        //console.log("✅ Usuario registrado exitosamente:", fields);

        // Guardar el token JWT en una cookie
        const cookieStore = await cookies();
        const jwtToken = response.token_jwt;
       
       // console.log("🔐 Token JWT guardado en cookie");

       if(!response.token_jwt){
        return {
            success: false,
            message: "Error al generar el token JWT",
        };
       }
      cookieStore.set("token", jwtToken, configCookies);
       return {
            success: true,
            message: `Registro exitoso`,                      
        };


      
    } catch (error) {
        //console.error("🔥 Error en registro:", error);
        return {
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Error interno del servidor",
            fields,
        }; 
    }

  


}

export async function loginUser(prevState: LoginState, formData: FormData):Promise<LoginState> {
    const fields = Object.fromEntries(formData.entries()) as LoginData;

    const validation =loginSchema.safeParse(fields);
    if (!validation.success) {
        return {
            success: false,
            message: "Error de validación",
            fields,
            errors: validation.error.flatten().fieldErrors,
           
        };                      
    }

    try {
        const response = await loginUserService(fields);
        if (!response.token_jwt) {
            return {
                success: false,
                message: "Error al generar el token JWT",
                fields,
                errors: {
                    email: ["Credenciales inválidas"],
                    password: ["Credenciales inválidas"],
                },
            };
        }
        const cookieStore = await cookies();

        cookieStore.set(
        "token",
        response.token_jwt,
        configCookies
    );

           

    } catch (error) {
        return {
            success: false,
            message:
                error instanceof Error
                    ? error.message
                    : "Error interno del servidor",
            fields,
        };
    }
    redirect("/dashboard");

}

export async function logoutUser(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete("token");
    redirect("/");
}