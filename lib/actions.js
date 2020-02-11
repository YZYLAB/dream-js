/**
 * Module Dependencies
 */

import debug from 'debug';
debug('dream:actions');
import sliced from 'sliced';
import jsesc from 'jsesc';
import fs from 'fs';


/**
 * Get the version info for Dream, Electron and Chromium.
 * @param {Function} done
 */
export function engineVersions(done) {
    debug('.engineVersions()')
    done(null, this.engineVersions)
}

/**
 * Get the title of the page.
 *
 * @param {Function} done
 */

export function title(done) {
    debug('.title() getting it')
    this.evaluate_now(() => document.title, done)
}

/**
 * Get the url of the page.
 *
 * @param {Function} done
 */

export function url(done) {
    debug('.url() getting it')
    this.evaluate_now(() => document.location.href, done)
}

/**
 * Get the path of the page.
 *
 * @param {Function} done
 */

export function path(done) {
    debug('.path() getting it')
    this.evaluate_now(() => document.location.pathname, done)
}

/**
 * Determine if a selector is visible on a page.
 *
 * @param {String} selector
 * @param {Function} done
 */

export function visible(selector, done) {
    debug(`.visible() for ${selector}`)
    this.evaluate_now(
        selector => {
            const elem = document.querySelector(selector);
            if (elem) return elem.offsetWidth > 0 && elem.offsetHeight > 0
            else return false
        },
        done,
        selector
    )
}

/**
 * Determine if a selector exists on a page.
 *
 * @param {String} selector
 * @param {Function} done
 */

export function exists(selector, done) {
    debug(`.exists() for ${selector}`)
    this.evaluate_now(
        selector => document.querySelector(selector) !== null,
        done,
        selector
    )
}

/**
 * Click an element.
 *
 * @param {String} selector
 * @param {Function} done
 */

export function click(selector, done) {
    debug(`.click() on ${selector}`)
    this.evaluate_now(
        selector => {
            document.activeElement.blur()
            const element = document.querySelector(selector);
            if (!element) {
                throw new Error(`Unable to find element by selector: ${selector}`)
            }
            const bounding = element.getBoundingClientRect();
            const event = new MouseEvent('click', {
                view: document.window,
                bubbles: true,
                cancelable: true,
                clientX: bounding.left + bounding.width / 2,
                clientY: bounding.top + bounding.height / 2
            });
            element.dispatchEvent(event)
        },
        done,
        selector
    )
}

/**
 * Mousedown on an element.
 *
 * @param {String} selector
 * @param {Function} done
 */

export function mousedown(selector, done) {
    debug(`.mousedown() on ${selector}`)
    this.evaluate_now(
        selector => {
            const element = document.querySelector(selector);
            if (!element) {
                throw new Error(`Unable to find element by selector: ${selector}`)
            }
            const bounding = element.getBoundingClientRect();
            const event = new MouseEvent('mousedown', {
                view: document.window,
                bubbles: true,
                cancelable: true,
                clientX: bounding.left + bounding.width / 2,
                clientY: bounding.top + bounding.height / 2
            });
            element.dispatchEvent(event)
        },
        done,
        selector
    )
}

/**
 * Mouseup on an element.
 *
 * @param {String} selector
 * @param {Function} done
 */

export function mouseup(selector, done) {
    debug(`.mouseup() on ${selector}`)
    this.evaluate_now(
        selector => {
            const element = document.querySelector(selector);
            if (!element) {
                throw new Error(`Unable to find element by selector: ${selector}`)
            }
            const bounding = element.getBoundingClientRect();
            const event = new MouseEvent('mouseup', {
                view: document.window,
                bubbles: true,
                cancelable: true,
                clientX: bounding.left + bounding.width / 2,
                clientY: bounding.top + bounding.height / 2
            });
            element.dispatchEvent(event)
        },
        done,
        selector
    )
}

/**
 * Hover over an element.
 *
 * @param {String} selector
 * @param {Function} done
 */

export function mouseover(selector, done) {
    debug(`.mouseover() on ${selector}`)
    this.evaluate_now(
        selector => {
            const element = document.querySelector(selector);
            if (!element) {
                throw new Error(`Unable to find element by selector: ${selector}`)
            }
            const bounding = element.getBoundingClientRect();
            const event = new MouseEvent('mouseover', {
                view: document.window,
                bubbles: true,
                cancelable: true,
                clientX: bounding.left + bounding.width / 2,
                clientY: bounding.top + bounding.height / 2
            });
            element.dispatchEvent(event)
        },
        done,
        selector
    )
}

/**
 * Release hover from an element.
 *
 * @param {String} selector
 * @param {Function} done
 */

