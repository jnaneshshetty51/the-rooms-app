// packages/channel-manager/src/utils/xml-parser.ts
// XML parsing utilities for OTA APIs

import { parseStringPromise } from 'xml2js';

/**
 * Parse XML string to JavaScript object
 */
export async function parseXml<T>(xml: string): Promise<T> {
    const result = await parseStringPromise(xml, {
        explicitArray: false,
        ignoreAttrs: true,
        trim: true,
    });
    return result as T;
}

/**
 * Build XML string from JavaScript object
 */
export function buildXml(obj: object, rootElement?: string): string {
    if (rootElement) {
        return `<${rootElement}>${objectToXml(obj)}</${rootElement}>`;
    }
    return objectToXml(obj);
}

function objectToXml(obj: unknown, indent: number = 0): string {
    const spaces = '  '.repeat(indent);

    if (obj === null || obj === undefined) {
        return '';
    }

    if (typeof obj === 'string' || typeof obj === 'number' || typeof obj === 'boolean') {
        return String(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => `${spaces}${objectToXml(item, indent)}`).join('\n');
    }

    if (typeof obj === 'object') {
        const entries = Object.entries(obj);
        return entries
            .map(([key, value]) => {
                if (value === null || value === undefined) {
                    return '';
                }
                if (typeof value === 'object' && !Array.isArray(value)) {
                    return `${spaces}<${key}>${objectToXml(value, indent + 1)}</${key}>`;
                }
                return `${spaces}<${key}>${objectToXml(value, indent + 1)}</${key}>`;
            })
            .filter(Boolean)
            .join('\n');
    }

    return String(obj);
}

/**
 * Extract text content from XML element
 */
export function extractText(element: unknown): string {
    if (typeof element === 'string') return element;
    if (element && typeof element === 'object' && '_' in element) {
        return String(element._);
    }
    return '';
}

/**
 * Extract array from XML element (handles single item vs array)
 */
export function extractArray<T>(element: unknown): T[] {
    if (!element) return [];
    if (Array.isArray(element)) return element as T[];
    return [element as T];
}
