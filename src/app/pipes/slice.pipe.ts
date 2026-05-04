import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'slice'
})
export class SlicePipe implements PipeTransform {
  transform(value: string, start: number, end?: number): string {
    if (!value) {
      return '';
    }
    
    const startIndex = start || 0;
    const endIndex = end || value.length;
    
    return value.substring(startIndex, endIndex);
  }
}
