// Scripts específicos para a página de Meus Agendamentos
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar autenticação
    const isAuthenticated = await window.AuthUtils.requireAuth();
    if (!isAuthenticated) return;
    
    // Inicializar navbar com estado de autenticação
    window.AuthUtils.initAuthNavbar();
    
    // Inicializar gerenciador de agendamentos
    const agendamentosManager = new AgendamentosManager();
    await agendamentosManager.init();
});

class AgendamentosManager {
    constructor() {
        this.currentUser = null;
        this.agendamentos = [];
        this.filtroAtual = 'todos';
        this.agendamentoSelecionado = null;
        
        // Elementos da UI
        this.loadingElement = document.getElementById('loadingAgendamentos');
        this.semAgendamentosElement = document.getElementById('semAgendamentos');
        this.listaAgendamentosElement = document.getElementById('listaAgendamentos');
        this.alertMessageElement = document.getElementById('alertMessage');
        
        // Modal de cancelamento
        this.cancelarModal = new bootstrap.Modal(document.getElementById('cancelarModal'));
        this.btnConfirmarCancelamento = document.getElementById('confirmarCancelamento');
        this.loadingSpinnerCancelar = document.getElementById('loadingSpinnerCancelar');
    }
    
    async init() {
        try {
            // Obter usuário atual
            this.currentUser = await window.AuthUtils.getCurrentUser();
            if (!this.currentUser) {
                throw new Error('Usuário não autenticado');
            }
            
            // Inicializar filtros
            this.initFiltros();
            
            // Inicializar botão de cancelamento
            this.initCancelamento();
            
            // Carregar agendamentos
            await this.carregarAgendamentos();
        } catch (error) {
            console.error('Erro ao inicializar gerenciador de agendamentos:', error);
            this.showAlert('Erro ao carregar seus agendamentos. Tente novamente mais tarde.', 'danger');
            this.hideLoading();
        }
    }
    
    initFiltros() {
        const botoesFiltragem = document.querySelectorAll('.filters .btn-group button');
        botoesFiltragem.forEach(botao => {
            botao.addEventListener('click', () => {
                // Remover classe ativa de todos os botões
                botoesFiltragem.forEach(b => b.classList.remove('active'));
                
                // Adicionar classe ativa ao botão clicado
                botao.classList.add('active');
                
                // Atualizar filtro atual
                this.filtroAtual = botao.getAttribute('data-filter');
                
                // Aplicar filtro
                this.aplicarFiltro();
            });
        });
    }
    
    initCancelamento() {
        if (this.btnConfirmarCancelamento) {
            this.btnConfirmarCancelamento.addEventListener('click', async () => {
                if (!this.agendamentoSelecionado) return;
                
                try {
                    // Mostrar loading
                    this.toggleLoadingCancelar(true);
                    
                    // Cancelar agendamento
                    await this.cancelarAgendamento(this.agendamentoSelecionado);
                    
                    // Fechar modal
                    this.cancelarModal.hide();
                    
                    // Recarregar agendamentos
                    await this.carregarAgendamentos();
                    
                    // Mostrar mensagem de sucesso
                    this.showAlert('Agendamento cancelado com sucesso!', 'success');
                } catch (error) {
                    console.error('Erro ao cancelar agendamento:', error);
                    this.showAlert(`Erro ao cancelar agendamento: ${error.message}`, 'danger');
                } finally {
                    // Esconder loading
                    this.toggleLoadingCancelar(false);
                }
            });
        }
    }
    
    async carregarAgendamentos() {
        try {
            // Mostrar loading
            this.showLoading();
            
            // Consultar agendamentos do usuário
            const snapshot = await firebase.firestore()
                .collection('agendamentos')
                .where('userId', '==', this.currentUser.uid)
                .orderBy('dataHoraISO', 'desc')
                .get();
            
            // Processar resultados
            this.agendamentos = [];
            snapshot.forEach(doc => {
                const agendamento = {
                    id: doc.id,
                    ...doc.data()
                };
                this.agendamentos.push(agendamento);
            });
            
            // Verificar se há agendamentos
            if (this.agendamentos.length === 0) {
                this.showSemAgendamentos();
            } else {
                // Renderizar agendamentos
                this.renderizarAgendamentos();
            }
        } catch (error) {
            console.error('Erro ao carregar agendamentos:', error);
            this.showAlert('Erro ao carregar seus agendamentos. Tente novamente mais tarde.', 'danger');
        } finally {
            // Esconder loading
            this.hideLoading();
        }
    }
    
