import axios from 'axios'

export const api = axios.create({
  baseURL: window.config.BASEURL_API
})

export const www = axios.create({
  baseURL: window.config.BASEURL_WWW
})
