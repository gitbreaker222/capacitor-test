/* SVELTE STORE */
/* https://github.com/gitbreaker222/SvelteStore */
import { writable } from "svelte/store"

// TODO put settings on window, so they can always be changed via terminal ?
const settings = {
  devEnv: true, // TODO get from build parameter
  tickLog: true,
  loopGuard: true, //TODO use flag
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
]

const deepCopy = value => JSON.parse(JSON.stringify(value))

const checkSpelling = (state, _state) => {
  const correctKeys = Object.keys(state)
  const _keys = Object.keys(_state).every(key => {
    const match = correctKeys.indexOf(key) >= 0
    if (!match) {
      console.debug(correctKeys)
      console.warn(`[SvelteStore] Spelling seems incorrect for "${key}"
(Check debug logs for available keys)`)
    }
    return match
  })
}

const checkType = (value, newValue, name = "") => {
  const t1 = typeof value
  const t2 = typeof newValue
  if (t1 !== t2) {
    console.log(...logPrefix)
    console.warn(`Type warning: ${name} Expected ${t1}, got ${t2}`)
  }
}

// setup tickLog
// https://stackoverflow.com/questions/6343450/generating-sound-on-the-fly-with-javascript-html5#16573282
// https://marcgg.com/blog/2016/11/01/javascript-audio/
const audioCtx = new AudioContext()

const tickLog = async () => {
  const duration = .1
  const freq = 1 / duration

  let osc = audioCtx.createOscillator()
  osc.type = "sawtooth"
  osc.frequency.value = freq

  let vol = audioCtx.createGain()
  vol.gain.value = 0.05

  osc.connect(vol)
  vol.connect(audioCtx.destination)

  osc.start()
  osc.stop(audioCtx.currentTime + duration)
}

const logUpdate = (state, newState, action, storeName) => {
  const _state = {}
  const _newState = {}

  Object.keys(state)
    .filter(key => state[key] !== newState[key])
    .map(key => {
      _state[key] = state[key]
      _newState[key] = newState[key]
    })

  const update = {
    before: _state,
    after: _newState
  }

  console.log(...logPrefix, action || 'Unnamed action')
  console.groupCollapsed(
    `State changed. Open for details`
  )
  console.table(update)
  console.groupEnd()
  if (settings.tickLog) tickLog()
  try {
    sessionStorage.setItem(
      `svelteStore ${storeName}`,
      JSON.stringify(newState)
    )
  } catch (e) {
    console.debug("sessionStorage needs Same-Origin-Policy to work")
  }
}

const persistRead = (name) => (
  JSON.parse(localStorage.getItem(name))
)
const persistWrite = (name, state) => (
  localStorage.setItem(name, JSON.stringify(state))
)

const loopGuard = {
  index: new Map(),
  register: function (action) {
    const now = Date.now()
    const repeatDelay = 150 // A bit faster than fast clicks
    const totalDelay = 3000
    const entryExeedsAt = this.index.get(action)
    const blockFlag = -1
    let expirationTime = 0
    let isExpired = true

    const forgetAfter = (delay, proofTime) => {
      window.setTimeout(() => {
        const currentEntry = this.index.get(action)

        if (currentEntry === proofTime) {
          this.index.delete(action)
        } else {
          console.debug(...logPrefix, 'Possible infinite loop:', action)
        }
      }, delay)
    }

    if (entryExeedsAt === blockFlag) return isExpired

    if (!entryExeedsAt) {
      expirationTime = now + totalDelay
    } else {
      expirationTime = entryExeedsAt - 1
    }

    isExpired = expirationTime < now

    if (isExpired) {
      expirationTime = blockFlag

      console.error(...logPrefix, 'Infinite loop detected:', action)
      throw new Error(`
      Action has been called repeatedly
      with an interval of less than ${repeatDelay}
      and within a max time frame of ${totalDelay}
      `)
    }
    this.index.set(action, expirationTime)
    forgetAfter(repeatDelay, expirationTime)

    return isExpired
  }
}


export const useStore = (state, opts) => {
  const {
    name = "unnamed state",
    persist = false,
  } = opts
  const persistName = `svelteStore.${name}`
  if (persist) {
    const persistedState = persistRead(persistName)
    if (persistedState) state = persistedState
    else persistWrite(persistName, state)
  }
  console.info(name, state)
  const initialState = settings.devEnv ? deepCopy(state) : null
  const { subscribe, update, set } = writable(state)
  let currentState = { ...state }

  const interceptUpdate = (actionName, callback) => {
    let callbackResult
    update(state => {
      try {
        if (settings.loopGuard) loopGuard.register(actionName)
      } catch (error) {
        console.error(error);
        return state
      }

      callbackResult = callback(state)

      function main(_state, asyncResolved = false) {
        if (settings.devEnv) {
          checkSpelling(initialState, _state)
          Object.keys(initialState).map(key => {
            checkType(initialState[key], _state[key], key)
          })
          logUpdate(state, _state, actionName, name)
        }

        currentState = { ..._state }
        if (persist) persistWrite(persistName, currentState)
        if (asyncResolved) set(currentState)
        else return currentState
      }

      if (callbackResult instanceof Promise) {
        callbackResult.then(result => main(result, true))
        return currentState
      }
      return main(callbackResult)
    })
    return callbackResult
  }

  const interceptSet = (newState) => {
    interceptUpdate(() => newState)
  }

  const get = () => currentState

  const storeIn = { update: interceptUpdate, set: interceptSet }
  const storeOut = { subscribe, get }
  return [storeIn, storeOut]
}
