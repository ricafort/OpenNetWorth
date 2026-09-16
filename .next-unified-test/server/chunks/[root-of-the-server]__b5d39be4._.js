module.exports=[193695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},270406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},918622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},556704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},832319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},324725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},814747,(e,t,r)=>{t.exports=e.x("path",()=>require("path"))},224361,(e,t,r)=>{t.exports=e.x("util",()=>require("util"))},522734,(e,t,r)=>{t.exports=e.x("fs",()=>require("fs"))},254799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},446786,(e,t,r)=>{t.exports=e.x("os",()=>require("os"))},785148,(e,t,r)=>{t.exports=e.x("better-sqlite3-90e2652d1716b047",()=>require("better-sqlite3-90e2652d1716b047"))},238791,e=>{"use strict";var t=e.i(785148),r=e.i(814747),s=e.i(522734);let a=r.default.resolve(process.cwd(),"data"),n=r.default.join(a,"opennetworth.sqlite"),o=null,i=null;function l(){if(process.env.VITEST||process.env.JEST_WORKER_ID){let e;return i||((e=new t.default(":memory:")).pragma("foreign_keys = ON"),u(e),i=e),i}let e=process.env.OPENNETWORTH_DB_PATH?r.default.resolve(process.cwd(),process.env.OPENNETWORTH_DB_PATH):n,a=r.default.resolve(e)===r.default.resolve(n);if(process.env.VITEST&&a)throw Error("CRITICAL SECURITY GUARD: Attempted to open application vault (opennetworth.sqlite) during test execution! Tests must use an isolated in-memory database.");if(o)return o;let l=r.default.dirname(e);return s.default.existsSync(l)||s.default.mkdirSync(l,{recursive:!0}),(o=new t.default(e)).pragma("journal_mode = WAL"),o.pragma("synchronous = NORMAL"),o.pragma("foreign_keys = ON"),u(o),o}function u(e){let t=`
        -- Profiles
        CREATE TABLE IF NOT EXISTS profiles (
            id TEXT PRIMARY KEY,
            email TEXT,
            full_name TEXT,
            avatar_url TEXT,
            privacy_mode INTEGER DEFAULT 1,
            currency_code TEXT DEFAULT 'USD',
            created_at TEXT NOT NULL
        );

        -- Assets
        CREATE TABLE IF NOT EXISTS assets (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            value REAL NOT NULL DEFAULT 0,
            is_liquid INTEGER DEFAULT 1,
            currency TEXT DEFAULT 'USD',
            interest_rate REAL DEFAULT 0,
            investment_details TEXT,
            last_updated TEXT NOT NULL
        );

        -- Liabilities
        CREATE TABLE IF NOT EXISTS liabilities (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            balance REAL NOT NULL DEFAULT 0,
            interest_rate REAL DEFAULT 0,
            minimum_payment REAL DEFAULT 0,
            is_good_debt INTEGER DEFAULT 0,
            currency TEXT DEFAULT 'USD',
            last_updated TEXT NOT NULL
        );

        -- Goals
        CREATE TABLE IF NOT EXISTS goals (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            target_amount REAL NOT NULL,
            current_amount REAL DEFAULT 0,
            start_amount REAL DEFAULT 0,
            currency TEXT DEFAULT 'USD',
            category TEXT NOT NULL,
            deadline TEXT,
            created_at TEXT NOT NULL
        );

        -- Recurring Transactions
        CREATE TABLE IF NOT EXISTS recurring_transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            frequency TEXT NOT NULL,
            category TEXT NOT NULL,
            start_date TEXT NOT NULL,
            end_date TEXT,
            is_active INTEGER DEFAULT 1,
            currency TEXT DEFAULT 'USD',
            created_at TEXT NOT NULL
        );

        -- Net Worth History
        CREATE TABLE IF NOT EXISTS net_worth_history (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            date TEXT NOT NULL,
            total_assets REAL NOT NULL,
            total_liabilities REAL NOT NULL,
            net_worth REAL NOT NULL,
            UNIQUE(user_id, date)
        );

        -- Cash Flow History
        CREATE TABLE IF NOT EXISTS cash_flow_history (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            month TEXT NOT NULL,
            income REAL DEFAULT 0,
            expenses REAL DEFAULT 0,
            currency TEXT DEFAULT 'USD',
            UNIQUE(user_id, month)
        );

        -- Key-value settings
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );

        -- Insert default local user profile if not present
        INSERT OR IGNORE INTO profiles (id, email, full_name, privacy_mode, currency_code, created_at)
        VALUES ('local_user', 'local@device', 'Local Vault Owner', 1, 'USD', datetime('now'));
    `;e.exec(t)}e.s(["getDb",()=>l])},203171,e=>{"use strict";var t=e.i(747909),r=e.i(174017),s=e.i(996250),a=e.i(759756),n=e.i(561916),o=e.i(174677),i=e.i(869741),l=e.i(316795),u=e.i(487718),d=e.i(995169),p=e.i(47587),T=e.i(666012),c=e.i(570101),E=e.i(626937),R=e.i(10372),N=e.i(193695);e.i(52474);var L=e.i(257297),A=e.i(89171),m=e.i(238791),x=e.i(790333),f=e.i(238663);async function h(e){try{let t=(0,m.getDb)();(0,x.initAccountingSchema)(t);let r=new URL(e.url).searchParams.get("document_id");if(!r)return A.NextResponse.json({error:"Missing required query parameter: document_id"},{status:400});let s=(0,f.getDocumentProposals)(t,r);return A.NextResponse.json({success:!0,proposals:s})}catch(e){return console.error("Failed to get proposals:",e),A.NextResponse.json({error:e.message||"Failed to get proposals."},{status:500})}}async function g(e){try{let t=(0,m.getDb)();(0,x.initAccountingSchema)(t);let{document_id:r,target_account_id:s,entity_id:a,items:n}=await e.json();if(!r||"string"!=typeof r)return A.NextResponse.json({error:"Missing required field: document_id"},{status:400});if(!s||"string"!=typeof s)return A.NextResponse.json({error:"Missing required field: target_account_id"},{status:400});if(!Array.isArray(n)||0===n.length)return A.NextResponse.json({error:"Items array must contain at least one proposal to approve."},{status:400});let o=(0,f.approveProposals)(t,{document_id:r,target_account_id:s,entity_id:a||"",items:n});return A.NextResponse.json({success:!0,...o})}catch(e){return console.error("Failed to approve proposals:",e),A.NextResponse.json({error:e.message||"Failed to approve proposals."},{status:400})}}async function v(e){try{let t=(0,m.getDb)();(0,x.initAccountingSchema)(t);let{proposal_id:r,event_date:s,counterparty:a,description:n,amount_cents:o,original_currency:i,account_id:l,suggested_category:u,review_status:d}=await e.json();if(!r||"string"!=typeof r)return A.NextResponse.json({error:"Missing required field: proposal_id"},{status:400});if("approved"===d)return A.NextResponse.json({error:"Proposals cannot be marked approved via review updates. Only successful ledger posting may set approved status."},{status:400});let p=(0,f.updateProposalReview)(t,{proposal_id:r,event_date:s,counterparty:a,description:n,amount_cents:o,original_currency:i,account_id:l,suggested_category:u,review_status:d});return A.NextResponse.json({success:!0,proposal:p})}catch(e){return console.error("Failed to update proposal:",e),A.NextResponse.json({error:e.message||"Failed to update proposal."},{status:400})}}e.s(["GET",()=>h,"PATCH",()=>v,"POST",()=>g],500787);var U=e.i(500787);let y=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/documents/proposals/route",pathname:"/api/documents/proposals",filename:"route",bundlePath:""},distDir:".next-unified-test",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/documents/proposals/route.ts",nextConfigOutput:"",userland:U}),{workAsyncStorage:_,workUnitAsyncStorage:O,serverHooks:w}=y;function I(){return(0,s.patchFetch)({workAsyncStorage:_,workUnitAsyncStorage:O})}async function X(e,t,s){y.isDev&&(0,a.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let A="/api/documents/proposals/route";A=A.replace(/\/index$/,"")||"/";let m=await y.prepare(e,t,{srcPage:A,multiZoneDraftMode:!1});if(!m)return t.statusCode=400,t.end("Bad Request"),null==s.waitUntil||s.waitUntil.call(s,Promise.resolve()),null;let{buildId:x,params:f,nextConfig:h,parsedUrl:g,isDraftMode:v,prerenderManifest:U,routerServerContext:_,isOnDemandRevalidate:O,revalidateOnlyGenerated:w,resolvedPathname:I,clientReferenceManifest:X,serverActionsManifest:S}=m,C=(0,i.normalizeAppPath)(A),D=!!(U.dynamicRoutes[C]||U.routes[I]),P=async()=>((null==_?void 0:_.render404)?await _.render404(e,t,g,!1):t.end("This page could not be found"),null);if(D&&!v){let e=!!U.routes[I],t=U.dynamicRoutes[C];if(t&&!1===t.fallback&&!e){if(h.experimental.adapterPath)return await P();throw new N.NoFallbackError}}let b=null;!D||y.isDev||v||(b="/index"===(b=I)?"/":b);let F=!0===y.isDev||!D,q=D&&!F;S&&X&&(0,o.setManifestsSingleton)({page:A,clientReferenceManifest:X,serverActionsManifest:S});let j=e.method||"GET",k=(0,n.getTracer)(),M=k.getActiveScopeSpan(),H={params:f,prerenderManifest:U,renderOpts:{experimental:{authInterrupts:!!h.experimental.authInterrupts},cacheComponents:!!h.cacheComponents,supportsDynamicResponse:F,incrementalCache:(0,a.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:h.cacheLife,waitUntil:s.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,s,a)=>y.onRequestError(e,t,s,a,_)},sharedContext:{buildId:x}},K=new l.NodeNextRequest(e),Y=new l.NodeNextResponse(t),B=u.NextRequestAdapter.fromNodeNextRequest(K,(0,u.signalFromNodeResponse)(t));try{let o=async e=>y.handle(B,H).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=k.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let s=r.get("next.route");if(s){let t=`${j} ${s}`;e.setAttributes({"next.route":s,"http.route":s,"next.span_name":t}),e.updateName(t)}else e.updateName(`${j} ${A}`)}),i=!!(0,a.getRequestMeta)(e,"minimalMode"),l=async a=>{var n,l;let u=async({previousCacheEntry:r})=>{try{if(!i&&O&&w&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let n=await o(a);e.fetchMetrics=H.renderOpts.fetchMetrics;let l=H.renderOpts.pendingWaitUntil;l&&s.waitUntil&&(s.waitUntil(l),l=void 0);let u=H.renderOpts.collectedTags;if(!D)return await (0,T.sendResponse)(K,Y,n,H.renderOpts.pendingWaitUntil),null;{let e=await n.blob(),t=(0,c.toNodeOutgoingHttpHeaders)(n.headers);u&&(t[R.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==H.renderOpts.collectedRevalidate&&!(H.renderOpts.collectedRevalidate>=R.INFINITE_CACHE)&&H.renderOpts.collectedRevalidate,s=void 0===H.renderOpts.collectedExpire||H.renderOpts.collectedExpire>=R.INFINITE_CACHE?void 0:H.renderOpts.collectedExpire;return{value:{kind:L.CachedRouteKind.APP_ROUTE,status:n.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:s}}}}catch(t){throw(null==r?void 0:r.isStale)&&await y.onRequestError(e,t,{routerKind:"App Router",routePath:A,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:O})},!1,_),t}},d=await y.handleResponse({req:e,nextConfig:h,cacheKey:b,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:U,isRoutePPREnabled:!1,isOnDemandRevalidate:O,revalidateOnlyGenerated:w,responseGenerator:u,waitUntil:s.waitUntil,isMinimalMode:i});if(!D)return null;if((null==d||null==(n=d.value)?void 0:n.kind)!==L.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(l=d.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});i||t.setHeader("x-nextjs-cache",O?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),v&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let N=(0,c.fromNodeOutgoingHttpHeaders)(d.value.headers);return i&&D||N.delete(R.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||N.get("Cache-Control")||N.set("Cache-Control",(0,E.getCacheControlHeader)(d.cacheControl)),await (0,T.sendResponse)(K,Y,new Response(d.value.body,{headers:N,status:d.value.status||200})),null};M?await l(M):await k.withPropagatedContext(e.headers,()=>k.trace(d.BaseServerSpan.handleRequest,{spanName:`${j} ${A}`,kind:n.SpanKind.SERVER,attributes:{"http.method":j,"http.target":e.url}},l))}catch(t){if(t instanceof N.NoFallbackError||await y.onRequestError(e,t,{routerKind:"App Router",routePath:C,routeType:"route",revalidateReason:(0,p.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:O})},!1,_),D)throw t;return await (0,T.sendResponse)(K,Y,new Response(null,{status:500})),null}}e.s(["handler",()=>X,"patchFetch",()=>I,"routeModule",()=>y,"serverHooks",()=>w,"workAsyncStorage",()=>_,"workUnitAsyncStorage",()=>O],203171)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__b5d39be4._.js.map