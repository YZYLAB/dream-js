/**
 * Module Dependencies
 */

import minstache from 'minstache'

/**
 * Run the `src` function on the client-side, capture
 * the response and logs, and send back via
 * ipc to electron's main process
 */

export const execute = (identifier, data) => {
    return minstache.compile(`
(function javascript () {
  const dream = window['${identifier}'] || window['']['${identifier}'];
  try {
    const fn = ${data.src};
    let response = null;
    let args = [${data.args.toString()}];

    if(args.length > 0) {
      args.push(((err, v) => {
          if(err) return dream.reject(err);
          dream.resolve(v);
        }));
      fn.apply(null, args);
    } 
    else {
      response = fn.apply(null, args);
      if(response && response.then) {
        response.then((v) => {
          dream.resolve(v);
        })
        .catch((err) => {
          dream.reject(err)
        });
      } else {
        dream.resolve(response);
      }
    }
  } catch (err) {
    dream.reject(err);
  }
})()
`)()
}

/**
 * Inject the `src` on the client-side, capture
 * the response and logs, and send back via
 * ipc to electron's main process
 */

export const inject = (identifier, data) => {
    return minstache.compile(`
    (function javascript () {
        var dream = window['${identifier}'] || window['']['${identifier}'];
        try {
            var response = (function () { 
                ${data.src}
            })()
            dream.resolve(response);
        } catch (e) {
            dream.reject(e);
        }
    })()
    `)()
}
