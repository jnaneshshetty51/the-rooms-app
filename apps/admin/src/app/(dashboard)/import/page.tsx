"use client";

import { useState, useCallback } from "react";
import {
    PageHeader,
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    Button,
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
    Badge,
} from "@the-rooms/ui";
import {
    Upload,
    Download,
    FileSpreadsheet,
    Users,
    BedDouble,
    Percent,
    AlertCircle,
    CheckCircle2,
    Loader2,
    X,
    Eye,
    Trash2,
} from "lucide-react";
import { formatDate } from "@the-rooms/ui";

interface ValidationError {
    row: number;
    field: string;
    message: string;
}

interface ImportResult {
    success: boolean;
    imported: number;
    errors: ValidationError[];
    duplicates: number;
    skipped: number;
}

interface PreviewRow {
    row: number;
    data: Record<string, string>;
    isValid: boolean;
    errors: ValidationError[];
}

// ─── CSV Templates ─────────────────────────────────────────────────────────────

const GUEST_TEMPLATE_COLUMNS = ["name", "phone", "email", "address", "city", "state", "pincode", "dateOfBirth", "idType", "idNumber"];
const ROOM_TEMPLATE_COLUMNS = ["roomNumber", "type", "floor", "description", "maxOccupancy", "basePriceSingle", "basePriceDouble"];
const RATE_TEMPLATE_COLUMNS = ["roomType", "seasonName", "startDate", "endDate", "priceMultiplier", "basePrice"];

function generateCSV(columns: string[], sampleRows: string[][] = []): string {
    const header = columns.join(",");
    const rows = sampleRows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    return header + (rows ? "\n" + rows : "");
}

function downloadTemplate(columns: string[], filename: string, sampleRows?: string[][]) {
    const csv = generateCSV(columns, sampleRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

// ─── File Upload Component ─────────────────────────────────────────────────────

interface FileUploadProps {
    accept: string;
    onFileSelect: (file: File) => void;
    isProcessing: boolean;
}

function FileUpload({ accept, onFileSelect, isProcessing }: FileUploadProps) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFileSelect(file);
    }, [onFileSelect]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onFileSelect(file);
    }, [onFileSelect]);

    return (
        <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${isDragging ? "border-[#E17055] bg-orange-50" : "border-gray-300 hover:border-gray-400"
                }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
        >
            <input
                type="file"
                accept={accept}
                onChange={handleChange}
                className="hidden"
                id="csv-upload"
                disabled={isProcessing}
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
                <Upload className={`h-10 w-10 mx-auto mb-3 ${isDragging ? "text-[#E17055]" : "text-gray-400"}`} />
                <p className="text-sm text-gray-600">
                    <span className="font-semibold text-[#E17055]">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-400 mt-1">CSV files only</p>
            </label>
            {isProcessing && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-[#E17055]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing file...
                </div>
            )}
        </div>
    );
}

// ─── Preview Table Component ──────────────────────────────────────────────────

interface PreviewTableProps {
    headers: string[];
    rows: PreviewRow[];
    maxDisplayRows?: number;
}

