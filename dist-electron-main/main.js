/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/electron-log/src/catchErrors.js":
/*!******************************************************!*\
  !*** ./node_modules/electron-log/src/catchErrors.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



/**
 * Some ideas from sindresorhus/electron-unhandled
 */

var electronApi = __webpack_require__(/*! ./electronApi */ "./node_modules/electron-log/src/electronApi.js");
var queryString = __webpack_require__(/*! querystring */ "querystring");

var isAttached = false;

module.exports = function catchErrors(options) {
  if (isAttached) return { stop: stop };
  isAttached = true;

  if (process.type === 'renderer') {
    window.addEventListener('error', onRendererError);
    window.addEventListener('unhandledrejection', onRendererRejection);
  } else {
    process.on('uncaughtException', onError);
    process.on('unhandledRejection', onRejection);
  }

  return { stop: stop };

  function onError(e) {
    try {
      if (typeof options.onError === 'function') {
        var versions = electronApi.getVersions();
        if (options.onError(e, versions, createIssue) === false) {
          return;
        }
      }

      options.log('Unhandled Exception', e);

      if (options.showDialog && e.name.indexOf('UnhandledRejection') < 0) {
        var type = process.type || 'main';
        electronApi.showErrorBox(
          'A JavaScript error occurred in the ' + type + ' process',
          e.stack
        );
      }
    } catch (logError) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }

  function onRejection(reason) {
    if (reason instanceof Error) {
      try {
        Object.defineProperty(reason, 'name', {
          value: 'UnhandledRejection ' + reason.name,
        });
      } catch (e) {
        // Can't redefine error name, but who cares?
      }

      onError(reason);
      return;
    }

    var error = new Error(JSON.stringify(reason));
    error.name = 'UnhandledRejection';
    onError(error);
  }

  function onRendererError(event) {
    event.preventDefault();
    onError(event.error);
  }

  function onRendererRejection(event) {
    event.preventDefault();
    onRejection(event.reason);
  }

  function stop() {
    isAttached = false;

    if (process.type === 'renderer') {
      window.removeEventListener('error', onRendererError);
      window.removeEventListener('unhandledrejection', onRendererRejection);
    } else {
      process.removeListener('uncaughtException', onError);
      process.removeListener('unhandledRejection', onRejection);
    }
  }

  function createIssue(pageUrl, queryParams) {
    var issueUrl = pageUrl + '?' + queryString.stringify(queryParams);
    electronApi.openUrl(issueUrl, options.log);
  }
};


/***/ }),

/***/ "./node_modules/electron-log/src/electronApi.js":
/*!******************************************************!*\
  !*** ./node_modules/electron-log/src/electronApi.js ***!
  \******************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



/**
 * Split Electron API from the main code
 */

var path = __webpack_require__(/*! path */ "path");
var electron;
try {
  // eslint-disable-next-line global-require
  electron = __webpack_require__(/*! electron */ "electron");
} catch (e) {
  electron = null;
}

var os = __webpack_require__(/*! os */ "os");

module.exports = {
  getName: getName,
  getPath: getPath,
  getVersion: getVersion,
  getVersions: getVersions,
  isDev: isDev,
  isElectron: isElectron,
  isIpcChannelListened: isIpcChannelListened,
  loadRemoteModule: loadRemoteModule,
  onIpc: onIpc,
  openUrl: openUrl,
  sendIpc: sendIpc,
  showErrorBox: showErrorBox,
};

function getApp() {
  return getElectronModule('app');
}

function getName() {
  var app = getApp();
  if (!app) return null;

  return 'name' in app ? app.name : app.getName();
}

function getElectronModule(name) {
  if (!electron) {
    return null;
  }

  if (electron[name]) {
    return electron[name];
  }

  if (electron.remote) {
    return electron.remote[name];
  }

  return null;
}

function getIpc() {
  if (process.type === 'browser' && electron && electron.ipcMain) {
    return electron.ipcMain;
  }

  if (process.type === 'renderer' && electron && electron.ipcRenderer) {
    return electron.ipcRenderer;
  }

  return null;
}

function getPath(name) {
  var app = getApp();
  if (!app) return null;

  try {
    return app.getPath(name);
  } catch (e) {
    return null;
  }
}

function getVersion() {
  var app = getApp();
  if (!app) return null;

  return 'version' in app ? app.version : app.getVersion();
}

function getVersions() {
  return {
    app: getName() + ' ' + getVersion(),
    electron: 'Electron ' + process.versions.electron,
    os: getOsVersion(),
  };
}

function getOsVersion() {
  var osName = os.type().replace('_', ' ');
  var osVersion = os.release();

  if (osName === 'Darwin') {
    osName = 'macOS';
    osVersion = getMacOsVersion();
  }

  return osName + ' ' + osVersion;
}

function getMacOsVersion() {
  var release = Number(os.release().split('.')[0]);
  return '10.' + (release - 4);
}

function isDev() {
  var app = getApp();

  if (app && app.isPackaged !== undefined) {
    return !app.isPackaged;
  }

  if (typeof process.execPath === 'string') {
    var execFileName = path.basename(process.execPath).toLowerCase();
    return execFileName.startsWith('electron');
  }

  return  true
    || 0;
}

function isElectron() {
  return process.type === 'browser' || process.type === 'renderer';
}

/**
 * Return true if the process listens for the IPC channel
 * @param {string} channel
 */
function isIpcChannelListened(channel) {
  var ipc = getIpc();
  return ipc ? ipc.listenerCount(channel) > 0 : false;
}

/**
 * Try to load the module in the opposite process
 * @param {string} moduleName
 */
function loadRemoteModule(moduleName) {
  if (process.type === 'browser') {
    getApp().on('web-contents-created', function (e, contents) {
      var promise = contents.executeJavaScript(
        'try {require("' + moduleName + '")} catch(e){}; void 0;'
      );

      // Do nothing on error, just prevent Unhandled rejection
      if (promise && typeof promise.catch === 'function') {
        promise.catch(function () {});
      }
    });
  } else if (process.type === 'renderer') {
    // Previously, it was electron.remote.require(moduleName)
    // but now the remote module is deprecated
  }
}

/**
 * Listen to async messages sent from opposite process
 * @param {string} channel
 * @param {function} listener
 */
function onIpc(channel, listener) {
  var ipc = getIpc();
  if (ipc) {
    ipc.on(channel, listener);
  }
}

/**
 * Sent a message to opposite process
 * @param {string} channel
 * @param {any} message
 */
function sendIpc(channel, message) {
  if (process.type === 'browser') {
    sendIpcToRenderer(channel, message);
  } else if (process.type === 'renderer') {
    sendIpcToMain(channel, message);
  }
}

function sendIpcToMain(channel, message) {
  var ipc = getIpc();
  if (ipc) {
    ipc.send(channel, message);
  }
}

function sendIpcToRenderer(channel, message) {
  if (!electron || !electron.BrowserWindow) {
    return;
  }

  electron.BrowserWindow.getAllWindows().forEach(function (wnd) {
    if (wnd.webContents && !wnd.webContents.isDestroyed()) {
      wnd.webContents.send(channel, message);
    }
  });
}

function showErrorBox(title, message) {
  var dialog = getElectronModule('dialog');
  if (!dialog) return;

  dialog.showErrorBox(title, message);
}

/**
 * @param {string} url
 * @param {Function} [logFunction]
 */
function openUrl(url, logFunction) {
  // eslint-disable-next-line no-console
  logFunction = logFunction || console.error;

  var shell = getElectronModule('shell');
  if (!shell) return;

  shell.openExternal(url).catch(logFunction);
}


/***/ }),

/***/ "./node_modules/electron-log/src/index.js":
/*!************************************************!*\
  !*** ./node_modules/electron-log/src/index.js ***!
  \************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var catchErrors = __webpack_require__(/*! ./catchErrors */ "./node_modules/electron-log/src/catchErrors.js");
var electronApi = __webpack_require__(/*! ./electronApi */ "./node_modules/electron-log/src/electronApi.js");
var log = __webpack_require__(/*! ./log */ "./node_modules/electron-log/src/log.js");
var scopeFactory = __webpack_require__(/*! ./scope */ "./node_modules/electron-log/src/scope.js");
var transportConsole = __webpack_require__(/*! ./transports/console */ "./node_modules/electron-log/src/transports/console.js");
var transportFile = __webpack_require__(/*! ./transports/file */ "./node_modules/electron-log/src/transports/file/index.js");
var transportIpc = __webpack_require__(/*! ./transports/ipc */ "./node_modules/electron-log/src/transports/ipc.js");
var transportRemote = __webpack_require__(/*! ./transports/remote */ "./node_modules/electron-log/src/transports/remote.js");

module.exports = create('default');
module.exports["default"] = module.exports;

/**
 * @param {string} logId
 * @return {ElectronLog.ElectronLog}
 */
function create(logId) {
  /**
   * @type {ElectronLog.ElectronLog}
   */
  var instance = {
    catchErrors: function callCatchErrors(options) {
      var opts = Object.assign({}, {
        log: instance.error,
        showDialog: process.type === 'browser',
      }, options || {});

      catchErrors(opts);
    },
    create: create,
    functions: {},
    hooks: [],
    isDev: electronApi.isDev(),
    levels: [],
    logId: logId,
    variables: {
      processType: process.type,
    },
  };

  instance.scope = scopeFactory(instance);

  instance.transports = {
    console: transportConsole(instance),
    file: transportFile(instance),
    remote: transportRemote(instance),
    ipc: transportIpc(instance),
  };

  Object.defineProperty(instance.levels, 'add', {
    enumerable: false,
    value: function add(name, index) {
      index = index === undefined ? instance.levels.length : index;
      instance.levels.splice(index, 0, name);
      instance[name] = log.log.bind(null, instance, { level: name });
      instance.functions[name] = instance[name];
    },
  });

  ['error', 'warn', 'info', 'verbose', 'debug', 'silly'].forEach(
    function (level) { instance.levels.add(level) }
  );

  instance.log = log.log.bind(null, instance, { level: 'info' });
  instance.functions.log = instance.log;

  instance.logMessageWithTransports = function logMessageWithTransports(
    message,
    transports
  ) {
    if (message.date === undefined) {
      message.date = new Date();
    }

    if (message.variables === undefined) {
      message.variables = instance.variables;
    }

    return log.runTransports(transports, message, instance);
  };

  return instance;
}


/***/ }),

/***/ "./node_modules/electron-log/src/log.js":
/*!**********************************************!*\
  !*** ./node_modules/electron-log/src/log.js ***!
  \**********************************************/
/***/ ((module) => {



module.exports = {
  compareLevels: compareLevels,
  log: log,
  runTransport: runTransport,
  runTransports: runTransports,
};

function log(electronLog, options) {
  var transports = electronLog.transports;

  var message = {
    data: Array.prototype.slice.call(arguments, 2),
    date: new Date(),
    level: options.level,
    scope: options.scope ? options.scope.toJSON() : null,
    variables: electronLog.variables,
  };

  runTransports(transports, message, electronLog);
}

function runTransports(transports, message, electronLog) {
  for (var i in transports) {
    if (Object.prototype.hasOwnProperty.call(transports, i)) {
      runTransport(transports[i], message, electronLog);
    }
  }
}

function runTransport(transport, message, electronLog) {
  if (typeof transport !== 'function' || transport.level === false) {
    return;
  }

  if (!compareLevels(electronLog.levels, transport.level, message.level)) {
    return;
  }

  message = runHooks(electronLog.hooks, transport, message);

  if (message) {
    transport(message);
  }
}

function compareLevels(levels, passLevel, checkLevel) {
  var pass = levels.indexOf(passLevel);
  var check = levels.indexOf(checkLevel);
  if (check === -1 || pass === -1) {
    return true;
  }

  return check <= pass;
}

function runHooks(hooks, transport, message) {
  if (!hooks || !hooks.length) {
    return message;
  }

  // eslint-disable-next-line no-plusplus
  for (var i = 0; i < hooks.length; i++) {
    message = hooks[i](message, transport);
    if (!message) break;
  }

  return message;
}


/***/ }),

