// User and Auth types
export type UserRole = 'ADMIN' | 'EXECUTIVE' | 'MANAGER' | 'STAFF' | 'SALES'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  department: string
  createdAt?: Date
  updatedAt?: Date
}

// Department types
export type Department =
  | '영업부'
  | '토탈마케팅'
  | '배달앱운영대행팀'
  | '디자인팀'
  | '체험단관리팀'
  | '브랜드블로그운영팀'
  | '영상편집팀'
  | '영상촬영팀'
  | '당근앱관리팀'
  | '퍼포먼스팀'

// Product types
export type Product =
  | '토탈 관리'
  | '브랜드 블로그 마케팅'
  | '퍼포먼스 마케팅'
  | '배달앱 관리'
  | '맛글만'
  | '손수체험관리'

// Contract types
export type ContractType = 'new' | 'renewal' | 'referral'

// Sales types
export interface Sale {
  id: string
  date: string
  department: Department
  inputUser: string
  contractType: ContractType
  clientName: string
  productName: Product
  contractMonths: number
  monthlyAmount: number
  totalAmount: number
  salesPerson: string
  note?: string
  createdAt?: Date
  updatedAt?: Date
}

// Purchase types
export type PurchaseType =
  | '네이버 광고'
  | '메타(페이스북/인스타) 광고'
  | '구글 광고'
  | '카카오 광고'
  | '디자인 외주'
  | '영상 외주'
  | '글작성 외주'
  | '기타'

export interface Purchase {
  id: string
  date: string
  clientName: string
  purchaseType: PurchaseType
  amount: number
  department: Department
  manager: string
  note?: string
  receiptUrl?: string
  settled: boolean
  createdAt?: Date
  updatedAt?: Date
}

// Expense types
export type ExpenseType =
  | '사무실 관리비'
  | '식비'
  | '교통비'
  | '통신비'
  | '소모품비'
  | '교육비'
  | '복리후생비'
  | '기타'

export type PaymentMethod = '법인카드' | '현금' | '계좌이체'

export interface Expense {
  id: string
  date: string
  expenseType: ExpenseType
  amount: number
  departmentAttribution: '전사공통' | Department
  paymentMethod: PaymentMethod
  inputUser: string
  note?: string
  receiptUrl?: string
  createdAt?: Date
  updatedAt?: Date
}

// Client types
export type ClientStatus = '진행중' | '종료' | '보류'

export interface Client {
  id: string
  name: string
  industry: string
  department: Department
  manager: string
  contractStartDate: string
  contractEndDate?: string
  status: ClientStatus
  salesPerson: string
  contact?: string
  email?: string
  address?: string
  notes?: string
  createdAt?: Date
  updatedAt?: Date
}

// Staff types
export type StaffPosition = 'AE' | '팀원' | '팀장' | '임원'
export type StaffStatus = '재직중' | '퇴사'

export interface Staff {
  id: string
  name: string
  department: Department
  position: StaffPosition
  joinDate: string
  resignDate?: string
  monthlySalary: number
  status: StaffStatus
  contact?: string
  email: string
  createdAt?: Date
  updatedAt?: Date
}

// Dashboard types
export interface DashboardOverview {
  monthlyGoal: number
  monthlySales: number
  monthlyRate: number
  quarterGoal: number
  quarterSales: number
  quarterRate: number
  yearGoal: number
  yearSales: number
  yearRate: number
}

export interface DepartmentStats {
  name: Department
  sales: number
  clientCount: number
  averageSalesPerPerson: number
  monthlyGrowth: number
}

export interface SalesPersonStats {
  name: string
  newClients: number
  renewals: number
  totalSales: number
  achievementRate: number
  rank: number
}

// Executive Dashboard types
export interface DepartmentProfitability {
  name: Department
  sales: number
  purchase: number
  labor: number
  expenses: number
  profit: number
  profitRate: number
  status: 'good' | 'warning' | 'danger'
}

export interface OverallProfitability {
  totalSales: number
  totalPurchase: number
  totalLabor: number
  totalExpenses: number
  totalProfit: number
  profitRate: number
}