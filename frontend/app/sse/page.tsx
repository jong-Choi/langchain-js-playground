"use client";

import { useState, useRef } from "react";

interface SSEEvent {
  type: string;
  data: any;
}

export default function SSEPage() {
  const [messages, setMessages] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingText, setStreamingText] = useState("");

  const addMessage = (message: string) => {
    setMessages((prev) => [...prev, message]);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);
    setStreamingText("");

    addMessage(`사용자: ${userMessage}`);

    try {
      const response = await fetch("/api/sse", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.body) {
        throw new Error("스트림 응답을 받을 수 없습니다.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const eventData: SSEEvent = JSON.parse(line.slice(6));
              handleSSEEvent(eventData);
            } catch (e) {
              console.error("JSON 파싱 에러:", e);
            }
          }
        }
      }
    } catch (error) {
      console.error("메시지 전송 에러:", error);
      addMessage(
        `시스템: 오류가 발생했습니다 - ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSSEEvent = (event: SSEEvent) => {
    switch (event.type) {
      case "start":
        addMessage("🤖 시스템: " + event.data.message);
        break;

      case "chunk": {
        const text =
          typeof event.data?.text === "string" ? event.data.text : "";
        if (text) {
          setStreamingText((prev) => prev + text);
        }
        break;
      }

      case "agent_start":
        const agentNames = {
          supervisor: "👑 슈퍼바이저",
          add: "➕ 더하기 에이전트",
          subtract: "➖ 빼기 에이전트",
          divide: "➗ 나누기 에이전트",
        };
        const agentName =
          agentNames[event.data.agent as keyof typeof agentNames] ||
          event.data.agent;
        addMessage(`${agentName}: ${event.data.message}`);
        break;

      case "agent_end":
        if (event.data.decision) {
          addMessage(
            `👑 슈퍼바이저: ${event.data.decision} 작업으로 결정했습니다.`
          );
        }
        if (event.data.result !== undefined) {
          const agentEmojis = {
            add: "➕",
            subtract: "➖",
            divide: "➗",
          };
          const emoji =
            agentEmojis[event.data.agent as keyof typeof agentEmojis] || "🤖";
          addMessage(
            `${emoji} ${event.data.agent} 에이전트: 결과는 ${event.data.result}입니다.`
          );
        }
        if (streamingText) {
          addMessage(`🧩 스트리밍: ${streamingText}`);
          setStreamingText("");
        }
        break;

      case "final":
        addMessage(`✅ 최종 결과: ${event.data.result}`);
        if (
          Array.isArray(event.data?.messages) &&
          event.data.messages.length > 0
        ) {
          const lastMessage =
            event.data.messages[event.data.messages.length - 1];
          const lastContent =
            typeof lastMessage?.content === "string" ? lastMessage.content : "";
          if (lastContent) addMessage(`📝 상세: ${lastContent}`);
        }
        if (streamingText) {
          addMessage(`🧩 스트리밍: ${streamingText}`);
          setStreamingText("");
        }
        break;

      case "end":
        addMessage("🏁 시스템: " + event.data.message);
        break;

      case "error":
        addMessage(`❌ 오류: ${event.data.error}`);
        break;

      default:
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearMessages = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          <div className="bg-blue-600 text-white p-4 rounded-t-lg">
            <h1 className="text-xl font-bold">SSE 멀티 에이전트 챗봇</h1>
            <p className="text-blue-100 text-sm mt-1">
              수학 계산을 위한 4개 에이전트 (슈퍼바이저, 더하기, 빼기, 나누기)
            </p>
            <div className="mt-2 flex gap-4">
              <span className="text-sm">
                상태: {isLoading ? "처리중..." : "대기중"}
              </span>
              <button
                onClick={clearMessages}
                className="text-sm underline hover:text-blue-200"
              >
                대화 지우기
              </button>
            </div>
          </div>

          <div className="h-96 overflow-y-auto p-4 bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <p className="text-lg mb-2">🤖 안녕하세요!</p>
                <p className="text-sm">수학 계산 문제를 입력해보세요.</p>
                <p className="text-xs text-gray-400 mt-2">
                  예: &quot;5 더하기 3&quot;, &quot;10 빼기 2&quot;, &quot;8
                  나누기 4&quot;
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      message.startsWith("사용자:")
                        ? "bg-blue-100 ml-8 text-right"
                        : "bg-white border mr-8"
                    }`}
                  >
                    <span className="text-sm whitespace-pre-wrap">
                      {message}
                    </span>
                  </div>
                ))}
                {streamingText ? (
                  <div className="p-3 rounded-lg bg-white border mr-8">
                    <span className="text-sm whitespace-pre-wrap">
                      ⌛ 실시간: {streamingText}
                    </span>
                  </div>
                ) : null}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="수학 문제를 입력하세요... (예: 5 더하기 3)"
                className="flex-1 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !input.trim()}
                className={`px-6 py-3 rounded-lg font-medium ${
                  isLoading || !input.trim()
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {isLoading ? "처리중..." : "전송"}
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-2">
              Enter를 눌러서 전송하거나, Shift+Enter로 줄바꿈
            </div>
          </div>
        </div>

        <div className="mt-4 text-center text-sm text-gray-600">
          <p>
            🔥 실시간 SSE 스트리밍으로 각 에이전트의 작업 과정을 확인할 수
            있습니다
          </p>
        </div>
      </div>
    </div>
  );
}
