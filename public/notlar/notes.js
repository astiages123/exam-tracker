document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for TOC links
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

    // Image Modal (Lightbox) functionality
    const images = document.querySelectorAll('.content img');

    // Create modal elements
    const modal = document.createElement('div');
    modal.className = 'modal';
    const modalImg = document.createElement('img');
    modalImg.className = 'modal-content';
    const captionText = document.createElement('div');
    captionText.className = 'modal-caption';

    modal.appendChild(modalImg);
    modal.appendChild(captionText);
    document.body.appendChild(modal);

    images.forEach(img => {
        img.addEventListener('click', () => {
            modal.style.display = 'block';
            modalImg.src = img.src;
            captionText.innerHTML = img.alt || '';
        });
    });

    // Close modal on click
    modal.addEventListener('click', () => {
        modal.style.display = 'none';
    });

    // Close modal on ESC key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    });

    // Simple ScrollSpy implementation
    const sections = document.querySelectorAll('h1[id], h2[id], h3[id]');
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
