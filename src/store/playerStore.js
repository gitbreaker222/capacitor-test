import { useStore } from "./svelteStore.js"
import { makeItem, sortByIndexId } from "../utils.js"
import { music } from "./data.js"

// constants
export const PLAYED = "PLAYED"
export const CURRENT = "CURRENT"
export const QUEUE = "QUEUE"
export const PREV_QUEUE = "PREV_QUEUE"
export const REMAINING = "REMAINING"

//helpers
const Playlist = function (n) {
  if (n) {
    const collection = []
    for (var i = 0; i < n; i += 1) {
      collection.push('Song ' + i)
    }
    return collection.map(makeItem)
  }
  return music.map(makeItem)
}

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

const [storeIn, storeOut] = useStore(new State(), { name: "playerStore" })
export const playerStore = storeOut


// Private Functions
const _resetList = () =>
  storeIn.update(function _resetList(state) {
    return { ...state, previous: [], remaining: new Playlist() }
  })

const _removeFromList = (song, origin) =>
  storeIn.update(function _removeFromList(state) {
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

export const playPause = (isPlay) => {
  return storeIn.update(function playPause(state) {
    let { paused } = state

    if (isPlay != null) paused = !isPlay
    else paused = !paused

    return { ...state, paused }
  })
}

export const play = (song, prev = false) => {
  let { paused } = storeOut.get()

  if (!paused) playPause()

  return storeIn.update(function play(state) {
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

  return storeIn.update(function playPrevUpdateList(state) {
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

  storeIn.update(function playNextUpdateList(state) {
    return { ...state, isRandom, next, nextPrev, remaining }
  })
}

export const toggleRandom = () =>
  storeIn.update(function toggleRandom(state) {
    let { isRandom } = state
    return { ...state, isRandom: !isRandom }
  })

export const setFilterText = (filterText) => {
  storeIn.update(function setFilterText(state) {
    return { ...state, filterText }
  })
}

export const resetSong = (song, origin) => {
  _removeFromList(song, origin)

  storeIn.update(function resetSong(state) {
    let { remaining } = state

    remaining = [...remaining]
    remaining.push(song)
    remaining.sort(sortByIndexId)

    return { ...state, remaining }
  })
}

export const queueSong = (song, origin) => {
  _removeFromList(song, origin)

  return storeIn.update(function queueSong(state) {
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
      return storeIn.update(function jumpToPrevious(state) {
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
      storeIn.update(function jumpToNextPrev(state) {
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
      return storeIn.update(function jumpToRemaining(state) {
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