/***/ "./node_modules/electron-log/src/scope.js":
/*!************************************************!*\
  !*** ./node_modules/electron-log/src/scope.js ***!
  \************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var log = (__webpack_require__(/*! ./log */ "./node_modules/electron-log/src/log.js").log);

module.exports = scopeFactory;

/**
 * @param {ElectronLog.ElectronLog} electronLog
 * @return {ElectronLog.Scope}
 */
function scopeFactory(electronLog) {
  scope.labelPadding = true;
  scope.defaultLabel = '';

  /** @private */
  scope.maxLabelLength = 0;

  /**
   * @type {typeof getOptions}
   * @package
   */
  scope.getOptions = getOptions;

  return scope;

  function scope(label) {
    var instance = {
      label: label,
      toJSON: function () {
        return {
          label: this.label,
        };
      },
    };

    electronLog.levels.forEach(function (level) {
      instance[level] = log.bind(null, electronLog, {
        level: level,
        scope: instance,
      });
    });

    instance.log = instance.info;

    scope.maxLabelLength = Math.max(scope.maxLabelLength, label.length);

    return instance;
  }

  function getOptions() {
    return {
      defaultLabel: scope.defaultLabel,
      labelLength: getLabelLength(),
    };
  }

  function getLabelLength() {
    if (scope.labelPadding === true) {
      return scope.maxLabelLength;
    }

    if (scope.labelPadding === false) {
      return 0;
    }

    if (typeof scope.labelPadding === 'number') {
      return scope.labelPadding;
    }

    return 0;
  }
}


/***/ }),

/***/ "./node_modules/electron-log/src/transform/index.js":
/*!**********************************************************!*\
  !*** ./node_modules/electron-log/src/transform/index.js ***!
  \**********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var object = __webpack_require__(/*! ./object */ "./node_modules/electron-log/src/transform/object.js");
var style = __webpack_require__(/*! ./style */ "./node_modules/electron-log/src/transform/style.js");
var template = __webpack_require__(/*! ./template */ "./node_modules/electron-log/src/transform/template.js");

module.exports = {
  applyAnsiStyles: style.applyAnsiStyles,
  concatFirstStringElements: template.concatFirstStringElements,
  customFormatterFactory: customFormatterFactory,
  maxDepthFactory: object.maxDepthFactory,
  removeStyles: style.removeStyles,
  toJSON: object.toJSON,
  toStringFactory: object.toStringFactory,
  transform: transform,
};

function customFormatterFactory(customFormat, concatFirst, scopeOptions) {
  if (typeof customFormat === 'string') {
    return function customStringFormatter(data, message) {
      return transform(message, [
        template.templateVariables,
        template.templateScopeFactory(scopeOptions),
        template.templateDate,
        template.templateText,
        concatFirst && template.concatFirstStringElements,
      ], [customFormat].concat(data));
    };
  }

  if (typeof customFormat === 'function') {
    return function customFunctionFormatter(data, message) {
      var modifiedMessage = Object.assign({}, message, { data: data });
      var texts = customFormat(modifiedMessage, data);
      return [].concat(texts);
    };
  }

  return function (data) {
    return [].concat(data);
  };
}

function transform(message, transformers, initialData) {
  return transformers.reduce(function (data, transformer) {
    if (typeof transformer === 'function') {
      return transformer(data, message);
    }

    return data;
  }, initialData || message.data);
}


/***/ }),

/***/ "./node_modules/electron-log/src/transform/object.js":
/*!***********************************************************!*\
  !*** ./node_modules/electron-log/src/transform/object.js ***!
  \***********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var util = __webpack_require__(/*! util */ "util");

module.exports = {
  maxDepthFactory: maxDepthFactory,
  serialize: serialize,
  toJSON: toJSON,
  toStringFactory: toStringFactory,
};

/**
 * @param {object} options?
 * @param {boolean} options.serializeMapAndSet?
 * @return {function}
 */
function createSerializer(options) {
  var seen = createWeakSet();

  return function (key, value) {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return undefined;
      }

      seen.add(value);
    }

    return serialize(key, value, options);
  };
}

/**
 * @return {WeakSet<object>}
 */
function createWeakSet() {
  if (typeof WeakSet !== 'undefined') {
    return new WeakSet();
  }

  var cache = [];
  return {
    add: function (value) { cache.push(value) },
    has: function (value) { return cache.indexOf(value) !== -1 },
  };
}

function maxDepth(data, depth) {
  if (!data) {
    return data;
  }

  if (depth < 1) {
    if (isArray(data)) return '[array]';
    if (typeof data === 'object' && data) return '[object]';

    return data;
  }

  if (isArray(data)) {
    return data.map(function (child) {
      return maxDepth(child, depth - 1);
    });
  }

  if (typeof data !== 'object') {
    return data;
  }

  if (data && typeof data.toISOString === 'function') {
    return data;
  }

  // noinspection PointlessBooleanExpressionJS
  if (data === null) {
    return null;
  }

  if (data instanceof Error) {
    return data;
  }

  var newJson = {};
  for (var i in data) {
    if (!Object.prototype.hasOwnProperty.call(data, i)) continue;
    newJson[i] = maxDepth(data[i], depth - 1);
  }

  return newJson;
}

function maxDepthFactory(depth) {
  depth = depth || 6;

  return function maxDepthFunction(data) {
    return maxDepth(data, depth);
  };
}

/**
 * @param {string} key
 * @param {any} value
 * @param {object} options?
 * @return {any}
 */
function serialize(key, value, options) {
  var serializeMapAndSet = !options || options.serializeMapAndSet !== false;

  if (value instanceof Error) {
    return value.stack;
  }

  if (!value) {
    return value;
  }

  if (typeof value.toJSON === 'function') {
    return value.toJSON();
  }

  if (typeof value === 'function') {
    return '[function] ' + value.toString();
  }

  if (serializeMapAndSet && value instanceof Map && Object.fromEntries) {
    return Object.fromEntries(value);
  }

  if (serializeMapAndSet && value instanceof Set && Array.from) {
    return Array.from(value);
  }

  return value;
}

function toJSON(data) {
  return JSON.parse(JSON.stringify(data, createSerializer()));
}

function toStringFactory(inspectOptions) {
  return function toStringFunction(data) {
    var simplifiedData = data.map(function (item) {
      if (item === undefined) {
        return undefined;
      }

      try {
        var str = JSON.stringify(item, createSerializer(), '  ');
        return str === undefined ? undefined : JSON.parse(str);
      } catch (e) {
        // There are some rare cases when an item can't be simplified.
        // In that case, it's fine to pass it to util.format directly.
        return item;
      }
    });

    if (util.formatWithOptions) {
      simplifiedData.unshift(inspectOptions || {});
      return util.formatWithOptions.apply(util, simplifiedData);
    }

    return util.format.apply(util, simplifiedData);
  };
}

function isArray(value) {
  return Object.prototype.toString.call(value) === '[object Array]';
}


/***/ }),

/***/ "./node_modules/electron-log/src/transform/style.js":
/*!**********************************************************!*\
  !*** ./node_modules/electron-log/src/transform/style.js ***!
  \**********************************************************/
