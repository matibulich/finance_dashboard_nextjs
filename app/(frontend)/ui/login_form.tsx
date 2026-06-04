"use client";
import Link from "next/link";

import { AtSymbolIcon, KeyIcon } from "@heroicons/react/24/outline";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { Button } from "@/app/(frontend)/ui/components/button";
import { loginUser } from "@/app/(backend)/actions/auth";
import { useActionState } from "react";
import { LoginState } from "@/app/(backend)/types/logState";

export default function LoginForm() {
  const initialState: LoginState = {
    success: false,
    message: "",
  };

  const [state, action, pending] = useActionState(loginUser, initialState);

  return (
    <form action={action} className="space-y-3">
      <div className="flex-1 rounded-lg bg-gray-50 px-6 pb-4 pt-8">
        <h1 className="mb-3 text-2xl">LOGIN DASHBOARD</h1>
        <div className="w-full">
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

              {state.errors?.email && (
                <p className="mt-1 text-sm text-red-500">
                  {state.errors.email[0]}
                </p>
              )}
            </div>
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
                placeholder="Ingrese su contraseña"
                defaultValue={state.fields?.password}
                required
                minLength={6}
              />
              <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-gray-500 peer-focus:text-gray-900" />
              
              {state.errors?.password && (
                <p className="mt-1 text-sm text-red-500">
                  {state.errors.password[0]}
                </p>
              )}

            </div>
          </div>
        </div>

       
          <Button type="submit" disabled={pending} variant="outline" className="mt-4 w-full">

            {pending ? "Ingresando..." : "Log in"}

         <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-800" />
          </Button>


        {state.message && (
          <p
            className={`mt-4 text-sm ${
              state.success ? "text-green-500" : "text-red-500"
            }`}
          >
            {state.message}
          </p>
        )}
       
        <p className="ml-auto mt-4 text-sm text-gray-600">
        
          Si no tienes cuenta...
        </p>
        <Link href="/registro">
          <Button
            variant="outline"
            className="mt-1 w-full bg-blue-500 text-white hover:bg-blue-500"
          >
            Registrarse
            <ArrowRightIcon className="ml-auto h-5 w-5 text-gray-800" />
          </Button>
        </Link>
        <div
          className="flex h-8 items-end space-x-1"
          aria-live="polite"
          aria-atomic="true"
        ></div>
      </div>
    </form>
  );
}
