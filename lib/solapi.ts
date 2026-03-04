import { SolapiMessageService } from 'solapi'

const messageService = new SolapiMessageService(
  process.env.SOLAPI_API_KEY || 'NCS56Q8FKROVG59D',
  process.env.SOLAPI_API_SECRET || '55SYXGKUW4NAVQ6UEETIAQKEEBK6RCSE'
)

const SENDER_NUMBER = process.env.SOLAPI_SENDER_NUMBER || '01023399855'

// 알림 수신자 목록
const NOTIFICATION_RECIPIENTS = [
  '01088984453',
  '01023399855',
  '01086121661',
  '01064873203',
  '01066138691',
  '01086320285',
  '01089383286',
  '01085390339',
  '01020710040',
]

// 금액 포맷
function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ko-KR').format(amount) + '원'
}

// 카카오 알림톡 설정
const KAKAO_PF_ID = process.env.SOLAPI_KAKAO_PF_ID || 'KA01PF251204062307013fn0bmxpwWEJ'
const KAKAO_NEW_SALE_TEMPLATE = process.env.SOLAPI_KAKAO_NEW_SALE_TEMPLATE || 'KA01TP260224025441019Q1eej1Pr6CQ'
const KAKAO_NEW_REPLY_TEMPLATE = process.env.SOLAPI_KAKAO_NEW_REPLY_TEMPLATE || 'KA01TP260224025527905EjOnaojAr2V'
// 카카오 알림톡 템플릿 심사 대기 중 문자가 중복 발송되는 것을 막기 위해 임시로 발송 기능을 강제 중단해 둡니다. (추후 Vercel 세팅 시 해제 예정)
const DISABLE_ALERTS = false // 카카오 알림톡 템플릿 승인 완료 (2026-02-26)

// 새 매출 등록 알림
export async function notifyNewSale(data: {
  inputPerson: string
  department: string
  clientName: string
  productName: string
  totalAmount: number
  salesType: string
  specialNotes?: string
}) {
  const text = [
    '[위즈더플래닝] 새 매출 등록',
    '',
    `부서: ${data.department}`,
    `입력자: ${data.inputPerson}`,
    `유형: ${data.salesType}`,
    `광고주: ${data.clientName}`,
    `상품: ${data.productName}`,
    `금액: ${formatAmount(data.totalAmount)}`,
    ...(data.specialNotes ? [`특이사항: ${data.specialNotes}`] : []),
  ].join('\n')

  const kakaoVariables = {
    '#{department}': data.department || '-',
    '#{inputPerson}': data.inputPerson || '-',
    '#{salesType}': data.salesType || '-',
    '#{clientName}': data.clientName || '-',
    '#{productName}': data.productName || '-',
    '#{totalAmount}': formatAmount(data.totalAmount),
    '#{specialNotes}': data.specialNotes || '없음',
  }

  await sendToAll(text, KAKAO_NEW_SALE_TEMPLATE, kakaoVariables)
}

// AE 실적 등록 알림 (기존 매출등록 템플릿 활용)
export async function notifyNewPerformance(data: {
  department: string
  aeNames: string[]
  clientName: string
  performanceMonth: string
  result: 'renewed' | 'failed'
  renewalAmount: number
  notes?: string
  failureReason?: string
}) {
  const resultText = data.result === 'renewed' ? '연장성공' : '연장실패'
  const specialNotes = data.result === 'failed'
    ? data.failureReason || '없음'
    : data.notes || '없음'

  const text = [
    '[위즈더플래닝] AE 실적 등록',
    '',
    `부서: ${data.department}`,
    `담당자: ${data.aeNames.join(', ')}`,
    `결과: ${resultText}`,
    `광고주: ${data.clientName}`,
    `실적월: ${data.performanceMonth}`,
    `연장매출: ${formatAmount(data.renewalAmount)}`,
    ...(specialNotes !== '없음' ? [`비고: ${specialNotes}`] : []),
  ].join('\n')

  const kakaoVariables = {
    '#{department}': data.department || '-',
    '#{inputPerson}': data.aeNames.join(', ') || '-',
    '#{salesType}': resultText,
    '#{clientName}': data.clientName || '-',
    '#{productName}': data.performanceMonth || '-',
    '#{totalAmount}': formatAmount(data.renewalAmount),
    '#{specialNotes}': specialNotes,
  }

  await sendToAll(text, KAKAO_NEW_SALE_TEMPLATE, kakaoVariables)
}

// 댓글 알림
export async function notifyNewReply(data: {
  authorName: string
  clientName: string
  replyText: string
}) {
  const text = [
    '[위즈더플래닝] 새 덧글',
    '',
    `작성자: ${data.authorName}`,
    `광고주: ${data.clientName}`,
    `내용: ${data.replyText.length > 50 ? data.replyText.substring(0, 50) + '...' : data.replyText}`,
  ].join('\n')

  const kakaoVariables = {
    '#{authorName}': data.authorName || '-',
    '#{clientName}': data.clientName || '-',
    '#{replyText}': data.replyText || '-',
  }

  await sendToAll(text, KAKAO_NEW_REPLY_TEMPLATE, kakaoVariables)
}

// 전체 수신자에게 발송
async function sendToAll(text: string, templateId?: string, variables?: Record<string, string>) {
  if (DISABLE_ALERTS) {
    console.log('알림 발송이 비활성화되어 있습니다 (SOLAPI_DISABLE_ALERTS=true)')
    return
  }

  try {
    const isKakaoReady = KAKAO_PF_ID && templateId

    const messages = NOTIFICATION_RECIPIENTS.map(to => {
      // 카카오톡 알림톡 발송 (준비된 경우)
      if (isKakaoReady) {
        return {
          to,
          from: SENDER_NUMBER,
          text,
          type: 'ATA' as const, // 알림톡
          kakaoOptions: {
            pfId: KAKAO_PF_ID,
            templateId: templateId,
            variables: variables || {},
            disableSms: false, // 알림톡 실패 시 SMS로 대체 발송
          },
        }
      }

      // 기본 LMS/SMS 발송 (카카오톡 설정이 안된 경우)
      return {
        to,
        from: SENDER_NUMBER,
        text,
      }
    })

    const result = await messageService.send(messages)
    console.log('✅ 알림 발송 완료:', JSON.stringify(result, null, 2))
    return result
  } catch (error: any) {
    console.error('❌ 알림 발송 실패:', error?.message || error)
    if (error?.response) {
      console.error('❌ SOLAPI 응답 상세:', JSON.stringify(error.response, null, 2))
    }
    // 알림 실패가 본 기능을 막지 않도록 에러를 던지지 않음
  }
}
