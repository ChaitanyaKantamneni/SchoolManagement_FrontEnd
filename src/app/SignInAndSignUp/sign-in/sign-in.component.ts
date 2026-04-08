// // import { NgIf, isPlatformBrowser } from '@angular/common';
// // import { Component, Inject, PLATFORM_ID } from '@angular/core';
// // import { MatIconModule } from '@angular/material/icon';
// // import { ReactiveFormsModule,FormsModule, FormGroup, FormControl, Validators } from '@angular/forms'
// // import { ApiServiceService } from '../../Services/api-service.service';
// // import { Router } from '@angular/router';
// // import { HttpClientModule } from '@angular/common/http';

// // @Component({
// //   selector: 'app-sign-in',
// //   standalone: true,
// //   imports: [NgIf,MatIconModule,ReactiveFormsModule,FormsModule,HttpClientModule],
// //   templateUrl: './sign-in.component.html',
// //   styleUrls: ['./sign-in.component.css']
// // })
// // export class SignInComponent {
// //   captchaValid: boolean = false;
// //   captchaText: string = '';
// //   IsPasswordVisible:boolean=false;
// //   isUpdateModalOpen: boolean = false;
// //   public loginsuccesfull: boolean = false;
// //   public LoginStatus: string = "";
// //   public color = { red: false, green: false };
// //   public RollID:string="";

// //   LoginForms: any = new FormGroup({
// //     email: new FormControl('', Validators.required),
// //     password: new FormControl('', Validators.required),
// //     captcha: new FormControl('', Validators.required)
// //   });

// //   constructor(@Inject(PLATFORM_ID) private platformId: Object,private router: Router,private apiurl:ApiServiceService) {}

// //   ngOnInit(): void {
// //     if (isPlatformBrowser(this.platformId)) {
// //       sessionStorage.clear();
// //       this.generateCaptcha();
// //     }
// //     // sessionStorage.clear();
// //     // this.generateCaptcha();
// //   }
// //   togglePasswordVisibility(){
// //     this.IsPasswordVisible =! this.IsPasswordVisible;
// //   };

// //   generateCaptcha(): void {
// //     if (!isPlatformBrowser(this.platformId)) return;
// //     const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
// //     const length = 5;
// //     this.captchaText = Array.from({ length }, () =>
// //       characters.charAt(Math.floor(Math.random() * characters.length))
// //     ).join('');
// //     const canvasId = this.isUpdateModalOpen ? 'ForgotPasswordcaptchaCanvas' : 'captchaCanvas';
// //     const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
// //     if (!canvas) {
// //       console.error('Canvas element not found.');
// //       return;
// //     }
// //     const ctx = canvas.getContext('2d');
// //     if (!ctx) {
// //       console.error('Canvas context is not available.');
// //       return;
// //     }
// //     const width = 150;
// //     const height = 50;
// //     canvas.width = width;
// //     canvas.height = height;
// //     ctx.fillStyle = '#f4f4f4';
// //     ctx.fillRect(0, 0, width, height);
// //     ctx.font = '20px Arial';
// //     ctx.fillStyle = '#000';
// //     ctx.textAlign = 'center';
// //     ctx.textBaseline = 'middle';
// //     ctx.fillText(this.captchaText, width / 2, height / 2);
// //     ctx.strokeStyle = '#000';
// //     ctx.beginPath();
// //     for (let i = 0; i < 5; i++) {
// //       ctx.moveTo(Math.random() * width, Math.random() * height);
// //       ctx.lineTo(Math.random() * width, Math.random() * height);
// //     }
// //     ctx.stroke();
// //   };

// //   // OnSubmitSignIn(){
// //   //   this.validateCaptcha();

// //   //   // if (!this.captchaValid) {
// //   //   //   this.propertyInsStatus = 'CAPTCHA is incorrect. Please try again!';
// //   //   //   this.isUpdateModalOpen = true;
// //   //   //   return;
// //   //   // }
// //   //   const data = {
// //   //     Email: this.LoginForms.get('email')?.value,
// //   //     Password: this.LoginForms.get('password')?.value,
// //   //     Flag: '4'
// //   //   };

// //   //   const formData = new FormData();
// //   //   Object.keys(data).forEach(key => {
// //   //     formData.append(key, (data as any)[key]);
// //   //   });

