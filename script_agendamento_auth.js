// Dependência do auth.js (que inicializa o Firebase e FirebaseServices)

class AgendamentoManager {
    constructor() {
        this.form = document.getElementById("agendamentoForm");
        this.loadingSpinner = document.getElementById("loadingSpinner");
        this.statusMessageDiv = document.getElementById("statusMessage");
        this.dataInput = document.getElementById("dataHora");
        this.currentUser = null;
        this.userData = null;
        this.authUtils = window.AuthUtils; // Usar a instância global
        this.db = FirebaseServices().db; // Obter instância do Firestore
        this.auth = FirebaseServices().auth; // Obter instância do Auth

        // Verificar autenticação antes de inicializar
        this.checkAuth();
    }

    async checkAuth() {
        try {
            // Verificar se usuário está autenticado usando a instância de AuthUtils
            const isAuthenticated = await this.authUtils.requireAuth();
            if (!isAuthenticated) return;

            // Obter usuário atual usando a instância de AuthUtils
            this.currentUser = await this.authUtils.getCurrentUser();

            // Obter dados do usuário do Firestore usando a instância de AuthUtils
            if (this.currentUser) {
                this.userData = await this.authUtils.getUserData(this.currentUser.uid);

                // Preencher campos do formulário com dados do usuário
                this.preencherDadosUsuario();

                // Inicializar eventos após autenticação
                this.initEventListeners();
                this.configurarDataMinima();
            }
        } catch (error) {
            console.error("Erro ao verificar autenticação:", error);
            this.showMessage("Erro ao carregar dados do usuário. Tente novamente mais tarde.", "danger");
        }
    }

    preencherDadosUsuario() {
        if (this.userData && this.form) {
            // Preencher nome
            const nomeInput = document.getElementById("nomeCompleto");
            if (nomeInput && this.userData.nome) {
                nomeInput.value = this.userData.nome;
                nomeInput.classList.add("is-valid");
            }

            // Preencher WhatsApp
            const whatsappInput = document.getElementById("whatsapp");
            if (whatsappInput && this.userData.telefone) {
                // Formatar telefone se necessário
                let telefone = this.userData.telefone.replace(/\D/g, '');
                if (telefone.length > 2) {
                    telefone = `(${telefone.slice(0, 2)}) ${telefone.slice(2)}`;
                }
                if (telefone.length > 10) {
                    telefone = `${telefone.slice(0, 10)}-${telefone.slice(10)}`;
                }

                whatsappInput.value = telefone;
                whatsappInput.classList.add("is-valid");
            }
        }
    }

