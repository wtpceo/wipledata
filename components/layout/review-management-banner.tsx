"use client"

import Link from 'next/link'
import { ExternalLink, MessageSquare } from 'lucide-react'

export function ReviewManagementBanner() {
  return (
    <Link
      href="https://review-data-new.vercel.app"
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 transition-all duration-300"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-3 text-white">
          <MessageSquare className="h-5 w-5" />
          <span className="font-semibold text-sm md:text-base">
            덧글 관리 시스템 - 고객 리뷰 관리
          </span>
          <ExternalLink className="h-4 w-4" />
        </div>
      </div>
    </Link>
  )
}
