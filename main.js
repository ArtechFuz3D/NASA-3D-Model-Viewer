const select = document.getElementById('modelSelect')

const EXTENSIONS = ['glb', 'gltf', 'fbx', 'stl', '3ds']

async function fetchNASAModels() {
  const res = await fetch(
    'https://api.github.com/repos/nasa/NASA-3D-Resources/git/trees/master?recursive=1'
  )
  const data = await res.json()

  return data.tree.filter(item =>
    EXTENSIONS.some(ext => item.path.toLowerCase().endsWith(ext))
  )
}

function rawURL(path) {
  return `https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/${path}`
}

export async function populateDropdown(onSelect) {
  const models = await fetchNASAModels()

  select.innerHTML = ''

  models.forEach(model => {
    const option = document.createElement('option')
    option.value = rawURL(model.path)
    option.textContent = model.path.split('/').pop()
    select.appendChild(option)
  })

  select.addEventListener('change', e => {
    onSelect(e.target.value)
  })

  // auto-load first model
  onSelect(select.value)
}
