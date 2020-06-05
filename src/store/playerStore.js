import { useStore } from "./svelteStore.js"
import { Playlist, sortByIndexId } from "../utils.js"
import {
  PLAYED,
  CURRENT,
  QUEUE,
  PREV_QUEUE,
  REMAINING
} from '../constants.js'
import { loadMusic } from "../service/data.service.js"

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
    remaining: [],
  }
}

const [storeIn, storeOut] = useStore(new State(), { name: "playerStore" })
export const playerStore = storeOut


// Private Functions
const _resetList = () =>
  storeIn.update('_resetList', state => {
    return { ...state, previous: [], remaining: new Playlist() }
  })

const _removeFromList = (song, origin) =>
  storeIn.update('_removeFromList', state => {
    let { previous, next, nextPrev, remaining } = state

    const filteredList = origin.filter(i => i !== song)
    if (origin === next) {
      next = [...filteredList]
    } else if (origin === nextPrev) {
      nextPrev = [...filteredList]
    } else if (origin === remaining) {
      remaining = [...filteredList]
    } else if (origin === previous) {
      previous = [...filteredList]
    }

    return { ...state, previous, next, nextPrev, remaining }
  })

// Actions
export function reset() {
  return storeIn.set(new State())
}

export const load = async () => {
  storeIn.update('load', async state => {
    const list = await loadMusic()
    //const remaining = new Playlist(1000)
    const remaining = new Playlist(list)
    return { ...state, remaining }
  })
}

export function setPaused(value = true) {
  return storeIn.update('setPaused', state => {
    return { ...state, paused: value }
  })
}

export function playPause() {
  storeIn.update(state => {
    let { paused } = state

    return { ...state, paused: !paused }
  }, this.name)
}

export const play = (song, prev = false) => {
  let { paused } = storeOut.get()

  if (!paused) setPaused(true)

  return storeIn.update('play', state => {
    let { current, previous, nextPrev, paused } = state

    if (current && !prev) previous = previous.concat(current)
    if (current && prev) nextPrev = [current].concat(nextPrev)
    current = { ...song }
    paused = false

    return { ...state, current, previous, nextPrev, paused }
  })
}

export const playPrev = () => {
  let { previous } = storeOut.get()

  if (previous.length) {
    previous = [...previous]
    const lastItem = previous.pop()
    play(lastItem, { prev: true })
  }

  return storeIn.update('playPrevUpdateList', state => {
    return { ...state, previous }
  })
}

export const playNext = () => {
  let { isRandom, next, nextPrev, remaining } = storeOut.get()

  if (next.length) {
    next = [...next]
    play(next.shift())
  } else if (nextPrev.length) {
    nextPrev = [...nextPrev]
    play(nextPrev.shift())
  } else if (remaining.length && !isRandom) {
    remaining = [...remaining]
    play(remaining.shift())
  } else if (remaining.length) {
    remaining = [...remaining]
    const randomIndex = Math.floor(Math.random() * remaining.length)
    play(remaining.splice(randomIndex, 1)[0])
  } else {
    play()
    _resetList()
    remaining = [...remaining]
    const nextSong = remaining.shift()
    play(nextSong) //if repeat
  }

  storeIn.update('playNextUpdateList', state => {
    return { ...state, isRandom, next, nextPrev, remaining }
  })
}

export const toggleRandom = () =>
  storeIn.update('toggleRandom', state => {
    let { isRandom } = state
    return { ...state, isRandom: !isRandom }
  })

export const setFilterText = (filterText) => {
  storeIn.update('setFilterText', state => {
    return { ...state, filterText }
  })
}

export const resetSong = (song, origin) => {
  _removeFromList(song, origin)

  storeIn.update('resetSong', state => {
    let { remaining } = state

    remaining = [...remaining]
    remaining.push(song)
    remaining.sort(sortByIndexId)

    return { ...state, remaining }
  })
}

export const queueSong = (song, origin) => {
  _removeFromList(song, origin)

  return storeIn.update('queueSong', state => {
    let { next } = state

    next = [...next]
    next.push(song)

    return { ...state, next }
  })
}

export const jumpTo = (song) => {
  let {
    previous: _previous,
    next: _next,
    nextPrev: _nextPrev,
    remaining: _remaining,
  } = storeOut.get()

  const { type } = song
  let index
  let rSlice = []

  switch (type) {
    case PLAYED:
      index = _previous.indexOf(song)
      _removeFromList(song, _previous)
      play(song)
      return storeIn.update('jumpToPrevious', state => {
        let { previous, nextPrev } = state
        previous = [...previous]
        const songsBetweenSelectedAndCurrent = previous.splice(index)
        nextPrev = [...songsBetweenSelectedAndCurrent, ...nextPrev]
        return { ...state, previous, nextPrev }
      })

    case QUEUE:
      _removeFromList(song, _next)
      return play(song)

    case PREV_QUEUE:
      index = _nextPrev.indexOf(song)
      _removeFromList(song, _nextPrev)
      storeIn.update('jumpToNextPrev', state => {
        let { previous, nextPrev } = state

        nextPrev = [...nextPrev]
        previous = [...previous, ...nextPrev.splice(0, index)]

        return { ...state, previous, nextPrev }
      })
      return play(song)

    case REMAINING:
      index = _remaining.indexOf(song)
      _removeFromList(song, _remaining)
      play(song)
      return storeIn.update('jumpToRemaining', state => {
        let { isRandom, remaining, previous, nextPrev } = state

        if (!isRandom) {
          remaining = [...remaining]
          rSlice = remaining.splice(0, index)
        }
        previous = [...previous, ...nextPrev, ...rSlice]
        if (nextPrev.length) nextPrev = []

        return { ...state, isRandom, remaining, previous, nextPrev }
      })

    case CURRENT:
      return

    default:
      console.error(`not defined: ${type}`)
  }
}