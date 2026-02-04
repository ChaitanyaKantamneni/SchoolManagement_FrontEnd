// import { HttpRequest, HttpHandlerFn, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
// import { Observable, BehaviorSubject, throwError } from 'rxjs';
// import { catchError, switchMap, filter, take } from 'rxjs/operators';
// import { inject } from '@angular/core';
// import { ApiServiceService } from '../api-service.service';

// export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
//   const apiService = inject(ApiServiceService);

//   const token = sessionStorage.getItem('accessToken');
//   let authReq = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

//   const isRefreshing = false;
//   const refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

//   return next(authReq).pipe(
//     catchError(error => {
//       if ((error as any)?.status === 401) {
//         if (!isRefreshing) {
//           // refresh token logic
//           const refreshToken = sessionStorage.getItem('refreshToken');
//           const email = sessionStorage.getItem('email');
//           if (refreshToken && email) {
//             return apiService.post<any>('refresh-token', { email, refreshToken }).pipe(
//               switchMap(tokens => {
//                 sessionStorage.setItem('accessToken', tokens.accessToken);
//                 sessionStorage.setItem('refreshToken', tokens.refreshToken);
//                 refreshTokenSubject.next(tokens.accessToken);
//                 const cloned = req.clone({ setHeaders: { Authorization: `Bearer ${tokens.accessToken}` } });
//                 return next(cloned);
//               }),
//               catchError(err => {
//                 sessionStorage.clear();
//                 return throwError(() => err);
//               })
//             );
//           }
//         }
//         return refreshTokenSubject.pipe(
//           filter(token => token !== null),
//           take(1),
//           switchMap(token => next(req.clone({ setHeaders: { Authorization: `Bearer ${token!}` } })))
//         );
//       }
//       return throwError(() => error);
//     })
//   );
// };


import { HttpRequest, HttpHandlerFn, HttpEvent, HttpInterceptorFn } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, timer } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { inject } from '@angular/core';
import { ApiServiceService } from '../api-service.service';

let idleTimer: any;

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn): Observable<HttpEvent<any>> => {
  const apiService = inject(ApiServiceService);

  const accessToken = sessionStorage.getItem('accessToken');
  let authReq = accessToken ? req.clone({ setHeaders: { Authorization: `Bearer ${accessToken}` } }) : req;

  resetIdleTimer();

  return next(authReq).pipe(
    catchError(error => {
      if ((error as any)?.status === 401) {
        // Handle token refresh
        const refreshToken = sessionStorage.getItem('refreshToken');
        const email = sessionStorage.getItem('email');

        if (refreshToken && email) {
          return apiService.post<any>('refresh-token', { email, refreshToken }).pipe(
            switchMap(tokens => {
              sessionStorage.setItem('accessToken', tokens.accessToken);
              sessionStorage.setItem('refreshToken', tokens.refreshToken);

              const clonedReq = req.clone({ setHeaders: { Authorization: `Bearer ${tokens.accessToken}` } });
              return next(clonedReq);
            }),
            catchError(err => {
              logoutUser();
              return throwError(() => err);
            })
          );
        } else {
          logoutUser();
        }
      }
      return throwError(() => error);
    })
  );
};

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    logoutUser();
  }, 60 * 60 * 1000);
}

function logoutUser() {
  sessionStorage.clear();
  location.href = '/signin';
}
