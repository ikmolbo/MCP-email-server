import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { 
  timeZoneOffset, 
  getCurrentDateInTimeZone,
  formatTimestampWithOffset
} from "../timezone-utils.js";

/**
 * Simple tool to check the timezone configuration of the system
 * Returns information about:
 * - The configured timezone (from the TIME_ZONE variable)
 * - The calculated offset in hours
 * - The current date and time adjusted to the timezone
 * - The current date and time in UTC for comparison
 */
export const getTimezoneInfoTool: Tool = {
  name: "get_timezone_info",
  description: "Display information about the configured timezone in the system",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  },
  handler: async () => {
    // Get the current date
    const now = new Date();
    const utcTime = now.toISOString();
    const localTime = getCurrentDateInTimeZone().toISOString();
    
    // Format the current date using our function
    const formattedTime = formatTimestampWithOffset(utcTime);
    
    // Get the timezone configuration
    const timeZoneString = process.env.TIME_ZONE || 'GMT+0';
    
    return {
      timeZoneConfig: timeZoneString,
      offsetHours: timeZoneOffset,
      currentTimeLocal: formattedTime,
      currentTimeUTC: utcTime,
      message: `The configured timezone is ${timeZoneString} (offset: ${timeZoneOffset} hours). 
                The current time in this timezone is: ${formattedTime}. 
                The current time in UTC is: ${utcTime}.`
    };
  }
}; 