import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useMessageStore } from './message'
import { useWWWAPI } from './apis/www'

export const useGroupStore = defineStore('Group', () => {
  const message = useMessageStore()
  const www = useWWWAPI()

  let list = ref({})

  async function toLoadListGroup() {
    message.toToggleLoading({
      text: 'memuat list group'
    })

    // reset list
    list.value = {}

    // load default group
    const listGroup = await www.getData(`/json/group.json?v=${window.config.VERSION_GROUP}`)

    if (listGroup) {
      for (var groupIndex in listGroup.groups) {
        const group = listGroup.groups[groupIndex]

        list.value[group.id] = group
      }
    }

    message.toToggleLoading({ display: false })
  }

  return {
    list,
    toLoadListGroup
  }
})