    renderizarAgendamentos() {
        // Limpar lista
        this.listaAgendamentosElement.innerHTML = '';
        
        // Aplicar filtro atual
        const agendamentosFiltrados = this.filtrarAgendamentos();
        
        if (agendamentosFiltrados.length === 0) {
            // Mostrar mensagem de nenhum agendamento para o filtro atual
            this.listaAgendamentosElement.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-muted">Nenhum agendamento ${this.getTextoFiltro()} encontrado.</p>
                </div>
            `;
        } else {
            // Renderizar cada agendamento
            agendamentosFiltrados.forEach(agendamento => {
                const card = this.criarCardAgendamento(agendamento);
                this.listaAgendamentosElement.appendChild(card);
            });
        }
        
        // Mostrar lista
        this.listaAgendamentosElement.classList.remove('d-none');
        this.semAgendamentosElement.classList.add('d-none');
    }
    
    criarCardAgendamento(agendamento) {
        // Formatar data
        const dataAgendamento = new Date(agendamento.dataHoraISO);
        const dataFormatada = dataAgendamento.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Verificar se o agendamento já passou
        const agora = new Date();
        const jaPassou = dataAgendamento < agora;
        
        // Criar elemento do card
        const cardDiv = document.createElement('div');
        cardDiv.className = 'agendamento-card';
        
        // Definir classe de status
        let statusClass = '';
        let statusText = '';
        
        switch (agendamento.status) {
            case 'pendente':
                statusClass = 'status-pendente';
                statusText = 'Pendente';
                break;
            case 'confirmado':
                statusClass = 'status-confirmado';
                statusText = 'Confirmado';
                break;
            case 'concluido':
                statusClass = 'status-concluido';
                statusText = 'Concluído';
                break;
            case 'cancelado':
                statusClass = 'status-cancelado';
                statusText = 'Cancelado';
                break;
            default:
                statusClass = 'status-pendente';
                statusText = 'Pendente';
        }
        
        // Conteúdo do card
        cardDiv.innerHTML = `
            <div class="agendamento-header">
                <h5 class="mb-0">${agendamento.servico}</h5>
                <span class="status-badge ${statusClass}">${statusText}</span>
            </div>
            <div class="agendamento-body">
                <div class="agendamento-info">
                    <i class="fas fa-calendar-alt"></i>
                    <span>${dataFormatada}</span>
                </div>
                <div class="agendamento-info">
                    <i class="fas fa-user"></i>
                    <span>${agendamento.nome}</span>
                </div>
                <div class="agendamento-info">
                    <i class="fas fa-phone"></i>
                    <span>${this.formatarTelefone(agendamento.whatsapp)}</span>
                </div>
                ${agendamento.observacoes ? `
                <div class="agendamento-info">
                    <i class="fas fa-comment"></i>
                    <span>${agendamento.observacoes}</span>
                </div>
                ` : ''}
                <div class="agendamento-info">
                    <i class="fas fa-tag"></i>
                    <span>Código: ${agendamento.id.substring(0, 8)}</span>
                </div>
            </div>
            <div class="agendamento-footer">
                ${this.renderizarBotoesAcao(agendamento, jaPassou)}
            </div>
        `;
        
        // Adicionar eventos aos botões
        setTimeout(() => {
            const btnCancelar = cardDiv.querySelector('.btn-cancelar');
            if (btnCancelar) {
                btnCancelar.addEventListener('click', () => {
                    this.agendamentoSelecionado = agendamento.id;
                    this.cancelarModal.show();
                });
            }
            
            const btnReagendar = cardDiv.querySelector('.btn-reagendar');
            if (btnReagendar) {
                btnReagendar.addEventListener('click', () => {
                    // Salvar ID do agendamento para reagendamento
                    sessionStorage.setItem('reagendamentoId', agendamento.id);
                    window.location.href = 'agendamento_auth.html';
                });
            }
        }, 100);
        
        return cardDiv;
    }
    
    renderizarBotoesAcao(agendamento, jaPassou) {
        // Não mostrar botões para agendamentos cancelados
        if (agendamento.status === 'cancelado') {
            return '';
        }
        
        // Não mostrar botões para agendamentos concluídos
        if (agendamento.status === 'concluido') {
            return `
                <button class="btn btn-outline-primary btn-action" disabled>
                    <i class="fas fa-check"></i> Concluído
                </button>
            `;
        }
        
        // Verificar se o agendamento já passou
        if (jaPassou) {
            return `
                <button class="btn btn-outline-secondary btn-action" disabled>
                    <i class="fas fa-clock"></i> Agendamento expirado
                </button>
            `;
        }
        
        // Botões para agendamentos futuros
        return `
            <button class="btn btn-outline-primary btn-action btn-reagendar">
                <i class="fas fa-calendar-alt"></i> Reagendar
            </button>
            <button class="btn btn-outline-danger btn-action btn-cancelar">
                <i class="fas fa-times"></i> Cancelar
            </button>
        `;
    }
    
    filtrarAgendamentos() {
        if (this.filtroAtual === 'todos') {
            return this.agendamentos;
        }
        
        return this.agendamentos.filter(agendamento => {
            if (this.filtroAtual === 'pendentes') {
                return agendamento.status === 'pendente';
            } else if (this.filtroAtual === 'confirmados') {
                return agendamento.status === 'confirmado';
            } else if (this.filtroAtual === 'concluidos') {
                return agendamento.status === 'concluido';
            } else if (this.filtroAtual === 'cancelados') {
                return agendamento.status === 'cancelado';
            }
            return true;
        });
    }
    
    aplicarFiltro() {
        this.renderizarAgendamentos();
    }
    
    getTextoFiltro() {
        switch (this.filtroAtual) {
            case 'pendentes':
                return 'pendente';
            case 'confirmados':
                return 'confirmado';
            case 'concluidos':
                return 'concluído';
            case 'cancelados':
                return 'cancelado';
            default:
                return '';
        }
    }
    
    async cancelarAgendamento(agendamentoId) {
        try {
            // Usar transação para garantir consistência
            await firebase.firestore().runTransaction(async (transaction) => {
                // Obter referência do documento
                const agendamentoRef = firebase.firestore().collection('agendamentos').doc(agendamentoId);
                
                // Verificar se o agendamento existe
                const agendamentoDoc = await transaction.get(agendamentoRef);
                if (!agendamentoDoc.exists) {
                    throw new Error('Agendamento não encontrado');
                }
                
                // Verificar se o agendamento pertence ao usuário atual
                const agendamentoData = agendamentoDoc.data();
                if (agendamentoData.userId !== this.currentUser.uid) {
                    throw new Error('Você não tem permissão para cancelar este agendamento');
                }
                
                // Verificar se o agendamento já está cancelado
                if (agendamentoData.status === 'cancelado') {
                    throw new Error('Este agendamento já está cancelado');
                }
                
                // Verificar se o agendamento já foi concluído
                if (agendamentoData.status === 'concluido') {
                    throw new Error('Não é possível cancelar um agendamento já concluído');
                }
                
                // Atualizar status para cancelado
                transaction.update(agendamentoRef, {
                    status: 'cancelado',
                    canceladoEm: firebase.firestore.FieldValue.serverTimestamp(),
                    canceladoPor: 'cliente'
                });
                
                // Registrar log de atividade
                const logRef = firebase.firestore().collection('logs').doc();
                transaction.set(logRef, {
                    userId: this.currentUser.uid,
                    action: 'agendamento_cancelado',
                    details: {
                        agendamentoId: agendamentoId,
                        dataHora: agendamentoData.dataHoraISO,
                        servico: agendamentoData.servico
                    },
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
            
            return true;
        } catch (error) {
            console.error('Erro ao cancelar agendamento:', error);
            throw error;
        }
    }
    
    formatarTelefone(telefone) {
        // Remover caracteres não numéricos
        telefone = telefone.replace(/\D/g, '');
        
        // Formatar como (XX) XXXXX-XXXX
        if (telefone.length === 11) {
            return `(${telefone.slice(0, 2)}) ${telefone.slice(2, 7)}-${telefone.slice(7)}`;
        }
        
        return telefone;
    }
    
    showLoading() {
        if (this.loadingElement) {
            this.loadingElement.classList.remove('d-none');
        }
        if (this.listaAgendamentosElement) {
            this.listaAgendamentosElement.classList.add('d-none');
        }
        if (this.semAgendamentosElement) {
            this.semAgendamentosElement.classList.add('d-none');
        }
    }
    
    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.classList.add('d-none');
        }
    }
    
    showSemAgendamentos() {
        if (this.semAgendamentosElement) {
            this.semAgendamentosElement.classList.remove('d-none');
        }
        if (this.listaAgendamentosElement) {
            this.listaAgendamentosElement.classList.add('d-none');
        }
    }
    
    showAlert(message, type) {
        if (this.alertMessageElement) {
            this.alertMessageElement.innerHTML = `
                <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                    ${message}
                    <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
                </div>
            `;
            this.alertMessageElement.classList.remove('d-none');
            
            // Rolar para o alerta
            this.alertMessageElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Esconder após 5 segundos para alertas de sucesso
            if (type === 'success') {
                setTimeout(() => {
                    this.alertMessageElement.classList.add('d-none');
                }, 5000);
            }
        }
    }
    
    toggleLoadingCancelar(isLoading) {
        if (this.btnConfirmarCancelamento && this.loadingSpinnerCancelar) {
            if (isLoading) {
                this.loadingSpinnerCancelar.style.display = 'inline-block';
                this.btnConfirmarCancelamento.disabled = true;
            } else {
                this.loadingSpinnerCancelar.style.display = 'none';
                this.btnConfirmarCancelamento.disabled = false;
            }
        }
    }
}