// //   //   this.apiurl.post('Tbl_Users_CRUD_Operations', formData).subscribe({
// //   //     next: (result: any) => {
// //   //       if (!result?.data || result.data.length === 0) {
// //   //         // this.propertyInsStatus = "Login Failed. Please try again!";
// //   //         // this.color = { red: true, green: false };
// //   //         // this.routes.navigate(['/signin']);
// //   //         return;
// //   //       }

// //   //       const userData = result.data[0];
// //   //       // this.propertyInsStatus = result.message || "Login Successful!";
// //   //       // this.color = { red: false, green: true };

// //   //       const email = this.LoginForms.get('email')?.value;

// //   //       sessionStorage.setItem('accessToken', result.accessToken);
// //   //       sessionStorage.setItem('refreshToken', result.refreshToken);

// //   //       if (userData.rollId === "1") {
// //   //         this.RollID = "1";
// //   //         sessionStorage.setItem("email", email);
// //   //         sessionStorage.setItem("RollID", this.RollID);
// //   //         this.router.navigate(['/Admin']);
// //   //       } else if (userData.rollId === "2") {
// //   //         this.RollID = "2";
// //   //         sessionStorage.setItem("email", email);
// //   //         sessionStorage.setItem("RollID", this.RollID);
// //   //         this.router.navigate(['/UserDashboard']);
// //   //       } else {
// //   //         // this.propertyInsStatus = "Login Failed. Please try again!";
// //   //         this.color = { red: true, green: false };
// //   //         this.router.navigate(['/signin']);
// //   //       }
// //   //     },
// //   //     error: (error) => {
// //   //       // this.propertyInsStatus = error?.error?.message || "Login failed due to server error.";
// //   //       this.color = { red: true, green: false };
// //   //       this.isUpdateModalOpen = true;
// //   //     },
// //   //     complete: () => {
// //   //     }
// //   //   });
// //   // };


// //   OnSubmitSignIn() {
// //     this.validateCaptcha();
// //     const data = {
// //       Email: this.LoginForms.get('email')?.value,
// //       Password: this.LoginForms.get('password')?.value,
// //       Flag: '4'
// //     };

// //     const formData = new FormData();
// //     Object.keys(data).forEach(key => {
// //       formData.append(key, (data as any)[key]);
// //     });

// //     this.apiurl.post('Tbl_Users_CRUD_Operations', formData).subscribe({
// //       next: (result: any) => {
// //         const accessToken = result.accessToken || result.token;
// //         const refreshToken = result.refreshToken || result.refreshToken;

// //         if (!accessToken || !refreshToken || !result.email || !result.role) {
// //           // this.propertyInsStatus = result?.Message || 'Login failed!';
// //           this.color = { red: true, green: false };
// //           this.isUpdateModalOpen = true;
// //           return;
// //         }

// //         sessionStorage.setItem('accessToken', accessToken);
// //         sessionStorage.setItem('refreshToken', refreshToken);
// //         sessionStorage.setItem('email', result.email);
// //         sessionStorage.setItem('RollID', result.role);
// //         sessionStorage.setItem('schoolId', result.schoolId);
// //         sessionStorage.setItem('schoolName', result.schoolName);

// //         if (result.role === '1') {
// //           this.router.navigate(['/Admin']);
// //         } else if (result.role !== '1' && result.schoolId!='') {
// //           // this.router.navigate(['/OthersSideBar']);
// //           this.router.navigate([`/${result.schoolName}/dashboard`]);
// //         } else {
// //           // this.propertyInsStatus = 'Login failed! Invalid role.';
// //           this.color = { red: true, green: false };
// //           this.isUpdateModalOpen = true;
// //           this.router.navigate(['/signin']);
// //         }
// //       },
// //       error: (error) => {
// //         // this.propertyInsStatus = error?.error?.message || 'Login failed due to server error.';
// //         this.color = { red: true, green: false };
// //         this.isUpdateModalOpen = true;
// //       }
// //     });
// //   };



// //   validateCaptcha(): void {
// //     const enteredCaptcha = this.LoginForms.get('captcha')?.value;
// //     this.captchaValid = enteredCaptcha === this.captchaText;
// //   };

// //   refreshCaptcha(): void {
// //     this.generateCaptcha();
// //   };

// // }