function PreviewTable({ headers, rows, maxDisplayRows = 10 }: PreviewTableProps) {
    const displayRows = rows.slice(0, maxDisplayRows);
    const hasMore = rows.length > maxDisplayRows;

    return (
        <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">#</th>
                            {headers.map((header) => (
                                <th key={header} className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    {header}
                                </th>
                            ))}
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {displayRows.map((row) => (
                            <tr key={row.row} className={row.isValid ? "" : "bg-red-50"}>
                                <td className="px-3 py-2 text-xs text-gray-400">{row.row}</td>
                                {headers.map((header) => (
                                    <td key={header} className="px-3 py-2 text-gray-900">
                                        {row.data[header] || "-"}
                                    </td>
                                ))}
                                <td className="px-3 py-2">
                                    {row.isValid ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <div className="flex items-center gap-1">
                                            <X className="h-4 w-4 text-red-500" />
                                            <span className="text-xs text-red-600">{row.errors.length} error(s)</span>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {hasMore && (
                <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-500 text-center">
                    Showing first {maxDisplayRows} of {rows.length} rows
                </div>
            )}
        </div>
    );
}

// ─── Main Import Page ──────────────────────────────────────────────────────────

export default function ImportPage() {
    // Common state
    const [activeTab, setActiveTab] = useState("guests");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [importResult, setImportResult] = useState<ImportResult | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    // Parse CSV file
    const parseCSV = useCallback((file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                const lines = text.split("\n").filter(line => line.trim());
                if (lines.length < 2) {
                    reject(new Error("CSV must have at least a header row and one data row"));
                    return;
                }
                const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
                const rows = lines.slice(1).map(line => {
                    const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
                    const row: Record<string, string> = {};
                    headers.forEach((header, i) => {
                        row[header] = values[i] || "";
                    });
                    return row;
                });
                resolve({ headers, rows });
            };
            reader.onerror = () => reject(new Error("Failed to read file"));
            reader.readAsText(file);
        });
    }, []);

    // Validate guests data
    const validateGuests = useCallback((rows: Record<string, string>[]): PreviewRow[] => {
        return rows.map((data, idx) => {
            const rowNum = idx + 2;
            const errors: ValidationError[] = [];

            if (!data.name?.trim()) errors.push({ row: rowNum, field: "name", message: "Name is required" });
            if (!data.phone?.trim()) errors.push({ row: rowNum, field: "phone", message: "Phone is required" });
            else if (!/^\d{10}$/.test(data.phone.trim())) errors.push({ row: rowNum, field: "phone", message: "Phone must be 10 digits" });
            if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
                errors.push({ row: rowNum, field: "email", message: "Invalid email format" });
            }

            return { row: rowNum, data, isValid: errors.length === 0, errors };
        });
    }, []);

    // Validate rooms data
    const validateRooms = useCallback((rows: Record<string, string>[]): PreviewRow[] => {
        return rows.map((data, idx) => {
            const rowNum = idx + 2;
            const errors: ValidationError[] = [];

            if (!data.roomNumber?.trim()) errors.push({ row: rowNum, field: "roomNumber", message: "Room number is required" });
            if (!data.type?.trim()) errors.push({ row: rowNum, field: "type", message: "Type is required" });
            else if (!["STUDIO", "PREMIUM"].includes(data.type.toUpperCase())) {
                errors.push({ row: rowNum, field: "type", message: "Type must be STUDIO or PREMIUM" });
            }
            if (!data.floor?.trim()) errors.push({ row: rowNum, field: "floor", message: "Floor is required" });
            else if (isNaN(parseInt(data.floor))) errors.push({ row: rowNum, field: "floor", message: "Floor must be a number" });
            if (data.basePriceSingle && isNaN(parseFloat(data.basePriceSingle))) {
                errors.push({ row: rowNum, field: "basePriceSingle", message: "Base price must be a number" });
            }
            if (data.basePriceDouble && isNaN(parseFloat(data.basePriceDouble))) {
                errors.push({ row: rowNum, field: "basePriceDouble", message: "Base price must be a number" });
            }

            return { row: rowNum, data, isValid: errors.length === 0, errors };
        });
    }, []);

    // Validate rates data
    const validateRates = useCallback((rows: Record<string, string>[]): PreviewRow[] => {
        return rows.map((data, idx) => {
            const rowNum = idx + 2;
            const errors: ValidationError[] = [];

            if (!data.roomType?.trim()) errors.push({ row: rowNum, field: "roomType", message: "Room type is required" });
            if (!data.seasonName?.trim()) errors.push({ row: rowNum, field: "seasonName", message: "Season name is required" });
            if (!data.startDate?.trim()) errors.push({ row: rowNum, field: "startDate", message: "Start date is required" });
            if (!data.endDate?.trim()) errors.push({ row: rowNum, field: "endDate", message: "End date is required" });
            if (!data.priceMultiplier?.trim()) errors.push({ row: rowNum, field: "priceMultiplier", message: "Price multiplier is required" });
            else if (isNaN(parseFloat(data.priceMultiplier))) {
                errors.push({ row: rowNum, field: "priceMultiplier", message: "Price multiplier must be a number" });
            }

            return { row: rowNum, data, isValid: errors.length === 0, errors };
        });
    }, []);

    // Handle file selection
    const handleFileSelect = useCallback(async (file: File) => {
        setSelectedFile(file);
        setIsProcessing(true);
        setImportResult(null);

        try {
            const { headers: parsedHeaders, rows } = await parseCSV(file);
            setHeaders(parsedHeaders);

            let validated: PreviewRow[];
            switch (activeTab) {
                case "guests":
                    validated = validateGuests(rows);
                    break;
                case "rooms":
                    validated = validateRooms(rows);
                    break;
                case "rates":
                    validated = validateRates(rows);
                    break;
                default:
                    validated = [];
            }

            setPreviewData(validated);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Failed to parse CSV");
            setSelectedFile(null);
        } finally {
            setIsProcessing(false);
        }
    }, [activeTab, parseCSV, validateGuests, validateRooms, validateRates]);

    // Handle import
    const handleImport = useCallback(async () => {
        if (!selectedFile) return;

        setIsImporting(true);
        try {
            const formData = new FormData();
            formData.append("file", selectedFile);

            const endpoint = `/api/import/${activeTab}`;
            const res = await fetch(endpoint, { method: "POST", body: formData });
            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.error || "Import failed");
            }

            setImportResult(result);
            setPreviewData([]);
            setSelectedFile(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : "Import failed");
        } finally {
            setIsImporting(false);
        }
    }, [activeTab, selectedFile]);

    // Reset state when tab changes
    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        setSelectedFile(null);
        setPreviewData([]);
        setHeaders([]);
        setImportResult(null);
    };

    const validRows = previewData.filter(r => r.isValid);
    const invalidRows = previewData.filter(r => !r.isValid);
    const allErrors = previewData.flatMap(r => r.errors);

    const getTemplateColumns = () => {
        switch (activeTab) {
            case "guests": return GUEST_TEMPLATE_COLUMNS;
            case "rooms": return ROOM_TEMPLATE_COLUMNS;
            case "rates": return RATE_TEMPLATE_COLUMNS;
            default: return [];
        }
    };

    const getSampleRows = () => {
        switch (activeTab) {
            case "guests":
                return [
                    ["John Doe", "9876543210", "john@example.com", "123 Main St", "Mumbai", "Maharashtra", "400001", "1990-01-15", "AADHAR", "123456789012"],
                    ["Jane Smith", "9876543211", "jane@example.com", "456 Oak Ave", "Delhi", "Delhi", "110001", "1985-06-20", "PASSPORT", "AB1234567"],
                ];
            case "rooms":
                return [
                    ["101", "STUDIO", "1", "Standard studio room", "2", "999", "1799"],
                    ["102", "PREMIUM", "1", "Premium room with city view", "2", "1499", "2499"],
                ];
            case "rates":
                return [
                    ["STUDIO", "Summer Season", "2024-06-01", "2024-08-31", "1.2", "1199"],
                    ["PREMIUM", "Summer Season", "2024-06-01", "2024-08-31", "1.2", "1799"],
                ];
            default:
                return [];
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Bulk Import"
                description="Import guests, rooms, and rates from CSV files"
            />

            <Tabs value={activeTab} onValueChange={handleTabChange}>
                <TabsList className="grid w-full grid-cols-3 max-w-md">
                    <TabsTrigger value="guests" className="gap-2">
                        <Users className="h-4 w-4" /> Guests
                    </TabsTrigger>
                    <TabsTrigger value="rooms" className="gap-2">
                        <BedDouble className="h-4 w-4" /> Rooms
                    </TabsTrigger>
                    <TabsTrigger value="rates" className="gap-2">
                        <Percent className="h-4 w-4" /> Rates
                    </TabsTrigger>
                </TabsList>

                {/* Guests Tab */}
                <TabsContent value="guests" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4 text-[#E17055]" />
                                Import Guests
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-gray-500">
                                Upload a CSV file with guest data. Required fields: name, phone.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => downloadTemplate(GUEST_TEMPLATE_COLUMNS, "guests_template.csv", getSampleRows())}
                                className="gap-2"
                            >
                                <Download className="h-4 w-4" /> Download Template
                            </Button>
                            <FileUpload accept=".csv" onFileSelect={handleFileSelect} isProcessing={isProcessing} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Rooms Tab */}
                <TabsContent value="rooms" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4 text-[#E17055]" />
                                Import Rooms
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-gray-500">
                                Upload a CSV file with room data. Required fields: roomNumber, type, floor.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => downloadTemplate(ROOM_TEMPLATE_COLUMNS, "rooms_template.csv", getSampleRows())}
                                className="gap-2"
                            >
                                <Download className="h-4 w-4" /> Download Template
                            </Button>
                            <FileUpload accept=".csv" onFileSelect={handleFileSelect} isProcessing={isProcessing} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Rates Tab */}
                <TabsContent value="rates" className="mt-6 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <FileSpreadsheet className="h-4 w-4 text-[#E17055]" />
                                Import Seasonal Rates
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-sm text-gray-500">
                                Upload a CSV file with seasonal rate data. Required fields: roomType, seasonName, startDate, endDate, priceMultiplier.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => downloadTemplate(RATE_TEMPLATE_COLUMNS, "rates_template.csv", getSampleRows())}
                                className="gap-2"
                            >
                                <Download className="h-4 w-4" /> Download Template
                            </Button>
                            <FileUpload accept=".csv" onFileSelect={handleFileSelect} isProcessing={isProcessing} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Preview Section */}
            {previewData.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                            <span className="flex items-center gap-2">
                                <Eye className="h-4 w-4 text-[#E17055]" />
                                Data Preview
                            </span>
                            <div className="flex items-center gap-3 text-sm font-normal">
                                <Badge variant="default" className="bg-green-500">{validRows.length} valid</Badge>
                                <Badge variant="destructive">{invalidRows.length} invalid</Badge>
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <PreviewTable headers={headers} rows={previewData} />

                        {/* Validation Summary */}
                        {invalidRows.length > 0 && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-medium text-red-800">Validation Errors</p>
                                        <ul className="mt-2 text-sm text-red-700 space-y-1 max-h-40 overflow-y-auto">
                                            {allErrors.slice(0, 10).map((err, idx) => (
                                                <li key={idx}>Row {err.row}: {err.field} - {err.message}</li>
                                            ))}
                                            {allErrors.length > 10 && (
                                                <li className="font-medium">...and {allErrors.length - 10} more errors</li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center justify-between pt-4 border-t">
                            <p className="text-sm text-gray-500">
                                {validRows.length} rows ready to import
                            </p>
                            <div className="flex gap-3">
                                <Button variant="outline" onClick={() => { setPreviewData([]); setSelectedFile(null); }}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    disabled={validRows.length === 0 || isImporting}
                                    className="gap-2"
                                >
                                    {isImporting ? (
                                        <><Loader2 className="h-4 w-4 animate-spin" /> Importing...</>
                                    ) : (
                                        <><Upload className="h-4 w-4" /> Import {validRows.length} Rows</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Import Result */}
            {importResult && (
                <Card className={importResult.success ? "border-green-500" : "border-red-500"}>
                    <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                            {importResult.success ? (
                                <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
                            ) : (
                                <AlertCircle className="h-8 w-8 text-red-500 shrink-0" />
                            )}
                            <div className="flex-1">
                                <h3 className={`font-semibold ${importResult.success ? "text-green-800" : "text-red-800"}`}>
                                    {importResult.success ? "Import Successful" : "Import Failed"}
                                </h3>
                                <div className="mt-2 text-sm space-y-1">
                                    <p className={importResult.success ? "text-green-700" : "text-red-700"}>
                                        <strong>{importResult.imported}</strong> records imported successfully
                                    </p>
                                    {importResult.duplicates > 0 && (
                                        <p className="text-amber-700">{importResult.duplicates} duplicates found and skipped</p>
                                    )}
                                    {importResult.skipped > 0 && (
                                        <p className="text-gray-600">{importResult.skipped} records skipped</p>
                                    )}
                                    {importResult.errors.length > 0 && (
                                        <p className="text-red-700">{importResult.errors.length} errors occurred</p>
                                    )}
                                </div>
                                <Button
                                    variant="outline"
                                    className="mt-4"
                                    onClick={() => setImportResult(null)}
                                >
                                    Import More
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
