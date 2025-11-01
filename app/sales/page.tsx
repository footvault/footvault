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

  // Filter out refunded and pending sales
  const completedSales = sales.filter(sale => sale.status !== 'refunded' && sale.status !== 'pending');

  completedSales.forEach(sale => {
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
  // Check authentication
  const cookieStore = await cookies();
  const supabase = await createClient(cookieStore);
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Redirect unauthenticated users to home page
  if (!user) {
    redirect("/");
  }

  const [
    { data: initialSales },
    { data: initialAvatars },
    { data: initialProfitTemplates }
  ] = await Promise.all([
    getSales(user.id),
    getAvatars(user.id),
    getProfitTemplates(user.id)
  ]);

  // Handle the case when there are no sales yet
  

  const initialAvatarProfits = await calculateAvatarProfits(initialSales, initialAvatars);

  return (
     <SidebarInset>
          {" "}
          {/* Wrap content with SidebarInset */}
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1 bg-white md:bg-transparent" /> {/* Show on mobile with white bg */}
            <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" /> {/* Add separator */}
            <h1 className="text-xl font-semibold">Sales</h1>
          </header>
          <div className="  py-8 w-full">
            <div className="container  py-8">
              <SalesClientWrapper
      initialSales={initialSales}
      initialAvatars={initialAvatars}
      initialProfitTemplates={initialProfitTemplates}
      initialAvatarProfits={initialAvatarProfits}
    />
            </div>
          </div>
        </SidebarInset>
   
  );
}
