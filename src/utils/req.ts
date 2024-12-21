/**
 * [Forbidden headers](https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_header_name) are type `never` for a reason.
 */
interface ReqRequestHeaders {
    aIM?: string;
    accept?: string;
    acceptCharset?: never;
    acceptEncoding?: never;
    acceptLanguage?: string;
    acceptDatetime?: string;
    accessControlRequestMethod?: never;
    accessControlRequestHeaders?: never;
    authorization?: string;
    cacheControl?: string;
    connection?: never;
    contentLength?: never;
    contentType?: string;
    cookie?: never;
    date?: never;
    expect?: never;
    forwarded?: string;
    from?: string;
    host?: never;
    ifMatch?: string;
    ifModifiedSince?: string;
    ifNoneMatch?: string;
    ifRange?: string;
    ifUnmodifiedSince?: string;
    maxForwards?: string;
    origin?: never;
    pragma?: string;
    proxyAuthorization?: never;
    range?: string;
    referer?: never;
    TE?: never;
    userAgent?: string;
    upgrade?: never;
    via?: never;
    warning?: string;
    dnt?: never;
    xRequestedWith?: string;
    xCSRFToken?: string;
}
interface ReqResponseHeaders {
    acceptPatch?: string;
    acceptRanges?: string;
    age?: string;
    allow?: string;
    altSvc?: string;
    cacheControl?: string;
    connection?: string;
    contentDisposition?: string;
    contentEncoding?: string;
    contentLanguage?: string;
    contentLength?: string;
    contentLocation?: string;
    contentRange?: string;
    contentType?: string;
    date?: string;
    deltaBase?: string;
    eTag?: string;
    expires?: string;
    IM?: string;
    lastModified?: string;
    link?: string;
    location?: string;
    pragma?: string;
    proxyAuthenticate?: string;
    publicKeyPins?: string;
    retryAfter?: string;
    server?: string;
    setCookie?: string;
    strictTransportSecurity?: string;
    trailer?: string;
    transferEncoding?: string;
    tk?: string;
    upgrade?: string;
    vary?: string;
    via?: string;
    warning?: string;
    wwwAuthenticate?: string;
    accessControlAllowOrigin?: string;
    accessControlAllowCredentials?: string;
    accessControlExposeHeaders?: string;
    accessControlMaxAge?: string;
    accessControlAllowMethods?: string;
    accessControlAllowHeaders?: string;
    contentSecurityPolicy?: string;
    refresh?: string;
    xPoweredBy?: string;
    xRequestID?: string;
    xUACompatible?: string;
    xXSSProtection?: string;
}
/**
 * @template {"get" | "delete" | "head" | "options" | "post" | "put" | "patch"} M
 * @template {XMLHttpRequestResponseType} R
 */
interface ReqOptions<M extends "get" | "delete" | "head" | "options" | "post" | "put" | "patch", R extends XMLHttpRequestResponseType> {
    method: M;
    url: string | URL;
    body?: M extends "post" | "put" | "patch" | "delete" ? Document | XMLHttpRequestBodyInit | { [x: string]: any; } | null : never;
    headers?: ReqRequestHeaders & { [x: string]: string; };
    headersRaw?: ReqResponseHeaders & { [x: string]: string; };
    responseType?: R;
    rejectIfUnsuccessful?: boolean;
    resolveWithErrors?: boolean;
}
/**
 * @template {XMLHttpRequestResponseType} R
 */
interface ReqResponse<R extends XMLHttpRequestResponseType> {
    body: (R extends "arraybuffer" ? ArrayBuffer : R extends "blob" ? Blob : R extends "document" ? Document : R extends "text" ? string : any) | null;
    statusCode: number;
    status: string;
    successful: boolean;
    headers: ReqResponseHeaders & { [x: string]: string; };
    headersRaw: ReqResponseHeaders & { [x: string]: string; };
    error?: any;
}

