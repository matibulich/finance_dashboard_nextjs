import zod from "zod";

export const registerSchema = zod
    .object({
        name: zod.string().min(3, "El nombre debe tener al menos 3 caracteres").max(20, "El nombre no puede tener más de 20 caracteres"),
        email: zod.email("El correo electrónico no es válido"),
        password: zod.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
        confirmPassword: zod.string().min(6, "La confirmación de contraseña debe tener al menos 6 caracteres"),
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Las contraseñas no coinciden",
        path: ["confirmPassword"],
    });

export const loginSchema = zod.object({
    email: zod.email("El correo electrónico no es válido"),
    password: zod.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

export type RegisterData = zod.infer<typeof registerSchema>;
export type LoginData = zod.infer<typeof loginSchema>;

