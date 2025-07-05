'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  type: 'user' | 'ai';
  content: string;
}

export default function RAGPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // 사용자 메시지 추가
    setMessages(prev => [...prev, { type: 'user', content: userMessage }]);

    try {
      const response = await fetch('/api/rag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userInput: userMessage }),
      });

      if (!response.ok) throw new Error('API 응답 오류');
      
      const data = await response.json();
      setIsLoading(false);
      
      if (data.aiResponse) {
        setMessages(prev => [...prev, { type: 'ai', content: data.aiResponse }]);
      } else {
        setMessages(prev => [...prev, { type: 'ai', content: '응답을 받지 못했습니다.' }]);
      }

    } catch (error) {
      console.error('RAG API 호출 에러:', error);
      setMessages(prev => [...prev, { type: 'ai', content: '서버와의 통신 중 오류가 발생했습니다.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const resetConversation = async () => {
    try {
      await fetch('/api/rag', {
        method: 'DELETE',
      });
      setMessages([]);
    } catch (error) {
      console.error('대화 초기화 에러:', error);
    }
  };

  const initializeModel = async () => {
    try {
      const response = await fetch('/api/rag', {
        method: 'PUT',
      });
      const data = await response.json();
      if (data.error) {
        alert(`모델 초기화 실패: ${data.error}`);
      } else {
        alert('RAG 모델이 성공적으로 준비되었습니다!');
      }
    } catch (error) {
      console.error('모델 초기화 에러:', error);
      alert('모델 초기화 중 오류가 발생했습니다.');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">RAG 에이전트</h1>
              <p className="text-sm text-gray-600 mt-1">
                PDF 문서 기반 질의응답 시스템
              </p>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={initializeModel}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                모델 초기화
              </button>
              <button
                onClick={resetConversation}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                대화 초기화
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        <div className="bg-white rounded-lg shadow-sm border h-[700px] flex flex-col">
          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-500 mt-8">
                <div className="mb-4">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-lg font-medium">RAG 에이전트에 오신 것을 환영합니다!</p>
                <p className="text-sm mt-2">PDF 문서에 대해 질문해보세요.</p>
                <div className="mt-4 space-y-2 text-xs text-gray-400">
                  <p>• "인공지능에 대해 설명해줘"</p>
                  <p>• "PDF 문서에서 특정 내용 찾기"</p>
                  <p>• "업로드된 PDF 목록 보기"</p>
                </div>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] px-4 py-2 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    <span>RAG 에이전트가 PDF 문서를 검색하고 답변을 생성하고 있습니다...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* 입력 영역 */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="PDF 문서에 대해 질문하세요..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={2}
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                전송
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
