import { music } from './data.js'

export const loadMusic = () => {
  return fetch('')
    //.then(response => response.json())
    //.then(data => console.log(data))
    .then(() => {
      return music
    });
}