const _reqHeaderNameTransform = {
    acceptPatch: "Accept-Patch",
    acceptRanges: "Accept-Ranges",
    age: "Age",
    allow: "Allow",
    altSvc: "Alt-Svc",
    cacheControl: "Cache-Control",
    connection: "Connection",
    contentDisposition: "Content-Disposition",
    contentEncoding: "Content-Encoding",
    contentLanguage: "Content-Language",
    contentLength: "Content-Length",
    contentLocation: "Content-Location",
    contentRange: "Content-Range",
    contentType: "Content-Type",
    date: "Date",
    deltaBase: "Delta-Base",
    eTag: "ETag",
    expires: "Expires",
    im: "IM",
    lastModified: "Last-Modified",
    link: "Link",
    location: "Location",
    pragma: "Pragma",
    proxyAuthenticate: "Proxy-Authenticate",
    publicKeyPins: "Public-Key-Pins",
    retryAfter: "Retry-After",
    server: "Server",
    setCookie: "Set-Cookie",
    strictTransportSecurity: "Strict-Transport-Security",
    trailer: "Trailer",
    transferEncoding: "Transfer-Encoding",
    tk: "Tk",
    upgrade: "Upgrade",
    vary: "Vary",
    via: "Via",
    warning: "Warning",
    wwwAuthenticate: "WWW-Authenticate",
    accessControlAllowOrigin: "Access-Control-Allow-Origin",
    accessControlAllowCredentials: "Access-Control-Allow-Credentials",
    accessControlExposeHeaders: "Access-Control-Expose-Headers",
    accessControlMaxAge: "Access-Control-Max-Age",
    accessControlAllowMethods: "Access-Control-Allow-Methods",
    accessControlAllowHeaders: "Access-Control-Allow-Headers",
    contentSecurityPolicy: "Content-Security-Policy",
    refresh: "Refresh",
    xPoweredBy: "X-Powered-By",
    xRequestID: "X-Request-ID",
    xUACompatible: "X-UA-Compatible",
    xXSSProtection: "X-XSS-Protection",
    aIM: "A-IM",
    accept: "Accept",
    acceptCharset: "Accept-Charset",
    acceptEncoding: "Accept-Encoding",
    acceptLanguage: "Accept-Language",
    acceptDatetime: "Accept-Datetime",
    accessControlRequestMethod: "Access-Control-Request-Method",
    accessControlRequestHeaders: "Access-Control-Request-Headers",
    authorization: "Authorization",
    cookie: "Cookie",
    expect: "Expect",
    forwarded: "Forwarded",
    from: "From",
    host: "Host",
    ifMatch: "If-Match",
    ifModifiedSince: "If-Modified-Since",
    ifNoneMatch: "If-None-Match",
    ifRange: "If-Range",
    ifUnmodifiedSince: "If-Unmodified-Since",
    maxForwards: "Max-Forwards",
    origin: "Origin",
    proxyAuthorization: "Proxy-Authorization",
    range: "Range",
    referer: "Referer",
    te: "TE",
    userAgent: "User-Agent",
    dnt: "Dnt",
    xRequestedWith: "X-Requested-With",
    xCSRFToken: "X-CSRF-Token",
};
const _reqRevHeaderNameTransform = {
    "accept-patch": "acceptPatch",
    "accept-ranges": "acceptRanges",
    "age": "age",
    "allow": "allow",
    "alt-svc": "altSvc",
    "cache-control": "cacheControl",
    "connection": "connection",
    "content-disposition": "contentDisposition",
    "content-encoding": "contentEncoding",
    "content-language": "contentLanguage",
    "content-length": "contentLength",
    "content-location": "contentLocation",
    "content-range": "contentRange",
    "content-type": "contentType",
    "date": "date",
    "delta-base": "deltaBase",
    "etag": "eTag",
    "expires": "expires",
    "im": "im",
    "last-modified": "lastModified",
    "link": "link",
    "location": "location",
    "pragma": "pragma",
    "proxy-authenticate": "proxyAuthenticate",
    "public-key-pins": "publicKeyPins",
    "retry-after": "retryAfter",
    "server": "server",
    "set-cookie": "setCookie",
    "strict-transport-security": "strictTransportSecurity",
    "trailer": "trailer",
    "transfer-encoding": "transferEncoding",
    "tk": "tk",
    "upgrade": "upgrade",
    "vary": "vary",
    "via": "via",
    "warning": "warning",
    "www-authenticate": "wwwAuthenticate",
    "access-control-allow-origin": "accessControlAllowOrigin",
    "access-control-allow-credentials": "accessControlAllowCredentials",
    "access-control-expose-headers": "accessControlExposeHeaders",
    "access-control-max-age": "accessControlMaxAge",
    "access-control-allow-methods": "accessControlAllowMethods",
    "access-control-allow-headers": "accessControlAllowHeaders",
    "content-security-policy": "contentSecurityPolicy",
    "refresh": "refresh",
    "x-powered-by": "xPoweredBy",
    "x-request-id": "xRequestID",
    "x-ua-compatible": "xUACompatible",
    "x-xss-protection": "xXSSProtection",
    "a-im": "aIM",
    "accept": "accept",
    "accept-charset": "acceptCharset",
    "accept-encoding": "acceptEncoding",
    "accept-language": "acceptLanguage",
    "accept-datetime": "acceptDatetime",
    "access-control-request-method": "accessControlRequestMethod",
    "access-control-request-headers": "accessControlRequestHeaders",
    "authorization": "authorization",
    "cookie": "cookie",
    "expect": "expect",
    "forwarded": "forwarded",
    "from": "from",
    "host": "host",
    "if-match": "ifMatch",
    "if-modified-since": "ifModifiedSince",
    "if-none-match": "ifNoneMatch",
    "if-range": "ifRange",
    "if-unmodified-since": "ifUnmodifiedSince",
    "max-forwards": "maxForwards",
    "origin": "origin",
    "proxy-authorization": "proxyAuthorization",
    "range": "range",
    "referer": "referer",
    "te": "te",
    "user-agent": "userAgent",
    "dnt": "dnt",
    "x-requested-with": "xRequestedWith",
    "x-csrf-token": "xCSRFToken",
};
/**
 * @template {"get" | "delete" | "head" | "options" | "post" | "put" | "patch"} M
 * @template {XMLHttpRequestResponseType} R
 * @param {ReqOptions<M, R>} options 
 * @returns {Promise<ReqResponse<R>>}
 */
