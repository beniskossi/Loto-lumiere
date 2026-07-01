// Sanitization des inputs utilisateur
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .replace(/[<>"'&]/g, '') // Supprimer caractères dangereux
    .replace(/javascript:/gi, '') // Supprimer javascript:
    .replace(/on\w+=/gi, '') // Supprimer les event handlers
    .replace(/data:/gi, '') // Supprimer data: URLs
    .substring(0, 1000); // Limiter la longueur
};

export const sanitizeNumber = (input: string | number): number | null => {
  const num = typeof input === 'string' ? parseInt(input, 10) : input;
  return isNaN(num) ? null : num;
};

export const sanitizeNumbers = (inputs: (string | number)[]): number[] => {
  return inputs
    .map(sanitizeNumber)
    .filter((n): n is number => n !== null);
};

export const sanitizeEmail = (email: string): string => {
  if (typeof email !== 'string') return '';
  return email
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9@._-]/g, '') // Garder seulement les caractères valides
    .substring(0, 254); // Limite RFC pour les emails
};

// Limiter la longueur des strings
export const truncateString = (str: string, maxLength: number): string => {
  return str.length > maxLength ? str.substring(0, maxLength) : str;
};

// Échapper les caractères HTML
export const escapeHtml = (text: string): string => {
  if (typeof text !== 'string') return '';
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.substring(0, 10000).replace(/[&<>"']/g, (m) => map[m]);
};