export function mouseout(selector, done) {
    debug(`.mouseout() on ${selector}`)
    this.evaluate_now(
        selector => {
            const element = document.querySelector(selector);
            if (!element) {
                throw new Error(`Unable to find element by selector: ${selector}`)
            }
            const event = document.createEvent('MouseEvent');
            event.initMouseEvent('mouseout', true, true)
            element.dispatchEvent(event)
        },
        done,
        selector
    )
}

/**
 * Helper functions for type() and insert() to focus/blur
 * so that we trigger DOM events.
 */

const focusSelector = function(done, selector) {
    return this.evaluate_now(
        selector => {
            document.querySelector(selector).focus()
        },
        done.bind(this),
        selector
    );
};

const blurSelector = function(done, selector) {
    return this.evaluate_now(
        selector => {
            //it is possible the element has been removed from the DOM
            //between the action and the call to blur the element
            const element = document.querySelector(selector);
            if (element) {
                element.blur()
            }
        },
        done.bind(this),
        selector
    );
};

/**
 * Type into an element.
 *
 * @param {String} selector
 * @param {String} text
 * @param {Function} done
 */

export function type(...args) {
    const selector = args[0];
    let text;
    let done;
    if (args.length == 2) {
        done = args[1]
    } else {
        text = args[1]
        done = args[2]
    }

    debug('.type() %s into %s', text, selector)
    const self = this;

    focusSelector.bind(this)(function(err) {
        if (err) {
            debug('Unable to .type() into non-existent selector %s', selector)
            return done(err)
        }

        const blurDone = blurSelector.bind(this, done, selector);
        if ((text || '') == '') {
            this.evaluate_now(
                selector => {
                    document.querySelector(selector).value = ''
                },
                blurDone,
                selector
            )
        } else {
            self.child.call('type', text, blurDone)
        }
    }, selector)
}

/**
 * Insert text
 *
 * @param {String} selector
 * @param {String} text
 * @param {Function} done
 */

export function insert(selector, text, done) {
    if (arguments.length === 2) {
        done = text
        text = null
    }

    debug('.insert() %s into %s', text, selector)
    const child = this.child;

    focusSelector.bind(this)(function(err) {
        if (err) {
            debug('Unable to .insert() into non-existent selector %s', selector)
            return done(err)
        }

        const blurDone = blurSelector.bind(this, done, selector);
        if ((text || '') == '') {
            this.evaluate_now(
                selector => {
                    document.querySelector(selector).value = ''
                },
                blurDone,
                selector
            )
        } else {
            child.call('insert', text, blurDone)
        }
    }, selector)
}

/**
 * Check a checkbox, fire change event
 *
 * @param {String} selector
 * @param {Function} done
 */

export function check(selector, done) {
    debug(`.check() ${selector}`)
    this.evaluate_now(
        selector => {
            const element = document.querySelector(selector);
            const event = document.createEvent('HTMLEvents');
            element.checked = true
            event.initEvent('change', true, true)
            element.dispatchEvent(event)
        },
        done,
        selector
    )
}

/*
 * Uncheck a checkbox, fire change event
 *
 * @param {String} selector
 * @param {Function} done
 */

export function uncheck(selector, done) {
    debug(`.uncheck() ${selector}`)
    this.evaluate_now(
        selector => {
            const element = document.querySelector(selector);
            const event = document.createEvent('HTMLEvents');
            element.checked = null
            event.initEvent('change', true, true)
            element.dispatchEvent(event)
        },
        done,
        selector
    )
}

/**
 * Choose an option from a select dropdown
 *
 *
 *
 * @param {String} selector
 * @param {String} option value
 * @param {Function} done
 */

export function select(selector, option, done) {
    debug(`.select() ${selector}`)
    this.evaluate_now(
        (selector, option) => {
            const element = document.querySelector(selector);
            const event = document.createEvent('HTMLEvents');
            element.value = option
            event.initEvent('change', true, true)
            element.dispatchEvent(event)
        },
        done,
        selector,
        option
    )
}

/**
 * Go back to previous url.
 *
 * @param {Function} done
 */

export function back(done) {
    debug('.back()')
    this.evaluate_now(() => {
        window.history.back()
    }, done)
}

/**
 * Go forward to previous url.
 *
 * @param {Function} done
 */

export function forward(done) {
    debug('.forward()')
    this.evaluate_now(() => {
        window.history.forward()
    }, done)
}

/**
 * Refresh the current page.
 *
 * @param {Function} done
 */

export function refresh(done) {
    debug('.refresh()')
    this.evaluate_now(() => {
        window.location.reload()
    }, done)
}

/**
 * Wait
 *
 * @param {...} args
 */

