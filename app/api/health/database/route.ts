import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createAdminClient()
    
    // Test database connection by checking if tables exist
    const { data: tablesData, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['users', 'avatars'])

    if (tablesError) {
      return NextResponse.json({ 
        status: 'error', 
        message: 'Database connection failed',
        error: tablesError.message
      }, { status: 500 })
    }

    const tableNames = tablesData?.map(t => t.table_name) || []
    const hasUsersTable = tableNames.includes('users')
    const hasAvatarsTable = tableNames.includes('avatars')

    // Check RLS policies
    const { data: policiesData, error: policiesError } = await supabase
      .from('pg_policies')
      .select('tablename, policyname')
      .in('tablename', ['users', 'avatars'])

    const policies = policiesData || []

    return NextResponse.json({
      status: 'success',
      database: {
        connected: true,
        tables: {
          users: hasUsersTable,
          avatars: hasAvatarsTable
        },
        policies: policies.length,
        policyDetails: policies
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    return NextResponse.json({ 
      status: 'error', 
      message: 'Database health check failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
