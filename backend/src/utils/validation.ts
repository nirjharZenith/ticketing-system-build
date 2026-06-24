export interface ValidationError {
  field: string;
  message: string;
}

export class ValidationException extends Error {
  constructor(public errors: ValidationError[]) {
    super('Validation failed');
    this.name = 'ValidationException';
  }
}

// Email validation
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 255;
};

// Password validation (min 8 chars, 1 uppercase, 1 number, 1 special char)
export const isValidPassword = (password: string): boolean => {
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// UUID validation
export const isValidUUID = (id: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

// String length validation
export const isValidString = (str: string, minLength: number = 1, maxLength: number = 10000): boolean => {
  if (typeof str !== 'string') return false;
  const trimmed = str.trim();
  return trimmed.length >= minLength && trimmed.length <= maxLength;
};

// Ticket title validation
export const isValidTicketTitle = (title: string): boolean => {
  return isValidString(title, 3, 200);
};

// Ticket description validation
export const isValidTicketDescription = (description: string): boolean => {
  return isValidString(description, 0, 5000);
};

// Priority validation
export const isValidPriority = (priority: string): boolean => {
  return ['low', 'medium', 'high', 'urgent'].includes(priority.toLowerCase());
};

// Status validation
export const isValidStatus = (status: string): boolean => {
  return ['open', 'in_progress', 'in_verification', 'resolved', 'closed', 'to triage', 'backlog', 'ready', 'in progress', 'in review', 'done'].includes(status.toLowerCase());
};

// Organization name validation
export const isValidOrgName = (name: string): boolean => {
  return isValidString(name, 2, 100);
};

// User name validation
export const isValidUserName = (name: string): boolean => {
  return isValidString(name, 2, 100);
};

// File size validation (10MB default)
export const isValidFileSize = (sizeInBytes: number, maxSizeMB: number = 10): boolean => {
  const maxSizeInBytes = maxSizeMB * 1024 * 1024;
  return sizeInBytes > 0 && sizeInBytes <= maxSizeInBytes;
};

// File type validation
export const isValidFileType = (mimeType: string): boolean => {
  const allowedTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ];
  return allowedTypes.includes(mimeType);
};

// Validate ticket creation input
export const validateTicketCreation = (data: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!data.title || !isValidTicketTitle(data.title)) {
    errors.push({
      field: 'title',
      message: 'Title must be between 3 and 200 characters',
    });
  }

  if (data.description && !isValidTicketDescription(data.description)) {
    errors.push({
      field: 'description',
      message: 'Description must not exceed 5000 characters',
    });
  }

  if (data.priority && !isValidPriority(data.priority)) {
    errors.push({
      field: 'priority',
      message: 'Invalid priority. Must be: low, medium, high, or urgent',
    });
  }

  return errors;
};

// Validate user registration
export const validateUserRegistration = (data: any): ValidationError[] => {
  const errors: ValidationError[] = [];

  if (!data.email || !isValidEmail(data.email)) {
    errors.push({
      field: 'email',
      message: 'Please provide a valid email address',
    });
  }

  if (!data.name || !isValidUserName(data.name)) {
    errors.push({
      field: 'name',
      message: 'Name must be between 2 and 100 characters',
    });
  }

  if (!data.password || !isValidPassword(data.password)) {
    errors.push({
      field: 'password',
      message: 'Password must be at least 8 characters with uppercase, number, and special character',
    });
  }

  if (data.password !== data.confirmPassword) {
    errors.push({
      field: 'confirmPassword',
      message: 'Passwords do not match',
    });
  }

  return errors;
};

// Sanitize input to prevent injection
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  return input
    .trim()
    .slice(0, 10000)
    .replace(/[<>\"'`]/g, (char) => {
      const map: any = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '`': '&#x60;',
      };
      return map[char];
    });
};

// Validate pagination
export const isValidPagination = (page: any, limit: any): { page: number; limit: number } | null => {
  const pageNum = parseInt(page) || 1;
  const limitNum = parseInt(limit) || 20;

  if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
    return null;
  }

  return { page: pageNum, limit: limitNum };
};
