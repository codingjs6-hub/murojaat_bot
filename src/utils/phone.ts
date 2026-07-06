export function extractPhone(text: string): string | null {
  const phoneRegex =
    /(\+?998[\s-]?)?(\(?\d{2}\)?[\s-]?)?\d{3}[\s-]?\d{2}[\s-]?\d{2}/g;

  const match = text.match(phoneRegex);
  if (!match) return null;

  return match[0].replace(/\s|-/g, "");
}
