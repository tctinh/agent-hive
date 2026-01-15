const __importMetaUrl = require('url').pathToFileURL(__filename).href;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode10 = __toESM(require("vscode"));
var fs12 = __toESM(require("fs"));
var path12 = __toESM(require("path"));

// ../hive-core/dist/index.js
var import_node_module = require("node:module");
var path = __toESM(require("path"), 1);
var fs = __toESM(require("fs"), 1);
var fs3 = __toESM(require("fs"), 1);
var fs4 = __toESM(require("fs"), 1);
var fs5 = __toESM(require("fs"), 1);
var fs6 = __toESM(require("fs/promises"), 1);
var path3 = __toESM(require("path"), 1);
var import_node_buffer = require("node:buffer");
var import_child_process = require("child_process");
var import_node_path = require("node:path");
var import_node_events = require("node:events");
var fs7 = __toESM(require("fs"), 1);
var path4 = __toESM(require("path"), 1);
var fs9 = __toESM(require("fs"), 1);
var path6 = __toESM(require("path"), 1);
var __create2 = Object.create;
var __getProtoOf2 = Object.getPrototypeOf;
var __defProp2 = Object.defineProperty;
var __getOwnPropNames2 = Object.getOwnPropertyNames;
var __hasOwnProp2 = Object.prototype.hasOwnProperty;
var __toESM2 = (mod, isNodeMode, target) => {
  target = mod != null ? __create2(__getProtoOf2(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames2(mod))
    if (!__hasOwnProp2.call(to, key))
      __defProp2(to, key, {
        get: () => mod[key],
        enumerable: true
      });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);
var __require = /* @__PURE__ */ (0, import_node_module.createRequire)(__importMetaUrl);
var require_ms = __commonJS((exports2, module2) => {
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
      return parse2(val);
    } else if (type === "number" && isFinite(val)) {
      return options.long ? fmtLong(val) : fmtShort(val);
    }
    throw new Error("val is not a non-empty string or a valid number. val=" + JSON.stringify(val));
  };
  function parse2(str) {
    str = String(str);
    if (str.length > 100) {
      return;
    }
    var match = /^(-?(?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w|years?|yrs?|y)?$/i.exec(str);
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
        return;
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
});
var require_common = __commonJS((exports2, module2) => {
  function setup(env2) {
    createDebug.debug = createDebug;
    createDebug.default = createDebug;
    createDebug.coerce = coerce;
    createDebug.disable = disable;
    createDebug.enable = enable;
    createDebug.enabled = enabled;
    createDebug.humanize = require_ms();
    createDebug.destroy = destroy;
    Object.keys(env2).forEach((key) => {
      createDebug[key] = env2[key];
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
      function debug(...args) {
        if (!debug.enabled) {
          return;
        }
        const self = debug;
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
      debug.namespace = namespace;
      debug.useColors = createDebug.useColors();
      debug.color = createDebug.selectColor(namespace);
      debug.extend = extend;
      debug.destroy = createDebug.destroy;
      Object.defineProperty(debug, "enabled", {
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
        createDebug.init(debug);
      }
      return debug;
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
});
var require_browser = __commonJS((exports2, module2) => {
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
    return typeof document !== "undefined" && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance || typeof window !== "undefined" && window.console && (window.console.firebug || window.console.exception && window.console.table) || typeof navigator !== "undefined" && navigator.userAgent && (m = navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/)) && parseInt(m[1], 10) >= 31 || typeof navigator !== "undefined" && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/);
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
});
var require_has_flag = __commonJS((exports2, module2) => {
  module2.exports = (flag, argv = process.argv) => {
    const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
    const position = argv.indexOf(prefix + flag);
    const terminatorPosition = argv.indexOf("--");
    return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
  };
});
var require_supports_color = __commonJS((exports2, module2) => {
  var os = __require("os");
  var tty = __require("tty");
  var hasFlag = require_has_flag();
  var { env: env2 } = process;
  var forceColor;
  if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
    forceColor = 0;
  } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
    forceColor = 1;
  }
  if ("FORCE_COLOR" in env2) {
    if (env2.FORCE_COLOR === "true") {
      forceColor = 1;
    } else if (env2.FORCE_COLOR === "false") {
      forceColor = 0;
    } else {
      forceColor = env2.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env2.FORCE_COLOR, 10), 3);
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
  function supportsColor(haveStream, streamIsTTY) {
    if (forceColor === 0) {
      return 0;
    }
    if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
      return 3;
    }
    if (hasFlag("color=256")) {
      return 2;
    }
    if (haveStream && !streamIsTTY && forceColor === void 0) {
      return 0;
    }
    const min = forceColor || 0;
    if (env2.TERM === "dumb") {
      return min;
    }
    if (process.platform === "win32") {
      const osRelease = os.release().split(".");
      if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
        return Number(osRelease[2]) >= 14931 ? 3 : 2;
      }
      return 1;
    }
    if ("CI" in env2) {
      if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "GITHUB_ACTIONS", "BUILDKITE"].some((sign) => sign in env2) || env2.CI_NAME === "codeship") {
        return 1;
      }
      return min;
    }
    if ("TEAMCITY_VERSION" in env2) {
      return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env2.TEAMCITY_VERSION) ? 1 : 0;
    }
    if (env2.COLORTERM === "truecolor") {
      return 3;
    }
    if ("TERM_PROGRAM" in env2) {
      const version = parseInt((env2.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
      switch (env2.TERM_PROGRAM) {
        case "iTerm.app":
          return version >= 3 ? 3 : 2;
        case "Apple_Terminal":
          return 2;
      }
    }
    if (/-256(color)?$/i.test(env2.TERM)) {
      return 2;
    }
    if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env2.TERM)) {
      return 1;
    }
    if ("COLORTERM" in env2) {
      return 1;
    }
    return min;
  }
  function getSupportLevel(stream) {
    const level = supportsColor(stream, stream && stream.isTTY);
    return translateLevel(level);
  }
  module2.exports = {
    supportsColor: getSupportLevel,
    stdout: translateLevel(supportsColor(true, tty.isatty(1))),
    stderr: translateLevel(supportsColor(true, tty.isatty(2)))
  };
});
var require_node = __commonJS((exports2, module2) => {
  var tty = __require("tty");
  var util = __require("util");
  exports2.init = init;
  exports2.log = log;
  exports2.formatArgs = formatArgs;
  exports2.save = save;
  exports2.load = load;
  exports2.useColors = useColors;
  exports2.destroy = util.deprecate(() => {
  }, "Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.");
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
      args[0] = prefix + args[0].split(`
`).join(`
` + prefix);
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
    return process.stderr.write(util.formatWithOptions(exports2.inspectOpts, ...args) + `
`);
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
  function init(debug) {
    debug.inspectOpts = {};
    const keys = Object.keys(exports2.inspectOpts);
    for (let i = 0; i < keys.length; i++) {
      debug.inspectOpts[keys[i]] = exports2.inspectOpts[keys[i]];
    }
  }
  module2.exports = require_common()(exports2);
  var { formatters } = module2.exports;
  formatters.o = function(v) {
    this.inspectOpts.colors = this.useColors;
    return util.inspect(v, this.inspectOpts).split(`
`).map((str) => str.trim()).join(" ");
  };
  formatters.O = function(v) {
    this.inspectOpts.colors = this.useColors;
    return util.inspect(v, this.inspectOpts);
  };
});
var require_src = __commonJS((exports2, module2) => {
  if (typeof process === "undefined" || process.type === "renderer" || false || process.__nwjs) {
    module2.exports = require_browser();
  } else {
    module2.exports = require_node();
  }
});
var require_src2 = __commonJS((exports2) => {
  var __importDefault = exports2 && exports2.__importDefault || function(mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
  Object.defineProperty(exports2, "__esModule", { value: true });
  var fs_1 = __require("fs");
  var debug_1 = __importDefault(require_src());
  var log = debug_1.default("@kwsites/file-exists");
  function check(path32, isFile, isDirectory) {
    log(`checking %s`, path32);
    try {
      const stat2 = fs_1.statSync(path32);
      if (stat2.isFile() && isFile) {
        log(`[OK] path represents a file`);
        return true;
      }
      if (stat2.isDirectory() && isDirectory) {
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
  function exists(path32, type = exports2.READABLE) {
    return check(path32, (type & exports2.FILE) > 0, (type & exports2.FOLDER) > 0);
  }
  exports2.exists = exists;
  exports2.FILE = 1;
  exports2.FOLDER = 2;
  exports2.READABLE = exports2.FILE + exports2.FOLDER;
});
var require_dist = __commonJS((exports2) => {
  function __export3(m) {
    for (var p in m)
      if (!exports2.hasOwnProperty(p))
        exports2[p] = m[p];
  }
  Object.defineProperty(exports2, "__esModule", { value: true });
  __export3(require_src2());
});
var require_dist2 = __commonJS((exports2) => {
  Object.defineProperty(exports2, "__esModule", { value: true });
  exports2.createDeferred = exports2.deferred = void 0;
  function deferred() {
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
  exports2.deferred = deferred;
  exports2.createDeferred = deferred;
  exports2.default = deferred;
});
var HIVE_DIR = ".hive";
var FEATURES_DIR = "features";
var TASKS_DIR = "tasks";
var CONTEXT_DIR = "context";
var PLAN_FILE = "plan.md";
var COMMENTS_FILE = "comments.json";
var FEATURE_FILE = "feature.json";
var STATUS_FILE = "status.json";
var REPORT_FILE = "report.md";
function getHivePath(projectRoot) {
  return path.join(projectRoot, HIVE_DIR);
}
function getFeaturesPath(projectRoot) {
  return path.join(getHivePath(projectRoot), FEATURES_DIR);
}
function getFeaturePath(projectRoot, featureName) {
  return path.join(getFeaturesPath(projectRoot), featureName);
}
function getPlanPath(projectRoot, featureName) {
  return path.join(getFeaturePath(projectRoot, featureName), PLAN_FILE);
}
function getCommentsPath(projectRoot, featureName) {
  return path.join(getFeaturePath(projectRoot, featureName), COMMENTS_FILE);
}
function getFeatureJsonPath(projectRoot, featureName) {
  return path.join(getFeaturePath(projectRoot, featureName), FEATURE_FILE);
}
function getContextPath(projectRoot, featureName) {
  return path.join(getFeaturePath(projectRoot, featureName), CONTEXT_DIR);
}
function getTasksPath(projectRoot, featureName) {
  return path.join(getFeaturePath(projectRoot, featureName), TASKS_DIR);
}
function getTaskPath(projectRoot, featureName, taskFolder) {
  return path.join(getTasksPath(projectRoot, featureName), taskFolder);
}
function getTaskStatusPath(projectRoot, featureName, taskFolder) {
  return path.join(getTaskPath(projectRoot, featureName, taskFolder), STATUS_FILE);
}
function getTaskReportPath(projectRoot, featureName, taskFolder) {
  return path.join(getTaskPath(projectRoot, featureName, taskFolder), REPORT_FILE);
}
function getTaskSpecPath(projectRoot, featureName, taskFolder) {
  return path.join(getTaskPath(projectRoot, featureName, taskFolder), "spec.md");
}
var SUBTASKS_DIR = "subtasks";
var SPEC_FILE = "spec.md";
function getSubtasksPath(projectRoot, featureName, taskFolder) {
  return path.join(getTaskPath(projectRoot, featureName, taskFolder), SUBTASKS_DIR);
}
function getSubtaskPath(projectRoot, featureName, taskFolder, subtaskFolder) {
  return path.join(getSubtasksPath(projectRoot, featureName, taskFolder), subtaskFolder);
}
function getSubtaskStatusPath(projectRoot, featureName, taskFolder, subtaskFolder) {
  return path.join(getSubtaskPath(projectRoot, featureName, taskFolder, subtaskFolder), STATUS_FILE);
}
function getSubtaskSpecPath(projectRoot, featureName, taskFolder, subtaskFolder) {
  return path.join(getSubtaskPath(projectRoot, featureName, taskFolder, subtaskFolder), SPEC_FILE);
}
function getSubtaskReportPath(projectRoot, featureName, taskFolder, subtaskFolder) {
  return path.join(getSubtaskPath(projectRoot, featureName, taskFolder, subtaskFolder), REPORT_FILE);
}
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
function fileExists(filePath) {
  return fs.existsSync(filePath);
}
function readJson(filePath) {
  if (!fs.existsSync(filePath))
    return null;
  const content = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}
function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}
function readText(filePath) {
  if (!fs.existsSync(filePath))
    return null;
  return fs.readFileSync(filePath, "utf-8");
}
function writeText(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}
var FeatureService = class {
  projectRoot;
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }
  create(name, ticket) {
    const featurePath = getFeaturePath(this.projectRoot, name);
    if (fileExists(featurePath)) {
      throw new Error(`Feature '${name}' already exists`);
    }
    ensureDir(featurePath);
    ensureDir(getContextPath(this.projectRoot, name));
    ensureDir(getTasksPath(this.projectRoot, name));
    const feature = {
      name,
      status: "planning",
      ticket,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    writeJson(getFeatureJsonPath(this.projectRoot, name), feature);
    return feature;
  }
  get(name) {
    return readJson(getFeatureJsonPath(this.projectRoot, name));
  }
  list() {
    const featuresPath = getFeaturesPath(this.projectRoot);
    if (!fileExists(featuresPath))
      return [];
    return fs3.readdirSync(featuresPath, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
  }
  updateStatus(name, status) {
    const feature = this.get(name);
    if (!feature)
      throw new Error(`Feature '${name}' not found`);
    feature.status = status;
    if (status === "approved" && !feature.approvedAt) {
      feature.approvedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    if (status === "completed" && !feature.completedAt) {
      feature.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    writeJson(getFeatureJsonPath(this.projectRoot, name), feature);
    return feature;
  }
  getInfo(name) {
    const feature = this.get(name);
    if (!feature)
      return null;
    const tasks = this.getTasks(name);
    const hasPlan = fileExists(getPlanPath(this.projectRoot, name));
    const comments2 = readJson(getCommentsPath(this.projectRoot, name));
    const commentCount = comments2?.threads?.length || 0;
    return {
      name: feature.name,
      status: feature.status,
      tasks,
      hasPlan,
      commentCount
    };
  }
  getTasks(featureName) {
    const tasksPath = getTasksPath(this.projectRoot, featureName);
    if (!fileExists(tasksPath))
      return [];
    const folders = fs3.readdirSync(tasksPath, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
    return folders.map((folder) => {
      const statusPath = `${tasksPath}/${folder}/status.json`;
      const status = readJson(statusPath);
      const name = folder.replace(/^\d+-/, "");
      return {
        folder,
        name,
        status: status?.status || "pending",
        origin: status?.origin || "plan",
        summary: status?.summary
      };
    });
  }
  complete(name) {
    const feature = this.get(name);
    if (!feature)
      throw new Error(`Feature '${name}' not found`);
    if (feature.status === "completed") {
      throw new Error(`Feature '${name}' is already completed`);
    }
    return this.updateStatus(name, "completed");
  }
  setSession(name, sessionId) {
    const feature = this.get(name);
    if (!feature)
      throw new Error(`Feature '${name}' not found`);
    feature.sessionId = sessionId;
    writeJson(getFeatureJsonPath(this.projectRoot, name), feature);
  }
  getSession(name) {
    const feature = this.get(name);
    return feature?.sessionId;
  }
};
var PlanService = class {
  projectRoot;
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }
  write(featureName, content) {
    const planPath = getPlanPath(this.projectRoot, featureName);
    writeText(planPath, content);
    this.clearComments(featureName);
    return planPath;
  }
  read(featureName) {
    const planPath = getPlanPath(this.projectRoot, featureName);
    const content = readText(planPath);
    if (content === null)
      return null;
    const feature = readJson(getFeatureJsonPath(this.projectRoot, featureName));
    const comments2 = this.getComments(featureName);
    return {
      content,
      status: feature?.status || "planning",
      comments: comments2
    };
  }
  approve(featureName) {
    const featurePath = getFeatureJsonPath(this.projectRoot, featureName);
    const feature = readJson(featurePath);
    if (!feature)
      throw new Error(`Feature '${featureName}' not found`);
    if (!fileExists(getPlanPath(this.projectRoot, featureName))) {
      throw new Error(`No plan.md found for feature '${featureName}'`);
    }
    feature.status = "approved";
    feature.approvedAt = (/* @__PURE__ */ new Date()).toISOString();
    writeJson(featurePath, feature);
  }
  getComments(featureName) {
    const commentsPath = getCommentsPath(this.projectRoot, featureName);
    const data = readJson(commentsPath);
    return data?.threads || [];
  }
  addComment(featureName, comment) {
    const commentsPath = getCommentsPath(this.projectRoot, featureName);
    const data = readJson(commentsPath) || { threads: [] };
    const newComment = {
      ...comment,
      id: `comment-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    data.threads.push(newComment);
    writeJson(commentsPath, data);
    return newComment;
  }
  clearComments(featureName) {
    const commentsPath = getCommentsPath(this.projectRoot, featureName);
    writeJson(commentsPath, { threads: [] });
  }
};
var TaskService = class {
  projectRoot;
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }
  sync(featureName) {
    const planPath = getPlanPath(this.projectRoot, featureName);
    const planContent = readText(planPath);
    if (!planContent) {
      throw new Error(`No plan.md found for feature '${featureName}'`);
    }
    const planTasks = this.parseTasksFromPlan(planContent);
    const existingTasks = this.list(featureName);
    const result = {
      created: [],
      removed: [],
      kept: [],
      manual: []
    };
    const existingByName = new Map(existingTasks.map((t) => [t.folder, t]));
    for (const existing of existingTasks) {
      if (existing.origin === "manual") {
        result.manual.push(existing.folder);
        continue;
      }
      if (existing.status === "done" || existing.status === "in_progress") {
        result.kept.push(existing.folder);
        continue;
      }
      if (existing.status === "cancelled") {
        this.deleteTask(featureName, existing.folder);
        result.removed.push(existing.folder);
        continue;
      }
      const stillInPlan = planTasks.some((p) => p.folder === existing.folder);
      if (!stillInPlan) {
        this.deleteTask(featureName, existing.folder);
        result.removed.push(existing.folder);
      } else {
        result.kept.push(existing.folder);
      }
    }
    for (const planTask of planTasks) {
      if (!existingByName.has(planTask.folder)) {
        this.createFromPlan(featureName, planTask, planTasks);
        result.created.push(planTask.folder);
      }
    }
    return result;
  }
  create(featureName, name, order) {
    const tasksPath = getTasksPath(this.projectRoot, featureName);
    const existingFolders = this.listFolders(featureName);
    const nextOrder = order ?? this.getNextOrder(existingFolders);
    const folder = `${String(nextOrder).padStart(2, "0")}-${name}`;
    const taskPath = getTaskPath(this.projectRoot, featureName, folder);
    ensureDir(taskPath);
    const status = {
      status: "pending",
      origin: "manual"
    };
    writeJson(getTaskStatusPath(this.projectRoot, featureName, folder), status);
    return folder;
  }
  createFromPlan(featureName, task, allTasks) {
    const taskPath = getTaskPath(this.projectRoot, featureName, task.folder);
    ensureDir(taskPath);
    const status = {
      status: "pending",
      origin: "plan"
    };
    writeJson(getTaskStatusPath(this.projectRoot, featureName, task.folder), status);
    const specLines = [
      `# Task ${task.order}: ${task.name}`,
      "",
      `**Feature:** ${featureName}`,
      `**Folder:** ${task.folder}`,
      `**Status:** pending`,
      "",
      "---",
      "",
      "## Description",
      "",
      task.description || "_No description provided in plan_",
      ""
    ];
    if (task.order > 1) {
      const priorTasks = allTasks.filter((t) => t.order < task.order);
      if (priorTasks.length > 0) {
        specLines.push("---", "", "## Prior Tasks", "");
        for (const prior of priorTasks) {
          specLines.push(`- **${prior.order}. ${prior.name}** (${prior.folder})`);
        }
        specLines.push("");
      }
    }
    const nextTasks = allTasks.filter((t) => t.order > task.order);
    if (nextTasks.length > 0) {
      specLines.push("---", "", "## Upcoming Tasks", "");
      for (const next of nextTasks) {
        specLines.push(`- **${next.order}. ${next.name}** (${next.folder})`);
      }
      specLines.push("");
    }
    writeText(getTaskSpecPath(this.projectRoot, featureName, task.folder), specLines.join(`
`));
  }
  writeSpec(featureName, taskFolder, content) {
    const specPath = getTaskSpecPath(this.projectRoot, featureName, taskFolder);
    writeText(specPath, content);
    return specPath;
  }
  update(featureName, taskFolder, updates) {
    const statusPath = getTaskStatusPath(this.projectRoot, featureName, taskFolder);
    const current = readJson(statusPath);
    if (!current) {
      throw new Error(`Task '${taskFolder}' not found`);
    }
    const updated = {
      ...current,
      ...updates
    };
    if (updates.status === "in_progress" && !current.startedAt) {
      updated.startedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    if (updates.status === "done" && !current.completedAt) {
      updated.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    writeJson(statusPath, updated);
    return updated;
  }
  get(featureName, taskFolder) {
    const statusPath = getTaskStatusPath(this.projectRoot, featureName, taskFolder);
    const status = readJson(statusPath);
    if (!status)
      return null;
    return {
      folder: taskFolder,
      name: taskFolder.replace(/^\d+-/, ""),
      status: status.status,
      origin: status.origin,
      summary: status.summary
    };
  }
  list(featureName) {
    const folders = this.listFolders(featureName);
    return folders.map((folder) => this.get(featureName, folder)).filter((t) => t !== null);
  }
  writeReport(featureName, taskFolder, report) {
    const reportPath = getTaskReportPath(this.projectRoot, featureName, taskFolder);
    writeText(reportPath, report);
    return reportPath;
  }
  listFolders(featureName) {
    const tasksPath = getTasksPath(this.projectRoot, featureName);
    if (!fileExists(tasksPath))
      return [];
    return fs4.readdirSync(tasksPath, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  }
  deleteTask(featureName, taskFolder) {
    const taskPath = getTaskPath(this.projectRoot, featureName, taskFolder);
    if (fileExists(taskPath)) {
      fs4.rmSync(taskPath, { recursive: true });
    }
  }
  getNextOrder(existingFolders) {
    if (existingFolders.length === 0)
      return 1;
    const orders = existingFolders.map((f) => parseInt(f.split("-")[0], 10)).filter((n) => !isNaN(n));
    return Math.max(...orders, 0) + 1;
  }
  parseTasksFromPlan(content) {
    const tasks = [];
    const lines = content.split(`
`);
    let currentTask = null;
    let descriptionLines = [];
    for (const line of lines) {
      const taskMatch = line.match(/^###\s+(\d+)\.\s+(.+)$/);
      if (taskMatch) {
        if (currentTask) {
          currentTask.description = descriptionLines.join(`
`).trim();
          tasks.push(currentTask);
        }
        const order = parseInt(taskMatch[1], 10);
        const rawName = taskMatch[2].trim();
        const folderName = rawName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
        const folder = `${String(order).padStart(2, "0")}-${folderName}`;
        currentTask = {
          folder,
          order,
          name: rawName,
          description: ""
        };
        descriptionLines = [];
      } else if (currentTask) {
        if (line.match(/^##\s+/) || line.match(/^###\s+[^0-9]/)) {
          currentTask.description = descriptionLines.join(`
`).trim();
          tasks.push(currentTask);
          currentTask = null;
          descriptionLines = [];
        } else {
          descriptionLines.push(line);
        }
      }
    }
    if (currentTask) {
      currentTask.description = descriptionLines.join(`
`).trim();
      tasks.push(currentTask);
    }
    return tasks;
  }
  createSubtask(featureName, taskFolder, name, type) {
    const subtasksPath = getSubtasksPath(this.projectRoot, featureName, taskFolder);
    ensureDir(subtasksPath);
    const existingFolders = this.listSubtaskFolders(featureName, taskFolder);
    const taskOrder = parseInt(taskFolder.split("-")[0], 10);
    const nextOrder = existingFolders.length + 1;
    const subtaskId = `${taskOrder}.${nextOrder}`;
    const folderName = `${nextOrder}-${this.slugify(name)}`;
    const subtaskPath = getSubtaskPath(this.projectRoot, featureName, taskFolder, folderName);
    ensureDir(subtaskPath);
    const subtaskStatus = {
      status: "pending",
      type,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    writeJson(getSubtaskStatusPath(this.projectRoot, featureName, taskFolder, folderName), subtaskStatus);
    const specContent = `# Subtask: ${name}

**Type:** ${type || "custom"}
**ID:** ${subtaskId}

## Instructions

_Add detailed instructions here_
`;
    writeText(getSubtaskSpecPath(this.projectRoot, featureName, taskFolder, folderName), specContent);
    return {
      id: subtaskId,
      name,
      folder: folderName,
      status: "pending",
      type,
      createdAt: subtaskStatus.createdAt
    };
  }
  updateSubtask(featureName, taskFolder, subtaskId, status) {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) {
      throw new Error(`Subtask '${subtaskId}' not found in task '${taskFolder}'`);
    }
    const statusPath = getSubtaskStatusPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    const current = readJson(statusPath);
    if (!current) {
      throw new Error(`Subtask status not found for '${subtaskId}'`);
    }
    const updated = { ...current, status };
    if (status === "done" && !current.completedAt) {
      updated.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    writeJson(statusPath, updated);
    const name = subtaskFolder.replace(/^\d+-/, "");
    return {
      id: subtaskId,
      name,
      folder: subtaskFolder,
      status,
      type: current.type,
      createdAt: current.createdAt,
      completedAt: updated.completedAt
    };
  }
  listSubtasks(featureName, taskFolder) {
    const folders = this.listSubtaskFolders(featureName, taskFolder);
    const taskOrder = parseInt(taskFolder.split("-")[0], 10);
    return folders.map((folder, index) => {
      const statusPath = getSubtaskStatusPath(this.projectRoot, featureName, taskFolder, folder);
      const status = readJson(statusPath);
      const name = folder.replace(/^\d+-/, "");
      const subtaskOrder = parseInt(folder.split("-")[0], 10) || index + 1;
      return {
        id: `${taskOrder}.${subtaskOrder}`,
        name,
        folder,
        status: status?.status || "pending",
        type: status?.type,
        createdAt: status?.createdAt,
        completedAt: status?.completedAt
      };
    });
  }
  deleteSubtask(featureName, taskFolder, subtaskId) {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) {
      throw new Error(`Subtask '${subtaskId}' not found in task '${taskFolder}'`);
    }
    const subtaskPath = getSubtaskPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    if (fileExists(subtaskPath)) {
      fs4.rmSync(subtaskPath, { recursive: true });
    }
  }
  getSubtask(featureName, taskFolder, subtaskId) {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder)
      return null;
    const statusPath = getSubtaskStatusPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    const status = readJson(statusPath);
    if (!status)
      return null;
    const taskOrder = parseInt(taskFolder.split("-")[0], 10);
    const subtaskOrder = parseInt(subtaskFolder.split("-")[0], 10);
    const name = subtaskFolder.replace(/^\d+-/, "");
    return {
      id: `${taskOrder}.${subtaskOrder}`,
      name,
      folder: subtaskFolder,
      status: status.status,
      type: status.type,
      createdAt: status.createdAt,
      completedAt: status.completedAt
    };
  }
  writeSubtaskSpec(featureName, taskFolder, subtaskId, content) {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) {
      throw new Error(`Subtask '${subtaskId}' not found in task '${taskFolder}'`);
    }
    const specPath = getSubtaskSpecPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    writeText(specPath, content);
    return specPath;
  }
  writeSubtaskReport(featureName, taskFolder, subtaskId, content) {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) {
      throw new Error(`Subtask '${subtaskId}' not found in task '${taskFolder}'`);
    }
    const reportPath = getSubtaskReportPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    writeText(reportPath, content);
    return reportPath;
  }
  readSubtaskSpec(featureName, taskFolder, subtaskId) {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder)
      return null;
    const specPath = getSubtaskSpecPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    return readText(specPath);
  }
  readSubtaskReport(featureName, taskFolder, subtaskId) {
    const subtaskFolder = this.findSubtaskFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder)
      return null;
    const reportPath = getSubtaskReportPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    return readText(reportPath);
  }
  listSubtaskFolders(featureName, taskFolder) {
    const subtasksPath = getSubtasksPath(this.projectRoot, featureName, taskFolder);
    if (!fileExists(subtasksPath))
      return [];
    return fs4.readdirSync(subtasksPath, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  }
  findSubtaskFolder(featureName, taskFolder, subtaskId) {
    const folders = this.listSubtaskFolders(featureName, taskFolder);
    const subtaskOrder = subtaskId.split(".")[1];
    return folders.find((f) => f.startsWith(`${subtaskOrder}-`)) || null;
  }
  slugify(name) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }
};
var SubtaskService = class {
  projectRoot;
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }
  create(featureName, taskFolder, name, type) {
    const subtasksPath = getSubtasksPath(this.projectRoot, featureName, taskFolder);
    ensureDir(subtasksPath);
    const existingFolders = this.listFolders(featureName, taskFolder);
    const taskOrder = parseInt(taskFolder.split("-")[0], 10);
    const nextOrder = existingFolders.length + 1;
    const subtaskId = `${taskOrder}.${nextOrder}`;
    const folderName = `${nextOrder}-${this.slugify(name)}`;
    const subtaskPath = getSubtaskPath(this.projectRoot, featureName, taskFolder, folderName);
    ensureDir(subtaskPath);
    const subtaskStatus = {
      status: "pending",
      type,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    writeJson(getSubtaskStatusPath(this.projectRoot, featureName, taskFolder, folderName), subtaskStatus);
    const specContent = `# Subtask: ${name}

**Type:** ${type || "custom"}
**ID:** ${subtaskId}

## Instructions

_Add detailed instructions here_
`;
    writeText(getSubtaskSpecPath(this.projectRoot, featureName, taskFolder, folderName), specContent);
    return {
      id: subtaskId,
      name,
      folder: folderName,
      status: "pending",
      type,
      createdAt: subtaskStatus.createdAt
    };
  }
  update(featureName, taskFolder, subtaskId, status) {
    const subtaskFolder = this.findFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) {
      throw new Error(`Subtask '${subtaskId}' not found in task '${taskFolder}'`);
    }
    const statusPath = getSubtaskStatusPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    const current = readJson(statusPath);
    if (!current) {
      throw new Error(`Subtask status not found for '${subtaskId}'`);
    }
    const updated = { ...current, status };
    if (status === "done" && !current.completedAt) {
      updated.completedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    writeJson(statusPath, updated);
    const name = subtaskFolder.replace(/^\d+-/, "");
    return {
      id: subtaskId,
      name,
      folder: subtaskFolder,
      status,
      type: current.type,
      createdAt: current.createdAt,
      completedAt: updated.completedAt
    };
  }
  list(featureName, taskFolder) {
    const folders = this.listFolders(featureName, taskFolder);
    const taskOrder = parseInt(taskFolder.split("-")[0], 10);
    return folders.map((folder, index) => {
      const statusPath = getSubtaskStatusPath(this.projectRoot, featureName, taskFolder, folder);
      const status = readJson(statusPath);
      const name = folder.replace(/^\d+-/, "");
      const subtaskOrder = parseInt(folder.split("-")[0], 10) || index + 1;
      return {
        id: `${taskOrder}.${subtaskOrder}`,
        name,
        folder,
        status: status?.status || "pending",
        type: status?.type,
        createdAt: status?.createdAt,
        completedAt: status?.completedAt
      };
    });
  }
  get(featureName, taskFolder, subtaskId) {
    const subtaskFolder = this.findFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder)
      return null;
    const statusPath = getSubtaskStatusPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    const status = readJson(statusPath);
    if (!status)
      return null;
    const taskOrder = parseInt(taskFolder.split("-")[0], 10);
    const subtaskOrder = parseInt(subtaskFolder.split("-")[0], 10);
    const name = subtaskFolder.replace(/^\d+-/, "");
    return {
      id: `${taskOrder}.${subtaskOrder}`,
      name,
      folder: subtaskFolder,
      status: status.status,
      type: status.type,
      createdAt: status.createdAt,
      completedAt: status.completedAt
    };
  }
  writeSpec(featureName, taskFolder, subtaskId, content) {
    const subtaskFolder = this.findFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) {
      throw new Error(`Subtask '${subtaskId}' not found in task '${taskFolder}'`);
    }
    const specPath = getSubtaskSpecPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    writeText(specPath, content);
    return specPath;
  }
  writeReport(featureName, taskFolder, subtaskId, content) {
    const subtaskFolder = this.findFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) {
      throw new Error(`Subtask '${subtaskId}' not found in task '${taskFolder}'`);
    }
    const reportPath = getSubtaskReportPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    writeText(reportPath, content);
    return reportPath;
  }
  readSpec(featureName, taskFolder, subtaskId) {
    const subtaskFolder = this.findFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder)
      return null;
    const specPath = getSubtaskSpecPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    return readText(specPath);
  }
  readReport(featureName, taskFolder, subtaskId) {
    const subtaskFolder = this.findFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder)
      return null;
    const reportPath = getSubtaskReportPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    return readText(reportPath);
  }
  delete(featureName, taskFolder, subtaskId) {
    const subtaskFolder = this.findFolder(featureName, taskFolder, subtaskId);
    if (!subtaskFolder) {
      throw new Error(`Subtask '${subtaskId}' not found in task '${taskFolder}'`);
    }
    const subtaskPath = getSubtaskPath(this.projectRoot, featureName, taskFolder, subtaskFolder);
    if (fileExists(subtaskPath)) {
      fs5.rmSync(subtaskPath, { recursive: true });
    }
  }
  listFolders(featureName, taskFolder) {
    const subtasksPath = getSubtasksPath(this.projectRoot, featureName, taskFolder);
    if (!fileExists(subtasksPath))
      return [];
    return fs5.readdirSync(subtasksPath, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  }
  findFolder(featureName, taskFolder, subtaskId) {
    const folders = this.listFolders(featureName, taskFolder);
    const subtaskOrder = subtaskId.split(".")[1];
    return folders.find((f) => f.startsWith(`${subtaskOrder}-`)) || null;
  }
  slugify(name) {
    return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }
};
var import_file_exists = __toESM2(require_dist(), 1);
var import_debug = __toESM2(require_src(), 1);
var import_promise_deferred = __toESM2(require_dist2(), 1);
var import_promise_deferred2 = __toESM2(require_dist2(), 1);
var __defProp22 = Object.defineProperty;
var __getOwnPropDesc2 = Object.getOwnPropertyDescriptor;
var __getOwnPropNames22 = Object.getOwnPropertyNames;
var __hasOwnProp22 = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames22(fn)[0]])(fn = 0)), res;
};
var __commonJS2 = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames22(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export2 = (target, all) => {
  for (var name in all)
    __defProp22(target, name, { get: all[name], enumerable: true });
};
var __copyProps2 = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames22(from))
      if (!__hasOwnProp22.call(to, key) && key !== except)
        __defProp22(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc2(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS2 = (mod) => __copyProps2(__defProp22({}, "__esModule", { value: true }), mod);
function pathspec(...paths) {
  const key = new String(paths);
  cache.set(key, paths);
  return key;
}
function isPathSpec(path32) {
  return path32 instanceof String && cache.has(path32);
}
function toPaths(pathSpec) {
  return cache.get(pathSpec) || [];
}
var cache;
var init_pathspec = __esm({
  "src/lib/args/pathspec.ts"() {
    cache = /* @__PURE__ */ new WeakMap();
  }
});
var GitError;
var init_git_error = __esm({
  "src/lib/errors/git-error.ts"() {
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
var init_git_response_error = __esm({
  "src/lib/errors/git-response-error.ts"() {
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
var init_task_configuration_error = __esm({
  "src/lib/errors/task-configuration-error.ts"() {
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
function toLinesWithContent(input = "", trimmed2 = true, separator = `
`) {
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
function folderExists(path32) {
  return import_file_exists.exists(path32, import_file_exists.FOLDER);
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
    return;
  }
  return input;
}
var NULL;
var NOOP;
var objectToString;
var init_util = __esm({
  "src/lib/utils/util.ts"() {
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
var init_argument_filters = __esm({
  "src/lib/utils/argument-filters.ts"() {
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
var init_exit_codes = __esm({
  "src/lib/utils/exit-codes.ts"() {
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
var init_git_output_streams = __esm({
  "src/lib/utils/git-output-streams.ts"() {
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
var init_line_parser = __esm({
  "src/lib/utils/line-parser.ts"() {
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
  const config = Object.assign({ baseDir, ...defaultOptions }, ...options.filter((o) => typeof o === "object" && o));
  config.baseDir = config.baseDir || baseDir;
  config.trimmed = config.trimmed === true;
  return config;
}
var defaultOptions;
var init_simple_git_options = __esm({
  "src/lib/utils/simple-git-options.ts"() {
    defaultOptions = {
      binary: "git",
      maxConcurrentProcesses: 5,
      config: [],
      trimmed: false
    };
  }
});
function appendTaskOptions(options, commands5 = []) {
  if (!filterPlainObject(options)) {
    return commands5;
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
  }, commands5);
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
var init_task_options = __esm({
  "src/lib/utils/task-options.ts"() {
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
      parsers12.some(({ parse: parse2 }) => parse2(line, result));
    }
  });
  return result;
}
var init_task_parser = __esm({
  "src/lib/utils/task-parser.ts"() {
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
var init_utils = __esm({
  "src/lib/utils/index.ts"() {
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
  const commands5 = ["rev-parse", "--is-inside-work-tree"];
  return {
    commands: commands5,
    format: "utf-8",
    onError,
    parser
  };
}
function checkIsRepoRootTask() {
  const commands5 = ["rev-parse", "--git-dir"];
  return {
    commands: commands5,
    format: "utf-8",
    onError,
    parser(path32) {
      return /^\.(git)?$/.test(path32.trim());
    }
  };
}
function checkIsBareRepoTask() {
  const commands5 = ["rev-parse", "--is-bare-repository"];
  return {
    commands: commands5,
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
var init_check_is_repo = __esm({
  "src/lib/tasks/check-is-repo.ts"() {
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
var init_CleanSummary = __esm({
  "src/lib/responses/CleanSummary.ts"() {
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
function straightThroughStringTask(commands5, trimmed2 = false) {
  return {
    commands: commands5,
    format: "utf-8",
    parser(text) {
      return trimmed2 ? String(text).trim() : text;
    }
  };
}
function straightThroughBufferTask(commands5) {
  return {
    commands: commands5,
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
var init_task = __esm({
  "src/lib/tasks/task.ts"() {
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
  const commands5 = ["clean", `-${mode}`, ...customArgs];
  return {
    commands: commands5,
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
var init_clean = __esm({
  "src/lib/tasks/clean.ts"() {
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
    if (value.includes(`
`)) {
      const line = splitOn(value, `
`);
      key = line[0];
      value = line[1];
    }
    yield { file, key, value };
  }
}
var ConfigList;
var init_ConfigList = __esm({
  "src/lib/responses/ConfigList.ts"() {
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
  const commands5 = ["config", `--${scope}`];
  if (append2) {
    commands5.push("--add");
  }
  commands5.push(key, value);
  return {
    commands: commands5,
    format: "utf-8",
    parser(text) {
      return text;
    }
  };
}
function getConfigTask(key, scope) {
  const commands5 = ["config", "--null", "--show-origin", "--get-all", key];
  if (scope) {
    commands5.splice(1, 0, `--${scope}`);
  }
  return {
    commands: commands5,
    format: "utf-8",
    parser(text) {
      return configGetParser(text, key);
    }
  };
}
function listConfigTask(scope) {
  const commands5 = ["config", "--list", "--show-origin", "--null"];
  if (scope) {
    commands5.push(`--${scope}`);
  }
  return {
    commands: commands5,
    format: "utf-8",
    parser(text) {
      return configListParser(text);
    }
  };
}
function config_default() {
  return {
    addConfig(key, value, ...rest) {
      return this._runTask(addConfigTask(key, value, rest[0] === true, asConfigScope(rest[1], "local")), trailingFunctionArgument(arguments));
    },
    getConfig(key, scope) {
      return this._runTask(getConfigTask(key, asConfigScope(scope, void 0)), trailingFunctionArgument(arguments));
    },
    listConfig(...rest) {
      return this._runTask(listConfigTask(asConfigScope(rest[0], void 0)), trailingFunctionArgument(arguments));
    }
  };
}
var GitConfigScope;
var init_config = __esm({
  "src/lib/tasks/config.ts"() {
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
var init_diff_name_status = __esm({
  "src/lib/tasks/diff-name-status.ts"() {
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
    const [path32, line, preview] = input.split(NULL);
    paths.add(path32);
    (results[path32] = results[path32] || []).push({
      line: asNumber(line),
      path: path32,
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
          return this._runTask(configurationErrorTask(`git.grep: use of "${option}" is not supported.`), then);
        }
      }
      if (typeof searchTerm === "string") {
        searchTerm = grepQueryBuilder().param(searchTerm);
      }
      const commands5 = ["grep", "--null", "-n", "--full-name", ...options, ...searchTerm];
      return this._runTask({
        commands: commands5,
        format: "utf-8",
        parser(stdOut) {
          return parseGrep(stdOut);
        }
      }, then);
    }
  };
}
var disallowedOptions;
var Query;
var _a;
var GrepQuery;
var init_grep = __esm({
  "src/lib/tasks/grep.ts"() {
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
  const commands5 = ["reset"];
  if (isValidResetMode(mode)) {
    commands5.push(`--${mode}`);
  }
  commands5.push(...customArgs);
  return straightThroughStringTask(commands5);
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
var init_reset = __esm({
  "src/lib/tasks/reset.ts"() {
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
  return import_debug.default("simple-git");
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
    return append(spawned, createLogger(label, key.replace(/^[^:]+/, name), initial, infoDebugger));
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
var init_git_logger = __esm({
  "src/lib/git-logger.ts"() {
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
var init_tasks_pending_queue = __esm({
  "src/lib/runners/tasks-pending-queue.ts"() {
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
            logger(`Fatal exception, any as-yet un-started tasks run through this executor will not be attempted`);
          } else {
            logger.info(`A fatal exception occurred in a previous task, the queue has been purged: %o`, err.message);
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
function pluginContext(task, commands5) {
  return {
    method: first(task.commands) || "",
    commands: commands5
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
var init_git_executor_chain = __esm({
  "src/lib/runners/git-executor-chain.ts"() {
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
        const args = this._plugins.exec("spawn.args", [...task.commands], pluginContext(task, task.commands));
        const raw = await this.gitResponse(task, binary, args, this.outputHandler, logger.step("SPAWN"));
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
          const { error } = this._plugins.exec("task.error", { error: rejection }, {
            ...pluginContext(task, args),
            ...result
          });
          if (error && task.onError) {
            logger.info(`exitCode=%s handling with custom error handler`);
            return task.onError(result, error, (newStdOut) => {
              logger.info(`custom error handler treated as success`);
              logger(`custom error returned a %s`, objectToString(newStdOut));
              done(new GitOutputStreams(Array.isArray(newStdOut) ? Buffer.concat(newStdOut) : newStdOut, Buffer.concat(stdErr)));
            }, fail);
          }
          if (error) {
            logger.info(`handling as error: exitCode=%s stdErr=%s rejection=%o`, exitCode, stdErr.length, rejection);
            return fail(error);
          }
          logger.info(`retrieving task output complete`);
          done(new GitOutputStreams(Buffer.concat(stdOut), Buffer.concat(stdErr)));
        });
      }
      async gitResponse(task, command, args, outputHandler, logger) {
        const outputLogger = logger.sibling("output");
        const spawnOptions = this._plugins.exec("spawn.options", {
          cwd: this.cwd,
          env: this.env,
          windowsHide: true
        }, pluginContext(task, task.commands));
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
          const spawned = (0, import_child_process.spawn)(command, args, spawnOptions);
          spawned.stdout.on("data", onDataReceived(stdOut, "stdOut", logger, outputLogger.step("stdOut")));
          spawned.stderr.on("data", onDataReceived(stdErr, "stdErr", logger, outputLogger.step("stdErr")));
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
var init_git_executor = __esm({
  "src/lib/runners/git-executor.ts"() {
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
      callback(err instanceof GitResponseError ? addDeprecationNoticeToError(err) : err, void 0);
    }
  };
  response.then(onSuccess, onError2);
}
function addDeprecationNoticeToError(err) {
  let log = (name) => {
    console.warn(`simple-git deprecation notice: accessing GitResponseError.${name} should be GitResponseError.git.${name}, this will no longer be available in version 3`);
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
var init_task_callback = __esm({
  "src/lib/task-callback.ts"() {
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
var init_change_working_directory = __esm({
  "src/lib/tasks/change-working-directory.ts"() {
    init_utils();
    init_task();
  }
});
function checkoutTask(args) {
  const commands5 = ["checkout", ...args];
  if (commands5[1] === "-b" && commands5.includes("-B")) {
    commands5[1] = remove(commands5, "-B");
  }
  return straightThroughStringTask(commands5);
}
function checkout_default() {
  return {
    checkout() {
      return this._runTask(checkoutTask(getTrailingOptions(arguments, 1)), trailingFunctionArgument(arguments));
    },
    checkoutBranch(branchName, startPoint) {
      return this._runTask(checkoutTask(["-b", branchName, startPoint, ...getTrailingOptions(arguments)]), trailingFunctionArgument(arguments));
    },
    checkoutLocalBranch(branchName) {
      return this._runTask(checkoutTask(["-b", branchName, ...getTrailingOptions(arguments)]), trailingFunctionArgument(arguments));
    }
  };
}
var init_checkout = __esm({
  "src/lib/tasks/checkout.ts"() {
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
var init_count_objects = __esm({
  "src/lib/tasks/count-objects.ts"() {
    init_utils();
    parser2 = new LineParser(/([a-z-]+): (\d+)$/, (result, [key, value]) => {
      const property = asCamelCase(key);
      if (Object.hasOwn(result, property)) {
        result[property] = asNumber(value);
      }
    });
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
var init_parse_commit = __esm({
  "src/lib/parsers/parse-commit.ts"() {
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
      new LineParser(/(\d+)[^,]*(?:,\s*(\d+)[^,]*)(?:,\s*(\d+))/g, (result, [changes, insertions, deletions]) => {
        result.summary.changes = parseInt(changes, 10) || 0;
        result.summary.insertions = parseInt(insertions, 10) || 0;
        result.summary.deletions = parseInt(deletions, 10) || 0;
      }),
      new LineParser(/^(\d+)[^,]*(?:,\s*(\d+)[^(]+\(([+-]))?/, (result, [changes, lines, direction]) => {
        result.summary.changes = parseInt(changes, 10) || 0;
        const count = parseInt(lines, 10) || 0;
        if (direction === "-") {
          result.summary.deletions = count;
        } else if (direction === "+") {
          result.summary.insertions = count;
        }
      })
    ];
  }
});
function commitTask(message, files, customArgs) {
  const commands5 = [
    "-c",
    "core.abbrev=40",
    "commit",
    ...prefixedArray(message, "-m"),
    ...files,
    ...customArgs
  ];
  return {
    commands: commands5,
    format: "utf-8",
    parser: parseCommitResult
  };
}
function commit_default() {
  return {
    commit(message, ...rest) {
      const next = trailingFunctionArgument(arguments);
      const task = rejectDeprecatedSignatures(message) || commitTask(asArray(message), asArray(filterType(rest[0], filterStringOrStringArray, [])), [
        ...asStringArray(filterType(rest[1], filterArray, [])),
        ...getTrailingOptions(arguments, 0, true)
      ]);
      return this._runTask(task, next);
    }
  };
  function rejectDeprecatedSignatures(message) {
    return !filterStringOrStringArray(message) && configurationErrorTask(`git.commit: requires the commit message to be supplied as a string/string[]`);
  }
}
var init_commit = __esm({
  "src/lib/tasks/commit.ts"() {
    init_parse_commit();
    init_utils();
    init_task();
  }
});
function first_commit_default() {
  return {
    firstCommit() {
      return this._runTask(straightThroughStringTask(["rev-list", "--max-parents=0", "HEAD"], true), trailingFunctionArgument(arguments));
    }
  };
}
var init_first_commit = __esm({
  "src/lib/tasks/first-commit.ts"() {
    init_utils();
    init_task();
  }
});
function hashObjectTask(filePath, write) {
  const commands5 = ["hash-object", filePath];
  if (write) {
    commands5.push("-w");
  }
  return straightThroughStringTask(commands5, true);
}
var init_hash_object = __esm({
  "src/lib/tasks/hash-object.ts"() {
    init_task();
  }
});
function parseInit(bare, path32, text) {
  const response = String(text).trim();
  let result;
  if (result = initResponseRegex.exec(response)) {
    return new InitSummary(bare, path32, false, result[1]);
  }
  if (result = reInitResponseRegex.exec(response)) {
    return new InitSummary(bare, path32, true, result[1]);
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
  return new InitSummary(bare, path32, /^re/i.test(response), gitDir);
}
var InitSummary;
var initResponseRegex;
var reInitResponseRegex;
var init_InitSummary = __esm({
  "src/lib/responses/InitSummary.ts"() {
    InitSummary = class {
      constructor(bare, path32, existing, gitDir) {
        this.bare = bare;
        this.path = path32;
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
function initTask(bare = false, path32, customArgs) {
  const commands5 = ["init", ...customArgs];
  if (bare && !hasBareCommand(commands5)) {
    commands5.splice(1, 0, bareCommand);
  }
  return {
    commands: commands5,
    format: "utf-8",
    parser(text) {
      return parseInit(commands5.includes("--bare"), path32, text);
    }
  };
}
var bareCommand;
var init_init = __esm({
  "src/lib/tasks/init.ts"() {
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
var init_log_format = __esm({
  "src/lib/args/log-format.ts"() {
    logFormatRegex = /^--(stat|numstat|name-only|name-status)(=|$)/;
  }
});
var DiffSummary;
var init_DiffSummary = __esm({
  "src/lib/responses/DiffSummary.ts"() {
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
var init_parse_diff_summary = __esm({
  "src/lib/parsers/parse-diff-summary.ts"() {
    init_log_format();
    init_DiffSummary();
    init_diff_name_status();
    init_utils();
    statParser = [
      new LineParser(/^(.+)\s+\|\s+(\d+)(\s+[+\-]+)?$/, (result, [file, changes, alterations = ""]) => {
        result.files.push({
          file: file.trim(),
          changes: asNumber(changes),
          insertions: alterations.replace(/[^+]/g, "").length,
          deletions: alterations.replace(/[^-]/g, "").length,
          binary: false
        });
      }),
      new LineParser(/^(.+) \|\s+Bin ([0-9.]+) -> ([0-9.]+) ([a-z]+)/, (result, [file, before, after]) => {
        result.files.push({
          file: file.trim(),
          before: asNumber(before),
          after: asNumber(after),
          binary: true
        });
      }),
      new LineParser(/(\d+) files? changed\s*((?:, \d+ [^,]+){0,2})/, (result, [changed, summary]) => {
        const inserted = /(\d+) i/.exec(summary);
        const deleted = /(\d+) d/.exec(summary);
        result.changed = asNumber(changed);
        result.insertions = asNumber(inserted?.[1]);
        result.deletions = asNumber(deleted?.[1]);
      })
    ];
    numStatParser = [
      new LineParser(/(\d+)\t(\d+)\t(.+)$/, (result, [changesInsert, changesDelete, file]) => {
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
      }),
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
      new LineParser(/([ACDMRTUXB])([0-9]{0,3})\t(.[^\t]*)(\t(.[^\t]*))?$/, (result, [status, similarity, from, _to, to]) => {
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
      })
    ];
    diffSummaryParsers = {
      [""]: statParser,
      ["--stat"]: statParser,
      ["--numstat"]: numStatParser,
      ["--name-status"]: nameStatusParser,
      ["--name-only"]: nameOnlyParser
    };
  }
});
function lineBuilder(tokens, fields) {
  return fields.reduce((line, field, index) => {
    line[field] = tokens[index] || "";
    return line;
  }, /* @__PURE__ */ Object.create({ diff: null }));
}
function createListLogSummaryParser(splitter = SPLITTER, fields = defaultFieldNames, logFormat = "") {
  const parseDiffResult = getDiffParser(logFormat);
  return function(stdOut) {
    const all = toLinesWithContent(stdOut.trim(), false, START_BOUNDARY).map(function(item) {
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
var init_parse_list_log_summary = __esm({
  "src/lib/parsers/parse-list-log-summary.ts"() {
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
  const commands5 = ["diff"];
  if (logFormat === "") {
    logFormat = "--stat";
    commands5.push("--stat=4096");
  }
  commands5.push(...customArgs);
  return validateLogFormatConfig(commands5) || {
    commands: commands5,
    format: "utf-8",
    parser: getDiffParser(logFormat)
  };
}
function validateLogFormatConfig(customArgs) {
  const flags = customArgs.filter(isLogFormat);
  if (flags.length > 1) {
    return configurationErrorTask(`Summary flags are mutually exclusive - pick one of ${flags.join(",")}`);
  }
  if (flags.length && customArgs.includes("-z")) {
    return configurationErrorTask(`Summary flag ${flags} parsing is not compatible with null termination option '-z'`);
  }
}
var init_diff = __esm({
  "src/lib/tasks/diff.ts"() {
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
      const options = parseLogOptions(trailingOptionsArgument(arguments), asStringArray(filterType(arguments[0], filterArray, [])));
      const task = rejectDeprecatedSignatures(...rest) || validateLogFormatConfig(options.commands) || createLogTask(options);
      return this._runTask(task, next);
    }
  };
  function createLogTask(options) {
    return logTask(options.splitter, options.fields, options.commands);
  }
  function rejectDeprecatedSignatures(from, to) {
    return filterString(from) && filterString(to) && configurationErrorTask(`git.log(string, string) should be replaced with git.log({ from: string, to: string })`);
  }
}
var excludeOptions;
var init_log = __esm({
  "src/lib/tasks/log.ts"() {
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
var init_MergeSummary = __esm({
  "src/lib/responses/MergeSummary.ts"() {
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
var init_PullSummary = __esm({
  "src/lib/responses/PullSummary.ts"() {
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
var init_parse_remote_objects = __esm({
  "src/lib/parsers/parse-remote-objects.ts"() {
    init_utils();
    remoteMessagesObjectParsers = [
      new RemoteLineParser(/^remote:\s*(enumerating|counting|compressing) objects: (\d+),/i, (result, [action, count]) => {
        const key = action.toLowerCase();
        const enumeration = objectEnumerationResult(result.remoteMessages);
        Object.assign(enumeration, { [key]: asNumber(count) });
      }),
      new RemoteLineParser(/^remote:\s*(enumerating|counting|compressing) objects: \d+% \(\d+\/(\d+)\),/i, (result, [action, count]) => {
        const key = action.toLowerCase();
        const enumeration = objectEnumerationResult(result.remoteMessages);
        Object.assign(enumeration, { [key]: asNumber(count) });
      }),
      new RemoteLineParser(/total ([^,]+), reused ([^,]+), pack-reused (\d+)/i, (result, [total, reused, packReused]) => {
        const objects = objectEnumerationResult(result.remoteMessages);
        objects.total = asObjectCount(total);
        objects.reused = asObjectCount(reused);
        objects.packReused = asNumber(packReused);
      })
    ];
  }
});
function parseRemoteMessages(_stdOut, stdErr) {
  return parseStringResponse({ remoteMessages: new RemoteMessageSummary() }, parsers2, stdErr);
}
var parsers2;
var RemoteMessageSummary;
var init_parse_remote_messages = __esm({
  "src/lib/parsers/parse-remote-messages.ts"() {
    init_utils();
    init_parse_remote_objects();
    parsers2 = [
      new RemoteLineParser(/^remote:\s*(.+)$/, (result, [text]) => {
        result.remoteMessages.all.push(text.trim());
        return false;
      }),
      ...remoteMessagesObjectParsers,
      new RemoteLineParser([/create a (?:pull|merge) request/i, /\s(https?:\/\/\S+)$/], (result, [pullRequestUrl]) => {
        result.remoteMessages.pullRequestUrl = pullRequestUrl;
      }),
      new RemoteLineParser([/found (\d+) vulnerabilities.+\(([^)]+)\)/i, /\s(https?:\/\/\S+)$/], (result, [count, summary, url]) => {
        result.remoteMessages.vulnerabilities = {
          count: asNumber(count),
          summary,
          url
        };
      })
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
var init_parse_pull = __esm({
  "src/lib/parsers/parse-pull.ts"() {
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
      new LineParser(/([a-z0-9]+)\.\.([a-z0-9]+)\s+(\S+)\s+->\s+(\S+)$/, (result, [hashLocal, hashRemote, branchLocal, branchRemote]) => {
        result.branch.local = branchLocal;
        result.hash.local = hashLocal;
        result.branch.remote = branchRemote;
        result.hash.remote = hashRemote;
      })
    ];
    parsePullDetail = (stdOut, stdErr) => {
      return parseStringResponse(new PullSummary(), parsers3, [stdOut, stdErr]);
    };
    parsePullResult = (stdOut, stdErr) => {
      return Object.assign(new PullSummary(), parsePullDetail(stdOut, stdErr), parseRemoteMessages(stdOut, stdErr));
    };
  }
});
var parsers4;
var parseMergeResult;
var parseMergeDetail;
var init_parse_merge = __esm({
  "src/lib/parsers/parse-merge.ts"() {
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
      new LineParser(/^CONFLICT\s+\((.+\/delete)\): (.+) deleted in (.+) and/, (summary, [reason, file, deleteRef]) => {
        summary.conflicts.push(new MergeSummaryConflict(reason, file, { deleteRef }));
      }),
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
var init_merge = __esm({
  "src/lib/tasks/merge.ts"() {
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
var init_parse_push = __esm({
  "src/lib/parsers/parse-push.ts"() {
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
      new LineParser(/^Branch '([^']+)' set up to track remote branch '([^']+)' from '([^']+)'/, (result, [local, remote, remoteName]) => {
        result.branch = {
          ...result.branch || {},
          local,
          remote,
          remoteName
        };
      }),
      new LineParser(/^([^:]+):(\S+)\s+([a-z0-9]+)\.\.([a-z0-9]+)$/, (result, [local, remote, from, to]) => {
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
      })
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
  const commands5 = ["push", ...customArgs];
  if (ref.branch) {
    commands5.splice(1, 0, ref.branch);
  }
  if (ref.remote) {
    commands5.splice(1, 0, ref.remote);
  }
  remove(commands5, "-v");
  append(commands5, "--verbose");
  append(commands5, "--porcelain");
  return {
    commands: commands5,
    format: "utf-8",
    parser: parsePushResult
  };
}
var init_push = __esm({
  "src/lib/tasks/push.ts"() {
    init_parse_push();
    init_utils();
  }
});
function show_default() {
  return {
    showBuffer() {
      const commands5 = ["show", ...getTrailingOptions(arguments, 1)];
      if (!commands5.includes("--binary")) {
        commands5.splice(1, 0, "--binary");
      }
      return this._runTask(straightThroughBufferTask(commands5), trailingFunctionArgument(arguments));
    },
    show() {
      const commands5 = ["show", ...getTrailingOptions(arguments, 1)];
      return this._runTask(straightThroughStringTask(commands5), trailingFunctionArgument(arguments));
    }
  };
}
var init_show = __esm({
  "src/lib/tasks/show.ts"() {
    init_utils();
    init_task();
  }
});
var fromPathRegex;
var FileStatusSummary;
var init_FileStatusSummary = __esm({
  "src/lib/responses/FileStatusSummary.ts"() {
    fromPathRegex = /^(.+)\0(.+)$/;
    FileStatusSummary = class {
      constructor(path32, index, working_dir) {
        this.path = path32;
        this.index = index;
        this.working_dir = working_dir;
        if (index === "R" || working_dir === "R") {
          const detail = fromPathRegex.exec(path32) || [null, path32, path32];
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
  function data(index, workingDir, path32) {
    const raw = `${index}${workingDir}`;
    const handler = parsers6.get(raw);
    if (handler) {
      handler(result, path32);
    }
    if (raw !== "##" && raw !== "!!") {
      result.files.push(new FileStatusSummary(path32, index, workingDir));
    }
  }
}
var StatusSummary;
var parsers6;
var parseStatusSummary;
var init_StatusSummary = __esm({
  "src/lib/responses/StatusSummary.ts"() {
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
      parser3(" ", "A", (result, file) => append(result.created, file)),
      parser3(" ", "D", (result, file) => append(result.deleted, file)),
      parser3(" ", "M", (result, file) => append(result.modified, file)),
      parser3("A", " ", (result, file) => append(result.created, file) && append(result.staged, file)),
      parser3("A", "M", (result, file) => append(result.created, file) && append(result.staged, file) && append(result.modified, file)),
      parser3("D", " ", (result, file) => append(result.deleted, file) && append(result.staged, file)),
      parser3("M", " ", (result, file) => append(result.modified, file) && append(result.staged, file)),
      parser3("M", "M", (result, file) => append(result.modified, file) && append(result.staged, file)),
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
      parser3("?", "?", (result, file) => append(result.not_added, file)),
      ...conflicts("A", "A", "U"),
      ...conflicts("D", "D", "U"),
      ...conflicts("U", "A", "D", "U"),
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
  const commands5 = [
    "status",
    "--porcelain",
    "-b",
    "-u",
    "--null",
    ...customArgs.filter((arg) => !ignoredOptions.includes(arg))
  ];
  return {
    format: "utf-8",
    commands: commands5,
    parser(text) {
      return parseStatusSummary(text);
    }
  };
}
var ignoredOptions;
var init_status = __esm({
  "src/lib/tasks/status.ts"() {
    init_StatusSummary();
    ignoredOptions = ["--null", "-z"];
  }
});
function versionResponse(major = 0, minor = 0, patch = 0, agent = "", installed = true) {
  return Object.defineProperty({
    major,
    minor,
    patch,
    agent,
    installed
  }, "toString", {
    value() {
      return `${this.major}.${this.minor}.${this.patch}`;
    },
    configurable: false,
    enumerable: false
  });
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
var init_version = __esm({
  "src/lib/tasks/version.ts"() {
    init_utils();
    NOT_INSTALLED = "installed=false";
    parsers7 = [
      new LineParser(/version (\d+)\.(\d+)\.(\d+)(?:\s*\((.+)\))?/, (result, [major, minor, patch, agent = ""]) => {
        Object.assign(result, versionResponse(asNumber(major), asNumber(minor), asNumber(patch), agent));
      }),
      new LineParser(/version (\d+)\.(\d+)\.(\D+)(.+)?$/, (result, [major, minor, patch, agent = ""]) => {
        Object.assign(result, versionResponse(asNumber(major), asNumber(minor), patch, agent));
      })
    ];
  }
});
var simple_git_api_exports = {};
__export2(simple_git_api_exports, {
  SimpleGitApi: () => SimpleGitApi
});
var SimpleGitApi;
var init_simple_git_api = __esm({
  "src/lib/simple-git-api.ts"() {
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
        return this._runTask(straightThroughStringTask(["add", ...asArray(files)]), trailingFunctionArgument(arguments));
      }
      cwd(directory) {
        const next = trailingFunctionArgument(arguments);
        if (typeof directory === "string") {
          return this._runTask(changeWorkingDirectoryTask(directory, this._executor), next);
        }
        if (typeof directory?.path === "string") {
          return this._runTask(changeWorkingDirectoryTask(directory.path, directory.root && this._executor || void 0), next);
        }
        return this._runTask(configurationErrorTask("Git.cwd: workingDirectory must be supplied as a string"), next);
      }
      hashObject(path32, write) {
        return this._runTask(hashObjectTask(path32, write === true), trailingFunctionArgument(arguments));
      }
      init(bare) {
        return this._runTask(initTask(bare === true, this._executor.cwd, getTrailingOptions(arguments)), trailingFunctionArgument(arguments));
      }
      merge() {
        return this._runTask(mergeTask(getTrailingOptions(arguments)), trailingFunctionArgument(arguments));
      }
      mergeFromTo(remote, branch) {
        if (!(filterString(remote) && filterString(branch))) {
          return this._runTask(configurationErrorTask(`Git.mergeFromTo requires that the 'remote' and 'branch' arguments are supplied as strings`));
        }
        return this._runTask(mergeTask([remote, branch, ...getTrailingOptions(arguments)]), trailingFunctionArgument(arguments, false));
      }
      outputHandler(handler) {
        this._executor.outputHandler = handler;
        return this;
      }
      push() {
        const task = pushTask({
          remote: filterType(arguments[0], filterString),
          branch: filterType(arguments[1], filterString)
        }, getTrailingOptions(arguments));
        return this._runTask(task, trailingFunctionArgument(arguments));
      }
      stash() {
        return this._runTask(straightThroughStringTask(["stash", ...getTrailingOptions(arguments)]), trailingFunctionArgument(arguments));
      }
      status() {
        return this._runTask(statusTask(getTrailingOptions(arguments)), trailingFunctionArgument(arguments));
      }
    };
    Object.assign(SimpleGitApi.prototype, checkout_default(), commit_default(), config_default(), count_objects_default(), first_commit_default(), grep_default(), log_default(), show_default(), version_default());
  }
});
var scheduler_exports = {};
__export2(scheduler_exports, {
  Scheduler: () => Scheduler
});
var createScheduledTask;
var Scheduler;
var init_scheduler = __esm({
  "src/lib/runners/scheduler.ts"() {
    init_utils();
    init_git_logger();
    createScheduledTask = /* @__PURE__ */ (() => {
      let id = 0;
      return () => {
        id++;
        const { promise, done } = import_promise_deferred.createDeferred();
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
          this.logger(`Schedule attempt ignored, pending=%s running=%s concurrency=%s`, this.pending.length, this.running.length, this.concurrency);
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
var init_apply_patch = __esm({
  "src/lib/tasks/apply-patch.ts"() {
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
var init_BranchDeleteSummary = __esm({
  "src/lib/responses/BranchDeleteSummary.ts"() {
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
var init_parse_branch_delete = __esm({
  "src/lib/parsers/parse-branch-delete.ts"() {
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
var init_BranchSummary = __esm({
  "src/lib/responses/BranchSummary.ts"() {
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
  return parseStringResponse(new BranchSummaryResult(), currentOnly ? [currentBranchParser] : parsers9, stdOut);
}
var parsers9;
var currentBranchParser;
var init_parse_branch = __esm({
  "src/lib/parsers/parse-branch.ts"() {
    init_BranchSummary();
    init_utils();
    parsers9 = [
      new LineParser(/^([*+]\s)?\((?:HEAD )?detached (?:from|at) (\S+)\)\s+([a-z0-9]+)\s(.*)$/, (result, [current, name, commit, label]) => {
        result.push(branchStatus(current), true, name, commit, label);
      }),
      new LineParser(/^([*+]\s)?(\S+)\s+([a-z0-9]+)\s?(.*)$/s, (result, [current, name, commit, label]) => {
        result.push(branchStatus(current), false, name, commit, label);
      })
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
function containsDeleteBranchCommand(commands5) {
  const deleteCommands = ["-d", "-D", "--delete"];
  return commands5.some((command) => deleteCommands.includes(command));
}
function branchTask(customArgs) {
  const isDelete = containsDeleteBranchCommand(customArgs);
  const isCurrentOnly = customArgs.includes("--show-current");
  const commands5 = ["branch", ...customArgs];
  if (commands5.length === 1) {
    commands5.push("-a");
  }
  if (!commands5.includes("-v")) {
    commands5.splice(1, 0, "-v");
  }
  return {
    format: "utf-8",
    commands: commands5,
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
      throw new GitResponseError(task.parser(bufferToString(stdOut), bufferToString(stdErr)), String(error));
    }
  };
  return task;
}
var init_branch = __esm({
  "src/lib/tasks/branch.ts"() {
    init_git_response_error();
    init_parse_branch_delete();
    init_parse_branch();
    init_utils();
  }
});
function toPath(input) {
  const path32 = input.trim().replace(/^["']|["']$/g, "");
  return path32 && (0, import_node_path.normalize)(path32);
}
var parseCheckIgnore;
var init_CheckIgnore = __esm({
  "src/lib/responses/CheckIgnore.ts"() {
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
var init_check_ignore = __esm({
  "src/lib/tasks/check-ignore.ts"() {
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
  const commands5 = ["clone", ...customArgs];
  filterString(repo) && commands5.push(repo);
  filterString(directory) && commands5.push(directory);
  const banned = commands5.find(disallowedCommand);
  if (banned) {
    return configurationErrorTask(`git.fetch: potential exploit argument blocked.`);
  }
  return straightThroughStringTask(commands5);
}
function cloneMirrorTask(repo, directory, customArgs) {
  append(customArgs, "--mirror");
  return cloneTask(repo, directory, customArgs);
}
var init_clone = __esm({
  "src/lib/tasks/clone.ts"() {
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
var init_parse_fetch = __esm({
  "src/lib/parsers/parse-fetch.ts"() {
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
      new LineParser(/\s*([^.]+)\.\.(\S+)\s+(\S+)\s*-> (.+)$/, (result, [from, to, name, tracking]) => {
        result.updated.push({
          name,
          tracking,
          to,
          from
        });
      })
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
  const commands5 = ["fetch", ...customArgs];
  if (remote && branch) {
    commands5.push(remote, branch);
  }
  const banned = commands5.find(disallowedCommand2);
  if (banned) {
    return configurationErrorTask(`git.fetch: potential exploit argument blocked.`);
  }
  return {
    commands: commands5,
    format: "utf-8",
    parser: parseFetchResult
  };
}
var init_fetch = __esm({
  "src/lib/tasks/fetch.ts"() {
    init_parse_fetch();
    init_task();
  }
});
function parseMoveResult(stdOut) {
  return parseStringResponse({ moves: [] }, parsers11, stdOut);
}
var parsers11;
var init_parse_move = __esm({
  "src/lib/parsers/parse-move.ts"() {
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
var init_move = __esm({
  "src/lib/tasks/move.ts"() {
    init_parse_move();
    init_utils();
  }
});
var pull_exports = {};
__export2(pull_exports, {
  pullTask: () => pullTask
});
function pullTask(remote, branch, customArgs) {
  const commands5 = ["pull", ...customArgs];
  if (remote && branch) {
    commands5.splice(1, 0, remote, branch);
  }
  return {
    commands: commands5,
    format: "utf-8",
    parser(stdOut, stdErr) {
      return parsePullResult(stdOut, stdErr);
    },
    onError(result, _error, _done, fail) {
      const pullError = parsePullErrorResult(bufferToString(result.stdOut), bufferToString(result.stdErr));
      if (pullError) {
        return fail(new GitResponseError(pullError));
      }
      fail(_error);
    }
  };
}
var init_pull = __esm({
  "src/lib/tasks/pull.ts"() {
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
var init_GetRemoteSummary = __esm({
  "src/lib/responses/GetRemoteSummary.ts"() {
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
  const commands5 = ["remote"];
  if (verbose) {
    commands5.push("-v");
  }
  return {
    commands: commands5,
    format: "utf-8",
    parser: verbose ? parseGetRemotesVerbose : parseGetRemotes
  };
}
function listRemotesTask(customArgs) {
  const commands5 = [...customArgs];
  if (commands5[0] !== "ls-remote") {
    commands5.unshift("ls-remote");
  }
  return straightThroughStringTask(commands5);
}
function remoteTask(customArgs) {
  const commands5 = [...customArgs];
  if (commands5[0] !== "remote") {
    commands5.unshift("remote");
  }
  return straightThroughStringTask(commands5);
}
function removeRemoteTask(remoteName) {
  return straightThroughStringTask(["remote", "remove", remoteName]);
}
var init_remote = __esm({
  "src/lib/tasks/remote.ts"() {
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
  const commands5 = ["stash", "list", ...options.commands, ...customArgs];
  const parser4 = createListLogSummaryParser(options.splitter, options.fields, logFormatFromCommand(commands5));
  return validateLogFormatConfig(commands5) || {
    commands: commands5,
    format: "utf-8",
    parser: parser4
  };
}
var init_stash_list = __esm({
  "src/lib/tasks/stash-list.ts"() {
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
function addSubModuleTask(repo, path32) {
  return subModuleTask(["add", repo, path32]);
}
function initSubModuleTask(customArgs) {
  return subModuleTask(["init", ...customArgs]);
}
function subModuleTask(customArgs) {
  const commands5 = [...customArgs];
  if (commands5[0] !== "submodule") {
    commands5.unshift("submodule");
  }
  return straightThroughStringTask(commands5);
}
function updateSubModuleTask(customArgs) {
  return subModuleTask(["update", ...customArgs]);
}
var init_sub_module = __esm({
  "src/lib/tasks/sub-module.ts"() {
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
var init_TagList = __esm({
  "src/lib/responses/TagList.ts"() {
    TagList = class {
      constructor(all, latest) {
        this.all = all;
        this.latest = latest;
      }
    };
    parseTagList = function(data, customSort = false) {
      const tags = data.split(`
`).map(trimmed).filter(Boolean);
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
var init_tag = __esm({
  "src/lib/tasks/tag.ts"() {
    init_TagList();
  }
});
var require_git = __commonJS2({
  "src/git.js"(exports2, module2) {
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
      this._executor = new GitExecutor2(options.baseDir, new Scheduler2(options.maxConcurrentProcesses), plugins);
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
      return this._runTask(stashListTask2(trailingOptionsArgument2(arguments) || {}, filterArray2(options) && options || []), trailingFunctionArgument2(arguments));
    };
    function createCloneTask(api, task, repoPath, localPath) {
      if (typeof repoPath !== "string") {
        return configurationErrorTask2(`git.${api}() requires a string 'repoPath'`);
      }
      return task(repoPath, filterType2(localPath, filterString2), getTrailingOptions2(arguments));
    }
    Git2.prototype.clone = function() {
      return this._runTask(createCloneTask("clone", cloneTask2, ...arguments), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.mirror = function() {
      return this._runTask(createCloneTask("mirror", cloneMirrorTask2, ...arguments), trailingFunctionArgument2(arguments));
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
      return this._runTask(pullTask2(filterType2(remote, filterString2), filterType2(branch, filterString2), getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.fetch = function(remote, branch) {
      return this._runTask(fetchTask2(filterType2(remote, filterString2), filterType2(branch, filterString2), getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.silent = function(silence) {
      console.warn("simple-git deprecation notice: git.silent: logging should be configured using the `debug` library / `DEBUG` environment variable, this will be an error in version 3");
      return this;
    };
    Git2.prototype.tags = function(options, then) {
      return this._runTask(tagListTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.rebase = function() {
      return this._runTask(straightThroughStringTask2(["rebase", ...getTrailingOptions2(arguments)]), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.reset = function(mode) {
      return this._runTask(resetTask2(getResetMode2(mode), getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.revert = function(commit) {
      const next = trailingFunctionArgument2(arguments);
      if (typeof commit !== "string") {
        return this._runTask(configurationErrorTask2("Commit must be a string"), next);
      }
      return this._runTask(straightThroughStringTask2(["revert", ...getTrailingOptions2(arguments, 0, true), commit]), next);
    };
    Git2.prototype.addTag = function(name) {
      const task = typeof name === "string" ? addTagTask2(name) : configurationErrorTask2("Git.addTag requires a tag name");
      return this._runTask(task, trailingFunctionArgument2(arguments));
    };
    Git2.prototype.addAnnotatedTag = function(tagName, tagMessage) {
      return this._runTask(addAnnotatedTagTask2(tagName, tagMessage), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.deleteLocalBranch = function(branchName, forceDelete, then) {
      return this._runTask(deleteBranchTask2(branchName, typeof forceDelete === "boolean" ? forceDelete : false), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.deleteLocalBranches = function(branchNames, forceDelete, then) {
      return this._runTask(deleteBranchesTask2(branchNames, typeof forceDelete === "boolean" ? forceDelete : false), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.branch = function(options, then) {
      return this._runTask(branchTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.branchLocal = function(then) {
      return this._runTask(branchLocalTask2(), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.raw = function(commands5) {
      const createRestCommands = !Array.isArray(commands5);
      const command = [].slice.call(createRestCommands ? arguments : commands5, 0);
      for (let i = 0; i < command.length && createRestCommands; i++) {
        if (!filterPrimitives2(command[i])) {
          command.splice(i, command.length - i);
          break;
        }
      }
      command.push(...getTrailingOptions2(arguments, 0, true));
      var next = trailingFunctionArgument2(arguments);
      if (!command.length) {
        return this._runTask(configurationErrorTask2("Raw: must supply one or more command to execute"), next);
      }
      return this._runTask(straightThroughStringTask2(command, this._trimmed), next);
    };
    Git2.prototype.submoduleAdd = function(repo, path32, then) {
      return this._runTask(addSubModuleTask2(repo, path32), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.submoduleUpdate = function(args, then) {
      return this._runTask(updateSubModuleTask2(getTrailingOptions2(arguments, true)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.submoduleInit = function(args, then) {
      return this._runTask(initSubModuleTask2(getTrailingOptions2(arguments, true)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.subModule = function(options, then) {
      return this._runTask(subModuleTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.listRemote = function() {
      return this._runTask(listRemotesTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.addRemote = function(remoteName, remoteRepo, then) {
      return this._runTask(addRemoteTask2(remoteName, remoteRepo, getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.removeRemote = function(remoteName, then) {
      return this._runTask(removeRemoteTask2(remoteName), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.getRemotes = function(verbose, then) {
      return this._runTask(getRemotesTask2(verbose === true), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.remote = function(options, then) {
      return this._runTask(remoteTask2(getTrailingOptions2(arguments)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.tag = function(options, then) {
      const command = getTrailingOptions2(arguments);
      if (command[0] !== "tag") {
        command.unshift("tag");
      }
      return this._runTask(straightThroughStringTask2(command), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.updateServerInfo = function(then) {
      return this._runTask(straightThroughStringTask2(["update-server-info"]), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.pushTags = function(remote, then) {
      const task = pushTagsTask2({ remote: filterType2(remote, filterString2) }, getTrailingOptions2(arguments));
      return this._runTask(task, trailingFunctionArgument2(arguments));
    };
    Git2.prototype.rm = function(files) {
      return this._runTask(straightThroughStringTask2(["rm", "-f", ...asArray2(files)]), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.rmKeepLocal = function(files) {
      return this._runTask(straightThroughStringTask2(["rm", "--cached", ...asArray2(files)]), trailingFunctionArgument2(arguments));
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
        return this._runTask(configurationErrorTask2("Git.catFile: options must be supplied as an array of strings"), handler);
      }
      if (Array.isArray(options)) {
        command.push.apply(command, options);
      }
      const task = format === "buffer" ? straightThroughBufferTask2(command) : straightThroughStringTask2(command);
      return this._runTask(task, handler);
    };
    Git2.prototype.diff = function(options, then) {
      const task = filterString2(options) ? configurationErrorTask2("git.diff: supplying options as a single string is no longer supported, switch to an array of strings") : straightThroughStringTask2(["diff", ...getTrailingOptions2(arguments)]);
      return this._runTask(task, trailingFunctionArgument2(arguments));
    };
    Git2.prototype.diffSummary = function() {
      return this._runTask(diffSummaryTask2(getTrailingOptions2(arguments, 1)), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.applyPatch = function(patches) {
      const task = !filterStringOrStringArray2(patches) ? configurationErrorTask2(`git.applyPatch requires one or more string patches as the first argument`) : applyPatchTask2(asArray2(patches), getTrailingOptions2([].slice.call(arguments, 1)));
      return this._runTask(task, trailingFunctionArgument2(arguments));
    };
    Git2.prototype.revparse = function() {
      const commands5 = ["rev-parse", ...getTrailingOptions2(arguments, true)];
      return this._runTask(straightThroughStringTask2(commands5, true), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.clean = function(mode, options, then) {
      const usingCleanOptionsArray = isCleanOptionsArray2(mode);
      const cleanMode = usingCleanOptionsArray && mode.join("") || filterType2(mode, filterString2) || "";
      const customArgs = getTrailingOptions2([].slice.call(arguments, usingCleanOptionsArray ? 1 : 0));
      return this._runTask(cleanWithOptionsTask2(cleanMode, customArgs), trailingFunctionArgument2(arguments));
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
      return this._runTask(checkIgnoreTask2(asArray2(filterType2(pathnames, filterStringOrStringArray2, []))), trailingFunctionArgument2(arguments));
    };
    Git2.prototype.checkIsRepo = function(checkType, then) {
      return this._runTask(checkIsRepoTask2(filterType2(checkType, filterString2)), trailingFunctionArgument2(arguments));
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
  throw new GitPluginError(void 0, "unsafe", "Configuring protocol.allow is not permitted without enabling allowUnsafeExtProtocol");
}
function preventUploadPack(arg, method) {
  if (/^\s*--(upload|receive)-pack/.test(arg)) {
    throw new GitPluginError(void 0, "unsafe", `Use of --upload-pack or --receive-pack is not permitted without enabling allowUnsafePack`);
  }
  if (method === "clone" && /^\s*-u\b/.test(arg)) {
    throw new GitPluginError(void 0, "unsafe", `Use of clone with option -u is not permitted without enabling allowUnsafePack`);
  }
  if (method === "push" && /^\s*--exec\b/.test(arg)) {
    throw new GitPluginError(void 0, "unsafe", `Use of push with option --exec is not permitted without enabling allowUnsafePack`);
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
var never = import_promise_deferred2.deferred().promise;
function completionDetectionPlugin({
  onClose = true,
  onExit = 50
} = {}) {
  function createEvents() {
    let exitCode = -1;
    const events = {
      close: import_promise_deferred2.deferred(),
      closeTimeout: import_promise_deferred2.deferred(),
      exit: import_promise_deferred2.deferred(),
      exitTimeout: import_promise_deferred2.deferred()
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
          append2(data.slice(i + 1).flatMap((item) => isPathSpec(item) && toPaths(item) || item));
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
  const config = createInstanceConfig(baseDir && (typeof baseDir === "string" ? { baseDir } : baseDir) || {}, options);
  if (!folderExists(config.baseDir)) {
    throw new GitConstructError(config, `Cannot use simple-git on a directory that does not exist`);
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
var WorktreeService = class {
  config;
  constructor(config) {
    this.config = config;
  }
  getGit(cwd) {
    return esm_default(cwd || this.config.baseDir);
  }
  getWorktreesDir() {
    return path3.join(this.config.hiveDir, ".worktrees");
  }
  getWorktreePath(feature, step) {
    return path3.join(this.getWorktreesDir(), feature, step);
  }
  async getStepStatusPath(feature, step) {
    const featurePath = path3.join(this.config.hiveDir, "features", feature);
    const tasksPath = path3.join(featurePath, "tasks", step, "status.json");
    try {
      await fs6.access(tasksPath);
      return tasksPath;
    } catch {
    }
    return path3.join(featurePath, "execution", step, "status.json");
  }
  getBranchName(feature, step) {
    return `hive/${feature}/${step}`;
  }
  async create(feature, step, baseBranch) {
    const worktreePath = this.getWorktreePath(feature, step);
    const branchName = this.getBranchName(feature, step);
    const git = this.getGit();
    await fs6.mkdir(path3.dirname(worktreePath), { recursive: true });
    const base = baseBranch || (await git.revparse(["HEAD"])).trim();
    const existing = await this.get(feature, step);
    if (existing) {
      return existing;
    }
    try {
      await git.raw(["worktree", "add", "-b", branchName, worktreePath, base]);
    } catch {
      try {
        await git.raw(["worktree", "add", worktreePath, branchName]);
      } catch (retryError) {
        throw new Error(`Failed to create worktree: ${retryError}`);
      }
    }
    const worktreeGit = this.getGit(worktreePath);
    const commit = (await worktreeGit.revparse(["HEAD"])).trim();
    return {
      path: worktreePath,
      branch: branchName,
      commit,
      feature,
      step
    };
  }
  async get(feature, step) {
    const worktreePath = this.getWorktreePath(feature, step);
    const branchName = this.getBranchName(feature, step);
    try {
      await fs6.access(worktreePath);
      const worktreeGit = this.getGit(worktreePath);
      const commit = (await worktreeGit.revparse(["HEAD"])).trim();
      return {
        path: worktreePath,
        branch: branchName,
        commit,
        feature,
        step
      };
    } catch {
      return null;
    }
  }
  async getDiff(feature, step, baseCommit) {
    const worktreePath = this.getWorktreePath(feature, step);
    const statusPath = await this.getStepStatusPath(feature, step);
    let base = baseCommit;
    if (!base) {
      try {
        const status = JSON.parse(await fs6.readFile(statusPath, "utf-8"));
        base = status.baseCommit;
      } catch {
      }
    }
    if (!base) {
      base = "HEAD~1";
    }
    const worktreeGit = this.getGit(worktreePath);
    try {
      await worktreeGit.raw(["add", "-A"]);
      const status = await worktreeGit.status();
      const hasStaged = status.staged.length > 0;
      let diffContent = "";
      let stat2 = "";
      if (hasStaged) {
        diffContent = await worktreeGit.diff(["--cached"]);
        stat2 = diffContent ? await worktreeGit.diff(["--cached", "--stat"]) : "";
      } else {
        diffContent = await worktreeGit.diff([`${base}..HEAD`]).catch(() => "");
        stat2 = diffContent ? await worktreeGit.diff([`${base}..HEAD`, "--stat"]) : "";
      }
      const statLines = stat2.split(`
`).filter((l) => l.trim());
      const filesChanged = statLines.slice(0, -1).map((line) => line.split("|")[0].trim()).filter(Boolean);
      const summaryLine = statLines[statLines.length - 1] || "";
      const insertMatch = summaryLine.match(/(\d+) insertion/);
      const deleteMatch = summaryLine.match(/(\d+) deletion/);
      return {
        hasDiff: diffContent.length > 0,
        diffContent,
        filesChanged,
        insertions: insertMatch ? parseInt(insertMatch[1], 10) : 0,
        deletions: deleteMatch ? parseInt(deleteMatch[1], 10) : 0
      };
    } catch {
      return {
        hasDiff: false,
        diffContent: "",
        filesChanged: [],
        insertions: 0,
        deletions: 0
      };
    }
  }
  async exportPatch(feature, step, baseBranch) {
    const worktreePath = this.getWorktreePath(feature, step);
    const patchPath = path3.join(worktreePath, "..", `${step}.patch`);
    const base = baseBranch || "HEAD~1";
    const worktreeGit = this.getGit(worktreePath);
    const diff = await worktreeGit.diff([`${base}...HEAD`]);
    await fs6.writeFile(patchPath, diff);
    return patchPath;
  }
  async applyDiff(feature, step, baseBranch) {
    const { hasDiff, diffContent, filesChanged } = await this.getDiff(feature, step, baseBranch);
    if (!hasDiff) {
      return { success: true, filesAffected: [] };
    }
    const patchPath = path3.join(this.config.hiveDir, ".worktrees", feature, `${step}.patch`);
    try {
      await fs6.writeFile(patchPath, diffContent);
      const git = this.getGit();
      await git.applyPatch(patchPath);
      await fs6.unlink(patchPath).catch(() => {
      });
      return { success: true, filesAffected: filesChanged };
    } catch (error) {
      await fs6.unlink(patchPath).catch(() => {
      });
      const err = error;
      return {
        success: false,
        error: err.message || "Failed to apply patch",
        filesAffected: []
      };
    }
  }
  async revertDiff(feature, step, baseBranch) {
    const { hasDiff, diffContent, filesChanged } = await this.getDiff(feature, step, baseBranch);
    if (!hasDiff) {
      return { success: true, filesAffected: [] };
    }
    const patchPath = path3.join(this.config.hiveDir, ".worktrees", feature, `${step}.patch`);
    try {
      await fs6.writeFile(patchPath, diffContent);
      const git = this.getGit();
      await git.applyPatch(patchPath, ["-R"]);
      await fs6.unlink(patchPath).catch(() => {
      });
      return { success: true, filesAffected: filesChanged };
    } catch (error) {
      await fs6.unlink(patchPath).catch(() => {
      });
      const err = error;
      return {
        success: false,
        error: err.message || "Failed to revert patch",
        filesAffected: []
      };
    }
  }
  parseFilesFromDiff(diffContent) {
    const files = [];
    const regex = /^diff --git a\/(.+?) b\//gm;
    let match;
    while ((match = regex.exec(diffContent)) !== null) {
      files.push(match[1]);
    }
    return [...new Set(files)];
  }
  async revertFromSavedDiff(diffPath) {
    const diffContent = await fs6.readFile(diffPath, "utf-8");
    if (!diffContent.trim()) {
      return { success: true, filesAffected: [] };
    }
    const filesChanged = this.parseFilesFromDiff(diffContent);
    try {
      const git = this.getGit();
      await git.applyPatch(diffContent, ["-R"]);
      return { success: true, filesAffected: filesChanged };
    } catch (error) {
      const err = error;
      return {
        success: false,
        error: err.message || "Failed to revert patch",
        filesAffected: []
      };
    }
  }
  async remove(feature, step, deleteBranch = false) {
    const worktreePath = this.getWorktreePath(feature, step);
    const branchName = this.getBranchName(feature, step);
    const git = this.getGit();
    try {
      await git.raw(["worktree", "remove", worktreePath, "--force"]);
    } catch {
      await fs6.rm(worktreePath, { recursive: true, force: true });
    }
    try {
      await git.raw(["worktree", "prune"]);
    } catch {
    }
    if (deleteBranch) {
      try {
        await git.deleteLocalBranch(branchName, true);
      } catch {
      }
    }
  }
  async list(feature) {
    const worktreesDir = this.getWorktreesDir();
    const results = [];
    try {
      const features = feature ? [feature] : await fs6.readdir(worktreesDir);
      for (const feat of features) {
        const featurePath = path3.join(worktreesDir, feat);
        const stat2 = await fs6.stat(featurePath).catch(() => null);
        if (!stat2?.isDirectory())
          continue;
        const steps = await fs6.readdir(featurePath).catch(() => []);
        for (const step of steps) {
          const info = await this.get(feat, step);
          if (info) {
            results.push(info);
          }
        }
      }
    } catch {
    }
    return results;
  }
  async cleanup(feature) {
    const removed = [];
    const git = this.getGit();
    try {
      await git.raw(["worktree", "prune"]);
    } catch {
    }
    const worktreesDir = this.getWorktreesDir();
    const features = feature ? [feature] : await fs6.readdir(worktreesDir).catch(() => []);
    for (const feat of features) {
      const featurePath = path3.join(worktreesDir, feat);
      const stat2 = await fs6.stat(featurePath).catch(() => null);
      if (!stat2?.isDirectory())
        continue;
      const steps = await fs6.readdir(featurePath).catch(() => []);
      for (const step of steps) {
        const worktreePath = path3.join(featurePath, step);
        const stepStat = await fs6.stat(worktreePath).catch(() => null);
        if (!stepStat?.isDirectory())
          continue;
        try {
          const worktreeGit = this.getGit(worktreePath);
          await worktreeGit.revparse(["HEAD"]);
        } catch {
          await this.remove(feat, step, false);
          removed.push(worktreePath);
        }
      }
    }
    return { removed, pruned: true };
  }
  async checkConflicts(feature, step, baseBranch) {
    const { hasDiff, diffContent } = await this.getDiff(feature, step, baseBranch);
    if (!hasDiff) {
      return [];
    }
    const patchPath = path3.join(this.config.hiveDir, ".worktrees", feature, `${step}-check.patch`);
    try {
      await fs6.writeFile(patchPath, diffContent);
      const git = this.getGit();
      await git.applyPatch(patchPath, ["--check"]);
      await fs6.unlink(patchPath).catch(() => {
      });
      return [];
    } catch (error) {
      await fs6.unlink(patchPath).catch(() => {
      });
      const err = error;
      const stderr = err.message || "";
      const conflicts2 = stderr.split(`
`).filter((line) => line.includes("error: patch failed:")).map((line) => {
        const match = line.match(/error: patch failed: (.+):/);
        return match ? match[1] : null;
      }).filter((f) => f !== null);
      return conflicts2;
    }
  }
  async checkConflictsFromSavedDiff(diffPath, reverse = false) {
    try {
      await fs6.access(diffPath);
    } catch {
      return [];
    }
    try {
      const git = this.getGit();
      const options = reverse ? ["--check", "-R"] : ["--check"];
      await git.applyPatch(diffPath, options);
      return [];
    } catch (error) {
      const err = error;
      const stderr = err.message || "";
      const conflicts2 = stderr.split(`
`).filter((line) => line.includes("error: patch failed:")).map((line) => {
        const match = line.match(/error: patch failed: (.+):/);
        return match ? match[1] : null;
      }).filter((f) => f !== null);
      return conflicts2;
    }
  }
  async commitChanges(feature, step, message) {
    const worktreePath = this.getWorktreePath(feature, step);
    try {
      await fs6.access(worktreePath);
    } catch {
      return { committed: false, sha: "", message: "Worktree not found" };
    }
    const worktreeGit = this.getGit(worktreePath);
    try {
      await worktreeGit.add("-A");
      const status = await worktreeGit.status();
      const hasChanges = status.staged.length > 0 || status.modified.length > 0 || status.not_added.length > 0;
      if (!hasChanges) {
        const currentSha = (await worktreeGit.revparse(["HEAD"])).trim();
        return { committed: false, sha: currentSha, message: "No changes to commit" };
      }
      const commitMessage = message || `hive(${step}): task changes`;
      const result = await worktreeGit.commit(commitMessage, ["--allow-empty-message"]);
      return {
        committed: true,
        sha: result.commit,
        message: commitMessage
      };
    } catch (error) {
      const err = error;
      const currentSha = (await worktreeGit.revparse(["HEAD"]).catch(() => "")).trim();
      return {
        committed: false,
        sha: currentSha,
        message: err.message || "Commit failed"
      };
    }
  }
  async merge(feature, step, strategy = "merge") {
    const branchName = this.getBranchName(feature, step);
    const git = this.getGit();
    try {
      const branches = await git.branch();
      if (!branches.all.includes(branchName)) {
        return { success: false, merged: false, error: `Branch ${branchName} not found` };
      }
      const currentBranch = branches.current;
      const diffStat = await git.diff([`${currentBranch}...${branchName}`, "--stat"]);
      const filesChanged = diffStat.split(`
`).filter((l) => l.trim() && l.includes("|")).map((l) => l.split("|")[0].trim());
      if (strategy === "squash") {
        await git.raw(["merge", "--squash", branchName]);
        const result = await git.commit(`hive: merge ${step} (squashed)`);
        return {
          success: true,
          merged: true,
          sha: result.commit,
          filesChanged
        };
      } else if (strategy === "rebase") {
        const commits = await git.log([`${currentBranch}..${branchName}`]);
        const commitsToApply = [...commits.all].reverse();
        for (const commit of commitsToApply) {
          await git.raw(["cherry-pick", commit.hash]);
        }
        const head = (await git.revparse(["HEAD"])).trim();
        return {
          success: true,
          merged: true,
          sha: head,
          filesChanged
        };
      } else {
        const result = await git.merge([branchName, "--no-ff", "-m", `hive: merge ${step}`]);
        const head = (await git.revparse(["HEAD"])).trim();
        return {
          success: true,
          merged: !result.failed,
          sha: head,
          filesChanged,
          conflicts: result.conflicts?.map((c) => c.file || String(c)) || []
        };
      }
    } catch (error) {
      const err = error;
      if (err.message?.includes("CONFLICT") || err.message?.includes("conflict")) {
        await git.raw(["merge", "--abort"]).catch(() => {
        });
        await git.raw(["rebase", "--abort"]).catch(() => {
        });
        await git.raw(["cherry-pick", "--abort"]).catch(() => {
        });
        return {
          success: false,
          merged: false,
          error: "Merge conflicts detected",
          conflicts: this.parseConflictsFromError(err.message || "")
        };
      }
      return {
        success: false,
        merged: false,
        error: err.message || "Merge failed"
      };
    }
  }
  async hasUncommittedChanges(feature, step) {
    const worktreePath = this.getWorktreePath(feature, step);
    try {
      const worktreeGit = this.getGit(worktreePath);
      const status = await worktreeGit.status();
      return status.modified.length > 0 || status.not_added.length > 0 || status.staged.length > 0 || status.deleted.length > 0 || status.created.length > 0;
    } catch {
      return false;
    }
  }
  parseConflictsFromError(errorMessage) {
    const conflicts2 = [];
    const lines = errorMessage.split(`
`);
    for (const line of lines) {
      if (line.includes("CONFLICT") && line.includes("Merge conflict in")) {
        const match = line.match(/Merge conflict in (.+)/);
        if (match)
          conflicts2.push(match[1]);
      }
    }
    return conflicts2;
  }
};
var ContextService = class {
  projectRoot;
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }
  write(featureName, fileName, content) {
    const contextPath = getContextPath(this.projectRoot, featureName);
    ensureDir(contextPath);
    const filePath = path4.join(contextPath, this.normalizeFileName(fileName));
    writeText(filePath, content);
    return filePath;
  }
  read(featureName, fileName) {
    const contextPath = getContextPath(this.projectRoot, featureName);
    const filePath = path4.join(contextPath, this.normalizeFileName(fileName));
    return readText(filePath);
  }
  list(featureName) {
    const contextPath = getContextPath(this.projectRoot, featureName);
    if (!fileExists(contextPath))
      return [];
    const files = fs7.readdirSync(contextPath, { withFileTypes: true }).filter((f) => f.isFile() && f.name.endsWith(".md")).map((f) => f.name);
    return files.map((name) => {
      const filePath = path4.join(contextPath, name);
      const stat2 = fs7.statSync(filePath);
      const content = readText(filePath) || "";
      return {
        name: name.replace(/\.md$/, ""),
        content,
        updatedAt: stat2.mtime.toISOString()
      };
    });
  }
  delete(featureName, fileName) {
    const contextPath = getContextPath(this.projectRoot, featureName);
    const filePath = path4.join(contextPath, this.normalizeFileName(fileName));
    if (fileExists(filePath)) {
      fs7.unlinkSync(filePath);
      return true;
    }
    return false;
  }
  compile(featureName) {
    const files = this.list(featureName);
    if (files.length === 0)
      return "";
    const sections = files.map((f) => `## ${f.name}

${f.content}`);
    return sections.join(`

---

`);
  }
  normalizeFileName(name) {
    const normalized = name.replace(/\.md$/, "");
    return `${normalized}.md`;
  }
};
var AskService = class {
  projectRoot;
  constructor(projectRoot) {
    this.projectRoot = projectRoot;
  }
  getAsksDir(feature) {
    return path6.join(this.projectRoot, ".hive", "features", feature, "asks");
  }
  ensureAsksDir(feature) {
    const dir = this.getAsksDir(feature);
    if (!fs9.existsSync(dir)) {
      fs9.mkdirSync(dir, { recursive: true });
    }
  }
  createAsk(feature, question) {
    this.ensureAsksDir(feature);
    const id = `ask_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const ask = {
      id,
      question,
      feature,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      answered: false
    };
    const asksDir = this.getAsksDir(feature);
    const askPath = path6.join(asksDir, `${id}.json`);
    const lockPath = path6.join(asksDir, `${id}.lock`);
    fs9.writeFileSync(askPath, JSON.stringify(ask, null, 2));
    fs9.writeFileSync(lockPath, "");
    return ask;
  }
  isLocked(feature, askId) {
    const lockPath = path6.join(this.getAsksDir(feature), `${askId}.lock`);
    return fs9.existsSync(lockPath);
  }
  getAnswer(feature, askId) {
    const answerPath = path6.join(this.getAsksDir(feature), `${askId}-answer.json`);
    if (!fs9.existsSync(answerPath)) {
      return null;
    }
    try {
      return JSON.parse(fs9.readFileSync(answerPath, "utf-8"));
    } catch {
      return null;
    }
  }
  submitAnswer(feature, askId, answer) {
    const asksDir = this.getAsksDir(feature);
    const answerPath = path6.join(asksDir, `${askId}-answer.json`);
    const lockPath = path6.join(asksDir, `${askId}.lock`);
    const answerData = {
      id: askId,
      answer,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    fs9.writeFileSync(answerPath, JSON.stringify(answerData, null, 2));
    if (fs9.existsSync(lockPath)) {
      fs9.unlinkSync(lockPath);
    }
  }
  listPending(feature) {
    const asksDir = this.getAsksDir(feature);
    if (!fs9.existsSync(asksDir)) {
      return [];
    }
    const files = fs9.readdirSync(asksDir);
    const pending = [];
    for (const file of files) {
      if (file.endsWith(".json") && !file.includes("-answer")) {
        const askPath = path6.join(asksDir, file);
        const askId = file.replace(".json", "");
        const lockPath = path6.join(asksDir, `${askId}.lock`);
        if (fs9.existsSync(lockPath)) {
          try {
            const ask = JSON.parse(fs9.readFileSync(askPath, "utf-8"));
            pending.push(ask);
          } catch {
          }
        }
      }
    }
    return pending.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
  cleanup(feature, askId) {
    const asksDir = this.getAsksDir(feature);
    const askPath = path6.join(asksDir, `${askId}.json`);
    const answerPath = path6.join(asksDir, `${askId}-answer.json`);
    const lockPath = path6.join(asksDir, `${askId}.lock`);
    for (const p of [askPath, answerPath, lockPath]) {
      if (fs9.existsSync(p)) {
        fs9.unlinkSync(p);
      }
    }
  }
};

// src/services/watcher.ts
var vscode = __toESM(require("vscode"));
var HiveWatcher = class {
  watcher;
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
var Launcher = class {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
  }
  /**
   * Open a feature's plan in VS Code and show instructions
   */
  async openFeature(feature) {
    if (!feature || !this.workspaceRoot) {
      vscode2.window.showWarningMessage("Hive: Invalid feature name or workspace root");
      return;
    }
    const planPath = path2.join(this.workspaceRoot, ".hive", "features", feature, "plan.md");
    try {
      const uri = vscode2.Uri.file(planPath);
      await vscode2.workspace.openTextDocument(uri);
      await vscode2.window.showTextDocument(uri);
      vscode2.window.showInformationMessage(
        `Hive: Opened ${feature} plan. Use @Hive in Copilot Chat to continue.`
      );
    } catch (error) {
      vscode2.window.showWarningMessage(`Hive: No plan found for feature "${feature}" - ${error}`);
    }
  }
  /**
   * Open a task's worktree folder in a new VS Code window
   */
  async openTask(feature, task) {
    if (!feature || !task || !this.workspaceRoot) {
      vscode2.window.showWarningMessage("Hive: Invalid feature name, task name, or workspace root");
      return;
    }
    const worktreePath = path2.join(this.workspaceRoot, ".hive", ".worktrees", feature, task);
    const uri = vscode2.Uri.file(worktreePath);
    try {
      await vscode2.commands.executeCommand("vscode.openFolder", uri, { forceNewWindow: true });
    } catch (error) {
      vscode2.window.showErrorMessage(`Hive: Worktree not found for ${feature}/${task} - ${error}`);
    }
  }
  /**
   * Open a file in VS Code
   */
  async openFile(filePath) {
    if (!filePath || !this.workspaceRoot) {
      vscode2.window.showWarningMessage("Hive: Invalid file path or workspace root");
      return;
    }
    try {
      const uri = vscode2.Uri.file(filePath);
      await vscode2.workspace.openTextDocument(uri);
      await vscode2.window.showTextDocument(uri);
    } catch (error) {
      vscode2.window.showErrorMessage(`Hive: Could not open file "${filePath}" - ${error}`);
    }
  }
};

// src/providers/sidebarProvider.ts
var vscode3 = __toESM(require("vscode"));
var fs2 = __toESM(require("fs"));
var path5 = __toESM(require("path"));
var STATUS_ICONS = {
  pending: "circle-outline",
  in_progress: "sync~spin",
  done: "pass",
  cancelled: "circle-slash",
  planning: "edit",
  approved: "check",
  executing: "run-all",
  completed: "pass-filled"
};
var StatusGroupItem = class extends vscode3.TreeItem {
  constructor(groupName, groupStatus, features, collapsed = false) {
    super(groupName, collapsed ? vscode3.TreeItemCollapsibleState.Collapsed : vscode3.TreeItemCollapsibleState.Expanded);
    this.groupName = groupName;
    this.groupStatus = groupStatus;
    this.features = features;
    this.description = `${features.length}`;
    this.contextValue = `status-group-${groupStatus}`;
    const icons = {
      in_progress: "sync~spin",
      pending: "circle-outline",
      completed: "pass-filled"
    };
    this.iconPath = new vscode3.ThemeIcon(icons[groupStatus] || "folder");
  }
};
var FeatureItem = class extends vscode3.TreeItem {
  constructor(name, feature, taskStats, isActive) {
    super(name, vscode3.TreeItemCollapsibleState.Collapsed);
    this.name = name;
    this.feature = feature;
    this.taskStats = taskStats;
    this.isActive = isActive;
    const statusLabel = feature.status.charAt(0).toUpperCase() + feature.status.slice(1);
    this.description = isActive ? `${statusLabel} \xB7 ${taskStats.done}/${taskStats.total}` : `${taskStats.done}/${taskStats.total}`;
    this.contextValue = `feature-${feature.status}`;
    this.iconPath = new vscode3.ThemeIcon(STATUS_ICONS[feature.status] || "package");
    if (isActive) {
      this.resourceUri = vscode3.Uri.parse("hive:active");
    }
  }
};
var PlanItem = class extends vscode3.TreeItem {
  constructor(featureName, planPath, featureStatus, commentCount) {
    super("Plan", vscode3.TreeItemCollapsibleState.None);
    this.featureName = featureName;
    this.planPath = planPath;
    this.featureStatus = featureStatus;
    this.commentCount = commentCount;
    this.description = commentCount > 0 ? `${commentCount} comment(s)` : "";
    this.contextValue = featureStatus === "planning" ? "plan-draft" : "plan-approved";
    this.iconPath = new vscode3.ThemeIcon("file-text");
    this.command = {
      command: "vscode.open",
      title: "Open Plan",
      arguments: [vscode3.Uri.file(planPath)]
    };
  }
};
var ContextFolderItem = class extends vscode3.TreeItem {
  constructor(featureName, contextPath, fileCount) {
    super("Context", fileCount > 0 ? vscode3.TreeItemCollapsibleState.Collapsed : vscode3.TreeItemCollapsibleState.None);
    this.featureName = featureName;
    this.contextPath = contextPath;
    this.fileCount = fileCount;
    this.description = fileCount > 0 ? `${fileCount} file(s)` : "";
    this.contextValue = "context-folder";
    this.iconPath = new vscode3.ThemeIcon("folder");
  }
};
var ContextFileItem = class extends vscode3.TreeItem {
  constructor(filename, filePath) {
    super(filename, vscode3.TreeItemCollapsibleState.None);
    this.filename = filename;
    this.filePath = filePath;
    this.contextValue = "context-file";
    this.iconPath = new vscode3.ThemeIcon(filename.endsWith(".md") ? "markdown" : "file");
    this.command = {
      command: "vscode.open",
      title: "Open File",
      arguments: [vscode3.Uri.file(filePath)]
    };
  }
};
var TasksGroupItem = class extends vscode3.TreeItem {
  constructor(featureName, tasks) {
    super("Tasks", tasks.length > 0 ? vscode3.TreeItemCollapsibleState.Collapsed : vscode3.TreeItemCollapsibleState.None);
    this.featureName = featureName;
    this.tasks = tasks;
    const done = tasks.filter((t) => t.status.status === "done").length;
    this.description = `${done}/${tasks.length}`;
    this.contextValue = "tasks-group";
    this.iconPath = new vscode3.ThemeIcon("checklist");
  }
};
var TaskItem = class extends vscode3.TreeItem {
  constructor(featureName, folder, status, specPath, reportPath, subtaskCount = 0, subtasksDone = 0) {
    const name = folder.replace(/^\d+-/, "");
    const hasFiles = specPath !== null || reportPath !== null;
    const hasSubtasks = subtaskCount > 0;
    const hasChildren = hasFiles || hasSubtasks;
    super(name, hasChildren ? vscode3.TreeItemCollapsibleState.Collapsed : vscode3.TreeItemCollapsibleState.None);
    this.featureName = featureName;
    this.folder = folder;
    this.status = status;
    this.specPath = specPath;
    this.reportPath = reportPath;
    this.subtaskCount = subtaskCount;
    this.subtasksDone = subtasksDone;
    const subtaskInfo = subtaskCount > 0 ? ` (${subtasksDone}/${subtaskCount})` : "";
    this.description = (status.summary || "") + subtaskInfo;
    this.contextValue = `task-${status.status}${status.origin === "manual" ? "-manual" : ""}`;
    const iconName = STATUS_ICONS[status.status] || "circle-outline";
    this.iconPath = new vscode3.ThemeIcon(iconName);
    this.tooltip = new vscode3.MarkdownString();
    this.tooltip.appendMarkdown(`**${folder}**

`);
    this.tooltip.appendMarkdown(`Status: ${status.status}

`);
    this.tooltip.appendMarkdown(`Origin: ${status.origin}

`);
    if (status.summary) {
      this.tooltip.appendMarkdown(`Summary: ${status.summary}

`);
    }
    if (subtaskCount > 0) {
      this.tooltip.appendMarkdown(`Subtasks: ${subtasksDone}/${subtaskCount} done`);
    }
  }
};
var TaskFileItem = class extends vscode3.TreeItem {
  constructor(filename, filePath) {
    super(filename, vscode3.TreeItemCollapsibleState.None);
    this.filename = filename;
    this.filePath = filePath;
    this.contextValue = "task-file";
    this.iconPath = new vscode3.ThemeIcon("markdown");
    this.command = {
      command: "vscode.open",
      title: "Open File",
      arguments: [vscode3.Uri.file(filePath)]
    };
  }
};
var SubtaskItem = class extends vscode3.TreeItem {
  constructor(featureName, taskFolder, subtask, subtaskPath) {
    super(subtask.name, vscode3.TreeItemCollapsibleState.None);
    this.featureName = featureName;
    this.taskFolder = taskFolder;
    this.subtask = subtask;
    this.subtaskPath = subtaskPath;
    const typeTag = subtask.type ? ` [${subtask.type}]` : "";
    const targetFile = subtask.status === "done" ? "report" : "spec";
    this.description = `${subtask.id}${typeTag} \u2192 ${targetFile}`;
    this.contextValue = `subtask-${subtask.status}`;
    const statusIcon = STATUS_ICONS[subtask.status] || "circle-outline";
    this.iconPath = new vscode3.ThemeIcon(statusIcon);
    const targetFilePath = path5.join(subtaskPath, subtask.status === "done" ? "report.md" : "spec.md");
    if (fs2.existsSync(targetFilePath)) {
      this.command = {
        command: "vscode.open",
        title: "Open File",
        arguments: [vscode3.Uri.file(targetFilePath)]
      };
    }
    this.tooltip = new vscode3.MarkdownString();
    this.tooltip.appendMarkdown(`**${subtask.name}**

`);
    this.tooltip.appendMarkdown(`ID: ${subtask.id}

`);
    this.tooltip.appendMarkdown(`Status: ${subtask.status}

`);
    if (subtask.type) {
      this.tooltip.appendMarkdown(`Type: ${subtask.type}

`);
    }
    this.tooltip.appendMarkdown(`Click to open: ${targetFile}.md`);
  }
};
var SessionsGroupItem = class extends vscode3.TreeItem {
  constructor(featureName, sessions, master) {
    super("Sessions", sessions.length > 0 ? vscode3.TreeItemCollapsibleState.Collapsed : vscode3.TreeItemCollapsibleState.None);
    this.featureName = featureName;
    this.sessions = sessions;
    this.master = master;
    this.description = sessions.length > 0 ? `${sessions.length} active` : "";
    this.contextValue = "sessions-group";
    this.iconPath = new vscode3.ThemeIcon("broadcast");
  }
};
var SessionItem = class extends vscode3.TreeItem {
  constructor(featureName, session, isMaster) {
    const label = session.taskFolder || (isMaster ? "Master" : `Session ${session.sessionId.slice(4, 12)}`);
    super(label, vscode3.TreeItemCollapsibleState.None);
    this.featureName = featureName;
    this.session = session;
    this.isMaster = isMaster;
    const shortId = session.sessionId.slice(0, 8);
    this.description = isMaster ? `\u2605 ${shortId}` : shortId;
    this.contextValue = "session";
    this.iconPath = new vscode3.ThemeIcon(isMaster ? "star-full" : "terminal");
    this.tooltip = new vscode3.MarkdownString();
    this.tooltip.appendMarkdown(`**Session**: ${session.sessionId}

`);
    if (session.taskFolder) {
      this.tooltip.appendMarkdown(`**Task**: ${session.taskFolder}

`);
    }
    this.tooltip.appendMarkdown(`**Started**: ${session.startedAt}

`);
    this.tooltip.appendMarkdown(`**Last Active**: ${session.lastActiveAt}`);
  }
};
var HiveSidebarProvider = class {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
  }
  _onDidChangeTreeData = new vscode3.EventEmitter();
  onDidChangeTreeData = this._onDidChangeTreeData.event;
  refresh() {
    this._onDidChangeTreeData.fire(void 0);
  }
  getTreeItem(element) {
    return element;
  }
  async getChildren(element) {
    if (!element) {
      return this.getStatusGroups();
    }
    if (element instanceof StatusGroupItem) {
      return element.features;
    }
    if (element instanceof FeatureItem) {
      return this.getFeatureChildren(element.name);
    }
    if (element instanceof ContextFolderItem) {
      return this.getContextFiles(element.featureName, element.contextPath);
    }
    if (element instanceof TasksGroupItem) {
      return this.getTasks(element.featureName, element.tasks);
    }
    if (element instanceof TaskItem) {
      return this.getTaskFiles(element);
    }
    if (element instanceof SessionsGroupItem) {
      return this.getSessions(element.featureName, element.sessions, element.master);
    }
    return [];
  }
  getStatusGroups() {
    const features = this.getAllFeatures();
    const inProgress = [];
    const pending = [];
    const completed = [];
    for (const feature of features) {
      if (feature.feature.status === "executing") {
        inProgress.push(feature);
      } else if (feature.feature.status === "planning" || feature.feature.status === "approved") {
        pending.push(feature);
      } else if (feature.feature.status === "completed") {
        completed.push(feature);
      }
    }
    const groups = [];
    if (inProgress.length > 0) {
      groups.push(new StatusGroupItem("In Progress", "in_progress", inProgress, false));
    }
    if (pending.length > 0) {
      groups.push(new StatusGroupItem("Pending", "pending", pending, false));
    }
    if (completed.length > 0) {
      groups.push(new StatusGroupItem("Completed", "completed", completed, true));
    }
    return groups;
  }
  getAllFeatures() {
    const featuresPath = path5.join(this.workspaceRoot, ".hive", "features");
    if (!fs2.existsSync(featuresPath)) return [];
    const activeFeature = this.getActiveFeature();
    const features = [];
    const dirs = fs2.readdirSync(featuresPath, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name);
    for (const name of dirs) {
      const featureJsonPath = path5.join(featuresPath, name, "feature.json");
      if (!fs2.existsSync(featureJsonPath)) continue;
      const feature = JSON.parse(fs2.readFileSync(featureJsonPath, "utf-8"));
      const taskStats = this.getTaskStats(name);
      const isActive = name === activeFeature;
      features.push(new FeatureItem(name, feature, taskStats, isActive));
    }
    features.sort((a, b) => {
      if (a.isActive) return -1;
      if (b.isActive) return 1;
      return 0;
    });
    return features;
  }
  getFeatureChildren(featureName) {
    const featurePath = path5.join(this.workspaceRoot, ".hive", "features", featureName);
    const items = [];
    const featureJsonPath = path5.join(featurePath, "feature.json");
    const feature = JSON.parse(fs2.readFileSync(featureJsonPath, "utf-8"));
    const planPath = path5.join(featurePath, "plan.md");
    if (fs2.existsSync(planPath)) {
      const commentCount = this.getCommentCount(featureName);
      items.push(new PlanItem(featureName, planPath, feature.status, commentCount));
    }
    const contextPath = path5.join(featurePath, "context");
    const contextFiles = fs2.existsSync(contextPath) ? fs2.readdirSync(contextPath).filter((f) => !f.startsWith(".")) : [];
    items.push(new ContextFolderItem(featureName, contextPath, contextFiles.length));
    const tasks = this.getTaskList(featureName);
    items.push(new TasksGroupItem(featureName, tasks));
    const sessionsData = this.getSessionsData(featureName);
    items.push(new SessionsGroupItem(featureName, sessionsData.sessions, sessionsData.master));
    return items;
  }
  getContextFiles(featureName, contextPath) {
    if (!fs2.existsSync(contextPath)) return [];
    return fs2.readdirSync(contextPath).filter((f) => !f.startsWith(".")).map((f) => new ContextFileItem(f, path5.join(contextPath, f)));
  }
  getTasks(featureName, tasks) {
    const featurePath = path5.join(this.workspaceRoot, ".hive", "features", featureName);
    return tasks.map((t) => {
      const taskDir = path5.join(featurePath, "tasks", t.folder);
      const specPath = path5.join(taskDir, "spec.md");
      const reportPath = path5.join(taskDir, "report.md");
      const hasSpec = fs2.existsSync(specPath);
      const hasReport = fs2.existsSync(reportPath);
      const subtasks = this.getSubtasksFromFolders(featureName, t.folder);
      const subtaskCount = subtasks.length;
      const subtasksDone = subtasks.filter((s) => s.status === "done").length;
      return new TaskItem(featureName, t.folder, t.status, hasSpec ? specPath : null, hasReport ? reportPath : null, subtaskCount, subtasksDone);
    });
  }
  getTaskFiles(taskItem) {
    const items = [];
    if (taskItem.specPath) {
      items.push(new TaskFileItem("spec.md", taskItem.specPath));
    }
    if (taskItem.reportPath) {
      items.push(new TaskFileItem("report.md", taskItem.reportPath));
    }
    const subtasks = this.getSubtasksFromFolders(taskItem.featureName, taskItem.folder);
    for (const subtask of subtasks) {
      const subtaskPath = path5.join(
        this.workspaceRoot,
        ".hive",
        "features",
        taskItem.featureName,
        "tasks",
        taskItem.folder,
        "subtasks",
        subtask.folder
      );
      items.push(new SubtaskItem(taskItem.featureName, taskItem.folder, subtask, subtaskPath));
    }
    return items;
  }
  getSubtasksFromFolders(featureName, taskFolder) {
    const subtasksPath = path5.join(
      this.workspaceRoot,
      ".hive",
      "features",
      featureName,
      "tasks",
      taskFolder,
      "subtasks"
    );
    if (!fs2.existsSync(subtasksPath)) return [];
    const taskOrder = parseInt(taskFolder.split("-")[0], 10);
    const folders = fs2.readdirSync(subtasksPath, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
    return folders.map((folder) => {
      const statusPath = path5.join(subtasksPath, folder, "status.json");
      const subtaskOrder = parseInt(folder.split("-")[0], 10);
      const name = folder.replace(/^\d+-/, "");
      let status = { status: "pending" };
      if (fs2.existsSync(statusPath)) {
        try {
          status = JSON.parse(fs2.readFileSync(statusPath, "utf-8"));
        } catch {
        }
      }
      return {
        id: `${taskOrder}.${subtaskOrder}`,
        name,
        folder,
        status: status.status || "pending",
        type: status.type,
        createdAt: status.createdAt,
        completedAt: status.completedAt
      };
    });
  }
  getTaskList(featureName) {
    const tasksPath = path5.join(this.workspaceRoot, ".hive", "features", featureName, "tasks");
    if (!fs2.existsSync(tasksPath)) return [];
    const folders = fs2.readdirSync(tasksPath, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
    return folders.map((folder) => {
      const statusPath = path5.join(tasksPath, folder, "status.json");
      const status = fs2.existsSync(statusPath) ? JSON.parse(fs2.readFileSync(statusPath, "utf-8")) : { status: "pending", origin: "plan" };
      return { folder, status };
    });
  }
  getTaskStats(featureName) {
    const tasks = this.getTaskList(featureName);
    return {
      total: tasks.length,
      done: tasks.filter((t) => t.status.status === "done").length
    };
  }
  getActiveFeature() {
    const activePath = path5.join(this.workspaceRoot, ".hive", "active-feature");
    if (!fs2.existsSync(activePath)) return null;
    return fs2.readFileSync(activePath, "utf-8").trim();
  }
  getCommentCount(featureName) {
    const commentsPath = path5.join(this.workspaceRoot, ".hive", "features", featureName, "comments.json");
    if (!fs2.existsSync(commentsPath)) return 0;
    try {
      const data = JSON.parse(fs2.readFileSync(commentsPath, "utf-8"));
      return data.threads?.length || 0;
    } catch {
      return 0;
    }
  }
  getSessionsData(featureName) {
    const sessionsPath = path5.join(this.workspaceRoot, ".hive", "features", featureName, "sessions.json");
    if (!fs2.existsSync(sessionsPath)) return { sessions: [] };
    try {
      return JSON.parse(fs2.readFileSync(sessionsPath, "utf-8"));
    } catch {
      return { sessions: [] };
    }
  }
  getSessions(featureName, sessions, master) {
    return sessions.map((s) => new SessionItem(featureName, s, s.sessionId === master));
  }
};

// src/providers/planCommentController.ts
var vscode4 = __toESM(require("vscode"));
var fs8 = __toESM(require("fs"));
var path7 = __toESM(require("path"));
var PlanCommentController = class {
  constructor(workspaceRoot) {
    this.workspaceRoot = workspaceRoot;
    this.controller = vscode4.comments.createCommentController(
      "hive-plan-review",
      "Plan Review"
    );
    this.controller.commentingRangeProvider = {
      provideCommentingRanges: (document2) => {
        if (!document2.fileName.endsWith("plan.md")) return [];
        return [new vscode4.Range(0, 0, document2.lineCount - 1, 0)];
      }
    };
    const pattern = new vscode4.RelativePattern(
      workspaceRoot,
      ".hive/features/*/comments.json"
    );
    this.commentsWatcher = vscode4.workspace.createFileSystemWatcher(pattern);
    this.commentsWatcher.onDidChange((uri) => this.onCommentsFileChanged(uri));
    this.commentsWatcher.onDidDelete((uri) => this.onCommentsFileChanged(uri));
  }
  controller;
  threads = /* @__PURE__ */ new Map();
  commentsWatcher;
  onCommentsFileChanged(commentsUri) {
    const featureDir = path7.dirname(commentsUri.fsPath);
    const planPath = path7.join(featureDir, "plan.md");
    const planUri = vscode4.Uri.file(planPath);
    this.loadComments(planUri);
  }
  registerCommands(context) {
    context.subscriptions.push(
      this.controller,
      vscode4.commands.registerCommand("hive.comment.create", (reply) => {
        this.createComment(reply);
      }),
      vscode4.commands.registerCommand("hive.comment.reply", (reply) => {
        this.replyToComment(reply);
      }),
      vscode4.commands.registerCommand("hive.comment.resolve", (thread) => {
        thread.dispose();
        this.saveComments(thread.uri);
      }),
      vscode4.commands.registerCommand("hive.comment.delete", (comment) => {
        for (const [id, thread] of this.threads) {
          const commentIndex = thread.comments.findIndex((c) => c === comment);
          if (commentIndex !== -1) {
            thread.comments = thread.comments.filter((c) => c !== comment);
            if (thread.comments.length === 0) {
              thread.dispose();
              this.threads.delete(id);
            }
            this.saveComments(thread.uri);
            break;
          }
        }
      }),
      vscode4.workspace.onDidOpenTextDocument((doc) => {
        if (doc.fileName.endsWith("plan.md")) {
          this.loadComments(doc.uri);
        }
      }),
      vscode4.workspace.onDidSaveTextDocument((doc) => {
        if (doc.fileName.endsWith("plan.md")) {
          this.saveComments(doc.uri);
        }
      })
    );
    vscode4.workspace.textDocuments.forEach((doc) => {
      if (doc.fileName.endsWith("plan.md")) {
        this.loadComments(doc.uri);
      }
    });
  }
  createComment(reply) {
    const range = reply.thread.range ?? new vscode4.Range(0, 0, 0, 0);
    const thread = this.controller.createCommentThread(
      reply.thread.uri,
      range,
      [{
        body: new vscode4.MarkdownString(reply.text),
        author: { name: "You" },
        mode: vscode4.CommentMode.Preview
      }]
    );
    thread.canReply = true;
    thread.collapsibleState = vscode4.CommentThreadCollapsibleState.Expanded;
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.threads.set(id, thread);
    this.saveComments(reply.thread.uri);
    reply.thread.dispose();
  }
  replyToComment(reply) {
    const newComment = {
      body: new vscode4.MarkdownString(reply.text),
      author: { name: "You" },
      mode: vscode4.CommentMode.Preview
    };
    reply.thread.comments = [...reply.thread.comments, newComment];
    this.saveComments(reply.thread.uri);
  }
  getCommentsPath(uri) {
    const match = uri.fsPath.match(/\.hive\/features\/([^/]+)\/plan\.md$/);
    if (!match) return null;
    return path7.join(this.workspaceRoot, ".hive", "features", match[1], "comments.json");
  }
  loadComments(uri) {
    const commentsPath = this.getCommentsPath(uri);
    if (!commentsPath || !fs8.existsSync(commentsPath)) return;
    try {
      const data = JSON.parse(fs8.readFileSync(commentsPath, "utf-8"));
      this.threads.forEach((thread, id) => {
        if (thread.uri.fsPath === uri.fsPath) {
          thread.dispose();
          this.threads.delete(id);
        }
      });
      for (const stored of data.threads) {
        const comments2 = [
          {
            body: new vscode4.MarkdownString(stored.body),
            author: { name: "You" },
            mode: vscode4.CommentMode.Preview
          },
          ...stored.replies.map((r) => ({
            body: new vscode4.MarkdownString(r),
            author: { name: "You" },
            mode: vscode4.CommentMode.Preview
          }))
        ];
        const thread = this.controller.createCommentThread(
          uri,
          new vscode4.Range(stored.line, 0, stored.line, 0),
          comments2
        );
        thread.canReply = true;
        thread.collapsibleState = vscode4.CommentThreadCollapsibleState.Expanded;
        this.threads.set(stored.id, thread);
      }
    } catch (error) {
      console.error("Failed to load comments:", error);
    }
  }
  saveComments(uri) {
    const commentsPath = this.getCommentsPath(uri);
    if (!commentsPath) return;
    const threads = [];
    this.threads.forEach((thread, id) => {
      if (thread.uri.fsPath !== uri.fsPath) return;
      if (thread.comments.length === 0) return;
      const [first2, ...rest] = thread.comments;
      const line = thread.range?.start.line ?? 0;
      const getBodyText = (body) => typeof body === "string" ? body : body.value;
      threads.push({
        id,
        line,
        body: getBodyText(first2.body),
        replies: rest.map((c) => getBodyText(c.body))
      });
    });
    const data = { threads };
    try {
      fs8.mkdirSync(path7.dirname(commentsPath), { recursive: true });
      fs8.writeFileSync(commentsPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Failed to save comments:", error);
    }
  }
  dispose() {
    this.commentsWatcher?.dispose();
    this.controller.dispose();
  }
};

// src/panels/HiveQueenPanel.ts
var vscode5 = __toESM(require("vscode"));
var fs10 = __toESM(require("fs"));
var path8 = __toESM(require("path"));
var HiveQueenPanel = class _HiveQueenPanel {
  static viewType = "hive.queenPanel";
  static _panels = /* @__PURE__ */ new Map();
  static _pendingResolvers = /* @__PURE__ */ new Map();
  _panel;
  _extensionUri;
  _disposables = [];
  _comments = [];
  _attachments = [];
  _resolvePromise;
  _mode;
  _planContent;
  _planTitle;
  _closedByAgent = false;
  _panelId;
  _featurePath;
  _featureName;
  _projectRoot;
  _taskWatcher;
  constructor(panel, extensionUri, options, resolve, panelId) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._resolvePromise = resolve;
    this._mode = options.mode || "planning";
    this._comments = options.existingComments || [];
    this._planContent = options.plan;
    this._planTitle = options.title || "Hive Queen";
    this._panelId = panelId;
    this._featurePath = options.featurePath;
    this._featureName = options.featureName;
    this._projectRoot = options.projectRoot;
    this._panel.webview.html = this._getHtmlContent();
    this._panel.onDidDispose(() => this._dispose(), null, this._disposables);
    this._panel.webview.onDidReceiveMessage(
      (message) => this._handleMessage(message),
      null,
      this._disposables
    );
    if (this._mode === "execution" && this._featurePath) {
      this._startTaskWatcher();
    }
    setTimeout(() => {
      this._panel.webview.postMessage({
        type: "showPlan",
        content: options.plan,
        title: this._planTitle,
        mode: this._mode,
        comments: this._comments
      });
    }, 100);
  }
  /**
   * Show plan for review (planning mode)
   */
  static async showPlan(extensionUri, content, title = "Review Plan") {
    return _HiveQueenPanel.showWithOptions(extensionUri, {
      plan: content,
      title,
      mode: "planning"
    });
  }
  /**
   * Show panel with full options
   */
  static async showWithOptions(extensionUri, options) {
    const column = vscode5.window.activeTextEditor ? vscode5.window.activeTextEditor.viewColumn : void 0;
    const title = options.title || "Hive Queen";
    const panelId = options.featureName || `hive_${Date.now()}`;
    const existingPanel = _HiveQueenPanel._panels.get(panelId);
    if (existingPanel && existingPanel._panel) {
      existingPanel._panel.reveal(column);
      const existingResolver = _HiveQueenPanel._pendingResolvers.get(panelId);
      if (existingResolver) {
        return new Promise((resolve) => {
          _HiveQueenPanel._pendingResolvers.set(panelId, resolve);
        });
      }
    }
    return new Promise((resolve) => {
      _HiveQueenPanel._pendingResolvers.set(panelId, resolve);
      const panel = vscode5.window.createWebviewPanel(
        _HiveQueenPanel.viewType,
        title,
        column || vscode5.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [
            vscode5.Uri.joinPath(extensionUri, "media"),
            vscode5.Uri.joinPath(extensionUri, "dist"),
            vscode5.Uri.joinPath(extensionUri, "node_modules", "@vscode", "codicons", "dist")
          ]
        }
      );
      const queenPanel = new _HiveQueenPanel(panel, extensionUri, options, resolve, panelId);
      _HiveQueenPanel._panels.set(panelId, queenPanel);
      panel.onDidDispose(() => {
        _HiveQueenPanel._panels.delete(panelId);
      });
    });
  }
  /**
   * Get a panel by ID
   */
  static getPanel(panelId) {
    return _HiveQueenPanel._panels.get(panelId);
  }
  static showDashboard(extensionUri, projectRoot) {
    const column = vscode5.window.activeTextEditor?.viewColumn || vscode5.ViewColumn.One;
    const panelId = "hive_dashboard";
    const existingPanel = _HiveQueenPanel._panels.get(panelId);
    if (existingPanel) {
      existingPanel._panel.reveal(column);
      existingPanel._mode = "dashboard";
      existingPanel._projectRoot = projectRoot;
      existingPanel._updateDashboard();
      return;
    }
    const panel = vscode5.window.createWebviewPanel(
      _HiveQueenPanel.viewType,
      "\u{1F41D} Hive Dashboard",
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode5.Uri.joinPath(extensionUri, "media"),
          vscode5.Uri.joinPath(extensionUri, "dist"),
          vscode5.Uri.joinPath(extensionUri, "node_modules", "@vscode", "codicons", "dist")
        ]
      }
    );
    const queenPanel = new _HiveQueenPanel(
      panel,
      extensionUri,
      { plan: "", mode: "dashboard", projectRoot },
      () => {
      },
      panelId
    );
    queenPanel._projectRoot = projectRoot;
    _HiveQueenPanel._panels.set(panelId, queenPanel);
    panel.onDidDispose(() => {
      _HiveQueenPanel._panels.delete(panelId);
    });
    setTimeout(() => queenPanel._updateDashboard(), 100);
  }
  async _updateDashboard() {
    if (!this._projectRoot) return;
    const featureService = new FeatureService(this._projectRoot);
    const features = featureService.list();
    const hiveDir = path8.join(this._projectRoot, ".hive");
    const featureCards = features.map((name) => {
      const featureDir = path8.join(hiveDir, "features", name);
      const featureJsonPath = path8.join(featureDir, "feature.json");
      let status = "unknown";
      try {
        const info = JSON.parse(fs10.readFileSync(featureJsonPath, "utf-8"));
        status = info.status || "planning";
      } catch {
      }
      const blocked = fs10.existsSync(path8.join(featureDir, "BLOCKED"));
      let pendingReviews = 0;
      let taskCount = 0;
      let completedTasks = 0;
      const tasksDir = path8.join(featureDir, "tasks");
      if (fs10.existsSync(tasksDir)) {
        const taskFolders = fs10.readdirSync(tasksDir).filter(
          (f) => fs10.statSync(path8.join(tasksDir, f)).isDirectory()
        );
        taskCount = taskFolders.length;
        for (const task of taskFolders) {
          if (fs10.existsSync(path8.join(tasksDir, task, "PENDING_REVIEW"))) {
            pendingReviews++;
          }
          try {
            const statusJson = JSON.parse(fs10.readFileSync(path8.join(tasksDir, task, "status.json"), "utf-8"));
            if (statusJson.status === "done" || statusJson.status === "completed") {
              completedTasks++;
            }
          } catch {
          }
        }
      }
      let stale = false;
      try {
        const mtime = fs10.statSync(featureJsonPath).mtime;
        stale = Date.now() - mtime.getTime() > 2 * 60 * 60 * 1e3;
      } catch {
      }
      return { name, status, blocked, pendingReviews, stale, taskCount, completedTasks };
    });
    this._panel.webview.postMessage({
      type: "dashboard",
      features: featureCards
    });
  }
  async _showFeatureDetail(featureName) {
    if (!this._projectRoot) return;
    this._mode = "execution";
    this._featureName = featureName;
    this._featurePath = path8.join(this._projectRoot, ".hive", "features", featureName);
    const planService = new PlanService(this._projectRoot);
    const plan = planService.read(featureName);
    const taskService = new TaskService(this._projectRoot);
    const taskInfos = taskService.list(featureName);
    const tasks = taskInfos.map((info) => {
      const taskDir = path8.join(this._featurePath, "tasks", info.folder);
      const pendingReview = fs10.existsSync(path8.join(taskDir, "PENDING_REVIEW"));
      let summary = "";
      if (pendingReview) {
        try {
          const pending = JSON.parse(fs10.readFileSync(path8.join(taskDir, "PENDING_REVIEW"), "utf-8"));
          summary = pending.summary || "";
        } catch {
        }
      }
      return {
        name: info.folder,
        status: info.status,
        pendingReview,
        summary
      };
    });
    this._panel.webview.postMessage({
      type: "featureDetail",
      feature: featureName,
      plan: plan.content,
      tasks
    });
  }
  /**
   * Close a panel if it's open (used when agent cancels)
   */
  static closeIfOpen(panelId) {
    const panel = _HiveQueenPanel._panels.get(panelId);
    if (panel) {
      panel._closedByAgent = true;
      panel._panel.dispose();
      return true;
    } else {
      const pendingResolver = _HiveQueenPanel._pendingResolvers.get(panelId);
      if (pendingResolver) {
        pendingResolver({ approved: false, comments: [], action: "closed" });
        _HiveQueenPanel._pendingResolvers.delete(panelId);
        return true;
      }
    }
    return false;
  }
  /**
   * Update panel with new progress (execution mode)
   */
  updateProgress(tasks) {
    this._panel.webview.postMessage({
      type: "updateProgress",
      tasks
    });
  }
  /**
   * Show a pending ask in the panel
   */
  showAsk(ask) {
    this._panel.webview.postMessage({
      type: "showAsk",
      ask
    });
  }
  setMode(mode) {
    this._mode = mode;
    this._panel.webview.postMessage({
      type: "setMode",
      mode
    });
    if (mode === "execution" && this._featurePath && !this._taskWatcher) {
      this._startTaskWatcher();
    } else if (mode === "planning" && this._taskWatcher) {
      this._taskWatcher.dispose();
      this._taskWatcher = void 0;
    }
  }
  get mode() {
    return this._mode;
  }
  _startTaskWatcher() {
    if (!this._featurePath || this._taskWatcher) return;
    const tasksPattern = new vscode5.RelativePattern(
      vscode5.Uri.file(this._featurePath),
      "tasks/**/status.json"
    );
    this._taskWatcher = vscode5.workspace.createFileSystemWatcher(tasksPattern);
    const refreshTasks = () => this._refreshTaskProgress();
    this._taskWatcher.onDidCreate(refreshTasks, null, this._disposables);
    this._taskWatcher.onDidChange(refreshTasks, null, this._disposables);
    this._taskWatcher.onDidDelete(refreshTasks, null, this._disposables);
    this._refreshTaskProgress();
  }
  async _refreshTaskProgress() {
    if (!this._featureName || !this._projectRoot) return;
    try {
      const taskService = new TaskService(this._projectRoot);
      const taskInfos = taskService.list(this._featureName);
      const tasks = taskInfos.map((info) => ({
        id: info.folder,
        name: info.name || info.folder.replace(/^\d+-/, "").replace(/-/g, " "),
        status: this._mapTaskStatus(info.status)
      }));
      this.updateProgress(tasks);
    } catch (error) {
      console.error("Failed to refresh task progress:", error);
      this.updateProgress([]);
    }
  }
  _mapTaskStatus(status) {
    const statusMap = {
      pending: "pending",
      in_progress: "in_progress",
      executing: "in_progress",
      done: "done",
      completed: "done",
      blocked: "blocked"
    };
    return statusMap[status] || "pending";
  }
  _handleMessage(message) {
    switch (message.type) {
      case "approve":
        this._resolve({ approved: true, comments: message.comments, action: "approved" });
        break;
      case "reject":
        this._resolve({ approved: false, comments: message.comments, action: "rejected", reason: message.reason });
        break;
      case "addComment":
        this._comments.push({
          id: `comment_${Date.now()}`,
          lineNumber: message.lineNumber,
          text: message.text,
          resolved: false
        });
        this._updateComments();
        break;
      case "editComment":
        if (message.index >= 0 && message.index < this._comments.length) {
          this._comments[message.index].text = message.text;
          this._updateComments();
        }
        break;
      case "removeComment":
        if (message.index >= 0 && message.index < this._comments.length) {
          this._comments.splice(message.index, 1);
          this._updateComments();
        }
        break;
      case "exportPlan":
        this._exportPlan();
        break;
      case "searchFiles":
        this._handleSearchFiles(message.query);
        break;
      case "addFileReference":
        this._handleAddFileReference(message.file);
        break;
      case "removeAttachment":
        this._handleRemoveAttachment(message.attachmentId);
        break;
      case "openFeature":
        this._showFeatureDetail(message.name);
        break;
      case "backToDashboard":
        this._mode = "dashboard";
        this._updateDashboard();
        break;
      case "block":
        this._handleBlock(message.feature);
        break;
      case "unblock":
        this._handleUnblock(message.feature);
        break;
      case "approveTask":
        this._handleApproveTask(message.feature, message.task);
        break;
      case "requestChanges":
        this._handleRequestChanges(message.feature, message.task, message.feedback);
        break;
    }
  }
  async _handleBlock(featureName) {
    const reason = await vscode5.window.showInputBox({
      prompt: "Why are you blocking this feature?",
      placeHolder: "Enter reason for blocking"
    });
    if (reason && this._projectRoot) {
      const blockedPath = path8.join(this._projectRoot, ".hive", "features", featureName, "BLOCKED");
      fs10.writeFileSync(blockedPath, reason);
      vscode5.window.showInformationMessage(`\u26D4 Feature ${featureName} blocked`);
      this._updateDashboard();
    }
  }
  async _handleUnblock(featureName) {
    if (!this._projectRoot) return;
    const blockedPath = path8.join(this._projectRoot, ".hive", "features", featureName, "BLOCKED");
    if (fs10.existsSync(blockedPath)) {
      fs10.unlinkSync(blockedPath);
      vscode5.window.showInformationMessage(`\u{1F7E2} Feature ${featureName} unblocked`);
      this._updateDashboard();
    }
  }
  async _handleApproveTask(feature, task) {
    if (!this._projectRoot) return;
    const taskDir = path8.join(this._projectRoot, ".hive", "features", feature, "tasks", task);
    const pendingPath = path8.join(taskDir, "PENDING_REVIEW");
    const resultPath = path8.join(taskDir, "REVIEW_RESULT");
    fs10.writeFileSync(resultPath, "APPROVED");
    if (fs10.existsSync(pendingPath)) {
      fs10.unlinkSync(pendingPath);
    }
    vscode5.window.showInformationMessage(`\u2705 Task ${task} approved`);
  }
  async _handleRequestChanges(feature, task, feedback) {
    if (!this._projectRoot) return;
    const taskDir = path8.join(this._projectRoot, ".hive", "features", feature, "tasks", task);
    const pendingPath = path8.join(taskDir, "PENDING_REVIEW");
    const resultPath = path8.join(taskDir, "REVIEW_RESULT");
    fs10.writeFileSync(resultPath, feedback);
    if (fs10.existsSync(pendingPath)) {
      fs10.unlinkSync(pendingPath);
    }
    vscode5.window.showInformationMessage(`\u{1F504} Changes requested for ${task}`);
  }
  static showReview(extensionUri, projectRoot, feature, task) {
    const taskDir = path8.join(projectRoot, ".hive", "features", feature, "tasks", task);
    const pendingPath = path8.join(taskDir, "PENDING_REVIEW");
    if (!fs10.existsSync(pendingPath)) {
      vscode5.window.showWarningMessage(`No pending review for task ${task}`);
      return;
    }
    let reviewData = {};
    try {
      reviewData = JSON.parse(fs10.readFileSync(pendingPath, "utf-8"));
    } catch {
    }
    const column = vscode5.window.activeTextEditor?.viewColumn || vscode5.ViewColumn.One;
    const panelId = `review_${feature}_${task}`;
    const existingPanel = _HiveQueenPanel._panels.get(panelId);
    if (existingPanel) {
      existingPanel._panel.reveal(column);
      return;
    }
    const panel = vscode5.window.createWebviewPanel(
      _HiveQueenPanel.viewType,
      `\u{1F4CB} Review: ${task}`,
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode5.Uri.joinPath(extensionUri, "media"),
          vscode5.Uri.joinPath(extensionUri, "dist")
        ]
      }
    );
    const queenPanel = new _HiveQueenPanel(
      panel,
      extensionUri,
      { plan: "", mode: "review", projectRoot },
      () => {
      },
      panelId
    );
    queenPanel._projectRoot = projectRoot;
    queenPanel._mode = "review";
    _HiveQueenPanel._panels.set(panelId, queenPanel);
    panel.onDidDispose(() => {
      _HiveQueenPanel._panels.delete(panelId);
    });
    panel.webview.html = queenPanel._getReviewHtml(feature, task, reviewData);
  }
  _getReviewHtml(feature, task, review) {
    const nonce = this._getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Review: ${task}</title>
  <style>
    body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); max-width: 700px; margin: 0 auto; }
    h1 { margin-bottom: 8px; }
    .meta { color: var(--vscode-descriptionForeground); margin-bottom: 24px; }
    .summary { background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-editorWidget-border); border-radius: 8px; padding: 16px; margin: 16px 0; white-space: pre-wrap; }
    h2 { font-size: 14px; margin-bottom: 8px; color: var(--vscode-descriptionForeground); }
    textarea { width: 100%; height: 120px; padding: 12px; border: 1px solid var(--vscode-input-border); background: var(--vscode-input-background); color: var(--vscode-input-foreground); border-radius: 4px; font-family: inherit; font-size: 13px; resize: vertical; box-sizing: border-box; }
    .actions { display: flex; gap: 12px; margin-top: 20px; }
    button { padding: 10px 24px; font-size: 14px; cursor: pointer; border-radius: 4px; border: none; }
    .approve { background: #28a745; color: white; }
    .approve:hover { background: #22863a; }
    .changes { background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: 1px solid var(--vscode-button-border); }
    .changes:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .error { color: var(--vscode-errorForeground); font-size: 13px; margin-top: 8px; display: none; }
  </style>
</head>
<body>
  <h1>\u{1F4CB} Review: ${task}</h1>
  <p class="meta">Attempt #${review.attempt || 1} \u2022 Feature: ${feature}</p>
  
  <h2>SUMMARY FROM AGENT</h2>
  <div class="summary">${review.summary || "No summary provided"}</div>
  
  <h2>YOUR FEEDBACK (for changes)</h2>
  <textarea id="feedback" placeholder="Describe what changes are needed..."></textarea>
  <p class="error" id="error">Please provide feedback when requesting changes.</p>
  
  <div class="actions">
    <button class="approve" onclick="approve()">\u2705 Approve</button>
    <button class="changes" onclick="requestChanges()">\u{1F504} Request Changes</button>
  </div>
  
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const feature = '${feature}';
    const task = '${task}';
    
    function approve() {
      vscode.postMessage({ type: 'approveTask', feature, task });
      document.body.innerHTML = '<h1>\u2705 Approved</h1><p>You can close this panel.</p>';
    }
    
    function requestChanges() {
      const feedback = document.getElementById('feedback').value.trim();
      if (!feedback) {
        document.getElementById('error').style.display = 'block';
        return;
      }
      vscode.postMessage({ type: 'requestChanges', feature, task, feedback });
      document.body.innerHTML = '<h1>\u{1F504} Changes Requested</h1><p>You can close this panel.</p>';
    }
  </script>
</body>
</html>`;
  }
  async _exportPlan() {
    const workspaceFolders = vscode5.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode5.window.showErrorMessage("No workspace folder open");
      return;
    }
    let content = `# ${this._planTitle}

`;
    content += `**Mode:** ${this._mode}
`;
    content += `**Date:** ${(/* @__PURE__ */ new Date()).toLocaleString()}

`;
    content += `---

`;
    content += this._planContent;
    if (this._comments.length > 0) {
      content += `

---

## Comments

`;
      for (const comment of this._comments) {
        content += `> Line ${comment.lineNumber}

`;
        content += `${comment.text}

`;
      }
    }
    const uri = await vscode5.window.showSaveDialog({
      defaultUri: vscode5.Uri.joinPath(workspaceFolders[0].uri, `plan-export-${Date.now()}.md`),
      filters: { "Markdown": ["md"] }
    });
    if (uri) {
      try {
        await vscode5.workspace.fs.writeFile(uri, Buffer.from(content, "utf-8"));
        vscode5.window.showInformationMessage(`Plan exported to ${uri.fsPath}`);
      } catch (error) {
        vscode5.window.showErrorMessage(`Failed to export plan: ${error}`);
      }
    }
  }
  _updateComments() {
    this._panel.webview.postMessage({
      type: "updateComments",
      comments: this._comments
    });
  }
  async _handleSearchFiles(query) {
    try {
      const sanitizedQuery = this._sanitizeSearchQuery(query);
      const allFiles = await vscode5.workspace.findFiles("**/*", "**/node_modules/**", 2e3);
      const queryLower = sanitizedQuery.toLowerCase();
      const seenFolders = /* @__PURE__ */ new Set();
      const folderResults = [];
      for (const uri of allFiles) {
        const relativePath = vscode5.workspace.asRelativePath(uri);
        const dirPath = path8.dirname(relativePath);
        if (dirPath && dirPath !== "." && !seenFolders.has(dirPath)) {
          seenFolders.add(dirPath);
          const parts = dirPath.split(/[\\/]/);
          const folderName = parts[parts.length - 1];
          if (!queryLower || folderName.toLowerCase().includes(queryLower) || dirPath.toLowerCase().includes(queryLower)) {
            const workspaceFolder = vscode5.workspace.getWorkspaceFolder(uri)?.uri ?? vscode5.workspace.workspaceFolders[0].uri;
            folderResults.push({
              name: folderName,
              path: dirPath,
              uri: vscode5.Uri.joinPath(workspaceFolder, dirPath).toString(),
              icon: "folder",
              isFolder: true
            });
          }
        }
      }
      const fileResults = allFiles.map((uri) => {
        const relativePath = vscode5.workspace.asRelativePath(uri);
        const fileName = uri.fsPath.split(/[\\/]/).pop() || "file";
        return {
          name: fileName,
          path: relativePath,
          uri: uri.toString(),
          icon: this._getFileIcon(fileName),
          isFolder: false
        };
      }).filter((file) => !queryLower || file.name.toLowerCase().includes(queryLower) || file.path.toLowerCase().includes(queryLower));
      const allResults = [...folderResults, ...fileResults].sort((a, b) => {
        if (a.isFolder && !b.isFolder) return -1;
        if (!a.isFolder && b.isFolder) return 1;
        const aExact = a.name.toLowerCase().startsWith(queryLower);
        const bExact = b.name.toLowerCase().startsWith(queryLower);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.name.localeCompare(b.name);
      }).slice(0, 50);
      this._panel.webview.postMessage({
        type: "fileSearchResults",
        files: allResults
      });
    } catch (error) {
      console.error("File search error:", error);
      this._panel.webview.postMessage({
        type: "fileSearchResults",
        files: []
      });
    }
  }
  _handleAddFileReference(file) {
    if (!file) return;
    const attachment = {
      id: `${file.isFolder ? "folder" : "file"}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      name: file.name,
      uri: file.uri,
      isFolder: file.isFolder,
      folderPath: file.isFolder ? file.path : void 0
    };
    this._attachments.push(attachment);
    this._panel.webview.postMessage({
      type: "updateAttachments",
      attachments: this._attachments
    });
  }
  _handleRemoveAttachment(attachmentId) {
    this._attachments = this._attachments.filter((a) => a.id !== attachmentId);
    this._panel.webview.postMessage({
      type: "updateAttachments",
      attachments: this._attachments
    });
  }
  _sanitizeSearchQuery(query) {
    return query.replace(/\.\./g, "").replace(/[<>:"|?*]/g, "").trim().substring(0, 100);
  }
  _getFileIcon(fileName) {
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    const iconMap = {
      ts: "symbol-method",
      tsx: "symbol-method",
      js: "symbol-variable",
      jsx: "symbol-variable",
      json: "json",
      md: "markdown",
      html: "code",
      css: "symbol-color",
      py: "symbol-misc",
      rs: "symbol-structure",
      go: "symbol-event",
      java: "symbol-class",
      yml: "settings-gear",
      yaml: "settings-gear"
    };
    return iconMap[ext] || "file";
  }
  _resolve(result) {
    if (this._resolvePromise) {
      this._resolvePromise(result);
      this._resolvePromise = void 0;
      _HiveQueenPanel._pendingResolvers.delete(this._panelId);
    }
    this._panel.dispose();
  }
  _dispose() {
    if (this._resolvePromise && this._closedByAgent) {
      this._resolvePromise({ approved: false, comments: this._comments, action: "closed" });
      this._resolvePromise = void 0;
      _HiveQueenPanel._pendingResolvers.delete(this._panelId);
    }
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
  _getHtmlContent() {
    if (this._mode === "dashboard") {
      return this._getDashboardHtml();
    }
    const webview = this._panel.webview;
    const styleUri = webview.asWebviewUri(
      vscode5.Uri.joinPath(this._extensionUri, "media", "hiveQueen.css")
    );
    const codiconsUri = webview.asWebviewUri(
      vscode5.Uri.joinPath(this._extensionUri, "node_modules", "@vscode", "codicons", "dist", "codicon.css")
    );
    const scriptUri = webview.asWebviewUri(
      vscode5.Uri.joinPath(this._extensionUri, "dist", "hiveQueen.js")
    );
    const nonce = this._getNonce();
    const templatePath = path8.join(this._extensionUri.fsPath, "media", "hiveQueen.html");
    let template = fs10.readFileSync(templatePath, "utf8");
    const replacements = {
      "{{cspSource}}": webview.cspSource,
      "{{nonce}}": nonce,
      "{{styleUri}}": styleUri.toString(),
      "{{codiconsUri}}": codiconsUri.toString(),
      "{{scriptUri}}": scriptUri.toString(),
      "{{approve}}": "Approve Plan",
      "{{reject}}": "Request Changes",
      "{{export}}": "Export",
      "{{addComment}}": "Add Comment",
      "{{editComment}}": "Edit",
      "{{removeComment}}": "Remove",
      "{{commentPlaceholder}}": "Enter your feedback...",
      "{{save}}": "Save",
      "{{cancel}}": "Cancel",
      "{{comments}}": "Comments",
      "{{noComments}}": "No comments yet. Hover over a line to add feedback.",
      "{{paneTitle}}": "Hive Queen"
    };
    for (const [placeholder, value] of Object.entries(replacements)) {
      template = template.split(placeholder).join(value);
    }
    return template;
  }
  _getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
  _getDashboardHtml() {
    const nonce = this._getNonce();
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Hive Dashboard</title>
  <style>
    body { font-family: var(--vscode-font-family); padding: 16px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
    h1 { margin-bottom: 24px; }
    .feature-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
    .feature-card { background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-editorWidget-border); border-radius: 8px; padding: 16px; cursor: pointer; transition: border-color 0.2s; }
    .feature-card:hover { border-color: var(--vscode-focusBorder); }
    .feature-card.blocked { border-left: 4px solid var(--vscode-errorForeground); }
    .feature-card.pending { border-left: 4px solid var(--vscode-warningForeground); }
    .feature-card.stale { opacity: 0.7; }
    .feature-name { font-size: 16px; font-weight: bold; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
    .badge { font-size: 11px; padding: 2px 6px; border-radius: 4px; font-weight: normal; }
    .badge.blocked { background: var(--vscode-errorForeground); color: white; }
    .badge.pending { background: var(--vscode-warningForeground); color: black; }
    .badge.stale { background: var(--vscode-descriptionForeground); color: white; }
    .feature-stats { font-size: 13px; color: var(--vscode-descriptionForeground); }
    .feature-actions { margin-top: 12px; display: flex; gap: 8px; }
    .feature-actions button { padding: 4px 12px; font-size: 12px; cursor: pointer; border: 1px solid var(--vscode-button-border); background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border-radius: 4px; }
    .feature-actions button:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .empty-state { text-align: center; padding: 48px; color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <h1>\u{1F41D} Hive Dashboard</h1>
  <div id="content" class="feature-grid"></div>
  
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    
    window.addEventListener('message', event => {
      const msg = event.data;
      if (msg.type === 'dashboard') {
        renderDashboard(msg.features);
      }
    });
    
    function renderDashboard(features) {
      const container = document.getElementById('content');
      
      if (features.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>No features yet.</p><p>Create one with hive_feature_create</p></div>';
        return;
      }
      
      container.innerHTML = features.map(f => {
        const classes = ['feature-card'];
        if (f.blocked) classes.push('blocked');
        else if (f.pendingReviews > 0) classes.push('pending');
        if (f.stale) classes.push('stale');
        
        let badges = '';
        if (f.blocked) badges += '<span class="badge blocked">\u26D4 BLOCKED</span>';
        if (f.pendingReviews > 0) badges += '<span class="badge pending">\u{1F7E1} ' + f.pendingReviews + ' review</span>';
        if (f.stale && !f.blocked) badges += '<span class="badge stale">\u26AA stale</span>';
        
        return '<div class="' + classes.join(' ') + '" onclick="openFeature(\\'' + f.name + '\\')">' +
          '<div class="feature-name">' + f.name + badges + '</div>' +
          '<div class="feature-stats">' + f.completedTasks + '/' + f.taskCount + ' tasks \u2022 ' + f.status + '</div>' +
          '<div class="feature-actions">' +
            (f.blocked 
              ? '<button onclick="event.stopPropagation(); unblock(\\'' + f.name + '\\')">\u{1F7E2} Unblock</button>'
              : '<button onclick="event.stopPropagation(); block(\\'' + f.name + '\\')">\u26D4 Block</button>') +
          '</div>' +
        '</div>';
      }).join('');
    }
    
    function openFeature(name) {
      vscode.postMessage({ type: 'openFeature', name });
    }
    
    function block(name) {
      vscode.postMessage({ type: 'block', feature: name });
    }
    
    function unblock(name) {
      vscode.postMessage({ type: 'unblock', feature: name });
    }
  </script>
</body>
</html>`;
  }
};

// src/tools/base.ts
var vscode6 = __toESM(require("vscode"));
function createToolResult(content) {
  return new vscode6.LanguageModelToolResult([
    new vscode6.LanguageModelTextPart(content)
  ]);
}
function registerTool(context, registration) {
  const tool = {
    prepareInvocation(options, _token) {
      const invocationMessage = `Executing ${registration.displayName}...`;
      if (registration.destructive) {
        return {
          invocationMessage,
          confirmationMessages: {
            title: registration.displayName,
            message: new vscode6.MarkdownString(
              `This action will modify your project. Continue?`
            )
          }
        };
      }
      return { invocationMessage };
    },
    async invoke(options, token) {
      try {
        const result = await registration.invoke(options.input, token);
        return createToolResult(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return createToolResult(`Error: ${message}`);
      }
    }
  };
  return vscode6.lm.registerTool(registration.name, tool);
}
function registerAllTools(context, registrations) {
  for (const reg of registrations) {
    const disposable = registerTool(context, reg);
    context.subscriptions.push(disposable);
  }
}

// src/tools/feature.ts
function getFeatureTools(workspaceRoot) {
  const featureService = new FeatureService(workspaceRoot);
  return [
    {
      name: "hive_feature_create",
      displayName: "Create Hive Feature",
      modelDescription: "Create a new Hive feature for plan-first development. Use at the start of any new work to establish a planning workspace with context, plan, and task tracking.",
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Feature name (kebab-case recommended)"
          },
          ticket: {
            type: "string",
            description: "Optional ticket/issue reference"
          }
        },
        required: ["name"]
      },
      invoke: async (input) => {
        const { name, ticket } = input;
        const feature = featureService.create(name, ticket);
        return JSON.stringify({
          success: true,
          feature: feature.name,
          status: feature.status,
          message: `Feature '${name}' created. Next: write a plan with hive_plan_write.`
        });
      }
    },
    {
      name: "hive_feature_list",
      displayName: "List Hive Features",
      modelDescription: "List all Hive features in the workspace with their status. Use to see available features before switching context or checking progress.",
      readOnly: true,
      inputSchema: {
        type: "object",
        properties: {}
      },
      invoke: async () => {
        const names = featureService.list();
        const features = names.map((name) => {
          const info = featureService.getInfo(name);
          return {
            name,
            status: info?.status || "unknown",
            taskCount: info?.tasks.length || 0,
            hasPlan: info?.hasPlan || false
          };
        });
        return JSON.stringify({ features });
      }
    },
    {
      name: "hive_feature_complete",
      displayName: "Complete Hive Feature",
      modelDescription: "Mark a feature as completed. Use when all tasks are done and the feature is ready for final integration. This is irreversible.",
      destructive: true,
      inputSchema: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Feature name to mark as completed"
          }
        },
        required: ["name"]
      },
      invoke: async (input) => {
        const { name } = input;
        const feature = featureService.complete(name);
        return JSON.stringify({
          success: true,
          feature: feature.name,
          status: feature.status,
          completedAt: feature.completedAt
        });
      }
    }
  ];
}

// src/tools/plan.ts
function getPlanTools(workspaceRoot) {
  const planService = new PlanService(workspaceRoot);
  const contextService = new ContextService(workspaceRoot);
  return [
    {
      name: "hive_plan_write",
      displayName: "Write Hive Plan",
      modelDescription: "Write or update the plan.md for a feature. The plan defines tasks to execute. Use markdown with ### numbered headers for tasks. Clears existing comments when plan is rewritten.",
      inputSchema: {
        type: "object",
        properties: {
          feature: {
            type: "string",
            description: "Feature name"
          },
          content: {
            type: "string",
            description: "Plan content in markdown. Use ### 1. Task Name format for tasks."
          }
        },
        required: ["feature", "content"]
      },
      invoke: async (input) => {
        const { feature, content } = input;
        const planPath = planService.write(feature, content);
        let contextWarning = "";
        try {
          const contexts = contextService.list(feature);
          if (contexts.length === 0) {
            contextWarning = "\n\n\u26A0\uFE0F WARNING: No context files created yet! Workers need context to execute well. Use hive_context_write to document:\n- Research findings and patterns\n- User preferences and decisions\n- Architecture constraints\n- References to existing code";
          }
        } catch {
          contextWarning = "\n\n\u26A0\uFE0F WARNING: Could not check context files. Consider using hive_context_write to document findings for workers.";
        }
        return JSON.stringify({
          success: true,
          path: planPath,
          message: `Plan written. User can review and add comments. When ready, use hive_plan_approve.${contextWarning}`
        });
      }
    },
    {
      name: "hive_plan_read",
      displayName: "Read Hive Plan",
      modelDescription: "Read the plan.md and any user comments for a feature. Use to check plan content, status, and user feedback before making changes.",
      readOnly: true,
      inputSchema: {
        type: "object",
        properties: {
          feature: {
            type: "string",
            description: "Feature name"
          }
        },
        required: ["feature"]
      },
      invoke: async (input) => {
        const { feature } = input;
        const result = planService.read(feature);
        if (!result) {
          return JSON.stringify({ error: `No plan found for feature '${feature}'` });
        }
        return JSON.stringify({
          content: result.content,
          status: result.status,
          comments: result.comments,
          commentCount: result.comments.length
        });
      }
    },
    {
      name: "hive_plan_approve",
      displayName: "Approve Hive Plan",
      modelDescription: "Approve a plan for execution. Use after user has reviewed the plan and resolved any comments. Changes feature status to approved.",
      inputSchema: {
        type: "object",
        properties: {
          feature: {
            type: "string",
            description: "Feature name"
          }
        },
        required: ["feature"]
      },
      invoke: async (input) => {
        const { feature } = input;
        let contextWarning = "";
        try {
          const contexts = contextService.list(feature);
          if (contexts.length === 0) {
            contextWarning = "\n\n\u26A0\uFE0F Note: No context files found. Consider using hive_context_write during execution to document findings for future reference.";
          }
        } catch {
        }
        planService.approve(feature);
        return JSON.stringify({
          success: true,
          message: `Plan approved. Use hive_tasks_sync to generate tasks from the plan.${contextWarning}`
        });
      }
    }
  ];
}

// src/tools/task.ts
function getTaskTools(workspaceRoot) {
  const taskService = new TaskService(workspaceRoot);
  return [
    {
      name: "hive_tasks_sync",
      displayName: "Sync Hive Tasks",
      modelDescription: "Generate tasks from approved plan.md by parsing ### numbered headers. Creates task folders with status.json. Returns summary of created/removed/kept tasks. Use after hive_plan_approve.",
      inputSchema: {
        type: "object",
        properties: {
          feature: {
            type: "string",
            description: "Feature name"
          }
        },
        required: ["feature"]
      },
      invoke: async (input, _token) => {
        const { feature } = input;
        const result = taskService.sync(feature);
        return JSON.stringify({
          created: result.created.length,
          removed: result.removed.length,
          kept: result.kept.length,
          manual: result.manual.length,
          message: `${result.created.length} tasks created, ${result.removed.length} removed, ${result.kept.length} kept, ${result.manual.length} manual`,
          hints: [
            "Use hive_exec_start to begin work on a task.",
            "Tasks should be executed in order unless explicitly parallelizable.",
            "Read context files before starting implementation.",
            "Call hive_session_refresh periodically to check for user steering."
          ]
        });
      }
    },
    {
      name: "hive_task_create",
      displayName: "Create Manual Task",
      modelDescription: "Create a task manually, not from the plan. Use for ad-hoc work or tasks discovered during execution.",
      inputSchema: {
        type: "object",
        properties: {
          feature: {
            type: "string",
            description: "Feature name"
          },
          name: {
            type: "string",
            description: "Task name"
          },
          order: {
            type: "number",
            description: "Optional order number for the task"
          }
        },
        required: ["feature", "name"]
      },
      invoke: async (input, _token) => {
        const { feature, name, order } = input;
        const folder = taskService.create(feature, name, order);
        return `Created task "${folder}" with status: pending
Reminder: run hive_exec_start to work in its worktree, and ensure any subagents work in that worktree too.`;
      }
    },
    {
      name: "hive_task_update",
      displayName: "Update Hive Task",
      modelDescription: "Update a task status (pending/in_progress/done/cancelled) or add a work summary. Returns plain text confirmation. Does NOT merge - use hive_merge for integration.",
      inputSchema: {
        type: "object",
        properties: {
          feature: {
            type: "string",
            description: "Feature name"
          },
          task: {
            type: "string",
            description: "Task folder name"
          },
          status: {
            type: "string",
            enum: ["pending", "in_progress", "done", "cancelled"],
            description: "New status"
          },
          summary: {
            type: "string",
            description: "Summary of what was done"
          }
        },
        required: ["feature", "task"]
      },
      invoke: async (input, _token) => {
        const { feature, task, status, summary } = input;
        const updates = {};
        if (status) updates.status = status;
        if (summary) updates.summary = summary;
        const updated = taskService.update(feature, task, updates);
        const statusMsg = summary ? `. Summary: ${summary}` : "";
        return `Task "${task}" updated to ${updated.status}${statusMsg}`;
      }
    }
  ];
}

// src/tools/subtask.ts
function getSubtaskTools(workspaceRoot) {
  const subtaskService = new SubtaskService(workspaceRoot);
  return [
    {
      name: "hive_subtask_create",
      displayName: "Create Subtask",
      modelDescription: "Create a subtask within a task for TDD workflows. Generates subtask ID and status. Returns confirmation with subtask ID. Types: test, implement, review, verify, research, debug, custom.",
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" },
          task: { type: "string", description: "Task folder name" },
          name: { type: "string", description: "Subtask name" },
          type: {
            type: "string",
            enum: ["test", "implement", "review", "verify", "research", "debug", "custom"],
            description: "Subtask type for categorization"
          }
        },
        required: ["feature", "task", "name"]
      },
      invoke: async (input, _token) => {
        const { feature, task, name, type } = input;
        const subtask = subtaskService.create(feature, task, name, type);
        return `Created subtask "${subtask.id}" in task "${task}"`;
      }
    },
    {
      name: "hive_subtask_update",
      displayName: "Update Subtask",
      modelDescription: "Update a subtask status (pending/in_progress/done/cancelled). Returns plain text confirmation with new status. Use to track TDD cycle progress.",
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" },
          task: { type: "string", description: "Task folder name" },
          subtask: { type: "string", description: "Subtask ID (e.g., 1.1)" },
          status: {
            type: "string",
            enum: ["pending", "in_progress", "done", "cancelled"],
            description: "New status"
          }
        },
        required: ["feature", "task", "subtask", "status"]
      },
      invoke: async (input, _token) => {
        const { feature, task, subtask, status } = input;
        const updated = subtaskService.update(feature, task, subtask, status);
        return `Subtask "${subtask}" in task "${task}" updated to ${updated.status}`;
      }
    },
    {
      name: "hive_subtask_list",
      displayName: "List Subtasks",
      modelDescription: "List all subtasks for a task. Returns formatted list with status and names. Use to check TDD progress or see what work remains.",
      readOnly: true,
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" },
          task: { type: "string", description: "Task folder name" }
        },
        required: ["feature", "task"]
      },
      invoke: async (input, _token) => {
        const { feature, task } = input;
        const subtasks = subtaskService.list(feature, task);
        return subtasks.map((st) => `- [${st.status}] ${st.id}: ${st.name}`).join("\n");
      }
    },
    {
      name: "hive_subtask_spec_write",
      displayName: "Write Subtask Spec",
      modelDescription: "Write detailed instructions for a subtask in spec.md. Use to define what the subtask should accomplish.",
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" },
          task: { type: "string", description: "Task folder name" },
          subtask: { type: "string", description: "Subtask ID (e.g., 1.1)" },
          content: { type: "string", description: "Spec content in markdown" }
        },
        required: ["feature", "task", "subtask", "content"]
      },
      invoke: async (input, _token) => {
        const { feature, task, subtask, content } = input;
        const path13 = subtaskService.writeSpec(feature, task, subtask, content);
        return `Spec written to ${path13}`;
      }
    },
    {
      name: "hive_subtask_report_write",
      displayName: "Write Subtask Report",
      modelDescription: "Write completion report for a subtask in report.md. Returns file path. Use to document what was accomplished and any findings/issues discovered.",
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" },
          task: { type: "string", description: "Task folder name" },
          subtask: { type: "string", description: "Subtask ID (e.g., 1.1)" },
          content: { type: "string", description: "Report content in markdown" }
        },
        required: ["feature", "task", "subtask", "content"]
      },
      invoke: async (input, _token) => {
        const { feature, task, subtask, content } = input;
        const path13 = subtaskService.writeReport(feature, task, subtask, content);
        return `Report written to ${path13}`;
      }
    }
  ];
}

// src/tools/exec.ts
var path9 = __toESM(require("path"));
function getExecTools(workspaceRoot) {
  const worktreeService = new WorktreeService({
    baseDir: workspaceRoot,
    hiveDir: path9.join(workspaceRoot, ".hive")
  });
  const taskService = new TaskService(workspaceRoot);
  return [
    {
      name: "hive_exec_start",
      displayName: "Start Task Execution",
      modelDescription: "Create a git worktree and begin work on a task. Isolates changes in a separate directory. Use when ready to implement a task.",
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" },
          task: { type: "string", description: "Task folder name" }
        },
        required: ["feature", "task"]
      },
      invoke: async (input) => {
        const { feature, task } = input;
        const worktree = await worktreeService.create(feature, task);
        return JSON.stringify({
          success: true,
          worktreePath: worktree.path,
          branch: worktree.branch,
          message: `Worktree created. Work in ${worktree.path}. When done, use hive_exec_complete.`,
          hints: [
            "Do all work inside this worktree. Ensure any subagents do the same.",
            "Call hive_session_refresh periodically to check for user steering comments.",
            "Use hive_ask if you need user input to proceed.",
            "Read context files (hive_context_read) before starting implementation."
          ]
        });
      }
    },
    {
      name: "hive_exec_complete",
      displayName: "Complete Task Execution",
      modelDescription: "Commit changes in worktree and mark task done. Does NOT merge - use hive_merge for that. Use when task implementation is finished.",
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" },
          task: { type: "string", description: "Task folder name" },
          summary: { type: "string", description: "Summary of what was done" }
        },
        required: ["feature", "task", "summary"]
      },
      invoke: async (input) => {
        const { feature, task, summary } = input;
        const result = await worktreeService.commitChanges(feature, task, summary);
        if (result.committed) {
          taskService.update(feature, task, { status: "done", summary });
          const reportContent = `# Task Completion Report

**Task:** ${task}
**Status:** Done
**Completed:** ${(/* @__PURE__ */ new Date()).toISOString()}
**Commit:** ${result.sha}

## Summary

${summary}
`;
          taskService.writeReport(feature, task, reportContent);
        }
        return JSON.stringify({
          success: true,
          commitHash: result.sha,
          committed: result.committed,
          message: result.committed ? `Changes committed. Use hive_merge to integrate into main branch.` : result.message || "No changes to commit",
          hints: result.committed ? [
            "Call hive_session_refresh to check progress and pending user questions.",
            "Proceed to next task or use hive_merge to integrate changes."
          ] : []
        });
      }
    },
    {
      name: "hive_exec_abort",
      displayName: "Abort Task Execution",
      modelDescription: "Discard all changes and remove worktree. Use when task approach is wrong and needs restart. This is destructive and irreversible.",
      destructive: true,
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" },
          task: { type: "string", description: "Task folder name" }
        },
        required: ["feature", "task"]
      },
      invoke: async (input) => {
        const { feature, task } = input;
        await worktreeService.remove(feature, task);
        taskService.update(feature, task, { status: "pending", summary: "" });
        return JSON.stringify({
          success: true,
          message: `Worktree removed. Task status reset to pending. Can restart with hive_exec_start.`
        });
      }
    }
  ];
}

// src/tools/merge.ts
var path10 = __toESM(require("path"));
function getMergeTools(workspaceRoot) {
  const worktreeService = new WorktreeService({
    baseDir: workspaceRoot,
    hiveDir: path10.join(workspaceRoot, ".hive")
  });
  return [
    {
      name: "hive_merge",
      displayName: "Merge Task Branch",
      modelDescription: "Merge a completed task branch into current branch. Supports merge, squash, or rebase strategies. Use after hive_exec_complete to integrate changes.",
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" },
          task: { type: "string", description: "Task folder name" },
          strategy: {
            type: "string",
            enum: ["merge", "squash", "rebase"],
            description: "Merge strategy (default: merge)"
          }
        },
        required: ["feature", "task"]
      },
      invoke: async (input) => {
        const { feature, task, strategy = "merge" } = input;
        const result = await worktreeService.merge(feature, task, strategy);
        return JSON.stringify({
          success: true,
          strategy,
          message: result.message
        });
      }
    },
    {
      name: "hive_worktree_list",
      displayName: "List Worktrees",
      modelDescription: "List all worktrees for a feature. Shows which tasks have active worktrees for concurrent work.",
      readOnly: true,
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" }
        },
        required: ["feature"]
      },
      invoke: async (input) => {
        const { feature } = input;
        const worktrees = await worktreeService.list(feature);
        return JSON.stringify({ worktrees });
      }
    }
  ];
}

// src/tools/context.ts
function getContextTools(workspaceRoot) {
  const contextService = new ContextService(workspaceRoot);
  return [
    {
      name: "hive_context_write",
      displayName: "Write Context File",
      modelDescription: "Write a context file to store research findings, decisions, or reference material. Context persists across sessions and helps workers understand background.",
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" },
          name: { type: "string", description: "Context file name (without .md)" },
          content: { type: "string", description: "Context content in markdown" }
        },
        required: ["feature", "name", "content"]
      },
      invoke: async (input) => {
        const { feature, name, content } = input;
        const path13 = contextService.write(feature, name, content);
        return JSON.stringify({ success: true, path: path13 });
      }
    },
    {
      name: "hive_context_read",
      displayName: "Read Context",
      modelDescription: "Read a specific context file or all context for a feature. Use to understand background before starting work.",
      readOnly: true,
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" },
          name: { type: "string", description: "Context file name (optional, omit to read all)" }
        },
        required: ["feature"]
      },
      invoke: async (input) => {
        const { feature, name } = input;
        if (name) {
          const content = contextService.read(feature, name);
          return JSON.stringify({ name, content });
        }
        const compiled = contextService.compile(feature);
        return JSON.stringify({ allContext: compiled });
      }
    },
    {
      name: "hive_context_list",
      displayName: "List Context Files",
      modelDescription: "List all context files for a feature. Shows what background information is available.",
      readOnly: true,
      inputSchema: {
        type: "object",
        properties: {
          feature: { type: "string", description: "Feature name" }
        },
        required: ["feature"]
      },
      invoke: async (input) => {
        const { feature } = input;
        const files = contextService.list(feature);
        return JSON.stringify({
          files: files.map((f) => ({ name: f.name, updatedAt: f.updatedAt }))
        });
      }
    }
  ];
}

// src/tools/ask.ts
var vscode7 = __toESM(require("vscode"));
function getProjectRoot() {
  const workspaceFolders = vscode7.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error("No workspace folder open");
  }
  return workspaceFolders[0].uri.fsPath;
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function getAskTools() {
  return [
    {
      name: "hiveAsk",
      displayName: "Hive Ask",
      modelDescription: "Ask the user a question and wait for their response. Creates a blocking question that appears in the Hive Queen Panel. The agent will wait until the user answers or timeout is reached.",
      inputSchema: {
        type: "object",
        properties: {
          feature: {
            type: "string",
            description: "The feature name"
          },
          question: {
            type: "string",
            description: "The question to ask the user"
          },
          timeout: {
            type: "number",
            description: "Optional timeout in seconds (default: 300, max: 600)"
          }
        },
        required: ["feature", "question"]
      },
      destructive: false,
      readOnly: true,
      invoke: async (input, token) => {
        const projectRoot = getProjectRoot();
        const askService = new AskService(projectRoot);
        const ask = askService.createAsk(input.feature, input.question);
        vscode7.commands.executeCommand("hive.showAsk", {
          id: ask.id,
          question: ask.question,
          feature: input.feature,
          timestamp: ask.timestamp
        });
        const timeoutMs = Math.min((input.timeout || 300) * 1e3, 6e5);
        const pollInterval = 1e3;
        const startTime = Date.now();
        while (askService.isLocked(input.feature, ask.id)) {
          if (token.isCancellationRequested) {
            askService.cleanup(input.feature, ask.id);
            return "Question cancelled by user.";
          }
          if (Date.now() - startTime > timeoutMs) {
            askService.cleanup(input.feature, ask.id);
            return `Question timed out after ${input.timeout || 300} seconds. No answer received.`;
          }
          await sleep(pollInterval);
        }
        const answer = askService.getAnswer(input.feature, ask.id);
        if (answer) {
          askService.cleanup(input.feature, ask.id);
          return `User answered: ${answer.answer}`;
        }
        askService.cleanup(input.feature, ask.id);
        return "No answer received (lock removed without answer).";
      }
    },
    {
      name: "hiveAskListPending",
      displayName: "Hive List Pending Asks",
      modelDescription: "List all pending questions that are waiting for user answers.",
      inputSchema: {
        type: "object",
        properties: {
          feature: {
            type: "string",
            description: "The feature name"
          }
        },
        required: ["feature"]
      },
      destructive: false,
      readOnly: true,
      invoke: async (input) => {
        const projectRoot = getProjectRoot();
        const askService = new AskService(projectRoot);
        const pending = askService.listPending(input.feature);
        if (pending.length === 0) {
          return "No pending questions.";
        }
        const lines = pending.map(
          (ask) => `- [${ask.id}] ${ask.question} (asked at ${ask.timestamp})`
        );
        return `Pending questions (${pending.length}):
${lines.join("\n")}`;
      }
    }
  ];
}

// src/tools/session.ts
var vscode8 = __toESM(require("vscode"));
function getProjectRoot2() {
  const workspaceFolders = vscode8.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error("No workspace folder open");
  }
  return workspaceFolders[0].uri.fsPath;
}
function getSessionTools() {
  return [
    {
      name: "hiveSessionRefresh",
      displayName: "Hive Session Refresh",
      modelDescription: "Get current feature state to stay aligned. Returns plan summary, task progress, context files, pending asks, and guidance. Call periodically during execution to check for user steering and prevent context drift.",
      inputSchema: {
        type: "object",
        properties: {
          feature: {
            type: "string",
            description: "Feature name (optional, uses active feature if not specified)"
          }
        }
      },
      destructive: false,
      readOnly: true,
      invoke: async (input) => {
        const projectRoot = getProjectRoot2();
        const featureService = new FeatureService(projectRoot);
        const planService = new PlanService(projectRoot);
        const taskService = new TaskService(projectRoot);
        const contextService = new ContextService(projectRoot);
        const askService = new AskService(projectRoot);
        let featureName = input.feature;
        if (!featureName) {
          const active = featureService.getActive();
          if (!active) {
            return "No active feature. Use hive_feature_create or specify a feature name.";
          }
          featureName = active.name;
        }
        const result = {
          feature: featureName,
          phase: "unknown",
          planSummary: "",
          tasks: [],
          progress: { total: 0, done: 0, inProgress: 0, pending: 0 },
          contextFiles: [],
          pendingAsks: [],
          warnings: [],
          tips: []
        };
        try {
          const planResult = planService.read(featureName);
          if (planResult.content) {
            const lines = planResult.content.split("\n").slice(0, 20);
            result.planSummary = lines.join("\n").substring(0, 500);
            if (planResult.content.length > 500) {
              result.planSummary += "\n... (truncated)";
            }
          }
          result.phase = planResult.status === "approved" ? "execution" : "planning";
        } catch {
          result.warnings.push("Could not read plan");
        }
        try {
          const tasks = taskService.list(featureName);
          result.tasks = tasks.map((t) => ({
            id: t.folder,
            name: t.name || t.folder,
            status: t.status,
            summary: t.description
          }));
          result.progress.total = tasks.length;
          result.progress.done = tasks.filter((t) => t.status === "done" || t.status === "completed").length;
          result.progress.inProgress = tasks.filter((t) => t.status === "in_progress" || t.status === "executing").length;
          result.progress.pending = tasks.filter((t) => t.status === "pending").length;
        } catch {
          result.warnings.push("Could not read tasks");
        }
        try {
          const contexts = contextService.list(featureName);
          result.contextFiles = contexts.map((c) => c.name);
        } catch {
          result.warnings.push("Could not read context files");
        }
        try {
          const pending = askService.listPending(featureName);
          result.pendingAsks = pending.map((a) => ({ id: a.id, question: a.question }));
        } catch {
          result.warnings.push("Could not read pending asks");
        }
        if (result.contextFiles.length === 0 && result.phase === "planning") {
          result.warnings.push("No context files created! Document research, patterns, and decisions using hive_context_write.");
        }
        if (result.pendingAsks.length > 0) {
          result.warnings.push(`${result.pendingAsks.length} pending question(s) waiting for user answer.`);
        }
        if (result.phase === "execution") {
          result.tips.push("Check for user steering comments periodically.");
          result.tips.push("Use hive_ask if you need user input to proceed.");
        } else {
          result.tips.push("Create context files to document findings for workers.");
          result.tips.push("Read existing context before modifying the plan.");
        }
        let output = `# Session Refresh: ${result.feature}

`;
        output += `**Phase:** ${result.phase}
`;
        output += `**Progress:** ${result.progress.done}/${result.progress.total} tasks done`;
        if (result.progress.inProgress > 0) {
          output += ` (${result.progress.inProgress} in progress)`;
        }
        output += "\n\n";
        if (result.planSummary) {
          output += `## Plan Summary
\`\`\`
${result.planSummary}
\`\`\`

`;
        }
        if (result.tasks.length > 0) {
          output += `## Tasks
`;
          for (const task of result.tasks) {
            const icon = task.status === "done" || task.status === "completed" ? "\u2713" : task.status === "in_progress" || task.status === "executing" ? "\u2192" : "\u25CB";
            output += `${icon} ${task.id}: ${task.name} [${task.status}]
`;
          }
          output += "\n";
        }
        if (result.contextFiles.length > 0) {
          output += `## Context Files
`;
          for (const file of result.contextFiles) {
            output += `- ${file}
`;
          }
          output += "\n";
        }
        if (result.pendingAsks.length > 0) {
          output += `## Pending Questions
`;
          for (const ask of result.pendingAsks) {
            output += `- [${ask.id}] ${ask.question}
`;
          }
          output += "\n";
        }
        if (result.warnings.length > 0) {
          output += `## Warnings
`;
          for (const warning of result.warnings) {
            output += `\u26A0\uFE0F ${warning}
`;
          }
          output += "\n";
        }
        if (result.tips.length > 0) {
          output += `## Tips
`;
          for (const tip of result.tips) {
            output += `\u{1F4A1} ${tip}
`;
          }
        }
        return output;
      }
    }
  ];
}

// src/commands/initNest.ts
var vscode9 = __toESM(require("vscode"));
var fs11 = __toESM(require("fs"));
var path11 = __toESM(require("path"));
var SKILL_TEMPLATES = {
  "hive-workflow": `---
name: hive-workflow
description: Plan-first AI development with isolated git worktrees and human review. Use for any feature development.
---

# Hive Workflow

You are working in a Hive-enabled repository. Follow this plan-first workflow.

## Lifecycle

\`\`\`
Feature -> Plan -> Review -> Approve -> Execute -> Merge -> Complete
\`\`\`

## Phase 1: Planning

1. \`hive_feature_create({ name: "feature-name" })\` - Creates feature directory
2. Research the codebase, understand what needs to change
3. Save findings with \`hive_context_write({ name: "research", content: "..." })\`
4. Write the plan with \`hive_plan_write({ content: "# Feature\\n\\n## Tasks\\n\\n### 1. First task..." })\`
5. **STOP** and tell user: "Plan written. Please review in VS Code."

## Phase 2: Review (Human)

- User reviews plan.md in VS Code
- User can add comments
- Use \`hive_plan_read()\` to see user comments
- Revise plan based on feedback
- User clicks "Approve" when ready

## Phase 3: Execution

After user approves:

1. \`hive_tasks_sync()\` - Generates tasks from plan
2. For each task in order:
   - \`hive_exec_start({ task: "01-task-name" })\` - Creates worktree
   - Implement in isolated worktree
   - \`hive_exec_complete({ task: "01-task-name", summary: "What was done" })\`
   - \`hive_merge({ task: "01-task-name", strategy: "squash" })\`

## Phase 4: Completion

After all tasks merged:
\`hive_feature_complete({ name: "feature-name" })\`

## Rules

1. **Never skip planning** - Always write plan first
2. **Context is critical** - Save all research with \`hive_context_write\`
3. **Wait for approval** - Don't execute until user approves
4. **One task at a time** - Complete and merge before starting next
5. **Squash merges** - Keep history clean with single commit per task

## Tool Reference

| Phase | Tool | Purpose |
|-------|------|---------|
| Plan | \`hive_feature_create\` | Start new feature |
| Plan | \`hive_plan_write\` | Write the plan |
| Plan | \`hive_plan_read\` | Check for user comments |
| Plan | \`hive_context_write\` | Save research findings |
| Execute | \`hive_tasks_sync\` | Generate tasks from plan |
| Execute | \`hive_exec_start\` | Start task (creates worktree) |
| Execute | \`hive_exec_complete\` | Finish task (commits changes) |
| Execute | \`hive_merge\` | Integrate task to main |
| Complete | \`hive_feature_complete\` | Mark feature done |
`,
  "hive-execution": `---
name: hive-execution
description: Execute Hive feature tasks with worktree isolation, parallel orchestration, and clean git history.
---

# Hive Execution Orchestration

Execute Hive feature tasks with worktree isolation and clean git history.

## Task Execution Lifecycle

For EACH task, follow this exact sequence:

### 1. Start Task
\`\`\`
hive_exec_start(task="<task-folder-name>")
\`\`\`
Creates a git worktree from current base branch.

### 2. Implement in Worktree
Work ONLY within the task's worktree directory.

### 3. Complete Task
\`\`\`
hive_exec_complete(task="<task-folder-name>", summary="<what-was-done>")
\`\`\`
Commits all changes to the task branch. Does NOT merge.

### 4. Merge to Main
\`\`\`
hive_merge(task="<task-folder-name>", strategy="squash")
\`\`\`
Results in exactly ONE commit per task on main.

## Tool Quick Reference

| Phase | Tool | Purpose |
|-------|------|---------|
| Start | \`hive_exec_start(task)\` | Create worktree, begin work |
| Complete | \`hive_exec_complete(task, summary)\` | Commit changes to branch |
| Integrate | \`hive_merge(task, strategy="squash")\` | Merge to main |
| Abort | \`hive_exec_abort(task)\` | Discard changes, reset status |

## Error Recovery

### Task Failed Mid-Execution
\`\`\`
hive_exec_abort(task="<task>")  # Discards changes
hive_exec_start(task="<task>")  # Fresh start
\`\`\`
`,
  "hive-planning": `---
name: hive-planning
description: Write effective Hive plans with proper task breakdown and context gathering.
---

# Hive Planning

Write effective plans that humans can review and agents can execute.

## Planning Process

### Step 1: Understand the Request
Parse what the user explicitly asked for and identify implicit requirements.

### Step 2: Research the Codebase
Search for relevant files, patterns, and conventions. Save findings:
\`\`\`
hive_context_write({
  name: "research",
  content: "# Research Findings\\n\\n## Existing Patterns\\n..."
})
\`\`\`

### Step 3: Write the Plan
\`\`\`markdown
# Feature Name

## Overview
What we're building and why.

## Tasks

### 1. First Task Name
Description of what to do.

### 2. Second Task Name
Description of what to do.
\`\`\`

## Task Design Guidelines

| Characteristic | Example |
|---------------|---------|
| **Atomic** | "Add ThemeContext provider" not "Add theming" |
| **Testable** | "Toggle switches between light/dark" |
| **Independent** | Can be completed without other tasks |
| **Ordered** | Dependencies come first |

## Plan Format

\`hive_tasks_sync\` parses \`### N. Task Name\` headers.
`
};
var COPILOT_AGENT_TEMPLATE = `---
description: 'Plan-first feature development with isolated worktrees and persistent context.'
tools: ['runSubagent', 'tctinh.vscode-hive/hiveFeatureCreate', 'tctinh.vscode-hive/hiveFeatureList', 'tctinh.vscode-hive/hiveFeatureComplete', 'tctinh.vscode-hive/hivePlanWrite', 'tctinh.vscode-hive/hivePlanRead', 'tctinh.vscode-hive/hivePlanApprove', 'tctinh.vscode-hive/hiveTasksSync', 'tctinh.vscode-hive/hiveTaskCreate', 'tctinh.vscode-hive/hiveTaskUpdate', 'tctinh.vscode-hive/hiveSubtaskCreate', 'tctinh.vscode-hive/hiveSubtaskUpdate', 'tctinh.vscode-hive/hiveSubtaskList', 'tctinh.vscode-hive/hiveSubtaskSpecWrite', 'tctinh.vscode-hive/hiveSubtaskReportWrite', 'tctinh.vscode-hive/hiveExecStart', 'tctinh.vscode-hive/hiveExecComplete', 'tctinh.vscode-hive/hiveExecAbort', 'tctinh.vscode-hive/hiveMerge', 'tctinh.vscode-hive/hiveWorktreeList', 'tctinh.vscode-hive/hiveContextWrite', 'tctinh.vscode-hive/hiveContextRead', 'tctinh.vscode-hive/hiveContextList', 'tctinh.vscode-hive/hiveSessionOpen', 'tctinh.vscode-hive/hiveSessionList']
---

# Hive Agent

You are a plan-first development orchestrator. Follow this workflow: Plan -> Review -> Approve -> Execute -> Merge.

## Core Workflow

### Phase 1: Planning
1. \`featureCreate({ name: "feature-name" })\` - Create feature
2. Research codebase, save with \`contextWrite\`
3. \`planWrite({ content: "# Feature\\n\\n## Tasks\\n\\n### 1. First task..." })\`
4. **STOP** - Tell user: "Plan ready. Please review and approve."

### Phase 2: User Review
User reviews in VS Code, adds comments, approves when ready.

### Phase 3: Execution
1. \`tasksSync()\` - Generate tasks from plan
2. For each task:
   - \`execStart({ task: "task-name" })\`
   - Implement
   - \`execComplete({ task: "task-name", summary: "..." })\`
   - \`merge({ task: "task-name", strategy: "squash" })\`

### Phase 4: Completion
\`featureComplete({ name: "feature-name" })\`

## Rules
1. Never skip planning
2. Save context with \`contextWrite\`
3. Wait for approval before execution
4. One task at a time
5. Squash merges for clean history
`;
function createSkill(basePath, skillName) {
  const content = SKILL_TEMPLATES[skillName];
  if (!content) {
    console.warn(`Unknown skill: ${skillName}`);
    return;
  }
  const skillPath = path11.join(basePath, skillName);
  fs11.mkdirSync(skillPath, { recursive: true });
  fs11.writeFileSync(path11.join(skillPath, "SKILL.md"), content);
}
async function initNest(projectRoot) {
  const skillNames = ["hive-workflow", "hive-execution", "hive-planning"];
  const hivePath = path11.join(projectRoot, ".hive");
  fs11.mkdirSync(path11.join(hivePath, "features"), { recursive: true });
  fs11.mkdirSync(path11.join(hivePath, "skills"), { recursive: true });
  const opencodePath = path11.join(projectRoot, ".opencode", "skill");
  for (const name of skillNames) {
    createSkill(opencodePath, name);
  }
  const claudePath = path11.join(projectRoot, ".claude", "skills");
  for (const name of skillNames) {
    createSkill(claudePath, name);
  }
  const agentPath = path11.join(projectRoot, ".github", "agents");
  fs11.mkdirSync(agentPath, { recursive: true });
  fs11.writeFileSync(path11.join(agentPath, "Hive.agent.md"), COPILOT_AGENT_TEMPLATE);
  vscode9.window.showInformationMessage("\u{1F41D} Hive Nest initialized! Skills created for OpenCode, Claude, and GitHub Copilot.");
}

// src/extension.ts
function findHiveRoot(startPath) {
  let current = startPath;
  while (current !== path12.dirname(current)) {
    if (fs12.existsSync(path12.join(current, ".hive"))) {
      return current;
    }
    current = path12.dirname(current);
  }
  return null;
}
var HiveExtension = class {
  constructor(context, workspaceFolder) {
    this.context = context;
    this.workspaceFolder = workspaceFolder;
  }
  sidebarProvider = null;
  launcher = null;
  commentController = null;
  hiveWatcher = null;
  creationWatcher = null;
  workspaceRoot = null;
  initialized = false;
  statusBarItem = null;
  initialize() {
    this.workspaceRoot = findHiveRoot(this.workspaceFolder);
    if (this.workspaceRoot) {
      this.initializeWithHive(this.workspaceRoot);
    } else {
      this.initializeWithoutHive();
    }
  }
  initializeWithHive(workspaceRoot) {
    if (this.initialized) return;
    this.initialized = true;
    this.sidebarProvider = new HiveSidebarProvider(workspaceRoot);
    this.launcher = new Launcher(workspaceRoot);
    this.commentController = new PlanCommentController(workspaceRoot);
    vscode10.window.registerTreeDataProvider("hive.features", this.sidebarProvider);
    this.commentController.registerCommands(this.context);
    registerAllTools(this.context, [
      ...getFeatureTools(workspaceRoot),
      ...getPlanTools(workspaceRoot),
      ...getTaskTools(workspaceRoot),
      ...getSubtaskTools(workspaceRoot),
      ...getExecTools(workspaceRoot),
      ...getMergeTools(workspaceRoot),
      ...getContextTools(workspaceRoot),
      ...getAskTools(),
      ...getSessionTools()
    ]);
    this.hiveWatcher = new HiveWatcher(workspaceRoot, () => {
      this.sidebarProvider?.refresh();
      this.updateStatusBar(workspaceRoot);
    });
    this.context.subscriptions.push({ dispose: () => this.hiveWatcher?.dispose() });
    this.statusBarItem = vscode10.window.createStatusBarItem(vscode10.StatusBarAlignment.Left, 100);
    this.statusBarItem.command = "hive.openQueenPanel";
    this.context.subscriptions.push(this.statusBarItem);
    this.updateStatusBar(workspaceRoot);
    if (this.creationWatcher) {
      this.creationWatcher.dispose();
      this.creationWatcher = null;
    }
  }
  initializeWithoutHive() {
    this.creationWatcher = vscode10.workspace.createFileSystemWatcher(
      new vscode10.RelativePattern(this.workspaceFolder, ".hive/**")
    );
    const onHiveCreated = () => {
      const newRoot = findHiveRoot(this.workspaceFolder);
      if (newRoot && !this.initialized) {
        this.workspaceRoot = newRoot;
        this.initializeWithHive(newRoot);
        vscode10.window.showInformationMessage("Hive: .hive directory detected, extension activated");
      }
    };
    this.creationWatcher.onDidCreate(onHiveCreated);
    this.context.subscriptions.push(this.creationWatcher);
  }
  updateStatusBar(workspaceRoot) {
    if (!this.statusBarItem) return;
    const askService = new AskService(workspaceRoot);
    const featureService = new FeatureService(workspaceRoot);
    const activeFeature = featureService.getActive();
    if (!activeFeature) {
      this.statusBarItem.hide();
      return;
    }
    const pendingAsks = askService.listPending(activeFeature.name);
    const askCount = pendingAsks.length;
    this.statusBarItem.text = askCount > 0 ? `$(bee) ${askCount}` : "$(bee)";
    this.statusBarItem.tooltip = askCount > 0 ? `Hive: ${askCount} pending question(s) - Click to open Queen Panel` : `Hive: ${activeFeature.name} - Click to open Queen Panel`;
    this.statusBarItem.show();
  }
  registerCommands() {
    const workspaceFolder = this.workspaceFolder;
    this.context.subscriptions.push(
      vscode10.commands.registerCommand("hive.initNest", async () => {
        await initNest(workspaceFolder);
        const newRoot = findHiveRoot(workspaceFolder);
        if (newRoot && !this.initialized) {
          this.workspaceRoot = newRoot;
          this.initializeWithHive(newRoot);
        }
      }),
      vscode10.commands.registerCommand("hive.refresh", () => {
        if (!this.initialized) {
          const newRoot = findHiveRoot(workspaceFolder);
          if (newRoot) {
            this.workspaceRoot = newRoot;
            this.initializeWithHive(newRoot);
          } else {
            vscode10.window.showWarningMessage("Hive: No .hive directory found. Use @Hive in Copilot Chat to create a feature.");
            return;
          }
        }
        this.sidebarProvider?.refresh();
      }),
      vscode10.commands.registerCommand("hive.newFeature", async () => {
        const name = await vscode10.window.showInputBox({
          prompt: "Feature name",
          placeHolder: "my-feature"
        });
        if (name && this.workspaceRoot) {
          const featureService = new FeatureService(this.workspaceRoot);
          try {
            featureService.create(name);
            this.sidebarProvider?.refresh();
            vscode10.window.showInformationMessage(`Hive: Feature "${name}" created. Use @Hive in Copilot Chat to write a plan.`);
          } catch (error) {
            vscode10.window.showErrorMessage(`Hive: Failed to create feature - ${error}`);
          }
        } else if (name) {
          const hiveDir = path12.join(workspaceFolder, ".hive");
          fs12.mkdirSync(hiveDir, { recursive: true });
          this.workspaceRoot = workspaceFolder;
          this.initializeWithHive(workspaceFolder);
          const featureService = new FeatureService(workspaceFolder);
          featureService.create(name);
          this.sidebarProvider?.refresh();
          vscode10.window.showInformationMessage(`Hive: Feature "${name}" created. Use @Hive in Copilot Chat to write a plan.`);
        }
      }),
      vscode10.commands.registerCommand("hive.openFeature", (featureName) => {
        this.launcher?.openFeature(featureName);
      }),
      vscode10.commands.registerCommand("hive.openTask", (item) => {
        if (item?.featureName && item?.folder) {
          this.launcher?.openTask(item.featureName, item.folder);
        }
      }),
      vscode10.commands.registerCommand("hive.openFile", (filePath) => {
        if (filePath) {
          this.launcher?.openFile(filePath);
        }
      }),
      vscode10.commands.registerCommand("hive.approvePlan", async (item) => {
        if (item?.featureName && this.workspaceRoot) {
          const planService = new PlanService(this.workspaceRoot);
          const comments2 = planService.getComments(item.featureName);
          if (comments2.length > 0) {
            vscode10.window.showWarningMessage(`Hive: Cannot approve - ${comments2.length} unresolved comment(s). Address them first.`);
            return;
          }
          try {
            planService.approve(item.featureName);
            this.sidebarProvider?.refresh();
            vscode10.window.showInformationMessage(`Hive: Plan approved for "${item.featureName}". Use @Hive to sync tasks.`);
          } catch (error) {
            vscode10.window.showErrorMessage(`Hive: Failed to approve plan - ${error}`);
          }
        }
      }),
      vscode10.commands.registerCommand("hive.syncTasks", async (item) => {
        if (item?.featureName && this.workspaceRoot) {
          const featureService = new FeatureService(this.workspaceRoot);
          const taskService = new TaskService(this.workspaceRoot);
          const featureData = featureService.get(item.featureName);
          if (!featureData || featureData.status === "planning") {
            vscode10.window.showWarningMessage("Hive: Plan must be approved before syncing tasks.");
            return;
          }
          try {
            const result = taskService.sync(item.featureName);
            if (featureData.status === "approved") {
              featureService.updateStatus(item.featureName, "executing");
            }
            this.sidebarProvider?.refresh();
            vscode10.window.showInformationMessage(`Hive: ${result.created.length} tasks created for "${item.featureName}".`);
          } catch (error) {
            vscode10.window.showErrorMessage(`Hive: Failed to sync tasks - ${error}`);
          }
        }
      }),
      vscode10.commands.registerCommand("hive.startTask", async (item) => {
        if (item?.featureName && item?.folder && this.workspaceRoot) {
          const worktreeService = new WorktreeService({
            baseDir: this.workspaceRoot,
            hiveDir: path12.join(this.workspaceRoot, ".hive")
          });
          const taskService = new TaskService(this.workspaceRoot);
          try {
            const worktree = await worktreeService.create(item.featureName, item.folder);
            taskService.update(item.featureName, item.folder, { status: "in_progress" });
            this.sidebarProvider?.refresh();
            const openWorktree = await vscode10.window.showInformationMessage(
              `Hive: Worktree created at ${worktree.path}`,
              "Open in New Window"
            );
            if (openWorktree === "Open in New Window") {
              this.launcher?.openTask(item.featureName, item.folder);
            }
          } catch (error) {
            vscode10.window.showErrorMessage(`Hive: Failed to start task - ${error}`);
          }
        }
      }),
      vscode10.commands.registerCommand("hive.plan.doneReview", async () => {
        const editor = vscode10.window.activeTextEditor;
        if (!editor) return;
        if (!this.workspaceRoot) {
          vscode10.window.showErrorMessage("Hive: No .hive directory found");
          return;
        }
        const filePath = editor.document.uri.fsPath;
        const featureMatch = filePath.match(/\.hive\/features\/([^/]+)\/plan\.md$/);
        if (!featureMatch) {
          vscode10.window.showErrorMessage("Not a plan.md file");
          return;
        }
        const featureName = featureMatch[1];
        const commentsPath = path12.join(this.workspaceRoot, ".hive", "features", featureName, "comments.json");
        let comments2 = [];
        try {
          const commentsData = JSON.parse(fs12.readFileSync(commentsPath, "utf-8"));
          comments2 = commentsData.threads || [];
        } catch (error) {
        }
        const hasComments = comments2.length > 0;
        const inputPrompt = hasComments ? `${comments2.length} comment(s) found. Add feedback or leave empty to submit comments only` : "Enter your review feedback (or leave empty to approve)";
        const userInput = await vscode10.window.showInputBox({
          prompt: inputPrompt,
          placeHolder: hasComments ? "Additional feedback (optional)" : 'e.g., "looks good" to approve, or describe changes needed'
        });
        if (userInput === void 0) return;
        let feedback;
        if (hasComments) {
          const allComments = comments2.map((c) => `Line ${c.line}: ${c.body}`).join("\n");
          feedback = userInput === "" ? `Review comments:
${allComments}` : `Review comments:
${allComments}

Additional feedback: ${userInput}`;
        } else {
          feedback = userInput === "" ? "Plan approved" : `Review feedback: ${userInput}`;
        }
        vscode10.window.showInformationMessage(
          `Hive: ${hasComments ? "Comments submitted" : "Review submitted"}. Use @Hive in Copilot Chat to continue.`
        );
        await vscode10.env.clipboard.writeText(`@Hive ${feedback}`);
        vscode10.window.showInformationMessage("Hive: Feedback copied to clipboard. Paste in Copilot Chat.");
      }),
      vscode10.commands.registerCommand("hive.showAsk", (ask) => {
        if (!this.workspaceRoot) return;
        const askService = new AskService(this.workspaceRoot);
        vscode10.window.showInformationMessage(
          `Agent Question: ${ask.question}`,
          "Answer"
        ).then(async (selection) => {
          if (selection === "Answer") {
            const answer = await vscode10.window.showInputBox({
              prompt: ask.question,
              placeHolder: "Enter your answer..."
            });
            if (answer) {
              askService.submitAnswer(ask.feature, ask.id, answer);
              vscode10.window.showInformationMessage("Hive: Answer submitted to agent.");
            }
          }
        });
      }),
      vscode10.commands.registerCommand("hive.openQueenPanel", async () => {
        if (!this.workspaceRoot) {
          vscode10.window.showWarningMessage("Hive: No .hive directory found.");
          return;
        }
        const featureService = new FeatureService(this.workspaceRoot);
        const planService = new PlanService(this.workspaceRoot);
        const activeFeature = featureService.getActive();
        if (!activeFeature) {
          vscode10.window.showWarningMessage("Hive: No active feature. Create one first.");
          return;
        }
        const plan = planService.read(activeFeature.name);
        const comments2 = planService.getComments(activeFeature.name);
        const mode = activeFeature.status === "planning" ? "planning" : "execution";
        await HiveQueenPanel.showWithOptions(this.context.extensionUri, {
          plan: plan || "",
          title: `Hive Queen: ${activeFeature.name}`,
          mode,
          featureName: activeFeature.name,
          featurePath: path12.join(this.workspaceRoot, ".hive", "features", activeFeature.name),
          projectRoot: this.workspaceRoot,
          existingComments: comments2
        });
      })
    );
  }
};
function activate(context) {
  const workspaceFolder = vscode10.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceFolder) return;
  const extension = new HiveExtension(context, workspaceFolder);
  extension.registerCommands();
  extension.initialize();
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
