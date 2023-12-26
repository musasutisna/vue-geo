import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useMessageStore } from './message'
import { useWWWAPI } from './apis/www'
import { useMapStore } from './map'

export const useBasemapStore = defineStore('Basemap', () => {
  const message = useMessageStore()
  const www = useWWWAPI()
  const map = useMapStore()

  const list = ref({})
  const active = ref({})
  const initial = ref({})

  async function toLoadListBasemap(req, res) {
    message.toToggleLoading({
      text: 'memuat list basemap'
    })

    // reset list
    list.value = {}

    // load default basemap
    const listBasemap = await www.getData(`/json/basemap.json?v=${window.config.VERSION_BASEMAP}`)

    if (listBasemap) {
      for (var basemapIndex in listBasemap.basemap) {
        const basemap = listBasemap.basemap[basemapIndex]

        list.value[basemap.id] = basemap
      }
    }

    message.toToggleLoading({ display: false })
  }

  function getInitialBasemap() {
    if (initial.id) return initial.value

    for (var basemapId in list.value) {
      if (list.value[basemapId].config.default) {
        initial.value = list.value[basemapId]

        return initial.value
      }
    }

    return null
  }

  function setActiveBasemap(basemapId) {
    if (list.value[basemapId]) {
      active.value = list.value[basemapId]

      map.arcgis.setBasemap(active.value.config)
    }
  }

  return {
    list,
    active,
    initial,
    toLoadListBasemap,
    getInitialBasemap,
    setActiveBasemap
  }
})
