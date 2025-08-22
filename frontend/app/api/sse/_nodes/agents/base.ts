import { AppState, AgentResponse, SupportedLanguage } from "../types";
import type { BaseMessage } from "@langchain/core/messages";

// 에이전트 기본 인터페이스
export interface BaseAgent {
  execute(state: AppState): Promise<AgentResponse>;
}

// 언어 결정 에이전트 인터페이스
export interface SupervisorAgent extends BaseAgent {
  execute(state: AppState): Promise<{ langs: SupportedLanguage[] }>;
}

// 번역 에이전트 인터페이스
export interface TranslatorAgent extends BaseAgent {
  language: SupportedLanguage;
  execute(state: AppState): Promise<{ translations: Record<string, string> }>;
}

// 에이전트 기본 구현 클래스
export abstract class BaseAgentImpl implements BaseAgent {
  abstract execute(state: AppState): Promise<AgentResponse>;
  
  // 마지막 메시지 내용 추출
  protected getLastMessageContent(state: AppState): string {
    const content = state.messages?.at(-1)?.content;
    return typeof content === "string" ? content : "";
  }
  
  // LLM 응답에서 텍스트 내용 추출
  protected extractContentFromResponse(response: BaseMessage | { content?: unknown }): string {
    const content = response?.content;
    return typeof content === "string" ? content : "";
  }
}