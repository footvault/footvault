"use client"

import type React from "react"

import { useState, useTransition, useEffect, useRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Download, Upload, Loader2, XCircle, CheckCircle, AlertTriangle, Plus, Copy, Trash2 } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import Papa from "papaparse" // For CSV parsing
import { importProductsAndVariants } from "@/app/actions" // New server action
import { createClient } from "@/lib/supabase/client"

interface ImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  refreshData: () => Promise<void>
}

interface ParsedRow {
  [key: string]: string | number | undefined
  "Product Name": string
  "Product Brand": string
  "Product SKU": string
  "Product Category": string
  "Original Price": number
  "Sale Price": number
  "Size Category": string
  Size: string
  "Size Label": string
  Location: string
  "Variant Status": string
  "Date Added": string
  Condition: string
  "Serial Number": string
  "Variant SKU": string
  "Cost Price": number // Added for import
}

// Define expected headers and their validation rules
const csvTemplateHeaders = [
  { key: "Product Name", label: "Product Name", required: true, type: "string" },
  { key: "Product Brand", label: "Product Brand", required: false, type: "string" },
  { key: "Product SKU", label: "Product SKU", required: true, type: "string" },
  { key: "Product Category", label: "Product Category", required: false, type: "string" },
  { key: "Original Price", label: "Original Price", required: false, type: "number" },
  { key: "Sale Price", label: "Sale Price", required: false, type: "number" },
  { key: "Size Category", label: "Size Category", required: false, type: "string" },
  { key: "Size", label: "Size", required: false, type: "string" },
  { key: "Size Label", label: "Size Label", required: false, type: "string" },
  { key: "Location", label: "Location", required: false, type: "string" },
  { key: "Variant Status", label: "Variant Status", required: false, type: "string" },
  { key: "Date Added", label: "Date Added", required: false, type: "string" },
  { key: "Condition", label: "Condition", required: false, type: "string" },
  { key: "Serial Number", label: "Serial Number", required: true, type: "string" },
  { key: "Variant SKU", label: "Variant SKU", required: false, type: "string" },
  { key: "Cost Price", label: "Cost Price", required: false, type: "number" }, // Added Cost Price
]

// Add two example rows for template download
const exampleRows = [
  {
    "Product Name": "Nike Air Max 90",
    "Product Brand": "Nike",
    "Product SKU": "AM90-001",
    "Product Category": "Sneakers",
    "Original Price": 120,
    "Sale Price": 150,
    "Size Category": "Men",
    "Size": "10",
    "Size Label": "US",
    "Location": "Warehouse A",
    "Variant Status": "Available",
    "Date Added": "2025-07-12",
    "Condition": "New",
    "Serial Number": "SN123456",
    "Variant SKU": "AM90-001-10US",
    "Cost Price": 100,
  },
  {
    "Product Name": "Adidas Ultraboost",
    "Product Brand": "Adidas",
    "Product SKU": "UB-002",
    "Product Category": "Running",
    "Original Price": 140,
    "Sale Price": 180,
    "Size Category": "Women",
    "Size": "8",
    "Size Label": "US",
    "Location": "Warehouse B",
    "Variant Status": "Available",
    "Date Added": "2025-07-12",
    "Condition": "New",
    "Serial Number": "SN654321",
    "Variant SKU": "UB-002-8US",
    "Cost Price": 120,
  },
]

