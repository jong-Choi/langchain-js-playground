import type { BaseMessage } from "@langchain/core/messages";
import type { SupportedLanguage } from "./config";

// 다른 파일에서 사용할 수 있도록 re-export
export type { SupportedLanguage };

export interface SSEEvent {
  type: string;
  data: unknown;
}

export interface TranslationResult {
  translations: Record<SupportedLanguage, string>;
  originalMessage: string;
}

export interface AgentConfig {
  modelName: string;
  baseUrl: string;
  streaming: boolean;
}

export interface AppState {
  messages: BaseMessage[];
  langs: SupportedLanguage[];
  translations: Record<string, string>;
}

export interface AgentResponse {
  translations?: Partial<Record<SupportedLanguage, string>>;
  langs?: SupportedLanguage[];
}

export interface StreamEvent {
  event: string;
  data?: unknown;
  metadata?: {
    langgraph_node?: string;
  };
}

export interface TaskCompletedEvent {
  translations: Record<string, string>;
}

export type AgentType = "supervisor" | SupportedLanguage;

export interface AgentStartEvent {
  agent: AgentType;
  message: string;
}

export interface AgentEndEvent {
  agent: AgentType;
  result?: string;
}

export interface ChunkEvent {
  text: string;
}

export interface ErrorEvent {
  error: string;
}

export interface FinalEvent {
  result: string;
  messages: Array<{ role: string; content: string }>;
}