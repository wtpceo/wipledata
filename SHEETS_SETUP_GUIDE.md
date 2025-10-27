# Google Sheets 연동 설정 가이드

## 필수 설정 단계

### 1. Google Sheets 권한 설정
Google Sheets 파일에 서비스 계정이 접근할 수 있도록 권한을 부여해야 합니다.

1. Google Sheets 파일을 엽니다
2. 우측 상단의 **공유** 버튼을 클릭합니다
3. 다음 이메일 주소를 입력합니다:
   ```
   wtp-dashboard@wtp-dashboard.iam.gserviceaccount.com
   ```
4. 권한을 **뷰어** 또는 **편집자**로 설정합니다 (읽기만 필요한 경우 뷰어로 충분)
5. **보내기** 버튼을 클릭하여 권한을 부여합니다

### 2. 스프레드시트 ID 확인
Google Sheets URL에서 스프레드시트 ID를 확인합니다:
```
https://docs.google.com/spreadsheets/d/[스프레드시트_ID]/edit
```

현재 설정된 ID: `1OxS80PhVqkFRyM9zhP7p0FPEcnIFkGCjrYZdBI9ITos`

### 3. 데이터 형식 요구사항

대시보드가 올바르게 작동하려면 Google Sheets의 데이터가 다음 형식을 따라야 합니다:

#### 기본 시트 (Sheet1)
첫 번째 행은 헤더로 사용되며, 다음 컬럼이 필요합니다:
- **날짜** 또는 **Date**: YYYY-MM-DD 형식
- **매출** 또는 **Sales** 또는 **Amount**: 숫자 형식
- **카테고리** 또는 **Category**: 텍스트 형식

예시:
| 날짜 | 매출 | 카테고리 |
|------|------|----------|
| 2025-10-01 | 1000000 | 온라인광고 |
| 2025-10-02 | 1500000 | SNS마케팅 |

#### 목표 시트 (Goals) - 선택사항
목표 대비 실적을 관리하려면:
- **기간** 또는 **Period**: 텍스트
- **목표** 또는 **Goal**: 숫자
- **실적** 또는 **Achievement**: 숫자
- **달성률** 또는 **Percentage**: 숫자 (%)

### 4. 테스트 실행

1. 터미널에서 테스트 스크립트 실행:
   ```bash
   node test-sheets-connection.js
   ```

2. 성공 시 다음과 같은 메시지가 표시됩니다:
   ```
   ✅ 연결 성공!
   ✅ 매출 데이터 로드 성공!
   ```

### 5. 개발 서버 실행

1. 개발 서버 시작:
   ```bash
   npm run dev
   ```

2. 브라우저에서 확인:
   - 메인 대시보드: http://localhost:3000
   - Google Sheets 대시보드: http://localhost:3000/sheets

## 문제 해결

### "The caller does not have permission" 오류
→ Google Sheets 파일에 서비스 계정 이메일을 공유하지 않았습니다. 위의 1번 단계를 따르세요.

### 데이터가 표시되지 않음
→ Google Sheets의 컬럼명이 예상 형식과 다를 수 있습니다. 컬럼명을 확인하고 필요시 services/googleSheets.js 파일을 수정하세요.

### API 호출 제한
→ Google Sheets API는 분당 호출 횟수 제한이 있습니다. 자동 새로고침 간격을 조정하세요.

## 환경 변수 (.env.local)

다음 환경 변수가 올바르게 설정되어 있는지 확인하세요:
```env
GOOGLE_SHEETS_SPREADSHEET_ID=1OxS80PhVqkFRyM9zhP7p0FPEcnIFkGCjrYZdBI9ITos
GOOGLE_SERVICE_ACCOUNT_EMAIL=wtp-dashboard@wtp-dashboard.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## 보안 주의사항

- `.env.local` 파일을 절대 Git에 커밋하지 마세요
- 서비스 계정 키는 안전하게 보관하세요
- 프로덕션 환경에서는 환경 변수를 서버 설정으로 관리하세요