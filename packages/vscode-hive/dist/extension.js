"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../../../../../node_modules/@opencode-ai/sdk/dist/gen/types.gen.js
var init_types_gen = __esm({
  "../../../../../../node_modules/@opencode-ai/sdk/dist/gen/types.gen.js"() {
  }
});

// ../../../../../../node_modules/@opencode-ai/sdk/dist/gen/core/serverSentEvents.gen.js
var createSseClient;
var init_serverSentEvents_gen = __esm({
  "../../../../../../node_modules/@opencode-ai/sdk/dist/gen/core/serverSentEvents.gen.js"() {
    createSseClient = ({ onSseError, onSseEvent, responseTransformer, responseValidator, sseDefaultRetryDelay, sseMaxRetryAttempts, sseMaxRetryDelay, sseSleepFn, url, ...options }) => {
      let lastEventId;
      const sleep = sseSleepFn ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
      const createStream = async function* () {
        let retryDelay = sseDefaultRetryDelay ?? 3e3;
        let attempt = 0;
        const signal = options.signal ?? new AbortController().signal;
        while (true) {
          if (signal.aborted)
            break;
          attempt++;
          const headers = options.headers instanceof Headers ? options.headers : new Headers(options.headers);
          if (lastEventId !== void 0) {
            headers.set("Last-Event-ID", lastEventId);
          }
          try {
            const response = await fetch(url, { ...options, headers, signal });
            if (!response.ok)
              throw new Error(`SSE failed: ${response.status} ${response.statusText}`);
            if (!response.body)
              throw new Error("No body in SSE response");
            const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
            let buffer = "";
            const abortHandler = () => {
              try {
                reader.cancel();
              } catch {
              }
            };
            signal.addEventListener("abort", abortHandler);
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done)
                  break;
                buffer += value;
                const chunks = buffer.split("\n\n");
                buffer = chunks.pop() ?? "";
                for (const chunk of chunks) {
                  const lines = chunk.split("\n");
                  const dataLines = [];
                  let eventName;
                  for (const line of lines) {
                    if (line.startsWith("data:")) {
                      dataLines.push(line.replace(/^data:\s*/, ""));
                    } else if (line.startsWith("event:")) {
                      eventName = line.replace(/^event:\s*/, "");
                    } else if (line.startsWith("id:")) {
                      lastEventId = line.replace(/^id:\s*/, "");
                    } else if (line.startsWith("retry:")) {
                      const parsed = Number.parseInt(line.replace(/^retry:\s*/, ""), 10);
                      if (!Number.isNaN(parsed)) {
                        retryDelay = parsed;
                      }
                    }
                  }
                  let data;
                  let parsedJson = false;
                  if (dataLines.length) {
                    const rawData = dataLines.join("\n");
                    try {
                      data = JSON.parse(rawData);
                      parsedJson = true;
                    } catch {
                      data = rawData;
                    }
                  }
                  if (parsedJson) {
                    if (responseValidator) {
                      await responseValidator(data);
                    }
                    if (responseTransformer) {
                      data = await responseTransformer(data);
                    }
                  }
                  onSseEvent?.({
                    data,
                    event: eventName,
                    id: lastEventId,
                    retry: retryDelay
                  });
                  if (dataLines.length) {
                    yield data;
                  }
                }
              }
            } finally {
              signal.removeEventListener("abort", abortHandler);
              reader.releaseLock();
            }
            break;
          } catch (error) {
            onSseError?.(error);
            if (sseMaxRetryAttempts !== void 0 && attempt >= sseMaxRetryAttempts) {
              break;
            }
            const backoff = Math.min(retryDelay * 2 ** (attempt - 1), sseMaxRetryDelay ?? 3e4);
            await sleep(backoff);
          }
        }
      };
      const stream = createStream();
      return { stream };
    };
  }
});

// ../../../../../../node_modules/@opencode-ai/sdk/dist/gen/core/auth.gen.js
var getAuthToken;
var init_auth_gen = __esm({
  "../../../../../../node_modules/@opencode-ai/sdk/dist/gen/core/auth.gen.js"() {
    getAuthToken = async (auth, callback) => {
      const token = typeof callback === "function" ? await callback(auth) : callback;
      if (!token) {
        return;
      }
      if (auth.scheme === "bearer") {
        return `Bearer ${token}`;
      }
      if (auth.scheme === "basic") {
        return `Basic ${btoa(token)}`;
      }
      return token;
    };
  }
});

// ../../../../../../node_modules/@opencode-ai/sdk/dist/gen/core/bodySerializer.gen.js
var jsonBodySerializer;
var init_bodySerializer_gen = __esm({
  "../../../../../../node_modules/@opencode-ai/sdk/dist/gen/core/bodySerializer.gen.js"() {
    jsonBodySerializer = {
      bodySerializer: (body) => JSON.stringify(body, (_key, value) => typeof value === "bigint" ? value.toString() : value)
    };
  }
});

// ../../../../../../node_modules/@opencode-ai/sdk/dist/gen/core/pathSerializer.gen.js
var separatorArrayExplode, separatorArrayNoExplode, separatorObjectExplode, serializeArrayParam, serializePrimitiveParam, serializeObjectParam;
var init_pathSerializer_gen = __esm({
  "../../../../../../node_modules/@opencode-ai/sdk/dist/gen/core/pathSerializer.gen.js"() {
    separatorArrayExplode = (style) => {
      switch (style) {
        case "label":
          return ".";
        case "matrix":
          return ";";
        case "simple":
          return ",";
        default:
          return "&";
      }
    };
    separatorArrayNoExplode = (style) => {
      switch (style) {
        case "form":
          return ",";
        case "pipeDelimited":
          return "|";
        case "spaceDelimited":
          return "%20";
        default:
          return ",";
      }
    };
    separatorObjectExplode = (style) => {
      switch (style) {
        case "label":
          return ".";
        case "matrix":
          return ";";
        case "simple":
          return ",";
        default:
          return "&";
      }
    };
    serializeArrayParam = ({ allowReserved, explode, name, style, value }) => {
      if (!explode) {
        const joinedValues2 = (allowReserved ? value : value.map((v) => encodeURIComponent(v))).join(separatorArrayNoExplode(style));
        switch (style) {
          case "label":
            return `.${joinedValues2}`;
          case "matrix":
            return `;${name}=${joinedValues2}`;
          case "simple":
            return joinedValues2;
          default:
            return `${name}=${joinedValues2}`;
        }
      }
      const separator = separatorArrayExplode(style);
      const joinedValues = value.map((v) => {
        if (style === "label" || style === "simple") {
          return allowReserved ? v : encodeURIComponent(v);
        }
        return serializePrimitiveParam({
          allowReserved,
          name,
          value: v
        });
      }).join(separator);
      return style === "label" || style === "matrix" ? separator + joinedValues : joinedValues;
    };
    serializePrimitiveParam = ({ allowReserved, name, value }) => {
      if (value === void 0 || value === null) {
        return "";
      }
      if (typeof value === "object") {
        throw new Error("Deeply-nested arrays/objects aren\u2019t supported. Provide your own `querySerializer()` to handle these.");
      }
      return `${name}=${allowReserved ? value : encodeURIComponent(value)}`;
    };
    serializeObjectParam = ({ allowReserved, explode, name, style, value, valueOnly }) => {
      if (value instanceof Date) {
        return valueOnly ? value.toISOString() : `${name}=${value.toISOString()}`;
      }
      if (style !== "deepObject" && !explode) {
        let values = [];
        Object.entries(value).forEach(([key, v]) => {
          values = [...values, key, allowReserved ? v : encodeURIComponent(v)];
        });
        const joinedValues2 = values.join(",");
        switch (style) {
          case "form":
            return `${name}=${joinedValues2}`;
          case "label":
            return `.${joinedValues2}`;
          case "matrix":
            return `;${name}=${joinedValues2}`;
          default:
            return joinedValues2;
        }
      }
      const separator = separatorObjectExplode(style);
      const joinedValues = Object.entries(value).map(([key, v]) => serializePrimitiveParam({
        allowReserved,
        name: style === "deepObject" ? `${name}[${key}]` : key,
        value: v
      })).join(separator);
      return style === "label" || style === "matrix" ? separator + joinedValues : joinedValues;
    };
  }
});

// ../../../../../../node_modules/@opencode-ai/sdk/dist/gen/core/utils.gen.js
var PATH_PARAM_RE, defaultPathSerializer, getUrl;
var init_utils_gen = __esm({
  "../../../../../../node_modules/@opencode-ai/sdk/dist/gen/core/utils.gen.js"() {
    init_pathSerializer_gen();
    PATH_PARAM_RE = /\{[^{}]+\}/g;
    defaultPathSerializer = ({ path: path7, url: _url }) => {
      let url = _url;
      const matches = _url.match(PATH_PARAM_RE);
      if (matches) {
        for (const match of matches) {
          let explode = false;
          let name = match.substring(1, match.length - 1);
          let style = "simple";
          if (name.endsWith("*")) {
            explode = true;
            name = name.substring(0, name.length - 1);
          }
          if (name.startsWith(".")) {
            name = name.substring(1);
            style = "label";
          } else if (name.startsWith(";")) {
            name = name.substring(1);
            style = "matrix";
          }
          const value = path7[name];
          if (value === void 0 || value === null) {
            continue;
          }
          if (Array.isArray(value)) {
            url = url.replace(match, serializeArrayParam({ explode, name, style, value }));
            continue;
          }
          if (typeof value === "object") {
            url = url.replace(match, serializeObjectParam({
              explode,
              name,
              style,
              value,
              valueOnly: true
            }));
            continue;
          }
          if (style === "matrix") {
            url = url.replace(match, `;${serializePrimitiveParam({
              name,
              value
            })}`);
            continue;
          }
          const replaceValue = encodeURIComponent(style === "label" ? `.${value}` : value);
          url = url.replace(match, replaceValue);
        }
      }
      return url;
    };
    getUrl = ({ baseUrl, path: path7, query, querySerializer, url: _url }) => {
      const pathUrl = _url.startsWith("/") ? _url : `/${_url}`;
      let url = (baseUrl ?? "") + pathUrl;
      if (path7) {
        url = defaultPathSerializer({ path: path7, url });
      }
      let search = query ? querySerializer(query) : "";
      if (search.startsWith("?")) {
        search = search.substring(1);
      }
      if (search) {
        url += `?${search}`;
      }
      return url;
    };
  }
});

// ../../../../../../node_modules/@opencode-ai/sdk/dist/gen/client/utils.gen.js
var createQuerySerializer, getParseAs, checkForExistence, setAuthParams, buildUrl, mergeConfigs, mergeHeaders, Interceptors, createInterceptors, defaultQuerySerializer, defaultHeaders, createConfig;
var init_utils_gen2 = __esm({
  "../../../../../../node_modules/@opencode-ai/sdk/dist/gen/client/utils.gen.js"() {
    init_auth_gen();
    init_bodySerializer_gen();
    init_pathSerializer_gen();
    init_utils_gen();
    createQuerySerializer = ({ allowReserved, array, object } = {}) => {
      const querySerializer = (queryParams) => {
        const search = [];
        if (queryParams && typeof queryParams === "object") {
          for (const name in queryParams) {
            const value = queryParams[name];
            if (value === void 0 || value === null) {
              continue;
            }
            if (Array.isArray(value)) {
              const serializedArray = serializeArrayParam({
                allowReserved,
                explode: true,
                name,
                style: "form",
                value,
                ...array
              });
              if (serializedArray)
                search.push(serializedArray);
            } else if (typeof value === "object") {
              const serializedObject = serializeObjectParam({
                allowReserved,
                explode: true,
                name,
                style: "deepObject",
                value,
                ...object
              });
              if (serializedObject)
                search.push(serializedObject);
            } else {
              const serializedPrimitive = serializePrimitiveParam({
                allowReserved,
                name,
                value
              });
              if (serializedPrimitive)
                search.push(serializedPrimitive);
            }
          }
        }
        return search.join("&");
      };
      return querySerializer;
    };
    getParseAs = (contentType) => {
      if (!contentType) {
        return "stream";
      }
      const cleanContent = contentType.split(";")[0]?.trim();
      if (!cleanContent) {
        return;
      }
      if (cleanContent.startsWith("application/json") || cleanContent.endsWith("+json")) {
        return "json";
      }
      if (cleanContent === "multipart/form-data") {
        return "formData";
      }
      if (["application/", "audio/", "image/", "video/"].some((type) => cleanContent.startsWith(type))) {
        return "blob";
      }
      if (cleanContent.startsWith("text/")) {
        return "text";
      }
      return;
    };
    checkForExistence = (options, name) => {
      if (!name) {
        return false;
      }
      if (options.headers.has(name) || options.query?.[name] || options.headers.get("Cookie")?.includes(`${name}=`)) {
        return true;
      }
      return false;
    };
    setAuthParams = async ({ security, ...options }) => {
      for (const auth of security) {
        if (checkForExistence(options, auth.name)) {
          continue;
        }
        const token = await getAuthToken(auth, options.auth);
        if (!token) {
          continue;
        }
        const name = auth.name ?? "Authorization";
        switch (auth.in) {
          case "query":
            if (!options.query) {
              options.query = {};
            }
            options.query[name] = token;
            break;
          case "cookie":
            options.headers.append("Cookie", `${name}=${token}`);
            break;
          case "header":
          default:
            options.headers.set(name, token);
            break;
        }
      }
    };
    buildUrl = (options) => getUrl({
      baseUrl: options.baseUrl,
      path: options.path,
      query: options.query,
      querySerializer: typeof options.querySerializer === "function" ? options.querySerializer : createQuerySerializer(options.querySerializer),
      url: options.url
    });
    mergeConfigs = (a, b) => {
      const config = { ...a, ...b };
      if (config.baseUrl?.endsWith("/")) {
        config.baseUrl = config.baseUrl.substring(0, config.baseUrl.length - 1);
      }
      config.headers = mergeHeaders(a.headers, b.headers);
      return config;
    };
    mergeHeaders = (...headers) => {
      const mergedHeaders = new Headers();
      for (const header of headers) {
        if (!header || typeof header !== "object") {
          continue;
        }
        const iterator = header instanceof Headers ? header.entries() : Object.entries(header);
        for (const [key, value] of iterator) {
          if (value === null) {
            mergedHeaders.delete(key);
          } else if (Array.isArray(value)) {
            for (const v of value) {
              mergedHeaders.append(key, v);
            }
          } else if (value !== void 0) {
            mergedHeaders.set(key, typeof value === "object" ? JSON.stringify(value) : value);
          }
        }
      }
      return mergedHeaders;
    };
    Interceptors = class {
      _fns;
      constructor() {
        this._fns = [];
      }
      clear() {
        this._fns = [];
      }
      getInterceptorIndex(id) {
        if (typeof id === "number") {
          return this._fns[id] ? id : -1;
        } else {
          return this._fns.indexOf(id);
        }
      }
      exists(id) {
        const index = this.getInterceptorIndex(id);
        return !!this._fns[index];
      }
      eject(id) {
        const index = this.getInterceptorIndex(id);
        if (this._fns[index]) {
          this._fns[index] = null;
        }
      }
      update(id, fn) {
        const index = this.getInterceptorIndex(id);
        if (this._fns[index]) {
          this._fns[index] = fn;
          return id;
        } else {
          return false;
        }
      }
      use(fn) {
        this._fns = [...this._fns, fn];
        return this._fns.length - 1;
      }
    };
    createInterceptors = () => ({
      error: new Interceptors(),
      request: new Interceptors(),
      response: new Interceptors()
    });
    defaultQuerySerializer = createQuerySerializer({
      allowReserved: false,
      array: {
        explode: true,
        style: "form"
      },
      object: {
        explode: true,
        style: "deepObject"
      }
    });
    defaultHeaders = {
      "Content-Type": "application/json"
    };
    createConfig = (override = {}) => ({
      ...jsonBodySerializer,
      headers: defaultHeaders,
      parseAs: "auto",
      querySerializer: defaultQuerySerializer,
      ...override
    });
  }
});

// ../../../../../../node_modules/@opencode-ai/sdk/dist/gen/client/client.gen.js
var createClient;
var init_client_gen = __esm({
  "../../../../../../node_modules/@opencode-ai/sdk/dist/gen/client/client.gen.js"() {
    init_serverSentEvents_gen();
    init_utils_gen2();
    createClient = (config = {}) => {
      let _config = mergeConfigs(createConfig(), config);
      const getConfig = () => ({ ..._config });
      const setConfig = (config2) => {
        _config = mergeConfigs(_config, config2);
        return getConfig();
      };
      const interceptors = createInterceptors();
      const beforeRequest = async (options) => {
        const opts = {
          ..._config,
          ...options,
          fetch: options.fetch ?? _config.fetch ?? globalThis.fetch,
          headers: mergeHeaders(_config.headers, options.headers),
          serializedBody: void 0
        };
        if (opts.security) {
          await setAuthParams({
            ...opts,
            security: opts.security
          });
        }
        if (opts.requestValidator) {
          await opts.requestValidator(opts);
        }
        if (opts.body && opts.bodySerializer) {
          opts.serializedBody = opts.bodySerializer(opts.body);
        }
        if (opts.serializedBody === void 0 || opts.serializedBody === "") {
          opts.headers.delete("Content-Type");
        }
        const url = buildUrl(opts);
        return { opts, url };
      };
      const request = async (options) => {
        const { opts, url } = await beforeRequest(options);
        const requestInit = {
          redirect: "follow",
          ...opts,
          body: opts.serializedBody
        };
        let request2 = new Request(url, requestInit);
        for (const fn of interceptors.request._fns) {
          if (fn) {
            request2 = await fn(request2, opts);
          }
        }
        const _fetch = opts.fetch;
        let response = await _fetch(request2);
        for (const fn of interceptors.response._fns) {
          if (fn) {
            response = await fn(response, request2, opts);
          }
        }
        const result = {
          request: request2,
          response
        };
        if (response.ok) {
          if (response.status === 204 || response.headers.get("Content-Length") === "0") {
            return opts.responseStyle === "data" ? {} : {
              data: {},
              ...result
            };
          }
          const parseAs = (opts.parseAs === "auto" ? getParseAs(response.headers.get("Content-Type")) : opts.parseAs) ?? "json";
          let data;
          switch (parseAs) {
            case "arrayBuffer":
            case "blob":
            case "formData":
            case "json":
            case "text":
              data = await response[parseAs]();
              break;
            case "stream":
              return opts.responseStyle === "data" ? response.body : {
                data: response.body,
                ...result
              };
          }
          if (parseAs === "json") {
            if (opts.responseValidator) {
              await opts.responseValidator(data);
            }
            if (opts.responseTransformer) {
              data = await opts.responseTransformer(data);
            }
          }
          return opts.responseStyle === "data" ? data : {
            data,
            ...result
          };
        }
        const textError = await response.text();
        let jsonError;
        try {
          jsonError = JSON.parse(textError);
        } catch {
        }
        const error = jsonError ?? textError;
        let finalError = error;
        for (const fn of interceptors.error._fns) {
          if (fn) {
            finalError = await fn(error, response, request2, opts);
          }
        }
        finalError = finalError || {};
        if (opts.throwOnError) {
          throw finalError;
        }
        return opts.responseStyle === "data" ? void 0 : {
          error: finalError,
          ...result
        };
      };
      const makeMethod = (method) => {
        const fn = (options) => request({ ...options, method });
        fn.sse = async (options) => {
          const { opts, url } = await beforeRequest(options);
          return createSseClient({
            ...opts,
            body: opts.body,
            headers: opts.headers,
            method,
            url
          });
        };
        return fn;
      };
      return {
        buildUrl,
        connect: makeMethod("CONNECT"),
        delete: makeMethod("DELETE"),
        get: makeMethod("GET"),
        getConfig,
        head: makeMethod("HEAD"),
        interceptors,
        options: makeMethod("OPTIONS"),
        patch: makeMethod("PATCH"),
        post: makeMethod("POST"),
        put: makeMethod("PUT"),
        request,
        setConfig,
        trace: makeMethod("TRACE")
      };
    };
  }
});

// ../../../../../../node_modules/@opencode-ai/sdk/dist/gen/core/params.gen.js
var extraPrefixesMap, extraPrefixes;
var init_params_gen = __esm({
  "../../../../../../node_modules/@opencode-ai/sdk/dist/gen/core/params.gen.js"() {
    extraPrefixesMap = {
      $body_: "body",
      $headers_: "headers",
      $path_: "path",
      $query_: "query"
    };
    extraPrefixes = Object.entries(extraPrefixesMap);
  }
});

// ../../../../../../node_modules/@opencode-ai/sdk/dist/gen/client/index.js
var init_client = __esm({
  "../../../../../../node_modules/@opencode-ai/sdk/dist/gen/client/index.js"() {
    init_bodySerializer_gen();
    init_params_gen();
    init_client_gen();
    init_utils_gen2();
  }
});

// ../../../../../../node_modules/@opencode-ai/sdk/dist/gen/client.gen.js
var client;
var init_client_gen2 = __esm({
  "../../../../../../node_modules/@opencode-ai/sdk/dist/gen/client.gen.js"() {
    init_client();
    client = createClient(createConfig({
      baseUrl: "http://localhost:4096"
    }));
  }
});

// ../../../../../../node_modules/@opencode-ai/sdk/dist/gen/sdk.gen.js
var _HeyApiClient, Global, Project, Pty, Config, Tool, Instance, Path, Vcs, Session, Command, Oauth, Provider, Find, File, App, Auth, Mcp, Lsp, Formatter, Control, Tui, Event, OpencodeClient;
var init_sdk_gen = __esm({
  "../../../../../../node_modules/@opencode-ai/sdk/dist/gen/sdk.gen.js"() {
    init_client_gen2();
    _HeyApiClient = class {
      _client = client;
      constructor(args) {
        if (args?.client) {
          this._client = args.client;
        }
      }
    };
    Global = class extends _HeyApiClient {
      /**
       * Get events
       */
      event(options) {
        return (options?.client ?? this._client).get.sse({
          url: "/global/event",
          ...options
        });
      }
    };
    Project = class extends _HeyApiClient {
      /**
       * List all projects
       */
      list(options) {
        return (options?.client ?? this._client).get({
          url: "/project",
          ...options
        });
      }
      /**
       * Get the current project
       */
      current(options) {
        return (options?.client ?? this._client).get({
          url: "/project/current",
          ...options
        });
      }
    };
    Pty = class extends _HeyApiClient {
      /**
       * List all PTY sessions
       */
      list(options) {
        return (options?.client ?? this._client).get({
          url: "/pty",
          ...options
        });
      }
      /**
       * Create a new PTY session
       */
      create(options) {
        return (options?.client ?? this._client).post({
          url: "/pty",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options?.headers
          }
        });
      }
      /**
       * Remove a PTY session
       */
      remove(options) {
        return (options.client ?? this._client).delete({
          url: "/pty/{id}",
          ...options
        });
      }
      /**
       * Get PTY session info
       */
      get(options) {
        return (options.client ?? this._client).get({
          url: "/pty/{id}",
          ...options
        });
      }
      /**
       * Update PTY session
       */
      update(options) {
        return (options.client ?? this._client).put({
          url: "/pty/{id}",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers
          }
        });
      }
      /**
       * Connect to a PTY session
       */
      connect(options) {
        return (options.client ?? this._client).get({
          url: "/pty/{id}/connect",
          ...options
        });
      }
    };
    Config = class extends _HeyApiClient {
      /**
       * Get config info
       */
      get(options) {
        return (options?.client ?? this._client).get({
          url: "/config",
          ...options
        });
      }
      /**
       * Update config
       */
      update(options) {
        return (options?.client ?? this._client).patch({
          url: "/config",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options?.headers
          }
        });
      }
      /**
       * List all providers
       */
      providers(options) {
        return (options?.client ?? this._client).get({
          url: "/config/providers",
          ...options
        });
      }
    };
    Tool = class extends _HeyApiClient {
      /**
       * List all tool IDs (including built-in and dynamically registered)
       */
      ids(options) {
        return (options?.client ?? this._client).get({
          url: "/experimental/tool/ids",
          ...options
        });
      }
      /**
       * List tools with JSON schema parameters for a provider/model
       */
      list(options) {
        return (options.client ?? this._client).get({
          url: "/experimental/tool",
          ...options
        });
      }
    };
    Instance = class extends _HeyApiClient {
      /**
       * Dispose the current instance
       */
      dispose(options) {
        return (options?.client ?? this._client).post({
          url: "/instance/dispose",
          ...options
        });
      }
    };
    Path = class extends _HeyApiClient {
      /**
       * Get the current path
       */
      get(options) {
        return (options?.client ?? this._client).get({
          url: "/path",
          ...options
        });
      }
    };
    Vcs = class extends _HeyApiClient {
      /**
       * Get VCS info for the current instance
       */
      get(options) {
        return (options?.client ?? this._client).get({
          url: "/vcs",
          ...options
        });
      }
    };
    Session = class extends _HeyApiClient {
      /**
       * List all sessions
       */
      list(options) {
        return (options?.client ?? this._client).get({
          url: "/session",
          ...options
        });
      }
      /**
       * Create a new session
       */
      create(options) {
        return (options?.client ?? this._client).post({
          url: "/session",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options?.headers
          }
        });
      }
      /**
       * Get session status
       */
      status(options) {
        return (options?.client ?? this._client).get({
          url: "/session/status",
          ...options
        });
      }
      /**
       * Delete a session and all its data
       */
      delete(options) {
        return (options.client ?? this._client).delete({
          url: "/session/{id}",
          ...options
        });
      }
      /**
       * Get session
       */
      get(options) {
        return (options.client ?? this._client).get({
          url: "/session/{id}",
          ...options
        });
      }
      /**
       * Update session properties
       */
      update(options) {
        return (options.client ?? this._client).patch({
          url: "/session/{id}",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers
          }
        });
      }
      /**
       * Get a session's children
       */
      children(options) {
        return (options.client ?? this._client).get({
          url: "/session/{id}/children",
          ...options
        });
      }
      /**
       * Get the todo list for a session
       */
      todo(options) {
        return (options.client ?? this._client).get({
          url: "/session/{id}/todo",
          ...options
        });
      }
      /**
       * Analyze the app and create an AGENTS.md file
       */
      init(options) {
        return (options.client ?? this._client).post({
          url: "/session/{id}/init",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers
          }
        });
      }
      /**
       * Fork an existing session at a specific message
       */
      fork(options) {
        return (options.client ?? this._client).post({
          url: "/session/{id}/fork",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers
          }
        });
      }
      /**
       * Abort a session
       */
      abort(options) {
        return (options.client ?? this._client).post({
          url: "/session/{id}/abort",
          ...options
        });
      }
      /**
       * Unshare the session
       */
      unshare(options) {
        return (options.client ?? this._client).delete({
          url: "/session/{id}/share",
          ...options
        });
      }
      /**
       * Share a session
       */
      share(options) {
        return (options.client ?? this._client).post({
          url: "/session/{id}/share",
          ...options
        });
      }
      /**
       * Get the diff for this session
       */
      diff(options) {
        return (options.client ?? this._client).get({
          url: "/session/{id}/diff",
          ...options
        });
      }
      /**
       * Summarize the session
       */
      summarize(options) {
        return (options.client ?? this._client).post({
          url: "/session/{id}/summarize",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers
          }
        });
      }
      /**
       * List messages for a session
       */
      messages(options) {
        return (options.client ?? this._client).get({
          url: "/session/{id}/message",
          ...options
        });
      }
      /**
       * Create and send a new message to a session
       */
      prompt(options) {
        return (options.client ?? this._client).post({
          url: "/session/{id}/message",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers
          }
        });
      }
      /**
       * Get a message from a session
       */
      message(options) {
        return (options.client ?? this._client).get({
          url: "/session/{id}/message/{messageID}",
          ...options
        });
      }
      /**
       * Create and send a new message to a session, start if needed and return immediately
       */
      promptAsync(options) {
        return (options.client ?? this._client).post({
          url: "/session/{id}/prompt_async",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers
          }
        });
      }
      /**
       * Send a new command to a session
       */
      command(options) {
        return (options.client ?? this._client).post({
          url: "/session/{id}/command",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers
          }
        });
      }
      /**
       * Run a shell command
       */
      shell(options) {
        return (options.client ?? this._client).post({
          url: "/session/{id}/shell",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers
          }
        });
      }
      /**
       * Revert a message
       */
      revert(options) {
        return (options.client ?? this._client).post({
          url: "/session/{id}/revert",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers
          }
        });
      }
      /**
       * Restore all reverted messages
       */
      unrevert(options) {
        return (options.client ?? this._client).post({
          url: "/session/{id}/unrevert",
          ...options
        });
      }
    };
    Command = class extends _HeyApiClient {
      /**
       * List all commands
       */
      list(options) {
        return (options?.client ?? this._client).get({
          url: "/command",
          ...options
        });
      }
    };
    Oauth = class extends _HeyApiClient {
      /**
       * Authorize a provider using OAuth
       */
      authorize(options) {
        return (options.client ?? this._client).post({
          url: "/provider/{id}/oauth/authorize",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers
          }
        });
      }
      /**
       * Handle OAuth callback for a provider
       */
      callback(options) {
        return (options.client ?? this._client).post({
          url: "/provider/{id}/oauth/callback",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers
          }
        });
      }
    };
    Provider = class extends _HeyApiClient {
      /**
       * List all providers
       */
      list(options) {
        return (options?.client ?? this._client).get({
          url: "/provider",
          ...options
        });
      }
      /**
       * Get provider authentication methods
       */
      auth(options) {
        return (options?.client ?? this._client).get({
          url: "/provider/auth",
          ...options
        });
      }
      oauth = new Oauth({ client: this._client });
    };
    Find = class extends _HeyApiClient {
      /**
       * Find text in files
       */
      text(options) {
        return (options.client ?? this._client).get({
          url: "/find",
          ...options
        });
      }
      /**
       * Find files
       */
      files(options) {
        return (options.client ?? this._client).get({
          url: "/find/file",
          ...options
        });
      }
      /**
       * Find workspace symbols
       */
      symbols(options) {
        return (options.client ?? this._client).get({
          url: "/find/symbol",
          ...options
        });
      }
    };
    File = class extends _HeyApiClient {
      /**
       * List files and directories
       */
      list(options) {
        return (options.client ?? this._client).get({
          url: "/file",
          ...options
        });
      }
      /**
       * Read a file
       */
      read(options) {
        return (options.client ?? this._client).get({
          url: "/file/content",
          ...options
        });
      }
      /**
       * Get file status
       */
      status(options) {
        return (options?.client ?? this._client).get({
          url: "/file/status",
          ...options
        });
      }
    };
    App = class extends _HeyApiClient {
      /**
       * Write a log entry to the server logs
       */
      log(options) {
        return (options?.client ?? this._client).post({
          url: "/log",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options?.headers
          }
        });
      }
      /**
       * List all agents
       */
      agents(options) {
        return (options?.client ?? this._client).get({
          url: "/agent",
          ...options
        });
      }
    };
    Auth = class extends _HeyApiClient {
      /**
       * Remove OAuth credentials for an MCP server
       */
      remove(options) {
        return (options.client ?? this._client).delete({
          url: "/mcp/{name}/auth",
          ...options
        });
      }
      /**
       * Start OAuth authentication flow for an MCP server
       */
      start(options) {
        return (options.client ?? this._client).post({
          url: "/mcp/{name}/auth",
          ...options
        });
      }
      /**
       * Complete OAuth authentication with authorization code
       */
      callback(options) {
        return (options.client ?? this._client).post({
          url: "/mcp/{name}/auth/callback",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers
          }
        });
      }
      /**
       * Start OAuth flow and wait for callback (opens browser)
       */
      authenticate(options) {
        return (options.client ?? this._client).post({
          url: "/mcp/{name}/auth/authenticate",
          ...options
        });
      }
      /**
       * Set authentication credentials
       */
      set(options) {
        return (options.client ?? this._client).put({
          url: "/auth/{id}",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers
          }
        });
      }
    };
    Mcp = class extends _HeyApiClient {
      /**
       * Get MCP server status
       */
      status(options) {
        return (options?.client ?? this._client).get({
          url: "/mcp",
          ...options
        });
      }
      /**
       * Add MCP server dynamically
       */
      add(options) {
        return (options?.client ?? this._client).post({
          url: "/mcp",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options?.headers
          }
        });
      }
      /**
       * Connect an MCP server
       */
      connect(options) {
        return (options.client ?? this._client).post({
          url: "/mcp/{name}/connect",
          ...options
        });
      }
      /**
       * Disconnect an MCP server
       */
      disconnect(options) {
        return (options.client ?? this._client).post({
          url: "/mcp/{name}/disconnect",
          ...options
        });
      }
      auth = new Auth({ client: this._client });
    };
    Lsp = class extends _HeyApiClient {
      /**
       * Get LSP server status
       */
      status(options) {
        return (options?.client ?? this._client).get({
          url: "/lsp",
          ...options
        });
      }
    };
    Formatter = class extends _HeyApiClient {
      /**
       * Get formatter status
       */
      status(options) {
        return (options?.client ?? this._client).get({
          url: "/formatter",
          ...options
        });
      }
    };
    Control = class extends _HeyApiClient {
      /**
       * Get the next TUI request from the queue
       */
      next(options) {
        return (options?.client ?? this._client).get({
          url: "/tui/control/next",
          ...options
        });
      }
      /**
       * Submit a response to the TUI request queue
       */
      response(options) {
        return (options?.client ?? this._client).post({
          url: "/tui/control/response",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options?.headers
          }
        });
      }
    };
    Tui = class extends _HeyApiClient {
      /**
       * Append prompt to the TUI
       */
      appendPrompt(options) {
        return (options?.client ?? this._client).post({
          url: "/tui/append-prompt",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options?.headers
          }
        });
      }
      /**
       * Open the help dialog
       */
      openHelp(options) {
        return (options?.client ?? this._client).post({
          url: "/tui/open-help",
          ...options
        });
      }
      /**
       * Open the session dialog
       */
      openSessions(options) {
        return (options?.client ?? this._client).post({
          url: "/tui/open-sessions",
          ...options
        });
      }
      /**
       * Open the theme dialog
       */
      openThemes(options) {
        return (options?.client ?? this._client).post({
          url: "/tui/open-themes",
          ...options
        });
      }
      /**
       * Open the model dialog
       */
      openModels(options) {
        return (options?.client ?? this._client).post({
          url: "/tui/open-models",
          ...options
        });
      }
      /**
       * Submit the prompt
       */
      submitPrompt(options) {
        return (options?.client ?? this._client).post({
          url: "/tui/submit-prompt",
          ...options
        });
      }
      /**
       * Clear the prompt
       */
      clearPrompt(options) {
        return (options?.client ?? this._client).post({
          url: "/tui/clear-prompt",
          ...options
        });
      }
      /**
       * Execute a TUI command (e.g. agent_cycle)
       */
      executeCommand(options) {
        return (options?.client ?? this._client).post({
          url: "/tui/execute-command",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options?.headers
          }
        });
      }
      /**
       * Show a toast notification in the TUI
       */
      showToast(options) {
        return (options?.client ?? this._client).post({
          url: "/tui/show-toast",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options?.headers
          }
        });
      }
      /**
       * Publish a TUI event
       */
      publish(options) {
        return (options?.client ?? this._client).post({
          url: "/tui/publish",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options?.headers
          }
        });
      }
      control = new Control({ client: this._client });
    };
    Event = class extends _HeyApiClient {
      /**
       * Get events
       */
      subscribe(options) {
        return (options?.client ?? this._client).get.sse({
          url: "/event",
          ...options
        });
      }
    };
    OpencodeClient = class extends _HeyApiClient {
      /**
       * Respond to a permission request
       */
      postSessionIdPermissionsPermissionId(options) {
        return (options.client ?? this._client).post({
          url: "/session/{id}/permissions/{permissionID}",
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers
          }
        });
      }
      global = new Global({ client: this._client });
      project = new Project({ client: this._client });
      pty = new Pty({ client: this._client });
      config = new Config({ client: this._client });
      tool = new Tool({ client: this._client });
      instance = new Instance({ client: this._client });
      path = new Path({ client: this._client });
      vcs = new Vcs({ client: this._client });
      session = new Session({ client: this._client });
      command = new Command({ client: this._client });
      provider = new Provider({ client: this._client });
      find = new Find({ client: this._client });
      file = new File({ client: this._client });
      app = new App({ client: this._client });
      mcp = new Mcp({ client: this._client });
      lsp = new Lsp({ client: this._client });
      formatter = new Formatter({ client: this._client });
      tui = new Tui({ client: this._client });
      auth = new Auth({ client: this._client });
      event = new Event({ client: this._client });
    };
  }
});