// import { Component, Inject, OnDestroy, PLATFORM_ID } from '@angular/core';
// import { NgIf } from '@angular/common';
// import { ReactiveFormsModule, FormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
// import { MatIconModule } from '@angular/material/icon';
// import { Router } from '@angular/router';
// import { HttpClientModule } from '@angular/common/http';
// import { ApiServiceService } from '../../Services/api-service.service';
// import { MenuServiceService } from '../../Services/menu-service.service';
// import { isPlatformBrowser } from '@angular/common';
// import { environment } from '../../Environments/environment';

// interface LoginResponse {
//   success?: boolean;
//   accessToken?: string;
//   refreshToken?: string;
//   email?: string;
//   role?: string;
//   schoolId?: string;
//   schoolName?: string;
//   message?: string;
// }

// interface OtpApiResponse {
//   success: boolean;
//   message?: string;
//   accessToken?: string;
//   refreshToken?: string;
// }

// interface PendingLoginState {
//   accessToken: string;
//   refreshToken: string;
//   email: string;
//   role: string;
//   schoolId: string;
//   schoolName: string;
// }

// @Component({
//   selector: 'app-sign-in',
//   standalone: true,
//   imports: [NgIf, MatIconModule, ReactiveFormsModule, FormsModule, HttpClientModule],
//   templateUrl: './sign-in.component.html',
//   styleUrls: ['./sign-in.component.css']
// })
// export class SignInComponent implements OnDestroy {
//   captchaValid = false;
//   captchaText = '';
//   IsPasswordVisible = false;
//   isUpdateModalOpen = false;
//   currentYear = new Date().getFullYear();
//   public color = { red: false, green: false };

//   authMessage = '';
//   authError = false;
//   isOtpStep = false;
//   isLoginLoading = false;
//   isSendingOtp = false;
//   isVerifyingOtp = false;
//   resendCooldown = 0;
//   /** Shown only when using a fixed dev dummy OTP (see environment.loginDevDummyOtp). */
//   loginOtpDevHint = '';
//   private resendTimerId: ReturnType<typeof setInterval> | null = null;
//   private pendingLoginData: PendingLoginState | null = null;
//   /** When loginOtpSkipApi: last OTP issued (must match user input to complete login). */
//   private lastIssuedLoginOtp: string | null = null;

//   LoginForms: FormGroup = new FormGroup({
//     email: new FormControl('', Validators.required),
//     password: new FormControl('', Validators.required),
//     captcha: new FormControl('', Validators.required),
//     otp: new FormControl('', [Validators.required, Validators.pattern(/^\d{6}$/)])
//   });

//   constructor(
//     @Inject(PLATFORM_ID) private platformId: Object,
//     private router: Router,
//     private apiurl: ApiServiceService,
//     private menuService: MenuServiceService
//   ) {}

//   ngOnInit(): void {
//     if (isPlatformBrowser(this.platformId)) {
//       sessionStorage.clear();
//       this.generateCaptcha();
//     }
//   }

//   ngOnDestroy(): void {
//     this.clearResendTimer();
//   }

//   togglePasswordVisibility() {
//     this.IsPasswordVisible = !this.IsPasswordVisible;
//   }

//   generateCaptcha(): void {
//     if (!isPlatformBrowser(this.platformId)) return;
//     const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//     const length = 5;
//     this.captchaText = Array.from({ length }, () =>
//       characters.charAt(Math.floor(Math.random() * characters.length))
//     ).join('');
//     const canvasId = this.isUpdateModalOpen ? 'ForgotPasswordcaptchaCanvas' : 'captchaCanvas';
//     const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
//     if (!canvas) return;
//     const ctx = canvas.getContext('2d');
//     if (!ctx) return;
//     const width = 150;
//     const height = 50;
//     canvas.width = width;
//     canvas.height = height;
//     ctx.fillStyle = '#f4f4f4';
//     ctx.fillRect(0, 0, width, height);
//     ctx.font = '20px Arial';
//     ctx.fillStyle = '#000';
//     ctx.textAlign = 'center';
//     ctx.textBaseline = 'middle';
//     ctx.fillText(this.captchaText, width / 2, height / 2);
//     ctx.strokeStyle = '#000';
//     ctx.beginPath();
//     for (let i = 0; i < 5; i++) {
//       ctx.moveTo(Math.random() * width, Math.random() * height);
//       ctx.lineTo(Math.random() * width, Math.random() * height);
//     }
//     ctx.stroke();
//   }

