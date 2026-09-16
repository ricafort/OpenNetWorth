const fs = require('fs');
const base = 'http://localhost:4007/api/accounting';
async function post(body) { const r = await fetch(base, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); const j = await r.json(); if(!r.ok) throw Error(JSON.stringify(j)); return j; }
(async () => {
 const state=await (await fetch(base)).json();
 const person=state.entities.find(e=>e.name==='TEST Alex').id;
 const business=state.entities.find(e=>e.name==='TEST Alex Business').id;
 const ids={person,business,everyday:state.accounts.find(a=>a.name==='TEST Everyday').id};
 for(const [key,name,type,sub_type,currency,balance,owner] of [
 ['savings','TEST Savings','asset','savings','AUD',50000,person],
 ['card','TEST Credit Card','liability','credit_card','AUD',30000,person],
 ['loan','TEST Mortgage','liability','mortgage','AUD',20000000,person],
 ['home','TEST Home','asset','property','AUD',30000000,person],
 ['businessBank','TEST Business Bank','asset','checking','AUD',50000,business],
 ['jpy','TEST Yen','asset','checking','JPY',10000,person],
 ['usd','TEST USD','asset','checking','USD',100000,person],
 ['starter','TEST Household CSV','asset','checking','AUD',100000,person]
 ]) { ids[key]=(await post({action:'create_account',account:{entity_id:owner,name,type,sub_type,currency,opening_date:'2025-06-30',opening_balance_cents:balance}})).account.id; }
 fs.writeFileSync(__dirname+'/fixture.json',JSON.stringify(ids,null,2));
 console.log(ids);
})();
