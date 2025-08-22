import { SSE_HEADERS } from "./_nodes/config";
import { TranslationService } from "./_nodes/translation-service";

// Next.js API 라우트 설정
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const requestBody = await req.json().catch(() => ({}));
  
  const { readable, writable } = new TransformStream<Uint8Array>();
  const writer = writable.getWriter();
  const headers = new Headers(SSE_HEADERS);

  (async () => {
    const service = new TranslationService(writer);
    await service.processTranslationRequest(requestBody);
    await writer.close();
  })().catch(async (error) => {
    console.error("Unexpected error in translation service:", error);
    try {
      await writer.close();
    } catch {}
  });

  return new Response(readable, { headers });
}
