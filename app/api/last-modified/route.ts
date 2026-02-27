import { NextResponse } from 'next/server'
import { readFromSheet } from '@/lib/google-sheets'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await readFromSheet('Settings!Z1')
    const modifiedTime = data?.[0]?.[0] || new Date(0).toISOString()
    return NextResponse.json({ modifiedTime })
  } catch (error) {
    console.error('Failed to read last modified:', error)
    return NextResponse.json({ modifiedTime: new Date(0).toISOString() })
  }
}
