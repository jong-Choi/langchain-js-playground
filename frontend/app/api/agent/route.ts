import { NextRequest, NextResponse } from 'next/server';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import ollama from 'ollama';
import { nowTool, googleSearchTool, mathTool } from './_tools';

// Ollama 모델 설정
const MODEL_NAME = "qwen3:4b";

// 모델이 설치되어 있는지 확인하는 함수
async function ensureModelExists() {
  try {
    const models = await ollama.list();
    const modelExists = models.models.some((model: { name: string }) => model.name === MODEL_NAME);
    
    if (!modelExists) {
      console.log(`모델 ${MODEL_NAME}을 다운로드 중...`);
      await ollama.pull({ model: MODEL_NAME });
      console.log(`모델 ${MODEL_NAME} 다운로드 완료`);
    }
  } catch (error) {
    console.error('모델 확인/다운로드 중 에러:', error);
    throw new Error('모델을 준비할 수 없습니다.');
  }
}

function convertMessagesToChatHistory(messages: BaseMessage[]) {
  return messages.map((msg) => {
    const role =
      typeof msg._getType === 'function'
        ? msg._getType() === 'human'
          ? 'user'
          : msg._getType() === 'ai'
            ? 'assistant'
            : 'system'
        : 'user';

    return { role, content: msg.content };
  });
}

const INITIAL_SYSTEM_MESSAGE = "사용자는 한국인이야.";

// LangChain 메시지 배열
let messages = [
  new SystemMessage({ content: INITIAL_SYSTEM_MESSAGE }),
];

// LangChain Ollama 래퍼
const model = new ChatOllama({
  baseUrl: 'http://localhost:11434',
  model: MODEL_NAME,
  streaming: false,
});

// LangGraph Agent 생성 (nowTool과 searchTool 추가)
const tools = [nowTool, googleSearchTool, mathTool];

const agent = createReactAgent({
  llm: model,
  tools: tools,
});


export async function POST(request: NextRequest) {
  try {
    const { userInput } = await request.json();

    if (!userInput || userInput === "exit") {
      return NextResponse.json({ 
        message: "대화가 종료되었습니다.",
        aiResponse: null 
      });
    }

    await ensureModelExists();

    const safeInput = typeof userInput === 'string' ? userInput : String(userInput ?? '');
    messages.push(new HumanMessage({ content: String(safeInput) }));

    // LangGraph agent.invoke 사용 
    const result = await agent.invoke({
      messages: convertMessagesToChatHistory(messages),
    });

    // result.messages의 마지막 메시지가 AI 응답
    const aiContent = String(result?.messages?.slice(-1)[0]?.content || '');
    messages.push(new AIMessage({ content: aiContent }));

    return NextResponse.json({
      message: "AI 응답입니다.",
      aiResponse: aiContent
    });
  } catch (error) {
    console.error('API 에러:', error);
    return NextResponse.json(
      { error: '서버 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 대화 기록을 초기화하는 엔드포인트
export async function DELETE() {
  try {
    messages = [
      new SystemMessage({ content: INITIAL_SYSTEM_MESSAGE }),
    ];
    
    return NextResponse.json({ 
      message: "대화 기록이 초기화되었습니다." 
    });
  } catch (error) {
    console.error('초기화 에러:', error);
    return NextResponse.json(
      { error: '초기화 중 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 현재 대화 기록을 조회하는 엔드포인트
export async function GET() {
  try {
    return NextResponse.json({
      message: "현재 대화 기록입니다.",
      messages: messages.map(msg => ({
        type: typeof msg._getType === 'function' ? msg._getType() : 'unknown',
        content: msg.content
      }))
    });
  } catch (error) {
    console.error('조회 에러:', error);
    return NextResponse.json(
      { error: '대화 기록 조회 중 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}

// 모델 초기화 엔드포인트
export async function PUT() {
  try {
    await ensureModelExists();
    return NextResponse.json({
      message: "모델이 준비되었습니다.",
      model: MODEL_NAME
    });
  } catch (error) {
    console.error('모델 초기화 에러:', error);
    return NextResponse.json(
      { error: '모델 초기화 중 에러가 발생했습니다.' },
      { status: 500 }
    );
  }
}
