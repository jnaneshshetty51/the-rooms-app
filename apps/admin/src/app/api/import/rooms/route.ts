// apps/admin/src/app/api/import/rooms/route.ts
// CSV import for rooms

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

function validateRoom(data: Record<string, string>, rowNum: number): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data.roomNumber?.trim()) {
        errors.push({ row: rowNum, field: "roomNumber", message: "Room number is required" });
    }
    if (!data.type?.trim()) {
        errors.push({ row: rowNum, field: "type", message: "Type is required" });
    } else if (!["STUDIO", "PREMIUM"].includes(data.type.toUpperCase())) {
        errors.push({ row: rowNum, field: "type", message: "Type must be STUDIO or PREMIUM" });
    }
    if (!data.floor?.trim()) {
        errors.push({ row: rowNum, field: "floor", message: "Floor is required" });
    } else if (isNaN(parseInt(data.floor))) {
        errors.push({ row: rowNum, field: "floor", message: "Floor must be a number" });
    }
    if (data.basePriceSingle && isNaN(parseFloat(data.basePriceSingle))) {
        errors.push({ row: rowNum, field: "basePriceSingle", message: "Base price must be a number" });
    }
    if (data.basePriceDouble && isNaN(parseFloat(data.basePriceDouble))) {
        errors.push({ row: rowNum, field: "basePriceDouble", message: "Base price must be a number" });
    }
    if (data.maxOccupancy && isNaN(parseInt(data.maxOccupancy))) {
        errors.push({ row: rowNum, field: "maxOccupancy", message: "Max occupancy must be a number" });
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
        const requiredColumns = ["roomNumber", "type", "floor"];
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
            const errors = validateRoom(data, rowNum);
            if (errors.length > 0) {
                result.errors.push(...errors);
                result.skipped++;
                continue;
            }

            // Check for duplicate room number
            const existingRoom = await db.room.findFirst({
                where: { roomNumber: data.roomNumber.trim() },
            });

            if (existingRoom) {
                result.duplicates++;
                result.skipped++;
                continue;
            }

            // Create room
            try {
                await db.room.create({
                    data: {
                        roomNumber: data.roomNumber.trim(),
                        type: data.type.toUpperCase().trim() as "STUDIO" | "PREMIUM",
                        floor: parseInt(data.floor),
                        description: data.description?.trim() || null,
                        maxOccupancy: data.maxOccupancy ? parseInt(data.maxOccupancy) : 2,
                        basePriceSingle: data.basePriceSingle ? parseFloat(data.basePriceSingle) : 999,
                        basePriceDouble: data.basePriceDouble ? parseFloat(data.basePriceDouble) : 1799,
                        status: "VACANT",
                    },
                });
                result.imported++;
            } catch (err) {
                console.error(`Error creating room at row ${rowNum}:`, err);
                result.errors.push({
                    row: rowNum,
                    field: "general",
                    message: "Failed to create room record",
                });
                result.skipped++;
            }
        }

        result.success = result.errors.length === 0;

        return NextResponse.json(result);
    } catch (err) {
        console.error("Room import error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Import failed" },
            { status: 500 }
        );
    }
}
