/**
 * Form validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }

  return { isValid: true };
}

/**
 * Validate phone number (basic format)
 */
export function validatePhone(phone: string): ValidationResult {
  if (!phone || phone.trim() === '') {
    return { isValid: true }; // Phone is optional
  }

  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');

  // Check if it's a reasonable phone number (7-15 digits)
  if (!/^\+?\d{7,15}$/.test(cleaned)) {
    return { isValid: false, error: 'Please enter a valid phone number' };
  }

  return { isValid: true };
}

/**
 * Validate required field
 */
export function validateRequired(value: string, fieldName: string): ValidationResult {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  return { isValid: true };
}

/**
 * Validate minimum length
 */
export function validateMinLength(value: string, minLength: number, fieldName: string): ValidationResult {
  if (value.length < minLength) {
    return { isValid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }
  return { isValid: true };
}

/**
 * Validate maximum length
 */
export function validateMaxLength(value: string, maxLength: number, fieldName: string): ValidationResult {
  if (value.length > maxLength) {
    return { isValid: false, error: `${fieldName} must be less than ${maxLength} characters` };
  }
  return { isValid: true };
}

/**
 * Validate number range
 */
export function validateNumberRange(value: number, min: number, max: number, fieldName: string): ValidationResult {
  if (isNaN(value)) {
    return { isValid: false, error: `${fieldName} must be a number` };
  }
  if (value < min || value > max) {
    return { isValid: false, error: `${fieldName} must be between ${min} and ${max}` };
  }
  return { isValid: true };
}

/**
 * Validate positive number
 */
export function validatePositiveNumber(value: number, fieldName: string): ValidationResult {
  if (isNaN(value) || value < 0) {
    return { isValid: false, error: `${fieldName} must be a positive number` };
  }
  return { isValid: true };
}

/**
 * Validate percentage (0-100)
 */
export function validatePercentage(value: number, fieldName: string): ValidationResult {
  if (isNaN(value) || value < 0 || value > 100) {
    return { isValid: false, error: `${fieldName} must be between 0 and 100` };
  }
  return { isValid: true };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): ValidationResult {
  if (!url || url.trim() === '') {
    return { isValid: true }; // URL is optional
  }

  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Please enter a valid URL' };
  }
}

/**
 * Sanitize string input (remove potentially dangerous characters)
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Validate and sanitize a form field
 */
export function validateAndSanitize(
  value: string,
  validators: ((v: string) => ValidationResult)[]
): { sanitized: string; validation: ValidationResult } {
  const sanitized = sanitizeInput(value);

  for (const validator of validators) {
    const result = validator(sanitized);
    if (!result.isValid) {
      return { sanitized, validation: result };
    }
  }

  return { sanitized, validation: { isValid: true } };
}

/**
 * Common validation combinations
 */
export const validators = {
  email: validateEmail,
  phone: validatePhone,
  required: (fieldName: string) => (value: string) => validateRequired(value, fieldName),
  minLength: (min: number, fieldName: string) => (value: string) => validateMinLength(value, min, fieldName),
  maxLength: (max: number, fieldName: string) => (value: string) => validateMaxLength(value, max, fieldName),
};
