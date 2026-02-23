import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet, updateSheet } from '@/lib/google-sheets'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { rowIndex, authorName, replyText } = body

        if (!rowIndex || !authorName || !replyText) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        // Read the current specialNotes (column M is index 12 in the row array)
        // Range: 원본데이터!M{rowIndex}
        const cellRange = `원본데이터!M${rowIndex}`
        const data = await readFromSheet(cellRange)

        // Google Sheets gives an empty array if cell is entirely empty, or nested array mapped to 1 value
        const currentNotes = data && data[0] && data[0][0] ? data[0][0] : ''

        // Prepare the formatted reply string
        const now = new Date().toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
        const replyString = `\n\n[↪ ${authorName} 님의 덧글 - ${now}]\n${replyText}`

        // Append the reply
        const finalNotes = currentNotes + replyString

        // Ensure we start writing back to the exact same cell M{rowIndex}
        await updateSheet(cellRange, [[finalNotes]])

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to post reply', error)
        return NextResponse.json({ error: 'Failed to post reply' }, { status: 500 })
    }
}
