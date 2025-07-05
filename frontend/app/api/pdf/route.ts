import { NextRequest, NextResponse } from 'next/server';
import { ChromaClient, EmbeddingFunction } from 'chromadb';
import ollama from 'ollama';
import pdf from 'pdf-parse';

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

// 텍스트 청킹 함수 (1000자씩, 오프셋 200자)
function chunkText(text: string, chunkSize: number = 1000, overlap: number = 200): Array<{
  text: string;
  startIndex: number;
  endIndex: number;
  chunkIndex: number;
}> {
  const chunks = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < text.length) {
    const endIndex = Math.min(startIndex + chunkSize, text.length);
    const chunkText = text.slice(startIndex, endIndex);

    chunks.push({
      text: chunkText,
      startIndex,
      endIndex,
      chunkIndex,
    });

    startIndex += chunkSize - overlap;
    chunkIndex++;
  }

  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const source = formData.get('source') as string || '';
    const category = formData.get('category') as string || '';

    if (!file) {
      return NextResponse.json(
        { error: 'PDF 파일이 필요합니다.' },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'PDF 파일만 업로드 가능합니다.' },
        { status: 400 }
      );
    }

    // 파일 크기 체크 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: '파일 크기는 10MB 이하여야 합니다.' },
        { status: 400 }
      );
    }

    // PDF 텍스트 추출
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const pdfData = await pdf(buffer);
    const extractedText = pdfData.text;

    if (!extractedText || extractedText.trim().length === 0) {
      return NextResponse.json(
        { error: 'PDF에서 텍스트를 추출할 수 없습니다.' },
        { status: 400 }
      );
    }

    // 텍스트 청킹
    const chunks = chunkText(extractedText);

    if (chunks.length === 0) {
      return NextResponse.json(
        { error: '청킹할 텍스트가 없습니다.' },
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
      name: 'pdfs',
      embeddingFunction: embedder,
      metadata: {
        'hnsw:space': 'cosine',
      },
    });

    // 청크들을 ChromaDB에 저장
    const documents: string[] = [];
    const metadatas: any[] = [];
    const ids: string[] = [];

    for (const chunk of chunks) {
      const documentId = `pdf_${Date.now()}_${chunk.chunkIndex}`;
      
      const metadata = {
        source: source || file.name,
        category: category || 'pdf',
        filename: file.name,
        fileSize: file.size,
        totalChunks: chunks.length,
        chunkIndex: chunk.chunkIndex,
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex,
        chunkSize: chunk.text.length,
        timestamp: new Date().toISOString(),
        documentType: 'pdf',
        pageCount: pdfData.numpages,
        author: pdfData.info?.Author || '',
        title: pdfData.info?.Title || '',
        subject: pdfData.info?.Subject || '',
        creator: pdfData.info?.Creator || '',
        producer: pdfData.info?.Producer || '',
      };

      documents.push(chunk.text);
      metadatas.push(metadata);
      ids.push(documentId);
    }

    // ChromaDB에 일괄 저장
    await collection.add({
      documents,
      metadatas,
      ids,
    });

    return NextResponse.json({
      success: true,
      message: `PDF가 성공적으로 처리되어 ${chunks.length}개의 청크로 저장되었습니다.`,
      summary: {
        filename: file.name,
        fileSize: file.size,
        totalTextLength: extractedText.length,
        totalChunks: chunks.length,
        pageCount: pdfData.numpages,
        author: pdfData.info?.Author || '',
        title: pdfData.info?.Title || '',
      },
      chunks: chunks.map((chunk, index) => ({
        id: ids[index],
        chunkIndex: chunk.chunkIndex,
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex,
        textLength: chunk.text.length,
        preview: chunk.text.slice(0, 100) + (chunk.text.length > 100 ? '...' : ''),
      })),
    });

  } catch (error) {
    console.error('PDF 처리 중 오류 발생:', error);
    
    return NextResponse.json(
      { 
        error: 'PDF 처리 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
}

// GET 요청으로 PDF 문서들을 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const limit = parseInt(searchParams.get('limit') || '10');
    const filename = searchParams.get('filename');

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
      name: 'pdfs',
      embeddingFunction: embedder,
    });

    // 검색 조건 설정
    const searchOptions: any = {
      queryTexts: [query],
      nResults: limit,
      include: ['documents', 'metadatas', 'embeddings'],
    };

    // 파일명 필터 추가
    if (filename) {
      searchOptions.where = { filename: filename };
    }

    // 유사도 검색 수행
    const results = await collection.query(searchOptions);

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
    console.error('PDF 검색 중 오류 발생:', error);
    
    return NextResponse.json(
      { 
        error: '검색 중 오류가 발생했습니다.',
        details: error instanceof Error ? error.message : '알 수 없는 오류'
      },
      { status: 500 }
    );
  }
} 