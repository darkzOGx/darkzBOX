/**
 * Process text containing Spintax format {A|B|C}
 * Example: "{Hi|Hello|Hey} there" -> "Hello there"
 */
export function replaceSpintax(text: string): string {
  // Only match braces containing a pipe |
  const spintaxRegex = /\{([^{}]*\|[^{}]*)\}/g;

  return text.replace(spintaxRegex, (match, content) => {
    const choices = content.split('|');
    const randomIndex = Math.floor(Math.random() * choices.length);
    return choices[randomIndex];
  });
}

/**
 * Replace variables in text like {{firstName}} or {firstName}
 */
export function replaceVariables(text: string, variables: Record<string, any>): string {
  // DEBUGGING: Log to file to trace production inputs
  try {
    const fs = require('fs');
    const log = `[${new Date().toISOString()}] Input: "${text}"\nVariables: ${JSON.stringify(variables)}\n`;
    fs.appendFileSync('debug-spintax.log', log);
  } catch (e) { }

  let result = text;
  for (const [key, value] of Object.entries(variables)) {
    // Match {{key}} or {key}
    // We escape special regex chars in key just in case
    const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`{{${safeKey}}}|{${safeKey}}`, 'g');

    // Check match before replacing to log if misses
    if (regex.test(result)) {
      try { require('fs').appendFileSync('debug-spintax.log', `  -> Matched key "${key}" with value "${value}"\n`); } catch (e) { }
    }

    result = result.replace(regex, String(value || ''));
  }

  try { require('fs').appendFileSync('debug-spintax.log', `  -> Output: "${result}"\n---\n`); } catch (e) { }

  return result;
}
