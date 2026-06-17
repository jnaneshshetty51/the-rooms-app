"use client";

import { useState } from "react";
import { PageHeader, Button, Card, CardContent, CardHeader, CardTitle, Input } from "@the-rooms/ui";
import { Download, FileSpreadsheet, FileCode2 } from "lucide-react";

export default function TallyExportPage() {
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [loading, setLoading] = useState(false);

    const handleExport = async (format: "xml" | "excel") => {
        if (!fromDate || !toDate) {
            alert("Please select both from and to dates");
            return;
        }

        try {
            setLoading(true);
            const res = await fetch(`/api/tally-export?from=${fromDate}&to=${toDate}&format=${format}`);
            
            if (!res.ok) {
                throw new Error("Export failed");
            }

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `tally-export-${fromDate}-to-${toDate}.${format === "xml" ? "xml" : "xlsx"}`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Error exporting data:", error);
            alert("Failed to export data. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Tally Export"
                description="Export accounting data for Tally ERP integration"
            />

            <Card className="max-w-2xl">
                <CardHeader>
                    <CardTitle>Export Range</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">From Date</label>
                            <Input
                                type="date"
                                value={fromDate}
                                onChange={(e) => setFromDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">To Date</label>
                            <Input
                                type="date"
                                value={toDate}
                                onChange={(e) => setToDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <Button 
                            className="flex-1" 
                            onClick={() => handleExport("xml")}
                            disabled={loading || !fromDate || !toDate}
                        >
                            <FileCode2 className="mr-2 h-4 w-4" />
                            Export as XML
                        </Button>
                        <Button 
                            variant="outline"
                            className="flex-1" 
                            onClick={() => handleExport("excel")}
                            disabled={loading || !fromDate || !toDate}
                        >
                            <FileSpreadsheet className="mr-2 h-4 w-4" />
                            Export as Excel
                        </Button>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mt-4">
                        Note: XML format is ready for direct import into Tally using the Import Data feature. 
                        Excel format is provided for manual review or custom processing.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
