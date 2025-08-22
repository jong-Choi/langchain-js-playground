import { translationGraph } from "./graph-builder";
import { SSEEventHandler, StreamWriter, getNodeName } from "./event-handlers";
import { toSSELine, createStartEvent, createErrorEvent } from "./sse-utils";
import { validateRequest, createMessageInput } from "./validation";
import { createUserFriendlyErrorMessage, StreamingError } from "./errors";

// LangGraph 이벤트 타입 정의
interface LangGraphEvent {
  event: string;
  name?: string;
  data?: unknown;
}

interface MessageInput {
  role: string;
  content: string;
}

interface TaskCompletedData {
  translations?: Record<string, string>;
}

// 번역 서비스 클래스
export class TranslationService {
  private eventHandler: SSEEventHandler;

  constructor(private writer: StreamWriter) {
    this.eventHandler = new SSEEventHandler(writer);
  }

  // 번역 요청 처리
  async processTranslationRequest(requestBody: unknown): Promise<void> {
    try {
      const request = validateRequest(requestBody);
      await this.executeTranslation(request.message);
    } catch (error) {
      const errorMessage = createUserFriendlyErrorMessage(error);
      await this.handleError(errorMessage);
    }
  }

  // 번역 실행
  private async executeTranslation(message: string): Promise<void> {
    try {
      await this.writer.write(toSSELine(createStartEvent("번역 작업을 시작합니다.")));
      
      const inputs = createMessageInput(message);
      
      for await (const event of translationGraph.streamEvents(
        { messages: inputs },
        { version: "v2" }
      )) {
        await this.handleStreamEvent(event as LangGraphEvent, inputs);
      }
    } catch (error) {
      throw new StreamingError(
        "스트리밍 중 오류가 발생했습니다.",
        error instanceof Error ? error : undefined
      );
    }
  }

  // 스트림 이벤트 처리
  private async handleStreamEvent(event: LangGraphEvent, inputs: MessageInput[]): Promise<void> {
    const nodeName = getNodeName(event);

    switch (event.event) {
      case "on_graph_start":
        await this.eventHandler.handleGraphStart();
        break;

      case "on_chat_model_start":
        if (nodeName) {
          await this.eventHandler.handleChatModelStart(nodeName);
        }
        break;

      case "on_chat_model_stream":
        await this.eventHandler.handleChatModelStream(event.data as { chunk?: { content?: string } });
        break;

      case "on_chat_model_end":
        if (nodeName) {
          await this.eventHandler.handleChatModelEnd(nodeName, event.data as { output?: { content?: string }; output_text?: string });
        }
        break;

      case "on_custom_event":
        if (event.name === "task_completed") {
          await this.handleTaskCompleted(event.data as TaskCompletedData, inputs);
        }
        break;

      case "on_graph_end":
        await this.eventHandler.handleGraphEnd();
        break;
    }
  }

  // 작업 완료 처리
  private async handleTaskCompleted(data: TaskCompletedData, inputs: MessageInput[]): Promise<void> {
    const event = {
      type: "final",
      data: {
        result: JSON.stringify(data?.translations ?? {}),
        messages: inputs,
      },
    };
    
    await this.writer.write(toSSELine(event));
  }

  // 에러 처리
  private async handleError(errorMessage: string): Promise<void> {
    await this.writer.write(toSSELine(createErrorEvent({ error: errorMessage })));
  }
}