import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, HostListener, inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';

/** Chromium install prompt event (not in lib.dom by default in all TS versions). */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

const STORAGE_KEY = 'pwa-install-banner-dismissed-at';
/** Hide banner after dismiss; show again only after this many days. */
const COOLDOWN_DAYS = 30;
const FALLBACK_DELAY_MS = 4000;

@Component({
  selector: 'app-pwa-install-prompt',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pwa-install-prompt.component.html',
  styleUrls: ['./pwa-install-prompt.component.css'],
})
export class PwaInstallPromptComponent implements OnInit, OnDestroy {
  private readonly platformId = inject(PLATFORM_ID);

  visible = false;
  canNativeInstall = false;
  /** Hint for manual install when native prompt is unavailable. */
  browserHint: 'chrome-edge' | 'safari-ios' | 'safari-macos' | 'firefox' | 'generic' = 'generic';

  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private fallbackTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly onBeforeInstall = (e: Event): void => {
    e.preventDefault();
    if (this.fallbackTimer !== null) {
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
    this.deferredPrompt = e as BeforeInstallPromptEvent;
    if (this.shouldSuppressBanner()) {
      return;
    }
    this.canNativeInstall = true;
    this.browserHint = 'chrome-edge';
    this.visible = true;
  };

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    if (this.isInstalledPwa() || this.isDismissedWithinCooldown()) {
      return;
    }
    window.addEventListener('beforeinstallprompt', this.onBeforeInstall);

    this.fallbackTimer = setTimeout(() => {
      this.tryShowFallbackInstructions();
    }, FALLBACK_DELAY_MS);
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    window.removeEventListener('beforeinstallprompt', this.onBeforeInstall);
    if (this.fallbackTimer !== null) {
      clearTimeout(this.fallbackTimer);
    }
  }

  /** Re-check after storage changes in another tab. */
  @HostListener('window:storage', ['$event'])
  onStorage(): void {
    if (this.isDismissedWithinCooldown()) {
      this.visible = false;
    }
  }

  async onInstallClick(): Promise<void> {
    if (!this.deferredPrompt) {
      return;
    }
    try {
      await this.deferredPrompt.prompt();
      await this.deferredPrompt.userChoice;
    } finally {
      this.deferredPrompt = null;
      this.visible = false;
      this.canNativeInstall = false;
    }
  }

  onDismissClick(): void {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
    this.visible = false;
  }

  private shouldSuppressBanner(): boolean {
    return this.isInstalledPwa() || this.isDismissedWithinCooldown();
  }

  private tryShowFallbackInstructions(): void {
    if (this.visible || this.shouldSuppressBanner()) {
      return;
    }
    this.browserHint = this.detectBrowserHint();
    this.visible = true;
  }

  private isInstalledPwa(): boolean {
    const mq = window.matchMedia?.('(display-mode: standalone)');
    if (mq?.matches) {
      return true;
    }
    // iOS Safari
    return (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  }

  private isDismissedWithinCooldown(): boolean {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return false;
    }
    const dismissedAt = parseInt(raw, 10);
    if (Number.isNaN(dismissedAt)) {
      return false;
    }
    const cooldownMs = COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - dismissedAt < cooldownMs;
  }

  private detectBrowserHint(): 'chrome-edge' | 'safari-ios' | 'safari-macos' | 'firefox' | 'generic' {
    const ua = navigator.userAgent || '';
    const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android).)*safari/i.test(ua) || /iPhone|iPad|iPod/.test(ua);

    if (isIOS && isSafari) {
      return 'safari-ios';
    }
    if (/Macintosh/.test(ua) && isSafari && !/Chrome|CriOS|FxiOS|Edg/.test(ua)) {
      return 'safari-macos';
    }
    if (/Firefox/i.test(ua)) {
      return 'firefox';
    }
    if (/Chrome|Edg|OPR|SamsungBrowser/i.test(ua)) {
      return 'chrome-edge';
    }
    return 'generic';
  }
}
