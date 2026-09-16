module.exports=[193695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},270406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},918622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},556704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},832319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},324725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},814747,(e,t,r)=>{t.exports=e.x("path",()=>require("path"))},224361,(e,t,r)=>{t.exports=e.x("util",()=>require("util"))},522734,(e,t,r)=>{t.exports=e.x("fs",()=>require("fs"))},254799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},446786,(e,t,r)=>{t.exports=e.x("os",()=>require("os"))},785148,(e,t,r)=>{t.exports=e.x("better-sqlite3-90e2652d1716b047",()=>require("better-sqlite3-90e2652d1716b047"))},238791,e=>{"use strict";var t=e.i(785148),r=e.i(814747),a=e.i(522734);let n=r.default.resolve(process.cwd(),"data"),s=r.default.join(n,"opennetworth.sqlite"),i=null,o=null;function l(){if(process.env.VITEST||process.env.JEST_WORKER_ID){let e;return o||((e=new t.default(":memory:")).pragma("foreign_keys = ON"),u(e),o=e),o}let e=process.env.OPENNETWORTH_DB_PATH?r.default.resolve(process.cwd(),process.env.OPENNETWORTH_DB_PATH):s,n=r.default.resolve(e)===r.default.resolve(s);if(process.env.VITEST&&n)throw Error("CRITICAL SECURITY GUARD: Attempted to open application vault (opennetworth.sqlite) during test execution! Tests must use an isolated in-memory database.");if(i)return i;let l=r.default.dirname(e);return a.default.existsSync(l)||a.default.mkdirSync(l,{recursive:!0}),(i=new t.default(e)).pragma("journal_mode = WAL"),i.pragma("synchronous = NORMAL"),i.pragma("foreign_keys = ON"),u(i),i}function u(e){let t=`
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
    `;e.exec(t)}e.s(["getDb",()=>l])},984518,e=>{"use strict";var t=e.i(747909),r=e.i(174017),a=e.i(996250),n=e.i(759756),s=e.i(561916),i=e.i(174677),o=e.i(869741),l=e.i(316795),u=e.i(487718),d=e.i(995169),T=e.i(47587),p=e.i(666012),c=e.i(570101),E=e.i(626937),N=e.i(10372),L=e.i(193695);e.i(52474);var R=e.i(257297),m=e.i(89171),A=e.i(238791),x=e.i(790333),h=e.i(238663);async function g(){try{let e=(0,A.getDb)();(0,x.initAccountingSchema)(e);let t=(0,h.listCsvMappings)(e);return m.NextResponse.json({success:!0,mappings:t})}catch(e){return console.error("Failed to list mappings:",e),m.NextResponse.json({error:e.message||"Failed to list mappings."},{status:500})}}async function U(e){try{let t=(0,A.getDb)();(0,x.initAccountingSchema)(t);let{id:r,name:a,header_signature:n,date_column:s,date_format:i,description_column:o,amount_mode:l,amount_column:u,debit_column:d,credit_column:T}=await e.json();if(!a||!n||!s||!o||!l)return m.NextResponse.json({error:"Missing required mapping profile fields."},{status:400});let p=(0,h.saveCsvMapping)(t,{id:r,name:a,header_signature:n,date_column:s,date_format:i||"YYYY-MM-DD",description_column:o,amount_mode:l||"single_amount",amount_column:u,debit_column:d,credit_column:T});return m.NextResponse.json({success:!0,mapping:p})}catch(e){return console.error("Failed to save mapping:",e),m.NextResponse.json({error:e.message||"Failed to save mapping."},{status:500})}}e.s(["GET",()=>g,"POST",()=>U],563323);var f=e.i(563323);let v=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/documents/mappings/route",pathname:"/api/documents/mappings",filename:"route",bundlePath:""},distDir:".next-unified-test",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/documents/mappings/route.ts",nextConfigOutput:"",userland:f}),{workAsyncStorage:_,workUnitAsyncStorage:O,serverHooks:y}=v;function X(){return(0,a.patchFetch)({workAsyncStorage:_,workUnitAsyncStorage:O})}async function I(e,t,a){v.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let m="/api/documents/mappings/route";m=m.replace(/\/index$/,"")||"/";let A=await v.prepare(e,t,{srcPage:m,multiZoneDraftMode:!1});if(!A)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:x,params:h,nextConfig:g,parsedUrl:U,isDraftMode:f,prerenderManifest:_,routerServerContext:O,isOnDemandRevalidate:y,revalidateOnlyGenerated:X,resolvedPathname:I,clientReferenceManifest:w,serverActionsManifest:S}=A,C=(0,o.normalizeAppPath)(m),D=!!(_.dynamicRoutes[C]||_.routes[I]),b=async()=>((null==O?void 0:O.render404)?await O.render404(e,t,U,!1):t.end("This page could not be found"),null);if(D&&!f){let e=!!_.routes[I],t=_.dynamicRoutes[C];if(t&&!1===t.fallback&&!e){if(g.experimental.adapterPath)return await b();throw new L.NoFallbackError}}let F=null;!D||v.isDev||f||(F="/index"===(F=I)?"/":F);let P=!0===v.isDev||!D,q=D&&!P;S&&w&&(0,i.setManifestsSingleton)({page:m,clientReferenceManifest:w,serverActionsManifest:S});let M=e.method||"GET",j=(0,s.getTracer)(),k=j.getActiveScopeSpan(),H={params:h,prerenderManifest:_,renderOpts:{experimental:{authInterrupts:!!g.experimental.authInterrupts},cacheComponents:!!g.cacheComponents,supportsDynamicResponse:P,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:g.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>v.onRequestError(e,t,a,n,O)},sharedContext:{buildId:x}},Y=new l.NodeNextRequest(e),K=new l.NodeNextResponse(t),B=u.NextRequestAdapter.fromNodeNextRequest(Y,(0,u.signalFromNodeResponse)(t));try{let i=async e=>v.handle(B,H).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=j.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==d.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${M} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${M} ${m}`)}),o=!!(0,n.getRequestMeta)(e,"minimalMode"),l=async n=>{var s,l;let u=async({previousCacheEntry:r})=>{try{if(!o&&y&&X&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await i(n);e.fetchMetrics=H.renderOpts.fetchMetrics;let l=H.renderOpts.pendingWaitUntil;l&&a.waitUntil&&(a.waitUntil(l),l=void 0);let u=H.renderOpts.collectedTags;if(!D)return await (0,p.sendResponse)(Y,K,s,H.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,c.toNodeOutgoingHttpHeaders)(s.headers);u&&(t[N.NEXT_CACHE_TAGS_HEADER]=u),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==H.renderOpts.collectedRevalidate&&!(H.renderOpts.collectedRevalidate>=N.INFINITE_CACHE)&&H.renderOpts.collectedRevalidate,a=void 0===H.renderOpts.collectedExpire||H.renderOpts.collectedExpire>=N.INFINITE_CACHE?void 0:H.renderOpts.collectedExpire;return{value:{kind:R.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await v.onRequestError(e,t,{routerKind:"App Router",routePath:m,routeType:"route",revalidateReason:(0,T.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:y})},!1,O),t}},d=await v.handleResponse({req:e,nextConfig:g,cacheKey:F,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:_,isRoutePPREnabled:!1,isOnDemandRevalidate:y,revalidateOnlyGenerated:X,responseGenerator:u,waitUntil:a.waitUntil,isMinimalMode:o});if(!D)return null;if((null==d||null==(s=d.value)?void 0:s.kind)!==R.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==d||null==(l=d.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",y?"REVALIDATED":d.isMiss?"MISS":d.isStale?"STALE":"HIT"),f&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let L=(0,c.fromNodeOutgoingHttpHeaders)(d.value.headers);return o&&D||L.delete(N.NEXT_CACHE_TAGS_HEADER),!d.cacheControl||t.getHeader("Cache-Control")||L.get("Cache-Control")||L.set("Cache-Control",(0,E.getCacheControlHeader)(d.cacheControl)),await (0,p.sendResponse)(Y,K,new Response(d.value.body,{headers:L,status:d.value.status||200})),null};k?await l(k):await j.withPropagatedContext(e.headers,()=>j.trace(d.BaseServerSpan.handleRequest,{spanName:`${M} ${m}`,kind:s.SpanKind.SERVER,attributes:{"http.method":M,"http.target":e.url}},l))}catch(t){if(t instanceof L.NoFallbackError||await v.onRequestError(e,t,{routerKind:"App Router",routePath:C,routeType:"route",revalidateReason:(0,T.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:y})},!1,O),D)throw t;return await (0,p.sendResponse)(Y,K,new Response(null,{status:500})),null}}e.s(["handler",()=>I,"patchFetch",()=>X,"routeModule",()=>v,"serverHooks",()=>y,"workAsyncStorage",()=>_,"workUnitAsyncStorage",()=>O],984518)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__f1cde006._.js.map