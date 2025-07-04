import { tool } from '@langchain/core/tools';
import { z } from 'zod';

// 현재 시각을 반환하는 툴
export const nowTool = tool(async (_input) => {
  return `현재 시각은 ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })} 입니다.`;
}, {
  name: 'now',
  description: '현재 시각을 알려줍니다.',
  schema: z.object({}) // 입력 파라미터 없음
}); 