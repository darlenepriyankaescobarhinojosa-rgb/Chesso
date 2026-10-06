// Set this to the original Instagram QR asset when supplied. Do not generate a replacement.
const INSTAGRAM_QR_ASSET = null;
document.addEventListener('DOMContentLoaded', () => {
    if (!INSTAGRAM_QR_ASSET) return;
    const card = document.querySelector('#contacto .contact-qr-polaroid');
    const photo = new Image();
    photo.className = 'contact-qr-image';
    photo.alt = 'QR original del Instagram oficial de CHEESO';
    photo.decoding = 'async';
    photo.onload = () => {
        card.querySelector('.contact-qr-placeholder').replaceWith(photo);
        card.classList.add('has-real-qr');
    };
    photo.src = INSTAGRAM_QR_ASSET;
});
