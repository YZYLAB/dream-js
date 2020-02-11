/**
 * Module Dependencies
 */

import minstache from 'minstache';

/**
 * Run the `src` function on the client-side, capture
 * the response and logs, and send back via
 * ipc to electron's main process
 */

const ex = `
(function javascript () {
  var dream = window.__dream || window[''].dream;
  try {
    var fn = ({{!src}}), 
      response, 
      args = [];

    {{#args}}args.push({{!argument}});{{/args}}

    if(fn.length - 1 == args.length) {
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
`;

/**
 * Inject the `src` on the client-side, capture
 * the response and logs, and send back via
 * ipc to electron's main process
 */

const inj = `
(function javascript () {
  var dream = window.__dream || window[''].dream;
  try {
    var response = (function () { {{!src}} \n})()
    dream.resolve(response);
  } catch (e) {
    dream.reject(e);
  }
})()
`;

/**
 * Export the templates
 */

export const execute = minstache.compile(ex);

export const inject = minstache.compile(inj);
