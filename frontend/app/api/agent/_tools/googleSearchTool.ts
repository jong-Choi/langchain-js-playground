import { tool } from '@langchain/core/tools';
import { z } from 'zod';

const GOOGLE_API_KEY = process.env.GOOGLE_SEARCH_API_KEY!;
const GOOGLE_CX = process.env.GOOGLE_SEARCH_CX!;

export const googleSearchTool = tool(
  async ({ query }) => {
    try {
      const params = new URLSearchParams({
        key: GOOGLE_API_KEY,
        cx: GOOGLE_CX,
        q: query,
      });

      const url = `https://www.googleapis.com/customsearch/v1?${params}`;
      
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Google 검색 실패: ${res.statusText}`);
      }

      const data = await res.json();
      
      const items = data.items ?? [];

      if (items.length === 0) {
        return `"${query}"에 대한 검색 결과가 없습니다.`;
      }
      
      const formattedResults = items.map((e: any) => ({
        title: e.title,
        link: e.link,
        snippet: e.snippet
      }));

      return JSON.stringify(formattedResults);
    } catch (error) {
      return `검색 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`;
    }
  },
  {
    name: "google_search",
    description: "구글에서 실시간 정보를 검색합니다.",
    schema: z.object({
      query: z.string().describe("검색할 키워드 또는 질문"),
    }),
  }
); 