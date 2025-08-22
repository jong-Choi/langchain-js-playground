export * from "./base";
export * from "./supervisor";
export * from "./translator";

import { supervisorAgent } from "./supervisor";
import { translatorAgents } from "./translator";

export const agents = {
  supervisor: supervisorAgent,
  translators: translatorAgents,
} as const;

export function getTranslatorAgent(language: string) {
  switch (language) {
    case "english":
      return translatorAgents.english;
    case "korean":
      return translatorAgents.korean;
    case "chinese":
      return translatorAgents.chinese;
    default:
      throw new Error(`Unsupported language: ${language}`);
  }
}