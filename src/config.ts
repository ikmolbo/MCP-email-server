/**
 * Configuration handler for the Email MCP Server
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Configuration type
export interface Config {
  timeZone: string;
  // Other configuration options can be added here in the future
}

// Default configuration
const defaultConfig: Config = {
  timeZone: 'UTC'
};

// Try to load configuration from file
let config = { ...defaultConfig };
const CONFIG_DIR = path.join(os.homedir(), '.email-mcp');
const CONFIG_FILE = process.env.CONFIG_FILE || path.join(CONFIG_DIR, 'config.json');

try {
  if (fs.existsSync(CONFIG_FILE)) {
    const fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    config = { ...config, ...fileConfig };
  }
} catch (error) {
  console.error(`Error loading config file: ${error}`);
}

// Override with environment variables if they exist
if (process.env.TIME_ZONE) {
  config.timeZone = process.env.TIME_ZONE;
}

// Validate time zone format
function isValidTimeZone(tz: string): boolean {
  try {
    // A simple test to see if the timezone is supported
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch (e) {
    // Some environments support GMT+X or numeric offset formats
    if (/^GMT[+-]\d{1,2}$/.test(tz) || /^[+-]\d{2}:?\d{2}$/.test(tz)) {
      return true;
    }
    return false;
  }
}

// Validate the time zone
if (!isValidTimeZone(config.timeZone)) {
  console.warn(`Invalid timezone: ${config.timeZone}, falling back to UTC`);
  config.timeZone = 'UTC';
}

export default config; 