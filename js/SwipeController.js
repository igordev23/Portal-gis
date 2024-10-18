export class SwipeController {
    constructor(map, dividerLineId, swipeButtonId) {
        this.map = map;
        this.dividerLine = document.getElementById(dividerLineId);
        this.swipeToolBtn = document.getElementById(swipeButtonId);
        this.isDragging = false;
        this.initSwipe();
    }

    // Inicializa a funcionalidade de swipe
    initSwipe() {
        // Exibe a linha divisória logo no início
        this.dividerLine.style.left = '50%'; // Inicializa no meio
        this.dividerLine.style.display = 'none'; // Mostra a linha divisória logo de início

        // Exibe ou oculta a linha divisória ao clicar no botão (se ainda desejar manter essa funcionalidade)
        this.swipeToolBtn.addEventListener('click', () => {
            if (this.dividerLine.style.display === 'none' || this.dividerLine.style.display === '') {
                this.dividerLine.style.left = '50%'; // Inicializa no meio
                this.dividerLine.style.display = 'block';
            } else {
                this.dividerLine.style.display = 'none';
            }
        });

        this.startDragging();
    }

    // Função para ativar o arraste da linha divisória
    startDragging() {
        this.dividerLine.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.map.dragging.disable(); // Desabilita a movimentação do mapa
            this.map.scrollWheelZoom.disable(); // Desabilita o zoom do mouse
            document.body.style.userSelect = 'none'; // Impede a seleção de texto
            e.preventDefault(); // Previne comportamento padrão do mouse
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                e.preventDefault();
                let newLeft = e.clientX - this.dividerLine.offsetWidth / 2;
                let mapWidth = this.map.getContainer().clientWidth;

                // Limita a linha ao contêiner do mapa
                if (newLeft >= 0 && newLeft <= mapWidth) {
                    this.dividerLine.style.left = newLeft + 'px';
                }
            }
        });

        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.map.dragging.enable(); // Restaura a movimentação do mapa
                this.map.scrollWheelZoom.enable(); // Restaura o zoom
                document.body.style.userSelect = 'auto'; // Permite a seleção de texto novamente
            }
        });
    }
}
