import bcrypt from 'bcrypt';

import prisma from '@/app/(backend)/lib/prisma';

import {RegisterData} from "@/app/(backend)/validations/auth";

import jwt from 'jsonwebtoken';


export async function registerUserService(input: RegisterData) {
  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  })

  if (existingUser) {
    throw new Error('El correo ya está registrado');
  }

  if (input.password !== input.confirmPassword) {
    throw new Error('Las contraseñas no coinciden');
  }

  const hashedPassword = await bcrypt.hash(input.password, 10 );

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
