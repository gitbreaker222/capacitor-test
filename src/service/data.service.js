import { settingsStore } from "../store/settingsStore.js";
//import { audioExtensions } from "../utils.js";

const flatten = array => {
  /**
   * in [ 1, [2], "3", [4, [5], {id: 6, x: [7]}] ]
   * out [ 1, 2, "3" ,4 ,5 , {id: 6, x: [7]}]
   */
  let flatted = [];
  for (let i = 0; i < array.length; i++) {
    const currentItem = array[i]

    if (Array.isArray(currentItem)) {
      flatted = flatted.concat(flatten(currentItem));
    }
    else flatted.push(currentItem);
  }
  return flatted;
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
    //const { mainWindow } = require('electron').remote;
    //const isDev = require('electron-is-dev');
    //const path = require('path');
    const fs = require('fs');
    const { promisify } = require('bluebird');
    const readdirAboslute = require('readdir-absolute');
    const readdir = promisify(readdirAboslute);

    //const result = await openDialog()
    //const { filePaths } = result
    const filePaths = ["/home/lexon222/Musik"] //dev

    if (!filePaths) return;

    // readContent
    const readfilePaths = filePaths.map(path => {
      /**
        [
          "/home/lexon222/Musik/Various Artists"
          "/home/lexon222/Musik/Vvilderness"
          "/home/lexon222/Musik/drumloopm01.m4a"
          "/home/lexon222/Musik/drumloopm01.ogg"
          "/home/lexon222/Musik/metal app developer (m.a.d.).mp3"
          "/home/lexon222/Musik/metal app developer (m.a.d.).ogg"
          "/home/lexon222/Musik/radios.xspf"
        ]
       */
      if (fs.lstatSync(path).isDirectory()) return readdir(path);
      else return Promise.resolve(path);
    });

    console.log('readdir result', readfilePaths);

    await Promise.all(readfilePaths).then(values => {
      const filteredPaths = flatten(values)
        .filter(path => /\.(mp3|ogg|wav|mp4|m4a|flac)$/.test(path));
      //mainWindow.webContents.send('files:open', filteredPaths);
      fileList = filteredPaths
    });
  }

  console.log('#+#', platform, fileList);

  return fileList
}