/***/ ((module) => {



module.exports = {
  applyAnsiStyles: applyAnsiStyles,
  removeStyles: removeStyles,
  transformStyles: transformStyles,
};

var ANSI_COLORS = {
  unset: '\x1b[0m',
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function applyAnsiStyles(data) {
  return transformStyles(data, styleToAnsi, resetAnsiStyle);
}

function styleToAnsi(style) {
  var color = style.replace(/color:\s*(\w+).*/, '$1').toLowerCase();
  return ANSI_COLORS[color] || '';
}

function resetAnsiStyle(string) {
  return string + ANSI_COLORS.unset;
}

function removeStyles(data) {
  return transformStyles(data, function () { return '' });
}

function transformStyles(data, onStyleFound, onStyleApplied) {
  var foundStyles = {};

  return data.reduce(function (result, item, index, array) {
    if (foundStyles[index]) {
      return result;
    }

    if (typeof item === 'string') {
      var valueIndex = index;
      var styleApplied = false;

      item = item.replace(/%[1cdfiOos]/g, function (match) {
        valueIndex += 1;

        if (match !== '%c') {
          return match;
        }

        var style = array[valueIndex];
        if (typeof style === 'string') {
          foundStyles[valueIndex] = true;
          styleApplied = true;
          return onStyleFound(style, item);
        }

        return match;
      });

      if (styleApplied && onStyleApplied) {
        item = onStyleApplied(item);
      }
    }

    result.push(item);
    return result;
  }, []);
}


/***/ }),

/***/ "./node_modules/electron-log/src/transform/template.js":
/*!*************************************************************!*\
  !*** ./node_modules/electron-log/src/transform/template.js ***!
  \*************************************************************/
/***/ ((module) => {



module.exports = {
  concatFirstStringElements: concatFirstStringElements,
  formatDate: formatDate,
  formatTimeZone: formatTimeZone,
  pad: pad,
  padString: padString,
  templateDate: templateDate,
  templateVariables: templateVariables,
  templateScopeFactory: templateScopeFactory,
  templateText: templateText,
};

/**
 * The first argument of console.log may contain templates. In the library
 * the first element is a string related to transports.console.format. So
 * this function concatenates first two elements to make templates like %d
 * work
 * @param {*[]} data
 * @return {*[]}
 */
function concatFirstStringElements(data) {
  if (typeof data[0] !== 'string' || typeof data[1] !== 'string') {
    return data;
  }

  if (data[0].match(/%[1cdfiOos]/)) {
    return data;
  }

  data[1] = data[0] + ' ' + data[1];
  data.shift();

  return data;
}

function formatDate(template, date) {
  return template
    .replace('{y}', String(date.getFullYear()))
    .replace('{m}', pad(date.getMonth() + 1))
    .replace('{d}', pad(date.getDate()))
    .replace('{h}', pad(date.getHours()))
    .replace('{i}', pad(date.getMinutes()))
    .replace('{s}', pad(date.getSeconds()))
    .replace('{ms}', pad(date.getMilliseconds(), 3))
    .replace('{z}', formatTimeZone(date.getTimezoneOffset()))
    .replace('{iso}', date.toISOString());
}

function formatTimeZone(minutesOffset) {
  var m = Math.abs(minutesOffset);
  return (minutesOffset >= 0 ? '-' : '+')
    + pad(Math.floor(m / 60)) + ':'
    + pad(m % 60);
}

function pad(number, zeros) {
  zeros = zeros || 2;
  return (new Array(zeros + 1).join('0') + number).substr(-zeros, zeros);
}

function padString(value, length) {
  length = Math.max(length, value.length);
  var padValue = Array(length + 1).join(' ');
  return (value + padValue).substring(0, length);
}

function templateDate(data, message) {
  var template = data[0];
  if (typeof template !== 'string') {
    return data;
  }

  data[0] = formatDate(template, message.date);
  return data;
}

/**
 * @param {{ labelLength: number, defaultLabel: string }} options
 */
function templateScopeFactory(options) {
  options = options || {};
  var labelLength = options.labelLength || 0;

  return function templateScope(data, message) {
    var template = data[0];
    var label = message.scope && message.scope.label;

    if (!label) {
      label = options.defaultLabel;
    }

    var scopeText;
    if (label === '') {
      scopeText = labelLength > 0 ? padString('', labelLength + 3) : '';
    } else if (typeof label === 'string') {
      scopeText = padString(' (' + label + ')', labelLength + 3);
    } else {
      scopeText = '';
    }

    data[0] = template.replace('{scope}', scopeText);
    return data;
  };
}

function templateVariables(data, message) {
  var template = data[0];
  var variables = message.variables;

  if (typeof template !== 'string' || !message.variables) {
    return data;
  }

  for (var i in variables) {
    if (!Object.prototype.hasOwnProperty.call(variables, i)) continue;
    template = template.replace('{' + i + '}', variables[i]);
  }

  // Add additional space to the end of {level}] template to align messages
  template = template.replace('{level}]', padString(message.level + ']', 6));
  template = template.replace('{level}', message.level);

  data[0] = template;
  return data;
}

function templateText(data) {
  var template = data[0];
  if (typeof template !== 'string') {
    return data;
  }

  var textTplPosition = template.lastIndexOf('{text}');
  if (textTplPosition === template.length - 6) {
    data[0] = template.replace(/\s?{text}/, '');
    if (data[0] === '') {
      data.shift();
    }

    return data;
  }

  var templatePieces = template.split('{text}');
  var result = [];

  if (templatePieces[0] !== '') {
    result.push(templatePieces[0]);
  }

  result = result.concat(data.slice(1));

  if (templatePieces[1] !== '') {
    result.push(templatePieces[1]);
  }

  return result;
}


/***/ }),

/***/ "./node_modules/electron-log/src/transports/console.js":
/*!*************************************************************!*\
  !*** ./node_modules/electron-log/src/transports/console.js ***!
  \*************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



/* eslint-disable no-multi-spaces, no-console */

var transform = __webpack_require__(/*! ../transform */ "./node_modules/electron-log/src/transform/index.js");

var consoleMethods = {
  context: console,
  error:   console.error,
  warn:    console.warn,
  info:    console.info,
  verbose: console.verbose,
  debug:   console.debug,
  silly:   console.silly,
  log:     console.log,
};

module.exports = consoleTransportFactory;
module.exports.transformRenderer = transformRenderer;
module.exports.transformMain = transformMain;

var separator = process.platform === 'win32' ? '>' : '›';
var DEFAULT_FORMAT = {
  browser: '%c{h}:{i}:{s}.{ms}{scope}%c ' + separator + ' {text}',
  renderer: '{h}:{i}:{s}.{ms}{scope} › {text}',
  worker: '{h}:{i}:{s}.{ms}{scope} › {text}',
};

function consoleTransportFactory(electronLog) {
  transport.level  = 'silly';
  transport.useStyles = {"NVM_INC":"/Users/jimmy/.nvm/versions/node/v14.18.2/include/node","mode":"development","npm_package_scripts_start_local_web":"env-cmd -e renderer,local webpack serve","MANPATH":"/Users/jimmy/.nvm/versions/node/v14.18.2/share/man:/opt/homebrew/share/man::","npm_package_devDependencies_react_test_renderer":"^18.0.0","TERM_PROGRAM":"Apple_Terminal","npm_package_devDependencies_file_loader":"^6.2.0","NODE":"/Users/jimmy/.nvm/versions/node/v14.18.2/bin/node","npm_config_version_git_tag":"true","NVM_CD_FLAGS":"-q","INIT_CWD":"/Users/jimmy/Documents/workdir/yun/regex","npm_package_devDependencies__types_electron_json_storage":"^4.5.0","npm_package_devDependencies_jest":"^27.5.1","SHELL":"/bin/zsh","TERM":"xterm-256color","npm_package_devDependencies_style_loader":"^3.3.1","HOMEBREW_REPOSITORY":"/opt/homebrew","TMPDIR":"/var/folders/4w/c7yhp66x6c94jzxqp4d_bp4r0000gn/T/","npm_config_init_license":"MIT","npm_package_devDependencies__babel_preset_typescript":"^7.16.7","TERM_PROGRAM_VERSION":"443","TERM_SESSION_ID":"AF2A4952-D673-4C19-A9E4-E00410198FBB","npm_config_registry":"https://registry.yarnpkg.com","npm_package_private":"true","npm_package_dependencies_electron":"^18.1.0","npm_package_dependencies_react_dom":"^18.0.0","npm_package_devDependencies_eslint_plugin_jsx_a11y":"^6.4.1","npm_package_readmeFilename":"README.md","npm_package_devDependencies__testing_library_react":"^13.1.1","npm_package_devDependencies_webpack":"^5.36.2","npm_package_description":"> package.json 의 `env-cmd -e {prod|dev}` 명령어를 바탕으로 `.env-cmdrc.json` 파일이 생성 되어야 합니다 root 디렉토리에서 파일을 생성하고 아래와 같이 세팅을 진행 해 주시기 바랍니다.","NVM_DIR":"/Users/jimmy/.nvm","USER":"jimmy","npm_package_devDependencies__types_react":"^18.0.5","npm_package_devDependencies_webpack_cli":"^4.6.0","npm_package_dependencies_electron_builder":"^23.0.3","npm_package_browserslist_development_1":"last 1 firefox version","npm_package_devDependencies__babel_core":"^7.17.9","npm_package_devDependencies_babel_jest":"^27.5.1","npm_package_devDependencies_webpack_dev_server":"^4.8.1","npm_package_browserslist_development_0":"last 1 chrome version","npm_package_devDependencies__types_testing_library__jest_dom":"^5.9.5","SSH_AUTH_SOCK":"/private/tmp/com.apple.launchd.eavw1Flxfo/Listeners","npm_package_dependencies_env_cmd":"^10.1.0","npm_package_devDependencies__types_jest":"^27.4.1","npm_package_devDependencies_eslint":"^8.13.0","npm_package_browserslist_development_2":"last 1 safari version","__CF_USER_TEXT_ENCODING":"0x1F5:0x3:0x33","npm_package_devDependencies__typescript_eslint_eslint_plugin":"^5.20.0","npm_execpath":"/usr/local/lib/node_modules/yarn/bin/yarn.js","npm_package_dependencies_electron_json_storage":"^4.5.0","npm_package_devDependencies__types_react_dom":"^18.0.1","npm_package_devDependencies__typescript_eslint_parser":"^5.20.0","npm_config_argv":"{\"remain\":[],\"cooked\":[\"run\",\"build:local:main\"],\"original\":[\"build:local:main\"]}","PATH":"/Users/jimmy/Documents/workdir/yun/regex/node_modules/.bin:/var/folders/4w/c7yhp66x6c94jzxqp4d_bp4r0000gn/T/yarn--1650768263991-0.16061728319526702:/Users/jimmy/Documents/workdir/yun/regex/node_modules/.bin:/Users/jimmy/.config/yarn/link/node_modules/.bin:/Users/jimmy/.yarn/bin:/Users/jimmy/.nvm/versions/node/v14.18.2/libexec/lib/node_modules/npm/bin/node-gyp-bin:/Users/jimmy/.nvm/versions/node/v14.18.2/lib/node_modules/npm/bin/node-gyp-bin:/Users/jimmy/.nvm/versions/node/v14.18.2/bin/node_modules/npm/bin/node-gyp-bin:/Users/jimmy/.nvm/versions/node/v14.18.2/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Library/Apple/usr/bin","_":"/Users/jimmy/Documents/workdir/yun/regex/node_modules/.bin/env-cmd","npm_package_dependencies_typescript":"^4.6.3","npm_package_browserslist_production_1":"not dead","__CFBundleIdentifier":"com.apple.Terminal","npm_package_devDependencies_eslint_config_airbnb":"^19.0.4","npm_package_browserslist_production_0":">0.2%","PWD":"/Users/jimmy/Documents/workdir/yun/regex","npm_package_devDependencies_eslint_plugin_react_hooks":"^4.2.0","npm_package_devDependencies__types_react_router_dom":"^5.3.3","npm_package_browserslist_production_2":"not op_mini all","npm_lifecycle_event":"build:local:main","npm_package_name":"reactbase","npm_package_dependencies_electron_log":"^4.4.6","LANG":"ko_KR.UTF-8","npm_package_devDependencies__babel_preset_env":"^7.16.11","npm_package_devDependencies__babel_preset_react":"^7.16.7","npm_package_devDependencies_eslint_plugin_import":"^2.23.3","npm_config_version_commit_hooks":"true","npm_package_dependencies_react_router_dom":"^6.3.0","npm_package_devDependencies_ts_loader":"^9.1.1","XPC_FLAGS":"0x0","npm_config_bin_links":"true","npm_package_main":"dist-electron-main/main.js","npm_package_version":"0.1.1","XPC_SERVICE_NAME":"0","npm_package_devDependencies_eslint_import_resolver_typescript":"^2.4.0","runtimeMode":"local","SHLVL":"2","HOME":"/Users/jimmy","npm_package_scripts_build_local_main":"env-cmd -e main,local npx webpack --config webpack.config.js --watch","npm_package_scripts_test":"jest","npm_config_strict_ssl":"true","npm_config_save_prefix":"^","npm_config_version_git_message":"v%s","HOMEBREW_PREFIX":"/opt/homebrew","npm_package_scripts_test_cover":"jest --coverage","target":"electron-main","npm_package_devDependencies_html_webpack_plugin":"^5.3.1","YARN_WRAP_OUTPUT":"false","LOGNAME":"jimmy","npm_lifecycle_script":"env-cmd -e main,local npx webpack --config webpack.config.js --watch","npm_package_dependencies_react":"^18.0.0","NVM_BIN":"/Users/jimmy/.nvm/versions/node/v14.18.2/bin","npm_config_user_agent":"yarn/1.22.17 npm/? node/v14.18.2 darwin x64","npm_config_ignore_scripts":"","npm_config_version_git_sign":"","INFOPATH":"/opt/homebrew/share/info:","HOMEBREW_CELLAR":"/opt/homebrew/Cellar","npm_config__bryntum_registry":"https://npm.bryntum.com","npm_config_ignore_optional":"","npm_config_init_version":"1.0.0","npm_package_dependencies_electron_updater":"^5.0.1","npm_package_devDependencies_css_loader":"^6.7.1","npm_package_scripts_se":"electron .","npm_config_version_tag_prefix":"v","npm_package_devDependencies__testing_library_jest_dom":"^5.12.0","npm_package_devDependencies_eslint_plugin_react":"^7.23.2","npm_node_execpath":"/Users/jimmy/.nvm/versions/node/v14.18.2/bin/node"}.FORCE_STYLES;
  transport.format = DEFAULT_FORMAT[process.type] || DEFAULT_FORMAT.browser;

  return transport;

  function transport(message) {
    var scopeOptions = electronLog.scope.getOptions();

    var data;
    if (process.type === 'renderer' || process.type === 'worker') {
      data = transformRenderer(message, transport, scopeOptions);
    } else {
      data = transformMain(message, transport, scopeOptions);
    }

    consoleLog(message.level, data);
  }
}

function transformRenderer(message, transport, scopeOptions) {
  return transform.transform(message, [
    transform.customFormatterFactory(transport.format, true, scopeOptions),
  ]);
}

function transformMain(message, transport, scopeOptions) {
  var useStyles = canUseStyles(transport.useStyles, message.level);

  return transform.transform(message, [
    addTemplateColorFactory(transport.format),
    transform.customFormatterFactory(transport.format, false, scopeOptions),
    useStyles ? transform.applyAnsiStyles : transform.removeStyles,
    transform.concatFirstStringElements,
    transform.maxDepthFactory(4),
    transform.toJSON,
  ]);
}

function addTemplateColorFactory(format) {
  return function addTemplateColors(data, message) {
    if (format !== DEFAULT_FORMAT.browser) {
      return data;
    }

    return ['color:' + levelToStyle(message.level), 'color:unset'].concat(data);
  };
}

function canUseStyles(useStyleValue, level) {
  if (useStyleValue === true || useStyleValue === false) {
    return useStyleValue;
  }

  var useStderr = level === 'error' || level === 'warn';
  var stream = useStderr ? process.stderr : process.stdout;
  return stream && stream.isTTY;
}

function consoleLog(level, args) {
  var consoleMethod = consoleMethods[level] || consoleMethods.info;

  if (process.type === 'renderer') {
    setTimeout(consoleMethod.bind.apply(
      consoleMethod,
      [consoleMethod.context].concat(args)
    ));
    return;
  }

  consoleMethod.apply(consoleMethods.context, args);
}

function levelToStyle(level) {
  switch (level) {
    case 'error': return 'red';
    case 'warn':  return 'yellow';
    case 'info':  return 'cyan';
    default:      return 'unset';
  }
}


/***/ }),

