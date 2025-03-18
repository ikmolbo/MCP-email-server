// timezone-utils.ts
import dotenv from 'dotenv';

// Make sure environment variables are loaded
dotenv.config();

// Parse TIME_ZONE environment variable (default to GMT+0 if not specified)
const timeZoneString = process.env.TIME_ZONE || 'GMT+0';
console.error(`Timezone configuration loaded: ${timeZoneString}`);

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
console.error(`Timezone offset: ${timeZoneOffset} hours`);

/**
 * Adjust a date to specified timezone
 * @param date The date to adjust
 * @param offsetHours Timezone offset in hours (default: configured timezone)
 * @returns Date adjusted to the specified timezone
 */
export function adjustDateToTimeZone(date: Date, offsetHours: number = timeZoneOffset): Date {
  const newDate = new Date(date);
  
  // Calculate UTC milliseconds
  const utcMs = newDate.getTime();
  
  // Apply timezone offset in milliseconds (hours * 60 min * 60 sec * 1000 ms)
  const offsetMs = offsetHours * 60 * 60 * 1000;
  
  // Create new date with timezone offset
  const adjustedDate = new Date(utcMs + offsetMs);
  
  return adjustedDate;
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
    
    // Format the date string with local timezone information
    const formattedDate = adjustedDate.toISOString().replace('T', ' ').substring(0, 19);
    const tzSign = offsetHours >= 0 ? '+' : '-';
    const tzAbsHours = Math.abs(offsetHours);
    const tzHours = Math.floor(tzAbsHours);
    const tzMinutes = Math.round((tzAbsHours - tzHours) * 60);
    
    return `${formattedDate} GMT${tzSign}${tzHours.toString().padStart(2, '0')}:${tzMinutes.toString().padStart(2, '0')}`;
  } catch (e) {
    console.error('Error formatting timestamp:', timestamp, e);
    // If parsing fails, return the raw timestamp
    return timestamp;
  }
}

/**
 * Converts a string of the form "YYYY/MM/DD" into a Unix timestamp (in seconds)
 * interpreting the date as 00:00 local time.
 * Example: "2025/03/19" -> local midnight -> compute .getTime()/1000
 */
export function transformDateStringToLocalUnix(dateStr: string): number {
  // Parse e.g. "2025/03/19"
  const [year, month, day] = dateStr.split("/").map(x => parseInt(x, 10));
  const d = getCurrentDateInTimeZone(); // local 'now'
  d.setFullYear(year, month - 1, day);
  d.setHours(0, 0, 0, 0);
  // Convert to Unix seconds
  return Math.floor(d.getTime() / 1000);
}

/**
 * Returns [startUnix, endUnix] for the local day (midnight -> +24h).
 * dayOffset=0 => today, -1 => yesterday, etc.
 */
export function getLocalMidnightUnixRange(dayOffset: number = 0): [number, number] {
  const nowLocal = getCurrentDateInTimeZone();
  nowLocal.setDate(nowLocal.getDate() + dayOffset);
  nowLocal.setHours(0, 0, 0, 0);

  const startMs = nowLocal.getTime();
  const startUnix = Math.floor(startMs / 1000);
  const endUnix = startUnix + 24 * 3600;
  return [startUnix, endUnix];
} 