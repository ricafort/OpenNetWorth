module.exports=[193695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},270406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},918622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},556704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},832319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},324725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},814747,(e,t,r)=>{t.exports=e.x("path",()=>require("path"))},224361,(e,t,r)=>{t.exports=e.x("util",()=>require("util"))},522734,(e,t,r)=>{t.exports=e.x("fs",()=>require("fs"))},254799,(e,t,r)=>{t.exports=e.x("crypto",()=>require("crypto"))},446786,(e,t,r)=>{t.exports=e.x("os",()=>require("os"))},785148,(e,t,r)=>{t.exports=e.x("better-sqlite3-90e2652d1716b047",()=>require("better-sqlite3-90e2652d1716b047"))},238791,e=>{"use strict";var t=e.i(785148),r=e.i(814747),a=e.i(522734);let n=r.default.resolve(process.cwd(),"data"),s=r.default.join(n,"opennetworth.sqlite"),i=null,o=null;function l(){if(process.env.VITEST||process.env.JEST_WORKER_ID){let e;return o||((e=new t.default(":memory:")).pragma("foreign_keys = ON"),d(e),o=e),o}let e=process.env.OPENNETWORTH_DB_PATH?r.default.resolve(process.cwd(),process.env.OPENNETWORTH_DB_PATH):s,n=r.default.resolve(e)===r.default.resolve(s);if(process.env.VITEST&&n)throw Error("CRITICAL SECURITY GUARD: Attempted to open application vault (opennetworth.sqlite) during test execution! Tests must use an isolated in-memory database.");if(i)return i;let l=r.default.dirname(e);return a.default.existsSync(l)||a.default.mkdirSync(l,{recursive:!0}),(i=new t.default(e)).pragma("journal_mode = WAL"),i.pragma("synchronous = NORMAL"),i.pragma("foreign_keys = ON"),d(i),i}function d(e){let t=`
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
    `;e.exec(t)}e.s(["getDb",()=>l])},494627,e=>{"use strict";var t=e.i(747909),r=e.i(174017),a=e.i(996250),n=e.i(759756),s=e.i(561916),i=e.i(174677),o=e.i(869741),l=e.i(316795),d=e.i(487718),u=e.i(995169),T=e.i(47587),c=e.i(666012),p=e.i(570101),E=e.i(626937),N=e.i(10372),L=e.i(193695);e.i(52474);var R=e.i(257297),f=e.i(89171),A=e.i(238791),m=e.i(790333),_=e.i(238663);async function x(e){try{let t,r,a,n=(0,A.getDb)();(0,m.initAccountingSchema)(n);let s=e.headers.get("content-type")||"",i="invoice.pdf",o=null;if(s.includes("multipart/form-data")){let n=await e.formData(),s=n.get("file");if(!s)return f.NextResponse.json({error:"Missing required file in form data."},{status:400});i=s.name||"uploaded_invoice.pdf";let l=await s.arrayBuffer();o=Buffer.from(l),t=n.get("target_account_id")||void 0,r=n.get("default_category")||void 0,a=n.get("entity_id")||void 0}else{let n=await e.json();i=n.filename||"uploaded_invoice.pdf",n.file_base64&&(o=Buffer.from(n.file_base64,"base64")),t=n.target_account_id,r=n.default_category,a=n.entity_id}if(!o||0===o.length)return f.NextResponse.json({error:"No PDF file content was provided."},{status:400});let l=await (0,_.ingestPdfDocument)(n,{filename:i,file_buffer:o,target_account_id:t,default_category:r,entity_id:a});return f.NextResponse.json({success:!0,...l})}catch(e){return console.error("Failed to ingest PDF document:",e),f.NextResponse.json({error:e.message||"Failed to ingest PDF document."},{status:500})}}e.s(["POST",()=>x],263495);var h=e.i(263495);let g=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/documents/pdf/route",pathname:"/api/documents/pdf",filename:"route",bundlePath:""},distDir:".next-unified-test",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/documents/pdf/route.ts",nextConfigOutput:"",userland:h}),{workAsyncStorage:v,workUnitAsyncStorage:U,serverHooks:y}=g;function O(){return(0,a.patchFetch)({workAsyncStorage:v,workUnitAsyncStorage:U})}async function w(e,t,a){g.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let f="/api/documents/pdf/route";f=f.replace(/\/index$/,"")||"/";let A=await g.prepare(e,t,{srcPage:f,multiZoneDraftMode:!1});if(!A)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:m,params:_,nextConfig:x,parsedUrl:h,isDraftMode:v,prerenderManifest:U,routerServerContext:y,isOnDemandRevalidate:O,revalidateOnlyGenerated:w,resolvedPathname:X,clientReferenceManifest:I,serverActionsManifest:S}=A,D=(0,o.normalizeAppPath)(f),C=!!(U.dynamicRoutes[D]||U.routes[X]),b=async()=>((null==y?void 0:y.render404)?await y.render404(e,t,h,!1):t.end("This page could not be found"),null);if(C&&!v){let e=!!U.routes[X],t=U.dynamicRoutes[D];if(t&&!1===t.fallback&&!e){if(x.experimental.adapterPath)return await b();throw new L.NoFallbackError}}let F=null;!C||g.isDev||v||(F="/index"===(F=X)?"/":F);let P=!0===g.isDev||!C,q=C&&!P;S&&I&&(0,i.setManifestsSingleton)({page:f,clientReferenceManifest:I,serverActionsManifest:S});let k=e.method||"GET",j=(0,s.getTracer)(),H=j.getActiveScopeSpan(),M={params:_,prerenderManifest:U,renderOpts:{experimental:{authInterrupts:!!x.experimental.authInterrupts},cacheComponents:!!x.cacheComponents,supportsDynamicResponse:P,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:x.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>g.onRequestError(e,t,a,n,y)},sharedContext:{buildId:m}},B=new l.NodeNextRequest(e),K=new l.NodeNextResponse(t),Y=d.NextRequestAdapter.fromNodeNextRequest(B,(0,d.signalFromNodeResponse)(t));try{let i=async e=>g.handle(Y,M).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=j.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${k} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${k} ${f}`)}),o=!!(0,n.getRequestMeta)(e,"minimalMode"),l=async n=>{var s,l;let d=async({previousCacheEntry:r})=>{try{if(!o&&O&&w&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await i(n);e.fetchMetrics=M.renderOpts.fetchMetrics;let l=M.renderOpts.pendingWaitUntil;l&&a.waitUntil&&(a.waitUntil(l),l=void 0);let d=M.renderOpts.collectedTags;if(!C)return await (0,c.sendResponse)(B,K,s,M.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,p.toNodeOutgoingHttpHeaders)(s.headers);d&&(t[N.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==M.renderOpts.collectedRevalidate&&!(M.renderOpts.collectedRevalidate>=N.INFINITE_CACHE)&&M.renderOpts.collectedRevalidate,a=void 0===M.renderOpts.collectedExpire||M.renderOpts.collectedExpire>=N.INFINITE_CACHE?void 0:M.renderOpts.collectedExpire;return{value:{kind:R.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await g.onRequestError(e,t,{routerKind:"App Router",routePath:f,routeType:"route",revalidateReason:(0,T.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:O})},!1,y),t}},u=await g.handleResponse({req:e,nextConfig:x,cacheKey:F,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:U,isRoutePPREnabled:!1,isOnDemandRevalidate:O,revalidateOnlyGenerated:w,responseGenerator:d,waitUntil:a.waitUntil,isMinimalMode:o});if(!C)return null;if((null==u||null==(s=u.value)?void 0:s.kind)!==R.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(l=u.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});o||t.setHeader("x-nextjs-cache",O?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),v&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let L=(0,p.fromNodeOutgoingHttpHeaders)(u.value.headers);return o&&C||L.delete(N.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||L.get("Cache-Control")||L.set("Cache-Control",(0,E.getCacheControlHeader)(u.cacheControl)),await (0,c.sendResponse)(B,K,new Response(u.value.body,{headers:L,status:u.value.status||200})),null};H?await l(H):await j.withPropagatedContext(e.headers,()=>j.trace(u.BaseServerSpan.handleRequest,{spanName:`${k} ${f}`,kind:s.SpanKind.SERVER,attributes:{"http.method":k,"http.target":e.url}},l))}catch(t){if(t instanceof L.NoFallbackError||await g.onRequestError(e,t,{routerKind:"App Router",routePath:D,routeType:"route",revalidateReason:(0,T.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:O})},!1,y),C)throw t;return await (0,c.sendResponse)(B,K,new Response(null,{status:500})),null}}e.s(["handler",()=>w,"patchFetch",()=>O,"routeModule",()=>g,"serverHooks",()=>y,"workAsyncStorage",()=>v,"workUnitAsyncStorage",()=>U],494627)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__f9ad47a8._.js.map