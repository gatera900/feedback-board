
(function () {
  const elements = {
    categoryFilter: document.getElementById('categoryFilter'),
    sortSelect: document.getElementById('sortSelect'),
    searchInput: document.getElementById('searchInput'),
    feedbackForm: document.getElementById('feedbackForm'),
    formMessage: document.getElementById('formMessage'),
    list: document.getElementById('feedbackList')
  };

  const state = {
    category: 'all',
    sort: 'most',
    search: ''
  };

  function getVotedSet() {
    try {
      const raw = localStorage.getItem('upvotedFeedbackIds');
      if (!raw) return new Set();
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return new Set(arr);
      return new Set();
    } catch (_) {
      return new Set();
    }
  }

  function saveVotedSet(set) {
    try {
      localStorage.setItem('upvotedFeedbackIds', JSON.stringify(Array.from(set)));
    } catch (_) {
      // ignore
    }
  }

  function debounce(fn, delay) {
    let timer = null;
    return function debounced(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  async function loadFeedbacks() {
    const params = new URLSearchParams();
    if (state.category && state.category !== 'all') params.set('category', state.category);
    if (state.sort) params.set('sort', state.sort);
    if (state.search && state.search.trim().length > 0) params.set('search', state.search.trim());
    const res = await fetch(`/api/feedbacks?${params.toString()}`);
    const items = await res.json();
    renderList(items);
  }

  function createElement(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content.firstChild;
  }

  function renderList(items) {
    elements.list.innerHTML = '';
    const voted = getVotedSet();
    if (!items || items.length === 0) {
      elements.list.appendChild(createElement('<p class="muted">No feedback yet. Be the first to add one!</p>'));
      return;
    }
    items.forEach((item) => {
      const isVoted = voted.has(item.id);
      const card = createElement(`
        <article class="card" data-id="${item.id}">
          <div class="card-header">
            <span class="badge">${escapeHtml(item.category)}</span>
            <time class="muted" datetime="${item.created_at}">${new Date(item.created_at).toLocaleString()}</time>
          </div>
          <h3>${escapeHtml(item.title)}</h3>
          <p class="desc">${escapeHtml(item.description || '')}</p>
          <div class="card-actions">
            <button class="btn upvote" ${isVoted ? 'disabled' : ''} aria-pressed="${isVoted}" title="Upvote">
              ▲ <span class="count">${item.upvotes}</span>
            </button>
            <button class="btn link toggle-comments" title="Show comments">Comments</button>
          </div>
          <div class="comments hidden">
            <div class="comments-list" aria-live="polite"></div>
            <form class="comment-form">
              <input type="text" name="author" placeholder="Name (optional)" />
              <input type="text" name="content" placeholder="Write a comment" required />
              <button type="submit" class="btn">Add</button>
            </form>
          </div>
        </article>
      `);

      const upvoteBtn = card.querySelector('.upvote');
      upvoteBtn.addEventListener('click', async () => {
        const id = item.id;
        const votedNow = getVotedSet();
        if (votedNow.has(id)) return;
        const res = await fetch(`/api/feedbacks/${id}/upvote`, { method: 'POST' });
        if (res.ok) {
          const updated = await res.json();
          card.querySelector('.count').textContent = updated.upvotes;
          upvoteBtn.disabled = true;
          votedNow.add(id);
          saveVotedSet(votedNow);
        }
      });

      const toggleBtn = card.querySelector('.toggle-comments');
      const commentsEl = card.querySelector('.comments');
      const listEl = card.querySelector('.comments-list');
      const formEl = card.querySelector('.comment-form');

      toggleBtn.addEventListener('click', async () => {
        commentsEl.classList.toggle('hidden');
        if (!commentsEl.classList.contains('hidden')) {
          await loadComments(item.id, listEl);
        }
      });

      formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = new FormData(formEl);
        const payload = {
          author: data.get('author') || '',
          content: data.get('content')
        };
        const res = await fetch(`/api/feedbacks/${item.id}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          formEl.reset();
          await loadComments(item.id, listEl);
        }
      });

      elements.list.appendChild(card);
    });
  }

  async function loadComments(id, container) {
    container.innerHTML = '<p class="muted">Loading comments…</p>';
    const res = await fetch(`/api/feedbacks/${id}/comments`);
    const comments = await res.json();
    if (!Array.isArray(comments) || comments.length === 0) {
      container.innerHTML = '<p class="muted">No comments yet.</p>';
      return;
    }
    container.innerHTML = '';
    comments.forEach((c) => {
      container.appendChild(createElement(`
        <div class="comment">
          <div class="comment-meta">
            <strong>${escapeHtml(c.author || 'Anonymous')}</strong>
            <time class="muted" datetime="${c.created_at}">${new Date(c.created_at).toLocaleString()}</time>
          </div>
          <div class="comment-body">${escapeHtml(c.content)}</div>
        </div>
      `));
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  
  elements.categoryFilter.addEventListener('change', () => {
    state.category = elements.categoryFilter.value;
    loadFeedbacks();
  });

  elements.sortSelect.addEventListener('change', () => {
    state.sort = elements.sortSelect.value;
    loadFeedbacks();
  });

  elements.searchInput.addEventListener('input', debounce(() => {
    state.search = elements.searchInput.value;
    loadFeedbacks();
  }, 300));

  elements.feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    elements.formMessage.textContent = '';
    const data = new FormData(elements.feedbackForm);
    const payload = {
      title: data.get('title'),
      description: data.get('description'),
      category: data.get('category')
    };
    const res = await fetch('/api/feedbacks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      elements.feedbackForm.reset();
      elements.formMessage.textContent = 'Thanks! Your feedback was added.';
      await loadFeedbacks();
    } else {
      const err = await res.json().catch(() => ({ error: 'Failed to submit' }));
      elements.formMessage.textContent = err.error || 'Failed to submit';
    }
  });

  
  loadFeedbacks();
})();


