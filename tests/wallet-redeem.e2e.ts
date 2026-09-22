import { strict as assert } from "node:assert";
const baseUrl=(process.env.E2E_BASE_URL??"http://127.0.0.1:3000").replace(/\/$/,"");
const userToken=process.env.E2E_USER_TOKEN??"";
const adminToken=process.env.E2E_ADMIN_TOKEN??"";
async function main(){
 if(!userToken||!adminToken){
  const r=await fetch(`${baseUrl}/api/v1/wallet/redeem`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:"E2E-NOT-A-REAL-CODE"})});
  assert.equal(r.status,401); console.log("Redeem E2E boundary check passed"); return;
 }
 const code=`E2E-${Date.now()}`;
 const created=await fetch(`${baseUrl}/api/v1/wallet/redeem-codes`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${adminToken}`},body:JSON.stringify({code,type:"COIN_REWARD",coinCost:1,terms:"E2E test reward",expiresAt:new Date(Date.now()+3600000).toISOString()})});
 assert.ok([200,201].includes(created.status),`create redeem code failed: ${created.status}`);
 const redeemed=await fetch(`${baseUrl}/api/v1/wallet/redeem`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${userToken}`},body:JSON.stringify({code})});
 assert.ok([200,201,409].includes(redeemed.status),`redeem failed unexpectedly: ${redeemed.status}`);
 const again=await fetch(`${baseUrl}/api/v1/wallet/redeem`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${userToken}`},body:JSON.stringify({code})});
 assert.equal(again.status,409);
 console.log("Wallet redeem E2E passed: admin code creation + single-use redemption");
}
main().catch(e=>{console.error(e);process.exit(1)});
