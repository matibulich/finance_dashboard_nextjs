"use client";
import Link from "next/link";

import { AtSymbolIcon, KeyIcon } from "@heroicons/react/24/outline";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { Button } from "@/app/(frontend)/ui/components/button";
import { loginUser } from "@/app/(backend)/actions/auth";
import { useActionState } from "react";
import { LoginState } from "@/app/(backend)/types/logState";
import { ThemeToggle } from "@/app/(frontend)/ui/theme-toggle";

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 shadow-sm transition-colors duration-200 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-100/10";

export default function LoginForm() {
  const initialState: LoginState = {
    success: false,
    message: "",
  };

  const [state, action, pending] = useActionState(loginUser, initialState);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <form action={action} className="w-full max-w-sm space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Iniciar sesion</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ingresa a tu dashboard financiero</p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                htmlFor="email"
              >
                Email
              </label>
              <div className="relative">
                <input
                  className={inputClass}
                  id="email"
                  type="email"
                  name="email"
                  placeholder="tu@email.com"
                  defaultValue={state.fields?.email}
                  required
                />
                <AtSymbolIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>
              {state.errors?.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {state.errors.email[0]}
                </p>
              )}
            </div>

            <div>
              <label
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                htmlFor="password"
              >
                Contraseña
              </label>
              <div className="relative">
                <input
                  className={inputClass}
                  id="password"
                  type="password"
                  name="password"
                  placeholder="Tu contraseña"
                  defaultValue={state.fields?.password}
                  required
                  minLength={6}
                />
                <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>
              {state.errors?.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {state.errors.password[0]}
                </p>
              )}
            </div>
          </div>

          {state.message && (
            <p className={`mt-4 text-sm ${state.success ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {state.message}
            </p>
          )}

          <Button type="submit" disabled={pending} className="mt-6 w-full">
            {pending ? "Ingresando..." : "Iniciar sesion"}
            <ArrowRightIcon className="ml-auto h-4 w-4" />
          </Button>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          No tienes cuenta?{" "}
          <Link href="/registro" className="font-medium text-slate-900 transition-colors duration-200 hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-300">
            Registrarse
          </Link>
        </p>
      </form>
    </div>
  );
}
