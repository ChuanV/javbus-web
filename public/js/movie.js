(function () {
  var BASE = window.__API_BASE__ || '';

  var content = document.getElementById('content');

  // Extract movie ID from URL path: /movie/CODE
  var pathParts = window.location.pathname.replace(/\/+$/, '').split('/');
  var code = pathParts[pathParts.length - 1];
  if (code === 'movie') code = ''; // at /movie without an id

  // ---- Helpers ----

  function escHtml(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function showSkeleton() {
    content.innerHTML =
      '<div class="skeleton-full">' +
      '<div class="skeleton skeleton-cover"></div>' +
      '<div class="skeleton-body">' +
      '<div class="skeleton skeleton-line"></div>' +
      '<div class="skeleton skeleton-line"></div>' +
      '<div class="skeleton skeleton-line"></div>' +
      '<div class="skeleton skeleton-line"></div>' +
      '<div class="skeleton skeleton-line"></div>' +
      '<div class="skeleton skeleton-line"></div>' +
      '</div>' +
      '</div>';
  }

  function showError(msg, retryFn) {
    content.innerHTML =
      '<div class="error-state">' + escHtml(msg) +
      '<br><button type="button" class="btn-primary btn-sm retry-btn" style="margin-top:8px">重试</button></div>';
    content.querySelector('.retry-btn').addEventListener('click', retryFn);
  }

  function showEmpty() {
    content.innerHTML = '<div class="empty-state">请在 URL 中提供番号，例如：<code>/movie/IPX-585</code></div>';
  }

  function renderMagnetsHtml(mags) {
    var html = '';
    for (var i = 0; i < mags.length; i++) {
      var m = mags[i];
      html += '<div class="magnet-item">';
      html += '<span class="magnet-title"><a href="' + m.link + '" target="_blank" rel="noopener">' + escHtml(m.title) + '</a></span>';
      html += '<span class="magnet-meta">' + (m.size || '') + '</span>';
      if (m.isHD) html += '<span class="magnet-badge hd">高清</span>';
      if (m.hasSubtitle) html += '<span class="magnet-badge sub">字幕</span>';
      html += '<span class="magnet-meta">' + (m.shareDate || '') + '</span>';
      html += '<button type="button" class="btn-copy" data-link="' + escHtml(m.link) + '">复制</button>';
      html += '</div>';
    }
    return html;
  }

  async function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      var ok = document.execCommand('copy');
      document.body.removeChild(ta);
      if (!ok) throw new Error('execCommand failed');
    } catch (err) {
      document.body.removeChild(ta);
      throw err;
    }
  }

  function attachCopyDelegation(el) {
    el.addEventListener('click', function (ev) {
      var btn = ev.target.closest ? ev.target.closest('.btn-copy') : null;
      if (!btn) return;
      var link = btn.dataset.link;
      if (!link) return;
      var orig = btn.textContent;
      copyToClipboard(link).then(function () {
        btn.textContent = '已复制';
        setTimeout(function () { btn.textContent = orig; }, 1500);
      }).catch(function () {
        btn.textContent = '复制失败';
        setTimeout(function () { btn.textContent = orig; }, 1500);
      });
    });
  }

  // ---- Lazy loading cover image ----

  function lazyLoadCover(el, src) {
    if (!src) return;
    var observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        el.style.backgroundImage = 'url(' + src + ')';
        observer.unobserve(el);
        observer.disconnect();
      }
    }, { rootMargin: '200px' });
    observer.observe(el);
  }

  // ---- Main ----

  async function loadDetail(codeToLoad) {
    if (!codeToLoad) {
      showEmpty();
      return;
    }

    showSkeleton();
    document.title = codeToLoad + ' - 影片详情 - JavBus API';

    try {
      // Phase 1: fetch detail
      var detailUrl = BASE + '/api/movies/' + encodeURIComponent(codeToLoad);
      var detailRes = await fetch(detailUrl);
      if (!detailRes.ok) {
        if (detailRes.status === 404) {
          content.innerHTML = '<div class="empty-state">未找到影片: ' + escHtml(codeToLoad) + '</div>';
          return;
        }
        throw new Error('获取详情失败 (' + detailRes.status + ')');
      }
      var detail = await detailRes.json();

      // Phase 2: fetch magnets if gid/uc available
      var magnets = [];
      if (detail.gid && detail.uc) {
        var magnetsUrl = BASE + '/api/magnets/' + encodeURIComponent(codeToLoad) +
          '?gid=' + encodeURIComponent(detail.gid) + '&uc=' + encodeURIComponent(detail.uc);
        try {
          var magsRes = await fetch(magnetsUrl);
          if (magsRes.ok) {
            magnets = await magsRes.json();
          }
        } catch (e) {
          // magnets are optional
        }
      }

      // Build HTML
      var html = '<div class="detail-card">';

      // Cover
      var coverSrc = detail.urlImage || detail.img || '';
      html += '<div class="cover" id="detailCover" aria-label="' + escHtml(detail.title) + '"></div>';

      // Body
      html += '<div class="detail-body">';
      html += '<div class="movie-title">' + escHtml(detail.title) + '</div>';
      html += '<span class="movie-id">' + escHtml(detail.id) + '<button type="button" class="btn-copy" data-link="' + escHtml(detail.id) + '" style="margin-left:8px">复制</button></span>';

      // Detail grid
      html += '<div class="detail-grid">';
      if (detail.date) html += '<span class="label">发行日期</span><span class="value">' + escHtml(detail.date) + '</span>';
      if (detail.videoLength) html += '<span class="label">时长</span><span class="value">' + detail.videoLength + ' 分钟</span>';
      if (detail.director) html += '<span class="label">导演</span><span class="value">' + escHtml(detail.director.name) + '</span>';
      if (detail.producer) html += '<span class="label">制作商</span><span class="value">' + escHtml(detail.producer.name) + '</span>';
      if (detail.publisher) html += '<span class="label">发行商</span><span class="value">' + escHtml(detail.publisher.name) + '</span>';
      if (detail.series) html += '<span class="label">系列</span><span class="value">' + escHtml(detail.series.name) + '</span>';
      html += '</div>';

      // Genres
      if (detail.genres && detail.genres.length) {
        html += '<div class="genres">';
        html += '<span class="label" style="color:var(--text-muted);margin-right:6px">类别:</span>';
        for (var g = 0; g < detail.genres.length; g++) {
          html += '<span class="genre-tag">' + escHtml(detail.genres[g].name) + '</span>';
        }
        html += '</div>';
      }

      // Stars
      if (detail.stars && detail.stars.length) {
        html += '<div class="stars-list">';
        html += '<span class="label" style="color:var(--text-muted);margin-right:6px">演员:</span>';
        for (var s = 0; s < detail.stars.length; s++) {
          html += '<span class="star-tag">' + escHtml(detail.stars[s].name) + '</span>';
        }
        html += '</div>';
      }

      // Magnets
      html += '<div class="section-title">磁力链接</div>';
      if (!detail.gid || !detail.uc) {
        html += '<div class="magnet-empty">无磁力信息</div>';
      } else if (magnets.length === 0) {
        html += '<div class="magnet-empty">未找到磁力链接</div>';
      } else {
        html += renderMagnetsHtml(magnets);
      }

      html += '</div></div>';

      content.innerHTML = html;

      // Lazy load cover
      if (coverSrc) {
        var coverEl = document.getElementById('detailCover');
        lazyLoadCover(coverEl, coverSrc);
      }

      // Attach copy handler
      attachCopyDelegation(content);
    } catch (err) {
      showError('加载失败: ' + (err.message || String(err)), function () { loadDetail(codeToLoad); });
    }
  }

  // Init
  loadDetail(code);
})();