//   validateCaptcha(): void {
//     const enteredCaptcha = this.LoginForms.get('captcha')?.value;
//     this.captchaValid = enteredCaptcha === this.captchaText;
//   }

//   refreshCaptcha(): void {
//     this.generateCaptcha();
//   }

//   OnSubmitSignIn(): void {
//     if (this.isLoginLoading || this.isSendingOtp) return;

//     this.authMessage = '';
//     this.authError = false;
//     this.isLoginLoading = true;

//     const data = {
//       Email: this.LoginForms.get('email')?.value,
//       Password: this.LoginForms.get('password')?.value,
//       Flag: '4'
//     };

//     const formData = new FormData();
//     Object.keys(data).forEach(key => formData.append(key, (data as any)[key]));

//     this.apiurl.post<LoginResponse>('Tbl_Users_CRUD_Operations', formData).subscribe({
//       next: (result: LoginResponse) => {

//         const email = result?.email || '';
//         const role = result?.role || '';
//         const schoolId = result?.schoolId || '';
//         const schoolName = result?.schoolName || '';

//         if (!email || !role) {
//           this.authError = true;
//           this.authMessage = result?.message || 'Invalid credentials';
//           this.isLoginLoading = false;
//           return;
//         }

//         // ✅ Store ONLY user info (NO TOKEN)
//         this.pendingLoginData = {
//           accessToken: '',
//           refreshToken: '',
//           email,
//           role,
//           schoolId,
//           schoolName
//         };

//         // 👉 Trigger OTP
//         this.sendOtp(email);
//       },
//       error: () => {
//         this.authError = true;
//         this.authMessage = 'Login failed due to server error.';
//         this.isLoginLoading = false;
//       }
//     });
//   }

//   /**
//    * Backend: POST auth/send-otp
//    * Body: { email: string, otp: string } — otp is 6 digits, generated here so the API can email it.
//    * Server should: validate email, persist otp (e.g. cache/db with TTL), send mail with that otp, return { success }.
//    * Resend generates a new otp and repeats (invalidate previous server-side).
//    */
//   sendOtp(email: string): void {
//     this.isSendingOtp = true;

//     this.apiurl.post<OtpApiResponse>('auth/send-otp', { email }).subscribe({
//       next: (response: OtpApiResponse) => {
//         if (!response?.success) {
//           this.authError = true;
//           this.authMessage = response?.message || 'Failed to send OTP.';
//           this.isSendingOtp = false;
//           this.isLoginLoading = false;
//           return;
//         }

//         this.isOtpStep = true;
//         this.authError = false;
//         this.authMessage = 'OTP sent to your email.';
//         this.startResendCooldown(30);
//         this.LoginForms.get('otp')?.reset('');

//         this.isSendingOtp = false;
//         this.isLoginLoading = false;
//       },
//       error: () => {
//         this.authError = true;
//         this.authMessage = 'OTP send failed.';
//         this.isSendingOtp = false;
//         this.isLoginLoading = false;
//       }
//     });
//   }

//   /** 6-digit OTP for auth/send-otp; uses environment.loginDevDummyOtp when set (local testing). */
//   private generateLoginOtpForBackend(): string {
//     const fixed = environment.loginDevDummyOtp?.trim();
//     if (fixed && /^\d{6}$/.test(fixed)) {
//       return fixed;
//     }
//     return String(Math.floor(100000 + Math.random() * 900000));
//   }

//   verifyOtpAndLogin(): void {
//     if (this.isVerifyingOtp || !this.pendingLoginData) return;

//     const pendingLogin = this.pendingLoginData;

//     const otpControl = this.LoginForms.get('otp');
//     otpControl?.markAsTouched();

//     if (!otpControl || otpControl.invalid) {
//       this.authError = true;
//       this.authMessage = 'Enter valid OTP';
//       return;
//     }

//     this.isVerifyingOtp = true;
//     this.authError = false;

//     const enteredOtp = String(otpControl.value).trim();

//     this.apiurl.post<OtpApiResponse>('auth/verify-otp', {
//       email: pendingLogin.email,
//       otp: enteredOtp
//     }).subscribe({
//       next: (response: OtpApiResponse) => {

//         if (!response?.success || !response.accessToken) {
//           this.authError = true;
//           this.authMessage = response?.message || 'Invalid OTP';
//           this.isVerifyingOtp = false;
//           return;
//         }

