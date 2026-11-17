import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {cameraArgs,b241CameraInit} from '../support/b241-camera-fixture.mjs';
const browser=await chromium.launch({headless:true,args:cameraArgs});
try{
 for(const mode of ['denied','fake']){
  const context=await browser.newContext({serviceWorkers:'block'});
  try{
   await context.route('**/*',r=>r.request().url()==='https://camera-fixture.invalid/scanner'?r.fulfill({contentType:'text/html',body:'<html>Local fixture only</html>'}):r.abort());
   await context.addInitScript(b241CameraInit,mode);
   const page=await context.newPage();await page.goto('https://camera-fixture.invalid/scanner');
   const result=await page.evaluate(async()=>{
    try{const stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});const running=window.__b241CameraState();stream.getTracks().forEach(t=>t.stop());return{running,stopped:window.__b241CameraState()};}
    catch(error){return{name:error.name,state:window.__b241CameraState()};}
   });
   if(mode==='denied'){assert.equal(result.name,'NotAllowedError');assert.equal(result.state.denied,1);assert.equal(result.state.active,0);}
   else{assert.equal(result.running?.active,1);assert.equal(result.running?.unexpected,0);assert.equal(result.stopped?.active,0);assert.equal(result.stopped?.ended,1);}
  }finally{await context.close();}
 }
 console.log('PASS B241 controlled browser fixture: permission rejection, Chromium fake video stream, real track stop; no live network.');
}finally{await browser.close();}
