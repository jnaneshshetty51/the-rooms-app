// apps/admin/src/app/api/import/guests/route.ts
// CSV import for guests

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

function validateGuest(data: Record<string, string>, rowNum: number): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data.name?.trim()) {
        errors.push({ row: rowNum, field: "name", message: "Name is required" });
    }
    if (!data.phone?.trim()) {
        errors.push({ row: rowNum, field: "phone", message: "Phone is required" });
    } else if (!/^\d{10}$/.test(data.phone.trim())) {
        errors.push({ row: rowNum, field: "phone", message: "Phone must be 10 digits" });
    }
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push({ row: rowNum, field: "email", message: "Invalid email format" });
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
        const requiredColumns = ["name", "phone"];
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
            const rowNum = i + 2; // +2 because row 1 is header and row numbers are 1-indexed

            // Validate
            const errors = validateGuest(data, rowNum);
            if (errors.length > 0) {
                result.errors.push(...errors);
                result.skipped++;
                continue;
            }

            // Check for duplicate phone
            const existingGuest = await db.guest.findFirst({
                where: { phone: data.phone.trim() },
            });

            if (existingGuest) {
                result.duplicates++;
                result.skipped++;
                continue;
            }

            // Create guest - use dynamic field access to avoid TS errors
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const createData: any = {
                    name: data.name.trim(),
                    phone: data.phone.trim(),
                };

                if (data.email?.trim()) createData.email = data.email.trim();
                if (data.address?.trim()) createData.address = data.address.trim();
                if (data.city?.trim()) createData.city = data.city.trim();
                if (data.state?.trim()) createData.state = data.state.trim();
                if (data.pincode?.trim()) createData.pincode = data.pincode.trim();
                if (data.dateOfBirth?.trim()) createData.dateOfBirth = new Date(data.dateOfBirth);
                if (data.idType?.trim()) createData.idType = data.idType.trim();
                if (data.idNumber?.trim()) createData.idNumber = data.idNumber.trim();

                await db.guest.create({ data: createData });
                result.imported++;
            } catch (err) {
                console.error(`Error creating guest at row ${rowNum}:`, err);
                result.errors.push({
                    row: rowNum,
                    field: "general",
                    message: "Failed to create guest record",
                });
                result.skipped++;
            }
        }

        result.success = result.errors.length === 0;

        return NextResponse.json(result);
    } catch (err) {
        console.error("Guest import error:", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Import failed" },
            { status: 500 }
        );
    }
}
