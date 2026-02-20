let currentModel = null

export function setModel(model, scene) {
  if (currentModel) {
    scene.remove(currentModel)
    currentModel.traverse(o => {
      if (o.geometry) o.geometry.dispose()
    })
  }

  currentModel = model
  scene.add(model)
}
