const imageUploader = document.getElementById('image-uploader');
const imagePreviewContainer = document.getElementById('image-preview-container');
const imagePreview = document.getElementById('image-preview');
const paletteContainer = document.getElementById('palette-container');
const dropzoneInstructions = document.getElementById('dropzone-instructions');
const toastContainer = document.getElementById('toast-container');
const colorCountSelect = document.getElementById('color-count');
const colorFormatSelect = document.getElementById('color-format');
const insightsContainer = document.getElementById('insights-container');

const COLOR_NAME_REFERENCES = [
    { name: 'Blanco puro', rgb: [255, 255, 255] },
    { name: 'Negro intenso', rgb: [0, 0, 0] },
    { name: 'Gris pizarra', rgb: [112, 128, 144] },
    { name: 'Gris plata', rgb: [192, 192, 192] },
    { name: 'Marfil suave', rgb: [255, 253, 208] },
    { name: 'Arena cálida', rgb: [237, 201, 175] },
    { name: 'Coral suave', rgb: [240, 128, 128] },
    { name: 'Rojo vibrante', rgb: [220, 20, 60] },
    { name: 'Terracota', rgb: [205, 92, 92] },
    { name: 'Durazno', rgb: [255, 160, 122] },
    { name: 'Oro viejo', rgb: [218, 165, 32] },
    { name: 'Mostaza', rgb: [204, 153, 0] },
    { name: 'Verde lima', rgb: [50, 205, 50] },
    { name: 'Verde bosque', rgb: [34, 139, 34] },
    { name: 'Verde jade', rgb: [0, 168, 107] },
    { name: 'Verde menta', rgb: [152, 255, 152] },
    { name: 'Turquesa', rgb: [64, 224, 208] },
    { name: 'Aqua profundo', rgb: [0, 128, 128] },
    { name: 'Azul cielo', rgb: [135, 206, 235] },
    { name: 'Azul cerúleo', rgb: [0, 123, 255] },
    { name: 'Azul marino', rgb: [0, 48, 96] },
    { name: 'Azul petróleo', rgb: [10, 72, 107] },
    { name: 'Índigo', rgb: [75, 0, 130] },
    { name: 'Lavanda', rgb: [181, 126, 220] },
    { name: 'Violeta profundo', rgb: [128, 0, 128] },
    { name: 'Magenta', rgb: [227, 55, 143] },
    { name: 'Fucsia', rgb: [255, 0, 144] },
    { name: 'Rosa empolvado', rgb: [221, 160, 221] },
    { name: 'Chocolate', rgb: [123, 63, 0] },
    { name: 'Café moka', rgb: [102, 51, 0] },
    { name: 'Oliva', rgb: [128, 128, 0] },
    { name: 'Carbón', rgb: [54, 69, 79] }
];

let currentPalette = [];

if (imageUploader) {
    imageUploader.addEventListener('change', (event) => {
        const file = event.target.files[0];
        handleFile(file);
    });
}

if (imagePreviewContainer) {
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
}

if (colorCountSelect) {
    colorCountSelect.addEventListener('change', () => {
        maybeRegeneratePalette();
    });
}

if (colorFormatSelect) {
    colorFormatSelect.addEventListener('change', () => {
        renderPaletteFromState();
    });
}

function handleFile(file) {
    if (!file) {
        showInstructions();
        return;
    }

    if (!file.type || !file.type.startsWith('image/')) {
        showToast('El archivo debe ser una imagen.', 'error');
        currentPalette = [];
        renderEmptyState();
        return;
    }

    hideInstructions();
    showPaletteSkeleton();
    showInsightsSkeleton();
    showLoadingIndicator();

    const reader = new FileReader();

    reader.onprogress = function(event) {
        if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            updateLoadingIndicator(`Procesando imagen… ${progress}%`);
        } else {
            updateLoadingIndicator('Procesando imagen…');
        }
    };

    reader.onerror = function() {
        console.error('Error leyendo el archivo:', reader.error);
        showToast('No se pudo leer el archivo.', 'error');
        currentPalette = [];
        hideLoadingIndicator();
        showInstructions();
        renderEmptyState();
    };

    reader.onload = function(e) {
        imagePreview.src = e.target.result;
        imagePreview.onload = () => {
            generatePalette(imagePreview);
        };
        imagePreview.onerror = () => {
            showToast('No se pudo cargar la imagen. Inténtalo nuevamente.', 'error');
            currentPalette = [];
            renderEmptyState();
            showInstructions();
            hideLoadingIndicator();
            imagePreview.removeAttribute('src');
        };
    };

    reader.readAsDataURL(file);
}