/***/ "./node_modules/electron-log/src/transports/file/file.js":
/*!***************************************************************!*\
  !*** ./node_modules/electron-log/src/transports/file/file.js ***!
  \***************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var EventEmitter = __webpack_require__(/*! events */ "events");
var fs = __webpack_require__(/*! fs */ "fs");
var os = __webpack_require__(/*! os */ "os");
var path = __webpack_require__(/*! path */ "path");
var util = __webpack_require__(/*! util */ "util");

module.exports = {
  File: File,
  FileRegistry: FileRegistry,
  NullFile: NullFile,
};

/**
 * File manipulations on filesystem
 * @class
 * @extends EventEmitter
 * @property {number} size
 *
 * @constructor
 * @param {string} filePath
 * @param {WriteOptions} [writeOptions]
 * @param {boolean} [writeAsync]
 */
function File(filePath, writeOptions, writeAsync) {
  EventEmitter.call(this);

  /**
   * @type {string}
   * @readonly
   */
  this.path = filePath;

  /**
   * @type {number}
   * @private
   */
  this.initialSize = undefined;

  /**
   * @type {number}
   * @readonly
   */
  this.bytesWritten = 0;

  /**
   * @type {boolean}
   * @private
   */
  this.writeAsync = Boolean(writeAsync);

  /**
   * @type {string[]}
   * @private
   */
  this.asyncWriteQueue = [];

  /**
   * @type {boolean}
   * @private
   */
  this.hasActiveAsyncWritting = false;

  /**
   * @type {WriteOptions}
   * @private
   */
  this.writeOptions = writeOptions || {
    flag: 'a',
    mode: 438, // 0666
    encoding: 'utf8',
  };

  Object.defineProperty(this, 'size', {
    get: this.getSize.bind(this),
  });
}

util.inherits(File, EventEmitter);

File.prototype.clear = function () {
  try {
    fs.writeFileSync(this.path, '', {
      mode: this.writeOptions.mode,
      flag: 'w',
    });
    this.reset();
    return true;
  } catch (e) {
    if (e.code === 'ENOENT') {
      return true;
    }

    this.emit('error', e, this);
    return false;
  }
};

File.prototype.crop = function (bytesAfter) {
  try {
    var content = readFileSyncFromEnd(this.path, bytesAfter || 4096);
    this.clear();
    this.writeLine('[log cropped]' + os.EOL + content);
  } catch (e) {
    this.emit(
      'error',
      new Error('Couldn\'t crop file ' + this.path + '. ' + e.message),
      this
    );
  }
};

File.prototype.toString = function () {
  return this.path;
};

/**
 * @package
 */
File.prototype.reset = function () {
  this.initialSize = undefined;
  this.bytesWritten = 0;
};

/**
 * @package
 */
File.prototype.writeLine = function (text) {
  text += os.EOL;

  if (this.writeAsync) {
    this.asyncWriteQueue.push(text);
    this.nextAsyncWrite();
    return;
  }

  try {
    fs.writeFileSync(this.path, text, this.writeOptions);
    this.increaseBytesWrittenCounter(text);
  } catch (e) {
    this.emit(
      'error',
      new Error('Couldn\'t write to ' + this.path + '. ' + e.message),
      this
    );
  }
};

/**
 * @return {number}
 * @protected
 */
File.prototype.getSize = function () {
  if (this.initialSize === undefined) {
    try {
      var stats = fs.statSync(this.path);
      this.initialSize = stats.size;
    } catch (e) {
      this.initialSize = 0;
    }
  }

  return this.initialSize + this.bytesWritten;
};

/**
 * @return {boolean}
 * @package
 */
File.prototype.isNull = function () {
  return false;
};

/**
 * @private
 */
File.prototype.increaseBytesWrittenCounter = function (text) {
  this.bytesWritten += Buffer.byteLength(text, this.writeOptions.encoding);
};

/**
 * @private
 */
File.prototype.nextAsyncWrite = function () {
  var file = this;

  if (this.hasActiveAsyncWritting || this.asyncWriteQueue.length < 1) {
    return;
  }

  var text = this.asyncWriteQueue.shift();
  this.hasActiveAsyncWritting = true;

  fs.writeFile(this.path, text, this.writeOptions, function (e) {
    file.hasActiveAsyncWritting = false;

    if (e) {
      file.emit(
        'error',
        new Error('Couldn\'t write to ' + file.path + '. ' + e.message),
        this
      );
    } else {
      file.increaseBytesWrittenCounter(text);
    }

    file.nextAsyncWrite();
  });
};

/**
 * File manipulations on filesystem
 * @class
 * @property {number} size
 *
 * @constructor
 * @param {string} filePath
 */
function NullFile(filePath) {
  File.call(this, filePath);
}

util.inherits(NullFile, File);

NullFile.prototype.clear = function () {};
NullFile.prototype.crop = function () {};
NullFile.prototype.writeLine = function () {};
NullFile.prototype.getSize = function () { return 0 };
NullFile.prototype.isNull = function () { return true };

/**
 * Collection, key is a file path, value is a File instance
 * @class
 *
 * @constructor
 */
function FileRegistry() {
  EventEmitter.call(this);
  this.store = {};

  this.emitError = this.emitError.bind(this);
}

util.inherits(FileRegistry, EventEmitter);

/**
 * Provide a File object corresponding to the filePath
 * @param {string} filePath
 * @param {WriteOptions} [writeOptions]
 * @param {boolean} [async]
 * @return {File}
 */
FileRegistry.prototype.provide = function (filePath, writeOptions, async) {
  var file;
  try {
    filePath = path.resolve(filePath);

    if (this.store[filePath]) {
      return this.store[filePath];
    }

    file = this.createFile(filePath, writeOptions, Boolean(async));
  } catch (e) {
    file = new NullFile(filePath);
    this.emitError(e, file);
  }

  file.on('error', this.emitError);
  this.store[filePath] = file;
  return file;
};

/**
 * @param {string} filePath
 * @param {WriteOptions} writeOptions
 * @param {boolean} async
 * @return {File}
 * @private
 */
FileRegistry.prototype.createFile = function (filePath, writeOptions, async) {
  this.testFileWriting(filePath);
  return new File(filePath, writeOptions, async);
};

/**
 * @param {Error} error
 * @param {File} file
 * @private
 */
FileRegistry.prototype.emitError = function (error, file) {
  this.emit('error', error, file);
};

/**
 * @param {string} filePath
 * @private
 */
FileRegistry.prototype.testFileWriting = function (filePath) {
  mkDir(path.dirname(filePath));
  fs.writeFileSync(filePath, '', { flag: 'a' });
};

function mkDir(dirPath) {
  if (checkNodeJsVersion(10.12)) {
    fs.mkdirSync(dirPath, { recursive: true });
    return true;
  }

  try {
    fs.mkdirSync(dirPath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return mkDir(path.dirname(dirPath)) && mkDir(dirPath);
    }

    // eslint-disable-next-line no-useless-catch
    try {
      if (fs.statSync(dirPath).isDirectory()) {
        return true;
      }

      // noinspection ExceptionCaughtLocallyJS
      throw error;
    } catch (e) {
      throw e;
    }
  }
}

function checkNodeJsVersion(version) {
  if (!process.versions) {
    return false;
  }

  var nodeVersion = Number(
    process.version.match(/^v(\d+\.\d+)/)[1].replace(/\.(\d)$/, '.0$1')
  );

  return nodeVersion >= version;
}

function readFileSyncFromEnd(filePath, bytesCount) {
  var buffer = Buffer.alloc(bytesCount);
  var stats = fs.statSync(filePath);

  var readLength = Math.min(stats.size, bytesCount);
  var offset = Math.max(0, stats.size - bytesCount);

  var fd = fs.openSync(filePath, 'r');
  var totalBytes = fs.readSync(fd, buffer, 0, readLength, offset);
  fs.closeSync(fd);

  return buffer.toString('utf8', 0, totalBytes);
}


/***/ }),

/***/ "./node_modules/electron-log/src/transports/file/index.js":
/*!****************************************************************!*\
  !*** ./node_modules/electron-log/src/transports/file/index.js ***!
  \****************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var fs = __webpack_require__(/*! fs */ "fs");
var path = __webpack_require__(/*! path */ "path");
var os = __webpack_require__(/*! os */ "os");
var util = __webpack_require__(/*! util */ "util");
var transform = __webpack_require__(/*! ../../transform */ "./node_modules/electron-log/src/transform/index.js");
var FileRegistry = (__webpack_require__(/*! ./file */ "./node_modules/electron-log/src/transports/file/file.js").FileRegistry);
var variables = __webpack_require__(/*! ./variables */ "./node_modules/electron-log/src/transports/file/variables.js");

module.exports = fileTransportFactory;

// Shared between multiple file transport instances
var globalRegistry = new FileRegistry();

