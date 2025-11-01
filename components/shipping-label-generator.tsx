"use client"

import { useEffect, useRef } from "react"

interface ShippingLabelGeneratorProps {
  saleId?: string
  onComplete?: () => void
  onError?: (error: string) => void
}

export function ShippingLabelGenerator({ saleId, onComplete, onError }: ShippingLabelGeneratorProps) {
  const isGenerating = useRef(false)

  useEffect(() => {
    if (saleId && !isGenerating.current) {
      openShippingLabel()
    }
  }, [saleId])

  const openShippingLabel = async () => {
    if (isGenerating.current) {
      return // Already generating, prevent duplicate
    }
    
    try {
      isGenerating.current = true
      
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        throw new Error("No authorization header");
      }

      // Open PDF in new tab instead of downloading
      const labelUrl = `/api/shipping-label?saleId=${saleId}&t=${Date.now()}`;
      
      // Create a temporary link with authorization header by using fetch to get the blob
      const response = await fetch(labelUrl, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to generate shipping label');
      }

      // Create blob URL and open in new tab
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      // Open in new tab
      window.open(blobUrl, '_blank');
      
      // Clean up blob URL after a delay
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 1000);

      onComplete?.();
    } catch (error) {
      console.error('Shipping label generation error:', error);
      onError?.(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      isGenerating.current = false
    }
  }

  // This component doesn't render anything visible - it just triggers the PDF generation
  return null
}