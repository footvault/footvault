"use client"

import { useState, useMemo } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Trash2, Search, Filter } from "lucide-react"
import type { Sale } from "@/lib/types"
import { SaleDetailModal } from "./sale-detail-modal"
import { ConfirmationModal } from "./confirmation-modal"
import { formatCurrency } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"

interface SalesListProps {
  sales: Sale[]
}

export function SalesList({ sales }: SalesListProps) {
  const { currency } = useCurrency()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null)

  const filteredSales = useMemo(() => {
    if (!searchTerm) {
      return sales
    }
    const lowerCaseSearchTerm = searchTerm.toLowerCase()
    return sales.filter(
      (sale) =>
        sale.id.toLowerCase().includes(lowerCaseSearchTerm) ||
        new Date(sale.sale_date).toLocaleDateString().toLowerCase().includes(lowerCaseSearchTerm) ||
        (sale.customer_name && sale.customer_name.toLowerCase().includes(lowerCaseSearchTerm)) ||
        (sale.customer_phone && sale.customer_phone.toLowerCase().includes(lowerCaseSearchTerm)) ||
        sale.items.some(
          // @ts-ignore
          (item) =>
            item.variant.productName.toLowerCase().includes(lowerCaseSearchTerm) ||
            item.variant.serialNumber.toLowerCase().includes(lowerCaseSearchTerm),
        ),
    )
  }, [sales, searchTerm])

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale)
    setIsDetailModalOpen(true)
  }

  const handleDeleteClick = (saleId: string) => {
    setSaleToDelete(saleId)
    setIsConfirmModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (saleToDelete) {
      try {
        const response = await fetch('/api/delete-sale', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ saleId: saleToDelete }),
        });
        const result = await response.json();
        if (result.success) {
          console.log("Sale deleted successfully!");
        } else {
          console.error("Failed to delete sale:", result.error);
        }
      } catch (e) {
        console.error("Failed to delete sale:", e);
      }
      setIsConfirmModalOpen(false);
      setSaleToDelete(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Search Bar - Responsive */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          type="text"
          placeholder="Search sales by ID, date, customer, or product..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full"
        />
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600">
        {filteredSales.length} of {sales.length} sales
        {searchTerm && ` matching "${searchTerm}"`}
      </div>

      {/* Desktop Table - Hidden on mobile */}
      <div className="hidden lg:block">
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Sale ID</TableHead>
                <TableHead className="w-[120px]">Date</TableHead>
                <TableHead className="w-[150px]">Customer</TableHead>
                <TableHead className="w-[130px]">Phone</TableHead>
                <TableHead className="min-w-[200px]">Items</TableHead>
                <TableHead className="w-[120px] text-right">Total</TableHead>
                <TableHead className="w-[120px] text-right">Profit</TableHead>
                <TableHead className="w-[80px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-32 text-center text-gray-500">
                    {searchTerm ? "No sales match your search criteria." : "No sales found."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">
                      {sale.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(sale.sale_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="max-w-[150px] truncate">
                        {sale.customer_name || <span className="text-gray-400 italic">No name</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {sale.customer_phone || <span className="text-gray-400 italic">No phone</span>}
                    </TableCell>
                    <TableCell>
                      {Array.isArray(sale.items) && sale.items.length > 0 ? (
                        <div className="space-y-1">
                          {sale.items.slice(0, 2).map((item) => (
                            <div key={item.id} className="text-sm">
                              <div className="font-medium truncate">
                                {item.variant.productName}
                              </div>
                              <div className="text-xs text-gray-500">
                                SN: {item.variant.serialNumber}
                              </div>
                            </div>
                          ))}
                          {sale.items.length > 2 && (
                            <div className="text-xs text-gray-500">
                              +{sale.items.length - 2} more items
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-sm">No items</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.total_amount, currency)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      sale.net_profit < 0 ? "text-red-600" : "text-green-600"
                    }`}>
                      {formatCurrency(sale.net_profit, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(sale)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(sale.id)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Sale
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Tablet Table - Visible on md screens */}
      <div className="hidden md:block lg:hidden">
        <div className="rounded-md border overflow-x-auto">
          <Table className="min-w-full text-sm">
            <TableHeader>
              <TableRow>
                <TableHead>Sale Info</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                    {searchTerm ? "No sales match your search criteria." : "No sales found."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredSales.map((sale) => (
                  <TableRow key={sale.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-mono text-xs text-gray-600">
                          {sale.id.slice(0, 12)}...
                        </div>
                        <div className="text-sm">
                          {new Date(sale.sale_date).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm font-medium">
                          {sale.customer_name || <span className="text-gray-400 italic">No name</span>}
                        </div>
                        <div className="text-xs text-gray-500">
                          {sale.customer_phone || <span className="italic">No phone</span>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {Array.isArray(sale.items) && sale.items.length > 0 ? (
                        <div className="text-sm">
                          <div className="font-medium">
                            {sale.items[0].variant.productName}
                          </div>
                          {sale.items.length > 1 && (
                            <div className="text-xs text-gray-500">
                              +{sale.items.length - 1} more
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-sm">No items</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="space-y-1">
                        <div className="font-medium">
                          {formatCurrency(sale.total_amount, currency)}
                        </div>
                        <div className={`text-xs ${
                          sale.net_profit < 0 ? "text-red-600" : "text-green-600"
                        }`}>
                          Profit: {formatCurrency(sale.net_profit, currency)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewDetails(sale)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(sale.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden">
        {filteredSales.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-center border rounded-lg bg-white text-gray-500">
            <div className="space-y-2">
              <div className="text-sm">
                {searchTerm ? "No sales match your search" : "No sales found"}
              </div>
              {searchTerm && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSearchTerm("")}
                >
                  Clear search
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSales.map((sale) => (
              <div key={sale.id} className="rounded-lg border bg-white shadow-sm overflow-hidden">
                {/* Header */}
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-mono text-xs text-gray-600">
                        ID: {sale.id.slice(0, 12)}...
                      </div>
                      <div className="text-sm font-medium">
                        {new Date(sale.sale_date).toLocaleDateString()}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleViewDetails(sale)}>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClick(sale.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Sale
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  {/* Customer Info */}
                  <div className="grid grid-cols-1 gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Customer:</span>
                      <span className="text-sm font-medium">
                        {sale.customer_name || <span className="text-gray-400 italic">No name</span>}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Phone:</span>
                      <span className="text-sm">
                        {sale.customer_phone || <span className="text-gray-400 italic">No phone</span>}
                      </span>
                    </div>
                  </div>

                  {/* Items */}
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Items Sold:</div>
                    {Array.isArray(sale.items) && sale.items.length > 0 ? (
                      <div className="space-y-2">
                        {sale.items.slice(0, 3).map((item) => (
                          <div key={item.id} className="bg-gray-50 rounded-md p-2">
                            <div className="text-sm font-medium">
                              {item.variant.productName}
                            </div>
                            <div className="text-xs text-gray-500">
                              Serial: {item.variant.serialNumber}
                            </div>
                          </div>
                        ))}
                        {sale.items.length > 3 && (
                          <div className="text-xs text-gray-500 text-center py-1">
                            +{sale.items.length - 3} more items
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-400 italic">No items</div>
                    )}
                  </div>

                  {/* Financial Info */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Amount:</span>
                      <span className="text-lg font-bold">
                        {formatCurrency(sale.total_amount, currency)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Net Profit:</span>
                      <span className={`text-lg font-bold ${
                        sale.net_profit < 0 ? "text-red-600" : "text-green-600"
                      }`}>
                        {formatCurrency(sale.net_profit, currency)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1" 
                      onClick={() => handleViewDetails(sale)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive" 
                      onClick={() => handleDeleteClick(sale.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedSale && (
        // @ts-ignore
        <SaleDetailModal 
          open={isDetailModalOpen} 
          onOpenChange={setIsDetailModalOpen} 
          // @ts-ignore
          sale={selectedSale} 
        />
      )}

      <ConfirmationModal
        open={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        title="Confirm Deletion"
        description="Are you sure you want to delete this sale? This action cannot be undone and will permanently delete the sale and all related profit distributions."
        onConfirm={handleConfirmDelete}
        // @ts-ignore
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
}