/* eslint-disable no-console */

const ipc = require('electron').ipcRenderer;
const sliced = require('sliced');

function send(_event) {
  ipc.send.apply(ipc, arguments)
}

window['dreamId'] = {
  resolve(value) {
    send('response', value)
  },
  reject(err) {
    send('error', error(err))
  }
}

// Listen for error events
window.addEventListener(
    'error',
    err => {
      send('page', 'error', error(err))
    },
    true
)

// prevent 'unload' and 'beforeunload' from being bound
const defaultAddEventListener = window.addEventListener;
window.addEventListener = function(type) {
  if (type === 'unload' || type === 'beforeunload') {
    return
  }
  defaultAddEventListener.apply(window, arguments)
}

// prevent 'onunload' and 'onbeforeunload' from being set
Object.defineProperties(window, {
  onunload: {
    enumerable: true,
    writable: false,
    value: null
  },
  onbeforeunload: {
    enumerable: true,
    writable: false,
    value: null
  }
})

// listen for console.log
const defaultLog = console.log;
console.log = function(...args) {
  send('console', 'log', sliced(args))
  return defaultLog.apply(this, args);
}

// listen for console.warn
const defaultWarn = console.warn;
console.warn = function(...args) {
  send('console', 'warn', sliced(args))
  return defaultWarn.apply(this, args);
}

// listen for console.error
const defaultError = console.error;
console.error = function(...args) {
  send('console', 'error', sliced(args))
  return defaultError.apply(this, args);
}

// overwrite the default alert
window.alert = message => {
  send('page', 'alert', message)
}

// overwrite the default prompt
window.prompt = (message, defaultResponse) => {
  send('page', 'prompt', message, defaultResponse)
}

// overwrite the default confirm
window.confirm = (message, defaultResponse) => {
  send('page', 'confirm', message, defaultResponse)
}

/**
 * Make errors serializeable
 */

function error(err) {
  if (!(err instanceof Error)) return err
  return {
    code: err.code,
    message: err.message,
    details: err.detail,
    stack: err.stack || ''
  }
}


Object.defineProperty(navigator, 'languages', {
  get: () => ['en-US', 'en']
});

const chrome = {
  "app": {
    "isInstalled": false,
    "InstallState": {
      "DISABLED": "disabled",
      "INSTALLED": "installed",
      "NOT_INSTALLED": "not_installed"
    },
    "RunningState": {
      "CANNOT_RUN": "cannot_run",
      "READY_TO_RUN": "ready_to_run",
      "RUNNING": "running"
    }
  },
  "runtime": {
    "OnInstalledReason": {
      "CHROME_UPDATE": "chrome_update",
      "INSTALL": "install",
      "SHARED_MODULE_UPDATE": "shared_module_update",
      "UPDATE": "update"
    },
    "OnRestartRequiredReason": {
      "APP_UPDATE": "app_update",
      "OS_UPDATE": "os_update",
      "PERIODIC": "periodic"
    },
    "PlatformArch": {
      "ARM": "arm",
      "MIPS": "mips",
      "MIPS64": "mips64",
      "X86_32": "x86-32",
      "X86_64": "x86-64"
    },
    "PlatformNaclArch": {
      "ARM": "arm",
      "MIPS": "mips",
      "MIPS64": "mips64",
      "X86_32": "x86-32",
      "X86_64": "x86-64"
    },
    "PlatformOs": {
      "ANDROID": "android",
      "CROS": "cros",
      "LINUX": "linux",
      "MAC": "mac",
      "OPENBSD": "openbsd",
      "WIN": "win"
    },
    "RequestUpdateCheckStatus": {
      "NO_UPDATE": "no_update",
      "THROTTLED": "throttled",
      "UPDATE_AVAILABLE": "update_available"
    }
  }
}

Object.defineProperty(window, 'chrome', {
  get: () => chrome
})

window.chrome = chrome;

const originalQuery = window.navigator.permissions.query;
window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters)
);

['height', 'width'].forEach(property => {
  // store the existing descriptor
  const imageDescriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, property);

  // redefine the property with a patched descriptor
  Object.defineProperty(HTMLImageElement.prototype, property, {
    ...imageDescriptor,
    get: function() {
      // return an arbitrary non-zero dimension if the image failed to load
      if (this.complete && this.naturalHeight == 0) {
        return 20;
      }
      // otherwise, return the actual dimension
      return imageDescriptor.get.apply(this);
    },
  });
});

