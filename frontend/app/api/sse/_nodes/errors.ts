export class TranslationError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = "TranslationError";
  }
}

export class ValidationError extends TranslationError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}

export class ModelError extends TranslationError {
  constructor(message: string, public originalError?: Error) {
    super(message, "MODEL_ERROR");
    this.name = "ModelError";
  }
}

export class StreamingError extends TranslationError {
  constructor(message: string, public originalError?: Error) {
    super(message, "STREAMING_ERROR");
    this.name = "StreamingError";
  }
}

export function createUserFriendlyErrorMessage(error: unknown): string {
  if (error instanceof ValidationError) {
    return error.message;
  }
  
  if (error instanceof ModelError) {
    return "번역 모델에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
  
  if (error instanceof StreamingError) {
    return "스트리밍 중 오류가 발생했습니다. 연결을 확인해주세요.";
  }
  
  if (error instanceof TranslationError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    console.error("Unexpected error:", error);
    return "예상치 못한 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
  
  console.error("Unknown error:", error);
  return "알 수 없는 오류가 발생했습니다.";
}