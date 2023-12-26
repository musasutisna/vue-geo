import { defineStore } from 'pinia'
import { www } from '@/libs/axios'
import { useMessageStore } from '@/stores/message'

export const useWWWAPI = defineStore('WWWAPI', () => {
  const message = useMessageStore()

  async function getData(url, config = null, showErr = true) {
    let result = null

    try {
      result = await www.get(url, config)
    } catch (err) {
      if (showErr) {
        message.toToggleWarning({
          display: true,
          close: true,
          icon: 'warning',
          text: err.response.data?.message || err.message
        })
      }
    }

    return result !== null ? (result?.data || null) : null
  }

  return {
    getData
  }
})
