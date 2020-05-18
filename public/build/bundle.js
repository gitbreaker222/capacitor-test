
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_custom_element_data(node, prop, value) {
        if (prop in node) {
            node[prop] = value;
        }
        else {
            attr(node, prop, value);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    // unfortunately this can't be a constant as that wouldn't be tree-shakeable
    // so we cache the result instead
    let crossorigin;
    function is_crossorigin() {
        if (crossorigin === undefined) {
            crossorigin = false;
            try {
                if (typeof window !== 'undefined' && window.parent) {
                    void window.parent.document;
                }
            }
            catch (error) {
                crossorigin = true;
            }
        }
        return crossorigin;
    }
    function add_resize_listener(node, fn) {
        const computed_style = getComputedStyle(node);
        const z_index = (parseInt(computed_style.zIndex) || 0) - 1;
        if (computed_style.position === 'static') {
            node.style.position = 'relative';
        }
        const iframe = element('iframe');
        iframe.setAttribute('style', `display: block; position: absolute; top: 0; left: 0; width: 100%; height: 100%; ` +
            `overflow: hidden; border: 0; opacity: 0; pointer-events: none; z-index: ${z_index};`);
        iframe.setAttribute('aria-hidden', 'true');
        iframe.tabIndex = -1;
        let unsubscribe;
        if (is_crossorigin()) {
            iframe.src = `data:text/html,<script>onresize=function(){parent.postMessage(0,'*')}</script>`;
            unsubscribe = listen(window, 'message', (event) => {
                if (event.source === iframe.contentWindow)
                    fn();
            });
        }
        else {
            iframe.src = 'about:blank';
            iframe.onload = () => {
                unsubscribe = listen(iframe.contentWindow, 'resize', fn);
            };
        }
        append(node, iframe);
        return () => {
            detach(iframe);
            if (unsubscribe)
                unsubscribe();
        };
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function tick() {
        schedule_update();
        return resolved_promise;
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(child_ctx, dirty);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next, lookup.has(block.key));
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error(`Cannot have duplicate keys in a keyed each`);
            }
            keys.add(key);
        }
    }

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.22.3' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev("SvelteDOMSetProperty", { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const logPrefix = [
    	'%cSvelteStore',
    	[
    		`background: #ff3e00`,
    		`border-radius: 0.5em`,
    		`color: white`,
    		`font-weight: bold`,
    		`padding: 2px 0.5em`,
    	].join(';')
    ];

    const deepCopy = value => JSON.parse(JSON.stringify(value));

    const checkSpelling = (state, _state) => {
    	const correctKeys = Object.keys(state);
    	const _keys = Object.keys(_state).every(key => {
    		const match = correctKeys.indexOf(key) >= 0; 
    		if (!match) {
    			console.debug(correctKeys);
    			console.warn(`[SvelteStore] Spelling seems incorrect for "${key}"
(Check debug logs for available keys)`);
    		}
    		return match
    	});
    };

    const checkType = (value, newValue, name = "") => {
      const t1 = typeof value;
      const t2 = typeof newValue;
      if (t1 !== t2) {
    		console.log(...logPrefix);
        console.warn(`Type warning: ${name} Expected ${t1}, got ${t2}`);
      }
    };

    // setup tickLog
    // https://stackoverflow.com/questions/6343450/generating-sound-on-the-fly-with-javascript-html5#16573282
    // https://marcgg.com/blog/2016/11/01/javascript-audio/
    const audioCtx = new AudioContext();

    const tickLog = async () => {
      const duration = .1;
      const freq = 1 / duration;

      let osc = audioCtx.createOscillator(); 
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      
      let vol = audioCtx.createGain();
      vol.gain.value = 0.02;

      osc.connect(vol);
      vol.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    };

    const logUpdate = (state, newState, action, storeName) => {
      const _state = {};
      const _newState = {};

      Object.keys(state)
        .filter(key => state[key] !== newState[key])
        .map(key => {
          _state[key] = state[key];
          _newState[key] = newState[key];
        });

      const update = {
        before: _state,
        after: _newState
      };
    	
    	console.log(...logPrefix, action || 'Unnamed action');
    	console.groupCollapsed(
    		`State changed. Open for details`
    	);
      console.table(update);
    	console.groupEnd();
      tickLog();
      try {
        sessionStorage.setItem(
          `svelteStore ${storeName}`,
          JSON.stringify(newState)
        );
      } catch (e) {
        console.debug("sessionStorage needs Same-Origin-Policy to work");
      }
    };

    const persistRead = (name) => (
      JSON.parse(localStorage.getItem(name))
    );
    const persistWrite = (name, state) => (
      localStorage.setItem(name, JSON.stringify(state))
    );

    const useStore = (state, opts) => {
      const {
        name = "unnamed state",
        persist = false,
      } = opts;
      const persistName = `STORE_UTILS.${name}`;
      if (persist) {
        const persistedState = persistRead(persistName);    
        if (persistedState) state = persistedState;
        else persistWrite(persistName, state);
      }
      console.info(name, state);
      const initialState =  deepCopy(state) ;
      const { subscribe, update, set } = writable(state);
      let currentState = { ...state };

      const interceptUpdate = callback => {
        let callbackResult;
        update(state => {
          callbackResult = callback(state);

          function main(_state, asyncResolved = false) {
            {
    					checkSpelling(initialState, _state);
              Object.keys(initialState).map(key => {
                checkType(initialState[key], _state[key], key);
              });
              logUpdate(state, _state, callback.name, name);
            }

            currentState = { ..._state };
            if (persist) persistWrite(persistName, currentState);
            if (asyncResolved) set(currentState);
            else return currentState
          }

          if (callbackResult instanceof Promise) {
            callbackResult.then(result => main(result, true));
            return currentState
          }
          return main(callbackResult)
        });
        return callbackResult
      };

      const interceptSet = (newState) => {
        interceptUpdate(() => newState);
      };

      const get = () => currentState;

      const storeIn = { update: interceptUpdate, set: interceptSet };
      const storeOut = { subscribe, get };
      return [storeIn, storeOut]
    };

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }
    function quintOut(t) {
        return --t * t * t * t * t + 1;
    }

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */

    function __rest(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    }
    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function crossfade(_a) {
        var { fallback } = _a, defaults = __rest(_a, ["fallback"]);
        const to_receive = new Map();
        const to_send = new Map();
        function crossfade(from, node, params) {
            const { delay = 0, duration = d => Math.sqrt(d) * 30, easing = cubicOut } = assign(assign({}, defaults), params);
            const to = node.getBoundingClientRect();
            const dx = from.left - to.left;
            const dy = from.top - to.top;
            const dw = from.width / to.width;
            const dh = from.height / to.height;
            const d = Math.sqrt(dx * dx + dy * dy);
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            const opacity = +style.opacity;
            return {
                delay,
                duration: is_function(duration) ? duration(d) : duration,
                easing,
                css: (t, u) => `
				opacity: ${t * opacity};
				transform-origin: top left;
				transform: ${transform} translate(${u * dx}px,${u * dy}px) scale(${t + (1 - t) * dw}, ${t + (1 - t) * dh});
			`
            };
        }
        function transition(items, counterparts, intro) {
            return (node, params) => {
                items.set(params.key, {
                    rect: node.getBoundingClientRect()
                });
                return () => {
                    if (counterparts.has(params.key)) {
                        const { rect } = counterparts.get(params.key);
                        counterparts.delete(params.key);
                        return crossfade(rect, node, params);
                    }
                    // if the node is disappearing altogether
                    // (i.e. wasn't claimed by the other list)
                    // then we need to supply an outro
                    items.delete(params.key);
                    return fallback && fallback(node, params, intro);
                };
            };
        }
        return [
            transition(to_send, to_receive, false),
            transition(to_receive, to_send, true)
        ];
    }

    const [send, receive] = crossfade({
    	duration: (d) => {console.log('#',d); return Math.sqrt(d * 200)},

    	fallback(node, params) {
    		const style = getComputedStyle(node);
    		const transform = style.transform === 'none' ? '' : style.transform;

    		return {
    			duration: 600,
    			easing: quintOut,
    			css: t => `opacity: ${t}`
    		};
    	}
    });

    const sortByIndexId = function(a, b) {
      if (a.id == null || b.id == null) {
        console.error("expected Id");
      }
      if (a.id < b.id) {
        return -1;
      }
      if (a.id > b.id) {
        return 1;
      }
      console.error("Found two identical IDs; see below");
      console.warn(a, b);
      return 0;
    };

    const filterName = function(name, filterText) {
      return name.toLowerCase().includes(
    		filterText.toLowerCase().trim()
    	);
    };

    const filterListByName = function(list, filterText) {
    	if (!filterText) return list
    	return list.filter(i => filterName(i.name, filterText))
    };

    function debounce(func, timeout) {
      let timer;
      return (...args) => {
        const next = () => func(...args);
        if (timer) {
          clearTimeout(timer);
        }
        timer = setTimeout(next, timeout > 0 ? timeout : 300);
      };
    }

    let id = 0; 
    const makeItem = name => ({
    	id: id++,
    	name,
    	src: id % 2
    	  ? "https://sveltejs.github.io/assets/music/strauss.mp3"
    		: "https://files.freemusicarchive.org/storage-freemusicarchive-org/music/Creative_Commons/Dead_Combo/CC_Affiliates_Mixtape_1/Dead_Combo_-_01_-_Povo_Que_Cas_Descalo.mp3"
    });

    function addType (item, type) {
    	if (!item) return addType(makeItem(''), type)
    	item.type = type;
    	return item
    }

    const music = [
    	"Johann Strauss - Donau Walzer (performed by European Archive; Used for all songs #1)",
    	"Dead Combo - Povo Que Cas Descalo (Used for all songs #2)",
    	"Convergence - Vanished Memories",
    	"Frederic Chopin - Nocturnes",
    	"Girlschool - Night Before",
    	"Nirvana - Nevermind - 01 - Smells Like Teen Spirit",
    	"Nirvana - Nevermind - 02 - In Bloom",
    	"Nirvana - Nevermind - 03 - Come as you Are",
    	"Nirvana - Nevermind - 04 - Breed",
    	"Nirvana - Nevermind - 05 - Polly",
    	"Nirvana - Nevermind - 06 - Territorial Pissings",
    	"Nirvana - Nevermind - 07 - Drain you",
    	"Nirvana - Nevermind - 08 - Lounge Act",
    	"Nirvana - Nevermind - 09 - Stay Away",
    	"Nirvana - Nevermind - 10 - On a Plain",
    	"Nirvana - Nevermind - 11 - Something in the Way",
    	"RainbowHorse - Underground Walrus",
    	"Crucified Barbara - In The Red - 01 - I Sell My Kids For Rock'N'Roll",
    	"Crucified Barbara - In The Red - 02 - To Kill A Man",
    	"Crucified Barbara - In The Red - 03 - Electric Sky",
    	"Crucified Barbara - In The Red - 04 - The Ghost Inside",
    	"Crucified Barbara - In The Red - 05 - Don't Call On Me",
    	"Crucified Barbara - In The Red - 06 - In The Red",
    	"Crucified Barbara - In The Red - 06 - Lunatic #1",
    	"Crucified Barbara - In The Red - 07 - Shadows",
    	"Crucified Barbara - In The Red - 08 - Finders Keepers",
    	"Crucified Barbara - In The Red - 09 - Do You Want Me",
    	"Crucified Barbara - In The Red - 10 - Follow The Stream",
    	"Fortadelis - Stimulus - 01 - Aftermath",
    	"Fortadelis - Stimulus - 02 - Clustered",
    	"Fortadelis - Stimulus - 03 - Stimulus",
    	"Fortadelis - Stimulus - 04 - Digital Wastelands",
    	"Fortadelis - Stimulus - 05 - Synthesia",
    	"Diaries of a hero - Behind the mask - 01 - Shine upon the sun",
    	"Diaries of a hero - Behind the mask - 02 - Behind the mask",
    	"Diaries of a hero - Behind the mask - 03 - Broken tears",
    	"Diaries of a hero - Behind the mask - 04 - Follow the hero",
    	"Diaries of a hero - Behind the mask - 05 - Scars of addiction",
    	"Diaries of a hero - Behind the mask - 06 - Southern belles",
    	"Diaries of a hero - Behind the mask - 07 - Ashes in the rain",
    	"Diaries of a hero - Behind the mask - 08 - Mirror house",
    	"Diaries of a hero - Behind the mask - 09 - Emotions",
    	"Diaries of a hero - Behind the mask - 10 - My own tragedy",
    	"Die Toten Hosen - In aller Stille - 01 - Strom",
    	"Die Toten Hosen - In aller Stille - 02 - Innen alles neu",
    	"Die Toten Hosen - In aller Stille - 03 - Disco",
    	"Die Toten Hosen - In aller Stille - 04 - Teil von mir",
    	"Die Toten Hosen - In aller Stille - 05 - Aufl�sen",
    	"Die Toten Hosen - In aller Stille - 06 - Leben ist t�dlich",
    	"Die Toten Hosen - In aller Stille - 07 - Ertrinken",
    	"Die Toten Hosen - In aller Stille - 08 - Alles was war",
    	"Die Toten Hosen - In aller Stille - 09 - Pessimist",
    	"Die Toten Hosen - In aller Stille - 10 - Wir bleiben stumm",
    	"Die Toten Hosen - In aller Stille - 11 - Die letzte Schlacht",
    	"Die Toten Hosen - In aller Stille - 12 - Tauschen gegen dich",
    	"Die Toten Hosen - In aller Stille - 13 - Angst",
    ];

    // constants
    const PLAYED = "PLAYED";
    const CURRENT = "CURRENT";
    const QUEUE = "QUEUE";
    const PREV_QUEUE = "PREV_QUEUE";
    const REMAINING = "REMAINING";

    //helpers
    const Playlist = function (n) {
    	if (n) {
    		const collection = [];
    		for(var i = 0; i < n; i += 1) {
    			collection.push('Song '+i);
    		}
    		return collection.map(makeItem)
    	}
      return music.map(makeItem)
    };

    // State
    function State() {
      return {
        paused: true,
        isRandom: false,
        filterText: "",

        previous: [],
        current: null,
        next: [],
        nextPrev: [],
        //remaining: new Playlist(10000),
    		remaining: new Playlist(),
      }
    }

    const [storeIn, storeOut] = useStore(new State(), {name: "playerStore"});
    const playerStore = storeOut;


    // Private Functions
    const _resetList = () =>
      storeIn.update(function _resetList(state) {
        return { ...state, previous: [], remaining: new Playlist() }
      });

    const _removeFromList = (song, origin) =>
      storeIn.update(function _removeFromList(state) {
        let { previous, next, nextPrev, remaining } = state;

        const filteredList = origin.filter(i => i !== song);
        if (origin === next) {
          next = [...filteredList];
        } else if (origin === nextPrev) {
          nextPrev = [...filteredList];
        } else if (origin === remaining) {
          remaining = [...filteredList];
        } else if (origin === previous) {
          previous = [...filteredList];
        }

        return { ...state, previous, next, nextPrev, remaining }
      });

    const playPause = (isPlay) => {
    	return storeIn.update(function playPause(state) {
        let { paused } = state;
    		
    		if (isPlay != null) paused = !isPlay;
    		else paused = !paused;

        return { ...state, paused }
      })
    };

    const play = (song, prev = false) => {
    	let { paused } = storeOut.get();
    	
    	if (!paused) playPause();
    	
    	return storeIn.update(function play(state) {
        let { current, previous, nextPrev, paused } = state;

        if (current && !prev) previous = previous.concat(current);
        if (current && prev) nextPrev = [current].concat(nextPrev);
        current = { ...song };
        paused = false;

        return { ...state, current, previous, nextPrev, paused }
      })
    };

    const playPrev = () => {
      let { previous } = storeOut.get();

      if (previous.length) {
        previous = [...previous];
        const lastItem = previous.pop();
        play(lastItem, { prev: true });
      }

      return storeIn.update(function playPrevUpdateList(state) {
        return { ...state, previous }
      })
    };

    const playNext = () => {
      let { isRandom, next, nextPrev, remaining } = storeOut.get();

      if (next.length) {
        next = [...next];
        play(next.shift());
      } else if (nextPrev.length) {
        nextPrev = [...nextPrev];
        play(nextPrev.shift());
      } else if (remaining.length && !isRandom) {
        remaining = [...remaining];
        play(remaining.shift());
      } else if (remaining.length) {
        remaining = [...remaining];
        const randomIndex = Math.floor(Math.random() * remaining.length);
        play(remaining.splice(randomIndex, 1)[0]);
      } else {
        play();
        _resetList();
        remaining = [...remaining];
        const nextSong = remaining.shift();
        play(nextSong); //if repeat
      }

      storeIn.update(function playNextUpdateList(state) {
        return { ...state, isRandom, next, nextPrev, remaining }
      });
    };

    const toggleRandom = () =>
      storeIn.update(function toggleRandom(state) {
        let { isRandom } = state;
        return { ...state, isRandom: !isRandom }
      });

    const setFilterText = (filterText) => {
      storeIn.update(function setFilterText(state) {
        return {...state, filterText}
      });
    }; 

    const resetSong = (song, origin) => {
      _removeFromList(song, origin);

      storeIn.update(function resetSong(state) {
        let { remaining } = state;

        remaining = [...remaining];
        remaining.push(song);
        remaining.sort(sortByIndexId);

        return { ...state, remaining }
      });
    };

    const queueSong = (song, origin) => {
      _removeFromList(song, origin);

      return storeIn.update(function queueSong(state) {
        let { next } = state;

        next = [...next];
        next.push(song);

        return { ...state, next }
      })
    };

    const jumpTo = (song) => {
      let {
        previous: _previous,
        next: _next,
        nextPrev: _nextPrev,
        remaining: _remaining,
      } = storeOut.get();

      const { type } = song;
      let index;
      let rSlice = [];

      switch (type) {
        case PLAYED:
          index = _previous.indexOf(song);
          _removeFromList(song, _previous);
          play(song);
          return storeIn.update(function jumpToPrevious(state) {
            let {previous, nextPrev} = state;
            previous = [...previous];
            const songsBetweenSelectedAndCurrent = previous.splice(index);
            nextPrev = [...songsBetweenSelectedAndCurrent, ...nextPrev];
            return {...state, previous, nextPrev}
          })

        case QUEUE:
          _removeFromList(song, _next);
          return play(song)

        case PREV_QUEUE:
          index = _nextPrev.indexOf(song);
          _removeFromList(song, _nextPrev);
          storeIn.update(function jumpToNextPrev(state) {
            let {previous, nextPrev} = state;

            nextPrev = [...nextPrev];
            previous = [...previous, ...nextPrev.splice(0, index)];

            return {...state, previous, nextPrev}
          });
          return play(song)

        case REMAINING:
          index = _remaining.indexOf(song);
          _removeFromList(song, _remaining);
          play(song);
          return storeIn.update(function jumpToRemaining(state) {
            let {isRandom, remaining, previous, nextPrev} = state;

            if (!isRandom) {
              remaining = [...remaining];
              rSlice = remaining.splice(0, index);
            }
            previous = [...previous, ...nextPrev, ...rSlice];
            if (nextPrev.length) nextPrev = [];

            return {...state, isRandom, remaining, previous, nextPrev}
          })

        case CURRENT:
          return

        default:
          console.error(`not defined: ${type}`);
      }
    };

    function flip(node, animation, params) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const scaleX = animation.from.width / node.clientWidth;
        const scaleY = animation.from.height / node.clientHeight;
        const dx = (animation.from.left - animation.to.left) / scaleX;
        const dy = (animation.from.top - animation.to.top) / scaleY;
        const d = Math.sqrt(dx * dx + dy * dy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(d) : duration,
            easing,
            css: (_t, u) => `transform: ${transform} translate(${u * dx}px, ${u * dy}px);`
        };
    }

    /* src/VirtualList.svelte generated by Svelte v3.22.3 */
    const file = "src/VirtualList.svelte";
    const get_default_slot_changes = dirty => ({ item: dirty & /*visible*/ 16 });
    const get_default_slot_context = ctx => ({ item: /*row*/ ctx[25].data });

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[25] = list[i];
    	return child_ctx;
    }

    // (145:26) Missing template
    function fallback_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("Missing template");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: fallback_block.name,
    		type: "fallback",
    		source: "(145:26) Missing template",
    		ctx
    	});

    	return block;
    }

    // (143:2) {#each visible as row (row.index)}
    function create_each_block(key_1, ctx) {
    	let svelte_virtual_list_row;
    	let t;
    	let current;
    	const default_slot_template = /*$$slots*/ ctx[21].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[20], get_default_slot_context);
    	const default_slot_or_fallback = default_slot || fallback_block(ctx);

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			svelte_virtual_list_row = element("svelte-virtual-list-row");
    			if (default_slot_or_fallback) default_slot_or_fallback.c();
    			t = space();
    			set_custom_element_data(svelte_virtual_list_row, "class", "svelte-1kbuqay");
    			add_location(svelte_virtual_list_row, file, 143, 3, 3554);
    			this.first = svelte_virtual_list_row;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svelte_virtual_list_row, anchor);

    			if (default_slot_or_fallback) {
    				default_slot_or_fallback.m(svelte_virtual_list_row, null);
    			}

    			append_dev(svelte_virtual_list_row, t);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && dirty & /*$$scope, visible*/ 1048592) {
    					default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[20], get_default_slot_context), get_slot_changes(default_slot_template, /*$$scope*/ ctx[20], dirty, get_default_slot_changes));
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot_or_fallback, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot_or_fallback, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svelte_virtual_list_row);
    			if (default_slot_or_fallback) default_slot_or_fallback.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(143:2) {#each visible as row (row.index)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let svelte_virtual_list_viewport;
    	let svelte_virtual_list_contents;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let svelte_virtual_list_viewport_resize_listener;
    	let current;
    	let dispose;
    	let each_value = /*visible*/ ctx[4];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*row*/ ctx[25].index;
    	validate_each_keys(ctx, each_value, get_each_context, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			svelte_virtual_list_viewport = element("svelte-virtual-list-viewport");
    			svelte_virtual_list_contents = element("svelte-virtual-list-contents");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			set_style(svelte_virtual_list_contents, "padding-top", /*top*/ ctx[5] + "px");
    			set_style(svelte_virtual_list_contents, "padding-bottom", /*bottom*/ ctx[6] + "px");
    			set_custom_element_data(svelte_virtual_list_contents, "class", "svelte-1kbuqay");
    			add_location(svelte_virtual_list_contents, file, 138, 1, 3398);
    			set_style(svelte_virtual_list_viewport, "height", /*height*/ ctx[0]);
    			set_custom_element_data(svelte_virtual_list_viewport, "class", "svelte-1kbuqay");
    			add_render_callback(() => /*svelte_virtual_list_viewport_elementresize_handler*/ ctx[24].call(svelte_virtual_list_viewport));
    			add_location(svelte_virtual_list_viewport, file, 132, 0, 3252);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, svelte_virtual_list_viewport, anchor);
    			append_dev(svelte_virtual_list_viewport, svelte_virtual_list_contents);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(svelte_virtual_list_contents, null);
    			}

    			/*svelte_virtual_list_contents_binding*/ ctx[22](svelte_virtual_list_contents);
    			/*svelte_virtual_list_viewport_binding*/ ctx[23](svelte_virtual_list_viewport);
    			svelte_virtual_list_viewport_resize_listener = add_resize_listener(svelte_virtual_list_viewport, /*svelte_virtual_list_viewport_elementresize_handler*/ ctx[24].bind(svelte_virtual_list_viewport));
    			current = true;
    			if (remount) dispose();
    			dispose = listen_dev(svelte_virtual_list_viewport, "scroll", /*handle_scroll*/ ctx[7], false, false, false);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$$scope, visible*/ 1048592) {
    				const each_value = /*visible*/ ctx[4];
    				validate_each_argument(each_value);
    				group_outros();
    				validate_each_keys(ctx, each_value, get_each_context, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, svelte_virtual_list_contents, outro_and_destroy_block, create_each_block, null, get_each_context);
    				check_outros();
    			}

    			if (!current || dirty & /*top*/ 32) {
    				set_style(svelte_virtual_list_contents, "padding-top", /*top*/ ctx[5] + "px");
    			}

    			if (!current || dirty & /*bottom*/ 64) {
    				set_style(svelte_virtual_list_contents, "padding-bottom", /*bottom*/ ctx[6] + "px");
    			}

    			if (!current || dirty & /*height*/ 1) {
    				set_style(svelte_virtual_list_viewport, "height", /*height*/ ctx[0]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svelte_virtual_list_viewport);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			/*svelte_virtual_list_contents_binding*/ ctx[22](null);
    			/*svelte_virtual_list_viewport_binding*/ ctx[23](null);
    			svelte_virtual_list_viewport_resize_listener();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { items } = $$props;
    	let { height = "100%" } = $$props;
    	let { itemHeight = undefined } = $$props;
    	let { start = 0 } = $$props;
    	let { end = 0 } = $$props;
    	const scrollToIndex = (...args) => _scrollTo(...args);

    	// local state
    	let height_map = [];

    	let rows;
    	let viewport;
    	let contents;
    	let viewport_height = 0;
    	let visible;
    	let mounted;
    	let top = 0;
    	let bottom = 0;
    	let average_height;
    	let refreshReady;

    	async function refresh(items, viewport_height, itemHeight) {
    		const isStartOverflow = items.length < start;

    		if (isStartOverflow) {
    			await scrollToIndex(items.length - 1, { behavior: "auto" });
    		}

    		let resolveRefresh;

    		refreshReady = new Promise(resolve => {
    				resolveRefresh = resolve;
    			});

    		const { scrollTop } = viewport;
    		await tick(); // wait until the DOM is up to date
    		let content_height = top - scrollTop;
    		let i = start;

    		while (content_height < viewport_height && i < items.length) {
    			let row = rows[i - start];

    			if (!row) {
    				$$invalidate(9, end = i + 1);
    				await tick(); // render the newly visible row
    				row = rows[i - start];
    			}

    			const row_height = height_map[i] = itemHeight || row.offsetHeight;
    			content_height += row_height;
    			i += 1;
    		}

    		$$invalidate(9, end = i);
    		const remaining = items.length - end;
    		average_height = (top + content_height) / end;
    		$$invalidate(6, bottom = remaining * average_height);
    		height_map.length = items.length;
    		resolveRefresh(true);
    	}

    	async function handle_scroll() {
    		const { scrollTop } = viewport;

    		for (let v = 0; v < rows.length; v += 1) {
    			height_map[start + v] = itemHeight || rows[v].offsetHeight;
    		}

    		let i = 0;
    		let y = 0;

    		while (i < items.length) {
    			const row_height = height_map[i] || average_height;

    			if (y + row_height > scrollTop) {
    				$$invalidate(8, start = i);
    				$$invalidate(5, top = y);
    				break;
    			}

    			y += row_height;
    			i += 1;
    		}

    		while (i < items.length) {
    			y += height_map[i] || average_height;
    			i += 1;
    			if (y > scrollTop + viewport_height) break;
    		}

    		$$invalidate(9, end = i);
    		const remaining = items.length - end;
    		average_height = y / end;
    		while (i < items.length) height_map[i++] = average_height;
    		$$invalidate(6, bottom = remaining * average_height);
    	}

    	async function _scrollTo(index, opts) {
    		const { scrollTop, scrollHeight } = viewport;
    		const itemsDelta = index - start;
    		const _itemHeight = itemHeight || average_height;
    		const distance = itemsDelta * _itemHeight;

    		opts = {
    			left: 0,
    			top: scrollTop + distance,
    			behavior: "smooth",
    			...opts
    		};

    		await refreshReady;
    		viewport.scrollTo(opts);
    	}

    	// trigger initial refresh
    	onMount(() => {
    		rows = contents.getElementsByTagName("svelte-virtual-list-row");
    		$$invalidate(15, mounted = true);
    	});

    	const writable_props = ["items", "height", "itemHeight", "start", "end"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<VirtualList> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("VirtualList", $$slots, ['default']);

    	function svelte_virtual_list_contents_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(2, contents = $$value);
    		});
    	}

    	function svelte_virtual_list_viewport_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(1, viewport = $$value);
    		});
    	}

    	function svelte_virtual_list_viewport_elementresize_handler() {
    		viewport_height = this.offsetHeight;
    		$$invalidate(3, viewport_height);
    	}

    	$$self.$set = $$props => {
    		if ("items" in $$props) $$invalidate(10, items = $$props.items);
    		if ("height" in $$props) $$invalidate(0, height = $$props.height);
    		if ("itemHeight" in $$props) $$invalidate(11, itemHeight = $$props.itemHeight);
    		if ("start" in $$props) $$invalidate(8, start = $$props.start);
    		if ("end" in $$props) $$invalidate(9, end = $$props.end);
    		if ("$$scope" in $$props) $$invalidate(20, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		tick,
    		items,
    		height,
    		itemHeight,
    		start,
    		end,
    		scrollToIndex,
    		height_map,
    		rows,
    		viewport,
    		contents,
    		viewport_height,
    		visible,
    		mounted,
    		top,
    		bottom,
    		average_height,
    		refreshReady,
    		refresh,
    		handle_scroll,
    		_scrollTo
    	});

    	$$self.$inject_state = $$props => {
    		if ("items" in $$props) $$invalidate(10, items = $$props.items);
    		if ("height" in $$props) $$invalidate(0, height = $$props.height);
    		if ("itemHeight" in $$props) $$invalidate(11, itemHeight = $$props.itemHeight);
    		if ("start" in $$props) $$invalidate(8, start = $$props.start);
    		if ("end" in $$props) $$invalidate(9, end = $$props.end);
    		if ("height_map" in $$props) height_map = $$props.height_map;
    		if ("rows" in $$props) rows = $$props.rows;
    		if ("viewport" in $$props) $$invalidate(1, viewport = $$props.viewport);
    		if ("contents" in $$props) $$invalidate(2, contents = $$props.contents);
    		if ("viewport_height" in $$props) $$invalidate(3, viewport_height = $$props.viewport_height);
    		if ("visible" in $$props) $$invalidate(4, visible = $$props.visible);
    		if ("mounted" in $$props) $$invalidate(15, mounted = $$props.mounted);
    		if ("top" in $$props) $$invalidate(5, top = $$props.top);
    		if ("bottom" in $$props) $$invalidate(6, bottom = $$props.bottom);
    		if ("average_height" in $$props) average_height = $$props.average_height;
    		if ("refreshReady" in $$props) refreshReady = $$props.refreshReady;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*items, start, end*/ 1792) {
    			 $$invalidate(4, visible = items.slice(start, end).map((data, i) => {
    				return { index: i + start, data };
    			}));
    		}

    		if ($$self.$$.dirty & /*mounted, items, viewport_height, itemHeight*/ 35848) {
    			// whenever `items` changes, invalidate the current heightmap
    			 if (mounted) refresh(items, viewport_height, itemHeight);
    		}
    	};

    	return [
    		height,
    		viewport,
    		contents,
    		viewport_height,
    		visible,
    		top,
    		bottom,
    		handle_scroll,
    		start,
    		end,
    		items,
    		itemHeight,
    		scrollToIndex,
    		height_map,
    		rows,
    		mounted,
    		average_height,
    		refreshReady,
    		refresh,
    		_scrollTo,
    		$$scope,
    		$$slots,
    		svelte_virtual_list_contents_binding,
    		svelte_virtual_list_viewport_binding,
    		svelte_virtual_list_viewport_elementresize_handler
    	];
    }

    class VirtualList extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			items: 10,
    			height: 0,
    			itemHeight: 11,
    			start: 8,
    			end: 9,
    			scrollToIndex: 12
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "VirtualList",
    			options,
    			id: create_fragment.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*items*/ ctx[10] === undefined && !("items" in props)) {
    			console.warn("<VirtualList> was created without expected prop 'items'");
    		}
    	}

    	get items() {
    		throw new Error("<VirtualList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<VirtualList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<VirtualList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<VirtualList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get itemHeight() {
    		throw new Error("<VirtualList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set itemHeight(value) {
    		throw new Error("<VirtualList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get start() {
    		throw new Error("<VirtualList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set start(value) {
    		throw new Error("<VirtualList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get end() {
    		throw new Error("<VirtualList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set end(value) {
    		throw new Error("<VirtualList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scrollToIndex() {
    		return this.$$.ctx[12];
    	}

    	set scrollToIndex(value) {
    		throw new Error("<VirtualList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/Playlist.svelte generated by Svelte v3.22.3 */
    const file$1 = "src/Playlist.svelte";

    // (101:37) 
    function create_if_block_5(ctx) {
    	let button;
    	let dispose;

    	function click_handler_3(...args) {
    		return /*click_handler_3*/ ctx[19](/*song*/ ctx[22], ...args);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "�+";
    			add_location(button, file$1, 101, 3, 2592);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", click_handler_3, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(101:37) ",
    		ctx
    	});

    	return block;
    }

    // (97:38) 
    function create_if_block_4(ctx) {
    	let button;
    	let dispose;

    	function click_handler_2(...args) {
    		return /*click_handler_2*/ ctx[18](/*song*/ ctx[22], ...args);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "5\u000f";
    			add_location(button, file$1, 97, 3, 2477);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", click_handler_2, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(97:38) ",
    		ctx
    	});

    	return block;
    }

    // (93:33) 
    function create_if_block_3(ctx) {
    	let button;
    	let dispose;

    	function click_handler_1(...args) {
    		return /*click_handler_1*/ ctx[17](/*song*/ ctx[22], ...args);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "5\u000f";
    			add_location(button, file$1, 93, 3, 2365);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", click_handler_1, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(93:33) ",
    		ctx
    	});

    	return block;
    }

    // (89:35) 
    function create_if_block_1(ctx) {
    	let button;
    	let dispose;

    	function select_block_type_1(ctx, dirty) {
    		if (/*isPaused*/ ctx[1]) return create_if_block_2;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if_block.c();
    			add_location(button, file$1, 89, 3, 2242);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			if_block.m(button, null);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", /*handlePlayPause*/ ctx[8], false, false, false);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type_1(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(button, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if_block.d();
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(89:35) ",
    		ctx
    	});

    	return block;
    }

    // (85:3) {#if song.type === PLAYED}
    function create_if_block(ctx) {
    	let button;
    	let dispose;

    	function click_handler(...args) {
    		return /*click_handler*/ ctx[16](/*song*/ ctx[22], ...args);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "�+";
    			add_location(button, file$1, 85, 3, 2129);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, button, anchor);
    			if (remount) dispose();
    			dispose = listen_dev(button, "click", click_handler, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(85:3) {#if song.type === PLAYED}",
    		ctx
    	});

    	return block;
    }

    // (91:19) {:else}
    function create_else_block(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("�\u000f");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(91:19) {:else}",
    		ctx
    	});

    	return block;
    }

    // (91:4) {#if isPaused}
    function create_if_block_2(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("�");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(91:4) {#if isPaused}",
    		ctx
    	});

    	return block;
    }

    // (77:1) <VirtualList items={completeList} let:item={song} bind:scrollToIndex>
    function create_default_slot(ctx) {
    	let li;
    	let span0;
    	let t0;
    	let span1;
    	let t1;
    	let span2;
    	let t2_value = /*song*/ ctx[22].name + "";
    	let t2;
    	let t3;
    	let span3;
    	let t4;
    	let li_class_value;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*song*/ ctx[22].type === PLAYED) return create_if_block;
    		if (/*song*/ ctx[22].type === CURRENT) return create_if_block_1;
    		if (/*song*/ ctx[22].type === QUEUE) return create_if_block_3;
    		if (/*song*/ ctx[22].type === PREV_QUEUE) return create_if_block_4;
    		if (/*song*/ ctx[22].type === REMAINING) return create_if_block_5;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	function dblclick_handler(...args) {
    		return /*dblclick_handler*/ ctx[20](/*song*/ ctx[22], ...args);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");
    			span0 = element("span");
    			t0 = space();
    			span1 = element("span");
    			t1 = space();
    			span2 = element("span");
    			t2 = text(t2_value);
    			t3 = space();
    			span3 = element("span");
    			t4 = space();
    			if (if_block) if_block.c();
    			attr_dev(span0, "class", "status-icon svelte-wfzh7r");
    			add_location(span0, file$1, 80, 3, 1957);
    			attr_dev(span1, "class", "spacer svelte-wfzh7r");
    			add_location(span1, file$1, 81, 3, 1994);
    			attr_dev(span2, "class", "name svelte-wfzh7r");
    			add_location(span2, file$1, 82, 3, 2026);
    			attr_dev(span3, "class", "spacer svelte-wfzh7r");
    			add_location(span3, file$1, 83, 3, 2067);
    			attr_dev(li, "class", li_class_value = "song " + /*song*/ ctx[22].type + " svelte-wfzh7r");
    			add_location(li, file$1, 77, 2, 1870);
    		},
    		m: function mount(target, anchor, remount) {
    			insert_dev(target, li, anchor);
    			append_dev(li, span0);
    			append_dev(li, t0);
    			append_dev(li, span1);
    			append_dev(li, t1);
    			append_dev(li, span2);
    			append_dev(span2, t2);
    			append_dev(li, t3);
    			append_dev(li, span3);
    			append_dev(li, t4);
    			if (if_block) if_block.m(li, null);
    			if (remount) dispose();
    			dispose = listen_dev(li, "dblclick", dblclick_handler, false, false, false);
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty & /*song*/ 4194304 && t2_value !== (t2_value = /*song*/ ctx[22].name + "")) set_data_dev(t2, t2_value);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(li, null);
    				}
    			}

    			if (dirty & /*song*/ 4194304 && li_class_value !== (li_class_value = "song " + /*song*/ ctx[22].type + " svelte-wfzh7r")) {
    				attr_dev(li, "class", li_class_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);

    			if (if_block) {
    				if_block.d();
    			}

    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(77:1) <VirtualList items={completeList} let:item={song} bind:scrollToIndex>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let ul;
    	let updating_scrollToIndex;
    	let current;

    	function virtuallist_scrollToIndex_binding(value) {
    		/*virtuallist_scrollToIndex_binding*/ ctx[21].call(null, value);
    	}

    	let virtuallist_props = {
    		items: /*completeList*/ ctx[6],
    		$$slots: {
    			default: [
    				create_default_slot,
    				({ item: song }) => ({ 22: song }),
    				({ item: song }) => song ? 4194304 : 0
    			]
    		},
    		$$scope: { ctx }
    	};

    	if (/*scrollToIndex*/ ctx[0] !== void 0) {
    		virtuallist_props.scrollToIndex = /*scrollToIndex*/ ctx[0];
    	}

    	const virtuallist = new VirtualList({ props: virtuallist_props, $$inline: true });
    	binding_callbacks.push(() => bind(virtuallist, "scrollToIndex", virtuallist_scrollToIndex_binding));

    	const block = {
    		c: function create() {
    			ul = element("ul");
    			create_component(virtuallist.$$.fragment);
    			attr_dev(ul, "class", "playlist svelte-wfzh7r");
    			add_location(ul, file$1, 75, 0, 1775);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);
    			mount_component(virtuallist, ul, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const virtuallist_changes = {};
    			if (dirty & /*completeList*/ 64) virtuallist_changes.items = /*completeList*/ ctx[6];

    			if (dirty & /*$$scope, song, previous, isPaused, next, nextPrev, remaining*/ 12582974) {
    				virtuallist_changes.$$scope = { dirty, ctx };
    			}

    			if (!updating_scrollToIndex && dirty & /*scrollToIndex*/ 1) {
    				updating_scrollToIndex = true;
    				virtuallist_changes.scrollToIndex = /*scrollToIndex*/ ctx[0];
    				add_flush_callback(() => updating_scrollToIndex = false);
    			}

    			virtuallist.$set(virtuallist_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(virtuallist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(virtuallist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);
    			destroy_component(virtuallist);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $playerStore;
    	validate_store(playerStore, "playerStore");
    	component_subscribe($$self, playerStore, $$value => $$invalidate(10, $playerStore = $$value));
    	let autoscroll = false;
    	let scrollToIndex;

    	function scrollToCurrent() {
    		const filterRemoved = !filterText;

    		if (autoscroll || filterRemoved) {
    			let index = completeList.indexOf(current);
    			if (index > 0) index -= 1; //move current a bit to center
    			scrollToIndex(index);
    		}
    	}

    	// Event handler
    	function handlePlay(event, song) {
    		play(song);
    		autoscroll = true;
    		window.getSelection().removeAllRanges();
    	} //audio.play()
    	// TODO audio.autoplay = true

    	function handleDblClick(e, song) {
    		jumpTo(song);
    	}

    	function handlePlayPause(event) {
    		playPause();
    	}

    	// Life cycle
    	afterUpdate(function (x) {
    		scrollToCurrent();
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Playlist> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("Playlist", $$slots, []);
    	const click_handler = (song, e) => queueSong(song, previous);
    	const click_handler_1 = (song, e) => resetSong(song, next);
    	const click_handler_2 = (song, e) => resetSong(song, nextPrev);
    	const click_handler_3 = (song, e) => queueSong(song, remaining);
    	const dblclick_handler = (song, e) => handleDblClick(e, song);

    	function virtuallist_scrollToIndex_binding(value) {
    		scrollToIndex = value;
    		$$invalidate(0, scrollToIndex);
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		afterUpdate,
    		tick,
    		flip,
    		fade,
    		VirtualList,
    		playerStore,
    		playPause,
    		play,
    		queueSong,
    		resetSong,
    		jumpTo,
    		PLAYED,
    		CURRENT,
    		QUEUE,
    		PREV_QUEUE,
    		REMAINING,
    		send,
    		receive,
    		filterListByName,
    		addType,
    		autoscroll,
    		scrollToIndex,
    		scrollToCurrent,
    		handlePlay,
    		handleDblClick,
    		handlePlayPause,
    		isPaused,
    		$playerStore,
    		isRandom,
    		filterText,
    		previous,
    		current,
    		next,
    		nextPrev,
    		remaining,
    		completeList
    	});

    	$$self.$inject_state = $$props => {
    		if ("autoscroll" in $$props) autoscroll = $$props.autoscroll;
    		if ("scrollToIndex" in $$props) $$invalidate(0, scrollToIndex = $$props.scrollToIndex);
    		if ("isPaused" in $$props) $$invalidate(1, isPaused = $$props.isPaused);
    		if ("isRandom" in $$props) isRandom = $$props.isRandom;
    		if ("filterText" in $$props) $$invalidate(12, filterText = $$props.filterText);
    		if ("previous" in $$props) $$invalidate(2, previous = $$props.previous);
    		if ("current" in $$props) $$invalidate(13, current = $$props.current);
    		if ("next" in $$props) $$invalidate(3, next = $$props.next);
    		if ("nextPrev" in $$props) $$invalidate(4, nextPrev = $$props.nextPrev);
    		if ("remaining" in $$props) $$invalidate(5, remaining = $$props.remaining);
    		if ("completeList" in $$props) $$invalidate(6, completeList = $$props.completeList);
    	};

    	let isPaused;
    	let isRandom;
    	let filterText;
    	let previous;
    	let current;
    	let next;
    	let nextPrev;
    	let remaining;
    	let completeList;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$playerStore*/ 1024) {
    			 $$invalidate(1, isPaused = $playerStore.paused);
    		}

    		if ($$self.$$.dirty & /*$playerStore*/ 1024) {
    			 isRandom = $playerStore.isRandom;
    		}

    		if ($$self.$$.dirty & /*$playerStore*/ 1024) {
    			 $$invalidate(12, filterText = $playerStore.filterText);
    		}

    		if ($$self.$$.dirty & /*$playerStore*/ 1024) {
    			 $$invalidate(2, previous = $playerStore.previous);
    		}

    		if ($$self.$$.dirty & /*$playerStore*/ 1024) {
    			 $$invalidate(13, current = $playerStore.current);
    		}

    		if ($$self.$$.dirty & /*$playerStore*/ 1024) {
    			 $$invalidate(3, next = $playerStore.next);
    		}

    		if ($$self.$$.dirty & /*$playerStore*/ 1024) {
    			 $$invalidate(4, nextPrev = $playerStore.nextPrev);
    		}

    		if ($$self.$$.dirty & /*$playerStore*/ 1024) {
    			 $$invalidate(5, remaining = $playerStore.remaining);
    		}

    		if ($$self.$$.dirty & /*previous, current, next, nextPrev, remaining, filterText*/ 12348) {
    			// Derived
    			 $$invalidate(6, completeList = filterListByName(
    				[
    					...previous.map(i => addType(i, PLAYED)),
    					addType(current, CURRENT),
    					...next.map(i => addType(i, QUEUE)),
    					...nextPrev.map(i => addType(i, PREV_QUEUE)),
    					...remaining.map(i => addType(i, REMAINING))
    				],
    				filterText
    			));
    		}
    	};

    	return [
    		scrollToIndex,
    		isPaused,
    		previous,
    		next,
    		nextPrev,
    		remaining,
    		completeList,
    		handleDblClick,
    		handlePlayPause,
    		autoscroll,
    		$playerStore,
    		isRandom,
    		filterText,
    		current,
    		scrollToCurrent,
    		handlePlay,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		dblclick_handler,
    		virtuallist_scrollToIndex_binding
    	];
    }

    class Playlist$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Playlist",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.22.3 */
    const file$2 = "src/App.svelte";

    // (70:2) {#if current}
    function create_if_block$1(ctx) {
    	let strong;
    	let t_value = /*current*/ ctx[2].name + "";
    	let t;

    	const block = {
    		c: function create() {
    			strong = element("strong");
    			t = text(t_value);
    			add_location(strong, file$2, 69, 15, 1884);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, strong, anchor);
    			append_dev(strong, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*current*/ 4 && t_value !== (t_value = /*current*/ ctx[2].name + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(strong);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(70:2) {#if current}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let link0;
    	let link1;
    	let link2;
    	let t0;
    	let div1;
    	let button0;
    	let i0;
    	let t2;
    	let t3;
    	let button1;
    	let t4;
    	let i1;
    	let t5_value = (/*isRandom*/ ctx[1] ? "=" : "�") + "";
    	let t5;
    	let t6;
    	let label;
    	let input0;
    	let t7;
    	let i2;
    	let t9;
    	let input1;
    	let t10;
    	let div0;
    	let t11;
    	let t12;
    	let t13;
    	let t14;
    	let t15;
    	let audio_1;
    	let audio_1_src_value;
    	let audio_1_is_paused = true;
    	let t16;
    	let current;
    	let dispose;
    	let if_block = /*current*/ ctx[2] && create_if_block$1(ctx);
    	const playlist = new Playlist$1({ $$inline: true });

    	const block = {
    		c: function create() {
    			link0 = element("link");
    			link1 = element("link");
    			link2 = element("link");
    			t0 = space();
    			div1 = element("div");
    			button0 = element("button");
    			i0 = element("i");
    			i0.textContent = "�";
    			t2 = text(" prev");
    			t3 = space();
    			button1 = element("button");
    			t4 = text("next ");
    			i1 = element("i");
    			t5 = text(t5_value);
    			t6 = space();
    			label = element("label");
    			input0 = element("input");
    			t7 = space();
    			i2 = element("i");
    			i2.textContent = "=";
    			t9 = space();
    			input1 = element("input");
    			t10 = space();
    			div0 = element("div");
    			t11 = text(/*currentCounter*/ ctx[3]);
    			t12 = text("/");
    			t13 = text(/*totalCount*/ ctx[4]);
    			t14 = space();
    			if (if_block) if_block.c();
    			t15 = space();
    			audio_1 = element("audio");
    			t16 = space();
    			create_component(playlist.$$.fragment);
    			attr_dev(link0, "rel", "stylesheet");
    			attr_dev(link0, "href", "//fonts.googleapis.com/css?family=Roboto:300,300italic,700,700italic");
    			add_location(link0, file$2, 48, 1, 1101);
    			attr_dev(link1, "rel", "stylesheet");
    			attr_dev(link1, "href", "//cdnjs.cloudflare.com/ajax/libs/normalize/5.0.0/normalize.css");
    			add_location(link1, file$2, 49, 1, 1202);
    			attr_dev(link2, "rel", "stylesheet");
    			attr_dev(link2, "href", "//cdnjs.cloudflare.com/ajax/libs/milligram/1.3.0/milligram.css");
    			add_location(link2, file$2, 50, 1, 1297);
    			add_location(i0, file$2, 54, 29, 1484);
    			attr_dev(button0, "class", "svelte-xl67qw");
    			add_location(button0, file$2, 54, 1, 1456);
    			add_location(i1, file$2, 55, 34, 1541);
    			attr_dev(button1, "class", "svelte-xl67qw");
    			add_location(button1, file$2, 55, 1, 1508);
    			attr_dev(input0, "type", "checkbox");
    			input0.checked = /*isRandom*/ ctx[1];
    			add_location(input0, file$2, 57, 2, 1605);
    			add_location(i2, file$2, 61, 2, 1693);
    			attr_dev(label, "class", "button");
    			add_location(label, file$2, 56, 1, 1580);
    			attr_dev(input1, "class", "search svelte-xl67qw");
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", "filter:");
    			add_location(input1, file$2, 63, 1, 1713);
    			attr_dev(div0, "class", "info svelte-xl67qw");
    			add_location(div0, file$2, 67, 1, 1812);
    			audio_1.autoplay = true;
    			audio_1.controls = true;
    			if (audio_1.src !== (audio_1_src_value = /*current*/ ctx[2] && /*current*/ ctx[2].src)) attr_dev(audio_1, "src", audio_1_src_value);
    			attr_dev(audio_1, "class", "svelte-xl67qw");
    			add_location(audio_1, file$2, 71, 1, 1930);
    			attr_dev(div1, "class", "controls svelte-xl67qw");
    			set_style(div1, "display", "normal");
    			add_location(div1, file$2, 53, 0, 1408);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor, remount) {
    			append_dev(document.head, link0);
    			append_dev(document.head, link1);
    			append_dev(document.head, link2);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, button0);
    			append_dev(button0, i0);
    			append_dev(button0, t2);
    			append_dev(div1, t3);
    			append_dev(div1, button1);
    			append_dev(button1, t4);
    			append_dev(button1, i1);
    			append_dev(i1, t5);
    			append_dev(div1, t6);
    			append_dev(div1, label);
    			append_dev(label, input0);
    			append_dev(label, t7);
    			append_dev(label, i2);
    			append_dev(div1, t9);
    			append_dev(div1, input1);
    			append_dev(div1, t10);
    			append_dev(div1, div0);
    			append_dev(div0, t11);
    			append_dev(div0, t12);
    			append_dev(div0, t13);
    			append_dev(div0, t14);
    			if (if_block) if_block.m(div0, null);
    			append_dev(div1, t15);
    			append_dev(div1, audio_1);
    			insert_dev(target, t16, anchor);
    			mount_component(playlist, target, anchor);
    			current = true;
    			if (remount) run_all(dispose);

    			dispose = [
    				listen_dev(button0, "click", playPrev, false, false, false),
    				listen_dev(button1, "click", playNext, false, false, false),
    				listen_dev(input0, "click", toggleRandom, false, false, false),
    				listen_dev(input1, "input", /*handleFilter*/ ctx[5], false, false, false),
    				listen_dev(audio_1, "play", /*audio_1_play_pause_handler*/ ctx[14]),
    				listen_dev(audio_1, "pause", /*audio_1_play_pause_handler*/ ctx[14]),
    				listen_dev(audio_1, "pause", /*handlePause*/ ctx[7], false, false, false),
    				listen_dev(audio_1, "play", /*handlePlay*/ ctx[6], false, false, false)
    			];
    		},
    		p: function update(ctx, [dirty]) {
    			if ((!current || dirty & /*isRandom*/ 2) && t5_value !== (t5_value = (/*isRandom*/ ctx[1] ? "=" : "�") + "")) set_data_dev(t5, t5_value);

    			if (!current || dirty & /*isRandom*/ 2) {
    				prop_dev(input0, "checked", /*isRandom*/ ctx[1]);
    			}

    			if (!current || dirty & /*currentCounter*/ 8) set_data_dev(t11, /*currentCounter*/ ctx[3]);
    			if (!current || dirty & /*totalCount*/ 16) set_data_dev(t13, /*totalCount*/ ctx[4]);

    			if (/*current*/ ctx[2]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (!current || dirty & /*current*/ 4 && audio_1.src !== (audio_1_src_value = /*current*/ ctx[2] && /*current*/ ctx[2].src)) {
    				attr_dev(audio_1, "src", audio_1_src_value);
    			}

    			if (dirty & /*paused*/ 1 && audio_1_is_paused !== (audio_1_is_paused = /*paused*/ ctx[0])) {
    				audio_1[audio_1_is_paused ? "pause" : "play"]();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(playlist.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(playlist.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(link0);
    			detach_dev(link1);
    			detach_dev(link2);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			if (if_block) if_block.d();
    			if (detaching) detach_dev(t16);
    			destroy_component(playlist, detaching);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let $playerStore;
    	validate_store(playerStore, "playerStore");
    	component_subscribe($$self, playerStore, $$value => $$invalidate(8, $playerStore = $$value));
    	let audio;

    	// event handler
    	const handleFilter = debounce(
    		function (event) {
    			setFilterText(event.target.value);
    		},
    		700
    	);

    	const handlePlay = () => {
    		playPause(true);
    	};

    	const handlePause = event => {
    		const { currentTime, duration } = event.target;
    		if (currentTime === duration) playNext(); else playPause(false);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;
    	validate_slots("App", $$slots, []);

    	function audio_1_play_pause_handler() {
    		paused = this.paused;
    		($$invalidate(0, paused), $$invalidate(8, $playerStore));
    	}

    	$$self.$capture_state = () => ({
    		onMount,
    		afterUpdate,
    		onDestroy,
    		playerStore,
    		playPause,
    		play,
    		playPrev,
    		playNext,
    		toggleRandom,
    		setFilterText,
    		Playlist: Playlist$1,
    		debounce,
    		sortByIndexId,
    		audio,
    		handleFilter,
    		handlePlay,
    		handlePause,
    		paused,
    		$playerStore,
    		isRandom,
    		previous,
    		current,
    		next,
    		nextPrev,
    		remaining,
    		currentCounter,
    		totalCount
    	});

    	$$self.$inject_state = $$props => {
    		if ("audio" in $$props) audio = $$props.audio;
    		if ("paused" in $$props) $$invalidate(0, paused = $$props.paused);
    		if ("isRandom" in $$props) $$invalidate(1, isRandom = $$props.isRandom);
    		if ("previous" in $$props) $$invalidate(9, previous = $$props.previous);
    		if ("current" in $$props) $$invalidate(2, current = $$props.current);
    		if ("next" in $$props) $$invalidate(10, next = $$props.next);
    		if ("nextPrev" in $$props) $$invalidate(11, nextPrev = $$props.nextPrev);
    		if ("remaining" in $$props) $$invalidate(12, remaining = $$props.remaining);
    		if ("currentCounter" in $$props) $$invalidate(3, currentCounter = $$props.currentCounter);
    		if ("totalCount" in $$props) $$invalidate(4, totalCount = $$props.totalCount);
    	};

    	let paused;
    	let isRandom;
    	let previous;
    	let current;
    	let next;
    	let nextPrev;
    	let remaining;
    	let currentCounter;
    	let totalCount;

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$playerStore*/ 256) {
    			 $$invalidate(0, paused = $playerStore.paused);
    		}

    		if ($$self.$$.dirty & /*$playerStore*/ 256) {
    			 $$invalidate(1, isRandom = $playerStore.isRandom);
    		}

    		if ($$self.$$.dirty & /*$playerStore*/ 256) {
    			 $$invalidate(9, previous = $playerStore.previous);
    		}

    		if ($$self.$$.dirty & /*$playerStore*/ 256) {
    			 $$invalidate(2, current = $playerStore.current);
    		}

    		if ($$self.$$.dirty & /*$playerStore*/ 256) {
    			 $$invalidate(10, next = $playerStore.next);
    		}

    		if ($$self.$$.dirty & /*$playerStore*/ 256) {
    			 $$invalidate(11, nextPrev = $playerStore.nextPrev);
    		}

    		if ($$self.$$.dirty & /*$playerStore*/ 256) {
    			 $$invalidate(12, remaining = $playerStore.remaining);
    		}

    		if ($$self.$$.dirty & /*previous, current*/ 516) {
    			// derived
    			 $$invalidate(3, currentCounter = previous.length + (current ? 1 : 0));
    		}

    		if ($$self.$$.dirty & /*currentCounter, next, nextPrev, remaining*/ 7176) {
    			 $$invalidate(4, totalCount = currentCounter + next.length + nextPrev.length + remaining.length);
    		}
    	};

    	return [
    		paused,
    		isRandom,
    		current,
    		currentCounter,
    		totalCount,
    		handleFilter,
    		handlePlay,
    		handlePause,
    		$playerStore,
    		previous,
    		next,
    		nextPrev,
    		remaining,
    		audio,
    		audio_1_play_pause_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    var app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
