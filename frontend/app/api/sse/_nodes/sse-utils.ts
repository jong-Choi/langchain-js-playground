import { 
  SSEEvent, 
  AgentStartEvent, 
  AgentEndEvent, 
  ChunkEvent, 
  ErrorEvent, 
  FinalEvent,
} from "./types";

const encoder = new TextEncoder();

// SSE 이벤트를 문자열로 변환
export function toSSELine(event: SSEEvent): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`);
}

// 시작 이벤트 생성
export function createStartEvent(message: string): SSEEvent {
  return { type: "start", data: { message } };
}

// 에이전트 시작 이벤트 생성
export function createAgentStartEvent(data: AgentStartEvent): SSEEvent {
  return { type: "agent_start", data };
}

// 에이전트 완료 이벤트 생성
export function createAgentEndEvent(data: AgentEndEvent): SSEEvent {
  return { type: "agent_end", data };
}

// 텍스트 청크 이벤트 생성
export function createChunkEvent(data: ChunkEvent): SSEEvent {
  return { type: "chunk", data };
}

// 에러 이벤트 생성
export function createErrorEvent(data: ErrorEvent): SSEEvent {
  return { type: "error", data };
}

// 최종 결과 이벤트 생성
export function createFinalEvent(data: FinalEvent): SSEEvent {
  return { type: "final", data };
}

// 종료 이벤트 생성
export function createEndEvent(message: string): SSEEvent {
  return { type: "end", data: { message } };
}