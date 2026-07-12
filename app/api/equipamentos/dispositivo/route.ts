import { NextRequest, NextResponse } from "next/server";
import { FlashmanApiError, fetchDeviceByExternalReference, fetchDeviceBySerial } from "@/lib/flashmanApi";
import { sanitizeDevice } from "@/lib/sanitizeDevice";

/**
 * Busca um único dispositivo por serial TR-069 ou por contrato
 * (`external_reference.data`). Proxy direto (sem cache — é uma consulta
 * pontual, não a varredura pesada de /api/equipamentos) que sanitiza a
 * resposta antes de devolver (lib/sanitizeDevice.ts remove credenciais do
 * documento bruto).
 */
export async function GET(request: NextRequest) {
  const serial = request.nextUrl.searchParams.get("serial")?.trim();
  const contract = request.nextUrl.searchParams.get("contract")?.trim();

  if (!serial && !contract) {
    return NextResponse.json({ error: "Informe o parâmetro serial ou contract." }, { status: 400 });
  }

  try {
    const raw = serial ? await fetchDeviceBySerial(serial) : await fetchDeviceByExternalReference(contract!);
    if (!raw) {
      const label = serial ? "esse serial" : "esse contrato";
      return NextResponse.json({ error: `Nenhum dispositivo encontrado com ${label}.` }, { status: 404 });
    }
    return NextResponse.json(sanitizeDevice(raw));
  } catch (error) {
    const status = error instanceof FlashmanApiError ? 502 : 500;
    const message = error instanceof Error ? error.message : "Erro desconhecido ao consultar dispositivo.";
    return NextResponse.json({ error: message }, { status });
  }
}
