
// Utility Functions
export const isValidURL = (string) => {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
};


