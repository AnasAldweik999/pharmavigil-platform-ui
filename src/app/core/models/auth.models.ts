export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  role: 'ADMIN' | 'EMPLOYEE';
  expiresIn: number;
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
  role: 'ADMIN' | 'EMPLOYEE';
  email: string;
}
