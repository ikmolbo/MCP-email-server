import { VALIDATED_TIME_ZONE } from '../index.js';

/**
 * Get the current timezone configuration and time information
 * @returns Object with timezone configuration and current time information
 */
export async function getCurrentTimeZone() {
  try {
    const now = new Date();
    
    // Format current time in configured timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: VALIDATED_TIME_ZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZoneName: 'long'
    });
    
    // Get UTC time for comparison
    const utcFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZoneName: 'long'
    });
    
    // Calculate the offset (difference between local and UTC)
    const offsetMinutes = now.getTimezoneOffset();
    const offsetHours = Math.abs(Math.floor(offsetMinutes / 60));
    const offsetMins = Math.abs(offsetMinutes % 60);
    const offsetSign = offsetMinutes <= 0 ? '+' : '-';
    const offsetString = `${offsetSign}${offsetHours.toString().padStart(2, '0')}:${offsetMins.toString().padStart(2, '0')}`;
    
    return {
      success: true,
      data: {
        configuredTimeZone: VALIDATED_TIME_ZONE,
        currentTimeInConfiguredZone: formatter.format(now),
        currentTimeUTC: utcFormatter.format(now),
        systemTimeZoneOffset: offsetString,
        formattedTimestamp: formatter.format(now).replace(',', '').replace(/\//g, '-'),
      }
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to get timezone information: ${error}`
    };
  }
} 