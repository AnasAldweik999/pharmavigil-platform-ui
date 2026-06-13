export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  role: 'SUPERVISOR' | 'STAFF';
  expiresIn: number;
  name: string;
  email: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface AuthState {
  accessToken: string;
  refreshToken: string;
  role: 'SUPERVISOR' | 'STAFF';
  name: string;
  email: string;
}
