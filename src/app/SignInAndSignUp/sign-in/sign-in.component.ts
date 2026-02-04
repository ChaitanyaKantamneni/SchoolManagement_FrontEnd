import { NgIf, isPlatformBrowser } from '@angular/common';
import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule,FormsModule, FormGroup, FormControl, Validators } from '@angular/forms'
import { ApiServiceService } from '../../Services/api-service.service';
import { Router } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [NgIf,MatIconModule,ReactiveFormsModule,FormsModule,HttpClientModule],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css']
})
export class SignInComponent {
  captchaValid: boolean = false;
  captchaText: string = '';
  IsPasswordVisible:boolean=false;
  isUpdateModalOpen: boolean = false;
  public loginsuccesfull: boolean = false;
  public LoginStatus: string = "";
  public color = { red: false, green: false };
  public RollID:string="";

  LoginForms: any = new FormGroup({
    email: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required),
    captcha: new FormControl('', Validators.required)
  });

  constructor(@Inject(PLATFORM_ID) private platformId: Object,private router: Router,private apiurl:ApiServiceService) {}

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.clear();
      this.generateCaptcha();
    }
    // sessionStorage.clear();
    // this.generateCaptcha();
  }
  togglePasswordVisibility(){
    this.IsPasswordVisible =! this.IsPasswordVisible;
  };

  generateCaptcha(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const length = 5;
    this.captchaText = Array.from({ length }, () =>
      characters.charAt(Math.floor(Math.random() * characters.length))
    ).join('');
    const canvasId = this.isUpdateModalOpen ? 'ForgotPasswordcaptchaCanvas' : 'captchaCanvas';
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) {
      console.error('Canvas element not found.');
      return;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Canvas context is not available.');
      return;
    }
    const width = 150;
    const height = 50;
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(0, 0, width, height);
    ctx.font = '20px Arial';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.captchaText, width / 2, height / 2);
    ctx.strokeStyle = '#000';
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      ctx.moveTo(Math.random() * width, Math.random() * height);
      ctx.lineTo(Math.random() * width, Math.random() * height);
    }
    ctx.stroke();
  };

  // OnSubmitSignIn(){
  //   this.validateCaptcha();

  //   // if (!this.captchaValid) {
  //   //   this.propertyInsStatus = 'CAPTCHA is incorrect. Please try again!';
  //   //   this.isUpdateModalOpen = true;
  //   //   return;
  //   // }
  //   const data = {
  //     Email: this.LoginForms.get('email')?.value,
  //     Password: this.LoginForms.get('password')?.value,
  //     Flag: '4'
  //   };

  //   const formData = new FormData();
  //   Object.keys(data).forEach(key => {
  //     formData.append(key, (data as any)[key]);
  //   });

  //   this.apiurl.post('Tbl_Users_CRUD_Operations', formData).subscribe({
  //     next: (result: any) => {
  //       if (!result?.data || result.data.length === 0) {
  //         // this.propertyInsStatus = "Login Failed. Please try again!";
  //         // this.color = { red: true, green: false };
  //         // this.routes.navigate(['/signin']);
  //         return;
  //       }

  //       const userData = result.data[0];
  //       // this.propertyInsStatus = result.message || "Login Successful!";
  //       // this.color = { red: false, green: true };

  //       const email = this.LoginForms.get('email')?.value;

  //       sessionStorage.setItem('accessToken', result.accessToken);
  //       sessionStorage.setItem('refreshToken', result.refreshToken);

  //       if (userData.rollId === "1") {
  //         this.RollID = "1";
  //         sessionStorage.setItem("email", email);
  //         sessionStorage.setItem("RollID", this.RollID);
  //         this.router.navigate(['/Admin']);
  //       } else if (userData.rollId === "2") {
  //         this.RollID = "2";
  //         sessionStorage.setItem("email", email);
  //         sessionStorage.setItem("RollID", this.RollID);
  //         this.router.navigate(['/UserDashboard']);
  //       } else {
  //         // this.propertyInsStatus = "Login Failed. Please try again!";
  //         this.color = { red: true, green: false };
  //         this.router.navigate(['/signin']);
  //       }
  //     },
  //     error: (error) => {
  //       // this.propertyInsStatus = error?.error?.message || "Login failed due to server error.";
  //       this.color = { red: true, green: false };
  //       this.isUpdateModalOpen = true;
  //     },
  //     complete: () => {
  //     }
  //   });
  // };


  OnSubmitSignIn() {
    this.validateCaptcha();
    const data = {
      Email: this.LoginForms.get('email')?.value,
      Password: this.LoginForms.get('password')?.value,
      Flag: '4'
    };

    const formData = new FormData();
    Object.keys(data).forEach(key => {
      formData.append(key, (data as any)[key]);
    });

    this.apiurl.post('Tbl_Users_CRUD_Operations', formData).subscribe({
      next: (result: any) => {
        const accessToken = result.accessToken || result.token;
        const refreshToken = result.refreshToken || result.refreshToken;

        if (!accessToken || !refreshToken || !result.email || !result.role) {
          // this.propertyInsStatus = result?.Message || 'Login failed!';
          this.color = { red: true, green: false };
          this.isUpdateModalOpen = true;
          return;
        }

        sessionStorage.setItem('accessToken', accessToken);
        sessionStorage.setItem('refreshToken', refreshToken);
        sessionStorage.setItem('email', result.email);
        sessionStorage.setItem('RollID', result.role);
        sessionStorage.setItem('schoolId', result.schoolId);
        sessionStorage.setItem('schoolName', result.schoolName);

        if (result.role === '1') {
          this.router.navigate(['/Admin']);
        } else if (result.role !== '1' && result.schoolId!='') {
          // this.router.navigate(['/OthersSideBar']);
          this.router.navigate([`/${result.schoolName}/dashboard`]);
        } else {
          // this.propertyInsStatus = 'Login failed! Invalid role.';
          this.color = { red: true, green: false };
          this.isUpdateModalOpen = true;
          this.router.navigate(['/signin']);
        }
      },
      error: (error) => {
        // this.propertyInsStatus = error?.error?.message || 'Login failed due to server error.';
        this.color = { red: true, green: false };
        this.isUpdateModalOpen = true;
      }
    });
  };



  validateCaptcha(): void {
    const enteredCaptcha = this.LoginForms.get('captcha')?.value;
    this.captchaValid = enteredCaptcha === this.captchaText;
  };

  refreshCaptcha(): void {
    this.generateCaptcha();
  };

}
