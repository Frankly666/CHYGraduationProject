import {
  __commonJS
} from "./chunk-P2LSHJDD.js";

// ../../../UniAppProjects/CHYGraduationProject/node_modules/component-emitter/index.js
var require_component_emitter = __commonJS({
  "../../../UniAppProjects/CHYGraduationProject/node_modules/component-emitter/index.js"(exports, module) {
    function Emitter(object) {
      if (object) {
        return mixin(object);
      }
      this._callbacks = /* @__PURE__ */ new Map();
    }
    function mixin(object) {
      Object.assign(object, Emitter.prototype);
      object._callbacks = /* @__PURE__ */ new Map();
      return object;
    }
    Emitter.prototype.on = function(event, listener) {
      const callbacks = this._callbacks.get(event) ?? [];
      callbacks.push(listener);
      this._callbacks.set(event, callbacks);
      return this;
    };
    Emitter.prototype.once = function(event, listener) {
      const on = (...arguments_) => {
        this.off(event, on);
        listener.apply(this, arguments_);
      };
      on.fn = listener;
      this.on(event, on);
      return this;
    };
    Emitter.prototype.off = function(event, listener) {
      if (event === void 0 && listener === void 0) {
        this._callbacks.clear();
        return this;
      }
      if (listener === void 0) {
        this._callbacks.delete(event);
        return this;
      }
      const callbacks = this._callbacks.get(event);
      if (callbacks) {
        for (const [index, callback] of callbacks.entries()) {
          if (callback === listener || callback.fn === listener) {
            callbacks.splice(index, 1);
            break;
          }
        }
        if (callbacks.length === 0) {
          this._callbacks.delete(event);
        } else {
          this._callbacks.set(event, callbacks);
        }
      }
      return this;
    };
    Emitter.prototype.emit = function(event, ...arguments_) {
      const callbacks = this._callbacks.get(event);
      if (callbacks) {
        const callbacksCopy = [...callbacks];
        for (const callback of callbacksCopy) {
          callback.apply(this, arguments_);
        }
      }
      return this;
    };
    Emitter.prototype.listeners = function(event) {
      return this._callbacks.get(event) ?? [];
    };
    Emitter.prototype.listenerCount = function(event) {
      if (event) {
        return this.listeners(event).length;
      }
      let totalCount = 0;
      for (const callbacks of this._callbacks.values()) {
        totalCount += callbacks.length;
      }
      return totalCount;
    };
    Emitter.prototype.hasListeners = function(event) {
      return this.listenerCount(event) > 0;
    };
    Emitter.prototype.addEventListener = Emitter.prototype.on;
    Emitter.prototype.removeListener = Emitter.prototype.off;
    Emitter.prototype.removeEventListener = Emitter.prototype.off;
    Emitter.prototype.removeAllListeners = Emitter.prototype.off;
    if (typeof module !== "undefined") {
      module.exports = Emitter;
    }
  }
});

// ../../../UniAppProjects/CHYGraduationProject/node_modules/stream/index.js
var require_stream = __commonJS({
  "../../../UniAppProjects/CHYGraduationProject/node_modules/stream/index.js"(exports, module) {
    var Emitter = require_component_emitter();
    function Stream() {
      Emitter.call(this);
    }
    Stream.prototype = new Emitter();
    module.exports = Stream;
    Stream.Stream = Stream;
    Stream.prototype.pipe = function(dest, options) {
      var source = this;
      function ondata(chunk) {
        if (dest.writable) {
          if (false === dest.write(chunk) && source.pause) {
            source.pause();
          }
        }
      }
      source.on("data", ondata);
      function ondrain() {
        if (source.readable && source.resume) {
          source.resume();
        }
      }
      dest.on("drain", ondrain);
      if (!dest._isStdio && (!options || options.end !== false)) {
        source.on("end", onend);
        source.on("close", onclose);
      }
      var didOnEnd = false;
      function onend() {
        if (didOnEnd)
          return;
        didOnEnd = true;
        dest.end();
      }
      function onclose() {
        if (didOnEnd)
          return;
        didOnEnd = true;
        if (typeof dest.destroy === "function")
          dest.destroy();
      }
      function onerror(er) {
        cleanup();
        if (!this.hasListeners("error")) {
          throw er;
        }
      }
      source.on("error", onerror);
      dest.on("error", onerror);
      function cleanup() {
        source.off("data", ondata);
        dest.off("drain", ondrain);
        source.off("end", onend);
        source.off("close", onclose);
        source.off("error", onerror);
        dest.off("error", onerror);
        source.off("end", cleanup);
        source.off("close", cleanup);
        dest.off("end", cleanup);
        dest.off("close", cleanup);
      }
      source.on("end", cleanup);
      source.on("close", cleanup);
      dest.on("end", cleanup);
      dest.on("close", cleanup);
      dest.emit("pipe", source);
      return dest;
    };
  }
});
export default require_stream();
//# sourceMappingURL=stream.js.map
