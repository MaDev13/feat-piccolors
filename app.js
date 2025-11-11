const imageUploader = document.getElementById('image-uploader');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const paletteContainer = document.getElementById('palette-container');

imageUploader.addEventListener('change', (event) => {
    const file = event.target.files[0];
    handleFile(file);
});

// Drag and drop events
imagePreviewContainer.addEventListener('dragover', (event) => {
    event.preventDefault();
    imagePreviewContainer.classList.add('drag-over');
});

imagePreviewContainer.addEventListener('dragleave', () => {
    imagePreviewContainer.classList.remove('drag-over');
});

imagePreviewContainer.addEventListener('drop', (event) => {
    event.preventDefault();
    imagePreviewContainer.classList.remove('drag-over');
    const file = event.dataTransfer.files[0];
    handleFile(file);
});


function handleFile(file) {
    if (!file) {
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        imagePreview.src = e.target.result;
        imagePreview.onload = () => generatePalette(imagePreview);
    };

    reader.readAsDataURL(file);
}

function generatePalette(imgElement) {
    const colorThief = new ColorThief();
    const palette = colorThief.getPalette(imgElement, 5);
    displayPalette(palette);
}

function displayPalette(paletteArray) {
    paletteContainer.innerHTML = '';
    paletteArray.forEach(color => {
        const hexColor = rgbToHex(color[0], color[1], color[2]);
        const colorBox = document.createElement('div');
        colorBox.className = 'color-box';
        colorBox.style.backgroundColor = hexColor;
        colorBox.innerText = hexColor;

        colorBox.addEventListener('click', () => {
            navigator.clipboard.writeText(hexColor)
                .then(() => alert(`Copied: ${hexColor}!`))
                .catch(err => console.error('Failed to copy text: ', err));
        });

        paletteContainer.appendChild(colorBox);
    });
}

function rgbToHex(r, g, b) {
    const toHex = (c) => ('0' + c.toString(16)).slice(-2);
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}