function mockPluginsAndMimeTypes() {
  /* global MimeType MimeTypeArray PluginArray */

  // Disguise custom functions as being native
  const makeFnsNative = (fns = []) => {
    const oldCall = Function.prototype.call
    function call() {
      return oldCall.apply(this, arguments)
    }
    // eslint-disable-next-line
    Function.prototype.call = call

    const nativeToStringFunctionString = Error.toString().replace(
        /Error/g,
        'toString'
    )
    const oldToString = Function.prototype.toString

    function functionToString() {
      for (const fn of fns) {
        if (this === fn.ref) {
          return `function ${fn.name}() { [native code] }`
        }
      }

      if (this === functionToString) {
        return nativeToStringFunctionString
      }
      return oldCall.call(oldToString, this)
    }
    // eslint-disable-next-line
    Function.prototype.toString = functionToString
  }

  const mockedFns = []

  const fakeData = {
    mimeTypes: [
      {
        type: 'application/pdf',
        suffixes: 'pdf',
        description: '',
        __pluginName: 'Chrome PDF Viewer'
      },
      {
        type: 'application/x-google-chrome-pdf',
        suffixes: 'pdf',
        description: 'Portable Document Format',
        __pluginName: 'Chrome PDF Plugin'
      },
      {
        type: 'application/x-nacl',
        suffixes: '',
        description: 'Native Client Executable',
        enabledPlugin: Plugin,
        __pluginName: 'Native Client'
      },
      {
        type: 'application/x-pnacl',
        suffixes: '',
        description: 'Portable Native Client Executable',
        __pluginName: 'Native Client'
      }
    ],
    plugins: [
      {
        name: 'Chrome PDF Plugin',
        filename: 'internal-pdf-viewer',
        description: 'Portable Document Format'
      },
      {
        name: 'Chrome PDF Viewer',
        filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
        description: ''
      },
      {
        name: 'Native Client',
        filename: 'internal-nacl-plugin',
        description: ''
      }
    ],
    fns: {
      namedItem: instanceName => {
        // Returns the Plugin/MimeType with the specified name.
        const fn = function(name) {
          if (!arguments.length) {
            throw new TypeError(
                `Failed to execute 'namedItem' on '${instanceName}': 1 argument required, but only 0 present.`
            )
          }
          return this[name] || null
        }
        mockedFns.push({ ref: fn, name: 'namedItem' })
        return fn
      },
      item: instanceName => {
        // Returns the Plugin/MimeType at the specified index into the array.
        const fn = function(index) {
          if (!arguments.length) {
            throw new TypeError(
                `Failed to execute 'namedItem' on '${instanceName}': 1 argument required, but only 0 present.`
            )
          }
          return this[index] || null
        }
        mockedFns.push({ ref: fn, name: 'item' })
        return fn
      },
      refresh: instanceName => {
        // Refreshes all plugins on the current page, optionally reloading documents.
        const fn = function() {
          return undefined
        }
        mockedFns.push({ ref: fn, name: 'refresh' })
        return fn
      }
    }
  }
  // Poor mans _.pluck
  const getSubset = (keys, obj) =>
      keys.reduce((a, c) => ({ ...a, [c]: obj[c] }), {})

  function generateMimeTypeArray() {
    const arr = fakeData.mimeTypes
        .map(obj => getSubset(['type', 'suffixes', 'description'], obj))
        .map(obj => Object.setPrototypeOf(obj, MimeType.prototype))
    arr.forEach(obj => {
      arr[obj.type] = obj
    })

    // Mock functions
    arr.namedItem = fakeData.fns.namedItem('MimeTypeArray')
    arr.item = fakeData.fns.item('MimeTypeArray')

    return Object.setPrototypeOf(arr, MimeTypeArray.prototype)
  }

  const mimeTypeArray = generateMimeTypeArray()
  Object.defineProperty(navigator, 'mimeTypes', {
    get: () => mimeTypeArray
  })

  function generatePluginArray() {
    const arr = fakeData.plugins
        .map(obj => getSubset(['name', 'filename', 'description'], obj))
        .map(obj => {
          const mimes = fakeData.mimeTypes.filter(
              m => m.__pluginName === obj.name
          )
          // Add mimetypes
          mimes.forEach((mime, index) => {
            navigator.mimeTypes[mime.type].enabledPlugin = obj
            obj[mime.type] = navigator.mimeTypes[mime.type]
            obj[index] = navigator.mimeTypes[mime.type]
          })
          obj.length = mimes.length
          return obj
        })
        .map(obj => {
          // Mock functions
          obj.namedItem = fakeData.fns.namedItem('Plugin')
          obj.item = fakeData.fns.item('Plugin')
          return obj
        })
        .map(obj => Object.setPrototypeOf(obj, Plugin.prototype))
    arr.forEach(obj => {
      arr[obj.name] = obj
    })

    // Mock functions
    arr.namedItem = fakeData.fns.namedItem('PluginArray')
    arr.item = fakeData.fns.item('PluginArray')
    arr.refresh = fakeData.fns.refresh('PluginArray')

    return Object.setPrototypeOf(arr, PluginArray.prototype)
  }

  const pluginArray = generatePluginArray()
  Object.defineProperty(navigator, 'plugins', {
    get: () => pluginArray
  })

  // Make mockedFns toString() representation resemble a native function
  makeFnsNative(mockedFns)
}
try {
  const isPluginArray = navigator.plugins instanceof PluginArray
  const hasPlugins = isPluginArray && navigator.plugins.length > 0
  if (isPluginArray && hasPlugins) {
    return // nothing to do here
  }
  mockPluginsAndMimeTypes()
} catch (err) {}