function maybeRegeneratePalette() {
    if (!imagePreview || !imagePreview.src) {
        return;
    }

    showPaletteSkeleton();
    showInsightsSkeleton();
    showLoadingIndicator();

    requestAnimationFrame(() => {
        generatePalette(imagePreview);
    });
}

function generatePalette(imgElement) {
    if (!imgElement || !imgElement.complete) {
        return;
    }

    const desiredCount = parseInt(colorCountSelect?.value, 10) || 5;
    const colorThief = new ColorThief();

    try {
        const palette = colorThief.getPalette(imgElement, desiredCount);
        setPalette(palette);
        hideLoadingIndicator();
    } catch (error) {
        console.error('Error generando la paleta:', error);
        showToast('No se pudo generar la paleta de colores.', 'error');
        currentPalette = [];
        renderEmptyState();
        showInstructions();
        hideLoadingIndicator();
    }
}

function setPalette(paletteArray) {
    currentPalette = Array.isArray(paletteArray) ? paletteArray : [];
    renderPaletteFromState();
    renderInsightsFromState();
}

function renderPaletteFromState() {
    if (!paletteContainer) {
        return;
    }

    paletteContainer.removeAttribute('aria-busy');

    if (!currentPalette.length) {
        renderEmptyState();
        return;
    }

    paletteContainer.innerHTML = '';
    const selectedFormat = colorFormatSelect?.value || 'hex';

    currentPalette.forEach((color, index) => {
        const [r, g, b] = color;
        const hexColor = rgbToHex(r, g, b);
        const formattedValue = formatColor(color, selectedFormat);
        const colorName = getClosestColorName(color);
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'color-box';
        card.style.background = createCardBackground(color);
        const preferredForeground = getPreferredForegroundColor(color);
        card.style.color = preferredForeground;
        card.dataset.foreground = preferredForeground === '#ffffff' ? 'light' : 'dark';
        card.setAttribute('aria-label', `Color ${index + 1}, ${colorName}, valor ${formattedValue}`);

        const meta = document.createElement('span');
        meta.className = 'color-box__meta';
        meta.textContent = `Color ${index + 1}`;

        const nameEl = document.createElement('span');
        nameEl.className = 'color-box__name';
        nameEl.textContent = colorName;

        const valueEl = document.createElement('span');
        valueEl.className = 'color-box__value';
        valueEl.textContent = formattedValue;

        const hintEl = document.createElement('span');
        hintEl.className = 'color-box__hint';
        hintEl.textContent = 'Haz clic para copiar';

        const secondaryTone = preferredForeground === '#ffffff'
            ? 'rgba(255, 255, 255, 0.78)'
            : 'rgba(17, 25, 40, 0.68)';
        meta.style.color = secondaryTone;
        hintEl.style.color = secondaryTone;

        card.appendChild(meta);
        card.appendChild(nameEl);
        card.appendChild(valueEl);
        card.appendChild(hintEl);

        card.addEventListener('click', () => {
            navigator.clipboard.writeText(formattedValue)
                .then(() => showToast(`Color ${formattedValue} copiado`, 'success'))
                .catch((err) => {
                    console.error('No se pudo copiar el color:', err);
                    showToast('No se pudo copiar el color.', 'error');
                });
        });

        paletteContainer.appendChild(card);
    });
}

