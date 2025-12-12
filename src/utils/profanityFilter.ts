// Simple profanity filter - extensible list
const profanityList = [
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'crap', 'bastard', 'dick', 'cock', 
  'pussy', 'cunt', 'whore', 'slut', 'fag', 'retard', 'nigger', 'nigga'
];

// Create regex patterns that match whole words and common variations
const createPatterns = (words: string[]): RegExp[] => {
  return words.map(word => {
    // Match the word with common letter substitutions
    const pattern = word
      .split('')
      .map(char => {
        switch (char.toLowerCase()) {
          case 'a': return '[a@4]';
          case 'e': return '[e3]';
          case 'i': return '[i1!]';
          case 'o': return '[o0]';
          case 's': return '[s$5]';
          case 't': return '[t7]';
          default: return char;
        }
      })
      .join('');
    return new RegExp(`\\b${pattern}\\b`, 'gi');
  });
};

const patterns = createPatterns(profanityList);

export const containsProfanity = (text: string): boolean => {
  return patterns.some(pattern => pattern.test(text));
};

export const filterProfanity = (text: string): string => {
  let filtered = text;
  patterns.forEach(pattern => {
    filtered = filtered.replace(pattern, (match) => '*'.repeat(match.length));
  });
  return filtered;
};

export const getProfanityMatches = (text: string): string[] => {
  const matches: string[] = [];
  patterns.forEach(pattern => {
    const found = text.match(pattern);
    if (found) {
      matches.push(...found);
    }
  });
  return matches;
};
