import { OllamaEmbeddingFunction } from "@chroma-core/ollama";
import { tool } from "@langchain/core/tools";
import { ChromaClient } from "chromadb";
import z from "zod";
import { rerankTool } from "./RerankerTool";

const EMBEDDING_MODEL = "hf.co/Qwen/Qwen3-Embedding-0.6B-GGUF:Q8_0";

export const pdfSearchTool = tool(
  async (input: {
    query: string[] | string;
    limit?: number;
    filename?: string;
  }) => {
    try {
      console.log("🔍 PDF 검색 도구 시작:", { input });
      const { query, limit = 3, filename } = input;

      console.log("📋 검색 파라미터:", { query, limit, filename });

      // Chroma 클라이언트 초기화
      console.log("🔗 ChromaDB 클라이언트 연결 중...");
      const client = new ChromaClient({
        host: "localhost",
        port: 8000,
      });
      console.log("✅ ChromaDB 클라이언트 연결 완료");

      // Ollama 임베딩 함수 초기화
      console.log("🧠 Ollama 임베딩 함수 초기화 중...");
      const embedder = new OllamaEmbeddingFunction({
        model: EMBEDDING_MODEL,
        url: "http://localhost:11434",
      });

      console.log("✅ 임베딩 함수 초기화 완료");

      // 컬렉션 가져오기 또는 생성
      console.log("📚 PDF 컬렉션 가져오기/생성 중...");

      const chromaCollection = await client.getOrCreateCollection({
        name: "pdfs",
        embeddingFunction: embedder,
        metadata: {
          "hnsw:space": "cosine",
        },
      });
      console.log("✅ PDF 컬렉션 준비 완료");

      // 검색 조건 설정
      console.log("🔍 검색 조건 설정 중...");
      const searchOptions: {
        queryTexts: string[];
        nResults: number;
        include: ("documents" | "metadatas" | "distances")[];
        where?: { filename: string };
      } = {
        queryTexts: typeof query === "string" ? [query] : [...query],
        nResults: 10,
        include: ["documents", "metadatas", "distances"],
      };

      // 파일명 필터 추가
      if (filename) {
        searchOptions.where = { filename: filename };
        console.log("📁 파일명 필터 적용:", filename);
      }

      console.log("🔍 검색 옵션:", searchOptions);

      // 검색 수행
      console.log("🚀 ChromaDB 검색 실행 중...");
      let results = await chromaCollection.query(searchOptions);
      console.log("✅ 검색 완료, 결과:", {
        documentsCount: results.documents?.[0]?.length || 0,
        metadatasCount: results.metadatas?.[0]?.length || 0,
        distancesCount: results.distances?.[0]?.length || 0,
      });

      if (filename && !results.documents?.[0]?.length) {
        delete searchOptions.where;
        results = await chromaCollection.query(searchOptions);
        console.log("✅ 검색 완료, 결과:", {
          documentsCount: results.documents?.[0]?.length || 0,
          metadatasCount: results.metadatas?.[0]?.length || 0,
          distancesCount: results.distances?.[0]?.length || 0,
        });
      }

      // 검색 결과가 없으면 바로 반환
      if (!results.documents?.[0]?.length) {
        return JSON.stringify(
          {
            query,
            results: [],
            totalFound: 0,
          },
          null,
          2
        );
      }

      // 리랭킹 적용
      const candidates: string[] = (results.documents?.[0] || []).filter(
        (d): d is string => typeof d === "string"
      );
      const rerankResult = await rerankTool.invoke({
        query: typeof query === "string" ? query : query[0],
        candidates,
      });
      console.log("🔍 리랭킹 결과:", rerankResult);

      // 상위 3개만 사용
      let top3: { rank: number; content: string; score: number }[] = [];
      if (Array.isArray(rerankResult)) {
        top3 = rerankResult;
      }
      console.log("🔍 리랭킹 결과 중 상위 3개:", top3);

      // 메타데이터와 매칭
      const formattedResults = top3.map(
        (item: { rank: number; content: string; score: number }) => {
          // 원본 인덱스 찾기
          const origIdx = candidates.indexOf(item.content);
          return {
            id: item.rank,
            content: item.content,
            metadata: results.metadatas?.[0]?.[origIdx] || {},
            score: item.score,
          };
        }
      );
      console.log("🔍 상위 3개 결과:", formattedResults);

      return JSON.stringify(
        {
          query,
          results: formattedResults,
          totalFound: formattedResults.length,
        },
        null,
        2
      );
    } catch (error) {
      console.error("PDF 검색 중 오류:", error);
      return `PDF 검색 중 오류가 발생했습니다: ${
        error instanceof Error ? error.message : "알 수 없는 오류"
      }`;
    }
  },
  {
    name: "pdf_search",
    description: "PDF 문서에서 특정 내용을 검색합니다.",
    schema: z.object({
      query: z.array(z.string()).describe("검색할 질문이나 키워드 (string[]}"),
      limit: z.number().optional().describe("반환할 결과 수. (기본값: 3)"),
      filename: z.string().optional().describe("기본값: undefined"),
    }),
  }
);
