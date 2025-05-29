// Gerenciador de Agendamentos - Versão Integrada e Melhorada

class AgendamentoManager {
    constructor() {
        this.form = document.getElementById("agendamentoForm");
        this.loadingSpinner = document.getElementById("loadingSpinner");
        this.statusMessageDiv = document.getElementById("statusMessage");
        this.dataInput = document.getElementById("dataHora");
        this.currentUser = null;
        this.userData = null;
        this.authUtils = window.AuthUtils; // Usar a instância global do AuthUtils
        this.services = FirebaseServices(); // Obter instância dos serviços
        this.db = this.services.db; // Firestore
        this.auth = this.services.auth; // Auth

        this.init();
    }

    async init() {
        try {
            // Verificar autenticação
            await this.authUtils.requireAuth('login.html', 'Você precisa estar logado para agendar.');
            
            // Obter usuário atual
            this.currentUser = await this.authUtils.getCurrentUser();
            
            if (this.currentUser) {
                // Obter dados do usuário usando o método cacheado
                this.userData = await this.authUtils.getCurrentUserData();
                
                // Configurar UI
                this.preencherDadosUsuario();
                this.initEventListeners();
                this.configurarDataMinima();
                
                // Inicializar máscaras
                if (document.getElementById('whatsapp')) {
                    this.authUtils.initPhoneMask('whatsapp');
                }
            }
        } catch (error) {
            console.error("Erro na inicialização:", error);
            this.authUtils.showAlert(`Erro: ${error.message}`, 'danger');
        }
    }

    preencherDadosUsuario() {
        if (this.userData && this.form) {
            // Preencher nome
            const nomeInput = document.getElementById("nomeCompleto");
            if (nomeInput && this.userData.nome) {
                nomeInput.value = this.authUtils.sanitizeInput(this.userData.nome);
                this.authUtils.validateField(nomeInput);
            }

            // Preencher WhatsApp
            const whatsappInput = document.getElementById("whatsapp");
            if (whatsappInput && this.userData.telefone) {
                whatsappInput.value = this.userData.telefone;
                this.authUtils.validateField(whatsappInput);
            }
        }
    }

    initEventListeners() {
        if (this.form) {
            this.form.addEventListener("submit", async (e) => await this.handleSubmit(e));

            // Validação em tempo real usando AuthUtils
            this.form.querySelectorAll("input, select, textarea").forEach(element => {
                element.addEventListener("input", () => this.authUtils.validateField(element));
                element.addEventListener("blur", () => this.authUtils.validateField(element));
            });
        }
    }

