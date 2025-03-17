// timezone-utils.ts
import dotenv from 'dotenv';

// Make sure environment variables are loaded
dotenv.config();

// Parse TIME_ZONE environment variable (default to GMT+0 if not specified)
const timeZoneString = process.env.TIME_ZONE || 'GMT+0';

/**
 * Parse a timezone string in GMT+/- format
 * @param timeZoneString Timezone string in format like "GMT+2" or "GMT-5"
 * @returns Numeric offset in hours (positive or negative)
 */
export function parseTimeZone(timeZoneString: string): number {
  const match = timeZoneString.match(/GMT([+-])(\d+(?:\.\d+)?)/i);
  if (!match) return 0;
  
  const sign = match[1] === '+' ? 1 : -1;
  const hours = parseFloat(match[2]);
  
  return sign * hours;
}

// Parse the timezone offset
export const timeZoneOffset = parseTimeZone(timeZoneString);

/**
 * Adjust a date to specified timezone
 * @param date The date to adjust
 * @param offsetHours Timezone offset in hours (default: configured timezone)
 * @returns Date adjusted to the specified timezone
 */
export function adjustDateToTimeZone(date: Date, offsetHours: number = timeZoneOffset): Date {
  const newDate = new Date(date);
  
  // Using UTC methods to avoid browser/system timezone interference
  const currentHours = newDate.getUTCHours();
  newDate.setUTCHours(currentHours + offsetHours);
  
  return newDate;
}

/**
 * Get current date adjusted to the configured timezone
 * @param offsetHours Timezone offset in hours (default: configured timezone)
 * @returns Current date adjusted to the specified timezone
 */
export function getCurrentDateInTimeZone(offsetHours: number = timeZoneOffset): Date {
  return adjustDateToTimeZone(new Date(), offsetHours);
}

/**
 * Format date to YYYY/MM/DD format
 * @param date Date to format
 * @returns Formatted date string in YYYY/MM/DD format
 */
export function formatDateToYYYYMMDD(date: Date): string {
  return `${date.getUTCFullYear()}/${(date.getUTCMonth() + 1).toString().padStart(2, '0')}/${date.getUTCDate().toString().padStart(2, '0')}`;
}

/**
 * Format a timestamp with the timezone offset
 * @param timestamp Timestamp string to format
 * @param offsetHours Timezone offset in hours (default: configured timezone)
 * @returns Formatted timestamp string
 */
export function formatTimestampWithOffset(timestamp: string, offsetHours: number = timeZoneOffset): string {
  try {
    const date = new Date(timestamp);
    const adjustedDate = adjustDateToTimeZone(date, offsetHours);
    return adjustedDate.toISOString().replace('T', ' ').substring(0, 19);
  } catch (e) {
    // If parsing fails, return the raw timestamp
    return timestamp;
  }
} 