export function wait() {
    const args = sliced(arguments);
    const done = args[args.length - 1];
    if (args.length < 2) {
        debug('Not enough arguments for .wait()')
        return done()
    }

    const arg = args[0];
    if (typeof arg === 'number') {
        debug(`.wait() for ${arg}ms`)
        if (arg < this.options.waitTimeout) {
            waitms(arg, done)
        } else {
            waitms(
                this.options.waitTimeout,
                () => {
                    done(
                        new Error(
                            `.wait() timed out after ${this.options.waitTimeout}msec`
                        )
                    )
                }
            )
        }
    } else if (typeof arg === 'string') {
        let timeout = null;
        if (typeof args[1] === 'number') {
            timeout = args[1]
        }
        debug(
            `.wait() for ${arg} element${timeout ? ` or ${timeout}msec` : ''}`
        )
        waitelem.apply({ timeout }, [this, arg, done])
    } else if (typeof arg === 'function') {
        debug('.wait() for fn')
        args.unshift(this)
        waitfn.apply(this, args)
    } else {
        done()
    }
}

/**
 * Wait for a specififed amount of time.
 *
 * @param {Number} ms
 * @param {Function} done
 */

function waitms(ms, done) {
    setTimeout(done, ms)
}

/**
 * Wait for a specified selector to exist.
 *
 * @param {Dream} self
 * @param {String} selector
 * @param {Function} done
 */

function waitelem(self, selector, done) {
    let elementPresent;
    eval(
        `elementPresent = function() {  var element = document.querySelector('${jsesc(selector)}');  return (element ? true : false);};`
    )
    const newDone = err => {
        if (err) {
            return done(
                new Error(
                    `.wait() for ${selector} timed out after ${
                        self.options.waitTimeout
                    }msec`
                )
            )
        }
        done()
    };
    waitfn.apply(this, [self, elementPresent, newDone])
}

/**
 * Wait until evaluated function returns true.
 *
 * @param {Dream} self
 * @param {Function} fn
 * @param {...} args
 * @param {Function} done
 */

function waitfn() {
    const softTimeout = this.timeout || null;
    let executionTimer;
    let softTimeoutTimer;
    const self = arguments[0];

    const args = sliced(arguments);
    const done = args[args.length - 1];

    const timeoutTimer = setTimeout(() => {
        clearTimeout(executionTimer)
        clearTimeout(softTimeoutTimer)
        done(new Error(`.wait() timed out after ${self.options.waitTimeout}msec`))
    }, self.options.waitTimeout);
    return tick.apply(this, arguments)

    function tick(self, fn /**, arg1, arg2..., done**/) {
        if (softTimeout) {
            softTimeoutTimer = setTimeout(() => {
                clearTimeout(executionTimer)
                clearTimeout(timeoutTimer)
                done()
            }, softTimeout)
        }

        const waitDone = (err, result) => {
            if (result) {
                clearTimeout(timeoutTimer)
                clearTimeout(softTimeoutTimer)
                return done()
            } else if (err) {
                clearTimeout(timeoutTimer)
                clearTimeout(softTimeoutTimer)
                return done(err)
            } else {
                executionTimer = setTimeout(() => {
                    tick.apply(self, args)
                }, self.options.pollInterval)
            }
        };
        const newArgs = [fn, waitDone].concat(args.slice(2, -1));
        self.evaluate_now.apply(self, newArgs)
    }
}

/**
 * Execute a function on the page.
 *
 * @param {Function} fn
 * @param {...} args
 * @param {Function} done
 */

export function evaluate(fn /**, arg1, arg2..., done**/) {
    const args = sliced(arguments);
    const done = args[args.length - 1];
    const self = this;
    const newDone = function() {
        clearTimeout(timeoutTimer)
        done.apply(self, arguments)
    };
    const newArgs = [fn, newDone].concat(args.slice(1, -1));
    if (typeof fn !== 'function') {
        return done(new Error('.evaluate() fn should be a function'))
    }
    debug('.evaluate() fn on the page')
    var timeoutTimer = setTimeout(() => {
        done(
            new Error(
                `Evaluation timed out after ${
                    self.options.executionTimeout
                }msec.  Are you calling done() or resolving your promises?`
            )
        )
    }, self.options.executionTimeout)
    this.evaluate_now.apply(this, newArgs)
}

/**
 * Inject a JavaScript or CSS file onto the page
 *
 * @param {String} type
 * @param {String} file
 * @param {Function} done
 */

