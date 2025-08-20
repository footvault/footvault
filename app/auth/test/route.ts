import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  
  console.log('=== AUTH TEST DEBUG ===')
  console.log('Full URL:', request.url)
  console.log('All search params:', Object.fromEntries(searchParams.entries()))
  console.log('Headers:', Object.fromEntries(request.headers.entries()))
  console.log('========================')
  
  return NextResponse.json({
    message: 'Auth test endpoint',
    url: request.url,
    searchParams: Object.fromEntries(searchParams.entries()),
    timestamp: new Date().toISOString()
  })
}
