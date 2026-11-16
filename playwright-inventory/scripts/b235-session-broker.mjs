import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';

// One isolated CI job, one worker at any instant. The private Unix socket
// conveys memory-only authentication state. No credential/session file exists.
export async function startBroker() {
  const dir=fs.mkdtempSync(path.join(process.env.RUNNER_TEMP||os.tmpdir(),'b235-session-'));
  fs.chmodSync(dir,0o700);
  const socketPath=path.join(dir,'session.sock');
  let state=null;
  const server=http.createServer((req,res)=>{
    const respond=(code,value)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    if(req.url!=='/session')return respond(404,null);
    if(req.method==='GET')return respond(200,state);
    if(req.method!=='PUT')return respond(405,null);
    let body='';
    req.setEncoding('utf8');
    req.on('data',chunk=>{body+=chunk;if(body.length>512000)req.destroy();});
    req.on('end',()=>{
      try {
        const v=JSON.parse(body);
        assert(Number.isFinite(v.lastLoginAt)&&v.lastLoginAt<=Date.now()&&v.lastLoginAt>0);
        assert(Array.isArray(v.snapshot.cookies)&&Array.isArray(v.snapshot.origins));
        state=v;respond(200,null);
      }catch{respond(400,null);}
    });
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(socketPath,resolve);});
  fs.chmodSync(socketPath,0o600);
  return {socketPath,close:async()=>{state=null;await new Promise(resolve=>server.close(resolve));fs.rmdirSync(dir);}};
}
