import { NextRequest, NextResponse } from 'next/server';
import { ChromaClient, EmbeddingFunction } from 'chromadb';
import ollama from 'ollama';

const MODEL_NAME = 'mxbai-embed-large';

// Ollama 임베딩 함수 구현
class OllamaEmbeddingFunction implements EmbeddingFunction {
  private model: string;
  private url: string;

  constructor({ model, url }: { model: string; url: string }) {
    this.model = model;
    this.url = url;
  }

  async generate(texts: string[]): Promise<number[][]> {
    const embeddings = [];
    for (const text of texts) {
      try {
        const response = await fetch(`${this.url}/api/embeddings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: this.model,
            prompt: text,
          }),
        });

        if (!response.ok) {
          throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = await response.json();
        embeddings.push(data.embedding);
      } catch (error) {
        console.error('임베딩 생성 중 오류:', error);
        throw error;
      }
    }
    return embeddings;
  }
}

// 모델 존재 확인 및 다운로드 함수
async function ensureModelExists() {
  try {
    const models = await ollama.list();
    const modelExists = models.models.some((model: { name: string }) => model.name === MODEL_NAME);
    if (!modelExists) {
      console.log(`모델 ${MODEL_NAME} 다운로드 중...`);
      await ollama.pull({ model: MODEL_NAME });
      console.log(`모델 ${MODEL_NAME} 다운로드 완료`);
    }
  } catch (error) {
    console.error('모델 확인/다운로드 중 에러:', error);
    throw new Error('모델을 준비할 수 없습니다.');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { text, metadata = {} } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: '텍스트가 필요합니다.' },
        { status: 400 }
      );
    }

    // Ollama 모델 존재 확인
    await ensureModelExists();

    // Chroma 클라이언트 초기화
    const client = new ChromaClient({
      host: 'localhost',
      port: 8000,
    });

    // Ollama 임베딩 함수 초기화
    const embedder = new OllamaEmbeddingFunction({
      model: MODEL_NAME,
      url: 'http://localhost:11434',
    });

    // 컬렉션 가져오기 또는 생성
    const collection = await client.getOrCreateCollection({
      name: 'documents',
      embeddingFunction: embedder,
      metadata: {
        'hnsw:space': 'cosine',
      },
    });

    // 문서 추가
    const documentMetadata = {
      ...metadata,
      timestamp: new Date().toISOString(),
    };

    const documentId = Date.now().toString();
    await collection.add({
      documents: [text],
      metadatas: [documentMetadata],
      ids: [documentId],
    });

    return NextResponse.json({
      success: true,
      message: '텍스트가 성공적으로 Chroma에 저장되었습니다.',
      id: documentId,
      document: {
        content: text,
        metadata: documentMetadata,
      },
    });

  } catch (error) {
    console.error('Chroma 저장 중 오류 발생:', error);
    
    return NextResponse.json(
      { 
        error: '텍스트 저장 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// GET 요청으로 저장된 문서들을 조회할 수 있는 엔드포인트도 추가
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query) {
      return NextResponse.json(
        { error: '검색 쿼리가 필요합니다.' },
        { status: 400 }
      );
    }

    // Ollama 모델 존재 확인
    await ensureModelExists();

    // Chroma 클라이언트 초기화
    const client = new ChromaClient({
      host: 'localhost',
      port: 8000,
    });

    // Ollama 임베딩 함수 초기화
    const embedder = new OllamaEmbeddingFunction({
      model: MODEL_NAME,
      url: 'http://localhost:11434',
    });

    // 컬렉션 가져오기 또는 생성
    const collection = await client.getOrCreateCollection({
      name: 'documents',
      embeddingFunction: embedder,
    });

    // 유사도 검색 수행
    const results = await collection.query({
      queryTexts: [query],
      nResults: limit,
      include: ['documents', 'metadatas', 'embeddings'],
    });

    // 결과 포맷팅
    const formattedResults = results.documents?.[0]?.map((doc, index) => ({
      id: index,
      content: doc,
      metadata: results.metadatas?.[0]?.[index] || {},
      embedding: results.embeddings?.[0]?.[index] || [],
    })) || [];

    return NextResponse.json({
      success: true,
      query,
      results: formattedResults,
    });

  } catch (error) {
    console.error('Chroma 검색 중 오류 발생:', error);
    
    return NextResponse.json(
      { 
        error: '검색 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}
