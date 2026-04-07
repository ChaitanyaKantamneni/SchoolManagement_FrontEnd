// import { bootstrapApplication } from '@angular/platform-browser';
// import { provideHttpClient, withInterceptors } from '@angular/common/http';
// import { AppComponent } from './app/app.component';
// import { appConfig } from './app/app.config';
// import { AuthInterceptor } from '../src/app/Services/Interceptor/auth.interceptor';

// bootstrapApplication(AppComponent, {
//   ...appConfig,
//   providers: [
//     ...(appConfig.providers || []),
//     provideHttpClient(withInterceptors([AuthInterceptor]))
//   ]
// })
// .catch((err) => console.error(err));

import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';
import { authInterceptor } from './app/Services/Interceptor/auth.interceptor';

import { provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts';
import { isDevMode } from '@angular/core';
import { provideServiceWorker } from '@angular/service-worker';

bootstrapApplication(AppComponent, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []),

    provideHttpClient(withInterceptors([authInterceptor])),

    provideEchartsCore({ echarts }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),

  ]
})
.catch(err => console.error(err));