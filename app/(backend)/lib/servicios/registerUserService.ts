import bcrypt from 'bcrypt';

import prisma from '@/app/(backend)/lib/prisma';

import {RegisterData} from "@/app/(backend)/validations/auth";

import jwt from 'jsonwebtoken';


export async function registerUserService(input: RegisterData) {
  //console.log("🔵 registerUserService iniciado");
  
  
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  })

  if (existingUser) {
   // console.log("⚠️ Usuario ya existe:", input.email);
    throw new Error('El correo ya está registrado');
  }

  if (input.password !== input.confirmPassword) {
    //console.log("⚠️ Las contraseñas no coinciden");
    throw new Error('Las contraseñas no coinciden');
  }

  const hashedPassword = await bcrypt.hash(input.password, 10 );
  //console.log("🔐 Contraseña hasheada");

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      password: hashedPassword,
    },
  });

const token_jwt = jwt.sign(
    { userId: user.id, email: user.email },
    process.env.JWT_SECRET!,
    { expiresIn: '7d' }
  );


  //console.log("✨ Usuario creado:", user.id);
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
