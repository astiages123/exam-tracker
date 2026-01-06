document.addEventListener('DOMContentLoaded', () => {
    // ===================================
    // INITIALIZATION
    // ===================================

    // =========================================================================
    // READING PROGRESS BAR
    // =========================================================================
    const progressBar = document.createElement('div');
    progressBar.id = 'reading-progress';
    document.body.prepend(progressBar);

    const updateProgress = () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
        progressBar.style.width = `${progress}%`;
    };

    window.addEventListener('scroll', updateProgress);
    updateProgress(); // Initial call

    // =========================================================================
    // SEARCH FUNCTIONALITY
    // =========================================================================
    // Create search button
    const searchBtn = document.createElement('button');
    searchBtn.id = 'search-btn';
    searchBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path></svg>`;
    searchBtn.title = 'Ara (Ctrl+F)';
    document.body.appendChild(searchBtn);

    // Create search panel
    const searchPanel = document.createElement('div');
    searchPanel.id = 'search-panel';
    searchPanel.innerHTML = `
        <input type="text" id="search-input" placeholder="Anahtar kelime ara..." autocomplete="off">
        <span id="search-count"></span>
        <button id="search-prev" title="Önceki">▲</button>
        <button id="search-next" title="Sonraki">▼</button>
        <button id="search-close" title="Kapat">✕</button>
    `;
    document.body.appendChild(searchPanel);

    const searchInput = document.getElementById('search-input');
    const searchCount = document.getElementById('search-count');
    const searchPrev = document.getElementById('search-prev');
    const searchNext = document.getElementById('search-next');
    const searchClose = document.getElementById('search-close');

    let currentMatchIndex = 0;
    let matches = [];

    const clearHighlights = () => {
        document.querySelectorAll('mark.search-highlight').forEach(mark => {
            const parent = mark.parentNode;
            parent.replaceChild(document.createTextNode(mark.textContent), mark);
            parent.normalize();
        });
        matches = [];
        currentMatchIndex = 0;
        searchCount.textContent = '';
    };

    const highlightMatches = (keyword) => {
        clearHighlights();
        if (!keyword || keyword.length < 2) return;

        const content = document.querySelector('.content');
        if (!content) return;

        const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, null, false);
        const textNodes = [];
        while (walker.nextNode()) {
            if (walker.currentNode.parentNode.tagName !== 'SCRIPT' &&
                walker.currentNode.parentNode.tagName !== 'STYLE') {
                textNodes.push(walker.currentNode);
            }
        }

        const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

        textNodes.forEach(node => {
            if (regex.test(node.textContent)) {
                const span = document.createElement('span');
                span.innerHTML = node.textContent.replace(regex, '<mark class="search-highlight">$1</mark>');
                node.parentNode.replaceChild(span, node);
            }
        });

        matches = document.querySelectorAll('mark.search-highlight');
        if (matches.length > 0) {
            searchCount.textContent = `${matches.length} sonuç`;
            currentMatchIndex = 0;
            scrollToMatch(0);
        } else {
            searchCount.textContent = 'Sonuç yok';
        }
    };

    const scrollToMatch = (index) => {
        if (matches.length === 0) return;

        matches.forEach(m => m.classList.remove('current'));
        currentMatchIndex = ((index % matches.length) + matches.length) % matches.length;
        const match = matches[currentMatchIndex];
        match.classList.add('current');
        match.scrollIntoView({ behavior: 'smooth', block: 'center' });
        searchCount.textContent = `${currentMatchIndex + 1}/${matches.length}`;
    };

    const openSearch = () => {
        searchPanel.classList.add('active');
        searchInput.focus();
    };

    const closeSearch = () => {
        searchPanel.classList.remove('active');
        clearHighlights();
        searchInput.value = '';
    };

    searchBtn.addEventListener('click', openSearch);
    searchClose.addEventListener('click', closeSearch);
    searchPrev.addEventListener('click', () => scrollToMatch(currentMatchIndex - 1));
    searchNext.addEventListener('click', () => scrollToMatch(currentMatchIndex + 1));

    searchInput.addEventListener('input', (e) => {
        highlightMatches(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (e.shiftKey) {
                scrollToMatch(currentMatchIndex - 1);
            } else {
                scrollToMatch(currentMatchIndex + 1);
            }
        } else if (e.key === 'Escape') {
            closeSearch();
        }
    });

    // Keyboard shortcut: Ctrl+F to open search
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
            e.preventDefault();
            openSearch();
        }
    });

    // =========================================================================
    // SMOOTH SCROLLING FOR TOC
    // =========================================================================
    const tocLinks = document.querySelectorAll('.sidebar a');

    tocLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetElement = document.querySelector(targetId);

            if (targetElement) {
                window.scrollTo({
                    top: targetElement.offsetTop - 40,
                    behavior: 'smooth'
                });
            }
        });
    });

    // =========================================================================
    // IMAGE MODAL (LIGHTBOX)
    // =========================================================================
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <span class="modal-close">&times;</span>
        <img class="modal-content" id="img-expanded">
        <div id="modal-caption"></div>
    `;
    document.body.appendChild(modal);

    const modalImg = document.getElementById('img-expanded');
    const captionText = document.getElementById('modal-caption');

    document.querySelectorAll('.content img').forEach(img => {
        img.addEventListener('click', function () {
            modal.style.display = "flex";
            modalImg.src = this.src;
            captionText.innerHTML = this.alt || "";
            if (!this.alt) {
                captionText.style.display = "none";
            } else {
                captionText.style.display = "block";
            }
            document.body.style.overflow = "hidden"; // Prevent scrolling
        });
    });

    const closeModal = () => {
        modal.style.display = "none";
        document.body.style.overflow = "auto";
    };

    modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.className === 'modal-close') {
            closeModal();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === "flex") {
            closeModal();
        }
    });

    // =========================================================================
    // SCROLLSPY
    // =========================================================================
    const sections = document.querySelectorAll('h2[id], h3[id]');
    const navItems = document.querySelectorAll('.sidebar a');

    window.addEventListener('scroll', () => {
        let current = '';

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (window.scrollY >= (sectionTop - 100)) {
                current = section.getAttribute('id');
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${current}`) {
                item.classList.add('active');
            }
        });
    });
});
