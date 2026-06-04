import prisma from "@/app/(backend)/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {


    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
        redirect("/");
    }

    return (
        <section>
            <h1>Dashboard</h1>

            <h2 className="text-lg font-medium text-gray-900">Bienvenido</h2>

            </section>
       
    );

}