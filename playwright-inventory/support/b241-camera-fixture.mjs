// Chromium generates video frames internally. No physical camera or microphone.
export const cameraArgs=['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream'];
export function b241CameraInit(mode){
 if(location.pathname!=='/scanner')return;
 const media=navigator.mediaDevices;if(!media?.getUserMedia)throw Error('Controlled Chromium mediaDevices missing');
 const native=media.getUserMedia.bind(media),tracks=new Set();let attempted=0,denied=0,unexpected=0,peak=0;
 const active=()=>[...tracks].filter(t=>t.readyState==='live').length;
 Object.defineProperty(media,'getUserMedia',{configurable:true,value:async constraints=>{
   attempted++;
   if(mode==='denied'||constraints?.audio||!constraints?.video){denied++;throw new DOMException('Controlled camera permission denied','NotAllowedError');}
   const stream=await native({...constraints,audio:false});
   const video=stream.getVideoTracks();
   if(video.length!==1||stream.getAudioTracks().length||!/^fake[_ -]?device/i.test(video[0].label)){
     unexpected++;stream.getTracks().forEach(t=>t.stop());throw new DOMException('Expected Chromium fake video device only','NotAllowedError');
   }
   video.forEach(t=>tracks.add(t));peak=Math.max(peak,active());return stream;
 }});
 Object.defineProperty(window,'__b241CameraState',{value:()=>({attempted,denied,unexpected,active:active(),peak,ended:[...tracks].filter(t=>t.readyState==='ended').length})});
}
