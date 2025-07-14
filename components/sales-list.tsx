"use client"

import { useState, useMemo } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreHorizontal, Eye, Trash2 } from "lucide-react"
import type { Sale } from "@/lib/types"
import { SaleDetailModal } from "./sale-detail-modal"
import { ConfirmationModal } from "./confirmation-modal"
import { formatCurrency } from "@/lib/utils/currency"
import { useCurrency } from "@/context/CurrencyContext"

interface SalesListProps {
  sales: Sale[]
}

const SalesList: React.FC<SalesListProps> = ({ sales }) => {
  const { currency } = useCurrency()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false)
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
  const [saleToDelete, setSaleToDelete] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const pageSize = 10
       
  const formatCustomId = (n: number) => `#${n.toString().padStart(3, "0")}`

  // Filter and sort sales by date ascending (oldest first)
  const filteredAndSortedSales = useMemo(() => {
    let filtered = sales;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = sales.filter((sale) =>
        sale.id.toLowerCase().includes(term) ||
        new Date(sale.sale_date).toLocaleDateString().toLowerCase().includes(term) ||
        sale.customer_name?.toLowerCase().includes(term) ||
        sale.customer_phone?.toLowerCase().includes(term) ||
        sale.items.some((item: any) =>
          item.variant.productName.toLowerCase().includes(term) ||
          item.variant.serialNumber.toLowerCase().includes(term)
        )
      );
    }
    // Sort by sale_date ascending (oldest first)
    return [...filtered].sort((a, b) => new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime());
  }, [sales, searchTerm]);

  const totalPages = Math.ceil(filteredAndSortedSales.length / pageSize);
  const paginatedSales = filteredAndSortedSales.slice((page - 1) * pageSize, page * pageSize);

  const handleViewDetails = (sale: Sale) => {
    setSelectedSale(sale)
    setIsDetailModalOpen(true)
  }

  const handleDeleteClick = (saleId: string) => {
    setSaleToDelete(saleId)
    setIsConfirmModalOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!saleToDelete) return
    try {
      const res = await fetch("/api/delete-sale", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId: saleToDelete }),
      })
      const result = await res.json()
      if (result.success) {
        console.log("Deleted!")
      } else {
        console.error("Failed:", result.error)
      }
    } catch (err) {
      console.error("Error deleting:", err)
    }
    setIsConfirmModalOpen(false)
    setSaleToDelete(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {paginatedSales.length} of {filteredAndSortedSales.length} filtered sales
        </div>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search sales..."
          className="input"
        />
      </div>

      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sale #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Items</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Profit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-gray-500">
                  {searchTerm ? "No results for that search." : "No sales yet."}
                </TableCell>
              </TableRow>
            ) : (
              paginatedSales.map((sale) => {
                // Find the index of this sale in the full sorted list for correct customId
                const sortedIndex = filteredAndSortedSales.findIndex(s => s.id === sale.id);
                const customId = sale.sales_custom_id || formatCustomId(sortedIndex + 1);
                return (
                  <TableRow key={sale.id}>
                    <TableCell className="font-mono text-sm">{customId}</TableCell>
                    <TableCell>{new Date(sale.sale_date).toLocaleDateString()}</TableCell>
                    <TableCell>{sale.customer_name || <span className="text-gray-400 italic">No name</span>}</TableCell>
                    <TableCell>{sale.customer_phone || <span className="text-gray-400 italic">No phone</span>}</TableCell>
                    <TableCell>
                      {sale.items?.length > 0 ? (
                        <ul className="text-sm">
                          {sale.items.slice(0, 2).map((item: any) => (
                            <li key={item.id}>
                              {item.variant.productName} <span className="text-xs text-muted-foreground">(SN: {item.variant.serialNumber})</span>
                            </li>
                          ))}
                          {sale.items.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{sale.items.length - 2} more items
                            </div>
                          )}
                        </ul>
                      ) : (
                        <span className="text-gray-400 italic">No items</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(sale.total_amount, currency)}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${sale.net_profit < 0 ? "text-red-600" : "text-green-600"}`}>
                      {formatCurrency(sale.net_profit, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost">
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
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Modals */}
      {selectedSale && (
        <SaleDetailModal
          open={isDetailModalOpen}
          onOpenChange={setIsDetailModalOpen}
          sale={selectedSale}
        />
      )}

      <ConfirmationModal
        open={isConfirmModalOpen}
        onOpenChange={setIsConfirmModalOpen}
        title="Confirm Deletion"
        description="Are you sure you want to delete this sale? This action cannot be undone."
        onConfirm={handleConfirmDelete}
        confirmText="Delete"
        cancelText="Cancel"
      />
    </div>
  )
}

export default SalesList