function renderInsightsFromState() {
    if (!insightsContainer) {
        return;
    }

    insightsContainer.removeAttribute('aria-busy');

    if (!currentPalette.length) {
        renderInsightsEmptyState();
        return;
    }

    const textRecommendations = currentPalette.map((color, index) => {
        const preferredForeground = getPreferredForegroundColor(color);
        const foregroundRgb = preferredForeground === '#ffffff' ? [255, 255, 255] : [17, 24, 39];
        const ratio = getContrastRatio(color, foregroundRgb);
        const classification = classifyContrast(ratio);
        return {
            index,
            color,
            foreground: preferredForeground,
            ratio,
            classification,
            label: preferredForeground === '#ffffff' ? 'Texto claro' : 'Texto oscuro'
        };
    });

    const combos = [];
    for (let i = 0; i < currentPalette.length; i++) {
        for (let j = 0; j < currentPalette.length; j++) {
            if (i === j) continue;
            const bg = currentPalette[i];
            const fg = currentPalette[j];
            const ratio = getContrastRatio(bg, fg);
            combos.push({
                background: bg,
                foreground: fg,
                ratio,
                backgroundName: getClosestColorName(bg),
                foregroundName: getClosestColorName(fg)
            });
        }
    }

    const sortedCombos = combos.sort((a, b) => b.ratio - a.ratio);
    const uniqueCombos = [];
    const seen = new Set();
    for (const combo of sortedCombos) {
        const key = `${rgbToHex(combo.background[0], combo.background[1], combo.background[2])}-${rgbToHex(combo.foreground[0], combo.foreground[1], combo.foreground[2])}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueCombos.push(combo);
        }
        if (uniqueCombos.length >= 4) {
            break;
        }
    }

    const textHtml = textRecommendations.map((item) => {
        const hex = rgbToHex(item.color[0], item.color[1], item.color[2]);
        const badgeClass = getBadgeClass(item.classification.tone);
        return `
            <div class="insight-row">
                <span class="swatch" style="background:${hex};"></span>
                <div class="swatch-info">
                    <span class="color-label">${getClosestColorName(item.color)}</span>
                    <span class="color-subtext">${item.label} · ${formatContrast(item.ratio)}</span>
                </div>
                <span class="contrast-badge ${badgeClass}">${item.classification.label}</span>
            </div>
        `;
    }).join('');

    const combosHtml = uniqueCombos.map((combo) => {
        const badge = classifyContrast(combo.ratio);
        const badgeClass = getBadgeClass(badge.tone);
        const backgroundHex = rgbToHex(combo.background[0], combo.background[1], combo.background[2]);
        const foregroundHex = rgbToHex(combo.foreground[0], combo.foreground[1], combo.foreground[2]);
        return `
            <div class="insight-row insight-row--pair">
                <span class="swatch" style="background:${backgroundHex};"></span>
                <span class="pair-arrow">⇄</span>
                <div class="swatch-info">
                    <span class="color-label">${combo.backgroundName} → ${combo.foregroundName}</span>
                    <span class="color-subtext">${backgroundHex} / ${foregroundHex}</span>
                </div>
                <span class="contrast-badge ${badgeClass}">${badge.label} · ${formatContrast(combo.ratio)}</span>
            </div>
        `;
    }).join('');

    const accessibilityHint = `
        <p class="insight-hint">
            ${uniqueCombos.length ? 'Priorizamos combinaciones con mejor relación de contraste. AA asegura lectura estándar, AAA es ideal para texto pequeño.' : 'Carga una imagen para generar recomendaciones de contraste.'}
        </p>
    `;

    insightsContainer.innerHTML = `
        <article class="insight-card">
            <h3 class="insight-card__title" data-icon="📝">Legibilidad por color</h3>
            <div class="insight-contrast-list">
                ${textHtml}
            </div>
            <p class="insight-hint">Elegimos el color de texto con mayor contraste para cada tono.</p>
        </article>
        <article class="insight-card">
            <h3 class="insight-card__title" data-icon="🎯">Combinaciones destacadas</h3>
            <div class="insight-contrast-list">
                ${combosHtml || '<p class="insights-placeholder">Sube una imagen con suficiente variedad para sugerir combinaciones.</p>'}
            </div>
            ${accessibilityHint}
        </article>
    `;
}

function renderInsightsEmptyState() {
    if (!insightsContainer) {
        return;
    }

    insightsContainer.removeAttribute('aria-busy');
    insightsContainer.innerHTML = '<p class="insights-placeholder">Aquí verás recomendaciones de contraste y usos cuando generes una paleta.</p>';
}

function formatColor(color, format) {
    const [r, g, b] = color;

    switch (format) {
        case 'rgb':
            return `rgb(${r}, ${g}, ${b})`;
        case 'hsl': {
            const [h, s, l] = rgbToHsl(r, g, b);
            return `hsl(${h}, ${s}%, ${l}%)`;
        }
        case 'hex':
        default:
            return rgbToHex(r, g, b);
    }
}

function rgbToHex(r, g, b) {
    const toHex = (c) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r, g, b) {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;

    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    let h;
    let s;
    const l = (max + min) / 2;

    if (max === min) {
        h = 0;
        s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case rn:
                h = (gn - bn) / d + (gn < bn ? 6 : 0);
                break;
            case gn:
                h = (bn - rn) / d + 2;
                break;
            default:
                h = (rn - gn) / d + 4;
        }

        h /= 6;
    }

    return [
        Math.round(h * 360),
        Math.round(s * 100),
        Math.round(l * 100)
    ];
}

function hideInstructions() {
    if (dropzoneInstructions) {
        dropzoneInstructions.classList.add('hidden');
    }
}

function showInstructions() {
    if (dropzoneInstructions) {
        dropzoneInstructions.classList.remove('hidden');
    }
    renderEmptyState();
}

function renderEmptyState() {
    if (!paletteContainer) {
        return;
    }

    paletteContainer.innerHTML = '<p class="palette-placeholder">Tu paleta aparecerá aquí cuando cargues una imagen.</p>';
    renderInsightsEmptyState();
}

function showToast(message, type = 'success') {
    if (!toastContainer) {
        return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 4000);
}

function showPaletteSkeleton() {
    if (!paletteContainer) {
        return;
    }

    const placeholderCount = parseInt(colorCountSelect?.value, 10) || 5;

    paletteContainer.setAttribute('aria-busy', 'true');
    paletteContainer.innerHTML = '';

    for (let i = 0; i < placeholderCount; i++) {
        const skeletonBox = document.createElement('div');
        skeletonBox.className = 'color-box color-box--skeleton';
        skeletonBox.setAttribute('aria-hidden', 'true');

        skeletonBox.innerHTML = `
            <span class="color-box__meta">&nbsp;</span>
            <span class="color-box__name">&nbsp;</span>
            <span class="color-box__value">&nbsp;</span>
            <span class="color-box__hint">&nbsp;</span>
        `;

        paletteContainer.appendChild(skeletonBox);
    }
}

function showInsightsSkeleton() {
    if (!insightsContainer) {
        return;
    }

    insightsContainer.innerHTML = '';
    insightsContainer.setAttribute('aria-busy', 'true');

    const skeletonCount = 2;
    for (let i = 0; i < skeletonCount; i++) {
        const card = document.createElement('div');
        card.className = 'insight-card insight-card--skeleton';
        card.setAttribute('aria-hidden', 'true');
        insightsContainer.appendChild(card);
    }
}

function createCardBackground(color) {
    const [r, g, b] = color;
    const lighter = [
        clamp(Math.round(r + (255 - r) * 0.35)),
        clamp(Math.round(g + (255 - g) * 0.35)),
        clamp(Math.round(b + (255 - b) * 0.35))
    ];
    const darker = [
        clamp(Math.round(r * 0.65)),
        clamp(Math.round(g * 0.65)),
        clamp(Math.round(b * 0.65))
    ];

    return `linear-gradient(145deg, rgb(${lighter.join(',')}) 0%, rgb(${r}, ${g}, ${b}) 55%, rgb(${darker.join(',')}) 100%)`;
}

function getPreferredForegroundColor(color) {
    const whiteContrast = getContrastRatio(color, [255, 255, 255]);
    const darkContrast = getContrastRatio(color, [17, 24, 39]);
    return whiteContrast >= darkContrast ? '#ffffff' : '#111827';
}

function clamp(value, min = 0, max = 255) {
    return Math.min(Math.max(value, min), max);
}

function getClosestColorName(color) {
    let closestName = 'Color personalizado';
    let smallestDistance = Number.POSITIVE_INFINITY;

    COLOR_NAME_REFERENCES.forEach(({ name, rgb }) => {
        const distance = getColorDistanceSquared(color, rgb);
        if (distance < smallestDistance) {
            smallestDistance = distance;
            closestName = name;
        }
    });

    return closestName;
}

function getColorDistanceSquared(colorA, colorB) {
    const [r1, g1, b1] = colorA;
    const [r2, g2, b2] = colorB;

    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;

    return dr * dr + dg * dg + db * db;
}

function getContrastRatio(colorA, colorB) {
    const [r1, g1, b1] = colorA;
    const [r2, g2, b2] = colorB;

    const luminance1 = getRelativeLuminance(r1, g1, b1);
    const luminance2 = getRelativeLuminance(r2, g2, b2);

    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);

    return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(r, g, b) {
    const srgb = [r, g, b].map((value) => {
        const channel = value / 255;
        return channel <= 0.03928
            ? channel / 12.92
            : Math.pow((channel + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function classifyContrast(ratio) {
    if (ratio >= 7) {
        return { label: 'AAA', tone: 'pass', description: 'Texto pequeño y elementos críticos' };
    }
    if (ratio >= 4.5) {
        return { label: 'AA', tone: 'pass', description: 'Texto estándar y UI primaria' };
    }
    if (ratio >= 3) {
        return { label: 'AA grande', tone: 'neutral', description: 'Titulares y texto grande' };
    }
    return { label: 'Bajo', tone: 'fail', description: 'Uso decorativo o fondos suaves' };
}

function getBadgeClass(tone) {
    if (tone === 'pass') {
        return 'contrast-badge--pass';
    }
    if (tone === 'neutral') {
        return 'contrast-badge--neutral';
    }
    if (tone === 'fail') {
        return 'contrast-badge--fail';
    }
    return '';
}

function formatContrast(ratio) {
    return `${ratio.toFixed(2)}:1`;
}

function showLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.classList.remove('hidden');
        updateLoadingIndicator('Procesando imagen…');
    }
}

function updateLoadingIndicator(text) {
    const loadingText = document.getElementById('loading-text');
    if (loadingText && text) {
        loadingText.textContent = text;
    }
}

function hideLoadingIndicator() {
    const indicator = document.getElementById('loading-indicator');
    if (indicator) {
        indicator.classList.add('hidden');
    }
}

renderEmptyState();
renderInsightsEmptyState();