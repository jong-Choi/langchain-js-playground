import { TranslatorAgent, BaseAgentImpl } from "./base";
import { AppState, SupportedLanguage } from "../types";
import { createTranslatorChain } from "../models";
import { ModelError } from "../errors";

export class TranslatorAgentImpl extends BaseAgentImpl implements TranslatorAgent {
  public readonly language: SupportedLanguage;
  private chain;

  constructor(language: SupportedLanguage) {
    super();
    this.language = language;
    this.chain = createTranslatorChain(language);
  }

  async execute(state: AppState): Promise<{ translations: Record<string, string> }> {
    const input = this.getLastMessageContent(state);
    
    if (!input.trim()) {
      throw new ModelError("번역할 메시지가 비어있습니다.");
    }
    
    try {
      const result = await this.chain.invoke({ input });
      const content = this.extractContentFromResponse(result);
      
      if (!content.trim()) {
        throw new ModelError(`${this.language} 번역 결과가 비어있습니다.`);
      }
      
      return {
        translations: {
          ...state.translations,
          [this.language]: content.trim(),
        },
      };
    } catch (error) {
      console.error(`Translation failed for ${this.language}:`, error);
      throw new ModelError(
        `${this.language} 번역에 실패했습니다.`,
        error instanceof Error ? error : undefined
      );
    }
  }
}

export const translatorAgents = {
  english: new TranslatorAgentImpl("english"),
  korean: new TranslatorAgentImpl("korean"),
  chinese: new TranslatorAgentImpl("chinese"),
} as const;