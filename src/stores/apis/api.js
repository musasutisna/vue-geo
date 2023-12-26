import { defineStore } from 'pinia'
import { api } from '@/libs/axios'
import Axios from './axios'

export const useProviderAPI = defineStore('API', () => {
  const token = window.localStorage.getItem('token')
  const axios = Axios(api, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })

  return axios
})
