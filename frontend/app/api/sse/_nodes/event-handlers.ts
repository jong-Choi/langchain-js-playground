import { StreamEvent, AgentType } from "./types";
import {
  toSSELine,
  createAgentStartEvent,
  createAgentEndEvent,
  createChunkEvent,
  createFinalEvent,
  createEndEvent,
} from "./sse-utils";

// LangGraph 스트림 데이터 타입 정의
interface StreamChunk {
  chunk?: {
    content?: string;
  };
}

interface ModelOutputData {
  output?: {
    content?: string;
  };
  output_text?: string;
}

interface TaskCompletedPayload {
  translations?: Record<string, string>;
}

export interface StreamWriter {
  write(data: Uint8Array): Promise<void>;
}

// SSE 이벤트 처리 클래스
export class SSEEventHandler {
  constructor(private writer: StreamWriter) {}

  // 그래프 시작 처리 (초기 메시지는 이미 전송됨)
  async handleGraphStart(): Promise<void> {
    // 별도 처리 불필요
  }

  // 채팅 모델 시작 이벤트 처리
  async handleChatModelStart(nodeName: string): Promise<void> {
    if (!nodeName) return;
    
    const agentName = this.getAgentName(nodeName);
    const event = createAgentStartEvent({
      agent: agentName,
      message: "작업 시작",
    });
    
    await this.writer.write(toSSELine(event));
  }

  // 채팅 모델 스트림 데이터 처리
  async handleChatModelStream(streamData: StreamChunk): Promise<void> {
    const text = this.extractStreamText(streamData);
    if (text) {
      const event = createChunkEvent({ text });
      await this.writer.write(toSSELine(event));
    }
  }

  // 채팅 모델 완료 이벤트 처리
  async handleChatModelEnd(nodeName: string, eventData: ModelOutputData): Promise<void> {
    if (!nodeName) return;
    
    const outputText = this.extractOutputText(eventData);
    const agentName = this.getAgentName(nodeName);
    
    const event = createAgentEndEvent({
      agent: agentName,
      result: outputText,
    });
    
    await this.writer.write(toSSELine(event));
  }

  // 커스텀 이벤트 처리
  async handleCustomEvent(eventName: string, eventData: TaskCompletedPayload): Promise<void> {
    if (eventName === "task_completed") {
      const event = createFinalEvent({
        result: JSON.stringify(eventData?.translations ?? {}),
        messages: [], // 호출자가 채울 예정
      });
      
      await this.writer.write(toSSELine(event));
    }
  }

  // 그래프 완료 처리
  async handleGraphEnd(): Promise<void> {
    const event = createEndEvent("작업이 완료되었습니다.");
    await this.writer.write(toSSELine(event));
  }

  // 노드명을 에이전트명으로 변환
  private getAgentName(nodeName: string): AgentType {
    return nodeName === "supervisor_decide" ? "supervisor" : (nodeName as AgentType);
  }

  // 스트림 데이터에서 텍스트 추출
  private extractStreamText(data: StreamChunk): string {
    return data?.chunk?.content ?? "";
  }

  // 모델 출력에서 텍스트 추출
  private extractOutputText(data: ModelOutputData): string | undefined {
    return data?.output?.content ?? data?.output_text ?? undefined;
  }
}

export function getNodeName(event: StreamEvent): string | undefined {
  const metadata = event.metadata;
  if (metadata && typeof metadata === "object" && "langgraph_node" in metadata) {
    const node = metadata.langgraph_node;
    return typeof node === "string" ? node : undefined;
  }
  return undefined;
}