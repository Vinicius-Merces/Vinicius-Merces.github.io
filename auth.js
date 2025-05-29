// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAmrAtNIsd7Bp-tRAmavI-wwlLgd4_zkEc",
    authDomain: "julianabeauty.firebaseapp.com",
    projectId: "julianabeauty",
    storageBucket: "julianabeauty.firebasestorage.app",
    messagingSenderId: "881281165323",
    appId: "1:881281165323:web:4c8e5a1e7ca37272a27f0e",
    measurementId: "G-GD2V0K5TF4"
};

// Inicialização segura do Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Serviços Firebase (singleton pattern com tratamento de erro melhorado)
const FirebaseServices = (function() {
    let instance = null;
    
    return function() {
        if (!instance) {
            try {
                instance = {
                    auth: firebase.auth(),
                    db: firebase.firestore()
                };
                
                // Configurações padrão
                instance.auth.languageCode = 'pt-BR';
                instance.auth.useDeviceLanguage();
                
                // Persistência de autenticação
                instance.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
                    .catch(error => {
                        console.error("Erro ao configurar persistência:", error);
                    });

                // Configuração do Firestore para desenvolvimento (remover em produção)
                if (window.location.hostname === "localhost") {
                    instance.db.settings({
                        host: "localhost:8080",
                        ssl: false
                    });
                    console.log("Firestore em modo de desenvolvimento local");
                }
                
            } catch (error) {
                console.error("Falha crítica na inicialização do Firebase:", error);
                throw new Error("Falha na inicialização dos serviços Firebase");
            }
        }
        return instance;
    };
})();

// Classe principal de utilitários de autenticação (versão melhorada)
class AuthUtils {
    constructor() {
        this.services = FirebaseServices();
        this._currentUser = null;
        this._userData = null;
    }

    // ========== MÉTODOS DE INTERFACE DO USUÁRIO (melhorados) ==========
    
