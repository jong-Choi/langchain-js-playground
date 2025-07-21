#!/bin/bash

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 스크립트 시작
log_info "=== LLM 서브도메인 배포 스크립트 (Final 버전) ==="
log_info "도메인: llm.jongchoi.com"
log_info "서버 IP: 152.70.251.145"

# 1. 프로젝트 디렉토리로 이동
log_info "1. 프로젝트 디렉토리 설정 중..."
cd /home/ubuntu/langchain-js-playground
log_success "프로젝트 디렉토리: $(pwd)"

# 2. 환경 변수 파일 확인
log_info "2. 환경 변수 파일 확인 중..."
if [ ! -f ".env" ]; then
    log_error ".env 파일이 없습니다!"
    log_info "LLM_SECRET_KEY를 포함한 .env 파일을 생성해주세요."
    exit 1
fi
log_success ".env 파일 확인 완료"

# 3. 기존 Docker Compose 중단
log_info "3. 기존 Docker Compose 중단 중..."
sudo docker-compose down
log_success "기존 Docker Compose 중단 완료"

# 4. docker-compose.yml 백업 및 교체
log_info "4. docker-compose.yml 백업 및 교체 중..."
cp docker-compose.yml docker-compose.yml.backup
cp docker-compose.yml docker-compose.yml
log_success "docker-compose.yml 교체 완료"

# 5. Docker Compose 실행 (nginx 없이)
log_info "5. Docker Compose 실행 중..."
sudo docker-compose up -d
log_success "Docker Compose 실행 완료"

# 6. Docker 컨테이너 시작 대기
log_info "6. Docker 컨테이너 시작 대기 중..."
sleep 15

# 7. Docker 컨테이너 상태 확인
log_info "7. Docker 컨테이너 상태 확인 중..."
echo "=== Docker 컨테이너 상태 ==="
sudo docker-compose ps

# 8. nginx 설정 교체
log_info "8. nginx 설정 교체 중..."
# 기존 설정 삭제
sudo rm -f /etc/nginx/sites-enabled/llm.jongchoi.com.conf
sudo rm -f /etc/nginx/sites-available/llm.jongchoi.com.conf

# .env 파일에서 LLM_SECRET_KEY 읽기
source .env
if [ -z "$LLM_SECRET_KEY" ]; then
    log_error "LLM_SECRET_KEY가 .env 파일에 설정되지 않았습니다!"
    exit 1
fi

# 환경 변수를 실제 값으로 치환하여 nginx 설정 생성
envsubst '${LLM_SECRET_KEY}' < nginx/llm.jongchoi.com.conf > /tmp/llm.jongchoi.com.conf

# 새로운 설정 복사
sudo cp /tmp/llm.jongchoi.com.conf /etc/nginx/sites-available/llm.jongchoi.com.conf
sudo ln -sf /etc/nginx/sites-available/llm.jongchoi.com.conf /etc/nginx/sites-enabled/

# 임시 파일 정리
rm -f /tmp/llm.jongchoi.com.conf

# 9. nginx 설정 테스트 및 재시작
log_info "9. nginx 설정 테스트 및 재시작 중..."
if sudo nginx -t; then
    sudo systemctl reload nginx
    log_success "nginx 설정 테스트 통과 및 재시작 완료"
else
    log_error "nginx 설정 테스트 실패"
    exit 1
fi

# 10. 포트 상태 확인
log_info "10. 포트 상태 확인 중..."
echo "=== 포트 사용 현황 ==="
echo "80번 포트:"
sudo netstat -tulpn | grep :80 || echo "사용 중인 프로세스 없음"
echo "443번 포트:"
sudo netstat -tulpn | grep :443 || echo "사용 중인 프로세스 없음"
echo "11434번 포트 (Ollama):"
sudo netstat -tulpn | grep :11434 || echo "사용 중인 프로세스 없음"
echo "8008번 포트 (Chroma):"
sudo netstat -tulpn | grep :8008 || echo "사용 중인 프로세스 없음"
echo "8811번 포트 (Reranker):"
sudo netstat -tulpn | grep :8811 || echo "사용 중인 프로세스 없음"

# 11. 서비스 상태 확인
log_info "11. 서비스 상태 확인 중..."
echo "=== nginx 프로세스 상태 ==="
sudo systemctl status nginx --no-pager

# 12. 헬스체크
log_info "12. 서비스 헬스체크 중..."
sleep 5

# HTTPS 헬스체크
if curl -k -s https://llm.jongchoi.com/health > /dev/null; then
    log_success "HTTPS 헬스체크 통과"
else
    log_warning "HTTPS 헬스체크 실패"
fi

# 개별 서비스 헬스체크
echo "=== 개별 서비스 상태 확인 ==="
echo "Ollama (localhost:11434):"
curl -s http://localhost:11434/api/tags > /dev/null && echo "✅ 연결됨" || echo "❌ 연결 실패"

echo "Chroma (localhost:8008):"
curl -s http://localhost:8008/api/v1/heartbeat > /dev/null && echo "✅ 연결됨" || echo "❌ 연결 실패"

echo "Reranker (localhost:8811):"
curl -s http://localhost:8811/health > /dev/null && echo "✅ 연결됨" || echo "❌ 연결 실패"

# 13. 최종 확인
log_info "13. 최종 설정 확인 중..."
echo "=== SSL 인증서 정보 ==="
sudo certbot certificates

# 14. 완료 메시지
log_success "=== 배포 완료! ==="
echo ""
echo "🌐 도메인: https://llm.jongchoi.com"
echo "🔑 API 키 헤더: llm_secret_key"
echo "📡 API 엔드포인트:"
echo "   - https://llm.jongchoi.com/api/ollama/"
echo "   - https://llm.jongchoi.com/api/reranker/"
echo "   - https://llm.jongchoi.com/api/chroma/"
echo ""
echo "🔧 유용한 명령어:"
echo "   - 로그 확인: sudo docker-compose logs -f"
echo "   - 서비스 재시작: sudo docker-compose restart"
echo "   - nginx 재시작: sudo systemctl restart nginx"
echo "   - SSL 갱신: sudo certbot renew"
echo ""
echo "🔍 테스트 명령어:"
echo "   - curl -k https://llm.jongchoi.com/health"
echo "   - curl -H 'llm_secret_key: YOUR_KEY' https://llm.jongchoi.com/api/ollama/api/tags"
echo ""

log_success "배포가 성공적으로 완료되었습니다!" 