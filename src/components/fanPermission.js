let automaticRequest, gestureRequest;
async function request() {
  if(!window.isSecureContext || !window.DeviceMotionEvent)return 'unavailable';
  if(typeof window.DeviceMotionEvent.requestPermission!=='function')return 'granted';
  try{return await window.DeviceMotionEvent.requestPermission();}
  catch{return 'gesture';}
}
// Share pending requests through React Strict Mode, and never repeatedly prompt.
export function requestFanPermission(gesture=false) {
  if(gesture){gestureRequest ||= request();return gestureRequest;}
  automaticRequest ||= request();return automaticRequest;
}
