import { SalesClientWrapper } from "@/components/sales-client-wrapper"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { cookies } from "next/headers";
import { createServerClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import { ShoppingBag } from 'lucide-react';
import { Sale, Avatar, ProfitDistributionTemplateDetail } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";



async function getSales(userId: string) {
  try {
    const cookieStore = cookies();
        const supabase = await createClient(cookieStore);
    const { data: sales, error: salesError } = await supabase
      .from('sales')
      .select(`
        *,
        sale_items (
          id,
          sold_price,
          cost_price,
          quantity,
          variant:variants (
            id,
            size,
            variant_sku,
            product:products(*)
          )
        ),
        sale_profit_distributions (
          id,
          percentage,
          amount,
          avatar:avatars(*)
        )
      `)
      .eq('user_id', userId)
      .order('sale_date', { ascending: false });

    if (salesError) {
      console.error("Error fetching sales:", salesError);
      return { data: [], error: null }; // Return empty array instead of error
    }

    return { data: sales || [], error: null };
  } catch (error: any) {
    console.error("Error in getSales:", error);
    return { data: [], error: null }; // Return empty array instead of error
  }
}

async function getAvatars(userId: string) {
  try {
    const cookieStore = cookies();
        const supabase = await createClient(cookieStore);
    const { data: avatars, error: avatarsError } = await supabase
      .from('avatars')
      .select('*')
      .eq('user_id', userId);

    if (avatarsError) {
      console.error("Error fetching avatars:", avatarsError);
      return { data: [], error: null };
    }

    return { data: avatars || [], error: null };
  } catch (error: any) {
    console.error("Error in getAvatars:", error);
    return { data: [], error: null };
  }
}

async function getProfitTemplates(userId: string) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: templates, error: templatesError } = await supabase
      .from('profit_distribution_templates')
      .select(`
        *,
        profit_template_items (
          id,
          avatar_id,
          percentage
        )
      `)
      .eq('user_id', userId);

    if (templatesError) {
      console.error("Error fetching profit templates:", templatesError);
      return { data: [], error: null };
    }

    return { data: templates || [], error: null };
  } catch (error: any) {
    console.error("Error in getProfitTemplates:", error);
    return { data: [], error: null };
  }
}

async function calculateAvatarProfits(sales: any[], avatars: any[]) {
  const avatarProfits = new Map<string, {
    avatarUrl: string;
    name: string;
    profit: number;
  }>();

  avatars.forEach(avatar => {
    avatarProfits.set(avatar.id, {
      avatarUrl: avatar.image || '/placeholder.svg',
      name: avatar.name,
      profit: 0
    });
  });

  sales.forEach(sale => {
    (sale.sale_profit_distributions || []).forEach((dist: any) => {
      const currentProfit = avatarProfits.get(dist.avatar?.id);
      if (currentProfit && dist.amount) {
        currentProfit.profit += Number(dist.amount);
      }
    });
  });

  return Array.from(avatarProfits.values());
}

export default async function SalesPage() {
  const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return redirect('/login');
  }

  const [
    { data: initialSales },
    { data: initialAvatars },
    { data: initialProfitTemplates }
  ] = await Promise.all([
    getSales(session.user.id),
    getAvatars(session.user.id),
    getProfitTemplates(session.user.id)
  ]);

  // Handle the case when there are no sales yet
  

  const initialAvatarProfits = await calculateAvatarProfits(initialSales, initialAvatars);

  return (
    <SalesClientWrapper
      initialSales={initialSales}
      initialAvatars={initialAvatars}
      initialProfitTemplates={initialProfitTemplates}
      initialAvatarProfits={initialAvatarProfits}
    />
  );
}
