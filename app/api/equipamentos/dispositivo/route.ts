import { NextRequest, NextResponse } from "next/server";
import { FlashmanApiError, fetchDeviceBySerial } from "@/lib/flashmanApi";
import { sanitizeDevice } from "@/lib/sanitizeDevice";

/**
 * Busca um único dispositivo pelo serial TR-069. Proxy direto (sem cache —
 * é uma consulta pontual, não a varredura pesada de /api/equipamentos) que
 * sanitiza a resposta antes de devolver (lib/sanitizeDevice.ts remove
 * credenciais do documento bruto).
 */
export async function GET(request: NextRequest) {
  const serial = request.nextUrl.searchParams.get("serial")?.trim();

  if (!serial) {
    return NextResponse.json({ error: "Parâmetro serial é obrigatório." }, { status: 400 });
  }

  try {
    const raw = await fetchDeviceBySerial(serial);
    if (!raw) {
      return NextResponse.json({ error: "Nenhum dispositivo encontrado com esse serial." }, { status: 404 });
    }
    return NextResponse.json(sanitizeDevice(raw));
  } catch (error) {
    const status = error instanceof FlashmanApiError ? 502 : 500;
    const message = error instanceof Error ? error.message : "Erro desconhecido ao consultar dispositivo.";
    return NextResponse.json({ error: message }, { status });
  }
}
