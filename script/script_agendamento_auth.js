class AgendamentoManager {
    constructor() {
        this.form = document.getElementById("agendamentoForm");
        this.loadingSpinner = document.getElementById("loadingSpinner");
        this.statusMessageDiv = document.getElementById("statusMessage");
        this.dataInput = document.getElementById("dataHora");
        this.currentUser = null;
        this.userData = null;
        
        this.checkAuth();
    }

    async checkAuth() {
        try {
            const isAuthenticated = await AuthUtils.requireAuth();
            if (!isAuthenticated) return;
            
            this.currentUser = await AuthUtils.getCurrentUser();
            
            if (this.currentUser) {
                await this.currentUser.getIdToken(true);
                
                this.userData = await AuthUtils.getUserData(this.currentUser.uid);
                this.preencherDadosUsuario();
                this.initEventListeners();
                this.configurarDataMinima();
            }
        } catch (error) {
            console.error("Erro ao verificar autenticação:", error);
            this.showMessage("Sua sessão expirou. Por favor, faça login novamente.", "danger");
            
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 3000);
        }
    }

    preencherDadosUsuario() {
        if (this.userData && this.form) {
            const nomeInput = document.getElementById("nomeCompleto");
            if (nomeInput && this.userData.nome) {
                nomeInput.value = this.userData.nome;
                nomeInput.classList.add("is-valid");
            }
            
            const whatsappInput = document.getElementById("whatsapp");
            if (whatsappInput && this.userData.telefone) {
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
            
            this.form.querySelectorAll("input, select, textarea").forEach(element => {
                element.addEventListener("input", () => this.validateField(element));
                element.addEventListener("blur", () => this.validateField(element, true));
            });
            
            const whatsappInput = document.getElementById("whatsapp");
            if (whatsappInput) {
                whatsappInput.addEventListener("input", function(e) {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length > 11) value = value.slice(0, 11);
                    
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

    validateField(field, isBlur = false) {
        if (field.value || isBlur) {
            if (field.checkValidity()) {
                field.classList.remove("is-invalid");
                field.classList.add("is-valid");
            } else {
                field.classList.remove("is-valid");
                field.classList.add("is-invalid");
            }
        }
        return field.checkValidity();
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
        
        // Validar todos os campos
        let isValid = true;
        Array.from(this.form.elements).forEach(field => {
            if (field.nodeName !== 'BUTTON' && field.nodeName !== 'FIELDSET') {
                if (!this.validateField(field, true)) {
                    isValid = false;
                }
            }
        });
        
        if (!isValid) {
            this.showMessage("Por favor, preencha todos os campos obrigatórios corretamente.", "danger");
            return;
        }

        const btn = this.form.querySelector("button[type=\"submit\"]");
        AuthUtils.toggleLoading(true, btn);
        this.clearMessage();

        try {
            if (!this.currentUser) {
                throw new Error("Você precisa estar logado para fazer um agendamento.");
            }
            
            const token = await this.currentUser.getIdToken();
            
            // Criar objeto com dados básicos
            const agendamento = {
                nome: document.getElementById("nomeCompleto").value.trim(),
                whatsapp: document.getElementById("whatsapp").value.trim().replace(/\D/g, ''),
                servico: document.getElementById("servico").value,
                dataHoraISO: document.getElementById("dataHora").value,
                observacoes: document.getElementById("observacoes").value.trim(),
                userId: this.currentUser.uid,
                userEmail: this.currentUser.email
            };

            await this.validarAgendamento(agendamento);
            await this.verificarDisponibilidade(agendamento.dataHoraISO, token);

            const docRef = await this.salvarAgendamentoViaREST(agendamento, token);
            await this.enviarWhatsApp(agendamento, docRef.id);

            this.showConfirmacao(agendamento, docRef.id);
            
            this.form.reset();
            this.form.classList.remove("was-validated");
            this.configurarDataMinima();
            this.preencherDadosUsuario();

        } catch (error) {
            console.error("Erro no agendamento:", error);
            
            let errorMessage = error.message;
            if (error.code === 'permission-denied') {
                errorMessage = "Permissões insuficientes. Por favor, faça login novamente.";
            }
            
            this.showMessage(`
                <h5 class="alert-heading">Erro no agendamento</h5>
                <p>${errorMessage}</p>
            `, "danger");
        } finally {
            AuthUtils.toggleLoading(false, btn);
        }
    }

    async salvarAgendamentoViaREST(agendamento, token) {
        try {
            // Formatando a data para o padrão ISO (apenas data e hora, sem segundos e timezone)
            const dataHoraISO = new Date(agendamento.dataHoraISO).toISOString().slice(0, 16);
            
            // Construir o objeto no formato esperado pela API REST do Firestore
            const fields = {
                nome: { stringValue: agendamento.nome },
                whatsapp: { stringValue: agendamento.whatsapp },
                servico: { stringValue: agendamento.servico },
                dataHoraISO: { stringValue: dataHoraISO },
                observacoes: { stringValue: agendamento.observacoes || '' },
                status: { stringValue: "pendente" },
                userId: { stringValue: agendamento.userId },
                userEmail: { stringValue: agendamento.userEmail },
                timestamp: { timestampValue: new Date().toISOString() } // Formato ISO string
            };

            const response = await fetch(
                `https://firestore.googleapis.com/v1/projects/julianabeauty/databases/(default)/documents/agendamentos`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        fields: fields
                    })
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Erro na resposta da API:", errorData);
                throw new Error(`Erro ao salvar agendamento: ${errorData.error.message}`);
            }
            
            const data = await response.json();
            // Extrair o ID do documento do caminho retornado
            const docId = data.name.split('/').pop();
            
            return { id: docId };
            
        } catch (error) {
            console.error("Erro ao salvar agendamento via REST:", error);
            throw error;
        }
    }

    async verificarDisponibilidade(dataHoraISO, token) {
        try {
            const dataAgendamento = new Date(dataHoraISO);
            const inicio = new Date(dataAgendamento.getTime() - 30 * 60 * 1000);
            const fim = new Date(dataAgendamento.getTime() + 30 * 60 * 1000);
            
            const formatarParaFirebase = (date) => date.toISOString().slice(0, 16);
            
            const inicioFormatado = formatarParaFirebase(inicio);
            const fimFormatado = formatarParaFirebase(fim);
            const dataAgendamentoFormatada = formatarParaFirebase(dataAgendamento);
            
            // Construir a consulta no formato da API REST
            const structuredQuery = {
                from: [{ collectionId: "agendamentos" }],
                where: {
                    compositeFilter: {
                        op: "AND",
                        filters: [
                            {
                                fieldFilter: {
                                    field: { fieldPath: "dataHoraISO" },
                                    op: "EQUAL",
                                    value: { stringValue: dataAgendamentoFormatada }
                                }
                            }
                        ]
                    }
                },
                limit: 1
            };
            
            const response = await fetch(
                `https://firestore.googleapis.com/v1/projects/julianabeauty/databases/(default)/documents:runQuery`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        structuredQuery: structuredQuery
                    })
                }
            );
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Erro ao verificar disponibilidade: ${errorData.error.message}`);
            }
            
            const data = await response.json();
            
            // Se houver documentos na resposta, significa que o horário está ocupado
            if (data.length > 0 && data[0].document) {
                throw new Error("Já existe um agendamento para este horário exato. Por favor, escolha outro horário.");
            }
            
        } catch (error) {
            console.error("Erro ao verificar disponibilidade:", error);
            throw error;
        }
    }

    async validarAgendamento(agendamento) {
        if (!agendamento.nome || !agendamento.whatsapp || !agendamento.servico || !agendamento.dataHoraISO) {
            throw new Error("Por favor, preencha todos os campos obrigatórios.");
        }

        const dataAgendamento = new Date(agendamento.dataHoraISO);
        const agora = new Date();
        
        if (isNaN(dataAgendamento.getTime())) {
            throw new Error("Data ou hora inválida.");
        }

        // Verificar antecedência mínima (2 horas)
        const horaMinima = new Date(agora.getTime() + 2 * 60 * 60 * 1000);
        if (dataAgendamento < horaMinima) {
            throw new Error("O agendamento deve ser feito com pelo menos 2 horas de antecedência.");
        }

        // Verificar horário comercial (9h-19h)
        const hora = dataAgendamento.getHours();
        if (hora < 9 || hora >= 19) {
            throw new Error("Horário fora do nosso funcionamento (9h às 19h)");
        }

        // Verificar se não é final de semana
        if (dataAgendamento.getDay() === 0 || dataAgendamento.getDay() === 6) {
            throw new Error("Não trabalhamos aos finais de semana");
        }

        // Validar WhatsApp
        if (!/^\d{11}$/.test(agendamento.whatsapp)) {
            throw new Error("Número de WhatsApp inválido. Use 11 dígitos (DDD + número).");
        }
    }

    async enviarWhatsApp(agendamento, id) {
        try {
            const dataAgendamento = new Date(agendamento.dataHoraISO);
            const dataFormatada = dataAgendamento.toLocaleString("pt-BR", { 
                day: '2-digit', 
                month: '2-digit', 
                year: 'numeric',
                hour: '2-digit', 
                minute: '2-digit'
            });

            const mensagem = `✅ *Agendamento Confirmado - BeautyLash Studio* ✅\n\n`
                + `*Código:* ${id.substring(0, 8)}\n`
                + `*Nome:* ${agendamento.nome}\n`
                + `*Serviço:* ${agendamento.servico}\n`
                + `*Data/Hora:* ${dataFormatada}\n`
                + `*Observações:* ${agendamento.observacoes || 'Nenhuma'}\n\n`
                + `_Aguardamos você no studio! Qualquer alteração, por favor, entre em contato._\n\n`
                + `📍 *Localização:* Rua da Beleza, 123 - São Paulo/SP\n`
                + `📞 *Telefone:* (11) 91271-2179`;

            const linkWhatsApp = `https://wa.me/5511912712179?text=${encodeURIComponent(mensagem)}`;
            
            setTimeout(() => {
                window.open(linkWhatsApp, "_blank");
            }, 500);
        } catch (error) {
            console.error("Erro ao enviar para WhatsApp:", error);
        }
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

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    AuthUtils.initAuthNavbar();
    
    const agendamentoManager = new AgendamentoManager();
    
    const forms = document.querySelectorAll('.needs-validation');
    forms.forEach(form => {
        form.addEventListener('submit', event => {
            if (!form.checkValidity()) {
                event.preventDefault();
                event.stopPropagation();
            }
            form.classList.add('was-validated');
        }, false);
    });
});