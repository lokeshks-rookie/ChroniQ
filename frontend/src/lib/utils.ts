export function cn(...inputs: (string | undefined | null | false | Record<string, boolean> | (string | undefined | null | false)[])[]): string {
  const classes: string[] = [];

  for (const input of inputs) {
    if (!input) continue;

    if (typeof input === 'string') {
      classes.push(input);
    } else if (Array.isArray(input)) {
      for (const item of input) {
        if (typeof item === 'string' && item) {
          classes.push(item);
        }
      }
    } else if (typeof input === 'object') {
      for (const [key, val] of Object.entries(input)) {
        if (val) {
          classes.push(key);
        }
      }
    }
  }

  return classes.join(' ').trim();
}
