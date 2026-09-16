module.exports=[193695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},270406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},918622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},556704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},832319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},324725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},814747,(e,t,r)=>{t.exports=e.x("path",()=>require("path"))},224361,(e,t,r)=>{t.exports=e.x("util",()=>require("util"))},522734,(e,t,r)=>{t.exports=e.x("fs",()=>require("fs"))},254799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},446786,(e,t,r)=>{t.exports=e.x("os",()=>require("os"))},785148,(e,t,r)=>{t.exports=e.x("better-sqlite3-90e2652d1716b047",()=>require("better-sqlite3-90e2652d1716b047"))},238791,e=>{"use strict";var t=e.i(785148),r=e.i(814747),n=e.i(522734);let a=r.default.resolve(process.cwd(),"data"),s=r.default.join(a,"opennetworth.sqlite"),i=null,o=null;function l(){if(process.env.VITEST||process.env.JEST_WORKER_ID){let e;return o||((e=new t.default(":memory:")).pragma("foreign_keys = ON"),u(e),o=e),o}let e=process.env.OPENNETWORTH_DB_PATH?r.default.resolve(process.cwd(),process.env.OPENNETWORTH_DB_PATH):s,a=r.default.resolve(e)===r.default.resolve(s);if(process.env.VITEST&&a)throw Error("CRITICAL SECURITY GUARD: Attempted to open application vault (opennetworth.sqlite) during test execution! Tests must use an isolated in-memory database.");if(i)return i;let l=r.default.dirname(e);return n.default.existsSync(l)||n.default.mkdirSync(l,{recursive:!0}),(i=new t.default(e)).pragma("journal_mode = WAL"),i.pragma("synchronous = NORMAL"),i.pragma("foreign_keys = ON"),u(i),i}function u(e){let t=`
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
    `;e.exec(t)}e.s(["getDb",()=>l])},892792,e=>{"use strict";var t=e.i(747909),r=e.i(174017),n=e.i(996250),a=e.i(759756),s=e.i(561916),i=e.i(174677),o=e.i(869741),l=e.i(316795),u=e.i(487718),d=e.i(995169),T=e.i(47587),c=e.i(666012),p=e.i(570101),E=e.i(626937),N=e.i(10372),R=e.i(193695);e.i(52474);var L=e.i(257297),m=e.i(89171),A=e.i(238791),x=e.i(790333),f=e.i(238663);async function h(){try{let e=(0,A.getDb)();(0,x.initAccountingSchema)(e);let t=(0,f.listDocuments)(e);return m.NextResponse.json({success:!0,documents:t})}catch(e){return console.error("Failed to list documents:",e),m.NextResponse.json({error:e.message||"Failed to list documents."},{status:500})}}async function g(e){try{let t=(0,A.getDb)();(0,x.initAccountingSchema)(t);let{filename:r,raw_content:n,mapping:a,target_account_id:s,default_category:i,entity_id:o}=await e.json();if(!r||"string"!=typeof r)return m.NextResponse.json({error:"Missing required field: filename."},{status:400});if(!n||"string"!=typeof n)return m.NextResponse.json({error:"Missing required field: raw_content."},{status:400});if(!a||!a.date_column||!a.description_column)return m.NextResponse.json({error:"Invalid or missing mapping configuration."},{status:400});if(!s||"string"!=typeof s)return m.NextResponse.json({error:"Missing required field: target_account_id."},{status:400});let l=(0,f.ingestCsvDocument)(t,{filename:r,raw_content:n,mapping:a,target_account_id:s,default_category:i,entity_id:o});return m.NextResponse.json({success:!0,...l})}catch(e){return console.error("Failed to ingest document:",e),m.NextResponse.json({error:e.message||"Failed to ingest document."},{status:500})}}e.s(["GET",()=>h,"POST",()=>g],946108);var U=e.i(946108);let _=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/documents/route",pathname:"/api/documents",filename:"route",bundlePath:""},distDir:".next-unified-test",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/documents/route.ts",nextConfigOutput:"",userland:U}),{workAsyncStorage:v,workUnitAsyncStorage:O,serverHooks:y}=_;function I(){return(0,n.patchFetch)({workAsyncStorage:v,workUnitAsyncStorage:O})}async function X(e,t,n){_.isDev&&(0,a.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let m="/api/documents/route";m=m.replace(/\/index$/,"")||"/";let A=await _.prepare(e,t,{srcPage:m,multiZoneDraftMode:!1});if(!A)return t.statusCode=400,t.end("Bad Request"),null==n.waitUntil||n.waitUntil.call(n,Promise.resolve()),null;let{buildId:x,params:f,nextConfig:h,parsedUrl:g,isDraftMode:U,prerenderManifest:v,routerServerContext:O,isOnDemandRevalidate:y,revalidateOnlyGenerated:I,resolvedPathname:X,clientReferenceManifest:w,serverActionsManifest:S}=A,C=(0,o.normalizeAppPath)(m),D=!!(v.dynamicRoutes[C]||v.routes[X]),b=async()=>((null==O?void 0:O.render404)?await O.render404(e,t,g,!1):t.end("This page could not be found"),null);if(D&&!U){let e=!!v.routes[X],t=v.dynamicRoutes[C];if(t&&!1===t.fallback&&!e){if(h.experimental.adapterPath)return await b();throw new R.NoFallbackError}}let F=null;!D||_.isDev||U||(F="/index"===(F=X)?"/":F);let P=!0===_.isDev||!D,q=D&&!P;S&&w&&(0,i.setManifestsSingleton)({page:m,clientReferenceManifest:w,serverActionsManifest:S});let j=e.method||"GET",k=(0,s.getTracer)(),M=k.getActiveScopeSpan(),H={params:f,prerenderManifest:v,renderOpts:{experimental:{authInterrupts:!!h.experimental.authInterrupts},cacheComponents:!!h.cacheComponents,supportsDynamicResponse:P,incrementalCache:(0,a.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:h.cacheLife,waitUntil:n.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,n,a)=>_.onRequestError(e,t,n,a,O)},sharedContext:{buildId:x}},K=new l.NodeNextRequest(e),Y=new l.NodeNextResponse(t),B=u.NextRequestAdapter.fromNodeNextRequest(K,(0,u.signalFromNodeResponse)(t));try{let i=async e=>_.handle(B,H).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=k.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let n=r.get("next.route");if(n){let t=`${j} ${n}`;e.setAttributes({"next.route":n,"http.route":n,"next.span_name":t}),e.updateName(t)}else e.updateName(`${j} ${m}`)}),o=!!(0,a.getRequestMeta)(e,"minimalMode"),l=async a=>{var s,l;let u=async({previousCacheEntry:r})=>{try{if(!o&&y&&I&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await i(a);e.fetchMetrics=H.renderOpts.fetchMetrics;let l=H.renderOpts.pendingWaitUntil;l&&n.waitUntil&&(n.waitUntil(l),l=void 0);let u=H.renderOpts.collectedTags;if(!D)return await (0,c.sendResponse)(K,Y,s,H.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,p.toNodeOutgoingHttpHeaders)(s.headers);u&&(t[N.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==H.renderOpts.collectedRevalidate&&!(H.renderOpts.collectedRevalidate>=N.INFINITE_CACHE)&&H.renderOpts.collectedRevalidate,n=void 0===H.renderOpts.collectedExpire||H.renderOpts.collectedExpire>=N.INFINITE_CACHE?void 0:H.renderOpts.collectedExpire;return{value:{kind:L.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:n}}}}catch(t){throw(null==r?void 0:r.isStale)&&await _.onRequestError(e,t,{routerKind:"App Router",routePath:m,routeType:"route",revalidateReason:(0,T.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:y})},!1,O),t}},d=await _.handleResponse({req:e,nextConfig:h,cacheKey:F,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:v,isRoutePPREnabled:!1,isOnDemandRevalidate:y,revalidateOnlyGenerated:I,responseGenerator:u,waitUntil:n.waitUntil,isMinimalMode:o});if(!D)return null;if((null==d||null==(s=d.value)?void 0:s.kind)!==L.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(l=d.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",y?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),U&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let R=(0,p.fromNodeOutgoingHttpHeaders)(d.value.headers);return o&&D||R.delete(N.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||R.get("Cache-Control")||R.set("Cache-Control",(0,E.getCacheControlHeader)(d.cacheControl)),await (0,c.sendResponse)(K,Y,new Response(d.value.body,{headers:R,status:d.value.status||200})),null};M?await l(M):await k.withPropagatedContext(e.headers,()=>k.trace(d.BaseServerSpan.handleRequest,{spanName:`${j} ${m}`,kind:s.SpanKind.SERVER,attributes:{"http.method":j,"http.target":e.url}},l))}catch(t){if(t instanceof R.NoFallbackError||await _.onRequestError(e,t,{routerKind:"App Router",routePath:C,routeType:"route",revalidateReason:(0,T.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:y})},!1,O),D)throw t;return await (0,c.sendResponse)(K,Y,new Response(null,{status:500})),null}}e.s(["handler",()=>X,"patchFetch",()=>I,"routeModule",()=>_,"serverHooks",()=>y,"workAsyncStorage",()=>v,"workUnitAsyncStorage",()=>O],892792)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__57a003a0._.js.map