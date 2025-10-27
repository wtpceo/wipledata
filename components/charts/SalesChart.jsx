'use client';

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// 색상 팔레트
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// 커스텀 툴팁
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-3 border rounded-lg shadow-lg">
        <p className="font-semibold">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: ₩{new Intl.NumberFormat('ko-KR').format(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// 라인 차트 컴포넌트 (일별/월별 매출 추이)
export function SalesLineChart({ data, title = '매출 추이', description = '기간별 매출 현황' }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  // 데이터 포맷팅
  const formattedData = data.map(item => ({
    ...item,
    date: item.date ? item.date.substring(5) : '', // MM-DD 형식으로 표시
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis
              tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="amount"
              stroke="#0088FE"
              strokeWidth={2}
              name="매출"
              dot={{ fill: '#0088FE', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// 바 차트 컴포넌트 (카테고리별 매출)
export function CategoryBarChart({ data, title = '카테고리별 매출', description = '카테고리별 매출 분포' }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis
              tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar
              dataKey="amount"
              fill="#00C49F"
              name="매출"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// 파이 차트 컴포넌트 (카테고리 비율)
export function CategoryPieChart({ data, title = '카테고리 구성비', description = '전체 매출 대비 카테고리별 비율' }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  // 총 매출 계산
  const total = data.reduce((sum, item) => sum + item.amount, 0);

  // 퍼센티지 계산
  const dataWithPercentage = data.map(item => ({
    ...item,
    percentage: ((item.amount / total) * 100).toFixed(1)
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={dataWithPercentage}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${entry.percentage}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="amount"
            >
              {dataWithPercentage.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// 통합 대시보드 차트 컴포넌트
export function DashboardCharts({ salesData }) {
  if (!salesData) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        차트 데이터를 로딩중입니다...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 월별 매출 추이 */}
      {salesData.monthly && salesData.monthly.length > 0 && (
        <SalesLineChart
          data={salesData.monthly}
          title="월별 매출 추이"
          description="최근 월별 매출 변화 추이"
        />
      )}

      {/* 카테고리별 매출 분포 */}
      <div className="grid gap-6 md:grid-cols-2">
        {salesData.categories && salesData.categories.length > 0 && (
          <>
            <CategoryBarChart
              data={salesData.categories}
              title="카테고리별 매출액"
              description="카테고리별 매출 금액 비교"
            />
            <CategoryPieChart
              data={salesData.categories}
              title="카테고리 구성비"
              description="전체 매출 대비 카테고리별 비율"
            />
          </>
        )}
      </div>

      {/* 일별 매출 추이 (최근 30일) */}
      {salesData.daily && salesData.daily.length > 0 && (
        <SalesLineChart
          data={salesData.daily.slice(-30)}
          title="일별 매출 추이 (최근 30일)"
          description="최근 30일간 일별 매출 변화"
        />
      )}
    </div>
  );
}