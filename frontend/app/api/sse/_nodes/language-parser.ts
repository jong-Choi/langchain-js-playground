import { SupportedLanguage, DEFAULT_LANGUAGE } from "./config";

// 언어 문자열을 표준 언어 타입으로 변환
export function normalizeLang(value: unknown): SupportedLanguage | undefined {
  if (typeof value !== "string") return undefined;
  
  const normalized = value.trim().toLowerCase();
  
  if (normalized.includes("english") || normalized === "en") return "english";
  if (normalized.includes("korean") || normalized === "ko") return "korean";
  if (normalized.includes("chinese") || normalized === "zh" || 
      normalized.includes("chinese (simplified)")) return "chinese";
  
  return undefined;
}

// 배열에서 언어 목록 파싱
export function parseLanguagesFromArray(raw: unknown[]): SupportedLanguage[] {
  const result = new Set<SupportedLanguage>();
  
  for (const item of raw) {
    const lang = normalizeLang(String(item));
    if (lang) result.add(lang);
  }
  
  return Array.from(result);
}

// 객체에서 언어 목록 파싱
export function parseLanguagesFromObject(raw: Record<string, unknown>): SupportedLanguage[] {
  const result = new Set<SupportedLanguage>();
  const addLang = (value: unknown) => {
    const lang = normalizeLang(value);
    if (lang) result.add(lang);
  };

  if (typeof raw.language === "string") addLang(raw.language);
  if (typeof raw.result === "string") addLang(raw.result);
  
  if (raw.arguments && typeof raw.arguments === "object") {
    const args = raw.arguments as Record<string, unknown>;
    if (typeof args.language === "string") addLang(args.language);
  }
  
  return Array.from(result);
}

// 문자열에서 언어 목록 파싱
export function parseLanguagesFromString(raw: string): SupportedLanguage[] {
  const result = new Set<SupportedLanguage>();
  const trimmed = raw.trim();
  
  // JSON 파싱 시도
  try {
    const parsed = JSON.parse(trimmed);
    return parseLanguagesFromUnknown(parsed);
  } catch {
    // 텍스트 파싱 계속
  }
  
  // Extract array-like patterns: [english, korean]
  const arrayMatch = trimmed.match(/\[([\s\S]*?)\]/);
  if (arrayMatch) {
    const inner = arrayMatch[1];
    const parts = inner.split(/[\s,\"']+/).filter(Boolean);
    
    for (const part of parts) {
      const lang = normalizeLang(part);
      if (lang) result.add(lang);
    }
    
    if (result.size > 0) return Array.from(result);
  }
  
  // Direct text matching
  if (/english/i.test(trimmed)) result.add("english");
  if (/korean/i.test(trimmed)) result.add("korean");
  if (/chinese/i.test(trimmed)) result.add("chinese");
  
  return Array.from(result);
}

// 알 수 없는 타입에서 언어 목록 파싱 (메인 파싱 함수)
export function parseLanguagesFromUnknown(raw: unknown): SupportedLanguage[] {
  if (Array.isArray(raw)) {
    const langs = parseLanguagesFromArray(raw);
    return langs.length > 0 ? langs : [DEFAULT_LANGUAGE];
  }
  
  if (typeof raw === "object" && raw !== null) {
    const langs = parseLanguagesFromObject(raw as Record<string, unknown>);
    return langs.length > 0 ? langs : [DEFAULT_LANGUAGE];
  }
  
  if (typeof raw === "string") {
    const langs = parseLanguagesFromString(raw);
    return langs.length > 0 ? langs : [DEFAULT_LANGUAGE];
  }
  
  return [DEFAULT_LANGUAGE];
}

// 언어 배열 유효성 검증 및 중복 제거
export function validateLanguages(langs: unknown[]): SupportedLanguage[] {
  if (!Array.isArray(langs)) return [DEFAULT_LANGUAGE];
  
  const validLangs = langs
    .map(normalizeLang)
    .filter((lang): lang is SupportedLanguage => lang !== undefined)
    .filter((lang, index, array) => array.indexOf(lang) === index); // Remove duplicates
    
  return validLangs.length > 0 ? validLangs : [DEFAULT_LANGUAGE];
}