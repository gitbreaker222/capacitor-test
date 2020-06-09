import { Plugins } from '@capacitor/core';
import { useStore } from "./svelteStore.js"

const { Device } = Plugins;


// State
function State() {
  return {
    platform: '', // web, electron
  }
}

const [storeIn, storeOut] = useStore(new State(), {
  name: "settingsStore",
  persist: true,
})
export const settingsStore = storeOut


// Actions
export function reset() {
  return storeIn.set('reset', new State())
}

export async function getDeviceInfo() {
  return storeIn.update('getDeviceInfo', async (state) => {
    const info = await Device.getInfo()
    const { platform } = info

    return { ...state, platform }
  })
}