function fileTransportFactory(electronLog, customRegistry) {
  var pathVariables = variables.getPathVariables(process.platform);

  var registry = customRegistry || globalRegistry;
  if (registry.listenerCount('error') < 1) {
    registry.on('error', function (e, file) {
      logConsole('Can\'t write to ' + file, e);
    });
  }

  /* eslint-disable no-multi-spaces */
  transport.archiveLog   = archiveLog;
  transport.depth        = 5;
  transport.fileName     = getDefaultFileName();
  transport
    .format = '[{y}-{m}-{d} {h}:{i}:{s}.{ms}] [{level}]{scope} {text}';
  transport.getFile      = getFile;
  transport.level        = 'silly';
  transport.maxSize      = 1024 * 1024;
  transport.readAllLogs  = readAllLogs;
  transport.resolvePath  = resolvePath;
  transport.sync         = true;
  transport.writeOptions = {
    flag: 'a',
    mode: 438, // 0666
    encoding: 'utf8',
  };
  transport.inspectOptions = {};

  initDeprecated();

  return transport;

  function transport(message) {
    var file = getFile(message);

    var needLogRotation = transport.maxSize > 0
      && file.size > transport.maxSize;

    if (needLogRotation) {
      transport.archiveLog(file);
      file.reset();
    }

    var scopeOptions = electronLog.scope.getOptions();
    var inspectOptions = Object.assign(
      { depth: transport.depth },
      transport.inspectOptions
    );
    var content = transform.transform(message, [
      transform.removeStyles,
      transform.customFormatterFactory(transport.format, false, scopeOptions),
      transform.concatFirstStringElements,
      transform.toStringFactory(inspectOptions),
    ]);

    file.writeLine(content);
  }

  function archiveLog(file) {
    var oldPath = file.toString();
    var inf = path.parse(oldPath);
    try {
      fs.renameSync(oldPath, path.join(inf.dir, inf.name + '.old' + inf.ext));
    } catch (e) {
      logConsole('Could not rotate log', e);
      var quarterOfMaxSize = Math.round(transport.maxSize / 4);
      file.crop(Math.min(quarterOfMaxSize, 256 * 1024));
    }
  }

  function logConsole(message, error) {
    var data = ['electron-log.transports.file: ' + message];

    if (error) {
      data.push(error);
    }

    electronLog.transports.console({
      data: data,
      date: new Date(),
      level: 'warn',
    });
  }

  function getFile(msg) {
    var vars = Object.assign({}, pathVariables, {
      fileName: transport.fileName,
    });

    var filePath = transport.resolvePath(vars, msg);
    return registry.provide(filePath, transport.writeOptions, !transport.sync);
  }

  /**
   * @param {PathVariables} vars
   */
  function resolvePath(vars) {
    return path.join(vars.libraryDefaultDir, vars.fileName);
  }

  function readAllLogs() {
    var vars = Object.assign({}, pathVariables, {
      fileName: transport.fileName,
    });
    var logsPath = path.dirname(transport.resolvePath(vars));

    return fs.readdirSync(logsPath)
      .map(function (fileName) {
        var logPath = path.join(logsPath, fileName);
        try {
          return {
            path: logPath,
            lines: fs.readFileSync(logPath, 'utf8').split(os.EOL),
          };
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean);
  }

  function initDeprecated() {
    var isDeprecatedText = ' is deprecated and will be removed in v5.';
    var isDeprecatedProp = ' property' + isDeprecatedText;

    Object.defineProperties(transport, {
      bytesWritten: {
        get: util.deprecate(getBytesWritten, 'bytesWritten' + isDeprecatedProp),
      },

      file: {
        get: util.deprecate(getLogFile, 'file' + isDeprecatedProp),
        set: util.deprecate(setLogFile, 'file' + isDeprecatedProp),
      },

      fileSize: {
        get: util.deprecate(getFileSize, 'file' + isDeprecatedProp),
      },
    });

    transport.clear = util.deprecate(clear, 'clear()' + isDeprecatedText);
    transport.findLogPath = util.deprecate(
      getLogFile,
      'findLogPath()' + isDeprecatedText
    );
    transport.init = util.deprecate(init, 'init()' + isDeprecatedText);

    function getBytesWritten() {
      return getFile().bytesWritten;
    }

    function getLogFile() {
      return getFile().path;
    }

    function setLogFile(filePath) {
      transport.resolvePath = function () {
        return filePath;
      };
    }

    function getFileSize() {
      return getFile().size;
    }

    function clear() {
      getFile().clear();
    }

    function init() {}
  }
}

function getDefaultFileName() {
  switch (process.type) {
    case 'renderer': return 'renderer.log';
    case 'worker': return 'worker.log';
    default: return 'main.log';
  }
}


/***/ }),

/***/ "./node_modules/electron-log/src/transports/file/packageJson.js":
/*!**********************************************************************!*\
  !*** ./node_modules/electron-log/src/transports/file/packageJson.js ***!
  \**********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



/* eslint-disable consistent-return */

var fs = __webpack_require__(/*! fs */ "fs");
var path = __webpack_require__(/*! path */ "path");

module.exports = {
  readPackageJson: readPackageJson,
  tryReadJsonAt: tryReadJsonAt,
};

/**
 * @return {{ name?: string, version?: string}}
 */
function readPackageJson() {
  return tryReadJsonAt(__webpack_require__.c[__webpack_require__.s] && __webpack_require__.c[__webpack_require__.s].filename)
    || tryReadJsonAt(extractPathFromArgs())
    || tryReadJsonAt(process.resourcesPath, 'app.asar')
    || tryReadJsonAt(process.resourcesPath, 'app')
    || tryReadJsonAt(process.cwd())
    || { name: null, version: null };
}

/**
 * @param {...string} searchPath
 * @return {{ name?: string, version?: string } | null}
 */
function tryReadJsonAt(searchPath) {
  if (!searchPath) {
    return null;
  }

  try {
    searchPath = path.join.apply(path, arguments);
    var fileName = findUp('package.json', searchPath);
    if (!fileName) {
      return null;
    }

    var json = JSON.parse(fs.readFileSync(fileName, 'utf8'));
    var name = json.productName || json.name;
    if (!name || name.toLowerCase() === 'electron') {
      return null;
    }

    if (json.productName || json.name) {
      return {
        name: name,
        version: json.version,
      };
    }
  } catch (e) {
    return null;
  }
}

/**
 * @param {string} fileName
 * @param {string} [cwd]
 * @return {string | null}
 */
function findUp(fileName, cwd) {
  var currentPath = cwd;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    var parsedPath = path.parse(currentPath);
    var root = parsedPath.root;
    var dir = parsedPath.dir;

    if (fs.existsSync(path.join(currentPath, fileName))) {
      return path.resolve(path.join(currentPath, fileName));
    }

    if (currentPath === root) {
      return null;
    }

    currentPath = dir;
  }
}

/**
 * Get app path from --user-data-dir cmd arg, passed to a renderer process
 * @return {string|null}
 */
function extractPathFromArgs() {
  var matchedArgs = process.argv.filter(function (arg) {
    return arg.indexOf('--user-data-dir=') === 0;
  });

  if (matchedArgs.length === 0 || typeof matchedArgs[0] !== 'string') {
    return null;
  }

  var userDataDir = matchedArgs[0];
  return userDataDir.replace('--user-data-dir=', '');
}


/***/ }),

/***/ "./node_modules/electron-log/src/transports/file/variables.js":
/*!********************************************************************!*\
  !*** ./node_modules/electron-log/src/transports/file/variables.js ***!
  \********************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var os = __webpack_require__(/*! os */ "os");
var path = __webpack_require__(/*! path */ "path");
var electronApi = __webpack_require__(/*! ../../electronApi */ "./node_modules/electron-log/src/electronApi.js");
var packageJson = __webpack_require__(/*! ./packageJson */ "./node_modules/electron-log/src/transports/file/packageJson.js");

module.exports = {
  getAppData: getAppData,
  getLibraryDefaultDir: getLibraryDefaultDir,
  getLibraryTemplate: getLibraryTemplate,
  getNameAndVersion: getNameAndVersion,
  getPathVariables: getPathVariables,
  getUserData: getUserData,
};

