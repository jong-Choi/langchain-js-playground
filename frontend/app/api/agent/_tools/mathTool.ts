import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { evaluate } from 'mathjs';

export const mathTool = tool(
  async ({ expression }) => {
    try {
      const result = evaluate(expression);
      return `계산 결과: ${result}`;
    } catch (e) {
      return `계산 오류: 잘못된 표현식 (${expression})`;
    }
  },
  {
    name: 'calculator',
    description: '수학 표현식을 계산합니다. 예: "2 + 3 * (7 - 4)"',
    schema: z.object({
      expression: z.string().describe('계산할 수학 표현식 (예: 3 + 4 * 2)'),
    }),
  }
); 