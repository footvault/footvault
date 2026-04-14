import { createClient } from '@supabase/supabase-js'

type UserSubscriptionRow = {
  id: string
  email: string
  plan: string | null
  next_billing_date: string | null
  subscription_status: string | null
  subscription_ends_at: string | null
  subscription_id: string | null
  creem_customer_id: string | null
}

type CreemSubscription = {
  id?: string
  status?: string
  customer_id?: string
  cancel_at_period_end?: boolean
  current_period_end_date?: string
  next_transaction_date?: string
  product_id?: string
  product?: {
    id?: string
    name?: string
  }
}

const PRODUCT_ID_TO_PLAN = new Map(
  [
    [process.env.CREEM_PLAN_ID_INDIVIDUAL, 'Individual'],
    [process.env.CREEM_PLAN_ID_INDIVIDUAL_YEARLY, 'Individual'],
    [process.env.CREEM_PLAN_ID_TEAM, 'Team'],
    [process.env.CREEM_PLAN_ID_TEAM_YEARLY, 'Team'],
    [process.env.CREEM_PLAN_ID_STORE, 'Store'],
    [process.env.CREEM_PLAN_ID_STORE_YEARLY, 'Store'],
  ].filter((entry): entry is [string, string] => Boolean(entry[0]))
)

const STATUS_PRIORITY = [
  'active',
  'trialing',
  'past_due',
  'scheduled_cancel',
  'canceled',
  'cancelled',
  'expired',
] as const

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

export function getCreemApiBaseUrl(apiKey: string): string {
  return apiKey.startsWith('creem_test_')
    ? 'https://test-api.creem.io/v1'
    : 'https://api.creem.io/v1'
}

function normalizeCreemStatus(subscription: CreemSubscription): string | null {
  if (subscription.cancel_at_period_end) {
    return 'scheduled_cancel'
  }

  switch (subscription.status) {
    case 'active':
    case 'trialing':
      return 'active'
    case 'past_due':
      return 'past_due'
    case 'scheduled_cancel':
      return 'scheduled_cancel'
    case 'canceled':
    case 'cancelled':
      return 'canceled'
    case 'expired':
      return 'expired'
    default:
      return null
  }
}

function getPlanFromSubscription(subscription: CreemSubscription, currentPlan: string | null): string {
  const productId = subscription.product?.id || subscription.product_id
  const productName = subscription.product?.name?.toLowerCase() || ''

  if (productId && PRODUCT_ID_TO_PLAN.has(productId)) {
    return PRODUCT_ID_TO_PLAN.get(productId)!
  }

  if (productName.includes('store')) return 'Store'
  if (productName.includes('team')) return 'Team'
  if (productName.includes('individual')) return 'Individual'
  return currentPlan || 'Free'
}

function formatDate(value: string | null | undefined): string | null {
  if (!value) return null

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString().split('T')[0]
}

function selectBestSubscription(
  subscriptions: CreemSubscription[],
  currentSubscriptionId: string | null
): CreemSubscription | null {
  if (currentSubscriptionId) {
    const exactMatch = subscriptions.find((subscription) => subscription.id === currentSubscriptionId)
    if (exactMatch) {
      return exactMatch
    }
  }

  for (const status of STATUS_PRIORITY) {
    const match = subscriptions.find((subscription) => subscription.status === status)
    if (match) {
      return match
    }
  }

  return subscriptions[0] || null
}

function hasEnded(dateValue: string | null | undefined): boolean {
  if (!dateValue) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const endDate = new Date(dateValue)
  endDate.setHours(0, 0, 0, 0)

  return endDate < today
}

function hasFutureOrCurrentAccess(dateValue: string | null | undefined): boolean {
  if (!dateValue) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const endDate = new Date(dateValue)
  if (Number.isNaN(endDate.getTime())) {
    return false
  }
  endDate.setHours(0, 0, 0, 0)

  return endDate >= today
}

function shouldSyncFromCreem(user: UserSubscriptionRow): boolean {
  return Boolean(
    process.env.CREEM_API_KEY &&
    (user.subscription_id ||
      user.creem_customer_id ||
      (user.plan && user.plan !== 'Free') ||
      (user.subscription_status && user.subscription_status !== 'free'))
  )
}

