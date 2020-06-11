import { settingsStore } from "../store/settingsStore.js";
//import { audioExtensions } from "../utils.js";



async function pathsToFlatFileList(filePaths = []) {
  const fs = require('fs');
  const { promisify } = require('bluebird');
  const readdirAboslute = require('readdir-absolute');
  const readdir = promisify(readdirAboslute);

  const audioPattern = /\.(mp3|ogg|wav|mp4|m4a|flac)$/

  async function readNextLevel(_filePaths = []) {

    return _filePaths.reduce(async (currentList, path) => {
      currentList = await currentList
      if (fs.lstatSync(path).isDirectory()) {
        let nextFilePaths = await readdir(path)
        nextFilePaths = await readNextLevel(nextFilePaths)
        currentList.splice(currentList.length - 1, 0, ...nextFilePaths)
      } else if (audioPattern.test(path)) {
        currentList.push(path)
      }
      return currentList
    }, [])
  }

  const finalList = await readNextLevel(filePaths)

  return finalList
}

const openDialog = () => {
  const { mainWindow, dialog } = require('electron').remote;

  const properties = [
    'openDirectory',
    'multiSelections'
  ];

  return dialog.showOpenDialog(mainWindow, {
    properties,
    // filters: [
    //   { name: 'Audio Files', extensions: audioExtensions },
    // ]
  });
}

export const loadMusic = async () => {
  const { platform } = settingsStore.get()

  let fileList

  if (platform === 'web') {
    const response = await fetch('assets/music.json')
    fileList = await response.json()
  } else if (platform === 'electron') {
    const result = await openDialog()
    const { filePaths } = result

    if (!filePaths) return;

    fileList = await pathsToFlatFileList(filePaths)
  }

  return fileList
}