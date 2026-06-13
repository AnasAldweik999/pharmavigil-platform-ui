export interface CreateUserRequest {
  email: string;
}

export interface UserResponse {
  id: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  active: boolean;
  createdAt: string;
}
