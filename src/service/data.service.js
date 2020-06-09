import { Plugins } from '@capacitor/core';
import { audioExtensions } from "../utils.js";

const { Device } = Plugins;

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
    filters: [
      { name: 'Audio Files', extensions: audioExtensions },
    ]
  });
}

export const loadMusic = async () => {
  const info = await Device.getInfo();
  const { platform } = info

  let source

  if (platform === 'web') {
    const response = await fetch('assets/music.json')
    source = await response.json()
  } else if (platform === 'electron') {
    //const { mainWindow } = require('electron').remote;
    //const isDev = require('electron-is-dev');
    //const path = require('path');
    const fs = require('fs');
    const { promisify } = require('bluebird');
    const readdirAboslute = require('readdir-absolute');
    const readdir = promisify(readdirAboslute);

    const result = await openDialog()
    let { filePaths } = result
    //filePaths ["/home/lexon222/Musik"]

    if (!filePaths) return;

    filePaths = filePaths.map(path => {
      if (fs.lstatSync(path).isDirectory()) return readdir(path);
      else return Promise.resolve(path);
    });

    console.log(filePaths);

    await Promise.all(filePaths).then(values => {
      console.log('###', values);
      /**
       * values
       * 
        0: "/home/lexon222/Musik/Various Artists"
        1: "/home/lexon222/Musik/Vvilderness"
        2: "/home/lexon222/Musik/drumloopm01 (Kopie).ogg"
        3: "/home/lexon222/Musik/drumloopm01.m4a"
        4: "/home/lexon222/Musik/drumloopm01.ogg"
        5: "/home/lexon222/Musik/metal app developer (m.a.d.).mp3"
        6: "/home/lexon222/Musik/metal app developer (m.a.d.).ogg"
        7: "/home/lexon222/Musik/radios.xspf"
       */

      if (values.length === 1) values[0] = [values[0]];
      const filteredPaths = flatten(values)
        .filter(path => /\.(mp3|ogg|wav|mp4|m4a|flac)$/.test(path));
      //mainWindow.webContents.send('files:open', filteredPaths);
      source = filteredPaths
    });
  }

  console.log('#+#', platform, source);
  return source
}