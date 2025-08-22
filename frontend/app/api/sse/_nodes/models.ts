import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { z } from "zod";
import { AgentConfig, SupportedLanguage } from "./types";
import { createAgentConfig, MODEL_NAMES } from "./config";
import { SUPERVISOR_PROMPT, AGENT_PROMPTS } from "./prompts";

// Ollama 모델 생성 함수
export function createOllamaModel(config: AgentConfig): ChatOllama {
  return new ChatOllama({
    baseUrl: config.baseUrl,
    model: config.modelName,
    streaming: config.streaming,
  });
}

// 수퍼바이저 결정 스키마
const supervisorDecisionSchema = z.array(z.enum(["english", "korean", "chinese"]));

// 수퍼바이저 체인 생성 (구조화 출력 + 폴백)
export function createSupervisorChain() {
  const config = createAgentConfig(MODEL_NAMES.supervisor);
  const model = createOllamaModel(config);
  
  const structuredModel = model.withStructuredOutput(supervisorDecisionSchema, {
    name: "decide_languages",
  });
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", SUPERVISOR_PROMPT],
    ["user", "{input}"],
  ]);
  
  return {
    structured: prompt.pipe(structuredModel),
    fallback: prompt.pipe(model),
  };
}

// 특정 언어 번역 체인 생성
export function createTranslatorChain(language: SupportedLanguage) {
  const config = createAgentConfig(MODEL_NAMES.translator);
  const model = createOllamaModel(config);
  
  const prompt = ChatPromptTemplate.fromMessages([
    ["system", AGENT_PROMPTS[language]],
    ["user", "{input}"],
  ]);
  
  return prompt.pipe(model);
}

// 모든 번역 체인 생성 (편의 함수)
export function createAllTranslatorChains() {
  return {
    english: createTranslatorChain("english"),
    korean: createTranslatorChain("korean"),
    chinese: createTranslatorChain("chinese"),
  };
}