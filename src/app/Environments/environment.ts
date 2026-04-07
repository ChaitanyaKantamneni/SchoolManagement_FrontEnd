export const environment = {
    production:false,
    baseUrl : 'https://localhost:7067/api/SchoolManagement',
    imgUrl:'https://localhost:7067/',

    /**
     * When true: after valid username/password, MFA OTP step runs (tokens applied only after OTP OK).
     * When false: login completes immediately after password (no MFA).
     */
    requireLoginOtp: true,

    /**
     * Dev / no backend yet: skip HTTP auth/send-otp and auth/verify-otp; OTP is checked in the browser
     * against the last generated code (same one logged to console). Set false when your API is ready.
     */
    loginOtpSkipApi: true,

    /**
     * If set to a 6-digit string, that value is used as OTP instead of random (still logged to console).
     * Set null to use a random 6-digit code each send/resend.
     */
    loginDevDummyOtp: '123456' as string | null,

    // production:true,
    // baseUrl : 'http://192.168.0.218:5013/api/BUsereleProcedures',
    // imgUrl:'http://192.168.0.218:5013'
};
