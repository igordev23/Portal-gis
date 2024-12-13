export class SwipeController {
    constructor(map, dividerLineId, swipeButtonId, leftMapLayer, rightMapLayer) {
        this.map = map;
        this.dividerLine = document.getElementById(dividerLineId);
        this.swipeToolBtn = document.getElementById(swipeButtonId);
        this.isDragging = false;

        this.leftMapLayer = leftMapLayer;
        this.rightMapLayer = rightMapLayer;
        this.initialBaseLayer = this.map.hasLayer(this.leftMapLayer) ? this.leftMapLayer : this.rightMapLayer;

        this.isSwipeActive = false;

        this.initSwipe();
    }

    initSwipe() {
        this.dividerLine.style.left = '50%';
        this.dividerLine.style.display = 'none';

        this.swipeToolBtn.addEventListener('click', () => {
            this.isSwipeActive = !this.isSwipeActive;

            if (this.isSwipeActive) {
                this.dividerLine.style.display = 'block';
                this.setMapLayers();
                this.updateMask();
                this.startDragging();  // Adicionar eventos de arrastar ao ativar o swipe
            } else {
                this.disableSwipe();
            }
        });
    }

    disableSwipe() {
        this.dividerLine.style.display = 'none';
        this.clearMapLayers();
        this.restoreInitialMapLayers();
        this.isSwipeActive = false;

        // Remover eventos de arrastar ao desativar o swipe
        this.dividerLine.removeEventListener('mousedown', this.startDragging);
        document.removeEventListener('mousemove', this.draggingHandler);
        document.removeEventListener('mouseup', this.stopDragging);
    }

    setMapLayers() {
        if (!this.map.hasLayer(this.leftMapLayer)) {
            this.map.addLayer(this.leftMapLayer);
        }
        if (!this.map.hasLayer(this.rightMapLayer)) {
            this.map.addLayer(this.rightMapLayer);
        }

        this.map.on('move', this.updateMask.bind(this));
        this.updateMask();
    }

    clearMapLayers() {
        if (this.map.hasLayer(this.leftMapLayer)) {
            this.map.removeLayer(this.leftMapLayer);
        }
        if (this.map.hasLayer(this.rightMapLayer)) {
            this.map.removeLayer(this.rightMapLayer);
        }

        this.map.off('move', this.updateMask.bind(this));
    }

    restoreInitialMapLayers() {
        this.map.eachLayer(layer => {
            if (layer !== this.initialBaseLayer) {
                this.map.removeLayer(layer);
            }
        });

        if (!this.map.hasLayer(this.initialBaseLayer)) {
            this.map.addLayer(this.initialBaseLayer);
        }

        this.initialBaseLayer.setOpacity(1);
        this.map.invalidateSize();
        this.dividerLine.style.left = '50%';
    }

    updateMask() {
        const mapWidth = this.map.getContainer().clientWidth;
        const dividerLeft = this.dividerLine.offsetLeft;
        const percentageLeft = dividerLeft / mapWidth;

        this.leftMapLayer.setOpacity(percentageLeft);
        this.rightMapLayer.setOpacity(1 - percentageLeft);
    }

    startDragging() {
        this.dividerLine.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.map.dragging.disable();
            this.map.scrollWheelZoom.disable();
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
                let newLeft = e.clientX - this.dividerLine.offsetWidth / 2;
                let mapWidth = this.map.getContainer().clientWidth;

                if (newLeft >= 0 && newLeft <= mapWidth) {
                    this.dividerLine.style.left = newLeft + 'px';
                    this.updateMask();
                }
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.map.dragging.enable();
                this.map.scrollWheelZoom.enable();
                document.body.style.userSelect = 'auto';
            }
        });
    }
}