function getAppData(platform) {
  var appData = electronApi.getPath('appData');
  if (appData) {
    return appData;
  }

  var home = getHome();

  switch (platform) {
    case 'darwin': {
      return path.join(home, 'Library/Application Support');
    }

    case 'win32': {
      return {"NVM_INC":"/Users/jimmy/.nvm/versions/node/v14.18.2/include/node","mode":"development","npm_package_scripts_start_local_web":"env-cmd -e renderer,local webpack serve","MANPATH":"/Users/jimmy/.nvm/versions/node/v14.18.2/share/man:/opt/homebrew/share/man::","npm_package_devDependencies_react_test_renderer":"^18.0.0","TERM_PROGRAM":"Apple_Terminal","npm_package_devDependencies_file_loader":"^6.2.0","NODE":"/Users/jimmy/.nvm/versions/node/v14.18.2/bin/node","npm_config_version_git_tag":"true","NVM_CD_FLAGS":"-q","INIT_CWD":"/Users/jimmy/Documents/workdir/yun/regex","npm_package_devDependencies__types_electron_json_storage":"^4.5.0","npm_package_devDependencies_jest":"^27.5.1","SHELL":"/bin/zsh","TERM":"xterm-256color","npm_package_devDependencies_style_loader":"^3.3.1","HOMEBREW_REPOSITORY":"/opt/homebrew","TMPDIR":"/var/folders/4w/c7yhp66x6c94jzxqp4d_bp4r0000gn/T/","npm_config_init_license":"MIT","npm_package_devDependencies__babel_preset_typescript":"^7.16.7","TERM_PROGRAM_VERSION":"443","TERM_SESSION_ID":"AF2A4952-D673-4C19-A9E4-E00410198FBB","npm_config_registry":"https://registry.yarnpkg.com","npm_package_private":"true","npm_package_dependencies_electron":"^18.1.0","npm_package_dependencies_react_dom":"^18.0.0","npm_package_devDependencies_eslint_plugin_jsx_a11y":"^6.4.1","npm_package_readmeFilename":"README.md","npm_package_devDependencies__testing_library_react":"^13.1.1","npm_package_devDependencies_webpack":"^5.36.2","npm_package_description":"> package.json 의 `env-cmd -e {prod|dev}` 명령어를 바탕으로 `.env-cmdrc.json` 파일이 생성 되어야 합니다 root 디렉토리에서 파일을 생성하고 아래와 같이 세팅을 진행 해 주시기 바랍니다.","NVM_DIR":"/Users/jimmy/.nvm","USER":"jimmy","npm_package_devDependencies__types_react":"^18.0.5","npm_package_devDependencies_webpack_cli":"^4.6.0","npm_package_dependencies_electron_builder":"^23.0.3","npm_package_browserslist_development_1":"last 1 firefox version","npm_package_devDependencies__babel_core":"^7.17.9","npm_package_devDependencies_babel_jest":"^27.5.1","npm_package_devDependencies_webpack_dev_server":"^4.8.1","npm_package_browserslist_development_0":"last 1 chrome version","npm_package_devDependencies__types_testing_library__jest_dom":"^5.9.5","SSH_AUTH_SOCK":"/private/tmp/com.apple.launchd.eavw1Flxfo/Listeners","npm_package_dependencies_env_cmd":"^10.1.0","npm_package_devDependencies__types_jest":"^27.4.1","npm_package_devDependencies_eslint":"^8.13.0","npm_package_browserslist_development_2":"last 1 safari version","__CF_USER_TEXT_ENCODING":"0x1F5:0x3:0x33","npm_package_devDependencies__typescript_eslint_eslint_plugin":"^5.20.0","npm_execpath":"/usr/local/lib/node_modules/yarn/bin/yarn.js","npm_package_dependencies_electron_json_storage":"^4.5.0","npm_package_devDependencies__types_react_dom":"^18.0.1","npm_package_devDependencies__typescript_eslint_parser":"^5.20.0","npm_config_argv":"{\"remain\":[],\"cooked\":[\"run\",\"build:local:main\"],\"original\":[\"build:local:main\"]}","PATH":"/Users/jimmy/Documents/workdir/yun/regex/node_modules/.bin:/var/folders/4w/c7yhp66x6c94jzxqp4d_bp4r0000gn/T/yarn--1650768263991-0.16061728319526702:/Users/jimmy/Documents/workdir/yun/regex/node_modules/.bin:/Users/jimmy/.config/yarn/link/node_modules/.bin:/Users/jimmy/.yarn/bin:/Users/jimmy/.nvm/versions/node/v14.18.2/libexec/lib/node_modules/npm/bin/node-gyp-bin:/Users/jimmy/.nvm/versions/node/v14.18.2/lib/node_modules/npm/bin/node-gyp-bin:/Users/jimmy/.nvm/versions/node/v14.18.2/bin/node_modules/npm/bin/node-gyp-bin:/Users/jimmy/.nvm/versions/node/v14.18.2/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Library/Apple/usr/bin","_":"/Users/jimmy/Documents/workdir/yun/regex/node_modules/.bin/env-cmd","npm_package_dependencies_typescript":"^4.6.3","npm_package_browserslist_production_1":"not dead","__CFBundleIdentifier":"com.apple.Terminal","npm_package_devDependencies_eslint_config_airbnb":"^19.0.4","npm_package_browserslist_production_0":">0.2%","PWD":"/Users/jimmy/Documents/workdir/yun/regex","npm_package_devDependencies_eslint_plugin_react_hooks":"^4.2.0","npm_package_devDependencies__types_react_router_dom":"^5.3.3","npm_package_browserslist_production_2":"not op_mini all","npm_lifecycle_event":"build:local:main","npm_package_name":"reactbase","npm_package_dependencies_electron_log":"^4.4.6","LANG":"ko_KR.UTF-8","npm_package_devDependencies__babel_preset_env":"^7.16.11","npm_package_devDependencies__babel_preset_react":"^7.16.7","npm_package_devDependencies_eslint_plugin_import":"^2.23.3","npm_config_version_commit_hooks":"true","npm_package_dependencies_react_router_dom":"^6.3.0","npm_package_devDependencies_ts_loader":"^9.1.1","XPC_FLAGS":"0x0","npm_config_bin_links":"true","npm_package_main":"dist-electron-main/main.js","npm_package_version":"0.1.1","XPC_SERVICE_NAME":"0","npm_package_devDependencies_eslint_import_resolver_typescript":"^2.4.0","runtimeMode":"local","SHLVL":"2","HOME":"/Users/jimmy","npm_package_scripts_build_local_main":"env-cmd -e main,local npx webpack --config webpack.config.js --watch","npm_package_scripts_test":"jest","npm_config_strict_ssl":"true","npm_config_save_prefix":"^","npm_config_version_git_message":"v%s","HOMEBREW_PREFIX":"/opt/homebrew","npm_package_scripts_test_cover":"jest --coverage","target":"electron-main","npm_package_devDependencies_html_webpack_plugin":"^5.3.1","YARN_WRAP_OUTPUT":"false","LOGNAME":"jimmy","npm_lifecycle_script":"env-cmd -e main,local npx webpack --config webpack.config.js --watch","npm_package_dependencies_react":"^18.0.0","NVM_BIN":"/Users/jimmy/.nvm/versions/node/v14.18.2/bin","npm_config_user_agent":"yarn/1.22.17 npm/? node/v14.18.2 darwin x64","npm_config_ignore_scripts":"","npm_config_version_git_sign":"","INFOPATH":"/opt/homebrew/share/info:","HOMEBREW_CELLAR":"/opt/homebrew/Cellar","npm_config__bryntum_registry":"https://npm.bryntum.com","npm_config_ignore_optional":"","npm_config_init_version":"1.0.0","npm_package_dependencies_electron_updater":"^5.0.1","npm_package_devDependencies_css_loader":"^6.7.1","npm_package_scripts_se":"electron .","npm_config_version_tag_prefix":"v","npm_package_devDependencies__testing_library_jest_dom":"^5.12.0","npm_package_devDependencies_eslint_plugin_react":"^7.23.2","npm_node_execpath":"/Users/jimmy/.nvm/versions/node/v14.18.2/bin/node"}.APPDATA || path.join(home, 'AppData/Roaming');
    }

    default: {
      return {"NVM_INC":"/Users/jimmy/.nvm/versions/node/v14.18.2/include/node","mode":"development","npm_package_scripts_start_local_web":"env-cmd -e renderer,local webpack serve","MANPATH":"/Users/jimmy/.nvm/versions/node/v14.18.2/share/man:/opt/homebrew/share/man::","npm_package_devDependencies_react_test_renderer":"^18.0.0","TERM_PROGRAM":"Apple_Terminal","npm_package_devDependencies_file_loader":"^6.2.0","NODE":"/Users/jimmy/.nvm/versions/node/v14.18.2/bin/node","npm_config_version_git_tag":"true","NVM_CD_FLAGS":"-q","INIT_CWD":"/Users/jimmy/Documents/workdir/yun/regex","npm_package_devDependencies__types_electron_json_storage":"^4.5.0","npm_package_devDependencies_jest":"^27.5.1","SHELL":"/bin/zsh","TERM":"xterm-256color","npm_package_devDependencies_style_loader":"^3.3.1","HOMEBREW_REPOSITORY":"/opt/homebrew","TMPDIR":"/var/folders/4w/c7yhp66x6c94jzxqp4d_bp4r0000gn/T/","npm_config_init_license":"MIT","npm_package_devDependencies__babel_preset_typescript":"^7.16.7","TERM_PROGRAM_VERSION":"443","TERM_SESSION_ID":"AF2A4952-D673-4C19-A9E4-E00410198FBB","npm_config_registry":"https://registry.yarnpkg.com","npm_package_private":"true","npm_package_dependencies_electron":"^18.1.0","npm_package_dependencies_react_dom":"^18.0.0","npm_package_devDependencies_eslint_plugin_jsx_a11y":"^6.4.1","npm_package_readmeFilename":"README.md","npm_package_devDependencies__testing_library_react":"^13.1.1","npm_package_devDependencies_webpack":"^5.36.2","npm_package_description":"> package.json 의 `env-cmd -e {prod|dev}` 명령어를 바탕으로 `.env-cmdrc.json` 파일이 생성 되어야 합니다 root 디렉토리에서 파일을 생성하고 아래와 같이 세팅을 진행 해 주시기 바랍니다.","NVM_DIR":"/Users/jimmy/.nvm","USER":"jimmy","npm_package_devDependencies__types_react":"^18.0.5","npm_package_devDependencies_webpack_cli":"^4.6.0","npm_package_dependencies_electron_builder":"^23.0.3","npm_package_browserslist_development_1":"last 1 firefox version","npm_package_devDependencies__babel_core":"^7.17.9","npm_package_devDependencies_babel_jest":"^27.5.1","npm_package_devDependencies_webpack_dev_server":"^4.8.1","npm_package_browserslist_development_0":"last 1 chrome version","npm_package_devDependencies__types_testing_library__jest_dom":"^5.9.5","SSH_AUTH_SOCK":"/private/tmp/com.apple.launchd.eavw1Flxfo/Listeners","npm_package_dependencies_env_cmd":"^10.1.0","npm_package_devDependencies__types_jest":"^27.4.1","npm_package_devDependencies_eslint":"^8.13.0","npm_package_browserslist_development_2":"last 1 safari version","__CF_USER_TEXT_ENCODING":"0x1F5:0x3:0x33","npm_package_devDependencies__typescript_eslint_eslint_plugin":"^5.20.0","npm_execpath":"/usr/local/lib/node_modules/yarn/bin/yarn.js","npm_package_dependencies_electron_json_storage":"^4.5.0","npm_package_devDependencies__types_react_dom":"^18.0.1","npm_package_devDependencies__typescript_eslint_parser":"^5.20.0","npm_config_argv":"{\"remain\":[],\"cooked\":[\"run\",\"build:local:main\"],\"original\":[\"build:local:main\"]}","PATH":"/Users/jimmy/Documents/workdir/yun/regex/node_modules/.bin:/var/folders/4w/c7yhp66x6c94jzxqp4d_bp4r0000gn/T/yarn--1650768263991-0.16061728319526702:/Users/jimmy/Documents/workdir/yun/regex/node_modules/.bin:/Users/jimmy/.config/yarn/link/node_modules/.bin:/Users/jimmy/.yarn/bin:/Users/jimmy/.nvm/versions/node/v14.18.2/libexec/lib/node_modules/npm/bin/node-gyp-bin:/Users/jimmy/.nvm/versions/node/v14.18.2/lib/node_modules/npm/bin/node-gyp-bin:/Users/jimmy/.nvm/versions/node/v14.18.2/bin/node_modules/npm/bin/node-gyp-bin:/Users/jimmy/.nvm/versions/node/v14.18.2/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Library/Apple/usr/bin","_":"/Users/jimmy/Documents/workdir/yun/regex/node_modules/.bin/env-cmd","npm_package_dependencies_typescript":"^4.6.3","npm_package_browserslist_production_1":"not dead","__CFBundleIdentifier":"com.apple.Terminal","npm_package_devDependencies_eslint_config_airbnb":"^19.0.4","npm_package_browserslist_production_0":">0.2%","PWD":"/Users/jimmy/Documents/workdir/yun/regex","npm_package_devDependencies_eslint_plugin_react_hooks":"^4.2.0","npm_package_devDependencies__types_react_router_dom":"^5.3.3","npm_package_browserslist_production_2":"not op_mini all","npm_lifecycle_event":"build:local:main","npm_package_name":"reactbase","npm_package_dependencies_electron_log":"^4.4.6","LANG":"ko_KR.UTF-8","npm_package_devDependencies__babel_preset_env":"^7.16.11","npm_package_devDependencies__babel_preset_react":"^7.16.7","npm_package_devDependencies_eslint_plugin_import":"^2.23.3","npm_config_version_commit_hooks":"true","npm_package_dependencies_react_router_dom":"^6.3.0","npm_package_devDependencies_ts_loader":"^9.1.1","XPC_FLAGS":"0x0","npm_config_bin_links":"true","npm_package_main":"dist-electron-main/main.js","npm_package_version":"0.1.1","XPC_SERVICE_NAME":"0","npm_package_devDependencies_eslint_import_resolver_typescript":"^2.4.0","runtimeMode":"local","SHLVL":"2","HOME":"/Users/jimmy","npm_package_scripts_build_local_main":"env-cmd -e main,local npx webpack --config webpack.config.js --watch","npm_package_scripts_test":"jest","npm_config_strict_ssl":"true","npm_config_save_prefix":"^","npm_config_version_git_message":"v%s","HOMEBREW_PREFIX":"/opt/homebrew","npm_package_scripts_test_cover":"jest --coverage","target":"electron-main","npm_package_devDependencies_html_webpack_plugin":"^5.3.1","YARN_WRAP_OUTPUT":"false","LOGNAME":"jimmy","npm_lifecycle_script":"env-cmd -e main,local npx webpack --config webpack.config.js --watch","npm_package_dependencies_react":"^18.0.0","NVM_BIN":"/Users/jimmy/.nvm/versions/node/v14.18.2/bin","npm_config_user_agent":"yarn/1.22.17 npm/? node/v14.18.2 darwin x64","npm_config_ignore_scripts":"","npm_config_version_git_sign":"","INFOPATH":"/opt/homebrew/share/info:","HOMEBREW_CELLAR":"/opt/homebrew/Cellar","npm_config__bryntum_registry":"https://npm.bryntum.com","npm_config_ignore_optional":"","npm_config_init_version":"1.0.0","npm_package_dependencies_electron_updater":"^5.0.1","npm_package_devDependencies_css_loader":"^6.7.1","npm_package_scripts_se":"electron .","npm_config_version_tag_prefix":"v","npm_package_devDependencies__testing_library_jest_dom":"^5.12.0","npm_package_devDependencies_eslint_plugin_react":"^7.23.2","npm_node_execpath":"/Users/jimmy/.nvm/versions/node/v14.18.2/bin/node"}.XDG_CONFIG_HOME || path.join(home, '.config');
    }
  }
}