    initEventListeners() {
        if (this.form) {
            this.form.addEventListener("submit", async (e) => await this.handleSubmit(e));

            // Validação em tempo real
            this.form.querySelectorAll("input, select, textarea").forEach(element => {
                element.addEventListener("input", () => {
                    if (element.checkValidity()) {
                        element.classList.remove("is-invalid");
                        element.classList.add("is-valid");
                    } else {
                        element.classList.remove("is-valid");
                        element.classList.add("is-invalid");
                    }
                });

                element.addEventListener("blur", () => {
                    if (element.value) {
                        if (element.checkValidity()) {
                            element.classList.remove("is-invalid");
                            element.classList.add("is-valid");
                        } else {
                            element.classList.remove("is-valid");
                            element.classList.add("is-invalid");
                        }
                    }
                });
            });

            // Máscara para WhatsApp
            const whatsappInput = document.getElementById("whatsapp");
            if (whatsappInput) {
                whatsappInput.addEventListener("input", function(e) {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 11) value = value.slice(0, 11);

                    // Formatar como (XX) XXXXX-XXXX
                    if (value.length > 2) {
                        value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                    }
                    if (value.length > 10) {
                        value = `${value.slice(0, 10)}-${value.slice(10)}`;
                    }

                    e.target.value = value;
                });
            }
        }
    }

    configurarDataMinima() {
        if (this.dataInput) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');

            this.dataInput.min = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        // Validar formulário
        if (!this.form.checkValidity()) {
            this.form.querySelectorAll(":invalid").forEach(element => {
                element.classList.add("is-invalid");
            });

            this.showMessage("Por favor, preencha todos os campos obrigatórios corretamente.", "danger");
            return;
        }

        const btn = this.form.querySelector("button[type='submit']");
        btn.disabled = true;
        this.loadingSpinner.style.display = "inline-block";
        this.clearMessage();

        let agendamentoData = null;

        try {
            // Verificar autenticação novamente
            if (!this.currentUser) {
                throw new Error("Você precisa estar logado para fazer um agendamento.");
            }

            const dataHoraString = document.getElementById("dataHora").value;
            const dataHoraDate = new Date(dataHoraString);

            // Criar objeto de agendamento com Timestamp
            agendamentoData = {
                nome: document.getElementById("nomeCompleto").value.trim(),
                whatsapp: document.getElementById("whatsapp").value.replace(/\D/g, ''),
                servico: document.getElementById("servico").value,
                dataHora: firebase.firestore.Timestamp.fromDate(dataHoraDate),
                observacoes: document.getElementById("observacoes").value.trim() || "",
                status: "pendente",
                userId: this.currentUser.uid,
                userEmail: this.currentUser.email,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Validações adicionais
            await this.validarAgendamento(agendamentoData, dataHoraDate);

            // Verificar disponibilidade
            await this.verificarDisponibilidade(dataHoraDate);

            // Salvar no Firestore
            const docRef = await this.salvarAgendamento(agendamentoData);

            // Enviar para WhatsApp
            await this.enviarWhatsApp({
                ...agendamentoData,
                dataHoraISO: dataHoraString
            }, docRef.id);

            // Feedback ao usuário
            this.showConfirmacao({
                ...agendamentoData,
                dataHoraISO: dataHoraString
            }, docRef.id);

            // Resetar formulário
            this.form.reset();
            this.form.classList.remove("was-validated");
            this.configurarDataMinima();

            // Preencher dados do usuário novamente
            this.preencherDadosUsuario();

        } catch (error) {
            console.error("Erro detalhado:", {
                error: error.message,
                code: error.code,
                stack: error.stack,
                agendamento: agendamentoData ? {
                    ...agendamentoData,
                    dataHora: agendamentoData.dataHora ? agendamentoData.dataHora.toDate().toISOString() : 'N/A'
                } : null
            });
            this.showMessage(`Erro no agendamento: ${error.message}`, "danger");
        } finally {
            btn.disabled = false;
            this.loadingSpinner.style.display = "none";
        }
    }

    async salvarAgendamento(agendamentoParaSalvar) {
        return this.db.runTransaction(async (transaction) => {
            const dataAgendamentoDate = agendamentoParaSalvar.dataHora.toDate();
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

    async verificarDisponibilidade(dataAgendamentoDate) {
        const inicio = new Date(dataAgendamentoDate.getTime() - 30 * 60 * 1000);
        const fim = new Date(dataAgendamentoDate.getTime() + 30 * 60 * 1000);

        try {
            const snapshotExato = await this.db.collection("agendamentos")
                .where("dataHora", "==", firebase.firestore.Timestamp.fromDate(dataAgendamentoDate))
                .get();

            if (!snapshotExato.empty) {
                throw new Error("Já existe um agendamento para este horário exato. Por favor, escolha outro horário.");
            }

            const snapshotProximos = await this.db.collection("agendamentos")
                .where("dataHora", ">=", firebase.firestore.Timestamp.fromDate(inicio))
                .where("dataHora", "<=", firebase.firestore.Timestamp.fromDate(fim))
                .get();

            if (!snapshotProximos.empty) {
                throw new Error("Existe um agendamento muito próximo a este horário (30 minutos antes ou depois). Por favor, escolha outro horário.");
            }
        } catch (error) {
            console.error("Erro ao verificar disponibilidade:", error);
            throw error;
        }
    }

    async validarAgendamento(agendamento, dataAgendamentoDate) {
        if (!agendamento.nome || !agendamento.whatsapp || !agendamento.servico || !agendamento.dataHora) {
            throw new Error("Por favor, preencha todos os campos obrigatórios.");
        }

        const agora = new Date();

        if (isNaN(dataAgendamentoDate.getTime())) {
            throw new Error("Data ou hora inválida.");
        }

        const horaMinima = new Date(agora.getTime() + 2 * 60 * 60 * 1000);
        if (dataAgendamentoDate < horaMinima) {
            throw new Error("O agendamento deve ser feito com pelo menos 2 horas de antecedência.");
        }

        const hora = dataAgendamentoDate.getHours();
        if (hora < 9 || hora >= 19) {
            throw new Error("Horário fora do nosso funcionamento (9h às 19h)");
        }

        if (dataAgendamentoDate.getDay() === 0 || dataAgendamentoDate.getDay() === 6) {
            throw new Error("Não trabalhamos aos finais de semana");
        }

        if (!/^\d{11}$/.test(agendamento.whatsapp)) {
            throw new Error("Número de WhatsApp inválido. Use 11 dígitos (DDD + número).");
        }

        const agendamentosAtivos = await this.db.collection("agendamentos")
            .where("userId", "==", this.currentUser.uid)
            .where("status", "in", ["pendente", "confirmado"])
            .get();

        if (agendamentosAtivos.size >= 3) {
            throw new Error("Você já possui o máximo de 3 agendamentos ativos. Cancele um agendamento existente para criar um novo.");
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
                        <div class="col-7 text-start">${agendamento.nome}</div>
                    </div>
                    <div class="row mb-2">
                        <div class="col-5 text-end fw-bold">Serviço:</div>
                        <div class="col-7 text-start">${agendamento.servico}</div>
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

    showMessage(message, type) {
        this.statusMessageDiv.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>`;
    }

    clearMessage() {
        this.statusMessageDiv.innerHTML = "";
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Inicializar navbar com estado de autenticação
    if (window.AuthUtils && typeof window.AuthUtils.initAuthNavbar === 'function') {
        window.AuthUtils.initAuthNavbar();
    }
    
    // Inicializar gerenciador de agendamento
    const agendamentoManager = new AgendamentoManager();
    
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