    configurarDataMinima() {
        if (this.dataInput) {
            const now = new Date();
            const minDate = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 horas adiante

            this.dataInput.min = minDate.toISOString().slice(0, 16);
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        // Validar formulário usando AuthUtils
        const isValid = this.authUtils.validateForm(this.form);
        if (!isValid) {
            this.authUtils.showAlert("Por favor, preencha todos os campos obrigatórios corretamente.", "danger");
            return;
        }

        const btn = this.form.querySelector("button[type='submit']");
        
        try {
            // Usar o utilitário de feedback do AuthUtils
            await this.authUtils.executeWithFeedback(
                async () => {
                    const dataHoraString = document.getElementById("dataHora").value;
                    const dataHoraDate = new Date(dataHoraString);

                    // Criar objeto de agendamento
                    const agendamentoData = {
                        nome: this.authUtils.sanitizeInput(document.getElementById("nomeCompleto").value.trim()),
                        whatsapp: document.getElementById("whatsapp").value.replace(/\D/g, ''),
                        servico: document.getElementById("servico").value,
                        dataHora: firebase.firestore.Timestamp.fromDate(dataHoraDate),
                        observacoes: this.authUtils.sanitizeInput(document.getElementById("observacoes").value.trim()) || "",
                        status: "pendente",
                        userId: this.currentUser.uid,
                        userEmail: this.currentUser.email,
                        timestamp: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    // Validações
                    await this.validarAgendamento(agendamentoData, dataHoraDate);

                    // Salvar com transação
                    const docRef = await this.salvarAgendamento(agendamentoData, dataHoraDate);

                    // Enviar WhatsApp
                    await this.enviarWhatsApp({
                        ...agendamentoData,
                        dataHoraISO: dataHoraString
                    }, docRef.id);

                    // Mostrar confirmação
                    this.showConfirmacao({
                        ...agendamentoData,
                        dataHoraISO: dataHoraString
                    }, docRef.id);

                    // Resetar formulário
                    this.form.reset();
                    this.form.classList.remove("was-validated");
                    this.configurarDataMinima();
                    this.preencherDadosUsuario();
                },
                btn,
                "Agendamento realizado com sucesso!",
                "Erro no agendamento"
            );
        } catch (error) {
            console.error("Erro no processo de agendamento:", error);
            // Tratamento específico de erros movido para dentro do catch
            if (error.code === 'permission-denied') {
                console.error("Permissão negada:", error.message);
                this.authUtils.showAlert("Você não tem permissão para realizar esta ação.", "danger");
            } else if (error.code === 'invalid-argument') {
                console.error("Argumento inválido:", error.message);
                this.authUtils.showAlert("Dados inválidos enviados. Por favor, verifique os campos.", "danger");
            }
            // A função executeWithFeedback já deve tratar erros genéricos.
        }
    }

    async salvarAgendamento(agendamentoParaSalvar, dataAgendamentoDate) {
        return this.db.runTransaction(async (transaction) => {
            // Verificar disponibilidade dentro da transação
            const inicio = new Date(dataAgendamentoDate.getTime() - 30 * 60 * 1000);
            const fim = new Date(dataAgendamentoDate.getTime() + 30 * 60 * 1000);

            const query = this.db.collection("agendamentos")
                .where("dataHora", ">=", firebase.firestore.Timestamp.fromDate(inicio))
                .where("dataHora", "<=", firebase.firestore.Timestamp.fromDate(fim));

            const snapshot = await transaction.get(query);

            if (!snapshot.empty) {
                throw new Error("Horário indisponível. Por favor, escolha outro horário.");
            }

            const docRef = this.db.collection("agendamentos").doc();
            transaction.set(docRef, agendamentoParaSalvar);

            return docRef;
        });
    }

    async validarAgendamento(agendamento, dataAgendamentoDate) {
        // Validação básica
        if (!agendamento.nome || !agendamento.whatsapp || !agendamento.servico || !agendamento.dataHora) {
            throw new Error("Por favor, preencha todos os campos obrigatórios.");
        }

        // Validação de data
        const agora = new Date();
        if (isNaN(dataAgendamentoDate.getTime())) {
            throw new Error("Data ou hora inválida.");
        }

        const horaMinima = new Date(agora.getTime() + 2 * 60 * 60 * 1000);
        if (dataAgendamentoDate < horaMinima) {
            throw new Error("O agendamento deve ser feito com pelo menos 2 horas de antecedência.");
        }

        // Horário de funcionamento
        const hora = dataAgendamentoDate.getHours();
        if (hora < 9 || hora >= 19) {
            throw new Error("Horário fora do nosso funcionamento (9h às 19h)");
        }

        // Dias não úteis
        if (dataAgendamentoDate.getDay() === 0 || dataAgendamentoDate.getDay() === 6) {
            throw new Error("Não trabalhamos aos finais de semana");
        }

        // Validação de telefone
        if (!/^\d{11}$/.test(agendamento.whatsapp)) {
            throw new Error("Número de WhatsApp inválido. Use 11 dígitos (DDD + número).");
        }

        // Limite de agendamentos
        const agendamentosAtivos = await this.db.collection("agendamentos")
            .where("userId", "==", this.currentUser.uid)
            .where("status", "in", ["pendente", "confirmado"])
            .get();

        if (agendamentosAtivos.size >= 3) {
            throw new Error("Você já possui o máximo de 3 agendamentos ativos.");
        }
        if (agendamento.observacoes && agendamento.observacoes.length > 500) {
        throw new Error("As observações não podem exceder 500 caracteres.");
    }

    // Ao atualizar dados do usuário:
        if (data.telefone && !/^\d{10,11}$/.test(data.telefone)) {
        throw new Error("Telefone inválido. Use 10 ou 11 dígitos.");
    }
    }

    async enviarWhatsApp(agendamento, id) {
        const dataAgendamento = new Date(agendamento.dataHoraISO);
        const dataFormatada = dataAgendamento.toLocaleString("pt-BR", {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const mensagem = `✅ *Agendamento Confirmado - BeautyLash Studio* ✅\n\n` +
            `*Código:* ${id.substring(0, 8)}\n` +
            `*Nome:* ${agendamento.nome}\n` +
            `*Serviço:* ${agendamento.servico}\n` +
            `*Data/Hora:* ${dataFormatada}\n` +
            `*Observações:* ${agendamento.observacoes || 'Nenhuma'}\n\n` +
            `_Aguardamos você no studio! Qualquer alteração, por favor, entre em contato._\n\n` +
            `📍 *Localização:* Rua da Beleza, 123 - São Paulo/SP\n` +
            `📞 *Telefone:* (11) 91271-2179`;

        const linkWhatsApp = `https://wa.me/5511912712179?text=${encodeURIComponent(mensagem)}`;

        // Abrir em nova aba após pequeno delay
        setTimeout(() => {
            window.open(linkWhatsApp, "_blank");
        }, 500);
    }

    showConfirmacao(agendamento, id) {
        this.form.classList.add('d-none');

        const dataAgendamento = new Date(agendamento.dataHoraISO);
        const dataFormatada = dataAgendamento.toLocaleString("pt-BR", {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const confirmationHtml = `
            <div class="confirmation-success text-center">
                <div class="confirmation-icon mb-4">
                    <i class="fas fa-check-circle fa-5x text-success"></i>
                </div>
                <h3 class="mb-3">Agendamento Confirmado!</h3>
                <div class="confirmation-details p-4 mb-4">
                    <div class="row mb-2">
                        <div class="col-5 text-end fw-bold">Nome:</div>
                        <div class="col-7 text-start">${this.authUtils.sanitizeInput(agendamento.nome)}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-5 text-end fw-bold">Serviço:</div>
                        <div class="col-7 text-start">${this.authUtils.sanitizeInput(agendamento.servico)}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-5 text-end fw-bold">Data/Hora:</div>
                        <div class="col-7 text-start">${dataFormatada}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-5 text-end fw-bold">Código:</div>
                        <div class="col-7 text-start">${id.substring(0, 8)}</div>
                    </div>
                </div>
                <p class="mb-4">Verifique seu WhatsApp para receber os detalhes.</p>
                <div class="d-flex justify-content-center gap-3">
                    <a href="meus-agendamentos.html" class="btn btn-outline-primary">Meus Agendamentos</a>
                    <button id="newAppointmentBtn" class="btn btn-primary">Novo Agendamento</button>
                </div>
            </div>
        `;

        const confirmationDiv = document.createElement('div');
        confirmationDiv.innerHTML = confirmationHtml;
        confirmationDiv.classList.add('confirmation-container', 'mt-4', 'mb-4');
        this.form.parentNode.insertBefore(confirmationDiv, this.statusMessageDiv);

        document.getElementById('newAppointmentBtn').addEventListener('click', () => {
            confirmationDiv.remove();
            this.form.classList.remove('d-none');
            this.form.reset();
            this.configurarDataMinima();
            this.preencherDadosUsuario();
        });
    }
}

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar navbar com estado de autenticação
    if (window.AuthUtils && typeof window.AuthUtils.initAuthNavbar === 'function') {
        window.AuthUtils.initAuthNavbar();
    }
    
    // Inicializar gerenciador de agendamento
    if (document.getElementById("agendamentoForm")) {
        const agendamentoManager = new AgendamentoManager();
    }
    
    // Adicionar classe de validação ao formulário
    const forms = document.querySelectorAll('.needs-validation');
    Array.from(forms).forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
});