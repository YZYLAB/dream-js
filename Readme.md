# Dream
DreamJS is a high-level browser automation library based on Nightmare from [Segment](https://segment.com). 

Why?
 - Harder to detect since it doesn't set the window.__nightmare value but instead changes the variable name on every run and it uses scripts from [[Puppeteer Extra Plugin Stealth ](https://github.com/berstend/puppeteer-extra/blob/master/packages/puppeteer-extra-plugin-stealth/)]
 - Code has been converted to ES6
 - Puppeteer is great but it's sometimes a bit slower than Electron (which is what Dream uses).
 - I have used this myself for a while and I thought why not release it.

![enter image description here](https://i.gyazo.com/086fcd2ebd679d82f78beef7484a70f6.png)

### To install dependencies

```
npm install
```

### Node versions

Dream is intended to be run on NodeJS 8.x or higher.

## API

#### Dream(options)

Creates a new instance that can navigate around the web. The available options are [documented here](https://github.com/atom/electron/blob/master/docs/api/browser-window.md#new-browserwindowoptions), along with the following dream-specific options.

##### waitTimeout (default: 30s)

Throws an exception if the `.wait()` didn't return `true` within the set timeframe.

```js
const dream = Dream({
  waitTimeout: 1000 // in ms
})
```

##### gotoTimeout (default: 30s)

Throws an exception if the `.goto()` didn't finish loading within the set timeframe. Note that, even though `goto` normally waits for all the resources on a page to load, a timeout exception is only raised if the DOM itself has not yet loaded.

```js
const dream = Dream({
  gotoTimeout: 1000 // in ms
})
```

##### loadTimeout (default: infinite)

Forces Dream to move on if a page transition caused by an action (eg, `.click()`) didn't finish within the set timeframe. If `loadTimeout` is shorter than `gotoTimeout`, the exceptions thrown by `gotoTimeout` will be suppressed.

```js
const dream = Dream({
  loadTimeout: 1000 // in ms
})
```

##### executionTimeout (default: 30s)

The maximum amount of time to wait for an `.evaluate()` statement to complete.

```js
const dream = Dream({
  executionTimeout: 1000 // in ms
})
```

##### paths

The default system paths that Electron knows about. Here's a list of available paths: https://github.com/atom/electron/blob/master/docs/api/app.md#appgetpathname

You can overwrite them in Dream by doing the following:

```js
const dream = Dream({
  paths: {
    userData: '/user/data'
  }
})
```

##### switches

The command line switches used by the Chrome browser that are also supported by Electron. Here's a list of supported Chrome command line switches:
https://github.com/atom/electron/blob/master/docs/api/chrome-command-line-switches.md

```js
const dream = Dream({
  switches: {
    'proxy-server': '1.2.3.4:5678',
    'ignore-certificate-errors': true
  }
})
```

##### electronPath

The path to the prebuilt Electron binary. This is useful for testing on different versions of Electron. Note that Dream only supports the version on which this package depends. Use this option at your own risk.

```js
const dream = Dream({
  electronPath: require('electron')
})
```

##### dock (OS X)

A boolean to optionally show the Electron icon in the dock (defaults to `false`). This is useful for testing purposes.

```js
const dream = Dream({
  dock: true
})
```

##### openDevTools

Optionally shows the DevTools in the Electron window using `true`, or use an object hash containing `mode: 'detach'` to show in a separate window. The hash gets passed to [`contents.openDevTools()`](https://github.com/electron/electron/blob/master/docs/api/web-contents.md#contentsopendevtoolsoptions) to be handled. This is also useful for testing purposes. Note that this option is honored only if `show` is set to `true`.

```js
const dream = Dream({
  openDevTools: {
    mode: 'detach'
  },
  show: true
})
```

##### typeInterval (default: 100ms)

How long to wait between keystrokes when using `.type()`.

```js
const dream = Dream({
  typeInterval: 20
})
```

##### pollInterval (default: 250ms)

How long to wait between checks for the `.wait()` condition to be successful.

```js
const dream = Dream({
  pollInterval: 50 //in ms
})
```

##### maxAuthRetries (default: 3)

Defines the number of times to retry an authentication when set up with `.authenticate()`.

```js
const dream = Dream({
  maxAuthRetries: 3
})
```

#### certificateSubjectName

A string to determine the client certificate selected by electron. If this options is set, the [`select-client-certificate`](https://github.com/electron/electron/blob/master/docs/api/app.md#event-select-client-certificate) event will be set to loop through the certificateList and find the first certificate that matches `subjectName` on the electron [`Certificate Object`](https://electronjs.org/docs/api/structures/certificate).

```js
const dream = Dream({
  certificateSubjectName: 'tester'
})
```

#### .engineVersions()

Gets the versions for Electron and Chromium.

#### .useragent(useragent)

Sets the `useragent` used by electron.

#### .authentication(user, password)

Sets the `user` and `password` for accessing a web page using basic authentication. Be sure to set it before calling `.goto(url)`.

#### .end()

Completes any queue operations, disconnect and close the electron process. Note that if you're using promises, `.then()` must be called after `.end()` to run the `.end()` task. Also note that if using an `.end()` callback, the `.end()` call is equivalent to calling `.end()` followed by `.then(fn)`. Consider:

```js
dream
  .goto(someUrl)
  .end(() => 'some value')
  //prints "some value"
  .then(console.log)
```

#### .halt(error, done)

Clears all queued operations, kills the electron process, and passes error message or 'Dream Halted' to an unresolved promise. Done will be called after the process has exited.

### Interact with the Page

#### .goto(url[, headers])

Loads the page at `url`. Optionally, a `headers` hash can be supplied to set headers on the `goto` request.

When a page load is successful, `goto` returns an object with metadata about the page load, including:

* `url`: The URL that was loaded
* `code`: The HTTP status code (e.g. 200, 404, 500)
* `method`: The HTTP method used (e.g. "GET", "POST")
* `referrer`: The page that the window was displaying prior to this load or an empty string if this is the first page load.
* `headers`: An object representing the response headers for the request as in `{header1-name: header1-value, header2-name: header2-value}`

If the page load fails, the error will be an object with the following properties:

* `message`: A string describing the type of error
* `code`: The underlying error code describing what went wrong. Note this is NOT the HTTP status code. For possible values, see https://code.google.com/p/chromium/codesearch#chromium/src/net/base/net_error_list.h
* `details`: A string with additional details about the error. This may be null or an empty string.
* `url`: The URL that failed to load

Note that any valid response from a server is considered “successful.” That means things like 404 “not found” errors are successful results for `goto`. Only things that would cause no page to appear in the browser window, such as no server responding at the given address, the server hanging up in the middle of a response, or invalid URLs, are errors.

You can also adjust how long `goto` will wait before timing out by setting the [`gotoTimeout` option](#gototimeout-default-30s) on the Dream constructor.

#### .back()

Goes back to the previous page.

#### .forward()

Goes forward to the next page.

#### .refresh()

Refreshes the current page.

#### .click(selector)

Clicks the `selector` element once.

#### .mousedown(selector)

Mousedowns the `selector` element once.

#### .mouseup(selector)

Mouseups the `selector` element once.

#### .mouseover(selector)

Mouseovers the `selector` element once.

#### .mouseout(selector)

Mouseout the `selector` element once.

#### .type(selector[, text])

Enters the `text` provided into the `selector` element. Empty or falsey values provided for `text` will clear the selector's value.

`.type()` mimics a user typing in a textbox and will emit the proper keyboard events.

Key presses can also be fired using Unicode values with `.type()`. For example, if you wanted to fire an enter key press, you would write `.type('body', '\u000d')`.

> If you don't need the keyboard events, consider using `.insert()` instead as it will be faster and more robust.

#### .insert(selector[, text])

Similar to `.type()`, `.insert()` enters the `text` provided into the `selector` element. Empty or falsey values provided for `text` will clear the selector's value.

`.insert()` is faster than `.type()` but does not trigger the keyboard events.

#### .check(selector)

Checks the `selector` checkbox element.

#### .uncheck(selector)

Unchecks the `selector` checkbox element.

#### .select(selector, option)

Changes the `selector` dropdown element to the option with attribute [value=`option`]

#### .scrollTo(top, left)

Scrolls the page to desired position. `top` and `left` are always relative to the top left corner of the document.

#### .viewport(width, height)

Sets the viewport size.

#### .inject(type, file)

Injects a local `file` onto the current page. The file `type` must be either `js` or `css`.

#### .evaluate(fn[, arg1, arg2,...])

Invokes `fn` on the page with `arg1, arg2,...`. All the `args` are optional. On completion it returns the return value of `fn`. Useful for extracting information from the page. Here's an example:

```js
const selector = 'h1'
dream
  .evaluate(selector => {
    // now we're executing inside the browser scope.
    return document.querySelector(selector).innerText
  }, selector) // <-- that's how you pass parameters from Node scope to browser scope
  .then(text => {
    // ...
  })
```

Error-first callbacks are supported as a part of `evaluate()`. If the arguments passed are one fewer than the arguments expected for the evaluated function, the evaluation will be passed a callback as the last parameter to the function. For example:

```js
const selector = 'h1'
dream
  .evaluate((selector, done) => {
    // now we're executing inside the browser scope.
    setTimeout(
      () => done(null, document.querySelector(selector).innerText),
      2000
    )
  }, selector)
  .then(text => {
    // ...
  })
```

Note that callbacks support only one value argument (eg `function(err, value)`). Ultimately, the callback will get wrapped in a native Promise and only be able to resolve a single value.

Promises are also supported as a part of `evaluate()`. If the return value of the function has a `then` member, `.evaluate()` assumes it is waiting for a promise. For example:

```js
const selector = 'h1';
dream
  .evaluate((selector) => (
    new Promise((resolve, reject) => {
      setTimeout(() => resolve(document.querySelector(selector).innerText), 2000);
    )}, selector)
  )
  .then((text) => {
    // ...
  })
```

#### .wait(ms)

Waits for `ms` milliseconds e.g. `.wait(5000)`.

#### .wait(selector)

Waits until the element `selector` is present e.g. `.wait('#pay-button')`.

#### .wait(fn[, arg1, arg2,...])

Waits until the `fn` evaluated on the page with `arg1, arg2,...` returns `true`. All the `args` are optional. See `.evaluate()` for usage.

#### .header(header, value)

Adds a header override for all HTTP requests. If `header` is undefined, the header overrides will be reset.

### Extract from the Page

#### .exists(selector)

Returns whether the selector exists or not on the page.

#### .visible(selector)

Returns whether the selector is visible or not.

#### .on(event, callback)

Captures page events with the callback. You have to call `.on()` before calling `.goto()`. Supported events are [documented here](http://electron.atom.io/docs/api/web-contents/#class-webcontents).

##### Additional "page" events

###### .on('page', function(type="error", message, stack))

This event is triggered if any javascript exception is thrown on the page. But this event is not triggered if the injected javascript code (e.g. via `.evaluate()`) is throwing an exception.

##### "page" events

Listens for `window.addEventListener('error')`, `alert(...)`, `prompt(...)` & `confirm(...)`.

###### .on('page', function(type="error", message, stack))

Listens for top-level page errors. This will get triggered when an error is thrown on the page.

###### .on('page', function(type="alert", message))

Dream disables `window.alert` from popping up by default, but you can still listen for the contents of the alert dialog.

###### .on('page', function(type="prompt", message, response))

Dream disables `window.prompt` from popping up by default, but you can still listen for the message to come up. If you need to handle the confirmation differently, you'll need to use your own preload script.

###### .on('page', function(type="confirm", message, response))

Dream disables `window.confirm` from popping up by default, but you can still listen for the message to come up. If you need to handle the confirmation differently, you'll need to use your own preload script.

###### .on('console', function(type [, arguments, ...]))

`type` will be either `log`, `warn` or `error` and `arguments` are what gets passed from the console. This event is not triggered if the injected javascript code (e.g. via `.evaluate()`) is using `console.log`.

#### .once(event, callback)

Similar to `.on()`, but captures page events with the callback one time.

#### .removeListener(event, callback)

Removes a given listener callback for an event.

#### .screenshot([path][, clip])

Takes a screenshot of the current page. Useful for debugging. The output is always a `png`. Both arguments are optional. If `path` is provided, it saves the image to the disk. Otherwise it returns a `Buffer` of the image data. If `clip` is provided (as [documented here](https://github.com/atom/electron/blob/master/docs/api/browser-window.md#wincapturepagerect-callback)), the image will be clipped to the rectangle.

#### .html(path, saveType)

Saves the current page as html as files to disk at the given path. Save type options are [here](https://github.com/atom/electron/blob/master/docs/api/web-contents.md#webcontentssavepagefullpath-savetype-callback).

#### .pdf(path, options)

Saves a PDF to the specified `path`. Options are [here](https://github.com/electron/electron/blob/v1.4.4/docs/api/web-contents.md#contentsprinttopdfoptions-callback).

#### .title()

Returns the title of the current page.

#### .url()

Returns the url of the current page.

#### .path()

Returns the path name of the current page.

### Cookies

#### .cookies.get(name)

Gets a cookie by it's `name`. The url will be the current url.

#### .cookies.get(query)

Queries multiple cookies with the `query` object. If a `query.name` is set, it will return the first cookie it finds with that name, otherwise it will query for an array of cookies. If no `query.url` is set, it will use the current url. Here's an example:

```js
// get all google cookies that are secure
// and have the path `/query`
dream
  .goto('http://google.com')
  .cookies.get({
    path: '/query',
    secure: true
  })
  .then(cookies => {
    // do something with the cookies
  })
```

Available properties are documented here: https://github.com/atom/electron/blob/master/docs/api/session.md#sescookiesgetdetails-callback

#### .cookies.get()

Gets all the cookies for the current url. If you'd like get all cookies for all urls, use: `.get({ url: null })`.

#### .cookies.set(name, value)

Sets a cookie's `name` and `value`. This is the most basic form, and the url will be the current url.

#### .cookies.set(cookie)

Sets a `cookie`. If `cookie.url` is not set, it will set the cookie on the current url. Here's an example:

```js
dream
  .goto('http://google.com')
  .cookies.set({
    name: 'token',
    value: 'some token',
    path: '/query',
    secure: true
  })
  // ... other actions ...
  .then(() => {
    // ...
  })
```

Available properties are documented here: https://github.com/atom/electron/blob/master/docs/api/session.md#sescookiessetdetails-callback

#### .cookies.set(cookies)

Sets multiple cookies at once. `cookies` is an array of `cookie` objects. Take a look at the `.cookies.set(cookie)` documentation above for a better idea of what `cookie` should look like.

#### .cookies.clear([name])

Clears a cookie for the current domain. If `name` is not specified, all cookies for the current domain will be cleared.

```js
dream
  .goto('http://google.com')
  .cookies.clear('SomeCookieName')
  // ... other actions ...
  .then(() => {
    // ...
  })
```

#### .cookies.clearAll()

Clears all cookies for all domains.

```js
dream
  .goto('http://google.com')
  .cookies.clearAll()
  // ... other actions ...
  .then(() => {
    //...
  })
```

### Proxies

Proxies are supported in Dream through [switches](#switches).

If your proxy requires authentication you also need the [authentication](#authenticationuser-password) call.

The following example not only demonstrates how to use proxies, but you can run it to test if your proxy connection is working:

```js
import Dream from 'dream';

const proxyDream = Dream({
  switches: {
    'proxy-server': 'my_proxy_server.example.com:8080' // set the proxy server here ...
  },
  show: true
});

proxyDream
  .authentication('proxyUsername', 'proxyPassword') // ... and authenticate here before `goto`
  .goto('http://www.ipchicken.com')
  .evaluate(() => {
    return document.querySelector('b').innerText.replace(/[^\d\.]/g, '');
  })
  .end()
  .then((ip) => { // This will log the Proxy's IP
    console.log('proxy IP:', ip);
  });

// The rest is just normal Dream to get your local IP
const regularDream = Dream({ show: true });

regularDream
  .goto('http://www.ipchicken.com')
  .evaluate(() =>
    document.querySelector('b').innerText.replace(/[^\d\.]/g, '');
  )
  .end()
  .then((ip) => { // This will log the your local IP
    console.log('local IP:', ip);
  });
```

### Promises

By default, Dream uses default native ES6 promises. You can plug in your favorite [ES6-style promises library](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise) like [bluebird](https://www.npmjs.com/package/bluebird) or [q](https://www.npmjs.com/package/q) for convenience!

Here's an example:

```js
var Dream = require('dream')

Dream.Promise = require('bluebird')
// OR:
Dream.Promise = require('q').Promise
```

You can also specify a custom Promise library per-instance with the `Promise` constructor option like so:

```js
var Dream = require('dream')

var es6Dream = Dream()
var bluebirdDream = Dream({
  Promise: require('bluebird')
})

var es6Promise = es6Dream
  .goto('https://github.com/segmentio/dream')
  .then()
var bluebirdPromise = bluebirdDream
  .goto('https://github.com/segmentio/dream')
  .then()

es6Promise.isFulfilled() // throws: `TypeError: es6EndPromise.isFulfilled is not a function`
bluebirdPromise.isFulfilled() // returns: `true | false`
```

### Extending Dream

#### Dream.action(name, [electronAction|electronNamespace], action|namespace)

You can add your own custom actions to the Dream prototype. Here's an example:

```js
Dream.action('size', function(done) {
  this.evaluate_now(() => {
    const w = Math.max(
      document.documentElement.clientWidth,
      window.innerWidth || 0
    )
    const h = Math.max(
      document.documentElement.clientHeight,
      window.innerHeight || 0
    )
    return {
      height: h,
      width: w
    }
  }, done)
})

Dream()
  .goto('http://cnn.com')
  .size()
  .then(size => {
    //... do something with the size information
  })
```

> Remember, this is attached to the static class `Dream`, not the instance.

You'll notice we used an internal function `evaluate_now`. This function is different than `dream.evaluate` because it runs it immediately, whereas `dream.evaluate` is queued.

An easy way to remember: when in doubt, use `evaluate`. If you're creating custom actions, use `evaluate_now`. The technical reason is that since our action has already been queued and we're running it now, we shouldn't re-queue the evaluate function.

We can also create custom namespaces. We do this internally for `dream.cookies.get` and `dream.cookies.set`. These are useful if you have a bundle of actions you want to expose, but it will clutter up the main dream object. Here's an example of that:

```js
Dream.action('style', {
  background(done) {
    this.evaluate_now(
      () => window.getComputedStyle(document.body, null).backgroundColor,
      done
    )
  }
})

Dream()
  .goto('http://google.com')
  .style.background()
  .then(background => {
    // ... do something interesting with background
  })
```

You can also add custom Electron actions. The additional Electron action or namespace actions take `name`, `options`, `parent`, `win`, `renderer`, and `done`. Note the Electron action comes first, mirroring how `.evaluate()` works. For example:

```javascript
Dream.action(
  'clearCache',
  (name, options, parent, win, renderer, done) => {
    parent.respondTo('clearCache', done => {
      win.webContents.session.clearCache(done)
    })
    done()
  },
  function(done) {
    this.child.call('clearCache', done)
  }
)

Dream()
  .clearCache()
  .goto('http://example.org')
  //... more actions ...
  .then(() => {
    // ...
  })
```

...would clear the browser’s cache before navigating to `example.org`.

See [this document](https://github.com/rosshinkley/dream-examples/blob/master/docs/beginner/action.md) for more details on creating custom actions.

#### .use(plugin)

`dream.use` is useful for reusing a set of tasks on an instance. Check out [dream-swiftly](https://github.com/segmentio/dream-swiftly) for some examples.

#### Custom preload script

If you need to do something custom when you first load the window environment, you
can specify a custom preload script. Here's how you do that:

```js
import path from 'path'

const dream = Dream({
  webPreferences: {
    preload: path.resolve('custom-script.js')
    //alternative: preload: "absolute/path/to/custom-script.js"
  }
})
```

The only requirement for that script is that you'll need the following prelude:

```js
window.__dream = {}
__dream.ipc = require('electron').ipcRenderer
```

To benefit of all of dream's feedback from the browser, you can instead copy the contents of dream's [preload script](lib/preload.template.js).

#### Storage Persistence between dream instances

By default dream will create an in-memory partition for each instance. This means that any localStorage or cookies or any other form of persistent state will be destroyed when dream is ended. If you would like to persist state between instances you can use the [webPreferences.partition](http://electron.atom.io/docs/api/browser-window/#new-browserwindowoptions) api in electron.

```js
import Dream from 'dream';

dream = Dream(); // non persistent paritition by default
yield dream
  .evaluate(() => {
    window.localStorage.setItem('testing', 'This will not be persisted');
  })
  .end();

dream = Dream({
  webPreferences: {
    partition: 'persist: testing'
  }
});
yield dream
  .evaluate(() => {
    window.localStorage.setItem('testing', 'This is persisted for other instances with the same paritition name');
  })
  .end();
```

If you specify a `null` paritition then it will use the electron default behavior (persistent) or any string that starts with `'persist:'` will persist under that partition name, any other string will result in in-memory only storage.

## Usage

#### Installation

Dream is a Node.js module, so you'll need to [have Node.js installed](http://nodejs.org/). Then you just need to `npm install` the module:

```bash
$ npm install --save dream
```

#### Execution

Dream is a node module that can be used in a Node.js script or module. Here's a simple script to open a web page:

```js
import Dream from 'dream';

const dream = Dream();

dream.goto('http://cnn.com')
  .evaluate(() => {
    return document.title;
  })
  .end()
  .then((title) => {
    console.log(title);
  })
```

If you save this as `cnn.js`, you can run it on the command line like this:

```bash
npm install --save dream
node cnn.js
```

#### Common Execution Problems

Dream heavily relies on [Electron](http://electron.atom.io/) for heavy lifting. And Electron in turn relies on several UI-focused dependencies (eg. libgtk+) which are often missing from server distros.

For help running dream on your server distro check out [How to run dream on Amazon Linux and CentOS](https://gist.github.com/dimkir/f4afde77366ff041b66d2252b45a13db) guide.

#### Debugging

There are three good ways to get more information about what's happening inside the headless browser:

1. Use the `DEBUG=*` flag described below.
2. Pass `{ show: true }` to the [dream constructor](#dreamoptions) to have it create a visible, rendered window where you can watch what is happening.
3. Listen for [specific events](#onevent-callback).

To run the same file with debugging output, run it like this `DEBUG=dream node cnn.js` (on Windows use `set DEBUG=dream & node cnn.js`).

This will print out some additional information about what's going on:

```bash
dream queueing action "goto" +0ms
dream queueing action "evaluate" +4ms
Breaking News, U.S., World, Weather, Entertainment & Video News - CNN.com
```

##### Debug Flags

All dream messages

`DEBUG=dream*`

Only actions

`DEBUG=dream:actions*`

Only logs

`DEBUG=dream:log*`
