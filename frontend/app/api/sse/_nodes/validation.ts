import { ValidationError } from "./errors";

export interface TranslationRequest {
  message: string;
}

export function validateRequest(body: unknown): TranslationRequest {
  if (!body || typeof body !== "object") {
    throw new ValidationError("잘못된 요청 형식입니다.");
  }

  const { message } = body as { message?: unknown };

  if (!message || typeof message !== "string") {
    throw new ValidationError("메시지가 필요합니다.");
  }

  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    throw new ValidationError("메시지가 비어있습니다.");
  }

  if (trimmedMessage.length > 10000) {
    throw new ValidationError("메시지가 너무 깁니다. 10,000자 이하로 입력해주세요.");
  }

  return { message: trimmedMessage };
}

export function createMessageInput(message: string) {
  return [{ role: "user", content: message }] as Array<{
    role: string;
    content: string;
  }>;
}