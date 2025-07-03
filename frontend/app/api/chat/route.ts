import { NextRequest, NextResponse } from 'next/server';
import ollama from 'ollama';
import { Readable } from 'stream';

// Ollama 모델 설정
const MODEL_NAME = "hf.co/rippertnt/HyperCLOVAX-SEED-Text-Instruct-1.5B-Q4_K_M-GGUF:Q4_K_M";

// 모델이 설치되어 있는지 확인하는 함수
async function ensureModelExists() {
  try {
    const models = await ollama.list();
    const modelExists = models.models.some(model => model.name === MODEL_NAME);
    
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

// 대화 기록을 저장할 배열 (실제 프로덕션에서는 데이터베이스나 세션 스토리지를 사용해야 함)
let messages = [
  { role: "system", content: "너는 사용자를 도와주는 상담사야." }, // 초기 시스템 메시지
];

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
    messages.push({ role: "user", content: userInput });

    // Ollama 스트림 생성
    const stream = await ollama.chat({
      model: MODEL_NAME,
      messages: messages,
      stream: true
    });

    // Next.js Response용 ReadableStream 생성
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        let aiContent = '';
        for await (const part of stream) {
          if (part.message && part.message.content) {
            aiContent += part.message.content;
            controller.enqueue(encoder.encode(part.message.content));
          }
        }
        // 대화 기록에 AI 응답 추가
        messages.push({ role: "assistant", content: aiContent });
        controller.close();
      }
    });

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
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
      { role: "system", content: "너는 사용자를 도와주는 상담사야." }, // 초기 시스템 메시지
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
        type: msg.role,
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
