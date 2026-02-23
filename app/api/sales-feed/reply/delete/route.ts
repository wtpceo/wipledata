import { NextRequest, NextResponse } from 'next/server'
import { readFromSheet, updateSheet } from '@/lib/google-sheets'

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { rowIndex, replyString } = body

        if (!rowIndex || !replyString) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const cellRange = `원본데이터!M${rowIndex}`
        const data = await readFromSheet(cellRange)

        const currentNotes = data && data[0] && data[0][0] ? data[0][0] : ''

        // Remove the exact reply string from the notes
        // We also remove the leading \n\n that was added when creating the reply
        const finalNotes = currentNotes.replace(replyString, '').trim()

        await updateSheet(cellRange, [[finalNotes]])

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Failed to delete reply', error)
        return NextResponse.json({ error: 'Failed to delete reply' }, { status: 500 })
    }
}
