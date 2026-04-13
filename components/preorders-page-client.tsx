"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, Plus, Package, Calendar as CalendarIcon, Clock, CheckCircle, XCircle, User, TrendingUp, CreditCard, AlertCircle, ArrowUp, ArrowDown, MoreHorizontal, Trash2, AlertTriangle, Ban, RotateCcw, Edit } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"
import { format } from "date-fns"
import { createClient } from "@/lib/supabase/client"
import { toast } from "@/hooks/use-toast"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { getNextSerialNumber } from "@/lib/utils/serial-number-generator"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Preorder {
  id: number;
  customer_id: number;
  product_id: number;
  variant_id: number | null;
  size: string | null;
  size_label: string | null;
  status: string;
  cost_price: number;
  total_amount: number;
  down_payment: number | null;
  remaining_balance: number;
  expected_delivery_date: string | null;
  completed_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  pre_order_no: number;
  customer: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    zip_code: string | null;
    country: string | null;
  };
  product: {
    name: string;
    brand: string;
    sku: string;
    image: string | null;
  };
}

interface ProfitDistributionTemplate {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface PaymentType {
  id: string;
  name: string;
  fee_type: string;
  fee_value: number;
  applies_to: string;
}

interface AvatarType {
  image_url: string;
  id: string;
  name: string;
  image?: string;
  type: string;
  user_id: string;
  default_percentage: number;
}

interface PreordersPageClientProps {
  initialPreorders: Preorder[];
  error?: string;
}

// ─── Stagger animation wrapper ──────────────────────────────────────────────

function StaggerItem({ children, index, className }: { children: React.ReactNode; index: number; className?: string }) {
  return (
    <div
      className={cn("animate-in fade-in slide-in-from-bottom-2 fill-mode-both", className)}
      style={{ animationDelay: `${index * 60}ms`, animationDuration: "400ms" }}
    >
      {children}
    </div>
  );
}

// ─── Status helpers ─────────────────────────────────────────────────────────

function getStatusColor(status: string) {
  switch (status.toLowerCase()) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-900/50";
    case "paid":
    case "completed":
      return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50";
    case "confirmed":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-900/50";
    case "voided":
      return "bg-muted text-muted-foreground border-border";
    case "canceled":
      return "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50";
    case "refunds":
    case "refunded":
      return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-900/50";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function getStatusIcon(status: string) {
  const cls = "h-3 w-3";
  switch (status.toLowerCase()) {
    case "pending":
      return <Clock className={cls} />;
    case "paid":
    case "completed":
    case "confirmed":
      return <CheckCircle className={cls} />;
    case "voided":
    case "canceled":
      return <XCircle className={cls} />;
    case "refunds":
    case "refunded":
      return <AlertCircle className={cls} />;
    default:
      return <Clock className={cls} />;
  }
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function PreordersPageClient({ initialPreorders, error }: PreordersPageClientProps) {
  const { currency } = useCurrency();
  const router = useRouter();
  const [preorders, setPreorders] = useState<Preorder[]>(initialPreorders);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Date filtering
  const [dateFilter, setDateFilter] = useState<string>("thisMonth");
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>();
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>();

  // Data fetch cache
  const [lastDataFetchTime, setLastDataFetchTime] = useState<number>(0);

  // Modal states
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedPreorder, setSelectedPreorder] = useState<Preorder | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Preorder["customer"] | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Profit / payment data
  const [profitTemplates, setProfitTemplates] = useState<ProfitDistributionTemplate[]>([]);
  const [paymentTypes, setPaymentTypes] = useState<PaymentType[]>([]);
  const [avatars, setAvatars] = useState<AvatarType[]>([]);
  const [cancelForm, setCancelForm] = useState({ paymentType: "", profitTemplateId: "main", notes: "" });
  const [manualDistribution, setManualDistribution] = useState<Record<string, number>>({});

  // Edit form
  const [editForm, setEditForm] = useState({ total_amount: 0, down_payment: 0, remaining_balance: 0, expected_delivery_date: "", notes: "" });

  // Status form
  const [statusForm, setStatusForm] = useState({ status: "", notes: "" });

  // ─── Fetch supporting data ─────────────────────────────────────────────────

  useEffect(() => {
    const fetchData = async () => {
      const now = Date.now();
      if (now - lastDataFetchTime < 60000) return;

      const supabase = createClient();
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return;

        const [t, p, a] = await Promise.all([
          supabase
            .from("profit_distribution_templates")
            .select("*, profit_template_items (id, avatar_id, percentage, avatars (id, name, image, type))")
            .eq("user_id", user.id)
            .order("name", { ascending: true }),
          supabase.from("payment_types").select("*").order("name", { ascending: true }),
          supabase.from("avatars").select("*").eq("user_id", user.id).order("type", { ascending: true }),
        ]);

        if (t.error) throw t.error;
        if (p.error) throw p.error;
        if (a.error) throw a.error;

        setProfitTemplates(t.data || []);
        setPaymentTypes(p.data || []);
        setAvatars(a.data || []);
        setLastDataFetchTime(now);
      } catch (err) {
        console.error("Error fetching data:", err);
      }
    };
    fetchData();
  }, [lastDataFetchTime]);

  // Reset manual distribution
  useEffect(() => {
    if (cancelForm.profitTemplateId === "manual") {
      const eq = avatars.length > 0 ? 100 / avatars.length : 0;
      const init: Record<string, number> = {};
      avatars.forEach((av) => (init[av.id] = eq));
      setManualDistribution(init);
    } else {
      setManualDistribution({});
    }
  }, [cancelForm.profitTemplateId, avatars]);

  const totalManualPercentage = Object.values(manualDistribution).reduce((s, p) => s + (p || 0), 0);

