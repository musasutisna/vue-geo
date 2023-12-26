const BASEURL = import.meta.env.VITE_BASEURL
const BASEURL_API = import.meta.env.VITE_BASEURL_API
const BASEURL_GEOSERVER = import.meta.env.VITE_BASEURL_GEOSERVER
const BASEURL_WWW = import.meta.env.VITE_BASEURL_WWWW
const VERSION_BASEMAP = import.meta.VITE_VERSION_BASEMAP
const VERSION_CATEGORY = import.meta.VITE_VERSION_CATEGORY
const VERSION_GROUP = import.meta.VITE_VERSION_GROUP
const VERSION_LAYER = import.meta.VITE_VERSION_LAYER
const VERSION_LEGEND = import.meta.VITE_VERSION_LEGEND

window.config = {
  BASEURL,
  BASEURL_API,
  BASEURL_GEOSERVER,
  BASEURL_WWW,
  VERSION_BASEMAP,
  VERSION_CATEGORY,
  VERSION_GROUP,
  VERSION_LAYER,
  VERSION_LEGEND
}