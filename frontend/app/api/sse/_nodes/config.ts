import { AgentConfig } from "./types";

// 지원되는 언어 타입
export type SupportedLanguage = "english" | "korean" | "chinese";

// Next.js 앱 설정
export const APP_CONFIG = {
  runtime: "nodejs" as const,
  dynamic: "force-dynamic" as const,
} as const;

// LLM 모델명 설정
export const MODEL_NAMES = {
  supervisor: "hf.co/mradermacher/HyperCLOVAX-SEED-Text-Instruct-0.5B-hf-i1-GGUF:Q4_K_M" as const,
  translator: process.env.TRANSLATOR_MODEL_NAME || 
    "hf.co/mradermacher/HyperCLOVAX-SEED-Text-Instruct-0.5B-hf-i1-GGUF:Q4_K_M" as const,
} as const;

// Ollama 서버 설정
export const OLLAMA_CONFIG = {
  baseUrl: process.env.ORACLE_OLLAMA_HOST || "http://localhost:11434",
  streaming: true,
} as const;

// 에이전트 설정 생성 함수
export function createAgentConfig(modelName: string): AgentConfig {
  return {
    modelName,
    baseUrl: OLLAMA_CONFIG.baseUrl,
    streaming: OLLAMA_CONFIG.streaming,
  };
}

// SSE 응답 헤더
export const SSE_HEADERS = {
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "Connection": "keep-alive",
} as const;

// 기본 언어 설정
export const DEFAULT_LANGUAGE = "english" as const;

// 지원 언어 목록
export const SUPPORTED_LANGUAGES = ["english", "korean", "chinese"] as const;