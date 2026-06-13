export type UserRole = 'SUPERVISOR' | 'STAFF';
export type UserStatus = 'PENDING_EMAIL_VERIFICATION' | 'ACTIVE' | 'INACTIVE';

export interface CreateUserRequest {
  name: string;
  email: string;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}
