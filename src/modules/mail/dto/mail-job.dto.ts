export interface WelcomeEmailJobDto {
  to: string;
  firstName: string;
  tempPassword: string;
}

export interface ResetPasswordEmailJobDto {
  to: string;
  firstName: string;
  resetLink: string;
  expiresInMinutes: number;
}

export interface PasswordChangedEmailJobDto {
  to: string;
  firstName: string;
}
