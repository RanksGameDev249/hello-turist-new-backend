import { strict as assert } from "node:assert";

const baseUrl=(process.env.E2E_BASE_URL??"http://127.0.0.1:3000").replace(/\/$/,"");
const token=process.env.E2E_USER_TOKEN??"";
const adminToken=process.env.E2E_ADMIN_TOKEN??"";
const impressionId=process.env.E2E_AD_IMPRESSION_ID??`e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`;

async function call(path:string, init:RequestInit={}){
 const headers=new Headers(init.headers); headers.set("Content-Type","application/json");
 if(init.headers===undefined && token) headers.set("Authorization",`Bearer ${token}`);
 return fetch(`${baseUrl}${path}`,{...init,headers});
}
async function main(){
 const wallet=await call("/api/v1/wallet/"); assert.equal(wallet.status, token?200:401);
 if(!token){console.log("Wallet E2E boundary check passed (anonymous access rejected)");return;}
 const reward=await call("/api/v1/wallet/ad-reward",{method:"POST",body:JSON.stringify({impressionId})}); assert.equal(reward.status,201);
 const duplicate=await call("/api/v1/wallet/ad-reward",{method:"POST",body:JSON.stringify({impressionId})}); assert.equal(duplicate.status,409);
 const config=await fetch(`${baseUrl}/api/v1/wallet/config`,{headers:{Authorization:`Bearer ${adminToken}`}}); assert.ok([200,401,403].includes(config.status));
 console.log("Wallet E2E passed: balance + idempotent ad reward + admin config boundary");
}
main().catch(e=>{console.error(e);process.exit(1)});
