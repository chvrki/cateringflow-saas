import { NextResponse } from 'next/server'
import { renderToStream } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { QuoteDocument } from '@/lib/pdf/QuoteDocument'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    const { data: profile } = await (supabase
      .from('profiles')
      .select('tenant_id')
      .eq('id', user.id)
      .single() as any)

    const { data: quote } = await (supabase
      .from('quotes') as any)
      .select('*')
      .eq('id', params.id)
      .eq('tenant_id', profile?.tenant_id ?? '')
      .single()

    if (!quote) return new NextResponse('Quote not found', { status: 404 })

    const { data: tenant } = await (supabase
      .from('tenants') as any)
      .select('name')
      .eq('id', quote.tenant_id)
      .single()

    if (!tenant) return new NextResponse('Tenant not found', { status: 404 })

    const stream = await renderToStream(QuoteDocument({ tenant, quote }))

    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Uint8Array) => controller.enqueue(chunk))
        stream.on('end', () => controller.close())
        stream.on('error', (error: Error) => controller.error(error))
      },
    })

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="presupuesto-${quote.id}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating quote PDF:', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