export function inject(type, file, done) {
    debug('.inject()-ing a file')
    if (type === 'js') {
        const js = fs.readFileSync(file, { encoding: 'utf-8' });
        this._inject(js, done)
    } else if (type === 'css') {
        const css = fs.readFileSync(file, { encoding: 'utf-8' });
        this.child.call('css', css, done)
    } else {
        debug('unsupported file type in .inject()')
        done()
    }
}

/**
 * Set the viewport.
 *
 * @param {Number} width
 * @param {Number} height
 * @param {Function} done
 */

export function viewport(width, height, done) {
    debug('.viewport()')
    this.child.call('size', width, height, done)
}

/**
 * Set the useragent.
 *
 * @param {String} useragent
 * @param {Function} done
 */

export function useragent(useragent, done) {
    debug(`.useragent() to ${useragent}`)
    this.child.call('useragent', useragent, done)
}

/**
 * Set the scroll position.
 *
 * @param {Number} x
 * @param {Number} y
 * @param {Function} done
 */

export function scrollTo(y, x, done) {
    debug('.scrollTo()')
    this.evaluate_now(
        (y, x) => {
            window.scrollTo(x, y)
        },
        done,
        y,
        x
    )
}

/**
 * Take a screenshot.
 *
 * @param {String} path
 * @param {Object} clip
 * @param {Function} done
 */

export function screenshot(path, clip, done) {
    debug('.screenshot()')
    if (typeof path === 'function') {
        done = path
        clip = undefined
        path = undefined
    } else if (typeof clip === 'function') {
        done = clip
        clip = typeof path === 'string' ? undefined : path
        path = typeof path === 'string' ? path : undefined
    }
    this.child.call('screenshot', path, clip, (error, {data}) => {
        const buf = new Buffer(data);
        debug('.screenshot() captured with length %s', buf.length)
        path ? fs.writeFile(path, buf, done) : done(null, buf)
    })
}

/**
 * Save the current file as html to disk.
 *
 * @param {String} path the full path to the file to save to
 * @param {String} saveType
 * @param {Function} done
 */

export function html(path, saveType, done) {
    debug('.html()')
    if (typeof path === 'function' && !saveType && !done) {
        done = path
        saveType = undefined
        path = undefined
    } else if (
        typeof path === 'object' &&
        typeof saveType === 'function' &&
        !done
    ) {
        done = saveType
        saveType = path
        path = undefined
    } else if (typeof saveType === 'function' && !done) {
        done = saveType
        saveType = undefined
    }
    this.child.call('html', path, saveType, error => {
        if (error) debug(error)
        done(error)
    })
}

/**
 * Take a pdf.
 *
 * @param {String} path
 * @param {Function} done
 */

export function pdf(path, options, done) {
    debug('.pdf()')
    if (typeof path === 'function' && !options && !done) {
        done = path
        options = undefined
        path = undefined
    } else if (
        typeof path === 'object' &&
        typeof options === 'function' &&
        !done
    ) {
        done = options
        options = path
        path = undefined
    } else if (typeof options === 'function' && !done) {
        done = options
        options = undefined
    }
    this.child.call('pdf', path, options, (error, {data}) => {
        if (error) debug(error)
        const buf = new Buffer(data);
        debug('.pdf() captured with length %s', buf.length)
        path ? fs.writeFile(path, buf, done) : done(null, buf)
    })
}

/**
 * Get and set cookies
 *
 * @param {String} name
 * @param {Mixed} value (optional)
 * @param {Function} done
 */

export const cookies = {};

/**
 * Get a cookie
 */

cookies.get = function(name, done) {
    debug('cookies.get()')
    let query = {};

    switch (arguments.length) {
        case 2:
            query = typeof name === 'string' ? { name } : name
            break
        case 1:
            done = name
            break
    }

    this.child.call('cookie.get', query, done)
}

/**
 * Set a cookie
 */

cookies.set = function(name, value, done) {
    debug('cookies.set()')
    let cookies = [];

    switch (arguments.length) {
        case 3:
            cookies.push({
                name,
                value
            })
            break
        case 2:
            cookies = [].concat(name)
            done = value
            break
        case 1:
            done = name
            break
    }

    this.child.call('cookie.set', cookies, done)
}

/**
 * Clear a cookie
 */

cookies.clear = function(name, done) {
    debug('cookies.clear()')
    let cookies = [];

    switch (arguments.length) {
        case 2:
            cookies = [].concat(name)
            break
        case 1:
            done = name
            break
    }

    this.child.call('cookie.clear', cookies, done)
}

/**
 * Clear all cookies
 */

cookies.clearAll = function(done) {
    this.child.call('cookie.clearAll', done)
}



/**
 * Authentication
 */

export function authentication(login, password, done) {
    debug('.authentication()')
    this.child.call('authentication', login, password, done)
}
