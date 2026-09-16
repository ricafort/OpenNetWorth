module.exports=[193695,(e,t,r)=>{t.exports=e.x("next/dist/shared/lib/no-fallback-error.external.js",()=>require("next/dist/shared/lib/no-fallback-error.external.js"))},270406,(e,t,r)=>{t.exports=e.x("next/dist/compiled/@opentelemetry/api",()=>require("next/dist/compiled/@opentelemetry/api"))},918622,(e,t,r)=>{t.exports=e.x("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js",()=>require("next/dist/compiled/next-server/app-page-turbo.runtime.prod.js"))},556704,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-async-storage.external.js",()=>require("next/dist/server/app-render/work-async-storage.external.js"))},832319,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/work-unit-async-storage.external.js",()=>require("next/dist/server/app-render/work-unit-async-storage.external.js"))},324725,(e,t,r)=>{t.exports=e.x("next/dist/server/app-render/after-task-async-storage.external.js",()=>require("next/dist/server/app-render/after-task-async-storage.external.js"))},814747,(e,t,r)=>{t.exports=e.x("path",()=>require("path"))},522734,(e,t,r)=>{t.exports=e.x("fs",()=>require("fs"))},785148,(e,t,r)=>{t.exports=e.x("better-sqlite3-90e2652d1716b047",()=>require("better-sqlite3-90e2652d1716b047"))},238791,e=>{"use strict";var t=e.i(785148),r=e.i(814747),a=e.i(522734);let n=r.default.resolve(process.cwd(),"data"),s=r.default.join(n,"opennetworth.sqlite"),o=null,i=null;function l(){if(process.env.VITEST||process.env.JEST_WORKER_ID){let e;return i||((e=new t.default(":memory:")).pragma("foreign_keys = ON"),d(e),i=e),i}let e=process.env.OPENNETWORTH_DB_PATH?r.default.resolve(process.cwd(),process.env.OPENNETWORTH_DB_PATH):s,n=r.default.resolve(e)===r.default.resolve(s);if(process.env.VITEST&&n)throw Error("CRITICAL SECURITY GUARD: Attempted to open application vault (opennetworth.sqlite) during test execution! Tests must use an isolated in-memory database.");if(o)return o;let l=r.default.dirname(e);return a.default.existsSync(l)||a.default.mkdirSync(l,{recursive:!0}),(o=new t.default(e)).pragma("journal_mode = WAL"),o.pragma("synchronous = NORMAL"),o.pragma("foreign_keys = ON"),d(o),o}function d(e){let t=`
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
    `;e.exec(t)}e.s(["getDb",()=>l])},635951,e=>{"use strict";var t=e.i(747909),r=e.i(174017),a=e.i(996250),n=e.i(759756),s=e.i(561916),o=e.i(174677),i=e.i(869741),l=e.i(316795),d=e.i(487718),u=e.i(995169),T=e.i(47587),c=e.i(666012),E=e.i(570101),p=e.i(626937),R=e.i(10372),L=e.i(193695);e.i(52474);var N=e.i(257297),m=e.i(89171),A=e.i(238791);async function f(e){try{let t=new URL(e.url).searchParams.get("id");if(!t)return m.NextResponse.json({error:"Missing id parameter"},{status:400});let r=(0,A.getDb)().prepare("SELECT mime_type, raw_content FROM m1_documents WHERE id = ?").get(t);if(!r||!r.raw_content)return new m.NextResponse("Document not found or has no raw content",{status:404});let a="application/pdf"===r.mime_type?Buffer.from(r.raw_content,"base64"):Buffer.from(r.raw_content,"utf-8");return new m.NextResponse(a,{headers:{"Content-Type":r.mime_type||"application/octet-stream","Cache-Control":"private, no-store, max-age=0"}})}catch(e){return console.error("Raw doc error:",e),m.NextResponse.json({error:"Internal Server Error",details:e.message},{status:500})}}e.s(["GET",()=>f,"dynamic",0,"force-dynamic"],790700);var h=e.i(790700);let U=new t.AppRouteRouteModule({definition:{kind:r.RouteKind.APP_ROUTE,page:"/api/documents/raw/route",pathname:"/api/documents/raw",filename:"route",bundlePath:""},distDir:".next-unified-test",relativeProjectDir:"",resolvedPagePath:"[project]/src/app/api/documents/raw/route.ts",nextConfigOutput:"",userland:h}),{workAsyncStorage:x,workUnitAsyncStorage:_,serverHooks:v}=U;function O(){return(0,a.patchFetch)({workAsyncStorage:x,workUnitAsyncStorage:_})}async function y(e,t,a){U.isDev&&(0,n.addRequestMeta)(e,"devRequestTimingInternalsEnd",process.hrtime.bigint());let m="/api/documents/raw/route";m=m.replace(/\/index$/,"")||"/";let A=await U.prepare(e,t,{srcPage:m,multiZoneDraftMode:!1});if(!A)return t.statusCode=400,t.end("Bad Request"),null==a.waitUntil||a.waitUntil.call(a,Promise.resolve()),null;let{buildId:f,params:h,nextConfig:x,parsedUrl:_,isDraftMode:v,prerenderManifest:O,routerServerContext:y,isOnDemandRevalidate:g,revalidateOnlyGenerated:w,resolvedPathname:I,clientReferenceManifest:X,serverActionsManifest:S}=A,C=(0,i.normalizeAppPath)(m),D=!!(O.dynamicRoutes[C]||O.routes[I]),b=async()=>((null==y?void 0:y.render404)?await y.render404(e,t,_,!1):t.end("This page could not be found"),null);if(D&&!v){let e=!!O.routes[I],t=O.dynamicRoutes[C];if(t&&!1===t.fallback&&!e){if(x.experimental.adapterPath)return await b();throw new L.NoFallbackError}}let F=null;!D||U.isDev||v||(F="/index"===(F=I)?"/":F);let P=!0===U.isDev||!D,q=D&&!P;S&&X&&(0,o.setManifestsSingleton)({page:m,clientReferenceManifest:X,serverActionsManifest:S});let k=e.method||"GET",H=(0,s.getTracer)(),M=H.getActiveScopeSpan(),j={params:h,prerenderManifest:O,renderOpts:{experimental:{authInterrupts:!!x.experimental.authInterrupts},cacheComponents:!!x.cacheComponents,supportsDynamicResponse:P,incrementalCache:(0,n.getRequestMeta)(e,"incrementalCache"),cacheLifeProfiles:x.cacheLife,waitUntil:a.waitUntil,onClose:e=>{t.on("close",e)},onAfterTaskError:void 0,onInstrumentationRequestError:(t,r,a,n)=>U.onRequestError(e,t,a,n,y)},sharedContext:{buildId:f}},K=new l.NodeNextRequest(e),B=new l.NodeNextResponse(t),Y=d.NextRequestAdapter.fromNodeNextRequest(K,(0,d.signalFromNodeResponse)(t));try{let o=async e=>U.handle(Y,j).finally(()=>{if(!e)return;e.setAttributes({"http.status_code":t.statusCode,"next.rsc":!1});let r=H.getRootSpanAttributes();if(!r)return;if(r.get("next.span_type")!==u.BaseServerSpan.handleRequest)return void console.warn(`Unexpected root span type '${r.get("next.span_type")}'. Please report this Next.js issue https://github.com/vercel/next.js`);let a=r.get("next.route");if(a){let t=`${k} ${a}`;e.setAttributes({"next.route":a,"http.route":a,"next.span_name":t}),e.updateName(t)}else e.updateName(`${k} ${m}`)}),i=!!(0,n.getRequestMeta)(e,"minimalMode"),l=async n=>{var s,l;let d=async({previousCacheEntry:r})=>{try{if(!i&&g&&w&&!r)return t.statusCode=404,t.setHeader("x-nextjs-cache","REVALIDATED"),t.end("This page could not be found"),null;let s=await o(n);e.fetchMetrics=j.renderOpts.fetchMetrics;let l=j.renderOpts.pendingWaitUntil;l&&a.waitUntil&&(a.waitUntil(l),l=void 0);let d=j.renderOpts.collectedTags;if(!D)return await (0,c.sendResponse)(K,B,s,j.renderOpts.pendingWaitUntil),null;{let e=await s.blob(),t=(0,E.toNodeOutgoingHttpHeaders)(s.headers);d&&(t[R.NEXT_CACHE_TAGS_HEADER]=d),!t["content-type"]&&e.type&&(t["content-type"]=e.type);let r=void 0!==j.renderOpts.collectedRevalidate&&!(j.renderOpts.collectedRevalidate>=R.INFINITE_CACHE)&&j.renderOpts.collectedRevalidate,a=void 0===j.renderOpts.collectedExpire||j.renderOpts.collectedExpire>=R.INFINITE_CACHE?void 0:j.renderOpts.collectedExpire;return{value:{kind:N.CachedRouteKind.APP_ROUTE,status:s.status,body:Buffer.from(await e.arrayBuffer()),headers:t},cacheControl:{revalidate:r,expire:a}}}}catch(t){throw(null==r?void 0:r.isStale)&&await U.onRequestError(e,t,{routerKind:"App Router",routePath:m,routeType:"route",revalidateReason:(0,T.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:g})},!1,y),t}},u=await U.handleResponse({req:e,nextConfig:x,cacheKey:F,routeKind:r.RouteKind.APP_ROUTE,isFallback:!1,prerenderManifest:O,isRoutePPREnabled:!1,isOnDemandRevalidate:g,revalidateOnlyGenerated:w,responseGenerator:d,waitUntil:a.waitUntil,isMinimalMode:i});if(!D)return null;if((null==u||null==(s=u.value)?void 0:s.kind)!==N.CachedRouteKind.APP_ROUTE)throw Object.defineProperty(Error(`Invariant: app-route received invalid cache entry ${null==u||null==(l=u.value)?void 0:l.kind}`),"__NEXT_ERROR_CODE",{value:"E701",enumerable:!1,configurable:!0});i||t.setHeader("x-nextjs-cache",g?"REVALIDATED":u.isMiss?"MISS":u.isStale?"STALE":"HIT"),v&&t.setHeader("Cache-Control","private, no-cache, no-store, max-age=0, must-revalidate");let L=(0,E.fromNodeOutgoingHttpHeaders)(u.value.headers);return i&&D||L.delete(R.NEXT_CACHE_TAGS_HEADER),!u.cacheControl||t.getHeader("Cache-Control")||L.get("Cache-Control")||L.set("Cache-Control",(0,p.getCacheControlHeader)(u.cacheControl)),await (0,c.sendResponse)(K,B,new Response(u.value.body,{headers:L,status:u.value.status||200})),null};M?await l(M):await H.withPropagatedContext(e.headers,()=>H.trace(u.BaseServerSpan.handleRequest,{spanName:`${k} ${m}`,kind:s.SpanKind.SERVER,attributes:{"http.method":k,"http.target":e.url}},l))}catch(t){if(t instanceof L.NoFallbackError||await U.onRequestError(e,t,{routerKind:"App Router",routePath:C,routeType:"route",revalidateReason:(0,T.getRevalidateReason)({isStaticGeneration:q,isOnDemandRevalidate:g})},!1,y),D)throw t;return await (0,c.sendResponse)(K,B,new Response(null,{status:500})),null}}e.s(["handler",()=>y,"patchFetch",()=>O,"routeModule",()=>U,"serverHooks",()=>v,"workAsyncStorage",()=>x,"workUnitAsyncStorage",()=>_],635951)}];

//# sourceMappingURL=%5Broot-of-the-server%5D__39352337._.js.map