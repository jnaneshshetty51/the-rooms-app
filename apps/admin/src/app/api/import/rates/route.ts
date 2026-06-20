// apps/admin/src/app/api/import/rates/route.ts
// CSV import for room rates

import { NextRequest, NextResponse } from "next/server";
import { db } from "@the-rooms/db";

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

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
    const lines = text.split("\n").filter(line => line.trim());
    if (lines.length < 2) {
        throw new Error("CSV must have at least a header row and one data row");
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

    return { headers, rows };
}

function validateRate(data: Record<string, string>, rowNum: number): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data.roomType?.trim()) {
        errors.push({ row: rowNum, field: "roomType", message: "Room type is required" });
    }
    if (!data.seasonName?.trim()) {
        errors.push({ row: rowNum, field: "seasonName", message: "Season name is required" });
    }
    if (!data.startDate?.trim()) {
        errors.push({ row: rowNum, field: "startDate", message: "Start date is required" });
    } else {
        const startDate = new Date(data.startDate);
        if (isNaN(startDate.getTime())) {
            errors.push({ row: rowNum, field: "startDate", message: "Invalid date format" });
        }
    }
    if (!data.endDate?.trim()) {
        errors.push({ row: rowNum, field: "endDate", message: "End date is required" });
    } else {
        const endDate = new Date(data.endDate);
        if (isNaN(endDate.getTime())) {
            errors.push({ row: rowNum, field: "endDate", message: "Invalid date format" });
        }
    }
    if (!data.priceMultiplier?.trim()) {
        errors.push({ row: rowNum, field: "priceMultiplier", message: "Price multiplier is required" });
    } else if (isNaN(parseFloat(data.priceMultiplier))) {
        errors.push({ row: rowNum, field: "priceMultiplier", message: "Price multiplier must be a number" });
    }
    if (data.basePrice && isNaN(parseFloat(data.basePrice))) {
        errors.push({ row: rowNum, field: "basePrice", message: "Base price must be a number" });
    }

    return errors;
}

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const text = await file.text();
        const { headers, rows } = parseCSV(text);

        // Validate required columns
        const requiredColumns = ["roomType", "seasonName", "startDate", "endDate", "priceMultiplier"];
        const missingColumns = requiredColumns.filter(col => !headers.includes(col));
        if (missingColumns.length > 0) {
            return NextResponse.json(
                { error: `Missing required columns: ${missingColumns.join(", ")}` },
                { status: 400 }
            );
        }

        const result: ImportResult = {
            success: true,
            imported: 0,
            errors: [],
            duplicates: 0,
            skipped: 0,
        };

        for (let i = 0; i < rows.length; i++) {
            const data = rows[i];
            const rowNum = i + 2;

            // Validate
            const errors = validateRate(data, rowNum);
            if (errors.length > 0) {
                result.errors.push(...errors);
                result.skipped++;
                continue;
            }

            // Find room type by name
            const roomType = await db.roomType.findFirst({
                where: { name: { equals: data.roomType.trim(), mode: "insensitive" } },
            });

            if (!roomType) {
                result.errors.push({
                    row: rowNum,
                    field: "roomType",
                    message: `Room type '${data.roomType}' not found`,
                });
                result.skipped++;
                continue;
            }

            // Check for duplicate seasonal rate (same room type + overlapping dates)
            const startDate = new Date(data.startDate);
            const endDate = new Date(data.endDate);

            const existingRate = await db.seasonalRate.findFirst({
                where: {
                    roomTypeId: roomType.id,
                    AND: [
                        { startDate: { lte: endDate } },
                        { endDate: { gte: startDate } },
                    ],
                },
            });

            if (existingRate) {
                result.duplicates++;
                result.skipped++;
                continue;
            }

            // Create seasonal rate
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const createData: any = {
                    roomTypeId: roomType.id,
                    name: data.seasonName.trim(),
                    startDate,
                    endDate,
                    priceMultiplier: parseFloat(data.priceMultiplier),
                    isActive: true,
                };

                await db.seasonalRate.create({ data: createData });
                result.imported++;
            } catch (err) {
                console.error(`Error creating rate at row ${rowNum}:`, err);
                result.errors.push({
                    row: rowNum,
                    field: "general",
                    message: "Failed to create rate record",
                });
                result.skipped++;
            }
        }

        result.success = result.errors.length === 0;

        return NextResponse.json(result);
    } catch (err) {
        console.error("Rate import error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Import failed" },
            { status: 500 }
        );
    }
}
