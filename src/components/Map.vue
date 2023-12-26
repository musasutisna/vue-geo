<script setup>
import { onMounted, ref } from 'vue'
import { useMapStore } from '@/stores/map'
import { useBasemapStore } from '@/stores/basemap'
import { useCategoryStore } from '@/stores/category'
import { useGroupStore } from '@/stores/group'
import { useLayerStore } from '@/stores/layer'

const map = useMapStore()
const basemap = useBasemapStore()
const category = useCategoryStore()
const group = useGroupStore()
const layer = useLayerStore()
const domMap = ref(null)

onMounted(async () => {
  map.toInitMap(domMap.value)
    .then(async () => {
      // load basemap list
      await basemap.toLoadListBasemap()

      // set default basemap as active basemap
      const initialBasemap = basemap.getInitialBasemap()

      if (initialBasemap) {
        basemap.setActiveBasemap(initialBasemap.id)
      }

      // load list categories
      await category.toLoadListCategory()

      // load list groups
      await group.toLoadListGroup()

      // load list layers
      await layer.toLoadListLayer()

      await layer.toSearch('BUKIT TUTA')
    })
})
</script>

<template>
  <div ref="domMap"></div>
</template>

<style>
@import url('https://js.arcgis.com/4.19/esri/themes/light/main.css');
</style>
