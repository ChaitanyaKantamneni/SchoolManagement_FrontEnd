import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function dateRangeValidator(
  startDateKey: string,
  endDateKey: string
): ValidatorFn {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const start = formGroup.get(startDateKey)?.value;
    const end = formGroup.get(endDateKey)?.value;

    if (!start || !end) return null;

    return new Date(end) < new Date(start)
      ? { dateRangeInvalid: true }
      : null;
  };
}