export async function reconcileUserSubscription(user: UserSubscriptionRow): Promise<UserSubscriptionRow> {
  if (!shouldSyncFromCreem(user)) {
    return user
  }

  const apiKey = process.env.CREEM_API_KEY!
  const apiBaseUrl = getCreemApiBaseUrl(apiKey)
  const admin = getAdminClient()

  try {
    const canQueryCreemDirectly = Boolean(user.subscription_id)

    if (!canQueryCreemDirectly) {
      if (
        user.plan !== 'Free' &&
        (user.subscription_status === 'scheduled_cancel' || user.subscription_status === 'past_due') &&
        hasEnded(user.subscription_ends_at || user.next_billing_date)
      ) {
        const fallbackPayload = {
          plan: 'Free',
          next_billing_date: null,
          subscription_status: 'expired',
          subscription_ends_at: formatDate(user.subscription_ends_at || user.next_billing_date) || formatDate(new Date().toISOString()),
          subscription_id: null,
        }

        const { error } = await admin
          .from('users')
          .update(fallbackPayload)
          .eq('id', user.id)

        if (!error) {
          return { ...user, ...fallbackPayload }
        }
      }

      return user
    }

    const response = await fetch(`${apiBaseUrl}/subscriptions/${user.subscription_id}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.warn('Subscription reconciliation failed to fetch Creem state', await response.text())
      return user
    }

    const payload = await response.json()
    const subscription = (payload?.data || payload) as CreemSubscription | null

    if (!subscription) {
      if (
        user.plan !== 'Free' &&
        (user.subscription_status === 'scheduled_cancel' || user.subscription_status === 'past_due') &&
        hasEnded(user.subscription_ends_at || user.next_billing_date)
      ) {
        const fallbackPayload = {
          plan: 'Free',
          next_billing_date: null,
          subscription_status: 'expired',
          subscription_ends_at: formatDate(user.subscription_ends_at || user.next_billing_date) || formatDate(new Date().toISOString()),
          subscription_id: null,
        }

        const { error } = await admin
          .from('users')
          .update(fallbackPayload)
          .eq('id', user.id)

        if (!error) {
          return { ...user, ...fallbackPayload }
        }
      }

      return user
    }

    const normalizedStatus = normalizeCreemStatus(subscription)
    if (!normalizedStatus) {
      return user
    }

    const relevantDate = formatDate(subscription.current_period_end_date || subscription.next_transaction_date)
    const accessEndDate = relevantDate || user.subscription_ends_at || user.next_billing_date
    const stillHasAccess =
      (normalizedStatus === 'canceled' || normalizedStatus === 'expired') &&
      hasFutureOrCurrentAccess(accessEndDate)

    const effectiveStatus = stillHasAccess ? 'scheduled_cancel' : normalizedStatus
    const nextBillingDate = effectiveStatus === 'canceled' || effectiveStatus === 'expired'
      ? null
      : accessEndDate || user.next_billing_date

    const updatePayload: Partial<UserSubscriptionRow> = {
      creem_customer_id: subscription.customer_id || user.creem_customer_id,
      subscription_id: effectiveStatus === 'canceled' || effectiveStatus === 'expired'
        ? null
        : subscription.id || user.subscription_id,
      next_billing_date: nextBillingDate,
      subscription_status: effectiveStatus,
      subscription_ends_at:
        effectiveStatus === 'active'
          ? null
          : accessEndDate,
      plan:
        effectiveStatus === 'canceled' || effectiveStatus === 'expired'
          ? 'Free'
          : getPlanFromSubscription(subscription, user.plan),
    }

    const changed = Object.entries(updatePayload).some(([key, value]) => user[key as keyof UserSubscriptionRow] !== value)
    if (!changed) {
      return user
    }

    const { error } = await admin
      .from('users')
      .update(updatePayload)
      .eq('id', user.id)

    if (error) {
      console.warn('Subscription reconciliation failed to update user', error)
      return user
    }

    return {
      ...user,
      ...updatePayload,
    }
  } catch (error) {
    console.warn('Subscription reconciliation threw an error', error)
    return user
  }
}