    /**
     * Exibe um alerta para o usuário com mais opções
     * @param {string} message - Mensagem a ser exibida
     * @param {string} type - Tipo de alerta (success, danger, warning, info)
     * @param {string} elementId - ID do elemento de alerta (opcional)
     * @param {number} timeout - Tempo em ms para fechar automaticamente (0 para não fechar)
     */
    showAlert(message, type = 'info', elementId = 'alertMessage', timeout = 5000) {
        const alertElement = document.getElementById(elementId);
        if (!alertElement) {
            console.warn(`Elemento de alerta #${elementId} não encontrado`);
            return;
        }
        
        // Remove alertas anteriores
        alertElement.innerHTML = '';
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.role = 'alert';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        `;
        
        alertElement.appendChild(alertDiv);
        alertElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        if (timeout > 0 && (type === 'success' || type === 'info')) {
            setTimeout(() => {
                const bsAlert = bootstrap.Alert.getOrCreateInstance(alertDiv);
                bsAlert.close();
            }, timeout);
        }
    }

    /**
     * Limpa todos os alertas
     * @param {string} elementId - ID do elemento de alerta (opcional)
     */
    clearAlert(elementId = 'alertMessage') {
        const alertElement = document.getElementById(elementId);
        if (alertElement) {
            alertElement.innerHTML = '';
        }
    }

    /**
     * Controla o estado de carregamento de um botão com mais opções
     * @param {boolean} isLoading - Se está carregando
     * @param {HTMLElement} buttonElement - Elemento do botão
     * @param {string} loadingText - Texto alternativo durante carregamento
     */
    toggleLoading(isLoading, buttonElement, loadingText = 'Processando...') {
        if (!buttonElement) return;
        
        const spinner = buttonElement.querySelector('.loading-spinner') || 
                       buttonElement.querySelector('.spinner-border');
        const buttonText = buttonElement.querySelector('.button-text') || 
                          buttonElement.querySelector('.btn-text');
        
        if (isLoading) {
            buttonElement.disabled = true;
            if (spinner) {
                spinner.style.display = 'inline-block';
                spinner.setAttribute('aria-busy', 'true');
            }
            if (buttonText) {
                buttonText.dataset.originalText = buttonText.textContent;
                buttonText.textContent = loadingText;
            }
        } else {
            buttonElement.disabled = false;
            if (spinner) {
                spinner.style.display = 'none';
                spinner.setAttribute('aria-busy', 'false');
            }
            if (buttonText && buttonText.dataset.originalText) {
                buttonText.textContent = buttonText.dataset.originalText;
            }
        }
    }

    // ========== VALIDAÇÃO DE FORMULÁRIOS (melhorada) ==========
    
    /**
     * Valida um campo individual do formulário com mais critérios
     * @param {HTMLInputElement} field - Campo a ser validado
     * @returns {boolean} - Se o campo é válido
     */
    validateField(field) {
        if (!field) return false;
        
        let isValid = field.checkValidity();
        const feedbackElement = field.nextElementSibling;
        
        // Validações adicionais para tipos específicos
        if (field.type === 'email' && field.value) {
            isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value);
            if (!isValid) field.setCustomValidity('Por favor, insira um e-mail válido');
        }
        
        if (field.type === 'tel' && field.value) {
            const digits = field.value.replace(/\D/g, '').length;
            isValid = digits >= 10 && digits <= 11;
            if (!isValid) field.setCustomValidity('Por favor, insira um telefone válido (10 ou 11 dígitos)');
        }
        
        field.classList.toggle('is-valid', isValid);
        field.classList.toggle('is-invalid', !isValid);
        
        if (feedbackElement && feedbackElement.classList.contains('invalid-feedback')) {
            feedbackElement.textContent = isValid ? '' : field.validationMessage;
        }
        
        return isValid;
    }

    /**
     * Inicializa validação em tempo real para um formulário
     * @param {string} formId - ID do formulário
     */
    initRealtimeValidation(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        form.querySelectorAll("input, select, textarea").forEach(element => {
            element.addEventListener("input", () => this.validateField(element));
            element.addEventListener("blur", () => this.validateField(element));
        });
    }

    /**
     * Valida um formulário completo com suporte a campos customizados
     * @param {HTMLFormElement} form - Formulário a ser validado
     * @param {Array} customValidators - Array de funções de validação customizada
     * @returns {boolean} - Se o formulário é válido
     */
    validateForm(form, customValidators = []) {
        if (!form) return false;
        
        let isValid = true;
        Array.from(form.elements).forEach(field => {
            if (field.willValidate && !this.validateField(field)) {
                isValid = false;
            }
        });
        
        // Validações customizadas
        customValidators.forEach(validator => {
            if (!validator()) isValid = false;
        });
        
        form.classList.add('was-validated');
        return isValid;
    }

    // ... (o restante da classe permanece igual) ...

    // ========== AUTENTICAÇÃO COM E-MAIL/SENHA (melhorada) ==========
    
    /**
     * Realiza login com e-mail e senha (versão melhorada)
     * @param {string} email - E-mail do usuário
     * @param {string} password - Senha do usuário
     * @param {string} persistence - Tipo de persistência (LOCAL, SESSION, NONE)
     * @returns {Promise<firebase.auth.UserCredential>}
     */
    async loginWithEmail(email, password, persistence = firebase.auth.Auth.Persistence.LOCAL) {
        try {
            // Validação básica antes de tentar login
            if (!email || !password) {
                throw new Error('E-mail e senha são obrigatórios');
            }
            
            // Definir persistência
            await this.services.auth.setPersistence(persistence);
            
            const userCredential = await this.services.auth.signInWithEmailAndPassword(email, password);
            
            // Atualiza último login em uma transação separada
            await this.updateLastLogin(userCredential.user.uid);
            
            // Limpa cache
            this._currentUser = userCredential.user;
            this._userData = null;
            
            return userCredential;
        } catch (error) {
            console.error('Erro no login:', error);
            throw this.translateAuthError(error);
        }
    }

    // ... (o restante da classe permanece igual) ...

    // ========== AUTENTICAÇÃO SOCIAL (melhorada) ==========
    
    /**
     * Inicializa autenticação com Google
     * @param {string} buttonId - ID do botão de login com Google
     */
    initGoogleAuth(buttonId) {
        const button = document.getElementById(buttonId);
        if (!button) return;
        
        button.addEventListener('click', async () => {
            try {
                const userCredential = await this.loginWithGoogle();
                
                // Verificar redirecionamento
                const redirectAfterLogin = sessionStorage.getItem('redirectAfterLogin');
                if (redirectAfterLogin) {
                    sessionStorage.removeItem('redirectAfterLogin');
                    window.location.href = redirectAfterLogin;
                } else {
                    window.location.href = 'index.html';
                }
            } catch (error) {
                this.showAlert(error.message, "danger");
            }
        });
    }
}

// Instância singleton do AuthUtils
const authUtilsInstance = new AuthUtils();

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    // Inicializa componentes com tratamento de erro
    try {
        authUtilsInstance.initPasswordToggles();
        authUtilsInstance.initAuthNavbar();
        
        // Inicializa máscara de telefone se existir
        if (document.getElementById('telefone')) {
            authUtilsInstance.initPhoneMask('telefone');
        }
        
        // Exibe mensagens armazenadas (útil para redirecionamentos)
        const authMessage = sessionStorage.getItem('authMessage');
        if (authMessage) {
            try {
                const { message, type } = JSON.parse(authMessage);
                authUtilsInstance.showAlert(message, type);
            } catch (e) {
                console.error('Erro ao processar mensagem:', e);
            }
            sessionStorage.removeItem('authMessage');
        }
    } catch (error) {
        console.error('Erro na inicialização:', error);
    }
});

// Disponibiliza globalmente
window.AuthUtils = authUtilsInstance;