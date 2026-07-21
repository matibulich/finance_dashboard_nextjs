import { NextResponse } from "next/server";
import { MEPRate } from "@/app/(backend)/types/portfolio";

export async function GET() {
  try {
    const res = await fetch("https://dolarapi.com/v1/dolares", {
      next: { revalidate: 120 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Error al obtener cotizaciones" },
        { status: 502 }
      );
    }

    const data = await res.json();
    const mep = data.find((d: { casa: string }) => d.casa === "bolsa");

    if (!mep) {
      return NextResponse.json(
        { error: "No se encontró cotización MEP" },
        { status: 502 }
      );
    }

    const result: MEPRate = {
      compra: mep.compra,
      venta: mep.venta,
      fechaActualizacion: mep.fechaActualizacion,
    };

    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, max-age=120, s-maxage=120" },
    });
  } catch {
    return NextResponse.json(
      { error: "Error al conectar con DolarApi" },
      { status: 502 }
    );
  }
}
