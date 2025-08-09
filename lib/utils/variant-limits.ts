// Utility function to get variant limits based on subscription plan

export function getVariantLimit(plan: string): number {
  switch (plan?.toLowerCase()) {
    case 'free':
      return 100;
    case 'individual':
      return 500;
    case 'team':
      return 1500;
    case 'store':
      return 5000;
    default:
      return 100; // Default to free plan limits
  }
}

export function getVariantLimitInfo(plan: string) {
  const limit = getVariantLimit(plan);
  const planName = plan?.charAt(0).toUpperCase() + plan?.slice(1).toLowerCase() || 'Free';
  
  return {
    limit,
    planName,
    isLimited: limit < 5000, // Store plan is the highest currently
  };
}

// Helper function to format variant count with commas
export function formatVariantCount(count: number): string {
  return count.toLocaleString();
}
