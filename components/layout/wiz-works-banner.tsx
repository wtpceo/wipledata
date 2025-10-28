"use client"

import Link from 'next/link'
import { ExternalLink, Wrench } from 'lucide-react'

export function WizWorksBanner() {
  return (
    <Link
      href="https://wizworks.vercel.app/"
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all duration-300"
    >
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-3 text-white">
          <Wrench className="h-5 w-5" />
          <span className="font-semibold text-sm md:text-base">
            Wiz Works - 업무 효율을 높이는 필수 툴
          </span>
          <ExternalLink className="h-4 w-4" />
        </div>
      </div>
    </Link>
  )
}
