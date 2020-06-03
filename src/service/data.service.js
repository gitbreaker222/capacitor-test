import { Plugins } from '@capacitor/core';
import { music } from './data.js'

const { Device } = Plugins;

const openDialog = () => {
  const { mainWindow, dialog } = require('electron').remote;

  const properties = [
    'openDirectory',
    'multiSelections'
  ];

  return dialog.showOpenDialog(mainWindow, {
    properties,
    filters: [
      { name: 'Audio Files', extensions: ['mp3', 'ogg', 'wav', 'mp4', 'm4a', 'flac'] },
    ]
  });
}

export const loadMusic = async () => {
  const info = await Device.getInfo();
  console.log(info);
  const { platform } = info

  let source

  if (platform === 'web') {
    source = await fetch('') //TODO music.json
    //.then(response => response.json())
    //.then(data => console.log(data))

    source = music
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
    const flatten = arr => {
      let flatted = [];
      for (let i = 0; i < arr.length; i++) {
        if (Array.isArray(arr[i])) {
          flatted = flatted.concat(flatten(arr[i]));
        } else flatted.push(arr[i]);
      }
      return flatted;
    }
    filePaths = filePaths.map(path => {
      console.log('+++', fs.lstatSync(path).isDirectory());

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