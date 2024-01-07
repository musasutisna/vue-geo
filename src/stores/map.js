import { reactive, watch } from 'vue'
import { defineStore } from 'pinia'
import { loadModules } from 'esri-loader'
import { useBasemapStore } from './basemap'

export const useMapStore = defineStore('Map', () => {
  const basemap = useBasemapStore()

   /**
   * Arcgis configuration.
   *
   * @map         Instance of arcgis map.
   * @view        Instance of arcgis map viewer for interactive web map.
   * @hitResult   Current selected object point
   */
   const arcgis = {
    map: null,
    view: null,
    hitResult: null,
    loadBasemap: null,
    setBasemap: null,
    loadLayer: null,
    addLayer: null,
    removeLayer: null,
    createQueryBBOX: null,
    getCurrentZoomLevel: null,
    goTo: null,
    location: null,
    request: null
  }

  /**
   * Current map control options.
   */
  const mapControl = reactive({
    zoom: 6,
    scale: 8735660.375,
    center: [118.54148354886968, -0.7015339181837845],
    bound: {
      south_west_lng: null,
      south_west_lat: null,
      north_east_lng: null,
      north_east_lat: null
    }
  })

  function toInitMap(domMap) {
    // set map width first by actual parent map
    domMap.style.width = `${domMap.parentNode.offsetWidth}px`
    domMap.style.height = `${domMap.parentNode.offsetHeight}px`

    return new Promise((res, rej) => {
      loadModules([
        'esri/Basemap',
        'esri/Map',
        'esri/views/MapView',
        'esri/layers/WMTSLayer',
        'esri/layers/MapImageLayer',
        'esri/layers/WMSLayer',
        'esri/layers/GeoJSONLayer',
        'esri/widgets/Locate',
        'esri/geometry/Point',
        'esri/geometry/support/geodesicUtils',
        'esri/config',
        'esri/request',
        'esri/widgets/ScaleBar'
      ], {
        version: '4.28'
      }).then(async ([
        Basemap,
        Map,
        MapView,
        WMTSLayer,
        MapImageLayer,
        WMSLayer,
        GeoJSONLayer,
        Locate,
        Point,
        geodesicUtils,
        esriConfig,
        request,
        ScaleBar
      ]) => {
        arcgis.loadBasemap = function (basemapConfig) {
          if (basemapConfig.type === 'MapServer') {
            return new Basemap({
              baseLayers: [
                new WMTSLayer({
                  id: basemapConfig.id,
                  url: basemapConfig.url,
                  activeLayer: basemapConfig.activeLayer,
                  version: basemapConfig.version
                })
              ]
            })
          } else {
            return basemapConfig.url
          }
        }

        arcgis.setBasemap = function (basemapConfig) {
          arcgis.map.basemap = arcgis.loadBasemap(basemapConfig)
        }

        arcgis.loadLayer = function (layerConfig, cb) {
          let source = null

          if (layerConfig.type === 'image') {
            esriConfig.request.proxyUrl = layerConfig.config.proxy

            const imageConfig = {
              url: layerConfig.config.url,
              sublayers: [{
                id: layerConfig.config.id,
                visible: true
              }],
              opacity: layerConfig.config.opacity / 100
            }

            if (layerConfig.config.enable === 'scale') {
              imageConfig.minScale = layerConfig.config.min_scale,
              imageConfig.maxScale = layerConfig.config.max_scale
            }

            source = new MapImageLayer(imageConfig)
          } else if (layerConfig.type === 'wms') {
            const wmsConfig = {
              url: layerConfig.config.url,
              sublayers: [{
                name: layerConfig.config.name
              }],
              customParameters: {
                CQL_FILTER: layerConfig.cql_filter
              },
              opacity: layerConfig.config.opacity / 100
            }

            if (layerConfig.config.enable === 'scale') {
              wmsConfig.minScale = layerConfig.config.min_scale,
              wmsConfig.maxScale = layerConfig.config.max_scale
            }

            source = new WMSLayer(wmsConfig)
          } else if (layerConfig.type === 'geojson') {
            const geojsonConfig = {
              url: layerConfig.config.url,
              outFields: ['*'],
              featureReduction: { ...layerConfig.config.feature_reduction },
              renderer: { ...layerConfig.config.renderer },
              labelingInfo: { ...layerConfig.config.labelingInfo },
              opacity: layerConfig.config.opacity / 100,
              customParameters: { ...layerConfig.config.customParameters }
            }

            if (layerConfig.config.enable === 'scale') {
              geojsonConfig.minScale = layerConfig.config.min_scale,
              geojsonConfig.maxScale = layerConfig.config.max_scale
            }

            source = new GeoJSONLayer(geojsonConfig)
          }

          if (source) {
            arcgis.addLayer(source, layerConfig.config.zindex)
          }

          cb(source)
        }

        arcgis.addLayer = function (source, index = null) {
          arcgis.map.add(source, index)
        }

        arcgis.removeLayer = function (source) {
          arcgis.map.remove(source)
        }

        arcgis.createQueryBBOX = function (longitude, latitude) {
          const level = arcgis.getCurrentZoomLevel()
          const radius = [102000,101000,100000,90000,80000,70000,60000,50000,20000,20000,10000,5000,2000,1000,500,200,100,50,20,10,5,5,2,2]
          const latlonMin = geodesicUtils.pointFromDistance(new Point({ x: longitude, y: latitude }), radius[level], 225)
          const latlonMax = geodesicUtils.pointFromDistance(new Point({ x: longitude, y: latitude }), radius[level], 45)

          return `bbox=${latlonMin.longitude},${latlonMin.latitude},${latlonMax.longitude},${latlonMax.latitude}&width=101&height=101&x=50&y=50`
        }

        arcgis.getCurrentZoomLevel = function () {
          let step = 0
          let scale = arcgis.view.scale

          while (scale <= 279541132) {
            scale = scale * 2
            step++

            if (step >= 30) break;
          }

          return step
        }

        arcgis.goTo = function (source) {
          source.queryExtent().then(sourceExtent => {
            arcgis.view.goTo(sourceExtent.extent)
          })
        }

        arcgis.location = new Locate({
          view: arcgis.view,
          iconClass: 'esri-icon-navigation'
        })

        arcgis.request = request

        arcgis.map = new Map({
          layers: []
        })

        arcgis.view = new MapView({
          container: domMap,
          map: arcgis.map,
          zoom: mapControl.zoom,
          scale: mapControl.scale,
          center: mapControl.center,
          ui: {
            components: [
              'attribution'
            ]
          }
        })

        const scaleBar = new ScaleBar({
          view: arcgis.view,
          visible: true,
          unit: 'metric',
          style: 'line'
        })

        arcgis.view.ui.add(scaleBar, {
          position: 'bottom-left'
        })

        arcgis.view.on('click', onClick)

        arcgis.view.watch('updating', (updating) => {
          if (updating) {
            // in updating
          } else {
            // update completed
          }
        })
      })
      .then(res)
      .catch(rej)
    })
  }

  function onClick(e) {
    arcgis.view.hitTest(e).then(async (response) => {
      const hitResult = response.results[0]

      if (typeof hitResult !== 'undefined' && hitResult.type === 'graphic') {
        arcgis.hitResult = hitResult
      }
    })
  }

  async function toZoomIn() {
    const newZoom = mapControl.zoom + 1
    const newScale = mapControl.scale / 2

    mapControl.zoom = newZoom
    mapControl.scale = newScale

    arcgis.view.goTo({
      zoom: newZoom,
      scale: newScale
    }).then(() => {

    })
  }

  async function toZoomOut() {
    const newZoom = mapControl.zoom - 1
    const newScale = mapControl.scale * 2

    mapControl.zoom = newZoom
    mapControl.scale = newScale

    arcgis.view.goTo({
      zoom: newZoom,
      scale: newScale
    }).then(() => {

    })
  }

  function toLocation() {
    arcgis.location()
  }

  function toCenter() {
    arcgis.view.goTo({
      zoom: 6,
      scale: 8735660.375,
      center: [118.54148354886968, -0.7015339181837845]
    })
  }

  return {
    arcgis,
    mapControl,
    toInitMap,
    toZoomIn,
    toZoomOut,
    toLocation,
    toCenter
  }
})