export function req<M extends "get" | "delete" | "head" | "options" | "post" | "put" | "patch", R extends XMLHttpRequestResponseType>(options: ReqOptions<M, R>): Promise<ReqResponse<R>> {
    return new Promise((resolve, reject) => {
        const bad = options.resolveWithErrors ? resolve : reject;
        let xhr = new XMLHttpRequest();
        xhr.open(options.method.toUpperCase(), options.url);
        let setHeaders: {[x: string]: string} = {};
        for (const [header, value] of Object.entries(options.headers || {})) {
            let h = (_reqHeaderNameTransform as {[x: string]: string})[header];
            if (!h) h = header.startsWith("@") ? header.slice(1) : header.match(/[A-Z][a-z]*(-[A-Z][a-z]*)*/) ? header : header.replace(/[A-Z]/g, "-$&").replace(/^[a-z]/, (m) => m.toUpperCase());
            xhr.setRequestHeader(h, value);
            setHeaders[h] = value;
        }
        Object.entries(options.headersRaw || {}).forEach(([header, value]) => {
            xhr.setRequestHeader(header, value);
            setHeaders[header] = value;
        });
        if (typeof options.responseType == "string") {
            xhr.responseType = options.responseType;
        }
        try {
            if (["post", "put", "patch", "delete"].includes(options.method)) {
                if (options.body instanceof Document || options.body instanceof Blob || options.body instanceof ArrayBuffer || options.body instanceof FormData || options.body instanceof URLSearchParams || typeof options.body == "string") {
                    xhr.send(options.body);
                } else if (typeof setHeaders["Content-Type"] == "string" && setHeaders["Content-Type"].match(/application\/x-www-form-urlencoded/)) {
                    xhr.send(new URLSearchParams(Object.entries(options.body || {})));
                } else if (typeof setHeaders["Content-Type"] == "string" && setHeaders["Content-Type"].match(/application\/json/)) {
                    xhr.send(JSON.stringify(options.body));
                } else {
                    xhr.send();
                }
            } else xhr.send();
        } catch (err) {
            bad({
                error: err,
                body: null,
                status: "Error",
                statusCode: -1,
                successful: false,
                headers: {},
                headersRaw: {}
            });
        }
        xhr.addEventListener("readystatechange", () => {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                let headerEntries = xhr.getAllResponseHeaders().split("\r\n").filter(v => v.length > 2);
                let headersRaw = Object.fromEntries(headerEntries.map(v => v.split(/: ?/, 2)));
                /**
                 * @type {ReqResponseHeaders}
                 */
                let headers: ReqResponseHeaders & {[x: string]: string} = Object.fromEntries(headerEntries.map(v => v.split(/: ?/, 2).map((h, i) => i === 0 ? (_reqRevHeaderNameTransform as {[x: string]: string})[h.toLowerCase()] : h)));
                if (options.rejectIfUnsuccessful && (xhr.status < 200 || xhr.status >= 300)) bad({
                    body: null,
                    status: xhr.statusText,
                    statusCode: xhr.status,
                    successful: false,
                    headers,
                    headersRaw,
                    error: `${xhr.status} ${xhr.statusText || "Network Error"}`
                });
                else resolve({
                    body: xhr.response,
                    status: xhr.status === 0 ? "Network Error" : xhr.statusText,
                    statusCode: xhr.status,
                    successful: xhr.status >= 200 && xhr.status < 300,
                    headers,
                    headersRaw
                });
            }
        });
        xhr.addEventListener("error", (event) => {
            bad({
                error: event,
                body: null,
                status: "Error",
                statusCode: -1,
                successful: false,
                headers: {},
                headersRaw: {}
            });
        });
    });
}
/**
 * 
 * @param {string | URL} url 
 * @param {ReqOptions<"get", any>} [options] 
 */
req.get = function(url: string | URL, options: ReqOptions<"get", any>) {
    return req({
        ...options,
        url,
        method: "get"
    });
};