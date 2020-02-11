/**
 * Module Dependencies
 */

import ipc from './ipc'
const parent = ipc(process)
const electron = require('electron');
const app = require('electron').app;
const ipcMain = electron.ipcMain;
const renderer = ipcMain;
const BrowserWindow = electron.BrowserWindow
import defaults from 'deep-defaults';
import {join} from 'path';
import sliced from 'sliced';
import urlFormat from 'url';
import FrameManager from './frame-manager';

// URL protocols that don't need to be checked for validity
const KNOWN_PROTOCOLS = ['http', 'https', 'file', 'about', 'javascript']
// Property for tracking whether a window is ready for interaction
const IS_READY = Symbol('isReady')

/**
 * Handle uncaught exceptions in the main electron process
 */

process.on('uncaughtException', err => {
  parent.emit('uncaughtException', err.stack || err.message || String(err))
})

app.allowRendererProcessReuse = true

/**
 * Update the app paths
 */

if (process.argv.length < 3) {
  throw new Error(`Too few runner arguments: ${JSON.stringify(process.argv)}`)
}

const processArgs = JSON.parse(process.argv[2]);
const paths = processArgs.paths;
if (paths) {
  for (let i in paths) {
    app.setPath(i, paths[i])
  }
}
const switches = processArgs.switches;
if (switches) {
  for (let i in switches) {
    app.commandLine.appendSwitch(i, switches[i])
  }
}

/**
 * Hide the dock
 */

// app.dock is not defined when running
// electron in a platform other than OS X
if (!processArgs.dock && app.dock) {
  app.dock.hide()
}

/**
 * Set the client certificate by subjectName if processArgs.certificateSubjectName is defined
 */

if (processArgs.certificateSubjectName) {
  app.on(
      'select-client-certificate',
      (event, webContents, url, list, callback) => {
        for (let i = 0; i < list.length; i++) {
          if (list[i].subjectName === processArgs.certificateSubjectName) {
            callback(list[i])
            return
          }
        }

        // defaults to first if the subject name is not available
        callback(list[0])
      }
  )
}

/**
 * Listen for the app being "ready"
 */