function getHome() {
  return os.homedir ? os.homedir() : {"NVM_INC":"/Users/jimmy/.nvm/versions/node/v14.18.2/include/node","mode":"development","npm_package_scripts_start_local_web":"env-cmd -e renderer,local webpack serve","MANPATH":"/Users/jimmy/.nvm/versions/node/v14.18.2/share/man:/opt/homebrew/share/man::","npm_package_devDependencies_react_test_renderer":"^18.0.0","TERM_PROGRAM":"Apple_Terminal","npm_package_devDependencies_file_loader":"^6.2.0","NODE":"/Users/jimmy/.nvm/versions/node/v14.18.2/bin/node","npm_config_version_git_tag":"true","NVM_CD_FLAGS":"-q","INIT_CWD":"/Users/jimmy/Documents/workdir/yun/regex","npm_package_devDependencies__types_electron_json_storage":"^4.5.0","npm_package_devDependencies_jest":"^27.5.1","SHELL":"/bin/zsh","TERM":"xterm-256color","npm_package_devDependencies_style_loader":"^3.3.1","HOMEBREW_REPOSITORY":"/opt/homebrew","TMPDIR":"/var/folders/4w/c7yhp66x6c94jzxqp4d_bp4r0000gn/T/","npm_config_init_license":"MIT","npm_package_devDependencies__babel_preset_typescript":"^7.16.7","TERM_PROGRAM_VERSION":"443","TERM_SESSION_ID":"AF2A4952-D673-4C19-A9E4-E00410198FBB","npm_config_registry":"https://registry.yarnpkg.com","npm_package_private":"true","npm_package_dependencies_electron":"^18.1.0","npm_package_dependencies_react_dom":"^18.0.0","npm_package_devDependencies_eslint_plugin_jsx_a11y":"^6.4.1","npm_package_readmeFilename":"README.md","npm_package_devDependencies__testing_library_react":"^13.1.1","npm_package_devDependencies_webpack":"^5.36.2","npm_package_description":"> package.json 의 `env-cmd -e {prod|dev}` 명령어를 바탕으로 `.env-cmdrc.json` 파일이 생성 되어야 합니다 root 디렉토리에서 파일을 생성하고 아래와 같이 세팅을 진행 해 주시기 바랍니다.","NVM_DIR":"/Users/jimmy/.nvm","USER":"jimmy","npm_package_devDependencies__types_react":"^18.0.5","npm_package_devDependencies_webpack_cli":"^4.6.0","npm_package_dependencies_electron_builder":"^23.0.3","npm_package_browserslist_development_1":"last 1 firefox version","npm_package_devDependencies__babel_core":"^7.17.9","npm_package_devDependencies_babel_jest":"^27.5.1","npm_package_devDependencies_webpack_dev_server":"^4.8.1","npm_package_browserslist_development_0":"last 1 chrome version","npm_package_devDependencies__types_testing_library__jest_dom":"^5.9.5","SSH_AUTH_SOCK":"/private/tmp/com.apple.launchd.eavw1Flxfo/Listeners","npm_package_dependencies_env_cmd":"^10.1.0","npm_package_devDependencies__types_jest":"^27.4.1","npm_package_devDependencies_eslint":"^8.13.0","npm_package_browserslist_development_2":"last 1 safari version","__CF_USER_TEXT_ENCODING":"0x1F5:0x3:0x33","npm_package_devDependencies__typescript_eslint_eslint_plugin":"^5.20.0","npm_execpath":"/usr/local/lib/node_modules/yarn/bin/yarn.js","npm_package_dependencies_electron_json_storage":"^4.5.0","npm_package_devDependencies__types_react_dom":"^18.0.1","npm_package_devDependencies__typescript_eslint_parser":"^5.20.0","npm_config_argv":"{\"remain\":[],\"cooked\":[\"run\",\"build:local:main\"],\"original\":[\"build:local:main\"]}","PATH":"/Users/jimmy/Documents/workdir/yun/regex/node_modules/.bin:/var/folders/4w/c7yhp66x6c94jzxqp4d_bp4r0000gn/T/yarn--1650768263991-0.16061728319526702:/Users/jimmy/Documents/workdir/yun/regex/node_modules/.bin:/Users/jimmy/.config/yarn/link/node_modules/.bin:/Users/jimmy/.yarn/bin:/Users/jimmy/.nvm/versions/node/v14.18.2/libexec/lib/node_modules/npm/bin/node-gyp-bin:/Users/jimmy/.nvm/versions/node/v14.18.2/lib/node_modules/npm/bin/node-gyp-bin:/Users/jimmy/.nvm/versions/node/v14.18.2/bin/node_modules/npm/bin/node-gyp-bin:/Users/jimmy/.nvm/versions/node/v14.18.2/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Library/Apple/usr/bin","_":"/Users/jimmy/Documents/workdir/yun/regex/node_modules/.bin/env-cmd","npm_package_dependencies_typescript":"^4.6.3","npm_package_browserslist_production_1":"not dead","__CFBundleIdentifier":"com.apple.Terminal","npm_package_devDependencies_eslint_config_airbnb":"^19.0.4","npm_package_browserslist_production_0":">0.2%","PWD":"/Users/jimmy/Documents/workdir/yun/regex","npm_package_devDependencies_eslint_plugin_react_hooks":"^4.2.0","npm_package_devDependencies__types_react_router_dom":"^5.3.3","npm_package_browserslist_production_2":"not op_mini all","npm_lifecycle_event":"build:local:main","npm_package_name":"reactbase","npm_package_dependencies_electron_log":"^4.4.6","LANG":"ko_KR.UTF-8","npm_package_devDependencies__babel_preset_env":"^7.16.11","npm_package_devDependencies__babel_preset_react":"^7.16.7","npm_package_devDependencies_eslint_plugin_import":"^2.23.3","npm_config_version_commit_hooks":"true","npm_package_dependencies_react_router_dom":"^6.3.0","npm_package_devDependencies_ts_loader":"^9.1.1","XPC_FLAGS":"0x0","npm_config_bin_links":"true","npm_package_main":"dist-electron-main/main.js","npm_package_version":"0.1.1","XPC_SERVICE_NAME":"0","npm_package_devDependencies_eslint_import_resolver_typescript":"^2.4.0","runtimeMode":"local","SHLVL":"2","HOME":"/Users/jimmy","npm_package_scripts_build_local_main":"env-cmd -e main,local npx webpack --config webpack.config.js --watch","npm_package_scripts_test":"jest","npm_config_strict_ssl":"true","npm_config_save_prefix":"^","npm_config_version_git_message":"v%s","HOMEBREW_PREFIX":"/opt/homebrew","npm_package_scripts_test_cover":"jest --coverage","target":"electron-main","npm_package_devDependencies_html_webpack_plugin":"^5.3.1","YARN_WRAP_OUTPUT":"false","LOGNAME":"jimmy","npm_lifecycle_script":"env-cmd -e main,local npx webpack --config webpack.config.js --watch","npm_package_dependencies_react":"^18.0.0","NVM_BIN":"/Users/jimmy/.nvm/versions/node/v14.18.2/bin","npm_config_user_agent":"yarn/1.22.17 npm/? node/v14.18.2 darwin x64","npm_config_ignore_scripts":"","npm_config_version_git_sign":"","INFOPATH":"/opt/homebrew/share/info:","HOMEBREW_CELLAR":"/opt/homebrew/Cellar","npm_config__bryntum_registry":"https://npm.bryntum.com","npm_config_ignore_optional":"","npm_config_init_version":"1.0.0","npm_package_dependencies_electron_updater":"^5.0.1","npm_package_devDependencies_css_loader":"^6.7.1","npm_package_scripts_se":"electron .","npm_config_version_tag_prefix":"v","npm_package_devDependencies__testing_library_jest_dom":"^5.12.0","npm_package_devDependencies_eslint_plugin_react":"^7.23.2","npm_node_execpath":"/Users/jimmy/.nvm/versions/node/v14.18.2/bin/node"}.HOME;
}

function getLibraryDefaultDir(platform, appName) {
  if (platform === 'darwin') {
    return path.join(getHome(), 'Library/Logs', appName);
  }

  return path.join(getUserData(platform, appName), 'logs');
}

function getLibraryTemplate(platform) {
  if (platform === 'darwin') {
    return path.join(getHome(), 'Library/Logs', '{appName}');
  }

  return path.join(getAppData(platform), '{appName}', 'logs');
}

function getNameAndVersion() {
  var name = electronApi.getName() || '';
  var version = electronApi.getVersion();

  if (name.toLowerCase() === 'electron') {
    name = '';
    version = '';
  }

  if (name && version) {
    return { name: name, version: version };
  }

  var packageValues = packageJson.readPackageJson();
  if (!name) {
    name = packageValues.name;
  }

  if (!version) {
    version = packageValues.version;
  }

  if (!name) {
    // Fallback, otherwise file transport can't be initialized
    name = 'Electron';
  }

  return { name: name, version: version };
}

/**
 * @param {string} platform
 * @return {PathVariables}
 */
function getPathVariables(platform) {
  var nameAndVersion = getNameAndVersion();
  var appName = nameAndVersion.name;
  var appVersion = nameAndVersion.version;

  return {
    appData: getAppData(platform),
    appName: appName,
    appVersion: appVersion,
    electronDefaultDir: electronApi.getPath('logs'),
    home: getHome(),
    libraryDefaultDir: getLibraryDefaultDir(platform, appName),
    libraryTemplate: getLibraryTemplate(platform),
    temp: electronApi.getPath('temp') || os.tmpdir(),
    userData: getUserData(platform, appName),
  };
}

function getUserData(platform, appName) {
  if (electronApi.getName() !== appName) {
    return path.join(getAppData(platform), appName);
  }

  return electronApi.getPath('userData')
    || path.join(getAppData(platform), appName);
}


/***/ }),

/***/ "./node_modules/electron-log/src/transports/ipc.js":
/*!*********************************************************!*\
  !*** ./node_modules/electron-log/src/transports/ipc.js ***!
  \*********************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var transform = __webpack_require__(/*! ../transform */ "./node_modules/electron-log/src/transform/index.js");
var electronApi = __webpack_require__(/*! ../electronApi */ "./node_modules/electron-log/src/electronApi.js");
var log = __webpack_require__(/*! ../log.js */ "./node_modules/electron-log/src/log.js");

module.exports = ipcTransportFactory;

function ipcTransportFactory(electronLog) {
  transport.eventId = '__ELECTRON_LOG_IPC_' + electronLog.logId + '__';
  transport.level = electronLog.isDev ? 'silly' : false;

  // Prevent problems when there are multiple instances after webpack
  if (electronApi.isIpcChannelListened(transport.eventId)) {
    return function () {};
  }

  electronApi.onIpc(transport.eventId, function (_, message) {
    message.date = new Date(message.date);

    log.runTransport(
      electronLog.transports.console,
      message,
      electronLog
    );
  });

  electronApi.loadRemoteModule('electron-log');

  return electronApi.isElectron() ? transport : null;

  function transport(message) {
    var ipcMessage = Object.assign({}, message, {
      data: transform.transform(message, [
        transform.toJSON,
        transform.maxDepthFactory(3),
      ]),
    });

    electronApi.sendIpc(transport.eventId, ipcMessage);
  }
}


/***/ }),

/***/ "./node_modules/electron-log/src/transports/remote.js":
/*!************************************************************!*\
  !*** ./node_modules/electron-log/src/transports/remote.js ***!
  \************************************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



var http = __webpack_require__(/*! http */ "http");
var https = __webpack_require__(/*! https */ "https");
var url = __webpack_require__(/*! url */ "url");
var transform = __webpack_require__(/*! ../transform */ "./node_modules/electron-log/src/transform/index.js");

module.exports = remoteTransportFactory;

