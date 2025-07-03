import { NextRequest, NextResponse } from 'next/server';
import ollama from 'ollama';

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

    // 사용자 입력이 없거나 "exit"인 경우 처리
    if (!userInput || userInput === "exit") {
      return NextResponse.json({ 
        message: "대화가 종료되었습니다.",
        aiResponse: null 
      });
    }

    // 모델이 설치되어 있는지 확인
    await ensureModelExists();

    // 사용자 메시지를 대화 기록에 추가
    messages.push({ role: "user", content: userInput });

    // 대화 기록을 기반으로 AI 응답 가져오기
    const response = await ollama.chat({
      model: MODEL_NAME,
      messages: messages,
    });
    
    // AI 응답을 대화 기록에 추가
    messages.push({ role: "assistant", content: response.message.content });

    const embedding = await ollama.embed({
        model: MODEL_NAME,
        input: ["안녕하세요. 너는 누구야?", "너는 누구야?"],
      });
      console.log(embedding);

    return NextResponse.json({
      message: "성공적으로 응답을 생성했습니다.",
      aiResponse: response.message.content,
      userInput: userInput
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
