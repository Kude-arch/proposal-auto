import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface ItemDraft {
  title: string
  keywords: string[]
  image_url: string
  thumbnail_url?: string
  section_hints?: string[]
  source_file?: string
  created_by: string
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })

  const { items }: { items: ItemDraft[] } = await req.json()

  const saved: string[] = []
  const failed: string[] = []

  for (const item of items) {
    try {
      const embedText = `${item.title} ${item.keywords.join(' ')}`
      const result = await model.embedContent(embedText.slice(0, 8000))
      const embedding = result.embedding.values

      const { data, error } = await supabase
        .from('items')
        .insert({
          ...item,
          embedding,
          keywords: item.keywords.slice(0, 30),
        })
        .select('id')
        .single()

      if (error) throw error
      saved.push(data.id)
    } catch (e) {
      console.error('[confirm] error:', item.title, e)
      failed.push(item.title)
    }
  }

  return NextResponse.json({ saved: saved.length, failed })
}