  const updateManualPercentage = (id: string, pct: number) => {
    setManualDistribution((prev) => ({ ...prev, [id]: Math.max(0, Math.min(100, pct || 0)) }));
  };

  // ─── Date helpers ──────────────────────────────────────────────────────────

  const getDateRange = (filter: string): { from: Date; to: Date } | null => {
    const now = new Date();
    const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const eod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
    switch (filter) {
      case "thisMonth":
        return { from: sod(new Date(now.getFullYear(), now.getMonth(), 1)), to: eod(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
      case "3months":
        return { from: sod(new Date(now.getFullYear(), now.getMonth() - 2, 1)), to: eod(now) };
      case "year":
        return { from: sod(new Date(now.getFullYear(), 0, 1)), to: eod(new Date(now.getFullYear(), 11, 31)) };
      case "custom":
        return customDateFrom && customDateTo ? { from: sod(customDateFrom), to: eod(customDateTo) } : null;
      default:
        return null;
    }
  };

  const filterByDate = (list: Preorder[]) => {
    if (dateFilter === "all") return list;
    const range = getDateRange(dateFilter);
    if (!range) return list;
    return list.filter((p) => {
      const d = new Date(p.created_at);
      return d >= range.from && d <= range.to;
    });
  };

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleCustomerClick = (customer: Preorder["customer"]) => {
    setSelectedCustomer(customer);
    setShowCustomerModal(true);
  };

  const handleEdit = (preorder: Preorder) => {
    setSelectedPreorder(preorder);
    setEditForm({
      total_amount: preorder.total_amount,
      down_payment: preorder.down_payment || 0,
      remaining_balance: preorder.remaining_balance,
      expected_delivery_date: preorder.expected_delivery_date || "",
      notes: preorder.notes || "",
    });
    setShowEditModal(true);
  };

  const handleDelete = (preorder: Preorder) => {
    if (preorder.status === "completed") {
      toast({ title: "Cannot Delete", description: "Completed pre-orders cannot be deleted.", variant: "destructive" });
      return;
    }
    if (preorder.status === "canceled") {
      toast({ title: "Cannot Delete", description: "Cancelled pre-orders cannot be deleted.", variant: "destructive" });
      return;
    }
    setSelectedPreorder(preorder);
    setShowDeleteModal(true);
  };

  const handleVoid = (preorder: Preorder) => {
    setSelectedPreorder(preorder);
    setShowVoidModal(true);
  };

  const handleRestore = (preorder: Preorder) => {
    setSelectedPreorder(preorder);
    setShowRestoreModal(true);
  };

  // ─── DB helpers ────────────────────────────────────────────────────────────

  const updatePreOrderStatus = async (id: number, status: string, notes: string) => {
    const supabase = createClient();
    const { error } = await supabase.from("pre_orders").update({ status, notes, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
  };

  // ─── Async actions ─────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!selectedPreorder) return;
    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from("pre_orders").delete().eq("id", selectedPreorder.id);
      if (error) throw error;
      setPreorders((prev) => prev.filter((p) => p.id !== selectedPreorder.id));
      toast({ title: "Pre-order Deleted", description: "Pre-order has been deleted." });
      setShowDeleteModal(false);
      setSelectedPreorder(null);
    } catch (err) {
      console.error(err);
      toast({ title: "Delete Failed", description: "Failed to delete pre-order.", variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmVoid = async () => {
    if (!selectedPreorder) return;
    setIsUpdating(true);
    try {
      await updatePreOrderStatus(selectedPreorder.id, "voided", "Pre-order voided");
      setPreorders((prev) => prev.map((p) => (p.id === selectedPreorder.id ? { ...p, status: "voided", notes: "Pre-order voided" } : p)));
      toast({ title: "Pre-order Voided", description: "Pre-order has been voided." });
      setShowVoidModal(false);
      setSelectedPreorder(null);
    } catch (err) {
      console.error(err);
      toast({ title: "Void Failed", description: "Failed to void pre-order.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const confirmRestore = async () => {
    if (!selectedPreorder) return;
    setIsUpdating(true);
    const supabase = createClient();
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Authentication required");

      if (selectedPreorder.status === "canceled") {
        const { data: salesWithVariants, error: salesError } = await supabase
          .from("sales")
          .select("id, sale_items!inner (id, variant:variants!inner (id, type, notes))")
          .eq("user_id", user.id);
        if (salesError) throw salesError;

        const relatedSale = salesWithVariants?.find((sale) =>
          sale.sale_items.some((item: any) => item.variant.type === "downpayment" && item.variant.notes?.includes(`pre-order #${selectedPreorder.pre_order_no}`))
        );

        if (relatedSale) {
          const vi = relatedSale.sale_items.find((item: any) => item.variant.type === "downpayment" && item.variant.notes?.includes(`pre-order #${selectedPreorder.pre_order_no}`))?.variant;
          if (vi) {
            const typed = vi as any;
            const vid = Array.isArray(typed) ? typed[0]?.id : typed.id;
            await supabase.from("sale_items").delete().eq("sale_id", relatedSale.id);
            await supabase.from("sale_profit_distributions").delete().eq("sale_id", relatedSale.id);
            await supabase.from("sales").delete().eq("id", relatedSale.id);
            await supabase.from("variants").delete().eq("id", vid);
          }
        }
      }

      await updatePreOrderStatus(selectedPreorder.id, "pending", "Pre-order restored from cancelled status");
      setPreorders((prev) => prev.map((p) => (p.id === selectedPreorder.id ? { ...p, status: "pending", notes: "Pre-order restored" } : p)));
      toast({
        title: "Pre-order Restored",
        description: selectedPreorder.status === "canceled" ? "Cancelled pre-order restored. Associated sale cleaned up." : "Pre-order restored to pending.",
      });
      setShowRestoreModal(false);
      setSelectedPreorder(null);
    } catch (err) {
      console.error(err);
      toast({ title: "Restore Failed", description: "Failed to restore pre-order.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const submitEdit = async () => {
    if (!selectedPreorder) return;
    setIsUpdating(true);
    const supabase = createClient();
    try {
      const remaining = editForm.total_amount - editForm.down_payment;
      const { error } = await supabase.from("pre_orders").update({ total_amount: editForm.total_amount, down_payment: editForm.down_payment, expected_delivery_date: editForm.expected_delivery_date || null, notes: editForm.notes, updated_at: new Date().toISOString() }).eq("id", selectedPreorder.id);
      if (error) throw error;
      setPreorders((prev) => prev.map((p) => (p.id === selectedPreorder.id ? { ...p, total_amount: editForm.total_amount, down_payment: editForm.down_payment, remaining_balance: remaining, expected_delivery_date: editForm.expected_delivery_date || null, notes: editForm.notes } : p)));
      toast({ title: "Pre-order Updated", description: "Pre-order has been updated." });
      setShowEditModal(false);
      setSelectedPreorder(null);
    } catch (err) {
      console.error(err);
      toast({ title: "Update Failed", description: (err as any)?.message || "Failed to update.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  const submitStatusUpdate = async () => {
    if (!selectedPreorder) return;
    setIsUpdating(true);
    try {
      const dbStatus = statusForm.status;
      await updatePreOrderStatus(selectedPreorder.id, dbStatus, statusForm.notes);
      setPreorders((prev) => prev.map((p) => (p.id === selectedPreorder.id ? { ...p, status: dbStatus, notes: statusForm.notes } : p)));
      setShowStatusModal(false);
      setSelectedPreorder(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCancelPreorder = (preorder: Preorder) => {
    setSelectedPreorder(preorder);
    setCancelForm({
      paymentType: paymentTypes.length > 0 ? paymentTypes[0].id : "",
      profitTemplateId: "main",
      notes: `Down payment of ${formatCurrency(preorder.down_payment || 0, currency)} for cancelled pre-order #${preorder.pre_order_no}`,
    });
    setShowCancelModal(true);
  };

  const processCancelToSale = async (preorder: Preorder) => {
    setIsUpdating(true);
    const supabase = createClient();
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Authentication required");
      if (!cancelForm.paymentType) throw new Error("Payment type is required");
      if (!cancelForm.profitTemplateId) throw new Error("Profit distribution template is required");

      let variantId = preorder.variant_id;

      if (!variantId) {
        let insertAttempts = 0;
        const maxAttempts = 5;
        while (insertAttempts < maxAttempts) {
          try {
            const { data: maxSerialData, error: maxSerialError } = await supabase.from("variants").select("serial_number").eq("user_id", user.id).not("serial_number", "is", null).order("serial_number", { ascending: false }).limit(1).maybeSingle();
            let serialNumber = 1;
            if (!maxSerialError && maxSerialData?.serial_number) serialNumber = maxSerialData.serial_number + 1;
            if (serialNumber > 32767) throw new Error("Serial number limit exceeded.");

            const variantInsert = {
              id: crypto.randomUUID(),
              product_id: preorder.product_id,
              size: preorder.size,
              size_label: preorder.size_label,
              serial_number: serialNumber,
              variant_sku: `${preorder.product.sku}-${preorder.size || "NOSIZE"}-${serialNumber}`,
              cost_price: preorder.cost_price,
              status: "Sold",
              user_id: user.id,
              date_added: new Date().toISOString().slice(0, 10),
              location: "Store",
              type: "downpayment",
              notes: `Downpayment from cancelled pre-order #${preorder.pre_order_no}`,
            };

            const { data: vd, error: ve } = await supabase.from("variants").insert([variantInsert]).select("*").single();
            if (ve) {
              if (ve.code === "23505" && ve.message.includes("unique_serial_per_user")) { insertAttempts++; continue; }
              throw ve;
            }
            variantId = vd.id;
            break;
          } catch (e) {
            insertAttempts++;
            if (insertAttempts >= maxAttempts) throw new Error(`Failed to create variant after ${maxAttempts} attempts`);
            await new Promise((r) => setTimeout(r, 100));
          }
        }
      }

      const saleData = {
        id: crypto.randomUUID(),
        sale_date: new Date().toISOString().slice(0, 10),
        total_amount: preorder.total_amount,
        total_discount: 0,
        net_profit: preorder.down_payment || 0,
        customer_name: preorder.customer.name,
        customer_phone: preorder.customer.phone,
        customer_id: preorder.customer_id,
        user_id: user.id,
        status: "completed",
        payment_received: preorder.down_payment || 0,
        change_amount: 0,
        additional_charge: 0,
        payment_type: { type: cancelForm.paymentType },
      };

      const { data: saleResult, error: saleError } = await supabase.from("sales").insert([saleData]).select("*").single();
      if (saleError) throw saleError;

      const customSalesId = `S${saleResult.sales_no.toString().padStart(7, "0")}`;
      await supabase.from("sales").update({ custom_sales_id: customSalesId }).eq("id", saleResult.id);
      saleResult.custom_sales_id = customSalesId;

      await supabase.from("sale_items").insert([{ id: crypto.randomUUID(), sale_id: saleResult.id, variant_id: variantId, sold_price: 0, cost_price: preorder.cost_price, quantity: 1, custom_sales_id: customSalesId }]);

      // Handle profit distribution
      const downPayment = preorder.down_payment || 0;
      if (cancelForm.profitTemplateId === "main" && downPayment > 0) {
        const { data: avatarsData } = await supabase.from("avatars").select("*").eq("user_id", user.id);
        const mainAvatar = avatarsData?.find((a) => a.type?.toLowerCase() === "main") || avatarsData?.find((a) => a.name?.toLowerCase().includes("main")) || avatarsData?.[0];
        if (mainAvatar) {
          await supabase.from("sale_profit_distributions").insert([{ id: crypto.randomUUID(), sale_id: saleResult.id, avatar_id: mainAvatar.id, amount: downPayment, percentage: 100 }]);
        }
      } else if (cancelForm.profitTemplateId === "manual" && downPayment > 0) {
        if (totalManualPercentage !== 100) throw new Error("Manual distribution must total 100%");
        const dists = Object.entries(manualDistribution).filter(([, p]) => p > 0).map(([aid, p]) => ({ id: crypto.randomUUID(), sale_id: saleResult.id, avatar_id: aid, amount: (downPayment * p) / 100, percentage: p }));
        if (dists.length > 0) await supabase.from("sale_profit_distributions").insert(dists);
      } else if (downPayment > 0) {
        const { data: templateData } = await supabase.from("profit_distribution_templates").select("*, profit_template_items (id, avatar_id, percentage)").eq("id", cancelForm.profitTemplateId).single();
        if (templateData?.profit_template_items?.length > 0) {
          const dists = templateData.profit_template_items.map((item: any) => ({ id: crypto.randomUUID(), sale_id: saleResult.id, avatar_id: item.avatar_id, amount: (downPayment * item.percentage) / 100, percentage: item.percentage }));
          await supabase.from("sale_profit_distributions").insert(dists);
        }
      }

      await updatePreOrderStatus(preorder.id, "canceled", `Pre-order cancelled → sale #${customSalesId}. DP ${formatCurrency(downPayment, currency)} recorded.`);
      setPreorders((prev) => prev.map((p) => (p.id === preorder.id ? { ...p, status: "canceled", notes: `Cancelled → sale #${customSalesId}` } : p)));
      toast({ title: "Pre-order Cancelled", description: `Converted to sale #${customSalesId}.` });
      setShowCancelModal(false);
      setSelectedPreorder(null);
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: (err as Error).message || "Failed to cancel pre-order.", variant: "destructive" });
    } finally {
      setIsUpdating(false);
    }
  };

  // ─── Filtered & sorted data ────────────────────────────────────────────────

  const filteredAndSortedPreorders = useMemo(() => {
    let filtered = filterByDate(preorders).filter((p) => {
      const matchesSearch = !searchTerm || [p.customer.name, p.product.name, p.product.brand, p.product.sku].some((f) => f.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = statusFilter === "all" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    filtered.sort((a, b) => {
      let av: any, bv: any;
      switch (sortBy) {
        case "customer": av = a.customer.name.toLowerCase(); bv = b.customer.name.toLowerCase(); break;
        case "total_amount": av = a.total_amount; bv = b.total_amount; break;
        case "remaining_balance": av = a.remaining_balance; bv = b.remaining_balance; break;
        case "expected_delivery_date": av = a.expected_delivery_date ? new Date(a.expected_delivery_date) : new Date(0); bv = b.expected_delivery_date ? new Date(b.expected_delivery_date) : new Date(0); break;
        default: av = new Date(a.created_at); bv = new Date(b.created_at);
      }
      return av < bv ? (sortOrder === "asc" ? -1 : 1) : av > bv ? (sortOrder === "asc" ? 1 : -1) : 0;
    });

    return filtered;
  }, [preorders, searchTerm, statusFilter, sortBy, sortOrder, dateFilter, customDateFrom, customDateTo]);

  // ─── Stats ─────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const dated = filterByDate(preorders);
    const active = dated.filter((p) => p.status !== "voided");
    const nonCompleted = active.filter((p) => p.status !== "completed");
    return {
      totalPreorders: active.length,
      totalValue: active.reduce((s, p) => s + p.total_amount, 0),
      pendingPreorders: active.filter((p) => ["pending", "confirmed"].includes(p.status)).length,
      completedPreorders: active.filter((p) => p.status === "completed").length,
      totalDeposits: nonCompleted.reduce((s, p) => s + (p.down_payment || 0), 0),
      totalRemaining: nonCompleted.reduce((s, p) => s + p.remaining_balance, 0),
    };
  }, [preorders, dateFilter, customDateFrom, customDateTo]);

  const dateRangeText = useMemo(() => {
    switch (dateFilter) {
      case "thisMonth": return "This Month";
      case "3months": return "Last 3 Months";
      case "year": return "This Year";
      case "custom": return customDateFrom && customDateTo ? `${format(customDateFrom, "MMM dd")} – ${format(customDateTo, "MMM dd, yyyy")}` : "Custom Range";
      default: return "All Time";
    }
  }, [dateFilter, customDateFrom, customDateTo]);

  // ─── Error state ───────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 animate-in fade-in duration-500">
        <div className="rounded-full bg-destructive/10 p-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-semibold">Error Loading Pre-orders</h2>
          <p className="text-muted-foreground max-w-md">There was an issue fetching pre-order data.</p>
          <p className="text-xs text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  // ─── Stat card config ──────────────────────────────────────────────────────

  const statCards = [
    { label: "Total Pre-orders", value: stats.totalPreorders.toString(), icon: Package, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-100/60 dark:bg-blue-950/40" },
    { label: "Total Value", value: formatCurrency(stats.totalValue, currency), icon: TrendingUp, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100/60 dark:bg-emerald-950/40" },
    { label: "Pending", value: stats.pendingPreorders.toString(), icon: Clock, color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100/60 dark:bg-yellow-950/40" },
    { label: "Completed", value: stats.completedPreorders.toString(), icon: CheckCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100/60 dark:bg-emerald-950/40" },
    { label: "Deposits (Active)", value: formatCurrency(stats.totalDeposits, currency), icon: CreditCard, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100/60 dark:bg-purple-950/40", sub: "Excludes completed" },
    { label: "Remaining (Active)", value: formatCurrency(stats.totalRemaining, currency), icon: AlertCircle, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100/60 dark:bg-orange-950/40", sub: "Excludes completed" },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map((s, i) => (
          <StaggerItem key={s.label} index={i}>
            <Card className="group hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={cn("rounded-lg p-2 transition-colors", s.bg)}>
                    <s.icon className={cn("h-4 w-4", s.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground truncate">{s.label}</p>
                    <p className="text-lg font-bold tracking-tight truncate">{s.value}</p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 truncate">
                  {s.sub ? `${s.sub} · ${dateRangeText}` : dateRangeText}
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </div>

      {/* Controls */}
      <StaggerItem index={6}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Manage Pre-orders</h2>
              <p className="text-sm text-muted-foreground">Track and manage customer pre-orders</p>
            </div>
            <Button className="flex items-center gap-2 w-full sm:w-auto" onClick={() => router.push("/add-product")}>
              <Plus className="h-4 w-4" />
              New Pre-order
            </Button>
          </div>

          <Card>
            <CardContent className="p-3">
              <div className="flex flex-col lg:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input placeholder="Search by customer, product, brand, or SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="voided">Voided</SelectItem>
                      <SelectItem value="canceled">Canceled</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={dateFilter} onValueChange={setDateFilter}>
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="thisMonth">This Month</SelectItem>
                      <SelectItem value="3months">Last 3 Months</SelectItem>
                      <SelectItem value="year">This Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")} className="shrink-0">
                    {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              {dateFilter === "custom" && (
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-border animate-in fade-in slide-in-from-top-1 duration-200">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !customDateFrom && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {customDateFrom ? format(customDateFrom, "MMM dd") : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customDateFrom} onSelect={setCustomDateFrom} initialFocus />
                    </PopoverContent>
                  </Popover>
                  <span className="text-sm text-muted-foreground">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-[130px] justify-start text-left font-normal", !customDateTo && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                        {customDateTo ? format(customDateTo, "MMM dd") : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={customDateTo} onSelect={setCustomDateTo} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </StaggerItem>

      {/* Table */}
      <StaggerItem index={7}>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Pre-orders</CardTitle>
              <div className="flex items-center gap-2">
                {dateFilter !== "all" && (
                  <Badge variant="secondary" className="text-xs font-normal">{dateRangeText}</Badge>
                )}
                <Badge variant="outline" className="text-xs font-normal">
                  {filteredAndSortedPreorders.length} {filteredAndSortedPreorders.length === 1 ? "item" : "items"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {filteredAndSortedPreorders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 animate-in fade-in duration-500">
                <div className="rounded-full bg-muted p-4 mb-4">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-base font-semibold mb-1">No pre-orders found</h3>
                <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                  {searchTerm || statusFilter !== "all" ? "Try adjusting your search or filters" : "Get started by creating your first pre-order"}
                </p>
                {!searchTerm && statusFilter === "all" && (
                  <Button size="sm" onClick={() => router.push("/add-product")}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Pre-order
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table className="min-w-[900px] w-full">
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="whitespace-nowrap font-medium text-xs">#</TableHead>
                      <TableHead className="whitespace-nowrap font-medium text-xs">Product</TableHead>
                      <TableHead className="whitespace-nowrap font-medium text-xs">Size</TableHead>
                      <TableHead className="whitespace-nowrap font-medium text-xs">Customer</TableHead>
                      <TableHead className="whitespace-nowrap font-medium text-xs text-right">Sale Price</TableHead>
                      <TableHead className="whitespace-nowrap font-medium text-xs text-right">Down Payment</TableHead>
                      <TableHead className="whitespace-nowrap font-medium text-xs text-right">Balance</TableHead>
                      <TableHead className="whitespace-nowrap font-medium text-xs">Delivery</TableHead>
                      <TableHead className="whitespace-nowrap font-medium text-xs">Status</TableHead>
                      <TableHead className="whitespace-nowrap font-medium text-xs w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedPreorders.map((preorder, idx) => (
                      <TableRow
                        key={preorder.id}
                        className="group animate-in fade-in duration-300 hover:bg-muted/30 transition-colors"
                        style={{ animationDelay: `${idx * 30}ms` }}
                      >
                        <TableCell className="py-3 whitespace-nowrap">
                          <span className="font-mono text-xs text-muted-foreground">#{preorder.pre_order_no ? preorder.pre_order_no.toString().padStart(3, "0") : "---"}</span>
                        </TableCell>
                        <TableCell className="py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="relative h-9 w-9 rounded-md overflow-hidden bg-muted shrink-0">
                              {preorder.product.image ? (
                                <Image src={preorder.product.image} alt={preorder.product.name} fill className="object-cover" />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground" /></div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate max-w-[180px]">{preorder.product.name}</p>
                              <p className="text-xs text-muted-foreground">{preorder.product.brand}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 whitespace-nowrap text-sm">
                          {preorder.size || "—"}
                          {preorder.size_label && <span className="text-xs text-muted-foreground ml-1">({preorder.size_label})</span>}
                        </TableCell>
                        <TableCell className="py-3 whitespace-nowrap">
                          <button onClick={() => handleCustomerClick(preorder.customer)} className="text-sm font-medium hover:underline underline-offset-4 transition-colors text-foreground hover:text-primary">
                            {preorder.customer.name}
                          </button>
                        </TableCell>
                        <TableCell className="py-3 whitespace-nowrap text-right text-sm font-medium">{formatCurrency(preorder.total_amount, currency)}</TableCell>
                        <TableCell className="py-3 whitespace-nowrap text-right text-sm">{preorder.down_payment ? formatCurrency(preorder.down_payment, currency) : "—"}</TableCell>
                        <TableCell className="py-3 whitespace-nowrap text-right">
                          <span className={cn("text-sm font-medium", preorder.remaining_balance > 0 ? "text-orange-600 dark:text-orange-400" : "text-emerald-600 dark:text-emerald-400")}>
                            {formatCurrency(preorder.remaining_balance, currency)}
                          </span>
                        </TableCell>
                        <TableCell className="py-3 whitespace-nowrap text-sm text-muted-foreground">
                          {preorder.expected_delivery_date ? format(new Date(preorder.expected_delivery_date), "MMM dd, yyyy") : "—"}
                        </TableCell>
                        <TableCell className="py-3 whitespace-nowrap">
                          <Badge variant="outline" className={cn("text-[11px] font-medium gap-1 transition-all duration-200", getStatusColor(preorder.status))}>
                            {getStatusIcon(preorder.status)}
                            {preorder.status.charAt(0).toUpperCase() + preorder.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-3 whitespace-nowrap">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-40">
                              <DropdownMenuItem onClick={() => handleEdit(preorder)}>
                                <Edit className="mr-2 h-4 w-4" />Edit
                              </DropdownMenuItem>
                              {(preorder.status === "voided" || preorder.status === "canceled") && (
                                <DropdownMenuItem onClick={() => handleRestore(preorder)} disabled={isUpdating}>
                                  <RotateCcw className="mr-2 h-4 w-4" />Restore
                                </DropdownMenuItem>
                              )}
                              {(preorder.status === "pending" || preorder.status === "confirmed") && (
                                <DropdownMenuItem onClick={() => handleVoid(preorder)} disabled={isUpdating}>
                                  <AlertTriangle className="mr-2 h-4 w-4" />Void
                                </DropdownMenuItem>
                              )}
                              {(preorder.status === "pending" || preorder.status === "confirmed") && (
                                <DropdownMenuItem onClick={() => handleCancelPreorder(preorder)} disabled={isUpdating}>
                                  <Ban className="mr-2 h-4 w-4" />Cancel
                                </DropdownMenuItem>
                              )}
                              {preorder.status !== "completed" && preorder.status !== "canceled" && (
                                <DropdownMenuItem onClick={() => handleDelete(preorder)} disabled={isUpdating} className="text-destructive focus:text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" />Delete
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </StaggerItem>

      {/* ═══════════════════════ MODALS ═══════════════════════ */}

      {/* Customer Info */}
      <Dialog open={showCustomerModal} onOpenChange={setShowCustomerModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="rounded-full bg-muted p-1.5"><User className="h-4 w-4 text-muted-foreground" /></div>
              Customer Information
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 animate-in fade-in duration-200">
              {[
                { l: "Name", v: selectedCustomer.name },
                { l: "Email", v: selectedCustomer.email },
                { l: "Phone", v: selectedCustomer.phone },
                { l: "Address", v: selectedCustomer.address },
                { l: "City", v: selectedCustomer.city },
                { l: "State", v: selectedCustomer.state },
                { l: "ZIP Code", v: selectedCustomer.zip_code },
                { l: "Country", v: selectedCustomer.country },
              ].map((f) => (
                <div key={f.l}>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">{f.l}</p>
                  <p className="text-sm">{f.v || "—"}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit Pre-order</DialogTitle></DialogHeader>
          {selectedPreorder && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="bg-muted/50 border border-border p-3 rounded-lg flex items-center gap-3">
                <div className="relative h-10 w-10 rounded-md overflow-hidden bg-muted shrink-0">
                  {selectedPreorder.product.image ? (
                    <Image src={selectedPreorder.product.image} alt={selectedPreorder.product.name} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center"><Package className="h-4 w-4 text-muted-foreground" /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{selectedPreorder.product.name}</p>
                  <p className="text-xs text-muted-foreground">Size: {selectedPreorder.size} · {selectedPreorder.customer.name}</p>
                </div>
                <Badge variant="outline" className={cn("text-[10px] shrink-0", getStatusColor(selectedPreorder.status))}>{selectedPreorder.status}</Badge>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="totalAmount" className="text-xs">Total Amount</Label>
                  <Input id="totalAmount" type="number" step="0.01" value={editForm.total_amount === 0 ? "" : editForm.total_amount} placeholder="0.00" onChange={(e) => { const v = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0; setEditForm((p) => ({ ...p, total_amount: v, remaining_balance: v - p.down_payment })); }} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="downPayment" className="text-xs">Down Payment</Label>
                  <Input id="downPayment" type="number" step="0.01" value={editForm.down_payment === 0 ? "" : editForm.down_payment} placeholder="0.00" onChange={(e) => { const v = e.target.value === "" ? 0 : parseFloat(e.target.value) || 0; setEditForm((p) => ({ ...p, down_payment: v, remaining_balance: p.total_amount - v })); }} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="remainingBalance" className="text-xs">Remaining Balance</Label>
                  <Input id="remainingBalance" type="number" value={editForm.remaining_balance === 0 ? "0.00" : editForm.remaining_balance} disabled className="bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="expectedDeliveryDate" className="text-xs">Expected Delivery Date</Label>
                  <Input id="expectedDeliveryDate" type="date" value={editForm.expected_delivery_date} onChange={(e) => setEditForm((p) => ({ ...p, expected_delivery_date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="editNotes" className="text-xs">Notes</Label>
                  <Textarea id="editNotes" value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." rows={2} className="resize-none" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button size="sm" onClick={submitEdit} disabled={isUpdating || editForm.total_amount <= 0}>{isUpdating ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Update */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Update Status</DialogTitle></DialogHeader>
          {selectedPreorder && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={statusForm.status} onValueChange={(v) => setStatusForm((p) => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="voided">Voided</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea value={statusForm.notes} onChange={(e) => setStatusForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Add any notes..." rows={2} className="resize-none" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowStatusModal(false)}>Cancel</Button>
            <Button size="sm" onClick={submitStatusUpdate} disabled={isUpdating}>{isUpdating ? "Updating..." : "Update Status"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="text-destructive">Delete Pre-order</DialogTitle></DialogHeader>
          {selectedPreorder && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
              <div className="bg-muted/50 border border-border p-3 rounded-lg space-y-1">
                <p className="text-sm font-medium">{selectedPreorder.product.name}</p>
                <p className="text-xs text-muted-foreground">Customer: {selectedPreorder.customer.name}</p>
                <p className="text-xs text-muted-foreground">Amount: {formatCurrency(selectedPreorder.total_amount, currency)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={confirmDelete} disabled={isDeleting}>{isDeleting ? "Deleting..." : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel & Convert */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader><DialogTitle>Cancel Pre-order</DialogTitle></DialogHeader>
          {selectedPreorder && (
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 animate-in fade-in duration-200">
              <p className="text-sm text-muted-foreground">This will create a sale from the down payment and cancel the pre-order.</p>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-1 pl-1">
                <li>Create a product variant from this pre-order</li>
                <li>Mark the variant as sold immediately</li>
                <li>Record the down payment ({formatCurrency(selectedPreorder.down_payment || 0, currency)}) as a completed sale</li>
                <li>Change the pre-order status to &ldquo;cancelled&rdquo;</li>
              </ul>

              {/* Product card */}
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    {selectedPreorder.product.image ? (
                      <div className="relative h-14 w-14 rounded-md overflow-hidden border border-border">
                        <Image src={selectedPreorder.product.image} alt={selectedPreorder.product.name} fill className="object-cover" />
                      </div>
                    ) : (
                      <div className="h-14 w-14 bg-muted rounded-md flex items-center justify-center border border-border"><Package className="h-6 w-6 text-muted-foreground" /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 truncate">{selectedPreorder.product.name}</h3>
                      <p className="text-xs text-yellow-700 dark:text-yellow-400/80">{selectedPreorder.product.brand} · Size: {selectedPreorder.size} · {selectedPreorder.customer.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2 border-t border-yellow-200 dark:border-yellow-900/50">
                      <div>
                        <p className="text-[10px] text-yellow-600 dark:text-yellow-500">Down Payment</p>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">{formatCurrency(selectedPreorder.down_payment || 0, currency)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-yellow-600 dark:text-yellow-500">Total Amount</p>
                        <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">{formatCurrency(selectedPreorder.total_amount, currency)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Type */}
              <div className="space-y-1.5">
                <Label className="text-xs">Payment Type</Label>
                <Select value={cancelForm.paymentType} onValueChange={(v) => setCancelForm((p) => ({ ...p, paymentType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select payment type" /></SelectTrigger>
                  <SelectContent>
                    {paymentTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {t.fee_type !== "none" && <span className="text-xs text-muted-foreground ml-1">({t.fee_type === "percent" ? `${t.fee_value}%` : `+${formatCurrency(t.fee_value, currency)}`})</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Profit Distribution */}
              <div className="space-y-1.5">
                <Label className="text-xs">Profit Distribution</Label>
                <Select value={cancelForm.profitTemplateId} onValueChange={(v) => setCancelForm((p) => ({ ...p, profitTemplateId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">
                      <div className="flex items-center gap-2">
                        {(() => {
                          const ma = avatars.find((a) => a.type?.toLowerCase() === "main") || (avatars.length > 0 ? avatars[0] : null);
                          return ma ? (
                            <><Avatar className="h-5 w-5"><AvatarImage src={ma.image || `/api/avatar?name=${ma.name}`} /><AvatarFallback className="text-xs">{ma.name.charAt(0)}</AvatarFallback></Avatar><span>Main Account Only</span></>
                          ) : (
                            <><div className="w-5 h-5 bg-primary rounded-full" /><span>Main Account Only</span></>
                          );
                        })()}
                      </div>
                    </SelectItem>
                    <SelectItem value="manual">
                      <div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full bg-emerald-500 dark:bg-emerald-600" />Manual Distribution</div>
                    </SelectItem>
                    {profitTemplates.length > 0 && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground bg-muted">Templates ({profitTemplates.length})</div>
                        {profitTemplates.map((tpl) => (
                          <SelectItem key={tpl.id} value={tpl.id}>
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-purple-500 dark:bg-purple-600" />
                              {tpl.name}
                              {tpl.description && <span className="text-xs text-muted-foreground ml-1">({tpl.description})</span>}
                            </div>
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Distribution Preview */}
              {cancelForm.profitTemplateId && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Distribution Preview</Label>
                  <div className="bg-muted/50 border border-border rounded-lg p-3 space-y-2">
                    {(() => {
                      const dp = selectedPreorder.down_payment || 0;
                      if (cancelForm.profitTemplateId === "main") {
                        const ma = avatars.find((a) => a.type?.toLowerCase() === "main") || avatars.find((a) => a.name?.toLowerCase().includes("main")) || (avatars.length > 0 ? avatars[0] : null);
                        return ma ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm"><span className="font-medium">Down Payment</span><span className="font-medium">{formatCurrency(dp, currency)}</span></div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2"><Avatar className="h-6 w-6">{ma.image ? <AvatarImage src={ma.image} /> : null}<AvatarFallback className="text-xs">{ma.name.charAt(0)}</AvatarFallback></Avatar><span className="text-sm">{ma.name}</span></div>
                              <span className="text-sm font-medium">100% — {formatCurrency(dp, currency)}</span>
                            </div>
                          </div>
                        ) : <p className="text-sm text-muted-foreground">No main account found</p>;
                      }
                      if (cancelForm.profitTemplateId === "manual") {
                        return (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm"><span className="font-medium">Manual Distribution</span><span className="font-medium">{formatCurrency(dp, currency)}</span></div>
                            {avatars.map((av) => {
                              const pct = manualDistribution[av.id] || 0;
                              const amt = (dp * pct) / 100;
                              return (
                                <div key={av.id} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2"><Avatar className="h-4 w-4">{av.image ? <AvatarImage src={av.image} /> : null}<AvatarFallback className="text-[9px]">{av.name.charAt(0)}</AvatarFallback></Avatar><span>{av.name}</span></div>
                                  <div className="flex items-center gap-2">
                                    <input type="number" min="0" max="100" step="0.1" value={pct} onChange={(e) => updateManualPercentage(av.id, parseFloat(e.target.value) || 0)} className="w-12 h-6 text-xs border border-border bg-background rounded px-1 text-center" />
                                    <span className="text-xs">%</span>
                                    <span className="font-medium min-w-[60px] text-right">{formatCurrency(amt, currency)}</span>
                                  </div>
                                </div>
                              );
                            })}
                            <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
                              <span className="font-medium">Total</span>
                              <span className={cn("font-medium", totalManualPercentage === 100 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>{totalManualPercentage.toFixed(1)}%</span>
                            </div>
                            {totalManualPercentage !== 100 && (
                              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900/50 rounded-md p-2">
                                <p className="text-xs text-yellow-700 dark:text-yellow-400">Total must equal 100% (currently {totalManualPercentage.toFixed(1)}%)</p>
                              </div>
                            )}
                          </div>
                        );
                      }
                      // Template
                      const tpl = profitTemplates.find((t) => t.id === cancelForm.profitTemplateId) as any;
                      if (!tpl) return <p className="text-sm text-muted-foreground">Template not found</p>;
                      return (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm"><span className="font-medium">{tpl.name}</span><span className="font-medium">{formatCurrency(dp, currency)}</span></div>
                          {tpl.profit_template_items?.map((item: any, i: number) => {
                            const av = item.avatars;
                            const amt = (dp * item.percentage) / 100;
                            return (
                              <div key={i} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  {av ? (<><Avatar className="h-4 w-4">{av.image ? <AvatarImage src={av.image} /> : null}<AvatarFallback className="text-[9px]">{av.name.charAt(0)}</AvatarFallback></Avatar><span>{av.name}</span></>) : <span>Unknown</span>}
                                </div>
                                <span className="font-medium">{item.percentage}% — {formatCurrency(amt, currency)}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="text-xs">Notes</Label>
                <Textarea value={cancelForm.notes} onChange={(e) => setCancelForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Additional notes..." rows={2} className="resize-none" />
              </div>
            </div>
          )}
          <DialogFooter className="shrink-0 flex flex-col sm:flex-row gap-2 pt-4 border-t border-border">
            <Button variant="outline" size="sm" onClick={() => setShowCancelModal(false)} className="w-full sm:w-auto">Keep Pre-order</Button>
            <Button variant="destructive" size="sm" onClick={() => selectedPreorder && processCancelToSale(selectedPreorder)} disabled={isUpdating || !cancelForm.paymentType || !cancelForm.profitTemplateId || (cancelForm.profitTemplateId === "manual" && totalManualPercentage !== 100)} className="w-full sm:w-auto">
              {isUpdating ? "Processing..." : "Cancel & Convert to Sale"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void */}
      <Dialog open={showVoidModal} onOpenChange={setShowVoidModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Void Pre-order</DialogTitle></DialogHeader>
          {selectedPreorder && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <p className="text-sm text-muted-foreground">Are you sure you want to void this pre-order?</p>
              <div className="bg-destructive/5 border border-destructive/20 p-3 rounded-lg space-y-1">
                <p className="text-sm font-medium">{selectedPreorder.product.name}</p>
                <p className="text-xs text-muted-foreground">Size: {selectedPreorder.size} · {selectedPreorder.customer.name}</p>
                <p className="text-xs text-muted-foreground">Amount: {formatCurrency(selectedPreorder.total_amount, currency)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowVoidModal(false)}>Cancel</Button>
            <Button variant="destructive" size="sm" onClick={confirmVoid} disabled={isUpdating}>{isUpdating ? "Voiding..." : "Void Pre-order"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore */}
      <Dialog open={showRestoreModal} onOpenChange={setShowRestoreModal}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Restore Pre-order</DialogTitle></DialogHeader>
          {selectedPreorder && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <p className="text-sm text-muted-foreground">This will restore the pre-order back to pending status.</p>
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 p-3 rounded-lg space-y-1">
                <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300">{selectedPreorder.product.name}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400/80">Size: {selectedPreorder.size} · {selectedPreorder.customer.name}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400/80">Amount: {formatCurrency(selectedPreorder.total_amount, currency)}</p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400/80">Current: {selectedPreorder.status}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setShowRestoreModal(false)}>Cancel</Button>
            <Button size="sm" onClick={confirmRestore} disabled={isUpdating}>{isUpdating ? "Restoring..." : "Restore Pre-order"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