// ../../../../../../node_modules/@opencode-ai/sdk/dist/client.js
function createOpencodeClient(config) {
  if (!config?.fetch) {
    const customFetch = (req) => {
      req.timeout = false;
      return fetch(req);
    };
    config = {
      ...config,
      fetch: customFetch
    };
  }
  if (config?.directory) {
    config.headers = {
      ...config.headers,
      "x-opencode-directory": config.directory
    };
  }
  const client2 = createClient(config);
  return new OpencodeClient({ client: client2 });
}
var init_client2 = __esm({
  "../../../../../../node_modules/@opencode-ai/sdk/dist/client.js"() {
    init_types_gen();
    init_client_gen();
    init_sdk_gen();
  }
});

// ../../../../../../node_modules/@opencode-ai/sdk/dist/server.js
async function createOpencodeServer(options) {
  options = Object.assign({
    hostname: "127.0.0.1",
    port: 4096,
    timeout: 5e3
  }, options ?? {});
  const args = [`serve`, `--hostname=${options.hostname}`, `--port=${options.port}`];
  if (options.config?.logLevel)
    args.push(`--log-level=${options.config.logLevel}`);
  const proc = (0, import_node_child_process.spawn)(`opencode`, args, {
    signal: options.signal,
    env: {
      ...process.env,
      OPENCODE_CONFIG_CONTENT: JSON.stringify(options.config ?? {})
    }
  });
  const url = await new Promise((resolve, reject) => {
    const id = setTimeout(() => {
      reject(new Error(`Timeout waiting for server to start after ${options.timeout}ms`));
    }, options.timeout);
    let output = "";
    proc.stdout?.on("data", (chunk) => {
      output += chunk.toString();
      const lines = output.split("\n");
      for (const line of lines) {
        if (line.startsWith("opencode server listening")) {
          const match = line.match(/on\s+(https?:\/\/[^\s]+)/);
          if (!match) {
            throw new Error(`Failed to parse server url from output: ${line}`);
          }
          clearTimeout(id);
          resolve(match[1]);
          return;
        }
      }
    });
    proc.stderr?.on("data", (chunk) => {
      output += chunk.toString();
    });
    proc.on("exit", (code) => {
      clearTimeout(id);
      let msg = `Server exited with code ${code}`;
      if (output.trim()) {
        msg += `
Server output: ${output}`;
      }
      reject(new Error(msg));
    });
    proc.on("error", (error) => {
      clearTimeout(id);
      reject(error);
    });
    if (options.signal) {
      options.signal.addEventListener("abort", () => {
        clearTimeout(id);
        reject(new Error("Aborted"));
      });
    }
  });
  return {
    url,
    close() {
      proc.kill();
    }
  };
}
function createOpencodeTui(options) {
  const args = [];
  if (options?.project) {
    args.push(`--project=${options.project}`);
  }
  if (options?.model) {
    args.push(`--model=${options.model}`);
  }
  if (options?.session) {
    args.push(`--session=${options.session}`);
  }
  if (options?.agent) {
    args.push(`--agent=${options.agent}`);
  }
  const proc = (0, import_node_child_process.spawn)(`opencode`, args, {
    signal: options?.signal,
    stdio: "inherit",
    env: {
      ...process.env,
      OPENCODE_CONFIG_CONTENT: JSON.stringify(options?.config ?? {})
    }
  });
  return {
    close() {
      proc.kill();
    }
  };
}
var import_node_child_process;
var init_server = __esm({
  "../../../../../../node_modules/@opencode-ai/sdk/dist/server.js"() {
    import_node_child_process = require("node:child_process");
  }
});

// ../../../../../../node_modules/@opencode-ai/sdk/dist/index.js
var dist_exports = {};
__export(dist_exports, {
  OpencodeClient: () => OpencodeClient,
  createOpencode: () => createOpencode,
  createOpencodeClient: () => createOpencodeClient,
  createOpencodeServer: () => createOpencodeServer,
  createOpencodeTui: () => createOpencodeTui
});
async function createOpencode(options) {
  const server = await createOpencodeServer({
    ...options
  });
  const client2 = createOpencodeClient({
    baseUrl: server.url
  });
  return {
    client: client2,
    server
  };
}
var init_dist = __esm({
  "../../../../../../node_modules/@opencode-ai/sdk/dist/index.js"() {
    init_client2();
    init_server();
    init_client2();
    init_server();
  }
});

// ../../../../../../node_modules/ms/index.js
var require_ms = __commonJS({
  "../../../../../../node_modules/ms/index.js"(exports2, module2) {
    var s = 1e3;
    var m = s * 60;
    var h = m * 60;
    var d = h * 24;
    var w = d * 7;
    var y = d * 365.25;
    module2.exports = function(val, options) {
      options = options || {};
      var type = typeof val;
      if (type === "string" && val.length > 0) {
        return parse(val);
      } else if (type === "number" && isFinite(val)) {
        return options.long ? fmtLong(val) : fmtShort(val);
      }
      throw new Error(
        "val is not a non-empty string or a valid number. val=" + JSON.stringify(val)
      );
    };
    function parse(str) {
      str = String(str);
      if (str.length > 100) {
        return;
      }
      var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(
        str
      );
      if (!match) {
        return;
      }
      var n = parseFloat(match[1]);
      var type = (match[2] || "ms").toLowerCase();
      switch (type) {
        case "years":
        case "year":
        case "yrs":
        case "yr":
        case "y":
          return n * y;
        case "weeks":
        case "week":
        case "w":
          return n * w;
        case "days":
        case "day":
        case "d":
          return n * d;
        case "hours":
        case "hour":
        case "hrs":
        case "hr":
        case "h":
          return n * h;
        case "minutes":
        case "minute":
        case "mins":
        case "min":
        case "m":
          return n * m;
        case "seconds":
        case "second":
        case "secs":
        case "sec":
        case "s":
          return n * s;
        case "milliseconds":
        case "millisecond":
        case "msecs":
        case "msec":
        case "ms":
          return n;
        default:
          return void 0;
      }
    }
    function fmtShort(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return Math.round(ms / d) + "d";
      }
      if (msAbs >= h) {
        return Math.round(ms / h) + "h";
      }
      if (msAbs >= m) {
        return Math.round(ms / m) + "m";
      }
      if (msAbs >= s) {
        return Math.round(ms / s) + "s";
      }
      return ms + "ms";
    }
    function fmtLong(ms) {
      var msAbs = Math.abs(ms);
      if (msAbs >= d) {
        return plural(ms, msAbs, d, "day");
      }
      if (msAbs >= h) {
        return plural(ms, msAbs, h, "hour");
      }
      if (msAbs >= m) {
        return plural(ms, msAbs, m, "minute");
      }
      if (msAbs >= s) {
        return plural(ms, msAbs, s, "second");
      }
      return ms + " ms";
    }
    function plural(ms, msAbs, n, name) {
      var isPlural = msAbs >= n * 1.5;
      return Math.round(ms / n) + " " + name + (isPlural ? "s" : "");
    }
  }
});

// ../../../../../../node_modules/debug/src/common.js
var require_common = __commonJS({
  "../../../../../../node_modules/debug/src/common.js"(exports2, module2) {
    function setup(env) {
      createDebug.debug = createDebug;
      createDebug.default = createDebug;
      createDebug.coerce = coerce;
      createDebug.disable = disable;
      createDebug.enable = enable;
      createDebug.enabled = enabled;
      createDebug.humanize = require_ms();
      createDebug.destroy = destroy;
      Object.keys(env).forEach((key) => {
        createDebug[key] = env[key];
      });
      createDebug.names = [];
      createDebug.skips = [];
      createDebug.formatters = {};
      function selectColor(namespace) {
        let hash = 0;
        for (let i = 0; i < namespace.length; i++) {
          hash = (hash << 5) - hash + namespace.charCodeAt(i);
          hash |= 0;
        }
        return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
      }
      createDebug.selectColor = selectColor;
      function createDebug(namespace) {
        let prevTime;
        let enableOverride = null;
        let namespacesCache;
        let enabledCache;
        function debug2(...args) {
          if (!debug2.enabled) {
            return;
          }
          const self = debug2;
          const curr = Number(/* @__PURE__ */ new Date());
          const ms = curr - (prevTime || curr);
          self.diff = ms;
          self.prev = prevTime;
          self.curr = curr;
          prevTime = curr;
          args[0] = createDebug.coerce(args[0]);
          if (typeof args[0] !== "string") {
            args.unshift("%O");
          }
          let index = 0;
          args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
            if (match === "%%") {
              return "%";
            }
            index++;
            const formatter = createDebug.formatters[format];
            if (typeof formatter === "function") {
              const val = args[index];
              match = formatter.call(self, val);
              args.splice(index, 1);
              index--;
            }
            return match;
          });
          createDebug.formatArgs.call(self, args);
          const logFn = self.log || createDebug.log;
          logFn.apply(self, args);
        }
        debug2.namespace = namespace;
        debug2.useColors = createDebug.useColors();
        debug2.color = createDebug.selectColor(namespace);
        debug2.extend = extend;
        debug2.destroy = createDebug.destroy;
        Object.defineProperty(debug2, "enabled", {
          enumerable: true,
          configurable: false,
          get: () => {
            if (enableOverride !== null) {
              return enableOverride;
            }
            if (namespacesCache !== createDebug.namespaces) {
              namespacesCache = createDebug.namespaces;
              enabledCache = createDebug.enabled(namespace);
            }
            return enabledCache;
          },
          set: (v) => {
            enableOverride = v;
          }
        });
        if (typeof createDebug.init === "function") {
          createDebug.init(debug2);
        }
        return debug2;
      }
      function extend(namespace, delimiter) {
        const newDebug = createDebug(this.namespace + (typeof delimiter === "undefined" ? ":" : delimiter) + namespace);
        newDebug.log = this.log;
        return newDebug;
      }
      function enable(namespaces) {
        createDebug.save(namespaces);
        createDebug.namespaces = namespaces;
        createDebug.names = [];
        createDebug.skips = [];
        const split = (typeof namespaces === "string" ? namespaces : "").trim().replace(/\s+/g, ",").split(",").filter(Boolean);
        for (const ns of split) {
          if (ns[0] === "-") {
            createDebug.skips.push(ns.slice(1));
          } else {
            createDebug.names.push(ns);
          }
        }
      }
      function matchesTemplate(search, template) {
        let searchIndex = 0;
        let templateIndex = 0;
        let starIndex = -1;
        let matchIndex = 0;
        while (searchIndex < search.length) {
          if (templateIndex < template.length && (template[templateIndex] === search[searchIndex] || template[templateIndex] === "*")) {
            if (template[templateIndex] === "*") {
              starIndex = templateIndex;
              matchIndex = searchIndex;
              templateIndex++;
            } else {
              searchIndex++;
              templateIndex++;
            }
          } else if (starIndex !== -1) {
            templateIndex = starIndex + 1;
            matchIndex++;
            searchIndex = matchIndex;
          } else {
            return false;
          }
        }
        while (templateIndex < template.length && template[templateIndex] === "*") {
          templateIndex++;
        }
        return templateIndex === template.length;
      }
      function disable() {
        const namespaces = [
          ...createDebug.names,
          ...createDebug.skips.map((namespace) => "-" + namespace)
        ].join(",");
        createDebug.enable("");
        return namespaces;
      }
      function enabled(name) {
        for (const skip of createDebug.skips) {
          if (matchesTemplate(name, skip)) {
            return false;
          }
        }
        for (const ns of createDebug.names) {
          if (matchesTemplate(name, ns)) {
            return true;
          }
        }
        return false;
      }
      function coerce(val) {
        if (val instanceof Error) {
          return val.stack || val.message;
        }
        return val;
      }
      function destroy() {
        console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
      }
      createDebug.enable(createDebug.load());
      return createDebug;
    }
    module2.exports = setup;
  }
});

// ../../../../../../node_modules/debug/src/browser.js
var require_browser = __commonJS({
  "../../../../../../node_modules/debug/src/browser.js"(exports2, module2) {
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.storage = localstorage();
    exports2.destroy = /* @__PURE__ */ (() => {
      let warned = false;
      return () => {
        if (!warned) {
          warned = true;
          console.warn("Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
        }
      };
    })();
    exports2.colors = [
      "#0000CC",
      "#0000FF",
      "#0033CC",
      "#0033FF",
      "#0066CC",
      "#0066FF",
      "#0099CC",
      "#0099FF",
      "#00CC00",
      "#00CC33",
      "#00CC66",
      "#00CC99",
      "#00CCCC",
      "#00CCFF",
      "#3300CC",
      "#3300FF",
      "#3333CC",
      "#3333FF",
      "#3366CC",
      "#3366FF",
      "#3399CC",
      "#3399FF",
      "#33CC00",
      "#33CC33",
      "#33CC66",
      "#33CC99",
      "#33CCCC",
      "#33CCFF",
      "#6600CC",
      "#6600FF",
      "#6633CC",
      "#6633FF",
      "#66CC00",
      "#66CC33",
      "#9900CC",
      "#9900FF",
      "#9933CC",
      "#9933FF",
      "#99CC00",
      "#99CC33",
      "#CC0000",
      "#CC0033",
      "#CC0066",
      "#CC0099",
      "#CC00CC",
      "#CC00FF",
      "#CC3300",
      "#CC3333",
      "#CC3366",
      "#CC3399",
      "#CC33CC",
      "#CC33FF",
      "#CC6600",
      "#CC6633",
      "#CC9900",
      "#CC9933",
      "#CCCC00",
      "#CCCC33",
      "#FF0000",
      "#FF0033",
      "#FF0066",
      "#FF0099",
      "#FF00CC",
      "#FF00FF",
      "#FF3300",
      "#FF3333",
      "#FF3366",
      "#FF3399",
      "#FF33CC",
      "#FF33FF",
      "#FF6600",
      "#FF6633",
      "#FF9900",
      "#FF9933",
      "#FFCC00",
      "#FFCC33"
    ];
    function useColors() {
      if (typeof window !== "undefined" && window.process && (window.process.type === "renderer" || window.process.__nwjs)) {
        return true;
      }
      if (typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
        return false;
      }
      let m;
      return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || // Is firebug? http://stackoverflow.com/a/398120/376773
      typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || // Is firefox >= v31?
      // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
      typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || // Double check webkit in userAgent just in case we are in a worker
      typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
    }
    function formatArgs(args) {
      args[0] = (this.useColors ? "%c" : "") + this.namespace + (this.useColors ? " %c" : " ") + args[0] + (this.useColors ? "%c " : " ") + "+" + module2.exports.humanize(this.diff);
      if (!this.useColors) {
        return;
      }
      const c = "color: " + this.color;
      args.splice(1, 0, c, "color: inherit");
      let index = 0;
      let lastC = 0;
      args[0].replace(/%[a-zA-Z%]/g, (match) => {
        if (match === "%%") {
          return;
        }
        index++;
        if (match === "%c") {
          lastC = index;
        }
      });
      args.splice(lastC, 0, c);
    }
    exports2.log = console.debug || console.log || (() => {
    });
    function save(namespaces) {
      try {
        if (namespaces) {
          exports2.storage.setItem("debug", namespaces);
        } else {
          exports2.storage.removeItem("debug");
        }
      } catch (error) {
      }
    }
    function load() {
      let r;
      try {
        r = exports2.storage.getItem("debug") || exports2.storage.getItem("DEBUG");
      } catch (error) {
      }
      if (!r && typeof process !== "undefined" && "env" in process) {
        r = process.env.DEBUG;
      }
      return r;
    }
    function localstorage() {
      try {
        return localStorage;
      } catch (error) {
      }
    }
    module2.exports = require_common()(exports2);
    var { formatters } = module2.exports;
    formatters.j = function(v) {
      try {
        return JSON.stringify(v);
      } catch (error) {
        return "[UnexpectedJSONParseError]: " + error.message;
      }
    };
  }
});

// ../../../../../../../node_modules/has-flag/index.js
var require_has_flag = __commonJS({
  "../../../../../../../node_modules/has-flag/index.js"(exports2, module2) {
    "use strict";
    module2.exports = (flag, argv = process.argv) => {
      const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
      const position = argv.indexOf(prefix + flag);
      const terminatorPosition = argv.indexOf("--");
      return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
    };
  }
});

// ../../../../../../../node_modules/supports-color/index.js
var require_supports_color = __commonJS({
  "../../../../../../../node_modules/supports-color/index.js"(exports2, module2) {
    "use strict";
    var os = require("os");
    var tty = require("tty");
    var hasFlag = require_has_flag();
    var { env } = process;
    var flagForceColor;
    if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
      flagForceColor = 0;
    } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
      flagForceColor = 1;
    }
    function envForceColor() {
      if ("FORCE_COLOR" in env) {
        if (env.FORCE_COLOR === "true") {
          return 1;
        }
        if (env.FORCE_COLOR === "false") {
          return 0;
        }
        return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
      }
    }
    function translateLevel(level) {
      if (level === 0) {
        return false;
      }
      return {
        level,
        hasBasic: true,
        has256: level >= 2,
        has16m: level >= 3
      };
    }
    function supportsColor(haveStream, { streamIsTTY, sniffFlags = true } = {}) {
      const noFlagForceColor = envForceColor();
      if (noFlagForceColor !== void 0) {
        flagForceColor = noFlagForceColor;
      }
      const forceColor = sniffFlags ? flagForceColor : noFlagForceColor;
      if (forceColor === 0) {
        return 0;
      }
      if (sniffFlags) {
        if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
          return 3;
        }
        if (hasFlag("color=256")) {
          return 2;
        }
      }
      if (haveStream && !streamIsTTY && forceColor === void 0) {
        return 0;
      }
      const min = forceColor || 0;
      if (env.TERM === "dumb") {
        return min;
      }
      if (process.platform === "win32") {
        const osRelease = os.release().split(".");
        if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
          return Number(osRelease[2]) >= 14931 ? 3 : 2;
        }
        return 1;
      }
      if ("CI" in env) {
        if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE", "DRONE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
          return 1;
        }
        return min;
      }
      if ("TEAMCITY_VERSION" in env) {
        return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
      }
      if (env.COLORTERM === "truecolor") {
        return 3;
      }
      if ("TERM_PROGRAM" in env) {
        const version = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
        switch (env.TERM_PROGRAM) {
          case "iTerm.app":
            return version >= 3 ? 3 : 2;
          case "Apple_Terminal":
            return 2;
        }
      }
      if (/-256(color)?$/i.test(env.TERM)) {
        return 2;
      }
      if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
        return 1;
      }
      if ("COLORTERM" in env) {
        return 1;
      }
      return min;
    }
    function getSupportLevel(stream, options = {}) {
      const level = supportsColor(stream, {
        streamIsTTY: stream && stream.isTTY,
        ...options
      });
      return translateLevel(level);
    }
    module2.exports = {
      supportsColor: getSupportLevel,
      stdout: getSupportLevel({ isTTY: tty.isatty(1) }),
      stderr: getSupportLevel({ isTTY: tty.isatty(2) })
    };
  }
});

// ../../../../../../node_modules/debug/src/node.js
var require_node = __commonJS({
  "../../../../../../node_modules/debug/src/node.js"(exports2, module2) {
    var tty = require("tty");
    var util = require("util");
    exports2.init = init;
    exports2.log = log;
    exports2.formatArgs = formatArgs;
    exports2.save = save;
    exports2.load = load;
    exports2.useColors = useColors;
    exports2.destroy = util.deprecate(
      () => {
      },
      "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`."
    );
    exports2.colors = [6, 2, 3, 4, 5, 1];
    try {
      const supportsColor = require_supports_color();
      if (supportsColor && (supportsColor.stderr || supportsColor).level >= 2) {
        exports2.colors = [
          20,
          21,
          26,
          27,
          32,
          33,
          38,
          39,
          40,
          41,
          42,
          43,
          44,
          45,
          56,
          57,
          62,
          63,
          68,
          69,
          74,
          75,
          76,
          77,
          78,
          79,
          80,
          81,
          92,
          93,
          98,
          99,
          112,
          113,
          128,
          129,
          134,
          135,
          148,
          149,
          160,
          161,
          162,
          163,
          164,
          165,
          166,
          167,
          168,
          169,
          170,
          171,
          172,
          173,
          178,
          179,
          184,
          185,
          196,
          197,
          198,
          199,
          200,
          201,
          202,
          203,
          204,
          205,
          206,
          207,
          208,
          209,
          214,
          215,
          220,
          221
        ];
      }
    } catch (error) {
    }
    exports2.inspectOpts = Object.keys(process.env).filter((key) => {
      return /^debug_/i.test(key);
    }).reduce((obj, key) => {
      const prop = key.substring(6).toLowerCase().replace(/_([a-z])/g, (_, k) => {
        return k.toUpperCase();
      });
      let val = process.env[key];
      if (/^(yes|on|true|enabled)$/i.test(val)) {
        val = true;
      } else if (/^(no|off|false|disabled)$/i.test(val)) {
        val = false;
      } else if (val === "null") {
        val = null;
      } else {
        val = Number(val);
      }
      obj[prop] = val;
      return obj;
    }, {});
    function useColors() {
      return "colors" in exports2.inspectOpts ? Boolean(exports2.inspectOpts.colors) : tty.isatty(process.stderr.fd);
    }
    function formatArgs(args) {
      const { namespace: name, useColors: useColors2 } = this;
      if (useColors2) {
        const c = this.color;
        const colorCode = "\x1B[3" + (c < 8 ? c : "8;5;" + c);
        const prefix = `  ${colorCode};1m${name} \x1B[0m`;
        args[0] = prefix + args[0].split("\n").join("\n" + prefix);
        args.push(colorCode + "m+" + module2.exports.humanize(this.diff) + "\x1B[0m");
      } else {
        args[0] = getDate() + name + " " + args[0];
      }
    }
    function getDate() {
      if (exports2.inspectOpts.hideDate) {
        return "";
      }
      return (/* @__PURE__ */ new Date()).toISOString() + " ";
    }
    function log(...args) {
      return process.stderr.write(util.formatWithOptions(exports2.inspectOpts, ...args) + "\n");
    }
    function save(namespaces) {
      if (namespaces) {
        process.env.DEBUG = namespaces;
      } else {
        delete process.env.DEBUG;
      }
    }
    function load() {
      return process.env.DEBUG;
    }
    function init(debug2) {
      debug2.inspectOpts = {};
      const keys = Object.keys(exports2.inspectOpts);
      for (let i = 0; i < keys.length; i++) {
        debug2.inspectOpts[keys[i]] = exports2.inspectOpts[keys[i]];
      }
    }
    module2.exports = require_common()(exports2);
    var { formatters } = module2.exports;
    formatters.o = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts).split("\n").map((str) => str.trim()).join(" ");
    };
    formatters.O = function(v) {
      this.inspectOpts.colors = this.useColors;
      return util.inspect(v, this.inspectOpts);
    };
  }
});

// ../../../../../../node_modules/debug/src/index.js
var require_src = __commonJS({
  "../../../../../../node_modules/debug/src/index.js"(exports2, module2) {
    if (typeof process === "undefined" || process.type === "renderer" || process.browser === true || process.__nwjs) {
      module2.exports = require_browser();
    } else {
      module2.exports = require_node();
    }
  }
});

// ../../../../../../node_modules/@kwsites/file-exists/dist/src/index.js
var require_src2 = __commonJS({
  "../../../../../../node_modules/@kwsites/file-exists/dist/src/index.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var fs_1 = require("fs");
    var debug_1 = __importDefault(require_src());
    var log = debug_1.default("@kwsites/file-exists");
    function check(path7, isFile, isDirectory) {
      log(`checking %s`, path7);
      try {
        const stat = fs_1.statSync(path7);
        if (stat.isFile() && isFile) {
          log(`[OK] path represents a file`);
          return true;
        }
        if (stat.isDirectory() && isDirectory) {
          log(`[OK] path represents a directory`);
          return true;
        }
        log(`[FAIL] path represents something other than a file or directory`);
        return false;
      } catch (e) {
        if (e.code === "ENOENT") {
          log(`[FAIL] path is not accessible: %o`, e);
          return false;
        }
        log(`[FATAL] %o`, e);
        throw e;
      }
    }
    function exists2(path7, type = exports2.READABLE) {
      return check(path7, (type & exports2.FILE) > 0, (type & exports2.FOLDER) > 0);
    }
    exports2.exists = exists2;
    exports2.FILE = 1;
    exports2.FOLDER = 2;
    exports2.READABLE = exports2.FILE + exports2.FOLDER;
  }
});

// ../../../../../../node_modules/@kwsites/file-exists/dist/index.js
var require_dist = __commonJS({
  "../../../../../../node_modules/@kwsites/file-exists/dist/index.js"(exports2) {
    "use strict";
    function __export3(m) {
      for (var p in m) if (!exports2.hasOwnProperty(p)) exports2[p] = m[p];
    }
    Object.defineProperty(exports2, "__esModule", { value: true });
    __export3(require_src2());
  }
});

