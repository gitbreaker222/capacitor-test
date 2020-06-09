import { useStore } from "./svelteStore.js"

// State
function State() {
  return {

  }
}

const [storeIn, storeOut] = useStore(new State(), { name: "playerStore" })
export const playerStore = storeOut


// Actions
export function reset() {
  return storeIn.set(new State())
}
