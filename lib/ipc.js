/**
 * Module dependencies
 */

import {EventEmitter as Emitter} from 'events';
import sliced from 'sliced'
let debug = require('debug')('dream:ipc');

// If this process has a parent, redirect debug logs to it
if (process.send) {
  debug = function(...args) {
    process.send(['dream:ipc:debug'].concat(sliced(args)))
  }
}


/**
 * Initialize `IPC`
 */

const instance = Symbol();
export default function IPC(process) {
  if (process[instance]) {
    return process[instance]
  }

  const emitter = (process[instance] = new Emitter());
  const emit = emitter.emit;
  let callId = 0;
  const responders = {};

  // no parent
  if (!process.send) {
    return emitter
  }

  process.on('message', data => {
    // handle debug logging specially
    if (data[0] === 'dream:ipc:debug') {
      debug.apply(null, sliced(data, 1))
    }
    emit.apply(emitter, sliced(data))
  })

  emitter.emit = function(...args) {
    if (process.connected) {
      process.send(sliced(args))
    }
  }

  /**
   * Call a responder function in the associated process. (In the process,
   * responders can be registered with `ipc.respondTo()`.) The last argument
   * should be a callback function, which will called with the results of the
   * responder.
   * This returns an event emitter. You can listen for the results of the
   * responder using the `end` event (this is the same as passing a callback).
   * Additionally, you can listen for `data` events, which the responder may
   * send to indicate some sort of progress.
   * @param  {String} name Name of the responder function to call
   * @param  {...Objects} [arguments] Any number of arguments to send
   * @param  {Function} [callback] A callback function that handles the results
   * @return {Emitter}
   */
  emitter.call = function(name) {
    const args = sliced(arguments, 1);
    let callback = args.pop();
    if (typeof callback !== 'function') {
      args.push(callback)
      callback = undefined
    }

    const id = callId++;
    let progress = new Emitter();

    emitter.on(`CALL_DATA_${id}`, function() {
      progress.emit.apply(progress, ['data'].concat(sliced(arguments)))
    })

    emitter.once(`CALL_RESULT_${id}`, function(err) {
      // unserialize errors
      err = unserializeError(err)

      progress.emit.apply(
          progress,
          ['end'].concat(err).concat(sliced(arguments, 1))
      )

      emitter.removeAllListeners(`CALL_DATA_${id}`)
      progress.removeAllListeners()
      progress = undefined
      if (callback) {
        callback.apply(null, [err].concat(sliced(arguments, 1)))
      }
    })

    emitter.emit.apply(emitter, ['CALL', id, name].concat(args))
    return progress
  }

  /**
   * Register a responder to be called from other processes with `ipc.call()`.
   * The responder should be a function that accepts any number of arguments,
   * where the last argument is a callback function. When the responder has
   * finished its work, it MUST call the callback. The first argument should be
   * an error, if any, and the second should be the results.
   * Only one responder can be registered for a given name.
   * @param {String} name The name to register the responder under.
   * @param {Function} responder
   */
  emitter.respondTo = (name, responder) => {
    if (responders[name]) {
      debug(`Replacing responder named "${name}"`)
    }
    responders[name] = responder
  }

  emitter.on('CALL', function(id, name) {
    const responder = responders[name];

    class done {
      constructor(err) {
        err = serializeError(err)
        emitter.emit.apply(
            emitter,
            [`CALL_RESULT_${id}`].concat(err).concat(sliced(arguments, 1))
        )
      }

      static progress(...args) {
        emitter.emit.apply(emitter, [`CALL_DATA_${id}`].concat(sliced(args)))
      }
    }

    if (!responder) {
      return new done(new Error(`Nothing responds to "${name}"`))
    }
    try {
      responder.apply(null, sliced(arguments, 2).concat([done]))
    } catch (error) {
      new done(error)
    }
  })

  return emitter
}

function serializeError(err) {
  if (!(err instanceof Error)) return err
  return {
    code: err.code,
    message: err.message,
    details: err.detail,
    stack: err.stack || ''
  }
}

function unserializeError(err) {
  if (!err || !err.message) return err
  const e = new Error(err.message)
  e.code = err.code || -1
  if (err.stack) e.stack = err.stack
  if (err.details) e.details = err.details
  if (err.url) e.url = err.url
  return e
}