//         // ✅ USE TOKEN FROM VERIFY API
//         this.persistSessionAndEnterApp(
//           pendingLogin,
//           response.accessToken,
//           response.refreshToken!
//         );
//       },
//       error: () => {
//         this.authError = true;
//         this.authMessage = 'OTP verification failed.';
//         this.isVerifyingOtp = false;
//       }
//     });
//   }

//   resendOtp(): void {
//     if (this.resendCooldown > 0 || !this.pendingLoginData || this.isSendingOtp) return;
//     this.authError = false;
//     this.authMessage = '';
//     this.sendOtp(this.pendingLoginData.email);
//   }

//   backToLogin(): void {
//     this.isOtpStep = false;
//     this.pendingLoginData = null;
//     this.lastIssuedLoginOtp = null;
//     this.LoginForms.get('otp')?.reset('');
//     this.authMessage = '';
//     this.authError = false;
//     this.loginOtpDevHint = '';
//     this.clearResendTimer();
//     this.resendCooldown = 0;
//   }

//   getMaskedEmail(): string {
//     const email = this.pendingLoginData?.email || '';
//     const [name, domain] = email.split('@');
//     if (!name || !domain) return '';
//     return `${name.slice(0, 1)}${'*'.repeat(Math.max(name.length - 1, 3))}@${domain}`;
//   }

//   private startResendCooldown(seconds: number): void {
//     this.clearResendTimer();
//     this.resendCooldown = seconds;
//     this.resendTimerId = setInterval(() => {
//       if (this.resendCooldown > 0) this.resendCooldown -= 1;
//       if (this.resendCooldown <= 0) this.clearResendTimer();
//     }, 1000);
//   }

//   private clearResendTimer(): void {
//     if (!this.resendTimerId) return;
//     clearInterval(this.resendTimerId);
//     this.resendTimerId = null;
//   }

//   private persistSessionAndEnterApp(
//     pending: PendingLoginState,
//     accessToken: string,
//     refreshToken: string
//   ): void {
//     sessionStorage.setItem('accessToken', accessToken);
//     sessionStorage.setItem('refreshToken', refreshToken);
//     sessionStorage.setItem('email', pending.email);
//     sessionStorage.setItem('RollID', pending.role);
//     sessionStorage.setItem('schoolId', pending.schoolId);
//     sessionStorage.setItem('schoolName', pending.schoolName);
//     sessionStorage.setItem('mfaVerified', 'true');

//     this.menuService.clearMenu();
//     this.menuService.loadMenu(pending.role).subscribe({
//       next: () => this.navigateAfterLogin(pending),
//       error: () => {
//         this.authError = true;
//         this.authMessage = 'Failed to load menu after login.';
//         this.isLoginLoading = false;
//         this.isVerifyingOtp = false;
//       }
//     });
//   }

//   private navigateAfterLogin(p: PendingLoginState): void {
//     this.isLoginLoading = false;
//     this.isVerifyingOtp = false;
//     this.pendingLoginData = null;
//     this.isOtpStep = false;

//     if (p.role === '1') {
//       this.router.navigate(['/Admin']);
//       return;
//     }

//     if (p.role !== '1' && p.schoolId) {
//       this.router.navigate([`/${p.schoolName}/dashboard`]);
//       return;
//     }

//     this.authError = true;
//     this.authMessage = 'Login failed! Invalid role or school mapping.';
//     this.color = { red: true, green: false };
//     this.isUpdateModalOpen = true;
//     this.router.navigate(['/signin']);
//   }
// }
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { NgIf, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { ApiServiceService } from '../../Services/api-service.service';
import { MenuServiceService } from '../../Services/menu-service.service';
import { NgZone } from '@angular/core';

interface LoginResponse {
  success?: boolean;
  email?: string;
  role?: string;
  schoolId?: string;
  schoolName?: string;
  message?: string;
}

interface OtpApiResponse {
  success: boolean;
  message?: string;

  accessToken: string; 
  refreshToken: string;

  role: string;  
  email: string;
  schoolId?: string;
  schoolRouteName?: string;
}

interface PendingLoginState {
  accessToken: string;
  refreshToken: string;
  email: string;
  role: string;
  schoolId: string;
  schoolName: string;
}

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [NgIf, MatIconModule, ReactiveFormsModule, FormsModule, HttpClientModule],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css']
})
export class SignInComponent implements OnInit, OnDestroy {

  // UI
  IsPasswordVisible = false;
  currentYear = new Date().getFullYear();

