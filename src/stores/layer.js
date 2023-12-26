import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useMessageStore } from './message'
import { useWWWAPI } from './apis/www'
import { useMapStore } from './map'
import { useGroupStore } from './group'

export const useLayerStore = defineStore('Layer', () => {
  const message = useMessageStore()
  const www = useWWWAPI()
  const map = useMapStore()
  const group = useGroupStore()

  const list = ref({})
  const categories = ref({})
  const groups = ref({})
  const sources = ref({})
  const search = ref({})

  async function toLoadListLayer() {
    message.toToggleLoading({
      text: 'memuat list layer'
    })

    // reset list
    list.value = {}
    categories.value = {}
    groups.value = {}
    sources.value = {}
    search.value = {}

    // layer start from zero
    var layerIndex = 0

    // load default layer
    const defaultLayer = await www.getData(`/json/layer.json?v=${window.config.VERSION_LAYER}`)

    if (defaultLayer) {
      for (var defaultIndex in defaultLayer.layers) {
        const layer = defaultLayer.layers[defaultIndex]

        if (typeof categories.value[layer.category] === 'undefined') {
          categories.value[layer.category] = []
        }

        if (typeof groups.value[layer.group] === 'undefined') {
          groups.value[layer.group] = []
        }

        layer.index = layerIndex
        list.value[layerIndex] = layer

        categories.value[layer.category][layer.config.order] = layer
        groups.value[layer.group][layer.config.order_group] = layer

        if (layer.config.enable === 'on' || layer.config.enable === 'scale') {
          await toggleLayer(layerIndex, layer.config.enable)
        }

        if (layer.config.search) {
          search.value[layerIndex] = layer.config.search
        }

        layerIndex += 1
      }
    }

    message.toToggleLoading({ display: false })
  }

  async function toggleLayer(layerIndex, force = null) {
    message.toToggleLoading({
      text: 'memuat layer'
    })

    const layer = list.value[layerIndex]

    if (force !== null) {
      layer.config.enable = force
    } else if (layer.config.enable === 'on' && layer.config.min_scale) {
      layer.config.enable = 'scale'
    } else if (layer.config.enable === 'on') {
      layer.config.enable = 'off'
    } else if (layer.config.enable === 'scale') {
      layer.config.enable = 'off'
    } else if (layer.config.enable === 'off') {
      layer.config.enable = 'on'
    }

    if (typeof sources.value[layerIndex] === 'undefined') {
      map.arcgis.loadLayer(layer, (source) => {
        if (source) {
          sources.value[layerIndex] = source
        }

        message.toToggleLoading({ display: false })
      })
    } else if (sources.value[layerIndex]) {
      if (layer.config.enable !== 'scale') {
        sources.value[layerIndex].minScale = 279541132.0143589
      } else {
        sources.value[layerIndex].minScale = layer.config.min_scale
      }

      sources.value[layerIndex].visible = layer.config.enable === 'on' || layer.config.enable === 'scale' ? true : false

      message.toToggleLoading({ display: false })
    }
  }

  async function toggleGroup(groupName, force = null) {
    for (var groupIndex in group.list) {
      const selectedGroup = group.list[groupIndex]

      if (selectedGroup.name === groupName) {
        selectedGroup.enable = force  !== null ? force : !selectedGroup.enable

        if (groups.value[groupName]) {
          for (var groupOrder in groups.value[groupName]) {
            const selectedLayer = groups.value[groupName][groupOrder]

            if (selectedLayer) {
              await toggleLayer(selectedLayer.index, selectedGroup.enable)
            }
          }
        }

        break
      }
    }
  }

  async function toggleContent(contentName, force = null) {
    for (var layerIndex in sources.value) {
      if (list.value[layerIndex].content === contentName) {
        await toggleLayer(layerIndex, force)
      }
    }
  }

  function getLayerFromSource(layerSource) {
    for (var layerIndex in sources.value) {
      if (sources.value[layerIndex] === layerSource) {
        return list.value[layerIndex]
      }
    }

    return null
  }

  async function toSearch(query) {
    message.toToggleLoading({
      text: 'mencari data'
    })

    const results = {}

    for (var layerIndex in search.value) {
      const searchConfig = search.value[layerIndex]

      let CQL_FILTER = `CQL_FILTER=${window.encodeURIComponent(searchConfig?.query?.replaceAll(new RegExp('\\$query', 'ig'), query))}`
      let PROPERTY_FILTER = 'propertyName='

      if (searchConfig.property) {
        for (var propertyName of searchConfig.property) {
          PROPERTY_FILTER += `(${propertyName})`
        }
      }

      map.arcgis.request(`${searchConfig.url}&${CQL_FILTER}&${PROPERTY_FILTER}`, {
        responseType: 'json'
      }).then((res) => {
        if (res.data && res.data.features) {
          if (searchConfig.label) {
            for (var featureIndex in res.data.features) {
              let label = ''

              for (var l of searchConfig.label) {
                for (var lIndex in l) {
                  if (l[lIndex] === 'prop') {
                    label += res.data.features[featureIndex].properties[lIndex] + ' '
                  } else {
                    label += lIndex
                  }
                }
              }

              res.data.features[featureIndex].label = label
            }

            results[layerIndex] = res.data.features
          }
        }
      }).catch((err) => {
        console.error(`store.layer.toSearch : ${err.message}`)
      })
    }

    message.toToggleLoading({ display: false })

    return results
  }

  return {
    list,
    categories,
    toLoadListLayer,
    toggleLayer,
    toggleGroup,
    toggleContent,
    getLayerFromSource,
    toSearch
  }
})
