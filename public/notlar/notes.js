document.addEventListener('DOMContentLoaded', () => {
    const images = document.querySelectorAll('.content img');

    // Create Modal Elements
    const modal = document.createElement('div');
    modal.id = 'imageModal';
    modal.className = 'image-modal';

    const closeBtn = document.createElement('span');
    closeBtn.innerHTML = '&times;';
    closeBtn.className = 'close-modal';

    const modalImg = document.createElement('img');
    modalImg.className = 'modal-content';
    modalImg.id = 'img01';

    const captionText = document.createElement('div');
    captionText.id = 'caption';
    captionText.className = 'modal-caption';

    modal.appendChild(closeBtn);
    modal.appendChild(modalImg);
    modal.appendChild(captionText);
    document.body.appendChild(modal);

    images.forEach(img => {
        img.style.cursor = 'zoom-in';
        img.addEventListener('click', () => {
            modal.style.display = "block";
            modalImg.src = img.src;
            captionText.innerHTML = img.alt || "";
            document.body.style.overflow = 'hidden'; // Prevent scroll
        });
    });

    // Close Modal Events
    const closeModal = () => {
        modal.style.display = "none";
        document.body.style.overflow = 'auto';
    };

    closeBtn.onclick = closeModal;
    modal.onclick = (e) => {
        if (e.target === modal) closeModal();
    };

    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape" && modal.style.display === "block") {
            closeModal();
        }
    });
});