  // ✅ FIXED (for HTML binding error)
  loginOtpDevHint: string = '';

  captchaText = '';
  isOtpStep = false;
  isLoginLoading = false;
  isSendingOtp = false;
  isVerifyingOtp = false;
  resendCooldown = 0;

  authMessage = '';
  authError = false;

  private resendTimerId: any = null;
  private pendingLoginData: PendingLoginState | null = null;

  // FORM
  LoginForms = new FormGroup({
    email: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
    captcha: new FormControl('', Validators.required),
    otp: new FormControl('')
  });

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private apiurl: ApiServiceService,
    private menuService: MenuServiceService,
    private ngZone: NgZone
  ) {}

  // ================= INIT =================
  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const pending = sessionStorage.getItem('pendingLogin');
    const isOtp = sessionStorage.getItem('isOtpStep');

    if (pending && isOtp === 'true') {
      this.pendingLoginData = JSON.parse(pending);
      this.isOtpStep = true;

      this.LoginForms.get('otp')?.reset('');
      this.authMessage = 'Enter OTP sent to your email';
      this.authError = false;
    }

    this.generateCaptcha();
  }

  ngOnDestroy(): void {
    this.clearResendTimer();
  }

  // ================= PASSWORD =================
  togglePasswordVisibility() {
    this.IsPasswordVisible = !this.IsPasswordVisible;
  }

  // ================= CAPTCHA (FULL FIX) =================
  generateCaptcha(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    this.captchaText = Array.from({ length: 5 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length))
    ).join('');

    setTimeout(() => {
      const canvas = document.getElementById('captchaCanvas') as HTMLCanvasElement;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = 150;
      const height = 50;

      canvas.width = width;
      canvas.height = height;

      // background
      ctx.fillStyle = '#f4f4f4';
      ctx.fillRect(0, 0, width, height);

      // text
      ctx.font = '20px Arial';
      ctx.fillStyle = '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillText(this.captchaText, width / 2, height / 2);

      // noise lines
      ctx.strokeStyle = '#000';
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * width, Math.random() * height);
        ctx.lineTo(Math.random() * width, Math.random() * height);
        ctx.stroke();
      }
    }, 100);
  }

  // ================= LOGIN =================
OnSubmitSignIn(): void {

  console.log('LOGIN CLICKED');

  if (this.isLoginLoading) return;

  if (this.LoginForms.invalid) {
    console.log('FORM INVALID');
    this.LoginForms.markAllAsTouched();
    return;
  }

  const enteredCaptcha = this.LoginForms.get('captcha')?.value?.trim();

  if (!enteredCaptcha || enteredCaptcha !== this.captchaText) {
    console.log('CAPTCHA INVALID');
    this.authError = true;
    this.authMessage = 'Invalid captcha';
    this.generateCaptcha();
    this.LoginForms.get('captcha')?.reset();
    return;
  }

  console.log('CALLING LOGIN API');

  this.isLoginLoading = true;

  const formData = new FormData();
  formData.append('Email', this.LoginForms.get('email')?.value || '');
  formData.append('Password', this.LoginForms.get('password')?.value || '');
  formData.append('Flag', '4');

  this.apiurl.post<LoginResponse>('Tbl_Users_CRUD_Operations', formData).subscribe({
    next: (res) => {

      console.log('LOGIN SUCCESS RESPONSE', res);
      
      if (!res?.email || !res?.role) {
        this.authError = true;
        this.authMessage = res?.message || 'Invalid credentials';
        this.isLoginLoading = false;
        return;
      }

      
      this.pendingLoginData = {
        accessToken: '',
        refreshToken: '',
        email: res.email,
        role: res.role,
        schoolId: res.schoolId || '',
        schoolName: res.schoolName || ''
      };

      sessionStorage.setItem('pendingLogin', JSON.stringify(this.pendingLoginData));
      sessionStorage.setItem('isOtpStep', 'true');

      this.isOtpStep=true;      
      this.sendOtp(res.email);
    },
    error: (err) => {
      console.log('LOGIN ERROR', err);
      this.authError = true;
      this.authMessage = 'Login failed';
      this.isLoginLoading = false;
    }
  });
}

  // ================= SEND OTP =================
