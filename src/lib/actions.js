/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import useStore from './store'
import imageData from './imageData'
import gen from './llm'
import modes from './modes'

const get = useStore.getState
const set = useStore.setState
const model = 'gemini-2.5-flash-image'

export const init = () => {
  if (get().didInit) {
    return
  }

  set(state => {
    state.didInit = true
  })
}

export const snapPhoto = async b64 => {
  const id = crypto.randomUUID()
  const {activeMode, customPrompt} = get()
  imageData.inputs[id] = b64

  set(state => {
    state.photos.unshift({id, mode: activeMode, isBusy: true})
  })

  const result = await gen({
    model,
    prompt: activeMode === 'custom' ? customPrompt : modes[activeMode].prompt,
    inputFile: b64
  })

  imageData.outputs[id] = result

  set(state => {
    state.photos = state.photos.map(photo =>
      photo.id === id ? {...photo, isBusy: false} : photo
    )
  })
}

export const deletePhoto = id => {
  set(state => {
    state.photos = state.photos.filter(photo => photo.id !== id)
  })

  delete imageData.inputs[id]
  delete imageData.outputs[id]
}

export const setMode = mode =>
  set(state => {
    state.activeMode = mode
  })

export const setCustomPrompt = prompt =>
  set(state => {
    state.customPrompt = prompt
  })

init()
