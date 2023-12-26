import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useMessageStore } from './message'
import { useWWWAPI } from './apis/www'

export const useLegendStore = defineStore('Legend', () => {
  const message = useMessageStore()
  const www = useWWWAPI()

  const list = ref({})

  async function toLoadListLegend() {
    message.toToggleLoading({
      text: 'memuat list legend'
    })

    const listLegend = await www.getData(`/geojson/legend?v=${window.config.VERSION_LEGEND}`)

    if (listLegend) {
      list.value = listLegend.legends
    }

    message.toToggleLoading({ display: false })
  }

  return {
    list,
    toLoadListLegend
  }
})
