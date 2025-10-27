# WTP Dashboard - 위즈더플래닝 통합 관리 시스템

마케팅 대행사를 위한 매출, 매입, 운영비 통합 관리 대시보드입니다.

## 🚀 프로젝트 개요

- **목적**: 분산된 재무 데이터를 하나의 플랫폼에서 통합 관리
- **기술 스택**: Next.js 16, TypeScript, Tailwind CSS, Google Sheets API
- **데이터 저장소**: Google Sheets (초기 버전)

## 📋 주요 기능

### ✅ Phase 1: 프로젝트 세팅 (완료)
- Next.js 프로젝트 초기화
- 필수 패키지 설치 (shadcn/ui, NextAuth, React Query 등)
- 폴더 구조 설정
- Google Sheets API 연동 준비

### ✅ Phase 2: 인증 시스템 (완료)
- NextAuth.js 기반 로그인/로그아웃
- 세션 관리
- 권한 기반 접근 제어
- 테스트 계정 제공

### ✅ Phase 3: 매출 관리 (완료)
- 매출 데이터 입력 폼
- 매출 목록 조회
- 매출 통계 표시
- Google Sheets 연동

### ✅ Phase 4: 기본 대시보드 (완료)
- 주요 지표 카드 (매출, 신규 광고주, 목표 달성률 등)
- 부서별 매출 현황
- 영업사원별 실적
- 최근 활동 내역

### 🚧 개발 예정
- Phase 5: 매입/운영비 관리
- Phase 6: 고급 대시보드 (차트 추가)
- Phase 7: 광고주/인력 관리
- Phase 8: 리포트 생성

## 🔐 테스트 계정

### 관리자
- 이메일: admin@wtp.com
- 비밀번호: admin123

### 영업팀장
- 이메일: sales@wtp.com
- 비밀번호: sales123

## 🛠️ 설치 및 실행

### 1. 프로젝트 클론
```bash
git clone [repository-url]
cd wtp-dashboard
```

### 2. 패키지 설치
```bash
npm install --legacy-peer-deps
```

### 3. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 내용을 입력:

```env
# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-change-in-production

# Google Sheets API
GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id-here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key-here\n-----END PRIVATE KEY-----"
```

### 4. Google Sheets 설정

1. Google Cloud Console에서 새 프로젝트 생성
2. Google Sheets API 활성화
3. 서비스 계정 생성 및 키 다운로드
4. Google Sheets 생성 후 서비스 계정에 편집 권한 부여
5. 시트 구조:
   - 매출 (Sales)
   - 매입 (Purchase)
   - 운영비 (Expenses)
   - 광고주 (Clients)
   - 인력 (Staff)
   - 설정 (Settings)

### 5. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 📁 프로젝트 구조

```
/app
  /(auth)
    /login                 # 로그인 페이지
  /(dashboard)
    /page.tsx             # 메인 대시보드
    /sales
      /new                # 매출 입력
      /page.tsx           # 매출 조회
    /purchase             # 매입 관리 (개발 예정)
    /expenses             # 운영비 관리 (개발 예정)
    /clients              # 광고주 관리 (개발 예정)
    /executive            # 임원 대시보드 (개발 예정)
  /api
    /auth                 # 인증 API
    /sales                # 매출 API
    /dashboard            # 대시보드 API

/components
  /ui                     # shadcn/ui 컴포넌트
  /layout                 # 레이아웃 컴포넌트

/lib
  /auth.ts               # NextAuth 설정
  /google-sheets.ts      # Google Sheets 유틸
  /utils.ts              # 유틸리티 함수

/types
  /index.ts              # TypeScript 타입 정의
```

## 🎯 성공 지표

- ✅ 데이터 입력 시간 50% 단축
- ✅ 전 직원 사용률 90% 이상
- ✅ 의사결정 속도 향상
- ✅ 수익성 가시화를 통한 실제 수익 개선

## 📅 개발 일정

- **Phase 1-4**: 완료 (2025-10-26)
- **Phase 5**: 매입/운영비 기능 (예정)
- **Phase 6**: 고급 대시보드 (예정)
- **Phase 7**: 광고주/인력 관리 (예정)
- **Phase 8**: 최적화 및 배포 (예정)

## 🤝 기여 방법

1. Fork the Project
2. Create your Feature Branch
3. Commit your Changes
4. Push to the Branch
5. Open a Pull Request

## 📝 라이센스

Private Project - All Rights Reserved

## 📞 문의

프로젝트 관련 문의는 담당자에게 연락 주세요.

---

**개발자**: Claude AI Assistant
**프로젝트 시작일**: 2025-10-26