"use client";
import Link from "next/link";

import { AtSymbolIcon, KeyIcon, UserIcon } from "@heroicons/react/24/outline";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import { Button } from "@/app/(frontend)/ui/components/button";
import { useActionState } from "react";
import { registerUser } from "@/app/(backend)/actions/auth";
import { FormState } from "@/app/(backend)/types/formState";
import { ThemeToggle } from "@/app/(frontend)/ui/theme-toggle";

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 shadow-sm transition-colors duration-200 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-500 dark:focus:ring-slate-100/10";

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <form action={action} className="w-full max-w-sm space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Crear cuenta</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Registra tu acceso al dashboard</p>
          </div>

          <div className="space-y-4">
            <div>
              <label
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                htmlFor="name"
              >
                Nombre
              </label>
              <div className="relative">
                <input
                  className={inputClass}
                  id="name"
                  type="text"
                  name="name"
                  placeholder="Tu nombre completo"
                  defaultValue={state.fields?.name}
                  required
                />
                <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>
              {state.errors?.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {state.errors.name[0]}
                </p>
              )}
            </div>

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
                  placeholder="Minimo 6 caracteres"
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

            <div>
              <label
                className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                htmlFor="confirmPassword"
              >
                Confirmar contraseña
              </label>
              <div className="relative">
                <input
                  className={inputClass}
                  id="confirmPassword"
                  type="password"
                  name="confirmPassword"
                  placeholder="Repite tu contraseña"
                  defaultValue={state.fields?.confirmPassword}
                  required
                  minLength={6}
                />
                <KeyIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              </div>
              {state.errors?.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {state.errors.confirmPassword[0]}
                </p>
              )}
            </div>
          </div>

          {state.message && (
            <p className={`mt-4 text-sm ${state.success ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {state.message}
            </p>
          )}

          <Button
            type="submit"
            className="mt-6 w-full"
            disabled={pending}
          >
            {pending ? "Registrando..." : "Crear cuenta"}
            <ArrowRightIcon className="ml-auto h-4 w-4" />
          </Button>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Ya tienes una cuenta?{" "}
          <Link href="/" className="font-medium text-slate-900 transition-colors duration-200 hover:text-slate-700 dark:text-slate-100 dark:hover:text-slate-300">
            Iniciar sesion
          </Link>
        </p>
      </form>
    </div>
  );
}
