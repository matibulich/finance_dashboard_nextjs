

import { LoginData } from "@/app/(backend)/validations/auth";
import prisma from "@/app/(backend)/lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function loginUserService(input:LoginData) {

    const user = await prisma.user.findUnique({
        where: { email: input.email },
    });

    if(!user) {
        throw new Error('Usuario no encontrado');
    }
    
    const passwordMatch = await bcrypt.compare(input.password, user.password);

    if (!passwordMatch) {
        throw new Error('Contraseña incorrecta');
    }

     const token_jwt = jwt.sign(
    {
      userId: user.id,
      email: user.email,
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: "7d",
    }
  );
    

    return {
  success: true,
  token_jwt,
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
  },
};

}