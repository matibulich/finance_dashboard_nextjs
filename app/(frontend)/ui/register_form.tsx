"use client";
import Link from "next/link";

import { AtSymbolIcon, KeyIcon, UserIcon } from "@heroicons/react/24/outline";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { Button } from "@/app/(frontend)/ui/components/button";
import { useActionState } from "react";
import { registerUser } from "@/app/(backend)/actions/auth";
import { FormState } from "@/app/(backend)/types/formState";

export default function RegisterForm() {
  const initialState: FormState = {
    success: false,
    message: "",
  };

  const [state, action, pending] = useActionState(
    registerUser,
    initialState,
  );



  return (
    <form action={action} className="space-y-3" >
      <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
        <h1 className="mb-3 text-2xl">REGISTRO DE USAURIO</h1>
        <div className="w-full">
          <div>
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="name"
            >
              Nombre
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                id="name"
                type="text"
                name="name"
                placeholder="Ingrese su nombre completo"
                defaultValue={state.fields?.name}
                required
              />
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            {state.errors?.name && (
              <p className="mt-1 text-sm text-red-500">
                {state.errors.name[0]}
              </p>
            )}
          </div>
          <div>
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="email"
            >
              Email
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                id="email"
                type="email"
                name="email"
                placeholder="Ingrese su e-mail"
                defaultValue={state.fields?.email}
                required
              />
              <AtSymbolIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            {state.errors?.email && (
              <p className="mt-1 text-sm text-red-500">
                {state.errors.email[0]}
              </p>
            )}
          </div>
          <div className="mt-4">
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="password"
            >
              Password
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                id="password"
                type="password"
                name="password"
                placeholder="Crear contraseña"
                defaultValue={state.fields?.password}
                required
                minLength={6}
              />
              <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            {state.errors?.password && (
              <p className="mt-1 text-sm text-red-500">
                {state.errors.password[0]}
              </p>
            )}
          </div>
          <div className="mt-4">
            <label
              className="mb-3 mt-5 block text-xs font-medium text-gray-900"
              htmlFor="confirmPassword"
            >
              Confirmar contraseña
            </label>
            <div className="relative">
              <input
                className="peer block w-full rounded-md border border-gray-200 py-[9px] pl-10 text-sm outline-2 placeholder:text-gray-500"
                id="confirmPassword"
                type="password"
                name="confirmPassword"
                placeholder="Repita su contraseña"
                defaultValue={state.fields?.confirmPassword}
                required
                minLength={6}
              />
              <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
            </div>
            {state.errors?.confirmPassword && (
              <p className="mt-1 text-sm text-red-500">
                {state.errors.confirmPassword[0]}
              </p>
            )}
          </div>
        </div>

        <Button 
          type="submit"
          variant="outline" 
          className="mt-4 w-full" 
          disabled={pending}
        >
          {pending ? "Registrando..." : "Registrarme"}
          <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-800" />
        </Button>

        {/* MESSAGE */}

        {state.message && (
          <p
            className={`mt-4 text-sm ${
              state.success ? "text-green-500" : "text-red-500"
            }`}
          >
            {state.message}
          </p>
        )}

        <div className="mt-4 text-sm text-gray-600">
          ¿Ya tienes una cuenta?{" "}
          <Link href="/" className="font-medium text-gray-900 hover:text-black">
            Iniciar sesión
          </Link>
        </div>

        <div
          className="flex h-8 items-end space-x-1"
          aria-live="polite"
          aria-atomic="true"
        ></div>
      </div>
    </form>
  );
}
