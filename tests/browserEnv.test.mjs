import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inAppBrowser,platformOf,iosBrowser,chromeIntentUrl,iosOpenUrls,isStandalone} from '../src/data/browserEnv.mjs';

const UA={
 zaloAndroid:'Mozilla/5.0 (Linux; Android 13; SM-A536E Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.100 Mobile Safari/537.36 Zalo android/12100587 ZaloTheme/light ZaloLanguage/vi',
 zaloIos:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Zalo iOS/24.07.01 ZaloTheme/light ZaloLanguage/vi',
 fbAndroid:'Mozilla/5.0 (Linux; Android 14; Pixel 7; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.0;]',
 messengerIos:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/MessengerForiOS;FBAV/455.0]',
 chromeAndroid:'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36',
 safariIphone:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
 chromeIphone:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1',
 ipadDesktop:'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
 windows:'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
};
test('In-app browsers are recognised; real browsers are left alone',()=>{
 assert.equal(inAppBrowser(UA.zaloAndroid),'Zalo');assert.equal(inAppBrowser(UA.zaloIos),'Zalo');
 assert.equal(inAppBrowser(UA.fbAndroid),'Facebook');assert.equal(inAppBrowser(UA.messengerIos),'Messenger');
 for(const k of ['chromeAndroid','safariIphone','chromeIphone','ipadDesktop','windows'])assert.equal(inAppBrowser(UA[k]),null,k);
});
test('Platform and iOS browser',()=>{
 assert.equal(platformOf(UA.zaloAndroid),'android');assert.equal(platformOf(UA.zaloIos),'ios');
 assert.equal(platformOf(UA.ipadDesktop,5),'ios','iPadOS with a Mac user agent');assert.equal(platformOf(UA.ipadDesktop,0),'other');
 assert.equal(platformOf(UA.windows),'other');
 assert.equal(iosBrowser(UA.chromeIphone),'chrome');assert.equal(iosBrowser(UA.safariIphone),'safari');
});
test('Open-in links keep the exact page (path + query) and fall back to the normal link',()=>{
 const href='https://mrbin2026dh-droid.github.io/phongtruyenthong/?nguon=zalo';
 const intent=chromeIntentUrl(href);
 assert.ok(intent.startsWith('intent://mrbin2026dh-droid.github.io/phongtruyenthong/?nguon=zalo#Intent;scheme=https;package=com.android.chrome;'));
 assert.ok(intent.endsWith('S.browser_fallback_url='+encodeURIComponent(href)+';end'));
 assert.deepEqual(iosOpenUrls(href),{safari:'x-safari-https://mrbin2026dh-droid.github.io/phongtruyenthong/?nguon=zalo',chrome:'googlechromes://mrbin2026dh-droid.github.io/phongtruyenthong/?nguon=zalo'});
});
test('Installed app detection',()=>{
 const win=(fs,sa,nav={})=>({matchMedia:q=>({matches:q.includes('fullscreen')?fs:sa}),navigator:nav});
 assert.equal(isStandalone(win(true,false)),true);assert.equal(isStandalone(win(false,true)),true);
 assert.equal(isStandalone(win(false,false,{standalone:true})),true,'iOS home-screen app');
 assert.equal(isStandalone(win(false,false)),false);assert.equal(isStandalone({}),false);
});
test('Wiring: in-app screen first on the public site, install button, update bar outside the room, kill-switch off',()=>{
 const r=f=>readFileSync(new URL('../src/'+f,import.meta.url),'utf8');
 const app=r('PeopleApp.tsx'),welcome=r('components/Welcome.tsx'),main=r('main.tsx'),imm=r('data/immersive.ts'),inst=r('components/InstallApp.tsx');
 const cfg=readFileSync(new URL('../vite.config.js',import.meta.url),'utf8');
 assert.ok(app.includes('if(!minimal)return null;')&&app.includes('if(openIn)return <OpenInBrowser'));
 assert.ok(app.includes("{view!=='room'&&<UpdateBar/>}"),'never reload in the middle of a visit');
 assert.ok(welcome.includes('{minimal&&<InstallApp/>}')&&inst.includes('if(pwa.installed||inAppBrowser(ua))return null;'));
 assert.ok(main.includes('onNeedRefresh:markNeedRefresh')&&main.includes('setInterval(check,60*60*1000)'));
 assert.ok(imm.includes('!isStandalone(window)'));
 assert.ok(r('components/OpenInBrowser.tsx').includes("u.searchParams.delete('xem-thu')"),'handed-over link never re-opens the preview');
 assert.ok(cfg.includes('selfDestroying:false,'),'kill-switch prepared but off');
});
