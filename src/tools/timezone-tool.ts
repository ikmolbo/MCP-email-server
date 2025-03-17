import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { 
  timeZoneOffset, 
  getCurrentDateInTimeZone,
  formatTimestampWithOffset
} from "../timezone-utils.js";

/**
 * Tool simplu pentru a verifica configurația de fus orar a sistemului
 * Returnează informații despre:
 * - Fusul orar configurat (din variabila TIME_ZONE)
 * - Offsetul calculat în ore
 * - Data și ora curentă ajustată la fusul orar
 * - Data și ora în UTC pentru comparație
 */
export const getTimezoneInfoTool: Tool = {
  name: "get_timezone_info",
  description: "Afișează informații despre fusul orar configurat în sistem",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  },
  handler: async () => {
    // Obține data curentă
    const now = new Date();
    const utcTime = now.toISOString();
    const localTime = getCurrentDateInTimeZone().toISOString();
    
    // Formatează data curentă folosind funcția noastră
    const formattedTime = formatTimestampWithOffset(utcTime);
    
    // Obține configurația fus orar
    const timeZoneString = process.env.TIME_ZONE || 'GMT+0';
    
    return {
      timeZoneConfig: timeZoneString,
      offsetHours: timeZoneOffset,
      currentTimeLocal: formattedTime,
      currentTimeUTC: utcTime,
      message: `Fusul orar configurat este ${timeZoneString} (offset: ${timeZoneOffset} ore). 
                Ora curentă în acest fus orar este: ${formattedTime}. 
                Ora curentă în UTC este: ${utcTime}.`
    };
  }
}; 