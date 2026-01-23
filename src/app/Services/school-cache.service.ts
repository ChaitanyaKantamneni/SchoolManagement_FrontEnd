import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SchoolCacheService {

  private schoolMap$ = new BehaviorSubject<{ [key: string]: string }>({});

  setSchools(data: any[]) {
    const map: any = {};
    data.forEach(s => map[String(s.id)] = s.name);
    this.schoolMap$.next(map);
  }

  getSchoolMap() {
    return this.schoolMap$.value;
  }

  hasData(): boolean {
    return Object.keys(this.schoolMap$.value).length > 0;
  }
}
