'use client';

import dynamic from 'next/dynamic';
import SheetsDashboard from '@/components/dashboard/SheetsDashboard';

// 차트 컴포넌트를 동적으로 로드 (SSR 비활성화)
const DashboardCharts = dynamic(
  () => import('@/components/charts/SalesChart').then(mod => mod.DashboardCharts),
  { ssr: false }
);

import { useSheetData } from '@/hooks/useSheetData';

export default function SheetsPage() {
  const { data: salesData, loading, error } = useSheetData('sales', 60000);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Google Sheets 대시보드</h2>
        <p className="text-muted-foreground">
          Google Sheets와 연동된 실시간 매출 데이터를 확인하세요.
        </p>
      </div>

      {/* Google Sheets 대시보드 메인 컴포넌트 */}
      <SheetsDashboard />

      {/* 차트 섹션 */}
      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4">데이터 시각화</h3>
        {loading ? (
          <div className="flex items-center justify-center h-96 text-muted-foreground">
            차트를 로딩중입니다...
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-96 text-red-500">
            차트 로드 실패: {error}
          </div>
        ) : (
          <DashboardCharts salesData={salesData} />
        )}
      </div>
    </div>
  );
}