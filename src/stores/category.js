import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useMessageStore } from './message'
import { useWWWAPI } from './apis/www'

export const useCategoryStore = defineStore('Category', () => {
  const message = useMessageStore()
  const www = useWWWAPI()

  let list = ref({})

  async function toLoadListCategory() {
    message.toToggleLoading({
      text: 'memuat list category'
    })

    // reset list
    list.value = {}

    // load default category
    const listCategory = await www.getData(`/json/category.json?v=${window.config.VERSION_CATEGORY}`)

    if (listCategory) {
      for (var categoryIndex in listCategory.categories) {
        const category = listCategory.categories[categoryIndex]

        list.value[category.id] = category
      }
    }

    message.toToggleLoading({ display: false })
  }

  return {
    list,
    toLoadListCategory
  }
})
