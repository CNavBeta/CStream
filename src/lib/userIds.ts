export const generateUserId = (): string => {
  const min = 10000;
  const max = 99999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
};

export const formatUserId = (id: string): string => {
  if (id.length === 5) {
    return id;
  }
  return id.slice(0, 5).padStart(5, '0');
};

export const isValidUserId = (id: string): boolean => {
  return /^\d{5}$/.test(id);
};

export const generateFriendCode = (): string => {
  const id = generateUserId();
  return id;
};
