/* eslint-disable no-console */

import {ipcRenderer as ipc} from 'electron';

import sliced from 'sliced';

function send(_event) {
  ipc.send.apply(ipc, arguments)
}

window.__dream = {
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