sendOtp(email: string): void {

  console.log('OTP API CALL');

  this.isSendingOtp = true;

  this.apiurl.post<OtpApiResponse>('sendotp', { email }).subscribe({
    next: (res) => {

      console.log('OTP RESPONSE', res);

      if (!res?.success) {
        this.authError = true;
        this.authMessage = 'Failed to send OTP';
        this.isSendingOtp = false;
        this.isLoginLoading = false;
        return;
      }

      this.isOtpStep = true;
      this.authMessage = 'OTP sent successfully';

      this.startResendCooldown(30);

      this.isSendingOtp = false;
      this.isLoginLoading = false;
    },
    error: (err) => {
      console.log('OTP ERROR', err);
      this.authError = true;
      this.authMessage = 'OTP send failed';
      this.isSendingOtp = false;
      this.isLoginLoading = false;
    }
  });
}

  // ================= VERIFY OTP =================
  verifyOtpAndLogin(): void {
    if (!this.pendingLoginData) return;

    const otpControl = this.LoginForms.get('otp');

    otpControl?.setValidators([Validators.required, Validators.pattern(/^\d{6}$/)]);
    otpControl?.updateValueAndValidity();

    if (otpControl?.invalid) {
      this.authError = true;
      this.authMessage = 'Enter valid 6-digit OTP';
      return;
    }

    const otp = this.LoginForms.get('otp')?.value;

    if (!otp || otp.length !== 6) {
      this.authError = true;
      this.authMessage = 'Enter valid 6-digit OTP';
      return;
    }

    this.isVerifyingOtp = true;

    this.apiurl.post<OtpApiResponse>('verifyotp', {
      email: this.pendingLoginData.email,
      otp
    }).subscribe({
      next: (res) => {

        if (!res?.success || !res.accessToken) {
          this.authError = true;
          this.authMessage = res?.message || 'Invalid OTP';
          this.isVerifyingOtp = false;
          return;
        }

        this.pendingLoginData = {
          accessToken: res.accessToken,
          refreshToken: res.refreshToken,
          email: res.email,
          role: res.role,
          schoolId: res.schoolId || '',
          schoolName: res.schoolRouteName || ''
        };

        this.persistSession(res.accessToken, res.refreshToken!);
      },
      error: () => {
        this.authError = true;
        this.authMessage = 'OTP verification failed';
        this.isVerifyingOtp = false;
      }
    });
  }

  // ================= SESSION =================
private persistSession(token: string, refresh: string) {
  sessionStorage.setItem('accessToken', token);
  sessionStorage.setItem('refreshToken', refresh);

  // ✅ ADD THESE — AdminDashboardComponent needs them
  sessionStorage.setItem('RollID', this.pendingLoginData?.role || '');
  sessionStorage.setItem('email', this.pendingLoginData?.email || '');
  sessionStorage.setItem('schoolName', this.pendingLoginData?.schoolName || '');

  const role = this.pendingLoginData?.role;
  const schoolName = this.pendingLoginData?.schoolName;

  sessionStorage.removeItem('pendingLogin');
  sessionStorage.removeItem('isOtpStep');

  this.ngZone.runOutsideAngular(() => {
    setTimeout(() => {
      this.ngZone.run(() => {
        if (String(role) === '1') {
          this.router.navigate(['/Admin']);
          return;
        }
        if (schoolName) {
          this.router.navigate([`/${schoolName}/dashboard`]);
          return;
        }
        this.router.navigate(['/signin']);
      });
    }, 0);
  });
}

  // ================= UI =================
  backToLogin() {
    this.isOtpStep = false;

    const otpControl = this.LoginForms.get('otp');
    otpControl?.clearValidators();
    otpControl?.updateValueAndValidity();

    this.LoginForms.get('otp')?.reset();
  }

  resendOtp() {
    if (!this.pendingLoginData) return;
    this.sendOtp(this.pendingLoginData.email);
  }

  getMaskedEmail(): string {
    const email = this.pendingLoginData?.email || '';
    const [name, domain] = email.split('@');
    if (!name || !domain) return email;
    return name.charAt(0) + '***@' + domain;
  }

  // ================= TIMER =================
  private startResendCooldown(sec: number) {
    this.clearResendTimer();
    this.resendCooldown = sec;

    this.resendTimerId = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) this.clearResendTimer();
    }, 1000);
  }

  private clearResendTimer() {
    if (this.resendTimerId) {
      clearInterval(this.resendTimerId);
      this.resendTimerId = null;
    }
  }
}