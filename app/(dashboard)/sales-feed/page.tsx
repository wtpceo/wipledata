"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MessageSquare, Send, Package } from "lucide-react"
import { useSession } from "next-auth/react"

const INTERNAL_TEAM = ['이수빈', '최호천', '조아라', '정우진', '양주미', '김민우', '박한']
const SALES_TEAM = ['박현수', '박은수']

const getDeptStyles = (name: string, dept: string) => {
    if (INTERNAL_TEAM.includes(name) || dept === '내무부') return { text: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200' }
    if (SALES_TEAM.includes(name) || dept === '영업부') return { text: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' }
    return { text: 'text-gray-700', bg: 'bg-gray-200', border: 'border-gray-300' }
}

export default function SalesFeedPage() {
    const [allData, setAllData] = useState<any[]>([])
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    const [activeReplyId, setActiveReplyId] = useState<string | null>(null)
    const [replyText, setReplyText] = useState('')
    const [replyName, setReplyName] = useState('')
    const [isSubmittingReply, setIsSubmittingReply] = useState(false)

    const { data: session } = useSession()

    useEffect(() => {
        if (session?.user?.name) {
            setReplyName(session.user.name)
        }
    }, [session?.user?.name])

    useEffect(() => {
        fetchSalesFeed()
        // 1분(60초)마다 데이터 자동 갱신
        const interval = setInterval(() => {
            fetchSalesFeed()
        }, 60000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (!searchQuery.trim()) {
            setData(allData)
            return
        }
        const lowerQ = searchQuery.toLowerCase()
        const filtered = allData.filter(sale =>
            (sale.clientName || '').toLowerCase().includes(lowerQ) ||
            (sale.inputPerson || '').toLowerCase().includes(lowerQ) ||
            (sale.productName || '').toLowerCase().includes(lowerQ) ||
            (sale.consultationContent || '').toLowerCase().includes(lowerQ) ||
            (sale.specialNotes || '').toLowerCase().includes(lowerQ)
        )
        setData(filtered)
    }, [searchQuery, allData])

    const fetchSalesFeed = async () => {
        try {
            setLoading(true)
            const response = await fetch('/api/sales-feed')
            if (response.ok) {
                const json = await response.json()
                setAllData(json.data || [])
            }
        } catch (error) {
            console.error('Failed to fetch sales feed data:', error)
        } finally {
            setLoading(false)
        }
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW',
            maximumFractionDigits: 0,
        }).format(amount)
    }

    const submitReply = async (rowIndex: number, saleId: string) => {
        if (!replyName.trim() || !replyText.trim()) {
            alert('이름과 답장 내용을 모두 입력해주세요.')
            return
        }

        try {
            setIsSubmittingReply(true)

            const response = await fetch('/api/sales-feed/reply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rowIndex,
                    authorName: replyName,
                    replyText
                })
            })

            if (response.ok) {
                setReplyText('')
                setActiveReplyId(null)
                await fetchSalesFeed() // 덧글 작성 후 바로 새로고침
            } else {
                alert('답장 등록에 실패했습니다.')
            }
        } catch (error) {
            console.error(error)
            alert('오류가 발생했습니다.')
        } finally {
            setIsSubmittingReply(false)
        }
    }

    // 오늘 날짜 구하기 (YYYY-MM-DD 패턴 검증을 위한 날짜형태)
    const todayDate = new Date()
    const year = todayDate.getFullYear()
    const month = String(todayDate.getMonth() + 1).padStart(2, '0')
    const day = String(todayDate.getDate()).padStart(2, '0')
    const yyyy_mm_dd_dash = `${year}-${month}-${day}` // 2026-02-23
    const yyyy_mm_dd_dot1 = `${year}. ${todayDate.getMonth() + 1}. ${todayDate.getDate()}.` // 2026. 2. 23.
    const yyyy_mm_dd_dot2 = `${year}. ${month}. ${day}.` // 2026. 02. 23.

    const isToday = (dateStr: string) => {
        if (!dateStr) return false;
        return dateStr.startsWith(yyyy_mm_dd_dash) ||
            dateStr.startsWith(yyyy_mm_dd_dot1) ||
            dateStr.startsWith(yyyy_mm_dd_dot2) ||
            dateStr.replace(/\s/g, '').startsWith(`${year}.${month}.${day}`) ||
            dateStr.replace(/\s/g, '').startsWith(`${year}.${todayDate.getMonth() + 1}.${todayDate.getDate()}`);
    }

    const todaysSales = allData.filter(sale => isToday(sale.contractDate) || isToday(sale.timestamp))
    const todaysTotalAmount = todaysSales.reduce((acc, sale) => acc + sale.totalAmount, 0)

    return (
        <div className="space-y-6 max-w-[1400px] mx-auto pb-10 flex flex-col xl:flex-row gap-6">

            {/* Main Feed Section */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">매출 피드</h2>
                        <p className="text-muted-foreground mt-1">
                            2026년 1월부터의 모든 매출 및 연장 내역이 실시간으로 제공되며, 답장을 남길 수 있습니다.
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2 my-4 relative">
                    <Search className="absolute left-3 w-4 h-4 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="담당자 이름, 업체명, 상품명, 특이사항/입금 등 검색..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 h-11 border-gray-300 max-w-xl bg-white focus-visible:ring-1"
                    />
                </div>

                {/* 실시간 매출 게시판 (Naver Band Style) */}
                <Card className="bg-[#ebedf0] shadow-inner border-0">
                    <CardHeader className="pb-2 pt-4 px-4 bg-white rounded-t-lg border-b flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                전체 실시간 매출 피드 (2026년~)
                            </CardTitle>
                            <CardDescription>
                                1분 주기로 자동 업데이트 됩니다. {data.length} 건 검색됨.
                            </CardDescription>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchSalesFeed} disabled={loading}>
                            {loading ? '로딩 중...' : '새로고침'}
                        </Button>
                    </CardHeader>
                    <CardContent className="p-4 h-[calc(100vh-280px)] min-h-[500px] overflow-y-auto flex flex-col gap-2">
                        {data && data.length > 0 ? (
                            (() => {
                                // 날짜별 그룹핑
                                const grouped: Record<string, any[]> = {}
                                data.forEach(sale => {
                                    const dateKey = sale.contractDate || sale.timestamp?.split('T')[0] || '날짜없음'
                                    if (!grouped[dateKey]) grouped[dateKey] = []
                                    grouped[dateKey].push(sale)
                                })

                                const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

                                return sortedDates.map(dateKey => {
                                    const salesInDate = grouped[dateKey]
                                    const dateObj = new Date(dateKey)
                                    const isValidDate = !isNaN(dateObj.getTime())
                                    const displayDate = isValidDate
                                        ? `${dateObj.getMonth() + 1}월 ${dateObj.getDate()}일 (${['일', '월', '화', '수', '목', '금', '토'][dateObj.getDay()]})`
                                        : dateKey
                                    const dateTotalAmount = salesInDate.reduce((a: number, s: any) => a + s.totalAmount, 0)

                                    return (
                                        <div key={dateKey} className="mb-1">
                                            {/* 날짜 헤더 */}
                                            <div className="sticky top-0 z-10 flex items-center gap-2 py-1.5 px-1 mb-1">
                                                <div className="h-px flex-1 bg-gray-300" />
                                                <span className="text-[11px] font-bold text-gray-600 bg-[#ebedf0] px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-sm border border-gray-200">
                                                    📅 {displayDate} · {salesInDate.length}건 · {formatCurrency(dateTotalAmount)}
                                                </span>
                                                <div className="h-px flex-1 bg-gray-300" />
                                            </div>

                                            <div className="flex flex-col gap-3">
                                                {salesInDate.map((sale) => {
                                                    const deptStyle = getDeptStyles(sale.inputPerson, sale.department)
                                                    return (
                                                        <div key={sale.id} className="flex gap-2.5 animate-in slide-in-from-bottom-2 fade-in duration-300">
                                                            <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-bold shadow-sm border ${deptStyle.bg} ${deptStyle.border} ${deptStyle.text}`}>
                                                                {sale.inputPerson?.charAt(0) || '👤'}
                                                            </div>
                                                            <div className="flex flex-col max-w-[90%] w-full">
                                                                <span className={`text-[13px] mb-0.5 ml-0.5 font-bold ${deptStyle.text}`}>
                                                                    {sale.inputPerson} <span className="text-[11px] font-normal opacity-70">({sale.department})</span>
                                                                </span>
                                                                <div className="bg-white px-3 py-2.5 rounded-xl rounded-tl-sm shadow-sm text-sm whitespace-pre-line text-gray-800 leading-normal font-normal">
                                                                    <div className="font-semibold text-[14px] flex items-center gap-1.5 mb-1.5 flex-wrap">
                                                                        {sale.contractType === '연장' ? (
                                                                            <span className="text-blue-600 bg-blue-50 px-1.5 flex items-center h-5 rounded text-xs whitespace-nowrap border border-blue-100">[연장]</span>
                                                                        ) : sale.contractType === '신규' ? (
                                                                            <span className="text-pink-600 bg-pink-50 px-1.5 flex items-center h-5 rounded text-xs whitespace-nowrap border border-pink-100">[신규]</span>
                                                                        ) : sale.contractType ? (
                                                                            <span className="text-gray-600 bg-gray-100 px-1.5 flex items-center h-5 rounded text-xs whitespace-nowrap border border-gray-200">[{sale.contractType}]</span>
                                                                        ) : null}
                                                                        <span className="tracking-tight">{sale.productName ? `${sale.productName}) ` : ''}{sale.clientName}</span>
                                                                    </div>

                                                                    <div className="text-[13px] bg-[#f8fafc] px-3 py-2 rounded-md border border-slate-100 inline-block w-full">
                                                                        {sale.contractPeriod ? <span className="mr-4"><b>계약기간:</b> {sale.contractPeriod}</span> : ''}
                                                                        <span className={sale.totalAmount > 0 ? 'text-blue-700 font-medium' : ''}><b>금액:</b> {formatCurrency(sale.totalAmount)}</span>
                                                                        {sale.paymentMethod === '입금예정' ? (
                                                                            <span className="ml-2 text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs font-semibold border border-orange-200">⏳ 입금예정</span>
                                                                        ) : sale.paymentMethod === '입금확인' ? (
                                                                            <span className="ml-2 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold border border-emerald-200">✅ 입금확인</span>
                                                                        ) : sale.paymentMethod ? (
                                                                            <span className="ml-2 text-gray-500"> / {sale.paymentMethod}{sale.approvalNum && sale.approvalNum.trim() !== '' ? ` (승인번호: ${sale.approvalNum})` : ''}</span>
                                                                        ) : null}
                                                                    </div>

                                                                    {/* 미디어 계약 정보 */}
                                                                    {sale.mediaComplexName && (() => {
                                                                        const names = (sale.mediaComplexName as string).split(' | ')
                                                                        const counts = sale.mediaInstallCount ? (sale.mediaInstallCount as string).split(' | ') : []
                                                                        const prices = sale.mediaUnitPrice ? (sale.mediaUnitPrice as string).split(' | ') : []
                                                                        return (
                                                                            <div className="mt-2 text-[12px] bg-orange-50 px-3 py-1.5 rounded-md border border-orange-100 space-y-1">
                                                                                {names.map((name, idx) => (
                                                                                    <div key={idx} className="flex items-center gap-3 flex-wrap">
                                                                                        {idx === 0 && <span className="font-semibold text-orange-700">🏢 미디어</span>}
                                                                                        {idx > 0 && <span className="w-[52px]" />}
                                                                                        <span><b>{name}</b></span>
                                                                                        {counts[idx] && <span className="text-gray-500">{counts[idx]}대</span>}
                                                                                        {prices[idx] && <span className="text-gray-500">{formatCurrency(parseInt(prices[idx]))}원</span>}
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        )
                                                                    })()}

                                                                    {/* 덧글이 있을 경우만 표시 (특이사항 본문 제외, 덧글만 추출) */}
                                                                    {sale.specialNotes && (() => {
                                                                        const notesString = sale.specialNotes as string;
                                                                        const replyRegex = /\n\n\[\u21aa (.*?) 님의 덧글 - (.*?)\]\n([\s\S]*?)(?=\n\n\[\u21aa|$)/g;
                                                                        const replyMatches = [...notesString.matchAll(replyRegex)];

                                                                        const deleteReply = async (replyString: string, rowIndex: number) => {
                                                                            if (!confirm('이 덧글을 삭제하시겠습니까?')) return;
                                                                            try {
                                                                                const response = await fetch('/api/sales-feed/reply/delete', {
                                                                                    method: 'POST',
                                                                                    headers: { 'Content-Type': 'application/json' },
                                                                                    body: JSON.stringify({ rowIndex, replyString })
                                                                                });
                                                                                if (response.ok) {
                                                                                    await fetchSalesFeed();
                                                                                } else {
                                                                                    alert('삭제에 실패했습니다.');
                                                                                }
                                                                            } catch (error) {
                                                                                alert('오류가 발생했습니다.');
                                                                            }
                                                                        };

                                                                        if (replyMatches.length === 0) return null;

                                                                        return (
                                                                            <div className="mt-2 pt-2 border-t border-dashed border-gray-200">
                                                                                <div className="space-y-2">
                                                                                    {replyMatches.map((match, i) => {
                                                                                        const fullMatchString = match[0];
                                                                                        const author = match[1];
                                                                                        const date = match[2];
                                                                                        const content = match[3];
                                                                                        return (
                                                                                            <div key={i} className="flex gap-2">
                                                                                                <div className="bg-indigo-50/80 border border-indigo-100 rounded-lg p-2 flex-1 shadow-sm relative group">
                                                                                                    <div className="flex justify-between items-start mb-1">
                                                                                                        <span className="font-bold text-gray-700 text-[12px]">{author}</span>
                                                                                                        <span className="text-gray-400 text-[11px]">{date}</span>
                                                                                                    </div>
                                                                                                    <div className="text-gray-800 text-[12px] whitespace-pre-wrap">{content.trim()}</div>

                                                                                                    <button
                                                                                                        onClick={() => deleteReply(fullMatchString, sale.rowIndex)}
                                                                                                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-600 bg-white rounded-full p-1 shadow-sm border border-gray-100"
                                                                                                        title="덧글 삭제"
                                                                                                    >
                                                                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                                                                                    </button>
                                                                                                </div>
                                                                                            </div>
                                                                                        )
                                                                                    })}
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    })()}

                                                                    {/* 덧글 섹션 (Reply Section) */}
                                                                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between">
                                                                        <Button
                                                                            variant="ghost"
                                                                            size="sm"
                                                                            className="text-gray-500 hover:text-gray-800 hover:bg-gray-100 p-1 h-auto rounded-md transition-colors text-xs"
                                                                            onClick={() => setActiveReplyId(activeReplyId === sale.id ? null : sale.id)}
                                                                        >
                                                                            <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                                                                            {activeReplyId === sale.id ? '접기' : '답장'}
                                                                        </Button>
                                                                    </div>

                                                                    {activeReplyId === sale.id && (
                                                                        <div className="mt-2 bg-gray-50/80 p-2.5 rounded-lg border border-gray-200 shadow-sm flex flex-col gap-1.5">
                                                                            <div className="flex gap-2">
                                                                                <Input
                                                                                    placeholder="직원 이름"
                                                                                    className="w-28 bg-white border-gray-300 pointer-events-none opacity-80"
                                                                                    value={replyName}
                                                                                    readOnly
                                                                                    maxLength={10}
                                                                                />
                                                                                <Input
                                                                                    placeholder="답장 및 코멘트를 입력하세요 (특이사항 하단에 추가됩니다)..."
                                                                                    className="flex-1 bg-white border-gray-300"
                                                                                    value={replyText}
                                                                                    onChange={(e) => setReplyText(e.target.value)}
                                                                                    onKeyDown={(e) => {
                                                                                        if (e.key === 'Enter') submitReply(sale.rowIndex, sale.id)
                                                                                    }}
                                                                                />
                                                                                <Button size="icon" className="bg-indigo-600 hover:bg-indigo-700" onClick={() => submitReply(sale.rowIndex, sale.id)} disabled={isSubmittingReply}>
                                                                                    <Send className="w-4 h-4" />
                                                                                </Button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] text-gray-400 mt-1 ml-0.5 flex items-center gap-1.5 tracking-wide font-medium">
                                                                    {sale.timestamp ? new Date(sale.timestamp.replace(/\./g, '-')).toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })
                            })()
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 pb-10">
                                {loading ? (
                                    <div className="animate-pulse">데이터를 불러오는 중입니다...</div>
                                ) : (
                                    <>
                                        <Search className="w-12 h-12 mb-3 text-gray-200 gap-1" />
                                        <div className="text-base font-medium text-gray-500">검색 결과가 없습니다.</div>
                                        <div className="text-sm mt-1 text-gray-400">다른 검색어를 입력해보세요.</div>
                                    </>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Right Side Summary Panel */}
            <div className="xl:w-[350px] flex-shrink-0 mt-8 xl:mt-[72px]">
                <Card className="shadow-sm border-gray-200 overflow-hidden">
                    <CardHeader className="bg-slate-900 text-white rounded-t-lg pb-4">
                        <CardTitle className="text-xl flex items-center gap-2">오늘의 영업 현황</CardTitle>
                        <CardDescription className="text-slate-300 font-medium tracking-wide">
                            {yyyy_mm_dd_dash} 기준
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 bg-white">
                        <div className="p-6 pb-5 border-b border-gray-100 flex flex-col gap-1 bg-gradient-to-br from-white to-slate-50">
                            <span className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">오늘 총 발생 매출</span>
                            <span className="text-[34px] leading-tight font-extrabold text-blue-600 tracking-tight">
                                {formatCurrency(todaysTotalAmount)}
                            </span>
                            <span className="text-[13px] font-semibold text-gray-400 mt-1 flex items-center gap-1.5">
                                총 <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded leading-none">{todaysSales.length}</span> 건 승인 됨
                            </span>
                        </div>

                        <div className="p-5 bg-white">
                            <div className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-4 px-1 flex items-center justify-between">
                                <span>상세 계약 내역</span>
                                <span>{todaysSales.length}건</span>
                            </div>
                            <div className="flex flex-col gap-3 pb-2">
                                {todaysSales.length > 0 ? (
                                    (() => {
                                        // 담당자별 그룹핑
                                        const groupedByPerson: Record<string, any[]> = {}
                                        todaysSales.forEach((sale) => {
                                            const person = sale.inputPerson || '미지정'
                                            if (!groupedByPerson[person]) groupedByPerson[person] = []
                                            groupedByPerson[person].push(sale)
                                        })

                                        return Object.entries(groupedByPerson).map(([person, sales]) => {
                                            const personStyle = getDeptStyles(person, sales[0]?.department)
                                            const personTotal = sales.reduce((acc: number, s: any) => acc + s.totalAmount, 0)
                                            return (
                                                <div key={`group-${person}`} className="rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
                                                    {/* 담당자 헤더 */}
                                                    <div className="flex items-center gap-3 px-3.5 py-3 bg-white border-b border-gray-100">
                                                        <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center flex-shrink-0 text-sm shadow-sm border ${personStyle.bg} ${personStyle.text} ${personStyle.border}`}>
                                                            {person.charAt(0)}
                                                        </div>
                                                        <div className="flex flex-col min-w-0 flex-1">
                                                            <div className="flex items-center justify-between">
                                                                <span className={`text-[14px] font-bold ${personStyle.text}`}>{person}</span>
                                                                <span className="text-[11px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{sales.length}건</span>
                                                            </div>
                                                            <span className="text-[12px] font-semibold text-blue-600 mt-0.5">{formatCurrency(personTotal)}</span>
                                                        </div>
                                                    </div>
                                                    {/* 계약 목록 */}
                                                    <div className="flex flex-col divide-y divide-gray-100">
                                                        {sales.map((sale) => (
                                                            <div key={`summary-${sale.id}`} className="flex items-center gap-2.5 px-3.5 py-2.5 hover:bg-gray-100/50 transition-colors">
                                                                <div className="flex flex-col min-w-0 flex-1">
                                                                    <span className="text-[13px] font-semibold text-gray-800 truncate leading-tight">{sale.clientName}</span>
                                                                    <div className="flex items-center gap-1.5 mt-0.5">
                                                                        <span className={sale.contractType === '연장' ? 'text-blue-600 font-bold text-[11px]' : 'text-pink-600 font-bold text-[11px]'}>
                                                                            {sale.contractType || '신규'}
                                                                        </span>
                                                                        <span className="text-[11px] text-gray-400">·</span>
                                                                        <span className="text-[11px] font-medium text-gray-500">{formatCurrency(sale.totalAmount)}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )
                                        })
                                    })()
                                ) : (
                                    <div className="py-10 text-center text-gray-400 text-sm bg-gray-50 rounded-lg border border-dashed border-gray-200 font-medium">
                                        오늘 자로 등록된 계약이 없습니다.
                                    </div>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
