module.exports=[384183,810234,844488,e=>{"use strict";let t={USD:2,AUD:2,EUR:2,GBP:2,CAD:2,NZD:2,CHF:2,JPY:0,SGD:2,HKD:2};function n(e,t="Amount"){if(!Number.isFinite(e)||!Number.isInteger(e)||!Number.isSafeInteger(e))throw Error(`${t} must be a safe, finite integer representing minor currency units (cents), received: ${e}`)}function a(e){let n=t[e.currency]??2,a=Math.pow(10,n),i=e.amount_cents/a;return new Intl.NumberFormat("en-US",{style:"currency",currency:e.currency,minimumFractionDigits:n,maximumFractionDigits:n}).format(i)}function i(e){if(!e||e.length<2)throw Error("Transaction must contain at least two postings to satisfy double-entry accounting.");let t=e[0].currency,a=0;for(let i of e){if(i.currency!==t)throw Error(`Cross-currency postings within a single un-hedged transaction are not supported in Milestone 1: encountered ${i.currency} vs ${t}.`);n(i.amount_cents,"Posting amount"),a+=i.amount_cents}return{isValid:0===a,delta_cents:a,currency:t}}e.s(["CURRENCY_DECIMALS",0,t,"assertValidMoneyCents",()=>n,"formatMoney",()=>a,"validateTransactionBalance",()=>i],810234);class r extends Error{constructor(e){super(e),this.name="ConflictError"}}class o extends Error{constructor(e){super(e),this.name="ValidationError"}}function c(e,t){if(!t.name||0===t.name.trim().length)throw new o("Entity name is required and cannot be blank.");let n=["person","household","business","trust"];if(!n.includes(t.type))throw new o(`Invalid entity type: ${t.type}. Must be one of: ${n.join(", ")}`);let a=(t.currency||"USD").toUpperCase(),i=t.id||crypto.randomUUID(),r=new Date().toISOString();return e.prepare(`
        INSERT INTO m1_entities (id, name, type, currency, parent_entity_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(i,t.name.trim(),t.type,a,t.parent_entity_id||null,r,r),{id:i,name:t.name.trim(),type:t.type,currency:a,parent_entity_id:t.parent_entity_id||null,created_at:r,updated_at:r}}function s(e){return e.prepare("SELECT * FROM m1_entities ORDER BY name ASC").all().map(e=>({id:e.id,name:e.name,type:e.type,currency:e.currency,parent_entity_id:e.parent_entity_id,created_at:e.created_at,updated_at:e.updated_at}))}function _(e,t){let n=e.prepare("SELECT * FROM m1_entities WHERE id = ?").get(t);return n?{id:n.id,name:n.name,type:n.type,currency:n.currency,parent_entity_id:n.parent_entity_id,created_at:n.created_at,updated_at:n.updated_at}:null}function d(e,t){let a,r;if(!t.name||0===t.name.trim().length)throw new o("Account name is required and cannot be blank.");if(!_(e,t.entity_id))throw new o(`Entity not found with ID: ${t.entity_id}`);let c=["asset","liability","equity","income","expense","suspense"];if(!c.includes(t.type))throw new o(`Invalid account type: ${t.type}. Must be one of: ${c.join(", ")}`);let s=t.currency.toUpperCase(),d=t.id||crypto.randomUUID(),u=new Date().toISOString(),p=void 0!==t.opening_balance_cents&&null!==t.opening_balance_cents&&0!==t.opening_balance_cents;if(p&&(n(t.opening_balance_cents,"Opening balance cents"),!t.opening_date||!/^\d{4}-\d{2}-\d{2}$/.test(t.opening_date)))throw new o("A valid opening date (YYYY-MM-DD) is required when specifying an opening balance.");return e.transaction(()=>{if(e.prepare(`
            INSERT INTO m1_accounts (
                id, entity_id, name, type, sub_type, currency, is_active,
                institution, account_number_mask, opening_date, opening_balance_cents,
                revision, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, 1, ?, ?)
        `).run(d,t.entity_id,t.name.trim(),t.type,t.sub_type,s,t.institution||null,t.account_number_mask||null,t.opening_date||null,p?t.opening_balance_cents:null,u,u),a={id:d,entity_id:t.entity_id,name:t.name.trim(),type:t.type,sub_type:t.sub_type,currency:s,is_active:!0,institution:t.institution||null,account_number_mask:t.account_number_mask||null,opening_date:t.opening_date||null,opening_balance_cents:p?t.opening_balance_cents:null,revision:1,created_at:u,updated_at:u},p){let n=function(e,t,n){let a=e.prepare(`
        SELECT * FROM m1_accounts
        WHERE entity_id = ? AND type = 'equity' AND sub_type = 'opening_balance_equity' AND currency = ?
    `).get(t,n);if(a)return{id:a.id,entity_id:a.entity_id,name:a.name,type:a.type,sub_type:a.sub_type,currency:a.currency,is_active:!!a.is_active,institution:a.institution,account_number_mask:a.account_number_mask,opening_date:a.opening_date,opening_balance_cents:a.opening_balance_cents,revision:a.revision,created_at:a.created_at,updated_at:a.updated_at};let i=`acc-equity-${t}-${n.toLowerCase()}`,r=new Date().toISOString();return e.prepare(`
        INSERT INTO m1_accounts (id, entity_id, name, type, sub_type, currency, is_active, revision, created_at, updated_at)
        VALUES (?, ?, 'Opening Balance Equity', 'equity', 'opening_balance_equity', ?, 1, 1, ?, ?)
    `).run(i,t,n,r,r),{id:i,entity_id:t,name:"Opening Balance Equity",type:"equity",sub_type:"opening_balance_equity",currency:n,is_active:!0,revision:1,created_at:r,updated_at:r}}(e,t.entity_id,s),a=`tx-open-${d}`,o=t.opening_date,c=t.opening_balance_cents,_="asset"===t.type,p=[{id:`post-acc-${d}`,transaction_id:a,account_id:d,amount_cents:_?c:-c,currency:s,memo:`Opening Balance for ${t.name.trim()}`},{id:`post-eq-${d}`,transaction_id:a,account_id:n.id,amount_cents:_?-c:c,currency:s,memo:`Opening Balance Offset for ${t.name.trim()}`}];i(p),e.prepare(`
                INSERT INTO m1_transactions (
                    id, date, description, status, origin, idempotency_key, revision, created_at, updated_at
                ) VALUES (?, ?, ?, 'posted', 'opening_balance', ?, 1, ?, ?)
            `).run(a,o,`Opening Balance - ${t.name.trim()}`,`idemp-open-${d}`,u,u);let m=e.prepare(`
                INSERT INTO m1_journal_entries (id, transaction_id, account_id, amount_cents, currency, memo)
                VALUES (?, ?, ?, ?, ?, ?)
            `);for(let e of p)m.run(e.id,e.transaction_id,e.account_id,e.amount_cents,e.currency,e.memo||null);r={id:a,date:o,description:`Opening Balance - ${t.name.trim()}`,status:"posted",origin:"opening_balance",idempotency_key:`idemp-open-${d}`,revision:1,created_at:u,updated_at:u}}})(),{account:a,openingTransaction:r}}function u(e,t,n,a){let i=e.prepare("SELECT * FROM m1_accounts WHERE id = ?").get(t);if(!i)throw new o(`Account not found with ID: ${t}`);let c=new Date().toISOString(),s=void 0!==a.name?a.name.trim():i.name,_=void 0!==a.sub_type?a.sub_type:i.sub_type,d=void 0!==a.institution?a.institution:i.institution,u=void 0!==a.account_number_mask?a.account_number_mask:i.account_number_mask,p=void 0!==a.is_active?+!!a.is_active:i.is_active;if(0===e.prepare(`
        UPDATE m1_accounts
        SET name = ?, sub_type = ?, institution = ?, account_number_mask = ?, is_active = ?, revision = revision + 1, updated_at = ?
        WHERE id = ? AND revision = ?
    `).run(s,_,d,u,p,c,t,n).changes)throw new r(`Account update failed due to stale revision (expected revision ${n}). Another update has occurred.`);return{id:i.id,entity_id:i.entity_id,name:s,type:i.type,sub_type:_,currency:i.currency,is_active:!!p,institution:d,account_number_mask:u,opening_date:i.opening_date,opening_balance_cents:i.opening_balance_cents,revision:n+1,created_at:i.created_at,updated_at:c}}function p(e,t){return(t?e.prepare("SELECT * FROM m1_accounts WHERE entity_id = ? ORDER BY type ASC, name ASC").all(t):e.prepare("SELECT * FROM m1_accounts ORDER BY type ASC, name ASC").all()).map(e=>({id:e.id,entity_id:e.entity_id,name:e.name,type:e.type,sub_type:e.sub_type,currency:e.currency,is_active:!!e.is_active,institution:e.institution,account_number_mask:e.account_number_mask,opening_date:e.opening_date,opening_balance_cents:e.opening_balance_cents,revision:e.revision,created_at:e.created_at,updated_at:e.updated_at}))}function m(e,t,n){let a=e.prepare("SELECT id, name, entity_id FROM m1_accounts WHERE id = ?").get(t);if(!a)throw new o(`Account not found: ${t}`);if(!n||0===n.length)return e.prepare("DELETE FROM m1_account_ownership WHERE account_id = ?").run(t),[];let i=0,r=e.prepare("SELECT id, name FROM m1_entities WHERE id = ?"),c=new Set;for(let e of n){if(!e.entity_id)throw new o("Entity ID is required for each ownership allocation.");if(c.has(e.entity_id))throw new o(`Duplicate entity in ownership allocation: ${e.entity_id}`);if(c.add(e.entity_id),!r.get(e.entity_id))throw new o(`Entity not found for ownership allocation: ${e.entity_id}`);let t=void 0!==e.ownership_percentage?e.ownership_percentage:e.share_percentage;if("number"!=typeof t||!Number.isFinite(t))throw new o(`Invalid share percentage: "${t}". Must be a valid number.`);if(t<=0||t>100)throw new o(`Share percentage must be between 0 and 100 (exclusive of 0), received: ${t}%.`);i+=t}if(i>100.0001)throw new o(`Total ownership percentage cannot exceed 100%, calculated: ${i}%.`);if(n.some(e=>e.entity_id===a.entity_id)&&i<99.9999)throw new o(`Ambiguous ownership allocation: The primary account owner "${a.entity_id}" is explicitly specified, but total allocations sum to ${i}% (less than 100%). When the primary owner is explicitly specified, total allocations must equal 100%.`);let s=new Date().toISOString(),_=[];return e.transaction(()=>{e.prepare("DELETE FROM m1_account_ownership WHERE account_id = ?").run(t);let a=e.prepare(`
            INSERT INTO m1_account_ownership (id, account_id, entity_id, share_percentage, created_at)
            VALUES (?, ?, ?, ?, ?)
        `);for(let e of n){let n=crypto.randomUUID(),i=void 0!==e.ownership_percentage?e.ownership_percentage:e.share_percentage;a.run(n,t,e.entity_id,i,s),_.push({id:n,account_id:t,entity_id:e.entity_id,share_percentage:i,ownership_percentage:i,created_at:s})}})(),_}function E(e,t){return e.prepare(`
        SELECT * FROM m1_account_ownership WHERE account_id = ? ORDER BY share_percentage DESC
    `).all(t).map(e=>({id:e.id,account_id:e.account_id,entity_id:e.entity_id,share_percentage:e.share_percentage,ownership_percentage:e.share_percentage,created_at:e.created_at}))}function l(e,t){return e.prepare(`
        SELECT * FROM m1_entities WHERE id = ? OR parent_entity_id = ? ORDER BY type DESC, name ASC
    `).all(t,t).map(e=>({id:e.id,name:e.name,type:e.type,currency:e.currency,parent_entity_id:e.parent_entity_id,created_at:e.created_at,updated_at:e.updated_at}))}function y(e,t="Date"){if(!e||"string"!=typeof e||!/^\d{4}-\d{2}-\d{2}$/.test(e))throw new o(`${t} must be a valid date in YYYY-MM-DD format, received: "${e}".`);let[n,a,i]=e.split("-").map(Number),r=new Date(Date.UTC(n,a-1,i));if(isNaN(r.getTime())||r.getUTCFullYear()!==n||r.getUTCMonth()+1!==a||r.getUTCDate()!==i)throw new o(`${t} is not a valid calendar date: "${e}".`)}function T(e,t,n="living_expense",a="USD"){let i=a.toUpperCase(),r=e.prepare(`
        SELECT * FROM m1_accounts
        WHERE entity_id = ? AND type = 'expense' AND sub_type = ? AND currency = ?
    `).get(t,n,i);if(r)return{id:r.id,entity_id:r.entity_id,name:r.name,type:r.type,sub_type:r.sub_type,currency:r.currency,is_active:!!r.is_active,institution:r.institution,account_number_mask:r.account_number_mask,opening_date:r.opening_date,opening_balance_cents:r.opening_balance_cents,revision:r.revision,created_at:r.created_at,updated_at:r.updated_at};let o=`acc-exp-${t}-${n}-${i.toLowerCase()}`,c=n.replace(/_/g," ").replace(/\b\w/g,e=>e.toUpperCase()),s=new Date().toISOString();return e.prepare(`
        INSERT INTO m1_accounts (id, entity_id, name, type, sub_type, currency, is_active, revision, created_at, updated_at)
        VALUES (?, ?, ?, 'expense', ?, ?, 1, 1, ?, ?)
    `).run(o,t,c,n,i,s,s),{id:o,entity_id:t,name:c,type:"expense",sub_type:n,currency:i,is_active:!0,revision:1,created_at:s,updated_at:s}}function N(e,t,n="salary",a="USD"){let i=a.toUpperCase(),r=e.prepare(`
        SELECT * FROM m1_accounts
        WHERE entity_id = ? AND type = 'income' AND sub_type = ? AND currency = ?
    `).get(t,n,i);if(r)return{id:r.id,entity_id:r.entity_id,name:r.name,type:r.type,sub_type:r.sub_type,currency:r.currency,is_active:!!r.is_active,institution:r.institution,account_number_mask:r.account_number_mask,opening_date:r.opening_date,opening_balance_cents:r.opening_balance_cents,revision:r.revision,created_at:r.created_at,updated_at:r.updated_at};let o=`acc-inc-${t}-${n}-${i.toLowerCase()}`,c=n.replace(/_/g," ").replace(/\b\w/g,e=>e.toUpperCase()),s=new Date().toISOString();return e.prepare(`
        INSERT INTO m1_accounts (id, entity_id, name, type, sub_type, currency, is_active, revision, created_at, updated_at)
        VALUES (?, ?, ?, 'income', ?, ?, 1, 1, ?, ?)
    `).run(o,t,c,n,i,s,s),{id:o,entity_id:t,name:c,type:"income",sub_type:n,currency:i,is_active:!0,revision:1,created_at:s,updated_at:s}}function f(e){return(e??"").trim()}function g(e){return e&&Array.isArray(e)?JSON.stringify(Array.from(new Set(e.map(e=>(function(e){if(null==e)return"";if("string"==typeof e){let t=e.trim();return t?JSON.stringify({ref:t,type:"legacy"}):""}if("object"==typeof e){let t=String(e.document_id??e.documentId??"").trim(),n=String(e.content_hash??e.contentHash??"").trim(),a="number"==typeof e.page&&Number.isFinite(e.page)?e.page:e.page?Number(e.page):null,i=null,r=e.bounding_box||e.bbox;Array.isArray(r)&&4===r.length&&r.every(e=>"number"==typeof e&&Number.isFinite(e))&&(i=[r[0],r[1],r[2],r[3]]);let o=e.table_or_cell_ref?String(e.table_or_cell_ref).trim():null;return JSON.stringify({bounding_box:i,content_hash:n,document_id:t,label:(e.label?String(e.label).trim():null)||null,page:a,table_or_cell_ref:o||null,type:"structured"})}return""})(e)).filter(Boolean))).sort()):"[]"}function v(e,t){let a;if(!t.description||0===t.description.trim().length)throw new o("Transaction description is required.");if(y(t.date,"Transaction date"),!t.postings||t.postings.length<2)throw new o("A transaction must have at least two postings to satisfy double-entry balance.");let c=t.id||crypto.randomUUID(),s=new Date().toISOString(),_=t.postings.map(e=>(n(e.amount_cents,`Posting for account ${e.account_id}`),{id:e.id||crypto.randomUUID(),transaction_id:c,account_id:e.account_id,amount_cents:e.amount_cents,currency:e.currency.toUpperCase(),memo:e.memo||null})),d=i(_);if(!d.isValid)throw new o(`Transaction out of balance by ${d.delta_cents} cents. Sum of postings must equal zero.`);let u=e.prepare("SELECT id, name, currency, type, entity_id FROM m1_accounts WHERE id = ?"),p=null;for(let e of _){let t=u.get(e.account_id);if(!t)throw new o(`Account does not exist: ${e.account_id}`);if(e.currency!==t.currency)throw new o(`Posting currency "${e.currency}" does not match account currency "${t.currency}" for account "${t.name}".`);if(null===p)p=t.entity_id;else if(p!==t.entity_id)throw new o(`Cross-entity transaction rejected: Account "${t.name}" belongs to entity "${t.entity_id}", while other postings in this transaction belong to entity "${p}". In Slice 1C, all postings in a transaction must belong to the same sovereign entity.`)}if(t.idempotency_key){let n=e.prepare("SELECT * FROM m1_transactions WHERE idempotency_key = ?").get(t.idempotency_key);if(n){let a=e.prepare("SELECT * FROM m1_journal_entries WHERE transaction_id = ?").all(n.id),i=n.date===t.date,o=f(n.description)===f(t.description),c=f(n.payee_or_payer)===f(t.payee_or_payer);g(n.evidence_refs?JSON.parse(n.evidence_refs):[]),g(t.evidence_refs);let s=a.length===_.length;if(s){let e=new Set;for(let t of _){let n=a.find(n=>!e.has(n.id)&&n.account_id===t.account_id&&n.amount_cents===t.amount_cents&&n.currency===t.currency);if(!n){s=!1;break}e.add(n.id)}}if(i&&o&&c&&s)return{id:n.id,date:n.date,description:n.description,payee_or_payer:n.payee_or_payer,status:n.status,origin:n.origin,idempotency_key:n.idempotency_key,evidence_refs:n.evidence_refs?JSON.parse(n.evidence_refs):null,revision:n.revision,created_at:n.created_at,updated_at:n.updated_at,postings:a.map(e=>({id:e.id,transaction_id:e.transaction_id,account_id:e.account_id,amount_cents:e.amount_cents,currency:e.currency,memo:e.memo}))};throw new r(`Idempotency conflict: A transaction with idempotency key "${t.idempotency_key}" already exists with different financial or material details.`)}}return e.transaction(()=>{e.prepare(`
            INSERT INTO m1_transactions (
                id, date, description, payee_or_payer, status, origin,
                idempotency_key, evidence_refs, revision, created_at, updated_at
            ) VALUES (?, ?, ?, ?, 'posted', ?, ?, ?, 1, ?, ?)
        `).run(c,t.date,t.description.trim(),t.payee_or_payer?t.payee_or_payer.trim():null,t.origin||"manual",t.idempotency_key||null,t.evidence_refs?JSON.stringify(t.evidence_refs):null,s,s);let n=e.prepare(`
            INSERT INTO m1_journal_entries (id, transaction_id, account_id, amount_cents, currency, memo)
            VALUES (?, ?, ?, ?, ?, ?)
        `);for(let e of _)n.run(e.id,e.transaction_id,e.account_id,e.amount_cents,e.currency,e.memo);a={id:c,date:t.date,description:t.description.trim(),payee_or_payer:t.payee_or_payer?t.payee_or_payer.trim():null,status:"posted",origin:t.origin||"manual",idempotency_key:t.idempotency_key||null,evidence_refs:t.evidence_refs||null,revision:1,created_at:s,updated_at:s,postings:_}})(),a}function O(e,t){if(y(t.date,"Income date"),n(t.amount_cents,"Income amount"),t.amount_cents<=0)throw new o("Income amount must be greater than zero cents.");return e.transaction(()=>{let n=e.prepare("SELECT * FROM m1_accounts WHERE id = ?").get(t.bank_account_id);if(!n)throw new o(`Bank account not found: ${t.bank_account_id}`);if("asset"!==n.type||!["checking","savings","cash"].includes(n.sub_type))throw new o(`Deposit account must be a liquid asset account (checking, savings, cash), received type: "${n.type}", sub_type: "${n.sub_type}".`);if(n.entity_id!==t.entity_id)throw new o(`Bank account "${n.name}" does not belong to entity "${t.entity_id}".`);let a=t.income_account_id;if(a){let i=e.prepare("SELECT * FROM m1_accounts WHERE id = ?").get(a);if(!i)throw new o(`Income account not found: ${a}`);if("income"!==i.type)throw new o(`Income account must have type 'income', received: "${i.type}".`);if(i.entity_id!==t.entity_id)throw new o(`Income account "${i.name}" does not belong to entity "${t.entity_id}".`);if(i.currency!==n.currency)throw new o(`Income account currency (${i.currency}) must match bank account currency (${n.currency}).`)}else a=N(e,t.entity_id,t.category||"salary",n.currency).id;let i=n.currency;return v(e,{date:t.date,description:t.description,payee_or_payer:t.payer,origin:"manual",idempotency_key:t.idempotency_key,evidence_refs:t.evidence_refs,postings:[{account_id:n.id,amount_cents:t.amount_cents,currency:i,memo:`Deposit from ${t.payer||"Income"}`},{account_id:a,amount_cents:-t.amount_cents,currency:i,memo:t.description}]})})()}function L(e,t){if(y(t.date,"Expense date"),n(t.amount_cents,"Expense amount"),t.amount_cents<=0)throw new o("Expense amount must be greater than zero cents.");return e.transaction(()=>{let n=e.prepare("SELECT * FROM m1_accounts WHERE id = ?").get(t.payment_account_id);if(!n)throw new o(`Payment account not found: ${t.payment_account_id}`);if(!("asset"===n.type&&["checking","savings","cash"].includes(n.sub_type)||"liability"===n.type&&"credit_card"===n.sub_type))throw new o(`Payment account must be a liquid asset or credit card account, received type: "${n.type}", sub_type: "${n.sub_type}".`);if(n.entity_id!==t.entity_id)throw new o(`Payment account "${n.name}" does not belong to entity "${t.entity_id}".`);let a=t.expense_account_id;if(a){let i=e.prepare("SELECT * FROM m1_accounts WHERE id = ?").get(a);if(!i)throw new o(`Expense account not found: ${a}`);if("expense"!==i.type)throw new o(`Expense account must have type 'expense', received: "${i.type}".`);if(i.entity_id!==t.entity_id)throw new o(`Expense account "${i.name}" does not belong to entity "${t.entity_id}".`);if(i.currency!==n.currency)throw new o(`Expense account currency (${i.currency}) must match payment account currency (${n.currency}).`)}else a=T(e,t.entity_id,t.category||"living_expense",n.currency).id;let i=n.currency;return v(e,{date:t.date,description:t.description,payee_or_payer:t.payee,origin:"manual",idempotency_key:t.idempotency_key,evidence_refs:t.evidence_refs,postings:[{account_id:a,amount_cents:t.amount_cents,currency:i,memo:t.description},{account_id:n.id,amount_cents:-t.amount_cents,currency:i,memo:`Payment to ${t.payee||"Merchant"}`}]})})()}function R(e,t){if(y(t.date,"Transfer date"),n(t.amount_cents,"Transfer amount"),t.amount_cents<=0)throw new o("Transfer amount must be greater than zero cents.");if(t.from_account_id===t.to_account_id)throw new o("Source and destination accounts for a transfer must be different.");return e.transaction(()=>{let n=e.prepare("SELECT * FROM m1_accounts WHERE id = ?").get(t.from_account_id),a=e.prepare("SELECT * FROM m1_accounts WHERE id = ?").get(t.to_account_id);if(!n)throw new o(`Source account not found: ${t.from_account_id}`);if(!a)throw new o(`Destination account not found: ${t.to_account_id}`);if(!["asset","liability"].includes(n.type))throw new o(`Source account for transfer must be an asset or liability account, received: "${n.type}".`);if(!["asset","liability"].includes(a.type))throw new o(`Destination account for transfer must be an asset or liability account, received: "${a.type}".`);if(n.entity_id!==a.entity_id)throw new o("Cross-entity transfers are not supported in Slice 1C. Both accounts must belong to the same entity.");if(n.currency!==a.currency)throw new o(`Transfers across different currencies (${n.currency} -> ${a.currency}) require an explicit FX rate (supported in Slice 1D).`);let i=t.description||`Transfer from ${n.name} to ${a.name}`;return v(e,{date:t.date,description:i,origin:"manual",idempotency_key:t.idempotency_key,evidence_refs:t.evidence_refs,postings:[{account_id:n.id,amount_cents:-t.amount_cents,currency:n.currency,memo:`Transfer to ${a.name}`},{account_id:a.id,amount_cents:t.amount_cents,currency:a.currency,memo:`Transfer from ${n.name}`}]})})()}function w(e,t){if(y(t.date,"Repayment date"),n(t.amount_cents,"Repayment amount"),t.amount_cents<=0)throw new o("Repayment amount must be greater than zero cents.");return e.transaction(()=>{let n=e.prepare("SELECT * FROM m1_accounts WHERE id = ?").get(t.bank_account_id),a=e.prepare("SELECT * FROM m1_accounts WHERE id = ?").get(t.card_account_id);if(!n)throw new o(`Bank account not found: ${t.bank_account_id}`);if(!a)throw new o(`Credit card account not found: ${t.card_account_id}`);if("asset"!==n.type)throw new o(`Payment source must be an asset account, received type: "${n.type}".`);if("liability"!==a.type||"credit_card"!==a.sub_type)throw new o(`Credit card account must be a liability account with sub_type 'credit_card', received type: "${a.type}", sub_type: "${a.sub_type}".`);if(n.entity_id!==a.entity_id)throw new o("Cross-entity credit card repayments are not supported. Both accounts must belong to the same entity.");if(n.currency!==a.currency)throw new o(`Cross-currency credit card repayment is not supported: bank account is in ${n.currency}, but credit card account is in ${a.currency}.`);let i=t.description||`Credit Card Payment - ${a.name}`;return v(e,{date:t.date,description:i,origin:"manual",idempotency_key:t.idempotency_key,evidence_refs:t.evidence_refs,postings:[{account_id:n.id,amount_cents:-t.amount_cents,currency:n.currency,memo:`Payment for ${a.name}`},{account_id:a.id,amount_cents:t.amount_cents,currency:a.currency,memo:`Repayment from ${n.name}`}]})})()}function S(e,t){y(t.date,"Payment date"),n(t.principal_cents,"Principal cents"),n(t.interest_cents,"Interest cents");let a=t.fee_cents||0;if(n(a,"Fee cents"),t.principal_cents<0||t.interest_cents<0||a<0)throw new o("Principal, interest, and fee amounts cannot be negative.");let i=t.principal_cents+t.interest_cents+a;if(i<=0)throw new o("Total loan payment must be greater than zero cents.");return e.transaction(()=>{let n=e.prepare("SELECT * FROM m1_accounts WHERE id = ?").get(t.bank_account_id),r=e.prepare("SELECT * FROM m1_accounts WHERE id = ?").get(t.loan_account_id);if(!n)throw new o(`Bank account not found: ${t.bank_account_id}`);if(!r)throw new o(`Loan account not found: ${t.loan_account_id}`);if("asset"!==n.type)throw new o(`Payment source must be an asset account, received type: "${n.type}".`);if("liability"!==r.type)throw new o(`Loan account must be a liability account, received type: "${r.type}".`);if(n.entity_id!==r.entity_id)throw new o("Cross-entity loan repayments are not supported. Both accounts must belong to the same entity.");if(n.currency!==r.currency)throw new o(`Cross-currency loan repayment is not supported: bank account is in ${n.currency}, but loan account is in ${r.currency}.`);let c=n.currency,s=t.interest_account_id;if(s){let t=e.prepare("SELECT * FROM m1_accounts WHERE id = ?").get(s);if(!t)throw new o(`Interest account not found: ${s}`);if("expense"!==t.type)throw new o(`Interest account must be an expense account, received type: "${t.type}".`);if(t.entity_id!==n.entity_id)throw new o(`Interest account does not belong to entity "${n.entity_id}".`);if(t.currency!==c)throw new o(`Interest account currency (${t.currency}) must match loan currency (${c}).`)}else t.interest_cents>0&&(s=T(e,r.entity_id,"loan_interest",c).id);let _=t.fee_account_id;if(_){let t=e.prepare("SELECT * FROM m1_accounts WHERE id = ?").get(_);if(!t)throw new o(`Fee account not found: ${_}`);if("expense"!==t.type)throw new o(`Fee account must be an expense account, received type: "${t.type}".`);if(t.entity_id!==n.entity_id)throw new o(`Fee account does not belong to entity "${n.entity_id}".`);if(t.currency!==c)throw new o(`Fee account currency (${t.currency}) must match loan currency (${c}).`)}else a>0&&(_=T(e,r.entity_id,"bank_fee",c).id);let d=[{account_id:n.id,amount_cents:-i,currency:c,memo:`Loan instalment payment for ${r.name}`}];t.principal_cents>0&&d.push({account_id:r.id,amount_cents:t.principal_cents,currency:c,memo:"Principal reduction"}),t.interest_cents>0&&s&&d.push({account_id:s,amount_cents:t.interest_cents,currency:c,memo:`Interest on ${r.name}`}),a>0&&_&&d.push({account_id:_,amount_cents:a,currency:c,memo:`Fee on ${r.name}`});let u=t.description||`Loan Payment - ${r.name}`;return v(e,{date:t.date,description:u,payee_or_payer:t.payee,origin:"manual",idempotency_key:t.idempotency_key,evidence_refs:t.evidence_refs,postings:d})})()}function h(e,t,n,a){let i=e.prepare(`
        SELECT v.id, v.transaction_id, v.valuation_date, v.target_valuation_cents,
               t.date, t.created_at, t.revision, t.description, t.payee_or_payer,
               t.status, t.origin, t.idempotency_key, t.evidence_refs
        FROM m1_asset_valuations v
        JOIN m1_transactions t ON v.transaction_id = t.id
        WHERE v.account_id = ? AND v.valuation_date >= ? AND t.status = 'posted'
          AND (? IS NULL OR v.transaction_id != ?)
        ORDER BY v.valuation_date ASC, v.created_at ASC
    `).all(t,n,a||null,a||null),o=new Date().toISOString();for(let n of i){let i=e.prepare(`
            SELECT j.amount_cents
            FROM m1_journal_entries j
            JOIN m1_transactions t ON j.transaction_id = t.id
            WHERE j.account_id = ?
              AND t.status = 'posted'
              AND j.transaction_id != ?
              AND (t.date < ? OR (t.date = ? AND t.created_at < ?))
        `).all(t,n.transaction_id,n.date,n.date,n.created_at).reduce((e,t)=>e+t.amount_cents,0),c=n.target_valuation_cents-i,s=e.prepare(`
            SELECT j.id, j.transaction_id, j.account_id, j.amount_cents, j.currency, j.memo, a.type
            FROM m1_journal_entries j
            JOIN m1_accounts a ON j.account_id = a.id
            WHERE j.transaction_id = ?
        `).all(n.transaction_id),_=s.find(e=>e.account_id===t),d=s.find(e=>"equity"===e.type);if(!_||!d||_.amount_cents===c)continue;let u=JSON.stringify({transaction:{id:n.transaction_id,date:n.date,description:n.description,payee_or_payer:n.payee_or_payer,status:n.status,origin:n.origin,idempotency_key:n.idempotency_key,evidence_refs:n.evidence_refs?JSON.parse(n.evidence_refs):null,revision:n.revision,created_at:n.created_at},postings:s.map(e=>({id:e.id,transaction_id:e.transaction_id,account_id:e.account_id,amount_cents:e.amount_cents,currency:e.currency,memo:e.memo}))});e.prepare("UPDATE m1_journal_entries SET amount_cents = ? WHERE id = ?").run(c,_.id),e.prepare("UPDATE m1_journal_entries SET amount_cents = ? WHERE id = ?").run(-c,d.id);let p=n.revision+1;if(0===e.prepare(`
            UPDATE m1_transactions
            SET revision = revision + 1, updated_at = ?
            WHERE id = ? AND revision = ?
        `).run(o,n.transaction_id,n.revision).changes)throw new r(`Optimistic lock failure while cascading valuation for transaction ${n.transaction_id}.`);let m=s.map(e=>e.id===_.id?{...e,amount_cents:c}:e.id===d.id?{...e,amount_cents:-c}:e),E=JSON.stringify({transaction:{id:n.transaction_id,date:n.date,description:n.description,payee_or_payer:n.payee_or_payer,status:n.status,origin:n.origin,idempotency_key:n.idempotency_key,evidence_refs:n.evidence_refs?JSON.parse(n.evidence_refs):null,revision:p,created_at:n.created_at,updated_at:o},postings:m.map(e=>({id:e.id,transaction_id:e.transaction_id,account_id:e.account_id,amount_cents:e.amount_cents,currency:e.currency,memo:e.memo}))}),l=crypto.randomUUID(),y=a?`Cascaded valuation adjustment preserving target ${n.target_valuation_cents} cents following transaction ${a}`:`Cascaded valuation adjustment preserving target ${n.target_valuation_cents} cents`;e.prepare(`
            INSERT INTO m1_transaction_corrections (
                id, transaction_id, operation, reason, previous_state, corrected_state, performed_by, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(l,n.transaction_id,"revaluation_cascade",y,u,E,"system:valuation_cascade",o)}}function b(e,t){let a=t.date||t.valuation_date||"";if(y(a,"Valuation date"),n(t.new_valuation_cents,"New valuation amount"),t.new_valuation_cents<0)throw new o("Asset valuation cannot be negative.");return e.transaction(()=>{let n=e.prepare("SELECT * FROM m1_accounts WHERE id = ?").get(t.asset_account_id);if(!n)throw new o(`Asset account not found: ${t.asset_account_id}`);if("asset"!==n.type)throw new o(`Valuation adjustments are only supported on asset accounts, received type: "${n.type}".`);if(["cash","checking","savings"].includes(n.sub_type))throw new o(`Cannot record valuation adjustment on liquid account type "${n.sub_type}". Use a transaction or opening balance.`);let i=t.entity_id||n.entity_id;if(t.entity_id&&n.entity_id!==t.entity_id)throw new o(`Asset account "${n.name}" belongs to entity "${n.entity_id}", not "${t.entity_id}".`);if(t.idempotency_key){let i=e.prepare("SELECT * FROM m1_transactions WHERE idempotency_key = ?").get(t.idempotency_key);if(i){let o=e.prepare("SELECT * FROM m1_asset_valuations WHERE transaction_id = ?").get(i.id),c=e.prepare("SELECT * FROM m1_journal_entries WHERE transaction_id = ?").all(i.id),s=i.date===a,_=o?o.account_id===n.id:c.some(e=>e.account_id===n.id),d=!o||o.target_valuation_cents===t.new_valuation_cents,u=t.source?` (${t.source.trim()})`:"",p=t.description?t.description.trim():`Valuation Adjustment - ${n.name}${u}`,m=i.description===p,E=t.source?t.source.trim():null,l=o?.source??i.payee_or_payer??null,y=g(i.evidence_refs?JSON.parse(i.evidence_refs):[])===g(t.evidence_refs);if(s&&_&&d&&m&&l===E&&y)return{id:i.id,date:i.date,description:i.description,payee_or_payer:i.payee_or_payer,status:i.status,origin:i.origin,idempotency_key:i.idempotency_key,evidence_refs:i.evidence_refs?JSON.parse(i.evidence_refs):null,revision:i.revision,created_at:i.created_at,updated_at:i.updated_at,postings:c.map(e=>({id:e.id,transaction_id:e.transaction_id,account_id:e.account_id,amount_cents:e.amount_cents,currency:e.currency,memo:e.memo}))};throw new r(`Idempotency conflict: transaction already exists with idempotency key '${t.idempotency_key}' but different details (description, source, date, account, valuation amount, or evidence).`)}}if(e.prepare(`
            SELECT v.id, v.transaction_id, v.target_valuation_cents
            FROM m1_asset_valuations v
            JOIN m1_transactions t ON v.transaction_id = t.id
            WHERE v.account_id = ? AND v.valuation_date = ? AND t.status = 'posted'
        `).get(n.id,a))throw new o(`An asset valuation target already exists for account "${n.name}" on date "${a}". Multiple same-day valuations are not supported. Use edit or void to modify existing valuations.`);let c=e.prepare(`
            SELECT id, name FROM m1_accounts
            WHERE entity_id = ? AND type = 'equity' AND sub_type = 'valuation_reserve' AND currency = ?
        `).get(i,n.currency);c||(c=d(e,{entity_id:i,name:`Unrealized Valuation Reserve (${n.currency})`,type:"equity",sub_type:"valuation_reserve",currency:n.currency}).account);let s=e.prepare(`
            SELECT j.amount_cents
            FROM m1_journal_entries j
            JOIN m1_transactions t ON j.transaction_id = t.id
            WHERE j.account_id = ?
              AND t.status = 'posted'
              AND (t.date < ? OR (t.date = ? AND t.id NOT IN (SELECT transaction_id FROM m1_asset_valuations WHERE account_id = ?)))
        `).all(n.id,a,a,n.id).reduce((e,t)=>e+t.amount_cents,0),_=t.new_valuation_cents-s,u=n.currency.toUpperCase(),p=[];0===_?(p.push({account_id:n.id,amount_cents:0,currency:u,memo:"Appraisal verified (carrying value unchanged)"}),p.push({account_id:c.id,amount_cents:0,currency:u,memo:"Unrealized Valuation Reserve (carrying value unchanged)"})):(_>0?p.push({account_id:n.id,amount_cents:_,currency:u,memo:`Valuation Increase from appraisal: +${_} cents`}):p.push({account_id:n.id,amount_cents:_,currency:u,memo:`Valuation Impairment: ${_} cents`}),p.push({account_id:c.id,amount_cents:-_,currency:u,memo:`Unrealized Valuation Reserve for ${n.name}`}));let m=t.source?` (${t.source.trim()})`:"",E=v(e,{date:a,description:t.description?t.description.trim():`Valuation Adjustment - ${n.name}${m}`,payee_or_payer:t.source?t.source.trim():null,origin:"manual",idempotency_key:t.idempotency_key,evidence_refs:t.evidence_refs,postings:p}),l=`val-${E.id}`,y=new Date().toISOString();return e.prepare(`
            INSERT INTO m1_asset_valuations (id, transaction_id, account_id, valuation_date, target_valuation_cents, source, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(l,E.id,n.id,a,t.new_valuation_cents,t.source?t.source.trim():null,y),h(e,n.id,a,E.id),E})()}function A(e,t){if(!t.reason||0===t.reason.trim().length)throw new o("Correction reason is mandatory for auditable changes.");if(!t.performed_by||0===t.performed_by.trim().length)throw new o("Performing actor/user must be identified for auditable corrections.");let a=e.prepare("SELECT * FROM m1_transactions WHERE id = ?").get(t.transaction_id);if(!a)throw new o(`Transaction not found: ${t.transaction_id}`);if(a.revision!==t.expected_revision)throw new r(`Transaction correction conflict: expected revision ${t.expected_revision}, but database is at revision ${a.revision}.`);let c=e.prepare("SELECT * FROM m1_journal_entries WHERE transaction_id = ?").all(t.transaction_id),s=JSON.stringify({transaction:a,postings:c}),_=crypto.randomUUID(),d=new Date().toISOString(),u="";return e.transaction(()=>{if("void"===t.operation){if(0===e.prepare(`
                UPDATE m1_transactions
                SET status = 'void', revision = revision + 1, updated_at = ?
                WHERE id = ? AND revision = ?
            `).run(d,t.transaction_id,t.expected_revision).changes)throw new r(`Optimistic lock failure while voiding transaction ${t.transaction_id}.`);let n=e.prepare("SELECT * FROM m1_asset_valuations WHERE transaction_id = ?").get(t.transaction_id);if(n)e.prepare("DELETE FROM m1_asset_valuations WHERE transaction_id = ?").run(t.transaction_id),h(e,n.account_id,n.valuation_date,t.transaction_id);else for(let n of c)e.prepare("SELECT COUNT(*) as cnt FROM m1_asset_valuations WHERE account_id = ? AND valuation_date >= ?").get(n.account_id,a.date).cnt>0&&h(e,n.account_id,a.date,t.transaction_id);u=JSON.stringify({transaction:{...a,status:"void",revision:t.expected_revision+1,updated_at:d},postings:c})}else if("edit"===t.operation){if(!t.new_data)throw new o("New transaction data must be provided for edit operation.");if(void 0!==t.new_data.description&&0===t.new_data.description.trim().length)throw new o("Transaction description cannot be empty.");let s=void 0!==t.new_data.description?t.new_data.description.trim():a.description;void 0!==t.new_data.date&&y(t.new_data.date,"Correction date");let _=void 0!==t.new_data.date?t.new_data.date:a.date,p=void 0!==t.new_data.payee_or_payer?t.new_data.payee_or_payer:a.payee_or_payer,m=c;if(void 0!==t.new_data.postings){if(t.new_data.postings.length<2)throw new o("Replacement postings must contain at least two postings to satisfy double-entry balance.");let a=t.new_data.postings.map(e=>(n(e.amount_cents,`Posting for account ${e.account_id}`),{id:crypto.randomUUID(),transaction_id:t.transaction_id,account_id:e.account_id,amount_cents:e.amount_cents,currency:e.currency.toUpperCase(),memo:e.memo||null})),r=i(a);if(!r.isValid)throw new o(`Edited postings out of balance by ${r.delta_cents} cents.`);let s=e.prepare("SELECT id, name, currency, entity_id, type, sub_type FROM m1_accounts WHERE id = ?"),d=null;for(let e of a){let t=s.get(e.account_id);if(!t)throw new o(`Account does not exist: ${e.account_id}`);if(e.currency!==t.currency)throw new o(`Posting currency "${e.currency}" does not match account currency "${t.currency}" for account "${t.name}".`);if(null===d)d=t.entity_id;else if(d!==t.entity_id)throw new o(`Cross-entity correction rejected: Replacement account "${t.name}" belongs to entity "${t.entity_id}", while other replacement postings belong to entity "${d}". In Slice 1C, all postings in a transaction must belong to the same sovereign entity.`)}let u=c.length>0?s.get(c[0].account_id):null,p=u?.entity_id;if(p&&d!==p)throw new o(`Cross-entity correction rejected: Replacement postings belong to entity "${d}", but this transaction belongs to entity "${p}". In Slice 1C, a transaction cannot be moved across sovereign entities.`);let E=e.prepare("SELECT * FROM m1_asset_valuations WHERE transaction_id = ?").get(t.transaction_id),l=null;if(E){let n=a.filter(e=>e.account_id===E.account_id);if(1!==n.length)throw new o("Cannot safely interpret edited postings as an asset valuation: exactly one asset account posting is required.");if(!a.filter(e=>e.account_id!==E.account_id).map(e=>s.get(e.account_id)).every(e=>e&&"equity"===e.type&&"valuation_reserve"===e.sub_type))throw new o("Cannot safely interpret edited postings as an asset valuation: counterpart postings must be Unrealized Valuation Reserve equity.");if((l=e.prepare(`
                        SELECT j.amount_cents
                        FROM m1_journal_entries j
                        JOIN m1_transactions t ON j.transaction_id = t.id
                        WHERE j.account_id = ?
                          AND t.status = 'posted'
                          AND t.id != ?
                          AND (t.date < ? OR (t.date = ? AND t.id NOT IN (SELECT transaction_id FROM m1_asset_valuations WHERE account_id = ?)))
                    `).all(E.account_id,t.transaction_id,_,_,E.account_id).reduce((e,t)=>e+t.amount_cents,0)+n[0].amount_cents)<=0)throw new o(`Target valuation must be strictly positive, calculated: ${l} cents.`)}e.prepare("DELETE FROM m1_journal_entries WHERE transaction_id = ?").run(t.transaction_id);let y=e.prepare(`
                    INSERT INTO m1_journal_entries (id, transaction_id, account_id, amount_cents, currency, memo)
                    VALUES (?, ?, ?, ?, ?, ?)
                `);for(let e of a)y.run(e.id,e.transaction_id,e.account_id,e.amount_cents,e.currency,e.memo);m=a,E&&null!==l&&e.prepare("UPDATE m1_asset_valuations SET target_valuation_cents = ?, valuation_date = ? WHERE id = ?").run(l,_,E.id)}if(0===e.prepare(`
                UPDATE m1_transactions
                SET description = ?, date = ?, payee_or_payer = ?, revision = revision + 1, updated_at = ?
                WHERE id = ? AND revision = ?
            `).run(s,_,p,d,t.transaction_id,t.expected_revision).changes)throw new r(`Optimistic lock failure while editing transaction ${t.transaction_id}.`);let E=e.prepare("SELECT * FROM m1_asset_valuations WHERE transaction_id = ?").get(t.transaction_id);if(E){_!==E.valuation_date&&e.prepare("UPDATE m1_asset_valuations SET valuation_date = ? WHERE id = ?").run(_,E.id);let n=_<E.valuation_date?_:E.valuation_date;h(e,E.account_id,n,t.transaction_id)}else for(let n of m){let i=_<a.date?_:a.date;e.prepare("SELECT COUNT(*) as cnt FROM m1_asset_valuations WHERE account_id = ? AND valuation_date >= ?").get(n.account_id,i).cnt>0&&h(e,n.account_id,i,t.transaction_id)}u=JSON.stringify({transaction:{...a,description:s,date:_,payee_or_payer:p,revision:t.expected_revision+1,updated_at:d},postings:m})}e.prepare(`
            INSERT INTO m1_transaction_corrections (
                id, transaction_id, operation, reason, previous_state, corrected_state, performed_by, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(_,t.transaction_id,t.operation,t.reason.trim(),s,u,t.performed_by.trim(),d)})(),{id:_,transaction_id:t.transaction_id,operation:t.operation,reason:t.reason.trim(),previous_state:s,corrected_state:u,performed_by:t.performed_by.trim(),timestamp:d}}function I(e,t={}){let n=`
        SELECT DISTINCT t.*
        FROM m1_transactions t
        JOIN m1_journal_entries j ON t.id = j.transaction_id
        JOIN m1_accounts a ON j.account_id = a.id
        WHERE 1=1
    `,a=[];t.entityId&&(n+=" AND a.entity_id = ?",a.push(t.entityId)),t.accountId&&(n+=" AND j.account_id = ?",a.push(t.accountId)),t.startDate&&(n+=" AND t.date >= ?",a.push(t.startDate)),t.endDate&&(n+=" AND t.date <= ?",a.push(t.endDate)),n+=" ORDER BY t.date DESC, t.created_at DESC",t.limit&&(n+=` LIMIT ${Math.min(t.limit,500)}`);let i=e.prepare(n).all(...a);if(0===i.length)return[];let r=i.map(e=>e.id),o=r.map(()=>"?").join(","),c=e.prepare(`
        SELECT * FROM m1_journal_entries
        WHERE transaction_id IN (${o})
    `).all(...r),s=new Map;for(let e of c)s.has(e.transaction_id)||s.set(e.transaction_id,[]),s.get(e.transaction_id).push({id:e.id,transaction_id:e.transaction_id,account_id:e.account_id,amount_cents:e.amount_cents,currency:e.currency,memo:e.memo});return i.map(e=>({id:e.id,date:e.date,description:e.description,payee_or_payer:e.payee_or_payer,status:e.status,origin:e.origin,idempotency_key:e.idempotency_key,evidence_refs:e.evidence_refs?JSON.parse(e.evidence_refs):null,revision:e.revision,created_at:e.created_at,updated_at:e.updated_at,postings:s.get(e.id)||[]}))}e.s(["ConflictError",()=>r,"ValidationError",()=>o,"createAccount",()=>d,"createEntity",()=>c,"getAccountOwnership",()=>E,"getEntity",()=>_,"listAccounts",()=>p,"listEntities",()=>s,"listEntityMembers",()=>l,"setAccountOwnership",()=>m,"updateAccount",()=>u],844488),e.s(["correctTransaction",()=>A,"ensureExpenseAccount",()=>T,"ensureIncomeAccount",()=>N,"listTransactions",()=>I,"normalizeEvidenceRefs",()=>g,"postTransaction",()=>v,"recordAssetValuation",()=>b,"recordCreditCardRepayment",()=>w,"recordExpense",()=>L,"recordIncome",()=>O,"recordLoanRepayment",()=>S,"recordTransfer",()=>R],384183)},790333,e=>{"use strict";let t=`
    -- Retained Documents & Original Files
    CREATE TABLE IF NOT EXISTS m1_documents (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        content_hash TEXT NOT NULL UNIQUE, -- SHA-256
        mime_type TEXT NOT NULL,
        byte_size INTEGER NOT NULL,
        storage_path TEXT,
        raw_content TEXT, -- Stored raw file text/content for offline durability
        created_at TEXT NOT NULL
    );

    -- Reusable Bank CSV Column Mappings (Slice 1E)
    CREATE TABLE IF NOT EXISTS m1_csv_mappings (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        header_signature TEXT NOT NULL, -- Canonical pipe-separated header list for auto-matching
        date_column TEXT NOT NULL,
        date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
        description_column TEXT NOT NULL,
        amount_mode TEXT NOT NULL DEFAULT 'single_amount' CHECK (amount_mode IN ('single_amount', 'debit_credit')),
        amount_column TEXT,
        debit_column TEXT,
        credit_column TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    -- Durable Preparation & Background Jobs
    CREATE TABLE IF NOT EXISTS m1_document_jobs (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'queued' CHECK (state IN ('queued', 'processing', 'ready_for_review', 'partially_extracted', 'failed')),
        attempts INTEGER NOT NULL DEFAULT 0,
        lease_until INTEGER, -- Unix timestamp in seconds
        error_message TEXT,
        options TEXT, -- JSON options (e.g. model, service)
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES m1_documents(id) ON DELETE CASCADE
    );

    -- Extracted Financial Proposals (Provisional Records)
    CREATE TABLE IF NOT EXISTS m1_proposals (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        entity_id TEXT,
        account_id TEXT,
        event_date TEXT NOT NULL, -- YYYY-MM-DD
        document_period TEXT,
        original_currency TEXT NOT NULL,
        amount_cents INTEGER NOT NULL,
        counterparty TEXT,
        description TEXT NOT NULL,
        event_type TEXT NOT NULL CHECK (event_type IN ('income', 'expense', 'transfer', 'repayment', 'valuation_adjustment')),
        suggested_category TEXT,
        evidence_json TEXT NOT NULL, -- JSON EvidenceReference
        extraction_version TEXT NOT NULL,
        validation_findings TEXT, -- JSON array of ValidationFinding
        review_status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed', 'approved', 'rejected', 'modified', 'linked')),
        related_proposal_ids TEXT, -- JSON array of related proposal IDs
        linked_transaction_id TEXT, -- Target transaction when linked as supporting evidence (Slice 1G)
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES m1_documents(id) ON DELETE CASCADE
    );

    -- Indices
    CREATE INDEX IF NOT EXISTS idx_m1_documents_hash ON m1_documents(content_hash);
    CREATE INDEX IF NOT EXISTS idx_m1_csv_mappings_sig ON m1_csv_mappings(header_signature);
    CREATE INDEX IF NOT EXISTS idx_m1_proposals_doc ON m1_proposals(document_id);
    CREATE INDEX IF NOT EXISTS idx_m1_proposals_status ON m1_proposals(review_status);
    CREATE INDEX IF NOT EXISTS idx_m1_proposals_linked_tx ON m1_proposals(linked_transaction_id);
    CREATE INDEX IF NOT EXISTS idx_m1_document_jobs_state ON m1_document_jobs(state);
`,n=`
    -- Entities (Persons, Households, Businesses, Trusts)
    CREATE TABLE IF NOT EXISTS m1_entities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('person', 'household', 'business', 'trust')),
        currency TEXT NOT NULL DEFAULT 'USD',
        parent_entity_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (parent_entity_id) REFERENCES m1_entities(id) ON DELETE SET NULL
    );

    -- Financial Accounts
    CREATE TABLE IF NOT EXISTS m1_accounts (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('asset', 'liability', 'equity', 'income', 'expense', 'suspense')),
        sub_type TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        is_active INTEGER NOT NULL DEFAULT 1,
        institution TEXT,
        account_number_mask TEXT,
        opening_date TEXT,
        opening_balance_cents INTEGER,
        revision INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (entity_id) REFERENCES m1_entities(id) ON DELETE CASCADE
    );

    -- Account Ownership Allocations (e.g. 50/50 joint property)
    CREATE TABLE IF NOT EXISTS m1_account_ownership (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        share_percentage REAL NOT NULL CHECK (share_percentage > 0 AND share_percentage <= 100),
        created_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES m1_accounts(id) ON DELETE CASCADE,
        FOREIGN KEY (entity_id) REFERENCES m1_entities(id) ON DELETE CASCADE,
        UNIQUE(account_id, entity_id)
    );

    -- Transactions (Header)
    CREATE TABLE IF NOT EXISTS m1_transactions (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL, -- YYYY-MM-DD
        description TEXT NOT NULL,
        payee_or_payer TEXT,
        status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'void')),
        origin TEXT NOT NULL DEFAULT 'manual' CHECK (origin IN ('manual', 'document_extraction', 'opening_balance', 'migration', 'recurring')),
        idempotency_key TEXT UNIQUE,
        evidence_refs TEXT, -- JSON array of evidence reference strings
        revision INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    -- Journal Entries / Postings (Legs)
    CREATE TABLE IF NOT EXISTS m1_journal_entries (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        account_id TEXT NOT NULL,
        amount_cents INTEGER NOT NULL, -- Signed integer: positive = Debit, negative = Credit
        currency TEXT NOT NULL,
        exchange_rate REAL,
        rate_unresolved INTEGER DEFAULT 0,
        memo TEXT,
        FOREIGN KEY (transaction_id) REFERENCES m1_transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES m1_accounts(id) ON DELETE CASCADE
    );

    -- Auditable Transaction Corrections
    CREATE TABLE IF NOT EXISTS m1_transaction_corrections (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL,
        operation TEXT NOT NULL CHECK (operation IN ('edit', 'void', 'reversal', 'revaluation_cascade')),
        reason TEXT NOT NULL,
        previous_state TEXT NOT NULL, -- JSON string
        corrected_state TEXT NOT NULL, -- JSON string
        performed_by TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES m1_transactions(id) ON DELETE CASCADE
    );

    -- Dated Exchange Rates (Slice 1D: Currency Completeness & Conversion)
    CREATE TABLE IF NOT EXISTS m1_exchange_rates (
        id TEXT PRIMARY KEY,
        from_currency TEXT NOT NULL,
        to_currency TEXT NOT NULL,
        rate REAL NOT NULL CHECK (rate > 0),
        effective_date TEXT NOT NULL, -- YYYY-MM-DD
        source TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(from_currency, to_currency, effective_date)
    );

    -- Asset Valuations (Slice 1D: Historical Valuation Target Tracking & Cascading)
    -- Why this table exists:
    -- Preserves the absolute target valuation for non-cash assets across time.
    -- When earlier or backdated valuations are inserted, subsequent valuation transactions
    -- can be cascaded so that later valuation targets are strictly preserved (M1-FLOW-06, T6).
    CREATE TABLE IF NOT EXISTS m1_asset_valuations (
        id TEXT PRIMARY KEY,
        transaction_id TEXT NOT NULL UNIQUE,
        account_id TEXT NOT NULL,
        valuation_date TEXT NOT NULL,
        target_valuation_cents INTEGER NOT NULL,
        source TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (transaction_id) REFERENCES m1_transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (account_id) REFERENCES m1_accounts(id) ON DELETE CASCADE
    );

    -- Indices for high performance ledger and report queries
    CREATE INDEX IF NOT EXISTS idx_m1_journal_entries_account ON m1_journal_entries(account_id);
    CREATE INDEX IF NOT EXISTS idx_m1_journal_entries_tx ON m1_journal_entries(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_m1_transactions_date ON m1_transactions(date);
    CREATE INDEX IF NOT EXISTS idx_m1_accounts_entity ON m1_accounts(entity_id);
    CREATE INDEX IF NOT EXISTS idx_m1_account_ownership_acc ON m1_account_ownership(account_id);
    CREATE INDEX IF NOT EXISTS idx_m1_account_ownership_ent ON m1_account_ownership(entity_id);
    CREATE INDEX IF NOT EXISTS idx_m1_exchange_rates_lookup ON m1_exchange_rates(from_currency, to_currency, effective_date);
    CREATE INDEX IF NOT EXISTS idx_m1_asset_valuations_acc_date ON m1_asset_valuations(account_id, valuation_date);
`;function a(e){e.pragma("foreign_keys = ON"),e.exec(n);let a=e.transaction(()=>{e.prepare("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = 'm1_asset_valuations'").get().cnt>0&&(e.prepare("PRAGMA table_info(m1_asset_valuations)").all().some(e=>"source"===e.name)||e.prepare("ALTER TABLE m1_asset_valuations ADD COLUMN source TEXT").run()),e.prepare("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = 'm1_transaction_corrections'").get().cnt>0&&((e.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'm1_transaction_corrections'").get()?.sql||"").includes("revaluation_cascade")||(e.prepare(`
                    CREATE TABLE m1_transaction_corrections_new (
                        id TEXT PRIMARY KEY,
                        transaction_id TEXT NOT NULL,
                        operation TEXT NOT NULL CHECK (operation IN ('edit', 'void', 'reversal', 'revaluation_cascade')),
                        reason TEXT NOT NULL,
                        previous_state TEXT NOT NULL,
                        corrected_state TEXT NOT NULL,
                        performed_by TEXT NOT NULL,
                        timestamp TEXT NOT NULL,
                        FOREIGN KEY (transaction_id) REFERENCES m1_transactions(id) ON DELETE CASCADE
                    )
                `).run(),e.prepare(`
                    INSERT INTO m1_transaction_corrections_new (
                        id, transaction_id, operation, reason, previous_state, corrected_state, performed_by, timestamp
                    ) SELECT id, transaction_id, operation, reason, previous_state, corrected_state, performed_by, timestamp
                    FROM m1_transaction_corrections
                `).run(),e.prepare("DROP TABLE m1_transaction_corrections").run(),e.prepare("ALTER TABLE m1_transaction_corrections_new RENAME TO m1_transaction_corrections").run()))}),i=e.prepare("PRAGMA foreign_keys").get(),r=i?.foreign_keys===1;r&&e.pragma("foreign_keys = OFF");try{a()}finally{r&&e.pragma("foreign_keys = ON")}let o=e.transaction(()=>{if(e.prepare("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = 'm1_documents'").get().cnt>0&&(e.prepare("PRAGMA table_info(m1_documents)").all().some(e=>"raw_content"===e.name)||e.prepare("ALTER TABLE m1_documents ADD COLUMN raw_content TEXT").run()),e.prepare("SELECT COUNT(*) as cnt FROM sqlite_master WHERE type = 'table' AND name = 'm1_proposals'").get().cnt>0){let t=e.prepare("PRAGMA table_info(m1_proposals)").all(),n=e.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'm1_proposals'").get();if(n&&n.sql&&!n.sql.includes("'linked'")){e.prepare(`
                    CREATE TABLE IF NOT EXISTS m1_proposals_upgrade_tmp (
                        id TEXT PRIMARY KEY,
                        document_id TEXT NOT NULL,
                        entity_id TEXT,
                        account_id TEXT,
                        event_date TEXT NOT NULL,
                        document_period TEXT,
                        original_currency TEXT NOT NULL,
                        amount_cents INTEGER NOT NULL,
                        counterparty TEXT,
                        description TEXT NOT NULL,
                        event_type TEXT NOT NULL CHECK (event_type IN ('income', 'expense', 'transfer', 'repayment', 'valuation_adjustment')),
                        suggested_category TEXT,
                        evidence_json TEXT NOT NULL,
                        extraction_version TEXT NOT NULL,
                        validation_findings TEXT,
                        review_status TEXT NOT NULL DEFAULT 'unreviewed' CHECK (review_status IN ('unreviewed', 'approved', 'rejected', 'modified', 'linked')),
                        related_proposal_ids TEXT,
                        linked_transaction_id TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        FOREIGN KEY (document_id) REFERENCES m1_documents(id) ON DELETE CASCADE
                    )
                `).run();let n=["id","document_id","entity_id","account_id","event_date","document_period","original_currency","amount_cents","counterparty","description","event_type","suggested_category","evidence_json","extraction_version","validation_findings","review_status","related_proposal_ids",t.map(e=>e.name).includes("linked_transaction_id")?"linked_transaction_id":"NULL as linked_transaction_id","created_at","updated_at"].join(", ");e.prepare(`INSERT INTO m1_proposals_upgrade_tmp SELECT ${n} FROM m1_proposals`).run(),e.prepare("DROP TABLE m1_proposals").run(),e.prepare("ALTER TABLE m1_proposals_upgrade_tmp RENAME TO m1_proposals").run(),e.prepare("CREATE INDEX IF NOT EXISTS idx_m1_proposals_doc ON m1_proposals(document_id)").run(),e.prepare("CREATE INDEX IF NOT EXISTS idx_m1_proposals_status ON m1_proposals(review_status)").run(),e.prepare("CREATE INDEX IF NOT EXISTS idx_m1_proposals_linked_tx ON m1_proposals(linked_transaction_id)").run()}else t.some(e=>"linked_transaction_id"===e.name)||(e.prepare("ALTER TABLE m1_proposals ADD COLUMN linked_transaction_id TEXT").run(),e.prepare("CREATE INDEX IF NOT EXISTS idx_m1_proposals_linked_tx ON m1_proposals(linked_transaction_id)").run())}}),c=e.prepare("PRAGMA foreign_keys").get(),s=c?.foreign_keys===1;s&&e.pragma("foreign_keys = OFF");try{o()}finally{s&&e.pragma("foreign_keys = ON")}e.pragma("foreign_keys = ON"),e.exec(t)}e.s(["initAccountingSchema",()=>a],790333)}];

//# sourceMappingURL=src_lib_domain_accounting_c1806bae._.js.map