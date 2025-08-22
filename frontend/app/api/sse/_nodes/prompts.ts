import type { SupportedLanguage } from "./config";

export const SUPERVISOR_PROMPT = `역할: 번역 작업 슈퍼바이저
목표: 사용자 입력을 분석하여 필요한 번역 타깃 언어를 선택한다.

응답 형식:
- 반드시 JSON이 아닌 "텍스트 단일 라인"으로만,
- 정확히 다음 타입의 배열만 출력:
  Array<"english" | "korean" | "chinese">
- 그 외 설명/부가 텍스트 금지.

선택 규칙:
- 사용자가 특정 언어를 지정하면 해당 언어만 선택.
- 다수 언어 지정 시 지정된 언어만 포함.
- 지정이 없으면 ["english"] 기본값.
- 중국어는 간체 기준으로 "chinese"만 사용.`;

const AGENT_PROMPT_COMMON = `역할: 단일 언어 번역기
지침:
- 입력의 의미·용어·숫자·코드 블록을 보존하되 대상 언어로 자연스럽고 정확하게 번역.
- 출력은 번역문 "한 줄"만. 접두사/설명/메타데이터 금지.
- 형식화된 코드/마크다운/URL 유지.
- 고유명사는 대상 언어 관례에 맞추어 표기(존재 시).
- 중복 공백 제거.`;

export const ENGLISH_AGENT_PROMPT = `${AGENT_PROMPT_COMMON}
대상 언어: English
출력: 영어 번역문만 한 줄
금지: 원문 반복, 추가 설명`;

export const KOREAN_AGENT_PROMPT = `${AGENT_PROMPT_COMMON}
대상 언어: Korean
출력: 한국어 번역문만 한 줄
금지: 원문 반복, 추가 설명`;

export const CHINESE_AGENT_PROMPT = `${AGENT_PROMPT_COMMON}
대상 언어: Chinese (Simplified)
출력: 중국어(간체) 번역문만 한 줄
금지: 원문 반복, 추가 설명`;

export const AGENT_PROMPTS: Record<SupportedLanguage, string> = {
  english: ENGLISH_AGENT_PROMPT,
  korean: KOREAN_AGENT_PROMPT,
  chinese: CHINESE_AGENT_PROMPT,
};