function remoteTransportFactory(electronLog) {
  transport.client = { name: 'electron-application' };
  transport.depth = 6;
  transport.level = false;
  transport.requestOptions = {};
  transport.url = null;
  transport.onError = null;
  transport.transformBody = function (body) { return JSON.stringify(body) };

  return transport;

  function transport(message) {
    if (!transport.url) return;

    var body = transport.transformBody({
      client: transport.client,
      data: transform.transform(message, [
        transform.removeStyles,
        transform.toJSON,
        transform.maxDepthFactory(transport.depth + 1),
      ]),
      date: message.date.getTime(),
      level: message.level,
      variables: message.variables,
    });

    var request = post(
      transport.url,
      transport.requestOptions,
      Buffer.from(body, 'utf8')
    );

    request.on('error', transport.onError || onError);

    function onError(error) {
      electronLog.logMessageWithTransports(
        {
          data: [
            'electron-log.transports.remote:'
            + ' cannot send HTTP request to ' + transport.url,
            error,
          ],
          level: 'warn',
        },
        [
          electronLog.transports.console,
          electronLog.transports.ipc,
          electronLog.transports.file,
        ]
      );
    }
  }
}

function post(serverUrl, requestOptions, body) {
  var urlObject = url.parse(serverUrl);
  var httpTransport = urlObject.protocol === 'https:' ? https : http;

  var options = {
    hostname: urlObject.hostname,
    port:     urlObject.port,
    path:     urlObject.path,
    method:   'POST',
    headers:  {},
  };

  Object.assign(options, requestOptions);

  options.headers['Content-Length'] = body.length;
  if (!options.headers['Content-Type']) {
    options.headers['Content-Type'] = 'application/json';
  }

  var request = httpTransport.request(options);
  request.write(body);
  request.end();

  return request;
}


/***/ }),

/***/ "./src/main/index.ts":
/*!***************************!*\
  !*** ./src/main/index.ts ***!
  \***************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! electron */ "electron");
/* harmony import */ var electron__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(electron__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var electron_log__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! electron-log */ "./node_modules/electron-log/src/index.js");
/* harmony import */ var electron_log__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(electron_log__WEBPACK_IMPORTED_MODULE_1__);


electron_log__WEBPACK_IMPORTED_MODULE_1___default().info('Started App - ', 'mode: ', {"NVM_INC":"/Users/jimmy/.nvm/versions/node/v14.18.2/include/node","mode":"development","npm_package_scripts_start_local_web":"env-cmd -e renderer,local webpack serve","MANPATH":"/Users/jimmy/.nvm/versions/node/v14.18.2/share/man:/opt/homebrew/share/man::","npm_package_devDependencies_react_test_renderer":"^18.0.0","TERM_PROGRAM":"Apple_Terminal","npm_package_devDependencies_file_loader":"^6.2.0","NODE":"/Users/jimmy/.nvm/versions/node/v14.18.2/bin/node","npm_config_version_git_tag":"true","NVM_CD_FLAGS":"-q","INIT_CWD":"/Users/jimmy/Documents/workdir/yun/regex","npm_package_devDependencies__types_electron_json_storage":"^4.5.0","npm_package_devDependencies_jest":"^27.5.1","SHELL":"/bin/zsh","TERM":"xterm-256color","npm_package_devDependencies_style_loader":"^3.3.1","HOMEBREW_REPOSITORY":"/opt/homebrew","TMPDIR":"/var/folders/4w/c7yhp66x6c94jzxqp4d_bp4r0000gn/T/","npm_config_init_license":"MIT","npm_package_devDependencies__babel_preset_typescript":"^7.16.7","TERM_PROGRAM_VERSION":"443","TERM_SESSION_ID":"AF2A4952-D673-4C19-A9E4-E00410198FBB","npm_config_registry":"https://registry.yarnpkg.com","npm_package_private":"true","npm_package_dependencies_electron":"^18.1.0","npm_package_dependencies_react_dom":"^18.0.0","npm_package_devDependencies_eslint_plugin_jsx_a11y":"^6.4.1","npm_package_readmeFilename":"README.md","npm_package_devDependencies__testing_library_react":"^13.1.1","npm_package_devDependencies_webpack":"^5.36.2","npm_package_description":"> package.json 의 `env-cmd -e {prod|dev}` 명령어를 바탕으로 `.env-cmdrc.json` 파일이 생성 되어야 합니다 root 디렉토리에서 파일을 생성하고 아래와 같이 세팅을 진행 해 주시기 바랍니다.","NVM_DIR":"/Users/jimmy/.nvm","USER":"jimmy","npm_package_devDependencies__types_react":"^18.0.5","npm_package_devDependencies_webpack_cli":"^4.6.0","npm_package_dependencies_electron_builder":"^23.0.3","npm_package_browserslist_development_1":"last 1 firefox version","npm_package_devDependencies__babel_core":"^7.17.9","npm_package_devDependencies_babel_jest":"^27.5.1","npm_package_devDependencies_webpack_dev_server":"^4.8.1","npm_package_browserslist_development_0":"last 1 chrome version","npm_package_devDependencies__types_testing_library__jest_dom":"^5.9.5","SSH_AUTH_SOCK":"/private/tmp/com.apple.launchd.eavw1Flxfo/Listeners","npm_package_dependencies_env_cmd":"^10.1.0","npm_package_devDependencies__types_jest":"^27.4.1","npm_package_devDependencies_eslint":"^8.13.0","npm_package_browserslist_development_2":"last 1 safari version","__CF_USER_TEXT_ENCODING":"0x1F5:0x3:0x33","npm_package_devDependencies__typescript_eslint_eslint_plugin":"^5.20.0","npm_execpath":"/usr/local/lib/node_modules/yarn/bin/yarn.js","npm_package_dependencies_electron_json_storage":"^4.5.0","npm_package_devDependencies__types_react_dom":"^18.0.1","npm_package_devDependencies__typescript_eslint_parser":"^5.20.0","npm_config_argv":"{\"remain\":[],\"cooked\":[\"run\",\"build:local:main\"],\"original\":[\"build:local:main\"]}","PATH":"/Users/jimmy/Documents/workdir/yun/regex/node_modules/.bin:/var/folders/4w/c7yhp66x6c94jzxqp4d_bp4r0000gn/T/yarn--1650768263991-0.16061728319526702:/Users/jimmy/Documents/workdir/yun/regex/node_modules/.bin:/Users/jimmy/.config/yarn/link/node_modules/.bin:/Users/jimmy/.yarn/bin:/Users/jimmy/.nvm/versions/node/v14.18.2/libexec/lib/node_modules/npm/bin/node-gyp-bin:/Users/jimmy/.nvm/versions/node/v14.18.2/lib/node_modules/npm/bin/node-gyp-bin:/Users/jimmy/.nvm/versions/node/v14.18.2/bin/node_modules/npm/bin/node-gyp-bin:/Users/jimmy/.nvm/versions/node/v14.18.2/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Library/Apple/usr/bin","_":"/Users/jimmy/Documents/workdir/yun/regex/node_modules/.bin/env-cmd","npm_package_dependencies_typescript":"^4.6.3","npm_package_browserslist_production_1":"not dead","__CFBundleIdentifier":"com.apple.Terminal","npm_package_devDependencies_eslint_config_airbnb":"^19.0.4","npm_package_browserslist_production_0":">0.2%","PWD":"/Users/jimmy/Documents/workdir/yun/regex","npm_package_devDependencies_eslint_plugin_react_hooks":"^4.2.0","npm_package_devDependencies__types_react_router_dom":"^5.3.3","npm_package_browserslist_production_2":"not op_mini all","npm_lifecycle_event":"build:local:main","npm_package_name":"reactbase","npm_package_dependencies_electron_log":"^4.4.6","LANG":"ko_KR.UTF-8","npm_package_devDependencies__babel_preset_env":"^7.16.11","npm_package_devDependencies__babel_preset_react":"^7.16.7","npm_package_devDependencies_eslint_plugin_import":"^2.23.3","npm_config_version_commit_hooks":"true","npm_package_dependencies_react_router_dom":"^6.3.0","npm_package_devDependencies_ts_loader":"^9.1.1","XPC_FLAGS":"0x0","npm_config_bin_links":"true","npm_package_main":"dist-electron-main/main.js","npm_package_version":"0.1.1","XPC_SERVICE_NAME":"0","npm_package_devDependencies_eslint_import_resolver_typescript":"^2.4.0","runtimeMode":"local","SHLVL":"2","HOME":"/Users/jimmy","npm_package_scripts_build_local_main":"env-cmd -e main,local npx webpack --config webpack.config.js --watch","npm_package_scripts_test":"jest","npm_config_strict_ssl":"true","npm_config_save_prefix":"^","npm_config_version_git_message":"v%s","HOMEBREW_PREFIX":"/opt/homebrew","npm_package_scripts_test_cover":"jest --coverage","target":"electron-main","npm_package_devDependencies_html_webpack_plugin":"^5.3.1","YARN_WRAP_OUTPUT":"false","LOGNAME":"jimmy","npm_lifecycle_script":"env-cmd -e main,local npx webpack --config webpack.config.js --watch","npm_package_dependencies_react":"^18.0.0","NVM_BIN":"/Users/jimmy/.nvm/versions/node/v14.18.2/bin","npm_config_user_agent":"yarn/1.22.17 npm/? node/v14.18.2 darwin x64","npm_config_ignore_scripts":"","npm_config_version_git_sign":"","INFOPATH":"/opt/homebrew/share/info:","HOMEBREW_CELLAR":"/opt/homebrew/Cellar","npm_config__bryntum_registry":"https://npm.bryntum.com","npm_config_ignore_optional":"","npm_config_init_version":"1.0.0","npm_package_dependencies_electron_updater":"^5.0.1","npm_package_devDependencies_css_loader":"^6.7.1","npm_package_scripts_se":"electron .","npm_config_version_tag_prefix":"v","npm_package_devDependencies__testing_library_jest_dom":"^5.12.0","npm_package_devDependencies_eslint_plugin_react":"^7.23.2","npm_node_execpath":"/Users/jimmy/.nvm/versions/node/v14.18.2/bin/node"}.loaMode);
// 중복 실행 금지
var shouldQuit = electron__WEBPACK_IMPORTED_MODULE_0__.app.requestSingleInstanceLock();
if (!shouldQuit) {
    electron__WEBPACK_IMPORTED_MODULE_0__.app.quit();
}
function main() {
    var mainWindow = new electron__WEBPACK_IMPORTED_MODULE_0__.BrowserWindow({
        width: 800,
        height: 600,
    });
    mainWindow.loadURL('http://localhost:9000/');
}
electron__WEBPACK_IMPORTED_MODULE_0__.app.whenReady().then(function () {
    main();
});


/***/ }),

/***/ "electron":
/*!***************************!*\
  !*** external "electron" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("electron");

/***/ }),

/***/ "events":
/*!*************************!*\
  !*** external "events" ***!
  \*************************/
/***/ ((module) => {

module.exports = require("events");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("fs");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("http");

/***/ }),

/***/ "https":
/*!************************!*\
  !*** external "https" ***!
  \************************/
/***/ ((module) => {

module.exports = require("https");

/***/ }),

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

module.exports = require("os");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("path");

/***/ }),

/***/ "querystring":
/*!******************************!*\
  !*** external "querystring" ***!
  \******************************/
/***/ ((module) => {

module.exports = require("querystring");

/***/ }),

/***/ "url":
/*!**********************!*\
  !*** external "url" ***!
  \**********************/
/***/ ((module) => {

module.exports = require("url");

/***/ }),

/***/ "util":
/*!***********************!*\
  !*** external "util" ***!
  \***********************/
/***/ ((module) => {

module.exports = require("util");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = __webpack_module_cache__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// module cache are used so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	var __webpack_exports__ = __webpack_require__(__webpack_require__.s = "./src/main/index.ts");
/******/ 	
/******/ })()
;
//# sourceMappingURL=main.js.map