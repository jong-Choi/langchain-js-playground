import { SupervisorAgent, BaseAgentImpl } from "./base";
import { AppState, SupportedLanguage } from "../types";
import { createSupervisorChain } from "../models";
import { parseLanguagesFromUnknown, validateLanguages } from "../language-parser";
import { ModelError } from "../errors";

export class SupervisorAgentImpl extends BaseAgentImpl implements SupervisorAgent {
  private supervisorChain;
  private fallbackChain;

  constructor() {
    super();
    const chains = createSupervisorChain();
    this.supervisorChain = chains.structured;
    this.fallbackChain = chains.fallback;
  }

  async execute(state: AppState): Promise<{ langs: SupportedLanguage[] }> {
    const input = this.getLastMessageContent(state);
    
    if (!input.trim()) {
      throw new ModelError("입력 메시지가 비어있습니다.");
    }
    
    try {
      // Try structured output first
      const structuredResult = await this.supervisorChain.invoke({ input });
      
      if (Array.isArray(structuredResult)) {
        const validatedLangs = validateLanguages(structuredResult);
        return { langs: validatedLangs };
      }
    } catch (error) {
      console.warn("Structured output failed, falling back to text parsing:", error);
    }
    
    // Fallback to text parsing
    try {
      const fallbackResult = await this.fallbackChain.invoke({ input });
      const content = this.extractContentFromResponse(fallbackResult);
      const parsedLangs = parseLanguagesFromUnknown(content);
      
      return { langs: parsedLangs };
    } catch (error) {
      console.error("Both supervisor chains failed:", error);
      throw new ModelError(
        "언어 분석에 실패했습니다.",
        error instanceof Error ? error : undefined
      );
    }
  }
}

export const supervisorAgent = new SupervisorAgentImpl();