export function ImportModal({ open, onOpenChange, refreshData }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedData, setParsedData] = useState<ParsedRow[]>([])
  const [parsingError, setParsingError] = useState<string | null>(null)
  const [isImporting, startImportTransition] = useTransition()
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; columnKey: string } | null>(null)
  const [editValue, setEditValue] = useState<string>("")
  const [validationErrors, setValidationErrors] = useState<Map<string, string>>(new Map()) // Key: "rowIndex-columnKey"

  useEffect(() => {
    if (!open) {
      // Reset state when modal closes
      setFile(null)
      setParsedData([])
      setParsingError(null)
      setEditingCell(null)
      setEditValue("")
      setValidationErrors(new Map())
    }
  }, [open])

  const validateCell = (rowIndex: number, columnKey: string, value: string): string | null => {
    const header = csvTemplateHeaders.find((h) => h.key === columnKey)
    if (!header) return null // Should not happen with predefined headers

    if (header.required && !value.trim()) {
      return `${header.label} is required.`
    }

    if (header.type === "number" && value.trim() && isNaN(Number(value))) {
      return `${header.label} must be a number.`
    }

    // Specific validation for Serial Number uniqueness (client-side check for current batch)
    if (columnKey === "Serial Number" && value.trim()) {
      const currentSerialNumbers = new Set<string>()
      for (let i = 0; i < parsedData.length; i++) {
        if (i === rowIndex) continue // Skip self
        const existingSN = parsedData[i]["Serial Number"]
        if (existingSN && existingSN.toString().trim() === value.trim()) {
          return `Duplicate Serial Number in row ${i + 1}.`
        }
        if (existingSN) currentSerialNumbers.add(existingSN.toString().trim())
      }
    }

    return null
  }

  const validateAllData = (data: ParsedRow[]): boolean => {
    const newErrors = new Map<string, string>()
    let hasErrors = false

    data.forEach((row, rowIndex) => {
      csvTemplateHeaders.forEach((header) => {
        const value = String(row[header.key] || "")
        const error = validateCell(rowIndex, header.key, value)
        if (error) {
          newErrors.set(`${rowIndex}-${header.key}`, error)
          hasErrors = true
        }
      })
    })
    setValidationErrors(newErrors)
    return !hasErrors
  }

  const handleDownloadTemplate = () => {
    const headers = csvTemplateHeaders.map((h) => h.label)
    const csvContent = [
      headers.map((h) => `"${h}"`).join(","),
      ...exampleRows.map((row) => headers.map((h) => `"${row[h] ?? ''}"`).join(",")),
    ].join("\n") + "\n"
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "inventory_import_template.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setParsingError(null)
      setParsedData([])
      setValidationErrors(new Map())

      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: false,
        complete: (results) => {
          if (results.errors.length > 0) {
            setParsingError(`Parsing errors: ${results.errors.map((e) => e.message).join("; ")}`)
            setParsedData([])
            return
          }

          const uploadedHeaders = results.meta.fields || []
          const missingHeaders = csvTemplateHeaders.filter((h) => !uploadedHeaders.includes(h.label))
          if (missingHeaders.length > 0) {
            setParsingError(
              `Missing required CSV headers: ${missingHeaders.map((h) => h.label).join(", ")}. Please use the provided template.`,
            )
            setParsedData([])
            return
          }

          const cleanedData = results.data.map((row: any) => {
            const newRow: ParsedRow = {} as ParsedRow
            csvTemplateHeaders.forEach((header) => {
              let value: string | number | undefined = row[header.label]
              if (header.type === "number") {
                value = Number.parseFloat(value as string) || 0
              }
              newRow[header.key] = value
            })

            // Apply defaults if not provided
            newRow["Product Category"] = newRow["Product Category"] || "Uncategorized"
            newRow["Size Category"] = newRow["Size Category"] || "Unisex"
            newRow["Size Label"] = newRow["Size Label"] || "US"
            newRow["Location"] = newRow["Location"] || "Warehouse A"
            newRow["Variant Status"] = newRow["Variant Status"] || "Available"
            newRow["Date Added"] = newRow["Date Added"] || new Date().toISOString().split("T")[0]
            newRow["Condition"] = newRow["Condition"] || "New"
            newRow["Cost Price"] = newRow["Cost Price"] || 0 // Default cost price

            return newRow
          }) as ParsedRow[]

          setParsedData(cleanedData)
          // Always show the table, even if validation fails
          // (table is shown if parsedData.length > 0)
          // Fetch images for all rows after setting data
          setTimeout(() => {
            cleanedData.forEach(async (row, i) => {
              const sku = row["Product SKU"] as string
              if (sku) {
                const imageUrl = await fetchImageForSKU(sku)
                setParsedData((prev) => {
                  const updated = [...prev]
                  updated[i] = { ...updated[i], _imageUrl: imageUrl }
                  return updated
                })
              }
            })
          }, 0)
          validateAllData(cleanedData) // Initial validation
        },
        error: (err) => {
          setParsingError(`Failed to parse file: ${err.message}`)
          setParsedData([])
        },
      })
    } else {
      setFile(null)
      setParsedData([])
      setParsingError(null)
      setValidationErrors(new Map())
    }
  }

  const handleCellClick = (rowIndex: number, columnKey: string, value: string | number | undefined) => {
    setEditingCell({ rowIndex, columnKey })
    setEditValue(String(value || ""))
  }

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value)
  }

  const handleEditBlur = () => {
    if (!editingCell) return

    const { rowIndex, columnKey } = editingCell
    const updatedData = [...parsedData]
    const header = csvTemplateHeaders.find((h) => h.key === columnKey)

    let valueToSet: string | number | undefined = editValue
    if (header?.type === "number") {
      valueToSet = Number.parseFloat(editValue) || 0
    }

    updatedData[rowIndex][columnKey] = valueToSet
    setParsedData(updatedData)

    // Re-validate the specific cell
    const error = validateCell(rowIndex, columnKey, String(valueToSet))
    setValidationErrors((prev) => {
      const newMap = new Map(prev)
      if (error) {
        newMap.set(`${rowIndex}-${columnKey}`, error)
      } else {
        newMap.delete(`${rowIndex}-${columnKey}`)
      }
      return newMap
    })

    // Re-validate all serial numbers if the serial number column was edited
    if (columnKey === "Serial Number") {
      const serialNumberErrors = new Map<string, string>()
      const seenSerialNumbers = new Set<string>()
      updatedData.forEach((row, idx) => {
        const sn = String(row["Serial Number"] || "").trim()
        if (sn) {
          if (seenSerialNumbers.has(sn)) {
            serialNumberErrors.set(`${idx}-Serial Number`, `Duplicate Serial Number in row ${idx + 1}.`)
            // Also mark the previously seen duplicate
            const firstOccurrenceIndex = updatedData.findIndex((r) => String(r["Serial Number"] || "").trim() === sn)
            if (firstOccurrenceIndex !== idx) {
              serialNumberErrors.set(
                `${firstOccurrenceIndex}-Serial Number`,
                `Duplicate Serial Number in row ${firstOccurrenceIndex + 1}.`,
              )
            }
          } else {
            seenSerialNumbers.add(sn)
            if (!serialNumberErrors.has(`${idx}-Serial Number`)) {
              serialNumberErrors.delete(`${idx}-Serial Number`) // Clear if it was previously marked as duplicate
            }
          }
        } else {
          serialNumberErrors.set(`${idx}-Serial Number`, `Serial Number is required.`)
        }
      })

      setValidationErrors((prev) => {
        const newMap = new Map(prev)
        // Remove old SN errors
        Array.from(newMap.keys()).forEach((key) => {
          if (key.endsWith("-Serial Number")) {
            newMap.delete(key)
          }
        })
        // Add new SN errors
        serialNumberErrors.forEach((msg, key) => newMap.set(key, msg))
        return newMap
      })
    }

    setEditingCell(null)
  }

  const handleRemoveRow = (rowIndex: number) => {
    const updatedData = parsedData.filter((_, idx) => idx !== rowIndex)
    setParsedData(updatedData)
    validateAllData(updatedData) // Re-validate after removal
  }

  const handleDuplicateRow = (rowIndex: number) => {
    const rowToDuplicate = parsedData[rowIndex]
    const newRow: ParsedRow = { ...rowToDuplicate }
    // Clear unique identifiers to force new ones
    newRow["Serial Number"] = ""
    newRow["Variant SKU"] = ""
    // Optionally update date added to today
    newRow["Date Added"] = new Date().toISOString().split("T")[0]

    const updatedData = [...parsedData, newRow]
    setParsedData(updatedData)
    validateAllData(updatedData) // Re-validate after duplication
  }

  const handleAddEmptyRow = () => {
    const newEmptyRow: ParsedRow = {
      "Product Name": "",
      "Product Brand": "",
      "Product SKU": "",
      "Product Category": "Uncategorized",
      "Original Price": 0,
      "Sale Price": 0,
      "Size Category": "Unisex",
      Size: "",
      "Size Label": "US",
      Location: "Warehouse A",
      "Variant Status": "Available",
      "Date Added": new Date().toISOString().split("T")[0],
      Condition: "New",
      "Serial Number": "",
      "Variant SKU": "",
      "Cost Price": 0, // Default cost price for new row
    }
    const updatedData = [...parsedData, newEmptyRow]
    setParsedData(updatedData)
    validateAllData(updatedData) // Re-validate after adding empty row
  }

  const handleConfirmImport = async () => {
    if (parsedData.length === 0) {
      toast({
        title: "No Data to Import",
        description: "Please upload a CSV file with data.",
        variant: "destructive",
      })
      return
    }

    if (!validateAllData(parsedData)) {
      toast({
        title: "Validation Errors",
        description: "Please correct the highlighted errors in the table before importing.",
        variant: "destructive",
      })
      return
    }

    startImportTransition(async () => {
      const { success, error, importedCount } = await importProductsAndVariants(parsedData)

      if (success) {
        toast({
          title: "Import Successful",
          description: `${importedCount} products and/or variants imported/updated.`,
        })
        onOpenChange(false) // Close modal
        refreshData() // Refresh the main table
      } else {
        toast({
          title: "Import Failed",
          description: error || "An unknown error occurred during import.",
          variant: "destructive",
        })
      }
      setFile(null)
      setParsedData([])
      setParsingError(null)
    })
  }

  const hasOverallErrors = parsingError || validationErrors.size > 0

  // After parsing, fetch product images by SKU (throttled)
  const imageCache = useRef<{ [sku: string]: string }>({})
  // Replace fetchImageForSKU to use SneakerDev API
  const fetchImageForSKU = async (sku: string) => {
    if (imageCache.current[sku]) return imageCache.current[sku]
    // 1. Try Supabase first
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("product_images")
        .select("image_url")
        .eq("sku", sku)
        .single()
      if (data?.image_url) {
        imageCache.current[sku] = data.image_url
        return data.image_url
      }
    } catch (e) {
      // ignore, fallback to API
    }
    // 2. Fallback to SneakerDev API
    try {
      const res = await fetch(`https://api.sneakerdev.com/v1/sneakers?sku=${encodeURIComponent(sku)}`)
      if (!res.ok) throw new Error("Not found")
      const apiData = await res.json()
      const imageUrl = apiData?.results?.[0]?.image || ""
      if (imageUrl) {
        // Save to Supabase for future use
        try {
          const supabase = createClient()
          await supabase.from("product_images").upsert({ sku, image_url: imageUrl })
        } catch (e) {
          // ignore
        }
      }
      imageCache.current[sku] = imageUrl
      return imageUrl
    } catch (e) {
      imageCache.current[sku] = ""
      return ""
    }
  }

  useEffect(() => {
    if (parsedData.length > 0) {
      let isMounted = true
      const fetchImages = async () => {
        for (let i = 0; i < parsedData.length; i++) {
          const sku = parsedData[i]["Product SKU"] as string
          if (sku) {
            const imageUrl = await fetchImageForSKU(sku)
            if (isMounted) {
              setParsedData((prev) => {
                const updated = [...prev]
                updated[i] = { ...updated[i], _imageUrl: imageUrl }
                return updated
              })
            }
          }
        }
      }
      fetchImages()
      return () => {
        isMounted = false
      }
    }
  }, [parsedData.length])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" /> Import Inventory Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600">
            Import your product and individual shoe data using a CSV file.
            <br />
            Each row in the CSV should represent one individual shoe (variant). If a product SKU or variant serial
            number already exists, the existing entry will be updated; otherwise, a new one will be created.
          </p>

          <Button onClick={handleDownloadTemplate} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" /> Download CSV Template
          </Button>

          <div>
            <Label htmlFor="csv-file" className="block text-sm font-medium text-gray-700 mb-2">
              Upload CSV File
            </Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              disabled={isImporting}
            />
            {file && <p className="text-xs text-gray-500 mt-1">Selected file: {file.name}</p>}
            {parsingError && (
              <div className="flex items-center text-red-500 text-sm mt-2">
                <XCircle className="h-4 w-4 mr-1" /> {parsingError}
              </div>
            )}
            {!parsingError && parsedData.length > 0 && validationErrors.size === 0 && (
              <div className="flex items-center text-green-600 text-sm mt-2">
                <CheckCircle className="h-4 w-4 mr-1" /> CSV parsed successfully. Ready to import.
              </div>
            )}
            {!parsingError && parsedData.length > 0 && validationErrors.size > 0 && (
              <div className="flex items-center text-yellow-600 text-sm mt-2">
                <AlertTriangle className="h-4 w-4 mr-1" /> Found {validationErrors.size} potential issues. Please review
                the table below.
              </div>
            )}
          </div>

          {parsedData.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Preview & Edit ({parsedData.length} rows)</h3>
              <div className="border rounded-md overflow-hidden max-h-80 overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-white z-10">
                    <TableRow>
                      {csvTemplateHeaders.map((header) => (
                        <TableHead key={header.key} className="whitespace-nowrap">
                          {header.label} {header.required && <span className="text-red-500">*</span>}
                        </TableHead>
                      ))}
                      <TableHead className="whitespace-nowrap">Image</TableHead>
                      <TableHead className="whitespace-nowrap">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((row, rowIndex) => (
                      <TableRow
                        key={rowIndex}
                        className={
                          validationErrors.has(`${rowIndex}-Product SKU`) ||
                          validationErrors.has(`${rowIndex}-Serial Number`)
                            ? "bg-red-50"
                            : ""
                        }
                      >
                        {csvTemplateHeaders.map((header) => {
                          const cellKey = `${rowIndex}-${header.key}`
                          const hasError = validationErrors.has(cellKey)
                          return (
                            <TableCell
                              key={header.key}
                              className={`text-xs relative ${hasError ? "border-red-500" : ""}`}
                              onClick={() => handleCellClick(rowIndex, header.key, row[header.key])}
                            >
                              {editingCell?.rowIndex === rowIndex && editingCell?.columnKey === header.key ? (
                                <Input
                                  value={editValue}
                                  onChange={handleEditChange}
                                  onBlur={handleEditBlur}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.currentTarget.blur()
                                    }
                                  }}
                                  autoFocus
                                  className={`h-7 text-xs ${hasError ? "border-red-500" : ""}`}
                                  type={header.type === "number" ? "number" : "text"}
                                  step={header.type === "number" ? "0.01" : undefined}
                                />
                              ) : (
                                <span className={`${hasError ? "text-red-700 font-semibold" : ""}`}>
                                  {String(row[header.key] || "")}
                                </span>
                              )}
                              {hasError && (
                                <p className="text-red-500 text-[10px] absolute -bottom-3 left-0 w-full bg-white px-1 rounded-b-md z-20">
                                  {validationErrors.get(cellKey)}
                                </p>
                              )}
                            </TableCell>
                          )
                        })}
                        <TableCell>
                          {row._imageUrl ? (
                            <img src={row._imageUrl} alt="Product" className="w-12 h-12 object-cover rounded" />
                          ) : (
                            <span className="text-xs text-gray-400">Fetching...</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => handleDuplicateRow(rowIndex)}
                              title="Duplicate Row"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-red-500 hover:bg-red-50"
                              onClick={() => handleRemoveRow(rowIndex)}
                              title="Remove Row"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Button onClick={handleAddEmptyRow} variant="outline" className="mt-4 w-full">
                <Plus className="h-4 w-4 mr-2" /> Add Empty Row
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isImporting}>
            Cancel
          </Button>
          <Button onClick={handleConfirmImport} disabled={isImporting || parsedData.length === 0 || hasOverallErrors}>
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