app.on('ready', () => {
  let win;
  let frameManager;
  let options;
  let closed;

  /**
   * create a browser window
   */

  parent.respondTo('browser-initialize', (opts, done) => {
    options = defaults(opts || {}, {
      show: false,
      alwaysOnTop: true,
      webPreferences: {
        preload: join(__dirname, 'preload.js'),
        nodeIntegration: false
      }
    })

    /**
     * Create a new Browser Window
     */

    win = new BrowserWindow(options)
    if (options.show && options.openDevTools) {
      if (typeof options.openDevTools === 'object') {
        win.openDevTools(options.openDevTools)
      } else {
        win.openDevTools()
      }
    }

    /**
     * Window Docs:
     * https://github.com/atom/electron/blob/master/docs/api/browser-window.md
     */

    frameManager = new FrameManager(win)

    /**
     * Window options
     */

    win.webContents.audioMuted = true

    /**
     * Sets user agent.
     */

    if (options.userAgent) {
      win.webContents.userAgent = options.userAgent
    }

    /**
     * Pass along web content events
     */

    renderer.on('page', function(_sender /*, arguments, ... */) {
      parent.emit.apply(parent, ['page'].concat(sliced(arguments, 1)))
    })

    renderer.on('console', (sender, type, args) => {
      parent.emit.apply(parent, ['console', type].concat(args))
    })

    win.webContents.on('did-finish-load', forward('did-finish-load'))
    win.webContents.on('did-fail-load', forward('did-fail-load'))
    win.webContents.on(
        'did-fail-provisional-load',
        forward('did-fail-provisional-load')
    )
    win.webContents.on(
        'did-frame-finish-load',
        forward('did-frame-finish-load')
    )
    win.webContents.on('did-start-loading', forward('did-start-loading'))
    win.webContents.on('did-stop-loading', forward('did-stop-loading'))
    win.webContents.on(
        'did-get-response-details',
        forward('did-get-response-details')
    )
    win.webContents.on(
        'did-get-redirect-request',
        forward('did-get-redirect-request')
    )
    win.webContents.on('dom-ready', forward('dom-ready'))
    win.webContents.on('page-favicon-updated', forward('page-favicon-updated'))
    win.webContents.on('new-window', forward('new-window'))
    win.webContents.on('will-navigate', forward('will-navigate'))
    win.webContents.on('crashed', forward('crashed'))
    win.webContents.on('plugin-crashed', forward('plugin-crashed'))
    win.webContents.on('destroyed', forward('destroyed'))
    win.webContents.on(
        'media-started-playing',
        forward('media-started-playing')
    )
    win.webContents.on('media-paused', forward('media-paused'))
    win.webContents.on('close', _e => {
      closed = true
    })

    let loadwatch;
    win.webContents.on('did-start-loading', () => {
      if (win.webContents.isLoadingMainFrame()) {
        if (options.loadTimeout) {
          loadwatch = setTimeout(() => {
            win.webContents.stop()
          }, options.loadTimeout)
        }
        setIsReady(false)
      }
    })

    win.webContents.on('did-stop-loading', () => {
      clearTimeout(loadwatch)
      setIsReady(true)
    })

    setIsReady(true)

    new done()
  })

  /**
   * Parent actions
   */

  /**
   * goto
   */

  parent.respondTo('goto', (url, headers, timeout, done) => {
    if (!url || typeof url !== 'string') {
      return new done(new Error('goto: `url` must be a non-empty string'))
    }

    let httpReferrer = '';
    let extraHeaders = '';
    for (const key in headers) {
      if (key.toLowerCase() == 'referer') {
        httpReferrer = headers[key]
        continue
      }

      extraHeaders += `${key}: ${headers[key]}\n`
    }
    const loadUrlOptions = { extraHeaders };
    httpReferrer && (loadUrlOptions.httpReferrer = httpReferrer)

    if (win.webContents.getURL() == url) {
      new done()
    } else {
      let responseData = {};
      let domLoaded = false;

      const timer = setTimeout(() => {
        // If the DOM loaded before timing out, consider the load successful.
        const error = domLoaded
            ? undefined
            : {
              message: 'navigation error',
              code: -7, // chromium's generic networking timeout code
              details: `Navigation timed out after ${timeout} ms`,
              url
            };
        // Even if "successful," note that some things didn't finish.
        responseData.details = `Not all resources loaded after ${timeout} ms`
        cleanup(error, responseData)
      }, timeout);

      function handleFailure(event, code, detail, failedUrl, isMainFrame) {
        if (isMainFrame) {
          cleanup({
            message: 'navigation error',
            code,
            details: detail,
            url: failedUrl || url
          })
        }
      }

      function handleDetails(
          event,
          status,
          newUrl,
          oldUrl,
          statusCode,
          method,
          referrer,
          headers,
          resourceType
      ) {
        if (resourceType === 'mainFrame') {
          responseData = {
            url: newUrl,
            code: statusCode,
            method,
            referrer,
            headers
          }
        }
      }

      function handleDomReady() {
        domLoaded = true
      }

      // We will have already unsubscribed if load failed, so assume success.
      function handleFinish(_event) {
        cleanup(null, responseData)
      }

      function cleanup(err, data) {
        clearTimeout(timer)
        win.webContents.removeListener('did-fail-load', handleFailure)
        win.webContents.removeListener(
            'did-fail-provisional-load',
            handleFailure
        )
        win.webContents.removeListener(
            'did-get-response-details',
            handleDetails
        )
        win.webContents.removeListener('dom-ready', handleDomReady)
        win.webContents.removeListener('did-finish-load', handleFinish)
        setIsReady(true)
        // wait a tick before notifying to resolve race conditions for events
        setImmediate(() => new done(err, data))
      }

      // In most environments, loadURL handles this logic for us, but in some
      // it just hangs for unhandled protocols. Mitigate by checking ourselves.
      function canLoadProtocol(protocol, callback) {
        protocol = (protocol || '').replace(/:$/, '')
        if (!protocol || KNOWN_PROTOCOLS.includes(protocol)) {
          return callback(true)
        }
        electron.protocol.isProtocolHandled(protocol, callback)
      }

      function startLoading() {
        // abort any pending loads first
        if (win.webContents.isLoading()) {
          parent.emit('log', 'aborting pending page load')
          win.webContents.once('did-stop-loading', () => {
            startLoading(true)
          })
          return win.webContents.stop()
        }

        win.webContents.on('did-fail-load', handleFailure)
        win.webContents.on('did-fail-provisional-load', handleFailure)
        win.webContents.on('did-get-response-details', handleDetails)
        win.webContents.on('dom-ready', handleDomReady)
        win.webContents.on('did-finish-load', handleFinish)
        win.webContents.loadURL(url, loadUrlOptions)

        // javascript: URLs *may* trigger page loads; wait a bit to see
        if (protocol === 'javascript:') {
          setTimeout(() => {
            if (!win.webContents.isLoadingMainFrame()) {
              new done(null, {
                url,
                code: 200,
                method: 'GET',
                referrer: win.webContents.getURL(),
                headers: {}
              })
            }
          }, 10)
        }
      }

      var protocol = urlFormat.parse(url).protocol
      canLoadProtocol(protocol, function startLoad(canLoad) {
        if (canLoad) {
          parent.emit(
              'log',
              `Navigating: "${url}",
            headers: ${extraHeaders || '[none]'},
            timeout: ${timeout}`
          )
          return startLoading()
        }

        cleanup({
          message: 'navigation error',
          code: -1000,
          details: 'unhandled protocol',
          url
        })
      })
    }
  })

  /**
   * javascript
   */

  parent.respondTo('javascript', (src, done) => {
    const onresponse = (event, response) => {
      renderer.removeListener('error', onerror)
      renderer.removeListener('log', onlog)
      new done(null, response)
    };

    var onerror = (event, err) => {
      renderer.removeListener('log', onlog)
      renderer.removeListener('response', onresponse)
      new done(err)
    }

    var onlog = (event, args) => parent.emit.apply(parent, ['log'].concat(args))

    renderer.once('response', onresponse)
    renderer.once('error', onerror)
    renderer.on('log', onlog)

    //parent.emit('log', 'about to execute javascript: ' + src);
    win.webContents.executeJavaScript(src)
  })

  /**
   * css
   */

  parent.respondTo('css', (css, done) => {
    win.webContents.insertCSS(css)
    new done()
  })

  /**
   * size
   */

  parent.respondTo('size', (width, height, done) => {
    win.setSize(width, height)
    new done()
  })

  parent.respondTo('useragent', (useragent, done) => {
    win.webContents.setUserAgent(useragent)
    new done()
  })

  /**
   * type
   */

  parent.respondTo('type', (value, done) => {
    const chars = String(value).split('');

    function type() {
      const ch = chars.shift();
      if (ch === undefined) {
        return new done()
      }

      // keydown
      win.webContents.sendInputEvent({
        type: 'keyDown',
        keyCode: ch
      })

      // keypress
      win.webContents.sendInputEvent({
        type: 'char',
        keyCode: ch
      })

      // keyup
      win.webContents.sendInputEvent({
        type: 'keyUp',
        keyCode: ch
      })

      // defer function into next event loop
      setTimeout(type, options.typeInterval)
    }

    // start
    type()
  })

  /**
   * Insert
   */

  parent.respondTo('insert', (value, done) => {
    win.webContents.insertText(String(value))
    new done()
  })

  /**
   * screenshot
   */

  parent.respondTo('screenshot', (path, clip, done) => {
    // https://gist.github.com/twolfson/0d374d9d7f26eefe7d38
    const args = [
      function handleCapture(img) {
        new done(null, img.toPNG())
      }
    ];
    if (clip) args.unshift(clip)
    frameManager.requestFrame(() => {
      win.capturePage.apply(win, args)
    })
  })

  /**
   * html
   */

  parent.respondTo('html', (path, saveType = 'HTMLComplete', done) => {
    win.webContents.savePage(path, saveType, err => {
      new done(err)
    })
  })

  /**
   * pdf
   */

  parent.respondTo('pdf', (path, options, done) => {
    options = defaults(options || {}, {
      marginType: 0,
      printBackground: true,
      printSelectionOnly: false,
      landscape: false
    })

    win.webContents.printToPDF(options, (err, data) => {
      if (err) return new done(err)
      new done(null, data)
    })
  })

  /**
   * Get cookies
   */

  parent.respondTo('cookie.get', (query, done) => {
    const details = Object.assign(
        {
          url: win.webContents.getURL()
        },
        query
    );

    parent.emit('log', `getting cookie: ${JSON.stringify(details)}`)
    win.webContents.session.cookies.get(details, (err, cookies) => {
      if (err) return new done(err)
      new done(null, details.name ? cookies[0] : cookies)
    })
  })

  /**
   * Set cookies
   */

  parent.respondTo('cookie.set', (cookies, done) => {
    let pending = cookies.length;

    for (let i = 0, cookie; (cookie = cookies[i]); i++) {
      const details = Object.assign(
          {
            url: win.webContents.getURL()
          },
          cookie
      );

      parent.emit('log', `setting cookie: ${JSON.stringify(details)}`)
      win.webContents.session.cookies.set(details, err => {
        if (err) new done(err)
        else if (!--pending) new done()
      })
    }
  })

  /**
   * Clear cookie
   */

  parent.respondTo('cookie.clear', (cookies, done) => {
    const url = win.webContents.getURL();
    let getCookies = cb => cb(null, cookies);

    if (cookies.length == 0) {
      getCookies = cb =>
          win.webContents.session.cookies.get({ url }, (error, cookies) => {
            cb(error, cookies.map(({name}) => name))
          })
    }

    getCookies((error, cookies) => {
      let pending = cookies.length;
      //if no cookies, return
      if (pending == 0) {
        return new done()
      }
      parent.emit('log', 'listing params', cookies)

      //for each cookie name in cookies,
      for (let i = 0, cookie; (cookie = cookies[i]); i++) {
        //remove the cookie from the url
        win.webContents.session.cookies.remove(url, cookie, err => {
          if (err) new done(err)
          else if (!--pending) new done()
        })
      }
    })
  })

  /**
   * Clear all cookies
   */

  parent.respondTo('cookie.clearAll', done => {
    win.webContents.session.clearStorageData(
        {
          storages: ['cookies']
        },
        err => {
          if (err) return new done(err)
          return new done()
        }
    )
  })

  /**
   * Add custom functionality
   */

  parent.respondTo('action', (name, fntext, done) => {
    const fn = new Function(
        `with(this){ parent.emit("log", "adding action for ${name}"); return ${fntext}}`
    ).call({
      require,
      parent
    });
    fn(name, options, parent, win, renderer, err => {
      if (err) return new done(err)
      return new done()
    })
  })

  /**
   * Continue
   */

  parent.respondTo('continue', done => {
    if (isReady()) {
      new done()
    } else {
      parent.emit('log', 'waiting for window to load...')
      win.once('did-change-is-ready', () => {
        parent.emit('log', `window became ready: ${win.webContents.getURL()}`)
        new done()
      })
    }
  })

  /**
   * Authentication
   */

  let loginListener;
  parent.respondTo('authentication', (login, password, done) => {
    let currentUrl;
    let tries = 0;
    if (loginListener) {
      win.webContents.removeListener('login', loginListener)
    }

    loginListener = (webContents, {url}, authInfo, callback) => {
      tries++
      parent.emit('log', `authenticating against ${url}, try #${tries}`)
      if (currentUrl != url) {
        currentUrl = url
        tries = 1
      }

      if (tries >= options.maxAuthRetries) {
        parent.emit('die', 'problem authenticating, check your credentials')
      } else {
        callback(login, password)
      }
    }
    win.webContents.on('login', loginListener)

    new done()
  })

  /**
   * Kill the electron app
   */

  parent.respondTo('quit', done => {
    app.quit()
    new done()
  })

  /**
   * Send "ready" event to the parent process
   */

  parent.emit('ready', {
    electron: process.versions['electron'],
    chrome: process.versions['chrome']
  })

  /**
   * Check whether the window is ready for interaction
   */
  function isReady() {
    return win[IS_READY]
  }

  /**
   * Set whether the window is ready for interaction
   */
  function setIsReady(ready) {
    ready = !!ready
    if (ready !== win[IS_READY]) {
      win[IS_READY] = ready
      win.emit('did-change-is-ready', ready)
    }
  }

  /**
   * Forward events
   */

  function forward(name) {
    return function(_event) {
      // NOTE: the raw Electron event used to be forwarded here, but we now send
      // an empty event in its place -- the raw event is not JSON serializable.
      if (!closed) {
        parent.emit.apply(parent, [name, {}].concat(sliced(arguments, 1)))
      }
    }
  }
})
