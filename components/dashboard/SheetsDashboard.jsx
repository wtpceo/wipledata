'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useSheetData } from '@/hooks/useSheetData';
import { RefreshCw, TrendingUp, Target, DollarSign, Activity } from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function SheetsDashboard() {
  const { data, loading, error, lastUpdated, refresh } = useSheetData('sales', 60000); // 1분마다 자동 새로고침
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // 오늘 매출 계산
  const getTodaySales = () => {
    if (!data?.daily) return 0;
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayData = data.daily.find(d => d.date === today);
    return todayData?.amount || 0;
  };

  // 이번 달 매출 계산
  const getMonthSales = () => {
    if (!data?.monthly) return 0;
    const currentMonth = format(new Date(), 'yyyy-MM');
    const monthData = data.monthly.find(d => d.date === currentMonth);
    return monthData?.amount || 0;
  };

  // 전월 대비 성장률
  const getGrowthRate = () => {
    if (!data?.monthly || data.monthly.length < 2) return 0;
    const sortedMonths = [...data.monthly].sort((a, b) => b.date.localeCompare(a.date));
    if (sortedMonths.length < 2) return 0;

    const current = sortedMonths[0]?.amount || 0;
    const previous = sortedMonths[1]?.amount || 0;

    if (previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // 숫자 포맷팅
  const formatNumber = (num) => {
    if (!num) return '0';
    return new Intl.NumberFormat('ko-KR').format(Math.round(num));
  };

  // 금액 포맷팅
  const formatCurrency = (amount) => {
    if (!amount) return '₩0';
    if (amount >= 100000000) {
      return `₩${(amount / 100000000).toFixed(1)}억`;
    } else if (amount >= 10000) {
      return `₩${(amount / 10000).toFixed(0)}만`;
    }
    return `₩${formatNumber(amount)}`;
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-500">Google Sheets 연동 오류</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRefresh} size="sm">다시 시도</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Google Sheets 데이터 섹션 */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Google Sheets 실시간 데이터</h3>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-sm text-muted-foreground">
              마지막 업데이트: {format(lastUpdated, 'HH:mm:ss', { locale: ko })}
            </span>
          )}
          <Button
            onClick={handleRefresh}
            disabled={loading || isRefreshing}
            size="sm"
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            새로고침
          </Button>
        </div>
      </div>

      {/* Google Sheets 지표 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* 오늘 매출 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 매출 (Sheets)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '로딩중...' : formatCurrency(getTodaySales())}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(), 'yyyy년 MM월 dd일')}
            </p>
          </CardContent>
        </Card>

        {/* 이번 달 매출 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">이번 달 매출 (Sheets)</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '로딩중...' : formatCurrency(getMonthSales())}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {format(new Date(), 'yyyy년 MM월')}
            </p>
          </CardContent>
        </Card>

        {/* 전월 대비 성장률 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">전월 대비 성장률</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '로딩중...' : `${getGrowthRate()}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {getGrowthRate() > 0 ? '▲ 증가' : getGrowthRate() < 0 ? '▼ 감소' : '→ 동일'}
            </p>
          </CardContent>
        </Card>

        {/* 카테고리 수 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">판매 카테고리</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '로딩중...' : data?.categories?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              활성 카테고리 수
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 카테고리별 매출 */}
      {data?.categories && data.categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>카테고리별 매출 (Google Sheets)</CardTitle>
            <CardDescription>각 카테고리별 매출 현황</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.categories.slice(0, 5).map((category, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium">{category.name}</span>
                  </div>
                  <span className="text-sm font-semibold">{formatCurrency(category.amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}