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
  let sources = ref({})
  let search = ref({})
  let geojson = ref({})

  async function toLoadListLayer() {
    message.toToggleLoading({
      text: 'memuat list layer'
    })

    // reset list
    list.value = {}
    categories.value = {}
    groups.value = {}
    sources = {}
    search = {}
    geojson = {}

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
          search[layerIndex] = layer.config.search
        }

        if (layer.config.geojson) {
          geojson[layerIndex] = layer.config.geojson
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

    if (typeof sources[layerIndex] === 'undefined') {
      map.arcgis.loadLayer(layer, (source) => {
        if (source) {
          sources[layerIndex] = source
        }

        message.toToggleLoading({ display: false })
      })
    } else if (sources[layerIndex]) {
      if (layer.config.enable !== 'scale') {
        sources[layerIndex].minScale = 279541132.0143589
      } else {
        sources[layerIndex].minScale = layer.config.min_scale
      }

      sources[layerIndex].visible = layer.config.enable === 'on' || layer.config.enable === 'scale' ? true : false

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
    for (var layerIndex in sources) {
      if (list.value[layerIndex].content === contentName) {
        await toggleLayer(layerIndex, force)
      }
    }
  }

  function toChangeOpacity(layerIndex, opacityLevel) {
    if (sources[layerIndex]) {
      sources[layerIndex].opacity = opacityLevel / 100
    }

    list.value[layerIndex].config.opacity = opacityLevel
  }

  function getLayerFromSource(layerSource) {
    for (var layerIndex in sources) {
      if (sources[layerIndex] === layerSource) {
        return list.value[layerIndex]
      }
    }

    return null
  }

  function generateRequestUrl(config, properties) {
    let CQL_FILTER = `CQL_FILTER=${config.query || ''}`
    let PROPERTY_FILTER = 'property_filter='

    if (config.property_load) {
      PROPERTY_FILTER += `(${searchConfig.property_load.toString()})`
    }

    if (config.property_scope) {
      for (var property of config.property_scope) {
        CQL_FILTER = CQL_FILTER.replaceAll(`$${property}`, properties[property])
      }
    }

    CQL_FILTER = window.decodeURIComponent(CQL_FILTER)

    return `${config.url}&${CQL_FILTER}&${PROPERTY_FILTER}`
  }

  async function toSearch(query) {
    message.toToggleLoading({
      text: 'mencari data'
    })

    const results = {}

    for (var layerIndex in search) {
      const searchConfig = search[layerIndex]

      let CQL_FILTER = `CQL_FILTER=${window.encodeURIComponent(searchConfig?.query?.replaceAll(new RegExp('\\$query', 'ig'), query))}`
      let PROPERTY_FILTER = 'propertyName='

      if (searchConfig.property_load) {
        PROPERTY_FILTER += `(${searchConfig.property_load.toString()})`
      }

      try {
        const searchRequest = await map.arcgis.request(`${searchConfig.url}&${CQL_FILTER}&${PROPERTY_FILTER}`, {
          responseType: 'json'
        })

        if (searchRequest.data && searchRequest.data.features) {
          if (searchConfig.label) {
            for (var featureIndex in searchRequest.data.features) {
              let label = ''

              for (var l of searchConfig.label) {
                for (var lIndex in l) {
                  if (l[lIndex] === 'prop') {
                    label += searchRequest.data.features[featureIndex].properties[lIndex] + ' '
                  } else {
                    label += lIndex
                  }
                }
              }

              searchRequest.data.features[featureIndex].label = label
            }

            results[layerIndex] = searchRequest.data.features
          }
        }
      } catch(err) {
        console.error(`store.layer.toSearch : ${err.message}`)
      }
    }

    message.toToggleLoading({ display: false })

    return results
  }

  async function toLoadGeojson(layerIndex, properties) {
    message.toToggleLoading({
      text: 'memuat data'
    })

    let result = null

    if (geojson[layerIndex]) {
      const geojsonConfig = list.value[layerIndex].config.geojson
      const geojsonUrl = generateRequestUrl(geojsonConfig, properties)

      try {
        const geojsonRequest = await map.arcgis.request(geojsonUrl, {
          responseType: 'json'
        })

        if (geojsonRequest.data && geojsonRequest.data.features) {
          result = geojsonRequest.data
        }
      } catch (err) {
        console.error(`store.layer.toLoadGeojson: ${err.message}`)
      }
    }

    message.toToggleLoading({ display: false })

    return result
  }

  async function toAddGeojson(layerIndex, featureIndex, properties, cb = null) {
    message.toToggleLoading({
      text: 'memuat data'
    })

    if (geojson[layerIndex]) {
      const geojsonConfig = geojson[layerIndex]
      const geojsonUrl = await generateRequestUrl(geojsonConfig, properties)

      map.arcgis.loadLayer({
        type: 'geojson',
        config: {
          ...geojsonConfig.config,
          url: geojsonUrl
        }
      }, (source) => {
        if (source) {
          sources[`${layerIndex}_${featureIndex}`] = source

          cb(source)
        }
      })
    }

    message.toToggleLoading({ display: false })
  }

  return {
    list,
    categories,
    group,
    sources,
    search,
    geojson,
    toLoadListLayer,
    toggleLayer,
    toggleGroup,
    toggleContent,
    toChangeOpacity,
    getLayerFromSource,
    generateRequestUrl,
    toSearch,
    toLoadGeojson,
    toAddGeojson
  }
})
