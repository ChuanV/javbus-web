(function () {
  const form = document.getElementById('searchForm')
  const input = document.getElementById('keyword')
  const results = document.getElementById('results')
  const searchInfo = document.getElementById('searchInfo')
  const pagination = document.getElementById('pagination')
  const searchBtn = document.getElementById('searchBtn')

  let currentKeyword = ''
  let currentPage = 1

  const originalBtnText = searchBtn ? searchBtn.textContent : '查询'
  function setLoading(v) {
    if (searchBtn) {
      searchBtn.disabled = v
      searchBtn.textContent = v ? '加载中...' : originalBtnText
    }
  }

  function showSkeleton() {
    results.innerHTML = ''
    for (let i = 0; i < 3; i++) {
      const card = document.createElement('div')
      card.className = 'skeleton-card'
      card.innerHTML = `
        <div class="skeleton skeleton-img"></div>
        <div class="skeleton-text">
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line"></div>
          <div class="skeleton skeleton-line"></div>
        </div>`
      results.appendChild(card)
    }
  }

  function renderMovieCard(movie) {
    const el = document.createElement('div')
    el.className = 'movie'

    const poster = document.createElement('div')
    poster.className = 'poster'
    const bg = movie.urlImage || movie.url || movie.img || '/icon.png'
    poster.style.backgroundImage = `url(/image/getImage?url=${movie.img})`
    poster.setAttribute('aria-label', movie.title)

    const meta = document.createElement('div')
    meta.className = 'meta'

    // Title row
    const titleDiv = document.createElement('div')
    titleDiv.className = 'title'
    titleDiv.textContent = movie.title

    const idBadge = document.createElement('span')
    idBadge.className = 'id-badge'
    idBadge.textContent = movie.id
    titleDiv.appendChild(idBadge)

    // Date
    const dateDiv = document.createElement('div')
    dateDiv.className = 'date'
    dateDiv.textContent = movie.date || '日期未知'

    // Tags
    const tagsDiv = document.createElement('div')
    tagsDiv.className = 'tags'
    if (movie.tags && movie.tags.length) {
      movie.tags.forEach(t => {
        const tag = document.createElement('span')
        tag.className = 'tag'
        tag.textContent = t
        tagsDiv.appendChild(tag)
      })
    }

    // Detail button — navigates to dedicated detail page
    const detailBtn = document.createElement('button')
    detailBtn.className = 'btn-secondary btn-sm btn-detail'
    detailBtn.textContent = '查看详情'
    detailBtn.addEventListener('click', () => {
      window.location.href = '/movie/' + encodeURIComponent(movie.id)
    })

    meta.appendChild(titleDiv)
    meta.appendChild(dateDiv)
    meta.appendChild(tagsDiv)
    meta.appendChild(detailBtn)

    el.appendChild(poster)
    el.appendChild(meta)
    return el
  }

  function escHtml(s) {
    const d = document.createElement('div')
    d.textContent = s
    return d.innerHTML
  }

  async function doSearch(keyword, page) {
    currentKeyword = keyword
    currentPage = page || 1
    searchInfo.textContent = ''
    pagination.innerHTML = ''
    showSkeleton()
    setLoading(true)

    try {
      const res = await fetch(`/api/movies/search?keyword=${encodeURIComponent(keyword)}&page=${currentPage}&magnet=all`)
      if (!res.ok) throw new Error('查询失败')
      const data = await res.json()
      const movies = data.movies || []

      results.innerHTML = ''

      if (!movies.length) {
        searchInfo.textContent = ''
        results.innerHTML = '<div class="empty-state">未找到相关影片</div>'
        return
      }

      // Search info
      const paginationData = data.pagination
      searchInfo.textContent = `找到 ${movies.length} 部影片` +
        (paginationData ? ` (第 ${paginationData.currentPage} 页)` : '')

      // Render movies
      const fragment = document.createDocumentFragment()
      for (const m of movies) {
        fragment.appendChild(renderMovieCard(m))
      }
      results.appendChild(fragment)

      // Pagination
      if (paginationData) {
        renderPagination(paginationData)
      }
    } catch (err) {
      results.innerHTML = '<div class="error-state">查询出错: ' + escHtml(err.message || err) + '</div>'
    } finally {
      setLoading(false)
    }
  }

  function renderPagination(p) {
    pagination.innerHTML = ''

    if (!p || (!p.hasNextPage && p.currentPage <= 1)) return

    const prevBtn = document.createElement('button')
    prevBtn.className = 'btn-secondary btn-sm'
    prevBtn.textContent = '上一页'
    prevBtn.disabled = p.currentPage <= 1
    prevBtn.addEventListener('click', () => {
      if (p.currentPage > 1) doSearch(currentKeyword, p.currentPage - 1)
    })

    const pageInfo = document.createElement('span')
    pageInfo.className = 'page-info'
    pageInfo.textContent = `第 ${p.currentPage} 页`

    const nextBtn = document.createElement('button')
    nextBtn.className = 'btn-secondary btn-sm'
    nextBtn.textContent = '下一页'
    nextBtn.disabled = !p.hasNextPage
    nextBtn.addEventListener('click', () => {
      if (p.hasNextPage) doSearch(currentKeyword, p.nextPage || p.currentPage + 1)
    })

    pagination.appendChild(prevBtn)
    pagination.appendChild(pageInfo)
    pagination.appendChild(nextBtn)
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const kw = input.value.trim()
    if (!kw) return
    doSearch(kw, 1)
  })
})()