try {
  // Adds a contentWindow proxy to the provided iframe element
  const addContentWindowProxy = iframe => {
    const contentWindowProxy = {
      get(target, key) {
        // Now to the interesting part:
        // We actually make this thing behave like a regular iframe window,
        // by intercepting calls to e.g. `.self` and redirect it to the correct thing. :)
        // That makes it possible for these assertions to be correct:
        // iframe.contentWindow.self === window.top // must be false
        if (key === 'self') {
          return this
        }
        // iframe.contentWindow.frameElement === iframe // must be true
        if (key === 'frameElement') {
          return iframe
        }
        return Reflect.get(target, key)
      }
    }

    if (!iframe.contentWindow) {
      const proxy = new Proxy(window, contentWindowProxy)
      Object.defineProperty(iframe, 'contentWindow', {
        get() {
          return proxy
        },
        set(newValue) {
          return newValue // contentWindow is immutable
        },
        enumerable: true,
        configurable: false
      })
    }
  }

  // Handles iframe element creation, augments `srcdoc` property so we can intercept further
  const handleIframeCreation = (target, thisArg, args) => {
    const iframe = target.apply(thisArg, args)

    // We need to keep the originals around
    const _iframe = iframe
    const _srcdoc = _iframe.srcdoc

    // Add hook for the srcdoc property
    // We need to be very surgical here to not break other iframes by accident
    Object.defineProperty(iframe, 'srcdoc', {
      configurable: true, // Important, so we can reset this later
      get: function() {
        return _iframe.srcdoc
      },
      set: function(newValue) {
        addContentWindowProxy(this)
        // Reset property, the hook is only needed once
        Object.defineProperty(iframe, 'srcdoc', {
          configurable: false,
          writable: false,
          value: _srcdoc
        })
        _iframe.srcdoc = newValue
      }
    })
    return iframe
  }

  // Adds a hook to intercept iframe creation events
  const addIframeCreationSniffer = () => {
    /* global document */
    const createElement = {
      // Make toString() native
      get(target, key) {
        return Reflect.get(target, key)
      },
      apply: function(target, thisArg, args) {
        const isIframe =
            args && args.length && `${args[0]}`.toLowerCase() === 'iframe'
        if (!isIframe) {
          // Everything as usual
          return target.apply(thisArg, args)
        } else {
          return handleIframeCreation(target, thisArg, args)
        }
      }
    }
    // All this just due to iframes with srcdoc bug
    document.createElement = new Proxy(
        document.createElement,
        createElement
    )
  }

  // Let's go
  addIframeCreationSniffer()
} catch (err) {
  // console.warn(err)
}
