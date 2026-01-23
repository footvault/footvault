"use client"
import { useState, ChangeEvent, useEffect } from "react"
import { v4 as uuidv4 } from "uuid"
import { useTransition } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Skeleton } from "@/components/ui/skeleton"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { toast } from "@/hooks/use-toast"
import { Plus, Loader2, Check, ChevronsUpDown, CheckCircle, XCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { insertVariantsWithUniqueSerials } from "@/lib/utils/serial-number-generator"

// Helper function to parse numbers with commas
const parseNumberFromCommaSeparated = (value: string): number => {
  if (!value) return 0;
  const cleanedValue = value.replace(/,/g, '');
  return parseFloat(cleanedValue) || 0;
};


export function ManualAddProduct({ 
  open, 
  onOpenChange, 
  onProductAdded 
}: { 
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductAdded?: () => void;
}) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition()
  const [product, setProduct] = useState({
    name: "",
    brand: "",
    sku: "",
    category: "",
    originalPrice: "",
    salePrice: "0",
    status: "In Stock",
    image: "",
    sizeCategory: "Men's",
  })
  type Variant = {
    size: string
    location: string
    status: string
    quantity: number
    condition?: string
    dateAdded?: string
  }
  const [variants, setVariants] = useState<Variant[]>([
    { size: "", location: "", status: "Available", quantity: 1, condition: "New", dateAdded: new Date().toISOString().split("T")[0] }
  ])
  // For dynamic size label (US/UK/EU/CM)
  const [sizeLabel, setSizeLabel] = useState("US");
  // For location dropdown and add
  const [addingLocationIdx, setAddingLocationIdx] = useState<number|null>(null);
  const [newLocation, setNewLocation] = useState("");
  const [customLocations, setCustomLocations] = useState<string[]>([]);
  
  // Consignor functionality
  const [consignors, setConsignors] = useState<Array<{
    id: number;
    name: string;
    commission_rate: number;
  }>>([])
  const [ownerType, setOwnerType] = useState<'store' | 'consignor'>('store');
  const [consignorId, setConsignorId] = useState<number | null>(null);
  
  // Custom location functionality
  const [showCustomLocationInput, setShowCustomLocationInput] = useState(false);
  const [newCustomLocationName, setNewCustomLocationName] = useState("");
  
  // Variant limits state
  const [variantLimits, setVariantLimits] = useState<{
    current: number
    limit: number
    remaining: number
    plan: string
  } | null>(null);
  const [loadingLimits, setLoadingLimits] = useState(false);

  // Pre-order state
  const [isPreOrder, setIsPreOrder] = useState(false);
  const [customers, setCustomers] = useState<Array<{
    id: number
    name: string
    email: string
    phone?: string
  }>>([]);
  const [preOrderForm, setPreOrderForm] = useState({
    customer_id: null as number | null,
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    down_payment: "",
    down_payment_method: "",
    expected_delivery_date: "",
    notes: ""
  });
  
  // New customer form state
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    phone: "",
    address: "",
    email: ""
  });
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  
  // Payment types for down payment method
  const [paymentTypes, setPaymentTypes] = useState<Array<{id: string, name: string, feeType?: string, feeValue?: number}>>([]);
  const [newPaymentName, setNewPaymentName] = useState("");
  const [newFeeType, setNewFeeType] = useState<"percent" | "fixed">("percent");
  const [newFeeValue, setNewFeeValue] = useState(0);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [editPaymentName, setEditPaymentName] = useState("");
  const [editFeeType, setEditFeeType] = useState<"percent" | "fixed">("percent");
  const [editFeeValue, setEditFeeValue] = useState(0);
  
  // Customer dropdown state
  const [customerSearchOpen, setCustomerSearchOpen] = useState(false);
  const [customerSearchValue, setCustomerSearchValue] = useState("");

  // Fetch user custom locations from Supabase on mount
  useEffect(() => {
    const fetchLocations = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from("custom_locations")
        .select("name")
        .eq("user_id", user.id);
      let locs = (data || []).map((row: any) => row.name);
      // Add placeholder locations if not present
      ["Warehouse A", "Warehouse B", "Warehouse C"].forEach(ph => {
        if (!locs.includes(ph)) locs.push(ph);
      });
      setCustomLocations(locs);
    };
    
    const fetchConsignors = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('consignors')
          .select('id, name, commission_rate, status')
          .eq('user_id', user.id);

        if (error) {
          console.error("Failed to fetch consignors:", error);
        } else {
          const activeConsignors = (data || []).filter(c => c.status === 'active');
          setConsignors(activeConsignors);
        }
      } catch (error) {
        console.error("Failed to fetch consignors:", error);
      }
    };
    
    fetchLocations();
    fetchConsignors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch payment types for down payment method
  useEffect(() => {
    const fetchPaymentTypes = async () => {
      try {
        const res = await fetch("/api/payment-types");
        const result = await res.json();
        if (result.data && result.data.length > 0) {
          const types = result.data.map((pt: any) => ({
            id: pt.id,
            name: pt.name,
            feeType: pt.fee_type,
            feeValue: pt.fee_value
          }));
          setPaymentTypes(types);
        }
      } catch (error) {
        console.error("Error fetching payment types:", error);
      }
    };
    fetchPaymentTypes();
  }, []);

  // Add new payment type via API
  const handleAddPaymentType = async () => {
    if (!newPaymentName.trim()) return;
    const body = { name: newPaymentName.trim(), fee_type: newFeeType, fee_value: Number(newFeeValue) };
    const res = await fetch("/api/payment-types", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await res.json();
    if (result.data) {
      setPaymentTypes(prev => [...prev, { id: result.data.id, name: result.data.name, feeType: result.data.fee_type, feeValue: result.data.fee_value }]);
      setNewPaymentName("");
      setNewFeeType("percent");
      setNewFeeValue(0);
      toast({ title: "Success", description: "Payment method added successfully." });
    } else {
      toast({ title: "Error", description: result.error || "Failed to add payment method.", variant: "destructive" });
    }
  };

  // Edit payment type via API
  const handleEditPaymentType = async (id: string) => {
    if (!editPaymentName.trim()) return;
    const body = { id, name: editPaymentName.trim(), fee_type: editFeeType, fee_value: Number(editFeeValue) };
    const res = await fetch("/api/payment-types", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await res.json();
    if (result.data) {
      setPaymentTypes(prev => prev.map(pt => pt.id === id ? { id, name: result.data.name, feeType: result.data.fee_type, feeValue: result.data.fee_value } : pt));
      setEditingPaymentId(null);
      toast({ title: "Success", description: "Payment method updated successfully." });
    } else {
      toast({ title: "Error", description: result.error || "Failed to update payment method.", variant: "destructive" });
    }
  };

  // Delete payment type via API
  const handleDeletePaymentType = async (id: string) => {
    const res = await fetch("/api/payment-types", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    const result = await res.json();
    if (result.success) {
      setPaymentTypes(prev => prev.filter(pt => pt.id !== id));
      toast({ title: "Success", description: "Payment method deleted successfully." });
    } else {
      toast({ title: "Error", description: result.error || "Failed to delete payment method.", variant: "destructive" });
    }
  };

  // Fetch variant limits on mount
  useEffect(() => {
    const fetchVariantLimits = async () => {
      setLoadingLimits(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch("/api/variant-limits", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setVariantLimits(result.data);
          }
        }
      } catch (error) {
        console.warn("Could not fetch variant limits:", error);
      } finally {
        setLoadingLimits(false);
      }
    };

    fetchVariantLimits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch customers
  const fetchCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log("No user found when fetching customers");
        return;
      }

      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, phone')
        .eq('user_id', user.id)
        .eq('is_archived', false)
        .order('name');

      if (error) {
        console.error("Failed to fetch customers:", error);
      } else {
        // Deduplicate customers by ID
        const uniqueCustomers = data?.reduce((acc: any[], customer) => {
          if (!acc.some(c => c.id === customer.id)) {
            acc.push(customer);
          }
          return acc;
        }, []) || [];
        setCustomers(uniqueCustomers);
      }
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    }
  };

  // Function to create a new customer
  const handleCreateNewCustomer = async () => {
    if (!newCustomerForm.name.trim()) return;

    setIsCreatingCustomer(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const { data, error } = await supabase
        .from('customers')
        .insert([{
          user_id: user.id,
          name: newCustomerForm.name.trim(),
          phone: newCustomerForm.phone.trim() || null,
          address: newCustomerForm.address.trim() || null,
          email: newCustomerForm.email.trim() || null,
        }])
        .select()
        .single();

      if (error) throw error;

      // Add the new customer to the list and select it
      setCustomers(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      setPreOrderForm(prev => ({ ...prev, customer_id: data.id.toString() }));

      toast({
        title: "Success",
        description: `Customer "${data.name}" has been added and selected for the pre-order.`,
      });

      setShowNewCustomerForm(false);
      setNewCustomerForm({ name: "", phone: "", address: "", email: "" });
    } catch (error: any) {
      console.error("Failed to create customer:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create customer. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Handle new customer form changes
  const handleNewCustomerFormChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewCustomerForm(prev => ({ ...prev, [id]: value }));
  };

  // Fetch customers when component mounts
  useEffect(() => {
    fetchCustomers();
  }, []);
  // Helper function to generate dynamic size options
  const getDynamicSizes = (sizeCategory: string, sizeLabel: string): string[] => {
    const sizes: string[] = []
    if (!sizeCategory || !sizeLabel) return []

    const generateRange = (start: number, end: number, step: number) => {
      for (let i = start; i <= end; i += step) {
        sizes.push(i.toString())
        if (step === 0.5 && i + 0.5 <= end) {
          sizes.push((i + 0.5).toString())
        }
      }
    }

    switch (sizeCategory) {
      case "Men's":
      case "Unisex":
        if (sizeLabel === "US") generateRange(3, 15, 0.5)
        else if (sizeLabel === "UK") generateRange(2.5, 14.5, 0.5)
        else if (sizeLabel === "EU")
          generateRange(35, 49, 0.5) // Approx
        else if (sizeLabel === "CM") generateRange(22, 33, 0.5) // Approx
        break
      case "Women's":
        if (sizeLabel === "US") generateRange(4, 13, 0.5)
        else if (sizeLabel === "UK") generateRange(2, 10, 0.5)
        else if (sizeLabel === "EU")
          generateRange(34, 44, 0.5) // Approx
        else if (sizeLabel === "CM") generateRange(21, 29, 0.5) // Approx
        break
      case "Youth": // YC
        if (sizeLabel === "US" || sizeLabel === "YC") {
          // Nike/Adidas standard Youth: 10.5C, 11C, 11.5C, 12C, 12.5C, 13C, 13.5C, 1Y, 1.5Y, 2Y, 2.5Y, 3Y, 3.5Y, 4Y, 4.5Y, 5Y, 5.5Y, 6Y, 6.5Y, 7Y
          const youthSizes = ['10.5', '11', '11.5', '12', '12.5', '13', '13.5', '1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5', '5.5', '6', '6.5', '7'];
          sizes.push(...youthSizes);
        }
        else if (sizeLabel === "UK")
          generateRange(10, 6.5, 0.5) // UK youth sizes
        else if (sizeLabel === "EU")
          generateRange(28, 40, 0.5) // EU youth sizes
        else if (sizeLabel === "CM") generateRange(16.5, 25, 0.5) // CM youth sizes
        break
      case "Toddlers": // TD
        if (sizeLabel === "US" || sizeLabel === "TD")
          generateRange(2, 13, 0.5) // Nike/Adidas standard: 2C-13C
        else if (sizeLabel === "UK")
          generateRange(1.5, 12.5, 0.5) // UK toddler sizes
        else if (sizeLabel === "EU")
          generateRange(17, 32, 0.5) // EU toddler sizes
        else if (sizeLabel === "CM") generateRange(9, 20, 0.5) // CM toddler sizes
        break
      case "T-Shirts":
        if (sizeLabel === "Clothing") {
          sizes.push("XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL")
        } else if (sizeLabel === "US") {
          // US numeric sizing for t-shirts
          generateRange(0, 20, 2) // 0, 2, 4, 6, 8, etc.
        }
        break
      case "Figurines":
        if (sizeLabel === "Standard") {
          sizes.push("1/6 Scale", "1/12 Scale", "1/10 Scale", "1/4 Scale", "1/8 Scale", "Life Size")
        } else if (sizeLabel === "Series") {
          sizes.push("Series 1", "Series 2", "Series 3", "Series 4", "Series 5", "Series 6", "Series 7", "Series 8", "Series 9", "Series 10")
        } else if (sizeLabel === "Limited") {
          sizes.push("Standard", "Deluxe", "Premium", "Limited Edition", "Exclusive", "Chase")
        }
        break
      case "Collectibles":
        if (sizeLabel === "Standard") {
          sizes.push("Mini", "Regular", "Large", "Jumbo", "Giant")
        } else if (sizeLabel === "Series") {
          sizes.push("Wave 1", "Wave 2", "Wave 3", "Wave 4", "Wave 5", "Special Edition")
        } else if (sizeLabel === "Limited") {
          sizes.push("Common", "Uncommon", "Rare", "Ultra Rare", "Secret Rare", "Chase")
        }
        break
      case "Pop Marts":
        if (sizeLabel === "Standard") {
          sizes.push("Blind Box", "Mystery Box", "Regular", "Large")
        } else if (sizeLabel === "Series") {
          sizes.push("Series 1", "Series 2", "Series 3", "Series 4", "Series 5", "Birthday Series", "Holiday Series", "Special Collab")
        } else if (sizeLabel === "Limited") {
          sizes.push("Regular", "Secret", "Hidden", "Chase", "Special Edition", "Artist Series")
        }
        break
    }
    // Use a Set to ensure uniqueness before sorting
    return Array.from(new Set(sizes)).sort((a, b) => Number.parseFloat(a) - Number.parseFloat(b)) // Ensure numerical sort
  }
  // No serial status needed for auto serials
  const [isSaving, setIsSaving] = useState(false)
  const [showRequired, setShowRequired] = useState(false)

  const handleProductChange = (e: any) => {
    setProduct({ ...product, [e.target.name]: e.target.value })
  }
  const handleVariantChange = (idx: number, e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setVariants(prev => prev.map((variant, i) =>
      i === idx ? { ...variant, [name]: name === "quantity" ? Math.max(1, parseInt(value) || 1) : value } : variant
    ))
  }

  const handleAddCustomLocation = async () => {
    if (!newCustomLocationName.trim()) {
      toast({
        title: "Location Name Empty",
        description: "Please enter a name for the new location.",
        variant: "destructive",
      });
      return;
    }

    startTransition(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          toast({
            title: "Authentication Required",
            description: "Please sign in to add a custom location.",
            variant: "destructive",
          });
          return;
        }

        const response = await fetch('/api/add-custom-location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            locationName: newCustomLocationName.trim(),
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to add custom location');
        }

        if (result.success) {
          toast({
            title: "Location Added",
            description: `"${newCustomLocationName}" has been added to custom locations.`,
          });
          setCustomLocations((prev) => [...prev, newCustomLocationName.trim()].sort());
          setNewCustomLocationName("");
          setShowCustomLocationInput(false);
          // Set the new location as selected
          setVariants(prev => prev.map((variant, i) => 
            i === 0 ? { ...variant, location: newCustomLocationName.trim() } : variant
          ));
        } else {
          toast({
            title: "Error",
            description: result.error || "Failed to add custom location",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error("Error adding custom location:", error);
        toast({
          title: "Error",
          description: error.message || "An error occurred while adding the custom location",
          variant: "destructive",
        });
      }
    });
  }


  // No serial check needed for auto serials
  const addVariant = () => {
    // Prevent adding if last variant is incomplete
    const last = variants[variants.length - 1]
    if (!last.size || !last.location) {
      setShowRequired(true)
      toast({ title: "Required Fields", description: "Please fill in size and location for the last variant before adding another." })
      return
    }
    setShowRequired(false)
    setVariants([...variants, { size: "", location: "", status: "Available", quantity: 1 }])
  }
  const removeVariant = (idx: number) => {
    setVariants(variants.filter((_, i) => i !== idx))
  }

  const requiredFields: Array<keyof typeof product> = ["name", "brand", "sku", "category", "originalPrice", "salePrice", "status", "image", "sizeCategory"];
  const isProductMissing = requiredFields.some(field => !product[field]);
  const isVariantMissing = variants.some(v => !v.size || !v.location || !v.quantity);

  const handleManualSave = async () => {
    setShowRequired(true);
    if (isProductMissing || isVariantMissing) {
      toast({ title: "Missing Fields", description: "Please fill in all required fields before saving." });
      return;
    }
    setIsSaving(true)
    startTransition(async () => {
      try {
        // Validate all product fields (redundant, but keeps logic safe)
        for (const field of requiredFields) {
          if (!product[field]) {
            setIsSaving(false);
            return;
          }
        }
        for (let i = 0; i < variants.length; i++) {
          const v = variants[i];
          if (!v.size || !v.location || !v.quantity) {
            setIsSaving(false);
            return;
          }
        }

        // Validate consignor selection if owner_type is 'consignor'
        if (ownerType === 'consignor' && !consignorId) {
          toast({ title: "Missing Consignor", description: "Please select a consignor for this variant." });
          setIsSaving(false);
          return;
        }

        // Validate preorder requirements
        if (isPreOrder) {
          if (!preOrderForm.customer_id) {
            toast({ title: "Missing Customer", description: "Please select a customer for the pre-order." });
            setIsSaving(false);
            return;
          }
          if (!preOrderForm.down_payment) {
            toast({ title: "Missing Down Payment", description: "Please enter a down payment amount." });
            setIsSaving(false);
            return;
          }
          if (!preOrderForm.down_payment_method) {
            toast({ title: "Missing Payment Method", description: "Please select a payment method for the down payment." });
            setIsSaving(false);
            return;
          }
          if (!preOrderForm.expected_delivery_date) {
            toast({ title: "Missing Delivery Date", description: "Please select an expected delivery date." });
            setIsSaving(false);
            return;
          }
        }

        // Get user session
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("Not authenticated");

        // Get session for API authentication
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) throw new Error("Authentication required");

        // Calculate total variants to be added
        const totalVariantsToAdd = variants.reduce((sum, v) => {
          return sum + (parseInt(v.quantity as any, 10) || 1);
        }, 0);

        // Check variant limits before proceeding
        try {
          const variantLimitResponse = await fetch("/api/variant-limits", {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });
          const variantLimitData = await variantLimitResponse.json();
          
          if (variantLimitData.success) {
            if (variantLimitData.data.current + totalVariantsToAdd > variantLimitData.data.limit) {
              const remaining = variantLimitData.data.remaining;
              toast({
                title: "Variant Limit Exceeded",
                description: remaining === 0 
                  ? `Variant limit reached. Your ${variantLimitData.data.plan} plan allows up to ${variantLimitData.data.limit.toLocaleString()} available variants. You currently have ${variantLimitData.data.current.toLocaleString()} available variants. Please upgrade your plan to add more variants.`
                  : `Variant limit exceeded. Your ${variantLimitData.data.plan} plan allows up to ${variantLimitData.data.limit.toLocaleString()} available variants. You currently have ${variantLimitData.data.current.toLocaleString()} available variants and are trying to add ${totalVariantsToAdd} more. Only ${remaining} slots remaining. Please adjust your quantities to ${remaining} total or upgrade your plan.`,
                variant: "destructive",
              });
              setIsSaving(false);
              return;
            }
          }
        } catch (limitError) {
          console.warn("Could not check variant limits:", limitError);
          // Continue with submission if limit check fails
        }

        // Helper function to create variants with retry logic
        const createVariantsWithRetry = async (productId: string) => {
          let retries = 3;
          let success = false;
          
          while (retries > 0 && !success) {
            try {
              // Get the highest serial_number for this user
              const { data: maxSerialData, error: serialError } = await supabase
                .from("variants")
                .select("serial_number")
                .eq("user_id", user.id)
                .order("serial_number", { ascending: false })
                .limit(1)
                .maybeSingle();

              if (serialError) {
                throw new Error(serialError.message || 'Failed to get max serial number');
              }

              let nextSerial = 1;
              if (maxSerialData && maxSerialData.serial_number) {
                const last = parseInt(maxSerialData.serial_number, 10);
                nextSerial = isNaN(last) ? 1 : last + 1;
              }

              // For each variant row, create N variants (N = quantity)
              let variantsToInsert: any[] = [];
              const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
              for (const v of variants) {
                const qty = parseInt(v.quantity as any, 10) || 1;
                for (let i = 0; i < qty; i++) {
                  variantsToInsert.push({
                    id: uuidv4(),
                    product_id: productId,
                    size: v.size,
                    location: v.location,
                    status: v.status,
                    serial_number: nextSerial++,
                    user_id: user.id,
                    variant_sku: product.sku,
                    date_added: v.dateAdded || today,
                    condition: v.condition || "New",
                    size_label: sizeLabel,
                    cost_price: 0.00,
                    isArchived: false,
                    owner_type: ownerType,
                    consignor_id: ownerType === 'consignor' ? consignorId : null,
                  });
                }
              }

              // Insert variants
              if (variantsToInsert.length > 0) {
                const { error: variantError } = await supabase
                  .from("variants")
                  .insert(variantsToInsert);
                
                if (variantError) {
                  // Check if it's a unique constraint violation
                  if (variantError.message?.includes('unique_serial_per_user') || 
                      variantError.message?.includes('duplicate key value')) {
                    retries--;
                    if (retries > 0) {
                      console.log(`🔄 Serial number conflict detected, retrying... (${retries} attempts left)`);
                      // Wait a bit before retrying to avoid rapid-fire conflicts
                      await new Promise(resolve => setTimeout(resolve, 100));
                      continue;
                    } else {
                      throw new Error('Unable to generate unique serial numbers after multiple attempts. Please try again.');
                    }
                  } else {
                    throw new Error(variantError.message);
                  }
                }
              }
              
              success = true;
            } catch (error: any) {
              if (retries === 1) {
                throw error; // Re-throw on final attempt
              }
              retries--;
              await new Promise(resolve => setTimeout(resolve, 100));
            }
          }
        };

        // Check if product exists
        const { data: existingProduct, error: checkError } = await supabase
          .from("products")
          .select("id, sku")
          .eq("sku", product.sku)
          .eq("user_id", user.id)
          .single();
        let productId;
        if (!existingProduct) {
          // Insert product
          const { data: insertedProduct, error: productError } = await supabase
            .from("products")
            .insert([
              {
                name: product.name,
                brand: product.brand,
                sku: product.sku,
                category: product.category,
                original_price: product.originalPrice,
                sale_price: product.salePrice,
                status: product.status,
                image: product.image,
                size_category: product.sizeCategory,
                user_id: user.id,
              },
            ])
            .select()
            .single();
          if (productError) throw new Error(productError.message);
          productId = insertedProduct.id;
        } else {
          productId = existingProduct.id;
        }
        
        // Insert variants with retry logic
        await createVariantsWithRetry(productId);

        // Create preorder if this is a preorder
        if (isPreOrder) {
          const preorderData = {
            customer_id: preOrderForm.customer_id,
            customer_name: preOrderForm.customer_name,
            customer_email: preOrderForm.customer_email,
            customer_phone: preOrderForm.customer_phone,
            product_name: product.name,
            product_brand: product.brand,
            product_sku: product.sku,
            size: variants[0].size,
            size_label: sizeLabel,
            product_price: parseNumberFromCommaSeparated(product.salePrice),
            down_payment: parseNumberFromCommaSeparated(preOrderForm.down_payment),
            down_payment_method: preOrderForm.down_payment_method,
            cost_price: 0, // Cost will be entered at checkout
            expected_delivery_date: preOrderForm.expected_delivery_date,
            notes: preOrderForm.notes,
            user_id: user.id,
            status: 'pending'
          };

          const { error: preorderError } = await supabase
            .from('preorders')
            .insert([preorderData]);
          
          if (preorderError) throw new Error(`Failed to create preorder: ${preorderError.message}`);
        }
        toast({ title: "Product Added", description: isPreOrder ? "Product and pre-order saved successfully." : "Product saved to inventory." });
        setProduct({ name: "", brand: "", sku: "", category: "", originalPrice: "", salePrice: "0", status: "In Stock", image: "", sizeCategory: "Men's" });
        setVariants([{ size: "", location: "", status: "Available", quantity: 1, condition: "New", dateAdded: new Date().toISOString().split("T")[0] }]);
        setOwnerType('store');
        setConsignorId(null);
        setShowCustomLocationInput(false);
        setNewCustomLocationName("");
        
        // Reset preorder state
        setIsPreOrder(false);
        setPreOrderForm({
          customer_id: null,
          customer_name: "",
          customer_email: "",
          customer_phone: "",
          down_payment: "",
          down_payment_method: "",
          expected_delivery_date: "",
          notes: ""
        });
        setCustomerSearchValue("");
        
        if (onProductAdded) onProductAdded();
        if (onOpenChange) onOpenChange(false);
      } catch (e: any) {
        toast({ title: "Error", description: e.message || "Could not save to Supabase." });
      } finally {
        setIsSaving(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Product
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4">
          {/* Product Details Column - spans 2 columns */}
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-lg font-semibold">Product Details</h3>
            
            {/* Product Image and Basic Info */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-[100px] h-[100px] rounded-md border-2 border-dashed border-gray-300 dark:border-zinc-600 bg-gray-50 dark:bg-zinc-800 flex items-center justify-center overflow-hidden">
                  {product.image ? (
                    <Image src={product.image} alt="Product Image" width={100} height={100} className="object-cover border transition-opacity duration-200 rounded-md" />
                  ) : (
                    <div className="text-center text-gray-400">
                      <div className="text-4xl mb-2">📷</div>
                      <div className="text-xs">No Image</div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex-1 space-y-2">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input 
                    id="name"
                    name="name" 
                    value={product.name} 
                    onChange={handleProductChange} 
                    placeholder="e.g. Nike Dunk Low" 
                    className="text-sm mt-1"
                    required 
                  />
                  {showRequired && !product.name && <span className="text-xs text-red-500 mt-1">Required field</span>}
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brand">Brand</Label>
                    <Input 
                      id="brand"
                      name="brand" 
                      value={product.brand} 
                      onChange={handleProductChange} 
                      placeholder="e.g. Nike" 
                      className="text-sm mt-1"
                      required 
                    />
                    {showRequired && !product.brand && <span className="text-xs text-red-500 mt-1">Required field</span>}
                  </div>
                  <div>
                    <Label htmlFor="sku">SKU</Label>
                    <Input 
                      id="sku"
                      name="sku" 
                      value={product.sku} 
                      onChange={handleProductChange} 
                      placeholder="e.g. DD1391-100" 
                      className="text-sm mt-1"
                      required 
                    />
                    {showRequired && !product.sku && <span className="text-xs text-red-500 mt-1">Required field</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Product Details */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Input 
                  id="category"
                  name="category" 
                  value={product.category} 
                  onChange={handleProductChange} 
                  placeholder="e.g. Sneakers" 
                  className="text-sm mt-1"
                  required 
                />
                {showRequired && !product.category && <span className="text-xs text-red-500 mt-1">Required field</span>}
              </div>
              
              <div>
                <Label htmlFor="sizeCategory">Size Category</Label>
                <Select
                  value={product.sizeCategory}
                  onValueChange={val => setProduct(prev => ({ ...prev, sizeCategory: val }))}
                >
                  <SelectTrigger id="sizeCategory" className="w-full mt-1">
                    <SelectValue placeholder="Select Size Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Men's">Men's</SelectItem>
                    <SelectItem value="Women's">Women's</SelectItem>
                    <SelectItem value="Unisex">Unisex</SelectItem>
                    <SelectItem value="Youth">Youth</SelectItem>
                    <SelectItem value="Toddlers">Toddlers</SelectItem>
                    <SelectItem value="T-Shirts">T-Shirts</SelectItem>
                    <SelectItem value="Figurines">Figurines</SelectItem>
                    <SelectItem value="Collectibles">Collectibles</SelectItem>
                    <SelectItem value="Pop Marts">Pop Marts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="originalPrice">Cost Price</Label>
                  <Input 
                    id="originalPrice"
                    name="originalPrice" 
                    value={product.originalPrice} 
                    onChange={handleProductChange} 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    className="text-sm mt-1"
                    required 
                  />
                  {showRequired && !product.originalPrice && <span className="text-xs text-red-500 mt-1">Required field</span>}
                </div>
                <div>
                  <Label htmlFor="salePrice">Sale Price</Label>
                  <Input 
                    id="salePrice"
                    name="salePrice" 
                    value={product.salePrice} 
                    onChange={handleProductChange} 
                    type="number" 
                    step="0.01"
                    placeholder="0.00" 
                    className="text-sm mt-1"
                    required 
                  />
                  {showRequired && !product.salePrice && <span className="text-xs text-red-500 mt-1">Required field</span>}
                </div>
              </div>
              
              <div>
                <Label htmlFor="image">Image URL</Label>
                <Input
                  id="image"
                  name="image"
                  value={product.image}
                  onChange={handleProductChange}
                  placeholder="Paste image URL here..."
                  className="text-sm mt-1"
                  required={true}
                />
                {showRequired && !product.image && <span className="text-xs text-red-500">Image URL is required</span>}
              </div>
            </div>
          </div>

          {/* Variant Details Column */}
          <div className="md:col-span-1 space-y-4">
            <h3 className="text-lg font-semibold">Individual Shoes (Variants)</h3>
            
            <div className="border p-4 rounded-md space-y-3 bg-gray-50">
              <h4 className="font-medium text-sm">Variant Details</h4>
              
              <div>
                <Label htmlFor="sizeLabel" className="text-xs">
                  Size Label
                </Label>
                <Select
                  value={sizeLabel}
                  onValueChange={val => {
                    setSizeLabel(val);
                    // Reset size if label changes
                    setVariants(prev => prev.map((v, i) => i === 0 ? { ...v, size: "" } : v));
                  }}
                >
                  <SelectTrigger id="sizeLabel" className="w-full text-xs">
                    <SelectValue placeholder="Select size label" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="US">US</SelectItem>
                    <SelectItem value="UK">UK</SelectItem>
                    <SelectItem value="EU">EU</SelectItem>
                    <SelectItem value="CM">CM</SelectItem>
                    <SelectItem value="TD">TD</SelectItem>
                    <SelectItem value="YC">YC</SelectItem>
                    <SelectItem value="Clothing">Clothing</SelectItem>
                    <SelectItem value="Standard">Standard</SelectItem>
                    <SelectItem value="Series">Series</SelectItem>
                    <SelectItem value="Limited">Limited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="size" className="text-xs">
                  Size
                </Label>
                <Select
                  value={variants[0].size}
                  onValueChange={val => handleVariantChange(0, { target: { name: 'size', value: val } } as any)}
                  disabled={!sizeLabel || !product.sizeCategory}
                >
                  <SelectTrigger id="size" className="w-full text-xs">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {getDynamicSizes(product.sizeCategory, sizeLabel).length > 0 ? (
                      getDynamicSizes(product.sizeCategory, sizeLabel).map(sizeOpt => (
                        <SelectItem key={sizeOpt} value={sizeOpt}>{sizeOpt}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="placeholder-size-select" disabled>
                        Select Size Label & Category First
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {showRequired && !variants[0].size && <span className="text-xs text-red-500 mt-1">Required field</span>}
              </div>
              
              <div>
                <Label htmlFor="location" className="text-sm">
                  Location
                </Label>
                <Select
                  value={variants[0].location}
                  onValueChange={(value) => {
                    if (value === "add-custom-location") {
                      setShowCustomLocationInput(true)
                      setVariants(prev => prev.map((variant, i) => 
                        i === 0 ? { ...variant, location: "" } : variant
                      )); // Clear current selection
                    } else {
                      setShowCustomLocationInput(false)
                      setVariants(prev => prev.map((variant, i) => 
                        i === 0 ? { ...variant, location: value } : variant
                      ));
                    }
                  }}
                >
                  <SelectTrigger id="location" className="w-full mt-1">
                    <SelectValue placeholder="Select location or add new" />
                  </SelectTrigger>
                  <SelectContent>
                    {customLocations.map((loc) => (
                      <SelectItem key={loc} value={loc}>
                        {loc}
                      </SelectItem>
                    ))}
                    <SelectItem value="add-custom-location">Add Custom Location...</SelectItem>
                  </SelectContent>
                </Select>
                {showCustomLocationInput && (
                  <div className="flex gap-2 mt-2">
                    <Input
                      id="newCustomLocationName"
                      placeholder="Enter new location name"
                      value={newCustomLocationName}
                      onChange={(e) => setNewCustomLocationName(e.target.value)}
                      className="text-sm flex-1"
                      disabled={isPending}
                    />
                    <Button
                      type="button"
                      onClick={handleAddCustomLocation}
                      size="sm"
                      className="h-9"
                      disabled={isPending}
                    >
                      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </div>
                )}
                {showRequired && !variants[0].location && <span className="text-xs text-red-500 mt-1">Required field</span>}
              </div>
              
              <div>
                <Label htmlFor="quantity" className="text-sm">
                  Quantity
                </Label>
                <Input
                  id="quantity"
                  name="quantity"
                  type="number"
                  min={1}
                  max={variantLimits ? variantLimits.remaining : undefined}
                  value={variants[0].quantity}
                  onChange={e => handleVariantChange(0, e)}
                  onBlur={(e) => {
                    if (e.target.value === "" || parseInt(e.target.value) < 1) {
                      setVariants(prev => prev.map((variant, i) => 
                        i === 0 ? { ...variant, quantity: 1 } : variant
                      ));
                    }
                  }}
                  placeholder="1"
                  className={cn(
                    "text-sm mt-1",
                    variantLimits && variants[0].quantity > variantLimits.remaining
                      ? "border-red-300 focus:border-red-500"
                      : ""
                  )}
                  required
                />
                {variantLimits && variants[0].quantity > variantLimits.remaining && (
                  <p className="text-xs text-red-600 mt-1">
                    Cannot add {variants[0].quantity} variants. Only {variantLimits.remaining} available variant slots remaining on your {variantLimits.plan} plan. 
                    {variantLimits.remaining > 0 && (
                      <span className="block font-medium">
                        Please adjust your quantity to {variantLimits.remaining} or upgrade your plan.
                      </span>
                    )}
                  </p>
                )}
              </div>
              
              {/* Condition */}
              <div>
                <Label htmlFor="condition" className="text-sm">
                  Condition
                </Label>
                <Select
                  value={variants[0].condition || "New"}
                  onValueChange={(value) => setVariants(prev => prev.map((variant, i) => 
                    i === 0 ? { ...variant, condition: value } : variant
                  ))}
                >
                  <SelectTrigger id="condition" className="w-full mt-1">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">New</SelectItem>
                    <SelectItem value="Used">Used</SelectItem>
                    <SelectItem value="Damaged">Damaged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Date Added */}
              <div>
                <Label htmlFor="dateAdded" className="text-sm">
                  Date Added
                </Label>
                <Input
                  id="dateAdded"
                  name="dateAdded"
                  type="date"
                  value={variants[0].dateAdded || new Date().toISOString().split("T")[0]}
                  onChange={e => handleVariantChange(0, e)}
                  className="text-sm mt-1"
                />
              </div>
              
              {/* Owner Type Selection */}
              <div>
                <Label htmlFor="owner_type" className="text-sm">
                  Owner
                </Label>
                <Select
                  value={ownerType}
                  onValueChange={(value: 'store' | 'consignor') => {
                    setOwnerType(value);
                    if (value === 'store') {
                      setConsignorId(null);
                    }
                  }}
                >
                  <SelectTrigger id="owner_type" className="w-full mt-1">
                    <SelectValue placeholder="Select owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store">You (Store Inventory)</SelectItem>
                    <SelectItem value="consignor">Consignor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Consignor Selection - only show if owner_type is 'consignor' */}
              {ownerType === 'consignor' && (
                <div>
                  <Label htmlFor="consignor_id" className="text-sm">
                    Select Consignor
                  </Label>
                  
                  {consignors.length === 0 ? (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md mt-1">
                      <p className="text-xs text-yellow-800 mb-2">
                        No consignors found. You need to add consignors before you can create consignment variants.
                      </p>
                    </div>
                  ) : (
                    <>
                      <Select
                        value={consignorId?.toString() || ""}
                        onValueChange={(value) => setConsignorId(parseInt(value))}
                      >
                        <SelectTrigger id="consignor_id" className="w-full mt-1">
                          <SelectValue placeholder="Select consignor" />
                        </SelectTrigger>
                        <SelectContent>
                          {consignors.map((consignor) => (
                            <SelectItem key={consignor.id} value={consignor.id.toString()}>
                              <div className="flex flex-col">
                                <span className="font-medium">{consignor.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {consignor.commission_rate}% commission
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {/* Commission Info Display */}
                      {consignorId && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                          <p className="text-blue-800">
                            <strong>Commission:</strong> {consignors.find(c => c.id === consignorId)?.commission_rate}% 
                            will be deducted from sale proceeds for this consignor.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Preorder Toggle */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPreOrder"
                    checked={isPreOrder}
                    onChange={(e) => setIsPreOrder(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="isPreOrder" className="text-sm font-medium">
                    This is a pre-order
                  </Label>
                </div>

                {isPreOrder && (
                  <div className="space-y-3 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-xs text-blue-800">
                      Pre-order items require customer selection and down payment
                    </p>
                    
                    {/* Customer Selection */}
                    <div>
                      <Label className="text-sm font-medium">Customer *</Label>
                      <Popover open={customerSearchOpen} onOpenChange={setCustomerSearchOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={customerSearchOpen}
                            className="w-full justify-between mt-1"
                          >
                            {preOrderForm.customer_id ? 
                              customers.find(customer => customer.id === preOrderForm.customer_id)?.name || "Select customer..."
                              : "Select customer..."
                            }
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full p-0">
                          <Command>
                            <CommandInput 
                              placeholder="Search customers..." 
                              value={customerSearchValue}
                              onValueChange={setCustomerSearchValue}
                            />
                            <div className="max-h-40 overflow-y-auto">
                              <CommandList>
                                <CommandEmpty>No customers found.</CommandEmpty>
                                {customers
                                  .filter(customer => 
                                    customer.name.toLowerCase().includes(customerSearchValue.toLowerCase()) ||
                                    customer.email?.toLowerCase().includes(customerSearchValue.toLowerCase()) ||
                                    customer.phone?.includes(customerSearchValue)
                                  )
                                  .map((customer) => (
                                    <CommandItem
                                      key={customer.id}
                                      value={customer.name}
                                      onSelect={() => {
                                        setPreOrderForm(prev => ({
                                          ...prev,
                                          customer_id: customer.id,
                                          customer_name: customer.name,
                                          customer_email: customer.email || '',
                                          customer_phone: customer.phone || ''
                                        }));
                                        setCustomerSearchOpen(false);
                                        setCustomerSearchValue("");
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          preOrderForm.customer_id === customer.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <div className="flex flex-col">
                                        <span>{customer.name}</span>
                                        <span className="text-xs text-gray-500">
                                          {customer.email} {customer.phone && `• ${customer.phone}`}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  ))
                                }
                              </CommandList>
                            </div>
                            <div className="border-t p-1">
                              <Button
                                variant="ghost"
                                className="w-full justify-start text-sm"
                                onClick={() => {
                                  setCustomerSearchOpen(false);
                                  handleCreateNewCustomer();
                                }}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Add New Customer
                              </Button>
                            </div>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {showRequired && isPreOrder && !preOrderForm.customer_id && (
                        <span className="text-xs text-red-500 mt-1">Customer is required for pre-orders</span>
                      )}
                    </div>

                    {/* Down Payment */}
                    <div>
                      <Label htmlFor="downPayment" className="text-sm">
                        Down Payment *
                      </Label>
                      <Input
                        id="downPayment"
                        type="number"
                        step="0.01"
                        min="0"
                        value={preOrderForm.down_payment}
                        onChange={(e) => setPreOrderForm(prev => ({
                          ...prev,
                          down_payment: e.target.value
                        }))}
                        placeholder="0.00"
                        className="text-sm mt-1"
                      />
                      {showRequired && isPreOrder && !preOrderForm.down_payment && (
                        <span className="text-xs text-red-500 mt-1">Down payment is required</span>
                      )}
                    </div>

                    {/* Down Payment Method */}
                    <div>
                      <Label htmlFor="downPaymentMethod" className="text-sm">
                        Payment Method *
                      </Label>
                      <Select
                        value={preOrderForm.down_payment_method}
                        onValueChange={(value) => setPreOrderForm(prev => ({
                          ...prev,
                          down_payment_method: value
                        }))}
                      >
                        <SelectTrigger className="text-sm mt-1">
                          <SelectValue placeholder="Select payment method" />
                        </SelectTrigger>
                        <SelectContent>
                          {paymentTypes.map(pt => (
                            <SelectItem key={pt.id} value={pt.name}>
                              {pt.name}
                            </SelectItem>
                          ))}
                          <div className="p-2 border-t mt-1">
                            <Label className="text-[10px] font-semibold mb-2 block">Add Payment Method</Label>
                            <div className="space-y-2">
                              <Input
                                placeholder="Name"
                                value={newPaymentName}
                                onChange={(e) => setNewPaymentName(e.target.value)}
                                className="text-xs h-7"
                              />
                              <div className="flex gap-1">
                                <Select value={newFeeType} onValueChange={(v: "percent" | "fixed") => setNewFeeType(v)}>
                                  <SelectTrigger className="text-xs h-7">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="percent">%</SelectItem>
                                    <SelectItem value="fixed">Fixed</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Input
                                  type="number"
                                  placeholder="Fee"
                                  value={newFeeValue}
                                  onChange={(e) => setNewFeeValue(Number(e.target.value))}
                                  className="text-xs h-7"
                                />
                                <Button onClick={handleAddPaymentType} size="sm" className="h-7 px-2 text-xs">
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </SelectContent>
                      </Select>
                      {showRequired && isPreOrder && !preOrderForm.down_payment_method && (
                        <span className="text-xs text-red-500 mt-1">Payment method is required</span>
                      )}
                    </div>

                    {/* Expected Delivery Date */}
                    <div>
                      <Label htmlFor="expectedDeliveryDate" className="text-sm">
                        Expected Delivery Date *
                      </Label>
                      <Input
                        id="expectedDeliveryDate"
                        type="date"
                        value={preOrderForm.expected_delivery_date}
                        onChange={(e) => setPreOrderForm(prev => ({
                          ...prev,
                          expected_delivery_date: e.target.value
                        }))}
                        className="text-sm mt-1"
                      />
                      {showRequired && isPreOrder && !preOrderForm.expected_delivery_date && (
                        <span className="text-xs text-red-500 mt-1">Expected delivery date is required</span>
                      )}
                    </div>

                    {/* Notes */}
                    <div>
                      <Label htmlFor="preOrderNotes" className="text-sm">
                        Notes (Optional)
                      </Label>
                      <Input
                        id="preOrderNotes"
                        value={preOrderForm.notes}
                        onChange={(e) => setPreOrderForm(prev => ({
                          ...prev,
                          notes: e.target.value
                        }))}
                        placeholder="Any additional notes..."
                        className="text-sm mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex justify-end gap-2 py-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="px-6"
          >
            Cancel
          </Button>
          <Button
            onClick={handleManualSave}
            className={cn("px-6", (isSaving || isPending) && "opacity-50 cursor-not-allowed")}
            disabled={isSaving || isPending || isProductMissing || isVariantMissing}
          >
            {isSaving || isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}