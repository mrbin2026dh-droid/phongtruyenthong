// 16/11 (PWA P4 + user request): links shared in Zalo/Facebook open inside the app's own browser, where the 3D visit
// is weaker and the site cannot be installed. These pure helpers (tests/browserEnv.test.mjs) decide what to offer.

/** Name of the in-app browser, or null for a normal browser. */
export function inAppBrowser(ua=''){
 if(/Zalo/i.test(ua))return 'Zalo';
 if(/FBAN\/Messenger|MessengerForiOS|FB_IAB\/MESSENGER/i.test(ua))return 'Messenger';
 if(/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua))return 'Facebook';
 if(/Instagram/i.test(ua))return 'Instagram';
 if(/musical_ly|BytedanceWebview|TikTok/i.test(ua))return 'TikTok';
 if(/\bLine\//.test(ua))return 'LINE';
 if(/Android/i.test(ua)&&/;\s*wv\)/.test(ua))return 'ứng dụng này';   // other Android WebView
 return null;
}

/** 'android' | 'ios' | 'other'. iPadOS reports a Mac user agent — told apart by its touch screen. */
export function platformOf(ua='',maxTouchPoints=0){
 if(/Android/i.test(ua))return 'android';
 if(/iPhone|iPad|iPod/i.test(ua)||(/Macintosh/.test(ua)&&maxTouchPoints>1))return 'ios';
 return 'other';
}

/** Which browser runs on iOS (all use Safari's engine; Chrome iOS can install to the home screen since iOS 16.4). */
export function iosBrowser(ua=''){
 if(/CriOS/.test(ua))return 'chrome';
 if(/FxiOS|EdgiOS|OPiOS/.test(ua))return 'other';
 return 'safari';
}

/** Android: open the same page in Chrome; if Chrome is missing the system falls back to the normal https link. */
export function chromeIntentUrl(href){
 const u=new URL(href);
 return 'intent://'+u.host+u.pathname+u.search+u.hash.replace(/#/g,'%23')+'#Intent;scheme='+u.protocol.replace(':','')
  +';package=com.android.chrome;S.browser_fallback_url='+encodeURIComponent(href)+';end';
}

/** iOS: Safari (x-safari-https, iOS 17+) and Chrome (googlechromes://, only if installed). */
export function iosOpenUrls(href){
 const u=new URL(href),rest=u.host+u.pathname+u.search+u.hash,secure=u.protocol==='https:';
 return {safari:'x-safari-'+u.protocol+'//'+rest,chrome:(secure?'googlechromes://':'googlechrome://')+rest};
}

/** Already running as an installed app (home-screen icon). */
export function isStandalone(win){
 try{return Boolean(win.matchMedia('(display-mode: fullscreen)').matches||win.matchMedia('(display-mode: standalone)').matches||win.navigator.standalone);}
 catch{return false;}
}