// ../../../../../../node_modules/@kwsites/promise-deferred/dist/index.js
var require_dist2 = __commonJS({
  "../../../../../../node_modules/@kwsites/promise-deferred/dist/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createDeferred = exports2.deferred = void 0;
    function deferred2() {
      let done;
      let fail;
      let status = "pending";
      const promise = new Promise((_done, _fail) => {
        done = _done;
        fail = _fail;
      });
      return {
        promise,
        done(result) {
          if (status === "pending") {
            status = "resolved";
            done(result);
          }
        },
        fail(error) {
          if (status === "pending") {
            status = "rejected";
            fail(error);
          }
        },
        get fulfilled() {
          return status !== "pending";
        },
        get status() {
          return status;
        }
      };
    }
    exports2.deferred = deferred2;
    exports2.createDeferred = deferred2;
    exports2.default = deferred2;
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode7 = __toESM(require("vscode"));
var fs7 = __toESM(require("fs"));
var path6 = __toESM(require("path"));

// src/services/hiveService.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var HiveService = class {
  constructor(workspaceRoot) {
    this.basePath = path.join(workspaceRoot, ".hive");
  }
  exists() {
    return fs.existsSync(this.basePath);
  }
  detectFeatureVersion(featurePath) {
    const tasksPath = path.join(featurePath, "tasks");
    const executionPath = path.join(featurePath, "execution");
    if (fs.existsSync(tasksPath)) {
      return "v2";
    }
    if (fs.existsSync(executionPath)) {
      return "v1";
    }
    return "v2";
  }
  getStepsPath(featurePath) {
    const version = this.detectFeatureVersion(featurePath);
    return version === "v2" ? path.join(featurePath, "tasks") : path.join(featurePath, "execution");
  }
  getDecisionsPath(featurePath) {
    const version = this.detectFeatureVersion(featurePath);
    const decisionsPath = path.join(featurePath, "context", "decisions");
    if (version === "v2" && fs.existsSync(decisionsPath)) {
      return decisionsPath;
    }
    return path.join(featurePath, "context");
  }
  getFeatures() {
    const featuresPath = path.join(this.basePath, "features");
    if (!fs.existsSync(featuresPath)) return [];
    return fs.readdirSync(featuresPath).filter((f) => fs.statSync(path.join(featuresPath, f)).isDirectory()).map((name) => this.getFeature(name));
  }
  getFeature(name) {
    const steps = this.getSteps(name);
    const activeSteps = steps.filter((s) => s.status !== "cancelled");
    const doneCount = activeSteps.filter((s) => s.status === "done").length;
    const stepsCount = activeSteps.length;
    const progress = stepsCount > 0 ? Math.round(doneCount / stepsCount * 100) : 0;
    const featureJsonPath = path.join(this.basePath, "features", name, "feature.json");
    const featureJson = this.readJson(featureJsonPath);
    const status = featureJson?.status || "active";
    const createdAt = featureJson?.createdAt;
    const completedAt = featureJson?.completedAt;
    return { name, progress, steps, stepsCount, doneCount, status, createdAt, completedAt };
  }
  getDecisions(feature) {
    const featurePath = path.join(this.basePath, "features", feature);
    const decisionsPath = this.getDecisionsPath(featurePath);
    if (!fs.existsSync(decisionsPath)) return [];
    return fs.readdirSync(decisionsPath).filter((f) => f.endsWith(".md")).map((filename) => {
      const filePath = path.join(decisionsPath, filename);
      const content = this.readFile(filePath);
      let title = filename.replace(/\.md$/, "");
      if (content) {
        const h1Match = content.match(/^#\s+(.+)$/m);
        if (h1Match) title = h1Match[1];
      }
      return { filename, title, filePath };
    }).sort((a, b) => a.filename.localeCompare(b.filename));
  }
  getSteps(feature) {
    const featurePath = path.join(this.basePath, "features", feature);
    const stepsPath = this.getStepsPath(featurePath);
    if (!fs.existsSync(stepsPath)) return [];
    return fs.readdirSync(stepsPath).filter((f) => {
      const stat = fs.statSync(path.join(stepsPath, f));
      return stat.isDirectory();
    }).map((folder) => {
      const folderPath = path.join(stepsPath, folder);
      const statusPath = path.join(folderPath, "status.json");
      const status = this.readJson(statusPath);
      const specFiles = fs.readdirSync(folderPath).filter((f) => f.endsWith(".md"));
      if (!status) return null;
      return {
        name: status.name,
        order: status.order,
        status: status.status,
        folderPath: folder,
        specFiles,
        sessionId: status.sessionId,
        summary: status.summary,
        startedAt: status.startedAt,
        completedAt: status.completedAt,
        execution: status.execution
      };
    }).filter((s) => s !== null).sort((a, b) => a.order - b.order);
  }
  getBatches(feature) {
    const steps = this.getSteps(feature);
    const stepsByOrder = /* @__PURE__ */ new Map();
    for (const step of steps) {
      if (!stepsByOrder.has(step.order)) {
        stepsByOrder.set(step.order, []);
      }
      stepsByOrder.get(step.order).push(step);
    }
    const sortedOrders = Array.from(stepsByOrder.keys()).sort((a, b) => a - b);
    const result = [];
    let highestCompletedOrder = -1;
    for (const order of sortedOrders) {
      const batchSteps = stepsByOrder.get(order);
      const allDone = batchSteps.every((s) => s.status === "done");
      if (allDone) {
        highestCompletedOrder = order;
      }
    }
    let firstPendingOrder = -1;
    for (const order of sortedOrders) {
      const batchSteps = stepsByOrder.get(order);
      const allDone = batchSteps.every((s) => s.status === "done");
      if (!allDone && firstPendingOrder === -1) {
        firstPendingOrder = order;
        break;
      }
    }
    for (const order of sortedOrders) {
      const batchSteps = stepsByOrder.get(order);
      result.push({
        order,
        steps: batchSteps,
        isLatestDone: order === highestCompletedOrder,
        canExecute: order === firstPendingOrder
      });
    }
    return result;
  }
  getStepReport(feature, stepFolder) {
    const featurePath = path.join(this.basePath, "features", feature);
    const stepsPath = this.getStepsPath(featurePath);
    const reportPath = path.join(stepsPath, stepFolder, "report.json");
    const report = this.readJson(reportPath);
    if (!report?.diffStats) return null;
    return report.diffStats;
  }
  getStepDiffPath(feature, stepFolder) {
    const featurePath = path.join(this.basePath, "features", feature);
    const stepsPath = this.getStepsPath(featurePath);
    const diffPath = path.join(stepsPath, stepFolder, "output.diff");
    if (!fs.existsSync(diffPath)) return null;
    return diffPath;
  }
  formatDuration(startedAt, completedAt) {
    if (!startedAt || !completedAt) return "";
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    const seconds = Math.floor((end - start) / 1e3);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  getStepSpec(feature, stepFolder, specFile) {
    const featurePath = path.join(this.basePath, "features", feature);
    const stepsPath = this.getStepsPath(featurePath);
    const specPath = path.join(stepsPath, stepFolder, specFile);
    return this.readFile(specPath);
  }
  getStepStatus(feature, stepFolder) {
    const featurePath = path.join(this.basePath, "features", feature);
    const stepsPath = this.getStepsPath(featurePath);
    const statusPath = path.join(stepsPath, stepFolder, "status.json");
    return this.readJson(statusPath);
  }
  getProblemContent(feature) {
    const featurePath = path.join(this.basePath, "features", feature);
    const problemPath = path.join(featurePath, "context", "problem.md");
    if (fs.existsSync(problemPath)) {
      return this.readFile(problemPath);
    }
    const ticketPath = path.join(featurePath, "requirements", "ticket.md");
    if (fs.existsSync(ticketPath)) {
      return this.readFile(ticketPath);
    }
    const legacyProblemPath = path.join(featurePath, "problem", "ticket.md");
    return this.readFile(legacyProblemPath);
  }
  getRequirements(feature) {
    const ticket = this.getProblemContent(feature);
    return {
      ticket: ticket ?? void 0,
      requirements: void 0,
      notes: void 0
    };
  }
  getContext(feature) {
    const decisions = this.getDecisions(feature);
    const decisionContent = decisions.length > 0 ? decisions.map((d) => `### ${d.title}`).join("\n\n") : void 0;
    return {
      decisions: decisionContent,
      architecture: void 0,
      constraints: void 0
    };
  }
  getPlanJson(feature) {
    const featurePath = path.join(this.basePath, "features", feature);
    const jsonPath = path.join(featurePath, "plan.json");
    if (fs.existsSync(jsonPath)) {
      return this.readJson(jsonPath);
    }
    return null;
  }
  getPlanContent(feature) {
    const planJson = this.getPlanJson(feature);
    if (planJson) {
      return this.planJsonToMarkdown(planJson);
    }
    const legacyPath = path.join(this.basePath, "features", feature, "plan.md");
    return this.readFile(legacyPath);
  }
  planJsonToMarkdown(plan) {
    const lines = [];
    lines.push(`# Implementation Plan`);
    lines.push(``);
    lines.push(`**Version**: ${plan.version}`);
    lines.push(`**Status**: ${plan.status}`);
    lines.push(`**Updated**: ${plan.updatedAt}`);
    lines.push(``);
    if (plan.summary) {
      lines.push(`## Summary`);
      lines.push(``);
      lines.push(plan.summary);
      lines.push(``);
    }
    if (plan.tasks.length > 0) {
      lines.push(`## Tasks`);
      lines.push(``);
      for (const task of plan.tasks) {
        const icon = task.status === "done" ? "\u2705" : task.status === "in_progress" ? "\u{1F504}" : task.status === "cancelled" ? "\u23ED\uFE0F" : "\u2B1C";
        lines.push(`${icon} **${task.id}**: ${task.name}`);
      }
    }
    return lines.join("\n");
  }
  getPlanComments(feature) {
    const commentsPath = path.join(this.basePath, "features", feature, "comments.json");
    if (!fs.existsSync(commentsPath)) return [];
    try {
      const data = JSON.parse(fs.readFileSync(commentsPath, "utf-8"));
      return data.comments || [];
    } catch {
      return [];
    }
  }
  getFilesInFolder(feature, folder) {
    const featurePath = path.join(this.basePath, "features", feature);
    if (folder === "context") {
      const decisionsPath = this.getDecisionsPath(featurePath);
      if (fs.existsSync(decisionsPath)) {
        return fs.readdirSync(decisionsPath).filter((f) => {
          const stat = fs.statSync(path.join(decisionsPath, f));
          return stat.isFile();
        });
      }
    }
    let folderPath = path.join(featurePath, folder);
    if (!fs.existsSync(folderPath)) {
      if (folder === "requirements") {
        folderPath = path.join(featurePath, "problem");
      } else {
        return [];
      }
    }
    if (!fs.existsSync(folderPath)) return [];
    return fs.readdirSync(folderPath).filter((f) => {
      const stat = fs.statSync(path.join(folderPath, f));
      return stat.isFile();
    });
  }
  getFilePath(feature, folder, filename) {
    const featurePath = path.join(this.basePath, "features", feature);
    if (folder === "requirements") {
      const problemPath = path.join(featurePath, "context", "problem.md");
      if (fs.existsSync(problemPath) && filename === "ticket.md") {
        return problemPath;
      }
      const requirementsPath = path.join(featurePath, "requirements");
      if (fs.existsSync(requirementsPath)) {
        return path.join(requirementsPath, filename);
      }
      return path.join(featurePath, "problem", filename);
    }
    if (folder === "context") {
      const decisionsPath = this.getDecisionsPath(featurePath);
      return path.join(decisionsPath, filename);
    }
    if (folder === "execution") {
      const stepsPath = this.getStepsPath(featurePath);
      return path.join(stepsPath, filename);
    }
    return path.join(featurePath, folder, filename);
  }
  getStepFilePath(feature, stepFolder, filename) {
    const featurePath = path.join(this.basePath, "features", feature);
    const stepsPath = this.getStepsPath(featurePath);
    return path.join(stepsPath, stepFolder, filename);
  }
  getFeaturePath(feature) {
    return path.join(this.basePath, "features", feature);
  }
  getReport(feature) {
    const feat = this.getFeature(feature);
    const requirements = this.getRequirements(feature);
    const context = this.getContext(feature);
    let report = `# Feature: ${feature}

`;
    report += `## REQUIREMENTS
${requirements.ticket || "(no ticket)"}

`;
    report += `## CONTEXT
`;
    if (context.decisions) report += context.decisions + "\n";
    if (context.architecture) report += context.architecture + "\n";
    if (!context.decisions && !context.architecture) report += "(no decisions)\n";
    report += "\n";
    report += `## EXECUTION
`;
    for (const step of feat.steps) {
      const icon = step.status === "done" ? "\u2705" : step.status === "in_progress" ? "\u{1F504}" : "\u2B1C";
      report += `${icon} **${step.order}. ${step.name}** (${step.status})`;
      if (step.sessionId) report += ` [session: ${step.sessionId}]`;
      report += "\n";
      if (step.summary) report += `   ${step.summary}
`;
    }
    return report;
  }
  updateStepSession(feature, stepFolder, sessionId) {
    const featurePath = path.join(this.basePath, "features", feature);
    const stepsPath = this.getStepsPath(featurePath);
    const statusPath = path.join(stepsPath, stepFolder, "status.json");
    const status = this.readJson(statusPath);
    if (!status) return false;
    status.sessionId = sessionId;
    try {
      fs.writeFileSync(statusPath, JSON.stringify(status, null, 2));
      return true;
    } catch {
      return false;
    }
  }
  async getStepSessions(feature, stepFolder) {
    const status = this.getStepStatus(feature, stepFolder);
    if (!status?.sessionId) return [];
    const workspaceRoot = path.dirname(this.basePath);
    try {
      const { createOpencodeClient: createOpencodeClient2 } = await Promise.resolve().then(() => (init_dist(), dist_exports));
      const client2 = createOpencodeClient2({ directory: workspaceRoot });
      const response = await client2.session.list({ query: { directory: workspaceRoot } });
      if (response.error || !response.data) return [];
      const sessions = response.data;
      const parentSession = sessions.find((s) => s.id === status.sessionId);
      if (!parentSession) return [];
      const result = [{
        id: parentSession.id,
        title: parentSession.title,
        summary: parentSession.summary ? `+${parentSession.summary.additions}/-${parentSession.summary.deletions} in ${parentSession.summary.files} files` : void 0,
        isParent: true,
        createdAt: parentSession.time.created,
        updatedAt: parentSession.time.updated
      }];
      const childSessions = sessions.filter((s) => s.parentID === status.sessionId).sort((a, b) => a.time.created - b.time.created);
      for (const child of childSessions) {
        result.push({
          id: child.id,
          title: child.title,
          summary: child.summary ? `+${child.summary.additions}/-${child.summary.deletions} in ${child.summary.files} files` : void 0,
          isParent: false,
          createdAt: child.time.created,
          updatedAt: child.time.updated
        });
      }
      return result;
    } catch {
      return [];
    }
  }
  readFile(filePath) {
    try {
      return fs.readFileSync(filePath, "utf-8");
    } catch {
      return null;
    }
  }
  readJson(filePath) {
    const content = this.readFile(filePath);
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
};

// src/services/watcher.ts
var vscode = __toESM(require("vscode"));
var HiveWatcher = class {
  constructor(workspaceRoot, onChange) {
    const pattern = new vscode.RelativePattern(
      workspaceRoot,
      ".hive/**/*"
    );
    this.watcher = vscode.workspace.createFileSystemWatcher(pattern);
    this.watcher.onDidCreate(onChange);
    this.watcher.onDidChange(onChange);
    this.watcher.onDidDelete(onChange);
  }
  dispose() {
    this.watcher.dispose();
  }
};

// src/services/launcher.ts
var vscode2 = __toESM(require("vscode"));
var path2 = __toESM(require("path"));
var fs2 = __toESM(require("fs"));
var import_child_process = require("child_process");
var Launcher = class {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.hiveService = new HiveService(workspaceRoot);
  }
  async createSession(feature, step) {
    const specPath = path2.join(
      this.workspaceRoot,
      ".hive",
      "features",
      feature,
      "execution",
      step,
      "spec.md"
    );
    if (!fs2.existsSync(specPath)) {
      vscode2.window.showErrorMessage(`Spec file not found: ${specPath}`);
      return;
    }
    const spec = fs2.readFileSync(specPath, "utf-8");
    const prompt = this.buildStepPrompt(feature, step, spec);
    const sessionTitle = `[${feature}] ${step}`;
    vscode2.window.withProgress(
      { location: vscode2.ProgressLocation.Notification, title: "Creating OpenCode session..." },
      async () => {
        const sessionId = await this.createOpencodeSession(sessionTitle, prompt);
        if (sessionId) {
          this.hiveService.updateStepSession(feature, step, sessionId);
          vscode2.window.showInformationMessage(`Session created: ${sessionId}`);
        } else {
          vscode2.window.showErrorMessage("Failed to create session");
        }
      }
    );
  }
  async openStep(client2, feature, step, sessionId) {
    return this.openInOpenCode(feature, step, sessionId);
  }
  async openFeature(client2, feature) {
    return this.openInOpenCode(feature);
  }
  openSession(sessionId) {
    const terminal = vscode2.window.createTerminal({
      name: `OpenCode - ${sessionId.slice(0, 8)}`,
      cwd: this.workspaceRoot
    });
    terminal.sendText(`opencode -s ${sessionId}`);
    terminal.show();
  }
  async openInOpenCode(feature, step, sessionId) {
    const terminalName = `OpenCode: ${feature}${step ? "/" + step : ""}`;
    if (sessionId) {
      const terminal2 = vscode2.window.createTerminal({
        name: terminalName,
        cwd: this.workspaceRoot
      });
      terminal2.sendText(`opencode -s ${sessionId}`);
      terminal2.show();
      return;
    }
    if (step) {
      const specPath = path2.join(
        this.workspaceRoot,
        ".hive",
        "features",
        feature,
        "execution",
        step,
        "spec.md"
      );
      if (fs2.existsSync(specPath)) {
        const spec = fs2.readFileSync(specPath, "utf-8");
        const prompt = this.buildStepPrompt(feature, step, spec);
        const sessionTitle = `[${feature}] ${step}`;
        try {
          const newSessionId = await this.createOpencodeSession(sessionTitle, prompt);
          if (newSessionId) {
            this.hiveService.updateStepSession(feature, step, newSessionId);
            const terminal2 = vscode2.window.createTerminal({
              name: terminalName,
              cwd: this.workspaceRoot
            });
            terminal2.sendText(`opencode -s ${newSessionId}`);
            terminal2.show();
            return;
          }
        } catch (err) {
          console.error("Failed to create opencode session:", err);
        }
      }
    }
    const terminal = vscode2.window.createTerminal({
      name: terminalName,
      cwd: this.workspaceRoot
    });
    terminal.sendText("opencode");
    terminal.show();
  }
  async createOpencodeSession(title, prompt) {
    return new Promise((resolve) => {
      const scriptPath = path2.join(__dirname, "..", "..", "scripts", "create-session.mjs");
      const proc = (0, import_child_process.spawn)("node", [scriptPath, title, prompt], { cwd: this.workspaceRoot });
      let stdout = "";
      let stderr = "";
      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });
      proc.on("close", (code) => {
        if (code === 0 && stdout.trim()) {
          resolve(stdout.trim());
        } else {
          console.error("create-session failed:", stderr);
          resolve(null);
        }
      });
      proc.on("error", (err) => {
        console.error("create-session spawn error:", err);
        resolve(null);
      });
    });
  }
  buildStepPrompt(feature, step, spec) {
    return `You are working on step "${step}" of feature "${feature}".

## Step Specification
${spec}

## Context
- Feature: ${feature}
- Step: ${step}
- Read the full feature context at: .hive/features/${feature}/

Begin by acknowledging this step and asking any clarifying questions.`;
  }
};

// src/services/checkpointService.ts
var fs3 = __toESM(require("fs"));
var path3 = __toESM(require("path"));

// ../../../../../../node_modules/simple-git/dist/esm/index.js
var import_node_buffer = require("node:buffer");
var import_file_exists = __toESM(require_dist(), 1);
var import_debug = __toESM(require_src(), 1);
var import_child_process2 = require("child_process");
var import_promise_deferred = __toESM(require_dist2(), 1);
var import_node_path = require("node:path");
var import_promise_deferred2 = __toESM(require_dist2(), 1);
var import_node_events = require("node:events");
var __defProp2 = Object.defineProperty;
var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
var __getOwnPropNames2 = Object.getOwnPropertyNames;
var __hasOwnProp2 = Object.prototype.hasOwnProperty;
var __esm2 = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames2(fn)[0]])(fn = 0)), res;
};
var __commonJS2 = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames2(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export2 = (target, all) => {
  for (var name in all)
    __defProp2(target, name, { get: all[name], enumerable: true });
};
var __copyProps2 = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames2(from))
      if (!__hasOwnProp2.call(to, key) && key !== except)
        __defProp2(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS2 = (mod) => __copyProps2(__defProp2({}, "__esModule", { value: true }), mod);
function pathspec(...paths) {
  const key = new String(paths);
  cache.set(key, paths);
  return key;
}
function isPathSpec(path7) {
  return path7 instanceof String && cache.has(path7);
}
function toPaths(pathSpec) {
  return cache.get(pathSpec) || [];
}
var cache;
var init_pathspec = __esm2({
  "src/lib/args/pathspec.ts"() {
    "use strict";
    cache = /* @__PURE__ */ new WeakMap();
  }
});
var GitError;
var init_git_error = __esm2({
  "src/lib/errors/git-error.ts"() {
    "use strict";
    GitError = class extends Error {
      constructor(task, message) {
        super(message);
        this.task = task;
        Object.setPrototypeOf(this, new.target.prototype);
      }
    };
  }
});
var GitResponseError;
var init_git_response_error = __esm2({
  "src/lib/errors/git-response-error.ts"() {
    "use strict";
    init_git_error();
    GitResponseError = class extends GitError {
      constructor(git, message) {
        super(void 0, message || String(git));
        this.git = git;
      }
    };
  }
});
var TaskConfigurationError;
var init_task_configuration_error = __esm2({
  "src/lib/errors/task-configuration-error.ts"() {
    "use strict";
    init_git_error();
    TaskConfigurationError = class extends GitError {
      constructor(message) {
        super(void 0, message);
      }
    };
  }
});
function asFunction(source) {
  if (typeof source !== "function") {
    return NOOP;
  }
  return source;
}
function isUserFunction(source) {
  return typeof source === "function" && source !== NOOP;
}
function splitOn(input, char) {
  const index = input.indexOf(char);
  if (index <= 0) {
    return [input, ""];
  }
  return [input.substr(0, index), input.substr(index + 1)];
}
function first(input, offset = 0) {
  return isArrayLike(input) && input.length > offset ? input[offset] : void 0;
}
function last(input, offset = 0) {
  if (isArrayLike(input) && input.length > offset) {
    return input[input.length - 1 - offset];
  }
}
function isArrayLike(input) {
  return filterHasLength(input);
}
function toLinesWithContent(input = "", trimmed2 = true, separator = "\n") {
  return input.split(separator).reduce((output, line) => {
    const lineContent = trimmed2 ? line.trim() : line;
    if (lineContent) {
      output.push(lineContent);
    }
    return output;
  }, []);
}
function forEachLineWithContent(input, callback) {
  return toLinesWithContent(input, true).map((line) => callback(line));
}
function folderExists(path7) {
  return (0, import_file_exists.exists)(path7, import_file_exists.FOLDER);
}
function append(target, item) {
  if (Array.isArray(target)) {
    if (!target.includes(item)) {
      target.push(item);
    }
  } else {
    target.add(item);
  }
  return item;
}
function including(target, item) {
  if (Array.isArray(target) && !target.includes(item)) {
    target.push(item);
  }
  return target;
}
function remove(target, item) {
  if (Array.isArray(target)) {
    const index = target.indexOf(item);
    if (index >= 0) {
      target.splice(index, 1);
    }
  } else {
    target.delete(item);
  }
  return item;
}
function asArray(source) {
  return Array.isArray(source) ? source : [source];
}
function asCamelCase(str) {
  return str.replace(/[\s-]+(.)/g, (_all, chr) => {
    return chr.toUpperCase();
  });
}
function asStringArray(source) {
  return asArray(source).map((item) => {
    return item instanceof String ? item : String(item);
  });
}
function asNumber(source, onNaN = 0) {
  if (source == null) {
    return onNaN;
  }
  const num = parseInt(source, 10);
  return Number.isNaN(num) ? onNaN : num;
}
function prefixedArray(input, prefix) {
  const output = [];
  for (let i = 0, max = input.length; i < max; i++) {
    output.push(prefix, input[i]);
  }
  return output;
}
function bufferToString(input) {
  return (Array.isArray(input) ? import_node_buffer.Buffer.concat(input) : input).toString("utf-8");
}
function pick(source, properties) {
  const out = {};
  properties.forEach((key) => {
    if (source[key] !== void 0) {
      out[key] = source[key];
    }
  });
  return out;
}
function delay(duration = 0) {
  return new Promise((done) => setTimeout(done, duration));
}
function orVoid(input) {
  if (input === false) {
    return void 0;
  }
  return input;
}
var NULL;
var NOOP;
var objectToString;
var init_util = __esm2({
  "src/lib/utils/util.ts"() {
    "use strict";
    init_argument_filters();
    NULL = "\0";
    NOOP = () => {
    };
    objectToString = Object.prototype.toString.call.bind(Object.prototype.toString);
  }
});
function filterType(input, filter, def) {
  if (filter(input)) {
    return input;
  }
  return arguments.length > 2 ? def : void 0;
}
function filterPrimitives(input, omit) {
  const type = isPathSpec(input) ? "string" : typeof input;
  return /number|string|boolean/.test(type) && (!omit || !omit.includes(type));
}
function filterPlainObject(input) {
  return !!input && objectToString(input) === "[object Object]";
}
function filterFunction(input) {
  return typeof input === "function";
}
var filterArray;
var filterNumber;
var filterString;
var filterStringOrStringArray;
var filterHasLength;
var init_argument_filters = __esm2({
  "src/lib/utils/argument-filters.ts"() {
    "use strict";
    init_pathspec();
    init_util();
    filterArray = (input) => {
      return Array.isArray(input);
    };
    filterNumber = (input) => {
      return typeof input === "number";
    };
    filterString = (input) => {
      return typeof input === "string";
    };
    filterStringOrStringArray = (input) => {
      return filterString(input) || Array.isArray(input) && input.every(filterString);
    };
    filterHasLength = (input) => {
      if (input == null || "number|boolean|function".includes(typeof input)) {
        return false;
      }
      return typeof input.length === "number";
    };
  }
});
var ExitCodes;
var init_exit_codes = __esm2({
  "src/lib/utils/exit-codes.ts"() {
    "use strict";
    ExitCodes = /* @__PURE__ */ ((ExitCodes2) => {
      ExitCodes2[ExitCodes2["SUCCESS"] = 0] = "SUCCESS";
      ExitCodes2[ExitCodes2["ERROR"] = 1] = "ERROR";
      ExitCodes2[ExitCodes2["NOT_FOUND"] = -2] = "NOT_FOUND";
      ExitCodes2[ExitCodes2["UNCLEAN"] = 128] = "UNCLEAN";
      return ExitCodes2;
    })(ExitCodes || {});
  }
});
var GitOutputStreams;
var init_git_output_streams = __esm2({
  "src/lib/utils/git-output-streams.ts"() {
    "use strict";
    GitOutputStreams = class _GitOutputStreams {
      constructor(stdOut, stdErr) {
        this.stdOut = stdOut;
        this.stdErr = stdErr;
      }
      asStrings() {
        return new _GitOutputStreams(this.stdOut.toString("utf8"), this.stdErr.toString("utf8"));
      }
    };
  }
});
function useMatchesDefault() {
  throw new Error(`LineParser:useMatches not implemented`);
}
var LineParser;
var RemoteLineParser;
var init_line_parser = __esm2({
  "src/lib/utils/line-parser.ts"() {
    "use strict";
    LineParser = class {
      constructor(regExp, useMatches) {
        this.matches = [];
        this.useMatches = useMatchesDefault;
        this.parse = (line, target) => {
          this.resetMatches();
          if (!this._regExp.every((reg, index) => this.addMatch(reg, index, line(index)))) {
            return false;
          }
          return this.useMatches(target, this.prepareMatches()) !== false;
        };
        this._regExp = Array.isArray(regExp) ? regExp : [regExp];
        if (useMatches) {
          this.useMatches = useMatches;
        }
      }
      resetMatches() {
        this.matches.length = 0;
      }
      prepareMatches() {
        return this.matches;
      }
      addMatch(reg, index, line) {
        const matched = line && reg.exec(line);
        if (matched) {
          this.pushMatch(index, matched);
        }
        return !!matched;
      }
      pushMatch(_index, matched) {
        this.matches.push(...matched.slice(1));
      }
    };
    RemoteLineParser = class extends LineParser {
      addMatch(reg, index, line) {
        return /^remote:\s/.test(String(line)) && super.addMatch(reg, index, line);
      }
      pushMatch(index, matched) {
        if (index > 0 || matched.length > 1) {
          super.pushMatch(index, matched);
        }
      }
    };
  }
});
function createInstanceConfig(...options) {
  const baseDir = process.cwd();
  const config = Object.assign(
    { baseDir, ...defaultOptions },
    ...options.filter((o) => typeof o === "object" && o)
  );
  config.baseDir = config.baseDir || baseDir;
  config.trimmed = config.trimmed === true;
  return config;
}
var defaultOptions;
var init_simple_git_options = __esm2({
  "src/lib/utils/simple-git-options.ts"() {
    "use strict";
    defaultOptions = {
      binary: "git",
      maxConcurrentProcesses: 5,
      config: [],
      trimmed: false
    };
  }
});
function appendTaskOptions(options, commands4 = []) {
  if (!filterPlainObject(options)) {
    return commands4;
  }
  return Object.keys(options).reduce((commands22, key) => {
    const value = options[key];
    if (isPathSpec(value)) {
      commands22.push(value);
    } else if (filterPrimitives(value, ["boolean"])) {
      commands22.push(key + "=" + value);
    } else if (Array.isArray(value)) {
      for (const v of value) {
        if (!filterPrimitives(v, ["string", "number"])) {
          commands22.push(key + "=" + v);
        }
      }
    } else {
      commands22.push(key);
    }
    return commands22;
  }, commands4);
}
function getTrailingOptions(args, initialPrimitive = 0, objectOnly = false) {
  const command = [];
  for (let i = 0, max = initialPrimitive < 0 ? args.length : initialPrimitive; i < max; i++) {
    if ("string|number".includes(typeof args[i])) {
      command.push(String(args[i]));
    }
  }
  appendTaskOptions(trailingOptionsArgument(args), command);
  if (!objectOnly) {
    command.push(...trailingArrayArgument(args));
  }
  return command;
}
function trailingArrayArgument(args) {
  const hasTrailingCallback = typeof last(args) === "function";
  return asStringArray(filterType(last(args, hasTrailingCallback ? 1 : 0), filterArray, []));
}
function trailingOptionsArgument(args) {
  const hasTrailingCallback = filterFunction(last(args));
  return filterType(last(args, hasTrailingCallback ? 1 : 0), filterPlainObject);
}
function trailingFunctionArgument(args, includeNoop = true) {
  const callback = asFunction(last(args));
  return includeNoop || isUserFunction(callback) ? callback : void 0;
}
var init_task_options = __esm2({
  "src/lib/utils/task-options.ts"() {
    "use strict";
    init_argument_filters();
    init_util();
    init_pathspec();
  }
});
function callTaskParser(parser4, streams) {
  return parser4(streams.stdOut, streams.stdErr);
}
function parseStringResponse(result, parsers12, texts, trim = true) {
  asArray(texts).forEach((text) => {
    for (let lines = toLinesWithContent(text, trim), i = 0, max = lines.length; i < max; i++) {
      const line = (offset = 0) => {
        if (i + offset >= max) {
          return;
        }
        return lines[i + offset];
      };
      parsers12.some(({ parse }) => parse(line, result));
    }
  });
  return result;
}
var init_task_parser = __esm2({
  "src/lib/utils/task-parser.ts"() {
    "use strict";
    init_util();
  }
});
var utils_exports = {};
__export2(utils_exports, {
  ExitCodes: () => ExitCodes,
  GitOutputStreams: () => GitOutputStreams,
  LineParser: () => LineParser,
  NOOP: () => NOOP,
  NULL: () => NULL,
  RemoteLineParser: () => RemoteLineParser,
  append: () => append,
  appendTaskOptions: () => appendTaskOptions,
  asArray: () => asArray,
  asCamelCase: () => asCamelCase,
  asFunction: () => asFunction,
  asNumber: () => asNumber,
  asStringArray: () => asStringArray,
  bufferToString: () => bufferToString,
  callTaskParser: () => callTaskParser,
  createInstanceConfig: () => createInstanceConfig,
  delay: () => delay,
  filterArray: () => filterArray,
  filterFunction: () => filterFunction,
  filterHasLength: () => filterHasLength,
  filterNumber: () => filterNumber,
  filterPlainObject: () => filterPlainObject,
  filterPrimitives: () => filterPrimitives,
  filterString: () => filterString,
  filterStringOrStringArray: () => filterStringOrStringArray,
  filterType: () => filterType,
  first: () => first,
  folderExists: () => folderExists,
  forEachLineWithContent: () => forEachLineWithContent,
  getTrailingOptions: () => getTrailingOptions,
  including: () => including,
  isUserFunction: () => isUserFunction,
  last: () => last,
  objectToString: () => objectToString,
  orVoid: () => orVoid,
  parseStringResponse: () => parseStringResponse,
  pick: () => pick,
  prefixedArray: () => prefixedArray,
  remove: () => remove,
  splitOn: () => splitOn,
  toLinesWithContent: () => toLinesWithContent,
  trailingFunctionArgument: () => trailingFunctionArgument,
  trailingOptionsArgument: () => trailingOptionsArgument
});
var init_utils = __esm2({
  "src/lib/utils/index.ts"() {
    "use strict";
    init_argument_filters();
    init_exit_codes();
    init_git_output_streams();
    init_line_parser();
    init_simple_git_options();
    init_task_options();
    init_task_parser();
    init_util();
  }
});
var check_is_repo_exports = {};
__export2(check_is_repo_exports, {
  CheckRepoActions: () => CheckRepoActions,
  checkIsBareRepoTask: () => checkIsBareRepoTask,
  checkIsRepoRootTask: () => checkIsRepoRootTask,
  checkIsRepoTask: () => checkIsRepoTask
});
function checkIsRepoTask(action) {
  switch (action) {
    case "bare":
      return checkIsBareRepoTask();
    case "root":
      return checkIsRepoRootTask();
  }
  const commands4 = ["rev-parse", "--is-inside-work-tree"];
  return {
    commands: commands4,
    format: "utf-8",
    onError,
    parser
  };
}
function checkIsRepoRootTask() {
  const commands4 = ["rev-parse", "--git-dir"];
  return {
    commands: commands4,
    format: "utf-8",
    onError,
    parser(path7) {
      return /^\.(git)?$/.test(path7.trim());
    }
  };
}
function checkIsBareRepoTask() {
  const commands4 = ["rev-parse", "--is-bare-repository"];
  return {
    commands: commands4,
    format: "utf-8",
    onError,
    parser
  };
}
function isNotRepoMessage(error) {
  return /(Not a git repository|Kein Git-Repository)/i.test(String(error));
}
var CheckRepoActions;
var onError;
var parser;
var init_check_is_repo = __esm2({
  "src/lib/tasks/check-is-repo.ts"() {
    "use strict";
    init_utils();
    CheckRepoActions = /* @__PURE__ */ ((CheckRepoActions2) => {
      CheckRepoActions2["BARE"] = "bare";
      CheckRepoActions2["IN_TREE"] = "tree";
      CheckRepoActions2["IS_REPO_ROOT"] = "root";
      return CheckRepoActions2;
    })(CheckRepoActions || {});
    onError = ({ exitCode }, error, done, fail) => {
      if (exitCode === 128 && isNotRepoMessage(error)) {
        return done(Buffer.from("false"));
      }
      fail(error);
    };
    parser = (text) => {
      return text.trim() === "true";
    };
  }
});
function cleanSummaryParser(dryRun, text) {
  const summary = new CleanResponse(dryRun);
  const regexp = dryRun ? dryRunRemovalRegexp : removalRegexp;
  toLinesWithContent(text).forEach((line) => {
    const removed = line.replace(regexp, "");
    summary.paths.push(removed);
    (isFolderRegexp.test(removed) ? summary.folders : summary.files).push(removed);
  });
  return summary;
}
var CleanResponse;
var removalRegexp;
var dryRunRemovalRegexp;
var isFolderRegexp;
var init_CleanSummary = __esm2({
  "src/lib/responses/CleanSummary.ts"() {
    "use strict";
    init_utils();
    CleanResponse = class {
      constructor(dryRun) {
        this.dryRun = dryRun;
        this.paths = [];
        this.files = [];
        this.folders = [];
      }
    };
    removalRegexp = /^[a-z]+\s*/i;
    dryRunRemovalRegexp = /^[a-z]+\s+[a-z]+\s*/i;
    isFolderRegexp = /\/$/;
  }
});
var task_exports = {};
__export2(task_exports, {
  EMPTY_COMMANDS: () => EMPTY_COMMANDS,
  adhocExecTask: () => adhocExecTask,
  configurationErrorTask: () => configurationErrorTask,
  isBufferTask: () => isBufferTask,
  isEmptyTask: () => isEmptyTask,
  straightThroughBufferTask: () => straightThroughBufferTask,
  straightThroughStringTask: () => straightThroughStringTask
});
function adhocExecTask(parser4) {
  return {
    commands: EMPTY_COMMANDS,
    format: "empty",
    parser: parser4
  };
}
function configurationErrorTask(error) {
  return {
    commands: EMPTY_COMMANDS,
    format: "empty",
    parser() {
      throw typeof error === "string" ? new TaskConfigurationError(error) : error;
    }
  };
}
function straightThroughStringTask(commands4, trimmed2 = false) {
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return trimmed2 ? String(text).trim() : text;
    }
  };
}
function straightThroughBufferTask(commands4) {
  return {
    commands: commands4,
    format: "buffer",
    parser(buffer) {
      return buffer;
    }
  };
}
function isBufferTask(task) {
  return task.format === "buffer";
}
function isEmptyTask(task) {
  return task.format === "empty" || !task.commands.length;
}
var EMPTY_COMMANDS;
var init_task = __esm2({
  "src/lib/tasks/task.ts"() {
    "use strict";
    init_task_configuration_error();
    EMPTY_COMMANDS = [];
  }
});
var clean_exports = {};
__export2(clean_exports, {
  CONFIG_ERROR_INTERACTIVE_MODE: () => CONFIG_ERROR_INTERACTIVE_MODE,
  CONFIG_ERROR_MODE_REQUIRED: () => CONFIG_ERROR_MODE_REQUIRED,
  CONFIG_ERROR_UNKNOWN_OPTION: () => CONFIG_ERROR_UNKNOWN_OPTION,
  CleanOptions: () => CleanOptions,
  cleanTask: () => cleanTask,
  cleanWithOptionsTask: () => cleanWithOptionsTask,
  isCleanOptionsArray: () => isCleanOptionsArray
});
function cleanWithOptionsTask(mode, customArgs) {
  const { cleanMode, options, valid } = getCleanOptions(mode);
  if (!cleanMode) {
    return configurationErrorTask(CONFIG_ERROR_MODE_REQUIRED);
  }
  if (!valid.options) {
    return configurationErrorTask(CONFIG_ERROR_UNKNOWN_OPTION + JSON.stringify(mode));
  }
  options.push(...customArgs);
  if (options.some(isInteractiveMode)) {
    return configurationErrorTask(CONFIG_ERROR_INTERACTIVE_MODE);
  }
  return cleanTask(cleanMode, options);
}
function cleanTask(mode, customArgs) {
  const commands4 = ["clean", `-${mode}`, ...customArgs];
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return cleanSummaryParser(mode === "n", text);
    }
  };
}
function isCleanOptionsArray(input) {
  return Array.isArray(input) && input.every((test) => CleanOptionValues.has(test));
}
function getCleanOptions(input) {
  let cleanMode;
  let options = [];
  let valid = { cleanMode: false, options: true };
  input.replace(/[^a-z]i/g, "").split("").forEach((char) => {
    if (isCleanMode(char)) {
      cleanMode = char;
      valid.cleanMode = true;
    } else {
      valid.options = valid.options && isKnownOption(options[options.length] = `-${char}`);
    }
  });
  return {
    cleanMode,
    options,
    valid
  };
}
function isCleanMode(cleanMode) {
  return cleanMode === "f" || cleanMode === "n";
}
function isKnownOption(option) {
  return /^-[a-z]$/i.test(option) && CleanOptionValues.has(option.charAt(1));
}
function isInteractiveMode(option) {
  if (/^-[^\-]/.test(option)) {
    return option.indexOf("i") > 0;
  }
  return option === "--interactive";
}
var CONFIG_ERROR_INTERACTIVE_MODE;
var CONFIG_ERROR_MODE_REQUIRED;
var CONFIG_ERROR_UNKNOWN_OPTION;
var CleanOptions;
var CleanOptionValues;
var init_clean = __esm2({
  "src/lib/tasks/clean.ts"() {
    "use strict";
    init_CleanSummary();
    init_utils();
    init_task();
    CONFIG_ERROR_INTERACTIVE_MODE = "Git clean interactive mode is not supported";
    CONFIG_ERROR_MODE_REQUIRED = 'Git clean mode parameter ("n" or "f") is required';
    CONFIG_ERROR_UNKNOWN_OPTION = "Git clean unknown option found in: ";
    CleanOptions = /* @__PURE__ */ ((CleanOptions2) => {
      CleanOptions2["DRY_RUN"] = "n";
      CleanOptions2["FORCE"] = "f";
      CleanOptions2["IGNORED_INCLUDED"] = "x";
      CleanOptions2["IGNORED_ONLY"] = "X";
      CleanOptions2["EXCLUDING"] = "e";
      CleanOptions2["QUIET"] = "q";
      CleanOptions2["RECURSIVE"] = "d";
      return CleanOptions2;
    })(CleanOptions || {});
    CleanOptionValues = /* @__PURE__ */ new Set([
      "i",
      ...asStringArray(Object.values(CleanOptions))
    ]);
  }
});
function configListParser(text) {
  const config = new ConfigList();
  for (const item of configParser(text)) {
    config.addValue(item.file, String(item.key), item.value);
  }
  return config;
}
function configGetParser(text, key) {
  let value = null;
  const values = [];
  const scopes = /* @__PURE__ */ new Map();
  for (const item of configParser(text, key)) {
    if (item.key !== key) {
      continue;
    }
    values.push(value = item.value);
    if (!scopes.has(item.file)) {
      scopes.set(item.file, []);
    }
    scopes.get(item.file).push(value);
  }
  return {
    key,
    paths: Array.from(scopes.keys()),
    scopes,
    value,
    values
  };
}
function configFilePath(filePath) {
  return filePath.replace(/^(file):/, "");
}
function* configParser(text, requestedKey = null) {
  const lines = text.split("\0");
  for (let i = 0, max = lines.length - 1; i < max; ) {
    const file = configFilePath(lines[i++]);
    let value = lines[i++];
    let key = requestedKey;
    if (value.includes("\n")) {
      const line = splitOn(value, "\n");
      key = line[0];
      value = line[1];
    }
    yield { file, key, value };
  }
}
var ConfigList;
var init_ConfigList = __esm2({
  "src/lib/responses/ConfigList.ts"() {
    "use strict";
    init_utils();
    ConfigList = class {
      constructor() {
        this.files = [];
        this.values = /* @__PURE__ */ Object.create(null);
      }
      get all() {
        if (!this._all) {
          this._all = this.files.reduce((all, file) => {
            return Object.assign(all, this.values[file]);
          }, {});
        }
        return this._all;
      }
      addFile(file) {
        if (!(file in this.values)) {
          const latest = last(this.files);
          this.values[file] = latest ? Object.create(this.values[latest]) : {};
          this.files.push(file);
        }
        return this.values[file];
      }
      addValue(file, key, value) {
        const values = this.addFile(file);
        if (!Object.hasOwn(values, key)) {
          values[key] = value;
        } else if (Array.isArray(values[key])) {
          values[key].push(value);
        } else {
          values[key] = [values[key], value];
        }
        this._all = void 0;
      }
    };
  }
});
function asConfigScope(scope, fallback) {
  if (typeof scope === "string" && Object.hasOwn(GitConfigScope, scope)) {
    return scope;
  }
  return fallback;
}
function addConfigTask(key, value, append2, scope) {
  const commands4 = ["config", `--${scope}`];
  if (append2) {
    commands4.push("--add");
  }
  commands4.push(key, value);
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return text;
    }
  };
}
function getConfigTask(key, scope) {
  const commands4 = ["config", "--null", "--show-origin", "--get-all", key];
  if (scope) {
    commands4.splice(1, 0, `--${scope}`);
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return configGetParser(text, key);
    }
  };
}
function listConfigTask(scope) {
  const commands4 = ["config", "--list", "--show-origin", "--null"];
  if (scope) {
    commands4.push(`--${scope}`);
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return configListParser(text);
    }
  };
}
function config_default() {
  return {
    addConfig(key, value, ...rest) {
      return this._runTask(
        addConfigTask(
          key,
          value,
          rest[0] === true,
          asConfigScope(
            rest[1],
            "local"
            /* local */
          )
        ),
        trailingFunctionArgument(arguments)
      );
    },
    getConfig(key, scope) {
      return this._runTask(
        getConfigTask(key, asConfigScope(scope, void 0)),
        trailingFunctionArgument(arguments)
      );
    },
    listConfig(...rest) {
      return this._runTask(
        listConfigTask(asConfigScope(rest[0], void 0)),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
var GitConfigScope;
var init_config = __esm2({
  "src/lib/tasks/config.ts"() {
    "use strict";
    init_ConfigList();
    init_utils();
    GitConfigScope = /* @__PURE__ */ ((GitConfigScope2) => {
      GitConfigScope2["system"] = "system";
      GitConfigScope2["global"] = "global";
      GitConfigScope2["local"] = "local";
      GitConfigScope2["worktree"] = "worktree";
      return GitConfigScope2;
    })(GitConfigScope || {});
  }
});
function isDiffNameStatus(input) {
  return diffNameStatus.has(input);
}
var DiffNameStatus;
var diffNameStatus;
var init_diff_name_status = __esm2({
  "src/lib/tasks/diff-name-status.ts"() {
    "use strict";
    DiffNameStatus = /* @__PURE__ */ ((DiffNameStatus2) => {
      DiffNameStatus2["ADDED"] = "A";
      DiffNameStatus2["COPIED"] = "C";
      DiffNameStatus2["DELETED"] = "D";
      DiffNameStatus2["MODIFIED"] = "M";
      DiffNameStatus2["RENAMED"] = "R";
      DiffNameStatus2["CHANGED"] = "T";
      DiffNameStatus2["UNMERGED"] = "U";
      DiffNameStatus2["UNKNOWN"] = "X";
      DiffNameStatus2["BROKEN"] = "B";
      return DiffNameStatus2;
    })(DiffNameStatus || {});
    diffNameStatus = new Set(Object.values(DiffNameStatus));
  }
});
function grepQueryBuilder(...params) {
  return new GrepQuery().param(...params);
}
function parseGrep(grep) {
  const paths = /* @__PURE__ */ new Set();
  const results = {};
  forEachLineWithContent(grep, (input) => {
    const [path7, line, preview] = input.split(NULL);
    paths.add(path7);
    (results[path7] = results[path7] || []).push({
      line: asNumber(line),
      path: path7,
      preview
    });
  });
  return {
    paths,
    results
  };
}
function grep_default() {
  return {
    grep(searchTerm) {
      const then = trailingFunctionArgument(arguments);
      const options = getTrailingOptions(arguments);
      for (const option of disallowedOptions) {
        if (options.includes(option)) {
          return this._runTask(
            configurationErrorTask(`git.grep: use of "${option}" is not supported.`),
            then
          );
        }
      }
      if (typeof searchTerm === "string") {
        searchTerm = grepQueryBuilder().param(searchTerm);
      }
      const commands4 = ["grep", "--null", "-n", "--full-name", ...options, ...searchTerm];
      return this._runTask(
        {
          commands: commands4,
          format: "utf-8",
          parser(stdOut) {
            return parseGrep(stdOut);
          }
        },
        then
      );
    }
  };
}
var disallowedOptions;
var Query;
var _a;
var GrepQuery;
var init_grep = __esm2({
  "src/lib/tasks/grep.ts"() {
    "use strict";
    init_utils();
    init_task();
    disallowedOptions = ["-h"];
    Query = /* @__PURE__ */ Symbol("grepQuery");
    GrepQuery = class {
      constructor() {
        this[_a] = [];
      }
      *[(_a = Query, Symbol.iterator)]() {
        for (const query of this[Query]) {
          yield query;
        }
      }
      and(...and) {
        and.length && this[Query].push("--and", "(", ...prefixedArray(and, "-e"), ")");
        return this;
      }
      param(...param) {
        this[Query].push(...prefixedArray(param, "-e"));
        return this;
      }
    };
  }
});
var reset_exports = {};
__export2(reset_exports, {
  ResetMode: () => ResetMode,
  getResetMode: () => getResetMode,
  resetTask: () => resetTask
});
function resetTask(mode, customArgs) {
  const commands4 = ["reset"];
  if (isValidResetMode(mode)) {
    commands4.push(`--${mode}`);
  }
  commands4.push(...customArgs);
  return straightThroughStringTask(commands4);
}
function getResetMode(mode) {
  if (isValidResetMode(mode)) {
    return mode;
  }
  switch (typeof mode) {
    case "string":
    case "undefined":
      return "soft";
  }
  return;
}
function isValidResetMode(mode) {
  return typeof mode === "string" && validResetModes.includes(mode);
}
var ResetMode;
var validResetModes;
var init_reset = __esm2({
  "src/lib/tasks/reset.ts"() {
    "use strict";
    init_utils();
    init_task();
    ResetMode = /* @__PURE__ */ ((ResetMode2) => {
      ResetMode2["MIXED"] = "mixed";
      ResetMode2["SOFT"] = "soft";
      ResetMode2["HARD"] = "hard";
      ResetMode2["MERGE"] = "merge";
      ResetMode2["KEEP"] = "keep";
      return ResetMode2;
    })(ResetMode || {});
    validResetModes = asStringArray(Object.values(ResetMode));
  }
});
function createLog() {
  return (0, import_debug.default)("simple-git");
}
function prefixedLogger(to, prefix, forward) {
  if (!prefix || !String(prefix).replace(/\s*/, "")) {
    return !forward ? to : (message, ...args) => {
      to(message, ...args);
      forward(message, ...args);
    };
  }
  return (message, ...args) => {
    to(`%s ${message}`, prefix, ...args);
    if (forward) {
      forward(message, ...args);
    }
  };
}
function childLoggerName(name, childDebugger, { namespace: parentNamespace }) {
  if (typeof name === "string") {
    return name;
  }
  const childNamespace = childDebugger && childDebugger.namespace || "";
  if (childNamespace.startsWith(parentNamespace)) {
    return childNamespace.substr(parentNamespace.length + 1);
  }
  return childNamespace || parentNamespace;
}
function createLogger(label, verbose, initialStep, infoDebugger = createLog()) {
  const labelPrefix = label && `[${label}]` || "";
  const spawned = [];
  const debugDebugger = typeof verbose === "string" ? infoDebugger.extend(verbose) : verbose;
  const key = childLoggerName(filterType(verbose, filterString), debugDebugger, infoDebugger);
  return step(initialStep);
  function sibling(name, initial) {
    return append(
      spawned,
      createLogger(label, key.replace(/^[^:]+/, name), initial, infoDebugger)
    );
  }
  function step(phase) {
    const stepPrefix = phase && `[${phase}]` || "";
    const debug2 = debugDebugger && prefixedLogger(debugDebugger, stepPrefix) || NOOP;
    const info = prefixedLogger(infoDebugger, `${labelPrefix} ${stepPrefix}`, debug2);
    return Object.assign(debugDebugger ? debug2 : info, {
      label,
      sibling,
      info,
      step
    });
  }
}
var init_git_logger = __esm2({
  "src/lib/git-logger.ts"() {
    "use strict";
    init_utils();
    import_debug.default.formatters.L = (value) => String(filterHasLength(value) ? value.length : "-");
    import_debug.default.formatters.B = (value) => {
      if (Buffer.isBuffer(value)) {
        return value.toString("utf8");
      }
      return objectToString(value);
    };
  }
});
var TasksPendingQueue;
var init_tasks_pending_queue = __esm2({
  "src/lib/runners/tasks-pending-queue.ts"() {
    "use strict";
    init_git_error();
    init_git_logger();
    TasksPendingQueue = class _TasksPendingQueue {
      constructor(logLabel = "GitExecutor") {
        this.logLabel = logLabel;
        this._queue = /* @__PURE__ */ new Map();
      }
      withProgress(task) {
        return this._queue.get(task);
      }
      createProgress(task) {
        const name = _TasksPendingQueue.getName(task.commands[0]);
        const logger = createLogger(this.logLabel, name);
        return {
          task,
          logger,
          name
        };
      }
      push(task) {
        const progress = this.createProgress(task);
        progress.logger("Adding task to the queue, commands = %o", task.commands);
        this._queue.set(task, progress);
        return progress;
      }
      fatal(err) {
        for (const [task, { logger }] of Array.from(this._queue.entries())) {
          if (task === err.task) {
            logger.info(`Failed %o`, err);
            logger(
              `Fatal exception, any as-yet un-started tasks run through this executor will not be attempted`
            );
          } else {
            logger.info(
              `A fatal exception occurred in a previous task, the queue has been purged: %o`,
              err.message
            );
          }
          this.complete(task);
        }
        if (this._queue.size !== 0) {
          throw new Error(`Queue size should be zero after fatal: ${this._queue.size}`);
        }
      }
      complete(task) {
        const progress = this.withProgress(task);
        if (progress) {
          this._queue.delete(task);
        }
      }
      attempt(task) {
        const progress = this.withProgress(task);
        if (!progress) {
          throw new GitError(void 0, "TasksPendingQueue: attempt called for an unknown task");
        }
        progress.logger("Starting task");
        return progress;
      }
      static getName(name = "empty") {
        return `task:${name}:${++_TasksPendingQueue.counter}`;
      }
      static {
        this.counter = 0;
      }
    };
  }
});
function pluginContext(task, commands4) {
  return {
    method: first(task.commands) || "",
    commands: commands4
  };
}
function onErrorReceived(target, logger) {
  return (err) => {
    logger(`[ERROR] child process exception %o`, err);
    target.push(Buffer.from(String(err.stack), "ascii"));
  };
}
function onDataReceived(target, name, logger, output) {
  return (buffer) => {
    logger(`%s received %L bytes`, name, buffer);
    output(`%B`, buffer);
    target.push(buffer);
  };
}
var GitExecutorChain;
var init_git_executor_chain = __esm2({
  "src/lib/runners/git-executor-chain.ts"() {
    "use strict";
    init_git_error();
    init_task();
    init_utils();
    init_tasks_pending_queue();
    GitExecutorChain = class {
      constructor(_executor, _scheduler, _plugins) {
        this._executor = _executor;
        this._scheduler = _scheduler;
        this._plugins = _plugins;
        this._chain = Promise.resolve();
        this._queue = new TasksPendingQueue();
      }
      get cwd() {
        return this._cwd || this._executor.cwd;
      }
      set cwd(cwd) {
        this._cwd = cwd;
      }
      get env() {
        return this._executor.env;
      }
      get outputHandler() {
        return this._executor.outputHandler;
      }
      chain() {
        return this;
      }
      push(task) {
        this._queue.push(task);
        return this._chain = this._chain.then(() => this.attemptTask(task));
      }
      async attemptTask(task) {
        const onScheduleComplete = await this._scheduler.next();
        const onQueueComplete = () => this._queue.complete(task);
        try {
          const { logger } = this._queue.attempt(task);
          return await (isEmptyTask(task) ? this.attemptEmptyTask(task, logger) : this.attemptRemoteTask(task, logger));
        } catch (e) {
          throw this.onFatalException(task, e);
        } finally {
          onQueueComplete();
          onScheduleComplete();
        }
      }
      onFatalException(task, e) {
        const gitError = e instanceof GitError ? Object.assign(e, { task }) : new GitError(task, e && String(e));
        this._chain = Promise.resolve();
        this._queue.fatal(gitError);
        return gitError;
      }
      async attemptRemoteTask(task, logger) {
        const binary = this._plugins.exec("spawn.binary", "", pluginContext(task, task.commands));
        const args = this._plugins.exec(
          "spawn.args",
          [...task.commands],
          pluginContext(task, task.commands)
        );
        const raw = await this.gitResponse(
          task,
          binary,
          args,
          this.outputHandler,
          logger.step("SPAWN")
        );
        const outputStreams = await this.handleTaskData(task, args, raw, logger.step("HANDLE"));
        logger(`passing response to task's parser as a %s`, task.format);
        if (isBufferTask(task)) {
          return callTaskParser(task.parser, outputStreams);
        }
        return callTaskParser(task.parser, outputStreams.asStrings());
      }
      async attemptEmptyTask(task, logger) {
        logger(`empty task bypassing child process to call to task's parser`);
        return task.parser(this);
      }
      handleTaskData(task, args, result, logger) {
        const { exitCode, rejection, stdOut, stdErr } = result;
        return new Promise((done, fail) => {
          logger(`Preparing to handle process response exitCode=%d stdOut=`, exitCode);
          const { error } = this._plugins.exec(
            "task.error",
            { error: rejection },
            {
              ...pluginContext(task, args),
              ...result
            }
          );
          if (error && task.onError) {
            logger.info(`exitCode=%s handling with custom error handler`);
            return task.onError(
              result,
              error,
              (newStdOut) => {
                logger.info(`custom error handler treated as success`);
                logger(`custom error returned a %s`, objectToString(newStdOut));
                done(
                  new GitOutputStreams(
                    Array.isArray(newStdOut) ? Buffer.concat(newStdOut) : newStdOut,
                    Buffer.concat(stdErr)
                  )
                );
              },
              fail
            );
          }
          if (error) {
            logger.info(
              `handling as error: exitCode=%s stdErr=%s rejection=%o`,
              exitCode,
              stdErr.length,
              rejection
            );
            return fail(error);
          }
          logger.info(`retrieving task output complete`);
          done(new GitOutputStreams(Buffer.concat(stdOut), Buffer.concat(stdErr)));
        });
      }
      async gitResponse(task, command, args, outputHandler, logger) {
        const outputLogger = logger.sibling("output");
        const spawnOptions = this._plugins.exec(
          "spawn.options",
          {
            cwd: this.cwd,
            env: this.env,
            windowsHide: true
          },
          pluginContext(task, task.commands)
        );
        return new Promise((done) => {
          const stdOut = [];
          const stdErr = [];
          logger.info(`%s %o`, command, args);
          logger("%O", spawnOptions);
          let rejection = this._beforeSpawn(task, args);
          if (rejection) {
            return done({
              stdOut,
              stdErr,
              exitCode: 9901,
              rejection
            });
          }
          this._plugins.exec("spawn.before", void 0, {
            ...pluginContext(task, args),
            kill(reason) {
              rejection = reason || rejection;
            }
          });
          const spawned = (0, import_child_process2.spawn)(command, args, spawnOptions);
          spawned.stdout.on(
            "data",
            onDataReceived(stdOut, "stdOut", logger, outputLogger.step("stdOut"))
          );
          spawned.stderr.on(
            "data",
            onDataReceived(stdErr, "stdErr", logger, outputLogger.step("stdErr"))
          );
          spawned.on("error", onErrorReceived(stdErr, logger));
          if (outputHandler) {
            logger(`Passing child process stdOut/stdErr to custom outputHandler`);
            outputHandler(command, spawned.stdout, spawned.stderr, [...args]);
          }
          this._plugins.exec("spawn.after", void 0, {
            ...pluginContext(task, args),
            spawned,
            close(exitCode, reason) {
              done({
                stdOut,
                stdErr,
                exitCode,
                rejection: rejection || reason
              });
            },
            kill(reason) {
              if (spawned.killed) {
                return;
              }
              rejection = reason;
              spawned.kill("SIGINT");
            }
          });
        });
      }
      _beforeSpawn(task, args) {
        let rejection;
        this._plugins.exec("spawn.before", void 0, {
          ...pluginContext(task, args),
          kill(reason) {
            rejection = reason || rejection;
          }
        });
        return rejection;
      }
    };
  }
});
var git_executor_exports = {};
__export2(git_executor_exports, {
  GitExecutor: () => GitExecutor
});
var GitExecutor;
var init_git_executor = __esm2({
  "src/lib/runners/git-executor.ts"() {
    "use strict";
    init_git_executor_chain();
    GitExecutor = class {
      constructor(cwd, _scheduler, _plugins) {
        this.cwd = cwd;
        this._scheduler = _scheduler;
        this._plugins = _plugins;
        this._chain = new GitExecutorChain(this, this._scheduler, this._plugins);
      }
      chain() {
        return new GitExecutorChain(this, this._scheduler, this._plugins);
      }
      push(task) {
        return this._chain.push(task);
      }
    };
  }
});
function taskCallback(task, response, callback = NOOP) {
  const onSuccess = (data) => {
    callback(null, data);
  };
  const onError2 = (err) => {
    if (err?.task === task) {
      callback(
        err instanceof GitResponseError ? addDeprecationNoticeToError(err) : err,
        void 0
      );
    }
  };
  response.then(onSuccess, onError2);
}
function addDeprecationNoticeToError(err) {
  let log = (name) => {
    console.warn(
      `simple-git deprecation notice: accessing GitResponseError.${name} should be GitResponseError.git.${name}, this will no longer be available in version 3`
    );
    log = NOOP;
  };
  return Object.create(err, Object.getOwnPropertyNames(err.git).reduce(descriptorReducer, {}));
  function descriptorReducer(all, name) {
    if (name in err) {
      return all;
    }
    all[name] = {
      enumerable: false,
      configurable: false,
      get() {
        log(name);
        return err.git[name];
      }
    };
    return all;
  }
}
var init_task_callback = __esm2({
  "src/lib/task-callback.ts"() {
    "use strict";
    init_git_response_error();
    init_utils();
  }
});
function changeWorkingDirectoryTask(directory, root) {
  return adhocExecTask((instance) => {
    if (!folderExists(directory)) {
      throw new Error(`Git.cwd: cannot change to non-directory "${directory}"`);
    }
    return (root || instance).cwd = directory;
  });
}
var init_change_working_directory = __esm2({
  "src/lib/tasks/change-working-directory.ts"() {
    "use strict";
    init_utils();
    init_task();
  }
});
function checkoutTask(args) {
  const commands4 = ["checkout", ...args];
  if (commands4[1] === "-b" && commands4.includes("-B")) {
    commands4[1] = remove(commands4, "-B");
  }
  return straightThroughStringTask(commands4);
}
function checkout_default() {
  return {
    checkout() {
      return this._runTask(
        checkoutTask(getTrailingOptions(arguments, 1)),
        trailingFunctionArgument(arguments)
      );
    },
    checkoutBranch(branchName, startPoint) {
      return this._runTask(
        checkoutTask(["-b", branchName, startPoint, ...getTrailingOptions(arguments)]),
        trailingFunctionArgument(arguments)
      );
    },
    checkoutLocalBranch(branchName) {
      return this._runTask(
        checkoutTask(["-b", branchName, ...getTrailingOptions(arguments)]),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
var init_checkout = __esm2({
  "src/lib/tasks/checkout.ts"() {
    "use strict";
    init_utils();
    init_task();
  }
});
function countObjectsResponse() {
  return {
    count: 0,
    garbage: 0,
    inPack: 0,
    packs: 0,
    prunePackable: 0,
    size: 0,
    sizeGarbage: 0,
    sizePack: 0
  };
}
function count_objects_default() {
  return {
    countObjects() {
      return this._runTask({
        commands: ["count-objects", "--verbose"],
        format: "utf-8",
        parser(stdOut) {
          return parseStringResponse(countObjectsResponse(), [parser2], stdOut);
        }
      });
    }
  };
}
var parser2;
var init_count_objects = __esm2({
  "src/lib/tasks/count-objects.ts"() {
    "use strict";
    init_utils();
    parser2 = new LineParser(
      /([a-z-]+): (\d+)$/,
      (result, [key, value]) => {
        const property = asCamelCase(key);
        if (Object.hasOwn(result, property)) {
          result[property] = asNumber(value);
        }
      }
    );
  }
});
function parseCommitResult(stdOut) {
  const result = {
    author: null,
    branch: "",
    commit: "",
    root: false,
    summary: {
      changes: 0,
      insertions: 0,
      deletions: 0
    }
  };
  return parseStringResponse(result, parsers, stdOut);
}
var parsers;
var init_parse_commit = __esm2({
  "src/lib/parsers/parse-commit.ts"() {
    "use strict";
    init_utils();
    parsers = [
      new LineParser(/^\[([^\s]+)( \([^)]+\))? ([^\]]+)/, (result, [branch, root, commit]) => {
        result.branch = branch;
        result.commit = commit;
        result.root = !!root;
      }),
      new LineParser(/\s*Author:\s(.+)/i, (result, [author]) => {
        const parts = author.split("<");
        const email = parts.pop();
        if (!email || !email.includes("@")) {
          return;
        }
        result.author = {
          email: email.substr(0, email.length - 1),
          name: parts.join("<").trim()
        };
      }),
      new LineParser(
        /(\d+)[^,]*(?:,\s*(\d+)[^,]*)(?:,\s*(\d+))/g,
        (result, [changes, insertions, deletions]) => {
          result.summary.changes = parseInt(changes, 10) || 0;
          result.summary.insertions = parseInt(insertions, 10) || 0;
          result.summary.deletions = parseInt(deletions, 10) || 0;
        }
      ),
      new LineParser(
        /^(\d+)[^,]*(?:,\s*(\d+)[^(]+\(([+-]))?/,
        (result, [changes, lines, direction]) => {
          result.summary.changes = parseInt(changes, 10) || 0;
          const count = parseInt(lines, 10) || 0;
          if (direction === "-") {
            result.summary.deletions = count;
          } else if (direction === "+") {
            result.summary.insertions = count;
          }
        }
      )
    ];
  }
});
function commitTask(message, files, customArgs) {
  const commands4 = [
    "-c",
    "core.abbrev=40",
    "commit",
    ...prefixedArray(message, "-m"),
    ...files,
    ...customArgs
  ];
  return {
    commands: commands4,
    format: "utf-8",
    parser: parseCommitResult
  };
}
function commit_default() {
  return {
    commit(message, ...rest) {
      const next = trailingFunctionArgument(arguments);
      const task = rejectDeprecatedSignatures(message) || commitTask(
        asArray(message),
        asArray(filterType(rest[0], filterStringOrStringArray, [])),
        [
          ...asStringArray(filterType(rest[1], filterArray, [])),
          ...getTrailingOptions(arguments, 0, true)
        ]
      );
      return this._runTask(task, next);
    }
  };
  function rejectDeprecatedSignatures(message) {
    return !filterStringOrStringArray(message) && configurationErrorTask(
      `git.commit: requires the commit message to be supplied as a string/string[]`
    );
  }
}
var init_commit = __esm2({
  "src/lib/tasks/commit.ts"() {
    "use strict";
    init_parse_commit();
    init_utils();
    init_task();
  }
});
function first_commit_default() {
  return {
    firstCommit() {
      return this._runTask(
        straightThroughStringTask(["rev-list", "--max-parents=0", "HEAD"], true),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
var init_first_commit = __esm2({
  "src/lib/tasks/first-commit.ts"() {
    "use strict";
    init_utils();
    init_task();
  }
});
function hashObjectTask(filePath, write) {
  const commands4 = ["hash-object", filePath];
  if (write) {
    commands4.push("-w");
  }
  return straightThroughStringTask(commands4, true);
}
var init_hash_object = __esm2({
  "src/lib/tasks/hash-object.ts"() {
    "use strict";
    init_task();
  }
});
function parseInit(bare, path7, text) {
  const response = String(text).trim();
  let result;
  if (result = initResponseRegex.exec(response)) {
    return new InitSummary(bare, path7, false, result[1]);
  }
  if (result = reInitResponseRegex.exec(response)) {
    return new InitSummary(bare, path7, true, result[1]);
  }
  let gitDir = "";
  const tokens = response.split(" ");
  while (tokens.length) {
    const token = tokens.shift();
    if (token === "in") {
      gitDir = tokens.join(" ");
      break;
    }
  }
  return new InitSummary(bare, path7, /^re/i.test(response), gitDir);
}
var InitSummary;
var initResponseRegex;
var reInitResponseRegex;
var init_InitSummary = __esm2({
  "src/lib/responses/InitSummary.ts"() {
    "use strict";
    InitSummary = class {
      constructor(bare, path7, existing, gitDir) {
        this.bare = bare;
        this.path = path7;
        this.existing = existing;
        this.gitDir = gitDir;
      }
    };
    initResponseRegex = /^Init.+ repository in (.+)$/;
    reInitResponseRegex = /^Rein.+ in (.+)$/;
  }
});
function hasBareCommand(command) {
  return command.includes(bareCommand);
}
function initTask(bare = false, path7, customArgs) {
  const commands4 = ["init", ...customArgs];
  if (bare && !hasBareCommand(commands4)) {
    commands4.splice(1, 0, bareCommand);
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser(text) {
      return parseInit(commands4.includes("--bare"), path7, text);
    }
  };
}
var bareCommand;
var init_init = __esm2({
  "src/lib/tasks/init.ts"() {
    "use strict";
    init_InitSummary();
    bareCommand = "--bare";
  }
});
function logFormatFromCommand(customArgs) {
  for (let i = 0; i < customArgs.length; i++) {
    const format = logFormatRegex.exec(customArgs[i]);
    if (format) {
      return `--${format[1]}`;
    }
  }
  return "";
}
function isLogFormat(customArg) {
  return logFormatRegex.test(customArg);
}
var logFormatRegex;
var init_log_format = __esm2({
  "src/lib/args/log-format.ts"() {
    "use strict";
    logFormatRegex = /^--(stat|numstat|name-only|name-status)(=|$)/;
  }
});
var DiffSummary;
var init_DiffSummary = __esm2({
  "src/lib/responses/DiffSummary.ts"() {
    "use strict";
    DiffSummary = class {
      constructor() {
        this.changed = 0;
        this.deletions = 0;
        this.insertions = 0;
        this.files = [];
      }
    };
  }
});
function getDiffParser(format = "") {
  const parser4 = diffSummaryParsers[format];
  return (stdOut) => parseStringResponse(new DiffSummary(), parser4, stdOut, false);
}
var statParser;
var numStatParser;
var nameOnlyParser;
var nameStatusParser;
var diffSummaryParsers;
var init_parse_diff_summary = __esm2({
  "src/lib/parsers/parse-diff-summary.ts"() {
    "use strict";
    init_log_format();
    init_DiffSummary();
    init_diff_name_status();
    init_utils();
    statParser = [
      new LineParser(
        /^(.+)\s+\|\s+(\d+)(\s+[+\-]+)?$/,
        (result, [file, changes, alterations = ""]) => {
          result.files.push({
            file: file.trim(),
            changes: asNumber(changes),
            insertions: alterations.replace(/[^+]/g, "").length,
            deletions: alterations.replace(/[^-]/g, "").length,
            binary: false
          });
        }
      ),
      new LineParser(
        /^(.+) \|\s+Bin ([0-9.]+) -> ([0-9.]+) ([a-z]+)/,
        (result, [file, before, after]) => {
          result.files.push({
            file: file.trim(),
            before: asNumber(before),
            after: asNumber(after),
            binary: true
          });
        }
      ),
      new LineParser(
        /(\d+) files? changed\s*((?:, \d+ [^,]+){0,2})/,
        (result, [changed, summary]) => {
          const inserted = /(\d+) i/.exec(summary);
          const deleted = /(\d+) d/.exec(summary);
          result.changed = asNumber(changed);
          result.insertions = asNumber(inserted?.[1]);
          result.deletions = asNumber(deleted?.[1]);
        }
      )
    ];
    numStatParser = [
      new LineParser(
        /(\d+)\t(\d+)\t(.+)$/,
        (result, [changesInsert, changesDelete, file]) => {
          const insertions = asNumber(changesInsert);
          const deletions = asNumber(changesDelete);
          result.changed++;
          result.insertions += insertions;
          result.deletions += deletions;
          result.files.push({
            file,
            changes: insertions + deletions,
            insertions,
            deletions,
            binary: false
          });
        }
      ),
      new LineParser(/-\t-\t(.+)$/, (result, [file]) => {
        result.changed++;
        result.files.push({
          file,
          after: 0,
          before: 0,
          binary: true
        });
      })
    ];
    nameOnlyParser = [
      new LineParser(/(.+)$/, (result, [file]) => {
        result.changed++;
        result.files.push({
          file,
          changes: 0,
          insertions: 0,
          deletions: 0,
          binary: false
        });
      })
    ];
    nameStatusParser = [
      new LineParser(
        /([ACDMRTUXB])([0-9]{0,3})\t(.[^\t]*)(\t(.[^\t]*))?$/,
        (result, [status, similarity, from, _to, to]) => {
          result.changed++;
          result.files.push({
            file: to ?? from,
            changes: 0,
            insertions: 0,
            deletions: 0,
            binary: false,
            status: orVoid(isDiffNameStatus(status) && status),
            from: orVoid(!!to && from !== to && from),
            similarity: asNumber(similarity)
          });
        }
      )
    ];
    diffSummaryParsers = {
      [
        ""
        /* NONE */
      ]: statParser,
      [
        "--stat"
        /* STAT */
      ]: statParser,
      [
        "--numstat"
        /* NUM_STAT */
      ]: numStatParser,
      [
        "--name-status"
        /* NAME_STATUS */
      ]: nameStatusParser,
      [
        "--name-only"
        /* NAME_ONLY */
      ]: nameOnlyParser
    };
  }
});
function lineBuilder(tokens, fields) {
  return fields.reduce(
    (line, field, index) => {
      line[field] = tokens[index] || "";
      return line;
    },
    /* @__PURE__ */ Object.create({ diff: null })
  );
}
function createListLogSummaryParser(splitter = SPLITTER, fields = defaultFieldNames, logFormat = "") {
  const parseDiffResult = getDiffParser(logFormat);
  return function(stdOut) {
    const all = toLinesWithContent(
      stdOut.trim(),
      false,
      START_BOUNDARY
    ).map(function(item) {
      const lineDetail = item.split(COMMIT_BOUNDARY);
      const listLogLine = lineBuilder(lineDetail[0].split(splitter), fields);
      if (lineDetail.length > 1 && !!lineDetail[1].trim()) {
        listLogLine.diff = parseDiffResult(lineDetail[1]);
      }
      return listLogLine;
    });
    return {
      all,
      latest: all.length && all[0] || null,
      total: all.length
    };
  };
}
var START_BOUNDARY;
var COMMIT_BOUNDARY;
var SPLITTER;
var defaultFieldNames;
var init_parse_list_log_summary = __esm2({
  "src/lib/parsers/parse-list-log-summary.ts"() {
    "use strict";
    init_utils();
    init_parse_diff_summary();
    init_log_format();
    START_BOUNDARY = "\xF2\xF2\xF2\xF2\xF2\xF2 ";
    COMMIT_BOUNDARY = " \xF2\xF2";
    SPLITTER = " \xF2 ";
    defaultFieldNames = ["hash", "date", "message", "refs", "author_name", "author_email"];
  }
});
var diff_exports = {};
__export2(diff_exports, {
  diffSummaryTask: () => diffSummaryTask,
  validateLogFormatConfig: () => validateLogFormatConfig
});
function diffSummaryTask(customArgs) {
  let logFormat = logFormatFromCommand(customArgs);
  const commands4 = ["diff"];
  if (logFormat === "") {
    logFormat = "--stat";
    commands4.push("--stat=4096");
  }
  commands4.push(...customArgs);
  return validateLogFormatConfig(commands4) || {
    commands: commands4,
    format: "utf-8",
    parser: getDiffParser(logFormat)
  };
}
function validateLogFormatConfig(customArgs) {
  const flags = customArgs.filter(isLogFormat);
  if (flags.length > 1) {
    return configurationErrorTask(
      `Summary flags are mutually exclusive - pick one of ${flags.join(",")}`
    );
  }
  if (flags.length && customArgs.includes("-z")) {
    return configurationErrorTask(
      `Summary flag ${flags} parsing is not compatible with null termination option '-z'`
    );
  }
}
var init_diff = __esm2({
  "src/lib/tasks/diff.ts"() {
    "use strict";
    init_log_format();
    init_parse_diff_summary();
    init_task();
  }
});
function prettyFormat(format, splitter) {
  const fields = [];
  const formatStr = [];
  Object.keys(format).forEach((field) => {
    fields.push(field);
    formatStr.push(String(format[field]));
  });
  return [fields, formatStr.join(splitter)];
}
function userOptions(input) {
  return Object.keys(input).reduce((out, key) => {
    if (!(key in excludeOptions)) {
      out[key] = input[key];
    }
    return out;
  }, {});
}
function parseLogOptions(opt = {}, customArgs = []) {
  const splitter = filterType(opt.splitter, filterString, SPLITTER);
  const format = filterPlainObject(opt.format) ? opt.format : {
    hash: "%H",
    date: opt.strictDate === false ? "%ai" : "%aI",
    message: "%s",
    refs: "%D",
    body: opt.multiLine ? "%B" : "%b",
    author_name: opt.mailMap !== false ? "%aN" : "%an",
    author_email: opt.mailMap !== false ? "%aE" : "%ae"
  };
  const [fields, formatStr] = prettyFormat(format, splitter);
  const suffix = [];
  const command = [
    `--pretty=format:${START_BOUNDARY}${formatStr}${COMMIT_BOUNDARY}`,
    ...customArgs
  ];
  const maxCount = opt.n || opt["max-count"] || opt.maxCount;
  if (maxCount) {
    command.push(`--max-count=${maxCount}`);
  }
  if (opt.from || opt.to) {
    const rangeOperator = opt.symmetric !== false ? "..." : "..";
    suffix.push(`${opt.from || ""}${rangeOperator}${opt.to || ""}`);
  }
  if (filterString(opt.file)) {
    command.push("--follow", pathspec(opt.file));
  }
  appendTaskOptions(userOptions(opt), command);
  return {
    fields,
    splitter,
    commands: [...command, ...suffix]
  };
}
function logTask(splitter, fields, customArgs) {
  const parser4 = createListLogSummaryParser(splitter, fields, logFormatFromCommand(customArgs));
  return {
    commands: ["log", ...customArgs],
    format: "utf-8",
    parser: parser4
  };
}
function log_default() {
  return {
    log(...rest) {
      const next = trailingFunctionArgument(arguments);
      const options = parseLogOptions(
        trailingOptionsArgument(arguments),
        asStringArray(filterType(arguments[0], filterArray, []))
      );
      const task = rejectDeprecatedSignatures(...rest) || validateLogFormatConfig(options.commands) || createLogTask(options);
      return this._runTask(task, next);
    }
  };
  function createLogTask(options) {
    return logTask(options.splitter, options.fields, options.commands);
  }
  function rejectDeprecatedSignatures(from, to) {
    return filterString(from) && filterString(to) && configurationErrorTask(
      `git.log(string, string) should be replaced with git.log({ from: string, to: string })`
    );
  }
}
var excludeOptions;
var init_log = __esm2({
  "src/lib/tasks/log.ts"() {
    "use strict";
    init_log_format();
    init_pathspec();
    init_parse_list_log_summary();
    init_utils();
    init_task();
    init_diff();
    excludeOptions = /* @__PURE__ */ ((excludeOptions2) => {
      excludeOptions2[excludeOptions2["--pretty"] = 0] = "--pretty";
      excludeOptions2[excludeOptions2["max-count"] = 1] = "max-count";
      excludeOptions2[excludeOptions2["maxCount"] = 2] = "maxCount";
      excludeOptions2[excludeOptions2["n"] = 3] = "n";
      excludeOptions2[excludeOptions2["file"] = 4] = "file";
      excludeOptions2[excludeOptions2["format"] = 5] = "format";
      excludeOptions2[excludeOptions2["from"] = 6] = "from";
      excludeOptions2[excludeOptions2["to"] = 7] = "to";
      excludeOptions2[excludeOptions2["splitter"] = 8] = "splitter";
      excludeOptions2[excludeOptions2["symmetric"] = 9] = "symmetric";
      excludeOptions2[excludeOptions2["mailMap"] = 10] = "mailMap";
      excludeOptions2[excludeOptions2["multiLine"] = 11] = "multiLine";
      excludeOptions2[excludeOptions2["strictDate"] = 12] = "strictDate";
      return excludeOptions2;
    })(excludeOptions || {});
  }
});
var MergeSummaryConflict;
var MergeSummaryDetail;
var init_MergeSummary = __esm2({
  "src/lib/responses/MergeSummary.ts"() {
    "use strict";
    MergeSummaryConflict = class {
      constructor(reason, file = null, meta) {
        this.reason = reason;
        this.file = file;
        this.meta = meta;
      }
      toString() {
        return `${this.file}:${this.reason}`;
      }
    };
    MergeSummaryDetail = class {
      constructor() {
        this.conflicts = [];
        this.merges = [];
        this.result = "success";
      }
      get failed() {
        return this.conflicts.length > 0;
      }
      get reason() {
        return this.result;
      }
      toString() {
        if (this.conflicts.length) {
          return `CONFLICTS: ${this.conflicts.join(", ")}`;
        }
        return "OK";
      }
    };
  }
});
var PullSummary;
var PullFailedSummary;
var init_PullSummary = __esm2({
  "src/lib/responses/PullSummary.ts"() {
    "use strict";
    PullSummary = class {
      constructor() {
        this.remoteMessages = {
          all: []
        };
        this.created = [];
        this.deleted = [];
        this.files = [];
        this.deletions = {};
        this.insertions = {};
        this.summary = {
          changes: 0,
          deletions: 0,
          insertions: 0
        };
      }
    };
    PullFailedSummary = class {
      constructor() {
        this.remote = "";
        this.hash = {
          local: "",
          remote: ""
        };
        this.branch = {
          local: "",
          remote: ""
        };
        this.message = "";
      }
      toString() {
        return this.message;
      }
    };
  }
});
function objectEnumerationResult(remoteMessages) {
  return remoteMessages.objects = remoteMessages.objects || {
    compressing: 0,
    counting: 0,
    enumerating: 0,
    packReused: 0,
    reused: { count: 0, delta: 0 },
    total: { count: 0, delta: 0 }
  };
}
function asObjectCount(source) {
  const count = /^\s*(\d+)/.exec(source);
  const delta = /delta (\d+)/i.exec(source);
  return {
    count: asNumber(count && count[1] || "0"),
    delta: asNumber(delta && delta[1] || "0")
  };
}
var remoteMessagesObjectParsers;
var init_parse_remote_objects = __esm2({
  "src/lib/parsers/parse-remote-objects.ts"() {
    "use strict";
    init_utils();
    remoteMessagesObjectParsers = [
      new RemoteLineParser(
        /^remote:\s*(enumerating|counting|compressing) objects: (\d+),/i,
        (result, [action, count]) => {
          const key = action.toLowerCase();
          const enumeration = objectEnumerationResult(result.remoteMessages);
          Object.assign(enumeration, { [key]: asNumber(count) });
        }
      ),
      new RemoteLineParser(
        /^remote:\s*(enumerating|counting|compressing) objects: \d+% \(\d+\/(\d+)\),/i,
        (result, [action, count]) => {
          const key = action.toLowerCase();
          const enumeration = objectEnumerationResult(result.remoteMessages);
          Object.assign(enumeration, { [key]: asNumber(count) });
        }
      ),
      new RemoteLineParser(
        /total ([^,]+), reused ([^,]+), pack-reused (\d+)/i,
        (result, [total, reused, packReused]) => {
          const objects = objectEnumerationResult(result.remoteMessages);
          objects.total = asObjectCount(total);
          objects.reused = asObjectCount(reused);
          objects.packReused = asNumber(packReused);
        }
      )
    ];
  }
});
function parseRemoteMessages(_stdOut, stdErr) {
  return parseStringResponse({ remoteMessages: new RemoteMessageSummary() }, parsers2, stdErr);
}
var parsers2;
var RemoteMessageSummary;
var init_parse_remote_messages = __esm2({
  "src/lib/parsers/parse-remote-messages.ts"() {
    "use strict";
    init_utils();
    init_parse_remote_objects();
    parsers2 = [
      new RemoteLineParser(/^remote:\s*(.+)$/, (result, [text]) => {
        result.remoteMessages.all.push(text.trim());
        return false;
      }),
      ...remoteMessagesObjectParsers,
      new RemoteLineParser(
        [/create a (?:pull|merge) request/i, /\s(https?:\/\/\S+)$/],
        (result, [pullRequestUrl]) => {
          result.remoteMessages.pullRequestUrl = pullRequestUrl;
        }
      ),
      new RemoteLineParser(
        [/found (\d+) vulnerabilities.+\(([^)]+)\)/i, /\s(https?:\/\/\S+)$/],
        (result, [count, summary, url]) => {
          result.remoteMessages.vulnerabilities = {
            count: asNumber(count),
            summary,
            url
          };
        }
      )
    ];
    RemoteMessageSummary = class {
      constructor() {
        this.all = [];
      }
    };
  }
});
function parsePullErrorResult(stdOut, stdErr) {
  const pullError = parseStringResponse(new PullFailedSummary(), errorParsers, [stdOut, stdErr]);
  return pullError.message && pullError;
}
var FILE_UPDATE_REGEX;
var SUMMARY_REGEX;
var ACTION_REGEX;
var parsers3;
var errorParsers;
var parsePullDetail;
var parsePullResult;
var init_parse_pull = __esm2({
  "src/lib/parsers/parse-pull.ts"() {
    "use strict";
    init_PullSummary();
    init_utils();
    init_parse_remote_messages();
    FILE_UPDATE_REGEX = /^\s*(.+?)\s+\|\s+\d+\s*(\+*)(-*)/;
    SUMMARY_REGEX = /(\d+)\D+((\d+)\D+\(\+\))?(\D+(\d+)\D+\(-\))?/;
    ACTION_REGEX = /^(create|delete) mode \d+ (.+)/;
    parsers3 = [
      new LineParser(FILE_UPDATE_REGEX, (result, [file, insertions, deletions]) => {
        result.files.push(file);
        if (insertions) {
          result.insertions[file] = insertions.length;
        }
        if (deletions) {
          result.deletions[file] = deletions.length;
        }
      }),
      new LineParser(SUMMARY_REGEX, (result, [changes, , insertions, , deletions]) => {
        if (insertions !== void 0 || deletions !== void 0) {
          result.summary.changes = +changes || 0;
          result.summary.insertions = +insertions || 0;
          result.summary.deletions = +deletions || 0;
          return true;
        }
        return false;
      }),
      new LineParser(ACTION_REGEX, (result, [action, file]) => {
        append(result.files, file);
        append(action === "create" ? result.created : result.deleted, file);
      })
    ];
    errorParsers = [
      new LineParser(/^from\s(.+)$/i, (result, [remote]) => void (result.remote = remote)),
      new LineParser(/^fatal:\s(.+)$/, (result, [message]) => void (result.message = message)),
      new LineParser(
        /([a-z0-9]+)\.\.([a-z0-9]+)\s+(\S+)\s+->\s+(\S+)$/,
        (result, [hashLocal, hashRemote, branchLocal, branchRemote]) => {
          result.branch.local = branchLocal;
          result.hash.local = hashLocal;
          result.branch.remote = branchRemote;
          result.hash.remote = hashRemote;
        }
      )
    ];
    parsePullDetail = (stdOut, stdErr) => {
      return parseStringResponse(new PullSummary(), parsers3, [stdOut, stdErr]);
    };
    parsePullResult = (stdOut, stdErr) => {
      return Object.assign(
        new PullSummary(),
        parsePullDetail(stdOut, stdErr),
        parseRemoteMessages(stdOut, stdErr)
      );
    };
  }
});
var parsers4;
var parseMergeResult;
var parseMergeDetail;
var init_parse_merge = __esm2({
  "src/lib/parsers/parse-merge.ts"() {
    "use strict";
    init_MergeSummary();
    init_utils();
    init_parse_pull();
    parsers4 = [
      new LineParser(/^Auto-merging\s+(.+)$/, (summary, [autoMerge]) => {
        summary.merges.push(autoMerge);
      }),
      new LineParser(/^CONFLICT\s+\((.+)\): Merge conflict in (.+)$/, (summary, [reason, file]) => {
        summary.conflicts.push(new MergeSummaryConflict(reason, file));
      }),
      new LineParser(
        /^CONFLICT\s+\((.+\/delete)\): (.+) deleted in (.+) and/,
        (summary, [reason, file, deleteRef]) => {
          summary.conflicts.push(new MergeSummaryConflict(reason, file, { deleteRef }));
        }
      ),
      new LineParser(/^CONFLICT\s+\((.+)\):/, (summary, [reason]) => {
        summary.conflicts.push(new MergeSummaryConflict(reason, null));
      }),
      new LineParser(/^Automatic merge failed;\s+(.+)$/, (summary, [result]) => {
        summary.result = result;
      })
    ];
    parseMergeResult = (stdOut, stdErr) => {
      return Object.assign(parseMergeDetail(stdOut, stdErr), parsePullResult(stdOut, stdErr));
    };
    parseMergeDetail = (stdOut) => {
      return parseStringResponse(new MergeSummaryDetail(), parsers4, stdOut);
    };
  }
});
function mergeTask(customArgs) {
  if (!customArgs.length) {
    return configurationErrorTask("Git.merge requires at least one option");
  }
  return {
    commands: ["merge", ...customArgs],
    format: "utf-8",
    parser(stdOut, stdErr) {
      const merge = parseMergeResult(stdOut, stdErr);
      if (merge.failed) {
        throw new GitResponseError(merge);
      }
      return merge;
    }
  };
}
var init_merge = __esm2({
  "src/lib/tasks/merge.ts"() {
    "use strict";
    init_git_response_error();
    init_parse_merge();
    init_task();
  }
});
function pushResultPushedItem(local, remote, status) {
  const deleted = status.includes("deleted");
  const tag = status.includes("tag") || /^refs\/tags/.test(local);
  const alreadyUpdated = !status.includes("new");
  return {
    deleted,
    tag,
    branch: !tag,
    new: !alreadyUpdated,
    alreadyUpdated,
    local,
    remote
  };
}
var parsers5;
var parsePushResult;
var parsePushDetail;
var init_parse_push = __esm2({
  "src/lib/parsers/parse-push.ts"() {
    "use strict";
    init_utils();
    init_parse_remote_messages();
    parsers5 = [
      new LineParser(/^Pushing to (.+)$/, (result, [repo]) => {
        result.repo = repo;
      }),
      new LineParser(/^updating local tracking ref '(.+)'/, (result, [local]) => {
        result.ref = {
          ...result.ref || {},
          local
        };
      }),
      new LineParser(/^[=*-]\s+([^:]+):(\S+)\s+\[(.+)]$/, (result, [local, remote, type]) => {
        result.pushed.push(pushResultPushedItem(local, remote, type));
      }),
      new LineParser(
        /^Branch '([^']+)' set up to track remote branch '([^']+)' from '([^']+)'/,
        (result, [local, remote, remoteName]) => {
          result.branch = {
            ...result.branch || {},
            local,
            remote,
            remoteName
          };
        }
      ),
      new LineParser(
        /^([^:]+):(\S+)\s+([a-z0-9]+)\.\.([a-z0-9]+)$/,
        (result, [local, remote, from, to]) => {
          result.update = {
            head: {
              local,
              remote
            },
            hash: {
              from,
              to
            }
          };
        }
      )
    ];
    parsePushResult = (stdOut, stdErr) => {
      const pushDetail = parsePushDetail(stdOut, stdErr);
      const responseDetail = parseRemoteMessages(stdOut, stdErr);
      return {
        ...pushDetail,
        ...responseDetail
      };
    };
    parsePushDetail = (stdOut, stdErr) => {
      return parseStringResponse({ pushed: [] }, parsers5, [stdOut, stdErr]);
    };
  }
});
var push_exports = {};
__export2(push_exports, {
  pushTagsTask: () => pushTagsTask,
  pushTask: () => pushTask
});
function pushTagsTask(ref = {}, customArgs) {
  append(customArgs, "--tags");
  return pushTask(ref, customArgs);
}
function pushTask(ref = {}, customArgs) {
  const commands4 = ["push", ...customArgs];
  if (ref.branch) {
    commands4.splice(1, 0, ref.branch);
  }
  if (ref.remote) {
    commands4.splice(1, 0, ref.remote);
  }
  remove(commands4, "-v");
  append(commands4, "--verbose");
  append(commands4, "--porcelain");
  return {
    commands: commands4,
    format: "utf-8",
    parser: parsePushResult
  };
}
var init_push = __esm2({
  "src/lib/tasks/push.ts"() {
    "use strict";
    init_parse_push();
    init_utils();
  }
});
function show_default() {
  return {
    showBuffer() {
      const commands4 = ["show", ...getTrailingOptions(arguments, 1)];
      if (!commands4.includes("--binary")) {
        commands4.splice(1, 0, "--binary");
      }
      return this._runTask(
        straightThroughBufferTask(commands4),
        trailingFunctionArgument(arguments)
      );
    },
    show() {
      const commands4 = ["show", ...getTrailingOptions(arguments, 1)];
      return this._runTask(
        straightThroughStringTask(commands4),
        trailingFunctionArgument(arguments)
      );
    }
  };
}
var init_show = __esm2({
  "src/lib/tasks/show.ts"() {
    "use strict";
    init_utils();
    init_task();
  }
});
var fromPathRegex;
var FileStatusSummary;
var init_FileStatusSummary = __esm2({
  "src/lib/responses/FileStatusSummary.ts"() {
    "use strict";
    fromPathRegex = /^(.+)\0(.+)$/;
    FileStatusSummary = class {
      constructor(path7, index, working_dir) {
        this.path = path7;
        this.index = index;
        this.working_dir = working_dir;
        if (index === "R" || working_dir === "R") {
          const detail = fromPathRegex.exec(path7) || [null, path7, path7];
          this.from = detail[2] || "";
          this.path = detail[1] || "";
        }
      }
    };
  }
});
function renamedFile(line) {
  const [to, from] = line.split(NULL);
  return {
    from: from || to,
    to
  };
}
function parser3(indexX, indexY, handler) {
  return [`${indexX}${indexY}`, handler];
}
function conflicts(indexX, ...indexY) {
  return indexY.map((y) => parser3(indexX, y, (result, file) => append(result.conflicted, file)));
}
function splitLine(result, lineStr) {
  const trimmed2 = lineStr.trim();
  switch (" ") {
    case trimmed2.charAt(2):
      return data(trimmed2.charAt(0), trimmed2.charAt(1), trimmed2.substr(3));
    case trimmed2.charAt(1):
      return data(" ", trimmed2.charAt(0), trimmed2.substr(2));
    default:
      return;
  }
  function data(index, workingDir, path7) {
    const raw = `${index}${workingDir}`;
    const handler = parsers6.get(raw);
    if (handler) {
      handler(result, path7);
    }
    if (raw !== "##" && raw !== "!!") {
      result.files.push(new FileStatusSummary(path7, index, workingDir));
    }
  }
}
var StatusSummary;
var parsers6;
var parseStatusSummary;
var init_StatusSummary = __esm2({
  "src/lib/responses/StatusSummary.ts"() {
    "use strict";
    init_utils();
    init_FileStatusSummary();
    StatusSummary = class {
      constructor() {
        this.not_added = [];
        this.conflicted = [];
        this.created = [];
        this.deleted = [];
        this.ignored = void 0;
        this.modified = [];
        this.renamed = [];
        this.files = [];
        this.staged = [];
        this.ahead = 0;
        this.behind = 0;
        this.current = null;
        this.tracking = null;
        this.detached = false;
        this.isClean = () => {
          return !this.files.length;
        };
      }
    };
    parsers6 = new Map([
      parser3(
        " ",
        "A",
        (result, file) => append(result.created, file)
      ),
      parser3(
        " ",
        "D",
        (result, file) => append(result.deleted, file)
      ),
      parser3(
        " ",
        "M",
        (result, file) => append(result.modified, file)
      ),
      parser3(
        "A",
        " ",
        (result, file) => append(result.created, file) && append(result.staged, file)
      ),
      parser3(
        "A",
        "M",
        (result, file) => append(result.created, file) && append(result.staged, file) && append(result.modified, file)
      ),
      parser3(
        "D",
        " ",
        (result, file) => append(result.deleted, file) && append(result.staged, file)
      ),
      parser3(
        "M",
        " ",
        (result, file) => append(result.modified, file) && append(result.staged, file)
      ),
      parser3(
        "M",
        "M",
        (result, file) => append(result.modified, file) && append(result.staged, file)
      ),
      parser3("R", " ", (result, file) => {
        append(result.renamed, renamedFile(file));
      }),
      parser3("R", "M", (result, file) => {
        const renamed = renamedFile(file);
        append(result.renamed, renamed);
        append(result.modified, renamed.to);
      }),
      parser3("!", "!", (_result, _file) => {
        append(_result.ignored = _result.ignored || [], _file);
      }),
      parser3(
        "?",
        "?",
        (result, file) => append(result.not_added, file)
      ),
      ...conflicts(
        "A",
        "A",
        "U"
        /* UNMERGED */
      ),
      ...conflicts(
        "D",
        "D",
        "U"
        /* UNMERGED */
      ),
      ...conflicts(
        "U",
        "A",
        "D",
        "U"
        /* UNMERGED */
      ),
      [
        "##",
        (result, line) => {
          const aheadReg = /ahead (\d+)/;
          const behindReg = /behind (\d+)/;
          const currentReg = /^(.+?(?=(?:\.{3}|\s|$)))/;
          const trackingReg = /\.{3}(\S*)/;
          const onEmptyBranchReg = /\son\s(\S+?)(?=\.{3}|$)/;
          let regexResult = aheadReg.exec(line);
          result.ahead = regexResult && +regexResult[1] || 0;
          regexResult = behindReg.exec(line);
          result.behind = regexResult && +regexResult[1] || 0;
          regexResult = currentReg.exec(line);
          result.current = filterType(regexResult?.[1], filterString, null);
          regexResult = trackingReg.exec(line);
          result.tracking = filterType(regexResult?.[1], filterString, null);
          regexResult = onEmptyBranchReg.exec(line);
          if (regexResult) {
            result.current = filterType(regexResult?.[1], filterString, result.current);
          }
          result.detached = /\(no branch\)/.test(line);
        }
      ]
    ]);
    parseStatusSummary = function(text) {
      const lines = text.split(NULL);
      const status = new StatusSummary();
      for (let i = 0, l = lines.length; i < l; ) {
        let line = lines[i++].trim();
        if (!line) {
          continue;
        }
        if (line.charAt(0) === "R") {
          line += NULL + (lines[i++] || "");
        }
        splitLine(status, line);
      }
      return status;
    };
  }
});
function statusTask(customArgs) {
  const commands4 = [
    "status",
    "--porcelain",
    "-b",
    "-u",
    "--null",
    ...customArgs.filter((arg) => !ignoredOptions.includes(arg))
  ];
  return {
    format: "utf-8",
    commands: commands4,
    parser(text) {
      return parseStatusSummary(text);
    }
  };
}
var ignoredOptions;
var init_status = __esm2({
  "src/lib/tasks/status.ts"() {
    "use strict";
    init_StatusSummary();
    ignoredOptions = ["--null", "-z"];
  }
});
function versionResponse(major = 0, minor = 0, patch = 0, agent = "", installed = true) {
  return Object.defineProperty(
    {
      major,
      minor,
      patch,
      agent,
      installed
    },
    "toString",
    {
      value() {
        return `${this.major}.${this.minor}.${this.patch}`;
      },
      configurable: false,
      enumerable: false
    }
  );
}
function notInstalledResponse() {
  return versionResponse(0, 0, 0, "", false);
}
function version_default() {
  return {
    version() {
      return this._runTask({
        commands: ["--version"],
        format: "utf-8",
        parser: versionParser,
        onError(result, error, done, fail) {
          if (result.exitCode === -2) {
            return done(Buffer.from(NOT_INSTALLED));
          }
          fail(error);
        }
      });
    }
  };
}
function versionParser(stdOut) {
  if (stdOut === NOT_INSTALLED) {
    return notInstalledResponse();
  }
  return parseStringResponse(versionResponse(0, 0, 0, stdOut), parsers7, stdOut);
}
var NOT_INSTALLED;
var parsers7;
var init_version = __esm2({
  "src/lib/tasks/version.ts"() {
    "use strict";
    init_utils();
    NOT_INSTALLED = "installed=false";
    parsers7 = [
      new LineParser(
        /version (\d+)\.(\d+)\.(\d+)(?:\s*\((.+)\))?/,
        (result, [major, minor, patch, agent = ""]) => {
          Object.assign(
            result,
            versionResponse(asNumber(major), asNumber(minor), asNumber(patch), agent)
          );
        }
      ),
      new LineParser(
        /version (\d+)\.(\d+)\.(\D+)(.+)?$/,
        (result, [major, minor, patch, agent = ""]) => {
          Object.assign(result, versionResponse(asNumber(major), asNumber(minor), patch, agent));
        }
      )
    ];
  }
});
var simple_git_api_exports = {};
__export2(simple_git_api_exports, {
  SimpleGitApi: () => SimpleGitApi
});
var SimpleGitApi;
var init_simple_git_api = __esm2({
  "src/lib/simple-git-api.ts"() {
    "use strict";
    init_task_callback();
    init_change_working_directory();
    init_checkout();
    init_count_objects();
    init_commit();
    init_config();
    init_first_commit();
    init_grep();
    init_hash_object();
    init_init();
    init_log();
    init_merge();
    init_push();
    init_show();
    init_status();
    init_task();
    init_version();
    init_utils();
    SimpleGitApi = class {
      constructor(_executor) {
        this._executor = _executor;
      }
      _runTask(task, then) {
        const chain = this._executor.chain();
        const promise = chain.push(task);
        if (then) {
          taskCallback(task, promise, then);
        }
        return Object.create(this, {
          then: { value: promise.then.bind(promise) },
          catch: { value: promise.catch.bind(promise) },
          _executor: { value: chain }
        });
      }
      add(files) {
        return this._runTask(
          straightThroughStringTask(["add", ...asArray(files)]),
          trailingFunctionArgument(arguments)
        );
      }
      cwd(directory) {
        const next = trailingFunctionArgument(arguments);
        if (typeof directory === "string") {
          return this._runTask(changeWorkingDirectoryTask(directory, this._executor), next);
        }
        if (typeof directory?.path === "string") {
          return this._runTask(
            changeWorkingDirectoryTask(
              directory.path,
              directory.root && this._executor || void 0
            ),
            next
          );
        }
        return this._runTask(
          configurationErrorTask("Git.cwd: workingDirectory must be supplied as a string"),
          next
        );
      }
      hashObject(path7, write) {
        return this._runTask(
          hashObjectTask(path7, write === true),
          trailingFunctionArgument(arguments)
        );
      }
      init(bare) {
        return this._runTask(
          initTask(bare === true, this._executor.cwd, getTrailingOptions(arguments)),
          trailingFunctionArgument(arguments)
        );
      }
      merge() {
        return this._runTask(
          mergeTask(getTrailingOptions(arguments)),
          trailingFunctionArgument(arguments)
        );
      }
      mergeFromTo(remote, branch) {
        if (!(filterString(remote) && filterString(branch))) {
          return this._runTask(
            configurationErrorTask(
              `Git.mergeFromTo requires that the 'remote' and 'branch' arguments are supplied as strings`
            )
          );
        }
        return this._runTask(
          mergeTask([remote, branch, ...getTrailingOptions(arguments)]),
          trailingFunctionArgument(arguments, false)
        );
      }
      outputHandler(handler) {
        this._executor.outputHandler = handler;
        return this;
      }
      push() {
        const task = pushTask(
          {
            remote: filterType(arguments[0], filterString),
            branch: filterType(arguments[1], filterString)
          },
          getTrailingOptions(arguments)
        );
        return this._runTask(task, trailingFunctionArgument(arguments));
      }
      stash() {
        return this._runTask(
          straightThroughStringTask(["stash", ...getTrailingOptions(arguments)]),
          trailingFunctionArgument(arguments)
        );
      }
      status() {
        return this._runTask(
          statusTask(getTrailingOptions(arguments)),
          trailingFunctionArgument(arguments)
        );
      }
    };
    Object.assign(
      SimpleGitApi.prototype,
      checkout_default(),
      commit_default(),
      config_default(),
      count_objects_default(),
      first_commit_default(),
      grep_default(),
      log_default(),
      show_default(),
      version_default()
    );
  }
});
var scheduler_exports = {};
__export2(scheduler_exports, {
  Scheduler: () => Scheduler
});
var createScheduledTask;
var Scheduler;
var init_scheduler = __esm2({
  "src/lib/runners/scheduler.ts"() {
    "use strict";
    init_utils();
    init_git_logger();
    createScheduledTask = /* @__PURE__ */ (() => {
      let id = 0;
      return () => {
        id++;
        const { promise, done } = (0, import_promise_deferred.createDeferred)();
        return {
          promise,
          done,
          id
        };
      };
    })();
    Scheduler = class {
      constructor(concurrency = 2) {
        this.concurrency = concurrency;
        this.logger = createLogger("", "scheduler");
        this.pending = [];
        this.running = [];
        this.logger(`Constructed, concurrency=%s`, concurrency);
      }
      schedule() {
        if (!this.pending.length || this.running.length >= this.concurrency) {
          this.logger(
            `Schedule attempt ignored, pending=%s running=%s concurrency=%s`,
            this.pending.length,
            this.running.length,
            this.concurrency
          );
          return;
        }
        const task = append(this.running, this.pending.shift());
        this.logger(`Attempting id=%s`, task.id);
        task.done(() => {
          this.logger(`Completing id=`, task.id);
          remove(this.running, task);
          this.schedule();
        });
      }
      next() {
        const { promise, id } = append(this.pending, createScheduledTask());
        this.logger(`Scheduling id=%s`, id);
        this.schedule();
        return promise;
      }
    };
  }
});
var apply_patch_exports = {};
__export2(apply_patch_exports, {
  applyPatchTask: () => applyPatchTask
});
function applyPatchTask(patches, customArgs) {
  return straightThroughStringTask(["apply", ...customArgs, ...patches]);
}
var init_apply_patch = __esm2({
  "src/lib/tasks/apply-patch.ts"() {
    "use strict";
    init_task();
  }
});
function branchDeletionSuccess(branch, hash) {
  return {
    branch,
    hash,
    success: true
  };
}
function branchDeletionFailure(branch) {
  return {
    branch,
    hash: null,
    success: false
  };
}
var BranchDeletionBatch;
var init_BranchDeleteSummary = __esm2({
  "src/lib/responses/BranchDeleteSummary.ts"() {
    "use strict";
    BranchDeletionBatch = class {
      constructor() {
        this.all = [];
        this.branches = {};
        this.errors = [];
      }
      get success() {
        return !this.errors.length;
      }
    };
  }
});
function hasBranchDeletionError(data, processExitCode) {
  return processExitCode === 1 && deleteErrorRegex.test(data);
}
var deleteSuccessRegex;
var deleteErrorRegex;
var parsers8;
var parseBranchDeletions;
var init_parse_branch_delete = __esm2({
  "src/lib/parsers/parse-branch-delete.ts"() {
    "use strict";
    init_BranchDeleteSummary();
    init_utils();
    deleteSuccessRegex = /(\S+)\s+\(\S+\s([^)]+)\)/;
    deleteErrorRegex = /^error[^']+'([^']+)'/m;
    parsers8 = [
      new LineParser(deleteSuccessRegex, (result, [branch, hash]) => {
        const deletion = branchDeletionSuccess(branch, hash);
        result.all.push(deletion);
        result.branches[branch] = deletion;
      }),
      new LineParser(deleteErrorRegex, (result, [branch]) => {
        const deletion = branchDeletionFailure(branch);
        result.errors.push(deletion);
        result.all.push(deletion);
        result.branches[branch] = deletion;
      })
    ];
    parseBranchDeletions = (stdOut, stdErr) => {
      return parseStringResponse(new BranchDeletionBatch(), parsers8, [stdOut, stdErr]);
    };
  }
});
var BranchSummaryResult;
var init_BranchSummary = __esm2({
  "src/lib/responses/BranchSummary.ts"() {
    "use strict";
    BranchSummaryResult = class {
      constructor() {
        this.all = [];
        this.branches = {};
        this.current = "";
        this.detached = false;
      }
      push(status, detached, name, commit, label) {
        if (status === "*") {
          this.detached = detached;
          this.current = name;
        }
        this.all.push(name);
        this.branches[name] = {
          current: status === "*",
          linkedWorkTree: status === "+",
          name,
          commit,
          label
        };
      }
    };
  }
});
function branchStatus(input) {
  return input ? input.charAt(0) : "";
}
function parseBranchSummary(stdOut, currentOnly = false) {
  return parseStringResponse(
    new BranchSummaryResult(),
    currentOnly ? [currentBranchParser] : parsers9,
    stdOut
  );
}
var parsers9;
var currentBranchParser;
var init_parse_branch = __esm2({
  "src/lib/parsers/parse-branch.ts"() {
    "use strict";
    init_BranchSummary();
    init_utils();
    parsers9 = [
      new LineParser(
        /^([*+]\s)?\((?:HEAD )?detached (?:from|at) (\S+)\)\s+([a-z0-9]+)\s(.*)$/,
        (result, [current, name, commit, label]) => {
          result.push(branchStatus(current), true, name, commit, label);
        }
      ),
      new LineParser(
        /^([*+]\s)?(\S+)\s+([a-z0-9]+)\s?(.*)$/s,
        (result, [current, name, commit, label]) => {
          result.push(branchStatus(current), false, name, commit, label);
        }
      )
    ];
    currentBranchParser = new LineParser(/^(\S+)$/s, (result, [name]) => {
      result.push("*", false, name, "", "");
    });
  }
});
var branch_exports = {};
__export2(branch_exports, {
  branchLocalTask: () => branchLocalTask,
  branchTask: () => branchTask,
  containsDeleteBranchCommand: () => containsDeleteBranchCommand,
  deleteBranchTask: () => deleteBranchTask,
  deleteBranchesTask: () => deleteBranchesTask
});
function containsDeleteBranchCommand(commands4) {
  const deleteCommands = ["-d", "-D", "--delete"];
  return commands4.some((command) => deleteCommands.includes(command));
}
function branchTask(customArgs) {
  const isDelete = containsDeleteBranchCommand(customArgs);
  const isCurrentOnly = customArgs.includes("--show-current");
  const commands4 = ["branch", ...customArgs];
  if (commands4.length === 1) {
    commands4.push("-a");
  }
  if (!commands4.includes("-v")) {
    commands4.splice(1, 0, "-v");
  }
  return {
    format: "utf-8",
    commands: commands4,
    parser(stdOut, stdErr) {
      if (isDelete) {
        return parseBranchDeletions(stdOut, stdErr).all[0];
      }
      return parseBranchSummary(stdOut, isCurrentOnly);
    }
  };
}
function branchLocalTask() {
  return {
    format: "utf-8",
    commands: ["branch", "-v"],
    parser(stdOut) {
      return parseBranchSummary(stdOut);
    }
  };
}
function deleteBranchesTask(branches, forceDelete = false) {
  return {
    format: "utf-8",
    commands: ["branch", "-v", forceDelete ? "-D" : "-d", ...branches],
    parser(stdOut, stdErr) {
      return parseBranchDeletions(stdOut, stdErr);
    },
    onError({ exitCode, stdOut }, error, done, fail) {
      if (!hasBranchDeletionError(String(error), exitCode)) {
        return fail(error);
      }
      done(stdOut);
    }
  };
}
function deleteBranchTask(branch, forceDelete = false) {
  const task = {
    format: "utf-8",
    commands: ["branch", "-v", forceDelete ? "-D" : "-d", branch],
    parser(stdOut, stdErr) {
      return parseBranchDeletions(stdOut, stdErr).branches[branch];
    },
    onError({ exitCode, stdErr, stdOut }, error, _, fail) {
      if (!hasBranchDeletionError(String(error), exitCode)) {
        return fail(error);
      }
      throw new GitResponseError(
        task.parser(bufferToString(stdOut), bufferToString(stdErr)),
        String(error)
      );
    }
  };
  return task;
}
var init_branch = __esm2({
  "src/lib/tasks/branch.ts"() {
    "use strict";
    init_git_response_error();
    init_parse_branch_delete();
    init_parse_branch();
    init_utils();
  }
});
function toPath(input) {
  const path7 = input.trim().replace(/^["']|["']$/g, "");
  return path7 && (0, import_node_path.normalize)(path7);
}
var parseCheckIgnore;
var init_CheckIgnore = __esm2({
  "src/lib/responses/CheckIgnore.ts"() {
    "use strict";
    parseCheckIgnore = (text) => {
      return text.split(/\n/g).map(toPath).filter(Boolean);
    };
  }
});
var check_ignore_exports = {};
__export2(check_ignore_exports, {
  checkIgnoreTask: () => checkIgnoreTask
});
function checkIgnoreTask(paths) {
  return {
    commands: ["check-ignore", ...paths],
    format: "utf-8",
    parser: parseCheckIgnore
  };
}
var init_check_ignore = __esm2({
  "src/lib/tasks/check-ignore.ts"() {
    "use strict";
    init_CheckIgnore();
  }
});
var clone_exports = {};
__export2(clone_exports, {
  cloneMirrorTask: () => cloneMirrorTask,
  cloneTask: () => cloneTask
});
function disallowedCommand(command) {
  return /^--upload-pack(=|$)/.test(command);
}
function cloneTask(repo, directory, customArgs) {
  const commands4 = ["clone", ...customArgs];
  filterString(repo) && commands4.push(repo);
  filterString(directory) && commands4.push(directory);
  const banned = commands4.find(disallowedCommand);
  if (banned) {
    return configurationErrorTask(`git.fetch: potential exploit argument blocked.`);
  }
  return straightThroughStringTask(commands4);
}
function cloneMirrorTask(repo, directory, customArgs) {
  append(customArgs, "--mirror");
  return cloneTask(repo, directory, customArgs);
}
var init_clone = __esm2({
  "src/lib/tasks/clone.ts"() {
    "use strict";
    init_task();
    init_utils();
  }
});
function parseFetchResult(stdOut, stdErr) {
  const result = {
    raw: stdOut,
    remote: null,
    branches: [],
    tags: [],
    updated: [],
    deleted: []
  };
  return parseStringResponse(result, parsers10, [stdOut, stdErr]);
}
var parsers10;
var init_parse_fetch = __esm2({
  "src/lib/parsers/parse-fetch.ts"() {
    "use strict";
    init_utils();
    parsers10 = [
      new LineParser(/From (.+)$/, (result, [remote]) => {
        result.remote = remote;
      }),
      new LineParser(/\* \[new branch]\s+(\S+)\s*-> (.+)$/, (result, [name, tracking]) => {
        result.branches.push({
          name,
          tracking
        });
      }),
      new LineParser(/\* \[new tag]\s+(\S+)\s*-> (.+)$/, (result, [name, tracking]) => {
        result.tags.push({
          name,
          tracking
        });
      }),
      new LineParser(/- \[deleted]\s+\S+\s*-> (.+)$/, (result, [tracking]) => {
        result.deleted.push({
          tracking
        });
      }),
      new LineParser(
        /\s*([^.]+)\.\.(\S+)\s+(\S+)\s*-> (.+)$/,
        (result, [from, to, name, tracking]) => {
          result.updated.push({
            name,
            tracking,
            to,
            from
          });
        }
      )
    ];
  }
});
var fetch_exports = {};
__export2(fetch_exports, {
  fetchTask: () => fetchTask
});
function disallowedCommand2(command) {
  return /^--upload-pack(=|$)/.test(command);
}
function fetchTask(remote, branch, customArgs) {
  const commands4 = ["fetch", ...customArgs];
  if (remote && branch) {
    commands4.push(remote, branch);
  }
  const banned = commands4.find(disallowedCommand2);
  if (banned) {
    return configurationErrorTask(`git.fetch: potential exploit argument blocked.`);
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser: parseFetchResult
  };
}
var init_fetch = __esm2({
  "src/lib/tasks/fetch.ts"() {
    "use strict";
    init_parse_fetch();
    init_task();
  }
});
function parseMoveResult(stdOut) {
  return parseStringResponse({ moves: [] }, parsers11, stdOut);
}
var parsers11;
var init_parse_move = __esm2({
  "src/lib/parsers/parse-move.ts"() {
    "use strict";
    init_utils();
    parsers11 = [
      new LineParser(/^Renaming (.+) to (.+)$/, (result, [from, to]) => {
        result.moves.push({ from, to });
      })
    ];
  }
});
var move_exports = {};
__export2(move_exports, {
  moveTask: () => moveTask
});
function moveTask(from, to) {
  return {
    commands: ["mv", "-v", ...asArray(from), to],
    format: "utf-8",
    parser: parseMoveResult
  };
}
var init_move = __esm2({
  "src/lib/tasks/move.ts"() {
    "use strict";
    init_parse_move();
    init_utils();
  }
});
var pull_exports = {};
__export2(pull_exports, {
  pullTask: () => pullTask
});
function pullTask(remote, branch, customArgs) {
  const commands4 = ["pull", ...customArgs];
  if (remote && branch) {
    commands4.splice(1, 0, remote, branch);
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser(stdOut, stdErr) {
      return parsePullResult(stdOut, stdErr);
    },
    onError(result, _error, _done, fail) {
      const pullError = parsePullErrorResult(
        bufferToString(result.stdOut),
        bufferToString(result.stdErr)
      );
      if (pullError) {
        return fail(new GitResponseError(pullError));
      }
      fail(_error);
    }
  };
}
var init_pull = __esm2({
  "src/lib/tasks/pull.ts"() {
    "use strict";
    init_git_response_error();
    init_parse_pull();
    init_utils();
  }
});
function parseGetRemotes(text) {
  const remotes = {};
  forEach(text, ([name]) => remotes[name] = { name });
  return Object.values(remotes);
}
function parseGetRemotesVerbose(text) {
  const remotes = {};
  forEach(text, ([name, url, purpose]) => {
    if (!Object.hasOwn(remotes, name)) {
      remotes[name] = {
        name,
        refs: { fetch: "", push: "" }
      };
    }
    if (purpose && url) {
      remotes[name].refs[purpose.replace(/[^a-z]/g, "")] = url;
    }
  });
  return Object.values(remotes);
}
function forEach(text, handler) {
  forEachLineWithContent(text, (line) => handler(line.split(/\s+/)));
}
var init_GetRemoteSummary = __esm2({
  "src/lib/responses/GetRemoteSummary.ts"() {
    "use strict";
    init_utils();
  }
});
var remote_exports = {};
__export2(remote_exports, {
  addRemoteTask: () => addRemoteTask,
  getRemotesTask: () => getRemotesTask,
  listRemotesTask: () => listRemotesTask,
  remoteTask: () => remoteTask,
  removeRemoteTask: () => removeRemoteTask
});
function addRemoteTask(remoteName, remoteRepo, customArgs) {
  return straightThroughStringTask(["remote", "add", ...customArgs, remoteName, remoteRepo]);
}
function getRemotesTask(verbose) {
  const commands4 = ["remote"];
  if (verbose) {
    commands4.push("-v");
  }
  return {
    commands: commands4,
    format: "utf-8",
    parser: verbose ? parseGetRemotesVerbose : parseGetRemotes
  };
}
function listRemotesTask(customArgs) {
  const commands4 = [...customArgs];
  if (commands4[0] !== "ls-remote") {
    commands4.unshift("ls-remote");
  }
  return straightThroughStringTask(commands4);
}
function remoteTask(customArgs) {
  const commands4 = [...customArgs];
  if (commands4[0] !== "remote") {
    commands4.unshift("remote");
  }
  return straightThroughStringTask(commands4);
}
function removeRemoteTask(remoteName) {
  return straightThroughStringTask(["remote", "remove", remoteName]);
}
var init_remote = __esm2({
  "src/lib/tasks/remote.ts"() {
    "use strict";
    init_GetRemoteSummary();
    init_task();
  }
});
var stash_list_exports = {};
__export2(stash_list_exports, {
  stashListTask: () => stashListTask
});
function stashListTask(opt = {}, customArgs) {
  const options = parseLogOptions(opt);
  const commands4 = ["stash", "list", ...options.commands, ...customArgs];
  const parser4 = createListLogSummaryParser(
    options.splitter,
    options.fields,
    logFormatFromCommand(commands4)
  );
  return validateLogFormatConfig(commands4) || {
    commands: commands4,
    format: "utf-8",
    parser: parser4
  };
}
var init_stash_list = __esm2({
  "src/lib/tasks/stash-list.ts"() {
    "use strict";
    init_log_format();
    init_parse_list_log_summary();
    init_diff();
    init_log();
  }
});
var sub_module_exports = {};
__export2(sub_module_exports, {
  addSubModuleTask: () => addSubModuleTask,
  initSubModuleTask: () => initSubModuleTask,
  subModuleTask: () => subModuleTask,
  updateSubModuleTask: () => updateSubModuleTask
});
function addSubModuleTask(repo, path7) {
  return subModuleTask(["add", repo, path7]);
}
function initSubModuleTask(customArgs) {
  return subModuleTask(["init", ...customArgs]);
}
function subModuleTask(customArgs) {
  const commands4 = [...customArgs];
  if (commands4[0] !== "submodule") {
    commands4.unshift("submodule");
  }
  return straightThroughStringTask(commands4);
}
function updateSubModuleTask(customArgs) {
  return subModuleTask(["update", ...customArgs]);
}
var init_sub_module = __esm2({
  "src/lib/tasks/sub-module.ts"() {
    "use strict";
    init_task();
  }
});
function singleSorted(a, b) {
  const aIsNum = Number.isNaN(a);
  const bIsNum = Number.isNaN(b);
  if (aIsNum !== bIsNum) {
    return aIsNum ? 1 : -1;
  }
  return aIsNum ? sorted(a, b) : 0;
}
function sorted(a, b) {
  return a === b ? 0 : a > b ? 1 : -1;
}
function trimmed(input) {
  return input.trim();
}
function toNumber(input) {
  if (typeof input === "string") {
    return parseInt(input.replace(/^\D+/g, ""), 10) || 0;
  }
  return 0;
}
var TagList;
var parseTagList;
var init_TagList = __esm2({
  "src/lib/responses/TagList.ts"() {
    "use strict";
    TagList = class {
      constructor(all, latest) {
        this.all = all;
        this.latest = latest;
      }
    };
    parseTagList = function(data, customSort = false) {
      const tags = data.split("\n").map(trimmed).filter(Boolean);
      if (!customSort) {
        tags.sort(function(tagA, tagB) {
          const partsA = tagA.split(".");
          const partsB = tagB.split(".");
          if (partsA.length === 1 || partsB.length === 1) {
            return singleSorted(toNumber(partsA[0]), toNumber(partsB[0]));
          }
          for (let i = 0, l = Math.max(partsA.length, partsB.length); i < l; i++) {
            const diff = sorted(toNumber(partsA[i]), toNumber(partsB[i]));
            if (diff) {
              return diff;
            }
          }
          return 0;
        });
      }
      const latest = customSort ? tags[0] : [...tags].reverse().find((tag) => tag.indexOf(".") >= 0);
      return new TagList(tags, latest);
    };
  }
});
var tag_exports = {};
__export2(tag_exports, {
  addAnnotatedTagTask: () => addAnnotatedTagTask,
  addTagTask: () => addTagTask,
  tagListTask: () => tagListTask
});
function tagListTask(customArgs = []) {
  const hasCustomSort = customArgs.some((option) => /^--sort=/.test(option));
  return {
    format: "utf-8",
    commands: ["tag", "-l", ...customArgs],
    parser(text) {
      return parseTagList(text, hasCustomSort);
    }
  };
}
function addTagTask(name) {
  return {
    format: "utf-8",
    commands: ["tag", name],
    parser() {
      return { name };
    }
  };
}
function addAnnotatedTagTask(name, tagMessage) {
  return {
    format: "utf-8",
    commands: ["tag", "-a", "-m", tagMessage, name],
    parser() {
      return { name };
    }
  };
}
var init_tag = __esm2({
  "src/lib/tasks/tag.ts"() {
    "use strict";
    init_TagList();
  }
});
var require_git = __commonJS2({
  "src/git.js"(exports2, module2) {
    "use strict";
    var { GitExecutor: GitExecutor2 } = (init_git_executor(), __toCommonJS2(git_executor_exports));
    var { SimpleGitApi: SimpleGitApi2 } = (init_simple_git_api(), __toCommonJS2(simple_git_api_exports));
    var { Scheduler: Scheduler2 } = (init_scheduler(), __toCommonJS2(scheduler_exports));
    var { configurationErrorTask: configurationErrorTask2 } = (init_task(), __toCommonJS2(task_exports));
    var {
      asArray: asArray2,
      filterArray: filterArray2,
      filterPrimitives: filterPrimitives2,
      filterString: filterString2,
      filterStringOrStringArray: filterStringOrStringArray2,
      filterType: filterType2,
      getTrailingOptions: getTrailingOptions2,
      trailingFunctionArgument: trailingFunctionArgument2,
      trailingOptionsArgument: trailingOptionsArgument2
    } = (init_utils(), __toCommonJS2(utils_exports));
    var { applyPatchTask: applyPatchTask2 } = (init_apply_patch(), __toCommonJS2(apply_patch_exports));
    var {
      branchTask: branchTask2,
      branchLocalTask: branchLocalTask2,
      deleteBranchesTask: deleteBranchesTask2,
      deleteBranchTask: deleteBranchTask2
    } = (init_branch(), __toCommonJS2(branch_exports));
    var { checkIgnoreTask: checkIgnoreTask2 } = (init_check_ignore(), __toCommonJS2(check_ignore_exports));
    var { checkIsRepoTask: checkIsRepoTask2 } = (init_check_is_repo(), __toCommonJS2(check_is_repo_exports));
    var { cloneTask: cloneTask2, cloneMirrorTask: cloneMirrorTask2 } = (init_clone(), __toCommonJS2(clone_exports));
    var { cleanWithOptionsTask: cleanWithOptionsTask2, isCleanOptionsArray: isCleanOptionsArray2 } = (init_clean(), __toCommonJS2(clean_exports));
    var { diffSummaryTask: diffSummaryTask2 } = (init_diff(), __toCommonJS2(diff_exports));
    var { fetchTask: fetchTask2 } = (init_fetch(), __toCommonJS2(fetch_exports));
    var { moveTask: moveTask2 } = (init_move(), __toCommonJS2(move_exports));
    var { pullTask: pullTask2 } = (init_pull(), __toCommonJS2(pull_exports));
    var { pushTagsTask: pushTagsTask2 } = (init_push(), __toCommonJS2(push_exports));
    var {
      addRemoteTask: addRemoteTask2,
      getRemotesTask: getRemotesTask2,
      listRemotesTask: listRemotesTask2,
      remoteTask: remoteTask2,
      removeRemoteTask: removeRemoteTask2
    } = (init_remote(), __toCommonJS2(remote_exports));
    var { getResetMode: getResetMode2, resetTask: resetTask2 } = (init_reset(), __toCommonJS2(reset_exports));
    var { stashListTask: stashListTask2 } = (init_stash_list(), __toCommonJS2(stash_list_exports));
    var {
      addSubModuleTask: addSubModuleTask2,
      initSubModuleTask: initSubModuleTask2,
      subModuleTask: subModuleTask2,
      updateSubModuleTask: updateSubModuleTask2
    } = (init_sub_module(), __toCommonJS2(sub_module_exports));
    var { addAnnotatedTagTask: addAnnotatedTagTask2, addTagTask: addTagTask2, tagListTask: tagListTask2 } = (init_tag(), __toCommonJS2(tag_exports));
    var { straightThroughBufferTask: straightThroughBufferTask2, straightThroughStringTask: straightThroughStringTask2 } = (init_task(), __toCommonJS2(task_exports));
    function Git2(options, plugins) {
      this._plugins = plugins;
      this._executor = new GitExecutor2(
        options.baseDir,
        new Scheduler2(options.maxConcurrentProcesses),
        plugins
      );
      this._trimmed = options.trimmed;
    }
    (Git2.prototype = Object.create(SimpleGitApi2.prototype)).constructor = Git2;
    Git2.prototype.customBinary = function(command) {
      this._plugins.reconfigure("binary", command);
      return this;
    };
    Git2.prototype.env = function(name, value) {
      if (arguments.length === 1 && typeof name === "object") {
        this._executor.env = name;
      } else {
        (this._executor.env = this._executor.env || {})[name] = value;
      }
      return this;
    };
    Git2.prototype.stashList = function(options) {
      return this._runTask(
        stashListTask2(
          trailingOptionsArgument2(arguments) || {},
          filterArray2(options) && options || []
        ),
        trailingFunctionArgument2(arguments)
      );
    };
    function createCloneTask(api, task, repoPath, localPath) {
      if (typeof repoPath !== "string") {
        return configurationErrorTask2(`git.${api}() requires a string 'repoPath'`);
      }
      return task(repoPath, filterType2(localPath, filterString2), getTrailingOptions2(arguments));
    }
    Git2.prototype.clone = function() {
      return this._runTask(
        createCloneTask("clone", cloneTask2, ...arguments),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.mirror = function() {
      return this._runTask(
        createCloneTask("mirror", cloneMirrorTask2, ...arguments),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.mv = function(from, to) {
      return this._runTask(moveTask2(from, to), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.checkoutLatestTag = function(then) {
      var git = this;
      return this.pull(function() {
        git.tags(function(err, tags) {
          git.checkout(tags.latest, then);
        });
      });
    };
    Git2.prototype.pull = function(remote, branch, options, then) {
      return this._runTask(
        pullTask2(
          filterType2(remote, filterString2),
          filterType2(branch, filterString2),
          getTrailingOptions2(arguments)
        ),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.fetch = function(remote, branch) {
      return this._runTask(
        fetchTask2(
          filterType2(remote, filterString2),
          filterType2(branch, filterString2),
          getTrailingOptions2(arguments)
        ),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.silent = function(silence) {
      console.warn(
        "simple-git deprecation notice: git.silent: logging should be configured using the `debug` library / `DEBUG` environment variable, this will be an error in version 3"
      );
      return this;
    };
    Git2.prototype.tags = function(options, then) {
      return this._runTask(
        tagListTask2(getTrailingOptions2(arguments)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.rebase = function() {
      return this._runTask(
        straightThroughStringTask2(["rebase", ...getTrailingOptions2(arguments)]),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.reset = function(mode) {
      return this._runTask(
        resetTask2(getResetMode2(mode), getTrailingOptions2(arguments)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.revert = function(commit) {
      const next = trailingFunctionArgument2(arguments);
      if (typeof commit !== "string") {
        return this._runTask(configurationErrorTask2("Commit must be a string"), next);
      }
      return this._runTask(
        straightThroughStringTask2(["revert", ...getTrailingOptions2(arguments, 0, true), commit]),
        next
      );
    };
    Git2.prototype.addTag = function(name) {
      const task = typeof name === "string" ? addTagTask2(name) : configurationErrorTask2("Git.addTag requires a tag name");
      return this._runTask(task, trailingFunctionArgument2(arguments));
    };
    Git2.prototype.addAnnotatedTag = function(tagName, tagMessage) {
      return this._runTask(
        addAnnotatedTagTask2(tagName, tagMessage),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.deleteLocalBranch = function(branchName, forceDelete, then) {
      return this._runTask(
        deleteBranchTask2(branchName, typeof forceDelete === "boolean" ? forceDelete : false),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.deleteLocalBranches = function(branchNames, forceDelete, then) {
      return this._runTask(
        deleteBranchesTask2(branchNames, typeof forceDelete === "boolean" ? forceDelete : false),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.branch = function(options, then) {
      return this._runTask(
        branchTask2(getTrailingOptions2(arguments)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.branchLocal = function(then) {
      return this._runTask(branchLocalTask2(), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.raw = function(commands4) {
      const createRestCommands = !Array.isArray(commands4);
      const command = [].slice.call(createRestCommands ? arguments : commands4, 0);
      for (let i = 0; i < command.length && createRestCommands; i++) {
        if (!filterPrimitives2(command[i])) {
          command.splice(i, command.length - i);
          break;
        }
      }
      command.push(...getTrailingOptions2(arguments, 0, true));
      var next = trailingFunctionArgument2(arguments);
      if (!command.length) {
        return this._runTask(
          configurationErrorTask2("Raw: must supply one or more command to execute"),
          next
        );
      }
      return this._runTask(straightThroughStringTask2(command, this._trimmed), next);
    };
    Git2.prototype.submoduleAdd = function(repo, path7, then) {
      return this._runTask(addSubModuleTask2(repo, path7), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.submoduleUpdate = function(args, then) {
      return this._runTask(
        updateSubModuleTask2(getTrailingOptions2(arguments, true)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.submoduleInit = function(args, then) {
      return this._runTask(
        initSubModuleTask2(getTrailingOptions2(arguments, true)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.subModule = function(options, then) {
      return this._runTask(
        subModuleTask2(getTrailingOptions2(arguments)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.listRemote = function() {
      return this._runTask(
        listRemotesTask2(getTrailingOptions2(arguments)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.addRemote = function(remoteName, remoteRepo, then) {
      return this._runTask(
        addRemoteTask2(remoteName, remoteRepo, getTrailingOptions2(arguments)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.removeRemote = function(remoteName, then) {
      return this._runTask(removeRemoteTask2(remoteName), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.getRemotes = function(verbose, then) {
      return this._runTask(getRemotesTask2(verbose === true), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.remote = function(options, then) {
      return this._runTask(
        remoteTask2(getTrailingOptions2(arguments)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.tag = function(options, then) {
      const command = getTrailingOptions2(arguments);
      if (command[0] !== "tag") {
        command.unshift("tag");
      }
      return this._runTask(straightThroughStringTask2(command), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.updateServerInfo = function(then) {
      return this._runTask(
        straightThroughStringTask2(["update-server-info"]),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.pushTags = function(remote, then) {
      const task = pushTagsTask2(
        { remote: filterType2(remote, filterString2) },
        getTrailingOptions2(arguments)
      );
      return this._runTask(task, trailingFunctionArgument2(arguments));
    };
    Git2.prototype.rm = function(files) {
      return this._runTask(
        straightThroughStringTask2(["rm", "-f", ...asArray2(files)]),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.rmKeepLocal = function(files) {
      return this._runTask(
        straightThroughStringTask2(["rm", "--cached", ...asArray2(files)]),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.catFile = function(options, then) {
      return this._catFile("utf-8", arguments);
    };
    Git2.prototype.binaryCatFile = function() {
      return this._catFile("buffer", arguments);
    };
    Git2.prototype._catFile = function(format, args) {
      var handler = trailingFunctionArgument2(args);
      var command = ["cat-file"];
      var options = args[0];
      if (typeof options === "string") {
        return this._runTask(
          configurationErrorTask2("Git.catFile: options must be supplied as an array of strings"),
          handler
        );
      }
      if (Array.isArray(options)) {
        command.push.apply(command, options);
      }
      const task = format === "buffer" ? straightThroughBufferTask2(command) : straightThroughStringTask2(command);
      return this._runTask(task, handler);
    };
    Git2.prototype.diff = function(options, then) {
      const task = filterString2(options) ? configurationErrorTask2(
        "git.diff: supplying options as a single string is no longer supported, switch to an array of strings"
      ) : straightThroughStringTask2(["diff", ...getTrailingOptions2(arguments)]);
      return this._runTask(task, trailingFunctionArgument2(arguments));
    };
    Git2.prototype.diffSummary = function() {
      return this._runTask(
        diffSummaryTask2(getTrailingOptions2(arguments, 1)),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.applyPatch = function(patches) {
      const task = !filterStringOrStringArray2(patches) ? configurationErrorTask2(
        `git.applyPatch requires one or more string patches as the first argument`
      ) : applyPatchTask2(asArray2(patches), getTrailingOptions2([].slice.call(arguments, 1)));
      return this._runTask(task, trailingFunctionArgument2(arguments));
    };
    Git2.prototype.revparse = function() {
      const commands4 = ["rev-parse", ...getTrailingOptions2(arguments, true)];
      return this._runTask(
        straightThroughStringTask2(commands4, true),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.clean = function(mode, options, then) {
      const usingCleanOptionsArray = isCleanOptionsArray2(mode);
      const cleanMode = usingCleanOptionsArray && mode.join("") || filterType2(mode, filterString2) || "";
      const customArgs = getTrailingOptions2([].slice.call(arguments, usingCleanOptionsArray ? 1 : 0));
      return this._runTask(
        cleanWithOptionsTask2(cleanMode, customArgs),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.exec = function(then) {
      const task = {
        commands: [],
        format: "utf-8",
        parser() {
          if (typeof then === "function") {
            then();
          }
        }
      };
      return this._runTask(task);
    };
    Git2.prototype.clearQueue = function() {
      return this;
    };
    Git2.prototype.checkIgnore = function(pathnames, then) {
      return this._runTask(
        checkIgnoreTask2(asArray2(filterType2(pathnames, filterStringOrStringArray2, []))),
        trailingFunctionArgument2(arguments)
      );
    };
    Git2.prototype.checkIsRepo = function(checkType, then) {
      return this._runTask(
        checkIsRepoTask2(filterType2(checkType, filterString2)),
        trailingFunctionArgument2(arguments)
      );
    };
    module2.exports = Git2;
  }
});
init_pathspec();
init_git_error();
var GitConstructError = class extends GitError {
  constructor(config, message) {
    super(void 0, message);
    this.config = config;
  }
};
init_git_error();
init_git_error();
var GitPluginError = class extends GitError {
  constructor(task, plugin, message) {
    super(task, message);
    this.task = task;
    this.plugin = plugin;
    Object.setPrototypeOf(this, new.target.prototype);
  }
};
init_git_response_error();
init_task_configuration_error();
init_check_is_repo();
init_clean();
init_config();
init_diff_name_status();
init_grep();
init_reset();
function abortPlugin(signal) {
  if (!signal) {
    return;
  }
  const onSpawnAfter = {
    type: "spawn.after",
    action(_data, context) {
      function kill() {
        context.kill(new GitPluginError(void 0, "abort", "Abort signal received"));
      }
      signal.addEventListener("abort", kill);
      context.spawned.on("close", () => signal.removeEventListener("abort", kill));
    }
  };
  const onSpawnBefore = {
    type: "spawn.before",
    action(_data, context) {
      if (signal.aborted) {
        context.kill(new GitPluginError(void 0, "abort", "Abort already signaled"));
      }
    }
  };
  return [onSpawnBefore, onSpawnAfter];
}
function isConfigSwitch(arg) {
  return typeof arg === "string" && arg.trim().toLowerCase() === "-c";
}
function preventProtocolOverride(arg, next) {
  if (!isConfigSwitch(arg)) {
    return;
  }
  if (!/^\s*protocol(.[a-z]+)?.allow/.test(next)) {
    return;
  }
  throw new GitPluginError(
    void 0,
    "unsafe",
    "Configuring protocol.allow is not permitted without enabling allowUnsafeExtProtocol"
  );
}
function preventUploadPack(arg, method) {
  if (/^\s*--(upload|receive)-pack/.test(arg)) {
    throw new GitPluginError(
      void 0,
      "unsafe",
      `Use of --upload-pack or --receive-pack is not permitted without enabling allowUnsafePack`
    );
  }
  if (method === "clone" && /^\s*-u\b/.test(arg)) {
    throw new GitPluginError(
      void 0,
      "unsafe",
      `Use of clone with option -u is not permitted without enabling allowUnsafePack`
    );
  }
  if (method === "push" && /^\s*--exec\b/.test(arg)) {
    throw new GitPluginError(
      void 0,
      "unsafe",
      `Use of push with option --exec is not permitted without enabling allowUnsafePack`
    );
  }
}
function blockUnsafeOperationsPlugin({
  allowUnsafeProtocolOverride = false,
  allowUnsafePack = false
} = {}) {
  return {
    type: "spawn.args",
    action(args, context) {
      args.forEach((current, index) => {
        const next = index < args.length ? args[index + 1] : "";
        allowUnsafeProtocolOverride || preventProtocolOverride(current, next);
        allowUnsafePack || preventUploadPack(current, context.method);
      });
      return args;
    }
  };
}
init_utils();
function commandConfigPrefixingPlugin(configuration) {
  const prefix = prefixedArray(configuration, "-c");
  return {
    type: "spawn.args",
    action(data) {
      return [...prefix, ...data];
    }
  };
}
init_utils();
var never = (0, import_promise_deferred2.deferred)().promise;
function completionDetectionPlugin({
  onClose = true,
  onExit = 50
} = {}) {
  function createEvents() {
    let exitCode = -1;
    const events = {
      close: (0, import_promise_deferred2.deferred)(),
      closeTimeout: (0, import_promise_deferred2.deferred)(),
      exit: (0, import_promise_deferred2.deferred)(),
      exitTimeout: (0, import_promise_deferred2.deferred)()
    };
    const result = Promise.race([
      onClose === false ? never : events.closeTimeout.promise,
      onExit === false ? never : events.exitTimeout.promise
    ]);
    configureTimeout(onClose, events.close, events.closeTimeout);
    configureTimeout(onExit, events.exit, events.exitTimeout);
    return {
      close(code) {
        exitCode = code;
        events.close.done();
      },
      exit(code) {
        exitCode = code;
        events.exit.done();
      },
      get exitCode() {
        return exitCode;
      },
      result
    };
  }
  function configureTimeout(flag, event, timeout) {
    if (flag === false) {
      return;
    }
    (flag === true ? event.promise : event.promise.then(() => delay(flag))).then(timeout.done);
  }
  return {
    type: "spawn.after",
    async action(_data, { spawned, close }) {
      const events = createEvents();
      let deferClose = true;
      let quickClose = () => void (deferClose = false);
      spawned.stdout?.on("data", quickClose);
      spawned.stderr?.on("data", quickClose);
      spawned.on("error", quickClose);
      spawned.on("close", (code) => events.close(code));
      spawned.on("exit", (code) => events.exit(code));
      try {
        await events.result;
        if (deferClose) {
          await delay(50);
        }
        close(events.exitCode);
      } catch (err) {
        close(events.exitCode, err);
      }
    }
  };
}
init_utils();
var WRONG_NUMBER_ERR = `Invalid value supplied for custom binary, requires a single string or an array containing either one or two strings`;
var WRONG_CHARS_ERR = `Invalid value supplied for custom binary, restricted characters must be removed or supply the unsafe.allowUnsafeCustomBinary option`;
function isBadArgument(arg) {
  return !arg || !/^([a-z]:)?([a-z0-9/.\\_-]+)$/i.test(arg);
}
function toBinaryConfig(input, allowUnsafe) {
  if (input.length < 1 || input.length > 2) {
    throw new GitPluginError(void 0, "binary", WRONG_NUMBER_ERR);
  }
  const isBad = input.some(isBadArgument);
  if (isBad) {
    if (allowUnsafe) {
      console.warn(WRONG_CHARS_ERR);
    } else {
      throw new GitPluginError(void 0, "binary", WRONG_CHARS_ERR);
    }
  }
  const [binary, prefix] = input;
  return {
    binary,
    prefix
  };
}
function customBinaryPlugin(plugins, input = ["git"], allowUnsafe = false) {
  let config = toBinaryConfig(asArray(input), allowUnsafe);
  plugins.on("binary", (input2) => {
    config = toBinaryConfig(asArray(input2), allowUnsafe);
  });
  plugins.append("spawn.binary", () => {
    return config.binary;
  });
  plugins.append("spawn.args", (data) => {
    return config.prefix ? [config.prefix, ...data] : data;
  });
}
init_git_error();
function isTaskError(result) {
  return !!(result.exitCode && result.stdErr.length);
}
function getErrorMessage(result) {
  return Buffer.concat([...result.stdOut, ...result.stdErr]);
}
function errorDetectionHandler(overwrite = false, isError = isTaskError, errorMessage = getErrorMessage) {
  return (error, result) => {
    if (!overwrite && error || !isError(result)) {
      return error;
    }
    return errorMessage(result);
  };
}
function errorDetectionPlugin(config) {
  return {
    type: "task.error",
    action(data, context) {
      const error = config(data.error, {
        stdErr: context.stdErr,
        stdOut: context.stdOut,
        exitCode: context.exitCode
      });
      if (Buffer.isBuffer(error)) {
        return { error: new GitError(void 0, error.toString("utf-8")) };
      }
      return {
        error
      };
    }
  };
}
init_utils();
var PluginStore = class {
  constructor() {
    this.plugins = /* @__PURE__ */ new Set();
    this.events = new import_node_events.EventEmitter();
  }
  on(type, listener) {
    this.events.on(type, listener);
  }
  reconfigure(type, data) {
    this.events.emit(type, data);
  }
  append(type, action) {
    const plugin = append(this.plugins, { type, action });
    return () => this.plugins.delete(plugin);
  }
  add(plugin) {
    const plugins = [];
    asArray(plugin).forEach((plugin2) => plugin2 && this.plugins.add(append(plugins, plugin2)));
    return () => {
      plugins.forEach((plugin2) => this.plugins.delete(plugin2));
    };
  }
  exec(type, data, context) {
    let output = data;
    const contextual = Object.freeze(Object.create(context));
    for (const plugin of this.plugins) {
      if (plugin.type === type) {
        output = plugin.action(output, contextual);
      }
    }
    return output;
  }
};
init_utils();
function progressMonitorPlugin(progress) {
  const progressCommand = "--progress";
  const progressMethods = ["checkout", "clone", "fetch", "pull", "push"];
  const onProgress = {
    type: "spawn.after",
    action(_data, context) {
      if (!context.commands.includes(progressCommand)) {
        return;
      }
      context.spawned.stderr?.on("data", (chunk) => {
        const message = /^([\s\S]+?):\s*(\d+)% \((\d+)\/(\d+)\)/.exec(chunk.toString("utf8"));
        if (!message) {
          return;
        }
        progress({
          method: context.method,
          stage: progressEventStage(message[1]),
          progress: asNumber(message[2]),
          processed: asNumber(message[3]),
          total: asNumber(message[4])
        });
      });
    }
  };
  const onArgs = {
    type: "spawn.args",
    action(args, context) {
      if (!progressMethods.includes(context.method)) {
        return args;
      }
      return including(args, progressCommand);
    }
  };
  return [onArgs, onProgress];
}
function progressEventStage(input) {
  return String(input.toLowerCase().split(" ", 1)) || "unknown";
}
init_utils();
function spawnOptionsPlugin(spawnOptions) {
  const options = pick(spawnOptions, ["uid", "gid"]);
  return {
    type: "spawn.options",
    action(data) {
      return { ...options, ...data };
    }
  };
}
function timeoutPlugin({
  block,
  stdErr = true,
  stdOut = true
}) {
  if (block > 0) {
    return {
      type: "spawn.after",
      action(_data, context) {
        let timeout;
        function wait() {
          timeout && clearTimeout(timeout);
          timeout = setTimeout(kill, block);
        }
        function stop() {
          context.spawned.stdout?.off("data", wait);
          context.spawned.stderr?.off("data", wait);
          context.spawned.off("exit", stop);
          context.spawned.off("close", stop);
          timeout && clearTimeout(timeout);
        }
        function kill() {
          stop();
          context.kill(new GitPluginError(void 0, "timeout", `block timeout reached`));
        }
        stdOut && context.spawned.stdout?.on("data", wait);
        stdErr && context.spawned.stderr?.on("data", wait);
        context.spawned.on("exit", stop);
        context.spawned.on("close", stop);
        wait();
      }
    };
  }
}
init_pathspec();
function suffixPathsPlugin() {
  return {
    type: "spawn.args",
    action(data) {
      const prefix = [];
      let suffix;
      function append2(args) {
        (suffix = suffix || []).push(...args);
      }
      for (let i = 0; i < data.length; i++) {
        const param = data[i];
        if (isPathSpec(param)) {
          append2(toPaths(param));
          continue;
        }
        if (param === "--") {
          append2(
            data.slice(i + 1).flatMap((item) => isPathSpec(item) && toPaths(item) || item)
          );
          break;
        }
        prefix.push(param);
      }
      return !suffix ? prefix : [...prefix, "--", ...suffix.map(String)];
    }
  };
}
init_utils();
var Git = require_git();
function gitInstanceFactory(baseDir, options) {
  const plugins = new PluginStore();
  const config = createInstanceConfig(
    baseDir && (typeof baseDir === "string" ? { baseDir } : baseDir) || {},
    options
  );
  if (!folderExists(config.baseDir)) {
    throw new GitConstructError(
      config,
      `Cannot use simple-git on a directory that does not exist`
    );
  }
  if (Array.isArray(config.config)) {
    plugins.add(commandConfigPrefixingPlugin(config.config));
  }
  plugins.add(blockUnsafeOperationsPlugin(config.unsafe));
  plugins.add(suffixPathsPlugin());
  plugins.add(completionDetectionPlugin(config.completion));
  config.abort && plugins.add(abortPlugin(config.abort));
  config.progress && plugins.add(progressMonitorPlugin(config.progress));
  config.timeout && plugins.add(timeoutPlugin(config.timeout));
  config.spawnOptions && plugins.add(spawnOptionsPlugin(config.spawnOptions));
  plugins.add(errorDetectionPlugin(errorDetectionHandler(true)));
  config.errors && plugins.add(errorDetectionPlugin(config.errors));
  customBinaryPlugin(plugins, config.binary, config.unsafe?.allowUnsafeCustomBinary);
  return new Git(config, plugins);
}
init_git_response_error();
var esm_default = gitInstanceFactory;

// src/services/checkpointService.ts
var CheckpointService = class {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.basePath = path3.join(workspaceRoot, ".hive");
    this.git = esm_default(workspaceRoot);
  }
  /**
   * Get full execution state for a step including revert capability
   */
  getExecutionState(feature, stepFolder) {
    const stepPath = path3.join(this.basePath, "features", feature, "execution", stepFolder);
    const statusPath = path3.join(stepPath, "status.json");
    const diffPath = path3.join(stepPath, "output.diff");
    const status = this.readJson(statusPath);
    if (!status) return null;
    const diffExists = fs3.existsSync(diffPath);
    const canRevert = status.status === "done" && status.execution?.canRevert === true && diffExists;
    return {
      step: {
        name: status.name,
        order: status.order,
        status: status.status,
        folderPath: stepFolder,
        specFiles: this.getSpecFiles(stepPath),
        sessionId: status.sessionId,
        summary: status.summary
      },
      status,
      canRevert,
      diffPath: diffExists ? diffPath : null,
      diffExists
    };
  }
  /**
   * Check if a step can be reverted
   */
  canRevert(feature, stepFolder) {
    const state = this.getExecutionState(feature, stepFolder);
    return state?.canRevert ?? false;
  }
  /**
   * Check for conflicts before reverting (async)
   */
  async checkConflicts(feature, stepFolder) {
    const state = this.getExecutionState(feature, stepFolder);
    if (!state?.diffPath) {
      return { hasConflicts: true, conflictDetails: "No diff file found" };
    }
    const diffContent = this.readFile(state.diffPath);
    if (!diffContent) {
      return { hasConflicts: true, conflictDetails: "Could not read diff file" };
    }
    try {
      await this.git.applyPatch(diffContent, ["--check", "-R"]);
      return { hasConflicts: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown conflict";
      return { hasConflicts: true, conflictDetails: message };
    }
  }
  /**
   * Revert a single step using its saved diff (async)
   */
  async revertStep(feature, stepFolder) {
    const state = this.getExecutionState(feature, stepFolder);
    if (!state) {
      return { success: false, error: "Step not found" };
    }
    if (!state.canRevert) {
      return { success: false, error: "Step cannot be reverted" };
    }
    if (!state.diffPath) {
      return { success: false, error: "No diff file found" };
    }
    const conflictCheck = await this.checkConflicts(feature, stepFolder);
    if (conflictCheck.hasConflicts) {
      return { success: false, error: `Conflicts detected: ${conflictCheck.conflictDetails}` };
    }
    const diffContent = this.readFile(state.diffPath);
    if (!diffContent) {
      return { success: false, error: "Could not read diff file" };
    }
    try {
      await this.git.applyPatch(diffContent, ["-R"]);
      const filesAffected = this.parseFilesFromDiff(state.diffPath);
      this.updateStepAfterRevert(feature, stepFolder);
      return { success: true, filesAffected };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  }
  /**
   * Revert all steps in a batch (same order number) - async
   */
  async revertBatch(feature, batchOrder) {
    const steps = this.getStepsInBatch(feature, batchOrder);
    const results = [];
    for (const step of steps) {
      const result = await this.revertStep(feature, step.folderPath);
      results.push(result);
    }
    return results;
  }
  /**
   * Get the diff content for a step
   */
  getDiff(feature, stepFolder) {
    const diffPath = path3.join(
      this.basePath,
      "features",
      feature,
      "execution",
      stepFolder,
      "output.diff"
    );
    return this.readFile(diffPath);
  }
  /**
   * Get changed files from a step's diff
   */
  getChangedFiles(feature, stepFolder) {
    const diffContent = this.getDiff(feature, stepFolder);
    if (!diffContent) return [];
    const files = [];
    const lines = diffContent.split("\n");
    for (const line of lines) {
      if (line.startsWith("diff --git")) {
        const match = line.match(/diff --git a\/(.+) b\/(.+)/);
        if (match) {
          files.push({ path: match[2], status: "modified" });
        }
      } else if (line.startsWith("new file mode")) {
        if (files.length > 0) {
          files[files.length - 1].status = "added";
        }
      } else if (line.startsWith("deleted file mode")) {
        if (files.length > 0) {
          files[files.length - 1].status = "deleted";
        }
      }
    }
    return files;
  }
  /**
   * Get steps that belong to a specific batch
   */
  getStepsInBatch(feature, batchOrder) {
    const execPath = path3.join(this.basePath, "features", feature, "execution");
    if (!fs3.existsSync(execPath)) return [];
    const steps = [];
    const folders = fs3.readdirSync(execPath).filter(
      (f) => fs3.statSync(path3.join(execPath, f)).isDirectory()
    );
    for (const folder of folders) {
      const state = this.getExecutionState(feature, folder);
      if (state && state.status.order === batchOrder && state.canRevert) {
        steps.push(state.step);
      }
    }
    return steps.sort((a, b) => a.name.localeCompare(b.name));
  }
  /**
   * Get all revertible steps for a feature
   */
  getRevertibleSteps(feature) {
    const execPath = path3.join(this.basePath, "features", feature, "execution");
    if (!fs3.existsSync(execPath)) return [];
    const steps = [];
    const folders = fs3.readdirSync(execPath).filter(
      (f) => fs3.statSync(path3.join(execPath, f)).isDirectory()
    );
    for (const folder of folders) {
      const state = this.getExecutionState(feature, folder);
      if (state?.canRevert) {
        steps.push(state.step);
      }
    }
    return steps.sort((a, b) => a.order - b.order);
  }
  parseFilesFromDiff(diffPath) {
    const content = this.readFile(diffPath);
    if (!content) return [];
    const files = [];
    const lines = content.split("\n");
    for (const line of lines) {
      if (line.startsWith("diff --git")) {
        const match = line.match(/diff --git a\/(.+) b\/(.+)/);
        if (match) {
          files.push(match[2]);
        }
      }
    }
    return [...new Set(files)];
  }
  updateStepAfterRevert(feature, stepFolder) {
    const statusPath = path3.join(
      this.basePath,
      "features",
      feature,
      "execution",
      stepFolder,
      "status.json"
    );
    const status = this.readJson(statusPath);
    if (!status) return;
    status.status = "pending";
    if (status.execution) {
      status.execution.canRevert = false;
    }
    try {
      fs3.writeFileSync(statusPath, JSON.stringify(status, null, 2));
    } catch {
    }
  }
  getSpecFiles(stepPath) {
    try {
      return fs3.readdirSync(stepPath).filter((f) => f.endsWith(".md"));
    } catch {
      return [];
    }
  }
  readFile(filePath) {
    try {
      return fs3.readFileSync(filePath, "utf-8");
    } catch {
      return null;
    }
  }
  readJson(filePath) {
    const content = this.readFile(filePath);
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
};

// src/providers/sidebarProvider.ts
var vscode3 = __toESM(require("vscode"));
var fs4 = __toESM(require("fs"));
var path4 = __toESM(require("path"));
function classifyFeatureStatus(feature) {
  if (feature.status === "completed" || feature.status === "archived") return "completed";
  if (feature.stepsCount === 0) return "pending";
  if (feature.doneCount === 0) return "pending";
  if (feature.doneCount === feature.stepsCount) return "completed";
  return "in_progress";
}
var FeatureStatusGroupItem = class extends vscode3.TreeItem {
  constructor(status, features) {
    const labels = { completed: "COMPLETED", in_progress: "IN-PROGRESS", pending: "PENDING" };
    const icons = { completed: "pass-filled", in_progress: "sync~spin", pending: "circle-outline" };
    super(labels[status], features.length > 0 ? vscode3.TreeItemCollapsibleState.Expanded : vscode3.TreeItemCollapsibleState.None);
    this.status = status;
    this.features = features;
    this.contextValue = "featureStatusGroup";
    this.iconPath = new vscode3.ThemeIcon(icons[status]);
    this.description = `${features.length}`;
  }
};
var FeatureItem = class extends vscode3.TreeItem {
  constructor(feature) {
    super(feature.name, vscode3.TreeItemCollapsibleState.Expanded);
    this.feature = feature;
    this.featureName = feature.name;
    this.isCompleted = feature.status === "completed" || feature.status === "archived";
    if (this.isCompleted && feature.completedAt) {
      const date = new Date(feature.completedAt).toLocaleDateString();
      this.description = `\u2713 ${date}`;
    } else {
      this.description = `${feature.progress}% (${feature.doneCount}/${feature.stepsCount})`;
    }
    this.contextValue = this.isCompleted ? "featureCompleted" : "feature";
    this.iconPath = new vscode3.ThemeIcon(this.isCompleted ? "pass-filled" : "package");
    this.command = {
      command: "hive.showFeature",
      title: "Show Feature Details",
      arguments: [feature.name]
    };
  }
};
var FolderItem = class extends vscode3.TreeItem {
  constructor(label, featureName, folder, icon, hasChildren) {
    super(label, hasChildren ? vscode3.TreeItemCollapsibleState.Collapsed : vscode3.TreeItemCollapsibleState.None);
    this.featureName = featureName;
    this.folder = folder;
    this.contextValue = "folder";
    this.iconPath = new vscode3.ThemeIcon(icon);
  }
};
var FileItem = class extends vscode3.TreeItem {
  constructor(filename, featureName, folder, filePath) {
    super(filename, vscode3.TreeItemCollapsibleState.None);
    this.filename = filename;
    this.featureName = featureName;
    this.folder = folder;
    this.filePath = filePath;
    this.contextValue = "file";
    this.iconPath = new vscode3.ThemeIcon(filename.endsWith(".md") ? "markdown" : "file");
    this.command = {
      command: "vscode.open",
      title: "Open File",
      arguments: [vscode3.Uri.file(filePath)]
    };
    this.resourceUri = vscode3.Uri.file(filePath);
  }
};
var ExecutionItem = class extends vscode3.TreeItem {
  constructor(feature) {
    super("Execution", vscode3.TreeItemCollapsibleState.Expanded);
    this.feature = feature;
    this.contextValue = "execution";
    this.iconPath = new vscode3.ThemeIcon("run-all");
  }
};
var StepItem = class _StepItem extends vscode3.TreeItem {
  constructor(featureName, step, hasSpecFiles) {
    const canRevert = step.status === "done" && step.execution?.canRevert === true;
    const label = `${String(step.order).padStart(2, "0")}-${step.name}${canRevert ? " \u27F2" : ""}`;
    super(
      label,
      hasSpecFiles || step.sessionId || step.status === "done" ? vscode3.TreeItemCollapsibleState.Collapsed : vscode3.TreeItemCollapsibleState.None
    );
    this.featureName = featureName;
    this.step = step;
    this.stepName = step.name;
    this.stepFolder = step.folderPath;
    this.sessionId = step.sessionId;
    this.canRevert = canRevert;
    this.contextValue = canRevert ? "stepWithRevert" : "step";
    this.iconPath = new vscode3.ThemeIcon(_StepItem.statusIcons[step.status] || "circle-outline");
    if (step.summary) {
      this.description = step.summary;
    }
    if (step.sessionId) {
      this.tooltip = `Session: ${step.sessionId}`;
    } else if (canRevert) {
      this.tooltip = "Can be reverted";
    }
  }
  static {
    this.statusIcons = {
      done: "pass",
      in_progress: "sync~spin",
      pending: "circle-outline",
      blocked: "error"
    };
  }
};
var SpecFileItem = class extends vscode3.TreeItem {
  constructor(filename, featureName, stepFolder, filePath) {
    super(filename, vscode3.TreeItemCollapsibleState.None);
    this.filename = filename;
    this.featureName = featureName;
    this.stepFolder = stepFolder;
    this.filePath = filePath;
    this.contextValue = "specFile";
    this.iconPath = new vscode3.ThemeIcon("markdown");
    this.command = {
      command: "vscode.open",
      title: "Open Spec",
      arguments: [vscode3.Uri.file(filePath)]
    };
    this.resourceUri = vscode3.Uri.file(filePath);
  }
};
var ReportFileItem = class extends vscode3.TreeItem {
  constructor(featureName, stepFolder, filePath) {
    super("report.json", vscode3.TreeItemCollapsibleState.None);
    this.featureName = featureName;
    this.stepFolder = stepFolder;
    this.filePath = filePath;
    this.contextValue = "reportFile";
    this.iconPath = new vscode3.ThemeIcon("file-json");
    this.command = {
      command: "vscode.open",
      title: "Open Report",
      arguments: [vscode3.Uri.file(filePath)]
    };
    this.resourceUri = vscode3.Uri.file(filePath);
  }
};
var DiffFileItem = class extends vscode3.TreeItem {
  constructor(featureName, stepFolder, filePath) {
    super("output.diff", vscode3.TreeItemCollapsibleState.None);
    this.featureName = featureName;
    this.stepFolder = stepFolder;
    this.filePath = filePath;
    this.contextValue = "diffFile";
    this.iconPath = new vscode3.ThemeIcon("file-code");
    this.command = {
      command: "hive.viewDiff",
      title: "View Diff",
      arguments: [vscode3.Uri.file(filePath)]
    };
    this.resourceUri = vscode3.Uri.file(filePath);
  }
};
var SessionTreeItem = class extends vscode3.TreeItem {
  constructor(featureName, stepFolder, session) {
    super(session.title || session.id, vscode3.TreeItemCollapsibleState.None);
    this.featureName = featureName;
    this.stepFolder = stepFolder;
    this.session = session;
    this.contextValue = "session";
    this.iconPath = this.getIcon();
    this.description = session.isParent ? "main" : this.parseAgentType();
    if (session.summary) {
      this.tooltip = session.summary;
    }
    this.command = {
      command: "hive.openSession",
      title: "Open in OpenCode",
      arguments: [{ session }]
    };
  }
  parseAgentType() {
    const match = this.session.title?.match(/@(\w+)\s+subagent/);
    return match?.[1];
  }
  getIcon() {
    if (this.session.isParent) return new vscode3.ThemeIcon("circle-filled");
    const agent = this.parseAgentType();
    switch (agent) {
      case "explore":
        return new vscode3.ThemeIcon("search");
      case "librarian":
        return new vscode3.ThemeIcon("book");
      case "general":
        return new vscode3.ThemeIcon("hubot");
      case "oracle":
        return new vscode3.ThemeIcon("lightbulb");
      default:
        return new vscode3.ThemeIcon("terminal");
    }
  }
};
var DecisionItem = class extends vscode3.TreeItem {
  constructor(featureName, decision) {
    super(decision.title, vscode3.TreeItemCollapsibleState.None);
    this.featureName = featureName;
    this.decision = decision;
    this.contextValue = "decision";
    this.iconPath = new vscode3.ThemeIcon("lightbulb");
    this.description = decision.filename;
    this.command = {
      command: "vscode.open",
      title: "Open Decision",
      arguments: [vscode3.Uri.file(decision.filePath)]
    };
    this.resourceUri = vscode3.Uri.file(decision.filePath);
  }
};
var HiveSidebarProvider = class {
  constructor(hiveService) {
    this.hiveService = hiveService;
    this._onDidChangeTreeData = new vscode3.EventEmitter();
    this.onDidChangeTreeData = this._onDidChangeTreeData.event;
  }
  refresh() {
    this._onDidChangeTreeData.fire(void 0);
  }
  getTreeItem(element) {
    return element;
  }
  async getChildren(element) {
    if (!element) {
      const features = this.hiveService.getFeatures();
      const grouped = { in_progress: [], pending: [], completed: [] };
      for (const f of features) {
        grouped[classifyFeatureStatus(f)].push(f);
      }
      grouped.in_progress.sort((a, b) => b.progress - a.progress);
      grouped.pending.sort((a, b) => a.progress - b.progress);
      grouped.completed.sort((a, b) => b.progress - a.progress);
      const result = [];
      if (grouped.in_progress.length > 0) result.push(new FeatureStatusGroupItem("in_progress", grouped.in_progress));
      if (grouped.pending.length > 0) result.push(new FeatureStatusGroupItem("pending", grouped.pending));
      if (grouped.completed.length > 0) result.push(new FeatureStatusGroupItem("completed", grouped.completed));
      return result;
    }
    if (element instanceof FeatureStatusGroupItem) {
      return element.features.map((f) => new FeatureItem(f));
    }
    if (element instanceof FeatureItem) {
      const requirementsFiles = this.hiveService.getFilesInFolder(element.feature.name, "requirements");
      const contextFiles = this.hiveService.getFilesInFolder(element.feature.name, "context");
      return [
        new FolderItem("Requirements", element.feature.name, "requirements", "question", requirementsFiles.length > 0),
        new FolderItem("Context", element.feature.name, "context", "lightbulb", contextFiles.length > 0),
        new ExecutionItem(element.feature)
      ];
    }
    if (element instanceof FolderItem) {
      if (element.folder === "context") {
        const decisions = this.hiveService.getDecisions(element.featureName);
        return decisions.map((d) => new DecisionItem(element.featureName, d));
      }
      const files = this.hiveService.getFilesInFolder(element.featureName, element.folder);
      return files.map((f) => new FileItem(
        f,
        element.featureName,
        element.folder,
        this.hiveService.getFilePath(element.featureName, element.folder, f)
      ));
    }
    if (element instanceof ExecutionItem) {
      return element.feature.steps.map((s) => new StepItem(
        element.feature.name,
        s,
        s.specFiles.length > 0
      ));
    }
    if (element instanceof StepItem) {
      const step = this.hiveService.getFeature(element.featureName).steps.find((s) => s.folderPath === element.stepFolder);
      if (!step) return [];
      const children = [];
      const stepPath = path4.join(this.hiveService["basePath"], "features", element.featureName, "execution", element.stepFolder);
      children.push(...step.specFiles.map((f) => new SpecFileItem(
        f,
        element.featureName,
        element.stepFolder,
        this.hiveService.getStepFilePath(element.featureName, element.stepFolder, f)
      )));
      const reportPath = path4.join(stepPath, "report.json");
      if (fs4.existsSync(reportPath)) {
        children.push(new ReportFileItem(
          element.featureName,
          element.stepFolder,
          reportPath
        ));
      }
      const diffPath = path4.join(stepPath, "output.diff");
      if (fs4.existsSync(diffPath)) {
        children.push(new DiffFileItem(
          element.featureName,
          element.stepFolder,
          diffPath
        ));
      }
      if (element.sessionId) {
        const sessions = await this.hiveService.getStepSessions(element.featureName, element.stepFolder);
        children.push(...sessions.map((s) => new SessionTreeItem(element.featureName, element.stepFolder, s)));
      }
      return children;
    }
    return [];
  }
};

// src/providers/panelProvider.ts
var vscode4 = __toESM(require("vscode"));
var HivePanelProvider = class {
  constructor(extensionUri, hiveService) {
    this.extensionUri = extensionUri;
    this.hiveService = hiveService;
  }
  static {
    this.viewType = "hive.panel";
  }
  resolveWebviewView(webviewView) {
    this._view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri]
    };
    webviewView.webview.html = this.getHtml();
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "openInOpenCode":
          vscode4.commands.executeCommand("hive.openInOpenCode", {
            featureName: message.feature,
            stepFolder: message.step
          });
          break;
        case "viewDiff":
          this.viewDiff(message.feature, message.step);
          break;
        case "viewReport":
          this.viewStepReport(message.feature, message.step);
          break;
        case "editSpec":
          this.editSpec(message.feature, message.step);
          break;
        case "revertStep":
          this.revertStep(message.feature, message.step);
          break;
        case "revertBatch":
          this.revertBatch(message.feature, message.order);
          break;
        case "executeBatch":
          this.executeBatch(message.feature, message.order);
          break;
      }
    });
  }
  viewDiff(featureName, stepFolder) {
    const diffPath = this.hiveService.getStepDiffPath(featureName, stepFolder);
    if (diffPath) {
      vscode4.commands.executeCommand(
        "hive.viewDiff",
        this.hiveService.getStepFilePath(featureName, stepFolder, "").replace(/\/$/, "")
      );
    } else {
      vscode4.window.showInformationMessage("No diff available for this step");
    }
  }
  viewStepReport(featureName, stepFolder) {
    const reportPath = this.hiveService.getStepFilePath(featureName, stepFolder, "report.json");
    vscode4.workspace.openTextDocument(reportPath).then((doc) => vscode4.window.showTextDocument(doc)).then(void 0, () => vscode4.window.showInformationMessage("No report available for this step"));
  }
  editSpec(featureName, stepFolder) {
    const specPath = this.hiveService.getStepFilePath(featureName, stepFolder, "spec.md");
    vscode4.workspace.openTextDocument(specPath).then((doc) => vscode4.window.showTextDocument(doc));
  }
  async revertStep(featureName, stepFolder) {
    const confirm = await vscode4.window.showWarningMessage(
      `Revert step ${stepFolder}?`,
      { modal: true },
      "Revert"
    );
    if (confirm === "Revert") {
      const terminal = vscode4.window.createTerminal("Hive - Revert");
      terminal.sendText(`opencode --command "hive_exec_revert stepFolder=${stepFolder}"`);
      terminal.show();
    }
  }
  async revertBatch(featureName, order) {
    vscode4.window.showInformationMessage(
      "Batch revert removed. Use hive_exec_revert on individual steps."
    );
  }
  executeBatch(featureName, order) {
    vscode4.window.showInformationMessage(
      "Batch execute removed. Use hive_exec_start on individual steps."
    );
  }
  showFeature(featureName) {
    if (!this._view) return;
    this.currentFeatureName = featureName;
    const feature = this.hiveService.getFeature(featureName);
    const batches = this.hiveService.getBatches(featureName);
    const requirements = this.hiveService.getRequirements(featureName);
    const context = this.hiveService.getContext(featureName);
    const batchesWithStats = batches.map((batch) => ({
      ...batch,
      steps: batch.steps.map((step) => ({
        ...step,
        duration: this.hiveService.formatDuration(step.startedAt, step.completedAt),
        report: this.hiveService.getStepReport(featureName, step.folderPath)
      }))
    }));
    this._view.webview.postMessage({
      command: "showFeature",
      data: { feature, batches: batchesWithStats, requirements, context }
    });
  }
  getHtml() {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: var(--vscode-font-family); 
      padding: 12px; 
      color: var(--vscode-foreground);
      font-size: 13px;
    }
    h2 { 
      margin: 0 0 16px 0; 
      font-size: 16px; 
      font-weight: 600;
    }
    .section { 
      margin-bottom: 16px; 
    }
    .section-title { 
      font-weight: bold; 
      margin-bottom: 8px; 
      text-transform: uppercase; 
      font-size: 11px; 
      opacity: 0.7; 
    }
    .section-content { 
      font-size: 12px; 
      white-space: pre-wrap;
      background: var(--vscode-textBlockQuote-background);
      padding: 8px;
      border-radius: 4px;
      max-height: 150px;
      overflow-y: auto;
    }
    .batch { 
      margin-bottom: 16px; 
    }
    .batch-header { 
      display: flex; 
      justify-content: space-between; 
      align-items: center;
      padding: 4px 0;
      border-bottom: 1px solid var(--vscode-panel-border);
      margin-bottom: 8px;
    }
    .batch-title { 
      font-size: 11px; 
      font-weight: bold; 
      text-transform: uppercase;
      opacity: 0.7;
    }
    .batch-actions { 
      display: flex; 
      gap: 4px; 
    }
    .step-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-panel-border);
      border-radius: 4px;
      padding: 10px 12px;
      margin-bottom: 8px;
    }
    .step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }
    .step-name {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }
    .step-duration {
      font-size: 11px;
      opacity: 0.7;
    }
    .step-summary {
      font-size: 12px;
      opacity: 0.8;
      margin: 4px 0;
    }
    .step-stats {
      font-size: 11px;
      opacity: 0.6;
      margin-top: 4px;
    }
    .step-footer {
      display: flex;
      justify-content: flex-end;
      gap: 4px;
      margin-top: 8px;
    }
    button { 
      background: var(--vscode-button-secondaryBackground); 
      color: var(--vscode-button-secondaryForeground); 
      border: none; 
      padding: 4px 8px; 
      cursor: pointer; 
      border-radius: 2px; 
      font-size: 11px; 
    }
    button:hover { 
      background: var(--vscode-button-secondaryHoverBackground); 
    }
    button.primary {
      background: var(--vscode-button-background); 
      color: var(--vscode-button-foreground);
    }
    button.primary:hover {
      background: var(--vscode-button-hoverBackground);
    }
    button.danger {
      background: var(--vscode-inputValidation-errorBackground);
      border: 1px solid var(--vscode-inputValidation-errorBorder);
    }
    .icon { 
      font-size: 14px; 
    }
    .empty { 
      opacity: 0.5; 
      font-style: italic; 
    }
    .pending-step {
      opacity: 0.7;
    }
    .step-edit-btn {
      background: transparent;
      opacity: 0.5;
      padding: 2px 6px;
    }
    .step-edit-btn:hover {
      opacity: 1;
      background: var(--vscode-button-secondaryBackground);
    }
  </style>
</head>
<body>
  <div id="content">
    <p class="empty">Select a feature to view details</p>
  </div>
  <script>
    const vscode = acquireVsCodeApi();
    const statusIcons = { 
      done: '\\u2705', 
      in_progress: '\\uD83D\\uDD04', 
      pending: '\\u2B1C', 
      blocked: '\\uD83D\\uDED1',
      reverted: '\\u21A9\\uFE0F',
      cancelled: '\\u274C'
    };

    window.addEventListener('message', event => {
      const { command, data } = event.data;
      if (command === 'showFeature') renderFeature(data);
    });

    function renderFeature({ feature, batches, requirements, context }) {
      const requirementsText = requirements.ticket || requirements.requirements || 'No requirements defined';
      const contextText = context.decisions || 'No decisions yet';

      let html = '<h2>' + escapeHtml(feature.name) + ' (' + feature.progress + '%)</h2>';
      
      html += '<div class="section">' +
        '<div class="section-title">Requirements</div>' +
        '<div class="section-content">' + escapeHtml(requirementsText).substring(0, 500) + '</div>' +
      '</div>';
      
      html += '<div class="section">' +
        '<div class="section-title">Context</div>' +
        '<div class="section-content">' + escapeHtml(contextText).substring(0, 500) + '</div>' +
      '</div>';

      html += '<div class="section-title">Execution</div>';
      
      for (const batch of batches) {
        html += renderBatch(feature.name, batch);
      }
      
      document.getElementById('content').innerHTML = html;
    }

    function renderBatch(featureName, batch) {
      const hasRevertButton = batch.isLatestDone;
      const hasExecuteButton = batch.canExecute;
      
      let batchActions = '';
      if (hasRevertButton) {
        batchActions = '<button class="danger" onclick="revertBatch(\\'' + featureName + '\\', ' + batch.order + ')">\\u21A9 Revert Batch</button>';
      } else if (hasExecuteButton) {
        batchActions = '<button class="primary" onclick="executeBatch(\\'' + featureName + '\\', ' + batch.order + ')">\\u25B6 Execute</button>';
      }
      
      let html = '<div class="batch">' +
        '<div class="batch-header">' +
          '<span class="batch-title">BATCH ' + batch.order + '</span>' +
          '<div class="batch-actions">' + batchActions + '</div>' +
        '</div>';
      
      for (const step of batch.steps) {
        html += renderStep(featureName, step, batch);
      }
      
      html += '</div>';
      return html;
    }

    function renderStep(featureName, step, batch) {
      const isDone = step.status === 'done';
      const isPending = step.status === 'pending';
      const icon = statusIcons[step.status] || statusIcons.pending;
      const stepClass = isPending ? 'step-card pending-step' : 'step-card';
      
      let html = '<div class="' + stepClass + '">' +
        '<div class="step-header">' +
          '<div class="step-name">' +
            '<span class="icon">' + icon + '</span>' +
            '<span>' + String(step.order).padStart(2, '0') + '-' + escapeHtml(step.name) + '</span>' +
          '</div>';
      
      if (step.duration) {
        html += '<span class="step-duration">' + step.duration + '</span>';
      }
      
      html += '</div>';
      
      if (step.summary) {
        html += '<div class="step-summary">' + escapeHtml(step.summary) + '</div>';
      }
      
      if (step.report) {
        html += '<div class="step-stats">' + 
          step.report.filesChanged + ' files (+' + step.report.insertions + ' -' + step.report.deletions + ')' +
        '</div>';
      }
      
      html += '<div class="step-footer">';
      
      if (isPending) {
        html += '<button class="step-edit-btn" onclick="editSpec(\\'' + featureName + '\\', \\'' + step.folderPath + '\\')" title="Edit Spec">\\u270F\\uFE0F Edit Spec</button>';
      }
      
      if (isDone) {
        if (batch.isLatestDone) {
          html += '<button onclick="revertStep(\\'' + featureName + '\\', \\'' + step.folderPath + '\\')" title="Revert">\\u21A9</button>';
        }
        html += '<button onclick="viewReport(\\'' + featureName + '\\', \\'' + step.folderPath + '\\')">Report</button>';
        html += '<button onclick="viewDiff(\\'' + featureName + '\\', \\'' + step.folderPath + '\\')">Diff</button>';
      } else {
        html += '<button onclick="openInOpenCode(\\'' + featureName + '\\', \\'' + step.folderPath + '\\')">Open in OpenCode</button>';
      }
      
      html += '</div></div>';
      return html;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function openInOpenCode(feature, step) {
      vscode.postMessage({ command: 'openInOpenCode', feature, step });
    }

    function viewDiff(feature, step) {
      vscode.postMessage({ command: 'viewDiff', feature, step });
    }

    function viewReport(feature, step) {
      vscode.postMessage({ command: 'viewReport', feature, step });
    }

    function editSpec(feature, step) {
      vscode.postMessage({ command: 'editSpec', feature, step });
    }

    function revertStep(feature, step) {
      vscode.postMessage({ command: 'revertStep', feature, step });
    }

    function revertBatch(feature, order) {
      vscode.postMessage({ command: 'revertBatch', feature, order });
    }

    function executeBatch(feature, order) {
      vscode.postMessage({ command: 'executeBatch', feature, order });
    }
  </script>
</body>
</html>`;
  }
};

// src/providers/reportViewProvider.ts
var vscode5 = __toESM(require("vscode"));
var fs5 = __toESM(require("fs"));
var path5 = __toESM(require("path"));
var ReportViewProvider = class _ReportViewProvider {
  constructor(extensionUri, hiveService, workspaceRoot) {
    this.extensionUri = extensionUri;
    this.hiveService = hiveService;
    this.workspaceRoot = workspaceRoot;
  }
  static {
    this.panels = /* @__PURE__ */ new Map();
  }
  show(featureName, stepFolder) {
    const panelKey = `${featureName}/${stepFolder}`;
    const existingPanel = _ReportViewProvider.panels.get(panelKey);
    if (existingPanel) {
      existingPanel.reveal();
      this.updatePanel(existingPanel, featureName, stepFolder);
      return;
    }
    const panel = vscode5.window.createWebviewPanel(
      "hive.stepReport",
      `Report: ${stepFolder}`,
      vscode5.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [this.extensionUri]
      }
    );
    _ReportViewProvider.panels.set(panelKey, panel);
    panel.onDidDispose(() => {
      _ReportViewProvider.panels.delete(panelKey);
    });
    panel.webview.onDidReceiveMessage((message) => {
      this.handleMessage(message, featureName, stepFolder);
    });
    this.updatePanel(panel, featureName, stepFolder);
  }
  handleMessage(message, featureName, stepFolder) {
    switch (message.command) {
      case "revert":
        this.revertStep(featureName, stepFolder);
        break;
      case "viewDiff":
        this.viewDiff(featureName, stepFolder);
        break;
      case "openFile":
        if (message.filePath) {
          this.openFile(message.filePath);
        }
        break;
    }
  }
  async revertStep(featureName, stepFolder) {
    const confirm = await vscode5.window.showWarningMessage(
      `Revert step "${stepFolder}"? This will undo all changes from this step.`,
      { modal: true },
      "Revert"
    );
    if (confirm === "Revert") {
      const terminal = vscode5.window.createTerminal("Hive - Revert");
      terminal.sendText(`opencode --command "hive_exec_revert stepFolder=${stepFolder}"`);
      terminal.show();
    }
  }
  viewDiff(featureName, stepFolder) {
    const stepPath = path5.join(
      this.workspaceRoot,
      ".hive",
      "features",
      featureName,
      "execution",
      stepFolder
    );
    vscode5.commands.executeCommand("hive.viewDiff", stepPath);
  }
  openFile(filePath) {
    const fullPath = path5.join(this.workspaceRoot, filePath);
    if (fs5.existsSync(fullPath)) {
      vscode5.workspace.openTextDocument(fullPath).then((doc) => vscode5.window.showTextDocument(doc));
    } else {
      vscode5.window.showWarningMessage(`File not found: ${filePath}`);
    }
  }
  updatePanel(panel, featureName, stepFolder) {
    const step = this.hiveService.getSteps(featureName).find((s) => s.folderPath === stepFolder);
    if (!step) {
      panel.webview.html = this.getErrorHtml("Step not found");
      return;
    }
    const reportData = this.getReportData(featureName, stepFolder);
    const diffPath = this.hiveService.getStepDiffPath(featureName, stepFolder);
    const fileChanges = diffPath ? this.parseFileChanges(diffPath) : [];
    const decisions = this.getDecisions(featureName);
    const notes = this.getNotes(featureName, stepFolder);
    const duration = this.hiveService.formatDuration(step.startedAt, step.completedAt);
    panel.webview.html = this.getHtml({
      step,
      stepFolder,
      reportData,
      fileChanges,
      decisions,
      notes,
      duration,
      canRevert: step.execution?.canRevert ?? false
    });
  }
  getReportData(featureName, stepFolder) {
    const reportPath = path5.join(
      this.workspaceRoot,
      ".hive",
      "features",
      featureName,
      "execution",
      stepFolder,
      "report.json"
    );
    try {
      const content = fs5.readFileSync(reportPath, "utf-8");
      return JSON.parse(content);
    } catch {
      return null;
    }
  }
  parseFileChanges(diffPath) {
    try {
      const content = fs5.readFileSync(diffPath, "utf-8");
      return this.extractFileChangesFromUnifiedDiff(content);
    } catch {
      return [];
    }
  }
  extractFileChangesFromUnifiedDiff(diffContent) {
    const files = [];
    const fileSections = diffContent.split(/^diff --git /gm).slice(1);
    for (const section of fileSections) {
      const pathMatch = section.match(/^a\/(.+?) b\/(.+?)$/m);
      if (!pathMatch) continue;
      const filePath = pathMatch[2];
      const insertions = (section.match(/^\+[^+]/gm) || []).length;
      const deletions = (section.match(/^-[^-]/gm) || []).length;
      const status = this.detectFileStatus(section);
      files.push({ path: filePath, insertions, deletions, status });
    }
    return files;
  }
  detectFileStatus(diffSection) {
    if (diffSection.includes("new file mode")) return "added";
    if (diffSection.includes("deleted file mode")) return "deleted";
    return "modified";
  }
  getDecisions(featureName) {
    const context = this.hiveService.getContext(featureName);
    if (!context.decisions) return [];
    return this.extractMarkdownListItems(context.decisions);
  }
  extractMarkdownListItems(markdown) {
    const bulletOrNumberPattern = /^[-*]\s|^\d+\.\s/;
    return markdown.split("\n").map((line) => line.trim()).filter((line) => bulletOrNumberPattern.test(line)).map((line) => line.replace(bulletOrNumberPattern, ""));
  }
  getNotes(featureName, stepFolder) {
    const specPath = path5.join(
      this.workspaceRoot,
      ".hive",
      "features",
      featureName,
      "execution",
      stepFolder,
      "spec.md"
    );
    try {
      const content = fs5.readFileSync(specPath, "utf-8");
      return this.extractWarningLines(content);
    } catch {
      return [];
    }
  }
  extractWarningLines(content) {
    const warningIndicators = ["WARNING", "CAUTION", "NOTE:", "TODO:"];
    return content.split("\n").filter((line) => warningIndicators.some((indicator) => line.includes(indicator))).map((line) => line.trim());
  }
  getErrorHtml(message) {
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    body { 
      font-family: var(--vscode-font-family); 
      padding: 20px; 
      color: var(--vscode-foreground);
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
    }
    .error { 
      color: var(--vscode-errorForeground); 
      font-size: 16px;
    }
  </style>
</head>
<body>
  <div class="error">${this.escapeHtml(message)}</div>
</body>
</html>`;
  }
  getHtml(data) {
    const { step, stepFolder, reportData, fileChanges, decisions, notes, duration, canRevert } = data;
    const statusIcon = step.status === "done" ? "&#x2705;" : step.status === "in_progress" ? "&#x1F504;" : step.status === "blocked" ? "&#x274C;" : "&#x23F8;";
    const statusText = step.status.toUpperCase().replace("_", " ");
    const statusClass = step.status === "done" ? "success" : step.status === "in_progress" ? "in-progress" : step.status === "blocked" ? "error" : "pending";
    const filesHtml = fileChanges.length > 0 ? fileChanges.map((f) => this.renderFileChange(f)).join("") : '<div class="empty">No file changes recorded</div>';
    const decisionsHtml = decisions.length > 0 ? decisions.map((d) => `<div class="decision-item">&#x2022; ${this.escapeHtml(d)}</div>`).join("") : '<div class="empty">No decisions recorded</div>';
    const notesHtml = notes.length > 0 ? notes.map((n) => `<div class="note-item">&#x26A0;&#xFE0F; ${this.escapeHtml(n)}</div>`).join("") : "";
    const diffStats = reportData?.diffStats || this.hiveService.getStepReport(step.folderPath.split("/")[0] || "", stepFolder);
    const statsText = diffStats ? `${diffStats.filesChanged} files, +${diffStats.insertions} -${diffStats.deletions}` : "";
    return `<!DOCTYPE html>
<html>
<head>
  <style>
    :root {
      --border-color: var(--vscode-panel-border);
      --bg-color: var(--vscode-editor-background);
      --fg-color: var(--vscode-foreground);
      --section-bg: var(--vscode-sideBar-background);
      --button-bg: var(--vscode-button-background);
      --button-fg: var(--vscode-button-foreground);
      --button-hover: var(--vscode-button-hoverBackground);
      --link-color: var(--vscode-textLink-foreground);
      --success-color: #4caf50;
      --warning-color: #ff9800;
      --error-color: #f44336;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body { 
      font-family: var(--vscode-font-family); 
      padding: 0;
      margin: 0;
      color: var(--fg-color);
      background: var(--bg-color);
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      overflow: hidden;
      margin-top: 20px;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: var(--section-bg);
      border-bottom: 1px solid var(--border-color);
    }
    
    .header-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 600;
    }
    
    .content {
      padding: 16px;
    }
    
    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 600;
    }
    
    .status.success { color: var(--success-color); }
    .status.in-progress { color: var(--warning-color); }
    .status.error { color: var(--error-color); }
    .status.pending { opacity: 0.6; }
    
    .duration {
      font-size: 14px;
      opacity: 0.7;
    }
    
    .summary {
      font-size: 13px;
      opacity: 0.85;
      margin-bottom: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border-color);
    }
    
    .section {
      margin-bottom: 16px;
    }
    
    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--border-color);
    }
    
    .file-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 8px;
      border-radius: 4px;
      margin-bottom: 4px;
      background: var(--section-bg);
    }
    
    .file-info {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .file-icon {
      font-size: 14px;
    }
    
    .file-icon.added { color: var(--success-color); }
    .file-icon.modified { color: var(--warning-color); }
    .file-icon.deleted { color: var(--error-color); }
    
    .file-path {
      font-size: 12px;
      font-family: var(--vscode-editor-font-family);
    }
    
    .file-stats {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .stat {
      font-size: 11px;
      font-family: var(--vscode-editor-font-family);
    }
    
    .stat.additions { color: var(--success-color); }
    .stat.deletions { color: var(--error-color); }
    
    .open-btn {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--link-color);
      padding: 2px 8px;
      border-radius: 3px;
      cursor: pointer;
      font-size: 11px;
    }
    
    .open-btn:hover {
      background: var(--button-bg);
      color: var(--button-fg);
      border-color: var(--button-bg);
    }
    
    .decision-item, .note-item {
      font-size: 13px;
      padding: 4px 0;
    }
    
    .note-item {
      color: var(--warning-color);
    }
    
    .empty {
      font-size: 13px;
      opacity: 0.5;
      font-style: italic;
    }
    
    .footer {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 16px;
      border-top: 1px solid var(--border-color);
      background: var(--section-bg);
    }
    
    .action-btn {
      background: var(--button-bg);
      color: var(--button-fg);
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .action-btn:hover {
      background: var(--button-hover);
    }
    
    .action-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .action-btn.secondary {
      background: transparent;
      border: 1px solid var(--border-color);
      color: var(--fg-color);
    }
    
    .action-btn.secondary:hover {
      background: var(--section-bg);
    }
    
    .action-btn.danger {
      background: var(--error-color);
    }
    
    .action-btn.danger:hover {
      opacity: 0.9;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-title">
        &#x1F4CB; Report: ${this.escapeHtml(stepFolder)}
      </div>
    </div>
    
    <div class="content">
      <div class="status-row">
        <div class="status ${statusClass}">
          ${statusIcon} ${statusText}
        </div>
        ${duration ? `<div class="duration">${this.escapeHtml(duration)}</div>` : ""}
      </div>
      
      ${step.summary ? `<div class="summary">${this.escapeHtml(step.summary)}</div>` : ""}
      
      <div class="section">
        <div class="section-title">Files Changed ${statsText ? `(${statsText})` : ""}</div>
        ${filesHtml}
      </div>
      
      <div class="section">
        <div class="section-title">Decisions</div>
        ${decisionsHtml}
      </div>
      
      ${notesHtml ? `
      <div class="section">
        <div class="section-title">Notes</div>
        ${notesHtml}
      </div>
      ` : ""}
    </div>
    
    <div class="footer">
      <button class="action-btn danger" onclick="revert()" ${canRevert ? "" : "disabled"}>
        &#x21A9; Revert This Step
      </button>
      <button class="action-btn secondary" onclick="viewDiff()">
        View Full Diff
      </button>
    </div>
  </div>
  
  <script>
    const vscode = acquireVsCodeApi();
    
    function revert() {
      vscode.postMessage({ command: 'revert' });
    }
    
    function viewDiff() {
      vscode.postMessage({ command: 'viewDiff' });
    }
    
    function openFile(filePath) {
      vscode.postMessage({ command: 'openFile', filePath });
    }
  </script>
</body>
</html>`;
  }
  renderFileChange(file) {
    const icon = file.status === "added" ? "&#x2728;" : file.status === "deleted" ? "&#x1F5D1;" : "&#x1F4DD;";
    const iconClass = file.status;
    const additions = file.insertions > 0 ? `+${file.insertions}` : "";
    const deletions = file.deletions > 0 ? `-${file.deletions}` : "";
    return `
      <div class="file-item">
        <div class="file-info">
          <span class="file-icon ${iconClass}">${icon}</span>
          <span class="file-path">${this.escapeHtml(file.path)}</span>
        </div>
        <div class="file-stats">
          ${additions ? `<span class="stat additions">${additions}</span>` : ""}
          ${deletions ? `<span class="stat deletions">${deletions}</span>` : ""}
          <button class="open-btn" onclick="openFile('${this.escapeHtml(file.path)}')">Open</button>
        </div>
      </div>
    `;
  }
  escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  }
};

// src/commands/viewDiff.ts
var vscode6 = __toESM(require("vscode"));
var fs6 = __toESM(require("fs"));
async function viewDiff(diffPath) {
  const filePath = typeof diffPath === "string" ? diffPath : diffPath.fsPath;
  if (!fs6.existsSync(filePath)) {
    vscode6.window.showWarningMessage("No diff file found for this step");
    return;
  }
  const diffContent = fs6.readFileSync(filePath, "utf-8");
  if (!diffContent.trim()) {
    vscode6.window.showInformationMessage("Diff file is empty - no changes recorded");
    return;
  }
  const doc = await vscode6.workspace.openTextDocument({
    content: diffContent,
    language: "diff"
  });
  await vscode6.window.showTextDocument(doc, {
    preview: true,
    viewColumn: vscode6.ViewColumn.Beside
  });
}

// src/extension.ts
function findHiveRoot(startPath) {
  let current = startPath;
  while (current !== path6.dirname(current)) {
    if (fs7.existsSync(path6.join(current, ".hive"))) {
      return current;
    }
    current = path6.dirname(current);
  }
  return null;
}
function activate(context) {
  const workspaceFolder = vscode7.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder) return;
  const workspaceRoot = findHiveRoot(workspaceFolder);
  if (!workspaceRoot) return;
  const hiveService = new HiveService(workspaceRoot);
  const launcher = new Launcher(workspaceRoot);
  const checkpointService = new CheckpointService(workspaceRoot);
  context.subscriptions.push(
    vscode7.commands.registerCommand("hive.refresh", () => {
      const sidebarProvider2 = new HiveSidebarProvider(hiveService);
      sidebarProvider2.refresh();
    }),
    vscode7.commands.registerCommand("hive.newFeature", async () => {
      const name = await vscode7.window.showInputBox({
        prompt: "Feature name",
        placeHolder: "my-feature"
      });
      if (name) {
        const terminal = vscode7.window.createTerminal("OpenCode - Hive");
        terminal.sendText(`opencode --command "/hive new ${name}"`);
        terminal.show();
      }
    }),
    vscode7.commands.registerCommand("hive.openStepInOpenCode", (featureName, stepName, sessionId) => {
      launcher.openStep("opencode", featureName, stepName, sessionId);
    }),
    vscode7.commands.registerCommand("hive.openFeatureInOpenCode", (featureName) => {
      launcher.openFeature("opencode", featureName);
    }),
    vscode7.commands.registerCommand("hive.viewReport", (feature) => {
      const report = hiveService.getReport(feature);
      if (report) {
        vscode7.workspace.openTextDocument({ content: report, language: "markdown" }).then((doc) => vscode7.window.showTextDocument(doc));
      } else {
        vscode7.window.showInformationMessage("No report generated yet");
      }
    }),
    vscode7.commands.registerCommand("hive.showFeature", (featureName) => {
      const panelProvider2 = new HivePanelProvider(context.extensionUri, hiveService);
      panelProvider2.showFeature(featureName);
    }),
    vscode7.commands.registerCommand("hive.openInOpenCode", (item) => {
      if (item?.featureName && item?.stepFolder) {
        launcher.openStep("opencode", item.featureName, item.stepFolder, item.sessionId);
      }
    }),
    vscode7.commands.registerCommand("hive.openFile", (filePath) => {
      if (filePath) {
        vscode7.workspace.openTextDocument(filePath).then((doc) => vscode7.window.showTextDocument(doc));
      }
    }),
    vscode7.commands.registerCommand("hive.viewFeatureDetails", (item) => {
      if (item?.featureName) {
        const panelProvider2 = new HivePanelProvider(context.extensionUri, hiveService);
        panelProvider2.showFeature(item.featureName);
      }
    }),
    vscode7.commands.registerCommand("hive.openSession", (item) => {
      if (item?.session?.id) {
        launcher.openSession(item.session.id);
      }
    }),
    vscode7.commands.registerCommand("hive.viewDiff", (stepPath) => {
      viewDiff(stepPath);
    }),
    vscode7.commands.registerCommand("hive.viewStepReport", (item) => {
      if (item?.featureName && item?.stepFolder) {
        const reportViewProvider = new ReportViewProvider(context.extensionUri, hiveService, workspaceRoot);
        reportViewProvider.show(item.featureName, item.stepFolder);
      }
    }),
    vscode7.commands.registerCommand("hive.revertStep", async (item) => {
      if (item?.featureName && item?.stepFolder) {
        const confirm = await vscode7.window.showWarningMessage(
          "Revert this step? Changes will be undone.",
          { modal: true },
          "Revert"
        );
        if (confirm === "Revert") {
          const result = await checkpointService.revertStep(item.featureName, item.stepFolder);
          if (result.success) {
            vscode7.window.showInformationMessage("Step reverted");
          } else {
            vscode7.window.showErrorMessage(`Failed to revert: ${result.error}`);
          }
          const sidebarProvider2 = new HiveSidebarProvider(hiveService);
          sidebarProvider2.refresh();
        }
      }
    }),
    vscode7.commands.registerCommand("hive.revertBatch", async (item) => {
      if (item?.featureName && item?.order) {
        const confirm = await vscode7.window.showWarningMessage(
          `Revert batch ${item.order}? All steps in this batch will be reverted.`,
          { modal: true },
          "Revert"
        );
        if (confirm === "Revert") {
          const results = await checkpointService.revertBatch(item.featureName, item.order);
          const failed = results.filter((r) => !r.success);
          if (failed.length === 0) {
            vscode7.window.showInformationMessage(`Batch ${item.order} reverted`);
          } else {
            vscode7.window.showErrorMessage(`Some steps failed to revert: ${failed.map((f) => f.error).join(", ")}`);
          }
          const sidebarProvider2 = new HiveSidebarProvider(hiveService);
          sidebarProvider2.refresh();
        }
      }
    }),
    vscode7.commands.registerCommand("hive.executeBatch", async (item) => {
      if (item?.featureName && item?.order) {
        const confirm = await vscode7.window.showInformationMessage(
          `Execute batch ${item.order}? This will run all pending steps in this batch.`,
          { modal: true },
          "Execute"
        );
        if (confirm === "Execute") {
          const terminal = vscode7.window.createTerminal("OpenCode - Hive");
          terminal.sendText(`opencode --command "/hive execute --batch ${item.order}"`);
          terminal.show();
        }
      }
    })
  );
  if (!hiveService.exists()) return;
  const sidebarProvider = new HiveSidebarProvider(hiveService);
  vscode7.window.registerTreeDataProvider("hive.features", sidebarProvider);
  const panelProvider = new HivePanelProvider(context.extensionUri, hiveService);
  context.subscriptions.push(
    vscode7.window.registerWebviewViewProvider(HivePanelProvider.viewType, panelProvider)
  );
  const watcher = new HiveWatcher(workspaceRoot, () => sidebarProvider.refresh());
  context.subscriptions.push({ dispose: () => watcher.dispose() });
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
