import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

const SPECIAL_CHARS = /[@$!%*?&_#^()\-+=]/;

export const passwordValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = (control.value as string) ?? '';
  if (!value) return null;

  const errors: ValidationErrors = {};
  if (value.length < 8)            errors['minLength']    = true;
  if (!/[A-Z]/.test(value))        errors['uppercase']    = true;
  if (!/[a-z]/.test(value))        errors['lowercase']    = true;
  if (!/[0-9]/.test(value))        errors['number']       = true;
  if (!SPECIAL_CHARS.test(value))  errors['specialChar']  = true;

  return Object.keys(errors).length ? errors : null;
};

export interface PasswordRule {
  label: string;
  met: boolean;
}

export function getPasswordRules(value: string): PasswordRule[] {
  return [
    { label: 'At least 8 characters',                                    met: value.length >= 8 },
    { label: 'At least one uppercase letter (A–Z)',                       met: /[A-Z]/.test(value) },
    { label: 'At least one lowercase letter (a–z)',                       met: /[a-z]/.test(value) },
    { label: 'At least one number (0–9)',                                 met: /[0-9]/.test(value) },
    { label: 'At least one special character (@ $ ! % * ? & _ # ^ ( ) - + =)', met: SPECIAL_CHARS.test(value) },
  ];
}
